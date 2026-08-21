/**
 * 存档 Schema。localStorage 单 JSON，结构按可迁移后端设计（扁平、可序列化、带版本号）。
 * 术语与 CONTEXT.md 一一对应：baitStock（鱼饵）/ foodStock（鱼食）/ equipped.* / pearl / gold。
 */

import type { LoveView, Personality, Quality, RodPartSlot, Sex } from "../types";
import { QUALITY_ORDER, ROD_PART_SLOTS } from "../types";
import { DEFAULT_REAL_MS_PER_GAME_DAY, NEWBIE_PACK_DAYS } from "../game/constants";
import { kitPartIds, ROD_BY_ID, STARTER_PARTS } from "../data/equipmentDefs";
import { FISH_BY_ID } from "../data/fishDefs";
import { FISHERY_BY_ID } from "../data/fisheryDefs";
import { CONSUMABLE_BY_ID, baitIdFromFood } from "../data/consumableDefs";
import { parseLoveView, parsePersonality, rollTraits } from "../game/traits";
import { sexFromUid } from "../game/sex";
import { STARTER_TANK_CAPACITY, STARTER_TANK_ID, STARTER_TANK_SLOTS, inferQualityFromCapacity, starterTanks } from "../game/tanks";
import { capacityForQuality } from "../data/tankDefs";
import { ATTRACTANT_BY_ID } from "../data/attractantDefs";
import { getSessionAccount, readCurrentSaveRaw, setSessionAccount, writeCurrentSaveRaw } from "./accounts";

export const SAVE_VERSION = 9;

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
  progress: number;
  target: number;
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
}

