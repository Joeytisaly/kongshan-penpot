// Cloudflare Workers 环境绑定类型（与 wrangler.jsonc 同步维护 —— 依赖地图）
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  AUTH_PEPPER: string;
  MOD_PASS: string;
}
