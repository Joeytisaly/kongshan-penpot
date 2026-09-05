# 空山 · 开发进度表

> **这是项目开发的唯一事实来源。** 任何人或智能体开始工作前先读本表与 [AGENTS.md](AGENTS.md)。
>
> 规则：
> - 完成任务：勾选 `[x]` 并标注日期（如 `✓ 2026-09-04`）
> - 进行中：改为 `[-]`，同一时刻只允许一个 `[-]`
> - 每片必须过验收门（编译 + 冒烟，涉及共享层时回归已完成页面）后才可进入下一片
> - 新增任务：追加到对应阶段末尾，写清验收标准
> - 变更设计：先改 [docs/DESIGN.md](docs/DESIGN.md)，再改代码

## 阶段总览

| 阶段 | 目标 | 状态 |
|---|---|---|
| P0 | 原型定稿 + 项目骨架 + 六页静态还原 + 部署预览 | ✓ 完成 2026-09-04 |
| P1 | D1 数据层 + 身份码 + 发帖/盖楼/抱抱 | ✓ 完成 2026-09-04 |
| P2 | 通知/我的/审核/风控 闭环 | ✓ 完成 2026-09-04 |
| P3 | 缓存/细节/域名 上线打磨 | ✓ 完成 2026-09-04 |
| P4 | 风控闭环 + 用户自助删除 + 站务闭环 + 装饰项落地 + 文档同步 | ✓ 完成 2026-09-05 |
| P5 | 数据真化与体验自洽（种子自洽 / 去硬编码 / 文案对齐 / 并发加固） | ✓ 完成 2026-09-05 |

---

## P0 原型与骨架（切片 S0–S9）

- [x] S0-a 产品原型（Penpot 6 画板） ✓ 2026-09-04
- [x] S0-b 品牌定稿「空山」，原型关联文案已调整 ✓ 2026-09-04
- [x] S0-c 技术方案评审：CF Workers + Hono + D1；身份码混合方案；古诗验证码替代 Turnstile ✓ 2026-09-04
- [x] S0-d 工程规范落地：改动纪律 + 依赖地图 + 切片验收门（AGENTS.md §2） ✓ 2026-09-04
- [x] **S1 项目骨架**：package/wrangler/tsconfig + Hono 入口 + types.ts 数据契约（门：`tsc --noEmit` 零错误 + `wrangler dev` 返回占位页） ✓ 2026-09-04
- [x] **S2 设计基座**：tokens.css + layout 组件（顶栏/导航条/页脚）（门：编译通过 + 页面渲染出头尾结构） ✓ 2026-09-04
- [x] **S3 画板 01 版块广场**（门：截图与 Penpot 画板对比：布局/配色/字号一致） ✓ 2026-09-04
- [x] **S4 画板 02 帖子列表**（同上门 + 回归 S3） ✓ 2026-09-04
- [x] **S5 画板 03 盖楼详情**（同上门 + 回归 S3–S4） ✓ 2026-09-04
- [x] **S6 画板 04 发新洞**（同上门 + 回归） ✓ 2026-09-04
- [x] **S7 画板 05 消息通知**（同上门 + 回归） ✓ 2026-09-04
- [x] **S8 画板 06 我的树洞**（同上门 + 回归） ✓ 2026-09-04
- [x] **S9 部署预览**：`wrangler deploy` → https://kongshan.hongyueqingfeng.workers.dev（六页线上 200 验证通过） ✓ 2026-09-04

## P1 数据层与核心功能

- [x] D1 建表 migration（schema 见 docs/ARCHITECTURE.md，已建成 7 表 + 种子数据） ✓ 2026-09-04
- [x] 身份码系统：首次访问自动签发 + Cookie 免登 + 凭码登录 + 重置身份（验收：签发/换设备/凭码恢复/错误拒绝/重置 五步实测通过；修复 16 字符生成与正则不一致 bug） ✓ 2026-09-04
- [x] 版块/帖子列表 API（主题按最后回复倒序，分页）
- [x] 发帖 / 回复（楼层号自增）/ 抱抱（幂等，防重复）（门：三链路实测通过；修复首回复楼层号冲突 bug） ✓ 2026-09-04
- [x] 浏览计数：KV 累积 + 定时落 D1（门：本地 KV=5 → Cron flush → D1 +5 且 KV 清空；线上 `*/10 * * * *` 已部署） ✓ 2026-09-04
- [x] 前端六页从 mock 切换到 D1（只换数据层，页面零改动——契约验证点） ✓ 2026-09-04
- [x] P1 线上部署：专属库 kongshan-db-prod + 远程迁移/种子 + AUTH_PEPPER 密钥 + deploy（门：线上全链路——身份签发/发帖/回复/抱抱/持久 通过；原 kongshan-db 被其他项目占用，未动其数据） ✓ 2026-09-04

## P2 社区闭环与风控

