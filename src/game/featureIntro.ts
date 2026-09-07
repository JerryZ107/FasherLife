import { questIndex } from "./guide";
import type { SaveData } from "../save/saveSchema";

export type FeatureIntroId = "mate" | "fishchat" | "encyc";

const INTRO_SEEN_KEY: Record<FeatureIntroId, keyof SaveData> = {
  mate: "guideMateIntroSeen",
  fishchat: "guideFishchatIntroSeen",
  encyc: "guideEncycIntroSeen",
};

const QUEST_FOR_INTRO: Record<FeatureIntroId, string> = {
  mate: "q_mate",
  fishchat: "q_fishchat",
  encyc: "q_read_encyc",
};

export const FEATURE_INTRO_COPY: Record<
  FeatureIntroId,
  { title: string; lead: string; steps: string[]; cta: string }
> = {
  mate: {
    title: "配偶与鱼卵",
    lead: "按下面几步做，就能完成配偶引导：",
    steps: [
      "点「商城」→「求偶香」，买一份青荇香。",
      "回馆点右边「配偶」，选好求偶香后点「去水族馆用香」。",
      "在缸里点一公一母两条能交配的鱼，选满会自动喷香。",
      "点缸里的鱼卵，再点「起名」给卵取个名字。",
    ],
    cta: "知道了，去配偶",
  },
  fishchat: {
    title: "渔聊动态",
    lead: "晒今天钓到的鱼，按这几步来：",
    steps: [
      "先确保鱼筐里有今天钓到的鱼（没有就去钓一条）。",
      "点上面「渔聊」，再点下面「动态」。",
      "点右上角鱼图标，选今天钓到的鱼发动态。",
    ],
    cta: "知道了，去渔聊",
  },
  encyc: {
    title: "翻翻图鉴",
    lead: "从水族馆进图鉴：",
    steps: [
      "点右边「图鉴」，看看清溪池有哪些鱼。",
      "随便翻翻，看完点返回回馆。",
    ],
    cta: "知道了，去看图鉴",
  },
};

function effectiveQuest(save: SaveData, reviewStep: string | null | undefined): string {
  return reviewStep ?? save.questStep;
}

function questReached(save: SaveData, reviewStep: string | null | undefined, stepId: string): boolean {
  const q = effectiveQuest(save, reviewStep);
  if (reviewStep === stepId) return true;
  return questIndex(q) >= questIndex(stepId);
}

export function shouldShowFeatureIntro(
  save: SaveData,
  reviewStep: string | null | undefined,
  feature: FeatureIntroId,
): boolean {
  if (!save.started || !save.guidePrompted) return false;
  if (save.guideSkipped && !reviewStep) return false;
  if (save[INTRO_SEEN_KEY[feature]] === true) return false;
  return questReached(save, reviewStep, QUEST_FOR_INTRO[feature]);
}
