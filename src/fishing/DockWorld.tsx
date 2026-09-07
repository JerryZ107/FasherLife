import PersonView, { type PersonMotion } from "../art/PersonView";
import { StickerGlyph } from "../ui/StickerGlyph";
import { FISH_BY_ID } from "../data/fishDefs";
import { fishWeightKg } from "../game/weight";
import { FishPortrait, GearIcon, JunkMark } from "../art/Art";
import { FISHING_SPOTS, type NeighborPresence, type NeighborState, type NeighborStatus } from "./neighbors";
import DockBackdrop from "./DockBackdrop";
import type { FishDef, Sex } from "../types";
import type { JunkKind } from "../data/junkDefs";
import type { CSSProperties } from "react";

export type Phase =
  | "pick"
  | "ready"
  | "casting"
  | "waiting"
  | "reeling"
  | "bite"
  | "minigame"
  | "idle_fight"
  | "result";

export const WORLD_VW = 340;

type Props = {
  pan: number;
  snapping: boolean;
  phase: Phase;
  spotId: string | null;
  neighbors: NeighborState[];
  playerFishId: string | null;
  playerJunkKind?: JunkKind | null;
  playerEscaped: boolean;
  onPickSpot: (id: string) => void;
  castPower?: number;
  playerOutfitId?: string;
  playerSex?: Sex;
  chargePower?: number;
  fisheryId?: string;
  playerPresence?: NeighborPresence;
  playerEmote?: string | null;
};

const SPARKS = [8, 15, 23, 32, 41, 50, 59, 68, 77, 86, 94];

export default function DockWorld({
  pan,
  snapping,
  phase,
  spotId,
  neighbors,
  playerFishId,
  playerJunkKind = null,
  playerEscaped,
  onPickSpot,
  castPower = 0.55,
  playerOutfitId,
  playerSex = "male",
  chargePower = 0,
  fisheryId = "village_pond",
  playerPresence = "online",
  playerEmote = null,
}: Props) {
  const bite = phase === "bite" || phase === "minigame" || phase === "idle_fight";
  const stream = fisheryId === "clear_stream";
  return (
    <div className="dock-view">
      <svg className="dock-sun-fixed" viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r="54" fill="#ffe08a" opacity="0.28" />
        <circle cx="60" cy="60" r="34" fill="#ffe9a8" />
        <circle cx="60" cy="60" r="24" fill="#fff6c8" />
        <circle cx="52" cy="54" r="8" fill="#fff" opacity="0.35" />
      </svg>
      <div
        className={`dock-world ${snapping ? "is-snap" : ""} is-${phase}${bite ? " is-hotwater" : ""}${stream ? " is-stream" : " is-pond"}`}
        style={{ width: `${WORLD_VW}%`, transform: `translateX(${-pan}px)` }}
      >
        <DockBackdrop hot={bite} variant={stream ? "stream" : "pond"} />
        <div className="dock-water-fx">
          <div className="dock-caustic" />
          <div className="dock-sheen" />
          {SPARKS.map((x, i) => (
            <span
              key={x}
              className="dock-spark"
              style={{ left: `${x}%`, top: `${16 + (i % 4) * 18}%`, animationDelay: `${i * 0.22}s` }}
            />
          ))}
          <span className="dock-bug a" />
          <span className="dock-bug b" />
        </div>

        {(() => {
          let seatMarked = false;
          return FISHING_SPOTS.map((s) => {
          const npc = neighbors.find((n) => n.spotId === s.id);
          const isPlayer = spotId === s.id;
          if (npc) {
            return (
              <Angler
                key={s.id}
                x={s.x}
                name={npc.name}
                outfitId={npc.outfitId}
                status={npc.status}
                presence={npc.presence}
                fishId={npc.status === "caught" ? npc.fishId : null}
                sex={npc.sex}
                castPower={0.52}
                emote={npc.emote}
              />
            );
          }
          const canSeat =
            phase === "pick" ||
            phase === "ready" ||
            phase === "waiting" ||
            phase === "idle_fight" ||
            phase === "result";
          if (isPlayer) {
            return (
              <Angler
                key={s.id}
                x={s.x}
                name="你"
                you
                status={playerStatus(phase, playerEscaped)}
                presence={playerPresence}
                fishId={playerFishId}
                junkKind={playerJunkKind}
                outfitId={playerOutfitId}
                sex={playerSex}
                castPower={castPower}
                chargePower={chargePower}
                emote={playerEmote}
              />
            );
          }
          return (
            <button
              key={s.id}
              className={`dock-empty ${canSeat ? "is-pickable" : ""}`}
              data-spot={s.id}
              data-guide={canSeat && !seatMarked ? ((seatMarked = true), "seat") : undefined}
              style={{ left: `${s.x}%` }}
              onClick={(e) => {
                e.stopPropagation();
                if (!canSeat) return;
                onPickSpot(s.id);
              }}
            >
              <span className="dock-hole" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <span className="dock-stool" />
              <span className="dock-bucket" />
              <span className="dock-empty-label">{canSeat ? (spotId ? "换座" : "坐下") : s.label}</span>
            </button>
          );
        });
        })()}
      </div>
    </div>
  );
}

