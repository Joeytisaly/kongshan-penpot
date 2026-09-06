-- 一次性数据修复（P17-3）：P4-2 sqliteNow 统一写路径之前的存量行，created_at/last_reply_at
-- 为 ISO 格式（如 '2026-09-05T12:34:56.789Z'），展示层解析失败导致主楼层「发表于」后时间
-- 为空。strftime 能同时解析 ISO 与 SQLite 两种格式，统一改写为 'YYYY-MM-DD HH:MM:SS'（UTC）。
-- 幂等：本格式行不含 'T'，不会被 LIKE '%T%' 再次命中。与部署无顺序依赖（展示层已兼容双格式）。
-- 线上执行：npx wrangler d1 execute kongshan-db-prod --remote --file=src/db/fix-legacy-timestamps.sql

UPDATE threads SET created_at = strftime('%Y-%m-%d %H:%M:%S', created_at) WHERE created_at LIKE '%T%';
UPDATE threads SET last_reply_at = strftime('%Y-%m-%d %H:%M:%S', last_reply_at) WHERE last_reply_at LIKE '%T%';
UPDATE replies SET created_at = strftime('%Y-%m-%d %H:%M:%S', created_at) WHERE created_at LIKE '%T%';
