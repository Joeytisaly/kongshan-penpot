-- 空山 · 0007 identities.post_count 死列清理（P11-6）
-- 背景：P7-2 后「累计发言 / 树洞等级」全部改为真实表实时计算，post_count 只剩
--       createThread 在维护、无任何读者——P7 死列（无写路径却被读）的反向形态：只写不读。
-- ⚠️ 上线顺序：先部署代码（createThread 不再 UPDATE post_count），后应用本迁移；
--    旧代码的 UPDATE 在列消失后会失败（同 0003 的顺序纪律）。
ALTER TABLE identities DROP COLUMN post_count;
