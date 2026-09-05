// flushViews 分批语义（P11-3）：免费版 50 子请求预算下的分批 + 上限行为
import { describe, expect, it, vi } from "vitest";
import { flushViews } from "./writes";
import { kvStub } from "../lib/testutil";

/** 最小 D1 stub：prepare/bind 造语句对象，batch 记录批次供断言 */
function dbStub() {
  const batches: Array<Array<{ sql: string; args: unknown[] }>> = [];
  const db = {
    prepare: (sql: string) => ({ bind: (...args: unknown[]) => ({ sql, args }) }),
    batch: vi.fn(async (stmts: Array<{ sql: string; args: unknown[] }>) => {
      batches.push(stmts);
      return stmts.map(() => ({ success: true }));
    }),
  } as unknown as D1Database;
  return { db, batches };
}

describe("flushViews（P11-3）", () => {
  it("把 KV 累积批量写回 D1 并清空对应键", async () => {
    const kv = kvStub();
    await kv.put("views:a", "3");
    await kv.put("views:b", "5");
    const { db, batches } = dbStub();

    const flushed = await flushViews(kv, db);

    expect(flushed).toBe(2);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(2);
    // 语句参数：id 去掉 views: 前缀，数值正确
    expect(batches[0]!.map((s) => s.args)).toEqual([[3, "a"], [5, "b"]]);
    expect(kv.dump.has("views:a")).toBe(false);
    expect(kv.dump.has("views:b")).toBe(false);
  });

  it("超过单批上限（10）分多批", async () => {
    const kv = kvStub();
    for (let i = 0; i < 12; i++) await kv.put(`views:t${i}`, "1");
    const { db, batches } = dbStub();

    expect(await flushViews(kv, db)).toBe(12);
    expect(batches.map((b) => b.length)).toEqual([10, 2]);
  });

  it("超过单次运行上限（20）只处理 20 键，其余留给下个周期", async () => {
    const kv = kvStub();
    for (let i = 0; i < 25; i++) await kv.put(`views:t${i}`, "1");
    const { db, batches } = dbStub();

    expect(await flushViews(kv, db)).toBe(20);
    expect(batches.map((b) => b.length)).toEqual([10, 10]);
    expect([...kv.dump.keys()].filter((k) => k.startsWith("views:"))).toHaveLength(5);
  });

  it("无累积键时返回 0 且不触发 batch", async () => {
    const kv = kvStub();
    const { db, batches } = dbStub();
    expect(await flushViews(kv, db)).toBe(0);
    expect(batches).toHaveLength(0);
  });
});
