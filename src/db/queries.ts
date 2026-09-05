// 数据查询层 —— 从 D1 组装出 UI 契约（types.ts）所需的数据
// 依赖地图：queries.ts ↔ types.ts（契约）+ format.ts（展示格式化）；页面层只消费返回值
// P0 的 mock.ts 退役后，本文件是页面唯一数据来源
import type { Board, Floor, HotItem, Mood, MyThread, Notice, Thread } from "../lib/types";
import type { IdentityRow } from "../lib/identity";
import { displayAuthor, ageMinutes, formatCount, formatDateTime, formatRelativeTime } from "../lib/format";
import { levelFromPosts } from "../lib/level";
import { judgeContent } from "../lib/words";
import { CACHE_KEY_BOARDS, CACHE_KEY_HOT, cached } from "../lib/cache";

/* ========== 首页 01（热帖榜/版块统计走 KV 缓存 60s） ========== */

export interface BoardRow {
  slug: string; name: string; description: string; mood: Mood; icon_char: string; group_name: string;
  topic_count: number; post_count: number; last_user: number | null; last_time: string | null;
}

export async function getBoards(kv: KVNamespace, db: D1Database): Promise<Board[]> {
  // v2：Board 契约加了 group（P11-6）——换键避免部署后读到旧形状缓存渲染 undefined
  return cached(kv, CACHE_KEY_BOARDS, 60, async () => {
    const { results } = await db.prepare(`
      SELECT b.slug, b.name, b.description, b.mood, b.icon_char, b.group_name,
        (SELECT COUNT(*) FROM threads t WHERE t.board_id = b.id AND t.status='published') AS topic_count,
        (SELECT COUNT(*) FROM replies r JOIN threads t ON t.id=r.thread_id WHERE t.board_id=b.id AND r.status='published') AS post_count,
        COALESCE(
          (SELECT i.display_no FROM replies r JOIN identities i ON i.id=r.identity_id JOIN threads t ON t.id=r.thread_id
            WHERE t.board_id=b.id AND r.status='published' ORDER BY r.created_at DESC LIMIT 1),
          (SELECT i.display_no FROM threads t JOIN identities i ON i.id=t.identity_id
            WHERE t.board_id=b.id AND t.status='published' ORDER BY COALESCE(t.last_reply_at,t.created_at) DESC LIMIT 1)
        ) AS last_user,
        COALESCE(
          (SELECT r.created_at FROM replies r JOIN threads t ON t.id=r.thread_id
            WHERE t.board_id=b.id AND r.status='published' ORDER BY r.created_at DESC LIMIT 1),
          (SELECT COALESCE(t.last_reply_at,t.created_at) FROM threads t
            WHERE t.board_id=b.id AND t.status='published' ORDER BY COALESCE(t.last_reply_at,t.created_at) DESC LIMIT 1)
        ) AS last_time
      FROM boards b ORDER BY b.sort
    `).all<BoardRow>();
    return results.map((r) => ({
      slug: r.slug,
      name: r.name,
      description: r.description,
      mood: r.mood,
      group: r.group_name || "版块",
      iconChar: r.icon_char,
      topicCount: formatCount(r.topic_count),
      postCount: formatCount(r.post_count),
      lastReplyUser: r.last_user != null ? displayAuthor(r.last_user) : "还没有心事",
      lastReplyTime: r.last_time ? formatRelativeTime(r.last_time) : "",
    }));
  });
}

export async function getBoardBySlug(db: D1Database, slug: string): Promise<Board | null> {
  const b = await db.prepare(
    "SELECT slug, name, description, mood, icon_char, group_name FROM boards WHERE slug = ?",
  ).bind(slug).first<BoardRow>();
  if (!b) return null;
  return {
    slug: b.slug, name: b.name, description: b.description, mood: b.mood, iconChar: b.icon_char,
    group: b.group_name || "版块",
    topicCount: "", postCount: "", lastReplyUser: "", lastReplyTime: "",
  };
}

/* ========== 版块列表 02 ========== */

interface ThreadRow {
  id: string; title: string; reply_count: number; views: number;
  pinned: number; essence: number; author_display: number; last_reply_at: string | null;
  created_at: string;
}

export interface ThreadList {
  threads: Thread[];
  total: number;
  totalPages: number;
  pageSize: number;
}

