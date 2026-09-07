import type { Quality, RodDef, RodPartDef, RodPartSlot, StoolDef, BasketDef } from "../types";
import { ROD_PART_SLOTS } from "../types";

/**
 * 鱼竿即手杆；组件仅渔线轮 / 鱼线 / 鱼钩 / 浮漂（ADR-019）。
 * 买竿发放配套四件；散件可单买后改装。同品质金币/珍珠数值持平（ADR-003）。
 */

export const ROD_COEFFICIENT: Record<Quality, number> = {
  common: 1,
  fine: 1.05,
  rare: 1.1,
  precious: 1.15,
  ultimate: 1.22,
};

export const PART_STAT = {
  reel: { common: 1, fine: 1.2, rare: 1.4, precious: 1.6, ultimate: 1.85 },
  line: { common: 1, fine: 1.15, rare: 1.3, precious: 1.45, ultimate: 1.65 },
  hook: { common: 0, fine: 0.03, rare: 0.06, precious: 0.09, ultimate: 0.12 },
  float: { common: 1200, fine: 1400, rare: 1600, precious: 1800, ultimate: 2000 },
} as const;

type SlotNames = Record<RodPartSlot, string>;

/** 玩家滑块默认尺寸；手杆系数 `c` 乘此底值，书籍在此之上加法（ADR-019）。 */
export const PLAYER_SLIDER_BASE = 0.22;

export function fmtMul(stat: string, n: number): string {
  return `${stat}*${trimStat(n)}`;
}

export function fmtAdd(stat: string, n: number, suffix = ""): string {
  const sign = n >= 0 ? "+" : "";
  return `${stat}${sign}${trimStat(n)}${suffix}`;
}

function trimStat(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toFixed(2)));
}

function kit(prefix: string): Record<RodPartSlot, string> {
  return {
    reel: `part_${prefix}_reel`,
    line: `part_${prefix}_line`,
    hook: `part_${prefix}_hook`,
    float: `part_${prefix}_float`,
  };
}

function makePart(
  id: string,
  slot: RodPartSlot,
  name: string,
  quality: Quality,
  currency: "gold" | "pearl",
  price: number,
  stat: number,
  hiddenFromShop?: boolean,
): RodPartDef {
  return { id, slot, name, quality, currency, price, stat, hiddenFromShop };
}

function partsFor(
  prefix: string,
  names: SlotNames,
  quality: Quality,
  currency: "gold" | "pearl",
  prices: Record<RodPartSlot, number>,
  hiddenFromShop?: boolean,
): RodPartDef[] {
  const ids = kit(prefix);
  return ROD_PART_SLOTS.map((slot) =>
    makePart(
      ids[slot],
      slot,
      names[slot],
      quality,
      currency,
      prices[slot],
      PART_STAT[slot][quality],
      hiddenFromShop,
    ),
  );
}

const BAMBOO_KIT = kit("bamboo");
const GLASS_KIT = kit("glass");
const PEARL_GLASS_KIT = kit("pglass");
const VORTEX_KIT = kit("vortex");
const TITAN_KIT = kit("titan");
const PEARL_TITAN_KIT = kit("ptitan");
const CARBON_KIT = kit("carbon");
const PEARL_CARBON_KIT = kit("pcarbon");
const MYTH_KIT = kit("myth");
const PEARL_MYTH_KIT = kit("pmyth");
const PEARL_BAMBOO_KIT = kit("pbamboo");

export const STARTER_PARTS: Record<RodPartSlot, string> = { ...BAMBOO_KIT };

const COMMON_NAMES: SlotNames = {
  reel: "竹节渔线轮",
  line: "棉线",
  hook: "铁钩",
  float: "芦苇漂",
};
const FINE_NAMES: SlotNames = {
  reel: "玻纤渔线轮",
  line: "尼龙线",
  hook: "倒刺钩",
  float: "灵敏漂",
};
const PEARL_FINE_NAMES: SlotNames = {
  reel: "流光渔线轮",
  line: "萤丝线",
  hook: "月牙钩",
  float: "星子漂",
};
const VORTEX_NAMES: SlotNames = {
  reel: "涡纹渔线轮",
  line: "涡纹线",
  hook: "涡纹钩",
  float: "涡纹漂",
};
const RARE_NAMES: SlotNames = {
  reel: "钛金渔线轮",
  line: "钛丝线",
  hook: "三棱钩",
  float: "长尾漂",
};
const PEARL_RARE_NAMES: SlotNames = {
  reel: "霁彩渔线轮",
  line: "珠丝线",
  hook: "雪尖钩",
  float: "夜光漂",
};
const PRECIOUS_NAMES: SlotNames = {
  reel: "碳素渔线轮",
  line: "碳纤线",
  hook: "无倒刺钩",
  float: "芦羽漂",
};
const PEARL_PRECIOUS_NAMES: SlotNames = {
  reel: "墨玉渔线轮",
  line: "玄丝线",
  hook: "雀开钩",
  float: "沉水漂",
};
const ULTIMATE_NAMES: SlotNames = {
  reel: "玄铁渔线轮",
  line: "龙筋线",
  hook: "龙骨钩",
  float: "铁星漂",
};
const PEARL_ULTIMATE_NAMES: SlotNames = {
  reel: "鲛丝渔线轮",
  line: "鲛丝线",
  hook: "龙睛钩",
  float: "夜明漂",
};
const PEARL_COMMON_NAMES: SlotNames = {
  reel: "螺钿渔线轮",
  line: "蚕丝线",
  hook: "银尖钩",
  float: "鹅毛漂",
};

