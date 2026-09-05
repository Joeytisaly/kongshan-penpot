// 画板 02 版块 · 帖子列表（S12：数据来自 D1 查询层；S22：空列表空状态）
import type { FC } from "hono/jsx";
import { Layout } from "../components/layout";
import { EmptyState } from "../components/empty";
import type { Board, Identity, Thread } from "../lib/types";

export const BoardPage: FC<{
  board: Board;
  me: Identity;
  threads: Thread[];
  boardStats: { topics: string; posts: string; today: string };
  hot: Array<[string, string]>;
  page: number;
  totalPages: number;
  unread?: number;
}> = ({ board, me, threads, boardStats, hot, page, totalPages, unread }) => (
  <Layout title={board.name} activeNav={board.name} me={me} unread={unread}>
    <p class="crumb">空山 › {board.group} › {board.name}</p>
    <div class="board-head">
      <div>
        <h1 class="board-title">{board.name}</h1>
        <p class="board-slogan">{board.description}</p>
      </div>
      <div class="board-head-right">
        <p class="board-head-stats">主题 {boardStats.topics} · 帖子 {boardStats.posts}</p>
        <a class="btn" href={`/new?board=${board.slug}`}>发新洞</a>
      </div>
    </div>

    <div class="board-grid">
      <section class="card thread-table">
        <div class="thread-head">
          <span class="col-title">主题</span>
          <span class="col-author">作者</span>
          <span class="col-rv">回复 / 查看</span>
          <span class="col-last">最后回复</span>
        </div>
        {threads.length === 0 ? (
          <EmptyState title="这里还很安静" desc="还没有人在这里说话，做第一个说话的人吧。" href="/new" linkText="发一个新洞" />
        ) : (
          threads.map((th) => (
          <a class="thread-row" href={`/t/${th.id}`}>
            <span class="col-title">
              {th.pinned && <span class="flag flag-pin">置顶</span>}
              {th.essence && <span class="flag flag-essence">精</span>}
              <span class={th.pinned ? "thread-title pinned" : "thread-title"}>{th.title}</span>
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

      <aside class="board-side">
        <section class="card-flat side-card">
          <h2 class="card-title">版块信息</h2>
          <p class="stat-row"><span>主题</span><span class="stat-value">{boardStats.topics}</span></p>
          <p class="stat-row"><span>帖子</span><span class="stat-value">{boardStats.posts}</span></p>
          <p class="stat-row"><span>今日新洞</span><span class="stat-value">{boardStats.today}</span></p>
          <p class="stat-row"><span>版主</span><span class="stat-value">洞务组</span></p>
        </section>
        <section class="card-flat side-card">
          <h2 class="card-title">本版热帖</h2>
          {hot.map(([t, n]) => (
            <p class="board-hot-row"><span class="board-hot-title">· {t}</span><span class="stat-value-dim">{n}</span></p>
          ))}
        </section>
        <section class="card-flat side-card">
          <h2 class="card-title">今日动态</h2>
          <p class="side-text">今日已有 {boardStats.today} 个新洞被听见。</p>
          <p class="side-text">安静地陪着每一个想说的心事。</p>
        </section>
      </aside>
    </div>

    {totalPages > 1 && (
      <div class="pagination">
        <a class="page-btn" href={`/b/${board.slug}?page=${Math.max(1, page - 1)}`}>上一页</a>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <a class={p === page ? "page-btn active" : "page-btn"} href={`/b/${board.slug}?page=${p}`}>{p}</a>
        ))}
        <a class="page-btn" href={`/b/${board.slug}?page=${Math.min(totalPages, page + 1)}`}>下一页</a>
        <span class="page-info">共 {totalPages} 页 · {boardStats.topics} 个主题</span>
      </div>
    )}
  </Layout>
);
