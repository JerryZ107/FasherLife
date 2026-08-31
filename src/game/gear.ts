import { PART_BY_ID, PLAYER_SLIDER_BASE, ROD_BY_ID, STARTER_PARTS, STOOL_BY_ID } from "../data/equipmentDefs";
import { bookSliderBonus } from "../data/bookDefs";
import type { RodPartSlot } from "../types";

/** 上钩窗口里，浮漂数值之外留给玩家的底（ADR-019）。 */
export const BITE_GRACE_MS = 1800;

/** 手杆系数乘四件组件（ADR-019）；板凳/书籍单独加成玩家滑块。 */
export function resolvedGear(
  rodId: string | undefined,
  parts: Record<RodPartSlot, string> | undefined,
  stoolId: string,
  ownedBooks: string[] = [],
) {
  const c = ROD_BY_ID[rodId ?? ""]?.coefficient ?? 1;
  const equipped = parts ?? STARTER_PARTS;
  const reel = PART_BY_ID[equipped.reel];
  const line = PART_BY_ID[equipped.line];
  const hook = PART_BY_ID[equipped.hook];
  const float = PART_BY_ID[equipped.float];
  const stool = STOOL_BY_ID[stoolId];
  return {
    coefficient: c,
    sensitivity: (reel?.stat ?? 1) * c,
    progressRate: (line?.stat ?? 1) * c,
    fishSliderBonus: (hook?.stat ?? 0) * c,
    reactionWindow: (float?.stat ?? 1200) * c,
    playerSliderSize: PLAYER_SLIDER_BASE + (stool?.playerSliderBonus ?? 0) + bookSliderBonus(ownedBooks),
  };
}

export function biteReactMs(reactionWindow: number) {
  return Math.round(BITE_GRACE_MS + reactionWindow);
}
