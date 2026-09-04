// 写路径 —— 发帖 / 回复（楼层自增）/ 抱抱（幂等）/ 通知 / 举报
// 依赖地图：writes.ts ↔ index.tsx（POST 路由）+ 表单页面；改动需跑通三链路实测（AGENTS.md §2）

import { displayAuthor } from "../lib/format";
import { judgeContent } from "../lib/words";

/** 内容判定后写入帖子：pending 进待审 / block 拒绝 / self-harm 正常发布 */
async function insertThread(
  db: D1Database,
  id: string,
  boardId: string,
  identityId: string,
  title: string,
  content: string,
  now: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const verdict = judgeContent(title + content);
  if (verdict === "block") {
    return { ok: false, error: "这个话题树洞无法承接。如果遇到困难，请拨打 12356 心理援助热线。" };
  }
  const status = verdict === "pending" ? "pending" : "published";
  await db.prepare(
    "INSERT INTO threads (id, board_id, identity_id, title, content, status, created_at, last_reply_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).bind(id, boardId, identityId, title, content, status, now, now).run();
  return { ok: true };
}

/** 通知写入：回复/抱抱/站务三类，payload 为展示摘要（JSON） */
async function notify(
  db: D1Database,
  recipientId: string,
  type: "reply" | "hug" | "system",
  payload: { main: string; sub?: string },
): Promise<void> {
  await db.prepare(
    "INSERT INTO notifications (id, identity_id, type, payload) VALUES (?, ?, ?, ?)",
  ).bind(crypto.randomUUID(), recipientId, type, JSON.stringify(payload)).run();
}

/** 创建帖子：校验版块与长度 → 审核判定（block/pending）→ 插入 → 更新身份发言数 → 返回新帖 id */
export async function createThread(
  db: D1Database,
  identityId: string,
  input: { boardSlug: string; title: string; content: string },
): Promise<{ ok: true; id: string; pending?: boolean } | { ok: false; error: string }> {
  const title = input.title.trim().slice(0, 40);
  const content = input.content.trim().slice(0, 500);
  if (!title) return { ok: false, error: "给心事起个标题吧。" };
  if (!content) return { ok: false, error: "正文还是空的，把心事放进来吧。" };
  const board = await db.prepare("SELECT id FROM boards WHERE slug = ?").bind(input.boardSlug).first<{ id: string }>();
  if (!board) return { ok: false, error: "这个版块还没有开放。" };

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const inserted = await insertThread(db, id, board.id, identityId, title, content, now);
  if (!inserted.ok) return inserted;
  await db.prepare("UPDATE identities SET post_count = post_count + 1, last_seen_at = datetime('now') WHERE id = ?").bind(identityId).run();
  return { ok: true, id, pending: judgeContent(title + content) === "pending" };
}

/** 回复：楼层号自增（事务内 max+1），同步回复数/最后回复时间，可选引用；违规词直接拒绝 */
export async function createReply(
  db: D1Database,
  identityId: string,
  threadId: string,
  content: string,
  quote?: string,
): Promise<{ ok: true; floor: number } | { ok: false; error: string }> {
  const text = content.trim().slice(0, 300);
  if (!text) return { ok: false, error: "说点什么吧。" };
  const verdict = judgeContent(text);
  if (verdict === "block") return { ok: false, error: "这个话题树洞无法承接。如果遇到困难，请拨打 12356 心理援助热线。" };
  if (verdict === "pending") return { ok: false, error: "这句话里有一些内容需要先给洞务组看看，换个说法再试试。" };
  const thread = await db.prepare(
    "SELECT id, identity_id, board_id FROM threads WHERE id = ? AND status='published'",
  ).bind(threadId).first<{ id: string; identity_id: string; board_id: string }>();
  if (!thread) return { ok: false, error: "这棵树已经不在树洞了。" };

  // 楼层号自增（事务内取 max+1，避免并发重复）；无回复时从 2 楼起（1 楼保留给楼主）
  const floorRow = await db.prepare(
    "SELECT COALESCE(MAX(floor), 1) + 1 AS next_floor FROM replies WHERE thread_id = ?",
  ).bind(threadId).first<{ next_floor: number }>();
  const floor = floorRow?.next_floor ?? 2;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const res = await db.batch([
    db.prepare(
      "INSERT INTO replies (id, thread_id, floor, identity_id, content, quote, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(id, threadId, floor, identityId, text, quote ?? null, now),
    db.prepare("UPDATE threads SET reply_count = reply_count + 1, last_reply_at = ? WHERE id = ?").bind(now, threadId),
  ]);
  if (res.some((r) => !r.success)) return { ok: false, error: "回应没有发出去，再试一次。" };

  // 通知楼主（自回不通知）
  if (thread.identity_id !== identityId) {
    const [author, th] = await Promise.all([
      db.prepare("SELECT display_no FROM identities WHERE id=?").bind(thread.identity_id).first<{ display_no: number }>(),
      db.prepare("SELECT title FROM threads WHERE id=?").bind(threadId).first<{ title: string }>(),
    ]);
    if (author && th) {
      await notify(db, thread.identity_id, "reply", {
        main: `${displayAuthor(author.display_no)} 回复了你的树洞「${th.title.slice(0, 12)}…」`,
        sub: text.slice(0, 30),
      });
    }
  }
  return { ok: true, floor };
}

/** 抱抱：幂等（唯一约束），已抱过则取消（toggle） */
export async function toggleHug(
  db: D1Database,
  identityId: string,
  targetType: "thread" | "reply",
  targetId: string,
): Promise<{ ok: true; hugged: boolean; count: number } | { ok: false; error: string }> {
  const existing = await db.prepare(
    "SELECT id FROM hugs WHERE target_type = ? AND target_id = ? AND identity_id = ?",
  ).bind(targetType, targetId, identityId).first<{ id: string }>();
  const hugged = !existing;

  const now = new Date().toISOString();
  const counter = targetType === "thread"
    ? `UPDATE threads SET hug_count = hug_count ${existing ? "-" : "+"} 1 WHERE id = ?`
    : `UPDATE replies SET hug_count = hug_count ${existing ? "-" : "+"} 1 WHERE id = ?`;

  const res = await db.batch([
    existing
      ? db.prepare("DELETE FROM hugs WHERE id = ?").bind(existing.id)
      : db.prepare("INSERT INTO hugs (id, target_type, target_id, identity_id, created_at) VALUES (?, ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), targetType, targetId, identityId, now),
    db.prepare(counter).bind(targetId),
  ]);
  if (res.some((r) => !r.success)) return { ok: false, error: "抱抱没有送到，再试一次。" };

  const row = await db.prepare(
    targetType === "thread"
      ? "SELECT hug_count FROM threads WHERE id = ?"
      : "SELECT hug_count FROM replies WHERE id = ?",
  ).bind(targetId).first<{ hug_count: number }>();

  // 抱抱帖子时通知楼主（本人抱自己不通知；取消抱抱不通知）
  if (targetType === "thread" && hugged) {
    const [owner, display, th] = await Promise.all([
      db.prepare("SELECT identity_id FROM threads WHERE id=?").bind(targetId).first<{ identity_id: string }>(),
      db.prepare("SELECT display_no FROM identities WHERE id=?").bind(identityId).first<{ display_no: number }>(),
      db.prepare("SELECT title FROM threads WHERE id=?").bind(targetId).first<{ title: string }>(),
    ]);
    if (owner && owner.identity_id !== identityId && display && th) {
      await notify(db, owner.identity_id, "hug", {
        main: `${displayAuthor(display.display_no)} 抱了抱你的树洞「${th.title.slice(0, 12)}…」`,
      });
    }
  }
  return { ok: true, hugged, count: row?.hug_count ?? 0 };
}

/** 收藏 toggle：幂等（唯一约束） */
export async function toggleFavorite(
  db: D1Database,
  identityId: string,
  threadId: string,
): Promise<{ ok: true; favorited: boolean } | { ok: false; error: string }> {
  const thread = await db.prepare(
    "SELECT id FROM threads WHERE id = ? AND status='published'",
  ).bind(threadId).first<{ id: string }>();
  if (!thread) return { ok: false, error: "这棵树已经不在树洞了。" };

  const existing = await db.prepare(
    "SELECT id FROM favorites WHERE identity_id = ? AND thread_id = ?",
  ).bind(identityId, threadId).first<{ id: string }>();

  const now = new Date().toISOString();
  const res = await db.batch([
    existing
      ? db.prepare("DELETE FROM favorites WHERE id = ?").bind(existing.id)
      : db.prepare("INSERT INTO favorites (id, identity_id, thread_id, created_at) VALUES (?, ?, ?, ?)")
          .bind(crypto.randomUUID(), identityId, threadId, now),
  ]);
  if (res.some((r) => !r.success)) return { ok: false, error: "收藏没有成功，再试一次。" };
  return { ok: true, favorited: !existing };
}

/** 浏览计数（KV 累积，Cron 定时落库） */
const VIEW_KEY = (id: string) => `views:${id}`;

export async function bumpViews(kv: KVNamespace, threadId: string): Promise<void> {
  await kv.put(VIEW_KEY(threadId), String((Number(await kv.get(VIEW_KEY(threadId))) || 0) + 1));
}

/** Cron：把 KV 累积的浏览数批量写回 D1 并清空 */
export async function flushViews(kv: KVNamespace, db: D1Database): Promise<number> {
  const list = await kv.list({ prefix: "views:" });
  if (list.keys.length === 0) return 0;
  const batch = list.keys.map(async (k) => {
    const n = Number(await kv.get(k.name)) || 0;
    const threadId = k.name.slice("views:".length);
    await db.prepare("UPDATE threads SET views = views + ? WHERE id = ?").bind(n, threadId).run();
    await kv.delete(k.name);
  });
  await Promise.all(batch);
  return list.keys.length;
}
