import { afterEach, describe, expect, it, vi } from "vitest";
import { ipHmac, ipRateLimit, ipRateRecord, riskCheck, riskRecord } from "./risk";
import { kvStub } from "./testutil";

afterEach(() => vi.useRealTimers());

function advance(seconds: number) {
  const cur = vi.getMockedSystemTime()!.getTime();
  vi.setSystemTime(cur + seconds * 1000);
}

describe("发帖频率：每身份 5 分钟 1 帖", () => {
  it("发帖后立即再查被拦，冷却后放行", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T12:00:00Z"));
    const kv = kvStub();
    await riskRecord(kv, "id-1", "1.1.1.1", "thread");
    const blocked = await riskCheck(kv, {} as D1Database, "id-1", "1.1.1.1", "thread");
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toContain("分钟");
    advance(5 * 60 + 1);
    expect((await riskCheck(kv, {} as D1Database, "id-1", "1.1.1.1", "thread")).ok).toBe(true);
  });
});

describe("回复频率：每身份 1 分钟 3 条", () => {
  it("第 4 条被拦，1 分钟后恢复", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T12:00:00Z"));
    const kv = kvStub();
    for (let i = 0; i < 3; i++) await riskRecord(kv, "id-2", "1.1.1.2", "reply");
    expect((await riskCheck(kv, {} as D1Database, "id-2", "1.1.1.2", "reply")).ok).toBe(false);
    advance(61);
    expect((await riskCheck(kv, {} as D1Database, "id-2", "1.1.1.2", "reply")).ok).toBe(true);
  });
});

describe("IP-HMAC 限流：每小时 10 帖", () => {
  it("10 帖后同 IP 被拦（换身份也逃不掉）", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T12:00:00Z"));
    const kv = kvStub();
    for (let i = 0; i < 10; i++) await riskRecord(kv, `id-ip-${i}`, "2.2.2.2", "thread");
    const blocked = await riskCheck(kv, {} as D1Database, "fresh-id", "2.2.2.2", "thread");
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toContain("设备");
  });
  it("不同 IP 互不影响", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T12:00:00Z"));
    const kv = kvStub();
    for (let i = 0; i < 10; i++) await riskRecord(kv, `id-ip-${i}`, "2.2.2.2", "thread");
    expect((await riskCheck(kv, {} as D1Database, "fresh-id", "3.3.3.3", "thread")).ok).toBe(true);
  });
});

describe("ipHmac（IP 隐私）", () => {
  it("同日同 IP 稳定，不同 IP 不同；换日轮换", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T12:00:00Z"));
    const kv = kvStub();
    const a = await ipHmac(kv, "1.2.3.4");
    expect(await ipHmac(kv, "1.2.3.4")).toBe(a);
    expect(await ipHmac(kv, "1.2.3.5")).not.toBe(a);
    expect(await ipHmac(kv, null)).toBe(await ipHmac(kv, null)); // null IP 也稳定
    vi.setSystemTime(new Date("2026-09-06T12:00:00Z"));
    expect(await ipHmac(kv, "1.2.3.4")).not.toBe(a); // 每日盐轮换
  });
  it("原始 IP 永不落盘（KV 中只有摘要与盐）", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T12:00:00Z"));
    const kv = kvStub();
    await ipHmac(kv, "1.2.3.4");
    const raw = JSON.stringify([...kv.dump.entries()]);
    expect(raw).not.toContain("1.2.3.4");
  });
});

describe("通用 IP 限流（举报/登录）", () => {
  it("limit 次内放行、超限拦截", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T12:00:00Z"));
    const kv = kvStub();
    for (let i = 0; i < 5; i++) {
      expect((await ipRateLimit(kv, "9.9.9.9", "login", 5, 3600)).ok).toBe(true);
      await ipRateRecord(kv, "9.9.9.9", "login", 3600);
    }
    expect((await ipRateLimit(kv, "9.9.9.9", "login", 5, 3600)).ok).toBe(false);
    advance(3601);
    expect((await ipRateLimit(kv, "9.9.9.9", "login", 5, 3600)).ok).toBe(true);
  });
  it("scope 之间互不干扰", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T12:00:00Z"));
    const kv = kvStub();
    await ipRateRecord(kv, "9.9.9.9", "login", 3600);
    expect((await ipRateLimit(kv, "9.9.9.9", "report", 5, 3600)).ok).toBe(true);
  });
});
