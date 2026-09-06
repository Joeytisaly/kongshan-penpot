// 共享分页（P11-7）：窗口化页码，四处消费——版块页 / 通知页 / 搜索页 / 帖子详情页（P13-3 起，改动需四页回归）
import type { FC } from "hono/jsx";
import { pageWindow } from "../lib/pagination";

export const Pagination: FC<{ page: number; totalPages: number; href: (p: number) => string; info?: string }> = ({
  page, totalPages, href, info,
}) => {
  if (totalPages <= 1) return null;
  return (
    <div class="pagination">
      <a class="page-btn" href={href(Math.max(1, page - 1))}>上一页</a>
      {pageWindow(page, totalPages).map((p, i) =>
        p === "…"
          ? <span class="page-ellipsis" key={`e${i}`}>…</span>
          : <a class={p === page ? "page-btn active" : "page-btn"} href={href(p)} key={p}>{p}</a>,
      )}
      <a class="page-btn" href={href(Math.min(totalPages, page + 1))}>下一页</a>
      {info && <span class="page-info">{info}</span>}
    </div>
  );
};
