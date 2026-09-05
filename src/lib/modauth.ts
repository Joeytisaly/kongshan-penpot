// 站务会话（P8-1）——mod_auth cookie 从「值=明文 MOD_PASS」改为无状态签名令牌
// 令牌 = `过期秒.HMAC("mod-session:过期秒", MOD_PASS)`：校验只需重算 HMAC 与 cookie 比对，
// 不落 KV（避开最终一致导致的偶发登录失效），不存任何口令形态。
// 依赖地图：被 index.tsx 站务全部路由使用；改动需回归 /mod 登录与全部处置动作（AGENTS.md §2）

export const MOD_COOKIE = "mod_auth";

const SESSION_TTL_SEC = 60 * 60 * 24; // 与 cookie maxAge 一致：24 小时

const hex = (buf: ArrayBuffer): string =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function hmacSha256Hex(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

/** 恒定时间比较：先各自 SHA-256 定长化，再逐字节异或累计——无提前退出时序侧信道 */
export async function timingSafeEqualStr(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(a)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(b)),
  ]);
  const ua = new Uint8Array(da);
  const ub = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i]! ^ ub[i]!;
  return diff === 0;
}

/** 登录成功后签发会话令牌 */
export async function createModSession(pass: string): Promise<{ token: string; maxAge: number }> {
  const expiry = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const sig = await hmacSha256Hex(`mod-session:${expiry}`, pass);
  return { token: `${expiry}.${sig}`, maxAge: SESSION_TTL_SEC };
}

/** 校验会话 cookie：未过期且签名可由 MOD_PASS 推导（全程不比对明文口令） */
export async function verifyModSession(cookie: string | undefined, pass: string): Promise<boolean> {
  if (!cookie) return false;
  const dot = cookie.indexOf(".");
  if (dot <= 0) return false;
  const expiry = Number(cookie.slice(0, dot));
  if (!Number.isInteger(expiry) || expiry * 1000 < Date.now()) return false;
  const expected = await hmacSha256Hex(`mod-session:${expiry}`, pass);
  return timingSafeEqualStr(cookie.slice(dot + 1), expected);
}
