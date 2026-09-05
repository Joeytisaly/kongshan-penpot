# 空山 · 技术架构

## 1. 总体架构

单 Worker 全栈，一次 `wrangler deploy` 上线：

```
浏览器
  │
  ▼
Cloudflare Worker（Hono + hono/jsx SSR）
  ├─ Static Assets：CSS / 字体（页面由 Worker SSR 输出）
  ├─ D1（SQLite）：boards / identities / threads / replies / hugs / notifications / reports
  ├─ KV：热帖榜缓存、浏览计数、限流计数、验证码答案
  └─ 无第三方外部依赖（不使用 Turnstile 等境外验证服务）
```

选型理由：纯文字 BBS 是读多写少的经典场景，SSR 首屏快、SEO 可控（我们主动禁收录）、单 Worker 运维成本最低；免费额度（Workers 10 万请求/天、D1 500 万读/天）覆盖 MVP 绰绰有余。

## 2. 匿名身份码（核心设计）

**模型：凭证即身份，Cookie 免登，身份码兜底。**

- **签发**：首次访问生成 `identity_id` 与身份码 `KS-XXXX-XXXX-XXXX-XXXX`（4 组 16 字符 = 80 位熵；Crockford base32，剔除易混淆的 O/I/L——0/1 保留，生成字母表与校验正则一致），服务端只存 `SHA-256(码:pepper)`；同时下发 HttpOnly Cookie（`SameSite=Lax`，1 年）
- **展示**：`display_no = hash % 9000 + 1000` → 「洞友 #4821」
- **日常**：Cookie 免登，用户无感
- **恢复**：换设备/丢 Cookie → 输入身份码登录（接口限频：每 IP-HMAC 5 次/小时，防爆破）
- **重置**：用户可主动重置身份（旧身份码作废——code_hash 改写为 `revoked:` 占位，身份行保留供历史楼层归属；其他设备上的旧 Cookie 不在作废范围，MVP 承诺仅限身份码本身）
- **边界**：浏览公开内容无需身份；身份码只管发帖/回复/抱抱/通知/我的树洞
- **pepper** 存于 `wrangler secret`，轮换时需批量重哈希（记录在案，MVP 不实现）

## 3. 风控与审核（大陆可达，零外部依赖）

**默认免人机验证。** 仅风控触发时启用自建古诗填空验证码（`src/lib/captcha.ts`，题库 22 题可扩）：

| 防线 | 规则 | 状态 |
|---|---|---|
| 古诗填空验证码 | 新身份 10 分钟内首发触发；答案存 KV（5 分钟 TTL，一次性销毁防重放）；错答提示重试 | ✓ S17 |
| 新身份冷却 | 10 分钟内首发需过验证码（替代硬性拦截） | ✓ S17 |
| 频率限制 | 每身份：5 分钟 1 帖、1 分钟 3 回复（KV 计数） | ✓ S18 |
| IP 隐私 | `HMAC(IP, 每日轮换盐)` 限流 10 帖/小时，原始 IP 永不落盘 | ✓ S18 |
| 关键词分级 | `src/lib/words.ts`：违规词→pending 待审；自伤词→正常发布+12356 横幅；严重词→直接拒绝 | ✓ S19 |
| 举报 | 达 3 次自动隐藏（status=hidden），进站务队列 | ✓ S19 |
| 举报限流 | IP-HMAC 5 次/小时（防清 Cookie 换身份刷举报隐藏） | ✓ P4-1 |
| 登录限频 | 身份码登录 IP-HMAC 5 次/小时，防爆破 | ✓ P4-1 |
| 用户自助删除 | 发布 10 分钟内可删除自己的帖/楼层（软删 deleted，洞务可恢复；验证码场景时间解析失败从严、删除场景从紧） | ✓ P4-2 |
| 站务处置 | 隐藏（可逆）/ 恢复 / 删除（终态），处置自动关闭未决举报 | ✓ P4-3 |
| 站务页 | `/mod` 用 `MOD_PASS` 密钥登录，待审过审/删除、举报处理 | ✓ S19 |

**词库文件 `src/lib/words.ts` 是审核的唯一事实来源**，扩充词条只需追加数组。

## 4. 数据模型（D1）

