# 空山

> 空山不见人，但闻人语响。——王维《鹿柴》

**空山**是一个纯文字的匿名树洞社区（BBS）：没有图片、没有语音、没有热搜，只有文字和善意。每位访客由系统签发匿名身份码，以「洞友 #编号」示人，没有人知道你是谁。

- 原型设计：Penpot 画板 6 块（版块广场 / 帖子列表 / 盖楼详情 / 发新洞 / 消息通知 / 我的树洞）
- 技术栈：Cloudflare Workers + Hono（SSR）+ D1（SQLite）+ KV + Workers Static Assets
- 目标用户：中国大陆（架构与风控方案均按大陆可达性设计，不依赖任何境外验证服务）

## 文档索引

| 文档 | 说明 |
|---|---|
| [PROGRESS.md](PROGRESS.md) | 开发进度表（任务/状态/验收标准），开发唯一事实来源 |
| [AGENTS.md](AGENTS.md) | 协作者与智能体开发规范（先读这个） |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 技术架构、身份码方案、风控、数据模型、API |
| [docs/DESIGN.md](docs/DESIGN.md) | 设计规范：品牌、色板、字体、页面清单、文案语气 |

## 快速开始

```bash
npm install
npx wrangler dev      # 本地开发
npx wrangler deploy   # 部署上线
```

## 产品原则

1. **纯文字**：不做图片/语音/视频，降低审核与合规压力
2. **匿名但能找到自己**：身份码是唯一凭证；不记录 IP、不收集真实身份
3. **温柔是第一功能**：文案、配色、机制（抱抱代替点赞）都为善意服务
