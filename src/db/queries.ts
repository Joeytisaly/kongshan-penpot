// 数据查询层 —— 从 D1 组装出 UI 契约（types.ts）所需的数据
// 依赖地图：queries.ts ↔ types.ts（契约）+ format.ts（展示格式化）；页面层只消费返回值
// P0 的 mock.ts 退役后，本文件是页面唯一数据来源
import type { Board, Floor, HotItem, Mood, MyThread, Notice, Thread } from "../lib/types";
import { displayAuthor, ageMinutes, formatCount, formatDateTime, formatRelativeTime } from "../lib/format";
import { judgeContent } from "../lib/words";
import { cached } from "../lib/cache";

/* ========== 首页 01（热帖榜/版块统计走 KV 缓存 60s） ========== */

export interface BoardRow {
  slug: string; name: string; description: string; mood: Mood; icon_char: string;
  topic_count: number; post_count: number; last_user: number | null; last_time: string | null;
}

export async function getBoards(kv: KVNamespace, db: D1Database): Promise<Board[]> {
  return cached(kv, "cache:boards", 60, async () => {
    const { results } = await db.prepare(`
      SELECT b.slug, b.name, b.description, b.mood, b.icon_char,
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
    "SELECT slug, name, description, mood, icon_char FROM boards WHERE slug = ?",
  ).bind(slug).first<BoardRow>();
  if (!b) return null;
  return {
    slug: b.slug, name: b.name, description: b.description, mood: b.mood, iconChar: b.icon_char,
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

  // 每帖最后回复人/时间
  const lastMap = new Map<string, { user: string; time: string }>();
  if (rows.length > 0) {
    const ph = rows.map(() => "?").join(",");
    const { results: lrs } = await db.prepare(`
      SELECT r.thread_id, i.display_no AS display, r.created_at AS at
      FROM replies r JOIN identities i ON i.id=r.identity_id
      WHERE r.thread_id IN (${ph}) AND r.status='published'
      ORDER BY r.created_at DESC
    `).bind(...rows.map((r) => r.id)).all<{ thread_id: string; display: number; at: string }>();
    for (const lr of lrs) {
      if (!lastMap.has(lr.thread_id)) lastMap.set(lr.thread_id, { user: displayAuthor(lr.display), time: formatRelativeTime(lr.at) });
    }
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
  const r = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM threads t JOIN boards b ON b.id=t.board_id WHERE b.slug=? AND t.status='published') AS topics,
      (SELECT COUNT(*) FROM replies r JOIN threads t ON t.id=r.thread_id JOIN boards b ON b.id=t.board_id WHERE b.slug=? AND r.status='published') AS posts,
      (SELECT COUNT(*) FROM threads t JOIN boards b ON b.id=t.board_id WHERE b.slug=? AND t.status='published' AND t.created_at >= date('now')) AS today
  `).bind(boardSlug, boardSlug, boardSlug).first<{ topics: number; posts: number; today: number }>();
  return {
    topics: formatCount(r?.topics ?? 0),
    posts: formatCount(r?.posts ?? 0),
    today: formatCount(r?.today ?? 0),
  };
}

/* ========== 盖楼详情 03 ========== */

export interface ThreadDetail {
  id: string; boardSlug: string; boardName: string; title: string;
  meta: string;
  selfHarm: boolean;
  floors: Floor[];
  participants: Array<{ no: string; mood: Mood }>;
  related: Array<[string, string]>;
}

export async function getThreadDetail(db: D1Database, threadId: string, identityId: string): Promise<ThreadDetail | null> {
  const t = await db.prepare(`
    SELECT t.id, t.board_id, t.identity_id, t.title, t.content, t.views, t.reply_count, t.hug_count, t.created_at,
      b.slug AS board_slug, b.name AS board_name, b.mood AS board_mood,
      i.display_no AS author_display, i.level AS author_level
    FROM threads t
    JOIN boards b ON b.id=t.board_id
    JOIN identities i ON i.id=t.identity_id
    WHERE t.id=? AND t.status='published'
  `).bind(threadId).first<{
    id: string; board_id: string; identity_id: string; title: string; content: string; views: number; reply_count: number;
    hug_count: number; created_at: string; board_slug: string; board_name: string; board_mood: Mood;
    author_display: number; author_level: string;
  }>();
  if (!t) return null;

  const { results: replies } = await db.prepare(`
    SELECT r.id, r.floor, r.identity_id, r.content, r.quote, r.hug_count, r.created_at,
      i.display_no AS author_display, i.level AS author_level
    FROM replies r JOIN identities i ON i.id=r.identity_id
    WHERE r.thread_id=? AND r.status='published' ORDER BY r.floor
  `).bind(threadId).all<{
    id: string; floor: number; identity_id: string; content: string; quote: string | null; hug_count: number;
    created_at: string; author_display: number; author_level: string;
  }>();

  const authorNo = String(t.author_display).padStart(4, "0");
  const floors: Floor[] = [
    {
      id: t.id, floorNo: 1, floorLabel: `1楼 · 发表于 ${formatDateTime(t.created_at)}`,
      author: displayAuthor(t.author_display), authorNo, level: t.author_level,
      mood: t.board_mood, isOp: true,
      canDelete: t.identity_id === identityId && ageMinutes(t.created_at) < 10,
      hugCount: t.hug_count, content: t.content,
    },
    ...replies.map((r) => ({
      id: r.id, floorNo: r.floor,
      floorLabel: `${r.floor}楼${r.floor === 2 ? " · 沙发" : r.floor === 3 ? " · 板凳" : ""} · 发表于 ${formatDateTime(r.created_at)}`,
      author: displayAuthor(r.author_display), authorNo: String(r.author_display).padStart(4, "0"),
      level: r.author_level, mood: t.board_mood, isOp: false,
      canDelete: r.identity_id === identityId && ageMinutes(r.created_at) < 10,
      hugCount: r.hug_count,
      content: r.content, quote: r.quote ?? undefined,
    })),
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
    meta: `回复 ${formatCount(t.reply_count)} · 查看 ${formatCount(t.views)} · 只看楼主 · 收藏`,
    selfHarm: judgeContent(t.title + t.content) === "self-harm",
    floors, participants, related,
  };
}

/* ========== 站务：待审 / 举报队列 ========== */

export async function getPendingThreads(db: D1Database) {
  const { results } = await db.prepare(`
    SELECT t.id, t.title, t.content, t.created_at,
      b.name AS board_name, i.display_no AS author_display
    FROM threads t JOIN boards b ON b.id=t.board_id JOIN identities i ON i.id=t.identity_id
    WHERE t.status='pending' ORDER BY t.created_at
  `).all<{ id: string; title: string; content: string; created_at: string; board_name: string; author_display: number }>();
  return results.map((r) => ({
    id: r.id, title: r.title, content: r.content, boardName: r.board_name,
    author: displayAuthor(r.author_display), time: formatRelativeTime(r.created_at),
  }));
}

export async function getOpenReports(db: D1Database) {
  const { results } = await db.prepare(`
    SELECT r.id, r.target_type, r.target_id, r.reason, r.created_at,
      COALESCE(t.title, '楼层#' || rp.floor) AS target_label
    FROM reports r
    LEFT JOIN threads t ON r.target_type='thread' AND t.id=r.target_id
    LEFT JOIN replies rp ON r.target_type='reply' AND rp.id=r.target_id
    WHERE r.status='open' ORDER BY r.created_at
  `).all<{ id: string; target_type: string; target_id: string; reason: string; created_at: string; target_label: string }>();
  return results.map((r) => ({
    id: r.id, targetType: r.target_type, targetId: r.target_id, reason: r.reason ?? "",
    label: r.target_label, time: formatRelativeTime(r.created_at),
  }));
}

/* ========== 热帖榜（首页右侧） ========== */

export async function getHotThreads(kv: KVNamespace, db: D1Database): Promise<HotItem[]> {
  return cached(kv, "cache:hot", 60, async () => {
    const { results } = await db.prepare(`
      SELECT t.id, t.title, b.name AS board_name, b.mood, t.hug_count
      FROM threads t JOIN boards b ON b.id=t.board_id
      WHERE t.status='published' ORDER BY t.hug_count DESC LIMIT 8
    `).all<{ id: string; title: string; board_name: string; mood: Mood; hug_count: number }>();
    return results.map((r) => ({
      id: r.id, title: r.title, boardName: r.board_name, boardMood: r.mood, replies: formatCount(r.hug_count),
    }));
  });
}

/* ========== 消息通知 05 ========== */

export async function getNotices(db: D1Database, identityId: string): Promise<Notice[]> {
  const { results } = await db.prepare(`
    SELECT id, type, payload, read_at, created_at FROM notifications
    WHERE identity_id=? ORDER BY created_at DESC LIMIT 50
  `).bind(identityId).all<{ id: string; type: string; payload: string; read_at: string | null; created_at: string }>();
  return results.map((n) => {
    const p = JSON.parse(n.payload) as { main: string; sub?: string };
    return {
      id: n.id, kind: (n.type === "reply" || n.type === "hug" || n.type === "system" ? n.type : "system") as Notice["kind"],
      main: p.main, sub: p.sub ?? "", time: formatRelativeTime(n.created_at), unread: !n.read_at,
    };
  });
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
  const [posts, replies, me] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS n FROM threads WHERE identity_id=? AND status='published'").bind(identityId).first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) AS n FROM replies WHERE identity_id=? AND status='published'").bind(identityId).first<{ n: number }>(),
    db.prepare("SELECT hug_received FROM identities WHERE id=?").bind(identityId).first<{ hug_received: number }>(),
  ]);
  return {
    posts: posts?.n ?? 0,
    replies: replies?.n ?? 0,
    hugs: me?.hug_received ?? 0,
  };
}

