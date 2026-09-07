import type { TankFish } from "../save/saveSchema";

export const ADULT_HEALTH_MAX = 100;
/** 新手赠鱼、新钓获成鱼的初始健康（相对上限 97%）。 */
export const CAUGHT_FISH_HEALTH = Math.round(ADULT_HEALTH_MAX * 0.97);
export const JUVENILE_START_MAX = 30;
export const MATE_GROWTH_MAX = 60;
export const ADULT_MATE_MIN_HEALTH = 96;
export const JUVENILE_MATE_MIN_HEALTH = 36;

export function fishHealthMax(fish: TankFish): number {
  return fish.healthMax ?? ADULT_HEALTH_MAX;
}

/** 相对成鱼 100 上限的有效健康（用于日扣等）。 */
export function effectiveHealthPercent(fish: TankFish): number {
  const max = fishHealthMax(fish);
  if (max <= 0) return 0;
  return (fish.health / max) * ADULT_HEALTH_MAX;
}

export const ADULT_BODY_BULK_MUL: Record<1 | 2 | 3, number> = {
  1: 0.8,
  2: 0.9,
  3: 1,
};

export function rollAdultBodyBulk(): 1 | 2 | 3 {
  const r = Math.random();
  if (r < 1 / 3) return 1;
  if (r < 2 / 3) return 2;
  return 3;
}

/** 成鱼随机体型档；非成鱼清空。 */
export function syncAdultBodyBulk(fish: TankFish): void {
  if (fishHealthMax(fish) < ADULT_HEALTH_MAX) {
    delete fish.bodyBulk;
    return;
  }
  if (fish.bodyBulk == null) fish.bodyBulk = rollAdultBodyBulk();
}

export function adultBodyBulkMul(fish: Pick<TankFish, "healthMax" | "bodyBulk">): number {
  if (fishHealthMax(fish as TankFish) < ADULT_HEALTH_MAX) return 1;
  const bulk = fish.bodyBulk;
  if (bulk === 1 || bulk === 2 || bulk === 3) return ADULT_BODY_BULK_MUL[bulk];
  return 1;
}

/** 画布体型倍率：30% → 60% → 100%，成鱼再乘体型档。 */
export function fishSizeScale(fish: TankFish): number {
  const max = fishHealthMax(fish);
  if (max < MATE_GROWTH_MAX) return 0.38;
  if (max < ADULT_HEALTH_MAX) return 0.6;
  return adultBodyBulkMul(fish);
}

export function isJuvenile(fish: TankFish): boolean {
  return fishHealthMax(fish) < ADULT_HEALTH_MAX;
}

/** 鱼苗 / 小鱼 / 成鱼，用于定价三档。 */
export type FishGrowthStage = "fry" | "juvenile" | "adult";

export const GROWTH_STAGE_LABEL: Record<FishGrowthStage, string> = {
  fry: "鱼苗",
  juvenile: "小鱼",
  adult: "成年",
};

export const FRY_PRICE_RATE = 0.4;
export const JUVENILE_PRICE_RATE = 0.75;

export function fishGrowthStage(healthMax: number): FishGrowthStage {
  if (healthMax < MATE_GROWTH_MAX) return "fry";
  if (healthMax < ADULT_HEALTH_MAX) return "juvenile";
  return "adult";
}

export function stagePriceRate(healthMax: number): number {
  const stage = fishGrowthStage(healthMax);
  if (stage === "fry") return FRY_PRICE_RATE;
  if (stage === "juvenile") return JUVENILE_PRICE_RATE;
  return 1;
}

/** 未满血，或鱼苗/亚成体还在涨上限时，都会去吃粮。 */
export function wantsFood(fish: Pick<TankFish, "health" | "healthMax" | "dead">): boolean {
  if (fish.dead) return false;
  const max = fishHealthMax(fish as TankFish);
  if (fish.health < max) return true;
  return max < ADULT_HEALTH_MAX;
}

