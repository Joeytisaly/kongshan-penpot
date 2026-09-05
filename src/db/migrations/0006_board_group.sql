-- 空山 · 0006 版块分组单一事实来源（P11-6）
-- 背景：首页左栏分组来自 static.ts navGroups，与 boards 表双源漂移（P8-4 曾三处手工同步）。
--       分组随版块入库（group_name），展示层只从 DB 读；static.ts navGroups 退役。
-- 纯增量 + 回填，与部署顺序无关（旧代码不读 group_name，先迁移或先部署均安全）。
ALTER TABLE boards ADD COLUMN group_name TEXT NOT NULL DEFAULT '';
UPDATE boards SET group_name = '情感区' WHERE slug IN ('shenye', 'qinggan', 'fenshou');
UPDATE boards SET group_name = '生活区' WHERE slug IN ('zhichang', 'xiaoyuan', 'zufang');
UPDATE boards SET group_name = '趣味区' WHERE slug IN ('jinli', 'lingyi', 'gushihui');
