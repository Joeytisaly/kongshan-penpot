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

const K_THREAD = (id: string) => `risk:thread:${id}`;
const K_REPLIES = (id: string) => `risk:replies:${id}`;
const K_IP = (h: string) => `risk:ip:${h}`;
const K_SALT = (d: string) => `risk:salt:${d}`;

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
  // 3) 回复频率：每身份 1 分钟 3 条
  if (action === "reply") {
    const list = (await kv.get(K_REPLIES(identityId)))?.split(",").map(Number).filter(Boolean) ?? [];
    const cutoff = Date.now() - REPLY_WINDOW * 1000;
    const recent = list.filter((t) => t > cutoff);
    if (recent.length >= REPLY_LIMIT) {
      return { ok: false, reason: "一口气说了好多啦。歇一分钟，再继续说吧。" };
    }
  }
  // 4) IP-HMAC 限流：每小时 10 帖
  if (action === "thread") {
    const h = await ipHmac(kv, ip);
    const ipCount = Number(await kv.get(K_IP(h))) || 0;
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
    const n = (Number(await kv.get(K_IP(h))) || 0) + 1;
    await kv.put(K_IP(h), String(n), { expirationTtl: 3600 });
  } else {
    const list = (await kv.get(K_REPLIES(identityId)))?.split(",").map(Number).filter(Boolean) ?? [];
    list.push(Date.now());
    await kv.put(K_REPLIES(identityId), list.slice(-10).join(","), { expirationTtl: REPLY_WINDOW * 3 });
  }
}
