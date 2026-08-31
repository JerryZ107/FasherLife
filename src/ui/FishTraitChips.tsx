import { ownsFishManual } from "../data/bookDefs";
import { LOVE_VIEW_LABEL, type LoveView, type Sex } from "../types";

/**
 * 性别已改为常驻 ♂/♀ 圆框图标（见 SexIcon，跟在鱼名后），不再在此渲染。
 * 此处仅保留配偶观 chip，仍需持有「养鱼手册」才显示。性格永不打标签。
 * sex 入参保留以兼容旧调用，但不再渲染。
 */
export default function FishTraitChips({
  loveView,
  ownedBooks,
}: {
  sex?: Sex | null;
  loveView?: LoveView | null;
  ownedBooks: string[] | undefined;
}) {
  if (!ownsFishManual(ownedBooks)) return null;
  return <>{loveView ? <span className="chip">{LOVE_VIEW_LABEL[loveView]}</span> : null}</>;
}
