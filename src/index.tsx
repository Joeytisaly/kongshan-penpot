// 空山 · Hono 入口（S12：页面数据全部来自 D1 查询层）
import { Hono } from "hono";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HomePage } from "./routes/home";
import { BoardPage } from "./routes/board";
import { ThreadPage } from "./routes/thread";
import { NewThreadPage } from "./routes/new";
import { NotificationsPage } from "./routes/notifications";
import { MePage } from "./routes/me";
import { LoginPage } from "./routes/login";
import { ModPage } from "./routes/mod";
import { EmptyState } from "./components/empty";
import { Layout } from "./components/layout";
import { SearchPage } from "./routes/search";
import { EssencePage } from "./routes/essence";
import {
  getBoardBySlug, getBoardStats, getBoards, getCommunityStats, getEssenceThreads, getHotThreads,
  getMyFavorites, getMyReplies, getMyStats, getMyThreads, getMyTracks, getNotices,
  getOpenReports, getPendingThreads, getThreadDetail, getThreads, getWeekStats, isFavorited,
  searchThreads,
} from "./db/queries";
import { identityMiddleware, COOKIE_NAME, cookieOpts } from "./middleware/identity";
import { securityMiddleware } from "./middleware/security";
import { CODE_COOKIE, CODE_RE, createIdentity, hashCode, identityAgeMinutes, toDisplay, type IdentityRow } from "./lib/identity";
import { displayAuthor, formatCount } from "./lib/format";
import { levelFromPosts } from "./lib/level";
import type { Identity } from "./lib/types";
import { generateCaptcha, verifyCaptcha } from "./lib/captcha";
import { ipRateLimit, ipRateRecord, riskCheck, riskRecord } from "./lib/risk";
import { MOD_COOKIE, createModSession, timingSafeEqualStr, verifyModSession } from "./lib/modauth";
import { bumpViews, createReply, createThread, deleteOwnReply, deleteOwnThread, flushViews, toggleFavorite, toggleHug } from "./db/writes";
import type { Env } from "./types/env";

type AppEnv = {
  Bindings: Env;
  Variables: { identity: import("./lib/identity").IdentityRow };
};

const app = new Hono<AppEnv>();

// 安全头中间件：全部路由先过（禁收录/防嗅探/CSP）
app.use("*", securityMiddleware);
// 身份中间件：全部路由先过（Cookie 免登 / 懒签发）
app.use("*", identityMiddleware);

const PAGE_SIZE = 10;

app.get("/", async (c) => {
  const db = c.env.DB;
  const identity = c.get("identity");
  const [boards, hots, stats, tracks, mystats] = await Promise.all([
    getBoards(c.env.KV, db), getHotThreads(c.env.KV, db), getCommunityStats(db), getMyTracks(db, identity.id), getMyStats(db, identity.id),
  ]);
  const speakTotal = mystats.posts + mystats.replies;
  const level = levelFromPosts(speakTotal);
  // 累计发言与等级同口径（发帖+回应，实时统计）——post_count 只计发帖且含历史口径差（P7-2）
  return c.html(<HomePage me={{ ...toDisplay(identity), totalPosts: speakTotal }} boards={boards} hots={hots} stats={stats} tracks={tracks} level={level} />);
});

app.get("/b/:slug", async (c) => {
  const db = c.env.DB;
  const slug = c.req.param("slug");
  const board = await getBoardBySlug(db, slug);
  if (!board) return c.notFound();
  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const [{ threads, totalPages }, boardStats, hot] = await Promise.all([
    getThreads(db, slug, page, PAGE_SIZE),
    getBoardStats(db, slug),
    db.prepare(`
      SELECT t.title, t.hug_count FROM threads t JOIN boards b ON b.id=t.board_id
      WHERE b.slug=? AND t.status='published' ORDER BY t.hug_count DESC LIMIT 5
    `).bind(slug).all<{ title: string; hug_count: number }>().then((r) =>
      r.results.map((x) => [x.title, x.hug_count] as [string, number]),
    ),
  ]);
  const boardFull = (await getBoards(c.env.KV, db)).find((b) => b.slug === slug) ?? board;
  const hotStr = hot.map(([t, n]) => [t, formatCount(n)] as [string, string]);
  return c.html(<BoardPage
    board={boardFull} me={toDisplay(c.get("identity"))} threads={threads}
    boardStats={boardStats} hot={hotStr} page={page} totalPages={totalPages}
  />);
});

