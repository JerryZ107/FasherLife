import { FISH_BY_ID } from "../data/fishDefs";
import { PAIR_CHANCE_CAP } from "../data/attractantDefs";
import { QUALITY_ORDER, type LoveView, type Quality, type Sex } from "../types";
import type { SaveData, TankEgg, TankFish } from "../save/saveSchema";
import { genUid } from "./fishingLogic";
import { sexFromUid } from "./sex";
import { rollLoveView, rollPersonality } from "./traits";

export const MAX_EGGS_PER_TANK = 6;
export const SCENT_LAY_MS = 5 * 60 * 1000;
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

export function loveViewOf(fish: TankFish): LoveView {
  return fish.loveView ?? "any";
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

export function pairRefuseReason(a: TankFish, b: TankFish): string | null {
  if (a.uid === b.uid) return "要选两条鱼";
  if (a.dead || b.dead) return "死鱼不能配对";
  if (a.tankId !== b.tankId) return "要在同一鱼缸里";
  if (fishSex(a) === fishSex(b)) return "要一公一母";
  if (a.pairId || b.pairId) return "已经有配偶了";
  return null;
}

export function attractBonusForPair(save: SaveData, a: TankFish, b: TankFish, day: number): number {
  const tank = save.tanks.find((t) => t.id === a.tankId);
  const tankBonus = tank && (tank.tankAttractUntilDay ?? 0) >= day ? (tank.tankAttractBonus ?? 0) : 0;
  const fishBonus = (f: TankFish) => ((f.attractUntilDay ?? 0) >= day ? (f.attractBonus ?? 0) : 0);
  return tankBonus + Math.max(fishBonus(a), fishBonus(b));
}

export function acceptLove(self: TankFish, other: TankFish): boolean {
  const view = loveViewOf(self);
  if (view === "none") return false;
  if (view === "any") return true;
  const qs = qualityRank(FISH_BY_ID[self.defId]?.quality ?? "common");
  const qo = qualityRank(FISH_BY_ID[other.defId]?.quality ?? "common");
  if (view === "peer") return qs === qo;
  return qo > qs;
}

export function loveRefuseReason(a: TankFish, b: TankFish): string | null {
  const va = loveViewOf(a);
  const vb = loveViewOf(b);
  if (va === "none" || vb === "none") return "拒绝配对";
  if (!acceptLove(a, b) || !acceptLove(b, a)) return "爱情观看不上";
  return null;
}

export function gestationDays(health: number): number | null {
  const h = Math.floor(health);
  if (h <= 60) return null;
  if (h <= 70) return 6;
  if (h <= 80) return 5;
  if (h <= 85) return 4;
  if (h <= 94) return 3;
  return 2;
}

export function pairMinHealth(a: TankFish, b: TankFish): number {
  return Math.min(a.health, b.health);
}

/**
 * 先硬过滤（含爱情观），再软骰。求偶香只加 p。
 */
export function rollPairAccept(
  a: TankFish,
  b: TankFish,
  bonus = 0,
): { ok: boolean; reason: string } {
  const hard = pairRefuseReason(a, b);
  if (hard) return { ok: false, reason: hard };
  const love = loveRefuseReason(a, b);
  if (love) return { ok: false, reason: love };

  const va = loveViewOf(a);
  const vb = loveViewOf(b);
  const qa = qualityRank(FISH_BY_ID[a.defId]?.quality ?? "common");
  const qb = qualityRank(FISH_BY_ID[b.defId]?.quality ?? "common");
  const sameSpecies = a.defId === b.defId;
  const bothAny = va === "any" && vb === "any";
  const qualityHard = va === "peer" || vb === "peer" || va === "aspire" || vb === "aspire";

  let p = 0.82;
  if (!bothAny && !sameSpecies) p -= 0.28;
  if (bothAny) {
    /* 不扣种类、不扣品质差 */
  } else if (qualityHard) {
    /* 品质已由爱情观硬过滤 */
  } else {
    p -= Math.abs(qa - qb) * 0.16;
  }
  p += bonus;
  p = Math.max(0.08, Math.min(PAIR_CHANCE_CAP, p));
  if (Math.random() < p) return { ok: true, reason: "" };
  return { ok: false, reason: "这回没看对眼" };
}

function clearPairFields(f: TankFish): void {
  f.pairId = null;
  f.gestationLeft = 0;
  f.scentLayAt = 0;
}

export function breakPair(save: SaveData, uid: string): void {
  const fish = save.tank.find((f) => f.uid === uid);
  if (!fish?.pairId) return;
  const pid = fish.pairId;
  for (const f of save.tank) {
    if (f.pairId === pid) clearPairFields(f);
  }
}

export function bindPair(save: SaveData, aUid: string, bUid: string): string {
  const pid = genUid("p");
  const a = save.tank.find((f) => f.uid === aUid);
  const b = save.tank.find((f) => f.uid === bUid);
  const days = a && b ? gestationDays(pairMinHealth(a, b)) : null;
  const left = days ?? 0;
  for (const f of save.tank) {
    if (f.uid === aUid || f.uid === bUid) {
      f.pairId = pid;
      f.gestationLeft = left;
      f.scentLayAt = 0;
    }
  }
  return pid;
}

export function uniquePairs(tank: TankFish[]): { pairId: string; a: TankFish; b: TankFish }[] {
  const map = new Map<string, TankFish[]>();
  for (const f of tank) {
    if (!f.pairId || f.dead) continue;
    const arr = map.get(f.pairId) ?? [];
    arr.push(f);
    map.set(f.pairId, arr);
  }
  const out: { pairId: string; a: TankFish; b: TankFish }[] = [];
  for (const [pairId, arr] of map) {
    if (arr.length < 2) continue;
    const sorted = [...arr].sort((x, y) => x.uid.localeCompare(y.uid));
    const a = sorted[0];
    const b = sorted[1];
    if (!a || !b) continue;
    out.push({ pairId, a, b });
  }
  return out;
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

function tryAutoPairTank(save: SaveData, tankId: string, day: number): number {
  const living = save.tank.filter((f) => !f.dead && f.tankId === tankId && !f.pairId);
  const males = living.filter((f) => fishSex(f) === "male").sort((a, b) => a.uid.localeCompare(b.uid));
  const females = living.filter((f) => fishSex(f) === "female").sort((a, b) => a.uid.localeCompare(b.uid));
  let n = 0;
  for (const m of males) {
    if (m.pairId) continue;
    if (loveViewOf(m) === "none") continue;
    for (const f of females) {
      if (f.pairId) continue;
      const bonus = attractBonusForPair(save, m, f, day);
      const roll = rollPairAccept(m, f, bonus);
      if (!roll.ok) continue;
      bindPair(save, m.uid, f.uid);
      n += 1;
      break;
    }
  }
  return n;
}

export function layEggForPair(save: SaveData, pair: { pairId: string; a: TankFish; b: TankFish }, day: number): boolean {
  const eggsHere = save.eggs.filter((e) => e.tankId === pair.a.tankId).length;
  if (eggsHere >= MAX_EGGS_PER_TANK) return false;
  const egg: TankEgg = {
    uid: genUid("e"),
    tankId: pair.a.tankId,
    pairId: pair.pairId,
    parentA: pair.a.defId,
    parentB: pair.b.defId,
    laidDay: day,
    readyDay: 0,
    started: false,
  };
  save.eggs.push(egg);
  const next = gestationDays(pairMinHealth(pair.a, pair.b)) ?? 0;
  pair.a.gestationLeft = next;
  pair.b.gestationLeft = next;
  pair.a.scentLayAt = 0;
  pair.b.scentLayAt = 0;
  return true;
}

function tickGestation(save: SaveData, tankId: string, day: number): number {
  let laid = 0;
  for (const pair of uniquePairs(save.tank.filter((f) => f.tankId === tankId))) {
    if (pair.a.dead || pair.b.dead) {
      breakPair(save, pair.a.uid);
      continue;
    }
    if ((pair.a.scentLayAt ?? 0) > 0 || (pair.b.scentLayAt ?? 0) > 0) continue;
    const h = pairMinHealth(pair.a, pair.b);
    if (h <= 60) continue;
    const target = gestationDays(h);
    if (target == null) continue;
    let left = pair.a.gestationLeft ?? 0;
    if (left <= 0) left = target;
    left = Math.min(left, target);
    left -= 1;
    if (left <= 0) {
      if (layEggForPair(save, pair, day)) laid += 1;
    } else {
      pair.a.gestationLeft = left;
      pair.b.gestationLeft = left;
    }
  }
  return laid;
}

/** 每个游戏天：先自动配对，再走孕期下卵。 */
export function tickPairsAndEggs(save: SaveData, endingDay: number): { pairs: number; eggs: number } {
  dropOrphanPairs(save);
  let pairs = 0;
  let eggs = 0;
  for (const tank of save.tanks) {
    pairs += tryAutoPairTank(save, tank.id, endingDay);
    eggs += tickGestation(save, tank.id, endingDay);
  }
  return { pairs, eggs };
}

function startScentLayOnFish(fish: TankFish, now: number): boolean {
  if (!fish.pairId || fish.dead) return false;
  fish.scentLayAt = now + SCENT_LAY_MS;
  fish.gestationLeft = 0;
  return true;
}

/** 金币香：已配对则开 5 分钟产卵。 */
export function scentBuyTimeForFish(save: SaveData, uid: string, now: number): boolean {
  const fish = save.tank.find((f) => f.uid === uid);
  if (!fish) return false;
  const ok = startScentLayOnFish(fish, now);
  if (!ok) return false;
  const mate = save.tank.find((f) => f.pairId === fish.pairId && f.uid !== fish.uid);
  if (mate) {
    mate.scentLayAt = fish.scentLayAt;
    mate.gestationLeft = 0;
  }
  return true;
}

/** 珍珠雾：缸内所有已配对的对开 5 分钟产卵。 */
export function scentBuyTimeForTank(save: SaveData, tankId: string, now: number): number {
  let n = 0;
  for (const pair of uniquePairs(save.tank.filter((f) => f.tankId === tankId))) {
    startScentLayOnFish(pair.a, now);
    pair.b.scentLayAt = pair.a.scentLayAt;
    pair.b.gestationLeft = 0;
    n += 1;
  }
  return n;
}

/** 现实时间到点下卵。不走游戏天。 */
export function resolveScentLays(save: SaveData, now: number, day: number): number {
  let laid = 0;
  const seen = new Set<string>();
  for (const fish of save.tank) {
    if (!fish.scentLayAt || fish.scentLayAt > now || !fish.pairId || seen.has(fish.pairId)) continue;
    seen.add(fish.pairId);
    const mate = save.tank.find((f) => f.pairId === fish.pairId && f.uid !== fish.uid);
    if (!mate || fish.dead || mate.dead) {
      fish.scentLayAt = 0;
      if (mate) mate.scentLayAt = 0;
      continue;
    }
    const pair = { pairId: fish.pairId, a: fish, b: mate };
    if (layEggForPair(save, pair, day)) laid += 1;
  }
  return laid;
}

export function rollOffspringTraits() {
  return {
    sex: (Math.random() < 0.5 ? "male" : "female") as Sex,
    personality: rollPersonality(),
    loveView: rollLoveView(),
  };
}
