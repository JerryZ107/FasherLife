import { ownsFishManual } from "../data/bookDefs";
import { LOVE_VIEW_LABEL, SEX_LABEL, type LoveView, type Sex } from "../types";

/** 买了养鱼手册才显示性别和配偶观。性格永不打标签。 */
export default function FishTraitChips({
  sex,
  loveView,
  ownedBooks,
}: {
  sex?: Sex | null;
  loveView?: LoveView | null;
  ownedBooks: string[] | undefined;
}) {
  if (!ownsFishManual(ownedBooks)) return null;
  return (
    <>
      {sex ? <span className="chip">{SEX_LABEL[sex]}</span> : null}
      {loveView ? <span className="chip">{LOVE_VIEW_LABEL[loveView]}</span> : null}
    </>
  );
}