```sql
CREATE TABLE boards (
  id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL, description TEXT, mood TEXT,
  icon_char TEXT NOT NULL DEFAULT '',    -- 版块图标单字（如 "夜"）
  sort INTEGER DEFAULT 0
);

CREATE TABLE identities (
  id TEXT PRIMARY KEY,
  code_hash TEXT UNIQUE NOT NULL,      -- SHA-256(身份码+pepper)
  display_no INTEGER NOT NULL,          -- 洞友 #xxxx
  post_count INTEGER DEFAULT 0,         -- 发帖计数（createThread 维护）
  created_at TEXT DEFAULT (datetime('now')),
  last_seen_at TEXT
);
-- 0003 已移除 level / hug_received 死列（P7）：无写路径维护的冗余列会读到「永远不对的数字」；
-- 树洞等级与「收到的抱抱」一律由真实表实时计算（等级阈值唯一事实来源 src/lib/level.ts）。

CREATE TABLE threads (
  id TEXT PRIMARY KEY, board_id TEXT NOT NULL REFERENCES boards(id),
  identity_id TEXT NOT NULL REFERENCES identities(id),
  title TEXT NOT NULL, content TEXT NOT NULL,
  views INTEGER DEFAULT 0, reply_count INTEGER DEFAULT 0, hug_count INTEGER DEFAULT 0,
  pinned INTEGER DEFAULT 0, essence INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',      -- published|pending|hidden|deleted
  created_at TEXT DEFAULT (datetime('now')), last_reply_at TEXT
);
CREATE INDEX idx_threads_board ON threads(board_id, status, pinned DESC, last_reply_at DESC);
CREATE INDEX idx_threads_hot ON threads(status, hug_count DESC);
-- 0005 追加（P11-3）：「我的树洞」与楼层等级实时统计按身份过滤
CREATE INDEX idx_threads_identity ON threads(identity_id, status, created_at DESC);

CREATE TABLE replies (
  id TEXT PRIMARY KEY, thread_id TEXT NOT NULL REFERENCES threads(id),
  floor INTEGER NOT NULL,               -- 楼层号（事务内自增）
  identity_id TEXT NOT NULL REFERENCES identities(id),
  content TEXT NOT NULL, quote TEXT,    -- 引用快照文本（引用楼层时服务端生成）
  hug_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_replies_thread ON replies(thread_id, floor);
-- 0005 追加（P11-3）：同上
CREATE INDEX idx_replies_identity ON replies(identity_id, status, created_at DESC);

CREATE TABLE hugs (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,            -- thread|reply
  target_id TEXT NOT NULL,
  identity_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(target_type, target_id, identity_id)   -- 幂等防重复
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY, identity_id TEXT NOT NULL,
  type TEXT NOT NULL,                   -- reply|hug|system
  payload TEXT NOT NULL,                -- JSON
  read_at TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_notif_owner ON notifications(identity_id, read_at, created_at DESC);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL, target_id TEXT NOT NULL,
  reason TEXT, status TEXT DEFAULT 'open',   -- open|resolved
  created_at TEXT DEFAULT (datetime('now'))
);

-- 0002 追加：收藏
CREATE TABLE favorites (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES identities(id),
  thread_id TEXT NOT NULL REFERENCES threads(id),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(identity_id, thread_id)
);
CREATE INDEX idx_fav_owner ON favorites(identity_id, created_at DESC);
```

## 5. 路由表（Hono）

| 路由 | 方法 | 说明 | 对应画板 |
|---|---|---|---|
| `/` | GET | 版块广场（含热帖榜） | 01 |
| `/b/:slug` | GET | 版块帖子列表（?page=） | 02 |
| `/t/:id` | GET | 盖楼详情（浏览+1；楼层当前全量加载，千楼级再补分页） | 03 |
| `/new` | GET/POST | 发新洞（风控+验证码+审核） | 04 |
| `/t/:id/reply` | POST | 回复（楼层自增，限流；引用快照由服务端按表单携带的 quote 目标 id 重新生成，不接受用户提供的原文——P11-2） | 03 |
| `/hug` | POST | 抱抱（幂等 toggle） | 02/03 |
| `/favorite` | POST | 收藏（幂等 toggle） | 03/06 |
| `/report` | POST | 举报（达 3 次自动隐藏；IP-HMAC 5 次/小时限流） | 03 |
| `/delete` | POST | 用户自助删除（10 分钟内自己的帖/楼层，软删 status=deleted） | 03 |
| `/notifications` | GET/POST | 消息通知 / 全部已读 | 05 |
| `/me` | GET | 我的树洞（含身份码展示） | 06 |
| `/me/reset` | POST | 重置身份 | 06 |
| `/search` | GET | 搜索帖子（标题/正文，published，LIKE 参数化） | — |
| `/essence` | GET | 精华区（跨版块 essence=1 列表） | — |
| `/login` | GET/POST | 身份码登录（IP-HMAC 5 次/小时限频） | — |
| `/captcha` | GET | 古诗验证码（内嵌发帖表单，无独立路由） | — |
| `/mod` | GET/POST | 站务（MOD_PASS 保护：待审队列 + 举报队列，支持隐藏/恢复/删除/加精处置，处置自动关闭未决举报） | — |

## 6. 非功能要求

- `robots.txt` 禁止一切收录；响应头 `X-Robots-Tag: noindex`
- 安全头：CSP / X-Content-Type-Options / Referrer-Policy
- 所有输出经 JSX 转义；SQL 参数化
- 跨站防护：全站无 CSRF Token，写接口依赖 Cookie `SameSite=Lax`（全部写操作为 POST，Lax 下跨站请求不携带 Cookie）——显式记录的设计事实（P8-5），未来引入跨站表单/开放 API 时需补 Token
- 浏览计数走 KV（`views:{threadId}` 累积，Cron 每 10 分钟落 D1）
- **展示时区**：D1 存 UTC，页面「今天 HH:MM / MM-DD」一律按 `Asia/Shanghai` 渲染（Workers 时区恒为 UTC，直接取本机会差 8 小时）；「今日新洞」等日界统计以上海日界为准（`datetime('now','+8 hours','start of day','-8 hours')`）（P11-1）
- 热帖榜/版块统计走 KV 缓存（TTL 60s，`cache:hot` / `cache:boards`）
- 书法体自托管：`assets/fonts/ma-shan-zheng-subset.woff2`（299KB 子集，大陆可达）

## 7. 备份与恢复（D1 Time Travel）

D1 内置 Time Travel，**无需额外配置**，自动记录时间点：

```bash
# 查看可恢复的时间点
npx wrangler d1 time-travel info kongshan-db-prod

# 恢复到指定 bookmark（出现误删/批量错误时）
npx wrangler d1 time-travel restore kongshan-db-prod --bookmark=<bookmark>

# 紧急导出（外部归档兜底）
npx wrangler d1 export kongshan-db-prod --remote --output=backup-$(date +%F).sql
```

建议：每月执行一次 `d1 export` 落盘归档（结合定时任务或人工），Time Travel 作为日常恢复手段。
