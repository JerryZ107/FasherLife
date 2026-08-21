import type { Quality, RodDef, RodPartDef, RodPartSlot, StoolDef, BasketDef } from "../types";
import { ROD_PART_SLOTS } from "../types";

/**
 * 鱼竿五件套。买整竿发放对应套件；散件可在商城单买后改装（ADR-011 / ADR-012）。
 * 同品质金币通道与珍珠通道数值持平（ADR-003）。
 */

function kit(prefix: string): Record<RodPartSlot, string> {
  return {
    handle: `part_${prefix}_handle`,
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

const BAMBOO_KIT = kit("bamboo");
const GLASS_KIT = kit("glass");
const PEARL_GLASS_KIT = kit("pglass");
const VORTEX_KIT = kit("vortex");
const TITAN_KIT = kit("titan");
const PEARL_TITAN_KIT = kit("ptitan");

export const STARTER_PARTS: Record<RodPartSlot, string> = { ...BAMBOO_KIT };

export const PART_DEFS: RodPartDef[] = [
  makePart(BAMBOO_KIT.handle, "handle", "竹节手杆", "common", "gold", 0, 1.0, true),
  makePart(BAMBOO_KIT.reel, "reel", "竹节渔线轮", "common", "gold", 0, 1.0, true),
  makePart(BAMBOO_KIT.line, "line", "棉线", "common", "gold", 0, 1.0, true),
  makePart(BAMBOO_KIT.hook, "hook", "铁钩", "common", "gold", 0, 0, true),
  makePart(BAMBOO_KIT.float, "float", "芦苇漂", "common", "gold", 0, 1200, true),

  makePart(GLASS_KIT.handle, "handle", "玻纤手杆", "fine", "gold", 30, 1.05),
  makePart(GLASS_KIT.reel, "reel", "玻纤渔线轮", "fine", "gold", 28, 1.2),
  makePart(GLASS_KIT.line, "line", "尼龙线", "fine", "gold", 24, 1.15),
  makePart(GLASS_KIT.hook, "hook", "倒刺钩", "fine", "gold", 24, 0.03),
  makePart(GLASS_KIT.float, "float", "灵敏漂", "fine", "gold", 24, 1400),

  makePart(PEARL_GLASS_KIT.handle, "handle", "流光手杆", "fine", "pearl", 1, 1.05),
  makePart(PEARL_GLASS_KIT.reel, "reel", "流光渔线轮", "fine", "pearl", 1, 1.2),
  makePart(PEARL_GLASS_KIT.line, "line", "流光线", "fine", "pearl", 1, 1.15),
  makePart(PEARL_GLASS_KIT.hook, "hook", "流光钩", "fine", "pearl", 1, 0.03),
  makePart(PEARL_GLASS_KIT.float, "float", "流光漂", "fine", "pearl", 1, 1400),

  makePart(VORTEX_KIT.handle, "handle", "涡纹手杆", "fine", "pearl", 0, 1.05, true),
  makePart(VORTEX_KIT.reel, "reel", "涡纹渔线轮", "fine", "pearl", 0, 1.2, true),
  makePart(VORTEX_KIT.line, "line", "涡纹线", "fine", "pearl", 0, 1.15, true),
  makePart(VORTEX_KIT.hook, "hook", "涡纹钩", "fine", "pearl", 0, 0.03, true),
  makePart(VORTEX_KIT.float, "float", "涡纹漂", "fine", "pearl", 0, 1400, true),

  makePart(TITAN_KIT.handle, "handle", "钛合金手杆", "rare", "gold", 200, 1.1),
  makePart(TITAN_KIT.reel, "reel", "钛合金渔线轮", "rare", "gold", 180, 1.4),
  makePart(TITAN_KIT.line, "line", "钛合金线", "rare", "gold", 160, 1.3),
  makePart(TITAN_KIT.hook, "hook", "钛合金钩", "rare", "gold", 160, 0.06),
  makePart(TITAN_KIT.float, "float", "钛合金漂", "rare", "gold", 160, 1600),

  makePart(PEARL_TITAN_KIT.handle, "handle", "珠光钛手杆", "rare", "pearl", 2, 1.1),
  makePart(PEARL_TITAN_KIT.reel, "reel", "珠光钛渔线轮", "rare", "pearl", 2, 1.4),
  makePart(PEARL_TITAN_KIT.line, "line", "珠光钛线", "rare", "pearl", 2, 1.3),
  makePart(PEARL_TITAN_KIT.hook, "hook", "珠光钛钩", "rare", "pearl", 2, 0.06),
  makePart(PEARL_TITAN_KIT.float, "float", "珠光钛漂", "rare", "pearl", 2, 1600),

  makePart("part_gift_reel", "reel", "月卡赠渔线轮", "fine", "pearl", 0, 1.28, true),

  makePart(kit("carbon").handle, "handle", "碳素手杆", "precious", "gold", 800, 1.15),
  makePart(kit("carbon").reel, "reel", "碳素渔线轮", "precious", "gold", 720, 1.6),
  makePart(kit("carbon").line, "line", "碳素线", "precious", "gold", 640, 1.45),
  makePart(kit("carbon").hook, "hook", "碳素钩", "precious", "gold", 640, 0.09),
  makePart(kit("carbon").float, "float", "碳素漂", "precious", "gold", 640, 1800),

  makePart(kit("pcarbon").handle, "handle", "珠光碳素手杆", "precious", "pearl", 4, 1.15),
  makePart(kit("pcarbon").reel, "reel", "珠光碳素渔线轮", "precious", "pearl", 4, 1.6),
  makePart(kit("pcarbon").line, "line", "珠光碳素线", "precious", "pearl", 4, 1.45),
  makePart(kit("pcarbon").hook, "hook", "珠光碳素钩", "precious", "pearl", 4, 0.09),
  makePart(kit("pcarbon").float, "float", "珠光碳素漂", "precious", "pearl", 4, 1800),

  makePart(kit("myth").handle, "handle", "玄铁手杆", "ultimate", "gold", 3200, 1.22),
  makePart(kit("myth").reel, "reel", "玄铁渔线轮", "ultimate", "gold", 2800, 1.85),
  makePart(kit("myth").line, "line", "玄铁线", "ultimate", "gold", 2500, 1.65),
  makePart(kit("myth").hook, "hook", "玄铁钩", "ultimate", "gold", 2500, 0.12),
  makePart(kit("myth").float, "float", "玄铁漂", "ultimate", "gold", 2500, 2000),

  makePart(kit("pmyth").handle, "handle", "珠光玄铁手杆", "ultimate", "pearl", 10, 1.22),
  makePart(kit("pmyth").reel, "reel", "珠光玄铁渔线轮", "ultimate", "pearl", 10, 1.85),
  makePart(kit("pmyth").line, "line", "珠光玄铁线", "ultimate", "pearl", 10, 1.65),
  makePart(kit("pmyth").hook, "hook", "珠光玄铁钩", "ultimate", "pearl", 10, 0.12),
  makePart(kit("pmyth").float, "float", "珠光玄铁漂", "ultimate", "pearl", 10, 2000),

  makePart(kit("pbamboo").handle, "handle", "流光竹节手杆", "common", "pearl", 1, 1.0),
  makePart(kit("pbamboo").reel, "reel", "流光竹节渔线轮", "common", "pearl", 1, 1.0),
  makePart(kit("pbamboo").line, "line", "流光棉线", "common", "pearl", 1, 1.0),
  makePart(kit("pbamboo").hook, "hook", "流光铁钩", "common", "pearl", 1, 0),
  makePart(kit("pbamboo").float, "float", "流光芦苇漂", "common", "pearl", 1, 1200),
];

export const PART_BY_ID: Record<string, RodPartDef> = Object.fromEntries(
  PART_DEFS.map((p) => [p.id, p]),
);

const FINE_ROD_MOD = {
  sensitivity: 1.2,
  progressRate: 1.15,
  fishSliderBonus: 0.03,
  reactionWindow: 1400,
  coefficient: 1.05,
};

const RARE_ROD_MOD = {
  sensitivity: 1.4,
  progressRate: 1.3,
  fishSliderBonus: 0.06,
  reactionWindow: 1600,
  coefficient: 1.1,
};

const PRECIOUS_ROD_MOD = {
  sensitivity: 1.6,
  progressRate: 1.45,
  fishSliderBonus: 0.09,
  reactionWindow: 1800,
  coefficient: 1.15,
};

const ULTIMATE_ROD_MOD = {
  sensitivity: 1.85,
  progressRate: 1.65,
  fishSliderBonus: 0.12,
  reactionWindow: 2000,
  coefficient: 1.22,
};

export const ROD_DEFS: RodDef[] = [
  {
    id: "rod_bamboo",
    name: "竹节竿",
    quality: "common",
    currency: "gold",
    price: 0,
    modifiers: { sensitivity: 1.0, progressRate: 1.0, fishSliderBonus: 0, reactionWindow: 1200, coefficient: 1.0 },
    kit: BAMBOO_KIT,
  },
  {
    id: "rod_fiberglass",
    name: "玻璃钢竿",
    quality: "fine",
    currency: "gold",
    price: 120,
    modifiers: { ...FINE_ROD_MOD },
    kit: GLASS_KIT,
  },
  {
    id: "rod_pearl_glass",
    name: "流光玻纤竿",
    quality: "fine",
    currency: "pearl",
    price: 2,
    modifiers: { ...FINE_ROD_MOD },
    kit: PEARL_GLASS_KIT,
  },
  {
    id: "rod_golden_vortex",
    name: "金涡纹竿",
    quality: "fine",
    currency: "pearl",
    price: 6,
    modifiers: { ...FINE_ROD_MOD },
    hiddenFromShop: true,
    kit: VORTEX_KIT,
  },
  {
    id: "rod_titanium",
    name: "钛合金竿",
    quality: "rare",
    currency: "gold",
    price: 800,
    modifiers: { ...RARE_ROD_MOD },
    kit: TITAN_KIT,
  },
  {
    id: "rod_pearl_titanium",
    name: "珠光钛合金竿",
    quality: "rare",
    currency: "pearl",
    price: 8,
    modifiers: { ...RARE_ROD_MOD },
    kit: PEARL_TITAN_KIT,
  },
  {
    id: "rod_pearl_bamboo",
    name: "流光竹节竿",
    quality: "common",
    currency: "pearl",
    price: 1,
    modifiers: { sensitivity: 1.0, progressRate: 1.0, fishSliderBonus: 0, reactionWindow: 1200, coefficient: 1.0 },
    kit: kit("pbamboo"),
  },
  {
    id: "rod_carbon",
    name: "碳素竿",
    quality: "precious",
    currency: "gold",
    price: 3500,
    modifiers: { ...PRECIOUS_ROD_MOD },
    kit: kit("carbon"),
  },
  {
    id: "rod_pearl_carbon",
    name: "珠光碳素竿",
    quality: "precious",
    currency: "pearl",
    price: 18,
    modifiers: { ...PRECIOUS_ROD_MOD },
    kit: kit("pcarbon"),
  },
  {
    id: "rod_myth",
    name: "玄铁竿",
    quality: "ultimate",
    currency: "gold",
    price: 15000,
    modifiers: { ...ULTIMATE_ROD_MOD },
    kit: kit("myth"),
  },
  {
    id: "rod_pearl_myth",
    name: "珠光玄铁竿",
    quality: "ultimate",
    currency: "pearl",
    price: 48,
    modifiers: { ...ULTIMATE_ROD_MOD },
    kit: kit("pmyth"),
  },
];

export const ROD_BY_ID: Record<string, RodDef> = Object.fromEntries(
  ROD_DEFS.map((r) => [r.id, r]),
);

export function kitPartIds(rodId: string): string[] {
  const rod = ROD_BY_ID[rodId];
  if (!rod) return [];
  return ROD_PART_SLOTS.map((s) => rod.kit[s]);
}

export const STOOL_DEFS: StoolDef[] = [
  { id: "stool_wood", name: "木板凳", quality: "common", price: 0, currency: "gold", playerSliderBonus: 0 },
  { id: "stool_folding", name: "折叠凳", quality: "fine", price: 60, currency: "gold", playerSliderBonus: 0.04 },
];

export const STOOL_BY_ID: Record<string, StoolDef> = Object.fromEntries(
  STOOL_DEFS.map((s) => [s.id, s]),
);

export const BASKET_DEFS: BasketDef[] = [
  { id: "basket_small", name: "小鱼筐", quality: "common", price: 0, currency: "gold", capacity: 10, weightCap: 8 },
  {
    id: "basket_gift",
    name: "礼包鱼筐",
    quality: "fine",
    price: 6,
    currency: "pearl",
    capacity: 12,
    weightCap: 12,
    hiddenFromShop: true,
  },
  { id: "basket_medium", name: "中鱼筐", quality: "fine", price: 100, currency: "gold", capacity: 16, weightCap: 16 },
  { id: "basket_pearl", name: "珠光鱼筐", quality: "fine", price: 4, currency: "pearl", capacity: 18, weightCap: 18 },
  { id: "basket_large", name: "大鱼筐", quality: "rare", price: 600, currency: "gold", capacity: 24, weightCap: 28 },
];

export const BASKET_BY_ID: Record<string, BasketDef> = Object.fromEntries(
  BASKET_DEFS.map((b) => [b.id, b]),
);
