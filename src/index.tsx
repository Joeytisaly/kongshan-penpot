// 空山 · Hono 入口（S12：页面数据全部来自 D1 查询层）
import { Hono } from "hono";
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
import {
  getBoardBySlug, getBoardStats, getBoards, getCommunityStats, getHotThreads,
  getMyFavorites, getMyReplies, getMyStats, getMyThreads, getMyTracks, getNotices,
  getOpenReports, getPendingThreads, getThreadDetail, getThreads, getWeekStats, isFavorited,
} from "./db/queries";
import { identityMiddleware, COOKIE_NAME } from "./middleware/identity";
import { securityMiddleware } from "./middleware/security";
import { CODE_COOKIE, CODE_RE, createIdentity, hashCode, toDisplay } from "./lib/identity";
import { formatCount } from "./lib/format";
import { levelFromPosts } from "./lib/level";
import { generateCaptcha, verifyCaptcha } from "./lib/captcha";
import { riskCheck, riskRecord } from "./lib/risk";
import { bumpViews, createReply, createThread, flushViews, toggleFavorite, toggleHug } from "./db/writes";
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
  const level = levelFromPosts(mystats.posts + mystats.replies);
  return c.html(<HomePage me={toDisplay(identity)} boards={boards} hots={hots} stats={stats} tracks={tracks} level={level} />);
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
  const detail = await getThreadDetail(c.env.DB, c.req.param("id"));
  if (!detail) return c.notFound();
  const favorited = await isFavorited(c.env.DB, identity.id, c.req.param("id"));
  const error = c.req.query("err") ? "一口气说了好多啦。歇一分钟，再继续说吧。" : undefined;
  // 浏览计数：KV 累积，Cron 每 10 分钟落库
  c.executionCtx.waitUntil(bumpViews(c.env.KV, c.req.param("id")));
  return c.html(<ThreadPage me={toDisplay(identity)} detail={detail} favorited={favorited} error={error} />);
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
  const identity = c.get("identity");
  const ageMin = (Date.now() - new Date(identity.created_at.replace(" ", "T") + "Z").getTime()) / 60000;
  const captcha = ageMin < 10 ? await generateCaptcha(c.env.KV) : undefined;
  return c.html(<NewThreadPage me={toDisplay(identity)} boards={boards} captcha={captcha} />);
});

app.get("/notifications", async (c) => {
  const notices = await getNotices(c.env.DB, c.get("identity").id);
  return c.html(<NotificationsPage me={toDisplay(c.get("identity"))} notices={notices} />);
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

// 身份码登录：GET 表单 / POST 验证
app.get("/login", (c) => c.html(<LoginPage me={toDisplay(c.get("identity"))} />));
app.post("/login", async (c) => {
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
  c.header("Set-Cookie", [
    `${COOKIE_NAME}=${row.id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`,
    `${CODE_COOKIE}=${code}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`,
  ].join(", "));
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
    "INSERT INTO identities (id, code_hash, display_no, level, created_at, last_seen_at) VALUES (?, ?, ?, '一叶', datetime('now'), datetime('now'))",
  ).bind(id, codeHash, displayNo).run();
  c.header("Set-Cookie", [
    `${COOKIE_NAME}=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`,
    `${CODE_COOKIE}=${code}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`,
  ].join(", "));
  return c.redirect("/me");
});

// 举报：累计 3 次自动隐藏目标
app.post("/report", async (c) => {
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

// 站务：MOD_PASS 密码登录 + 待审/举报队列
const MOD_COOKIE = "mod_auth";
app.get("/mod", async (c) => {
  const pending = await getPendingThreads(c.env.DB);
  const reports = await getOpenReports(c.env.DB);
  const authed = getCookie(c, MOD_COOKIE) === c.env.MOD_PASS;
  return c.html(<ModPage me={toDisplay(c.get("identity"))} authed={authed} pending={pending} reports={reports} error={c.req.query("err") ? "密码不对哦。" : undefined} />);
});
app.post("/mod/login", async (c) => {
  const body = await c.req.parseBody();
  if (String(body.pass ?? "") === c.env.MOD_PASS) {
    setCookie(c, MOD_COOKIE, c.env.MOD_PASS, { httpOnly: true, sameSite: "Lax", path: "/mod", maxAge: 60 * 60 * 24 });
    return c.redirect("/mod");
  }
  return c.redirect("/mod?err=1");
});
app.post("/mod/approve", async (c) => {
  const body = await c.req.parseBody();
  if (getCookie(c, MOD_COOKIE) !== c.env.MOD_PASS) return c.redirect("/mod");
  await c.env.DB.prepare("UPDATE threads SET status='published' WHERE id=? AND status='pending'").bind(String(body.id ?? "")).run();
  return c.redirect("/mod");
});
app.post("/mod/delete", async (c) => {
  const body = await c.req.parseBody();
  if (getCookie(c, MOD_COOKIE) !== c.env.MOD_PASS) return c.redirect("/mod");
  const id = String(body.id ?? "");
  await c.env.DB.prepare("UPDATE threads SET status='deleted' WHERE id=?").bind(id).run();
  await c.env.DB.prepare("UPDATE reports SET status='resolved' WHERE target_type='thread' AND target_id=?").bind(id).run();
  return c.redirect("/mod");
});
app.post("/mod/report-done", async (c) => {
  const body = await c.req.parseBody();
  if (getCookie(c, MOD_COOKIE) !== c.env.MOD_PASS) return c.redirect("/mod");
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
  const ageMin = (Date.now() - new Date(identity.created_at.replace(" ", "T") + "Z").getTime()) / 60000;
  if (ageMin < 10) {
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

// 温柔 404（S22：完整页面）
app.notFound((c) =>
  c.html(
    <Layout title="找不到啦" me={toDisplay(c.get("identity"))}>
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
    <Layout title="出了点小状况" me={toDisplay(c.get("identity"))}>
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




