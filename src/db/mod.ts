// 站务与举报写路径（P10-4：自 index.tsx 收敛而来，index 只做鉴权与编排）
// 依赖地图：被 index.tsx（/mod/*、/report、/notifications/read）调用；改动需站务六动作 + 举报链路回归
// P13-2：每个处置动作落一条 mod_actions 流水（审计基础，见 ARCHITECTURE §4）
// P14-3：logAction 收口失效首页聚合缓存——所有处置动作都会改变主题/帖子数等聚合
import { formatRelativeTime } from "../lib/format";
import { bustHomeAggregates } from "../lib/cache";

/** 处置流水落库 + 失效首页聚合缓存（P13-2/P14-3：全部站务动作的必经收口点） */
async function logAction(
  kv: KVNamespace,
  db: D1Database,
  action: "approve" | "hide" | "restore" | "delete" | "essence" | "pin" | "resolve" | "auto-hide",
  targetType: "thread" | "reply" | "report",
  targetId: string,
): Promise<void> {
  await db.prepare(
    "INSERT INTO mod_actions (id, action, target_type, target_id) VALUES (?, ?, ?, ?)",
  ).bind(crypto.randomUUID(), action, targetType, targetId).run();
  await bustHomeAggregates(kv);
}

/** 举报落库 → 统计未决数 → 达 3 次自动隐藏目标。返回未决举报数与是否已隐藏。
 *  目标必须存在且 published（P16-1）：原实现无校验，任意 target 字符串都能插 reports
 *  行（灌表向量，与 P11-2 toggleHug 同族漏项）；hidden/pending/deleted 均不可举报 */
export async function insertReport(
  kv: KVNamespace,
  db: D1Database,
  targetType: "thread" | "reply",
  targetId: string,
  reason: string,
): Promise<{ ok: true; openCount: number; hidden: boolean } | { ok: false; error: string }> {
  const target = targetType === "thread"
    ? await db.prepare("SELECT id FROM threads WHERE id = ? AND status='published'").bind(targetId).first<{ id: string }>()
    : await db.prepare("SELECT id FROM replies WHERE id = ? AND status='published'").bind(targetId).first<{ id: string }>();
  if (!target) return { ok: false, error: "这条心事已经不在树洞了。" };
  await db.prepare(
    "INSERT INTO reports (id, target_type, target_id, reason) VALUES (?, ?, ?, ?)",
  ).bind(crypto.randomUUID(), targetType, targetId, reason).run();
  const { results } = await db.prepare(
    "SELECT COUNT(*) AS n FROM reports WHERE target_type=? AND target_id=? AND status='open'",
  ).bind(targetType, targetId).all<{ n: number }>();
  const openCount = results[0]?.n ?? 0;
  if (openCount >= 3) {
    await db.prepare(
      targetType === "thread"
        ? "UPDATE threads SET status='hidden' WHERE id=?"
        : "UPDATE replies SET status='hidden' WHERE id=?",
    ).bind(targetId).run();
    await logAction(kv, db, "auto-hide", targetType, targetId);
  }
  return { ok: true, openCount, hidden: openCount >= 3 };
}

/** 通知全部已读 */
export async function readAllNotifications(db: D1Database, identityId: string): Promise<void> {
  await db.prepare(
    "UPDATE notifications SET read_at = datetime('now') WHERE identity_id = ? AND read_at IS NULL",
  ).bind(identityId).run();
}

/** 待审帖过审 */
export async function approveThread(kv: KVNamespace, db: D1Database, threadId: string): Promise<void> {
  await db.prepare("UPDATE threads SET status='published' WHERE id=? AND status='pending'").bind(threadId).run();
  await logAction(kv, db, "approve", "thread", threadId);
}

/** 处置后自动关闭该目标全部未决举报（隐藏/恢复/删除共用） */
async function resolveReportsFor(db: D1Database, targetType: string, targetId: string): Promise<void> {
  await db.prepare(
    "UPDATE reports SET status='resolved' WHERE target_type=? AND target_id=? AND status='open'",
  ).bind(targetType, targetId).run();
}

