// 领域类型定义。术语与 CONTEXT.md 一一对应。

/** 品质五档，由低到高。概率加成按 ADR-010 档位收敛。 */
export type Quality = "common" | "fine" | "rare" | "precious" | "ultimate";

export const QUALITY_ORDER: Quality[] = [
  "common",
  "fine",
  "rare",
  "precious",
  "ultimate",
];

export const QUALITY_LABEL: Record<Quality, string> = {
  common: "普通",
  fine: "优良",
  rare: "稀有",
  precious: "珍贵",
  ultimate: "极品",
};

/** ADR-010：优良 1% / 稀有 0.3% / 珍贵 0.1% / 极品 0.03% 为一档。普通未单列，演示用 2%。 */
export const QUALITY_TIER_RATE: Record<Quality, number> = {
  common: 0.02,
  fine: 0.01,
  rare: 0.003,
  precious: 0.001,
  ultimate: 0.0003,
};

export type Sex = "male" | "female";
export const SEX_LABEL: Record<Sex, string> = { male: "公", female: "母" };

/** 互斥性格（ADR-018）。 */
export type Personality = "hot" | "docile" | "timid" | "aloof";
export const PERSONALITIES: Personality[] = ["hot", "docile", "timid", "aloof"];
/** 生成实例时加权（ADR-018）：温顺 35 / 暴躁 25 / 高冷 25 / 胆小 15。 */
export const PERSONALITY_WEIGHT: Record<Personality, number> = {
  docile: 35,
  hot: 25,
  aloof: 25,
  timid: 15,
};
export const PERSONALITY_LABEL: Record<Personality, string> = {
  hot: "暴躁",
  docile: "温顺",
  timid: "胆小",
  aloof: "高冷",
};
export const PERSONALITY_SPEED: Record<Personality, number> = {
  hot: 1.35,
  docile: 0.7,
  timid: 1,
  aloof: 1,
};

/** 互斥爱情观（ADR-018）。 */
export type LoveView = "peer" | "aspire" | "any" | "none";
export const LOVE_VIEWS: LoveView[] = ["peer", "aspire", "any", "none"];
export const LOVE_VIEW_LABEL: Record<LoveView, string> = {
  peer: "门当户对",
  aspire: "慕强",
  any: "来者不拒",
  none: "拒绝配对",
};

export type RodPartSlot = "reel" | "line" | "hook" | "float";
export const ROD_PART_SLOTS: RodPartSlot[] = ["reel", "line", "hook", "float"];
export const ROD_PART_LABEL: Record<RodPartSlot, string> = {
  reel: "渔线轮",
  line: "鱼线",
  hook: "鱼钩",
  float: "浮漂",
};
export const ROD_PART_DESC: Record<RodPartSlot, string> = {
  reel: "灵敏度",
  line: "进度",
  hook: "鱼滑块",
  float: "咬钩窗口",
};

/** 鱼定义（静态数据）。 */
export interface FishDef {
  id: string;
  name: string;
  quality: Quality;
  /** 所属渔场 id。 */
  fisheryId: string;
  /** 主偏鱼饵 id（见 ADR-002 附录）。 */
  preferredBaitId: string;
  /** 卖给鱼行的金币价。 */
  sellPrice: number;
  /** 立绘资源 id（可复用已有 16 张）。 */
  spriteId: string;
  /** 钓鱼小游戏参数：随品质提升，鱼滑块更小、更快、更不规则。 */
  motion: {
    /** 鱼滑块高度（0~1，相对进度槽）。 */
    sliderSize: number;
    /** 正弦振幅（0~1）。 */
    amplitude: number;
    /** 正弦频率（次/秒）。 */
    frequency: number;
    /** 噪声权重（0~1，叠加在正弦上）。 */
    noiseWeight: number;
    /** 移动速度倍率。 */
    speed: number;
  };
}

/** 鱼饵/鱼食共用定义。 */
export interface ConsumableDef {
  id: string;
  name: string;
  quality: Quality;
  /** 偏好溢价（0~0.3），见 ADR-002。 */
  markup: number;
  /** 鱼饵单价（金）。 */
  baitPrice: number;
  /** 鱼食单价（金）= 鱼饵 ÷ 2，至少 1。 */
  foodPrice: number;
  /** 鱼饵货架简介。 */
  baitBlurb: string;
  /** 鱼食货架名（与鱼饵同配方、不同库存）。 */
  foodName: string;
  /** 鱼食货架简介。 */
  foodBlurb: string;
  /** 商城是否可见。 */
  hiddenFromShop?: boolean;
}

