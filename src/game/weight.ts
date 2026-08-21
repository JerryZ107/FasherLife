import { QUALITY_ORDER, type FishDef, type Quality } from "../types";
import { FISH_BY_ID } from "../data/fishDefs";
import type { BasketFish } from "../save/saveSchema";

const KG: Record<Quality, number> = {
  common: 0.4,
  fine: 0.9,
  rare: 1.6,
  precious: 2.5,
  ultimate: 4,
};

export function fishWeightKg(def: FishDef): number {
  return KG[def.quality];
}

export function basketWeightKg(list: BasketFish[]): number {
  return list.reduce((s, b) => {
    const def = FISH_BY_ID[b.defId];
    return s + (def ? fishWeightKg(def) : 0);
  }, 0);
}

export function qualitySortRank(q: Quality): number {
  return QUALITY_ORDER.length - 1 - QUALITY_ORDER.indexOf(q);
}
