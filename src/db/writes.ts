// 写路径 —— 发帖 / 回复（楼层自增）/ 抱抱（幂等）/ 通知 / 举报
// 依赖地图：writes.ts ↔ index.tsx（POST 路由）+ 表单页面；改动需跑通三链路实测（AGENTS.md §2）

import { displayAuthor, ageMinutes } from "../lib/format";
import { hugNotifyOnce } from "../lib/risk";

/** 当前 UTC 时间，与 D1 datetime('now') 同构（SQLite 格式）。
 *  必须——seed/DB DEFAULT/ageMinutes/formatRelativeTime 全按此格式解析，
 *  写 ISO 格式会导致新帖时间显示为空、删除窗口判定失效（P4-2 验收发现的存量 bug） */
const sqliteNow = () => new Date().toISOString().slice(0, 19).replace("T", " ");
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
  const now = sqliteNow();
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

  // 楼层号原子生成：INSERT...SELECT 同语句内取 max+1，根治并发重楼（P5-4）；无回复时从 2 楼起（1 楼保留给楼主）
  const id = crypto.randomUUID();
  const now = sqliteNow();

  const res = await db.batch([
    db.prepare(
      `INSERT INTO replies (id, thread_id, floor, identity_id, content, quote, created_at)
       SELECT ?, ?, COALESCE(MAX(floor), 1) + 1, ?, ?, ?, ? FROM replies WHERE thread_id = ?`,
    ).bind(id, threadId, identityId, text, quote ? quote.slice(0, 120) : null, now, threadId),
    db.prepare("UPDATE threads SET reply_count = reply_count + 1, last_reply_at = ? WHERE id = ?").bind(now, threadId),
  ]);
  if (res.some((r) => !r.success)) return { ok: false, error: "回应没有发出去，再试一次。" };
  const floorRow = await db.prepare("SELECT floor FROM replies WHERE id = ?").bind(id).first<{ floor: number }>();
  const floor = floorRow?.floor ?? 2;

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

/** 抱抱：幂等（唯一约束），已抱过则取消（toggle）。
 *  kv 用于通知防骚扰（P10-3）：同一洞友 1 小时内反复抱同一目标只通知一次 */
