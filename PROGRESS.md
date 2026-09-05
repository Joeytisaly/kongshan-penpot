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
- [x] **P11-5 口径与文案**：① 热帖榜契约字段 HotItem.replies → hugs + 首页渲染「N 抱抱」（原榜单按 hug_count 排序却显示「N 回复」，数字与标签事实错误）；② 搜索结果计数改真实 total（原显示本页条数，分页后误导），searchThreads 返回结构补 total；③ 版块页面包屑分组名由 navGroups 推导（原写死「情感区」，租房互助页也显示情感区），static.ts 新增 boardGroupName；④ 「我回应的」行链接带 #floor-N 锚点并修复重复 key（原 id=thread_id，同帖多条回复 key 冲突且无法定位具体楼层）。联动：types.ts（HotItem/MyThread 契约）/ queries.ts / home.tsx / search.tsx / static.ts / board.tsx / me.tsx / index.tsx（搜索透传）。门：tsc 零错误 + 75 用例 + 冒烟（「4 抱抱」「共 5 条」「空山 › 生活区 › 租房互助」、/me 链接 #floor-6） ✓ 2026-09-05
- [x] **P11-6 架构清理**：① 版块分组单一事实来源——migration 0006 加 boards.group_name 并回填（fresh 路径 seed 自带分组、0004 版块由 0006 UPDATE 回填，双路径一致），seed 同步，契约 Board 补 group，首页左栏导航改由 DB 分组渲染，static.ts navGroups 与 P11-5 的 boardGroupName 退役（面包屑直接用 board.group），NavGroup 死契约删除；顶栏 NAV_ITEMS 保留为策划型设计元素（layout.tsx 注记固化）；② migration 0007 DROP identities.post_count（P7 死列的反向形态：只写不读）——createThread 只维护 last_seen_at，IdentityRow/懒签发对象/契约 Identity.totalPosts（改可选，仅首页注入实时值）/seed/normalize-seed 全链路联动；③ index.tsx 版块热帖内联 SQL 收敛 queries.getBoardHot（兑现 P10-4「内联清零」宣称）；④ 死 CSS 清理（online-chips 三条、compose-textarea p）；⑤ KV 缓存键随契约形状升级 cache:boards/hot → :v2（防部署后 60s 旧形状缓存渲染 undefined）。⚠️ 0007 上线顺序：**先部署代码后迁移**（旧 createThread UPDATE 在列消失后失败）；0006 与部署顺序无关。门：tsc 零错误 + 75 用例 + 本地 0006/0007 迁移成功 + 冒烟（13 路径 200+404、左栏 3 分组 9 版块 DB 驱动、面包屑趣味区、累计发言实时 0） ✓ 2026-09-05
- [x] **P11-7 运维小项**：① wrangler.jsonc 开 observability（线上错误/日志 dashboard 可查，此前排查只靠 curl）；② CI 加 concurrency 取消 superseded 运行；③ 危险操作确认页（no-JS 两步式）——/me/reset-confirm（重置不可逆，提示旧码永久作废）与 /mod/delete-confirm（终态删除前展示被删内容摘要防误删/怒删，未登录回跳 /mod），me.tsx 重置按钮与 mod.tsx 两处删除按钮改链接，queries 新增 getModTargetSummary（含 pending/hidden 状态）；④ 分页窗口化——纯函数 lib/pagination.ts（pageWindow，5 组边界用例）+ 共享 components/pagination.tsx，替换 board/notifications/search 三处全量页码渲染（几百页时原实现输出几千链接）。门：tsc 零错误 + 80 用例 + 冒烟（8 页 200 含两个确认页、/me 链接、站务队列删除链接、未登录回跳、分页窗口渲染） ✓ 2026-09-05

**P11 阶段收官。** 用户侧上线操作（按序）：① `npx wrangler deploy`（先部署：0007 要求新代码先上，createThread 已不写 post_count）→ ② `npx wrangler d1 migrations apply kongshan-db-prod --remote`（0005/0006/0007，其中 0005/0006 顺序无关、0007 必须在部署后）→ ③ 线上只读回归：首页（楼层/列表时间为北京时间、热帖榜「N 抱抱」、左栏 3 分组 9 版块）、/t 详情（时间、引用）、/new（?board= 预选、chips 跟随选中）、/me（重置走确认页、我回应的锚点）、安全头（Set-Cookie Secure、CSP frame-ancestors）、/mod（删除走确认页）。已知的可接受残留：SVG 图标内 5 处硬编码色值（P8-6 决策维持：需先改 DESIGN.md 色板再动）。

