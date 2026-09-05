import { describe, expect, it } from "vitest";
import { pageWindow } from "./pagination";

describe("pageWindow（P11-7）", () => {
  it("总页数 ≤7 全量展示", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it("中间页：首尾 + 当前页 ±1 + 省略号", () => {
    expect(pageWindow(5, 12)).toEqual([1, "…", 4, 5, 6, "…", 12]);
  });
  it("靠首页：前端无省略号", () => {
    expect(pageWindow(1, 12)).toEqual([1, 2, "…", 12]);
    expect(pageWindow(2, 12)).toEqual([1, 2, 3, "…", 12]);
  });
  it("靠尾页：尾端无省略号", () => {
    expect(pageWindow(12, 12)).toEqual([1, "…", 11, 12]);
    expect(pageWindow(11, 12)).toEqual([1, "…", 10, 11, 12]);
  });
  it("边界：恰好 8 页（窗口模式最小值）", () => {
    expect(pageWindow(4, 8)).toEqual([1, "…", 3, 4, 5, "…", 8]);
  });
});
