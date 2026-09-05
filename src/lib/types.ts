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
}

/** 当前洞友（匿名身份） */
export interface Identity {
  displayNo: string; // 如 "8829"
  level: string; // 如 "一叶"
  joinDays: number;
  totalPosts: number; // 累计发言（发帖+回应），与树洞等级同口径；首页路由以实时统计注入（P7-2）
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
}

/** 首页热帖榜条目 */
export interface HotItem {
  id: string;
  title: string;
  boardName: string;
  boardMood: Mood;
  replies: string;
}

/** 左栏版块导航分组 */
export interface NavGroup {
  name: string; // 如 "情感区"
  items: Array<{ name: string; slug: string; active: boolean }>;
}
