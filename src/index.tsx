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
  getBoardBySlug, getBoardHot, getBoardStats, getBoards, getCommunityStats, getEssenceThreads, getHotThreads,
  getIdentityByCodeHash, getModTargetSummary, getMyFavorites, getMyReplies, getMyStats, getMyThreads, getMyTracks,
  getNotices, getQuotePreview, getUnreadCount, getOpenReports, getPendingThreads, getThreadDetail,
  getThreads, getWeekStats, isFavorited, searchThreads,
} from "./db/queries";
import {
  approveThread, deleteTarget, hideTarget, insertReport, readAllNotifications,
  resolveReport, restoreTarget, toggleEssence, togglePin,
} from "./db/mod";
import { insertIdentity, revokeIdentityCode } from "./db/writes";
import { identityMiddleware, COOKIE_NAME, cookieOpts } from "./middleware/identity";
import { securityMiddleware } from "./middleware/security";
import { CODE_COOKIE, CODE_RE, createIdentity, hashCode, identityAgeMinutes, toDisplay, type IdentityRow } from "./lib/identity";
import { displayAuthor, formatCount } from "./lib/format";
import { levelFromPosts } from "./lib/level";
import type { Identity } from "./lib/types";
import { generateCaptcha, verifyCaptcha } from "./lib/captcha";
import { ipRateLimit, ipRateRecord, riskCheck, riskRecord, actCheck, actRecord } from "./lib/risk";
import { MOD_COOKIE, createModSession, timingSafeEqualStr, verifyModSession } from "./lib/modauth";
import { bumpViews, createReply, createThread, deleteOwnReply, deleteOwnThread, flushViews, toggleFavorite, toggleHug } from "./db/writes";
import type { Env } from "./types/env";

type AppEnv = {
  Bindings: Env;
  Variables: { identity: import("./lib/identity").IdentityRow; freshCode?: string };
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
  const [boards, hots, stats, tracks, mystats, unread] = await Promise.all([
    getBoards(c.env.KV, db), getHotThreads(c.env.KV, db), getCommunityStats(db), getMyTracks(db, identity.id), getMyStats(db, identity.id),
    getUnreadCount(db, identity.id),
  ]);
  const speakTotal = mystats.posts + mystats.replies;
  const level = levelFromPosts(speakTotal);
  // 累计发言与等级同口径（发帖+回应，实时统计）——post_count 只计发帖且含历史口径差（P7-2）
  return c.html(<HomePage me={{ ...toDisplay(identity), totalPosts: speakTotal }} boards={boards} hots={hots} stats={stats} tracks={tracks} level={level} unread={unread} />);
});

app.get("/b/:slug", async (c) => {
  const db = c.env.DB;
  const slug = c.req.param("slug");
  const board = await getBoardBySlug(db, slug);
  if (!board) return c.notFound();
  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const [{ threads, totalPages }, boardStats, hot, unread] = await Promise.all([
    getThreads(db, slug, page, PAGE_SIZE),
    getBoardStats(db, slug),
    getBoardHot(db, slug), // P11-6：原内联 SQL 收敛 queries.ts
    getUnreadCount(db, c.get("identity").id),
  ]);
  const boardFull = (await getBoards(c.env.KV, db)).find((b) => b.slug === slug) ?? board;
  return c.html(<BoardPage
    board={boardFull} me={toDisplay(c.get("identity"))} threads={threads}
    boardStats={boardStats} hot={hot} page={page} totalPages={totalPages} unread={unread}
  />);
});

