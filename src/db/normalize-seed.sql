-- 空山 · P5-1 种子数据自洽化（一次性数据修正脚本）
-- 目的：演示帖（seed 身份 id-xxx 发布）的计数改为真实驱动，消除「回复 128 点进去只有 2 层楼」的穿帮
-- 原则：可验证的数字（楼层数、抱抱数）必须与真实表一致；不可验证的浏览数给小基数；
--       真实身份（UUID 主键，不含 'id-' 前缀——hex 字符集无 'i'）的内容不受影响
-- 执行：npx wrangler d1 execute kongshan-db-prod --local  /  --remote

-- 演示帖：楼层数与抱抱数由真实表驱动，浏览数归为小基数（120-799，确定性区间）
UPDATE threads SET
  reply_count = (SELECT COUNT(*) FROM replies r WHERE r.thread_id = threads.id AND r.status = 'published'),
  hug_count   = (SELECT COUNT(*) FROM hugs h WHERE h.target_type = 'thread' AND h.target_id = threads.id),
  views       = 120 + (ABS(RANDOM()) % 680)
WHERE identity_id LIKE 'id-%';

-- 演示身份的注水统计清零（真实身份的计数由代码路径 createThread/toggleHug 维护，不受影响；
-- hug_received 列已随 0003 移除——收到的抱抱改为实时统计，见 P7-1）
UPDATE identities SET post_count = 0 WHERE code_hash LIKE 'seed-%';
