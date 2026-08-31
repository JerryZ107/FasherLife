import type { QuestDef } from "../types";

/**
 * v0.1 新手引导线（界面高亮）。
 * 开局先买鱼粮再喂食，再卖鱼、看图鉴、钓鱼入缸，再买鲫鱼做菜吃菜，最后逛圣殿排行参观。
 * 成就式「新手任务」见 newbieTaskDefs。
 */
export const QUEST_DEFS: QuestDef[] = [
  {
    id: "q_feed",
    title: "先喂一口",
    hint: "先去商城买鱼粮，再点缸里的鱼喂食。",
    trigger: "feed",
    rewardGold: 20,
    next: "q_sell",
  },
  {
    id: "q_sell",
    title: "走一趟鱼行",
    hint: "卖掉筐里一条鱼。",
    trigger: "sell",
    rewardGold: 30,
    next: "q_read_encyc",
  },
  {
    id: "q_read_encyc",
    title: "翻翻图鉴",
    hint: "去背包·书籍打开图鉴，看看清溪有哪些鱼。",
    trigger: "read_encyc",
    rewardGold: 15,
    next: "q_go_fish",
  },
  {
    id: "q_go_fish",
    title: "拿起鱼竿",
    hint: "点「钓鱼」，去清溪池。",
    trigger: "open_map",
    rewardGold: 20,
    rewardBait: { id: "bait_basic", n: 10 },
    next: "q_catch",
  },
  {
    id: "q_catch",
    title: "第一网",
    hint: "去清溪池钓一条。",
    trigger: "catch",
    rewardGold: 15,
    next: "q_tank",
  },
  {
    id: "q_tank",
    title: "入缸安家",
    hint: "鱼筐里选鱼，存进缸。",
    trigger: "tank",
    rewardGold: 25,
    rewardFood: { id: "food_basic", n: 10 },
    rewardSalt: 10,
    next: "q_buy_carp",
  },
  {
    id: "q_buy_carp",
    title: "买条鲫鱼",
    hint: "去鱼行买一条鲫鱼，准备做菜。",
    trigger: "buy_fish",
    rewardGold: 20,
    next: "q_cook",
  },
  {
    id: "q_cook",
    title: "做道菜",
    hint: "用筐里的鱼 + 盐做菜。",
    trigger: "cook",
    rewardGold: 20,
    next: "q_eat",
  },
  {
    id: "q_eat",
    title: "吃菜补体力",
    hint: "去背包·道具吃菜，补体力。",
    trigger: "eat",
    rewardGold: 20,
    next: "q_visit_temple",
  },
  {
    id: "q_visit_temple",
    title: "圣殿排行参观",
    hint: "去圣殿打开排行，参观一位钓鱼佬的馆。",
    trigger: "visit",
    rewardGold: 30,
    next: "q_done",
  },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(
  QUEST_DEFS.map((q) => [q.id, q]),
);
