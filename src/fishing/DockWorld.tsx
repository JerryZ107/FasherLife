import PersonView, { type PersonMotion } from "../art/PersonView";
import { FISH_BY_ID } from "../data/fishDefs";
import { fishWeightKg } from "../game/weight";
import { FishPortrait, GearIcon } from "../art/Art";
import { FISHING_SPOTS, type NeighborState, type NeighborStatus } from "./neighbors";
import type { FishDef, Sex } from "../types";
import type { CSSProperties } from "react";

export type Phase =
  | "pick"
  | "ready"
  | "casting"
  | "waiting"
  | "reeling"
  | "bite"
  | "minigame"
  | "result";

export const WORLD_VW = 340;

type Props = {
  pan: number;
  snapping: boolean;
  phase: Phase;
  spotId: string | null;
  neighbors: NeighborState[];
  playerFishId: string | null;
  playerEscaped: boolean;
  onPickSpot: (id: string) => void;
  castPower?: number;
  playerOutfitId?: string;
  playerSex?: Sex;
  chargePower?: number;
};

const CLOUDS = [
  { cls: "a", left: "8%" },
  { cls: "b", left: "38%" },
  { cls: "c", left: "62%" },
  { cls: "d", left: "86%" },
];

const LILIES = [
  { left: "6%", top: "18%", s: 1 },
  { left: "18%", top: "58%", s: 0.8 },
  { left: "31%", top: "28%", s: 1.15 },
  { left: "44%", top: "66%", s: 0.9 },
  { left: "57%", top: "22%", s: 1.05 },
  { left: "69%", top: "52%", s: 0.75 },
  { left: "81%", top: "34%", s: 1.2 },
  { left: "92%", top: "60%", s: 0.85 },
];

const REEDS = ["7%", "22%", "41%", "59%", "77%", "94%"];
const SPARKS = [8, 18, 28, 39, 48, 57, 67, 76, 86, 94];

export default function DockWorld({
  pan,
  snapping,
  phase,
  spotId,
  neighbors,
  playerFishId,
  playerEscaped,
  onPickSpot,
  castPower = 0.55,
  playerOutfitId,
  playerSex = "male",
  chargePower = 0,
}: Props) {
  const bite = phase === "bite" || phase === "minigame";
  return (
    <div className="dock-view">
      <div
        className={`dock-world ${snapping ? "is-snap" : ""} is-${phase}${bite ? " is-hotwater" : ""}`}
        style={{ width: `${WORLD_VW}%`, transform: `translateX(${-pan}px)` }}
      >
        <div className="dock-sky">
          <div className="dock-sun" />
          {CLOUDS.map((c) => (
            <div key={c.cls} className={`dock-cloud ${c.cls}`} style={{ left: c.left }} />
          ))}
          <div className="dock-bird a" />
          <div className="dock-bird b" />
        </div>
        <div className="dock-range" />
        <div className="dock-hills">
          <span className="dock-grove g1" />
          <span className="dock-grove g2" />
          <span className="dock-grove g3" />
          <span className="dock-grove g4" />
        </div>
        <div className="dock-water">
          <div className="dock-caustic" />
          <div className="dock-wave w1" />
          <div className="dock-wave w2" />
          <div className="dock-wave w3" />
          {SPARKS.map((x, i) => (
            <span key={x} className="dock-spark" style={{ left: `${x}%`, animationDelay: `${i * 0.35}s` }} />
          ))}
          {LILIES.map((l, i) => (
            <span
              key={i}
              className="dock-lily"
              style={{ left: l.left, top: l.top, transform: `scale(${l.s})` }}
            />
          ))}
          {REEDS.map((left) => (
            <span key={left} className="dock-reed" style={{ left }} />
          ))}
          <span className="dock-leap a" />
          <span className="dock-leap b" />
        </div>
        <div className="dock-shore" />
        <div className="dock-plank">
          <div className="dock-plank-grain" />
          <div className="dock-nails" />
          <div className="dock-rope" />
        </div>
        <div className="dock-edge" />
        <div className="dock-posts">
          {[11, 21, 31, 41, 51, 61, 71, 81].map((x) => (
            <span key={x} className="dock-post" style={{ left: `${x}%` }} />
          ))}
        </div>

        {FISHING_SPOTS.map((s) => {
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
                fishId={npc.status === "caught" ? npc.fishId : null}
                sex={npc.sex}
                castPower={0.52}
              />
            );
          }
          const canSeat = phase === "pick" || phase === "ready";
          if (isPlayer) {
            return (
              <Angler
                key={s.id}
                x={s.x}
                name="你"
                you
                status={playerStatus(phase, playerEscaped)}
                fishId={playerFishId}
                outfitId={playerOutfitId}
                sex={playerSex}
                castPower={castPower}
                chargePower={chargePower}
              />
            );
          }
          return (
            <button
              key={s.id}
              className={`dock-empty ${canSeat ? "is-pickable" : ""}`}
              data-spot={s.id}
              style={{ left: `${s.x}%` }}
              onClick={(e) => {
                e.stopPropagation();
                if (!canSeat) return;
                onPickSpot(s.id);
              }}
            >
              <span className="dock-stool" />
              <span className="dock-empty-label">{canSeat ? (phase === "ready" ? "换座" : "坐下") : s.label}</span>
            </button>
          );
        })}
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
  if (phase === "minigame") return "fighting";
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

function Angler({
  x,
  name,
  outfitId,
  sex,
  you,
  status,
  fishId,
  castPower = 0.55,
  chargePower = 0,
}: {
  x: number;
  name: string;
  outfitId?: string;
  sex: Sex;
  you?: boolean;
  status: NeighborStatus | "casting" | "bite" | "ready" | "reeling";
  fishId: string | null;
  castPower?: number;
  chargePower?: number;
}) {
  const fish = fishId ? FISH_BY_ID[fishId] : null;
  const showLanded = Boolean(fish && status === "caught");
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
      <div className="angler-name">{name}</div>
      {showRod && <div className="angler-rod" />}
      {showLine && (
        <>
          <div className="angler-line" />
          {(status === "casting" || status === "waiting" || status === "bite" || status === "fighting" || status === "missed" || status === "reeling") && (
            <>
              <div className="angler-bobber" />
              <div className="angler-ripple" />
            </>
          )}
        </>
      )}
      <span className="dock-stool seated" />
      <span className="angler-sprite">
        <PersonView
          outfitId={outfitId}
          sex={sex}
          pose="sit"
          motion={personMotion(status, charging)}
          charge={chargePower}
          size={you ? 112 : 104}
        />
      </span>
      <span className="angler-basket" aria-hidden>
        <GearIcon kind="basket" size={you ? 34 : 30} />
      </span>
      {showLanded && fish && (
        <span className="angler-catch-fly" key={`${fish.id}-${status}`} style={catchFlyStyle(fish)}>
          <FishPortrait id={fish.id} size={Math.round(20 + fishWeightKg(fish) * 12) * 2} alt="" />
        </span>
      )}
    </div>
  );
}