---

## P12 接手第五轮：使用者角色审查修复（身份动线 / 防刷补口 / 互动补全 / 移动与无障碍）

> 来源：2026-09-05 十二类使用者角色走查（新访客/倾诉者/回应者/找回者/后悔者/危机用户/举报者/被骚扰者/洞务/移动端/无障碍/恶意用户）。
> 纪律同 P11：每片过门 = tsc 零错误 + npm test 全绿 + wrangler dev 本地冒烟；开工前过依赖地图，联动同片完成；上线顺序敏感处标注。

- [x] **P12-1 身份动线闭环**：① 顶栏加「找回身份」链接（/login 此前全站零入口——丢 Cookie 用户必须手输 URL，审查发现 #3）；② 首帖引导——POST /new 成功后检测该身份 published 帖数==1，redirect 带 ?first=1，详情页提示条引导去「我的树洞」抄写身份码（审查发现 #1：身份码发现缺失是最主要的身份流失点）；③ 站务会话可退出——新增 POST /mod/logout（deleteCookie 带 path=/mod，此前 24h 会话无 UI 登出、共享设备风险，审查发现 #14），/logout 顺手双保险清 mod cookie。联动：layout.tsx / index.tsx（logout、/new 首帖检测、thread first 提示）/ mod.tsx（退出按钮）/ app.css（mod-head）/ ARCHITECTURE §5。门：tsc 零错误 + 80 用例 + Node UTF-8 冒烟 6 断言全过（顶栏链接、古诗验证码全流程首帖 redirect ?first=1、详情页引导提示条、mod 登录含退出按钮、logout 下发 mod_auth=; Max-Age=0; Path=/mod、删 cookie 后回登录态）。记录的设计边界：无状态签名令牌的「登出」=浏览器删 cookie，已拷贝的令牌值在过期前仍可重放（与 JWT 同理，MVP 接受；未来可加令牌版本号或 KV 黑名单） ✓ 2026-09-05
- [x] **P12-2 防刷补口**：① 回复补 IP-HMAC 限流 30 条/小时（原仅每身份 3 条/分钟，清 Cookie 换身份即绕过——懒签发零成本，可无限刷回复/灌通知/刷 reply_count，审查发现 #21；正常互动远达不到、CGNAT 共享出口留余量，与发帖 10 帖/小时同模式）；② 通知收件箱保护 notifyRateCap——每收件人每分钟最多 6 条新通知，超出静默丢弃（hugNotifyOnce 管「同人重复」，这里管「无限身份涌进来的总量洪峰」，真实洞友一分钟 6+ 条已属重度互动）；③ ARCHITECTURE §3 风控表补两行。联动：risk.ts（check/record reply 分支 + notifyRateCap）/ writes.ts（notify 加 kv 参数与 cap 接入、createReply 签名加 kv）/ index.tsx（reply 调用）/ risk.test.ts（+3 用例）。门：tsc 零错误 + 83 用例 + 冒烟（伪造 cf-connecting-ip 隔离桶：30 条回复成功、第 31 条 redirect ?err=1 被 IP 限流拦截；楼主 30 条回复仅落 6 条通知=cap 精确生效；冒烟数据已清理） ✓ 2026-09-05
- [x] **P12-3 互动补全**：① 举报两步化——楼层「举报」改原生 `<details>` 折叠（no-JS 可用），展开才见可选理由 textarea（maxlength 100，后端 P11-2 已截断）+ 确认按钮，闭合态外观与原按钮一致（审查发现 #13：此前每份举报都是「未填理由」）；② 自伤横幅加行动项「想现在说说 → 深夜树洞」链接（审查发现 #12：横幅只有号码没有出口）；③ 盖楼页尾加「回到顶部」锚点（HTML5 #top 无需锚元素，审查发现 #8）；④ 站务两队列加 LIMIT 50 + 真实 COUNT 返回 {items, total}，超限显示剩余条数（审查发现 #15：队列无上限会撑爆页面）。联动：thread.tsx（举报 details/横幅/#top）/ queries.ts（队列）/ mod.tsx（props 与计数）/ index.tsx（透传）/ app.css（report-box/back-top）。门：tsc 零错误 + 83 用例 + 冒烟（details×楼层渲染、Node UTF-8 举报理由落库正确、自伤帖 12356 横幅+行动链接、#top、灌 51 条举报后 64 条 open 只渲染 50+「还有 14 条未显示」；冒烟数据已清理）。踩坑记录：mod-login 5 次/小时被自己的冒烟次数限频——本地可用 `wrangler kv key delete <key> --binding KV --local`（key 为位置参数）清限流键 ✓ 2026-09-05
- [x] **P12-4 移动与无障碍 + 已知边界文档**：① 移动断点（≤560px）输入控件字号提至 16px——iOS Safari 对 <16px 输入框聚焦时强制放大页面（审查发现 #17：搜索/发帖/回复框全 13px 中招），桌面画板还原不受影响；楼层操作加纵向命中区（#18）；② 表单编程关联——发帖（标题/正文/验证码）/登录（身份码）/站务（口令）的 <p> 文案改 `<label for>`、输入框补 id，搜索框与回复框补 aria-label（审查发现 #19）；③ 操作反馈提示条补 `role="status"`（读屏可感知，#20 部分）；④ DESIGN.md §6 补第 5 条移动输入字号规范；⑤ ARCHITECTURE 新增 §8「已知边界与暂不做决策」七项（帖子不可编辑/站务无审计/抱抱与浏览计数可灌/编号撞号/排序切换/楼层搜索/站务令牌无吊销——审查发现 #4/#16/#22/#23/#25 文档化，防重复发现，各带触发条件）。顺带修复 #5：发帖字数指示器「0 / 500」静态误导改「最多 500 字」。门：tsc 零错误 + 83 用例 + 冒烟（label/id 三对+login、aria-label ×2、thread ?err=1 提示条 role=status、CSS 断点 16px、7 页 200） ✓ 2026-09-05
- [x] **P12-5 引用楼层通知 + 存量通知动作者 bug 修复（互动闭环收尾，审查发现 #7）**：① POST /t/:id/reply 携带 quote 目标 id 时，被引用楼层/帖子的作者获得「洞友 #xxxx 在「帖子」中引用了你的楼层」通知（type=reply，落「回复我的」筛选）；排除自引与楼主（楼主已由回复通知覆盖，防双重通知）；notifyRateCap 收件箱保护自然生效；② **冒烟发现并修复存量 bug（自 P2 起）**：回复通知的动作者误用收件人（楼主）自己的编号——「洞友 #4821 回复了你的树洞」发给 #4821 本人，读起来像自己回复自己；现动作者一律取回复者本人编号（对齐抱抱通知的正确写法）。联动：queries.ts getQuotePreview 补 identity_id / writes.ts createReply 加 opts.quotedAuthorId + 通知重构 / index.tsx 透传。门：tsc 零错误 + 83 用例 + Node 冒烟三边界（A 引他人楼层→id-3302 收到引用通知且动作者=#9322、B 引楼主→仅回复通知且动作者=#7966、A 自引→无引用通知） ✓ 2026-09-05

