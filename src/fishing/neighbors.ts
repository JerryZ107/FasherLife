import { FISHERY_BY_ID } from "../data/fisheryDefs";
import { pickCatchReaction } from "../data/stickerDefs";
import { pickFishFromPool } from "../game/fishingLogic";
import type { Sex } from "../types";

export type NeighborStatus = "waiting" | "fighting" | "caught" | "missed";

export type NeighborPresence = "online" | "idle" | "offline";

export type SpotDef = {
  id: string;
  x: number;
  label: string;
  npc: string | null;
  outfitId: string | null;
  sex: Sex | null;
  /** 初始在线态：空位可塞挂机/离线占座。 */
  presence?: NeighborPresence | null;
};

export type NeighborState = {
  spotId: string;
  name: string;
  outfitId: string;
  sex: Sex;
  status: NeighborStatus;
  presence: NeighborPresence;
  fishId: string | null;
  emote: string | null;
};

/** 演示用在线态：挂机·空位·在线·离线·在线·挂机·挂机·离线·空位·在线 */
const DOCK_PRESENCE_DEMO: (NeighborPresence | null)[] = [
  "idle",
  null,
  "online",
  "offline",
  "online",
  "idle",
  "idle",
  "offline",
  null,
  "online",
];

/** x 是横向码头世界的百分比。竖屏要拖才能看完一排。 */
export const FISHING_SPOTS: SpotDef[] = [
  { id: "s1", x: 6, label: "钓点甲", npc: "阿花", outfitId: "outfit_rain", sex: "female" },
  { id: "s2", x: 16, label: "钓点乙", npc: null, outfitId: null, sex: null },
  { id: "s3", x: 26, label: "钓点丙", npc: "老陈", outfitId: "outfit_default", sex: "male" },
  { id: "s4", x: 36, label: "钓点丁", npc: "小美", outfitId: "outfit_shell", sex: "female" },
  { id: "s5", x: 46, label: "钓点戊", npc: "大刘", outfitId: "outfit_shell", sex: "male" },
  { id: "s6", x: 56, label: "钓点己", npc: "阿杰", outfitId: "outfit_tide", sex: "male" },
  { id: "s7", x: 66, label: "钓点庚", npc: "阿珍", outfitId: "outfit_tide", sex: "female" },
  { id: "s8", x: 76, label: "钓点辛", npc: "阿强", outfitId: "outfit_rain", sex: "male" },
  { id: "s9", x: 86, label: "钓点壬", npc: null, outfitId: null, sex: null },
  { id: "s10", x: 95, label: "钓点癸", npc: "小周", outfitId: "outfit_festival", sex: "female" },
].map((spot, i) => ({
  ...spot,
  presence: DOCK_PRESENCE_DEMO[i] ?? null,
})) as SpotDef[];

export function initialNeighbors(): NeighborState[] {
  return FISHING_SPOTS.filter((s) => s.npc && s.outfitId && s.sex).map((s) => ({
    spotId: s.id,
    name: s.npc!,
    outfitId: s.outfitId!,
    sex: s.sex!,
    status: "waiting" as const,
    presence: s.presence ?? "online",
    fishId: null,
    emote: null,
  }));
}

function pickLocalFish(fisheryId: string): string | null {
  const fishery = FISHERY_BY_ID[fisheryId];
  if (!fishery) return null;
  const fish = pickFishFromPool(fishery.pool, "bait_basic", 0);
  return fish?.id ?? fishery.pool[0]?.fishId ?? null;
}

export function tickNeighbors(prev: NeighborState[], fisheryId: string): NeighborState[] {
  return prev.map((n) => {
    // 演示态固定：挂机/离线不参与随机切态，只让「在线」玩家偶尔甩竿
    if (n.presence !== "online") {
      return { ...n, status: "waiting", fishId: null, emote: null };
    }
    const r = Math.random();
    if (n.status === "waiting") {
      if (r < 0.38) {
        return { ...n, status: "fighting", fishId: pickLocalFish(fisheryId), emote: null };
      }
      return n;
    }
    if (n.status === "fighting") {
      if (r < 0.5) return { ...n, status: "caught", emote: pickCatchReaction() };
      if (r < 0.72) return { ...n, status: "missed", emote: null };
      return n;
    }
    if (r < 0.9) return { ...n, status: "waiting", fishId: null, emote: null };
    return n;
  });
}
