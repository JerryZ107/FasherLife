import { FISH_BY_ID } from "../data/fishDefs";
import type { SaveData } from "../save/saveSchema";

/** 图鉴点亮：永久写入存档，卖鱼/放生后仍保留。 */
export function unlockFishEncyclopedia(save: SaveData, defId: string): void {
  if (!FISH_BY_ID[defId] || save.caughtFishIds.includes(defId)) return;
  save.caughtFishIds = [...save.caughtFishIds, defId];
}

/** 把当前缸/筐里见过的鱼种并入图鉴（迁移与读档补全）。 */
export function syncDiscoveredFishIds(save: SaveData): void {
  const ids = new Set(save.caughtFishIds);
  for (const f of save.tank) {
    if (FISH_BY_ID[f.defId]) ids.add(f.defId);
  }
  for (const b of save.basket) {
    if (FISH_BY_ID[b.defId]) ids.add(b.defId);
  }
  save.caughtFishIds = [...ids];
}
