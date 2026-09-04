// 统一空状态组件（S22）：温柔文案 + 回首页链接，覆盖 404/空列表/错误
import type { FC } from "hono/jsx";

export const EmptyState: FC<{ title?: string; desc?: string; href?: string; linkText?: string }> = ({
  title = "这里还很安静",
  desc = "暂时还没有内容，做第一个说话的人吧。",
  href = "/",
  linkText = "回首页看看",
}) => (
  <div class="empty-state">
    <div class="empty-mark" aria-hidden="true">🌳</div>
    <h2 class="empty-title">{title}</h2>
    <p class="empty-desc">{desc}</p>
    <a class="btn" href={href}>{linkText}</a>
  </div>
);
