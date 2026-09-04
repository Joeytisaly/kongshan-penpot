// 静态配置数据 —— 与业务数据无关的 UI 常量（不属于 D1 管辖）
import type { NavGroup } from "./types";

export const navGroups: NavGroup[] = [
  { name: "情感区", items: [
    { name: "深夜树洞", slug: "shenye", active: true },
    { name: "情感树洞", slug: "qinggan", active: false },
    { name: "分手治愈", slug: "fenshou", active: false },
  ]},
  { name: "生活区", items: [
    { name: "职场吐槽", slug: "zhichang", active: false },
    { name: "校园点滴", slug: "xiaoyuan", active: false },
    { name: "租房互助", slug: "zufang", active: false },
  ]},
  { name: "趣味区", items: [
    { name: "锦鲤祈愿", slug: "jinli", active: false },
    { name: "灵异夜话", slug: "lingyi", active: false },
    { name: "树洞故事会", slug: "gushihui", active: false },
  ]},
];

export const services: string[] = ["树洞使用指南", "心理援助热线 12356", "内容与社区规范"];

export const rules: string[] = [
  "一、温柔待人，恶语必删", "二、禁止广告与人身攻击", "三、不记录 IP，不收集身份", "四、有需要请联系洞务组",
];

export const onlineUsers: string[] = ["#7712", "#3302", "#1956", "#6109"];
