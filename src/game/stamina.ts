import type { Quality } from "../types";
import { FISH_BY_ID } from "../data/fishDefs";
import type { SaveData } from "../save/saveSchema";

export const PLAYER_LEVEL_MAX = 30;
export const STAMINA_BASE = 100;
export const STAMINA_PER_LEVEL = 10;
export const REGEN_SEC_START = 480;
export const REGEN_SEC_MIN = 120;
export const SALT_PRICE = 1;
export const STARTER_SALT = 10;
export const ENERGY_DRINK_PRICE = 30;
export const ENERGY_DRINK_STAMINA = 40;
export const YUANQI_FILL = 50;
export const YUANQI_RESTORE = 50;
export const YUANQI_MAX = 3;
export const COOK_SALT_COST = 1;
export const QUEST_SALT_GIFT = 10;

export const IDLE_STAMINA_RANGE: Record<Quality, [number, number]> = {
  common: [6, 10],
  fine: [20, 30],
  rare: [60, 80],
  precious: [120, 200],
  ultimate: [240, 400],
};

export const XP_CATCH: Record<Quality, number> = {
  common: 8,
  fine: 20,
  rare: 50,
  precious: 120,
  ultimate: 300,
};

export function staminaCap(level: number): number {
  const lv = Math.min(PLAYER_LEVEL_MAX, Math.max(1, level));
  return STAMINA_BASE + STAMINA_PER_LEVEL * (lv - 1);
}

export function regenSecPerPoint(level: number): number {
  const lv = Math.min(PLAYER_LEVEL_MAX, Math.max(1, level));
  let sec = REGEN_SEC_START;
  for (let n = 2; n <= lv; n++) {
    if (n <= 5) sec -= 4;
    else if (n <= 15) sec -= 16;
    else if (n <= 25) sec -= 10;
    else if (n <= 29) sec -= 20;
    else sec -= 4;
  }
  return Math.max(REGEN_SEC_MIN, sec);
}

export function xpToNext(level: number): number {
  return 80 + (level - 1) * 40;
}

export function satietyMax(level: number): number {
  return 3 + Math.floor(Math.min(level, PLAYER_LEVEL_MAX) / 10);
}

export function idleStaminaCostForDef(defId: string): number {
  const def = FISH_BY_ID[defId];
  const q = def?.quality ?? "common";
  const [lo, hi] = IDLE_STAMINA_RANGE[q];
  let h = 0;
  for (let i = 0; i < defId.length; i++) h = (h * 31 + defId.charCodeAt(i)) >>> 0;
  return lo + (h % (hi - lo + 1));
}

export function cookRestore(defId: string, firstOfDay: boolean): number {
  const base = Math.ceil(idleStaminaCostForDef(defId) * 1.5);
  return firstOfDay ? Math.ceil(base * 1.5) : base;
}

export function addStamina(save: SaveData, amount: number): void {
  if (amount <= 0) return;
  const cap = staminaCap(save.playerLevel);
  const room = Math.max(0, cap - save.stamina);
  if (amount <= room) {
    save.stamina += amount;
    return;
  }
  save.stamina = cap;
  const overflow = Math.floor((amount - room) * 0.5);
  if (overflow <= 0 || save.yuanqiBottles >= YUANQI_MAX) return;
  save.yuanqiProgress += overflow;
  while (save.yuanqiBottles < YUANQI_MAX && save.yuanqiProgress >= YUANQI_FILL) {
    save.yuanqiBottles += 1;
    save.yuanqiProgress -= YUANQI_FILL;
  }
  if (save.yuanqiBottles >= YUANQI_MAX) save.yuanqiProgress = 0;
}

export function applyStaminaRegen(save: SaveData, now: number): void {
  if (!save.staminaUpdatedAt) save.staminaUpdatedAt = now;
  const interval = regenSecPerPoint(save.playerLevel) * 1000;
  const elapsed = now - save.staminaUpdatedAt;
  if (elapsed < interval) return;
  const points = Math.floor(elapsed / interval);
  save.staminaUpdatedAt += points * interval;
  addStamina(save, points);
}

export function grantCatchXp(save: SaveData, quality: Quality): { from: number; to: number } {
  if (save.playerLevel >= PLAYER_LEVEL_MAX) return { from: save.playerLevel, to: save.playerLevel };
  const from = save.playerLevel;
  save.playerXp += XP_CATCH[quality] ?? 8;
  while (save.playerLevel < PLAYER_LEVEL_MAX && save.playerXp >= xpToNext(save.playerLevel)) {
    save.playerXp -= xpToNext(save.playerLevel);
    save.playerLevel += 1;
    if (save.playerLevel === PLAYER_LEVEL_MAX) {
      save.playerXp = 0;
      save.stamina = staminaCap(PLAYER_LEVEL_MAX);
    }
  }
  return { from, to: save.playerLevel };
}

export function resetSatietyIfNewDay(save: SaveData): void {
  if (save.satietyDay !== save.gameDay) {
    save.satietyUsed = 0;
    save.satietyDay = save.gameDay;
  }
}
