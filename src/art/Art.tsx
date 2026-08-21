import { ART, type GearIconKind } from "./assets";
import { FISH_BY_ID } from "../data/fishDefs";
import { useGame } from "../store/gameStore";
import PersonView from "./PersonView";
import type { Sex } from "../types";

export function FishPortrait({
  id,
  size = 72,
  locked = false,
  alt = "",
  blush = false,
}: {
  id: string;
  size?: number;
  locked?: boolean;
  alt?: string;
  blush?: boolean;
}) {
  const spriteId = FISH_BY_ID[id]?.spriteId ?? id;
  return (
    <span
      className={`fish-portrait ${locked ? "is-locked" : ""} ${blush ? "is-blush" : ""}`}
      style={{ width: size, height: size }}
    >
      <img src={ART.fish(spriteId)} alt={alt} draggable={false} />
    </span>
  );
}

export function GearIcon({ kind, size = 36 }: { kind: GearIconKind; size?: number }) {
  return <img className="gear-icon" src={ART.icon[kind]} width={size} height={size} alt="" />;
}

export function CharImg({
  className,
  outfitId,
  sex,
  size = 72,
}: {
  className?: string;
  outfitId?: string;
  sex?: Sex;
  size?: number;
}) {
  const equipped = useGame((s) => s.save.equippedOutfit);
  const lookSex = useGame((s) => s.save.lookSex);
  return (
    <PersonView
      className={className}
      outfitId={outfitId ?? equipped ?? "outfit_default"}
      sex={sex ?? lookSex ?? "male"}
      pose="stand"
      size={size}
    />
  );
}
