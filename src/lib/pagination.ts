// 分页页码窗口（P11-7）：纯函数，供 components/pagination.tsx 消费
// 全量渲染页码在几百页时会输出几千个链接——窗口化为「首尾 + 当前页附近」

export type PageItem = number | "…";

/** 页码窗口：1 … p-1 p p+1 … N；总页数 ≤7 时全量展示 */
export function pageWindow(page: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: PageItem[] = [1];
  const lo = Math.max(2, page - 1);
  const hi = Math.min(total - 1, page + 1);
  if (lo > 2) items.push("…");
  for (let p = lo; p <= hi; p++) items.push(p);
  if (hi < total - 1) items.push("…");
  items.push(total);
  return items;
}