app.get("/t/:id", async (c) => {
  const identity = c.get("identity");
  const detail = await getThreadDetail(c.env.DB, c.req.param("id"), identity.id);
  if (!detail) return c.notFound();
  const favorited = await isFavorited(c.env.DB, identity.id, c.req.param("id"));
  const error = c.req.query("err") ? "一口气说了好多啦。歇一分钟，再继续说吧。" : undefined;
  // 引用预填（P4-4）：按楼层/帖子 id 读内容，生成引用文本；传 id 不传文本，不接受用户提供的原文回显
  const quoteId = c.req.query("quote");
  let quotePreview: string | undefined;
  if (quoteId) {
    const hit = await c.env.DB.prepare(
      "SELECT r.content, i.display_no FROM replies r JOIN identities i ON i.id=r.identity_id WHERE r.id=? AND r.status='published'",
    ).bind(quoteId).first<{ content: string; display_no: number }>()
      ?? await c.env.DB.prepare(
        "SELECT t.content, i.display_no FROM threads t JOIN identities i ON i.id=t.identity_id WHERE t.id=? AND t.status='published'",
      ).bind(quoteId).first<{ content: string; display_no: number }>();
    if (hit) quotePreview = `引用 ${displayAuthor(hit.display_no)} 的发言：${hit.content.slice(0, 60)}`;
  }
  // 浏览计数：KV 累积，Cron 每 10 分钟落库
  c.executionCtx.waitUntil(bumpViews(c.env.KV, c.req.param("id")));
  return c.html(<ThreadPage me={toDisplay(identity)} detail={detail} favorited={favorited} error={error} quotePreview={quotePreview} />);
});

// 收藏 toggle
app.post("/favorite", async (c) => {
  const body = await c.req.parseBody();
  const result = await toggleFavorite(c.env.DB, c.get("identity").id, String(body.target ?? ""));
  return c.json(result);
});

app.get("/new", async (c) => {
  const boards = await getBoards(c.env.KV, c.env.DB);
  // 风控触发：新身份 10 分钟内首发，需先答古诗验证码（默认免验证）
  const captcha = identityAgeMinutes(c.get("identity")) < 10 ? await generateCaptcha(c.env.KV) : undefined;
  return c.html(<NewThreadPage me={toDisplay(c.get("identity"))} boards={boards} captcha={captcha} />);
});

app.get("/notifications", async (c) => {
  const t = c.req.query("type");
  const type = t === "reply" || t === "hug" || t === "system" ? t : undefined;
  const notices = await getNotices(c.env.DB, c.get("identity").id, type);
  return c.html(<NotificationsPage me={toDisplay(c.get("identity"))} notices={notices} activeType={type ?? null} />);
});

// 全部已读
app.post("/notifications/read", async (c) => {
  await c.env.DB.prepare(
    "UPDATE notifications SET read_at = datetime('now') WHERE identity_id = ? AND read_at IS NULL",
  ).bind(c.get("identity").id).run();
  return c.redirect("/notifications");
});

app.get("/me", async (c) => {
  const identity = c.get("identity");
  const [myThreads, stats, week, myReplies, myFavorites] = await Promise.all([
    getMyThreads(c.env.DB, identity.id),
    getMyStats(c.env.DB, identity.id),
    getWeekStats(c.env.DB, identity.id),
    getMyReplies(c.env.DB, identity.id),
    getMyFavorites(c.env.DB, identity.id),
  ]);
  const level = levelFromPosts(stats.posts + stats.replies);
  return c.html(<MePage
    me={toDisplay(identity)}
    identityCode={getCookie(c, CODE_COOKIE)}
    myThreads={myThreads} stats={{
      posts: formatCount(stats.posts), replies: formatCount(stats.replies), hugs: formatCount(stats.hugs),
    }} week={week} myReplies={myReplies} myFavorites={myFavorites} level={level}
  />);
});

