-- 空山 · 0004 补齐设计稿版块（P8-4）
-- 背景：static.ts 导航列 9 版块、库内仅 5 版块 → 首页左栏 4 个死链 404。
-- 版块名来自设计画板（static.ts navGroups），描述按 docs/DESIGN.md 语气补写；
-- sort 重排为导航分组顺序（情感区→生活区→趣味区），首页版块列表与左栏导航一致。
-- 已知残留：新版块名/图标字不在书法体 woff2 子集内，按 font stack 回退楷体
--（重新子集化需原始字体文件 + fonttools，见 DESIGN.md S24）
UPDATE boards SET sort = 1 WHERE slug = 'shenye';
UPDATE boards SET sort = 2 WHERE slug = 'qinggan';
UPDATE boards SET sort = 4 WHERE slug = 'zhichang';
UPDATE boards SET sort = 7 WHERE slug = 'jinli';
UPDATE boards SET sort = 8 WHERE slug = 'lingyi';
INSERT INTO boards (id, slug, name, description, mood, icon_char, sort) VALUES
  ('board-fenshou',  'fenshou',  '分手治愈',   '把结束好好安放，才好轻装出发。', '难过', '愈', 3),
  ('board-xiaoyuan', 'xiaoyuan', '校园点滴',   '教室、操场，和没说出口的喜欢。', '开心', '园', 5),
  ('board-zufang',   'zufang',   '租房互助',   '好房子难找，好心人一直都在。',   '焦虑', '屋', 6),
  ('board-gushihui', 'gushihui', '树洞故事会', '把经历写成故事，讲给深夜的你。', '感悟', '话', 9);