**P12 阶段收官。** 用户侧上线操作：① `npx wrangler deploy`（无迁移，本阶段无 schema 变更）→ ② 线上只读回归：顶栏「找回身份」、/t 详情（details 举报折叠、#top、role=status）、/new（label 关联）、/mod（退出站务、队列计数）、移动真机（输入框聚焦不再放大页面）。CI 首跑仍待推送 GitHub 触发。

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
| 2026-09-05 | 接手第四轮七角色深度审查（安全/数据/前端/产品/架构/DevOps/QA，全量源码+文档通读，tsc+69 用例基线绿），立项 P11 七切片：时间正确性、写路径加固（open redirect/引用伪造/灌表/Cookie/CSP）、查询与索引、发帖体验、口径与文案、架构清理、运维小项 |
| 2026-09-05 | **P11 收官**（7 切片均过门）：P11-1 时间按 Asia/Shanghai 渲染 + 上海日界 + joinDays UTC 解析；P11-2 safeReturn 反斜杠归一 / 引用快照服务端唯一生成 / reason 截断 / toggleHug 存在性校验 / Secure cookie / frame-ancestors / 回复失败提示条（P11-4 项前移）；P11-3 最后回复窗口函数化 + 0005 identity 索引 + flushViews 分批限子请求预算（20 键/次）+ 周抱抱口径补楼层；P11-4 版块上下文预选 / chips :has() 选中态 / 失败保留输入；P11-5 热帖榜抱抱标签（HotItem.replies→hugs）+ 搜索真实 total + 面包屑分组推导 + 我回应的 #floor 锚点；P11-6 版块分组入库（0006 boards.group_name，navGroups/NavGroup/boardGroupName 退役）+ post_count 死列清理（0007，Identity.totalPosts 改可选）+ getBoardHot 收敛 + 死 CSS + 缓存键 v2；P11-7 observability + CI concurrency + 重置/删除两步确认页 + 分页窗口化（lib/pagination + 共享组件，测试 80 用例）。上线顺序「先 deploy 后迁移」已按此执行（见下行） |
| 2026-09-05 | **P9+P10+P11 全量部署上线**（版本 11b4dcfe）并远程应用 0005/0006/0007 迁移（deploy 与迁移背靠背执行，group_name 读窗口秒级）；远程 schema 校验通过，线上只读回归 11 项全绿（含楼层时间北京时间核验 UTC 09:36→渲染 17:36），全程未在线上做任何写操作 |
| 2026-09-05 | 十二类使用者角色走查（新访客/倾诉者/回应者/找回者/后悔者/危机用户/举报者/被骚扰者/洞务/移动端/无障碍/恶意用户），25 项发现，核心结论：工程防线已密而「用户能不能找到门」是最大洞——/login 零入口、身份码无引导保存、站务会话退不出、回复无 IP 限流。立项 P12 四切片 |
| 2026-09-05 | **P12 收官**（4 切片均过门，待部署）：P12-1 身份动线闭环（顶栏找回身份入口、首帖 ?first=1 身份码引导、/mod/logout 站务退出——含无状态令牌登出边界记录）；P12-2 防刷补口（回复 IP-HMAC 30 条/小时、通知收件箱每分钟 6 条上限，冒烟 30 过 31 拦、楼主 30 回复仅落 6 通知）；P12-3 互动补全（举报 details 折叠+可选理由、自伤横幅行动项、回到顶部、站务队列 LIMIT 50+COUNT）；P12-4 移动与无障碍（iOS 16px 输入字号、触控命中区、label/aria 关联、role=status）+ ARCHITECTURE §8 已知边界七项文档化。测试 83 用例。⚠️ 部署注意：mod_auth 现带 Secure（P11-2）+ /mod/logout 新增；无 schema 变更、无迁移，单 deploy 即可 |
| 2026-09-05 | **P12 部署上线**（版本 21ea8a23，无迁移）：线上只读回归全绿——14 路径 200+404、顶栏「找回身份」链接（Node UTF-8 核验，bash grep 中文模式假阴性）、/t 详情 details 举报折叠+#top+快速回复 aria+提示条 role=status、/new 表单 label 关联、搜索 aria-label、/mod 登录表单口令 label 且无会话时无退出按钮、Secure Cookie+frame-ancestors 保持、app.css 含 iOS 16px 断点。线上未做任何写操作（回复 IP 限流与通知上限已在本地以伪造 IP 冒烟验证）。仍待用户推送 GitHub 触发 CI 首跑 |
| 2026-09-05 | **P12-5 部署上线**（版本 4008b0b2，无迁移）：引用楼层通知 + 回复通知动作者存量 bug 修复上线；线上抽查 5 页 200、引用链接/举报折叠/#top 渲染正常。CI 首跑仍待推送 GitHub |
| 2026-09-05 | **P13 收官并部署上线**（版本 f9eb8ea5；远程先应用 0008 再 deploy）：P13-1 通知整行可点击（POST 标记已读 + 303 跳回 /t/:id#floor-N，payload 扩展 threadId/floor，旧通知优雅降级）；P13-2 处置流水 mod_actions（0008，八类动作落日志，/mod 页尾最近 20 条）；P13-3 盖楼每页 20 楼分页（楼主层常驻、通知/回帖跳转按楼层换算页码、op 视图不翻页）；P13-4 退出 ?bye=1 温柔提示条 + scripts/backup.sh 月度备份脚本（gitignore 排除导出文件）。线上只读回归 10 路径 200+404、单页帖无分页渲染正确。CI 首跑仍待推送 GitHub |