app.get("/t/:id", async (c) => {
  const identity = c.get("identity");
  // 只看楼主（P9-3）：?op=1 仅显示楼主楼层
  const onlyOp = c.req.query("op") === "1";
  const detail = await getThreadDetail(c.env.DB, c.req.param("id"), identity.id, { onlyOp });
  if (!detail) return c.notFound();
  const favorited = await isFavorited(c.env.DB, identity.id, c.req.param("id"));
  const unread = await getUnreadCount(c.env.DB, identity.id);
  const error = c.req.query("err") ? "一口气说了好多啦。歇一分钟，再继续说吧。" : undefined;
  // P9-1：动作端点回跳提示条（举报确认 / 抱抱、收藏、举报失败）
  let actionNotice: { kind: "warm" | "error"; text: string } | undefined;
  if (c.req.query("first")) actionNotice = { kind: "warm", text: "这是你的第一个树洞。去「我的树洞」抄写身份码吧——凭它可以随时找回匿名说话的自己。" };
  else if (c.req.query("reported")) actionNotice = { kind: "warm", text: "谢谢你的守护，洞务组会看到这条举报的。" };
  else if (c.req.query("hugerr")) actionNotice = { kind: "error", text: "抱抱没有送到，再试一次。" };
  else if (c.req.query("faverr")) actionNotice = { kind: "error", text: "收藏没有成功，再试一次。" };
  else if (c.req.query("reporterr")) actionNotice = { kind: "error", text: "操作有点频繁啦，休息一下再试试。" };
  else if (c.req.query("lim")) actionNotice = { kind: "error", text: "动作有点快啦，歇一歇再互动吧。" };
  else if (c.req.query("replyerr")) actionNotice = { kind: "error", text: "这句话没有发出去，换个说法再试试。" };
  // 引用预填（P4-4）：按楼层/帖子 id 服务端生成引用快照；传 id 不传文本，不接受用户提供的原文回显
  const quoteId = c.req.query("quote");
  let quotePreview: string | undefined;
  if (quoteId) {
    const hit = await getQuotePreview(c.env.DB, quoteId);
    if (hit) quotePreview = quoteSnapshot(hit);
  }
  // 浏览计数：KV 累积，Cron 每 10 分钟落库
  c.executionCtx.waitUntil(bumpViews(c.env.KV, c.req.param("id")));
  return c.html(<ThreadPage me={toDisplay(identity)} detail={detail} favorited={favorited} onlyOp={onlyOp} unread={unread} error={error} actionNotice={actionNotice} quotePreview={quotePreview} quoteId={quoteId} />);
});

// 收藏 toggle（P9-1：回跳来源页；P10-3：动作限流）
app.post("/favorite", async (c) => {
  const identity = c.get("identity");
  const body = await c.req.parseBody();
  const back = safeReturn(body.return);
  if (!(await actCheck(c.env.KV, identity.id)).ok) return c.redirect(withQuery(back, "lim=1"));
  const result = await toggleFavorite(c.env.DB, identity.id, String(body.target ?? ""));
  await actRecord(c.env.KV, identity.id);
  return c.redirect(result.ok ? back : withQuery(back, "faverr=1"));
});

app.get("/new", async (c) => {
  const identity = c.get("identity");
  const [boards, unread] = await Promise.all([
    getBoards(c.env.KV, c.env.DB), getUnreadCount(c.env.DB, identity.id),
  ]);
  // 版块上下文（P11-4）：版块页「发新洞」带 ?board=slug，校验后预选对应 radio（无效回落首个）
  const qb = c.req.query("board") ?? "";
  const selectedBoard = boards.some((b) => b.slug === qb) ? qb : boards[0]?.slug ?? "";
  // 风控触发：新身份 10 分钟内首发，需先答古诗验证码（默认免验证）
  const captcha = identityAgeMinutes(identity) < 10 ? await generateCaptcha(c.env.KV) : undefined;
  return c.html(<NewThreadPage me={toDisplay(identity)} boards={boards} captcha={captcha} unread={unread} selectedBoard={selectedBoard} />);
});

