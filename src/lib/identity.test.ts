import { describe, expect, it } from "vitest";
import { ageMinutes } from "./format";
import {
  CODE_RE, createIdentity, displayNoFromCode, generateCode, hashCode, identityAgeMinutes, toDisplay,
} from "./identity";

describe("generateCode", () => {
  it("格式为 KS-XXXX-XXXX-XXXX-XXXX（4 组 16 字符）", () => {
    const code = generateCode();
    expect(code).toMatch(/^KS-([A-Z0-9]{4}-){3}[A-Z0-9]{4}$/);
    expect(code.replace(/KS-|-/g, "")).toHaveLength(16);
  });
  it("字符集不含易混淆的 O/I/L", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateCode()).not.toMatch(/[OIL]/);
    }
  });
  it("随机性：两次生成不相同", () => {
    expect(generateCode()).not.toBe(generateCode());
  });
});

describe("CODE_RE", () => {
  it("接受合法码（含 0/1）", () => {
    expect(CODE_RE.test("KS-ABCD-0123-EFGH-JKMN")).toBe(true);
    expect(CODE_RE.test("KS-99ZZ-11AA-00BB-77CC")).toBe(true);
    expect(CODE_RE.test("KS-1A2B-3C4D-5E6F-7G8H")).toBe(true);
  });
  it("拒绝缺组/多组/小写/易混字符", () => {
    expect(CODE_RE.test("KS-ABCD-0123-EFGH")).toBe(false);
    expect(CODE_RE.test("KS-ABCD-0123-EFGH-JKMN-P")).toBe(false);
    expect(CODE_RE.test("ks-abcd-0123-efgh-jkmn")).toBe(false);
    expect(CODE_RE.test("KS-ABCD-0123-EFGH-OIL1")).toBe(false); // O/I 非法（1 合法）
    expect(CODE_RE.test("KS-ABCD-0I23-EFGH-JKMN")).toBe(false);
    expect(CODE_RE.test("KS-ABCD-0L23-EFGH-JKMN")).toBe(false);
  });
});

describe("hashCode / displayNoFromCode", () => {
  it("哈希确定性：同码同 pepper 结果一致", async () => {
    const a = await hashCode("KS-ABCD-0123-EFGH-JKMN", "pepper-x");
    const b = await hashCode("KS-ABCD-0123-EFGH-JKMN", "pepper-x");
    expect(a).toBe(b);
  });
  it("pepper 或码不同则哈希不同", async () => {
    const base = await hashCode("KS-ABCD-0123-EFGH-JKMN", "p1");
    expect(await hashCode("KS-ABCD-0123-EFGH-JKMN", "p2")).not.toBe(base);
    expect(await hashCode("KS-ABCD-0123-EFGH-JKMO", "p1")).not.toBe(base);
  });
  it("哈希为 64 位十六进制（SHA-256）", async () => {
    expect(await hashCode("x", "y")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("display_no 落在 1000–9999 且与码绑定", async () => {
    const no = await displayNoFromCode("KS-ABCD-0123-EFGH-JKMN");
    expect(no).toBeGreaterThanOrEqual(1000);
    expect(no).toBeLessThanOrEqual(9999);
    expect(await displayNoFromCode("KS-ABCD-0123-EFGH-JKMN")).toBe(no);
  });
});

describe("createIdentity", () => {
  it("一次签发齐备：id/码/哈希/展示号，且码不落哈希", async () => {
    const { id, code, codeHash, displayNo } = await createIdentity("pepper");
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(CODE_RE.test(code)).toBe(true);
    expect(codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(codeHash).not.toContain(code);
    expect(displayNo).toBe(await displayNoFromCode(code));
  });
});

describe("identityAgeMinutes（双格式兼容）", () => {
  it("SQLite datetime 格式按 UTC 解析", () => {
    const now = new Date(Date.now() - 5 * 60_000).toISOString().slice(0, 19).replace("T", " ");
    const age = identityAgeMinutes({ created_at: now });
    expect(age).toBeGreaterThanOrEqual(4.9);
    expect(age).toBeLessThan(6);
  });
  it("ISO 脏数据解析失败 → 视为新身份（从严：宁可多答题不放机器）", () => {
    const now = new Date(Date.now() - 30 * 60_000).toISOString();
    expect(ageMinutes(now)).toBeNaN();
    expect(identityAgeMinutes({ created_at: now })).toBe(0);
  });
  it("解析失败视为 0（新身份）——宁可多答题不放机器", () => {
    expect(identityAgeMinutes({ created_at: "garbage" })).toBe(0);
  });
});

describe("toDisplay", () => {
  it("编号补零 4 位、joinDays 至少 1 天（post_count 已随 0007 移除，P11-6）", () => {
    const created = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 19).replace("T", " ");
    const d = toDisplay({
      id: "x", code_hash: "h", display_no: 42,
      created_at: created, last_seen_at: null,
    });
    expect(d.displayNo).toBe("0042");
    expect(d.joinDays).toBeGreaterThanOrEqual(3);
  });
});
