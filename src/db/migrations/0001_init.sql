-- 空山 · 0001 初始表结构（与 docs/ARCHITECTURE.md §4 对应）
-- 偏差记录：boards 增加 icon_char（版块图标单字），ARCHITECTURE.md 已同步

CREATE TABLE boards (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  mood TEXT NOT NULL,
  icon_char TEXT NOT NULL DEFAULT '',
  sort INTEGER DEFAULT 0
);

CREATE TABLE identities (
  id TEXT PRIMARY KEY,
  code_hash TEXT UNIQUE NOT NULL,
  display_no INTEGER NOT NULL,
  level TEXT DEFAULT '一叶',
  post_count INTEGER DEFAULT 0,
  hug_received INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  last_seen_at TEXT
);

CREATE TABLE threads (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id),
  identity_id TEXT NOT NULL REFERENCES identities(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  hug_count INTEGER DEFAULT 0,
  pinned INTEGER DEFAULT 0,
  essence INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  created_at TEXT DEFAULT (datetime('now')),
  last_reply_at TEXT
);
CREATE INDEX idx_threads_board ON threads(board_id, status, pinned DESC, last_reply_at DESC);
CREATE INDEX idx_threads_hot ON threads(status, hug_count DESC);

CREATE TABLE replies (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES threads(id),
  floor INTEGER NOT NULL,
  identity_id TEXT NOT NULL REFERENCES identities(id),
  content TEXT NOT NULL,
  quote TEXT,
  hug_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_replies_thread ON replies(thread_id, floor);

CREATE TABLE hugs (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  identity_id TEXT NOT NULL REFERENCES identities(id),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(target_type, target_id, identity_id)
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL REFERENCES identities(id),
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_notif_owner ON notifications(identity_id, read_at, created_at DESC);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'open',
  created_at TEXT DEFAULT (datetime('now'))
);