// 搜索（P4-4：顶栏搜索框落地）
app.get("/search", async (c) => {
  const q = (c.req.query("q") ?? "").trim().slice(0, 30);
  const threads = q ? await searchThreads(c.env.DB, q) : [];
  return c.html(<SearchPage me={toDisplay(c.get("identity"))} q={q} threads={threads} />);
});

// 精华区（P4-4：导航已有入口，落地列表页）
app.get("/essence", async (c) => {
  const threads = await getEssenceThreads(c.env.DB);
  return c.html(<EssencePage me={toDisplay(c.get("identity"))} threads={threads} />);
});

// 身份码登录：GET 表单 / POST 验证（POST 限频：每 IP-HMAC 5 次/小时，防爆破——ARCHITECTURE.md §2）
app.get("/login", (c) => c.html(<LoginPage me={toDisplay(c.get("identity"))} />));
app.post("/login", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null;
  const limit = await ipRateLimit(c.env.KV, ip, "login", 5, 3600);
  if (!limit.ok) {
    return c.html(<LoginPage me={toDisplay(c.get("identity"))} error="尝试的次数有点多，歇一小时再来吧，树洞不会跑。" />);
  }
  await ipRateRecord(c.env.KV, ip, "login", 3600);
  const body = await c.req.parseBody();
  const code = String(body.code ?? "").trim().toUpperCase();
  const me = toDisplay(c.get("identity"));
  if (!CODE_RE.test(code)) {
    return c.html(<LoginPage me={me} error="身份码格式不正确，请检查后重试（形如 KS-XXXX-XXXX-XXXX-XXXX）。" />);
  }
  const hash = await hashCode(code, c.env.AUTH_PEPPER);
  const row = await c.env.DB.prepare("SELECT * FROM identities WHERE code_hash = ?").bind(hash).first();
  if (!row) {
    return c.html(<LoginPage me={me} error="没有找到这个身份码。它可能已被重置，或输入有误。" />);
  }
  // P8-3：两次 setCookie 生成独立的 Set-Cookie 头（RFC 禁止合并；与身份中间件同一 cookieOpts）
  setCookie(c, COOKIE_NAME, String(row.id), cookieOpts);
  setCookie(c, CODE_COOKIE, code, cookieOpts);
  return c.redirect("/me");
});

// 退出：仅清 Cookie，身份码仍可找回
app.post("/logout", (c) => {
  deleteCookie(c, COOKIE_NAME);
  deleteCookie(c, CODE_COOKIE);
  return c.redirect("/");
});

// 重置身份：旧身份作废（帖子保留），签发新身份
app.post("/me/reset", async (c) => {
  const { id, code, codeHash, displayNo } = await createIdentity(c.env.AUTH_PEPPER);
  await c.env.DB.prepare(
    "INSERT INTO identities (id, code_hash, display_no, created_at, last_seen_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))",
  ).bind(id, codeHash, displayNo).run();
  c.header("Set-Cookie", [
    `${COOKIE_NAME}=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`,
    `${CODE_COOKIE}=${code}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`,
  ].join(", "));
  return c.redirect("/me");
});

// 举报：累计 3 次自动隐藏目标（限流：每 IP-HMAC 5 次/小时——懒签发+清 Cookie 可无限换身份，必须按设备限）
app.post("/report", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null;
  const limit = await ipRateLimit(c.env.KV, ip, "report", 5, 3600);
  if (!limit.ok) return c.json({ ok: false, error: "操作有点频繁啦，休息一下再试试。" });
  await ipRateRecord(c.env.KV, ip, "report", 3600);
  const body = await c.req.parseBody();
  const targetType = body.type === "reply" ? "reply" : "thread";
  const targetId = String(body.target ?? "");
  if (!targetId) return c.json({ ok: false });
  await c.env.DB.prepare(
    "INSERT INTO reports (id, target_type, target_id, reason) VALUES (?, ?, ?, ?)",
  ).bind(crypto.randomUUID(), targetType, targetId, String(body.reason ?? "")).run();
  const { results } = await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM reports WHERE target_type=? AND target_id=? AND status='open'",
  ).bind(targetType, targetId).all<{ n: number }>();
  const n = results[0]?.n ?? 0;
  if (n >= 3) {
    await c.env.DB.prepare(
      targetType === "thread"
        ? "UPDATE threads SET status='hidden' WHERE id=?"
        : "UPDATE replies SET status='hidden' WHERE id=?",
    ).bind(targetId).run();
  }
  return c.json({ ok: true, reports: n, hidden: n >= 3 });
});