app.get("/notifications", async (c) => {
  const identity = c.get("identity");
  const t = c.req.query("type");
  const type = t === "reply" || t === "hug" || t === "system" ? t : undefined;
  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const [{ notices, page: pg, totalPages }, unread] = await Promise.all([
    getNotices(c.env.DB, identity.id, { type, page }), getUnreadCount(c.env.DB, identity.id),
  ]);
  return c.html(<NotificationsPage me={toDisplay(identity)} notices={notices} activeType={type ?? null} page={pg} totalPages={totalPages} unread={unread} />);
});

// 全部已读（P10-4：SQL 在 db/mod.ts）
app.post("/notifications/read", async (c) => {
  await readAllNotifications(c.env.DB, c.get("identity").id);
  return c.redirect("/notifications");
});

// 通知点击跳转（P13-1）：标记该条已读后 303 回现场。校验归属——他人的通知 id 动不了
app.post("/notifications/open", async (c) => {
  const identity = c.get("identity");
  const body = await c.req.parseBody();
  const id = String(body.id ?? "");
  if (!id) return c.redirect("/notifications");
  const row = await c.env.DB.prepare(
    "SELECT payload FROM notifications WHERE id = ? AND identity_id = ?",
  ).bind(id, identity.id).first<{ payload: string }>();
  if (!row) return c.redirect("/notifications");
  await c.env.DB.prepare(
    "UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND identity_id = ? AND read_at IS NULL",
  ).bind(id, identity.id).run();
  const p = JSON.parse(row.payload) as { threadId?: string; floor?: number };
  return c.redirect(p.threadId ? `/t/${p.threadId}${p.floor ? `#floor-${p.floor}` : ""}` : "/notifications");
});

app.get("/me", async (c) => {
  const identity = c.get("identity");
  const [myThreads, stats, week, myReplies, myFavorites, unread] = await Promise.all([
    getMyThreads(c.env.DB, identity.id),
    getMyStats(c.env.DB, identity.id),
    getWeekStats(c.env.DB, identity.id),
    getMyReplies(c.env.DB, identity.id),
    getMyFavorites(c.env.DB, identity.id),
    getUnreadCount(c.env.DB, identity.id),
  ]);
  const level = levelFromPosts(stats.posts + stats.replies);
  // 首访直接进 /me 时（懒签发当次请求）请求头里还没有 CODE_COOKIE，回退读中间件暂存的 freshCode（P8-6）
  return c.html(<MePage
    me={toDisplay(identity)}
    identityCode={getCookie(c, CODE_COOKIE) ?? c.get("freshCode")}
    myThreads={myThreads} stats={{
      posts: formatCount(stats.posts), replies: formatCount(stats.replies), hugs: formatCount(stats.hugs),
    }} week={week} myReplies={myReplies} myFavorites={myFavorites} level={level} unread={unread}
  />);
});

// 搜索（P4-4：顶栏搜索框落地）
app.get("/search", async (c) => {
  const q = (c.req.query("q") ?? "").trim().slice(0, 30);
  const identity = c.get("identity");
  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const [res, unread] = await Promise.all([
    q ? searchThreads(c.env.DB, q, page) : Promise.resolve({ threads: [], page: 1, totalPages: 1, total: 0 }),
    getUnreadCount(c.env.DB, identity.id),
  ]);
  return c.html(<SearchPage me={toDisplay(identity)} q={q} threads={res.threads} page={res.page} totalPages={res.totalPages} total={res.total} unread={unread} />);
});

// 精华区（P4-4：导航已有入口，落地列表页）
app.get("/essence", async (c) => {
  const identity = c.get("identity");
  const [threads, unread] = await Promise.all([
    getEssenceThreads(c.env.DB), getUnreadCount(c.env.DB, identity.id),
  ]);
  return c.html(<EssencePage me={toDisplay(identity)} threads={threads} unread={unread} />);
});

// 身份码登录：GET 表单 / POST 验证（POST 限频：每 IP-HMAC 5 次/小时，防爆破——ARCHITECTURE.md §2）
app.get("/login", async (c) => {
  const unread = await getUnreadCount(c.env.DB, c.get("identity").id);
  return c.html(<LoginPage me={toDisplay(c.get("identity"))} unread={unread} />);
});
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
  const row = await getIdentityByCodeHash(c.env.DB, hash);
  if (!row) {
    return c.html(<LoginPage me={me} error="没有找到这个身份码。它可能已被重置，或输入有误。" />);
  }
  // P8-3：两次 setCookie 生成独立的 Set-Cookie 头（RFC 禁止合并；与身份中间件同一 cookieOpts）
  setCookie(c, COOKIE_NAME, String(row.id), cookieOpts);
  setCookie(c, CODE_COOKIE, code, cookieOpts);
  return c.redirect("/me");
});