export async function toggleHug(
  kv: KVNamespace,
  db: D1Database,
  identityId: string,
  targetType: "thread" | "reply",
  targetId: string,
): Promise<{ ok: true; hugged: boolean; count: number } | { ok: false; error: string }> {
  // 目标必须存在且可见（P11-2）：原实现无校验，任意 target 字符串都会插入 hugs 行
  // （灌表向量），计数 UPDATE 对不存在的目标静默空转——对齐 toggleFavorite 的存在性校验
  const target = targetType === "thread"
    ? await db.prepare("SELECT id FROM threads WHERE id = ? AND status='published'").bind(targetId).first<{ id: string }>()
    : await db.prepare("SELECT id FROM replies WHERE id = ? AND status='published'").bind(targetId).first<{ id: string }>();
  if (!target) return { ok: false, error: "这条心事已经不在树洞了。" };

  const existing = await db.prepare(
    "SELECT id FROM hugs WHERE target_type = ? AND target_id = ? AND identity_id = ?",
  ).bind(targetType, targetId, identityId).first<{ id: string }>();
  const hugged = !existing;

  const now = sqliteNow();
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

  // 抱抱产生通知（本人抱自己不通知；取消抱抱不通知）：帖子通知楼主，楼层通知楼层作者（P5-4 补齐）
  // 同一洞友 1 小时内反复抱同一目标只通知一次（P10-3 防骚扰）
  if (hugged && (await hugNotifyOnce(kv, identityId, `${targetType}:${targetId}`))) {
    const display = await db.prepare("SELECT display_no FROM identities WHERE id=?").bind(identityId).first<{ display_no: number }>();
    if (targetType === "thread") {
      const [owner, th] = await Promise.all([
        db.prepare("SELECT identity_id FROM threads WHERE id=?").bind(targetId).first<{ identity_id: string }>(),
        db.prepare("SELECT title FROM threads WHERE id=?").bind(targetId).first<{ title: string }>(),
      ]);
      if (owner && owner.identity_id !== identityId && display && th) {
        await notify(db, owner.identity_id, "hug", {
          main: `${displayAuthor(display.display_no)} 抱了抱你的树洞「${th.title.slice(0, 12)}…」`,
        });
      }
    } else {
      const owner = await db.prepare("SELECT identity_id FROM replies WHERE id=?").bind(targetId).first<{ identity_id: string }>();
      if (owner && owner.identity_id !== identityId && display) {
        await notify(db, owner.identity_id, "hug", {
          main: `${displayAuthor(display.display_no)} 抱了抱你的楼层`,
        });
      }
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

  const now = sqliteNow();
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

/** Cron：把 KV 累积的浏览数批量写回 D1 并清空。
 *  P10-5：kv.list 游标循环——单次 list 上限 1000 键，>1000 时逐页取完 */
export async function flushViews(kv: KVNamespace, db: D1Database): Promise<number> {
  let flushed = 0;
  let cursor: string | undefined = undefined;
  do {
    const list: { keys: Array<{ name: string }>; list_complete: boolean; cursor?: string } =
      await kv.list({ prefix: "views:", cursor });
    await Promise.all(list.keys.map(async (k) => {
      const n = Number(await kv.get(k.name)) || 0;
      const threadId = k.name.slice("views:".length);
      await db.prepare("UPDATE threads SET views = views + ? WHERE id = ?").bind(n, threadId).run();
      await kv.delete(k.name);
    }));
    flushed += list.keys.length;
    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);
  return flushed;
}

/* ========== 身份生命周期（P10-4：懒签发与重置共用同一 INSERT，消灭双份 SQL） ========== */

/** 新身份落库（懒签发 / 重置身份共用） */
export async function insertIdentity(
  db: D1Database,
  i: { id: string; codeHash: string; displayNo: number },
): Promise<void> {
  await db.prepare(
    "INSERT INTO identities (id, code_hash, display_no, created_at, last_seen_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))",
  ).bind(i.id, i.codeHash, i.displayNo).run();
}

/** 重置身份：旧身份码作废（code_hash 改写占位，行保留供楼层归属） */
export async function revokeIdentityCode(db: D1Database, identityId: string): Promise<void> {
  await db.prepare("UPDATE identities SET code_hash = 'revoked:' || id WHERE id = ?").bind(identityId).run();
}

/* ========== 用户自助删除（10 分钟内收回自己的帖子/楼层，兑现发帖页文案承诺） ========== */

const DELETE_WINDOW_MIN = 10;

/** 删自己的帖子：软删 status='deleted'（与站务删除同语义），整楼随之不可见；楼层与回复数据保留 DB 可由洞务恢复 */
export async function deleteOwnThread(
  db: D1Database,
  identityId: string,
  threadId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = await db.prepare(
    "SELECT identity_id, created_at FROM threads WHERE id = ? AND status='published'",
  ).bind(threadId).first<{ identity_id: string; created_at: string }>();
  // 统一拒绝文案：不区分不存在/非本人/超窗，不向探测者暴露存在性
  if (!t || t.identity_id !== identityId || ageMinutes(t.created_at) >= DELETE_WINDOW_MIN) {
    return { ok: false, error: "这个树洞已经收不回来了。" };
  }
  const res = await db.prepare("UPDATE threads SET status='deleted' WHERE id = ?").bind(threadId).run();
  if (!res.success) return { ok: false, error: "没有收回来，再试一次。" };
  return { ok: true };
}

/** 删自己的楼层：软删 + 帖子回复数-1（MAX 防负数）；楼层号不回收（BBS 惯例） */
export async function deleteOwnReply(
  db: D1Database,
  identityId: string,
  replyId: string,
): Promise<{ ok: true; threadId: string } | { ok: false; error: string }> {
  const r = await db.prepare(`
    SELECT r.identity_id, r.created_at, r.thread_id, t.status AS thread_status
    FROM replies r JOIN threads t ON t.id = r.thread_id
    WHERE r.id = ? AND r.status='published'
  `).bind(replyId).first<{ identity_id: string; created_at: string; thread_id: string; thread_status: string }>();
  if (!r || r.identity_id !== identityId
    || ageMinutes(r.created_at) >= DELETE_WINDOW_MIN || r.thread_status !== "published") {
    return { ok: false, error: "这句话已经收不回来了。" };
  }
  const res = await db.batch([
    db.prepare("UPDATE replies SET status='deleted' WHERE id = ?").bind(replyId),
    db.prepare("UPDATE threads SET reply_count = MAX(reply_count - 1, 0) WHERE id = ?").bind(r.thread_id),
  ]);
  if (res.some((x) => !x.success)) return { ok: false, error: "没有收回来，再试一次。" };
  return { ok: true, threadId: r.thread_id };
}
