import { fishTitle } from "./affection";
import { fishWeightKg } from "./weight";
import { FISH_BY_ID } from "../data/fishDefs";
import type { TankFish } from "../save/saveSchema";
import type { Quality } from "../types";

/** 个人主页最多展示几条鱼。 */
export const MAX_PROFILE_SHOWCASE_FISH = 6;

const SIZE_CM: Record<Quality, number> = {
  common: 14,
  fine: 20,
  rare: 28,
  precious: 36,
  ultimate: 48,
};

function growthScale(fish: TankFish): number {
  return Math.max(0.38, (fish.healthMax ?? 100) / 100);
}

export function profileFishSizeCm(fish: TankFish): number {
  const def = FISH_BY_ID[fish.defId];
  if (!def) return 0;
  return Math.round(SIZE_CM[def.quality] * growthScale(fish));
}

export function profileFishWeightKg(fish: TankFish): number {
  const def = FISH_BY_ID[fish.defId];
  if (!def) return 0;
  return Math.round(fishWeightKg(def) * growthScale(fish) * 10) / 10;
}

export function profileFishLabel(fish: TankFish): string {
  return fishTitle(fish);
}
