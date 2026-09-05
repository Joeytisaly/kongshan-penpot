// 画板 03 热帖 · 盖楼详情（S12：数据来自 D1 查询层）
import type { FC } from "hono/jsx";
import { Layout } from "../components/layout";
import { rules } from "../lib/static";
import type { Floor, Identity } from "../lib/types";
import type { ThreadDetail } from "../db/queries";

const HEART_ICON = `<svg width="15" height="15" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 13.8C4.4 11.4 1.8 9.2 1.8 6.4 1.8 4.3 3.4 2.7 5.4 2.7c1 0 2 .5 2.6 1.3.6-.8 1.6-1.3 2.6-1.3 2 0 3.6 1.6 3.6 3.7 0 2.8-2.6 5-6.2 7.4z" fill="#7A8A80"/></svg>`;
const BUBBLE_ICON = `<svg width="15" height="15" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M3.2 2.6h9.6c.9 0 1.6.7 1.6 1.6v5.6c0 .9-.7 1.6-1.6 1.6H8.4L5 14.4v-3H3.2c-.9 0-1.6-.7-1.6-1.6V4.2c0-.9.7-1.6 1.6-1.6z" fill="#7A8A80"/></svg>`;

export const ThreadPage: FC<{ me: Identity; detail: ThreadDetail; favorited: boolean; error?: string }> = ({ me, detail, favorited, error }) => (
  <Layout title={detail.title} activeNav={detail.boardName} me={me}>
    <p class="crumb">空山 › {detail.boardName} › {detail.title}</p>
    {error && <div class="notice-error">{error}</div>}
    {detail.selfHarm && (
      <div class="notice-warm">
        <span>如果你正在经历特别难的时刻，请记得：心理援助热线 <b>12356</b> 一直在，树洞也一直在。</span>
      </div>
    )}
    <div class="thread-head-area">
      <span class={`tag mood-bg-${detail.floors[0]?.mood ?? "树洞"}`}>{detail.boardName}</span>
      <h1 class="thread-page-title">{detail.title}</h1>
      <p class="thread-meta">
        {detail.meta}
        <form action="/favorite" method="post" class="fav-form">
          <input type="hidden" name="target" value={detail.id} />
          <button type="submit" class="fav-btn">{favorited ? "★ 已收藏" : "☆ 收藏"}</button>
        </form>
      </p>
    </div>

    <div class="thread-grid">
      <div class="thread-main">
        {detail.floors.map((f: Floor) => (
          <section class="card floor" id={`floor-${f.floorNo}`} key={f.id}>
            <div class="floor-author">
              <span class={`floor-avatar mood-bg-${f.mood}`}>{f.authorNo}</span>
              <p class="floor-name">{f.author}</p>
              <p class="floor-level">{f.level}</p>
              {f.isOp && <span class="flag flag-pin">楼主</span>}
            </div>
            <div class="floor-divider" />
            <div class="floor-body">
              <p class="floor-label">{f.floorLabel}</p>
              {f.quote && <div class="quote-block">{f.quote}</div>}
              <p class="floor-text">{f.content}</p>
              <div class="floor-actions">
                <form action="/hug" method="post" class="floor-action-form">
                  <input type="hidden" name="type" value={f.isOp ? "thread" : "reply"} />
                  <input type="hidden" name="target" value={f.id} />
                  <button type="submit" class="floor-action">
                    <span dangerouslySetInnerHTML={{ __html: HEART_ICON }} /> 抱抱 {f.hugCount}
                  </button>
                </form>
                <span class="floor-action">
                  <span dangerouslySetInnerHTML={{ __html: BUBBLE_ICON }} /> 回复
                </span>
                <span class="floor-action link">引用</span>
                <form action="/report" method="post" class="floor-action-form">
                  <input type="hidden" name="type" value={f.isOp ? "thread" : "reply"} />
                  <input type="hidden" name="target" value={f.id} />
                  <button type="submit" class="floor-action">举报</button>
                </form>
                {f.canDelete && (
                  <form action="/delete" method="post" class="floor-action-form">
                    <input type="hidden" name="type" value={f.isOp ? "thread" : "reply"} />
                    <input type="hidden" name="target" value={f.id} />
                    <button type="submit" class="floor-action">删除</button>
                  </form>
                )}
              </div>
            </div>
          </section>
        ))}

        <section class="card reply-card">
          <h2 class="card-title">快速回复</h2>
          <form action={`/t/${detail.id}/reply`} method="post">
            <input type="hidden" name="reply_to" value="" />
            <textarea class="reply-box" name="content" rows={2} placeholder="说点善意的吧，今晚大家都辛苦了…"></textarea>
            <div class="reply-foot">
              <span class="reply-note">回复将以随机身份「洞友 #{me.displayNo}」发出，10 分钟内可删除</span>
              <button type="submit" class="btn reply-btn">匿名回复</button>
            </div>
          </form>
        </section>
      </div>

      <aside class="thread-side">
        <section class="card-flat side-card">
          <h2 class="card-title">参与洞友</h2>
          <div class="part-avatars">
            {detail.participants.map((p) => (
              <span class={`part-avatar mood-bg-${p.mood}`} key={p.no}>{p.no}</span>
            ))}
          </div>
          <p class="side-text">有洞友回应了这棵树</p>
        </section>
        <section class="card-flat side-card">
          <h2 class="card-title">相关树洞</h2>
          {detail.related.map(([t, n]) => (
            <p class="board-hot-row"><span class="board-hot-title">· {t}</span><span class="stat-value-dim">{n}</span></p>
          ))}
        </section>
        <section class="card-flat side-card">
          <h2 class="card-title">树洞守则</h2>
          {rules.map((r) => <p class="rule-item" key={r}>{r}</p>)}
        </section>
      </aside>
    </div>
  </Layout>
);
