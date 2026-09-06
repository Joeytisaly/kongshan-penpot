// 精华区（P4-4：导航已有入口，落地列表页；数据为洞务加精的 essence=1 帖子）
import type { FC } from "hono/jsx";
import { Layout } from "../components/layout";
import { EmptyState } from "../components/empty";
import type { Identity, Thread } from "../lib/types";

export const EssencePage: FC<{ me: Identity; threads: Thread[]; total: number; unread?: number }> = ({ me, threads, total, unread }) => (
  <Layout title="精华区" activeNav="精华区" me={me} unread={unread}>
    <p class="crumb">空山 › 精华区</p>
    <div class="board-head">
      <div>
        <h1 class="board-title">精华区</h1>
        <p class="board-slogan">被洞务留下的好心事，值得再读一遍。共 {total} 条{total > 50 ? "，仅显示最近 50 条" : ""}。</p>
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
          title="这里还很安静"
          desc="还没有被留下的心事，去版块里逛逛吧。"
          href="/"
          linkText="回首页看看"
        />
      ) : (
        threads.map((th) => (
          <a class="thread-row" href={`/t/${th.id}`}>
            <span class="col-title">
              <span class="flag flag-essence">精</span>
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
    </section>
  </Layout>
);
