import { describe, expect, it } from "vitest";
import { generateCaptcha, POEM_BANK, verifyCaptcha } from "./captcha";
import { kvStub } from "./testutil";

// 从题面 + 题库解出隐藏答案句：「上句，＿＿」填下句；「＿＿，下句」填上句
function solve(prompt: string): string {
  const [left, right] = prompt.replace(/＿+/g, "_").split("，");
  for (const [u, l] of POEM_BANK) {
    if (left === u && right === "_") return l;
    if (left === "_" && right === l) return u;
  }
  throw new Error("解不出题面: " + prompt);
}

describe("generateCaptcha", () => {
  it("返回 id 与题面，隐藏答案落入 KV", async () => {
    const kv = kvStub();
    const { id, prompt } = await generateCaptcha(kv);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(prompt).toContain("＿＿＿＿");
    const stored = await kv.get(`captcha:${id}`);
    expect(stored).toBe(solve(prompt)); // KV 存的是答案
  });
  it("题库对之间答案互不相同（可区分）", () => {
    const answers = POEM_BANK.flat().map((s) => s);
    expect(new Set(answers).size).toBe(answers.length);
  });
});

describe("verifyCaptcha（一次性销毁）", () => {
  it("对答放行；同 id 二次校验失败（防重放）", async () => {
    const kv = kvStub();
    const { id, prompt } = await generateCaptcha(kv);
    expect(await verifyCaptcha(kv, id, solve(prompt))).toBe(true);
    expect(await verifyCaptcha(kv, id, solve(prompt))).toBe(false);
  });
  it("错答同样销毁", async () => {
    const kv = kvStub();
    const { id, prompt } = await generateCaptcha(kv);
    const wrong = solve(prompt) + "错";
    expect(await verifyCaptcha(kv, id, wrong)).toBe(false);
    expect(await kv.get(`captcha:${id}`)).toBeNull();
  });
  it("答案带标点/空格 normalize 后仍通过", async () => {
    const kv = kvStub();
    const { id, prompt } = await generateCaptcha(kv);
    expect(await verifyCaptcha(kv, id, `${solve(prompt)}。， `)).toBe(true);
  });
  it("空 id 直接拒绝", async () => {
    const kv = kvStub();
    expect(await verifyCaptcha(kv, "", "但闻人语响")).toBe(false);
  });
});
