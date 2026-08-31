import { QUALITY_ORDER, QUALITY_TIER_RATE, type FishDef, type Quality } from "../types";
import { FISH_BY_ID } from "../data/fishDefs";
import { CONSUMABLE_BY_ID, fishPrefersBait, foodIdFromBait } from "../data/consumableDefs";
import { BASKET_BY_ID } from "../data/equipmentDefs";
import {
  JUNK_BITE_CHANCE,
  pickBottleStory,
  pickJunkDef,
  type BottleStory,
  type JunkDef,
} from "../data/junkDefs";
import type { SaveData } from "../save/saveSchema";
import type { LoveView, Personality } from "../types";
import { basketWeightKg, fishWeightKg } from "./weight";
import { rollTraits } from "./traits";

function genUid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 上钩选鱼：基础权重 + 同品质饵一档 + 主偏饵再一档 + 欧气一档（ADR-010 / ADR-012）。
 * 概率加成只改上钩，不改小游戏难度。
 */
export function pickFishFromPool(
  pool: { fishId: string; weight: number }[],
  baitId: string,
  luck: number,
): FishDef {
  const bait = CONSUMABLE_BY_ID[baitId];
  const baseTotal = pool.reduce((s, p) => s + p.weight, 0) || 1;
  const weighted = pool.flatMap((p) => {
    const fish = FISH_BY_ID[p.fishId];
    if (!fish) return [];
    let extra = 0;
    const rate = QUALITY_TIER_RATE[fish.quality];
    if (bait && bait.quality === fish.quality) extra += rate;
    if (bait && fishPrefersBait(fish.id, baitId)) extra += rate;
    extra += Math.max(0, luck) * rate;
    return [{ fish, w: p.weight + extra * baseTotal }];
  });
  if (weighted.length === 0) return FISH_BY_ID.crucian;
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  for (const x of weighted) {
    r -= x.w;
    if (r <= 0) return x.fish;
  }
  return weighted[0].fish;
}

export type BiteOutcome =
  | { kind: "fish"; fish: FishDef }
  | { kind: "junk"; junk: JunkDef };

let lastBiteWasJunk = false;

export function pickBiteOutcome(
  pool: { fishId: string; weight: number }[],
  baitId: string,
  luck: number,
): BiteOutcome {
  const rollJunk = !lastBiteWasJunk && Math.random() < JUNK_BITE_CHANCE;
  if (rollJunk) {
    lastBiteWasJunk = true;
    return { kind: "junk", junk: pickJunkDef() };
  }
  lastBiteWasJunk = false;
  return { kind: "fish", fish: pickFishFromPool(pool, baitId, luck) };
}

/** 塑料袋丢掉；水草进普通鱼食；漂流瓶只带回故事。 */
export function applyJunkToSave(save: SaveData, junk: JunkDef): BottleStory | null {
  if (junk.kind === "weed") {
    const foodId = foodIdFromBait("bait_basic");
    save.foodStock = { ...save.foodStock, [foodId]: (save.foodStock[foodId] ?? 0) + 1 };
  }
  if (junk.kind === "bottle") return pickBottleStory();
  return null;
}

export function qualityRank(q: Quality): number {
  return QUALITY_ORDER.indexOf(q);
}

/** 新鱼是否优于筐内这条（高品质优先，同品质用卖价近似体型）。 */
export function isBetterCatch(next: FishDef, current: FishDef): boolean {
  const dq = qualityRank(next.quality) - qualityRank(current.quality);
  if (dq !== 0) return dq > 0;
  return next.sellPrice > current.sellPrice;
}

export type BasketAddResult = "added" | "replaced" | "rejected";

function basketCaps(save: SaveData) {
  const basket = BASKET_BY_ID[save.equipped.basket];
  return { cap: basket?.capacity ?? 10, wCap: basket?.weightCap ?? 8 };
}

export function basketRejectReason(save: SaveData, fishDef: FishDef): string | null {
  const { cap, wCap } = basketCaps(save);
  const used = save.basket.length;
  const usedW = basketWeightKg(save.basket);
  const nextW = fishWeightKg(fishDef);
  if (used >= cap) return `鱼筐满了（${used}/${cap} 条），先卖掉或存进缸`;
  if (usedW + nextW > wCap + 1e-6) {
    return `再放这条会超重（${usedW.toFixed(1)}+${nextW.toFixed(1)}>${wCap} 公斤），先腾地方或换更大的筐`;
  }
  return null;
}

export function basketFits(save: SaveData, fishDef: FishDef): boolean {
  return basketRejectReason(save, fishDef) == null;
}

export function addToBasket(
  save: SaveData,
  fishDef: FishDef,
  traits?: { personality: Personality; loveView: LoveView },
): boolean {
  if (!basketFits(save, fishDef)) return false;
  const t = traits ?? rollTraits();
  save.basket.push({ uid: genUid("b"), defId: fishDef.id, personality: t.personality, loveView: t.loveView });
  return true;
}

/** 换掉筐里这条后，新鱼是否仍不超条数/重量。 */
export function replaceWouldFit(save: SaveData, uid: string, fishDef: FishDef): boolean {
  if (!save.basket.some((b) => b.uid === uid)) return false;
  const { cap, wCap } = basketCaps(save);
  const without = save.basket.filter((b) => b.uid !== uid);
  if (without.length >= cap) return false;
  return basketWeightKg(without) + fishWeightKg(fishDef) <= wCap + 1e-6;
}

export function replaceBasketFish(
  save: SaveData,
  uid: string,
  fishDef: FishDef,
  traits?: { personality: Personality; loveView: LoveView },
): boolean {
  if (!replaceWouldFit(save, uid, fishDef)) return false;
  const idx = save.basket.findIndex((b) => b.uid === uid);
  if (idx < 0) return false;
  const t = traits ?? rollTraits();
  save.basket[idx] = { uid: genUid("b"), defId: fishDef.id, personality: t.personality, loveView: t.loveView };
  return true;
}

/** 满筐时用低品质/小鱼换高档鱼/大鱼（仅挂机，ADR-001）。 */
export function tryAddToBasket(save: SaveData, fishDef: FishDef): BasketAddResult {
  if (addToBasket(save, fishDef)) return "added";
  let worstIdx = 0;
  let worst: FishDef | null = FISH_BY_ID[save.basket[0]?.defId] ?? null;
  for (let i = 1; i < save.basket.length; i++) {
    const def = FISH_BY_ID[save.basket[i].defId];
    if (!def || !worst) continue;
    if (!isBetterCatch(worst, def)) {
      worst = def;
      worstIdx = i;
    }
  }
  const worstUid = save.basket[worstIdx]?.uid;
  if (!worst || !worstUid || !isBetterCatch(fishDef, worst)) return "rejected";
  if (!replaceBasketFish(save, worstUid, fishDef)) return "rejected";
  return "replaced";
}

export { genUid };
