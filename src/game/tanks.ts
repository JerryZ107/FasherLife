import type { Quality, Personality, LoveView, Sex } from "../types";
import type { PlayerTank, SaveData, TankFish, TankEgg, BasketFish } from "../save/saveSchema";
import { capacityForQuality } from "../data/tankDefs";
import { ADULT_HEALTH_MAX, CAUGHT_FISH_HEALTH, MATE_GROWTH_MAX } from "./growth";

export const STARTER_TANK_ID = "tank_a";
export const STARTER_TANK_QUALITY: Quality = "common";
export const STARTER_TANK_CAPACITY = capacityForQuality(STARTER_TANK_QUALITY);
/** 起始水族馆只能放一口缸。 */
export const STARTER_TANK_SLOTS = 1;
/** 每次扩建增加的缸位数。 */
export const EXPAND_STEP = 1;
export const EXPAND_GOLD = 120;
export const EXPAND_MS = 3000;

/** 主缸视口：普通 1 屏，优良及以上 2 屏可左右拖动。 */
export function tankViewSpan(quality: Quality): 1 | 2 {
  return quality === "common" ? 1 : 2;
}

export function starterTanks(): PlayerTank[] {
  return [
    {
      id: STARTER_TANK_ID,
      name: "鱼缸 A",
      quality: STARTER_TANK_QUALITY,
      capacity: STARTER_TANK_CAPACITY,
      decor: "none",
      tankAttractUntilDay: 0,
      tankAttractBonus: 0,
    },
  ];
}

/** 新存档赠送的 3 条普通鱼（2 公 1 母）：高冷 / 暴躁 / 胆小各一，用于引导喂食与卖鱼。 */
export function starterFish(): TankFish[] {
  const now = Date.now();
  const make = (
    uid: string,
    defId: string,
    sex: Sex,
    personality: Personality,
    loveView: LoveView = "any",
  ): TankFish => ({
    uid,
    defId,
    health: CAUGHT_FISH_HEALTH,
    healthMax: ADULT_HEALTH_MAX,
    mateRestUntilDay: 0,
    dead: false,
    lastFedDay: -1,
    lastSettledAt: now,
    sex,
    pairId: null,
    tankId: STARTER_TANK_ID,
    attractUntilDay: 0,
    attractBonus: 0,
    personality,
    loveView,
    gestationLeft: 0,
    scentLayAt: 0,
    layCount: 0,
    affection: 0,
    customName: null,
    petDay: -1,
    petCount: 0,
  });
  return [
    make("s_minnow", "minnow", "male", "aloof"),
    make("s_black_carp", "black_carp", "male", "hot"),
    make("s_puffer", "puffer", "female", "timid"),
  ];
}

/** 新存档不赠送鱼卵。 */
export function starterEggs(): TankEgg[] {
  return [];
}

export function tankLetter(index: number): string {
  return String.fromCharCode("A".charCodeAt(0) + index);
}

export function nextTankName(existing: PlayerTank[]): string {
  return `鱼缸 ${tankLetter(existing.length)}`;
}

export function emptyTank(id: string, name: string, quality: Quality, decor: PlayerTank["decor"] = "none"): PlayerTank {
  return { id, name, quality, capacity: capacityForQuality(quality), decor, tankAttractUntilDay: 0, tankAttractBonus: 0 };
}

/** 保证凹槽数组长度与 tankSlots 一致。 */
export function ensureTankSlotArray(save: SaveData): (string | null)[] {
  const slots = [...save.tankSlotIds];
  while (slots.length < save.tankSlots) slots.push(null);
  return slots.slice(0, save.tankSlots);
}

export function placedTankIds(save: SaveData): string[] {
  return ensureTankSlotArray(save).filter((id): id is string => id != null);
}

export function placedTanks(save: SaveData): PlayerTank[] {
  return placedTankIds(save)
    .map((id) => tankById(save, id))
    .filter((t): t is PlayerTank => Boolean(t));
}

export function slotIndexOfTank(save: SaveData, tankId: string): number {
  return ensureTankSlotArray(save).findIndex((id) => id === tankId);
}

export function hasEmptySlot(save: SaveData): boolean {
  return ensureTankSlotArray(save).some((id) => id == null);
}

export function countPlacedSlots(save: SaveData): number {
  return placedTankIds(save).length;
}

/** 是否还有空凹槽可摆缸。 */
export function hasFreeTankSlot(save: SaveData): boolean {
  return hasEmptySlot(save);
}

export function firstEmptySlotIndex(save: SaveData): number {
  return ensureTankSlotArray(save).findIndex((id) => id == null);
}

export function unplacedTanks(save: SaveData): PlayerTank[] {
  const placed = new Set(placedTankIds(save));
  return save.tanks.filter((t) => !placed.has(t.id));
}

export function isTankPlaced(save: SaveData, tankId: string): boolean {
  return placedTankIds(save).includes(tankId);
}

export function tankById(save: SaveData, tankId: string): PlayerTank | undefined {
  return save.tanks.find((t) => t.id === tankId);
}

export function migrateTankSlotIds(tanks: PlayerTank[], tankSlots: number, raw: unknown): (string | null)[] {
  if (Array.isArray(raw)) {
    const slots = raw.map((x) => (x == null || x === "" ? null : String(x)));
    while (slots.length < tankSlots) slots.push(null);
    return slots.slice(0, tankSlots);
  }
  const slots: (string | null)[] = Array.from({ length: tankSlots }, () => null);
  tanks.forEach((t, i) => {
    if (i < tankSlots) slots[i] = t.id;
  });
  return slots;
}

export const ALL_TANKS = "all";

export function livingInFilter(save: SaveData, tankFilter: string) {
  return save.tank.filter((f) => !f.dead && (tankFilter === ALL_TANKS || f.tankId === tankFilter));
}

/** 鱼苗不占缸容量；小鱼（上限≥60）与成鱼计入。 */
export function fishCountsTowardTankCapacity(fish: Pick<TankFish, "dead" | "healthMax">): boolean {
  if (fish.dead) return false;
  return (fish.healthMax ?? ADULT_HEALTH_MAX) >= MATE_GROWTH_MAX;
}

export function basketFishCountsTowardCapacity(bf: Pick<BasketFish, "healthMax">): boolean {
  return (bf.healthMax ?? ADULT_HEALTH_MAX) >= MATE_GROWTH_MAX;
}

export function capacityNeedForFishUids(save: SaveData, uids: string[]): number {
  return save.tank.filter((f) => uids.includes(f.uid) && fishCountsTowardTankCapacity(f)).length;
}

export function occupancy(save: SaveData, tankId: string): number {
  return save.tank.filter((f) => f.tankId === tankId && fishCountsTowardTankCapacity(f)).length;
}

export function tankHasRoom(save: SaveData, tankId: string, extra = 1): boolean {
  const tank = tankById(save, tankId);
  if (!tank) return false;
  return occupancy(save, tankId) + extra <= tank.capacity;
}

export function inferQualityFromCapacity(capacity: number): Quality {
  if (capacity >= 24) return "ultimate";
  if (capacity >= 18) return "precious";
  if (capacity >= 14) return "rare";
  if (capacity >= 10) return "fine";
  return "common";
}