export async function getThreads(db: D1Database, boardSlug: string, page = 1, pageSize = 10): Promise<ThreadList> {
  const where = `FROM threads t JOIN boards b ON b.id=t.board_id JOIN identities i ON i.id=t.identity_id
    WHERE b.slug=? AND t.status='published'`;
  const [{ results: rows }, total] = await Promise.all([
    db.prepare(`
      SELECT t.id, t.title, t.reply_count, t.views, t.pinned, t.essence, i.display_no AS author_display,
        COALESCE(t.last_reply_at, t.created_at) AS last_reply_at
      ${where} ORDER BY t.pinned DESC, COALESCE(t.last_reply_at, t.created_at) DESC LIMIT ? OFFSET ?
    `).bind(boardSlug, pageSize, (page - 1) * pageSize).all<ThreadRow>(),
    db.prepare(`SELECT COUNT(*) AS n ${where}`).bind(boardSlug).first<{ n: number }>(),
  ]);

  // 每帖最后回复人/时间（P11-3：窗口函数每帖取一行——原实现把当页帖子的全部楼层
  // 拉回 JS 再按序去重，热帖千楼时一次列表页读数万行）
  const lastMap = new Map<string, { user: string; time: string }>();
  if (rows.length > 0) {
    const ph = rows.map(() => "?").join(",");
    const { results: lrs } = await db.prepare(`
      SELECT thread_id, display, at FROM (
        SELECT r.thread_id, i.display_no AS display, r.created_at AS at,
          ROW_NUMBER() OVER (PARTITION BY r.thread_id ORDER BY r.created_at DESC) AS rn
        FROM replies r JOIN identities i ON i.id = r.identity_id
        WHERE r.thread_id IN (${ph}) AND r.status='published'
      ) WHERE rn = 1
    `).bind(...rows.map((r) => r.id)).all<{ thread_id: string; display: number; at: string }>();
    for (const lr of lrs) lastMap.set(lr.thread_id, { user: displayAuthor(lr.display), time: formatRelativeTime(lr.at) });
  }

  const totalN = total?.n ?? 0;
  return {
    threads: rows.map((r) => {
      const last = lastMap.get(r.id);
      return {
        id: r.id, boardSlug, boardName: "",
        title: r.title, author: displayAuthor(r.author_display),
        replyCount: formatCount(r.reply_count), viewCount: formatCount(r.views),
        pinned: !!r.pinned, essence: !!r.essence,
        lastReplyUser: last?.user ?? displayAuthor(r.author_display),
        lastReplyTime: last?.time ?? formatRelativeTime(r.last_reply_at ?? r.created_at),
      };
    }),
    total: totalN,
    totalPages: Math.max(1, Math.ceil(totalN / pageSize)),
    pageSize,
  };
}

