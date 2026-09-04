-- 空山 · 0002 收藏表
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES identities(id),
  thread_id TEXT NOT NULL REFERENCES threads(id),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(identity_id, thread_id)
);
CREATE INDEX IF NOT EXISTS idx_fav_owner ON favorites(identity_id, created_at DESC);
