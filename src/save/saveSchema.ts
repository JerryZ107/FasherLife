/**
 * 存档 Schema。真档在游戏服务按账号分槽，结构扁平、可序列化、带版本号。
 * 术语与 CONTEXT.md 一一对应：baitStock（鱼饵）/ foodStock（鱼食）/ equipped.* / pearl / gold。
 */

import type { LoveView, Personality, Quality, RodPartSlot, Sex } from "../types";
import { QUALITY_ORDER, ROD_PART_SLOTS } from "../types";
import { DEFAULT_REAL_MS_PER_GAME_DAY, NEWBIE_PACK_DAYS } from "../game/constants";
import { kitPartIds, LEGACY_HANDLE_TO_ROD, PART_BY_ID, ROD_BY_ID, STARTER_PARTS } from "../data/equipmentDefs";
import { FISH_BY_ID } from "../data/fishDefs";
import { FISHERY_BY_ID } from "../data/fisheryDefs";
import { CONSUMABLE_BY_ID, baitIdFromFood } from "../data/consumableDefs";
import { parseLoveView, parsePersonality, rollTraits } from "../game/traits";
import { sexFromUid } from "../game/sex";
import { STARTER_TANK_CAPACITY, STARTER_TANK_ID, STARTER_TANK_SLOTS, inferQualityFromCapacity, migrateTankSlotIds, starterTanks, starterFish, starterEggs } from "../game/tanks";
import { capacityForQuality } from "../data/tankDefs";
import { ATTRACTANT_BY_ID } from "../data/attractantDefs";
import { buildTimedQuestItems, type TimedQuestItem } from "../data/timedQuestDefs";
import { getSessionAccount, readCurrentSaveRaw, setSessionAccount, writeCurrentSaveRaw } from "./accounts";

export const SAVE_VERSION = 21;

/** 玩家自由笔记。 */
export interface PlayerNote {
  uid: string;
  title: string;
  content: string;
  updatedAt: number;
}

export type TankDecor = "none" | "coral" | "rock" | "wood";

/** 鱼缸里的一条鱼（实例）。 */
export interface TankFish {
  uid: string;
  defId: string;
  /** 健康值，入缸 100。每天不喂掉 1，低于 60 指数扣。0 则死亡。 */
  health: number;
  dead: boolean;
  /** 上次喂食对应的游戏天（喂过则当夜不扣健康）。 */
  lastFedDay: number;
  lastSettledAt: number;
  sex: Sex;
  /** 配偶关系 id，未配对为 null。 */
  pairId: string | null;
  tankId: string;
  /** 单鱼求偶香生效到（含）该游戏天；0 表示没有。 */
  attractUntilDay: number;
  /** 单鱼求偶香当前成功率加成。 */
  attractBonus: number;
  personality: Personality;
  loveView: LoveView;
  /** 孕期剩余游戏天；未配对为 0。 */
  gestationLeft: number;
  /** 求偶香 5 分钟产卵的现实时间戳；0 表示没有。 */
  scentLayAt: number;
  /** 这一对累计产卵次数；解配清零。 */
  layCount: number;
  /** 好感 0～10；满 10 可起名。 */
  affection: number;
  /** 玩家起的名字；null 表示未起名。 */
  customName: string | null;
  /** 最近一次抚摸对应的游戏天。 */
  petDay: number;
  /** 当天抚摸次数（每天最多 3 次，+0.1 好感/次）。 */
  petCount: number;
}

/** 缸底鱼卵。子代随机继承某一亲本 defId，无遗传。 */
export interface TankEgg {
  uid: string;
  tankId: string;
  pairId: string;
  parentA: string;
  parentB: string;
  laidDay: number;
  /** 开工后到期游戏天；未开工为 0。 */
  readyDay: number;
  /** 已付金币开工。 */
  started: boolean;
}

export interface PlayerTank {
  id: string;
  name: string;
  quality: Quality;
  capacity: number;
  decor: TankDecor;
  /** 整缸香氛生效到（含）该游戏天；0 表示没有。 */
  tankAttractUntilDay: number;
  /** 整缸香氛当前成功率加成。 */
  tankAttractBonus: number;
}

export interface TripLoadout {
  id: string;
  name: string;
  rod: string;
  bait: string;
  baitIds: string[];
  stool: string;
  basket: string;
  parts: Record<RodPartSlot, string>;
  outfitId: string;
}

export interface DailyQuestState {
  day: number;
  fed: boolean;
  sold: boolean;
  fedClaimed: boolean;
  soldClaimed: boolean;
}

export interface TimedQuestState {
  endDay: number;
  items: TimedQuestItem[];
}

export interface NewbieTaskState {
  catchCommon: number;
  buyRod: number;
  swapPart: number;
  fillTank: number;
  buyTank: number;
  expand: number;
  cook: number;
  claimed: Partial<Record<string, boolean>>;
}

/** 邮箱里的一封信。正文和附件看 defId。 */
export interface MailItem {
  uid: string;
  defId: string;
  receivedDay: number;
  read: boolean;
  claimed: boolean;
}

/** 鱼筐里的一条鱼（实例，未入缸）。 */
export interface BasketFish {
  uid: string;
  defId: string;
  personality?: Personality;
  loveView?: LoveView;
  sex?: Sex;
  /** 从缸放回筐时保留；新钓到的没有。 */
  health?: number;
  lastFedDay?: number;
  affection?: number;
  customName?: string | null;
}

/** 玩家挂售在鱼行的鱼或鱼卵。 */
export interface Listing {
  uid: string;
  defId: string;
  price: number;
  /** 来源：自己挂售 / 鱼行系统 / 其他钓友。 */
  source: "player" | "market" | "other";
  kind: "fish" | "egg";
  parentB?: string;
}

/** 做出来的菜，保质期 3 游戏天；过期只能丢。 */
export interface CookedDish {
  uid: string;
  defId: string;
  restore: number;
  cookedDay: number;
}

export interface EquippedSlots {
  rod: string;
  bait: string;
  food: string;
  stool: string;
  basket: string;
}

export interface IdleState {
  fisheryId: string;
  startedAt: number;
  lastSimAt: number;
}

