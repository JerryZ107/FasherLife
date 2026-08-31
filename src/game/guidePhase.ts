import type { SceneId } from "../save/saveSchema";

/** 0 无/已结束 · 1 馆→图 · 2 图→钓点 · 3 钓点→图 · 4 图→馆 · 5 鱼筐→馆 */
export type GuidePhase = 0 | 1 | 2 | 3 | 4 | 5;

export function clampGuidePhase(n: unknown): GuidePhase {
  const v = Number(n);
  if (v >= 1 && v <= 5) return v as GuidePhase;
  return 0;
}

/** 按场景切换更新引导路程。返回 null 表示本跳不改动阶段。与 gameStore.advanceGuideTrip 同规则。 */
export function nextGuidePhase(
  prevScene: SceneId,
  nextScene: SceneId,
  basketCount: number,
  questStep: string,
  prevPhase: GuidePhase = 0,
): GuidePhase | null {
  const needStore =
    basketCount > 0 &&
    (prevPhase === 3 || prevPhase === 4 || questStep === "q_tank" || questStep === "q_catch");

  if (prevScene === "aquarium" && nextScene === "fishing_map") {
    if (needStore || prevPhase === 3 || prevPhase === 4) return 4;
    return 1;
  }
  if (prevScene === "fishing_map" && nextScene === "fishing") {
    if (needStore || prevPhase === 3 || prevPhase === 4) return 4;
    return 2;
  }
  if (prevScene === "fishing" && nextScene === "fishing_map") return 3;
  if (prevScene === "fishing_map" && nextScene === "aquarium") {
    return basketCount > 0 || questStep === "q_tank" ? 4 : 0;
  }
  if (prevScene === "store_tank" && nextScene === "aquarium") {
    return basketCount > 0 && (prevPhase === 3 || prevPhase === 4 || questStep === "q_tank") ? 4 : 0;
  }
  return null;
}

export function fishingRouteQuest(questStep: string): boolean {
  return questStep === "q_go_fish" || questStep === "q_catch" || questStep === "q_tank";
}
