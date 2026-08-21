import type { ConsumableDef } from "../types";

/**
 * 鱼饵/鱼食定义。价格按 ADR-002：
 * 鱼饵价 = round(基准价[品质] × (1 + 偏好溢价))
 * 鱼食价 = max(1, round(鱼饵价 ÷ 2))
 * Demo 只覆盖乡村池塘 + 清溪 + 万能基础饵。
 */

const BASE_PRICE: Record<string, { bait: number; food: number }> = {
  common: { bait: 1, food: 1 },
  fine: { bait: 10, food: 5 },
  rare: { bait: 80, food: 40 },
  precious: { bait: 200, food: 100 },
  ultimate: { bait: 1000, food: 500 },
};

function makeConsumable(
  id: string,
  name: string,
  quality: ConsumableDef["quality"],
  markup: number,
  hiddenFromShop?: boolean,
): ConsumableDef {
  const base = BASE_PRICE[quality];
  const baitPrice = Math.round(base.bait * (1 + markup));
  const foodPrice = Math.max(1, Math.round(baitPrice / 2));
  return { id, name, quality, markup, baitPrice, foodPrice, hiddenFromShop };
}

export const CONSUMABLE_DEFS: ConsumableDef[] = [
  makeConsumable("bait_basic", "基础饵", "common", 0),
  makeConsumable("bait_wine_wheat", "酒酿麦粒", "common", 0.1),
  makeConsumable("bait_fermented_bran", "发酵谷皮", "common", 0.1),
  makeConsumable("bait_honey_bean", "蜜渍金豆", "fine", 0.2),
  makeConsumable("bait_osmanthus_cake", "桂花米糕", "fine", 0.2),
  makeConsumable("bait_red_worm_ball", "红虫团子", "common", 0.1),
  makeConsumable("bait_loach", "泥鳅段", "fine", 0.15),
  makeConsumable("bait_bee_pupa", "蜂蛹", "fine", 0.15),
  makeConsumable("bait_herb_fat", "香草脂", "fine", 0.15),
  makeConsumable("bait_gold_bug", "碎金虫饵", "rare", 0.2),
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
