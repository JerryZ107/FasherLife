import type { FisheryDef } from "../types";

/** Demo 两个地图点：免费清溪池 + 付费鱼塘（办卡/买票/潜入）。 */
export const FISHERY_DEFS: FisheryDef[] = [
  {
    id: "village_pond",
    name: "鱼塘",
    entry: { type: "paid", ticketPrice: 15, cardPrice: 300 },
    pool: [
      { fishId: "crucian", weight: 30 },
      { fishId: "puffer", weight: 22 },
      { fishId: "black_carp", weight: 18 },
      { fishId: "koi_red_white", weight: 12 },
      { fishId: "snakehead", weight: 8 },
      { fishId: "rouge", weight: 5 },
      { fishId: "koi_golden_scale", weight: 4 },
      { fishId: "dragon_eye", weight: 1 },
    ],
  },
  {
    id: "clear_stream",
    name: "清溪池",
    entry: { type: "free" },
    pool: [
      { fishId: "minnow", weight: 26 },
      { fishId: "horse_mouth", weight: 22 },
      { fishId: "stone_bass", weight: 18 },
      { fishId: "brook_trout", weight: 14 },
      { fishId: "rainbow_trout", weight: 10 },
      { fishId: "red_spot_salmon", weight: 6 },
      { fishId: "gold_trout", weight: 3 },
      { fishId: "emerald", weight: 1 },
    ],
  },
];

export const FISHERY_BY_ID: Record<string, FisheryDef> = Object.fromEntries(
  FISHERY_DEFS.map((f) => [f.id, f]),
);

export const FISHERY_MAP_POS: Record<string, { left: string; top: string }> = {
  village_pond: { left: "18%", top: "38%" },
  clear_stream: { left: "58%", top: "74%" },
};
