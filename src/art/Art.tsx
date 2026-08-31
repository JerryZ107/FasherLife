import { ART, type GearIconKind } from "./assets";
import { FISH_BY_ID } from "../data/fishDefs";
import { useGame } from "../store/gameStore";
import PersonView from "./PersonView";
import type { Sex } from "../types";
import type { JunkKind } from "../data/junkDefs";

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

export function JunkMark({ kind, size = 48 }: { kind: JunkKind; size?: number }) {
  return (
    <span className={`junk-mark is-${kind}`} style={{ width: size, height: size }} aria-hidden>
      {kind === "bottle" && (
        <svg viewBox="0 0 48 48" width={size} height={size}>
          <rect x="20" y="6" width="8" height="7" rx="1.5" fill="#c4a574" />
          <path d="M18 13h12l3 6v19a6 6 0 0 1-6 6H21a6 6 0 0 1-6-6V19l3-6z" fill="#7eb8c9" />
          <path d="M19 20h10v6H19z" fill="#e8f4f8" opacity="0.55" />
          <rect x="18" y="13" width="12" height="3" rx="1" fill="#8b5a2b" />
        </svg>
      )}
      {kind === "bag" && (
        <svg viewBox="0 0 48 48" width={size} height={size}>
          <path d="M14 18h20l-2 22H16L14 18z" fill="#d7e4ea" />
          <path d="M18 18c0-6 12-6 12 0" fill="none" stroke="#8aa0aa" strokeWidth="2.4" />
          <path d="M16 28h16" stroke="#b7c6ce" strokeWidth="2" />
        </svg>
      )}
      {kind === "weed" && (
        <svg viewBox="0 0 48 48" width={size} height={size}>
          <path d="M24 42c0-16-8-22-14-28 8 2 14 10 16 20 2-12 10-18 16-22-8 8-12 16-12 30z" fill="#3d8f5a" />
          <path d="M24 42c-2-12 4-20 10-26-2 10-6 16-10 26z" fill="#62b56f" />
        </svg>
      )}
    </span>
  );
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
