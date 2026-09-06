// 风控规则 —— 冷却 / 频率限制 / IP-HMAC（原始 IP 永不落盘，兑现匿名承诺）
// 依赖地图：被 index.tsx（new/reply 路由）调用；改动需回归发帖/回复三链路 + 验证码联动（AGENTS.md §2）

export type RiskAction = "thread" | "reply";

export interface RiskCheck {
  ok: boolean;
  reason?: string; // 温柔文案
}

const THREAD_INTERVAL = 5 * 60; // 每身份 5 分钟 1 帖
const REPLY_LIMIT = 3; // 每身份 1 分钟 3 回复
const REPLY_WINDOW = 60; // 秒
const IP_THREAD_LIMIT = 10; // 每 IP-HMAC 每小时 10 帖
const IP_REPLY_LIMIT = 30; // 每 IP-HMAC 每小时 30 回复（P12-2：原仅每身份限频，换身份可绕过）

const K_THREAD = (id: string) => `risk:thread:${id}`;
const K_REPLIES = (id: string) => `risk:replies:${id}`;
const K_SALT = (d: string) => `risk:salt:${d}`;

/* ========== 通用 IP-HMAC 限流（举报 / 登录等不依赖身份的场景） ========== */

// P16-4：唯一键构造器前移到键区并统一下文——发帖 IP 限流原走独立的 K_IP(`risk:ip:`)、
// 回复 IP 限流走 K_IP_SCOPE("reply")（`risk:reply:`），同一概念两套前缀且先用后定义。
// 现统一经 K_IP_SCOPE 表达（scope="ip"/"reply"），存量键串不变、KV 无迁移负担
const K_IP_SCOPE = (scope: string, h: string) => `risk:${scope}:${h}`;

/** 每日轮换盐（KV 缓存 24h）：IP 只以 HMAC 形态参与限流，无法反推 */
async function todaySalt(kv: KVNamespace): Promise<string> {
  const day = new Date().toISOString().slice(0, 10);
  const key = K_SALT(day);
  let salt = await kv.get(key);
  if (!salt) {
    salt = crypto.randomUUID();
    await kv.put(key, salt, { expirationTtl: 26 * 60 * 60 });
  }
  return salt;
}