- [x] 消息通知（回复/抱抱/站务三类 + 未读标记 + 全部已读）（门：双身份实测——回复+抱抱产生通知、全部已读后圆点清零） ✓ 2026-09-04
- [x] 我的树洞（我发布的/我回应的/我的收藏 + 等级进度 + 身份码展示）（门：收藏 toggle/收藏页可见/等级真实进度/三 tab 切换 全部通过） ✓ 2026-09-04
- [x] 古诗填空验证码（风控触发时启用；默认免验证）（门：新身份首发触发/错答拒绝/对答放行；修复 Git Bash GBK 传输误判，Node UTF-8 验证通过） ✓ 2026-09-04
- [x] 风控规则：新身份 10 分钟发帖冷却、每身份 5 分钟 1 帖 / 1 分钟 3 回复、IP-HMAC 限流（门：连发被拒/第4条回复被拦/IP 超限拦截，全部实测通过） ✓ 2026-09-04
- [x] 关键词审核：命中进待审队列，站务页可过审/删除（门：违规帖进 pending、站务页可见） ✓ 2026-09-04
- [x] 举报：达 3 次自动隐藏，进站务队列（门：举报×3 后帖子 404） ✓ 2026-09-04
- [x] 心理安全：自伤关键词触发 12356 提示条（门：自伤帖发布且横幅渲染） ✓ 2026-09-04
- [x] **S20 收尾**：本地全页回归（8 页 200）+ 远程 0002 迁移 + 线上 MOD_PASS 密钥 + 部署 + 线上验证（八页 200、身份签发、收藏幂等） ✓ 2026-09-04

## P3 上线打磨

- [x] **S23 robots 禁收录 + 安全响应头**（中间件 + assets/robots.txt；验收：curl 验证 robots 与响应头 + 全页回归） ✓ 2026-09-04
- [x] **S21 热帖榜/版块统计 KV 缓存**（cache:hot / cache:boards，TTL 60s；验收：二次访问命中缓存 + 过期回源） ✓ 2026-09-04
- [x] **S24 Logo 书法体 woff2 子集自托管**（fonttools 子集化 + @font-face 本地化；验收：字体 200 + 无外部请求） ✓ 2026-09-04
- [x] **S22 空状态 / 404 / 错误页**（EmptyState 统一组件；验收：友好 404 + 空状态） ✓ 2026-09-04
- [x] **S25 D1 备份（Time Travel）+ 域名可达性实测**（验收：备份命令可用 + 实测 5/5 成功） ✓ 2026-09-04

---

## P4 闭环修复与补全

- [x] **P4-1 风控闭环**：修复新身份验证码绕过（懒签发 created_at 与 D1 格式统一 + identityAgeMinutes 双格式兼容解析，解析失败视为新身份）+ 举报 IP-HMAC 限流 5 次/小时 + 登录限频 5 次/小时（兑现 ARCHITECTURE.md §2 承诺）（门：tsc 零错误 + 真机三测点授权豁免） ✓ 2026-09-05
- [x] **P4-2 用户自助删除**：POST /delete（10 分钟内自己的帖/楼层，软删 status=deleted 与站务同语义、楼层号不回收、reply_count-1）+ Floor.canDelete 契约（服务端算好归属∧时间窗）+ format.ageMinutes 通用解析（解析失败保守方向由调用方定）。验收中发现并根治写路径 created_at ISO/SQLite 双格式存量 bug（新帖时间显示为空、删除窗口失效）→ sqliteNow 统一（门：tsc 零错误 + 本地端到端验收 25/25 通过，含 P4-1 四项风控回归） ✓ 2026-09-05
- [x] **P4-3 站务闭环**：举报→处置→关闭链路补全——举报队列增强（目标状态徽标 + 被举报内容摘要）+ 三种处置：隐藏（可逆暂隐，计数不动）/ 恢复（仅 hidden 可逆）/ 删除（终态，楼层计数回收且防重），处置自动关闭未决举报；/mod/delete 扩展楼层支持（门：tsc 零错误 + 端到端验收 29/29，含越权防护与防重） ✓ 2026-09-05
- [x] **P4-4 装饰项落地**：顶栏搜索（layout 搜索框 form 化 + /search LIKE 参数化 + XSS 转义验证）/ 精华区（/essence 跨版块列表 + 站务加精 toggle）/ 引用（楼层引用链接化 + 服务端按 id 预填预览 + hidden quote 落库，写路径零改动）/ 通知筛选（chips 链接化 + type 过滤 + active 态）；全 10 页回归 200（门：tsc 零错误 + 端到端验收 51/51） ✓ 2026-09-05
- [x] **P4-5 文档同步（P4 收官）**：AGENTS.md 依赖地图与目录说明去除已退役 mock.ts（替换为 db 数据层）+ 共享层清单更新；package.json `db:migrate` 库名修正（kongshan-db → kongshan-db-prod，P1 换库遗留）；ARCHITECTURE.md schema 对齐实际 migration（boards.icon_char、threads 双索引、replies.quote、favorites 索引）+ §3 风控表补 P4 五道新防线（纯文档切片，无代码过门需求） ✓ 2026-09-05

## P5 数据真化与体验自洽（接手后第二轮）

