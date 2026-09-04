// 展示格式化工具 —— 数据层与 UI 契约之间的桥（页面只消费格式化后的展示值）
// 依赖地图：被 src/db/queries.ts 使用；修改需回归全部页面

/** 数字展示：>=1万 用 "x.x万"，其余千分位 */
export function formatCount(n: number): string {
  if (n >= 10_000) {
    const w = n / 10_000;
    return (Number.isInteger(w) ? String(w) : w.toFixed(1).replace(/\.0$/, "")) + "万";
  }
  return n.toLocaleString("en-US");
}

/** 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 / MM-DD（D1 存 UTC，按 UTC 解析） */
export function formatRelativeTime(dt: string): string {
  const t = new Date(dt.replace(" ", "T") + "Z").getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} 天前`;
  const dt2 = new Date(t);
  return `${dt2.getMonth() + 1}-${String(dt2.getDate()).padStart(2, "0")}`;
}

/** 楼层时间：今天 HH:MM / MM-DD HH:MM */
export function formatDateTime(dt: string): string {
  const t = new Date(dt.replace(" ", "T") + "Z");
  if (Number.isNaN(t.getTime())) return "";
  const hm = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
  const now = new Date();
  return t.toDateString() === now.toDateString() ? `今天 ${hm}` : `${t.getMonth() + 1}-${String(t.getDate()).padStart(2, "0")} ${hm}`;
}

/** 作者展示：display_no=0 为洞务组，其余补零成 4 位 */
export function displayAuthor(displayNo: number): string {
  return displayNo === 0 ? "洞务组" : `洞友 #${String(displayNo).padStart(4, "0")}`;
}
