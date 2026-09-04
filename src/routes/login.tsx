// 画板：登录页（凭身份码找回身份；原型未含此页，按 DESIGN.md 语气补充）
import type { FC } from "hono/jsx";
import { Layout } from "../components/layout";
import type { Identity } from "../lib/types";

export const LoginPage: FC<{ me: Identity; error?: string; hint?: string }> = ({ me, error, hint }) => (
  <Layout title="身份码登录" me={me}>
    <p class="crumb">空山 › 身份码登录</p>
    <div class="login-wrap">
      <section class="card compose-card">
        <h1 class="compose-title">找回你的身份</h1>
        <p class="compose-sub">
          换了一台设备，或不小心清了浏览记录？输入身份码，树洞就能认出你。
        </p>

        {error && <p class="login-error">{error}</p>}
        {hint && <p class="login-hint">{hint}</p>}

        <form action="/login" method="post">
          <p class="compose-label">身份码</p>
          <input
            class="compose-input login-input"
            type="text"
            name="code"
            placeholder="KS-XXXX-XXXX-XXXX-XXXX"
            autocomplete="off"
            spellcheck={false}
            maxlength={22}
          />
          <div class="compose-actions">
            <a class="btn btn-ghost" href="/">回首页</a>
            <button type="submit" class="btn">验证身份码</button>
          </div>
        </form>

        <div class="compose-anon login-note">
          <span>身份码是你的唯一凭证，丢失后无法找回（这正是匿名的意义）。请妥善保存。</span>
        </div>
      </section>
    </div>
  </Layout>
);
