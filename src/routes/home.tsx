// 画板 01 首页 · 版块广场（S12：数据源从 mock 切换到 D1 查询层）
import type { FC } from "hono/jsx";
import { Layout } from "../components/layout";
import { navGroups, services } from "../lib/static";
import type { Board, HotItem, Identity } from "../lib/types";
import type { LevelInfo } from "../lib/level";

const HEART_ICON = `<svg width="12" height="12" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 13.8C4.4 11.4 1.8 9.2 1.8 6.4 1.8 4.3 3.4 2.7 5.4 2.7c1 0 2 .5 2.6 1.3.6-.8 1.6-1.3 2.6-1.3 2 0 3.6 1.6 3.6 3.7 0 2.8-2.6 5-6.2 7.4z" fill="#E8A15C"/></svg>`;
const SHIELD_ICON = `<svg width="18" height="18" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.6l5.2 2v4c0 3.3-2.1 5.7-5.2 7.6C4.9 13.3 2.8 10.9 2.8 7.6v-4l5.2-2z" fill="#2F6B4F"/></svg>`;

export const HomePage: FC<{ me: Identity; boards: Board[]; hots: HotItem[]; stats: Array<[string, string]>; tracks: Array<[string, string]>; level: LevelInfo; unread?: number }> = ({
  me, boards, hots, stats, tracks, level, unread,
}) => (
  <Layout title="首页" activeNav="全部版块" me={me} unread={unread}>
    <p class="crumb">空山 › 版块广场</p>
    <div class="home-grid">
      {/* 左栏 */}
      <aside class="home-left">
        <section class="card-flat side-card">
          <h2 class="card-title">版块导航</h2>
          {navGroups.map((g) => (
            <div class="nav-group">
              <p class="nav-group-name">{g.name}</p>
              {g.items.map((it) => (
                <a class={it.active ? "nav-item active" : "nav-item"} href={`/b/${it.slug}`}>
                  · {it.name}
                </a>
              ))}
            </div>
          ))}
        </section>
        <section class="card-flat side-card">
          <h2 class="card-title">我的足迹</h2>
          {tracks.map(([k, v]) => (
            <p class="stat-row"><span>{k}</span><span class="stat-value-dim">{v}</span></p>
          ))}
        </section>
      </aside>

      {/* 中栏 */}
      <div class="home-center">
        <div class="notice-bar">
          <span class="notice-tag">公告</span>
          <span>欢迎来到空山 —— 每一层楼，都住着一个不敢署名的心事。</span>
        </div>

        <section class="card list-card">
          <header class="list-head">
            <h2 class="card-title">版块广场</h2>
            <a class="more-link" href="/">全部版块 ›</a>
          </header>
          {boards.map((bd) => (
            <a class="board-row" href={`/b/${bd.slug}`}>
              <span class={`board-icon mood-bg-${bd.mood}`}>{bd.iconChar}</span>
              <span class="board-main">
                <span class="board-name">{bd.name}</span>
                <span class="board-desc">{bd.description}</span>
              </span>
              <span class="board-nums">主题 {bd.topicCount} · 帖子 {bd.postCount}</span>
              <span class="board-last">
                <span class="board-last-user">{bd.lastReplyUser}</span>
                <span class="board-last-time">{bd.lastReplyTime}</span>
              </span>
            </a>
          ))}
        </section>

        <section class="card list-card">
          <header class="list-head">
            <h2 class="card-title">今日热帖</h2>
            <a class="more-link" href="/essence">更多 ›</a>
          </header>
          {hots.map((t, i) => (
            <a class="hot-row" href={`/t/${t.id}`}>
              <span class={i < 3 ? "hot-rank top" : "hot-rank"}>{i + 1}</span>
              <span class="hot-title">{t.title}</span>
              <span class={`hot-board mood-${t.boardMood}`}>{t.boardName}</span>
              <span class="hot-count">
                <span dangerouslySetInnerHTML={{ __html: HEART_ICON }} /> {t.replies} 回复
              </span>
            </a>
          ))}
        </section>
      </div>

      {/* 右栏 */}
      <aside class="home-right">
        <section class="identity-card">
          <div class="identity-top">
            <span class="avatar identity-avatar">洞</span>
            <div>
              <p class="identity-name">洞友 #{me.displayNo}</p>
              <p class="identity-sub">匿名身份 · 凭身份码随时找回</p>
            </div>
          </div>
          <div class="identity-divider" />
          <p class="identity-line">累计发言 {me.totalPosts} 次 · 等级「{level.level}」</p>
          <p class="identity-line dim">{level.next ? `再发言 ${level.need} 次升级「${level.next}」` : "已是最高等级，树洞与你常相伴。"}</p>
        </section>

        <section class="card-flat side-card">
          <h2 class="card-title">社区数据</h2>
          {stats.map(([k, v]) => (
            <p class="stat-row"><span>{k}</span><span class="stat-value">{v}</span></p>
          ))}
        </section>

        <section class="card-flat side-card">
          <p class="promise-head">
            <span dangerouslySetInnerHTML={{ __html: SHIELD_ICON }} />
            <span class="card-title">匿名承诺</span>
          </p>
          <p class="side-text">本站不记录 IP、不收集任何身份信息。请温柔待人，禁止发布违法内容。</p>
        </section>

        <section class="card-flat side-card">
          <h2 class="card-title">洞友服务</h2>
          {services.map((s) => (
            <p class="service-item">› {s}</p>
          ))}
        </section>
      </aside>
    </div>
  </Layout>
);
