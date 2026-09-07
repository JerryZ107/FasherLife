import { PART_BY_ID, PLAYER_SLIDER_BASE, ROD_BY_ID, STARTER_PARTS } from "../data/equipmentDefs";
import { bookSliderBonus } from "../data/bookDefs";
import type { RodPartSlot } from "../types";

/** 上钩窗口里，浮漂数值之外留给玩家的底（ADR-019）。 */
export const BITE_GRACE_MS = 1800;

/** 手杆系数乘四件组件；玩家滑块 = 底值 × 手杆系数 + 书籍加成（ADR-019）。 */
export function resolvedGear(
  rodId: string | undefined,
  parts: Record<RodPartSlot, string> | undefined,
  _stoolId: string,
  ownedBooks: string[] = [],
) {
  const c = ROD_BY_ID[rodId ?? ""]?.coefficient ?? 1;
  const equipped = parts ?? STARTER_PARTS;
  const reel = PART_BY_ID[equipped.reel];
  const line = PART_BY_ID[equipped.line];
  const hook = PART_BY_ID[equipped.hook];
  const float = PART_BY_ID[equipped.float];
  return {
    coefficient: c,
    sensitivity: (reel?.stat ?? 1) * c,
    progressRate: (line?.stat ?? 1) * c,
    fishSliderBonus: (hook?.stat ?? 0) * c,
    reactionWindow: (float?.stat ?? 1200) * c,
    playerSliderSize: PLAYER_SLIDER_BASE * c + bookSliderBonus(ownedBooks),
  };
}

export function biteReactMs(reactionWindow: number) {
  return Math.round(BITE_GRACE_MS + reactionWindow);
}
