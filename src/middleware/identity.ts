// 身份中间件：Cookie 免登 + 懒签发（无 Cookie 首次访问自动成为洞友）
// 依赖联动：被 index.tsx 全路由使用；新增/修改需全页回归（AGENTS.md §2）
import type { MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { Env } from "../types/env";
import { createIdentity, CODE_COOKIE, type IdentityRow } from "../lib/identity";

export const COOKIE_NAME = "ks_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 年

// 免签发路径（P8-2）：robots.txt 是静态资产（本就不经 Worker，列此兜底）；/favicon.ico 无资产
// 文件会落入 Worker 404。这些请求无身份语义，跳过查询与签发，防 identities 表被无 Cookie 客户端
// 灌大。命中路径的请求不带 identity——notFound/onError 已做占位兜底
const SKIP_ISSUE_PATHS = new Set(["/robots.txt", "/favicon.ico"]);

/** 身份 Cookie 公共参数 */
export const cookieOpts = {
  httpOnly: true, sameSite: "Lax" as const, path: "/", maxAge: COOKIE_MAX_AGE,
};

type Ctx = { Bindings: Env; Variables: { identity: IdentityRow; freshCode?: string } };

export const identityMiddleware: MiddlewareHandler<Ctx> = async (c, next) => {
  if (SKIP_ISSUE_PATHS.has(c.req.path)) return next();
  const cookieId = getCookie(c, COOKIE_NAME);
  if (cookieId) {
    const row = await c.env.DB.prepare(
      "SELECT * FROM identities WHERE id = ?",
    ).bind(cookieId).first<IdentityRow>();
    if (row) {
      c.set("identity", row);
      return next();
    }
    // Cookie 无效（身份被重置）→ 作废旧 Cookie 重新签发
    deleteCookie(c, COOKIE_NAME);
  }

  // 懒签发：首次访问即成为匿名洞友
  const { id, code, codeHash, displayNo } = await createIdentity(c.env.AUTH_PEPPER);
  await c.env.DB.prepare(
    "INSERT INTO identities (id, code_hash, display_no, created_at, last_seen_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))",
  ).bind(id, codeHash, displayNo).run();

  c.set("identity", {
    id, code_hash: codeHash, display_no: displayNo,
    post_count: 0,
    // 与 D1 datetime('now') 同构（UTC、空格分隔）：ageMin/toDisplay 等消费方按同一格式解析
    created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
    last_seen_at: null,
  });
  setCookie(c, COOKIE_NAME, id, cookieOpts);
  setCookie(c, CODE_COOKIE, code, cookieOpts); // 身份码明文随 Cookie 携带，/me 页展示供用户抄写
  // P8-6：当次请求的响应头读不到，/me 首访靠这里拿到明文码渲染「请抄写保存」卡片
  c.set("freshCode", code);
  await next();
};
