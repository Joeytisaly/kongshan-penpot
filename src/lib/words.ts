// 内容安全词库 —— 三类分级处理
// 违规词：进待审队列（人工过审）；自伤词：不拦截但页面叠加心理援助提示；严重词：直接拒绝发布
// 依赖地图：被 writes.ts（createThread/createReply）使用；扩充词库在此追加即可

/** 违规：命中后帖子进待审队列（站务过审才可见） */
export const VIOLATION_WORDS = [
  "色情", "赌博", "毒品", "枪支", "诈骗", "传销", "代开发票", "办证", "刷单",
  "人肉搜索", "造谣", "辱骂", "人身攻击", "人肉", "引战",
];

/** 自伤：不拦截发布，但盖楼页顶部展示心理援助横幅 */
export const SELF_HARM_WORDS = [
  "自杀", "不想活", "活不下去", "了结自己", "轻生", "割腕", "跳楼", "离开这个世界",
  "解脱了", "活够", "没有意义", "撑不下去",
];

/** 严重：直接拒绝发布（拦截性内容，不进入队列） */
export const SEVERE_WORDS = [
  "儿童色情", "贩毒", "爆炸物制作", "炸弹制作",
];

export type ContentVerdict = "pass" | "pending" | "block" | "self-harm";

/** 内容判定：返回分级结果（self-harm 可与其他叠加，优先级 block > pending > self-harm > pass） */
export function judgeContent(text: string): ContentVerdict {
  if (SEVERE_WORDS.some((w) => text.includes(w))) return "block";
  if (VIOLATION_WORDS.some((w) => text.includes(w))) return "pending";
  if (SELF_HARM_WORDS.some((w) => text.includes(w))) return "self-harm";
  return "pass";
}