// 用户自助删除：10 分钟内收回自己的帖子/楼层（兑现「10 分钟内可删除」文案承诺）
// 拒绝路径（超窗/非本人/不存在）统一回首页，不暴露原因
app.post("/delete", async (c) => {
  const identity = c.get("identity");
  const body = await c.req.parseBody();
  const target = String(body.target ?? "");
  if (!target) return c.redirect("/");
  if (body.type === "reply") {
    const r = await deleteOwnReply(c.env.DB, identity.id, target);
    return c.redirect(r.ok ? `/t/${r.threadId}` : "/");
  }
  await deleteOwnThread(c.env.DB, identity.id, target);
  return c.redirect("/");
});

// 站务：MOD_PASS 密码登录（P8-1：限频 + 签名会话令牌，原明文 cookie 方案退役）+ 待审/举报队列
app.get("/mod", async (c) => {
  const pending = await getPendingThreads(c.env.DB);
  const reports = await getOpenReports(c.env.DB);
  const authed = await verifyModSession(getCookie(c, MOD_COOKIE), c.env.MOD_PASS);
  return c.html(<ModPage me={toDisplay(c.get("identity"))} authed={authed} pending={pending} reports={reports} error={c.req.query("err") ? "密码不对哦。" : undefined} />);
});
app.post("/mod/login", async (c) => {
  // 限频同 /login 语义：不论成败每 IP-HMAC 计数，5 次/小时防爆破
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null;
  const limit = await ipRateLimit(c.env.KV, ip, "mod-login", 5, 3600);
  if (!limit.ok) return c.redirect("/mod?err=1");
  await ipRateRecord(c.env.KV, ip, "mod-login", 3600);
  const body = await c.req.parseBody();
  if (await timingSafeEqualStr(String(body.pass ?? ""), c.env.MOD_PASS)) {
    const { token, maxAge } = await createModSession(c.env.MOD_PASS);
    setCookie(c, MOD_COOKIE, token, { httpOnly: true, sameSite: "Lax", path: "/mod", maxAge });
    return c.redirect("/mod");
  }
  return c.redirect("/mod?err=1");
});
app.post("/mod/approve", async (c) => {
  const body = await c.req.parseBody();
  if (!(await verifyModSession(getCookie(c, MOD_COOKIE), c.env.MOD_PASS))) return c.redirect("/mod");
  await c.env.DB.prepare("UPDATE threads SET status='published' WHERE id=? AND status='pending'").bind(String(body.id ?? "")).run();
  return c.redirect("/mod");
});
// 站务处置：隐藏（可逆暂隐）/ 恢复 / 删除（终态）；处置后自动关闭该目标全部未决举报
app.post("/mod/hide", async (c) => {
  if (!(await verifyModSession(getCookie(c, MOD_COOKIE), c.env.MOD_PASS))) return c.redirect("/mod");
  const body = await c.req.parseBody();
  const type = String(body.type) === "reply" ? "reply" : "thread";
  await c.env.DB.prepare(
    type === "reply"
      ? "UPDATE replies SET status='hidden' WHERE id=? AND status='published'"
      : "UPDATE threads SET status='hidden' WHERE id=? AND status='published'",
  ).bind(String(body.id ?? "")).run();
  await c.env.DB.prepare(
    "UPDATE reports SET status='resolved' WHERE target_type=? AND target_id=? AND status='open'",
  ).bind(type, String(body.id ?? "")).run();
  return c.redirect("/mod");
});