- [x] **P5-1 种子数据自洽化**：normalize-seed.sql（src/db/）本地+线上执行——演示帖 reply_count/hug_count 改由真实表驱动（楼层 COUNT / hugs COUNT）、views 归为 120-799 小基数、seed 身份注水统计清零；线上验证 views 总和 594,850→9,051、reply_count 总和=实际楼层数 6、不一致帖 0（决策：seed 内容保留作冷启动氛围，数字必须可验证） ✓ 2026-09-05
- [x] **P5-2 去硬编码假数据**：顶栏 navbar-note → 品牌语「匿名树洞 · 不记录 IP · 请温柔待人」（不再冒充数据）；版块页「3,412 位在线」+ 写死洞友编号 chips → 真实「今日已有 N 个新洞被听见」（boardStats.today）；onlineUsers 装饰数据删除；热帖榜随 P5-1 hug_count 归零自然恢复真实排序（门：tsc 零错误 + 端到端） ✓ 2026-09-05
- [x] **P5-3 文案对齐实现**：「每次进入随机更换」→「凭身份码随时找回」（首页+我的）；「今日发言」→「累计发言」（契约 todayPosts→totalPosts）；「连续进入」→「来到树洞」（门：tsc 零错误 + 端到端） ✓ 2026-09-05
- [x] **P5-4 技术加固**：楼层号 INSERT...SELECT 同语句原子生成（并发 5 回复实测楼层号唯一且连续——根治重楼）；楼层被抱补通知楼层作者（自抱不通知）；回复命中自伤词补 12356 横幅（横幅覆盖楼主正文+全部可见楼层）；社区统计「注册洞友」→「发言洞友」（排除懒签发未发言身份噪音）（门：tsc 零错误 + 端到端验收 25/25） ✓ 2026-09-05

---

## P6 移动端响应式适配

- [x] **P6-1 设计文档先行**：DESIGN.md §6「移动端降级规范」——三档断点（1080/880/560）、单栏化与侧栏下移规则、手机端帖子行两行式布局、四条原则（信息优先级/入口不隐藏/宁缺毋假/桌面画板还原为准） ✓ 2026-09-05
- [x] **P6-2 响应式实现**：仅动 `assets/app.css`（+~100 行媒体查询）——≤1080px 顶栏收窄+搜索框弹性；≤880px 五组网格降单栏（侧栏 order 下移）+导航横向滑动；≤560px 帖子行两行式（grid-areas，表头隐藏）+楼层/卡片紧凑；桌面 >1080px 规则零改动（三栏/四列抽查完好）；JSX 组件零改动（门：tsc 零错误 + 10 页 200 + 三档断点与桌面规则抽查全过；真机效果待用户手机验收） ✓ 2026-09-05
- [x] **P6-3 浏览器模拟视口验收 + 补充修复**：IAB 浏览器 375×812 逐页实测线上——发现首页版块行 `.board-row` 固定子项 408px 溢出（P6 漏项，名称描述被挤成竖排）→ 560 断点补两行式（最后回复列隐藏）；修复后部署（版本 9cf2bba1）并全量复验：**移动 375 十页横向溢出断言全零 + 截图目视**（发新洞/登录/搜索两行式/详情楼层逐张确认）、**桌面 1440 三栏 200px/1fr/320px 还原原样**、**中间档 820 单栏 + 侧栏下移**，三档全绿 ✓ 2026-09-05

---

## P7 数据一致性修复（接手审查发现）

> 共同根因：identities 表上的冗余列（hug_received / level）无写路径维护，查询层却在读——读到「永远不对的数字」。
> 修复策略：一律改为真实表实时驱动（延续 P5-1「数字必须可验证」原则），页面契约零改动，死列在 P7-3 统一清理。

- [x] **P7-1 抱抱统计实时化**：`getMyStats.hugs` 由 `identities.hug_received`（从未被写路径维护，真实用户恒为 0）改为 hugs 表按 published 帖/楼作者实时 COUNT——与同函数 posts/replies 的 published 口径一致。消费方（/me 资料卡、首页足迹）走既有契约字段零改动。门：tsc 零错误 ✓ 2026-09-05（用户侧冒烟待部署后：收过抱抱的账号 /me「收到的抱抱」> 0）
- [x] **P7-2 等级与累计发言实时化**：楼层作者等级由 `identities.level`（签发后冻结在一叶）改为发言数（published 帖+回）经 `levelFromPosts` 实时计算；全楼参与作者一次 UNION 查询出口径（避免逐行相关子查询），洞务组（display_no=0）特例「洞务」保留 seed 语义；首页身份卡「累计发言」改用实时 posts+replies，与旁边等级口径一致（兑现 P5-3 语义）。楼层页/首页 JSX 零改动（Floor.level、Identity.totalPosts 契约形状不变）。门：tsc 零错误 ✓ 2026-09-05（用户侧冒烟：详情页多回帖作者的等级随发言数变化、seed 演示帖作者等级回落为真实值——演示身份各只有 1 帖，显示一叶属预期）
- [x] **P7-3 身份表死列清理**：migration 0003 DROP `identities.level` / `identities.hug_received`（P7-1/2 后零读者；死列即本阶段两 bug 的共同根因）——联动 IdentityRow / toDisplay / 契约 Identity.level（grep 证实无消费者，tsc 验证）/ 懒签发 INSERT / reset INSERT / seed.sql / normalize-seed.sql / ARCHITECTURE §4。门：tsc 零错误 + 死列引用残留扫描干净 ✓ 2026-09-05。**⚠️ 上线顺序：先部署代码、后应用迁移**（新代码兼容新旧两种 schema；旧代码懒签发 INSERT 带列名，列消失后会失败）

