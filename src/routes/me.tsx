// 画板 06 我的树洞（S16：等级体系 + 收藏 + 我回应的）
import type { FC } from "hono/jsx";
import { Layout } from "../components/layout";
import type { Identity, MyThread } from "../lib/types";
import type { LevelInfo } from "../lib/level";

const TabPanels: FC<{ myThreads: MyThread[]; myReplies: MyThread[]; myFavorites: MyThread[] }> = ({
  myThreads, myReplies, myFavorites,
}) => (
  <div class="mine-tabs-wrap">
    <input type="radio" name="mtab" id="mtab-pub" class="mtab-radio" checked />
    <label for="mtab-pub" class="mine-tab">我发布的</label>
    <input type="radio" name="mtab" id="mtab-rep" class="mtab-radio" />
    <label for="mtab-rep" class="mine-tab">我回应的</label>
    <input type="radio" name="mtab" id="mtab-fav" class="mtab-radio" />
    <label for="mtab-fav" class="mine-tab">我的收藏</label>

    <section class="mtab-panel" data-for="mtab-pub">
      {myThreads.length === 0 ? (
        <p class="mine-empty">还没有发布过树洞。想说的话，随时可以放进来。</p>
      ) : (
        myThreads.map((t) => (
          <a class="mine-row" href={`/t/${t.id}`} key={t.id}>
            <span class="mine-title">{t.title}</span>
            <span class={`mine-board mood-${t.boardMood}`}>{t.boardName}</span>
            {t.essence && <span class="flag flag-essence">精</span>}
            <span class="mine-rv">{t.repliesViews}</span>
            <span class="mine-time">{t.time}</span>
          </a>
        ))
      )}
    </section>

    <section class="mtab-panel" data-for="mtab-rep">
      {myReplies.length === 0 ? (
        <p class="mine-empty">还没有回应过别人。去树洞里说说话吧。</p>
      ) : (
        myReplies.map((t) => (
          <a class="mine-row" href={`/t/${t.id}${t.floor ? `#floor-${t.floor}` : ""}`} key={`${t.id}-${t.floor}`}>
            <span class="mine-title">{t.title}</span>
            <span class={`mine-board mood-${t.boardMood}`}>{t.boardName}</span>
            <span class="mine-rv">{t.repliesViews}</span>
            <span class="mine-time">{t.time}</span>
          </a>
        ))
      )}
    </section>

    <section class="mtab-panel" data-for="mtab-fav">
      {myFavorites.length === 0 ? (
        <p class="mine-empty">还没有收藏。遇到想一读再读的心事，记得收进来。</p>
      ) : (
        myFavorites.map((t) => (
          <a class="mine-row" href={`/t/${t.id}`} key={t.id}>
            <span class="mine-title">{t.title}</span>
            <span class={`mine-board mood-${t.boardMood}`}>{t.boardName}</span>
            {t.essence && <span class="flag flag-essence">精</span>}
            <span class="mine-rv">{t.repliesViews}</span>
            <span class="mine-time">{t.time}</span>
          </a>
        ))
      )}
    </section>
  </div>
);

export const MePage: FC<{
  me: Identity;
  identityCode?: string;
  myThreads: MyThread[];
  myReplies: MyThread[];
  myFavorites: MyThread[];
  stats: { posts: string; replies: string; hugs: string };
  week: Array<[string, string]>;
  level: LevelInfo;
  unread?: number;
}> = ({ me, identityCode, myThreads, myReplies, myFavorites, stats, week, level, unread }) => (
  <Layout title="我的树洞" me={me} unread={unread}>
    <p class="crumb">空山 › 我的树洞</p>
    <div class="me-grid">
      <div class="me-main">
        <section class="card profile-card">
          <span class="avatar profile-avatar">洞</span>
          <div class="profile-info">
            <p class="profile-name">洞友 #{me.displayNo}</p>
            <p class="profile-sub">匿名身份 · 凭身份码随时找回</p>
          </div>
          <div class="profile-stats">
            <div class="pstat"><p class="pstat-num">{stats.posts}</p><p class="pstat-label">发布</p></div>
            <div class="pstat"><p class="pstat-num">{stats.replies}</p><p class="pstat-label">回应</p></div>
            <div class="pstat"><p class="pstat-num">{stats.hugs}</p><p class="pstat-label">收到的抱抱</p></div>
            <div class="pstat"><p class="pstat-num">{me.joinDays} 天</p><p class="pstat-label">来到树洞</p></div>
          </div>
        </section>

        {identityCode && (
          <section class="card code-card">
            <div>
              <p class="code-hint">这是你的身份码，唯一凭证 —— 请抄写保存</p>
              <p class="code-display">{identityCode}</p>
            </div>
            <form action="/me/reset" method="post">
              <button type="submit" class="btn btn-ghost">重置身份</button>
            </form>
          </section>
        )}

        <section class="card mine-card">
          <TabPanels myThreads={myThreads} myReplies={myReplies} myFavorites={myFavorites} />
        </section>
      </div>

      <aside class="me-side">
        <section class="card-flat side-card">
          <h2 class="card-title">树洞等级</h2>
          <p class="level-name">{level.level}</p>
          <div class="level-track"><div class="level-fill" style={`width:${level.progress}%`} /></div>
          <p class="side-text">
            {level.next ? `再发言 ${level.need} 次升级「${level.next}」` : "已至最高等级，树洞与你常相伴。"}
          </p>
        </section>
        <section class="card-flat side-card">
          <h2 class="card-title">本周数据</h2>
          {week.map(([k, v]) => (
            <p class="stat-row" key={k}><span>{k}</span><span class="stat-value">{v}</span></p>
          ))}
        </section>
      </aside>
    </div>
  </Layout>
);
