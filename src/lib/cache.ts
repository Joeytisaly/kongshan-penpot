// 通用 KV 缓存包装（S21）：命中反序列化返回；未命中执行 fetch 并回填
// 依赖地图：被 src/db/queries.ts 使用；改动需回归首页/版块页（AGENTS.md §2）

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