## P8 加固与收尾（接手审查发现）

> 切片顺序：P8-1 安全加固 → P8-2 签发豁免 → P8-3 规范化 → P8-4 版块补齐 → P8-5 语义/文档对齐 → P8-6 小项。每片过 tsc 门后更新本表再进下一片。

- [x] **P8-1 站务登录加固**：新建 `src/lib/modauth.ts`——① /mod/login 加 IP-HMAC 限频 5 次/小时（同 /login 语义：不论成败计数）；② mod_auth cookie 从「值=明文 MOD_PASS」改为无状态签名令牌 `expiry.HMAC(expiry, MOD_PASS)`（避免 KV 最终一致导致偶发登录失效），7 处 `getCookie === MOD_PASS` 明文比较全部收敛到 `verifyModSession()`；③ 口令与会话校验一律恒定时间比较（SHA-256 摘要逐字节异或）。门：tsc 零错误 ✓ 2026-09-05。用户侧回归：/mod 登录（错码拒绝/对码进入）+ 过审/隐藏/恢复/删除/加精/已处理 六动作；旧明文 cookie 部署后自然失效需重登（预期）
- [x] **P8-2 签发豁免 + favicon**：复核修正——robots.txt 本就是静态资产（不经 Worker，中间件豁免仅作兜底）；真正灌表向量是 /favicon.ico（无资产文件 → Worker 404 → 每次懒签发）与扫描器 404。落地：Layout `<head>` 加 data-URI SVG favicon（现代浏览器不再请求 /favicon.ico）+ 身份中间件对 /favicon.ico、/robots.txt 跳过查询与签发 + notFound/onError 占位兜底（FALLBACK_ME，豁免路径落入 404/500 时顶栏渲染不崩溃）。门：tsc 零错误 ✓ 2026-09-05。残留观察项：爬虫抓 HTML 页仍会签发（路由白名单式签发，暂不做）
- [x] **P8-3 /login Set-Cookie 规范化**：raw `c.header("Set-Cookie", join(", "))`（RFC 禁止合并两条）→ 复用身份中间件导出的 `cookieOpts` 两次 `setCookie`，语义与懒签发完全一致（HttpOnly/Lax/Path=//1 年）。门：tsc 零错误 ✓ 2026-09-05。用户侧回归：凭身份码登录后 /me 正确显示身份码、刷新保持会话
- [x] **P8-4 补齐设计稿版块**：migration 0004——UPDATE 既有 5 版块 sort 至分组顺序 + INSERT 设计导航里的 4 版块（分手治愈/校园点滴/租房互助/树洞故事会，描述按 DESIGN.md 语气补写）；seed.sql sort 同步（fresh 库先迁移后种子、线上存量库跑迁移，两条路径得到相同 9 版块与排序）；展示层零改动（/b/:slug 空版块走既有 EmptyState，mood 色全部在 tokens 内）。门：tsc 零错误 ✓ 2026-09-05。用户侧：apply 0004 后首页左栏 4 链接不再 404。已知残留：新版块名/图标字不在书法体子集内，回退楷体展示（重新子集化需原始字体，用户侧）
- [x] **P8-5 语义与文档对齐**：① /me/reset 兑现「旧身份码作废」——重置时旧 code_hash 改写为 `revoked:`||id 占位（行保留供楼层归属），旧码从此无法登录；其他设备旧 Cookie 不在承诺范围已记入 §2；② §2 字符集描述修正（仅剔 O/I/L，含 0/1）并顺带修正哈希描述（实际为 `SHA-256(码:pepper)` 冒号分隔，非直接拼接）；③ §5 /t/:id 去掉 ?page= 声称，注明全量加载现状；④ §6 显式记录 CSRF 依赖 SameSite=Lax 的设计事实及未来补 Token 的触发条件。门：tsc 零错误 ✓ 2026-09-05。用户侧回归：重置身份后用旧码登录应被拒绝、新码可登录
- [x] **P8-6 小项**：① 首访直接进 /me 时身份码卡片不显示——中间件懒签发时 `c.set("freshCode")` 暂存，/me 读取顺序 CODE_COOKIE → freshCode；② 搜索 LIKE 的 %/_ 参数侧转义 + `ESCAPE '\'`（用户输入按字面匹配）。暂缓（记录不动）：app.css 3 处硬编码色值——需先改 DESIGN.md 色板再动 CSS，纯装饰低收益。门：tsc 零错误 ✓ 2026-09-05

## P9 体验闭环（接手第三轮：现网缺陷修复 + 交互补全）

> 背景：无 JS 表单架构下，/hug、/favorite、/report 返回 JSON 导致点击后落裸 JSON 页（P1 验收走 API 链路、UI 链路漏验）；楼层「回复」按钮为静态死元素；「只看楼主」是纯文案。本阶段全部对齐设计画板与文案承诺。

