// 树洞等级体系：按累计发言（发帖 + 回复）计算
// 依赖地图：被 index.tsx（me/home 路由）使用；阈值调整需同步 me 页提示文案

export interface LevelInfo {
  level: string;      // 当前等级名
  next: string | null; // 下一级名称，null 表示满级
  need: number;        // 距下一级还差几次发言
  progress: number;    // 0-100 当前级内进度
}

const LEVELS: Array<{ name: string; posts: number }> = [
  { name: "一叶", posts: 0 },
  { name: "两叶", posts: 10 },
  { name: "三叶", posts: 30 },
  { name: "四叶", posts: 60 },
  { name: "五叶", posts: 100 },
];

export function levelFromPosts(posts: number): LevelInfo {
  let level = LEVELS[0];
  for (const l of LEVELS) {
    if (posts >= l.posts) level = l;
  }
  const idx = LEVELS.indexOf(level);
  const next = LEVELS[idx + 1] ?? null;
  const span = next ? next.posts - level.posts : 1;
  const done = next ? posts - level.posts : span;
  return {
    level: level.name,
    next: next?.name ?? null,
    need: next ? Math.max(0, next.posts - posts) : 0,
    progress: next ? Math.min(100, Math.round((done / span) * 100)) : 100,
  };
}
