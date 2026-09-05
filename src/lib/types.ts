// 数据契约 —— 页面层与数据层之间的唯一接口
// 页面只依赖这里的类型；P0 用 mock 数据，P1 换 D1 查询，页面零改动
// 字段与 docs/ARCHITECTURE.md §4 的 D1 schema 对应

/** 心情分类（对应设计规范 §2 情绪色） */
export type Mood = "树洞" | "开心" | "难过" | "焦虑" | "感悟";

/** 版块 */
export interface Board {
  slug: string; // URL 标识，如 "shenye"
  name: string; // 如 "深夜树洞"
  description: string;
  mood: Mood;
  group: string; // 分组名（如 "情感区"）——0006 起随版块入库，单一事实来源（P11-6）
  iconChar: string; // 图标单字，如 "夜"
  topicCount: string; // 展示用，如 "2,418"
  postCount: string; // 展示用，如 "3.6万"
  lastReplyUser: string; // 如 "洞友#7712"
  lastReplyTime: string; // 如 "5 分钟前"
}

/** 帖子（列表行） */
export interface Thread {
  id: string;
  boardSlug: string;
  boardName: string;
  title: string;
  author: string; // 展示名，如 "洞友 #4821"
  replyCount: string; // 展示用，如 "128"
  viewCount: string; // 展示用，如 "2.4万"
  pinned: boolean;
  essence: boolean;
  lastReplyUser: string;
  lastReplyTime: string;
}

/** 楼层（盖楼详情） */
export interface Floor {
  id: string;
  floorNo: number; // 1 = 楼主
  floorLabel: string; // 如 "1楼 · 发表于 今天 02:37"、"2楼 · 沙发 · …"
  author: string;
  authorNo: string; // 编号，如 "4821"
  level: string; // 如 "树洞 · 一叶"
  mood: Mood;
  isOp: boolean; // 是否楼主
  canDelete?: boolean; // 是否当前洞友发布且在 10 分钟窗口内（渲染「删除」按钮的唯一依据，服务端算好）
  content: string;
  quote?: string; // 引用块文案
  hugCount: number;
}

/** 通知 */
export interface Notice {
  id: string;
  kind: "reply" | "hug" | "system";
  main: string; // 主文案
  sub: string; // 引用摘要
  time: string;
  unread: boolean;
  threadId?: string; // 跳转目标帖（P13-1）：payload 携带，旧通知无此字段则不可点击
  floor?: number; // 楼层号（回复通知）：跳转锚点 /t/:id#floor-N
}

/** 当前洞友（匿名身份）。等级不在契约内：展示处一律由发言数经 levelFromPosts 实时计算（P7-2） */
export interface Identity {
  displayNo: string; // 如 "8829"
  joinDays: number;
  totalPosts?: number; // 累计发言——仅首页身份卡消费，由首页路由注入实时统计（P11-6 起 toDisplay 不再产出）
}

/** 我的帖子行 */
export interface MyThread {
  id: string;
  title: string;
  boardName: string;
  boardMood: Mood;
  repliesViews: string; // 如 "128 / 2.4万"
  time: string;
  essence: boolean;
  floor?: number; // 楼层号（仅「我回应的」行有）：用于锚到 /t/:id#floor-N（P11-5）
}

/** 首页热帖榜条目 */
export interface HotItem {
  id: string;
  title: string;
  boardName: string;
  boardMood: Mood;
  hugs: string; // 抱抱数展示——榜单按 hug_count 排序（P11-5：原字段名 replies 与展示「N 回复」都是错的）
}
