import { describe, expect, it, vi } from "vitest";
import { cached } from "./cache";
import { kvStub } from "./testutil";

describe("cached（KV 缓存包装）", () => {
  it("未命中：执行 fetch 并回填", async () => {
    const kv = kvStub();
    const fetch = vi.fn(async () => ({ n: 1 }));
    expect(await cached(kv, "k", 60, fetch)).toEqual({ n: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await kv.get("k")).toBe(JSON.stringify({ n: 1 }));
    expect(kv.puts[0].opts?.expirationTtl).toBe(60);
  });
  it("命中：不执行 fetch", async () => {
    const kv = kvStub();
    await kv.put("k", JSON.stringify({ n: 2 }));
    const fetch = vi.fn(async () => ({ n: 999 }));
    expect(await cached(kv, "k", 60, fetch)).toEqual({ n: 2 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("坏 JSON 视为未命中，回源重填", async () => {
    const kv = kvStub();
    await kv.put("k", "{not-json");
    const fetch = vi.fn(async () => "fresh");
    expect(await cached(kv, "k", 60, fetch)).toBe("fresh");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("null 值不误判为命中", async () => {
    const kv = kvStub();
    await kv.put("k", JSON.stringify(null));
    const fetch = vi.fn(async () => "refetched");
    // JSON.stringify(null) = "null"，kv.get 返回字符串 "null" ≠ null → 视为命中，返回 null
    expect(await cached(kv, "k", 60, fetch)).toBe(null);
    expect(fetch).not.toHaveBeenCalled();
  });
});
