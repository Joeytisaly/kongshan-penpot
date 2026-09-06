// 展示格式化工具 —— 数据层与 UI 契约之间的桥（页面只消费格式化后的展示值）
// 依赖地图：被 src/db/queries.ts 使用；修改需回归全部页面

/** 展示时区：产品面向中国大陆，D1 存 UTC。Workers 时区恒为 UTC，直接用
 *  getHours()/本地日期比较会让大陆用户看到差 8 小时的时间——一切「今天/日期」
 *  展示统一按 Asia/Shanghai 渲染（P11-1） */
const TZ = "Asia/Shanghai";

/** 毫秒 → 上海时区的日期时间部件（Intl 显式 timeZone，机器时区无关、测试可确定） */
function tzParts(ms: number): { ymd: string; md: string; hm: string } {
  const map: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(ms))) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return {
    ymd: `${map.year}-${map.month}-${map.day}`,
    md: `${Number(map.month)}-${map.day}`,
    hm: `${map.hour}:${map.minute}`,
  };
}

/** 数字展示：>=1万 用 "x.x万"，其余千分位 */
export function formatCount(n: number): string {
  if (n >= 10_000) {
    const w = n / 10_000;
    return (Number.isInteger(w) ? String(w) : w.toFixed(1).replace(/\.0$/, "")) + "万";
  }
  return n.toLocaleString("en-US");
}

/** 展示用时间解析（P17-3）：SQLite 'YYYY-MM-DD HH:MM:SS' 先转 ISO 再按 UTC 解析（Workers
 *  时区恒为 UTC，直接 new Date(带空格串) 会按本机时区）；P4-2 sqliteNow 统一前的存量 ISO 行
 *  由 Date 原生解析兜底（带 Z 即 UTC）——展示从宽，脏行也显示时间而非空白。
 *  ⚠️ 仅限展示。风控必须用下方 ageMinutes 的从严单格式解析（identity 的验证码门依赖
 *  「ISO 脏数据解析失败 → 视为新身份」，P4-1），两个解析器不许合并 */
function toEpochUTC(dt: string): number {
  const t = new Date(dt.replace(" ", "T") + "Z").getTime();
  if (!Number.isNaN(t)) return t;
  return new Date(dt).getTime();
}

/** 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 / MM-DD（D1 存 UTC，按 UTC 解析；
 *  ≥7 天的日期分支按 Asia/Shanghai 渲染——服务器本地时区在 Workers 上是 UTC，P11-1） */
export function formatRelativeTime(dt: string): string {
  const t = toEpochUTC(dt);
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} 天前`;
  return tzParts(t).md;
}

/** 楼层时间：今天 HH:MM / MM-DD HH:MM。
 *  「今天」以上海日界判定（P11-1）：UTC 同日 ≠ 上海同日（北京时间 0–8 点间二者不同） */
export function formatDateTime(dt: string): string {
  const t = toEpochUTC(dt);
  if (Number.isNaN(t)) return "";
  const a = tzParts(t);
  const b = tzParts(Date.now());
  return a.ymd === b.ymd ? `今天 ${a.hm}` : `${a.md} ${a.hm}`;
}

/** 年龄（分钟）：从严单格式解析——只认 SQLite 'YYYY-MM-DD HH:MM:SS'（按 UTC）。
 *  ISO 存量行等脏数据解析失败返回 NaN，调用方保守处理：验证码场景视为新身份触发验证
 *  （P4-1 防线，identity.identityAgeMinutes NaN→0）、删除场景视为超窗拒绝（P4-2）。
 *  ⚠️ 与展示用的 toEpochUTC 有意分离：风控从严、展示从宽，不许合并 */
export function ageMinutes(dt: string): number {
  return (Date.now() - new Date(dt.replace(" ", "T") + "Z").getTime()) / 60_000;
}

/** 作者展示：display_no=0 为洞务组，其余补零成 4 位 */
export function displayAuthor(displayNo: number): string {
  return displayNo === 0 ? "洞务组" : `洞友 #${String(displayNo).padStart(4, "0")}`;
}
