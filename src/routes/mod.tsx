// 站务页（MOD_PASS 保护）：待审帖过审/删除 + 举报队列处理
import type { FC } from "hono/jsx";
import { Layout } from "../components/layout";
import type { Identity } from "../lib/types";

export interface ModItem {
  id: string; title: string; content: string; boardName: string; author: string; time: string;
}
export interface ReportItem {
  id: string; targetType: string; targetId: string; reason: string; label: string; time: string;
}

export const ModPage: FC<{
  me: Identity;
  authed: boolean;
  pending: ModItem[];
  reports: ReportItem[];
  error?: string;
}> = ({ me, authed, pending, reports, error }) => (
  <Layout title="站务" activeNav="站务" me={me}>
    <p class="crumb">空山 › 站务</p>
    {!authed ? (
      <section class="card compose-card" style="max-width:480px;margin:40px auto">
        <h1 class="compose-title">洞务组入口</h1>
        <p class="compose-sub">此页面仅限洞务组使用。温柔待人，也请温柔待己。</p>
        {error && <p class="login-error">{error}</p>}
        <form action="/mod/login" method="post">
          <p class="compose-label">口令</p>
          <input class="compose-input login-input" type="password" name="pass" placeholder="••••••••" />
          <div class="compose-actions">
            <a class="btn btn-ghost" href="/">回首页</a>
            <button type="submit" class="btn">进入</button>
          </div>
        </form>
      </section>
    ) : (
      <div class="mod-grid">
        <section class="card list-card">
          <header class="list-head">
            <h2 class="card-title">待审心事（{pending.length}）</h2>
          </header>
          {pending.length === 0 ? (
            <p class="mine-empty">队列是空的，一切都好。</p>
          ) : (
            pending.map((p) => (
              <div class="mod-row" key={p.id}>
                <div class="mod-main">
                  <p class="mod-title">{p.title} <span class="mood-感悟">{p.boardName}</span></p>
                  <p class="mod-content">{p.content}</p>
                  <p class="mod-meta">{p.author} · {p.time}</p>
                </div>
                <div class="mod-actions">
                  <form action="/mod/approve" method="post">
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" class="btn reply-btn">过审</button>
                  </form>
                  <form action="/mod/delete" method="post">
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" class="btn btn-ghost reply-btn">删除</button>
                  </form>
                </div>
              </div>
            ))
          )}
        </section>

        <section class="card list-card">
          <header class="list-head">
            <h2 class="card-title">举报队列（{reports.length}）</h2>
          </header>
          {reports.length === 0 ? (
            <p class="mine-empty">没有待处理的举报。</p>
          ) : (
            reports.map((r) => (
              <div class="mod-row" key={r.id}>
                <div class="mod-main">
                  <p class="mod-title">{r.label} <span class="mood-难过">{r.targetType === "thread" ? "帖子" : "楼层"}</span></p>
                  <p class="mod-content">{r.reason || "（未填理由）"}</p>
                  <p class="mod-meta">{r.time}</p>
                </div>
                <form action="/mod/report-done" method="post">
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" class="btn reply-btn">已处理</button>
                </form>
              </div>
            ))
          )}
        </section>
      </div>
    )}
  </Layout>
);
