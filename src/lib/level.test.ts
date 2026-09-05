import { describe, expect, it } from "vitest";
import { levelFromPosts } from "./level";

describe("levelFromPosts 阈值边界", () => {
  const cases: Array<[number, string, string | null, number]> = [
    [0, "一叶", "两叶", 0],      // 刚进洞
    [9, "一叶", "两叶", 90],     // 差 1 次升级
    [10, "两叶", "三叶", 0],     // 刚升两叶
    [29, "两叶", "三叶", 95],    // 19/20
    [30, "三叶", "四叶", 0],
    [59, "三叶", "四叶", 97],
    [60, "四叶", "五叶", 0],
    [99, "四叶", "五叶", 98],    // 39/40 = 97.5% 四舍五入
    [100, "五叶", null, 100],    // 满级
    [500, "五叶", null, 100],    // 超额仍满级
  ];
  for (const [posts, level, next, progress] of cases) {
    it(`${posts} 次发言 → ${level}${next ? `（进度 ${progress}%）` : "（满级）"}`, () => {
      const r = levelFromPosts(posts);
      expect(r.level).toBe(level);
      expect(r.next).toBe(next);
      expect(r.progress).toBe(progress);
    });
  }
  it("满级 need=0", () => {
    expect(levelFromPosts(100).need).toBe(0);
  });
});