export const PART_DEFS: RodPartDef[] = [
  ...partsFor("bamboo", COMMON_NAMES, "common", "gold", { reel: 0, line: 0, hook: 0, float: 0 }, true),
  ...partsFor("glass", FINE_NAMES, "fine", "gold", { reel: 28, line: 24, hook: 24, float: 24 }),
  ...partsFor("pglass", PEARL_FINE_NAMES, "fine", "pearl", { reel: 1, line: 1, hook: 1, float: 1 }),
  ...partsFor("vortex", VORTEX_NAMES, "fine", "pearl", { reel: 0, line: 0, hook: 0, float: 0 }, true),
  ...partsFor("titan", RARE_NAMES, "rare", "gold", { reel: 180, line: 160, hook: 160, float: 160 }),
  ...partsFor("ptitan", PEARL_RARE_NAMES, "rare", "pearl", { reel: 2, line: 2, hook: 2, float: 2 }),
  makePart(
    "part_gift_reel",
    "reel",
    "铜芯渔线轮",
    "fine",
    "pearl",
    0,
    1.28,
    true,
  ),
  ...partsFor("carbon", PRECIOUS_NAMES, "precious", "gold", { reel: 720, line: 640, hook: 640, float: 640 }),
  ...partsFor("pcarbon", PEARL_PRECIOUS_NAMES, "precious", "pearl", { reel: 4, line: 4, hook: 4, float: 4 }),
  ...partsFor("myth", ULTIMATE_NAMES, "ultimate", "gold", { reel: 2800, line: 2500, hook: 2500, float: 2500 }),
  ...partsFor("pmyth", PEARL_ULTIMATE_NAMES, "ultimate", "pearl", { reel: 10, line: 10, hook: 10, float: 10 }),
  ...partsFor("pbamboo", PEARL_COMMON_NAMES, "common", "pearl", { reel: 1, line: 1, hook: 1, float: 1 }),
];

export const PART_BY_ID: Record<string, RodPartDef> = Object.fromEntries(
  PART_DEFS.map((p) => [p.id, p]),
);

function makeRod(
  id: string,
  name: string,
  quality: Quality,
  currency: "gold" | "pearl",
  price: number,
  rodKit: Record<RodPartSlot, string>,
  hiddenFromShop?: boolean,
): RodDef {
  return {
    id,
    name,
    quality,
    currency,
    price,
    coefficient: ROD_COEFFICIENT[quality],
    kit: rodKit,
    hiddenFromShop,
  };
}

export const ROD_DEFS: RodDef[] = [
  makeRod("rod_bamboo", "竹节竿", "common", "gold", 0, BAMBOO_KIT),
  makeRod("rod_fiberglass", "玻璃钢竿", "fine", "gold", 120, GLASS_KIT),
  makeRod("rod_pearl_glass", "流光玻纤竿", "fine", "pearl", 2, PEARL_GLASS_KIT),
  makeRod("rod_golden_vortex", "金涡纹竿", "fine", "pearl", 6, VORTEX_KIT, true),
  makeRod("rod_titanium", "钛合金竿", "rare", "gold", 800, TITAN_KIT),
  makeRod("rod_pearl_titanium", "霁彩钛合金竿", "rare", "pearl", 8, PEARL_TITAN_KIT),
  makeRod("rod_pearl_bamboo", "螺钿竹节竿", "common", "pearl", 1, PEARL_BAMBOO_KIT),
  makeRod("rod_carbon", "碳素竿", "precious", "gold", 3500, CARBON_KIT),
  makeRod("rod_pearl_carbon", "墨玉碳素竿", "precious", "pearl", 18, PEARL_CARBON_KIT),
  makeRod("rod_myth", "玄铁竿", "ultimate", "gold", 15000, MYTH_KIT),
  makeRod("rod_pearl_myth", "鲛丝玄铁竿", "ultimate", "pearl", 48, PEARL_MYTH_KIT),
];

