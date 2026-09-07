import type { Quality } from "../types";
import { FISH_BY_ID } from "./fishDefs";
import { QUALITY_LABEL, QUALITY_ORDER } from "../types";

/** 限时任务模板：每期刷新一套。 */

export type TimedQuestKind = "quality" | "species";

export interface TimedQuestTemplate {
  id: string;
  kind: TimedQuestKind;
  title: string;
  hint: string;
  /** quality：最低品质索引（0=普通…）；species：忽略。 */
  minQuality?: Quality;
  /** species：指定鱼种。 */
  fishId?: string;
  target: number;
  rewardXp: number;
}

/** 当期限时任务进度项（写入存档）。 */
export interface TimedQuestItem {
  id: string;
  kind: TimedQuestKind;
  title: string;
  hint: string;
  minQuality?: Quality;
  fishId?: string;
  progress: number;
  target: number;
  rewardXp: number;
  claimed: boolean;
}

const FINE_SPECIES = [
  "koi_red_white",
  "snakehead",
  "stone_bass",
  "rainbow_trout",
  "brook_trout",
  "red_spot_salmon",
] as const;

const RARE_SPECIES = ["dragon_eye", "gold_trout", "emerald"] as const;

function speciesTemplate(fishId: string, target: number, rewardXp: number): TimedQuestTemplate {
  const def = FISH_BY_ID[fishId];
  const name = def?.name ?? fishId;
  const q = def ? QUALITY_LABEL[def.quality] : "";
  return {
    id: `sp_${fishId}`,
    kind: "species",
    title: target > 1 ? `钓 ${target} 条${name}` : `钓到${name}`,
    hint: `${q} · 指定鱼种，任意渔场钓到即可。`,
    fishId,
    target,
    rewardXp,
  };
}

/** 每期限时任务池：固定质量目标 + 若干指定鱼种。 */
export function buildTimedQuestItems(seedDay: number): TimedQuestItem[] {
  const templates: TimedQuestTemplate[] = [
    {
      id: "tq_fine_3",
      kind: "quality",
      title: "优良以上上钩",
      hint: "7 天内钓 3 条优良及以上品质。",
      minQuality: "fine",
      target: 3,
      rewardXp: 80,
    },
    {
      id: "tq_rare_1",
      kind: "quality",
      title: "稀有现身",
      hint: "7 天内钓到 1 条稀有及以上品质。",
      minQuality: "rare",
      target: 1,
      rewardXp: 100,
    },
  ];

  // 按游戏天轮换指定鱼种，保证每期有 2 个优良种 + 1 个稀有种
  const fi = Math.abs(seedDay) % FINE_SPECIES.length;
  const fi2 = (fi + 2) % FINE_SPECIES.length;
  const ri = Math.abs(seedDay) % RARE_SPECIES.length;
  templates.push(speciesTemplate(FINE_SPECIES[fi], 1, 50));
  templates.push(speciesTemplate(FINE_SPECIES[fi2], 2, 70));
  templates.push(speciesTemplate(RARE_SPECIES[ri], 1, 110));

  return templates.map((t) => ({
    id: t.id,
    kind: t.kind,
    title: t.title,
    hint: t.hint,
    minQuality: t.minQuality,
    fishId: t.fishId,
    progress: 0,
    target: t.target,
    rewardXp: t.rewardXp,
    claimed: false,
  }));
}

export function qualityMeets(caught: Quality, min?: Quality): boolean {
  if (!min) return true;
  return QUALITY_ORDER.indexOf(caught) >= QUALITY_ORDER.indexOf(min);
}