/** 隐藏（可逆暂隐）：仅 published 可隐藏 */
export async function hideTarget(kv: KVNamespace, db: D1Database, targetType: "thread" | "reply", id: string): Promise<void> {
  await db.prepare(
    targetType === "reply"
      ? "UPDATE replies SET status='hidden' WHERE id=? AND status='published'"
      : "UPDATE threads SET status='hidden' WHERE id=? AND status='published'",
  ).bind(id).run();
  await resolveReportsFor(db, targetType, id);
  await logAction(kv, db, "hide", targetType, id);
}

/** 恢复：仅 hidden 可逆（deleted 是终态） */
export async function restoreTarget(kv: KVNamespace, db: D1Database, targetType: "thread" | "reply", id: string): Promise<void> {
  await db.prepare(
    targetType === "reply"
      ? "UPDATE replies SET status='published' WHERE id=? AND status='hidden'"
      : "UPDATE threads SET status='published' WHERE id=? AND status='hidden'",
  ).bind(id).run();
  await resolveReportsFor(db, targetType, id);
  await logAction(kv, db, "restore", targetType, id);
}

/** 删除（终态）：楼层删除时回收帖子回复数（防重：仅非 deleted 首次转 deleted 计数 -1，MAX 防负数） */
export async function deleteTarget(kv: KVNamespace, db: D1Database, targetType: "thread" | "reply", id: string): Promise<void> {
  if (targetType === "reply") {
    const row = await db.prepare("SELECT status, thread_id FROM replies WHERE id=?")
      .bind(id).first<{ status: string; thread_id: string }>();
    if (row && row.status !== "deleted") {
      const res = await db.batch([
        db.prepare("UPDATE replies SET status='deleted' WHERE id=?").bind(id),
        db.prepare("UPDATE threads SET reply_count = MAX(reply_count - 1, 0) WHERE id=?").bind(row.thread_id),
      ]);
      if (res.some((r) => !r.success)) return;
    }
  } else {
    await db.prepare("UPDATE threads SET status='deleted' WHERE id=?").bind(id).run();
  }
  await resolveReportsFor(db, targetType, id);
  await logAction(kv, db, "delete", targetType, id);
}

/** 加精 toggle */
export async function toggleEssence(kv: KVNamespace, db: D1Database, threadId: string): Promise<void> {
  await db.prepare("UPDATE threads SET essence = 1 - essence WHERE id=?").bind(threadId).run();
  await logAction(kv, db, "essence", "thread", threadId);
}

/** 置顶 toggle（P9-5） */
export async function togglePin(kv: KVNamespace, db: D1Database, threadId: string): Promise<void> {
  await db.prepare("UPDATE threads SET pinned = 1 - pinned WHERE id=?").bind(threadId).run();
  await logAction(kv, db, "pin", "thread", threadId);
}

/** 单条举报标记已处理 */
export async function resolveReport(kv: KVNamespace, db: D1Database, reportId: string): Promise<void> {
  await db.prepare("UPDATE reports SET status='resolved' WHERE id=?").bind(reportId).run();
  await logAction(kv, db, "resolve", "report", reportId);
}

/** 最近处置流水（P13-2：/mod 页尾展示） */
export async function getRecentModActions(db: D1Database, limit = 20) {
  const { results } = await db.prepare(
    "SELECT action, target_type, target_id, created_at FROM mod_actions ORDER BY created_at DESC, id DESC LIMIT ?",
  ).bind(limit).all<{ action: string; target_type: string; target_id: string; created_at: string }>();
  return results.map((r) => ({
    id: r.target_id + r.created_at, action: r.action,
    targetType: r.target_type, targetId: r.target_id,
    time: formatRelativeTime(r.created_at),
  }));
}
