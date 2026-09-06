// insertReport 举报落库语义（P16-1）：目标存在性校验（防伪造 target 灌表）+ 计数 + 达 3 自动隐藏回归
import { describe, expect, it } from "vitest";
import { insertReport } from "./mod";
import { kvStub } from "../lib/testutil";

type Row = Record<string, string>;

/** 最小 D1 stub：内存表 + 按 SQL 前缀模拟 insertReport 触及的语句（风格同 writes.test.ts） */
function dbStub(tables: { threads: Row[]; replies: Row[]; reports: Row[]; actions: Row[] }) {
  async function run(sql: string, args: unknown[]) {
    if (sql.startsWith("INSERT INTO reports")) {
      tables.reports.push({ target_type: String(args[1]), target_id: String(args[2]), status: "open" });
    } else if (sql.startsWith("INSERT INTO mod_actions")) {
      tables.actions.push({ action: String(args[1]), target_type: String(args[2]), target_id: String(args[3]) });
    } else if (sql.startsWith("UPDATE threads SET status='hidden'")) {
      const t = tables.threads.find((r) => r.id === args[0]);
      if (t) t.status = "hidden";
    } else if (sql.startsWith("UPDATE replies SET status='hidden'")) {
      const r = tables.replies.find((x) => x.id === args[0]);
      if (r) r.status = "hidden";
    } else {
      throw new Error("stub 未覆盖的语句: " + sql);
    }
    return { success: true };
  }
  return {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        sql,
        args,
        run: () => run(sql, args),
        first: async () => {
          const table = sql.startsWith("SELECT id FROM threads") ? tables.threads : tables.replies;
          return table.find((r) => r.id === args[0] && r.status === "published") ?? null;
        },
        all: async () => ({
          results: [{
            n: tables.reports.filter(
              (r) => r.target_type === args[0] && r.target_id === args[1] && r.status === "open",
            ).length,
          }],
        }),
      }),
    }),
    batch: async (stmts: Array<{ run: () => Promise<{ success: boolean }> }>) => {
      const out: Array<{ success: boolean }> = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
  } as unknown as D1Database;
}

describe("insertReport（P16-1 举报目标校验）", () => {
  it("伪造 target（不存在）被拒且不落库", async () => {
    const tables = { threads: [{ id: "t1", status: "published" }], replies: [], reports: [], actions: [] };
    const r = await insertReport(kvStub(), dbStub(tables), "thread", "ghost-id", "垃圾信息");
    expect(r.ok).toBe(false);
    expect(tables.reports).toHaveLength(0);
    expect(tables.actions).toHaveLength(0);
  });

  it("hidden / pending 目标不可举报（仅 published 可见即可举报）", async () => {
    const tables = {
      threads: [
        { id: "h1", status: "hidden" },
        { id: "p1", status: "pending" },
        { id: "d1", status: "deleted" },
      ],
      replies: [], reports: [], actions: [],
    };
    const db = dbStub(tables);
    expect((await insertReport(kvStub(), db, "thread", "h1", "x")).ok).toBe(false);
    expect((await insertReport(kvStub(), db, "thread", "p1", "x")).ok).toBe(false);
    expect((await insertReport(kvStub(), db, "thread", "d1", "x")).ok).toBe(false);
    expect(tables.reports).toHaveLength(0);
  });

  it("published 帖与楼层正常落库并计数", async () => {
    const tables = {
      threads: [{ id: "t1", status: "published" }],
      replies: [{ id: "r1", status: "published" }],
      reports: [], actions: [],
    };
    const db = dbStub(tables);
    const a = await insertReport(kvStub(), db, "thread", "t1", "x");
    const b = await insertReport(kvStub(), db, "reply", "r1", "y");
    expect(a).toMatchObject({ ok: true, openCount: 1, hidden: false });
    expect(b).toMatchObject({ ok: true, openCount: 1, hidden: false });
    expect(tables.reports).toHaveLength(2);
  });

  it("同目标达 3 次自动隐藏 + auto-hide 流水（既有链路回归保护）", async () => {
    const tables: { threads: Row[]; replies: Row[]; reports: Row[]; actions: Row[] } = {
      threads: [{ id: "t1", status: "published" }],
      replies: [], reports: [], actions: [],
    };
    const db = dbStub(tables);
    const first = await insertReport(kvStub(), db, "thread", "t1", "1");
    const second = await insertReport(kvStub(), db, "thread", "t1", "2");
    expect(first.ok && second.ok ? [first.hidden, second.hidden] : []).toEqual([false, false]);
    const third = await insertReport(kvStub(), db, "thread", "t1", "3");
    expect(third).toMatchObject({ ok: true, openCount: 3, hidden: true });
    expect(tables.threads[0]!.status).toBe("hidden");
    expect(tables.actions.map((a) => a.action)).toEqual(["auto-hide"]);
  });
});