export async function getBoardStats(db: D1Database, boardSlug: string) {
  // 「今日」按上海日界：datetime('now','+8 hours','start of day','-8 hours') = 上海今日 0 点的 UTC 串
  // （直接 date('now') 是 UTC 日界，北京时间 0–8 点会把昨晚 8 点后算进「今日」——P11-1）
  const todayFrom = `datetime('now', '+8 hours', 'start of day', '-8 hours')`;
  const r = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM threads t JOIN boards b ON b.id=t.board_id WHERE b.slug=? AND t.status='published') AS topics,
      (SELECT COUNT(*) FROM replies r JOIN threads t ON t.id=r.thread_id JOIN boards b ON b.id=t.board_id WHERE b.slug=? AND r.status='published') AS posts,
      (SELECT COUNT(*) FROM threads t JOIN boards b ON b.id=t.board_id WHERE b.slug=? AND t.status='published' AND t.created_at >= ${todayFrom}) AS today
  `).bind(boardSlug, boardSlug, boardSlug).first<{ topics: number; posts: number; today: number }>();
  return {
    topics: formatCount(r?.topics ?? 0),
    posts: formatCount(r?.posts ?? 0),
    today: formatCount(r?.today ?? 0),
  };
}

/* ========== 盖楼详情 03 ========== */

/** 引用预填（P4-4）：按楼层/帖子 id 取 published 内容与作者（先查楼层再查帖子）。
 *  identity_id 供引用通知定位被引用作者（P12-5）。P10-4 自 index.tsx 收敛 */
export async function getQuotePreview(db: D1Database, id: string): Promise<{ content: string; display_no: number; identity_id: string } | null> {
  return await db.prepare(
    "SELECT r.content, i.display_no, r.identity_id FROM replies r JOIN identities i ON i.id=r.identity_id WHERE r.id=? AND r.status='published'",
  ).bind(id).first<{ content: string; display_no: number; identity_id: string }>()
    ?? await db.prepare(
      "SELECT t.content, i.display_no, t.identity_id FROM threads t JOIN identities i ON i.id=t.identity_id WHERE t.id=? AND t.status='published'",
    ).bind(id).first<{ content: string; display_no: number; identity_id: string }>();
}

/** 登录：按身份码哈希找身份（P10-4 自 index.tsx 收敛） */
export async function getIdentityByCodeHash(db: D1Database, codeHash: string): Promise<IdentityRow | null> {
  return await db.prepare("SELECT * FROM identities WHERE code_hash = ?").bind(codeHash).first<IdentityRow>();
}

/** 回复目标解析（P14-4）：楼层 id 或帖子 id → 归属信息。仅 published 可作为目标 */
export async function getReplyTarget(db: D1Database, id: string): Promise<{ displayNo: number; floor: number; authorId: string } | null> {
  const rep = await db.prepare(
    "SELECT r.floor, r.identity_id, i.display_no FROM replies r JOIN identities i ON i.id=r.identity_id WHERE r.id=? AND r.status='published'",
  ).bind(id).first<{ floor: number; identity_id: string; display_no: number }>();
  if (rep) return { displayNo: rep.display_no, floor: rep.floor, authorId: rep.identity_id };
  const th = await db.prepare(
    "SELECT t.identity_id, i.display_no FROM threads t JOIN identities i ON i.id=t.identity_id WHERE t.id=? AND t.status='published'",
  ).bind(id).first<{ identity_id: string; display_no: number }>();
  if (th) return { displayNo: th.display_no, floor: 1, authorId: th.identity_id };
  return null;
}

export interface ThreadDetail {
  id: string; boardSlug: string; boardName: string; title: string;
  meta: string;
  selfHarm: boolean;
  floors: Floor[];
  participants: Array<{ no: string; mood: Mood }>;
  related: Array<[string, string]>;
  page: number;        // 当前楼层数页（P13-3）
  totalPages: number;  // 总页数 = ceil((1 楼主 + published 回复数)/20)
}

/** 每页楼层数（含 1 楼主）。楼层号 → 页码换算供通知跳转等使用（P13-3） */
export const FLOORS_PER_PAGE = 20;
export const floorToPage = (floor: number): number => Math.max(1, Math.ceil(floor / FLOORS_PER_PAGE));

/** 楼层作者等级 + 展示号（P7-2 / P14-4）：identities.level 签发后从不更新，等级由发言数
 *  经 levelFromPosts 实时计算；displayNo 供回复归属标记解析（不落死列，P7 教训）。
 *  一次查询覆盖全楼参与作者（楼主 + 已见楼层作者），避免逐行相关子查询。 */
async function getAuthorLevels(db: D1Database, threadId: string): Promise<Map<string, { level: string; displayNo: number }>> {
  const { results } = await db.prepare(`
    SELECT i.id, i.display_no,
      (SELECT COUNT(*) FROM threads tt WHERE tt.identity_id = i.id AND tt.status='published')
      + (SELECT COUNT(*) FROM replies rr WHERE rr.identity_id = i.id AND rr.status='published') AS speak
    FROM identities i
    WHERE i.id IN (
      SELECT identity_id FROM threads WHERE id = ?
      UNION
      SELECT identity_id FROM replies WHERE thread_id = ? AND status='published'
      UNION
      SELECT reply_to_author FROM replies WHERE thread_id = ? AND reply_to_author IS NOT NULL
    )
  `).bind(threadId, threadId, threadId).all<{ id: string; display_no: number; speak: number }>();
  return new Map(results.map((r) => [r.id, {
    level: r.display_no === 0 ? "洞务" : levelFromPosts(r.speak).level,
    displayNo: r.display_no,
  }]));
}

export async function getThreadDetail(
  db: D1Database,
  threadId: string,
  identityId: string,
  opts?: { onlyOp?: boolean; page?: number },
): Promise<ThreadDetail | null> {
  const t = await db.prepare(`
    SELECT t.id, t.board_id, t.identity_id, t.title, t.content, t.views, t.reply_count, t.hug_count, t.created_at,
      b.slug AS board_slug, b.name AS board_name, b.mood AS board_mood,
      i.display_no AS author_display
    FROM threads t
    JOIN boards b ON b.id=t.board_id
    JOIN identities i ON i.id=t.identity_id
    WHERE t.id=? AND t.status='published'
  `).bind(threadId).first<{
    id: string; board_id: string; identity_id: string; title: string; content: string; views: number; reply_count: number;
    hug_count: number; created_at: string; board_slug: string; board_name: string; board_mood: Mood;
    author_display: number;
  }>();
  if (!t) return null;

  // 盖楼分页（P13-3）：每页 20 楼（1 楼主 + 回复），楼层号原值不因翻页改变。
  // 只看楼主视图只有楼主一层，不翻页。
  // P14-1：总页数按 MAX(floor) 推导而非 reply_count——楼层号不回收，删除楼层会让
  // 两者脱钩，新回复（MAX+1）可能落在按 reply_count 算出的「不存在页」上不可见
  const maxFloor = (await db.prepare(
    "SELECT MAX(floor) AS m FROM replies WHERE thread_id=? AND status='published'",
  ).bind(threadId).first<{ m: number | null }>())?.m ?? 1;
  const totalPages = opts?.onlyOp ? 1 : Math.max(1, Math.ceil(Math.max(maxFloor, 1) / FLOORS_PER_PAGE));
  const page = opts?.onlyOp ? 1 : Math.min(Math.max(1, opts?.page ?? 1), totalPages);

  const replies = opts?.onlyOp
    ? { results: [] as Array<{ id: string; floor: number; identity_id: string; content: string; quote: string | null; hug_count: number; created_at: string; author_display: number; reply_to_floor: number | null; reply_to_author: string | null }> }
    : await db.prepare(`
        SELECT r.id, r.floor, r.identity_id, r.content, r.quote, r.hug_count, r.created_at,
          r.reply_to_floor, r.reply_to_author, i.display_no AS author_display
        FROM replies r JOIN identities i ON i.id=r.identity_id
        WHERE r.thread_id=? AND r.status='published' AND r.floor BETWEEN ? AND ?
        ORDER BY r.floor
      `).bind(threadId, (page - 1) * FLOORS_PER_PAGE + 1, page * FLOORS_PER_PAGE).all<{
        id: string; floor: number; identity_id: string; content: string; quote: string | null; hug_count: number;
        created_at: string; author_display: number; reply_to_floor: number | null; reply_to_author: string | null;
      }>();

  const levelMap = await getAuthorLevels(db, threadId);

  const authorNo = String(t.author_display).padStart(4, "0");
  const floors: Floor[] = [
    {
      id: t.id, floorNo: 1, floorLabel: `1楼 · 发表于 ${formatDateTime(t.created_at)}`,
      author: displayAuthor(t.author_display), authorNo,
      level: levelMap.get(t.identity_id)?.level ?? "一叶",
      mood: t.board_mood, isOp: true,
      canDelete: t.identity_id === identityId && ageMinutes(t.created_at) < 10,
      hugCount: t.hug_count, content: t.content,
    },
    // 只看楼主（P9-3）：仅楼主楼层，楼层号保留原值
    ...(opts?.onlyOp ? [] : replies.results.map((r) => ({
      id: r.id, floorNo: r.floor,
      floorLabel: `${r.floor}楼${r.floor === 2 ? " · 沙发" : r.floor === 3 ? " · 板凳" : ""} · 发表于 ${formatDateTime(r.created_at)}`,
      author: displayAuthor(r.author_display), authorNo: String(r.author_display).padStart(4, "0"),
      level: levelMap.get(r.identity_id)?.level ?? "一叶", mood: t.board_mood, isOp: false,
      canDelete: r.identity_id === identityId && ageMinutes(r.created_at) < 10,
      hugCount: r.hug_count,
      content: r.content, quote: r.quote ?? undefined,
      // 回复归属（P14-4）：作者名经 levelMap 实时解析（目标作者不在册时降级为仅 @N 楼）
      replyTo: r.reply_to_floor != null
        ? {
            floor: r.reply_to_floor,
            author: (() => {
              const d = r.reply_to_author ? levelMap.get(r.reply_to_author)?.displayNo : undefined;
              return d != null ? displayAuthor(d) : undefined;
            })(),
          }
        : undefined,
    }))),
  ];

  const [participants, related] = await Promise.all([
    db.prepare(`
      SELECT i.display_no AS display FROM replies r JOIN identities i ON i.id=r.identity_id
      WHERE r.thread_id=? AND r.status='published' GROUP BY i.id ORDER BY MAX(r.created_at) DESC LIMIT 6
    `).bind(threadId).all<{ display: number }>().then((r) =>
      r.results.map((p) => ({ no: String(p.display).padStart(4, "0"), mood: t.board_mood })),
    ),
    db.prepare(`
      SELECT t.title, t.hug_count FROM threads t
      WHERE t.board_id=? AND t.id<>? AND t.status='published'
      ORDER BY t.hug_count DESC LIMIT 4
    `).bind(t.board_id, threadId).all<{ title: string; hug_count: number }>().then((r) =>
      r.results.map((x) => [x.title, formatCount(x.hug_count)] as [string, string]),
    ),
  ]);

  return {
    id: t.id, boardSlug: t.board_slug, boardName: t.board_name, title: t.title,
    // 只看楼主/收藏由页面层渲染为链接与表单（P9-3），meta 只保留纯计数
    meta: `回复 ${formatCount(t.reply_count)} · 查看 ${formatCount(t.views)}`,
    // 自伤判定（P5-4）：覆盖楼主正文与楼层——分页后（P13-3）为「楼主 + 当前页可见楼层」
    selfHarm: judgeContent(t.title + t.content) === "self-harm"
      || replies.results.some((r) => judgeContent(r.content) === "self-harm"),
    floors, participants, related, page, totalPages,
  };
}

/* ========== 搜索 / 精华区（P4-4：设计稿内元素落地） ========== */

/** 搜索 published 帖子的标题与正文（LIKE 参数化 + %/_ 字面转义；按抱抱数排序，分页）。
 *  P10-5：返回带 total/totalPages 的分页结构 */
export async function searchThreads(
  db: D1Database,
  q: string,
  page = 1,
  pageSize = 20,
): Promise<{ threads: Thread[]; page: number; totalPages: number; total: number }> {
  page = Math.max(1, page);
  const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
  const where = `t.status='published' AND (t.title LIKE ? ESCAPE '\\' OR t.content LIKE ? ESCAPE '\\')`;
  const total = (await db.prepare(`SELECT COUNT(*) AS n FROM threads t WHERE ${where}`)
    .bind(like, like).first<{ n: number }>())?.n ?? 0;
  const { results } = await db.prepare(`
    SELECT t.id, t.title, t.reply_count, t.views, t.essence, i.display_no AS author_display,
      COALESCE(t.last_reply_at, t.created_at) AS last_reply_at, t.created_at
    FROM threads t JOIN identities i ON i.id=t.identity_id
    WHERE ${where}
    ORDER BY t.hug_count DESC LIMIT ? OFFSET ?
  `).bind(like, like, pageSize, (page - 1) * pageSize).all<ThreadRow>();
  return {
    threads: results.map((r) => ({
      id: r.id, boardSlug: "", boardName: "",
      title: r.title, author: displayAuthor(r.author_display),
      replyCount: formatCount(r.reply_count), viewCount: formatCount(r.views),
      pinned: !!r.pinned, essence: !!r.essence,
      lastReplyUser: displayAuthor(r.author_display),
      lastReplyTime: formatRelativeTime(r.last_reply_at ?? r.created_at),
    })),
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    total,
  };
}

/** 精华区：跨版块 essence=1 的帖子，按最后活跃排序 */
export async function getEssenceThreads(db: D1Database, limit = 50): Promise<Thread[]> {
  const { results } = await db.prepare(`
    SELECT t.id, t.title, t.reply_count, t.views, t.essence, i.display_no AS author_display,
      COALESCE(t.last_reply_at, t.created_at) AS last_reply_at, t.created_at,
      b.name AS board_name, b.slug AS board_slug
    FROM threads t JOIN boards b ON b.id=t.board_id JOIN identities i ON i.id=t.identity_id
    WHERE t.status='published' AND t.essence=1
    ORDER BY COALESCE(t.last_reply_at, t.created_at) DESC LIMIT ?
  `).bind(limit).all<ThreadRow & { board_name: string; board_slug: string }>();
  return results.map((r) => ({
    id: r.id, boardSlug: r.board_slug, boardName: r.board_name,
    title: r.title, author: displayAuthor(r.author_display),
    replyCount: formatCount(r.reply_count), viewCount: formatCount(r.views),
    pinned: !!r.pinned, essence: true,
    lastReplyUser: displayAuthor(r.author_display),
    lastReplyTime: formatRelativeTime(r.last_reply_at ?? r.created_at),
  }));
}

/** 站务删除确认页的目标摘要（P11-7）：帖子（含待审）取标题+正文，楼层取内容——
 *  终态删除前让洞务看到内容，防误删/怒删 */
export async function getModTargetSummary(db: D1Database, type: "thread" | "reply", id: string) {
  if (type === "thread") {
    return await db.prepare(`
      SELECT t.title, t.content, b.name AS board_name, i.display_no AS display
      FROM threads t JOIN boards b ON b.id=t.board_id JOIN identities i ON i.id=t.identity_id
      WHERE t.id=? AND t.status IN ('published','pending','hidden')
    `).bind(id).first<{ title: string; content: string; board_name: string; display: number }>();
  }
  return await db.prepare(`
    SELECT t.title, r.content, b.name AS board_name, i.display_no AS display
    FROM replies r JOIN threads t ON t.id=r.thread_id JOIN boards b ON b.id=t.board_id
    JOIN identities i ON i.id=r.identity_id
    WHERE r.id=? AND r.status IN ('published','hidden')
  `).bind(id).first<{ title: string; content: string; board_name: string; display: number }>();
}

/* ========== 站务：待审 / 举报队列 ========== */

const QUEUE_LIMIT = 50; // 队列单页上限（P12-3：防堆积撑爆页面，配合 total 提示剩余）

export async function getPendingThreads(db: D1Database) {
  const [{ results }, total] = await Promise.all([
    db.prepare(`
      SELECT t.id, t.title, t.content, t.created_at,
        b.name AS board_name, i.display_no AS author_display
      FROM threads t JOIN boards b ON b.id=t.board_id JOIN identities i ON i.id=t.identity_id
      WHERE t.status='pending' ORDER BY t.created_at LIMIT ?
    `).bind(QUEUE_LIMIT).all<{ id: string; title: string; content: string; created_at: string; board_name: string; author_display: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM threads WHERE status='pending'").first<{ n: number }>(),
  ]);
  return {
    items: results.map((r) => ({
      id: r.id, title: r.title, content: r.content, boardName: r.board_name,
      author: displayAuthor(r.author_display), time: formatRelativeTime(r.created_at),
    })),
    total: total?.n ?? 0,
  };
}

export async function getOpenReports(db: D1Database) {
  const [{ results }, total] = await Promise.all([
    db.prepare(`
      SELECT r.id, r.target_type, r.target_id, r.reason, r.created_at,
        COALESCE(t.title, '楼层#' || rp.floor) AS target_label,
        COALESCE(rp.content, t.content) AS target_content,
        t.essence AS thread_essence,
        t.pinned AS thread_pinned,
        CASE r.target_type WHEN 'thread' THEN t.status ELSE rp.status END AS target_status
      FROM reports r
      LEFT JOIN threads t ON r.target_type='thread' AND t.id=r.target_id
      LEFT JOIN replies rp ON r.target_type='reply' AND rp.id=r.target_id
      WHERE r.status='open' ORDER BY r.created_at LIMIT ?
    `).bind(QUEUE_LIMIT).all<{ id: string; target_type: string; target_id: string; reason: string; created_at: string; target_label: string; target_content: string | null; thread_essence: number | null; thread_pinned: number | null; target_status: string | null }>(),
    db.prepare("SELECT COUNT(*) AS n FROM reports WHERE status='open'").first<{ n: number }>(),
  ]);
  return {
    items: results.map((r) => ({
      id: r.id, targetType: r.target_type, targetId: r.target_id, reason: r.reason ?? "",
      label: r.target_label, time: formatRelativeTime(r.created_at),
      status: r.target_status ?? "missing", // 目标当前状态：published|hidden|deleted|missing（决定处置按钮组）
      content: (r.target_content ?? "").slice(0, 60),
      essence: !!r.thread_essence,
      pinned: !!r.thread_pinned,
    })),
    total: total?.n ?? 0,
  };
}

/* ========== 热帖榜（首页右侧） ========== */

export async function getHotThreads(kv: KVNamespace, db: D1Database): Promise<HotItem[]> {
  // v2：HotItem 契约 replies → hugs（P11-5）——换键避免部署后读到旧形状缓存
  return cached(kv, CACHE_KEY_HOT, 60, async () => {
    const { results } = await db.prepare(`
      SELECT t.id, t.title, b.name AS board_name, b.mood, t.hug_count
      FROM threads t JOIN boards b ON b.id=t.board_id
      WHERE t.status='published' ORDER BY t.hug_count DESC LIMIT 8
    `).all<{ id: string; title: string; board_name: string; mood: Mood; hug_count: number }>();
    return results.map((r) => ({
      id: r.id, title: r.title, boardName: r.board_name, boardMood: r.mood, hugs: formatCount(r.hug_count),
    }));
  });
}

/** 版块热帖（版块页右栏，P11-6 自 index.tsx 收敛——index 回归纯编排） */
export async function getBoardHot(db: D1Database, boardSlug: string): Promise<Array<[string, string]>> {
  const { results } = await db.prepare(`
    SELECT t.title, t.hug_count FROM threads t JOIN boards b ON b.id=t.board_id
    WHERE b.slug=? AND t.status='published' ORDER BY t.hug_count DESC LIMIT 5
  `).bind(boardSlug).all<{ title: string; hug_count: number }>();
  return results.map((x) => [x.title, formatCount(x.hug_count)] as [string, string]);
}

/* ========== 消息通知 05 ========== */

/** 顶栏未读数（P9-4）：read_at IS NULL 走 idx_notif_owner 前缀 */
export async function getUnreadCount(db: D1Database, identityId: string): Promise<number> {
  const r = await db.prepare(
    "SELECT COUNT(*) AS n FROM notifications WHERE identity_id = ? AND read_at IS NULL",
  ).bind(identityId).first<{ n: number }>();
  return r?.n ?? 0;
}

export async function getNotices(
  db: D1Database,
  identityId: string,
  opts: { type?: "reply" | "hug" | "system"; page?: number } = {},
): Promise<{ notices: Notice[]; page: number; totalPages: number }> {
  const pageSize = 20;
  const page = Math.max(1, opts.page ?? 1);
  const where = opts.type ? "identity_id=? AND type=?" : "identity_id=?";
  const bind: Array<string | number> = opts.type ? [identityId, opts.type] : [identityId];
  const total = (await db.prepare(`SELECT COUNT(*) AS n FROM notifications WHERE ${where}`)
    .bind(...bind).first<{ n: number }>())?.n ?? 0;
  const { results } = await db.prepare(`
    SELECT id, type, payload, read_at, created_at FROM notifications
    WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).bind(...bind, pageSize, (page - 1) * pageSize)
    .all<{ id: string; type: string; payload: string; read_at: string | null; created_at: string }>();
  const notices = results.map((n) => {
    const p = JSON.parse(n.payload) as { main: string; sub?: string; threadId?: string; floor?: number };
    return {
      id: n.id, kind: (n.type === "reply" || n.type === "hug" || n.type === "system" ? n.type : "system") as Notice["kind"],
      main: p.main, sub: p.sub ?? "", time: formatRelativeTime(n.created_at), unread: !n.read_at,
      threadId: p.threadId, floor: p.floor,
    };
  });
  return { notices, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/* ========== 我的树洞 06 ========== */

export async function getMyThreads(db: D1Database, identityId: string): Promise<MyThread[]> {
  const { results } = await db.prepare(`
    SELECT t.id, t.title, t.reply_count, t.views, t.essence, t.created_at,
      b.name AS board_name, b.mood AS board_mood
    FROM threads t JOIN boards b ON b.id=t.board_id
    WHERE t.identity_id=? AND t.status='published' ORDER BY t.created_at DESC
  `).bind(identityId).all<{
    id: string; title: string; reply_count: number; views: number; essence: number;
    created_at: string; board_name: string; board_mood: Mood;
  }>();
  return results.map((r) => ({
    id: r.id, title: r.title, boardName: r.board_name, boardMood: r.board_mood,
    repliesViews: `${formatCount(r.reply_count)} / ${formatCount(r.views)}`,
    time: formatRelativeTime(r.created_at), essence: !!r.essence,
  }));
}

export async function getMyStats(db: D1Database, identityId: string) {
  // 抱抱实时统计（P7-1）：hug_received 列从未被写路径维护（恒为 0），改由 hugs 表按
  // published 帖/楼作者实时 COUNT——与下方 posts/replies 的 published 口径一致
  const [posts, replies, hugs] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS n FROM threads WHERE identity_id=? AND status='published'").bind(identityId).first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM replies WHERE identity_id=? AND status='published'").bind(identityId).first<{ n: number }>(),
    db.prepare(`
      SELECT (
        (SELECT COUNT(*) FROM hugs h JOIN threads t ON h.target_type='thread' AND h.target_id=t.id
          WHERE t.identity_id=? AND t.status='published')
        + (SELECT COUNT(*) FROM hugs h JOIN replies r ON h.target_type='reply' AND h.target_id=r.id
          WHERE r.identity_id=? AND r.status='published')
      ) AS n
    `).bind(identityId, identityId).first<{ n: number }>(),
  ]);
  return {
    posts: posts?.n ?? 0,
    replies: replies?.n ?? 0,
    hugs: hugs?.n ?? 0,
  };
}

