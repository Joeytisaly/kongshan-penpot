// 匿名身份码系统 —— 空山的身份核心
// 安全红线（AGENTS.md §6）：服务端只存 SHA-256(码+pepper)，原始码仅用户可见、丢失不可找回
// 设计详见 docs/ARCHITECTURE.md §2
import { ageMinutes } from "./format";

/** 身份码字符集：Crockford Base32 去混淆字符（去掉 0/O/1/I/L） */
const CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** identities 表行（数据层形态）。
 *  0003 已移除 level / hug_received 死列：等级与「收到的抱抱」一律由真实表实时计算（P7） */
export interface IdentityRow {
  id: string;
  code_hash: string;
  display_no: number;
  post_count: number;
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

/** 身份年龄（分钟）：验证码场景解析失败视为 0（新身份）——宁可让真人多答一道题，不放机器过防线 */
export function identityAgeMinutes(row: Pick<IdentityRow, "created_at">): number {
  const n = ageMinutes(row.created_at);
  return Number.isNaN(n) ? 0 : n;
}

/** DB 行 → 页面展示契约（UI 只依赖 types.ts 的 Identity，数据层形态在此转换） */
export function toDisplay(row: IdentityRow) {
  // created_at 是 SQLite UTC 串：显式按 UTC 解析（与 ageMinutes 同构）。直接
  // new Date("YYYY-MM-DD HH:MM:SS") 按机器时区解析——Workers(UTC) 上侥幸正确，
  // 本机开发/测试（UTC+8）会偏差（P11-1）；解析失败保守按 1 天
  const created = new Date(row.created_at.replace(" ", "T") + "Z").getTime();
  return {
    displayNo: String(row.display_no).padStart(4, "0"),
    joinDays: Number.isNaN(created) ? 1 : Math.max(1, Math.floor((Date.now() - created) / 86_400_000)),
    totalPosts: row.post_count,
  };
}
