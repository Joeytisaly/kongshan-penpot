-- 空山 · 种子数据（P15-1 瘦身版：仅版块 + 洞务组身份 + 新人须知站务帖）
-- 历史说明：P1 曾埋 9 条演示帖 + 10 个演示身份作冷启动氛围，P5-1 修过「计数穿帮」但保留内容；
-- 真实运营期零互动的编造内容伤害信任，P15-1 决策退场——fresh 库由本文件天然干净，
-- 存量库由 retire-seed.sql 一次性清理（决策变更原因见 PROGRESS P15-1）。

-- 版块（sort 与 0004 分组顺序一致；其余 4 版块由 0004 迁移插入——fresh 库「先迁移后种子」
-- 与线上「存量库跑迁移」两条路径得到相同的 9 版块与排序。
-- group_name 随 0006 入库（P11-6 分组单一事实来源）：fresh 路径种子行自带分组，
-- 0004 插入的 4 版块由 0006 的 UPDATE 回填）
INSERT INTO boards (id, slug, name, description, mood, icon_char, sort, group_name) VALUES
  ('board-shenye',  'shenye',  '深夜树洞', '凌晨两点之后，心事不打烊。',       '树洞', '夜', 1, '情感区'),
  ('board-qinggan', 'qinggan', '情感树洞', '暗恋、异地、告别，都放在这里。',   '难过', '情', 2, '情感区'),
  ('board-zhichang','zhichang','职场吐槽', '老板看不见的委屈，这里都看得见。', '焦虑', '职', 4, '生活区'),
  ('board-jinli',   'jinli',   '锦鲤祈愿', '把好运大声说出来！',               '开心', '锦', 7, '趣味区'),
  ('board-lingyi',  'lingyi',  '灵异夜话', '胆小的洞友请抱紧自己的抱枕。',     '感悟', '灵', 8, '趣味区');

-- 洞务组身份（display_no=0，新人须知作者；code_hash 前缀 seed- 表示不可登录）
INSERT INTO identities (id, code_hash, display_no) VALUES
  ('id-mod', 'seed-mod', 0);

-- 新人须知（站务内容，保留；计数从零开始，随真实访问自然增长）
INSERT INTO threads (id, board_id, identity_id, title, content, views, reply_count, hug_count, pinned, essence, status, created_at, last_reply_at) VALUES
  ('t0', 'board-shenye', 'id-mod', '新人须知：这里是匿名树洞，请温柔待人',
   '欢迎来到空山。这里没有 ID，只有心跳：不记录 IP、不收集身份，请温柔待人，禁止违法与人身攻击。有需要请联系洞务组。',
   0, 0, 0, 1, 0, 'published', datetime('now'), datetime('now'));
