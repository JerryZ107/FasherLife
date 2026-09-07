import { FISH_BY_ID } from "../data/fishDefs";
import { QUALITY_ORDER, type Quality, type Sex } from "../types";
import type { SaveData, TankEgg, TankFish } from "../save/saveSchema";
import { sexFromUid } from "./sex";
import { rollLoveView, rollPersonality } from "./traits";

export const HATCH_GOLD: Record<Quality, number> = {
  common: 5,
  fine: 20,
  rare: 60,
  precious: 150,
  ultimate: 400,
};
export const HATCH_PEARL = 1;

function qualityRank(q: Quality): number {
  return QUALITY_ORDER.indexOf(q);
}

export function fishSex(fish: TankFish): Sex {
  return fish.sex ?? sexFromUid(fish.uid);
}

export function hatchGoldForParents(defA: string, defB: string): number {
  const qa = FISH_BY_ID[defA]?.quality ?? "common";
  const qb = FISH_BY_ID[defB]?.quality ?? "common";
  const higher = qualityRank(qa) >= qualityRank(qb) ? qa : qb;
  return HATCH_GOLD[higher];
}

export function hatchDaysForParents(defA: string, defB: string): number {
  const qa = FISH_BY_ID[defA]?.quality ?? "common";
  const qb = FISH_BY_ID[defB]?.quality ?? "common";
  const higher = qualityRank(qa) >= qualityRank(qb) ? qa : qb;
  return qualityRank(higher) >= qualityRank("rare") ? 6 : 7;
}

/** 子代种类 50/50 像某一亲本。 */
export function pickOffspringDefId(parentA: string, parentB: string): string {
  return Math.random() < 0.5 ? parentA : parentB;
}

/** 产卵时写入孵化倒计时。 */
export function scheduleEggHatch(egg: TankEgg, laidDay: number): void {
  if (!egg.defId) egg.defId = pickOffspringDefId(egg.parentA, egg.parentB);
  egg.started = true;
  egg.readyDay = laidDay + hatchDaysForParents(egg.parentA, egg.parentB);
}

function clearPairFields(f: TankFish): void {
  f.pairId = null;
  f.gestationLeft = 0;
  f.scentLayAt = 0;
  f.layCount = 0;
}

/** 旧存档配偶关系清理：移缸、死亡、放生时解除。 */
export function breakPair(save: SaveData, uid: string): void {
  const fish = save.tank.find((f) => f.uid === uid);
  if (!fish?.pairId) return;
  const pid = fish.pairId;
  for (const f of save.tank) {
    if (f.pairId === pid) clearPairFields(f);
  }
}

function dropOrphanPairs(save: SaveData): void {
  const counts = new Map<string, number>();
  for (const f of save.tank) {
    if (!f.pairId) continue;
    counts.set(f.pairId, (counts.get(f.pairId) ?? 0) + 1);
  }
  for (const f of save.tank) {
    if (f.pairId && (counts.get(f.pairId) ?? 0) < 2) clearPairFields(f);
  }
}

/** 每个游戏天：自动配偶已停用（ADR-015 #进阶方案），仅清理孤儿配偶。 */
export function tickPairsAndEggs(save: SaveData, _endingDay: number): { pairs: number; eggs: number } {
  dropOrphanPairs(save);
  return { pairs: 0, eggs: 0 };
}

export function rollOffspringTraits() {
  return {
    sex: (Math.random() < 0.5 ? "male" : "female") as Sex,
    personality: rollPersonality(),
    loveView: rollLoveView(),
  };
}