- [x] **P9-1 动作端点回跳修复**：/hug、/favorite、/report 由 c.json 改 303 回跳来源页——表单 hidden `return` 字段 + 服务端 safeReturn 校验（须以 / 开头且非 //，防 open redirect）；回跳 query 带动作结果提示条（reported=1 温柔确认 / hugerr、faverr、reporterr 错误文案），thread 页新增 actionNotice 渲染位。门：tsc 零错误 + 本地冒烟（回跳/开关切换/open-redirect 打回/提示条/举报×3 自动隐藏无回归）✓ 2026-09-05。经验：Git Bash MSYS 路径转换会改写 curl 表单里的 `/t/...` 值——测试一律 `MSYS_NO_PATHCONV=1` + URL 编码（与 GBK 教训同类）
- [x] **P9-2 楼层「回复」按钮落地 + 死代码清理**：静态 span → `#reply` 锚点链接（回复=定位回复框，引用=带 quote 预填，职责区分）；删除无消费的 reply_to 隐藏字段。零后端改动。门：tsc 零错误 ✓ 2026-09-05
- [x] **P9-3 只看楼主**：getThreadDetail 加 onlyOp 过滤（楼层号保留原值），/t/:id?op=1 消费；meta 拆出「只看楼主/看全部楼层」切换链接（.op-link 最小样式只用 token）。门：tsc 零错误 + 冒烟（普通/op 视图楼层过滤与链接翻转、回复框保留、无回复帖 200、旧死文案清除）✓ 2026-09-05
- [x] **P9-4 顶栏消息未读红点**：getUnreadCount（COUNT read_at IS NULL，走 idx_notif_owner）+ Layout「消息」徽标（>9 显 9+，.unread-badge 仅用 token 变量）+ 全部 10 个页面路由传参（404/onError 占位不传——豁免路径无徽标属预期）。门：tsc 零错误 + Node UTF-8 冒烟（A 发帖→B 回复→A 首页//me 红点 1→全部已读→0→B 无通知 0；badge 全页扫描 10/10）✓ 2026-09-05。经验补充：新身份 10 分钟冷却会拦自动化发帖测试——Node 脚本内置古诗验证码求解（题库与 captcha.ts 同步）
- [x] **P9-5 站务置顶/取消置顶**：/mod/pin（`pinned = 1 - pinned`，对齐加精模式）+ 举报队列帖子条目「置顶/取消顶」按钮 + getOpenReports 补 thread_pinned 字段。门：tsc 零错误 + Node 冒烟（举报→队列按钮→toggle→版块页置顶组提前→恢复现场）✓ 2026-09-05

## P10 工程基座（测试/CI/防刷/分层）

> 目标：把「编译+冒烟」的手工验收升级为可自动回归的工程基座，并补齐写路径防刷短板。

- [x] **P10-1 单元测试基建**：vitest 5（devDependency），测试与源码同目录；8 个测试文件 66 用例——identity（码格式/字符集/正则/哈希/双格式年龄：ISO 脏数据解析失败从严视为新身份）、level 五档阈值边界、words 三级判定优先级、captcha（一次性销毁防重放/normalize，POEM_BANK 导出供测试）、format（万/千分位/UTC 解析/洞务组展示）、modauth（签名会话/过期/篡改/畸形输入）、risk（发帖冷却/回复限流/IP 限流/换日盐轮换/原始 IP 不落盘）、cache（命中/未命中/坏 JSON）。共享 TTL 感知 KV stub（fake timers 下按 Date.now 过期）。AGENTS.md 验收门升级：tsc + npm test + 冒烟三重门。门：66/66 + tsc 零错误 ✓ 2026-09-05
- [x] **P10-2 GitHub Actions CI**：.github/workflows/ci.yml——push/PR 跑 npm ci + typecheck + test，不自动部署；本地以干净检出（git archive + npm ci）验证等价命令链全绿；真实 CI 首跑随下次授权推送触发 ✓ 2026-09-05
- [x] **P10-3 抱抱/收藏限流 + 通知防骚扰**：risk.ts 新增 actCheck/actRecord（每身份 1 分钟 10 次，attempt-based）挂到 /hug、/favorite（lim=1 回跳提示）；hugNotifyOnce KV 去重键（同 actor+target 1 小时只通知一次）接入 toggleHug（签名加 kv 参数）。门：tsc + 69 用例 + Node 冒烟（12 次连点 3 次被限、楼主仅 1 条通知）✓ 2026-09-05
- [x] **P10-4 index.tsx SQL 收敛**：新建 src/db/mod.ts（insertReport 合体落库+计数+自动隐藏、readAllNotifications、hide/restore/deleteTarget 含举报联动与计数回收、toggleEssence/togglePin、resolveReport）；queries.ts 收编 getQuotePreview/getIdentityByCodeHash；writes.ts 新增 insertIdentity（消灭懒签发与重置的双份 INSERT）+ revokeIdentityCode。index.tsx 内联 SQL 清零，回归纯编排；AGENTS.md 依赖地图补 db/mod.ts。**回归发现并修复真 bug：/me/reset 仍是 join(", ") 拼接 Set-Cookie（P8-3 漏改），统一为 setCookie 两次**。门：tsc + 69 用例 + 16 项全链路断言（懒签发/举报×3/站务六动作/待审过审/登录/重置/已读）✓ 2026-09-05
- [x] **P10-5 分页补全**：getNotices/searchThreads 改分页结构（LIMIT 20/OFFSET + COUNT，返回 {items, page, totalPages}，契约演进联动两路由两页面）；通知/搜索页复用 .pagination 样式渲染页码（type/q 参数在链接中保留，& 经 JSX 转义为 &amp; 浏览器语义等价）；flushViews 补 kv.list 游标循环（>1000 键防御）。门：tsc + 69 用例 + 造数冒烟（25 条通知→第1页20+第2页5+page=0 收敛；访问帖→/cdn-cgi/local/scheduled→views 落库 732→734）✓ 2026-09-05

