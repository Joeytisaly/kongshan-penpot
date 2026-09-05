import { describe, expect, it } from "vitest";
import { judgeContent } from "./words";

describe("judgeContent 三级判定", () => {
  it("pass：正常内容", () => {
    expect(judgeContent("今晚月色很好，想你")).toBe("pass");
  });
  it("pending：违规词进待审", () => {
    expect(judgeContent("低价代开发票")).toBe("pending");
    expect(judgeContent("加我买毒品")).toBe("pending");
  });
  it("self-harm：自伤词不拦截但标横幅", () => {
    expect(judgeContent("最近觉得活着没有意义")).toBe("self-harm");
    expect(judgeContent("我想离开这个世界")).toBe("self-harm");
  });
  it("block：严重词直接拒绝", () => {
    expect(judgeContent("爆炸物制作教程")).toBe("block");
    expect(judgeContent("儿童色情")).toBe("block");
  });
  it("优先级：block > pending > self-harm > pass", () => {
    expect(judgeContent("色情 加 爆炸物制作")).toBe("block");          // pending+block → block
    expect(judgeContent("想自杀，顺便代开发票")).toBe("pending");      // self-harm+pending → pending
    expect(judgeContent("撑不下去")).toBe("self-harm");
  });
  it("标题+正文拼接判定（写入路径的调用形态）", () => {
    expect(judgeContent("难过" + "撑不下去")).toBe("self-harm");
  });
});