/** IP → HMAC 摘要（24h 有效期） */
export async function ipHmac(kv: KVNamespace, ip: string | null): Promise<string> {
  const salt = await todaySalt(kv);
  const data = new TextEncoder().encode(`${ip ?? "unknown"}:${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

/** 写操作统一风控检查 */
export async function riskCheck(
  kv: KVNamespace,
  db: D1Database,
  identityId: string,
  ip: string | null,
  action: RiskAction,
): Promise<RiskCheck> {
  // 1) 新身份 10 分钟冷却：GET /new 已用验证码兜底（S17），此处不再重复拦截
  // 2) 发帖频率：每身份 5 分钟 1 帖
  if (action === "thread") {
    const last = Number(await kv.get(K_THREAD(identityId))) || 0;
    const elapsed = (Date.now() - last) / 1000;
    if (elapsed < THREAD_INTERVAL) {
      const wait = Math.ceil(THREAD_INTERVAL - elapsed);
      return { ok: false, reason: `树洞也需要慢慢说。${wait > 60 ? `${Math.ceil(wait / 60)} 分钟` : `${wait} 秒`}后再写下一个吧。` };
    }
  }
  // 3) 回复频率：每身份 1 分钟 3 条 + 每 IP-HMAC 30 条/小时（P12-2）
  if (action === "reply") {
    const list = (await kv.get(K_REPLIES(identityId)))?.split(",").map(Number).filter(Boolean) ?? [];
    const cutoff = Date.now() - REPLY_WINDOW * 1000;
    const recent = list.filter((t) => t > cutoff);
    if (recent.length >= REPLY_LIMIT) {
      return { ok: false, reason: "一口气说了好多啦。歇一分钟，再继续说吧。" };
    }
    const iph = await ipHmac(kv, ip);
    if ((Number(await kv.get(K_IP_SCOPE("reply", iph))) || 0) >= IP_REPLY_LIMIT) {
      return { ok: false, reason: "今晚在这台设备上的回应有点多了，歇一歇，树洞明天还在。" };
    }
  }
  // 4) IP-HMAC 限流：每小时 10 帖（键经 K_IP_SCOPE("ip") 构造，串不变：risk:ip:<h>）
  if (action === "thread") {
    const h = await ipHmac(kv, ip);
    const ipCount = Number(await kv.get(K_IP_SCOPE("ip", h))) || 0;
    if (ipCount >= IP_THREAD_LIMIT) {
      return { ok: false, reason: "今天在这台设备上的新洞有点多了，明天再来吧。" };
    }
  }
  return { ok: true };
}

/** 写操作成功后的风控记账 */
export async function riskRecord(kv: KVNamespace, identityId: string, ip: string | null, action: RiskAction): Promise<void> {
  if (action === "thread") {
    await kv.put(K_THREAD(identityId), String(Date.now()), { expirationTtl: THREAD_INTERVAL * 2 });
    const h = await ipHmac(kv, ip);
    const n = (Number(await kv.get(K_IP_SCOPE("ip", h))) || 0) + 1;
    await kv.put(K_IP_SCOPE("ip", h), String(n), { expirationTtl: 3600 });
  } else {
    const list = (await kv.get(K_REPLIES(identityId)))?.split(",").map(Number).filter(Boolean) ?? [];
    list.push(Date.now());
    await kv.put(K_REPLIES(identityId), list.slice(-10).join(","), { expirationTtl: REPLY_WINDOW * 3 });
    // P12-2：IP 维度计数（与发帖同模式，1 小时窗口）
    const iph = await ipHmac(kv, ip);
    const n = (Number(await kv.get(K_IP_SCOPE("reply", iph))) || 0) + 1;
    await kv.put(K_IP_SCOPE("reply", iph), String(n), { expirationTtl: 3600 });
  }
}

/* ========== 每身份动作限流（抱抱/收藏等轻量写，P10-3：脚本可刷写库与通知） ========== */
/** 通用 IP-HMAC 频率检查：windowSec 内最多 limit 次（原始 IP 永不落盘）。
 *  与 riskCheck/riskRecord 相同的 check/record 分离模式，调用方自行决定计数时机。 */
export async function ipRateLimit(
  kv: KVNamespace,
  ip: string | null,
  scope: string,
  limit: number,
  windowSec: number,
): Promise<{ ok: boolean; waitSec: number }> {
  const h = await ipHmac(kv, ip);
  const n = Number(await kv.get(K_IP_SCOPE(scope, h))) || 0;
  return n >= limit ? { ok: false, waitSec: windowSec } : { ok: true, waitSec: 0 };
}

/** 通过 ipRateLimit 后计数 +1（TTL = 窗口时长）；防爆破/防刷按请求数计，不论业务成败 */
export async function ipRateRecord(kv: KVNamespace, ip: string | null, scope: string, windowSec: number): Promise<void> {
  const h = await ipHmac(kv, ip);
  const n = (Number(await kv.get(K_IP_SCOPE(scope, h))) || 0) + 1;
  await kv.put(K_IP_SCOPE(scope, h), String(n), { expirationTtl: windowSec });
}

/* ========== 每身份动作限流（抱抱/收藏等轻量写，P10-3：脚本可刷写库与通知） ========== */

const ACT_LIMIT = 10; // 每身份 1 分钟 10 次动作
const ACT_WINDOW = 60; // 秒
const K_ACTS = (id: string) => `risk:acts:${id}`;

/** 动作频率检查：与回复限流同构（时间戳列表） */
export async function actCheck(kv: KVNamespace, identityId: string): Promise<RiskCheck> {
  const list = (await kv.get(K_ACTS(identityId)))?.split(",").map(Number).filter(Boolean) ?? [];
  const cutoff = Date.now() - ACT_WINDOW * 1000;
  if (list.filter((t) => t > cutoff).length >= ACT_LIMIT) {
    return { ok: false, reason: "动作有点快啦，歇一歇再互动吧。" };
  }
  return { ok: true };
}

/** 动作记账：attempt-based（不论成败都计数），TTL = 3 倍窗口 */
export async function actRecord(kv: KVNamespace, identityId: string): Promise<void> {
  const list = (await kv.get(K_ACTS(identityId)))?.split(",").map(Number).filter(Boolean) ?? [];
  list.push(Date.now());
  await kv.put(K_ACTS(identityId), list.slice(-20).join(","), { expirationTtl: ACT_WINDOW * 3 });
}

/** 抱抱通知防骚扰（P10-3）：同一洞友反复抱/取消同一目标，1 小时内只通知一次。
 *  返回 true 表示本次允许通知并已占用窗口。 */
export async function hugNotifyOnce(kv: KVNamespace, actorId: string, targetId: string): Promise<boolean> {
  const key = `notif:hug:${actorId}:${targetId}`;
  if (await kv.get(key)) return false;
  await kv.put(key, "1", { expirationTtl: 3600 });
  return true;
}

/* ========== 通知收件箱保护（P12-2） ========== */

const NOTIF_CAP = 6; // 每收件人每分钟最多 6 条新通知

/** 通知速率上限：每收件人每分钟 NOTIF_CAP 条，超出返回 false（调用方静默丢弃）。
 *  hugNotifyOnce 管「同一洞友重复动作」的去重，这里管「无限身份涌进来的总量洪峰」——
 *  换身份刷回复可绕过一切按身份的去重，只有按收件人的总量上限能保住收件箱。
 *  真实洞友一分钟收到 6 条以上通知已属重度互动，丢弃可接受 */
export async function notifyRateCap(kv: KVNamespace, recipientId: string): Promise<boolean> {
  const bucket = Math.floor(Date.now() / 60_000);
  const key = `notif:cap:${recipientId}:${bucket}`;
  const n = Number(await kv.get(key)) || 0;
  if (n >= NOTIF_CAP) return false;
  await kv.put(key, String(n + 1), { expirationTtl: 120 });
  return true;
}
