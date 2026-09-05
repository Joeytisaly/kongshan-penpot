// 共享布局：顶栏 + 绿色版块导航条 + 页脚（6 页共用，改动需全页回归——AGENTS.md §2）
import type { FC, PropsWithChildren } from "hono/jsx";
import type { Identity } from "../lib/types";

// 顶栏导航为策划型设计元素（画板通用结构）：精选版块 + 精华区/站务入口。
// 有意不随 boards 表自动扩展（P11-6 注记）——新增版块默认只进首页版块广场与左栏导航，
// 是否上顶栏由运营判断后手工追加。
const NAV_ITEMS: Array<[string, string]> = [
  ["全部版块", "/"],
  ["深夜树洞", "/b/shenye"],
  ["情感树洞", "/b/qinggan"],
  ["职场吐槽", "/b/zhichang"],
  ["锦鲤祈愿", "/b/jinli"],
  ["灵异夜话", "/b/lingyi"],
  ["精华区", "/essence"],
  ["站务", "/mod"],
];

const SEARCH_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6.8" cy="6.8" r="4.4" stroke="currentColor" stroke-width="1.6"/><path d="M10.3 10.3L14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

export const Layout: FC<PropsWithChildren<{ title: string; activeNav?: string; me: Identity; unread?: number }>> = ({
  title,
  activeNav,
  me,
  unread,
  children,
}) => (
  <html lang="zh-CN">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="robots" content="noindex,nofollow" />
      <title>{title} · 空山</title>
      {/* data-URI favicon（P8-2）：浏览器不再默认请求 /favicon.ico（该路径会落入 Worker 404 并触发身份签发） */}
      <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='14' fill='%232F6B4F'/%3E%3Ccircle cx='16' cy='13' r='6' fill='%231E4A36'/%3E%3C/svg%3E" />
      <link rel="stylesheet" href="/tokens.css" />
      <link rel="stylesheet" href="/app.css" />
    </head>
    <body>
      <header class="topbar">
        <a class="logo" href="/">
          <span class="logo-mark" />
          <span class="logo-text">空山</span>
        </a>
        <form class="search" action="/search" method="get">
          <span dangerouslySetInnerHTML={{ __html: SEARCH_ICON }} />
          <input class="search-input" type="text" name="q" placeholder="搜索树洞里的心事…" maxlength={30} aria-label="搜索树洞里的心事" />
        </form>
        <div class="topbar-actions">
          <span class="avatar">洞</span>
          <span class="topbar-user">洞友 #{me.displayNo}</span>
          <a class="topbar-link" href="/me">我的树洞</a>
          <a class="topbar-link" href="/notifications">消息{unread ? <span class="unread-badge">{unread > 9 ? "9+" : unread}</span> : null}</a>
          {/* P12-1：/login 此前全站零入口——丢 Cookie 的用户无法通过 UI 找回身份 */}
          <a class="topbar-link" href="/login">找回身份</a>
          <form action="/logout" method="post" class="topbar-form">
            <button type="submit" class="topbar-link topbar-btn">退出</button>
          </form>
        </div>
      </header>
      <nav class="navbar">
        {NAV_ITEMS.map(([label, href]) => (
          <a href={href} class={label === activeNav ? "active" : ""}>{label}</a>
        ))}
        <span class="navbar-note">匿名树洞 · 不记录 IP · 请温柔待人</span>
      </nav>
      <main class="container">{children}</main>
      <footer class="footer">
        空山 · 匿名树洞社区 · 本站内容均由匿名用户发布，不代表本站立场 · © 2026 空山
      </footer>
    </body>
  </html>
);