/** 玩家挂售在鱼行的鱼或鱼卵。 */
export interface Listing {
  uid: string;
  defId: string;
  price: number;
  /** 来源：玩家挂售 / 鱼行系统。 */
  source: "player" | "market";
  kind: "fish" | "egg";
  parentB?: string;
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
  /** 缸位扩建完工的游戏天；null 表示没有在建。 */
  expandSlotReadyDay: number | null;
  caughtFishIds: string[];
  scene: SceneId;
  questStep: string;
  gameDay: number;
  /** 上次按天结算时的现实时间戳；与现在比北京自然日差，决定过了几天。 */
  lastDayTickAt: number;
  /** 旧字段，不再参与结算。 */
  realMsPerGameDay: number;
  /** 已开始（过登录页）。 */
  started: boolean;
  hosting: boolean;
  /** 渔场月卡到期游戏天（含当日）。 */
  fisheryCards: Record<string, number>;
  /** 月卡到期游戏天；-1 未开通。 */
  monthlyCardUntilDay: number;
  lastMonthlyClaimDay: number;
  claimedNewbiePack: boolean;
  newbiePackUntilDay: number;
  /** 欧气层数，上钩概率按 ADR-010 档位叠加。 */
  luck: number;
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
  satietyUsed: number;
  satietyDay: number;
  /** 上次享受「每日首次做菜 +50%」的游戏天；-1 表示还没有。 */
  firstCookDay: number;
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
  | "cook";

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
  return { endDay: day + 7, progress: 0, target: 3, claimed: false };
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
  const set = new Set(extra);
  for (const id of ROD_PART_SLOTS) set.add(STARTER_PARTS[id]);
  for (const rodId of ownedRods) {
    for (const pid of kitPartIds(rodId)) set.add(pid);
  }
  return [...set];
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
  const ownedRods = Array.isArray(d.ownedRods) ? (d.ownedRods as string[]) : ["rod_bamboo"];
  const equippedRod = String(equipped.rod ?? "rod_bamboo");
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
        source: x.source === "market" ? "market" : "player",
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
    expandSlotReadyDay: pendingExpand,
    caughtFishIds: Array.isArray(d.caughtFishIds) ? (d.caughtFishIds as string[]) : [],
    scene: (d.scene as SceneId) === "login" ? "login" : ((d.scene as SceneId) ?? "aquarium"),
    questStep: typeof d.questStep === "string" ? d.questStep : "q_go_fish",
    gameDay: Number(d.gameDay) || 0,
    lastDayTickAt: Number(d.lastDayTickAt) || Date.now(),
    realMsPerGameDay: Number(d.realMsPerGameDay) || DEFAULT_REAL_MS_PER_GAME_DAY,
    started: d.started === true || (d.version === 1 && d.scene !== "login"),
    hosting: Boolean(d.hosting),
    fisheryCards: (d.fisheryCards as Record<string, number>) ?? {},
    monthlyCardUntilDay: typeof d.monthlyCardUntilDay === "number" ? d.monthlyCardUntilDay : -1,
    lastMonthlyClaimDay: typeof d.lastMonthlyClaimDay === "number" ? d.lastMonthlyClaimDay : -1,
    claimedNewbiePack: Boolean(d.claimedNewbiePack),
    newbiePackUntilDay: typeof d.newbiePackUntilDay === "number" ? d.newbiePackUntilDay : NEWBIE_PACK_DAYS,
    luck: Number(d.luck) || 0,
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
    playerLevel: Math.min(30, Math.max(1, Number(d.playerLevel) || 1)),
    playerXp: Math.max(0, Number(d.playerXp) || 0),
    stamina: 100,
    staminaUpdatedAt: Date.now(),
    saltStock: typeof d.saltStock === "number" ? Math.max(0, d.saltStock) : 10,
    energyDrinkStock: Math.max(0, Number(d.energyDrinkStock) || 0),
    yuanqiBottles: Math.min(3, Math.max(0, Number(d.yuanqiBottles) || 0)),
    yuanqiProgress: Math.max(0, Number(d.yuanqiProgress) || 0),
    satietyUsed: Math.max(0, Number(d.satietyUsed) || 0),
    satietyDay: typeof d.satietyDay === "number" ? d.satietyDay : Number(d.gameDay) || 0,
    firstCookDay: typeof d.firstCookDay === "number" ? d.firstCookDay : -1,
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
    const q = asRecord(d.timed);
    base.timed = {
      endDay: typeof q.endDay === "number" ? q.endDay : gameDay + 7,
      progress: Number(q.progress) || 0,
      target: Number(q.target) || 3,
      claimed: Boolean(q.claimed),
    };
  }
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
        parts: { ...base.equippedParts, ...(asRecord(x.parts) as Record<RodPartSlot, string>) },
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
    if (raw == null) {
      setSessionAccount(null);
      return null;
    }
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

/** 几乎没玩过的新档：可以把旧单槽并进来。 */
export function saveLooksUnused(save: SaveData): boolean {
  return (
    save.gold <= 50 &&
    save.pearl === 0 &&
    save.tank.length === 0 &&
    save.basket.length === 0 &&
    save.eggs.length === 0 &&
    save.caughtFishIds.length === 0 &&
    save.gameDay <= 1
  );
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
    tank: [],
    basket: [],
    listings: seedMarketListings(),
    eggs: [],
    tanks,
    activeTankId: STARTER_TANK_ID,
    defaultTankId: STARTER_TANK_ID,
    tankSlots: STARTER_TANK_SLOTS,
    expandSlotReadyDay: null,
    caughtFishIds: [],
    scene: "login",
    questStep: "q_go_fish",
    gameDay: 0,
    lastDayTickAt: now,
    realMsPerGameDay: DEFAULT_REAL_MS_PER_GAME_DAY,
    started: false,
    hosting: false,
    fisheryCards: {},
    monthlyCardUntilDay: -1,
    lastMonthlyClaimDay: -1,
    claimedNewbiePack: false,
    newbiePackUntilDay: NEWBIE_PACK_DAYS,
    luck: 0,
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
    firstCookDay: -1,
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
  ];
}

/** 按品质给鱼食 id（喂食时拒食判定用）。 */
export function foodQuality(_foodId: string): Quality | null {
  return null;
}

export { DEFAULT_REAL_MS_PER_GAME_DAY as REAL_MS_PER_GAME_DAY };
