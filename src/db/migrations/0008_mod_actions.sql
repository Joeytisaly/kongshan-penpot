-- 空山 · 0008 站务处置日志（P13-2）
-- 背景：处置过的举报从队列消失即无迹可查，共享 MOD_PASS 下连「何时处置了什么」都没有。
-- 纯流水表（无外键），与部署顺序无关（旧代码不写不读，先迁移或先部署均安全）。
CREATE TABLE mod_actions (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,        -- approve|hide|restore|delete|essence|pin|resolve|auto-hide
  target_type TEXT NOT NULL,   -- thread|reply|report
  target_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