// 退出：仅清 Cookie，身份码仍可找回。
// P12-1：mod_auth 的 path=/mod，删除必须带同 path 才能命中——此前站务会话 24h 内
// 无任何 UI 登出（十二角色审查 #14）
app.post("/logout", (c) => {
  deleteCookie(c, COOKIE_NAME);
  deleteCookie(c, CODE_COOKIE);
  deleteCookie(c, MOD_COOKIE, { path: "/mod" });
  return c.redirect("/");
});

// 站务退出（P12-1）：只清站务会话，留在 /mod 页回到登录态。登出无需鉴权
app.post("/mod/logout", (c) => {
  deleteCookie(c, MOD_COOKIE, { path: "/mod" });
  return c.redirect("/mod");
});

// 重置身份确认页（P11-7：no-JS 两步式确认——重置不可逆，旧身份码永久作废）
app.get("/me/reset-confirm", async (c) => {
  const identity = c.get("identity");
  const unread = await getUnreadCount(c.env.DB, identity.id);
  return c.html(
    <Layout title="重置身份" me={toDisplay(identity)} unread={unread}>
      <p class="crumb">空山 › 我的树洞 › 重置身份</p>
      <section class="card compose-card" style="max-width:480px;margin:40px auto">
        <h1 class="compose-title">确定要重置身份吗？</h1>
        <p class="compose-sub">
          重置后，当前身份码将永久作废，无法再找回这个身份。
          你发过的心事会留在树洞里，但不再属于你。这个操作无法撤销。
        </p>
        <div class="compose-actions">
          <a class="btn btn-ghost" href="/me">再想想</a>
          <form action="/me/reset" method="post">
            <button type="submit" class="btn">确认重置</button>
          </form>
        </div>
      </section>
    </Layout>,
  );
});

// 重置身份：签发新身份；旧身份码作废（P8-5 兑现 §2 承诺）——code_hash 改写为不可命中的
// 占位（行保留供历史楼层归属），旧码从此无法登录。其他设备上的旧 Cookie 不在承诺范围
app.post("/me/reset", async (c) => {
  await revokeIdentityCode(c.env.DB, c.get("identity").id);
  const { id, code, codeHash, displayNo } = await createIdentity(c.env.AUTH_PEPPER);
  await insertIdentity(c.env.DB, { id, codeHash, displayNo });
  // P10-4 回归发现：此处仍是 join(", ") 拼接（P8-3 漏改）——与 /login 统一为独立 Set-Cookie
  setCookie(c, COOKIE_NAME, id, cookieOpts);
  setCookie(c, CODE_COOKIE, code, cookieOpts);
  return c.redirect("/me");
});

