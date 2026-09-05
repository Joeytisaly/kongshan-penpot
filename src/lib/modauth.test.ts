import { afterEach, describe, expect, it, vi } from "vitest";
import { createModSession, timingSafeEqualStr, verifyModSession } from "./modauth";

afterEach(() => vi.useRealTimers());

describe("timingSafeEqualStr", () => {
  it("相等为真、不等为假、长度不同为假", async () => {
    expect(await timingSafeEqualStr("same", "same")).toBe(true);
    expect(await timingSafeEqualStr("a", "b")).toBe(false);
    expect(await timingSafeEqualStr("short", "longer-string")).toBe(false);
    expect(await timingSafeEqualStr("", "")).toBe(true);
  });
});

describe("mod 签名会话", () => {
  const PASS = "mod-pass-秘密";
  it("签发 → 校验通过；cookie 为 expiry.hex64 令牌而非明文口令", async () => {
    const { token, maxAge } = await createModSession(PASS);
    expect(token).toMatch(/^\d+\.[0-9a-f]{64}$/);
    expect(maxAge).toBe(60 * 60 * 24);
    expect(token).not.toContain(PASS);
    expect(await verifyModSession(token, PASS)).toBe(true);
  });
  it("篡改签名 / 伪造过期时间被拒绝", async () => {
    const { token } = await createModSession(PASS);
    const [expiry, sig] = token.split(".");
    expect(await verifyModSession(`${expiry}.${"0".repeat(64)}`, PASS)).toBe(false);
    expect(await verifyModSession(`${expiry}${sig.slice(-1)}`, PASS)).toBe(false); // 无点
    expect(await verifyModSession(`${expiry}.${sig.slice(0, -1)}0`, PASS)).toBe(false);
  });
  it("过期会话被拒绝（24h TTL）", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T12:00:00Z"));
    const { token } = await createModSession(PASS);
    expect(await verifyModSession(token, PASS)).toBe(true);
    vi.setSystemTime(new Date("2026-09-06T12:00:01Z"));
    expect(await verifyModSession(token, PASS)).toBe(false);
  });
  it("畸形 cookie 一律拒绝", async () => {
    expect(await verifyModSession(undefined, PASS)).toBe(false);
    expect(await verifyModSession("", PASS)).toBe(false);
    expect(await verifyModSession("no-dot", PASS)).toBe(false);
    expect(await verifyModSession("abc.def", PASS)).toBe(false); // 非数字 expiry
    expect(await verifyModSession(".abc", PASS)).toBe(false);
  });
  it("不同口令签发的会话互不通过", async () => {
    const { token } = await createModSession("pass-A");
    expect(await verifyModSession(token, "pass-B")).toBe(false);
  });
});