---

## P11 接手第四轮：全局审查修复（时间正确性 / 写路径加固 / 查询索引 / 体验 / 口径 / 架构清理 / 运维）

> 来源：2026-09-05 七角色深度审查（安全/数据/前端/产品/架构/DevOps/QA），切片按优先级排定。
> 纪律：每片过门 = `tsc --noEmit` 零错误 + `npm test` 全绿 + wrangler dev 本地冒烟；开工前过 AGENTS.md 依赖地图，联动改动同片完成；涉及 schema 的切片标注「先部署代码后迁移」顺序。

- [x] **P11-1 时间正确性**：楼层「今天 HH:MM」与相对时间 MM-DD 按 Asia/Shanghai 渲染（Workers 时区恒为 UTC，大陆用户看到的时间差 8 小时）；「今日新洞」统计日界（getBoardStats/getCommunityStats）改为上海日界（UTC 串 `datetime('now','+8 hours','start of day','-8 hours')`）；toDisplay.joinDays 改 UTC 解析 + NaN 守卫（原 `new Date("YYYY-MM-DD HH:MM:SS")` 按本机时区解析，Workers 上侥幸正确、本机开发/测试偏差，与 ageMinutes 统一）。联动：format.ts / identity.ts / queries.ts 两处 SQL / format.test.ts 断言改为确定性（Intl 固定时区）/ ARCHITECTURE §6 记录展示时区决策。门：tsc 零错误 + 71 用例 + 本地冒烟（D1 验证上海日界=UTC 前日 16:00；楼层标签显示上海时间 9-04 17:48，旧实现为 09:48） ✓ 2026-09-05
- [x] **P11-2 写路径加固**：① safeReturn 把 `\` 归一为 `/` 再校验（浏览器将 Location 中 `\` 等同 `/`，`/\evil.com` 绕过 `//` 检查跳外部站）；② 引用快照收敛服务端唯一生成——表单 hidden 字段只传目标 id，POST /t/:id/reply 按 id 重新生成快照（原直接落用户提供的文本，可伪造「引用 洞务组 的发言：…」），createReply 防御性截断 120 字；③ 举报 reason 截断 100 字；④ toggleHug 补目标存在且 published 校验（原任意 target 字符串都会插 hugs 行——灌表向量，对齐 toggleFavorite）；⑤ cookieOpts 与 mod 会话 cookie 补 `secure: true`；⑥ CSP 补 `frame-ancestors 'none'`；⑦ 回复失败静默回跳改 `?replyerr=1` 提示条（原计划列于 P11-4，随 ② 同路径前移至本片完成）。联动：index.tsx / thread.tsx（quote 隐藏字段 id 化）/ writes.ts / identity.ts / security.ts / ARCHITECTURE §5。门：tsc 零错误 + 71 用例 + 冒烟四断言（Set-Cookie 带 Secure + CSP 带 frame-ancestors；`/\evil.com` 回跳归一为 `/`；无效目标 hugerr=1；quote=id 生成服务端快照、伪造文本被忽略、GET 预览正常） ✓ 2026-09-05
- [x] **P11-3 查询与索引**：① getThreads「最后回复」改窗口函数每帖一行（原把当页全部楼层拉回 JS 再去重，热帖千楼时列表页读数万行）；② migration 0005 补 idx_threads_identity / idx_replies_identity（getMyThreads/getMyReplies/等级实时统计按 identity_id 过滤，0001 未建索引；纯增量、与部署顺序无关）；③ flushViews 分批（10/批）+ D1 batch 合并 + 单次上限 20 键——免费版 50 子请求预算下（每键 get+delete+逐条 UPDATE ≈3 次）原实现 ~16 键即中途失败，超限键留待下个 cron 周期；④ getWeekStats「收到抱抱」补楼层抱抱（原只数帖子，与 getMyStats 口径不一，自 P11-5 前移合并回归）。联动：queries.ts / writes.ts / migrations 0005 / testutil kvStub 补 list / 新增 db/writes.test.ts（4 用例）/ ARCHITECTURE §4 索引注记。门：tsc 零错误 + 75 用例 + 冒烟（本地 0005 应用成功，EXPLAIN QUERY PLAN 走 idx_threads_identity；7 页 200；版块页最后回复列正常；cron 落库 KV 清空后二次调度零变化） ✓ 2026-09-05
- [x] **P11-4 发帖体验**：① 版块 chips 选中态改 `label.board-chip:has(input:checked)` 跟随真实 checked radio（原 `.active` 静态写在第一个 chip，点其他版块时高亮不动、与提交值不一致；:has 不支持时无高亮属诚实降级）；② 版块页「发新洞」按钮带 `/new?board=slug` 上下文，GET /new 校验后预选对应 radio（无效 slug 回落首个）；③ 发帖失败保留输入——POST /new 三条失败路径（风控/验证码/校验）统一 rerender 回填 title/content/已选版块，不再丢稿。联动：new.tsx（props + chips + 回填）/ board.tsx（按钮）/ index.tsx GET+POST /new（rerender 收敛）/ app.css。门：tsc 零错误 + 75 用例 + 冒烟（?board=zufang 预选 zufang、默认预选 shenye、版块页按钮带上下文、错验证码后错误条 + 版块选中 + 标题正文回显全部确认） ✓ 2026-09-05