// 举报：累计 3 次自动隐藏目标（限流：每 IP-HMAC 5 次/小时——懒签发+清 Cookie 可无限换身份，必须按设备限）
// P9-1：结果经回跳 query 提示；P10-4：落库/计数/自动隐藏在 db/mod.ts
app.post("/report", async (c) => {
  const body = await c.req.parseBody();
  const back = safeReturn(body.return);
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null;
  const limit = await ipRateLimit(c.env.KV, ip, "report", 5, 3600);
  if (!limit.ok) return c.redirect(withQuery(back, "reporterr=1"));
  await ipRateRecord(c.env.KV, ip, "report", 3600);
  const targetType = body.type === "reply" ? "reply" : "thread";
  const targetId = String(body.target ?? "");
  if (!targetId) return c.redirect(back);
  await insertReport(c.env.DB, targetType, targetId, String(body.reason ?? "").trim().slice(0, 100));
  return c.redirect(withQuery(back, "reported=1"));
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
  const [pendingQ, reportsQ, unread] = await Promise.all([
    getPendingThreads(c.env.DB), getOpenReports(c.env.DB),
    getUnreadCount(c.env.DB, c.get("identity").id),
  ]);
  const authed = await verifyModSession(getCookie(c, MOD_COOKIE), c.env.MOD_PASS);
  return c.html(<ModPage me={toDisplay(c.get("identity"))} authed={authed}
    pending={pendingQ.items} pendingTotal={pendingQ.total}
    reports={reportsQ.items} reportsTotal={reportsQ.total}
    unread={unread} error={c.req.query("err") ? "密码不对哦。" : undefined} />);
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
    setCookie(c, MOD_COOKIE, token, { httpOnly: true, sameSite: "Lax", path: "/mod", maxAge, secure: true });
    return c.redirect("/mod");
  }
  return c.redirect("/mod?err=1");
});
app.post("/mod/approve", async (c) => {
  const body = await c.req.parseBody();
  if (!(await verifyModSession(getCookie(c, MOD_COOKIE), c.env.MOD_PASS))) return c.redirect("/mod");
  await approveThread(c.env.DB, String(body.id ?? ""));
  return c.redirect("/mod");
});
// 站务处置：隐藏（可逆暂隐）/ 恢复 / 删除（终态）；处置后自动关闭该目标全部未决举报（P10-4：SQL 在 db/mod.ts）
app.post("/mod/hide", async (c) => {
  if (!(await verifyModSession(getCookie(c, MOD_COOKIE), c.env.MOD_PASS))) return c.redirect("/mod");
  const body = await c.req.parseBody();
  const type = String(body.type) === "reply" ? "reply" : "thread";
  await hideTarget(c.env.DB, type, String(body.id ?? ""));
  return c.redirect("/mod");
});

app.post("/mod/restore", async (c) => {
  if (!(await verifyModSession(getCookie(c, MOD_COOKIE), c.env.MOD_PASS))) return c.redirect("/mod");
  const body = await c.req.parseBody();
  const type = String(body.type) === "reply" ? "reply" : "thread";
  await restoreTarget(c.env.DB, type, String(body.id ?? ""));
  return c.redirect("/mod");
});

// 站务删除确认页（P11-7）：删除是终态——确认页展示被删内容摘要，防误删/怒删
app.get("/mod/delete-confirm", async (c) => {
  const identity = c.get("identity");
  const unread = await getUnreadCount(c.env.DB, identity.id);
  if (!(await verifyModSession(getCookie(c, MOD_COOKIE), c.env.MOD_PASS))) return c.redirect("/mod");
  const type = c.req.query("type") === "reply" ? "reply" : "thread";
  const id = c.req.query("id") ?? "";
  const target = id ? await getModTargetSummary(c.env.DB, type, id) : null;
  if (!target) return c.redirect("/mod");
  return c.html(
    <Layout title="确认删除" me={toDisplay(identity)} unread={unread}>
      <p class="crumb">空山 › 站务 › 确认删除</p>
      <section class="card compose-card" style="max-width:560px;margin:40px auto">
        <h1 class="compose-title">确定要删除吗？</h1>
        <p class="compose-sub">删除是终态，站务页无法恢复（数据库有 Time Travel 兜底）。请再看一眼内容：</p>
        <div class="quote-block">
          <p>「{target.title}」 · {displayAuthor(target.display)} · {target.board_name}</p>
          <p>{target.content.slice(0, 120)}</p>
        </div>
        <div class="compose-actions">
          <a class="btn btn-ghost" href="/mod">返回队列</a>
          <form action="/mod/delete" method="post">
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="id" value={id} />
            <button type="submit" class="btn">确认删除</button>
          </form>
        </div>
      </section>
    </Layout>,
  );
});