/* ========== 首页右栏 · 社区数据（真实计数） ========== */

export async function getCommunityStats(db: D1Database): Promise<Array<[string, string]>> {
  const r = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM identities) AS identities,
      (SELECT COUNT(*) FROM threads WHERE status='published' AND created_at >= date('now')) AS today_threads,
      (SELECT COALESCE(SUM(hug_count),0) FROM threads WHERE status='published') AS hugs,
      (SELECT COUNT(*) FROM threads WHERE status='published') AS topics
  `).first<{ identities: number; today_threads: number; hugs: number; topics: number }>();
  return [
    ["注册洞友", formatCount(r?.identities ?? 0)],
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
  const { results } = await db.prepare(`
    SELECT r.id, r.content, r.created_at,
      t.id AS thread_id, t.title, t.reply_count, t.views, t.essence,
      b.name AS board_name, b.mood AS board_mood
    FROM replies r JOIN threads t ON t.id = r.thread_id JOIN boards b ON b.id = t.board_id
    WHERE r.identity_id = ? AND r.status='published'
    ORDER BY r.created_at DESC
  `).bind(identityId).all<{
    id: string; content: string; created_at: string; thread_id: string; title: string;
    reply_count: number; views: number; essence: number; board_name: string; board_mood: Mood;
  }>();
  return results.map((r) => ({
    id: r.thread_id, title: r.title, boardName: r.board_name, boardMood: r.board_mood,
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
  const r = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM threads WHERE identity_id=? AND status='published' AND created_at >= datetime('now','-7 days')) +
      (SELECT COUNT(*) FROM replies WHERE identity_id=? AND status='published' AND created_at >= datetime('now','-7 days')) AS speaks,
      (SELECT COALESCE(SUM(hug_count),0) FROM threads WHERE identity_id=? AND status='published' AND created_at >= datetime('now','-7 days')) AS hugs
  `).bind(identityId, identityId, identityId).first<{ speaks: number; hugs: number }>();
  return [
    ["本周发言", `${r?.speaks ?? 0} 次`],
    ["收到抱抱", formatCount(r?.hugs ?? 0)],
  ];
}
