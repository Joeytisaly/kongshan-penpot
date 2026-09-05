-- 空山 · 0005 身份维度查询索引（P11-3）
-- 背景：getMyThreads / getMyReplies / 楼层等级实时统计（getAuthorLevels）等
--       均按 threads.identity_id / replies.identity_id 过滤，0001 未建对应索引，
--       数据增长后「我的树洞」与盖楼详情页退化为全表扫描。
-- 纯增量索引，与部署顺序无关（先部署或先迁移均安全）。
CREATE INDEX idx_threads_identity ON threads(identity_id, status, created_at DESC);
CREATE INDEX idx_replies_identity ON replies(identity_id, status, created_at DESC);
