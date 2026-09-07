/** 新手任务（成就式，与界面引导线分离）。每项奖励适中经验。 */

export type NewbieTaskId =
  | "nt_catch_common"
  | "nt_buy_rod"
  | "nt_swap_part"
  | "nt_fill_tank"
  | "nt_buy_tank"
  | "nt_expand"
  | "nt_cook";

export type NewbieTaskKind = "count" | "flag";

export interface NewbieTaskDef {
  id: NewbieTaskId;
  title: string;
  hint: string;
  kind: NewbieTaskKind;
  /** count 型目标；flag 型为 1。 */
  target: number;
  rewardXp: number;
  /** 进度字段名（对应 NewbieTaskState）。 */
  progressKey: keyof NewbieTaskProgressFields;
}

/** 进度字段（不含 claimed）。 */
export type NewbieTaskProgressFields = {
  catchCommon: number;
  buyRod: number;
  swapPart: number;
  fillTank: number;
  buyTank: number;
  expand: number;
  cook: number;
};

/** 每项奖励适中经验（引导线已单独给级；成就任务作中期补充）。 */
export const NEWBIE_TASK_REWARD = 45;

export const NEWBIE_TASK_DEFS: NewbieTaskDef[] = [
  {
    id: "nt_catch_common",
    title: "钓 5 条普通鱼",
    hint: "任意渔场钓到普通品质即可。",
    kind: "count",
    target: 5,
    rewardXp: NEWBIE_TASK_REWARD,
    progressKey: "catchCommon",
  },
  {
    id: "nt_buy_rod",
    title: "买一根新鱼竿",
    hint: "去商城·装备买下一根竿（竹节竿不算）。",
    kind: "flag",
    target: 1,
    rewardXp: NEWBIE_TASK_REWARD,
    progressKey: "buyRod",
  },
  {
    id: "nt_swap_part",
    title: "更换一次配件",
    hint: "去背包页给鱼竿换上轮、线、钩或漂。",
    kind: "flag",
    target: 1,
    rewardXp: NEWBIE_TASK_REWARD,
    progressKey: "swapPart",
  },
  {
    id: "nt_fill_tank",
    title: "填满新手鱼缸",
    hint: "把起始那口缸养满（容量 6 条）。",
    kind: "flag",
    target: 1,
    rewardXp: NEWBIE_TASK_REWARD,
    progressKey: "fillTank",
  },
  {
    id: "nt_buy_tank",
    title: "买一口新鱼缸",
    hint: "去商城·鱼缸买下一口缸。",
    kind: "flag",
    target: 1,
    rewardXp: NEWBIE_TASK_REWARD,
    progressKey: "buyTank",
  },
  {
    id: "nt_expand",
    title: "扩建一次",
    hint: "在水族馆缸位管理里扩建，腾出新空位。",
    kind: "flag",
    target: 1,
    rewardXp: NEWBIE_TASK_REWARD,
    progressKey: "expand",
  },
  {
    id: "nt_cook",
    title: "做 3 道菜",
    hint: "用筐里的鱼 + 盐做菜。",
    kind: "count",
    target: 3,
    rewardXp: NEWBIE_TASK_REWARD,
    progressKey: "cook",
  },
];

export const NEWBIE_TASK_BY_ID: Record<NewbieTaskId, NewbieTaskDef> = Object.fromEntries(
  NEWBIE_TASK_DEFS.map((t) => [t.id, t]),
) as Record<NewbieTaskId, NewbieTaskDef>;
