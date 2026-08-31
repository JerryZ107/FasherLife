import type { ConsumableDef } from "../types";
import { FISH_BY_ID, FISH_DEFS } from "./fishDefs";

/**
 * 鱼饵/鱼食定义。价格按 ADR-002：
 * 鱼饵价 = round(基准价[品质] × (1 + 偏好溢价))
 * 鱼食价 = max(1, round(鱼饵价 ÷ 2))
 * Demo 只覆盖乡村池塘 + 清溪 + 万能糠面饵。
 */

const BASE_PRICE: Record<string, { bait: number; food: number }> = {
  common: { bait: 1, food: 1 },
  fine: { bait: 10, food: 5 },
  rare: { bait: 80, food: 40 },
  precious: { bait: 200, food: 100 },
  ultimate: { bait: 1000, food: 500 },
};

function makeConsumable(opts: {
  id: string;
  name: string;
  quality: ConsumableDef["quality"];
  markup: number;
  baitBlurb: string;
  foodName: string;
  foodBlurb: string;
  hiddenFromShop?: boolean;
}): ConsumableDef {
  const base = BASE_PRICE[opts.quality];
  const baitPrice = Math.round(base.bait * (1 + opts.markup));
  const foodPrice = Math.max(1, Math.round(baitPrice / 2));
  return {
    id: opts.id,
    name: opts.name,
    quality: opts.quality,
    markup: opts.markup,
    baitPrice,
    foodPrice,
    baitBlurb: opts.baitBlurb,
    foodName: opts.foodName,
    foodBlurb: opts.foodBlurb,
    hiddenFromShop: opts.hiddenFromShop,
  };
}

export const CONSUMABLE_DEFS: ConsumableDef[] = [
  makeConsumable({
    id: "bait_basic",
    name: "糠面饵",
    quality: "common",
    markup: 0,
    baitBlurb: "糠掺面团。不挑食，也不出彩。",
    foodName: "普通鱼粮",
    foodBlurb: "缸里入门那锅，管饱就行。",
  }),
  makeConsumable({
    id: "bait_wine_wheat",
    name: "酒酿麦粒",
    quality: "common",
    markup: 0.1,
    baitBlurb: "酒酿泡软的麦子，入水带一点甜。",
    foodName: "酒酿麦粮",
    foodBlurb: "带一点酒香，普通鱼肯吃。",
  }),
  makeConsumable({
    id: "bait_fermented_bran",
    name: "发酵谷皮",
    quality: "common",
    markup: 0.1,
    baitBlurb: "闷过的谷皮，酸香沉底。",
    foodName: "谷皮鱼粮",
    foodBlurb: "酸香贴底，青鱼那一档爱吃。",
  }),
  makeConsumable({
    id: "bait_honey_bean",
    name: "蜜渍金豆",
    quality: "fine",
    markup: 0.2,
    baitBlurb: "蜜浸黄豆，钩上像一盏小灯。",
    foodName: "蜜豆鱼粮",
    foodBlurb: "甜。优良那档认这个味。",
  }),
  makeConsumable({
    id: "bait_osmanthus_cake",
    name: "桂花米糕",
    quality: "fine",
    markup: 0.2,
    baitBlurb: "桂花揉进米糕，入水还香。",
    foodName: "桂花鱼粮",
    foodBlurb: "桂花香，胭脂、龙睛那一档爱吃。",
  }),
  makeConsumable({
    id: "bait_red_worm_ball",
    name: "红虫团子",
    quality: "common",
    markup: 0.1,
    baitBlurb: "活红虫攥成团，溪里最常见。",
    foodName: "红虫鱼粮",
    foodBlurb: "溪边那锅，白条马口入缸也认。",
  }),
  makeConsumable({
    id: "bait_loach",
    name: "泥鳅段",
    quality: "fine",
    markup: 0.15,
    baitBlurb: "切好的小泥鳅，血腥味沉底。",
    foodName: "泥鳅鱼粮",
    foodBlurb: "荤的。石鲈入缸还想吃这个。",
  }),
  makeConsumable({
    id: "bait_bee_pupa",
    name: "蜂蛹",
    quality: "fine",
    markup: 0.15,
    baitBlurb: "带壳的蛹，一捏就爆浆。",
    foodName: "蜂蛹鱼粮",
    foodBlurb: "鳟鱼入缸，还是认蛹。",
  }),
  makeConsumable({
    id: "bait_herb_fat",
    name: "香草脂",
    quality: "fine",
    markup: 0.15,
    baitBlurb: "草香混着油脂，贴钩上不散。",
    foodName: "香草鱼粮",
    foodBlurb: "草香压腥。溪流鳟爱这口。",
  }),
  makeConsumable({
    id: "bait_gold_bug",
    name: "碎金虫饵",
    quality: "rare",
    markup: 0.2,
    baitBlurb: "金壳虫碾碎，溪石缝里的货认这个。",
    foodName: "碎金鱼粮",
    foodBlurb: "稀有那档才肯吃。金鳟、翡翠入缸用这个。",
  }),
];

export const CONSUMABLE_BY_ID: Record<string, ConsumableDef> = Object.fromEntries(
  CONSUMABLE_DEFS.map((c) => [c.id, c]),
);

/** 鱼食 id 与鱼饵 id 配对（同名不同库存）。 */
export function foodIdFromBait(baitId: string): string {
  return baitId.replace(/^bait_/, "food_");
}

export function baitIdFromFood(foodId: string): string {
  return foodId.replace(/^food_/, "bait_");
}

export function foodNameOf(baitOrFoodId: string): string {
  const baitId = baitOrFoodId.startsWith("food_") ? baitIdFromFood(baitOrFoodId) : baitOrFoodId;
  return CONSUMABLE_BY_ID[baitId]?.foodName ?? CONSUMABLE_BY_ID[baitId]?.name ?? baitOrFoodId;
}

/** 哪些鱼偏好这一份饵（与上钩加权同一套数据）。 */
export function preferredFishNamesForBait(baitId: string): string[] {
  return FISH_DEFS.filter((f) => f.preferredBaitId === baitId).map((f) => f.name);
}

/** 鱼是否偏好这份饵。 */
export function fishPrefersBait(fishDefId: string, baitId: string): boolean {
  return FISH_BY_ID[fishDefId]?.preferredBaitId === baitId;
}

/** 鱼是否偏好这份粮（对应饵 id 与 preferredBaitId 相同）。 */
export function fishPrefersFood(fishDefId: string, foodId: string): boolean {
  return fishPrefersBait(fishDefId, baitIdFromFood(foodId));
}

/** 该鱼偏好的鱼粮 id；无偏好则 null。 */
export function preferredFoodIdForFish(fishDefId: string): string | null {
  const baitId = FISH_BY_ID[fishDefId]?.preferredBaitId;
  return baitId ? foodIdFromBait(baitId) : null;
}

export function baitShopHint(c: ConsumableDef): string {
  const fans = preferredFishNamesForBait(c.id);
  const same = "同品质上钩加权";
  if (fans.length === 0) return same;
  return `${same} · 偏好 ${fans.join("、")}`;
}

export function foodShopHint(c: ConsumableDef): string {
  const fans = preferredFishNamesForBait(c.id);
  if (fans.length === 0) return c.foodBlurb;
  return `${c.foodBlurb} · ${fans.join("、")}特攻`;
}
