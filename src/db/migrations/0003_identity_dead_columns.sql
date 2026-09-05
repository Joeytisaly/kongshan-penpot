-- 空山 · 0003 身份表死列清理（P7-3）
-- 背景：hug_received 从未被写路径维护（P7-1 起「收到的抱抱」改为 hugs 表实时 COUNT）；
--       level 签发后从不更新（P7-2 起楼层等级改为发言数实时计算，阈值唯一事实来源 lib/level.ts）。
--       无写路径的冗余列 = 永远读不对的数字（P7 两个 bug 的共同根因），故移除。
-- ⚠️ 上线顺序：先部署代码（新代码兼容新旧两种 schema），再应用本迁移；
--    旧代码的懒签发 INSERT 带列名，列消失后会失败。
ALTER TABLE identities DROP COLUMN level;
ALTER TABLE identities DROP COLUMN hug_received;