app.post("/mod/delete", async (c) => {
  const body = await c.req.parseBody();
  if (!(await verifyModSession(getCookie(c, MOD_COOKIE), c.env.MOD_PASS))) return c.redirect("/mod");
  const type = String(body.type) === "reply" ? "reply" : "thread";
  await deleteTarget(c.env.DB, type, String(body.id ?? ""));
  return c.redirect("/mod");
});
// 加精 toggle（P4-4：精华区的运营入口，举报队列帖子条目触发）
app.post("/mod/essence", async (c) => {
  if (!(await verifyModSession(getCookie(c, MOD_COOKIE), c.env.MOD_PASS))) return c.redirect("/mod");
  const body = await c.req.parseBody();
  await toggleEssence(c.env.DB, String(body.id ?? ""));
  return c.redirect("/mod");
});

// 置顶 toggle（P9-5：对齐加精模式，threads.pinned 已被版块列表排序消费）
app.post("/mod/pin", async (c) => {
  if (!(await verifyModSession(getCookie(c, MOD_COOKIE), c.env.MOD_PASS))) return c.redirect("/mod");
  const body = await c.req.parseBody();
  await togglePin(c.env.DB, String(body.id ?? ""));
  return c.redirect("/mod");
});

app.post("/mod/report-done", async (c) => {
  const body = await c.req.parseBody();
  if (!(await verifyModSession(getCookie(c, MOD_COOKIE), c.env.MOD_PASS))) return c.redirect("/mod");
  await resolveReport(c.env.DB, String(body.id ?? ""));
  return c.redirect("/mod");
});

// 发帖 / 回复 / 抱抱（S13 写路径；S18 风控：冷却+限流+IP-HMAC）
app.post("/new", async (c) => {
  const identity = c.get("identity");
  const body = await c.req.parseBody();
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null;
  // 失败回填用（P11-4）：与 createThread 同口径截断，失败重渲染时不丢稿
  const values = {
    board: String(body.board ?? ""),
    title: String(body.title ?? "").trim().slice(0, 40),
    content: String(body.content ?? "").trim().slice(0, 500),
  };
  const rerender = async (extra: { error?: string; notice?: string; captcha?: { id: string; prompt: string } }) =>
    c.html(<NewThreadPage me={toDisplay(identity)} boards={await getBoards(c.env.KV, c.env.DB)}
      selectedBoard={values.board} values={values} {...extra} />);
  // 风控检查（发帖频率 + IP-HMAC 限流）
  const risk = await riskCheck(c.env.KV, c.env.DB, identity.id, ip, "thread");
  if (!risk.ok) return rerender({ error: risk.reason });
  // 新身份 10 分钟内首发需过古诗验证码
  if (identityAgeMinutes(identity) < 10) {
    const pass = await verifyCaptcha(c.env.KV, String(body.captcha_id ?? ""), String(body.captcha_answer ?? ""));
    if (!pass) {
      const fresh = await generateCaptcha(c.env.KV);
      return rerender({ captcha: fresh, error: "古诗没答对哦。再试一次，答案就在题目里。" });
    }
  }
  const result = await createThread(c.env.DB, identity.id, {
    boardSlug: values.board, title: values.title, content: values.content,
  });
  if (!result.ok) return rerender({ error: result.error });
  await riskRecord(c.env.KV, identity.id, ip, "thread");
  if (result.pending) {
    return rerender({ notice: "心事已经放好，正在请洞务组过目。等它过审，就会出现在树洞里。" });
  }
  // 首帖引导（P12-1）：该身份第一篇 published 帖发出后，提示去抄写身份码——
  // 身份码发现缺失是最主要的身份流失点（十二角色审查 #1）
  const first = (await c.env.DB.prepare(
    "SELECT COUNT(*) AS n FROM threads WHERE identity_id=? AND status='published'",
  ).bind(identity.id).first<{ n: number }>())?.n === 1;
  return c.redirect(`/t/${result.id}${first ? "?first=1" : ""}`);
});