export interface SaveData {
  version: number;
  gold: number;
  pearl: number;
  baitStock: Record<string, number>;
  foodStock: Record<string, number>;
  attractantStock: Record<string, number>;
  ownedRods: string[];
  ownedStools: string[];
  ownedBaskets: string[];
  ownedParts: string[];
  equippedParts: Record<RodPartSlot, string>;
  ownedOutfits: string[];
  equippedOutfit: string;
  /** 玩家小人男女外观，和鱼的性别无关。 */
  lookSex: Sex;
  ownedBooks: string[];
  equipped: EquippedSlots;
  tank: TankFish[];
  basket: BasketFish[];
  listings: Listing[];
  eggs: TankEgg[];
  tanks: PlayerTank[];
  activeTankId: string;
  defaultTankId: string;
  /** 水族馆能摆下几口缸（ADR-015 缸位）。 */
  tankSlots: number;
  /** 每个凹槽对应的鱼缸 id；null 表示空置。 */
  tankSlotIds: (string | null)[];
  /** 缸位扩建完工的现实时间戳；null 表示没有在建。 */
  expandReadyAt: number | null;
  caughtFishIds: string[];
  scene: SceneId;
  questStep: string;
  /** 关掉界面引导后不再弹出；任务线仍在任务页。 */
  guideSkipped: boolean;
  /**
   * 钓鱼行程引导相位：
   * 0 空闲；1 馆→地图；2 地图→钓点；3 钓点→地图；4 地图→馆（待存缸）；
   * 5 鱼筐→馆（待喂食）。
   */
  guideTripPhase: 0 | 1 | 2 | 3 | 4 | 5;
  /** 开局引导买鱼粮：买过或离开商城即置真，避免重复引导。 */
  guideShopDone: boolean;
  /** 是否已弹过新手引导询问。未弹则进游戏先欢迎再问是否要引导。 */
  guidePrompted: boolean;
  /** 钓鱼成功后的挂机引导是否已完成（避免重复）。 */
  guideIdleDone: boolean;
  /** 吃菜后的体力提示是否已展示过（新手最后一步）。 */
  guideStaminaHinted: boolean;
  gameDay: number;
  /** 上次按天结算时的现实时间戳；与现在比北京自然日差，决定过了几天。 */
  lastDayTickAt: number;
  /** 游戏时速：现实 1 秒等于多少游戏秒。默认 1（实时）；>1 时按经过的现实时长 × 时速加速推进游戏天。 */
  gameSpeed: number;
  /** 旧字段，不再参与结算。 */
  realMsPerGameDay: number;
  /** 已开始（过登录页）。 */
  started: boolean;
  /** 开启托管的缸 id；空数组表示未托管。 */
  hostedTankIds: string[];
  /** 渔场月卡到期游戏天（含当日）。 */
  fisheryCards: Record<string, number>;
  /** 月卡到期游戏天；-1 未开通。 */
  monthlyCardUntilDay: number;
  lastMonthlyClaimDay: number;
  claimedNewbiePack: boolean;
  claimedGearPack: boolean;
  claimedOutfitPack: boolean;
  claimedTankPack: boolean;
  newbiePackUntilDay: number;
  /** 欧气层数，上钩概率按 ADR-010 档位叠加。 */
  luck: number;
  /** 正在参观的榜单钓友；不在馆内为 null。 */
  visitNpcId: string | null;
  /** 已从榜单馆求购或申请配偶带走的鱼 uid。 */
  leaderTakenUids: string[];
  idle: IdleState | null;
  /** 上次进入的渔场，刷新后仍停在钓鱼点。 */
  lastFisheryId: string | null;
  /** 钓手名（展示用，默认等于账号）。 */
  playerName: string;
  /** 出钓携带的鱼饵（可多选）；equipped.bait 为当前下竿消耗的那一种。 */
  equippedBaitIds: string[];
  /** 当前自定义装备组合名。 */
  loadoutName: string;
  loadouts: TripLoadout[];
  activeLoadoutId: string;
  daily: DailyQuestState;
  timed: TimedQuestState;
  /** 新手任务（成就式，与界面引导线分离）。 */
  newbieTasks: NewbieTaskState;
  /** 玩家等级 1～30（ADR-016）。 */
  playerLevel: number;
  playerXp: number;
  /** 当前能量。 */
  stamina: number;
  /** 自然恢复锚点（现实时间戳）。 */
  staminaUpdatedAt: number;
  /** 盐（做菜调料）。 */
  saltStock: number;
  energyDrinkStock: number;
  yuanqiBottles: number;
  yuanqiProgress: number;
  /** 今日已吃菜次数（饱腹次数）。 */
  satietyUsed: number;
  satietyDay: number;
  /** 上次吃菜的现实时间戳；0 表示还没吃过。两道菜间隔见 DISH_EAT_INTERVAL_MS。 */
  lastDishAteAt: number;
  /** 上次享受「每日首次做菜 +50%」的游戏天；-1 表示还没有。 */
  firstCookDay: number;
  mails: MailItem[];
  /** 已投递过的系统信模板 id。 */
  mailFlags: Record<string, boolean>;
  dishes: CookedDish[];
  notes: PlayerNote[];
}

export type SceneId =
  | "login"
  | "aquarium"
  | "fishing_map"
  | "fishing"
  | "shop"
  | "market"
  | "equipment"
  | "encyclopedia"
  | "quests"
  | "select_fish"
  | "store_tank"
  | "sneak"
  | "leaderboard"
  | "visit_aquarium"
  | "cook"
  | "mail"
  | "notes";

const SCENE_IDS: SceneId[] = [
  "login",
  "aquarium",
  "fishing_map",
  "fishing",
  "shop",
  "market",
  "equipment",
  "encyclopedia",
  "quests",
  "select_fish",
  "store_tank",
  "sneak",
  "leaderboard",
  "visit_aquarium",
  "cook",
  "mail",
  "notes",
];

function parseScene(v: unknown, visitNpcId: string | null): SceneId {
  if (v === "login") return "login";
  if (v === "visit_aquarium") return visitNpcId ? "visit_aquarium" : "leaderboard";
  if (typeof v === "string" && SCENE_IDS.includes(v as SceneId)) return v as SceneId;
  return "aquarium";
}

