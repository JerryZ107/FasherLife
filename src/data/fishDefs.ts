import type { Quality } from "../types";
import type { FishDef } from "../types";

/**
 * Demo 图鉴：乡村池塘 + 清溪共 16 鱼，每种一张立绘（ADR-011 / ADR-014）。
 * 全 62 鱼名单仍见 ADR-002 附录，本 Demo 不进游戏。
 */

const motionByQuality: Record<Quality, FishDef["motion"]> = {
  common: { sliderSize: 0.28, amplitude: 0.18, frequency: 0.6, noiseWeight: 0.15, speed: 1.0 },
  fine: { sliderSize: 0.22, amplitude: 0.24, frequency: 0.9, noiseWeight: 0.25, speed: 1.3 },
  rare: { sliderSize: 0.17, amplitude: 0.3, frequency: 1.3, noiseWeight: 0.4, speed: 1.7 },
  precious: { sliderSize: 0.13, amplitude: 0.36, frequency: 1.7, noiseWeight: 0.55, speed: 2.1 },
  ultimate: { sliderSize: 0.1, amplitude: 0.42, frequency: 2.1, noiseWeight: 0.7, speed: 2.5 },
};

function makeFish(
  partial: Pick<FishDef, "id" | "name" | "quality" | "fisheryId" | "preferredBaitId" | "sellPrice">,
): FishDef {
  return {
    ...partial,
    spriteId: partial.id,
    motion: motionByQuality[partial.quality],
  };
}

export const FISH_DEFS: FishDef[] = [
  makeFish({ id: "crucian", name: "鲫鱼", quality: "common", fisheryId: "village_pond", preferredBaitId: "bait_wine_wheat", sellPrice: 3 }),
  makeFish({ id: "puffer", name: "河豚", quality: "common", fisheryId: "village_pond", preferredBaitId: "bait_wine_wheat", sellPrice: 4 }),
  makeFish({ id: "black_carp", name: "青鱼", quality: "common", fisheryId: "village_pond", preferredBaitId: "bait_fermented_bran", sellPrice: 5 }),
  makeFish({ id: "koi_red_white", name: "红白锦鲤", quality: "fine", fisheryId: "village_pond", preferredBaitId: "bait_fermented_bran", sellPrice: 18 }),
  makeFish({ id: "snakehead", name: "黑鱼", quality: "fine", fisheryId: "village_pond", preferredBaitId: "bait_honey_bean", sellPrice: 22 }),
  makeFish({ id: "koi_golden_scale", name: "金鳞锦鲤", quality: "fine", fisheryId: "village_pond", preferredBaitId: "bait_honey_bean", sellPrice: 25 }),
  makeFish({ id: "rouge", name: "胭脂", quality: "fine", fisheryId: "village_pond", preferredBaitId: "bait_osmanthus_cake", sellPrice: 20 }),
  makeFish({ id: "dragon_eye", name: "龙睛", quality: "rare", fisheryId: "village_pond", preferredBaitId: "bait_osmanthus_cake", sellPrice: 90 }),

  makeFish({ id: "minnow", name: "白条", quality: "common", fisheryId: "clear_stream", preferredBaitId: "bait_red_worm_ball", sellPrice: 5 }),
  makeFish({ id: "horse_mouth", name: "马口", quality: "common", fisheryId: "clear_stream", preferredBaitId: "bait_red_worm_ball", sellPrice: 6 }),
  makeFish({ id: "stone_bass", name: "石鲈", quality: "fine", fisheryId: "clear_stream", preferredBaitId: "bait_loach", sellPrice: 24 }),
  makeFish({ id: "rainbow_trout", name: "虹鳟", quality: "fine", fisheryId: "clear_stream", preferredBaitId: "bait_bee_pupa", sellPrice: 30 }),
  makeFish({ id: "brook_trout", name: "溪流鳟", quality: "fine", fisheryId: "clear_stream", preferredBaitId: "bait_herb_fat", sellPrice: 28 }),
  makeFish({ id: "red_spot_salmon", name: "红点鲑", quality: "fine", fisheryId: "clear_stream", preferredBaitId: "bait_bee_pupa", sellPrice: 32 }),
  makeFish({ id: "gold_trout", name: "金鳟", quality: "rare", fisheryId: "clear_stream", preferredBaitId: "bait_gold_bug", sellPrice: 95 }),
  makeFish({ id: "emerald", name: "翡翠", quality: "rare", fisheryId: "clear_stream", preferredBaitId: "bait_gold_bug", sellPrice: 100 }),
];

export const FISH_BY_ID: Record<string, FishDef> = Object.fromEntries(
  FISH_DEFS.map((f) => [f.id, f]),
);
