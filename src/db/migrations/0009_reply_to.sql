-- 空山 · 0009 回复归属（P14-4）
-- 背景：楼层「回复」按钮此前只是滚动到公共回复框（thread.tsx 纯锚点），发出的楼层
--       不携带任何归属——真实用户反馈「回复后不显示回复给谁的」。
--       可空列、向后兼容：先迁移或先部署均安全（旧代码不读写）。
ALTER TABLE replies ADD COLUMN reply_to_floor INTEGER;
ALTER TABLE replies ADD COLUMN reply_to_author TEXT;