const BAIT_ID_MIGRATE: Record<string, string> = {
  bait_dough: "bait_fermented_bran",
  bait_worm_red: "bait_red_worm_ball",
  bait_worm_earth: "bait_wine_wheat",
  bait_shrimp: "bait_loach",
  bait_pupa: "bait_bee_pupa",
  bait_mash: "bait_fermented_bran",
};

function remapBaitId(id: string): string {
  return BAIT_ID_MIGRATE[id] ?? id;
}

function remapFoodId(id: string): string {
  return remapBaitId(id.replace(/^food_/, "bait_")).replace(/^bait_/, "food_");
}

function remapStock(stock: Record<string, number>, remap: (id: string) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, n] of Object.entries(stock)) {
    const nid = remap(id);
    out[nid] = (out[nid] ?? 0) + n;
  }
  return out;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export function freshDaily(day: number): DailyQuestState {
  return { day, fed: false, sold: false, fedClaimed: false, soldClaimed: false };
}

export function freshTimed(day: number): TimedQuestState {
  return { endDay: day + 7, items: buildTimedQuestItems(day) };
}

export function freshNewbieTasks(): NewbieTaskState {
  return {
    catchCommon: 0,
    buyRod: 0,
    swapPart: 0,
    fillTank: 0,
    buyTank: 0,
    expand: 0,
    cook: 0,
    claimed: {},
  };
}

function normalizeTimed(raw: Record<string, unknown>, gameDay: number): TimedQuestState {
  const endDay = typeof raw.endDay === "number" ? raw.endDay : gameDay + 7;
  if (Array.isArray(raw.items) && (raw.items as unknown[]).length > 0) {
    return {
      endDay,
      items: (raw.items as TimedQuestItem[]).map((it, i) => {
        const x = asRecord(it);
        return {
          id: String(x.id || `tq_${i}`),
          kind: x.kind === "species" ? "species" : "quality",
          title: String(x.title || "限时任务"),
          hint: String(x.hint || ""),
          minQuality: typeof x.minQuality === "string" ? (x.minQuality as TimedQuestItem["minQuality"]) : undefined,
          fishId: typeof x.fishId === "string" ? x.fishId : undefined,
          progress: Number(x.progress) || 0,
          target: Number(x.target) || 1,
          rewardGold: Number(x.rewardGold) || 80,
          claimed: Boolean(x.claimed),
        };
      }),
    };
  }
  // 旧格式：单条 progress/target → 迁成多任务，保留旧进度到第一条
  const legacyProgress = Number(raw.progress) || 0;
  const legacyTarget = Number(raw.target) || 3;
  const legacyClaimed = Boolean(raw.claimed);
  const items = buildTimedQuestItems(gameDay);
  if (items[0]) {
    items[0].progress = Math.min(legacyTarget, legacyProgress);
    items[0].target = legacyTarget;
    items[0].claimed = legacyClaimed;
  }
  return { endDay, items };
}

function normalizeNewbieTasks(raw: unknown): NewbieTaskState {
  const base = freshNewbieTasks();
  if (!raw || typeof raw !== "object") return base;
  const q = asRecord(raw);
  return {
    catchCommon: Number(q.catchCommon) || 0,
    buyRod: Number(q.buyRod) || 0,
    swapPart: Number(q.swapPart) || 0,
    fillTank: Number(q.fillTank) || 0,
    buyTank: Number(q.buyTank) || 0,
    expand: Number(q.expand) || 0,
    cook: Number(q.cook) || 0,
    claimed: q.claimed && typeof q.claimed === "object" ? { ...(q.claimed as Record<string, boolean>) } : {},
  };
}

function defaultLoadout(
  equipped: EquippedSlots,
  parts: Record<RodPartSlot, string>,
  baitIds: string[],
  outfitId: string,
  name: string,
): TripLoadout {
  return {
    id: "loadout_default",
    name,
    rod: equipped.rod,
    bait: equipped.bait,
    baitIds: [...baitIds],
    stool: equipped.stool,
    basket: equipped.basket,
    parts: { ...parts },
    outfitId,
  };
}

function collectOwnedParts(ownedRods: string[], extra: string[]): string[] {
  const set = new Set<string>();
  for (const id of extra) {
    if (LEGACY_HANDLE_TO_ROD[id]) continue;
    if (PART_BY_ID[id]) set.add(id);
  }
  for (const slot of ROD_PART_SLOTS) set.add(STARTER_PARTS[slot]);
  for (const rodId of ownedRods) {
    for (const pid of kitPartIds(rodId)) set.add(pid);
  }
  return [...set];
}

function rodsFromLegacyHandles(extra: string[], ownedRods: string[]): string[] {
  const set = new Set(ownedRods.filter((id) => Boolean(ROD_BY_ID[id])));
  if (set.size === 0) set.add("rod_bamboo");
  for (const id of extra) {
    const rodId = LEGACY_HANDLE_TO_ROD[id];
    if (rodId && ROD_BY_ID[rodId]) set.add(rodId);
  }
  return [...set];
}

function pickLoadoutParts(
  fallback: Record<RodPartSlot, string>,
  raw: Record<string, unknown>,
): Record<RodPartSlot, string> {
  const next = { ...fallback };
  for (const slot of ROD_PART_SLOTS) {
    const id = typeof raw[slot] === "string" ? String(raw[slot]) : fallback[slot];
    next[slot] = PART_BY_ID[id] && PART_BY_ID[id].slot === slot ? id : fallback[slot];
  }
  return next;
}

function parseDecor(value: unknown): TankDecor {
  return value === "coral" || value === "rock" || value === "wood" ? value : "none";
}

function parseTankQuality(value: unknown, capacity: number): Quality {
  if (typeof value === "string" && (QUALITY_ORDER as string[]).includes(value)) return value as Quality;
  return inferQualityFromCapacity(capacity);
}

function gestationDaysFromHealth(health: number): number | null {
  const h = Math.floor(health);
  if (h <= 60) return null;
  if (h <= 70) return 6;
  if (h <= 80) return 5;
  if (h <= 85) return 4;
  if (h <= 94) return 3;
  return 2;
}