app.post("/mod/restore", async (c) => {
  if (!(await verifyModSession(getCookie(c, MOD_COOKIE), c.env.MOD_PASS))) return c.redirect("/mod");
  const body = await c.req.parseBody();
  const type = String(body.type) === "reply" ? "reply" : "thread";
  // 仅 hidden 可恢复（deleted 是终态）
  await c.env.DB.prepare(
    type === "reply"
      ? "UPDATE replies SET status='published' WHERE id=? AND status='hidden'"
      : "UPDATE threads SET status='published' WHERE id=? AND status='hidden'",
  ).bind(String(body.id ?? "")).run();
  await c.env.DB.prepare(
    "UPDATE reports SET status='resolved' WHERE target_type=? AND target_id=? AND status='open'",
  ).bind(type, String(body.id ?? "")).run();
  return c.redirect("/mod");
});

app.post("/mod/delete", async (c) => {
  const body = await c.req.parseBody();
  if (!(await verifyModSession(getCookie(c, MOD_COOKIE), c.env.MOD_PASS))) return c.redirect("/mod");
  const id = String(body.id ?? "");
  const type = String(body.type) === "reply" ? "reply" : "thread";
  if (type === "reply") {
    // 防重：仅 published|hidden 首次转 deleted 时回收回复数（hidden 期间未减过）
    const row = await c.env.DB.prepare("SELECT status, thread_id FROM replies WHERE id=?")
      .bind(id).first<{ status: string; thread_id: string }>();
    if (row && row.status !== "deleted") {
      const res = await c.env.DB.batch([
        c.env.DB.prepare("UPDATE replies SET status='deleted' WHERE id=?").bind(id),
        c.env.DB.prepare("UPDATE threads SET reply_count = MAX(reply_count - 1, 0) WHERE id=?").bind(row.thread_id),
      ]);
      if (res.some((r) => !r.success)) return c.redirect("/mod");
    }
  } else {
    await c.env.DB.prepare("UPDATE threads SET status='deleted' WHERE id=?").bind(id).run();
  }
  await c.env.DB.prepare(
    "UPDATE reports SET status='resolved' WHERE target_type=? AND target_id=?",
  ).bind(type, id).run();
  return c.redirect("/mod");
});
// 加精 toggle（P4-4：精华区的运营入口，举报队列帖子条目触发）
app.post("/mod/essence", async (c) => {
  if (!(await verifyModSession(getCookie(c, MOD_COOKIE), c.env.MOD_PASS))) return c.redirect("/mod");
  const body = await c.req.parseBody();
  await c.env.DB.prepare("UPDATE threads SET essence = 1 - essence WHERE id=?").bind(String(body.id ?? "")).run();
  return c.redirect("/mod");
});

app.post("/mod/report-done", async (c) => {
  const body = await c.req.parseBody();
  if (!(await verifyModSession(getCookie(c, MOD_COOKIE), c.env.MOD_PASS))) return c.redirect("/mod");
  await c.env.DB.prepare("UPDATE reports SET status='resolved' WHERE id=?").bind(String(body.id ?? "")).run();
  return c.redirect("/mod");
});

// 发帖 / 回复 / 抱抱（S13 写路径；S18 风控：冷却+限流+IP-HMAC）
app.post("/new", async (c) => {
  const identity = c.get("identity");
  const body = await c.req.parseBody();
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null;
  // 风控检查（发帖频率 + IP-HMAC 限流）
  const risk = await riskCheck(c.env.KV, c.env.DB, identity.id, ip, "thread");
  if (!risk.ok) {
    const boards = await getBoards(c.env.KV, c.env.DB);
    return c.html(<NewThreadPage me={toDisplay(identity)} boards={boards} error={risk.reason} />);
  }
  // 新身份 10 分钟内首发需过古诗验证码
  if (identityAgeMinutes(identity) < 10) {
    const pass = await verifyCaptcha(c.env.KV, String(body.captcha_id ?? ""), String(body.captcha_answer ?? ""));
    if (!pass) {
      const boards = await getBoards(c.env.KV, c.env.DB);
      const fresh = await generateCaptcha(c.env.KV);
      return c.html(<NewThreadPage me={toDisplay(identity)} boards={boards} captcha={fresh} error="古诗没答对哦。再试一次，答案就在题目里。" />);
    }
  }
  const result = await createThread(c.env.DB, identity.id, {
    boardSlug: String(body.board ?? ""),
    title: String(body.title ?? ""),
    content: String(body.content ?? ""),
  });
  if (!result.ok) {
    const boards = await getBoards(c.env.KV, c.env.DB);
    return c.html(<NewThreadPage me={toDisplay(identity)} boards={boards} error={result.error} />);
  }
  await riskRecord(c.env.KV, identity.id, ip, "thread");
  if (result.pending) {
    const boards = await getBoards(c.env.KV, c.env.DB);
    return c.html(<NewThreadPage me={toDisplay(identity)} boards={boards} notice="心事已经放好，正在请洞务组过目。等它过审，就会出现在树洞里。" />);
  }
  return c.redirect(`/t/${result.id}`);
});