export function worldWidthPx(viewW: number) {
  return (viewW * WORLD_VW) / 100;
}

export function panToSpotX(spotXPct: number, viewW: number) {
  const world = worldWidthPx(viewW);
  return Math.max(0, Math.min(world - viewW, (spotXPct / 100) * world - viewW / 2));
}

function playerStatus(phase: Phase, escaped: boolean): NeighborStatus | "casting" | "bite" | "ready" | "reeling" {
  if (phase === "casting") return "casting";
  if (phase === "waiting") return "waiting";
  if (phase === "reeling") return "reeling";
  if (phase === "bite") return "bite";
  if (phase === "minigame" || phase === "idle_fight") return "fighting";
  if (phase === "result") return escaped ? "missed" : "caught";
  return "ready";
}

function personMotion(
  status: NeighborStatus | "casting" | "bite" | "ready" | "reeling",
  charging: boolean,
): PersonMotion {
  if (charging) return "charging";
  if (status === "casting") return "casting";
  if (status === "reeling") return "reeling";
  if (status === "ready") return "ready";
  if (status === "bite" || status === "fighting") return "fight";
  if (status === "waiting") return "waiting";
  return "idle";
}

function catchFlyStyle(def: FishDef): CSSProperties {
  const kg = fishWeightKg(def);
  const radius = Math.round(20 + kg * 12);
  return {
    "--fish-r": `${radius}px`,
    "--arc-x": `${Math.round(22 + kg * 14)}px`,
    "--arc-y": `${Math.round(40 + kg * 18)}px`,
  } as CSSProperties;
}

function catchJunkStyle(): CSSProperties {
  return {
    "--fish-r": "22px",
    "--arc-x": "24px",
    "--arc-y": "42px",
  } as CSSProperties;
}

function presenceLabel(p: NeighborPresence): string {
  if (p === "idle") return "挂机";
  if (p === "offline") return "离线";
  return "在线";
}

function Angler({
  x,
  name,
  outfitId,
  sex,
  you,
  status,
  presence = "online",
  fishId,
  junkKind = null,
  castPower = 0.55,
  chargePower = 0,
  emote = null,
}: {
  x: number;
  name: string;
  outfitId?: string;
  sex: Sex;
  you?: boolean;
  status: NeighborStatus | "casting" | "bite" | "ready" | "reeling";
  presence?: NeighborPresence;
  fishId: string | null;
  junkKind?: JunkKind | null;
  castPower?: number;
  chargePower?: number;
  emote?: string | null;
}) {
  const fish = fishId ? FISH_BY_ID[fishId] : null;
  const showLanded = Boolean((fish || junkKind) && status === "caught");
  const showRod = status !== "caught";
  const showLine =
    status === "waiting" ||
    status === "fighting" ||
    status === "bite" ||
    status === "casting" ||
    status === "missed" ||
    status === "reeling";
  const charging = Boolean(you && status === "ready" && chargePower > 0);
  const style = {
    left: `${x}%`,
    "--cast": String(castPower),
    "--cast-ms": `${380 + castPower * 420}ms`,
    "--charge": String(chargePower),
  } as CSSProperties;
  return (
    <div className={`angler ${you ? "is-you" : ""} is-${status}${charging ? " is-charging" : ""}`} style={style}>
      <div className="angler-name">
        <span>{name}</span>
        <span className={`angler-presence is-${presence}`}>{presenceLabel(presence)}</span>
      </div>
      {status === "bite" && (
        <div className="angler-exclaim" aria-hidden>
          !
        </div>
      )}
      {emote && (
        <div className="angler-sticker" aria-hidden>
          <StickerGlyph id={emote === "..." ? "dots" : "other"} glyph={emote} />
        </div>
      )}
      {showLine && (
        <>
          <div className="angler-line" />
          {(status === "casting" ||
            status === "waiting" ||
            status === "bite" ||
            status === "fighting" ||
            status === "missed" ||
            status === "reeling") && (
            <>
              <div className="angler-bobber" />
              <div className="angler-ripple" />
              <div className="angler-splash" />
            </>
          )}
        </>
      )}
      <span className="angler-sprite">
        <PersonView
          outfitId={outfitId}
          sex={sex}
          pose="sit"
          view="back"
          motion={personMotion(status, charging)}
          charge={chargePower}
          holdRod={showRod}
          size={you ? 136 : 118}
        />
      </span>
      <span className="angler-basket" aria-hidden>
        <GearIcon kind="basket" size={you ? 32 : 28} />
      </span>
      {showLanded && fish && (
        <span className="angler-catch-fly" key={`${fish.id}-${status}`} style={catchFlyStyle(fish)}>
          <FishPortrait id={fish.id} size={Math.round(20 + fishWeightKg(fish) * 12) * 2} alt="" />
        </span>
      )}
      {showLanded && junkKind && !fish && (
        <span className="angler-catch-fly" key={`${junkKind}-${status}`} style={catchJunkStyle()}>
          <JunkMark kind={junkKind} size={44} />
        </span>
      )}
    </div>
  );
}
