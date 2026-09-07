import type { QuestDef } from "../types";

/**
 * v0.1 新手引导线（界面高亮）。
 * 钓鱼 → 存缸 → 存筐 → 卖鱼 → 喂食 → 买鲫鱼做菜吃菜 → 配偶 → 渔聊动态 → 图鉴 → 圣殿参观。
 * 成就式「新手任务」见 newbieTaskDefs。
 *
 * 引导任务经验合计 88（配合 1→2 需 100 经验 + 途中钓鱼 ~20，完结时约 2 级初）。
 */
export const QUEST_DEFS: QuestDef[] = [
  {
    id: "q_go_fish",
    title: "拿起鱼竿",
    hint: "点「钓鱼」，去清溪池。",
    trigger: "open_map",
    rewardXp: 6,
    rewardBait: { id: "bait_basic", n: 10 },
    next: "q_catch",
  },
  {
    id: "q_catch",
    title: "第一网",
    hint: "去清溪池钓一条。",
    trigger: "catch",
    rewardXp: 6,
    next: "q_tank",
  },
  {
    id: "q_tank",
    title: "入缸安家",
    hint: "鱼筐里选鱼，存进缸。",
    trigger: "tank",
    rewardXp: 8,
    rewardFood: { id: "food_basic", n: 10 },
    rewardSalt: 10,
    next: "q_basket",
  },
  {
    id: "q_basket",
    title: "存回鱼筐",
    hint: "点「鱼缸」，选鱼后点「存筐」。",
    trigger: "basket",
    rewardXp: 6,
    next: "q_sell",
  },
  {
    id: "q_sell",
    title: "走一趟鱼行",
    hint: "卖掉筐里一条鱼。",
    trigger: "sell",
    rewardXp: 8,
    next: "q_feed",
  },
  {
    id: "q_feed",
    title: "先喂一口",
    hint: "点右边「喂食」，选鱼粮后进缸抛洒。",
    trigger: "feed",
    rewardXp: 7,
    next: "q_buy_carp",
  },
  {
    id: "q_buy_carp",
    title: "买条鲫鱼",
    hint: "去鱼行买一条鲫鱼，准备做菜。",
    trigger: "buy_fish",
    rewardXp: 6,
    next: "q_cook",
  },
  {
    id: "q_cook",
    title: "做道菜",
    hint: "用筐里的鱼 + 盐做菜。",
    trigger: "cook",
    rewardXp: 6,
    next: "q_eat",
  },
  {
    id: "q_eat",
    title: "吃菜补体力",
    hint: "去背包·道具吃菜，补体力。",
    trigger: "eat",
    rewardXp: 7,
    next: "q_mate",
  },
  {
    id: "q_mate",
    title: "配偶与鱼卵",
    hint: "买求偶香、给害羞的鱼喷香，再给鱼卵起名。",
    trigger: "name_egg",
    rewardXp: 10,
    next: "q_fishchat",
  },
  {
    id: "q_fishchat",
    title: "渔聊动态",
    hint: "在渔聊发动态，晒今天钓到的鱼。",
    trigger: "fishchat_post",
    rewardXp: 8,
    next: "q_read_encyc",
  },
  {
    id: "q_read_encyc",
    title: "翻翻图鉴",
    hint: "点水族馆右边「图鉴」，看看清溪有哪些鱼。",
    trigger: "read_encyc",
    rewardXp: 6,
    next: "q_visit_temple",
  },
  {
    id: "q_visit_temple",
    title: "圣殿排行参观",
    hint: "去圣殿打开排行，参观一位钓鱼佬的馆。",
    trigger: "visit",
    rewardXp: 8,
    next: "q_done",
  },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(
  QUEST_DEFS.map((q) => [q.id, q]),
);
