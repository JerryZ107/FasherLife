import { fishPrefersFood } from "../data/consumableDefs";
import { FISH_BY_ID } from "../data/fishDefs";
import type { Quality } from "../types";

export const AFFECTION_MAX = 10;
export const AFFECTION_PER_FEED = 1;
/** 喂偏好饵对应的鱼粮额外加成（与上钩偏好同一套逻辑）。 */
export const AFFECTION_PREFERRED_BONUS = 0.5;
/** 点击抚摸每次增加。 */
export const AFFECTION_PET_GAIN = 0.1;
/** 每条鱼每天最多抚摸次数。 */
export const AFFECTION_PET_DAILY_LIMIT = 3;
export const FISH_NAME_MAX_LEN = 8;

/** 头顶名字颜色，按鱼品质。 */
export const QUALITY_NAME_COLOR: Record<Quality, number> = {
  common: 0x6b7280,
  fine: 0x2f9a70,
  rare: 0x2f6fd4,
  precious: 0x7c3aed,
  ultimate: 0xc46a00,
};

export function affectionGainForFeed(fishDefId: string, foodId: string): number {
  return AFFECTION_PER_FEED + (fishPrefersFood(fishDefId, foodId) ? AFFECTION_PREFERRED_BONUS : 0);
}

export function addAffection(fish: { affection?: number }, gain: number): void {
  const next = (fish.affection ?? 0) + gain;
  fish.affection = Math.min(AFFECTION_MAX, Math.round(next * 10) / 10);
}

export function petsLeftToday(fish: { petDay?: number; petCount?: number }, gameDay: number): number {
  const used = fish.petDay === gameDay ? (fish.petCount ?? 0) : 0;
  return Math.max(0, AFFECTION_PET_DAILY_LIMIT - used);
}

/** 抚摸加好感；当天已满则 false。 */
export function tryPetFish(
  fish: { affection?: number; dead?: boolean; petDay?: number; petCount?: number },
  gameDay: number,
): boolean {
  if (fish.dead) return false;
  if (fish.petDay !== gameDay) {
    fish.petDay = gameDay;
    fish.petCount = 0;
  }
  if ((fish.petCount ?? 0) >= AFFECTION_PET_DAILY_LIMIT) return false;
  fish.petCount = (fish.petCount ?? 0) + 1;
  addAffection(fish, AFFECTION_PET_GAIN);
  return true;
}

export function canNameFish(fish: { affection?: number; dead?: boolean }): boolean {
  return !fish.dead;
}

/** 亲密度每 1 点 +1% 触发温顺点击反馈；0 时不触发。 */
export function docileReactChance(affection: number): number {
  if (affection <= 0) return 0;
  return Math.min(1, affection * 0.01);
}

export function rollDocileReact(affection: number): boolean {
  const p = docileReactChance(affection);
  return p > 0 && Math.random() < p;
}

export function normalizeFishName(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  return t.slice(0, FISH_NAME_MAX_LEN);
}

/** 列表/操作栏：有起名则「名字（鱼种）」，否则只显示鱼种。 */
export function fishTitle(fish: { defId: string; customName?: string | null }): string {
  const species = FISH_BY_ID[fish.defId]?.name ?? "鱼";
  const custom = fish.customName?.trim();
  return custom ? `${custom}（${species}）` : species;
}