export function mateMinHealth(fish: TankFish): number {
  return fishHealthMax(fish) >= ADULT_HEALTH_MAX ? ADULT_MATE_MIN_HEALTH : JUVENILE_MATE_MIN_HEALTH;
}

export function canMateFish(fish: TankFish): boolean {
  if (fish.dead) return false;
  const max = fishHealthMax(fish);
  if (max < MATE_GROWTH_MAX) return false;
  return fish.health >= mateMinHealth(fish);
}

export function applyBirthExhaustion(female: TankFish): void {
  female.health = Math.max(0, female.health - 10);
  if (female.health <= 0) female.dead = true;
}

export function applyMateExhaustion(male: TankFish, female: TankFish, _day: number): void {
  male.health = Math.max(0, male.health - MALE_MATE_HEALTH_COST);
  if (male.health <= 0) male.dead = true;
  applyBirthExhaustion(female);
}

export function mateBlockReason(fish: TankFish): string {
  const max = fishHealthMax(fish);
  if (max < MATE_GROWTH_MAX) return "鱼苗还没长大，不能交配";
  const need = mateMinHealth(fish);
  if (fish.health < need) return `健康要满 ${need} 才能交配（当前 ${fish.health}）`;
  return "还不能交配";
}

/** 喂食：未长成鱼各 +1 上限与 +1 健康；成鱼仅 +1 健康。 */
export function applyFeedGrowth(fish: TankFish): void {
  const max = fishHealthMax(fish);
  if (max < ADULT_HEALTH_MAX) {
    fish.healthMax = Math.min(ADULT_HEALTH_MAX, max + 1);
    fish.health = Math.min(fish.healthMax, fish.health + 1);
    syncAdultBodyBulk(fish);
    return;
  }
  fish.health = Math.min(ADULT_HEALTH_MAX, fish.health + 1);
}

/** 健康满时每天 +2 上限（未长成）。 */
export function applyDailyGrowthWhenFull(fish: TankFish): void {
  const max = fishHealthMax(fish);
  if (max >= ADULT_HEALTH_MAX) return;
  if (fish.health < max) return;
  fish.healthMax = Math.min(ADULT_HEALTH_MAX, max + 2);
  syncAdultBodyBulk(fish);
}

export const MALE_MATE_HEALTH_COST = 5;

export function fishFeedSatietyMax(fish: TankFish): number {
  const max = fishHealthMax(fish);
  if (max < MATE_GROWTH_MAX) return 15;
  if (max < ADULT_HEALTH_MAX) return 20;
  return 10;
}

export function resetFishFeedSatietyIfNewDay(fish: TankFish, day: number): void {
  if (fish.feedSatietyDay !== day) {
    fish.feedSatiety = 0;
    fish.feedSatietyDay = day;
  }
}

export function canFeedFishToday(fish: TankFish, day: number): boolean {
  resetFishFeedSatietyIfNewDay(fish, day);
  return (fish.feedSatiety ?? 0) < fishFeedSatietyMax(fish);
}

export function addFishFeedSatiety(fish: TankFish, day: number): boolean {
  resetFishFeedSatietyIfNewDay(fish, day);
  const cap = fishFeedSatietyMax(fish);
  const used = fish.feedSatiety ?? 0;
  if (used >= cap) return false;
  fish.feedSatiety = used + 1;
  fish.feedSatietyDay = day;
  fish.lastFedDay = day;
  return true;
}

export function fishFedToday(fish: TankFish, day: number): boolean {
  resetFishFeedSatietyIfNewDay(fish, day);
  return (fish.feedSatiety ?? 0) > 0;
}

export function newbornFishStats(): Pick<TankFish, "health" | "healthMax" | "mateRestUntilDay"> {
  return {
    health: JUVENILE_START_MAX,
    healthMax: JUVENILE_START_MAX,
    mateRestUntilDay: 0,
  };
}
