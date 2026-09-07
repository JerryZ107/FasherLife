import type { Quality } from "../types";
import { FISH_BY_ID } from "../data/fishDefs";
import { STOOL_BY_ID } from "../data/equipmentDefs";
import type { SaveData } from "../save/saveSchema";

export const PLAYER_LEVEL_MAX = 30;
export const STAMINA_BASE = 100;
export const STAMINA_PER_LEVEL = 10;
export const REGEN_SEC_START = 480;
export const REGEN_SEC_MIN = 120;
export const SALT_PRICE = 1;
export const SALT_PACK_SIZE = 10;
export const STARTER_SALT = 10;
export const ENERGY_DRINK_PRICE = 1;
export const ENERGY_DRINK_STAMINA = 40;
export const YUANQI_FILL = 50;
export const YUANQI_RESTORE = 50;
export const YUANQI_MAX = 3;
export const COOK_SALT_COST = 1;
export const QUEST_SALT_GIFT = 10;
export const DISH_SHELF_DAYS = 3;
/** 两道菜之间的现实间隔。能量饮料 / 元气瓶不受此限。 */
export const DISH_EAT_INTERVAL_MS = 5 * 60 * 1000;

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
  const lv = Math.min(PLAYER_LEVEL_MAX, Math.max(1, level));
  // 1→2 需 100；引导线任务合计 ~88 + 钓鱼 ~20 ≈ 刚升 2 级（见 ADR-016）
  return 60 + lv * 40;
}

export function satietyMax(_level?: number): number {
  return 3;
}

export function satietyLeft(save: SaveData): { used: number; max: number; left: number } {
  const max = satietyMax(save.playerLevel);
  const used = save.satietyDay === save.gameDay ? save.satietyUsed : 0;
  return { used, max, left: Math.max(0, max - used) };
}

/** 每吃一道 +33%，第三次起满格。 */
export function satietyPercent(used: number, max = 3): number {
  if (used <= 0) return 0;
  if (used >= max) return 100;
  return used * 33;
}

/** 顶栏 / 道具页：未满显示饱腹值%，满了说无法再进食。 */
export function satietyHint(save: SaveData): string {
  const { used, max, left } = satietyLeft(save);
  if (left <= 0) return "无法再进食";
  return `饱腹值 ${satietyPercent(used, max)}%`;
}

export function dishEatWaitMs(lastAteAt: number | undefined, now: number): number {
  if (!lastAteAt) return 0;
  return Math.max(0, lastAteAt + DISH_EAT_INTERVAL_MS - now);
}

export function formatWait(ms: number): string {
  const s = Math.max(1, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r} 秒`;
  return r ? `${m} 分 ${r} 秒` : `${m} 分`;
}

export function idleStaminaCostForDef(defId: string, stoolId?: string): number {
  const def = FISH_BY_ID[defId];
  const q = def?.quality ?? "common";
  const [lo, hi] = IDLE_STAMINA_RANGE[q];
  let h = 0;
  for (let i = 0; i < defId.length; i++) h = (h * 31 + defId.charCodeAt(i)) >>> 0;
  const base = lo + (h % (hi - lo + 1));
  const discount = stoolId ? (STOOL_BY_ID[stoolId]?.idleStaminaDiscount ?? 0) : 0;
  return Math.max(1, Math.ceil(base * (1 - discount)));
}

export function cookRestore(defId: string, firstOfDay: boolean): number {
  const base = Math.ceil(idleStaminaCostForDef(defId) * 1.5);
  return firstOfDay ? Math.ceil(base * 1.5) : base;
}

export function dishExpired(cookedDay: number, gameDay: number): boolean {
  return gameDay >= cookedDay + DISH_SHELF_DAYS;
}

export function dishDaysLeft(cookedDay: number, gameDay: number): number {
  return Math.max(0, cookedDay + DISH_SHELF_DAYS - gameDay);
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

export function grantQuestXp(save: SaveData, amount: number): { from: number; to: number } {
  if (save.playerLevel >= PLAYER_LEVEL_MAX || amount <= 0) {
    return { from: save.playerLevel, to: save.playerLevel };
  }
  const from = save.playerLevel;
  save.playerXp += amount;
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

export function grantCatchXp(save: SaveData, quality: Quality): { from: number; to: number } {
  if (save.playerLevel >= PLAYER_LEVEL_MAX) return { from: save.playerLevel, to: save.playerLevel };
  const from = save.playerLevel;
  const xpBonus = STOOL_BY_ID[save.equipped.stool]?.catchXpBonus ?? 0;
  const gained = Math.round((XP_CATCH[quality] ?? 8) * (1 + xpBonus));
  save.playerXp += gained;
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
