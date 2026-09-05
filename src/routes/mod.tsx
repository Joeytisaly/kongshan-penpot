// 站务页（MOD_PASS 保护）：待审帖过审/删除 + 举报队列处理
import type { FC } from "hono/jsx";
import { Layout } from "../components/layout";
import type { Identity } from "../lib/types";

export interface ModItem {
  id: string; title: string; content: string; boardName: string; author: string; time: string;
}
export interface ModActionItem {
  id: string; action: string; targetType: string; targetId: string; time: string;
}
export interface ReportItem {
  id: string; targetType: string; targetId: string; reason: string; label: string; time: string;
  status: string; // 目标当前状态 published|hidden|deleted|missing，决定处置按钮组
  content: string; // 被举报内容摘要（楼层举报时洞务需要看到内容才能判断）
  essence?: boolean; // 仅帖子：是否已加精（加精 toggle 按钮依据）
  pinned?: boolean; // 仅帖子：是否已置顶（置顶 toggle 按钮依据，P9-5）
}

const REPORT_STATUS_META: Record<string, { label: string; cls: string }> = {
  published: { label: "展示中", cls: "mood-感悟" },
  hidden: { label: "已隐藏", cls: "mood-难过" },
  deleted: { label: "已删除", cls: "mood-难过" },
  missing: { label: "目标不存在", cls: "mood-难过" },
};

// P13-2：处置流水的动作与目标中文标签
const ACTION_META: Record<string, string> = {
  approve: "过审", hide: "隐藏", restore: "恢复", delete: "删除",
  essence: "加精切换", pin: "置顶切换", resolve: "举报已处理", "auto-hide": "举报达限自动隐藏",
};
const TARGET_META: Record<string, string> = { thread: "帖子", reply: "楼层", report: "举报" };

export const ModPage: FC<{
  me: Identity;
  authed: boolean;
  pending: ModItem[];
  pendingTotal: number;
  reports: ReportItem[];
  reportsTotal: number;
  actions: ModActionItem[];
  unread?: number;
  error?: string;
}> = ({ me, authed, pending, pendingTotal, reports, reportsTotal, actions, unread, error }) => (
  <Layout title="站务" activeNav="站务" me={me} unread={unread}>
    <p class="crumb">空山 › 站务</p>
    {!authed ? (
      <section class="card compose-card" style="max-width:480px;margin:40px auto">
        <h1 class="compose-title">洞务组入口</h1>
        <p class="compose-sub">此页面仅限洞务组使用。温柔待人，也请温柔待己。</p>
        {error && <p class="login-error" role="status">{error}</p>}
        <form action="/mod/login" method="post">
          <label class="compose-label" for="mod-pass">口令</label>
          <input class="compose-input login-input" type="password" name="pass" id="mod-pass" placeholder="••••••••" />
          <div class="compose-actions">
            <a class="btn btn-ghost" href="/">回首页</a>
            <button type="submit" class="btn">进入</button>
          </div>
        </form>
      </section>
    ) : (
      <div>
        {/* P12-1：站务会话退出（此前 24h 内无 UI 登出） */}
        <div class="mod-head">
          <form action="/mod/logout" method="post">
            <button type="submit" class="btn btn-ghost">退出站务</button>
          </form>
        </div>
        <div class="mod-grid">
        <section class="card list-card">
          <header class="list-head">
            <h2 class="card-title">待审心事（{pendingTotal}）</h2>
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
                  {/* P11-7：删除终态，两步式确认（确认页展示内容摘要） */}
                  <a class="btn btn-ghost reply-btn" href={`/mod/delete-confirm?type=thread&id=${p.id}`}>删除</a>
                </div>
              </div>
            ))
          )}
          {pendingTotal > pending.length && (
            <p class="mine-empty">还有 {pendingTotal - pending.length} 条未显示（最多展示 50 条）。</p>
          )}
        </section>

        <section class="card list-card">
          <header class="list-head">
            <h2 class="card-title">举报队列（{reportsTotal}）</h2>
          </header>
          {reports.length === 0 ? (
            <p class="mine-empty">没有待处理的举报。</p>
          ) : (
            reports.map((r) => {
              const meta = REPORT_STATUS_META[r.status] ?? REPORT_STATUS_META.missing;
              return (
                <div class="mod-row" key={r.id}>
                  <div class="mod-main">
                    <p class="mod-title">
                      {r.label}
                      <span class={meta.cls}>{meta.label}</span>
                      <span class="mood-难过">{r.targetType === "thread" ? "帖子" : "楼层"}</span>
                    </p>
                    {r.content && <p class="mod-content">{r.content}</p>}
                    <p class="mod-meta">{r.reason || "（未填理由）"} · {r.time}</p>
                  </div>
                  <div class="mod-actions">
                    {r.status === "published" && (
                      <form action="/mod/hide" method="post">
                        <input type="hidden" name="type" value={r.targetType} />
                        <input type="hidden" name="id" value={r.targetId} />
                        <button type="submit" class="btn btn-ghost reply-btn">隐藏</button>
                      </form>
                    )}
                    {r.status === "hidden" && (
                      <form action="/mod/restore" method="post">
                        <input type="hidden" name="type" value={r.targetType} />
                        <input type="hidden" name="id" value={r.targetId} />
                        <button type="submit" class="btn reply-btn">恢复</button>
                      </form>
                    )}
                    {(r.status === "published" || r.status === "hidden") && (
                      <a class="btn btn-ghost reply-btn" href={`/mod/delete-confirm?type=${r.targetType}&id=${r.targetId}`}>删除</a>
                    )}
                    {r.targetType === "thread" && r.status === "published" && (
                      <form action="/mod/essence" method="post">
                        <input type="hidden" name="id" value={r.targetId} />
                        <button type="submit" class="btn btn-ghost reply-btn">{r.essence ? "取消精" : "加精"}</button>
                      </form>
                    )}
                    {r.targetType === "thread" && r.status === "published" && (
                      <form action="/mod/pin" method="post">
                        <input type="hidden" name="id" value={r.targetId} />
                        <button type="submit" class="btn btn-ghost reply-btn">{r.pinned ? "取消顶" : "置顶"}</button>
                      </form>
                    )}
                    <form action="/mod/report-done" method="post">
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" class="btn btn-ghost reply-btn">已处理</button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
          {reportsTotal > reports.length && (
            <p class="mine-empty">还有 {reportsTotal - reports.length} 条未显示（最多展示 50 条）。</p>
          )}
        </section>
      </div>

      {/* P13-2：处置流水——共享口令下至少有「何时处置了什么」的痕迹 */}
      <section class="card list-card">
        <header class="list-head">
          <h2 class="card-title">处置日志（最近 {actions.length} 条）</h2>
        </header>
        {actions.length === 0 ? (
          <p class="mine-empty">还没有处置记录。</p>
        ) : (
          actions.map((a) => (
            <div class="mod-row" key={a.id}>
              <div class="mod-main">
                <p class="mod-title">{ACTION_META[a.action] ?? a.action} <span class="mood-难过">{TARGET_META[a.targetType] ?? a.targetType}</span></p>
                <p class="mod-meta">{a.targetId.slice(0, 8)}… · {a.time}</p>
              </div>
            </div>
          ))
        )}
      </section>
      </div>
    )}
  </Layout>
);
