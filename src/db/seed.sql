-- 空山 · 种子数据（内容与 Penpot 画板一致；时间用相对偏移，展示层格式化出"x 分钟前"）

-- 版块（sort 与 0004 分组顺序一致；其余 4 版块由 0004 迁移插入——fresh 库「先迁移后种子」
-- 与线上「存量库跑迁移」两条路径得到相同的 9 版块与排序）
INSERT INTO boards (id, slug, name, description, mood, icon_char, sort) VALUES
  ('board-shenye',  'shenye',  '深夜树洞', '凌晨两点之后，心事不打烊。',       '树洞', '夜', 1),
  ('board-qinggan', 'qinggan', '情感树洞', '暗恋、异地、告别，都放在这里。',   '难过', '情', 2),
  ('board-zhichang','zhichang','职场吐槽', '老板看不见的委屈，这里都看得见。', '焦虑', '职', 4),
  ('board-jinli',   'jinli',   '锦鲤祈愿', '把好运大声说出来！',               '开心', '锦', 7),
  ('board-lingyi',  'lingyi',  '灵异夜话', '胆小的洞友请抱紧自己的抱枕。',     '感悟', '灵', 8);

-- 演示身份（code_hash 前缀 seed- 表示不可登录的演示作者；display_no=0 表示"洞务组"）
-- 等级/抱抱列已随 0003 移除（P7-3）：等级由发言数实时计算，演示身份各 1 帖 → 一叶
INSERT INTO identities (id, code_hash, display_no, post_count) VALUES
  ('id-mod',  'seed-mod',  0,    1),
  ('id-4821', 'seed-4821', 4821, 1),
  ('id-3302', 'seed-3302', 3302, 1),
  ('id-2077', 'seed-2077', 2077, 1),
  ('id-1956', 'seed-1956', 1956, 1),
  ('id-6109', 'seed-6109', 6109, 1),
  ('id-0413', 'seed-0413', 0413, 1),
  ('id-5104', 'seed-5104', 5104, 1),
  ('id-0417', 'seed-0417', 0417, 1),
  ('id-7712', 'seed-7712', 7712, 0),
  ('id-8829', 'seed-8829', 8829, 1);

-- 帖子（10 条，全部在深夜树洞，对应画板 02 列表）
INSERT INTO threads (id, board_id, identity_id, title, content, views, reply_count, hug_count, pinned, essence, status, created_at, last_reply_at) VALUES
  ('t0', 'board-shenye', 'id-mod', '新人须知：这里是匿名树洞，请温柔待人',
   '欢迎来到空山。这里没有 ID，只有心跳：不记录 IP、不收集身份，请温柔待人，禁止违法与人身攻击。有需要请联系洞务组。',
   81000, 512, 0, 1, 0, 'published', datetime('now','-3 minutes'),  datetime('now','-3 minutes')),
  ('t1', 'board-shenye', 'id-4821', '加班到凌晨两点，便利店的关东煮是我的深夜食堂',
   '今晚又是最后一个离开工位的人。楼下 24 小时便利店，店员小哥看都不看我一眼，默默帮我把关东煮热好。原来被记住的感觉，是这样的。',
   24000, 128, 128, 0, 1, 'published', datetime('now','-5 minutes'),  datetime('now','-5 minutes')),
  ('t2', 'board-shenye', 'id-2077', '暗恋十年的人今天结婚了，我在他楼下坐了一夜',
   '从中学到工作，喜欢了她十年。今天她结婚了，我坐在她家楼下的长椅上，直到天亮。祝她幸福，也祝我自己，能走出来。',
   56000, 342, 342, 0, 0, 'published', datetime('now','-12 minutes'), datetime('now','-12 minutes')),
  ('t3', 'board-shenye', 'id-1956', '28 岁存款四位数，还有救吗？',
   '毕业六年，换过四份工作，存折上的数字不到一万。同龄人在晒房晒车，我连回家的高铁票都要算日子。我知道人生不是轨道，可今晚还是睡不着。',
   18000, 207, 207, 0, 0, 'published', datetime('now','-28 minutes'), datetime('now','-28 minutes')),
  ('t4', 'board-shenye', 'id-3302', '二战考研失败，我决定回老家了',
   '第二次考研，还是差六分。今天订了回老家的车票。爸妈在电话里只说了一句：回来就好。我突然就不难过了。',
   9041, 156, 156, 0, 0, 'published', datetime('now','-1 hours'), datetime('now','-1 hours')),
  ('t5', 'board-shenye', 'id-6109', '转发这条树洞之后，下周的面试真的过了',
   '上周在这里许愿，说面试通过就来还愿。今天 offer 到了。谢谢树洞，也谢谢那个认真的自己。',
   72000, 891, 891, 0, 1, 'published', datetime('now','-1 hours','-5 minutes'), datetime('now','-1 hours','-5 minutes')),
  ('t6', 'board-shenye', 'id-5104', '家里的猫 14 岁了，希望它再多陪我几年',
   '它陪我搬了五次家，熬过无数个加班夜。医生说它该吃处方粮了，我换了更贵的外卖单，想让它多陪我几年，好不好。',
   5672, 98, 98, 0, 0, 'published', datetime('now','-2 hours'), datetime('now','-2 hours')),
  ('t7', 'board-shenye', 'id-0413', '外婆的铁盒（长期更新）',
   '外婆走后，我在她床底找到一个铁盒，里面整整齐齐收着我从小到大的奖状，连我早忘了的幼儿园小红花都在。原来我一直是她的骄傲。这个帖子会一直更新。',
   69000, 733, 733, 0, 1, 'published', datetime('now','-3 hours'), datetime('now','-3 hours')),
  ('t8', 'board-shenye', 'id-0417', '出租屋的水管半夜自己会响，有人懂吗',
   '凌晨两点半，厨房水管准时"咕噜"一声。不是第一次了，修过两次也没好。一个人住久了，连水管响都开始觉得是有人在陪我。',
   3208, 65, 65, 0, 0, 'published', datetime('now','-4 hours'), datetime('now','-4 hours')),
  ('t9', 'board-shenye', 'id-8829', '凌晨三点的失眠者联盟，进来抱团取暖',
   '睡不着就进来吧，楼里的灯都亮着。说说你为什么还没睡。',
   12000, 264, 264, 0, 0, 'published', datetime('now','-5 hours'), datetime('now','-5 hours'));

-- 楼层（t1 对应画板 03：2 楼沙发、3 楼板凳带引用；t2 补一条活跃）
INSERT INTO replies (id, thread_id, floor, identity_id, content, quote, hug_count, created_at) VALUES
  ('r1-2', 't1', 2, 'id-3302', '沙发！店员小哥才是真正的深夜守护者。抱抱楼主，明天会顺利的。', NULL, 45, datetime('now','-5 minutes')),
  ('r1-3', 't1', 3, 'id-2077', '我也是！加班到崩溃的时候，那口热汤真的能救命。楼主加油！',
   '引用 洞友#4821 的发言：原来被记住的感觉，是这样的。', 21, datetime('now','-5 minutes','+2 minutes')),
  ('r2-2', 't2', 2, 'id-7712', '十年，你比很多人都勇敢。天亮了，往前走吧。', NULL, 12, datetime('now','-11 minutes'));
