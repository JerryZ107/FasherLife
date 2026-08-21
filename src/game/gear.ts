import { PART_BY_ID, STARTER_PARTS, STOOL_BY_ID } from "../data/equipmentDefs";
import { bookSliderBonus } from "../data/bookDefs";
import type { RodPartSlot } from "../types";

/** 手杆系数增幅其余四件（ADR-012）；板凳单独加成玩家滑块。 */
export function resolvedGear(
  parts: Record<RodPartSlot, string> | undefined,
  stoolId: string,
  ownedBooks: string[] = [],
) {
  const equipped = parts ?? STARTER_PARTS;
  const handle = PART_BY_ID[equipped.handle];
  const c = handle?.slot === "handle" ? handle.stat : 1;
  const reel = PART_BY_ID[equipped.reel];
  const line = PART_BY_ID[equipped.line];
  const hook = PART_BY_ID[equipped.hook];
  const float = PART_BY_ID[equipped.float];
  const stool = STOOL_BY_ID[stoolId];
  return {
    sensitivity: (reel?.stat ?? 1) * c,
    progressRate: (line?.stat ?? 1) * c,
    fishSliderBonus: (hook?.stat ?? 0) * c,
    reactionWindow: (float?.stat ?? 1200) * c,
    playerSliderSize: 0.22 + (stool?.playerSliderBonus ?? 0) + bookSliderBonus(ownedBooks),
  };
}
