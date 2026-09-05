-- 空山 · P15-1 演示数据退场（一次性脚本）
-- 背景：P1 演示内容（编造故事帖 ×9 + 演示身份 ×10 + 演示楼层）在真实运营期伤害信任，
--       决策退场（修订 P5-1「保留作冷启动氛围」决策，见 PROGRESS P15-1）。
-- 保留：9 版块、洞务组身份 id-mod、新人须知 t0（站务内容）。
-- 范围安全：真实身份主键为 UUID（hex 字符集无 'i'），LIKE 'id-%' 只命中演示身份；
--       幂等：重复执行无副作用（全部条件删除）。
-- 顺序：子表（replies/hugs/notifications/favorites/reports）→ threads → identities。
-- 执行：npx wrangler d1 execute kongshan-db-prod --remote --file=src/db/retire-seed.sql
-- 之后：手动删 KV 缓存键 cache:boards:v2 / cache:hot:v2（SQL 直改不触发代码失效）。

-- 1) 演示帖的楼层
DELETE FROM replies WHERE thread_id IN (
  SELECT id FROM threads WHERE identity_id LIKE 'id-%' AND id <> 't0');

-- 2) 涉及演示身份/演示内容的抱抱（ actor 或目标任一命中）
DELETE FROM hugs WHERE identity_id LIKE 'id-%'
  OR target_id IN (SELECT id FROM threads WHERE identity_id LIKE 'id-%' AND id <> 't0')
  OR target_id IN (SELECT id FROM replies WHERE thread_id IN (
      SELECT id FROM threads WHERE identity_id LIKE 'id-%' AND id <> 't0'));

-- 3) 演示身份收到的通知
DELETE FROM notifications WHERE identity_id LIKE 'id-%';

-- 4) 真实用户收藏演示帖产生的收藏行（防悬挂）
DELETE FROM favorites WHERE thread_id IN (
  SELECT id FROM threads WHERE identity_id LIKE 'id-%' AND id <> 't0');

-- 5) 针对演示内容的举报（防站务队列出现「目标不存在」）
DELETE FROM reports WHERE target_type = 'thread' AND target_id IN (
  SELECT id FROM threads WHERE identity_id LIKE 'id-%' AND id <> 't0');
DELETE FROM reports WHERE target_type = 'reply' AND target_id IN (
  SELECT id FROM replies WHERE thread_id IN (
    SELECT id FROM threads WHERE identity_id LIKE 'id-%' AND id <> 't0'));

-- 6) 演示帖（t1–t9）
DELETE FROM threads WHERE identity_id LIKE 'id-%' AND id <> 't0';

-- 7) 演示身份（保留洞务组 id-mod）
DELETE FROM identities WHERE code_hash LIKE 'seed-%' AND id <> 'id-mod';
