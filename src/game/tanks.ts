import type { Quality } from "../types";
import type { PlayerTank, SaveData } from "../save/saveSchema";
import { capacityForQuality } from "../data/tankDefs";

export const STARTER_TANK_ID = "tank_a";
export const STARTER_TANK_QUALITY: Quality = "common";
export const STARTER_TANK_CAPACITY = capacityForQuality(STARTER_TANK_QUALITY);
/** 起始水族馆只能放一口缸。 */
export const STARTER_TANK_SLOTS = 1;
/** 每次扩建增加的缸位数。 */
export const EXPAND_STEP = 1;
export const EXPAND_GOLD = 120;
export const EXPAND_DAYS = 2;
export const EXPAND_PEARL = 2;

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

export function tankLetter(index: number): string {
  return String.fromCharCode("A".charCodeAt(0) + index);
}

export function nextTankName(existing: PlayerTank[]): string {
  return `鱼缸 ${tankLetter(existing.length)}`;
}

export function emptyTank(id: string, name: string, quality: Quality, decor: PlayerTank["decor"] = "none"): PlayerTank {
  return { id, name, quality, capacity: capacityForQuality(quality), decor, tankAttractUntilDay: 0, tankAttractBonus: 0 };
}

export function hasFreeTankSlot(save: SaveData): boolean {
  return save.tanks.length < save.tankSlots;
}

export function tankById(save: SaveData, tankId: string): PlayerTank | undefined {
  return save.tanks.find((t) => t.id === tankId);
}

export function occupancy(save: SaveData, tankId: string): number {
  return save.tank.filter((f) => f.tankId === tankId).length;
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
