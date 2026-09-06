// parseNoticePayload（P16-3）：通知 payload 解析兜底——坏 JSON / 缺 main 降级纯文本行，不炸整页
import { describe, expect, it } from "vitest";
import { parseNoticePayload } from "./queries";

describe("parseNoticePayload（P16-3）", () => {
  it("正常 payload 原样解析（含可选字段）", () => {
    const p = parseNoticePayload(JSON.stringify({ main: "洞友 #0001 回复了你的树洞", sub: "辛苦了", threadId: "t1", floor: 2 }));
    expect(p).toEqual({ main: "洞友 #0001 回复了你的树洞", sub: "辛苦了", threadId: "t1", floor: 2 });
  });

  it("坏 JSON 不抛异常，降级纯文本行", () => {
    expect(parseNoticePayload("{oops").main).toBe("（一条消息，内容已无法显示）");
    expect(parseNoticePayload("").threadId).toBeUndefined();
  });

  it("缺 main / main 非字符串同样降级，threadId 等其余字段保留", () => {
    const missing = parseNoticePayload(JSON.stringify({ sub: "x", threadId: "t2" }));
    expect(missing.main).toBe("（一条消息，内容已无法显示）");
    expect(missing.threadId).toBe("t2");
    const badType = parseNoticePayload(JSON.stringify({ main: 42 }));
    expect(badType.main).toBe("（一条消息，内容已无法显示）");
  });
});
