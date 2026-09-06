// 搜索结果页（P4-4：顶栏搜索框落地；设计稿外补充页，语气按 docs/DESIGN.md）
import type { FC } from "hono/jsx";
import { Layout } from "../components/layout";
import { EmptyState } from "../components/empty";
import { Pagination } from "../components/pagination";
import type { Identity, Thread } from "../lib/types";

export const SearchPage: FC<{ me: Identity; q: string; threads: Thread[]; page?: number; totalPages?: number; total?: number; unread?: number }> = ({ me, q, threads, page = 1, totalPages = 1, total = 0, unread }) => (
  <Layout title={q ? `搜索：${q}` : "搜索"} me={me} unread={unread}>
    <p class="crumb">空山 › 搜索</p>
    <div class="board-head">
      <div>
        <h1 class="board-title">搜索</h1>
        <p class="board-slogan">{q ? `「${q}」的搜索结果（共 ${total} 条）` : "输入关键词，找找树洞里的心事。"}</p>
      </div>
    </div>
    <section class="card thread-table">
      {/* P17-5：空结果时表头无意义，随之隐藏（同页 EmptyState 承担视觉） */}
      {threads.length > 0 && (
        <div class="thread-head">
          <span class="col-title">主题</span>
          <span class="col-author">作者</span>
          <span class="col-rv">回复 / 查看</span>
          <span class="col-last">最后回复</span>
        </div>
      )}
      {threads.length === 0 ? (
        <EmptyState
          title="没有找到相关的心事"
          desc={q ? "换个关键词试试，或者去版块里逛逛。" : "在上方搜索框输入关键词开始搜索。"}
          href="/"
          linkText="回首页看看"
        />
      ) : (
        threads.map((th) => (
          <a class="thread-row" href={`/t/${th.id}`} key={th.id}>
            <span class="col-title">
              {th.essence && <span class="flag flag-essence">精</span>}
              <span class="thread-title">{th.title}</span>
            </span>
            <span class="col-author">{th.author}</span>
            <span class="col-rv">{th.replyCount} / {th.viewCount}</span>
            <span class="col-last">
              <span class="last-user">{th.lastReplyUser}</span>
              <span class="last-time">{th.lastReplyTime}</span>
            </span>
          </a>
        ))
      )}
      <Pagination page={page} totalPages={totalPages} href={(p) => `/search?q=${encodeURIComponent(q)}&page=${p}`}
        info={`共 ${totalPages} 页`} />
    </section>
  </Layout>
);
