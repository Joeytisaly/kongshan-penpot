-- 空山 · 补充种子：其余版块各 2 帖（让首页版块列表不空场，数据真实）
INSERT INTO threads (id, board_id, identity_id, title, content, views, reply_count, hug_count, pinned, essence, status, created_at, last_reply_at) VALUES
  ('t-q1', 'board-qinggan', 'id-4821', '暗恋十年的人今天结婚了，我在他楼下坐了一夜',
   '从中学到工作，喜欢了她十年。今天她结婚了，我坐在她家楼下的长椅上，直到天亮。祝她幸福，也祝我自己，能走出来。',
   56000, 342, 342, 0, 0, 'published', datetime('now','-2 hours'), datetime('now','-1 hours','-50 minutes')),
  ('t-q2', 'board-qinggan', 'id-0413', '分手三个月，终于把置顶聊天删了',
   '删掉的那一刻，感觉心里有个地方空了一块，但好像也轻了一点。树洞替我记得就好。',
   18000, 207, 207, 0, 0, 'published', datetime('now','-6 hours'), datetime('now','-5 hours','-40 minutes')),
  ('t-z1', 'board-zhichang', 'id-1956', '28 岁存款四位数，还有救吗？',
   '毕业六年，换过四份工作，存折上的数字不到一万。我知道人生不是轨道，可今晚还是睡不着。',
   9041, 156, 156, 0, 0, 'published', datetime('now','-3 hours'), datetime('now','-2 hours','-30 minutes')),
  ('t-z2', 'board-zhichang', 'id-5104', '把工位养成了一个植物园',
   '同事说我摸鱼，其实绿萝每天多长一片叶子，就是我撑下去的理由。',
   3208, 65, 65, 0, 0, 'published', datetime('now','-1 days'), datetime('now','-20 hours')),
  ('t-j1', 'board-jinli', 'id-6109', '转发这条树洞之后，下周的面试真的过了',
   '上周在这里许愿，说面试通过就来还愿。今天 offer 到了。谢谢树洞，也谢谢那个认真的自己。',
   72000, 891, 891, 0, 1, 'published', datetime('now','-5 hours'), datetime('now','-4 hours','-20 minutes')),
  ('t-j2', 'board-jinli', 'id-8829', '求求了，让我的猫把毛球吐出来吧',
   '它难受了一整天，医生说观察。树洞啊，替我向锦鲤说一声。',
   12000, 264, 264, 0, 0, 'published', datetime('now','-8 hours'), datetime('now','-7 hours')),
  ('t-l1', 'board-lingyi', 'id-0417', '出租屋的水管半夜自己会响，有人懂吗',
   '凌晨两点半，厨房水管准时"咕噜"一声。不是第一次了，修过两次也没好。一个人住久了，连水管响都开始觉得是有人在陪我。',
   5672, 98, 98, 0, 0, 'published', datetime('now','-4 hours'), datetime('now','-3 hours','-50 minutes')),
  ('t-l2', 'board-lingyi', 'id-3302', '奶奶说，凌晨三点醒着的人，是在被谁惦记',
   '灵不灵不知道，但今晚三点我醒了，那就当是你在想我吧。',
   69000, 733, 733, 0, 1, 'published', datetime('now','-1 days','-2 hours'), datetime('now','-22 hours'));

-- 补几条回复，让部分版块有活跃楼
INSERT INTO replies (id, thread_id, floor, identity_id, content, quote, hug_count, created_at) VALUES
  ('r-z1-2', 't-z1', 2, 'id-3302', '同款焦虑。但今晚先把觉睡好，明天的事明天想。', NULL, 16, datetime('now','-2 hours','-25 minutes')),
  ('r-j1-2', 't-j1', 2, 'id-2077', '蹭蹭喜气！下周我也要面试了！', NULL, 22, datetime('now','-4 hours','-10 minutes')),
  ('r-l2-2', 't-l2', 2, 'id-6109', '奶奶说的对。我刚才也醒了，就当是她在想我吧。', NULL, 11, datetime('now','-21 hours','-50 minutes'));
