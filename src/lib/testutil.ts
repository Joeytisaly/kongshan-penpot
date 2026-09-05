// 测试共享：KVNamespace 内存 stub
// - TTL 感知：put 带 expirationTtl 时按 Date.now()（可被 fake timers 冻结）计算过期，get 过期即删
// - 记录 put 调用与选项供断言
import { vi } from "vitest";

export interface PutRecord { key: string; value: string; opts?: { expirationTtl?: number } }

interface Entry { value: string; exp: number }

export function kvStub() {
  const store = new Map<string, Entry>();
  const puts: PutRecord[] = [];
  const stub = {
    get: vi.fn(async (key: string) => {
      const e = store.get(key);
      if (!e) return null;
      if (Date.now() > e.exp) {
        store.delete(key);
        return null;
      }
      return e.value;
    }),
    put: vi.fn(async (key: string, value: string, opts?: { expirationTtl?: number }) => {
      store.set(key, { value, exp: opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : Number.MAX_SAFE_INTEGER });
      puts.push({ key, value, opts });
    }),
    delete: vi.fn(async (key: string) => void store.delete(key)),
    dump: store,
    puts,
  };
  return stub as unknown as KVNamespace & { dump: Map<string, Entry>; puts: PutRecord[] };
}