---

## 变更记录

| 日期 | 内容 |
|---|---|
| 2026-09-04 | 项目启动；定名「空山」；身份码混合方案与古诗验证码风控方案定稿 |
| 2026-09-04 | 工程规范升级：改动纪律（依赖地图/联动调整）+ 切片验收门写入 AGENTS.md §2；P0 拆为 S0–S9 |
| 2026-09-04 | S1–S8 全部过门：骨架/基座/六页静态还原完成，编译零错误，截图验收通过 |
| 2026-09-04 | S9 完成：部署至 https://kongshan.hongyueqingfeng.workers.dev，六页线上验证 200；**P0 阶段收官** |
| 2026-09-04 | S10–S14 完成，**P1 收官**：身份码五步实测、六页接 D1、发帖/回复(楼层2/3/4自增)/抱抱(幂等)三链路、浏览计数 KV+Cron(+/清空)、线上全链路通过。风险处置：原 kongshan-db 被其他项目占用 → 新建专属库 kongshan-db-prod，未触碰旧库数据 |
| 2026-09-04 | S15–S20 完成，**P2 收官**：通知闭环、等级/收藏、古诗验证码、风控规则（冷却/限流/IP-HMAC）、关键词审核、举报×3 自动隐藏、12356 心理横幅、站务页 MOD_PASS。线上部署验证通过。经验：Git Bash curl 传中文为 GBK 致验证码误判——测试一律走 Node UTF-8 |
| 2026-09-04 | S21–S25 完成，**P3 收官**：KV 缓存（热帖榜/版块统计 60s）、robots+安全头、书法体自托管子集（2.7MB→299KB）、EmptyState 统一组件、D1 Time Travel 备份文档、域名实测 5/5。自定义域名 www.kongshan.ccwu.cc 确认绑定（API 核查）；发现 Cloudflare 托管 robots.txt 前置注入（不影响 noindex 兜底） |
| 2026-09-04 | git 仓库初始化 + v0.1.0 基线提交（P0–P3 全量进入版本控制；.dev.vars/.wrangler/node_modules/.zcode 已 gitignore） |
| 2026-09-05 | P4-1 完成：验证码绕过修复（created_at 格式根因 + identityAgeMinutes 双格式解析防线）、举报/登录 IP-HMAC 限流 5 次/小时；tsc 零错误过门 |
| 2026-09-05 | P4-2 完成：用户自助删除（10 分钟窗口、软删、canDelete 契约）；根治写路径 created_at 双格式存量 bug（新帖时间显示为空、删除窗口失效）；本地端到端验收 25/25（含 P4-1 四项风控回归） |
| 2026-09-05 | P4-3 完成：站务处置闭环（隐藏/恢复/删除 + 处置自动关闭未决举报 + 队列状态徽标与内容摘要）；端到端验收 29/29（含越权防护、终态不可恢复、计数防重） |
| 2026-09-05 | P4-4 完成：搜索/精华区/引用/通知筛选四项设计稿元素全部落地（含站务加精入口、写路径零改动引用）；端到端验收 51/51（含全 10 页回归与 XSS 转义） |
| 2026-09-05 | P4-5 完成：文档与代码对齐（AGENTS 依赖地图 mock→db 数据层；ARCHITECTURE schema 四处偏差修正 + 风控表补 P4 防线；db:migrate 库名修正）——**P4 阶段收官** |
| 2026-09-05 | **P4 全量部署上线**（版本 8a54f753）：自定义域名 www.kongshan.ccwu.cc 九页 200 + /t 详情 + 搜索命中中文关键词 + 通知筛选 chips + 搜索 form/精华区导航 + 安全头三件套 + 身份懒签发，全部线上确认（全程只读，未在线上做写操作）；workers.dev 本机直连不可达（大陆可达性已知问题，自定义域名正常） |
| 2026-09-05 | P5 收官：P5-1 种子计数自洽（线上 views 594,850→9,051，楼层/抱抱计数与真实表一致）；P5-2/3 去硬编码假数据 + 身份文案对齐；P5-4 楼层原子生成（并发实测唯一）+ 楼层抱抱通知 + 回复自伤横幅 + 统计口径「发言洞友」；端到端验收 25/25 |
| 2026-09-05 | **P5 部署上线**（版本 ad0e09f7）并推送 GitHub：线上复验品牌语/发言洞友/累计发言/今日新洞/无 1,286 与 3,412 残留/安全头，全部通过（只读验证） |
| 2026-09-05 | **P6 部署上线**（版本 7dfb4093）并推送 GitHub：线上 app.css 三档断点（1080/880/560）与桌面规则并存确认，页面抽查 200；手机排版待用户真机验收 |
| 2026-09-05 | 接手深度审查：全量通读源码与文档，确认 2 个数据一致性 bug（收到的抱抱恒为 0、楼层等级冻结）+ 站务登录无限频等加固项，立项 P7（3 切片）与 P8 候选清单 |
| 2026-09-05 | **P7 收官**：P7-1 收到的抱抱改 hugs 表实时 COUNT；P7-2 楼层等级/首页累计发言改实时口径（UNION 一次取全楼作者发言数，洞务组特例保留）；P7-3 migration 0003 移除 identities 死列 level/hug_received 并联动全部引用（共同根因：无写路径的冗余列）。三片均过 tsc 门。⚠️ 上线顺序：**先 deploy 后 d1 migrations apply**；冒烟清单见 P7 各切片用户侧注记 |
| 2026-09-05 | **P8 收官**（6 切片均过 tsc 门）：P8-1 站务登录限频+HMAC 签名会话+恒定时间比较（新建 modauth.ts，7 处明文比较收敛）；P8-2 favicon data-URI + /favicon.ico、/robots.txt 豁免签发 + 404/500 占位兜底（复核修正：robots.txt 本是静态资产不经 Worker）；P8-3 /login Set-Cookie 规范为独立响应头；P8-4 migration 0004 补齐 4 设计版块并重排分组 sort（seed 同步，双路径一致）；P8-5 重置身份兑现旧码作废 + ARCHITECTURE 三处对齐（字符集/分页声称/CSRF 记录）；P8-6 首访身份码 freshCode 回退 + 搜索 LIKE 转义。用户侧操作：deploy → migrations apply（0003+0004）→ 回归清单见各切片注记 |
| 2026-09-05 | **P9 收官**（5 切片均过门，待部署）：P9-1 抱抱/收藏/举报改回跳来源页+结果提示条（修复点按钮落裸 JSON 页的现网缺陷，open-redirect 守卫）；P9-2 楼层回复按钮锚点落地 + reply_to 死字段清理；P9-3 只看楼主视图（?op=1）；P9-4 顶栏消息未读红点全站联动（badge 10/10 页面覆盖）；P9-5 站务置顶 toggle。测试经验沉淀：Git Bash MSYS 路径转换改写表单值 → MSYS_NO_PATHCONV=1 + URL 编码；新身份冷却拦自动化测试 → Node UTF-8 脚本内置古诗求解 |
| 2026-09-05 | **P10 收官**（5 切片均过门，待推送触发 CI 首跑）：P10-1 vitest 单测基建 8 模块 66 用例（TTL 感知 KV stub + fake timers），AGENTS.md 验收门升级「tsc + npm test + 冒烟」三重门；P10-2 GitHub Actions CI（不自动部署，本地干净检出验证等价链）；P10-3 抱抱/收藏动作限流（1 分钟 10 次）+ 抱抱通知 1 小时去重；P10-4 新建 db/mod.ts 收敛站务/举报/身份 SQL，index.tsx 内联 SQL 清零，**回归发现并修复 /me/reset 的 Set-Cookie 拼接遗留 bug（P8-3 漏改）**；P10-5 通知/搜索分页 + flushViews 游标循环。冒烟踩坑记录：本地共享 127.0.0.1 限流桶会跨轮次耗尽（dev 下 cf-connecting-ip 可伪造供测试用，线上由边缘覆写不可伪造）；隐藏帖不进版块列表属预期行为 |
| 2026-09-05 | **P7+P8 部署上线**（版本 bcf4405f）并推送 GitHub：本地冒烟全绿（本地 0003/0004 迁移 + wrangler dev 十页/豁免路径 0 Cookie 下发/站务签名会话错码拒对码进/详情页 UNION 等级/搜索 ESCAPE/首访 freshCode）后按「先 deploy 后迁移」顺序上线；远程 0003+0004 迁移成功（PRAGMA 确认 identities 死列已删、boards 9 个含 4 新版块）；线上只读复验（单 Cookie 罐全程一次签发）——15 页 200 + 404 兜底、4 新版块首页渲染、favicon data-URI、楼层等级实时计算含洞务组特例、/me 身份码卡片、安全头三件套，全部通过 |
| 2026-09-05 | 接手第四轮七角色深度审查（安全/数据/前端/产品/架构/DevOps/QA，全量源码+文档通读，tsc+69 用例基线绿），立项 P11 七切片：时间正确性（Workers UTC 致楼层时间差 8 小时+今日日界偏差）、写路径加固（safeReturn 反斜杠 open redirect、quote/reason 无上限、toggleHug 不验目标、cookie 缺 Secure、CSP 缺 frame-ancestors）、查询与索引（getThreads 最后回复全量拉取、0005 identity 索引、flushViews 子请求预算、周抱抱口径漏楼层）、发帖体验（chips 假选中态、版块上下文丢失、失败丢稿、回复静默失败）、口径与文案（热帖榜抱抱标成回复、搜索计数、面包屑写死情感区、我回应的锚点）、架构清理（版块三处事实来源、post_count 反向死列、index 残留 SQL、死 CSS）、运维小项（observability/CI concurrency/危险操作确认/分页窗口化） |
