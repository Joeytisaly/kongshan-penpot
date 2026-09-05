import { afterEach, describe, expect, it, vi } from "vitest";
import { displayAuthor, ageMinutes, formatCount, formatDateTime, formatRelativeTime } from "./format";

afterEach(() => vi.useRealTimers());

describe("formatCount", () => {
  it("小数字千分位", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(999)).toBe("999");
    expect(formatCount(1_000)).toBe("1,000");
    expect(formatCount(9_999)).toBe("9,999");
  });
  it("≥1万 转万（整数不带小数，一位小数去尾 0）", () => {
    expect(formatCount(10_000)).toBe("1万");
    expect(formatCount(12_345)).toBe("1.2万");
    expect(formatCount(15_000)).toBe("1.5万");
    expect(formatCount(100_000)).toBe("10万");
  });
});

describe("formatRelativeTime（UTC 解析）", () => {
  const sqliteNow = (offsetMs: number) =>
    new Date(Date.now() - offsetMs).toISOString().slice(0, 19).replace("T", " ");
  it("刚刚 / 分钟 / 小时 / 天", () => {
    expect(formatRelativeTime(sqliteNow(30_000))).toBe("刚刚");
    expect(formatRelativeTime(sqliteNow(5 * 60_000))).toBe("5 分钟前");
    expect(formatRelativeTime(sqliteNow(2 * 3_600_000))).toBe("2 小时前");
    expect(formatRelativeTime(sqliteNow(3 * 86_400_000))).toBe("3 天前");
  });
  it("≥7 天显示 MM-DD（Asia/Shanghai 渲染，P11-1）", () => {
    const ts = Date.now() - 20 * 86_400_000;
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit" })
        .formatToParts(new Date(ts)).filter((x) => x.type !== "literal").map((x) => [x.type, x.value]),
    );
    const expected = `${Number(parts.month)}-${Number(parts.day)}`;
    expect(formatRelativeTime(new Date(ts).toISOString().slice(0, 19).replace("T", " "))).toBe(expected);
  });
  it("无法解析返回空串", () => {
    expect(formatRelativeTime("garbage")).toBe("");
  });
});

describe("formatDateTime（P11-1：Asia/Shanghai 渲染，机器时区无关）", () => {
  it("上海同日 → 「今天 HH:MM」", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T15:00:00Z")); // 上海 09-05 23:00
    expect(formatDateTime("2026-09-05 14:30:00")).toBe("今天 22:30"); // UTC 14:30 = 上海 22:30
  });
  it("非今天 → 「MM-DD HH:MM」", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T15:00:00Z"));
    expect(formatDateTime("2026-09-04 10:00:00")).toBe("9-04 18:00"); // UTC 10:00 = 上海 18:00
  });
  it("UTC 16:00（上海 0 点）后即属「今天」——UTC 日界 ≠ 上海日界", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T16:30:00Z")); // 上海 09-06 00:30
    expect(formatDateTime("2026-09-05 17:00:00")).toBe("今天 01:00"); // 上海 09-06 01:00
  });
  it("UTC 同日但上海已跨日 → 显示次日日期（旧实现误判「今天」）", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T15:00:00Z")); // 上海 09-05 23:00
    expect(formatDateTime("2026-09-05 17:30:00")).toBe("9-06 01:30"); // 上海 09-06 01:30
  });
  it("无法解析返回空串", () => {
    expect(formatDateTime("garbage")).toBe("");
  });
});

describe("ageMinutes", () => {
  it("SQLite 格式按 UTC 算分钟差", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-05T15:00:00Z"));
    expect(ageMinutes("2026-09-05 14:00:00")).toBeCloseTo(60, 5);
  });
  it("解析失败返回 NaN——保守方向由调用方定", () => {
    expect(ageMinutes("garbage")).toBeNaN();
  });
});

describe("displayAuthor", () => {
  it("display_no=0 为洞务组，其余补零 4 位", () => {
    expect(displayAuthor(0)).toBe("洞务组");
    expect(displayAuthor(42)).toBe("洞友 #0042");
    expect(displayAuthor(9999)).toBe("洞友 #9999");
  });
});