---

## P13 交互闭环与规模化

> 来源：P12 后复查——发现两轮审查漏掉的最大交互断点（通知行不可点击跳转）+ 提前收掉最大规模性缺口（千楼帖全量加载）。
> 纪律同 P11/P12：每片过门 = tsc 零错误 + npm test 全绿 + wrangler dev 本地冒烟；开工前过依赖地图，联动同片完成。

- [x] **P13-1 通知可跳转闭环**：① notify payload 扩展 threadId/floor（回复通知带楼层号、抱抱通知带帖子 id、楼层抱抱补查 thread_id）；② 契约 Notice 加 threadId?/floor?，getNotices 解析；③ 通知行改为整行 POST 表单按钮（点击 = 标记该条已读 + 303 跳转 /t/:id#floor-N）——用 POST 而非链接（GET 带副作用不符语义、防预取误触），旧 payload 无 threadId 优雅降级为纯文本行；④ 新路由 POST /notifications/open（校验归属，他人通知 id 动不了）。门：tsc 零错误 + 83 用例 + Node 冒烟 5 断言（可点击表单渲染、查看›标记、点击 303 到 /t/:id#floor-2 精确命中、红点清零）。踩坑：hono/jsx 的 `<input …/>` 在 value 后无空格，正则别写 `" \/>"` ✓ 2026-09-05
- [x] **P13-2 站务处置日志**：① migration 0008 新表 mod_actions（action/target_type/target_id/created_at，无外键纯流水）；② db/mod.ts 全部站务动作落日志——approve/hide/restore/delete/essence/pin/resolve/举报达限 auto-hide；③ /mod 页尾新增「处置日志（最近 20 条）」；④ ARCHITECTURE §4 补 schema、§8 边界改写（流水已收口，按人问责仍待洞务账号体系）。门：tsc 零错误 + 83 用例 + 冒烟（过审/隐藏/恢复后日志区块渲染，D1 流水三条 action/target 全部正确；本地 0008 迁移成功；冒烟数据已清理） ✓ 2026-09-05
- [x] **P13-3 盖楼分页**：① getThreadDetail 楼层查询改 `?page=` 每页 20 楼（floor 区间），meta 增加总页数（totalPages = ceil((reply_count+1)/20)），契约 ThreadDetail 补 page/totalPages；② 详情页复用 P11-7 共享分页组件（链接保留 op=1）；③ 通知跳转 /notifications/open 与回帖成功跳转都按楼层号换算目标页（floorToPage）；④ 引用预览/只看楼主不受影响（op 视图单层不翻页）；⑤ 自伤横幅语义调整为「楼主+当前页可见楼层」并记入 ARCHITECTURE §5。**设计决策：楼主层每页常驻**（第 2 页 = 楼主 + 6 回复共 7 层）——树洞场景保留原帖上下文，楼层号原值不受影响。门：tsc 零错误 + 83 用例 + 冒烟（26 楼帖：第 1 页 20 层+分页、第 2 页 7 层含 floor-25 锚、op 视图 1 层无分页、回帖跳转带 ?page=2#floor-29；冒烟数据已清理） ✓ 2026-09-05
- [x] **P13-4 运维小件**：① 退出温柔化——/logout 改回首页带 ?bye=1 提示条「你已安静离开，凭身份码随时找回」（消化审查发现 #2 退出语义困惑：让匿名访客明白退出=收好当前身份而非消失）；② scripts/backup.sh 月度 D1 导出脚本（落实 ARCHITECTURE §7 备份纪律，.gitignore 排除 backup-*.sql）。门：tsc 零错误 + 83 用例 + 冒烟（/logout 回跳 ?bye=1、提示条 Node UTF-8 渲染正确且普通首页不受影响、8 页 200） ✓ 2026-09-05

