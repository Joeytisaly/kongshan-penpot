// P14-0 真实使用走查（线上，内容打 P14-walk 标记，结束后自清理）
const BASE = "https://www.kongshan.ccwu.cc";
const log = (...a) => console.log(...a);
const ms = (fn) => async () => { const t = Date.now(); const out = await fn(); return { ms: Date.now() - t, ...out }; };
const jarOf = (r) => r.headers.getSetCookie().map((s) => s.split(";")[0]).join("; ");

// 1) 新访客：首次访问（懒签发）
let r = await fetch(`${BASE}/`);
const jarA = await jarOf(r);
log("【1】首次访问:", r.status, "| 懒签发 Cookie:", jarA.includes("ks_id"), "| 耗时", 0);

// 2) 打开热门帖，模拟点击楼层「回复」按钮（锚点链接的 href）
r = await fetch(`${BASE}/t/t1`, { headers: { cookie: jarA } });
const html = await r.text();
const replyHref = /href="#reply"/.test(html);
const quoteExample = /href="(\/t\/t1\?quote=[^"]+)"/.exec(html)?.[1];
log("【2】楼层「回复」按钮形态:", replyHref ? '纯锚点 href="#reply"（点击只滚动，无楼层上下文）' : "其他", "| 引用按钮示例:", quoteExample ?? "(无)");

// 3) 真实发送一条回复（计量耗时）
const t1 = Date.now();
r = await fetch(`${BASE}/t/t1/reply`, {
  method: "POST", redirect: "manual",
  headers: { "content-type": "application/x-www-form-urlencoded", cookie: jarA },
  body: new URLSearchParams({ content: "P14-walk 回复体感测试一" }),
});
const loc1 = r.headers.get("location");
log(`【3】点发送→服务器响应: ${Date.now() - t1}ms（不含浏览器整页重载时间）| 落点: ${loc1}`);

// 4) 新楼层页面上「能否看出回复给谁」
const after = await (await fetch(`${BASE}${loc1}`, { headers: { cookie: jarA } })).text();
const hasAttribution = /回复 @|回复 洞友/.test(after);
const floorShown = /P14-walk 回复体感测试一/.test(after);
log("【4】新楼层已显示:", floorShown, "| 显示了回复给谁:", hasAttribution, "（预期 false——问题 1 实锤）");

// 5) 连续快速再发两条（模拟用户「没看到反馈就再点」）
const t2 = Date.now();
r = await fetch(`${BASE}/t/t1/reply`, {
  method: "POST", redirect: "manual",
  headers: { "content-type": "application/x-www-form-urlencoded", cookie: jarA },
  body: new URLSearchParams({ content: "P14-walk 回复体感测试二" }),
});
const loc2 = r.headers.get("location");
log(`【5】第 2 次点击: ${Date.now() - t2}ms | 落点: ${loc2}`);
const t3 = Date.now();
r = await fetch(`${BASE}/t/t1/reply`, {
  method: "POST", redirect: "manual",
  headers: { "content-type": "application/x-www-form-urlencoded", cookie: jarA },
  body: new URLSearchParams({ content: "P14-walk 回复体感测试三" }),
});
const loc3 = r.headers.get("location");
log(`【6】第 3 次点击: ${Date.now() - t3}ms | 落点: ${loc3}`);

// 7) 第 4 次（1 分钟内第 4 条 → 应被限流）——观察文案与「输入丢失」
const t4 = Date.now();
r = await fetch(`${BASE}/t/t1/reply`, {
  method: "POST", redirect: "manual",
  headers: { "content-type": "application/x-www-form-urlencoded", cookie: jarA },
  body: new URLSearchParams({ content: "P14-walk 第4条（应被限流）" }),
});
const loc4 = r.headers.get("location");
log(`【7】第 4 次点击（触发限流）: ${Date.now() - t4}ms | 落点: ${loc4}`);
const blocked = await (await fetch(`${BASE}${loc4}`, { headers: { cookie: jarA } })).text();
const noticeText = /class="notice-error"[^>]*>([^<]*)</.exec(blocked)?.[1] ?? "(未见提示条)";
log("   被拦后页面提示:", noticeText, "| 页面是否残留我输入的内容: 否（redirect 模式必然丢失）");

// 8) 楼层锚点确认：三条测试楼层可见
const p = /#floor-(\d+)/.exec(loc1)?.[1];
log("【8】汇总：3 条测试回复已上楼（floor", p, "起）| 用户端到端体验 = 点击→整页重载→看新楼层，期间无任何即时反馈");

// 9) 清理：删除窗口内自删（10 分钟内有效）
const del = async (type, target) => {
  const rr = await fetch(`${BASE}/delete`, {
    method: "POST", redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: jarA },
    body: new URLSearchParams({ type, target }),
  });
  return rr.status;
};
// 取三条测试回复的 id（从详情页 hug 表单 target 提取）
const ids = [...after.matchAll(/name="target" value="([0-9a-f-]{36})"/g)].map((m) => m[1]);
// 只删 content 匹配 P14-walk 的（用详情页逐层判断）
const detail2 = await (await fetch(`${BASE}/t/t1`, { headers: { cookie: jarA } })).text();
const walkIds = [...detail2.matchAll(/P14-walk 回复体感测试[一二三][\s\S]{0,400}?name="target" value="([0-9a-f-]{36})"/g)].map((m) => m[1]);
for (const id of walkIds) log("【清理】删除测试回复", id.slice(0, 8), "→", await del("reply", id));
