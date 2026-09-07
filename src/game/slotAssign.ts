import type { SaveData } from "../save/saveSchema";
import { FISH_BY_ID } from "../data/fishDefs";
import { basketFits, genUid } from "./fishingLogic";
import { breakPair } from "./pairing";
import { ensureTankSlotArray, occupancy, tankById } from "./tanks";

export type SlotOverflow = {
  slotIndex: number;
  fromTankId: string;
  toTankId: string;
  fishUids: string[];
  capacity: number;
};

export function livingFishInTank(save: SaveData, tankId: string) {
  return save.tank.filter((f) => f.tankId === tankId && !f.dead);
}

export function checkSlotAssignOverflow(
  save: SaveData,
  slotIndex: number,
  toTankId: string,
): SlotOverflow | null {
  const slots = ensureTankSlotArray(save);
  const fromTankId = slots[slotIndex];
  if (!fromTankId || fromTankId === toTankId) return null;
  const toTank = tankById(save, toTankId);
  if (!toTank) return null;
  const fish = livingFishInTank(save, fromTankId);
  const used = occupancy(save, fromTankId);
  if (used <= toTank.capacity) return null;
  return {
    slotIndex,
    fromTankId,
    toTankId,
    fishUids: fish.map((f) => f.uid),
    capacity: toTank.capacity,
  };
}

export function ensureActivePlacedTank(save: SaveData) {
  const placed = ensureTankSlotArray(save).filter((id): id is string => id != null);
  if (placed.length === 0) return;
  if (!placed.includes(save.activeTankId)) save.activeTankId = placed[0];
}

export function applySlotAssign(
  save: SaveData,
  slotIndex: number,
  toTankId: string | null,
  basketUids: string[] = [],
): { ok: boolean; reason?: string } {
  const slots = ensureTankSlotArray(save);
  const fromTankId = slots[slotIndex] ?? null;

  if (toTankId === null) {
    slots[slotIndex] = null;
    save.tankSlotIds = slots;
    ensureActivePlacedTank(save);
    return { ok: true };
  }

  const toTank = tankById(save, toTankId);
  if (!toTank) return { ok: false, reason: "鱼缸不存在" };

  if (fromTankId !== toTankId && fromTankId) {
    for (const uid of basketUids) {
      const f = save.tank.find((x) => x.uid === uid && x.tankId === fromTankId && !x.dead);
      if (!f) continue;
      const def = FISH_BY_ID[f.defId];
      if (!def || !basketFits(save, def)) {
        return { ok: false, reason: "鱼筐放不下选中的鱼" };
      }
      breakPair(save, uid);
      save.basket.push({
        uid: genUid("b"),
        defId: f.defId,
        personality: f.personality,
        loveView: f.loveView,
        sex: f.sex,
        health: f.health,
        healthMax: f.healthMax,
        bodyBulk: f.bodyBulk,
        lastFedDay: f.lastFedDay,
        affection: f.affection,
        customName: f.customName,
      });
      save.tank = save.tank.filter((x) => x.uid !== uid);
    }

    const used = occupancy(save, fromTankId);
    if (used > toTank.capacity) {
      return { ok: false, reason: "鱼儿数量超出新鱼缸容量！" };
    }

    for (const f of save.tank) {
      if (f.tankId === fromTankId && !f.dead) f.tankId = toTankId;
    }
    for (const egg of save.eggs) {
      if (egg.tankId === fromTankId) egg.tankId = toTankId;
    }
  }

  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === toTankId) slots[i] = null;
  }
  slots[slotIndex] = toTankId;
  save.tankSlotIds = slots;
  save.activeTankId = toTankId;
  ensureActivePlacedTank(save);
  return { ok: true };
}
