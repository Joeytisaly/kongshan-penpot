# AGENTS.md — 空山协作者/智能体开发规范

欢迎。无论你是人还是 AI 智能体，按本文件执行即可规范、高效地参与「空山」开发。

## 0. 必读顺序

1. [README.md](README.md) — 项目是什么
2. [PROGRESS.md](PROGRESS.md) — 做到哪了、下一个任务是什么（**唯一事实来源**）
3. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 技术架构与数据模型
4. [docs/DESIGN.md](docs/DESIGN.md) — 设计规范（还原页面前必读）

## 1. 工作流约定

- **一次只做进度表中的一个切片**：开工前标 `[-]`，过验收门后标 `[x]` + 日期
- 发现新工作：追加到 PROGRESS.md 对应阶段，不要"顺手做了"却不记录
- 设计还原的验收基准是 **Penpot 画板**（6 块），不要凭想象发挥；设计稿没有的状态（空/错/加载）按 docs/DESIGN.md 的语气补

## 2. 改动纪律（牵一发而动全身）

**任何改动前，先答三个问题：**
1. 我改的东西被谁依赖？（查下方依赖地图）
2. 依赖它的模块要不要联动调整？要就一起改，不许只动一处
3. 改动归哪个切片？过哪道验收门？

**依赖地图**（改动左列 → 必须联动检查右列）：

| 改动对象 | 必须联动检查 |
|---|---|
| `assets/tokens.css`（设计变量） | 全部页面 + docs/DESIGN.md |
| `src/components/layout.tsx`（顶栏/导航/页脚） | 全部 6 个路由页（逐页冒烟回归） |
| `src/lib/types.ts`（数据契约） | 全部 routes + lib + 未来 D1 查询层 |
| `src/db/queries.ts` / `src/db/writes.ts`（数据层） | 全部 routes 页面 + 与 types.ts 契约的一致性 |
| 路由路径（如 `/b/:slug`） | 所有内部链接 + docs/ARCHITECTURE.md 路由表 |
| docs/DESIGN.md（设计规范） | tokens.css + 受影响页面 |
| docs/ARCHITECTURE.md（架构决策） | 对应代码模块 + PROGRESS.md |

**切片开发与验收门：**
- 大任务切成可独立验收的片，每片在 PROGRESS.md 里有明确验收标准
- 每片完成必须过门：`npx tsc --noEmit`（编译零错误）+ `wrangler dev` 冒烟（curl 关键标记或截图）
- **过门后先更新 PROGRESS.md，再开始下一片**
- 涉及共享层（layout/tokens/types/queries）的切片过门后，已完成的页面全部重新冒烟一次防回归
- **不许带病推进**：门没过，不开始下一片

## 3. 技术约定

- 运行时：Cloudflare Workers（**不要使用 Node.js 专有 API**）
- 框架：Hono + `hono/jsx` 服务端渲染；TypeScript 严格模式
- 数据：D1（关系数据）/ KV（缓存与限流计数）；SQL 一律参数化，禁拼接
- 静态资源：Workers Static Assets（`assets/` 目录）
- 常用命令：`npm run dev` / `npm run deploy` / `npm run typecheck` / `npm run db:migrate`
- 密钥：一律 `wrangler secret` 或 `.dev.vars`，**永不提交**
- 契约先行：`src/lib/types.ts` 是页面层与数据层之间的唯一契约；页面只依赖类型不依赖数据来源（P0 曾用 mock，自 P1 起为 D1 查询层，契约保证两者可互换）

## 4. 代码规范

- 目录：`src/routes`（页面与 API）、`src/components`（共享组件）、`src/lib`（身份/风控/审核/契约/缓存/展示格式化）、`src/db`（migration 与查询）、`assets/`（CSS/字体）
- 样式：只用 `tokens.css` 里的设计变量，**禁止硬编码色值**（色板见 docs/DESIGN.md）
- 命名：路由与文件 kebab-case；DB 字段 snake_case；TS 标识符 camelCase
- 每个路由文件顶部注释：对应 Penpot 画板编号（如 `// 画板 02 帖子列表`）

## 5. 文案规范（重要）

- 语气：温柔、简短、第二人称；不说教
- 术语统一：**洞友**（用户）、**发新洞**（发帖）、**抱抱**（点赞）、**楼层/楼主/沙发/板凳**
- 品牌名是「空山」；「树洞」是产品词汇（版块名、等级名等保留）
- 错误/空状态文案示例：`这里还很安静，做第一个说话的人吧。`

## 6. 安全红线

- 不记录原始 IP（只用 HMAC(IP, 每日盐) 做限流）
- 身份码服务端只存哈希
- 所有用户输入输出必须转义（XSS）；SQL 参数化（注入）
- 举报与自伤关键词逻辑不可绕过

## 7. 提交规范

- commit message：`类型(范围): 简述`，类型取 `feat/fix/docs/style/refactor/chore`
- 例：`feat(thread): 盖楼详情页静态还原`
- 一个 PROGRESS 切片对应一至多个 commit，切片过门前进度表必须先更新
