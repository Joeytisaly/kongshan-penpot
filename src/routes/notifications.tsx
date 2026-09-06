// 画板 05 消息通知（S12：数据来自 D1 查询层；P2 完善通知生成）
import type { FC } from "hono/jsx";
import { Layout } from "../components/layout";
import { Pagination } from "../components/pagination";
import { EmptyState } from "../components/empty";
import type { Identity, Notice } from "../lib/types";

const BUBBLE_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M3.2 2.6h9.6c.9 0 1.6.7 1.6 1.6v5.6c0 .9-.7 1.6-1.6 1.6H8.4L5 14.4v-3H3.2c-.9 0-1.6-.7-1.6-1.6V4.2c0-.9.7-1.6 1.6-1.6z" fill="#2F6B4F"/></svg>`;
const HEART_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 13.8C4.4 11.4 1.8 9.2 1.8 6.4 1.8 4.3 3.4 2.7 5.4 2.7c1 0 2 .5 2.6 1.3.6-.8 1.6-1.3 2.6-1.3 2 0 3.6 1.6 3.6 3.7 0 2.8-2.6 5-6.2 7.4z" fill="#C77F35"/></svg>`;
const SHIELD_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.6l5.2 2v4c0 3.3-2.1 5.7-5.2 7.6C4.9 13.3 2.8 10.9 2.8 7.6v-4l5.2-2z" fill="#2F6B4F"/></svg>`;

const KIND_META: Record<Notice["kind"], { icon: string; bg: string }> = {
  reply: { icon: BUBBLE_ICON, bg: "var(--primary-light)" },
  hug: { icon: HEART_ICON, bg: "var(--accent-light)" },
  system: { icon: SHIELD_ICON, bg: "var(--primary-light)" },
};

const TABS: Array<[string, string | null]> = [["全部", null], ["回复我的", "reply"], ["收到的抱抱", "hug"], ["站务通知", "system"]];

export const NotificationsPage: FC<{ me: Identity; notices: Notice[]; activeType?: string | null; page?: number; totalPages?: number; unread?: number }> = ({ me, notices, activeType = null, page = 1, totalPages = 1, unread }) => (
  <Layout title="消息通知" me={me} unread={unread}>
    <p class="crumb">空山 › 消息通知</p>
    <div class="notice-wrap">
      <div class="notice-head">
        <h1 class="notice-title">消息通知</h1>
        {notices.some((n) => n.unread) && (
          <form action="/notifications/read" method="post">
            <button type="submit" class="more-link topbar-btn">全部已读</button>
          </form>
        )}
      </div>
      <div class="notice-tabs">
        {TABS.map(([label, type]) => (
          <a
            class={activeType === type ? "board-chip active" : "board-chip"}
            href={type ? `/notifications?type=${type}` : "/notifications"}
            key={label}
          >{label}</a>
        ))}
      </div>
      {notices.length === 0 ? (
        // P17-2：统一走 EmptyState 组件（原 notice-empty 裸 p 无样式——卡片塌陷成一条细白条，
        // 与搜索/精华/404 的空态风格割裂；P15-1 给首页热帖补空态时的同族漏项）
        <section class="card">
          <EmptyState
            title="这里还很安静"
            desc="还没有消息。去树洞里说说话吧，回应你的人会在这里出现。"
            href="/new"
            linkText="去发一个新洞"
          />
        </section>
      ) : (
        <section class="card notice-list">
          {notices.map((n) => {
            const meta = KIND_META[n.kind];
            const body = (
              <>
                {n.unread && <span class="unread-dot" />}
                <span class="notice-icon" style={`background:${meta.bg}`}>
                  <span dangerouslySetInnerHTML={{ __html: meta.icon }} />
                </span>
                <div class="notice-body">
                  <p class={n.unread ? "notice-main unread" : "notice-main"}>{n.main}</p>
                  <p class="notice-sub">{n.sub}</p>
                </div>
                {n.threadId && <span class="notice-go">查看 ›</span>}
                <span class="notice-time">{n.time}</span>
              </>
            );
            // P13-1：payload 带 threadId 的通知整行可点——POST 标记该条已读并跳回现场；
            // 旧通知（无 threadId）保持纯文本行
            return n.threadId ? (
              <form action="/notifications/open" method="post" key={n.id}>
                <input type="hidden" name="id" value={n.id} />
                <button type="submit" class="notice-row notice-jump">{body}</button>
              </form>
            ) : (
              <div class="notice-row" key={n.id}>{body}</div>
            );
          })}
        </section>
      )}
      <Pagination page={page} totalPages={totalPages} href={(p) => pageHref(activeType, p)}
        info={`共 ${totalPages} 页`} />
    </div>
  </Layout>
);

function pageHref(type: string | null, p: number): string {
  return type ? `/notifications?type=${type}&page=${p}` : `/notifications?page=${p}`;
}
