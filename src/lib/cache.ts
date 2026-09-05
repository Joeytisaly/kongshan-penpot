// 通用 KV 缓存包装（S21）：命中反序列化返回；未命中执行 fetch 并回填
// 依赖地图：被 src/db/queries.ts 使用；改动需回归首页/版块页（AGENTS.md §2）

/** 缓存键唯一事实来源（P14-3：写路径失效与读路径共用，防键名漂移） */
export const CACHE_KEY_BOARDS = "cache:boards:v2";
export const CACHE_KEY_HOT = "cache:hot:v2";

/** 写路径失效首页聚合缓存（P14-3）：发帖/回复/抱抱/删除/站务处置改变
 *  主题数/帖子数/最后回复/热帖榜后调用——此前最长滞后 60 秒（真实用户反馈「数字不更新」） */
export async function bustHomeAggregates(kv: KVNamespace): Promise<void> {
  await Promise.all([kv.delete(CACHE_KEY_BOARDS), kv.delete(CACHE_KEY_HOT)]);
}

export async function cached<T>(
  kv: KVNamespace,
  key: string,
  ttlSec: number,
  fetch: () => Promise<T>,
): Promise<T> {
  const hit = await kv.get(key);
  if (hit != null) {
    try {
      return JSON.parse(hit) as T;
    } catch {
      // 反序列化失败视为未命中，回源重填
    }
  }
  const value = await fetch();
  await kv.put(key, JSON.stringify(value), { expirationTtl: ttlSec });
  return value;
}
