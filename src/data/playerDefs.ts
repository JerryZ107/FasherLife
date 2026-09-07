/** 渔聊 / 个人主页 Demo 玩家数据。 */

import type { Sex } from "../types";

export type DemoShowcaseFish = {
  defId: string;
  customName?: string | null;
  sizeCm: number;
  weightKg: number;
};

export type DemoPlayer = {
  uid: string;
  name: string;
  level: number;
  signature: string;
  outfitId: string;
  sex: Sex;
  /** 已是好友时对应的渔聊会话 id。 */
  threadId?: string;
  showcaseFish?: DemoShowcaseFish[];
  /** 他人主页图鉴展示（已解锁鱼种 id）。 */
  caughtFishIds?: string[];
};

const DEMO_FRIEND_PLAYERS: DemoPlayer[] = [
  {
    uid: "ahua",
    name: "阿花",
    level: 12,
    signature: "清溪池常客，周末约钓。",
    outfitId: "outfit_rain",
    sex: "female",
    threadId: "fishchat_0",
    showcaseFish: [
      { defId: "koi_red_white", customName: "小花", sizeCm: 22, weightKg: 0.9 },
      { defId: "crucian", sizeCm: 16, weightKg: 0.35 },
    ],
    caughtFishIds: ["koi_red_white", "crucian", "minnow"],
  },
  {
    uid: "laochen",
    name: "老陈",
    level: 18,
    signature: "老钓友，鱼竿不离手。",
    outfitId: "outfit_default",
    sex: "male",
    threadId: "fishchat_1",
    showcaseFish: [{ defId: "crucian", sizeCm: 18, weightKg: 0.4 }],
    caughtFishIds: ["crucian", "black_carp"],
  },
  {
    uid: "xiaomei",
    name: "小美",
    level: 9,
    signature: "图鉴还差三条就满了。",
    outfitId: "outfit_shell",
    sex: "female",
    threadId: "fishchat_2",
  },
  {
    uid: "daliu",
    name: "大刘",
    level: 15,
    signature: "挂机党，有鱼喊我。",
    outfitId: "outfit_shell",
    sex: "male",
    threadId: "fishchat_3",
  },
  {
    uid: "azhen",
    name: "阿珍",
    level: 11,
    signature: "鱼塘夜钓爱好者。",
    outfitId: "outfit_tide",
    sex: "female",
    threadId: "fishchat_4",
  },
  {
    uid: "aqiang",
    name: "阿强",
    level: 14,
    signature: "今天也要爆护！",
    outfitId: "outfit_rain",
    sex: "male",
    threadId: "fishchat_5",
  },
  {
    uid: "xiaozhou",
    name: "小周",
    level: 8,
    signature: "新手求带飞～",
    outfitId: "outfit_festival",
    sex: "female",
    threadId: "fishchat_6",
  },
];

/** 可搜索到、但初始不是好友的演示玩家。 */
const DEMO_STRANGER_PLAYERS: DemoPlayer[] = [
  {
    uid: "yufuwang",
    name: "渔夫王",
    level: 22,
    signature: "全图鉴收集ing",
    outfitId: "outfit_tide",
    sex: "male",
  },
  {
    uid: "qingxi_liu",
    name: "青溪刘",
    level: 16,
    signature: "只钓鲫鱼，别的不要。",
    outfitId: "outfit_default",
    sex: "male",
  },
];

export const DEMO_PLAYERS: DemoPlayer[] = [...DEMO_FRIEND_PLAYERS, ...DEMO_STRANGER_PLAYERS];

export const INITIAL_FRIEND_UIDS = DEMO_FRIEND_PLAYERS.map((p) => p.uid);

export function normalizePlayerUid(raw: string): string {
  return raw.trim().toLowerCase();
}

export function getPlayerByUid(raw: string): DemoPlayer | undefined {
  const key = normalizePlayerUid(raw);
  if (!key) return undefined;
  return DEMO_PLAYERS.find((p) => p.uid === key);
}

export function threadIdForPlayer(uid: string): string | null {
  return getPlayerByUid(uid)?.threadId ?? null;
}
