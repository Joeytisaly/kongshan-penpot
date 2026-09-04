// 古诗填空验证码 —— 风控触发时启用（默认免验证），零外部依赖、大陆必达
// 题库：经典诗句上下句填空，答案存 KV（5 分钟 TTL，一次性）
// 依赖地图：被 index.tsx（/new 路由）使用；题库扩展只需在此追加

export interface CaptchaQuestion {
  prompt: string; // 展示给用户的题目，如 "空山不见人，＿＿＿＿"
  answer: string; // 正确答案（不含标点）
}

/** 经典诗句题库（上句/下句对） */
const POEM_BANK: Array<[string, string]> = [
  ["空山不见人", "但闻人语响"],
  ["床前明月光", "疑是地上霜"],
  ["举头望明月", "低头思故乡"],
  ["春眠不觉晓", "处处闻啼鸟"],
  ["白日依山尽", "黄河入海流"],
  ["欲穷千里目", "更上一层楼"],
  ["锄禾日当午", "汗滴禾下土"],
  ["谁知盘中餐", "粒粒皆辛苦"],
  ["两个黄鹂鸣翠柳", "一行白鹭上青天"],
  ["野火烧不尽", "春风吹又生"],
  ["离离原上草", "一岁一枯荣"],
  ["好雨知时节", "当春乃发生"],
  ["随风潜入夜", "润物细无声"],
  ["海上生明月", "天涯共此时"],
  ["独在异乡为异客", "每逢佳节倍思亲"],
  ["洛阳亲友如相问", "一片冰心在玉壶"],
  ["慈母手中线", "游子身上衣"],
  ["临行密密缝", "意恐迟迟归"],
  ["会当凌绝顶", "一览众山小"],
  ["大漠孤烟直", "长河落日圆"],
  ["山重水复疑无路", "柳暗花明又一村"],
  ["落红不是无情物", "化作春泥更护花"],
];

const CAPTCHA_TTL = 5 * 60; // 5 分钟有效
const CAPTCHA_KEY = (id: string) => `captcha:${id}`;

function normalize(s: string): string {
  return s.replace(/[，。！？、；：""''（）\s]/g, "").toUpperCase();
}

/** 生成一道题：随机上句或下句，答案存 KV */
export async function generateCaptcha(kv: KVNamespace): Promise<{ id: string; prompt: string }> {
  const [upper, lower] = POEM_BANK[Math.floor(Math.random() * POEM_BANK.length)];
  // 交替出题方向：一半问下句、一半问上句
  const askLower = Math.random() < 0.5;
  const id = crypto.randomUUID();
  await kv.put(CAPTCHA_KEY(id), normalize(askLower ? lower : upper), { expirationTtl: CAPTCHA_TTL });
  return {
    id,
    prompt: askLower ? `${upper}，＿＿＿＿` : `＿＿＿＿，${lower}`,
  };
}

/** 校验答案（一次性：无论对错即销毁，防重放） */
export async function verifyCaptcha(kv: KVNamespace, id: string, answer: string): Promise<boolean> {
  if (!id) return false;
  const stored = await kv.get(CAPTCHA_KEY(id));
  await kv.delete(CAPTCHA_KEY(id));
  if (!stored) return false;
  return normalize(answer) === stored;
}