**P13 阶段收官。** 部署顺序（P13-3 起旧版本无 mod_actions 依赖、新版本 /mod 依赖 0008）：**① 先 `wrangler d1 migrations apply kongshan-db-prod --remote`（0008 纯增量，旧代码不碰该表，先迁移零风险）→ ② `wrangler deploy`**。用户侧待办：推送 GitHub 触发 CI 首跑；月度执行 `./scripts/backup.sh`；手机真机验收 P12-4 输入框与 P13 分页。

---

## P14 回复体验与发送及时性修复（真实用户反馈）

> 来源：真实使用反馈两问题——①「选中其他人消息回复后，不显示回复给谁的，只是话题下多了条消息」；②「编辑好文案点发送，不能立即发出去需要过段时间」。
> 代码级确诊（走查前）：回复按钮为纯锚点无楼层语义（thread.tsx:64-66）+ replies 无 reply_to 列（0001_init.sql:43-53）——问题 1 根因；回复限流文案 bug（IP 每小时上限用户看到 1 分钟文案，index.tsx:498 丢 reason）+ 失败丢输入、违规词→待审全链路不可见（作者 /me 看不到/详情 404/洞务零提醒）、首页聚合 KV 60s 缓存无失效、删除楼层后页数脱钩——问题 2 四候选。
> 纪律同 P11–P13：每片过门 = tsc 零错误 + npm test 全绿 + wrangler dev 冒烟；走查测试内容打 P14-walk 标记并在删除窗口内自清理。