export const ROD_BY_ID: Record<string, RodDef> = Object.fromEntries(
  ROD_DEFS.map((r) => [r.id, r]),
);

/** 旧存档把手杆当散件时，换成对应的竿。 */
export const LEGACY_HANDLE_TO_ROD: Record<string, string> = {
  part_bamboo_handle: "rod_bamboo",
  part_glass_handle: "rod_fiberglass",
  part_pglass_handle: "rod_pearl_glass",
  part_vortex_handle: "rod_golden_vortex",
  part_titan_handle: "rod_titanium",
  part_ptitan_handle: "rod_pearl_titanium",
  part_carbon_handle: "rod_carbon",
  part_pcarbon_handle: "rod_pearl_carbon",
  part_myth_handle: "rod_myth",
  part_pmyth_handle: "rod_pearl_myth",
  part_pbamboo_handle: "rod_pearl_bamboo",
};

export function kitPartIds(rodId: string): string[] {
  const rod = ROD_BY_ID[rodId];
  if (!rod) return [];
  return ROD_PART_SLOTS.map((s) => rod.kit[s]);
}

export function partStatHint(part: RodPartDef): string {
  switch (part.slot) {
    case "reel":
      return fmtMul("灵敏度", part.stat);
    case "line":
      return `${fmtMul("进度", part.stat)} 涨跌同倍`;
    case "hook":
      return fmtAdd("鱼滑块", part.stat);
    case "float":
      return fmtAdd("咬钩窗口", part.stat, "ms");
  }
}

export function rodShopHint(rod: RodDef): string {
  return fmtMul("滑块", rod.coefficient);
}

export function stoolHint(stool: StoolDef): string {
  if (stool.idleStaminaDiscount) {
    return `挂机体力消耗 -${Math.round(stool.idleStaminaDiscount * 100)}%`;
  }
  if (stool.catchXpBonus) {
    return `钓鱼经验 +${Math.round(stool.catchXpBonus * 100)}%`;
  }
  return "无加成";
}

/** 商城 / 装备页顶栏说明。 */
export function rodGearBlurb(): string {
  return "手杆决定玩家滑块大小，并给渔线轮、鱼线、鱼钩、浮漂乘系数。";
}

export function stoolGearBlurb(): string {
  return "木板凳减挂机体力消耗，折叠凳加钓鱼经验；每条板凳只有一种效果。";
}

export function basketShopHint(basket: BasketDef): string {
  return `${basket.capacity}条 / ${basket.weightCap}公斤`;
}

export const STOOL_DEFS: StoolDef[] = [
  {
    id: "stool_wood",
    name: "木板凳",
    quality: "common",
    price: 0,
    currency: "gold",
    idleStaminaDiscount: 0.15,
  },
  {
    id: "stool_folding",
    name: "折叠凳",
    quality: "fine",
    price: 60,
    currency: "gold",
    catchXpBonus: 0.2,
  },
];

export const STOOL_BY_ID: Record<string, StoolDef> = Object.fromEntries(
  STOOL_DEFS.map((s) => [s.id, s]),
);

export const BASKET_DEFS: BasketDef[] = [
  {
    id: "basket_small",
    name: "小鱼筐",
    quality: "common",
    price: 0,
    currency: "gold",
    capacity: 10,
    weightCap: 8,
  },
  {
    id: "basket_gift",
    name: "涡纹鱼筐",
    quality: "fine",
    price: 6,
    currency: "pearl",
    capacity: 12,
    weightCap: 12,
    hiddenFromShop: true,
  },
  {
    id: "basket_medium",
    name: "中鱼筐",
    quality: "fine",
    price: 100,
    currency: "gold",
    capacity: 16,
    weightCap: 16,
  },
  {
    id: "basket_pearl",
    name: "珠光鱼筐",
    quality: "fine",
    price: 4,
    currency: "pearl",
    capacity: 18,
    weightCap: 18,
  },
  {
    id: "basket_large",
    name: "大鱼筐",
    quality: "rare",
    price: 600,
    currency: "gold",
    capacity: 24,
    weightCap: 28,
  },
];

export const BASKET_BY_ID: Record<string, BasketDef> = Object.fromEntries(
  BASKET_DEFS.map((b) => [b.id, b]),
);