app.post("/t/:id/reply", async (c) => {
  const identity = c.get("identity");
  const body = await c.req.parseBody();
  const threadId = c.req.param("id");
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null;
  // 风控：每身份 1 分钟 3 条回复
  const risk = await riskCheck(c.env.KV, c.env.DB, identity.id, ip, "reply");
  if (!risk.ok) return c.redirect(`/t/${threadId}?err=1`);
  const result = await createReply(
    c.env.DB, identity.id, threadId,
    String(body.content ?? ""), body.quote ? String(body.quote) : undefined,
  );
  if (result.ok) await riskRecord(c.env.KV, identity.id, ip, "reply");
  return c.redirect(`/t/${threadId}${result.ok ? `#floor-${result.floor}` : ""}`);
});

app.post("/hug", async (c) => {
  const body = await c.req.parseBody();
  const type = body.type === "reply" ? "reply" : "thread";
  const result = await toggleHug(c.env.DB, c.get("identity").id, type, String(body.target ?? ""));
  return c.json(result);
});

// 免签发路径（P8-2）或中间件异常时 identity 可能缺失——404/500 页用占位身份渲染顶栏，保证兜底页自身不 500
const FALLBACK_ME: Identity = { displayNo: "0000", joinDays: 1, totalPosts: 0 };
const pageMe = (c: Context<AppEnv>): Identity => {
  const row = c.get("identity") as IdentityRow | undefined;
  return row ? toDisplay(row) : FALLBACK_ME;
};

// 温柔 404（S22：完整页面）
app.notFound((c) =>
  c.html(
    <Layout title="找不到啦" me={pageMe(c)}>
      <p class="crumb">空山 › 迷路了</p>
      <EmptyState
        title="这里还很安静"
        desc="这页树洞还不存在，或者已经被风带走了。"
        href="/"
        linkText="回首页看看"
      />
    </Layout>,
    404,
  ),
);

// 兜底错误页（S22）
app.onError((err, c) => {
  console.error("[error]", err.message);
  return c.html(
    <Layout title="出了点小状况" me={pageMe(c)}>
      <p class="crumb">空山 › 出了点小状况</p>
      <EmptyState
        title="风太大，吹乱了一页"
        desc="树洞遇到了一点小状况，稍后再试试吧。"
        href="/"
        linkText="回首页看看"
      />
    </Layout>,
    500,
  );
});

// robots.txt：显式返回禁收录（压过 Cloudflare 自定义域名的托管 robots.txt 注入 Allow: /）
app.get("/robots.txt", (c) =>
  c.text(`# 空山 · 禁止搜索引擎收录（匿名社区）
User-agent: *
Disallow: /
`, { headers: { "Content-Type": "text/plain; charset=utf-8" } }),
);

export default {
  fetch: app.fetch,
  // Cron：浏览计数从 KV 落库（wrangler.jsonc triggers.crons = */10 * * * *）
  scheduled: async (_event: ScheduledController, env: Env, _ctx: ExecutionContext) => {
    const flushed = await flushViews(env.KV, env.DB);
    console.log(`[cron] flushViews: ${flushed} keys`);
  },
};