- [x] **P14-0 真实使用走查**：生产只读诊断（19 帖全部 published、无待审卡帖——排除审核假设；用户测试痕迹：4 秒内 4 条「辛苦了」连续落库=点发送无反馈连点全成功）+ 线上实测（回复服务器响应 532–1046ms 正常；新楼层显示但无归属标记=问题 1 实锤；第 4 条回复触发限流提示「一口气说了好多啦」且输入丢失）。**结论：问题 2 的「等好久」= 无 JS 表单点击后 1–2s 整页重载零反馈 + 连点重复 + 每小时上限被 1 分钟文案误导；后端写入毫秒级无真实延迟。** 测试内容已自清理 ✓ 2026-09-05
- [x] **P14-1 页数脱钩 bug**：getThreadDetail 总页数改按 MAX(floor) 推导（楼层号不回收，与 reply_count 脱钩后新回复会落在按 reply_count 算出的「不存在页」）。门：tsc 零错误 + 83 用例 + 冒烟（25 层帖删 21–25 楼 → pub=19/maxFloor=20，新回复得 26 楼：redirect ?page=2#floor-26、第 2 页存在且 floor-26 可见——修复前 totalPages=ceil(20/20)=1 该页不存在；冒烟数据已清理） ✓ 2026-09-05
- [x] **P14-2 回复失败保留输入+真实原因**：POST /t/:id/reply 失败（限流/违规词）从 redirect 改为 ThreadPage 原页重渲染（新增 replyError/replyValue props）——显示真实原因（区分 1 分钟冷却 / IP 每小时上限 / 违规词具体文案，此前统一被吞成一句话且 IP 上限文案永远展示不出来）、保留已输入内容与引用预览；顺带清理无生成方的 replyerr 死分支。门：tsc 零错误 + 83 用例 + 冒烟（连发 3 条成功后第 4 条 200 原页渲染：真实原因提示 + 输入完整保留在 textarea 内；冒烟数据已清理） ✓ 2026-09-05
- [-] **P14-3 写路径失效聚合缓存**：lib/cache.ts 固化缓存键常量并新增 bustHomeAggregates（发帖/回复/抱抱/删除/站务处置后调用，消掉首页「主题/帖子数/最后回复」≤60s 滞后）；mod.ts 借 logAction 收口（八动作必经）；insertReport/createThread/deleteOwn* 补 kv 参数。门：tsc + npm test + 冒烟（写后 KV 键被删、下次读重建） ✓ 2026-09-05
- [-] **P14-4 回复归属可见化**：① migration 0009——replies 加 reply_to_floor / reply_to_author 可空列；② 「回复」按钮携带楼层目标（GET /t/:id?reply=<floorId>#reply），回复框显示「回复 洞友 #xxxx（N 楼）」轻量预览（区别于引用的全文摘录）；③ POST 服务端按 id 解析归属（防伪造），落库 reply_to_floor/author；④ 楼层渲染可点击「回复 @N 楼」锚点（floorToPage 换算跨页跳转），作者名经 getAuthorLevels 扩展实时解析（不落死列，P7 教训）；⑤ 被回复者收「回复了你的楼层」通知（复用 P12-5 排除规则：自引与楼主不重复通知）；⑥ 联动修引用链接丢 ?page= 缺陷。门：tsc + npm test + 冒烟（回复带目标落库、标记渲染、跨页锚点、被回复者通知、无目标回复不受影响） ✓ 2026-09-05
- [x] **P14-5 待审可见性——走查证据不足，降级为后续候选**：生产库 19 帖全部 published、无 pending 卡帖，用户实际未命中该路径；「作者看不到待审帖（/me 过滤 pending）+ 洞务零提醒」的代码事实成立（queries.ts getMyThreads / layout.tsx 站务无角标），挂入 ARCHITECTURE §8 触发条件清单（待审真实发生时启用），本阶段不实施 ✓ 2026-09-05

**P14 阶段收官。** 部署顺序：0009 可空列与代码无顺序依赖（旧代码不读写），按「先迁移后部署」执行。二轮线上走查验证修复体感。
