import { HOSTING_FEE_PER_TANK } from "./constants";
import { FISH_BY_ID } from "../data/fishDefs";
import { CONSUMABLE_BY_ID, CONSUMABLE_DEFS, baitIdFromFood, foodIdFromBait } from "../data/consumableDefs";
import type { Quality } from "../types";
import { stagePriceRate, ADULT_HEALTH_MAX } from "./growth";

export function fishQuality(defId: string): Quality {
  return FISH_BY_ID[defId]?.quality ?? "common";
}

/** ADR-001：鱼只能吃与自身品质相同的鱼粮。 */
export function canFeed(fishDefId: string, foodId: string): boolean {
  const fishQ = fishQuality(fishDefId);
  const baitId = baitIdFromFood(foodId);
  const foodQ = CONSUMABLE_BY_ID[baitId]?.quality ?? "common";
  return foodQ === fishQ;
}

export type FeedResult = "ate" | "refused" | "empty" | "skip" | "full";

/** 库存里找出一份该品质鱼粮；优先当前装备的那份。 */
export function pickFoodForQuality(
  foodStock: Record<string, number>,
  quality: Quality,
  preferredFoodId?: string,
): string | null {
  const ids: string[] = [];
  if (preferredFoodId && CONSUMABLE_BY_ID[baitIdFromFood(preferredFoodId)]?.quality === quality) {
    ids.push(preferredFoodId);
  }
  for (const c of CONSUMABLE_DEFS) {
    if (c.quality !== quality) continue;
    const fid = foodIdFromBait(c.id);
    if (!ids.includes(fid)) ids.push(fid);
  }
  for (const id of ids) {
    if ((foodStock[id] ?? 0) > 0) return id;
  }
  return null;
}

export function cheapestFoodForQuality(quality: Quality): { foodId: string; price: number } | null {
  let best: { foodId: string; price: number } | null = null;
  for (const c of CONSUMABLE_DEFS) {
    if (c.quality !== quality) continue;
    if (!best || c.foodPrice < best.price) best = { foodId: foodIdFromBait(c.id), price: c.foodPrice };
  }
  return best;
}

export function hostingDailyFee(hostedCount: number): number {
  return hostedCount * HOSTING_FEE_PER_TANK;
}

/** 未喂当日：基础 -1，死鱼每条再 −1；健康低于 60 按 2 的指数扣。 */
export function healthDropForDay(health: number, deadCount: number): number {
  const extraDead = deadCount;
  if (health >= 60) return 1 + extraDead;
  const exp = Math.min(5, Math.floor((60 - health) / 10) + 1);
  return 2 ** exp + extraDead;
}

/** 卖给鱼行：按成长阶段定价（鱼苗 40%、小鱼 75%、成鱼 100%）。死鱼不能卖。 */
export function fishSellPrice(baseSell: number, healthMax: number, dead = false): number | null {
  if (dead) return null;
  return Math.max(1, Math.round(baseSell * stagePriceRate(healthMax)));
}

/** 缸内卖鱼，同 fishSellPrice。 */
export function tankSellPrice(baseSell: number, healthMax: number, dead: boolean): number | null {
  return fishSellPrice(baseSell, healthMax, dead);
}

export function basketSellPrice(baseSell: number, healthMax = ADULT_HEALTH_MAX): number {
  return fishSellPrice(baseSell, healthMax, false) ?? baseSell;
}
