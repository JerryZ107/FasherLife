import type { QuestDef } from "../types";

/** v0.1 新手任务引导线。 */
export const QUEST_DEFS: QuestDef[] = [
  {
    id: "q_go_fish",
    title: "拿起鱼竿",
    hint: "从水族馆点「钓鱼」，打开地图。",
    trigger: "open_map",
    rewardGold: 20,
    rewardBait: { id: "bait_basic", n: 10 },
    next: "q_catch",
  },
  {
    id: "q_catch",
    title: "第一网",
    hint: "在乡村池塘甩杆，把鱼搏上来。",
    trigger: "catch",
    rewardGold: 15,
    next: "q_tank",
  },
  {
    id: "q_tank",
    title: "入缸安家",
    hint: "把鱼筐里的鱼点「入缸」，放进鱼缸。完成会送鱼粮和盐。",
    trigger: "tank",
    rewardGold: 0,
    rewardFood: { id: "food_basic", n: 10 },
    rewardSalt: 10,
    next: "q_feed",
  },
  {
    id: "q_feed",
    title: "喂一口粮",
    hint: "选中缸里的鱼，喂一份与它品质相同的鱼粮。",
    trigger: "feed",
    rewardGold: 20,
    next: "q_sell",
  },
  {
    id: "q_sell",
    title: "走一趟鱼行",
    hint: "去鱼行把一条鱼卖给鱼行，换点金币。",
    trigger: "sell",
    rewardGold: 30,
    next: "q_done",
  },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(
  QUEST_DEFS.map((q) => [q.id, q]),
);
