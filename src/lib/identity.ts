// 匿名身份码系统 —— 空山的身份核心
// 安全红线（AGENTS.md §6）：服务端只存 SHA-256(码+pepper)，原始码仅用户可见、丢失不可找回
// 设计详见 docs/ARCHITECTURE.md §2

/** 身份码字符集：Crockford Base32 去混淆字符（去掉 0/O/1/I/L） */
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** identities 表行（数据层形态） */
export interface IdentityRow {
  id: string;
  code_hash: string;
  display_no: number;
  level: string;
  post_count: number;
  hug_received: number;
  created_at: string;
  last_seen_at: string | null;
}

/** 生成身份码：KS-XXXX-XXXX-XXXX（16 字符 = 80 位熵，4 组可朗读分组） */
export function generateCode(): string {
  const bytes = new Uint8Array(10); // 80 位
  crypto.getRandomValues(bytes);
  let s = "";
  let acc = 0;
  let bits = 0;
  for (const b of bytes) {
    acc = (acc << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      s += CODE_ALPHABET[(acc >> bits) & 31];
    }
  }
  return `KS-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}`;
}

/** 身份码哈希：SHA-256(码:pepper)，服务端唯一存储形态 */
export async function hashCode(code: string, pepper: string): Promise<string> {
  const data = new TextEncoder().encode(`${code}:${pepper}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 展示编号：由码本身的哈希推导（与 pepper 无关，pepper 轮换不影响编号）→ 洞友 #1000~#9999 */
export async function displayNoFromCode(code: string): Promise<number> {
  const data = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return (parseInt(hex.slice(0, 8), 16) % 9000) + 1000;
}

/** 新建身份：返回待落库字段 */
export async function createIdentity(pepper: string): Promise<{ id: string; code: string; codeHash: string; displayNo: number }> {
  const code = generateCode();
  const [codeHash, displayNo] = await Promise.all([hashCode(code, pepper), displayNoFromCode(code)]);
  return { id: crypto.randomUUID(), code, codeHash, displayNo };
}

/** 身份码格式校验（大写化后校验，Crockford 字符集）：KS-XXXX-XXXX-XXXX-XXXX（4 组） */
export const CODE_RE = /^KS-[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/;

/** 身份码明文 Cookie（HttpOnly，仅服务端可读，供 /me 页展示给用户抄写保存） */
export const CODE_COOKIE = "ks_code";

/** DB 行 → 页面展示契约（UI 只依赖 types.ts 的 Identity，数据层形态在此转换） */
export function toDisplay(row: IdentityRow) {
  return {
    displayNo: String(row.display_no).padStart(4, "0"),
    level: row.level,
    joinDays: Math.max(1, Math.floor((Date.now() - new Date(row.created_at).getTime()) / 86_400_000)),
    todayPosts: row.post_count,
  };
}