/** 旧存档已配对但没有孕期时，按双方较低健康补上。 */
function fillMissingGestation(tank: TankFish[]): void {
  const map = new Map<string, TankFish[]>();
  for (const f of tank) {
    if (!f.pairId || f.dead) continue;
    const arr = map.get(f.pairId) ?? [];
    arr.push(f);
    map.set(f.pairId, arr);
  }
  for (const arr of map.values()) {
    if (arr.length < 2) continue;
    const a = arr[0];
    const b = arr[1];
    if (!a || !b) continue;
    if ((a.scentLayAt ?? 0) > 0 || (b.scentLayAt ?? 0) > 0) continue;
    if ((a.gestationLeft ?? 0) > 0 || (b.gestationLeft ?? 0) > 0) continue;
    const days = gestationDaysFromHealth(Math.min(a.health, b.health));
    if (days == null) continue;
    a.gestationLeft = days;
    b.gestationLeft = days;
  }
}

/** 旧存档没有 layCount 时，用缸底同对鱼卵数补上，并让双方次数对齐。 */
function syncPairLayCounts(tank: TankFish[], eggs: TankEgg[]): void {
  const fromEggs = new Map<string, number>();
  for (const e of eggs) {
    if (!e.pairId) continue;
    fromEggs.set(e.pairId, (fromEggs.get(e.pairId) ?? 0) + 1);
  }
  const byPair = new Map<string, TankFish[]>();
  for (const f of tank) {
    if (!f.pairId) continue;
    const arr = byPair.get(f.pairId) ?? [];
    arr.push(f);
    byPair.set(f.pairId, arr);
  }
  for (const [pid, arr] of byPair) {
    let n = fromEggs.get(pid) ?? 0;
    for (const f of arr) n = Math.max(n, f.layCount ?? 0);
    for (const f of arr) f.layCount = n;
  }
}

function migrateParts(
  d: Record<string, unknown>,
  ownedRods: string[],
  equippedRod: string,
): { ownedParts: string[]; equippedParts: Record<RodPartSlot, string> } {
  const extra = Array.isArray(d.ownedParts) ? (d.ownedParts as string[]) : [];
  const ownedParts = collectOwnedParts(ownedRods, extra);
  const rawEq = asRecord(d.equippedParts);
  const kit = ROD_BY_ID[equippedRod]?.kit ?? STARTER_PARTS;
  const equippedParts = { ...STARTER_PARTS };
  for (const slot of ROD_PART_SLOTS) {
    const id = typeof rawEq[slot] === "string" ? String(rawEq[slot]) : kit[slot];
    equippedParts[slot] = ownedParts.includes(id) ? id : kit[slot];
  }
  return { ownedParts, equippedParts };
}