/* ========== 首页右栏 · 社区数据（真实计数） ========== */

export async function getCommunityStats(db: D1Database): Promise<Array<[string, string]>> {
  const r = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM identities i WHERE EXISTS (SELECT 1 FROM threads t WHERE t.identity_id = i.id AND t.status = 'published')
        OR EXISTS (SELECT 1 FROM replies r WHERE r.identity_id = i.id AND r.status = 'published')) AS speakers,
      (SELECT COUNT(*) FROM threads WHERE status='published' AND created_at >= datetime('now', '+8 hours', 'start of day', '-8 hours')) AS today_threads,
      (SELECT COALESCE(SUM(hug_count),0) FROM threads WHERE status='published') AS hugs,
      (SELECT COUNT(*) FROM threads WHERE status='published') AS topics
  `).first<{ speakers: number; today_threads: number; hugs: number; topics: number }>();
  return [
    ["发言洞友", formatCount(r?.speakers ?? 0)],
    ["今日新洞", formatCount(r?.today_threads ?? 0)],
    ["累计抱抱", formatCount(r?.hugs ?? 0)],
    ["树洞主题", formatCount(r?.topics ?? 0)],
  ];
}

/* ========== 我的足迹（首页左栏） ========== */

export async function getMyTracks(db: D1Database, identityId: string): Promise<Array<[string, string]>> {
  const stats = await getMyStats(db, identityId);
  return [
    ["我发布的", formatCount(stats.posts)],
    ["我回应的", formatCount(stats.replies)],
    ["收到的抱抱", formatCount(stats.hugs)],
  ];
}

/* ========== 我的收藏 / 我回应的 ========== */

export async function getMyFavorites(db: D1Database, identityId: string): Promise<MyThread[]> {
  const { results } = await db.prepare(`
    SELECT t.id, t.title, t.reply_count, t.views, t.essence, t.created_at,
      b.name AS board_name, b.mood AS board_mood
    FROM favorites f JOIN threads t ON t.id = f.thread_id JOIN boards b ON b.id = t.board_id
    WHERE f.identity_id = ? AND t.status='published'
    ORDER BY f.created_at DESC
  `).bind(identityId).all<{
    id: string; title: string; reply_count: number; views: number; essence: number;
    created_at: string; board_name: string; board_mood: Mood;
  }>();
  return results.map((r) => ({
    id: r.id, title: r.title, boardName: r.board_name, boardMood: r.board_mood,
    repliesViews: `${formatCount(r.reply_count)} / ${formatCount(r.views)}`,
    time: formatRelativeTime(r.created_at), essence: !!r.essence,
  }));
}

export async function getMyReplies(db: D1Database, identityId: string): Promise<MyThread[]> {
  // P11-5：带出楼层号——行链接锚到 /t/:id#floor-N，且行 id 不再共用 thread_id（重复 key）
  const { results } = await db.prepare(`
    SELECT r.id, r.floor, r.content, r.created_at,
      t.id AS thread_id, t.title, t.reply_count, t.views, t.essence,
      b.name AS board_name, b.mood AS board_mood
    FROM replies r JOIN threads t ON t.id = r.thread_id JOIN boards b ON b.id = t.board_id
    WHERE r.identity_id = ? AND r.status='published'
    ORDER BY r.created_at DESC
  `).bind(identityId).all<{
    id: string; floor: number; content: string; created_at: string; thread_id: string; title: string;
    reply_count: number; views: number; essence: number; board_name: string; board_mood: Mood;
  }>();
  return results.map((r) => ({
    id: r.thread_id, floor: r.floor, title: r.title, boardName: r.board_name, boardMood: r.board_mood,
    repliesViews: `${formatCount(r.reply_count)} / ${formatCount(r.views)}`,
    time: formatRelativeTime(r.created_at), essence: !!r.essence,
  }));
}

/* ========== 盖楼页 · 是否已收藏 ========== */

export async function isFavorited(db: D1Database, identityId: string, threadId: string): Promise<boolean> {
  const r = await db.prepare(
    "SELECT id FROM favorites WHERE identity_id=? AND thread_id=?",
  ).bind(identityId, threadId).first<{ id: string }>();
  return !!r;
}

/* ========== 我的树洞 · 本周数据 ========== */
export async function getWeekStats(db: D1Database, identityId: string): Promise<Array<[string, string]>> {
  // 「收到抱抱」含帖子与楼层两路（P11-3：原只数 threads.hug_count，与 getMyStats 口径不一）
  const r = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM threads WHERE identity_id=? AND status='published' AND created_at >= datetime('now','-7 days')) +
      (SELECT COUNT(*) FROM replies WHERE identity_id=? AND status='published' AND created_at >= datetime('now','-7 days')) AS speaks,
      (SELECT COALESCE(SUM(hug_count),0) FROM threads WHERE identity_id=? AND status='published' AND created_at >= datetime('now','-7 days'))
      + (SELECT COALESCE(SUM(hug_count),0) FROM replies WHERE identity_id=? AND status='published' AND created_at >= datetime('now','-7 days')) AS hugs
  `).bind(identityId, identityId, identityId, identityId).first<{ speaks: number; hugs: number }>();
  return [
    ["本周发言", `${r?.speaks ?? 0} 次`],
    ["收到抱抱", formatCount(r?.hugs ?? 0)],
  ];
}