/** 四件组件之一。stat 含义随槽位变化。 */
export interface RodPartDef {
  id: string;
  slot: RodPartSlot;
  name: string;
  quality: Quality;
  currency: "gold" | "pearl";
  price: number;
  /** reel=灵敏度；line=进度倍率；hook=鱼滑块加成；float=反应窗口毫秒。 */
  stat: number;
  hiddenFromShop?: boolean;
}

/** 鱼竿即手杆（ADR-019）。购买时发放配套四件组件。 */
export interface RodDef {
  id: string;
  name: string;
  quality: Quality;
  /** 货币：gold 或 pearl。同品质金币竿与珍珠竿数值持平（ADR-003）。 */
  currency: "gold" | "pearl";
  price: number;
  /** 手杆系数，乘在已装备的四件组件上。 */
  coefficient: number;
  hiddenFromShop?: boolean;
  /** 整竿配套的四件组件 id。 */
  kit: Record<RodPartSlot, string>;
}

/** 服装外观款。男女各画一版，无属性。 */
export type OutfitLook = "casual" | "rain" | "shell" | "tide" | "festival";

/** 服装：无属性，仅外观。 */
export interface OutfitDef {
  id: string;
  name: string;
  quality: Quality;
  currency: "gold" | "pearl";
  price: number;
  look: OutfitLook;
  blurb: string;
  /** 旧字段，潜入/地图已不再靠色相旋转换装。 */
  hue: number;
  hiddenFromShop?: boolean;
}

/** 增益书籍：持有即生效。 */
export interface BookDef {
  id: string;
  name: string;
  hint: string;
  currency: "gold" | "pearl";
  price: number;
  luck: number;
  playerSliderBonus: number;
}

/** 板凳：影响玩家滑块尺寸。 */
export interface StoolDef {
  id: string;
  name: string;
  quality: Quality;
  price: number;
  currency: "gold" | "pearl";
  /** 玩家滑块尺寸加成。 */
  playerSliderBonus: number;
}

/** 鱼筐：影响容量上限。 */
export interface BasketDef {
  id: string;
  name: string;
  quality: Quality;
  price: number;
  currency: "gold" | "pearl";
  /** 容量（条数）。 */
  capacity: number;
  /** 容量（重量，千克）。 */
  weightCap: number;
  hiddenFromShop?: boolean;
}

/** 鱼缸：按品质购买，品质决定该缸可养鱼条数。 */
export interface TankDef {
  id: string;
  name: string;
  quality: Quality;
  price: number;
  currency: "gold" | "pearl";
  /** 该缸可养鱼条数。 */
  capacity: number;
  blurb: string;
  hiddenFromShop?: boolean;
}

/** 求偶香：提高自动配对成功率。金币喂一条鱼，珍珠喷整缸。 */
export interface AttractantDef {
  id: string;
  name: string;
  quality: Quality;
  price: number;
  currency: "gold" | "pearl";
  /** gold = 单鱼；pearl = 整缸。 */
  scope: "fish" | "tank";
  /** 成功率加成。 */
  bonus: number;
  /** 持续游戏天。 */
  durationDays: number;
  blurb: string;
}

/** 渔场定义。 */
export interface FisheryDef {
  id: string;
  name: string;
  /** 入场费类型。free 不收费；paid 提供办卡/买票/潜入。 */
  entry: {
    type: "free" | "paid";
    /** 单次门票（金）。 */
    ticketPrice?: number;
    /** 月卡价（金）。 */
    cardPrice?: number;
  };
  /** 鱼池：鱼 id 与出现权重。 */
  pool: { fishId: string; weight: number }[];
}

export type QuestTrigger =
  | "open_map"
  | "cast"
  | "catch"
  | "tank"
  | "feed"
  | "sell"
  | "read_encyc"
  | "buy_fish"
  | "cook"
  | "eat"
  | "visit";

export interface QuestDef {
  id: string;
  title: string;
  hint: string;
  trigger: QuestTrigger;
  rewardGold: number;
  rewardBait?: { id: string; n: number };
  rewardFood?: { id: string; n: number };
  rewardSalt?: number;
  next: string | null;
}