function migrate(raw: unknown): SaveData | null {
  const d = asRecord(raw);
  if (typeof d.version !== "number") return null;

  const equipped = asRecord(d.equipped);
  const tankRaw = Array.isArray(d.tank) ? d.tank : [];
  const listingsRaw = Array.isArray(d.listings) ? d.listings : [];
  const extraParts = Array.isArray(d.ownedParts) ? (d.ownedParts as string[]) : [];
  const ownedRods = rodsFromLegacyHandles(
    extraParts,
    Array.isArray(d.ownedRods) ? (d.ownedRods as string[]) : ["rod_bamboo"],
  );
  const equippedRod = ROD_BY_ID[String(equipped.rod ?? "rod_bamboo")] ? String(equipped.rod ?? "rod_bamboo") : "rod_bamboo";
  const { ownedParts, equippedParts } = migrateParts(d, ownedRods, equippedRod);

  const tanksRaw = Array.isArray(d.tanks) ? d.tanks : starterTanks();
  const tanks = tanksRaw.map((t, i) => {
    const x = asRecord(t);
    const rawCap = Number(x.capacity) || STARTER_TANK_CAPACITY;
    const quality = parseTankQuality(x.quality, rawCap);
    const occ = tankRaw.filter((f) => {
      const tf = asRecord(f);
      return String(tf.tankId || "") === String(x.id || (i === 0 ? STARTER_TANK_ID : `tank_${i}`));
    }).length;
    return {
      id: String(x.id || (i === 0 ? STARTER_TANK_ID : `tank_${i}`)),
      name: String(x.name || `鱼缸 ${String.fromCharCode(65 + i)}`),
      quality,
      capacity: Math.max(capacityForQuality(quality), occ),
      decor: parseDecor(x.decor),
      tankAttractUntilDay: typeof x.tankAttractUntilDay === "number" ? x.tankAttractUntilDay : 0,
      tankAttractBonus: typeof x.tankAttractBonus === "number" ? x.tankAttractBonus : 0,
    };
  });
  if (tanks.length === 0) tanks.push(...starterTanks());
  const firstTank = tanks[0].id;
  const pendingExpand = tanksRaw.reduce((day: number | null, t) => {
    const x = asRecord(t);
    return typeof x.expandReadyDay === "number" ? x.expandReadyDay : day;
  }, typeof d.expandSlotReadyDay === "number" ? Number(d.expandSlotReadyDay) : null);

  const visitNpcId = typeof d.visitNpcId === "string" && d.visitNpcId ? String(d.visitNpcId) : null;
  const leaderTakenUids = Array.isArray(d.leaderTakenUids)
    ? (d.leaderTakenUids as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  const base: SaveData = {
    version: SAVE_VERSION,
    gold: Number(d.gold) || 0,
    pearl: Number(d.pearl) || 0,
    baitStock: remapStock((d.baitStock as SaveData["baitStock"]) ?? { bait_basic: 20 }, remapBaitId),
    foodStock: remapStock((d.foodStock as SaveData["foodStock"]) ?? { food_basic: 10 }, remapFoodId),
    attractantStock: remapStock((d.attractantStock as SaveData["attractantStock"]) ?? {}, (id) => id),
    ownedRods,
    ownedStools: Array.isArray(d.ownedStools) ? (d.ownedStools as string[]) : ["stool_wood"],
    ownedBaskets: Array.isArray(d.ownedBaskets) ? (d.ownedBaskets as string[]) : ["basket_small"],
    ownedParts,
    equippedParts,
    ownedOutfits: Array.isArray(d.ownedOutfits) ? (d.ownedOutfits as string[]) : ["outfit_default"],
    equippedOutfit: typeof d.equippedOutfit === "string" ? String(d.equippedOutfit) : "outfit_default",
    lookSex: d.lookSex === "female" ? "female" : "male",
    ownedBooks: Array.isArray(d.ownedBooks) ? (d.ownedBooks as string[]) : [],
    equipped: {
      rod: equippedRod,
      bait: remapBaitId(String(equipped.bait ?? "bait_basic")),
      food: remapFoodId(String(equipped.food ?? "food_basic")),
      stool: String(equipped.stool ?? "stool_wood"),
      basket: String(equipped.basket ?? "basket_small"),
    },
    tank: tankRaw.map((f) => {
      const tf = asRecord(f);
      const uid = String(tf.uid);
      const traits = rollTraits();
      return {
        uid,
        defId: String(tf.defId),
        health: Number(tf.health) || 0,
        dead: Boolean(tf.dead),
        lastFedDay: typeof tf.lastFedDay === "number" ? tf.lastFedDay : -1,
        lastSettledAt: Number(tf.lastSettledAt) || Date.now(),
        sex: tf.sex === "female" || tf.sex === "male" ? tf.sex : sexFromUid(uid),
        pairId: typeof tf.pairId === "string" ? tf.pairId : null,
        tankId: typeof tf.tankId === "string" ? tf.tankId : firstTank,
        attractUntilDay: typeof tf.attractUntilDay === "number" ? tf.attractUntilDay : 0,
        attractBonus: typeof tf.attractBonus === "number" ? tf.attractBonus : 0,
        personality: parsePersonality(tf.personality) ?? traits.personality,
        loveView: parseLoveView(tf.loveView) ?? traits.loveView,
        gestationLeft: typeof tf.gestationLeft === "number" ? tf.gestationLeft : 0,
        scentLayAt: typeof tf.scentLayAt === "number" ? tf.scentLayAt : 0,
        layCount: typeof tf.layCount === "number" ? Math.max(0, Math.floor(tf.layCount)) : 0,
        affection: typeof tf.affection === "number" ? Math.min(10, Math.max(0, tf.affection)) : 0,
        customName:
          typeof tf.customName === "string" && tf.customName.trim()
            ? tf.customName.trim().slice(0, 8)
            : null,
        petDay: typeof tf.petDay === "number" ? tf.petDay : -1,
        petCount: typeof tf.petCount === "number" ? Math.max(0, Math.min(3, Math.floor(tf.petCount))) : 0,
      };
    }),
    basket: Array.isArray(d.basket)
      ? (d.basket as unknown[]).map((b) => {
          const x = asRecord(b);
          const traits = rollTraits();
          return {
            uid: String(x.uid),
            defId: String(x.defId),
            personality: parsePersonality(x.personality) ?? traits.personality,
            loveView: parseLoveView(x.loveView) ?? traits.loveView,
            sex: x.sex === "female" || x.sex === "male" ? x.sex : undefined,
            health: typeof x.health === "number" ? x.health : undefined,
            lastFedDay: typeof x.lastFedDay === "number" ? x.lastFedDay : undefined,
          };
        })
      : [],
    listings: listingsRaw.map((l) => {
      const x = asRecord(l);
      return {
        uid: String(x.uid),
        defId: String(x.defId),
        price: Number(x.price) || 0,
        source: x.source === "market" ? "market" : x.source === "other" ? "other" : "player",
        kind: x.kind === "egg" ? "egg" : "fish",
        parentB: typeof x.parentB === "string" ? x.parentB : undefined,
      };
    }),
    eggs: Array.isArray(d.eggs)
      ? (d.eggs as TankEgg[]).map((e) => {
          const x = asRecord(e);
          return {
            uid: String(x.uid),
            tankId: String(x.tankId || firstTank),
            pairId: String(x.pairId || ""),
            parentA: String(x.parentA),
            parentB: String(x.parentB),
            laidDay: Number(x.laidDay) || 0,
            readyDay: Number(x.readyDay) || 0,
            started: typeof x.started === "boolean" ? Boolean(x.started) : Number(x.readyDay) > 0,
          };
        })
      : [],
    tanks,
    activeTankId: typeof d.activeTankId === "string" ? String(d.activeTankId) : firstTank,
    defaultTankId: typeof d.defaultTankId === "string" ? String(d.defaultTankId) : firstTank,
    tankSlots: Math.max(STARTER_TANK_SLOTS, Number(d.tankSlots) || tanks.length, tanks.length),
    tankSlotIds: migrateTankSlotIds(tanks, Math.max(STARTER_TANK_SLOTS, Number(d.tankSlots) || tanks.length, tanks.length), d.tankSlotIds),
    expandReadyAt: (() => {
      if (typeof d.expandReadyAt === "number") return d.expandReadyAt;
      if (pendingExpand != null || typeof d.expandSlotReadyDay === "number") return Date.now();
      return null;
    })(),
    caughtFishIds: Array.isArray(d.caughtFishIds) ? (d.caughtFishIds as string[]) : [],
    scene: parseScene(d.scene, visitNpcId),
    questStep: typeof d.questStep === "string" ? d.questStep : "q_go_fish",
    guideSkipped: d.guideSkipped === true,
    guideTripPhase: (() => {
      const raw = Number(d.guideTripPhase);
      if (raw === 1 || raw === 2 || raw === 3 || raw === 4 || raw === 5) return raw;
      // 旧存档：guidePendingStore / 待存缸任务 → 视为已回程
      if (d.guidePendingStore === true) {
        return parseScene(d.scene, null) === "aquarium" ? 4 : 3;
      }
      const basket = Array.isArray(d.basket) ? (d.basket as unknown[]) : [];
      const step = typeof d.questStep === "string" ? d.questStep : "q_go_fish";
      if (step === "q_tank" && basket.length > 0) {
        return parseScene(d.scene, null) === "aquarium" ? 4 : 3;
      }
      return 0;
    })(),
    guideShopDone: d.guideShopDone === true,
    guidePrompted: (() => {
      if (d.guidePrompted === true) return true;
      // 老存档已有进度：视为已弹过，不再强弹欢迎
      const caught = Array.isArray(d.caughtFishIds) ? (d.caughtFishIds as unknown[]).length : 0;
      const day = Number(d.gameDay) || 0;
      const step = typeof d.questStep === "string" ? d.questStep : "q_go_fish";
      return caught > 0 || day > 0 || step === "q_done";
    })(),
    guideIdleDone: (() => {
      if (d.guideIdleDone === true) return true;
      const caught = Array.isArray(d.caughtFishIds) ? (d.caughtFishIds as unknown[]).length : 0;
      const day = Number(d.gameDay) || 0;
      const step = typeof d.questStep === "string" ? d.questStep : "q_go_fish";
      return caught > 0 || day > 0 || step === "q_done";
    })(),
    guideStaminaHinted: d.guideStaminaHinted === true,
    gameDay: Number(d.gameDay) || 0,
    lastDayTickAt: Number(d.lastDayTickAt) || Date.now(),
    gameSpeed: Number(d.gameSpeed) > 0 ? Number(d.gameSpeed) : 1,
    realMsPerGameDay: Number(d.realMsPerGameDay) || DEFAULT_REAL_MS_PER_GAME_DAY,
    started: d.started === true || (d.version === 1 && d.scene !== "login"),
    hostedTankIds: (() => {
      if (Array.isArray(d.hostedTankIds)) {
        return (d.hostedTankIds as string[]).filter((id) => tanks.some((t) => t.id === id));
      }
      if (Boolean(d.hosting)) return tanks.map((t) => t.id);
      return [];
    })(),
    fisheryCards: (d.fisheryCards as Record<string, number>) ?? {},
    monthlyCardUntilDay: typeof d.monthlyCardUntilDay === "number" ? d.monthlyCardUntilDay : -1,
    lastMonthlyClaimDay: typeof d.lastMonthlyClaimDay === "number" ? d.lastMonthlyClaimDay : -1,
    claimedNewbiePack: Boolean(d.claimedNewbiePack),
    claimedGearPack: Boolean(d.claimedGearPack),
    claimedOutfitPack: Boolean(d.claimedOutfitPack),
    claimedTankPack: Boolean(d.claimedTankPack),
    newbiePackUntilDay: typeof d.newbiePackUntilDay === "number" ? d.newbiePackUntilDay : NEWBIE_PACK_DAYS,
    luck: Number(d.luck) || 0,
    visitNpcId,
    leaderTakenUids,
    idle: (d.idle as IdleState | null) ?? null,
    lastFisheryId: typeof d.lastFisheryId === "string" ? d.lastFisheryId : (d.idle as IdleState | null)?.fisheryId ?? null,
    playerName: typeof d.playerName === "string" ? d.playerName : "",
    equippedBaitIds: Array.isArray(d.equippedBaitIds)
      ? [...new Set((d.equippedBaitIds as string[]).map(remapBaitId))]
      : [remapBaitId(String(equipped.bait ?? "bait_basic"))],
    loadoutName: typeof d.loadoutName === "string" ? d.loadoutName : "默认搭配",
    loadouts: [],
    activeLoadoutId: "loadout_default",
    daily: freshDaily(Number(d.gameDay) || 0),
    timed: freshTimed(Number(d.gameDay) || 0),
    newbieTasks: freshNewbieTasks(),
    playerLevel: Math.min(30, Math.max(1, Number(d.playerLevel) || 1)),
    playerXp: Math.max(0, Number(d.playerXp) || 0),
    stamina: 100,
    staminaUpdatedAt: Date.now(),
    saltStock: typeof d.saltStock === "number" ? Math.max(0, d.saltStock) : 10,
    energyDrinkStock: Math.max(0, Number(d.energyDrinkStock) || 0),
    yuanqiBottles: Math.min(3, Math.max(0, Number(d.yuanqiBottles) || 0)),
    yuanqiProgress: Math.max(0, Number(d.yuanqiProgress) || 0),
    satietyUsed: Number(d.version) >= 12 ? Math.max(0, Number(d.satietyUsed) || 0) : 0,
    satietyDay: typeof d.satietyDay === "number" ? d.satietyDay : Number(d.gameDay) || 0,
    lastDishAteAt: Number(d.version) >= 12 ? Math.max(0, Number(d.lastDishAteAt) || 0) : 0,
    firstCookDay: typeof d.firstCookDay === "number" ? d.firstCookDay : -1,
    mails: Array.isArray(d.mails)
      ? (d.mails as unknown[]).map((m) => {
          const x = asRecord(m);
          return {
            uid: String(x.uid),
            defId: String(x.defId),
            receivedDay: Number(x.receivedDay) || 0,
            read: Boolean(x.read),
            claimed: Boolean(x.claimed),
          };
        }).filter((m) => m.uid && m.defId)
      : [],
    mailFlags: asRecord(d.mailFlags) as Record<string, boolean>,
    dishes: Array.isArray(d.dishes)
      ? (d.dishes as unknown[]).map((x) => {
          const r = asRecord(x);
          return {
            uid: String(r.uid),
            defId: String(r.defId),
            restore: Math.max(1, Number(r.restore) || 1),
            cookedDay: Number(r.cookedDay) || 0,
          };
        }).filter((x) => x.uid && x.defId)
      : [],
    notes: Array.isArray(d.notes)
      ? (d.notes as unknown[]).map((x) => {
          const r = asRecord(x);
          return {
            uid: String(r.uid),
            title: typeof r.title === "string" ? r.title : "",
            content: typeof r.content === "string" ? r.content : "",
            updatedAt: typeof r.updatedAt === "number" ? r.updatedAt : Date.now(),
          };
        }).filter((n) => n.uid)
      : [],
  };

  const lv = base.playerLevel;
  const cap = 100 + 10 * (lv - 1);
  base.stamina = typeof d.stamina === "number" ? Math.max(0, Math.min(cap, d.stamina)) : cap;
  base.staminaUpdatedAt = typeof d.staminaUpdatedAt === "number" ? d.staminaUpdatedAt : Date.now();

  if (!base.ownedOutfits.includes("outfit_default")) base.ownedOutfits = ["outfit_default", ...base.ownedOutfits];
  const gameDay = base.gameDay;
  if (d.daily && typeof d.daily === "object") {
    const q = asRecord(d.daily);
    base.daily = {
      day: typeof q.day === "number" ? q.day : gameDay,
      fed: Boolean(q.fed),
      sold: Boolean(q.sold),
      fedClaimed: Boolean(q.fedClaimed),
      soldClaimed: Boolean(q.soldClaimed),
    };
  }
  if (d.timed && typeof d.timed === "object") {
    base.timed = normalizeTimed(asRecord(d.timed), gameDay);
  }
  base.newbieTasks = normalizeNewbieTasks(d.newbieTasks);
  if (Array.isArray(d.loadouts) && (d.loadouts as unknown[]).length > 0) {
    base.loadouts = (d.loadouts as TripLoadout[]).map((l, i) => {
      const x = asRecord(l);
      return {
        id: String(x.id || `loadout_${i}`),
        name: String(x.name || `搭配 ${i + 1}`),
        rod: String(x.rod || base.equipped.rod),
        bait: remapBaitId(String(x.bait || base.equipped.bait)),
        baitIds: Array.isArray(x.baitIds) ? (x.baitIds as string[]).map(remapBaitId) : [...base.equippedBaitIds],
        stool: String(x.stool || base.equipped.stool),
        basket: String(x.basket || base.equipped.basket),
        parts: pickLoadoutParts(base.equippedParts, asRecord(x.parts)),
        outfitId: typeof x.outfitId === "string" ? x.outfitId : base.equippedOutfit,
      };
    });
    base.activeLoadoutId = typeof d.activeLoadoutId === "string" ? String(d.activeLoadoutId) : base.loadouts[0].id;
  } else {
    const one = defaultLoadout(base.equipped, base.equippedParts, base.equippedBaitIds, base.equippedOutfit, base.loadoutName);
    base.loadouts = [one];
    base.activeLoadoutId = one.id;
  }

  if (base.questStep === "q_take_rod") base.questStep = "q_go_fish";
  if (!base.started) base.scene = "login";
  if (base.idle) {
    base.scene = "fishing";
    base.lastFisheryId = base.idle.fisheryId;
  }
  if (base.lastFisheryId && !FISHERY_BY_ID[base.lastFisheryId]) {
    base.lastFisheryId = "village_pond";
    if (base.idle && !FISHERY_BY_ID[base.idle.fisheryId]) {
      base.idle = null;
      if (base.scene === "fishing") base.scene = "aquarium";
    }
  }
  base.tank = base.tank.filter((f) => Boolean(FISH_BY_ID[f.defId]));
  base.basket = base.basket.filter((b) => Boolean(FISH_BY_ID[b.defId]));
  base.listings = base.listings.filter((l) => l.kind === "egg" || Boolean(FISH_BY_ID[l.defId]));
  base.listings = mergeOtherListings(base.listings);
  base.dishes = (base.dishes ?? []).filter((x) => Boolean(FISH_BY_ID[x.defId]));
  base.eggs = base.eggs.filter((e) => Boolean(FISH_BY_ID[e.parentA]) && Boolean(FISH_BY_ID[e.parentB]));
  base.caughtFishIds = base.caughtFishIds.filter((id) => Boolean(FISH_BY_ID[id]));
  base.baitStock = Object.fromEntries(
    Object.entries(base.baitStock).filter(([id]) => Boolean(CONSUMABLE_BY_ID[id])),
  );
  base.foodStock = Object.fromEntries(
    Object.entries(base.foodStock).filter(([id]) => Boolean(CONSUMABLE_BY_ID[baitIdFromFood(id)])),
  );
  base.attractantStock = Object.fromEntries(
    Object.entries(base.attractantStock).filter(([id]) => Boolean(ATTRACTANT_BY_ID[id])),
  );
  if (!CONSUMABLE_BY_ID[base.equipped.bait]) base.equipped.bait = "bait_basic";
  if (!CONSUMABLE_BY_ID[baitIdFromFood(base.equipped.food)]) base.equipped.food = "food_basic";
  base.equippedBaitIds = base.equippedBaitIds.filter((id) => Boolean(CONSUMABLE_BY_ID[id]));
  if (base.equippedBaitIds.length === 0) base.equippedBaitIds = ["bait_basic"];
  fillMissingGestation(base.tank);
  syncPairLayCounts(base.tank, base.eggs);
  if (!base.tanks.some((t) => t.id === base.activeTankId)) base.activeTankId = firstTank;
  if (!base.tanks.some((t) => t.id === base.defaultTankId)) base.defaultTankId = firstTank;
  const tankCap = Math.max(
    tanks.find((t) => t.id === firstTank)?.capacity ?? STARTER_TANK_CAPACITY,
    base.tank.filter((f) => f.tankId === firstTank).length,
  );
  const t0 = base.tanks.find((t) => t.id === firstTank);
  if (t0 && t0.capacity < tankCap) t0.capacity = tankCap;
  return base;
}

export function loadSave(): SaveData | null {
  try {
    const acc = getSessionAccount();
    if (!acc) return null;
    const raw = readCurrentSaveRaw();
    if (raw == null) return null;
    return migrate(raw);
  } catch {
    return null;
  }
}

export function hydrateSave(raw: unknown): SaveData | null {
  try {
    return migrate(raw);
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  try {
    writeCurrentSaveRaw(data);
  } catch (e) {
    console.error("存档写入失败", e);
  }
}

export function clearSave(): void {
  setSessionAccount(null);
}

/** 几乎没玩过的新档：可以把旧单槽并进来。新档自带起始鱼/卵，故只看是否仅含起始资产。 */
export function saveLooksUnused(save: SaveData): boolean {
  if (save.gold > 50 || save.pearl !== 0) return false;
  if (save.basket.length !== 0 || save.caughtFishIds.length !== 0 || save.gameDay > 1) return false;
  const starterFishUids = new Set(starterFish().map((f) => f.uid));
  const starterEggUids = new Set(starterEggs().map((e) => e.uid));
  if (save.tank.length > starterFishUids.size) return false;
  if (save.eggs.length > starterEggUids.size) return false;
  return (
    save.tank.every((f) => starterFishUids.has(f.uid)) &&
    save.eggs.every((e) => starterEggUids.has(e.uid))
  );
}

/** 未迁移的生数据是否已经有进度。用来拦住空档把旧号盖掉。 */
export function rawSaveLooksRich(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const d = raw as Record<string, unknown>;
  const gold = Number(d.gold) || 0;
  const pearl = Number(d.pearl) || 0;
  const tank = Array.isArray(d.tank) ? d.tank.length : 0;
  const basket = Array.isArray(d.basket) ? d.basket.length : 0;
  const eggs = Array.isArray(d.eggs) ? d.eggs.length : 0;
  const caught = Array.isArray(d.caughtFishIds) ? d.caughtFishIds.length : 0;
  const day = Number(d.gameDay) || 0;
  return gold > 50 || pearl > 0 || tank > 0 || basket > 0 || eggs > 0 || caught > 0 || day > 1;
}

export function createNewSave(): SaveData {
  const now = Date.now();
  const tanks = starterTanks();
  return {
    version: SAVE_VERSION,
    gold: 50,
    pearl: 0,
    baitStock: { bait_basic: 20 },
    foodStock: { food_basic: 10 },
    attractantStock: {},
    ownedRods: ["rod_bamboo"],
    ownedStools: ["stool_wood"],
    ownedBaskets: ["basket_small"],
    ownedParts: kitPartIds("rod_bamboo"),
    equippedParts: { ...STARTER_PARTS },
    ownedOutfits: ["outfit_default"],
    equippedOutfit: "outfit_default",
    lookSex: "male",
    ownedBooks: [],
    equipped: {
      rod: "rod_bamboo",
      bait: "bait_basic",
      food: "food_basic",
      stool: "stool_wood",
      basket: "basket_small",
    },
    tank: starterFish(),
    basket: [],
    listings: seedMarketListings(),
    eggs: starterEggs(),
    tanks,
    activeTankId: STARTER_TANK_ID,
    defaultTankId: STARTER_TANK_ID,
    tankSlots: STARTER_TANK_SLOTS,
    tankSlotIds: [STARTER_TANK_ID],
    expandReadyAt: null,
    caughtFishIds: [],
    scene: "login",
    questStep: "q_feed",
    guideSkipped: false,
    guideTripPhase: 0,
    guideShopDone: false,
    guidePrompted: false,
    guideIdleDone: false,
    guideStaminaHinted: false,
    gameDay: 0,
    lastDayTickAt: now,
    gameSpeed: 1,
    realMsPerGameDay: DEFAULT_REAL_MS_PER_GAME_DAY,
    started: false,
    hostedTankIds: [],
    fisheryCards: {},
    monthlyCardUntilDay: -1,
    lastMonthlyClaimDay: -1,
    claimedNewbiePack: false,
    claimedGearPack: false,
    claimedOutfitPack: false,
    claimedTankPack: false,
    newbiePackUntilDay: NEWBIE_PACK_DAYS,
    luck: 0,
    visitNpcId: null,
    leaderTakenUids: [],
    idle: null,
    lastFisheryId: null,
    playerName: "",
    equippedBaitIds: ["bait_basic"],
    loadoutName: "默认搭配",
    loadouts: [
      defaultLoadout(
        {
          rod: "rod_bamboo",
          bait: "bait_basic",
          food: "food_basic",
          stool: "stool_wood",
          basket: "basket_small",
        },
        { ...STARTER_PARTS },
        ["bait_basic"],
        "outfit_default",
        "默认搭配",
      ),
    ],
    activeLoadoutId: "loadout_default",
    daily: freshDaily(0),
    timed: freshTimed(0),
    newbieTasks: freshNewbieTasks(),
    playerLevel: 1,
    playerXp: 0,
    stamina: 100,
    staminaUpdatedAt: now,
    saltStock: 10,
    energyDrinkStock: 0,
    yuanqiBottles: 0,
    yuanqiProgress: 0,
    satietyUsed: 0,
    satietyDay: 0,
    lastDishAteAt: 0,
    firstCookDay: -1,
    mails: [],
    mailFlags: {},
    dishes: [],
    notes: [],
  };
}

/** 鱼行系统货：便于购买页演示「鱼行来源」。 */
export function seedMarketListings(): Listing[] {
  return [
    { uid: "sys_crucian", defId: "crucian", price: 5, source: "market", kind: "fish" },
    { uid: "sys_minnow", defId: "minnow", price: 8, source: "market", kind: "fish" },
    { uid: "sys_koi", defId: "koi_red_white", price: 28, source: "market", kind: "fish" },
    { uid: "sys_snakehead", defId: "snakehead", price: 32, source: "market", kind: "fish" },
    { uid: "sys_stone_bass", defId: "stone_bass", price: 36, source: "market", kind: "fish" },
    { uid: "sys_dragon_eye", defId: "dragon_eye", price: 120, source: "market", kind: "fish" },
    { uid: "sys_gold_trout", defId: "gold_trout", price: 130, source: "market", kind: "fish" },
    { uid: "sys_emerald", defId: "emerald", price: 140, source: "market", kind: "fish" },
    ...seedOtherPlayerListings(),
  ];
}

/** 其他钓友挂的便宜鱼，比鱼行系统价低一截。 */
export function seedOtherPlayerListings(): Listing[] {
  return [
    { uid: "oth_crucian", defId: "crucian", price: 3, source: "other", kind: "fish" },
    { uid: "oth_puffer", defId: "puffer", price: 3, source: "other", kind: "fish" },
    { uid: "oth_minnow", defId: "minnow", price: 5, source: "other", kind: "fish" },
    { uid: "oth_koi", defId: "koi_red_white", price: 18, source: "other", kind: "fish" },
    { uid: "oth_snakehead", defId: "snakehead", price: 20, source: "other", kind: "fish" },
    { uid: "oth_stone_bass", defId: "stone_bass", price: 22, source: "other", kind: "fish" },
    { uid: "oth_gold_trout", defId: "gold_trout", price: 85, source: "other", kind: "fish" },
  ];
}

function mergeOtherListings(listings: Listing[]): Listing[] {
  const have = new Set(listings.map((l) => l.uid));
  const extra = seedOtherPlayerListings().filter((l) => !have.has(l.uid));
  return extra.length ? [...listings, ...extra] : listings;
}

/** 按品质给鱼食 id（喂食时拒食判定用）。 */
export function foodQuality(_foodId: string): Quality | null {
  return null;
}

export { DEFAULT_REAL_MS_PER_GAME_DAY as REAL_MS_PER_GAME_DAY };
