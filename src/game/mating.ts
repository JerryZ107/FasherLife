import { genUid } from "./fishingLogic";
import {
  canMateFish,
  mateBlockReason,
  applyMateExhaustion,
} from "./growth";
import { breakPair, fishSex, hatchDaysForParents, pickOffspringDefId } from "./pairing";
import type { SaveData, TankEgg, TankFish } from "../save/saveSchema";

export const MATE_MIN_HEALTH = 96;

/** 母鱼一次产卵数量分布。 */
export function rollEggLayCount(): number {
  const r = Math.random();
  if (r < 0.4) return 1;
  if (r < 0.7) return 2;
  if (r < 0.9) return 3;
  if (r < 0.95) return 4;
  if (r < 0.98) return 5;
  return 6;
}

export function canSelectForMating(fish: TankFish): boolean {
  return canMateFish(fish);
}

/** 配偶模式下点选第一条鱼时的拦截原因。 */
export function mateSelectBlockReason(fish: TankFish): string | null {
  if (fish.dead) return "死鱼不能交配";
  if (!canMateFish(fish)) return mateBlockReason(fish);
  return null;
}

export function mateRefuseReason(a: TankFish, b: TankFish, _gameDay: number): string | null {
  if (a.uid === b.uid) return "要选两条不同的鱼";
  if (a.dead || b.dead) return "死鱼不能交配";
  if (a.tankId !== b.tankId) return "要在同一鱼缸里";
  if (fishSex(a) === fishSex(b)) return "要一公一母";
  if (!canMateFish(a)) return mateBlockReason(a);
  if (!canMateFish(b)) return mateBlockReason(b);
  return null;
}

export function femaleInPair(a: TankFish, b: TankFish): TankFish {
  return fishSex(a) === "female" ? a : b;
}

export function layMatingEggs(
  save: SaveData,
  a: TankFish,
  b: TankFish,
  day: number,
  spawn?: { x: number },
): { laid: number; reason?: string } {
  const refuse = mateRefuseReason(a, b, day);
  if (refuse) return { laid: 0, reason: refuse };
  const tankId = a.tankId;
  const count = rollEggLayCount();
  if (count <= 0) return { laid: 0 };
  const male = fishSex(a) === "male" ? a : b;
  const female = femaleInPair(a, b);
  for (let i = 0; i < count; i++) {
    const defId = pickOffspringDefId(male.defId, female.defId);
    const hatchDays = hatchDaysForParents(male.defId, female.defId);
    const egg: TankEgg = {
      uid: genUid("e"),
      tankId,
      pairId: genUid("p"),
      parentA: male.defId,
      parentB: female.defId,
      parentAUid: male.uid,
      parentBUid: female.uid,
      defId,
      laidDay: day,
      readyDay: day + hatchDays,
      started: true,
      customName: null,
      spawnX: spawn ? spawn.x + (i - (count - 1) / 2) * 5 : undefined,
    };
    save.eggs.push(egg);
  }
  applyMateExhaustion(male, female, day);
  if (female.dead) breakPair(save, female.uid);
  if (male.dead) breakPair(save, male.uid);
  return { laid: count };
}

export function eggSpeciesName(egg: TankEgg): string {
  const id = egg.defId ?? egg.parentA;
  return id;
}

export function attractantCountByDef(lots: SaveData["attractantLots"], defId: string): number {
  return (lots ?? []).filter((l) => l.defId === defId).length;
}

export function stockFromLots(lots: SaveData["attractantLots"]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of lots ?? []) {
    out[l.defId] = (out[l.defId] ?? 0) + 1;
  }
  return out;
}
