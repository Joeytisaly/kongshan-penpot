// 画板 04 发新洞（S13：真实提交到 POST /new；S17：新身份首发触发古诗验证码）
import type { FC } from "hono/jsx";
import { Layout } from "../components/layout";
import type { Board, Identity } from "../lib/types";

const HEART_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 13.8C4.4 11.4 1.8 9.2 1.8 6.4 1.8 4.3 3.4 2.7 5.4 2.7c1 0 2 .5 2.6 1.3.6-.8 1.6-1.3 2.6-1.3 2 0 3.6 1.6 3.6 3.7 0 2.8-2.6 5-6.2 7.4z" fill="#C77F35"/></svg>`;
const SHIELD_ICON = `<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.6l5.2 2v4c0 3.3-2.1 5.7-5.2 7.6C4.9 13.3 2.8 10.9 2.8 7.6v-4l5.2-2z" fill="#2F6B4F"/></svg>`;

export const NewThreadPage: FC<{ me: Identity; boards: Board[]; unread?: number; error?: string; notice?: string; captcha?: { id: string; prompt: string }; selectedBoard?: string; values?: { title?: string; content?: string } }> = ({
  me, boards, unread, error, notice, captcha, selectedBoard, values,
}) => (
  <Layout title="发新洞" me={me} unread={unread}>
    <p class="crumb">空山 › 发新洞</p>
    <div class="compose-wrap">
      <section class="card compose-card">
        <h1 class="compose-title">发一个新洞</h1>
        <p class="compose-sub">此刻匿名，世界不会知道是你。</p>

        {error && <p class="login-error" role="status">{error}</p>}
        {notice && <p class="login-hint" role="status">{notice}</p>}

        <form action="/new" method="post">
          <p class="compose-label">选择版块</p>
          <div class="compose-boards">
            {boards.map((bd) => (
              <label class="board-chip">
                <input type="radio" name="board" value={bd.slug} checked={bd.slug === selectedBoard} style="display:none" />
                {bd.name}
              </label>
            ))}
          </div>

          <label class="compose-label" for="compose-title">标题</label>
          <input class="compose-input" type="text" name="title" id="compose-title" maxlength={40} value={values?.title}
            placeholder="给心事起个标题，20 字以内" />

          <label class="compose-label" for="compose-content">正文</label>
          <div class="compose-textarea">
            <textarea name="content" id="compose-content" maxlength={500} rows={5}
              placeholder="今晚，有什么想说的话？写下来吧，树洞会替你保守秘密。">{values?.content}</textarea>
            <span class="compose-count">最多 500 字</span>
          </div>

          {captcha && (
            <div class="captcha-box">
              <input type="hidden" name="captcha_id" value={captcha.id} />
              <label class="compose-label" for="captcha-answer">先答一道古诗题（验证是真人洞友）</label>
              <p class="captcha-prompt">{captcha.prompt}</p>
              <input class="compose-input captcha-input" type="text" name="captcha_answer" id="captcha-answer"
                placeholder="填写＿＿＿＿处的诗句" maxlength={10} autocomplete="off" />
            </div>
          )}

          <div class="compose-anon">
            <span dangerouslySetInnerHTML={{ __html: SHIELD_ICON }} />
            <span>将以随机身份「洞友 #{me.displayNo}」发出 · 不记录 IP · 10 分钟内可删除</span>
          </div>

          <div class="compose-actions">
            <a class="btn btn-ghost" href="/">取消</a>
            <button type="submit" class="btn">发布到树洞</button>
          </div>
        </form>
      </section>

      <div class="warm-tip">
        <span dangerouslySetInnerHTML={{ __html: HEART_ICON }} />
        <span>如果你正在经历特别难的时刻，请记住：心理援助热线 12356 一直在。树洞陪着你。</span>
      </div>
    </div>
  </Layout>
);
