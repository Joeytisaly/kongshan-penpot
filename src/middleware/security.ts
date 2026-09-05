// 安全响应头中间件（S23）：禁收录 + 防嗅探 + 引用策略 + 宽松 CSP
// 依赖地图：注册于 index.tsx 全路由；改动需全页回归（AGENTS.md §2）
import type { MiddlewareHandler } from "hono";

export const securityMiddleware: MiddlewareHandler = async (c, next) => {
  await next();
  // 页面与 API 统一安全头
  c.header("X-Robots-Tag", "noindex, nofollow");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  // CSP 宽松起步：允许同源与内联样式（Hono JSX 输出 style 属性需要）；frame-ancestors 禁被嵌（P11-2）
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self'; connect-src 'self'; frame-ancestors 'none'",
  );
};
