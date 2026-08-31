import type { LoveView, Personality, Quality, Sex } from "../types";
import type { TankDecor, TankFish } from "../save/saveSchema";
import { capacityForQuality } from "./tankDefs";
import { FISH_BY_ID } from "./fishDefs";

export interface LeaderTank {
  id: string;
  name: string;
  quality: Quality;
  capacity: number;
  decor: TankDecor;
}

export interface LeaderNpc {
  id: string;
  name: string;
  hall: string;
  blurb: string;
  tanks: LeaderTank[];
  fish: TankFish[];
}

/** 圣殿积分：普通1 · 优良10 · 稀有30 · 珍贵80 · 极品200。 */
export const LEADER_SCORE_BY_QUALITY: Record<Quality, number> = {
  common: 1,
  fine: 10,
  rare: 30,
  precious: 80,
  ultimate: 200,
};

export function leaderFishScore(fish: TankFish[]): number {
  let sum = 0;
  for (const f of fish) {
    if (f.dead) continue;
    const q = FISH_BY_ID[f.defId]?.quality ?? "common";
    sum += LEADER_SCORE_BY_QUALITY[q];
  }
  return sum;
}

/** 按馆内鱼积分降序，同分按原序。 */
export function rankedLeaders(npcs: LeaderNpc[] = LEADERBOARD): { npc: LeaderNpc; score: number; rank: number }[] {
  const rows = npcs.map((npc) => ({ npc, score: leaderFishScore(npc.fish) }));
  rows.sort((a, b) => b.score - a.score);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

type Spec = {
  d: string;
  s: Sex;
  l?: LoveView;
  p?: Personality;
  pair?: string;
  hp?: number;
};

function tank(id: string, name: string, quality: Quality, decor: TankDecor = "none"): LeaderTank {
  return { id, name, quality, capacity: capacityForQuality(quality), decor };
}

function fishes(prefix: string, tankId: string, rows: Spec[]): TankFish[] {
  return rows.map((r, i) => ({
    uid: `${prefix}_${tankId}_${i}`,
    defId: r.d,
    health: r.hp ?? 86 + ((i * 3) % 12),
    dead: false,
    lastFedDay: 0,
    lastSettledAt: 0,
    sex: r.s,
    pairId: r.pair ?? null,
    tankId,
    attractUntilDay: 0,
    attractBonus: 0,
    personality: r.p ?? "docile",
    loveView: r.l ?? "any",
    gestationLeft: r.pair ? 3 : 0,
    scentLayAt: 0,
    layCount: 0,
    affection: 0,
    customName: null,
    petDay: -1,
    petCount: 0,
  }));
}

const AHUA_T0 = "npc_ahua_t0";
const AHUA_T1 = "npc_ahua_t1";
const AHUA_T2 = "npc_ahua_t2";
const CHEN_T0 = "npc_laochen_t0";
const CHEN_T1 = "npc_laochen_t1";
const CHEN_T2 = "npc_laochen_t2";
const YU_T0 = "npc_xiaoyu_t0";
const YU_T1 = "npc_xiaoyu_t1";
const YU_T2 = "npc_xiaoyu_t2";
const BEI_T0 = "npc_beibei_t0";
const BEI_T1 = "npc_beibei_t1";
const BEI_T2 = "npc_beibei_t2";
const MEI_T0 = "npc_xiaomei_t0";
const MEI_T1 = "npc_xiaomei_t1";
const MEI_T2 = "npc_xiaomei_t2";
const LIU_T0 = "npc_daliu_t0";
const LIU_T1 = "npc_daliu_t1";
const LIU_T2 = "npc_daliu_t2";

export const LEADERBOARD: LeaderNpc[] = [
  {
    id: "npc_ahua",
    name: "阿花",
    hall: "锦鲤小院",
    blurb: "无敌是多么寂寞。",
    tanks: [
      tank(AHUA_T0, "前厅锦鲤缸", "fine", "wood"),
      tank(AHUA_T1, "中庭红白缸", "rare", "coral"),
      tank(AHUA_T2, "后园龙睛缸", "rare", "rock"),
    ],
    fish: [
      ...fishes("ahua", AHUA_T0, [
        { d: "koi_golden_scale", s: "female", l: "any", p: "aloof" },
        { d: "koi_red_white", s: "male", l: "peer", p: "docile", pair: "ahua_p1" },
        { d: "koi_red_white", s: "female", l: "peer", p: "docile", pair: "ahua_p1" },
        { d: "rouge", s: "male", l: "any", p: "hot" },
        { d: "koi_golden_scale", s: "male", l: "aspire", p: "docile" },
        { d: "snakehead", s: "female", l: "any", p: "timid" },
      ]),
      ...fishes("ahua", AHUA_T1, [
        { d: "dragon_eye", s: "male", l: "any", p: "aloof", pair: "ahua_p2" },
        { d: "dragon_eye", s: "female", l: "any", p: "docile", pair: "ahua_p2" },
        { d: "koi_golden_scale", s: "female", l: "peer", p: "docile", pair: "ahua_p3" },
        { d: "koi_golden_scale", s: "male", l: "peer", p: "hot", pair: "ahua_p3" },
        { d: "rouge", s: "female", l: "any", p: "docile" },
        { d: "koi_red_white", s: "male", l: "none", p: "aloof" },
        { d: "dragon_eye", s: "female", l: "aspire", p: "timid" },
      ]),
      ...fishes("ahua", AHUA_T2, [
        { d: "dragon_eye", s: "male", l: "any", p: "docile" },
        { d: "dragon_eye", s: "female", l: "any", p: "hot" },
        { d: "koi_golden_scale", s: "female", l: "peer", p: "docile" },
        { d: "rouge", s: "male", l: "any", p: "docile" },
        { d: "koi_red_white", s: "female", l: "any", p: "timid" },
        { d: "crucian", s: "male", l: "any", p: "docile" },
      ]),
    ],
  },
  {
    id: "npc_laochen",
    name: "老陈",
    hall: "清溪木屋",
    blurb: "本座的领域，凡人勿近。",
    tanks: [
      tank(CHEN_T0, "溪鳟木盆", "fine", "wood"),
      tank(CHEN_T1, "金鳟深缸", "rare", "rock"),
      tank(CHEN_T2, "翡翠静水", "rare", "coral"),
    ],
    fish: [
      ...fishes("chen", CHEN_T0, [
        { d: "rainbow_trout", s: "male", l: "any", p: "docile", pair: "chen_p1" },
        { d: "rainbow_trout", s: "female", l: "any", p: "docile", pair: "chen_p1" },
        { d: "brook_trout", s: "female", l: "peer", p: "aloof" },
        { d: "red_spot_salmon", s: "male", l: "any", p: "hot" },
        { d: "stone_bass", s: "female", l: "any", p: "timid" },
        { d: "horse_mouth", s: "male", l: "any", p: "docile" },
      ]),
      ...fishes("chen", CHEN_T1, [
        { d: "gold_trout", s: "male", l: "any", p: "aloof", pair: "chen_p2" },
        { d: "gold_trout", s: "female", l: "any", p: "docile", pair: "chen_p2" },
        { d: "gold_trout", s: "female", l: "peer", p: "docile" },
        { d: "brook_trout", s: "male", l: "aspire", p: "hot" },
        { d: "rainbow_trout", s: "female", l: "any", p: "timid" },
        { d: "red_spot_salmon", s: "male", l: "none", p: "aloof" },
      ]),
      ...fishes("chen", CHEN_T2, [
        { d: "emerald", s: "female", l: "any", p: "aloof" },
        { d: "emerald", s: "male", l: "any", p: "docile" },
        { d: "gold_trout", s: "male", l: "peer", p: "docile" },
        { d: "emerald", s: "female", l: "aspire", p: "timid" },
        { d: "minnow", s: "male", l: "any", p: "hot" },
        { d: "brook_trout", s: "female", l: "any", p: "docile" },
      ]),
    ],
  },
  {
    id: "npc_xiaoyu",
    name: "小羽",
    hall: "溪边木盆",
    blurb: "命运的齿轮开始转动了。",
    tanks: [
      tank(YU_T0, "浅溪木盆", "fine", "wood"),
      tank(YU_T1, "虹鳟廊", "fine", "coral"),
      tank(YU_T2, "金鳟暗格", "rare", "rock"),
    ],
    fish: [
      ...fishes("yu", YU_T0, [
        { d: "minnow", s: "female", l: "any", p: "timid" },
        { d: "horse_mouth", s: "male", l: "any", p: "hot" },
        { d: "stone_bass", s: "female", l: "peer", p: "docile", pair: "yu_p1" },
        { d: "stone_bass", s: "male", l: "peer", p: "docile", pair: "yu_p1" },
        { d: "brook_trout", s: "female", l: "any", p: "aloof" },
      ]),
      ...fishes("yu", YU_T1, [
        { d: "rainbow_trout", s: "male", l: "any", p: "docile" },
        { d: "rainbow_trout", s: "female", l: "any", p: "docile" },
        { d: "red_spot_salmon", s: "female", l: "any", p: "hot", pair: "yu_p2" },
        { d: "red_spot_salmon", s: "male", l: "any", p: "docile", pair: "yu_p2" },
        { d: "brook_trout", s: "male", l: "aspire", p: "timid" },
        { d: "stone_bass", s: "female", l: "any", p: "docile" },
      ]),
      ...fishes("yu", YU_T2, [
        { d: "gold_trout", s: "female", l: "any", p: "aloof" },
        { d: "gold_trout", s: "male", l: "peer", p: "docile" },
        { d: "emerald", s: "female", l: "any", p: "docile" },
        { d: "rainbow_trout", s: "male", l: "any", p: "hot" },
        { d: "gold_trout", s: "female", l: "none", p: "aloof" },
      ]),
    ],
  },
  {
    id: "npc_beibei",
    name: "北北",
    hall: "池塘边",
    blurb: "黑暗中的光，只为吾闪耀。",
    tanks: [
      tank(BEI_T0, "塘边陶缸", "common", "none"),
      tank(BEI_T1, "锦鲤浅缸", "fine", "wood"),
      tank(BEI_T2, "龙睛珍藏", "rare", "coral"),
    ],
    fish: [
      ...fishes("bei", BEI_T0, [
        { d: "crucian", s: "male", l: "any", p: "docile" },
        { d: "puffer", s: "female", l: "any", p: "timid" },
        { d: "black_carp", s: "male", l: "any", p: "hot" },
        { d: "crucian", s: "female", l: "any", p: "docile", pair: "bei_p1" },
        { d: "black_carp", s: "male", l: "any", p: "docile", pair: "bei_p1" },
      ]),
      ...fishes("bei", BEI_T1, [
        { d: "koi_red_white", s: "female", l: "any", p: "docile" },
        { d: "koi_golden_scale", s: "male", l: "peer", p: "aloof" },
        { d: "rouge", s: "female", l: "any", p: "hot" },
        { d: "snakehead", s: "male", l: "any", p: "docile" },
        { d: "koi_red_white", s: "male", l: "any", p: "timid" },
        { d: "rouge", s: "male", l: "aspire", p: "docile" },
      ]),
      ...fishes("bei", BEI_T2, [
        { d: "dragon_eye", s: "female", l: "any", p: "aloof" },
        { d: "dragon_eye", s: "male", l: "any", p: "docile" },
        { d: "koi_golden_scale", s: "female", l: "peer", p: "docile" },
        { d: "rouge", s: "female", l: "any", p: "timid" },
        { d: "dragon_eye", s: "male", l: "none", p: "hot" },
      ]),
    ],
  },
  {
    id: "npc_xiaomei",
    name: "小美",
    hall: "琉璃水榭",
    blurb: "区区凡鱼，也敢入我法眼？",
    tanks: [
      tank(MEI_T0, "琉璃东缸", "rare", "coral"),
      tank(MEI_T1, "琉璃西缸", "rare", "rock"),
      tank(MEI_T2, "流光主缸", "precious", "coral"),
    ],
    fish: [
      ...fishes("mei", MEI_T0, [
        { d: "dragon_eye", s: "female", l: "any", p: "aloof", pair: "mei_p1" },
        { d: "dragon_eye", s: "male", l: "any", p: "docile", pair: "mei_p1" },
        { d: "emerald", s: "female", l: "peer", p: "docile" },
        { d: "gold_trout", s: "male", l: "any", p: "hot" },
        { d: "dragon_eye", s: "male", l: "aspire", p: "timid" },
        { d: "koi_golden_scale", s: "female", l: "any", p: "docile" },
      ]),
      ...fishes("mei", MEI_T1, [
        { d: "emerald", s: "male", l: "any", p: "aloof", pair: "mei_p2" },
        { d: "emerald", s: "female", l: "any", p: "docile", pair: "mei_p2" },
        { d: "gold_trout", s: "female", l: "peer", p: "docile" },
        { d: "gold_trout", s: "male", l: "peer", p: "aloof" },
        { d: "dragon_eye", s: "female", l: "any", p: "hot" },
        { d: "emerald", s: "male", l: "none", p: "aloof" },
      ]),
      ...fishes("mei", MEI_T2, [
        { d: "emerald", s: "female", l: "any", p: "aloof" },
        { d: "dragon_eye", s: "male", l: "any", p: "docile" },
        { d: "gold_trout", s: "female", l: "any", p: "docile" },
        { d: "dragon_eye", s: "female", l: "peer", p: "timid" },
        { d: "emerald", s: "male", l: "aspire", p: "docile" },
        { d: "koi_golden_scale", s: "male", l: "any", p: "hot" },
        { d: "gold_trout", s: "male", l: "any", p: "docile" },
      ]),
    ],
  },
  {
    id: "npc_daliu",
    name: "大刘",
    hall: "金鳞堂",
    blurb: "燃烧吧，我的小宇宙！",
    tanks: [
      tank(LIU_T0, "金鳞大厅", "rare", "wood"),
      tank(LIU_T1, "鳟鱼侧厅", "rare", "rock"),
      tank(LIU_T2, "压箱底缸", "precious", "coral"),
    ],
    fish: [
      ...fishes("liu", LIU_T0, [
        { d: "koi_golden_scale", s: "male", l: "any", p: "hot", pair: "liu_p1" },
        { d: "koi_golden_scale", s: "female", l: "any", p: "docile", pair: "liu_p1" },
        { d: "koi_red_white", s: "female", l: "peer", p: "docile" },
        { d: "dragon_eye", s: "male", l: "any", p: "aloof" },
        { d: "rouge", s: "female", l: "any", p: "timid" },
        { d: "koi_golden_scale", s: "male", l: "aspire", p: "docile" },
      ]),
      ...fishes("liu", LIU_T1, [
        { d: "gold_trout", s: "female", l: "any", p: "docile", pair: "liu_p2" },
        { d: "gold_trout", s: "male", l: "any", p: "aloof", pair: "liu_p2" },
        { d: "rainbow_trout", s: "male", l: "peer", p: "hot" },
        { d: "emerald", s: "female", l: "any", p: "docile" },
        { d: "red_spot_salmon", s: "female", l: "any", p: "timid" },
        { d: "brook_trout", s: "male", l: "any", p: "docile" },
      ]),
      ...fishes("liu", LIU_T2, [
        { d: "emerald", s: "male", l: "any", p: "aloof" },
        { d: "dragon_eye", s: "female", l: "any", p: "docile" },
        { d: "gold_trout", s: "female", l: "peer", p: "docile" },
        { d: "koi_golden_scale", s: "female", l: "any", p: "hot" },
        { d: "emerald", s: "female", l: "aspire", p: "timid" },
        { d: "dragon_eye", s: "male", l: "none", p: "aloof" },
        { d: "gold_trout", s: "male", l: "any", p: "docile" },
      ]),
    ],
  },
];

export const LEADER_BY_ID: Record<string, LeaderNpc> = Object.fromEntries(
  LEADERBOARD.map((n) => [n.id, n]),
);

/** 求购溢价：挂牌价 ×2。 */
export function leaderBuyPrice(defId: string): number {
  const sell = FISH_BY_ID[defId]?.sellPrice ?? 1;
  return Math.max(1, sell * 2);
}

/** 租借单价（金/天）：普通1 · 优良5 · 稀有30 · 珍贵80 · 极品200。 */
export const LEADER_RENT_PRICE_BY_QUALITY: Record<Quality, number> = {
  common: 1,
  fine: 5,
  rare: 30,
  precious: 80,
  ultimate: 200,
};

export function leaderRentPricePerDay(defId: string): number {
  const q = FISH_BY_ID[defId]?.quality ?? "common";
  return LEADER_RENT_PRICE_BY_QUALITY[q];
}

/** 申请配偶聘礼：挂牌价。 */
export function leaderMatePrice(defId: string): number {
  const sell = FISH_BY_ID[defId]?.sellPrice ?? 1;
  return Math.max(1, sell);
}

export function visibleLeaderFish(npc: LeaderNpc, takenUids: string[]): TankFish[] {
  const gone = new Set(takenUids);
  return npc.fish.filter((f) => !gone.has(f.uid));
}