app.post("/t/:id/reply", async (c) => {
  const identity = c.get("identity");
  const body = await c.req.parseBody();
  const threadId = c.req.param("id");
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null;
  // 风控：每身份 1 分钟 3 条回复
  const risk = await riskCheck(c.env.KV, c.env.DB, identity.id, ip, "reply");
  if (!risk.ok) return c.redirect(`/t/${threadId}?err=1`);
  // 引用快照服务端按 id 重新生成（P11-2）：表单 hidden 只携带目标 id，不接受用户提供的原文。
  // P12-5：顺带带出被引用作者 id，供引用通知（排除自引与楼主在 createReply 内判定）
  let quote: string | undefined;
  let quotedAuthorId: string | undefined;
  if (body.quote) {
    const hit = await getQuotePreview(c.env.DB, String(body.quote));
    if (hit) {
      quote = quoteSnapshot(hit);
      quotedAuthorId = hit.identity_id;
    }
  }
  const result = await createReply(
    c.env.KV, c.env.DB, identity.id, threadId,
    String(body.content ?? ""), { quote, quotedAuthorId },
  );
  if (!result.ok) return c.redirect(`/t/${threadId}?replyerr=1`);
  await riskRecord(c.env.KV, identity.id, ip, "reply");
  return c.redirect(`/t/${threadId}#floor-${result.floor}`);
});

// 抱抱 toggle（P9-1：回跳来源页；P10-3：动作限流 + 通知防骚扰在 writes 内）
app.post("/hug", async (c) => {
  const identity = c.get("identity");
  const body = await c.req.parseBody();
  const type = body.type === "reply" ? "reply" : "thread";
  const back = safeReturn(body.return);
  if (!(await actCheck(c.env.KV, identity.id)).ok) return c.redirect(withQuery(back, "lim=1"));
  const result = await toggleHug(c.env.KV, c.env.DB, identity.id, type, String(body.target ?? ""));
  await actRecord(c.env.KV, identity.id);
  return c.redirect(result.ok ? back : withQuery(back, "hugerr=1"));
});

// 免签发路径（P8-2）或中间件异常时 identity 可能缺失——404/500 页用占位身份渲染顶栏，保证兜底页自身不 500
const FALLBACK_ME: Identity = { displayNo: "0000", joinDays: 1, totalPosts: 0 };
const pageMe = (c: Context<AppEnv>): Identity => {
  const row = c.get("identity") as IdentityRow | undefined;
  return row ? toDisplay(row) : FALLBACK_ME;
};

// P9-1：动作端点回跳目标校验——须站内路径（/ 开头且非 // 协议相对，防 open redirect）。
// P11-2：先把 \ 归一为 / 再校验——浏览器把 Location 里的 \ 等同 /（WHATWG URL），
// 不归一的话 "/\evil.com" 会绕过 // 检查被当成协议相对地址跳到外部站
const safeReturn = (v: unknown, fallback = "/"): string => {
  if (typeof v !== "string") return fallback;
  const path = v.replace(/\\/g, "/");
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
};
const withQuery = (path: string, q: string): string => `${path}${path.includes("?") ? "&" : "?"}${q}`;

// 引用快照唯一生成点（P11-2）：按目标 id 服务端生成快照文本。表单只携带 id，
// GET（预览）与 POST（落库）都经此生成——用户自填引用原文的路径已封死，
// 杜绝伪造「引用 某洞友 的发言：…」冒充他人
const quoteSnapshot = (hit: { content: string; display_no: number }): string =>
  `引用 ${displayAuthor(hit.display_no)} 的发言：${hit.content.slice(0, 60)}`;

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




