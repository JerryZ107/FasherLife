import { create } from "zustand";
import {
  type SaveData,
  type SceneId,
  type TripLoadout,
  loadSave,
  writeSave,
  createNewSave,
  hydrateSave,
  saveLooksUnused,
  rawSaveLooksRich,
  freshDaily,
  freshTimed,
  freshNewbieTasks,
} from "../save/saveSchema";
import { FISH_BY_ID } from "../data/fishDefs";
import { CONSUMABLE_BY_ID, foodIdFromBait } from "../data/consumableDefs";
import { kitPartIds, PART_BY_ID, ROD_BY_ID, STOOL_BY_ID, BASKET_BY_ID } from "../data/equipmentDefs";
import { OUTFIT_BY_ID } from "../data/outfitDefs";
import { BOOK_BY_ID, bookLuck } from "../data/bookDefs";
import { JUNK_IDLE_STAMINA, type BottleStory, type JunkDef } from "../data/junkDefs";
import { FISHERY_BY_ID } from "../data/fisheryDefs";
import { QUEST_BY_ID } from "../data/questDefs";
import { NEWBIE_TASK_BY_ID, type NewbieTaskId } from "../data/newbieTaskDefs";
import { qualityMeets } from "../data/timedQuestDefs";
import { TANK_BY_ID } from "../data/tankDefs";
import { ATTRACTANT_BY_ID } from "../data/attractantDefs";
import type { FishDef, LoveView, Personality, QuestTrigger, RodPartSlot, Sex } from "../types";
import {
  IDLE_MS_PER_CAST,
  LUCK_CAP,
  MONTHLY_CARD_DAILY_GOLD,
  MONTHLY_CARD_DAYS,
  NEWBIE_PACK_DAYS,
  PEARL_TO_GOLD,
} from "../game/constants";
import {
  canFeed,
  cheapestFoodForQuality,
  fishQuality,
  healthDropForDay,
  hostingDailyFee,
  pickFoodForQuality,
  tankSellPrice,
  type FeedResult,
} from "../game/economy";
import {
  addAffection,
  affectionGainForFeed,
  canNameFish,
  fishTitle,
  normalizeFishName,
  tryPetFish,
} from "../game/affection";
import { questIndex } from "../game/guide";
import { genUid, pickBiteOutcome, applyJunkToSave, addToBasket, replaceBasketFish, tryAddToBasket, basketFits, basketRejectReason, type BasketAddResult } from "../game/fishingLogic";
import { copyMails, ensureInbox, grantMailReward, mailExpired } from "../game/mail";
import { extendMonthlyCard, monthlyDaysLeft, MONTHLY_GIFT_REEL, settleMonthlyGold } from "../game/monthlyCard";
import { MAIL_BY_ID, mailHasReward } from "../data/mailDefs";
import { sexFromUid } from "../game/sex";
import {
  bindPair,
  breakPair,
  hatchDaysForParents,
  hatchGoldForParents,
  HATCH_PEARL,
  pickOffspringDefId,
  resolveScentLays,
  rollOffspringTraits,
  rollPairAccept,
  scentBuyTimeForFish,
  scentBuyTimeForTank,
  tickPairsAndEggs,
} from "../game/pairing";
import { rollTraits } from "../game/traits";
import {
  accountExists,
  clearLegacySave,
  getSessionAccount,
  getSessionHash,
  hashPassword,
  peekLegacySaveRaw,
  readAccountSaveRaw,
  remoteLogin,
  remoteRegister,
  setSessionAccount,
  upsertLocalSlot,
  validateAccount,
  validatePassword,
  verifyAccountHash,
  writeRememberedAuth,
} from "../save/accounts";
import {
  EXPAND_GOLD,
  EXPAND_MS,
  EXPAND_STEP,
  STARTER_TANK_ID,
  emptyTank,
  ensureTankSlotArray,
  firstEmptySlotIndex,
  isTankPlaced,
  nextTankName,
  placedTanks,
  tankHasRoom,
} from "../game/tanks";
import { applySlotAssign, checkSlotAssignOverflow } from "../game/slotAssign";
import { LEADER_BY_ID, leaderBuyPrice, leaderMatePrice, leaderRentPricePerDay, visibleLeaderFish } from "../data/leaderboard";
import { askConfirm, useUi } from "./uiStore";
import {
  addStamina,
  applyStaminaRegen,
  cookRestore,
  dishEatWaitMs,
  dishExpired,
  ENERGY_DRINK_PRICE,
  ENERGY_DRINK_STAMINA,
  formatWait,
  grantCatchXp,
  idleStaminaCostForDef,
  PLAYER_LEVEL_MAX,
  resetSatietyIfNewDay,
  SALT_PACK_SIZE,
  SALT_PRICE,
  satietyMax,
  YUANQI_RESTORE,
} from "../game/stamina";
import { beijingCalendarDaysPassed } from "../game/time";

const bootSave = createNewSave();
const hasSessionCreds = Boolean(getSessionAccount() && getSessionHash());

interface GameStore {
  save: SaveData;
  selectedTankUid: string | null;
  selectedEggUid: string | null;
  selectedFisheryId: string | null;
  account: string | null;
  booting: boolean;

  setScene: (scene: SceneId) => void;
  selectTankFish: (uid: string | null) => void;
  selectEgg: (uid: string | null) => void;
  selectFishery: (id: string | null) => void;
  startGame: (playerName?: string) => void;
  login: (account: string, password: string, remember?: boolean) => Promise<string | null>;
  register: (account: string, password: string, remember?: boolean) => Promise<string | null>;
  logout: () => void;
  bootSession: () => Promise<void>;
  resetSave: () => void;

  tick: (now: number) => void;
  settleDays: (now: number) => void;
  resolveScent: (now: number) => void;
  simulateIdle: (now: number, force?: boolean) => void;
  idleCatchOnce: () =>
    | { kind: "fish"; fish: FishDef; bag: BasketAddResult }
    | { kind: "junk"; junk: JunkDef; story: BottleStory | null }
    | null;
  claimMonthlyIfNeeded: () => void;
  claimMonthlyGold: () => boolean;

  putToTank: (basketUid: string) => void;
  putManyToTank: (basketUids: string[]) => void;
  feed: (uid: string, foodId?: string, opts?: { quiet?: boolean }) => FeedResult;
  feedMany: (uids: string[], foodIds: string[]) => void;
  renameFish: (uid: string, name: string) => boolean;
  petFish: (uid: string) => void;
  release: (uid: string) => void;
  releaseMany: (uids: string[]) => void;
  cleanDead: (uid: string) => void;
  cleanAllDead: () => void;
  setHostedTanks: (tankIds: string[]) => void;

  switchTank: (dir: -1 | 1) => void;
  setActiveTank: (id: string) => void;
  moveTankFish: (uids: string[], destTankId: string) => boolean;
  putTankToBasket: (uids: string[]) => boolean;
  setDefaultTank: () => void;
  buyTank: (defId: string) => boolean;
  startExpand: () => boolean;
  finishExpandIfReady: () => boolean;
  tryAssignTankSlot: (slotIndex: number, tankId: string | null) => boolean;
  confirmSlotOverflow: (basketUids: string[]) => boolean;
  unpair: (pairId: string) => void;
  buyAttractant: (id: string) => boolean;
  applyAttractantToFish: (uid: string, id: string) => boolean;
  applyAttractantToTank: (id: string) => boolean;

  hatchEgg: (eggUid: string) => boolean;
  accelerateEgg: (eggUid: string, mode: "pearl" | "ad") => boolean;
  listEgg: (eggUid: string, price: number) => void;

  hasFisheryCard: (fisheryId: string) => boolean;
  buyFisheryCard: (fisheryId: string) => boolean;
  enterFishery: (fisheryId: string, mode: "free" | "ticket" | "card" | "sneak") => boolean;
  paySneakFine: (fisheryId: string) => boolean;
  consumeBait: () => boolean;
  catchFish: (fishDef: FishDef, personality?: Personality) => "added" | "full";
  replaceBasketCatch: (uid: string, fishDef: FishDef, personality?: Personality) => boolean;
  releaseBasket: (uid: string) => void;
  releaseBasketMany: (uids: string[]) => void;
  pickBite: () => ReturnType<typeof pickBiteOutcome> | null;
  applyJunkCatch: (junk: JunkDef) => BottleStory | null;
  startIdle: () => boolean;
  stopIdle: () => void;
  cookFish: (uid: string, from: "basket" | "tank") => boolean;
  eatDish: (uid: string) => boolean;
  discardDish: (uid: string) => boolean;
  buySalt: (n: number) => boolean;
  buyEnergyDrink: (n: number) => boolean;
  drinkEnergy: () => boolean;
  drinkYuanqi: () => boolean;

  sellToMarket: (basketUid: string) => void;
  sellFromTank: (tankUid: string) => void;
  sellManyToMarket: (uids: string[]) => void;
  listFish: (basketUid: string, price: number) => void;
  listFromTank: (tankUid: string, price: number) => void;
  unlistListing: (listingUid: string) => void;
  listManyFromTank: (uids: string[], priceOf?: (defId: string) => number) => void;
  listMany: (uids: string[], priceOf: (defId: string) => number) => void;
  buyListing: (listingUid: string) => boolean;

  buyBaitPack: (baitId: string, packs: number) => boolean;
  buyFoodPack: (foodId: string, packs: number) => boolean;
  buyRod: (rodId: string) => boolean;
  buyStool: (stoolId: string) => boolean;
  buyBasket: (basketId: string) => boolean;
  buyPart: (partId: string) => boolean;
  buyOutfit: (outfitId: string) => boolean;
  buyBook: (bookId: string) => boolean;
  buyGearPack: () => boolean;
  buyOutfitPack: () => boolean;
  buyTankPack: () => boolean;
  equip: (slot: keyof SaveData["equipped"], id: string) => void;
  equipPart: (slot: RodPartSlot, partId: string) => void;
  equipOutfit: (outfitId: string) => void;
  setLookSex: (sex: Sex) => void;
  toggleTripBait: (baitId: string) => void;
  setLoadoutName: (name: string) => void;
  applyLoadout: (id: string) => void;
  saveNewLoadout: (name: string) => void;
  overwriteLoadout: (id: string) => void;
  deleteLoadout: (id: string) => void;
  claimDaily: (kind: "fed" | "sold") => void;
  claimTimed: (itemId: string) => void;
  claimNewbieTask: (id: NewbieTaskId) => void;
  topUpPearl: (amount: number) => void;
  exchangePearlToGold: (pearls: number) => boolean;
  buyNewbiePack: () => boolean;
  buyMonthlyCard: () => boolean;
  /** 调试：设置游戏时速（现实1s=多少游戏秒）。 */
  setGameSpeed: (speed: number) => void;
  /** 调试：直接设置金币。 */
  setGold: (n: number) => void;
  /** 调试：直接设置珍珠。 */
  setPearl: (n: number) => void;
  visitLeader: (npcId: string) => void;
  leaveVisit: () => void;
  buyLeaderFish: (uid: string) => boolean;
  applyLeaderMate: (leaderUid: string, myUid: string) => boolean;
  rentLeaderFish: (leaderUid: string, tankId: string, days: number) => boolean;

  readMail: (uid: string) => void;
  claimMail: (uid: string) => boolean;
  claimAllMail: () => void;
  deleteMail: (uid: string) => boolean;

  createNote: () => string;
  saveNote: (uid: string, title: string, content: string) => boolean;
  deleteNote: (uid: string) => void;

  notifyQuest: (trigger: QuestTrigger) => void;
  skipGuide: () => void;
  resumeGuide: (stepId?: string) => void;
  /** 回答新手引导询问：接受则开启引导，拒绝则关掉界面引导。 */
  answerGuidePrompt: (accept: boolean) => void;
}

function persist(save: SaveData, force = false) {
  if (!save.dishes) save.dishes = [];
  if (!save.notes) save.notes = [];
  const acc = getSessionAccount();
  if (!force && acc) {
    const raw = readAccountSaveRaw(acc);
    if (rawSaveLooksRich(raw) && saveLooksUnused(save)) {
      console.error("拒绝用空档覆盖已有存档");
      return;
    }
  }
  writeSave(save);
}

function toast(msg: string) {
  useUi.getState().showToast(msg);
}

function fishDisplayName(fish: { defId: string; customName?: string | null }): string {
  return fishTitle(fish);
}

function pickFoodForFish(fishDefId: string, foodIds: string[], foodStock: Record<string, number>): string | null {
  for (const id of foodIds) {
    if (!canFeed(fishDefId, id)) continue;
    if ((foodStock[id] ?? 0) <= 0) continue;
    return id;
  }
  return null;
}

function enterAccount(
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore,
  name: string,
  hash: string,
  save: SaveData,
) {
  setSessionAccount(name, hash);
  upsertLocalSlot(name, hash, save);
  persist(save);
  set({
    save,
    account: name,
    booting: false,
    selectedTankUid: null,
    selectedEggUid: null,
    selectedFisheryId: save.lastFisheryId,
  });
  get().settleDays(Date.now());
  get().claimMonthlyIfNeeded();
  // 新玩家首次进游戏：弹欢迎 + 引导询问
  if (!save.guidePrompted) useUi.getState().openWelcome();
}

function grantRodKit(save: SaveData, rodId: string) {
  const owned = new Set(save.ownedParts);
  for (const id of kitPartIds(rodId)) owned.add(id);
  save.ownedParts = [...owned];
}

function applyRodKit(save: SaveData, rodId: string) {
  const rod = ROD_BY_ID[rodId];
  if (!rod) return;
  grantRodKit(save, rodId);
  save.equippedParts = { ...rod.kit };
}

function makeTankFish(
  save: SaveData,
  defId: string,
  tankId: string,
  extra?: { sex?: Sex; personality?: Personality; loveView?: LoveView; health?: number; lastFedDay?: number },
): SaveData["tank"][number] {
  const uid = genUid("t");
  const traits = extra?.personality && extra.loveView
    ? { personality: extra.personality, loveView: extra.loveView }
    : rollTraits();
  const health = extra?.health != null ? Math.max(1, Math.min(100, extra.health)) : 100;
  return {
    uid,
    defId,
    health,
    dead: false,
    lastFedDay: extra?.lastFedDay ?? save.gameDay,
    lastSettledAt: Date.now(),
    sex: extra?.sex ?? sexFromUid(uid),
    pairId: null,
    tankId,
    attractUntilDay: 0,
    attractBonus: 0,
    personality: traits.personality,
    loveView: traits.loveView,
    gestationLeft: 0,
    scentLayAt: 0,
    layCount: 0,
    affection: 0,
    customName: null,
    petDay: -1,
    petCount: 0,
  };
}

function effectiveLuck(save: SaveData): number {
  return save.luck + bookLuck(save.ownedBooks ?? []);
}

function snapshotLoadout(save: SaveData, id: string, name: string): TripLoadout {
  return {
    id,
    name,
    rod: save.equipped.rod,
    bait: save.equipped.bait,
    baitIds: [...(save.equippedBaitIds ?? [save.equipped.bait])],
    stool: save.equipped.stool,
    basket: save.equipped.basket,
    parts: { ...save.equippedParts },
    outfitId: save.equippedOutfit,
  };
}

function applyLoadoutToSave(save: SaveData, l: TripLoadout) {
  save.equipped = { ...save.equipped, rod: l.rod, bait: l.bait, stool: l.stool, basket: l.basket };
  save.equippedBaitIds = [...l.baitIds];
  save.equippedParts = { ...l.parts };
  save.equippedOutfit = l.outfitId;
  save.loadoutName = l.name;
  save.activeLoadoutId = l.id;
}

function markDaily(save: SaveData, kind: "fed" | "sold") {
  if (!save.daily || save.daily.day !== save.gameDay) save.daily = freshDaily(save.gameDay);
  if (kind === "fed") save.daily.fed = true;
  else save.daily.sold = true;
}

function bumpTimedCatch(save: SaveData, defId: string) {
  if (!save.timed?.items) save.timed = freshTimed(save.gameDay);
  if (save.gameDay > save.timed.endDay) return;
  const def = FISH_BY_ID[defId];
  if (!def) return;
  save.timed = {
    ...save.timed,
    items: save.timed.items.map((it) => {
      if (it.claimed || it.progress >= it.target) return it;
      let hit = false;
      if (it.kind === "species" && it.fishId === defId) hit = true;
      if (it.kind === "quality" && qualityMeets(def.quality, it.minQuality)) hit = true;
      if (!hit) return it;
      return { ...it, progress: Math.min(it.target, it.progress + 1) };
    }),
  };
}

function ensureNewbieTasks(save: SaveData) {
  if (!save.newbieTasks) save.newbieTasks = freshNewbieTasks();
}

function bumpNewbieFlag(save: SaveData, key: "buyRod" | "swapPart" | "fillTank" | "buyTank" | "expand") {
  ensureNewbieTasks(save);
  if (save.newbieTasks[key] >= 1) return;
  save.newbieTasks = { ...save.newbieTasks, [key]: 1 };
}

function bumpNewbieCount(save: SaveData, key: "catchCommon" | "cook", n = 1) {
  ensureNewbieTasks(save);
  save.newbieTasks = { ...save.newbieTasks, [key]: (save.newbieTasks[key] ?? 0) + n };
}

function checkFillTank(save: SaveData) {
  ensureNewbieTasks(save);
  if (save.newbieTasks.fillTank >= 1) return;
  const tank = save.tanks.find((t) => t.id === STARTER_TANK_ID) ?? save.tanks[0];
  if (!tank) return;
  const live = save.tank.filter((f) => !f.dead && f.tankId === tank.id).length;
  if (live >= tank.capacity) bumpNewbieFlag(save, "fillTank");
}

function noteCatch(save: SaveData, fishDef: FishDef) {
  if (!save.caughtFishIds.includes(fishDef.id)) {
    save.caughtFishIds = [...save.caughtFishIds, fishDef.id];
  }
  bumpTimedCatch(save, fishDef.id);
  if (fishDef.quality === "common") bumpNewbieCount(save, "catchCommon");
  if (save.questStep === "q_go_fish") applyQuest(save, "open_map");
  applyQuest(save, "catch");
  const lv = grantCatchXp(save, fishDef.quality);
  if (lv.to > lv.from) {
    const msg = lv.to >= PLAYER_LEVEL_MAX
      ? `升到 ${lv.to} 级，能量已回满`
      : `升到 ${lv.to} 级`;
    toast(msg);
  }
}

type IdleCatchOutcome =
  | { ok: true; kind: "fish"; fish: FishDef; bag: BasketAddResult }
  | { ok: true; kind: "junk"; junk: JunkDef; story: BottleStory | null }
  | { ok: false; reason: "bait" | "stamina" | "gone" };

function cloneForIdle(prev: SaveData): SaveData {
  return {
    ...prev,
    idle: prev.idle ? { ...prev.idle } : null,
    baitStock: { ...prev.baitStock },
    foodStock: { ...prev.foodStock },
    basket: [...prev.basket],
  };
}

function runIdleAttempt(save: SaveData, announce: boolean): IdleCatchOutcome {
  if (!save.idle) return { ok: false, reason: "gone" };
  const fishery = FISHERY_BY_ID[save.idle.fisheryId];
  if (!fishery) {
    save.idle = null;
    return { ok: false, reason: "gone" };
  }
  const baitId = save.equipped.bait;
  const bait = save.baitStock[baitId] ?? 0;
  if (bait <= 0) return { ok: false, reason: "bait" };
  const bite = pickBiteOutcome(fishery.pool, baitId, effectiveLuck(save));
  if (bite.kind === "junk") {
    if (save.stamina < JUNK_IDLE_STAMINA) return { ok: false, reason: "stamina" };
    save.baitStock[baitId] = bait - 1;
    save.stamina -= JUNK_IDLE_STAMINA;
    const story = applyJunkToSave(save, bite.junk);
    if (announce) {
      if (bite.junk.kind === "bag") toast("塑料袋。你顺手扔进了垃圾桶。");
      if (bite.junk.kind === "weed") toast("一丛水草，洗洗能当普通鱼粮。");
    }
    return { ok: true, kind: "junk", junk: bite.junk, story: announce ? story : null };
  }
  const fish = bite.fish;
  const cost = idleStaminaCostForDef(fish.id);
  if (save.stamina < cost) return { ok: false, reason: "stamina" };
  save.baitStock[baitId] = bait - 1;
  save.stamina -= cost;
  const bag = tryAddToBasket(save, fish);
  if (bag !== "rejected") noteCatch(save, fish);
  if (announce) {
    if (bag === "added") toast(`${fish.name}进筐了`);
    else if (bag === "replaced") toast(`${fish.name}换进筐了`);
    else toast(`${fish.name}不如筐里的，放回去了`);
  }
  return { ok: true, kind: "fish", fish, bag };
}

function toastIdleStop(reason: "bait" | "stamina" | "gone") {
  if (reason === "bait") toast("鱼饵用完，已退出挂机");
  else if (reason === "stamina") toast("能量不足，已退出挂机");
}

function applyQuest(save: SaveData, trigger: QuestTrigger): boolean {
  const q = QUEST_BY_ID[save.questStep];
  if (!q || q.trigger !== trigger) return false;
  save.gold += q.rewardGold;
  if (q.rewardBait) {
    save.baitStock = {
      ...save.baitStock,
      [q.rewardBait.id]: (save.baitStock[q.rewardBait.id] ?? 0) + q.rewardBait.n,
    };
  }
  if (q.rewardFood) {
    save.foodStock = {
      ...save.foodStock,
      [q.rewardFood.id]: (save.foodStock[q.rewardFood.id] ?? 0) + q.rewardFood.n,
    };
  }
  if (q.rewardSalt) save.saltStock = (save.saltStock ?? 0) + q.rewardSalt;
  save.questStep = q.next ?? "q_done";
  const review = useUi.getState().guideReviewStep;
  if (review && questIndex(review) < questIndex(save.questStep)) {
    useUi.getState().setGuideReviewStep(null);
  }
  if (q.id === "q_sell") useUi.getState().resetGuideHints();
  if (trigger === "feed" || trigger === "tank") clearGuideTrip(save);
  // 离开钓鱼入缸段后清掉回程相位，防止后续任务被「再去钓鱼/存缸」劫持
  if (
    save.questStep !== "q_go_fish" &&
    save.questStep !== "q_catch" &&
    save.questStep !== "q_tank" &&
    save.guideTripPhase !== 0 &&
    save.guideTripPhase !== 5
  ) {
    clearGuideTrip(save);
  }
  const bits: string[] = [`任务完成：${q.title}`];
  if (q.rewardGold) bits.push(`+${q.rewardGold}金`);
  if (q.rewardSalt) bits.push(`+${q.rewardSalt}盐`);
  toast(bits.join(" "));
  return true;
}

/** 钓鱼行程相位：0空闲 1馆→地图 2地图→钓点 3钓点→地图 4地图→馆 5鱼筐→馆。 */
function setGuideTripPhase(save: SaveData, phase: 0 | 1 | 2 | 3 | 4 | 5) {
  save.guideTripPhase = phase;
  useUi.getState().setGuideTripPhase(phase);
  if (phase === 3 || phase === 4) useUi.getState().setMapPicked(null);
}

function clearGuideTrip(save: SaveData) {
  setGuideTripPhase(save, 0);
}

function advanceGuideTrip(prev: SaveData, nextScene: SceneId): 0 | 1 | 2 | 3 | 4 | 5 {
  const from = prev.scene;
  const phase = prev.guideTripPhase ?? 0;
  const basket = prev.basket.length;
  const needStore =
    basket > 0 &&
    (phase === 3 || phase === 4 || prev.questStep === "q_tank" || prev.questStep === "q_catch");

  // 馆→地图：筐里已有待存鱼时绝不能改成「去钓鱼」行程
  if (from === "aquarium" && nextScene === "fishing_map") {
    if (needStore || phase === 3 || phase === 4) return 4;
    return 1;
  }
  if (from === "fishing_map" && nextScene === "fishing") {
    if (needStore || phase === 3 || phase === 4) return 4;
    return 2;
  }
  if (from === "sneak" && nextScene === "fishing") {
    if (needStore || phase === 3 || phase === 4) return 4;
    return 2;
  }
  if (from === "fishing" && nextScene === "fishing_map") return 3;
  // 地图→馆：只有筐里有鱼（或入缸任务）才进回程 4，否则清零，避免空跑一圈又被相位带偏
  if (from === "fishing_map" && nextScene === "aquarium") {
    return basket > 0 || prev.questStep === "q_tank" ? 4 : 0;
  }
  // 鱼筐页回馆：筐里还有鱼则保持回程存缸；否则清零。
  // 新流程入缸后是买鲫鱼/做菜，不再进相位 5 喂食（那是旧闭环）。
  if (from === "store_tank" && nextScene === "aquarium") {
    if (basket > 0 && (phase === 3 || phase === 4 || prev.questStep === "q_tank")) {
      return 4;
    }
    return 0;
  }
  if (from === "sneak" && nextScene === "fishing_map") return phase === 2 ? 3 : phase;
  return phase;
}

function tryAutoFeedDay(save: SaveData, dayIndex: number): { unfed: number; bought: number } {
  const hosted = new Set(save.hostedTankIds);
  if (hosted.size === 0) return { unfed: 0, bought: 0 };
  const fee = hostingDailyFee(hosted.size);
  if (save.gold < fee) {
    save.hostedTankIds = [];
    toast("托管停了：金币不够");
    return { unfed: 0, bought: 0 };
  }
  save.gold -= fee;
  save.foodStock = { ...save.foodStock };
  const living = save.tank
    .filter((f) => !f.dead && hosted.has(f.tankId))
    .slice()
    .sort((a, b) => (FISH_BY_ID[b.defId]?.sellPrice ?? 0) - (FISH_BY_ID[a.defId]?.sellPrice ?? 0));
  let unfed = 0;
  let bought = 0;
  for (const f of living) {
    if (f.lastFedDay === dayIndex) continue;
    const quality = fishQuality(f.defId);
    let foodId = pickFoodForQuality(save.foodStock, quality, save.equipped.food);
    if (!foodId) {
      const buy = cheapestFoodForQuality(quality);
      if (buy && save.gold >= buy.price) {
        save.gold -= buy.price;
        save.foodStock[buy.foodId] = (save.foodStock[buy.foodId] ?? 0) + 1;
        foodId = buy.foodId;
        bought += 1;
      }
    }
    if (!foodId || (save.foodStock[foodId] ?? 0) <= 0) {
      unfed += 1;
      continue;
    }
    save.foodStock[foodId] -= 1;
    f.lastFedDay = dayIndex;
    addAffection(f, affectionGainForFeed(f.defId, foodId));
  }
  if (living.some((f) => f.lastFedDay === dayIndex)) markDaily(save, "fed");
  return { unfed, bought };
}

export const useGame = create<GameStore>((set, get) => ({
  save: bootSave,
  selectedTankUid: null,
  selectedEggUid: null,
  selectedFisheryId: bootSave.lastFisheryId,
  account: getSessionAccount(),
  booting: hasSessionCreds,

  setScene: (scene) => {
    const prev = get().save;
    const phase = advanceGuideTrip(prev, scene);
    const save = {
      ...prev,
      scene,
      visitNpcId: scene === "visit_aquarium" ? prev.visitNpcId : null,
      guideTripPhase: phase,
    };
    // 回馆且筐空：回程结束，清零。新流程不再因此进入相位 5 喂食。
    if (phase === 4 && save.basket.length === 0) {
      save.guideTripPhase = 0;
    }
    // 开局引导买鱼粮：离开商城回馆即视为备货完成
    if (
      prev.scene === "shop" &&
      scene === "aquarium" &&
      save.questStep === "q_feed" &&
      !save.guideShopDone
    ) {
      save.guideShopDone = true;
    }
    // 钓鱼成功后挂机引导：离开钓点回地图即视为挂机引导完成
    if (
      prev.scene === "fishing" &&
      scene === "fishing_map" &&
      save.questStep === "q_tank" &&
      !save.guideIdleDone
    ) {
      save.guideIdleDone = true;
      useUi.getState().markGuideIdleStaminaHinted(); // 避免回钓点重复能量提示
    }
    // 吃菜后体力提示：参观圣殿前首次切场景即视为已展示
    if (
      !save.guideStaminaHinted &&
      (save.questStep === "q_visit_temple" || save.questStep === "q_done") &&
      scene !== prev.scene
    ) {
      save.guideStaminaHinted = true;
    }
    persist(save);
    set({ save });
    useUi.getState().setGuideTripPhase(save.guideTripPhase);
    if (save.guideTripPhase === 3 || save.guideTripPhase === 4) {
      useUi.getState().setMapPicked(null);
    }
    if (scene === "fishing_map") get().notifyQuest("open_map");
  },

  selectTankFish: (uid) => set({ selectedTankUid: uid, selectedEggUid: uid ? null : get().selectedEggUid }),
  selectEgg: (uid) => set({ selectedEggUid: uid, selectedTankUid: uid ? null : get().selectedTankUid }),
  selectFishery: (id) => set({ selectedFisheryId: id }),

  startGame: (playerName) => {
    const name = (playerName ?? get().save.playerName).trim() || get().account || "钓鱼佬";
    const prev = get().save;
    const save = {
      ...prev,
      started: true,
      scene: "aquarium" as const,
      playerName: name,
      activeTankId: prev.defaultTankId,
    };
    persist(save);
    set({ save, selectedTankUid: null, selectedEggUid: null });
  },

  login: async (account, password, remember = false) => {
    try {
      const accErr = validateAccount(account);
      if (accErr) return accErr;
      const pwErr = validatePassword(password);
      if (pwErr) return pwErr;
      const name = account.trim();
      const hash = await hashPassword(name, password);
      const leftoverRaw = peekLegacySaveRaw();
      const leftover = leftoverRaw ? hydrateSave(leftoverRaw) : null;
      const localOk = accountExists(name) && verifyAccountHash(name, hash);
      const localRaw = localOk ? readAccountSaveRaw(name) : null;

      const opened = await remoteLogin(name, hash);
      let save: SaveData | null = null;
      let fromCache = false;

      if (opened.ok) {
        save = hydrateSave(opened.save);
      } else if (opened.error.includes("没有这个账号")) {
        return "没有这个账号，请先注册";
      } else if (opened.error === "密码不对") {
        return "密码不对";
      } else if (localOk) {
        save = hydrateSave(localRaw);
        fromCache = true;
      } else {
        return opened.error;
      }
      if (!save) return "这个号的存档读不出来，进度还在。刷新后再试。";

      if (!save.started || save.scene === "login") {
        save.started = true;
        if (save.scene === "login") save.scene = "aquarium";
        save.playerName = save.playerName || name;
      }

      let fromLegacy = false;
      if (leftover && saveLooksUnused(save)) {
        save = leftover;
        fromLegacy = true;
        clearLegacySave();
      }

      writeRememberedAuth(remember ? { account: name, password } : null);
      enterAccount(set, get, name, hash, save);
      toast(
        fromLegacy
          ? "已接上你之前的存档"
          : fromCache
            ? "存档柜连不上，先用这台浏览器的缓存"
            : `欢迎回来，${save.playerName || name}`,
      );
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "登录失败，请换浏览器再试";
    }
  },

  register: async (account, password, remember = false) => {
    try {
      const accErr = validateAccount(account);
      if (accErr) return accErr;
      const pwErr = validatePassword(password);
      if (pwErr) return pwErr;
      const name = account.trim();
      const hash = await hashPassword(name, password);
      const leftoverRaw = peekLegacySaveRaw();
      const leftover = leftoverRaw ? hydrateSave(leftoverRaw) : null;
      const save = leftover ?? createNewSave();
      save.started = true;
      if (!save.scene || save.scene === "login") save.scene = "aquarium";
      save.playerName = save.playerName || name;

      const opened = await remoteRegister(name, hash, save);
      if (!opened.ok) {
        if (opened.error.includes("已经") || opened.error.includes("有人用")) {
          return "这个账号已经有人用了，换一个吧";
        }
        return opened.error;
      }
      if (leftover) clearLegacySave();
      writeRememberedAuth(remember ? { account: name, password } : null);
      enterAccount(set, get, name, hash, save);
      toast(leftover ? "已接上你之前的存档" : `账号 ${name} 已注册，欢迎`);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "注册失败，请换浏览器再试";
    }
  },

  bootSession: async () => {
    const name = getSessionAccount();
    const hash = getSessionHash();
    if (!name || !hash) {
      set({ booting: false, account: null });
      return;
    }
    const opened = await remoteLogin(name, hash);
    if (opened.ok) {
      const save = hydrateSave(opened.save);
      if (!save) {
        setSessionAccount(null);
        set({ booting: false, account: null, save: createNewSave() });
        return;
      }
      upsertLocalSlot(name, hash, save);
      persist(save);
      set({
        save,
        account: name,
        booting: false,
        selectedTankUid: null,
        selectedEggUid: null,
        selectedFisheryId: save.lastFisheryId,
      });
      useUi.getState().setGuideTripPhase(save.guideTripPhase ?? 0);
      get().settleDays(Date.now());
      get().claimMonthlyIfNeeded();
      return;
    }
    if (opened.error !== "密码不对" && accountExists(name) && verifyAccountHash(name, hash)) {
      const save = loadSave();
      if (save?.started) {
        set({ save, account: name, booting: false, selectedFisheryId: save.lastFisheryId });
        useUi.getState().setGuideTripPhase(save.guideTripPhase ?? 0);
        toast("存档柜连不上，先用这台浏览器的缓存");
        get().settleDays(Date.now());
        get().claimMonthlyIfNeeded();
        return;
      }
    }
    setSessionAccount(null);
    set({ booting: false, account: null, save: createNewSave() });
  },

  logout: () => {
    useUi.getState().closeMonthlyGold();
    setSessionAccount(null);
    const save = createNewSave();
    set({ save, account: null, selectedTankUid: null, selectedEggUid: null, selectedFisheryId: null });
  },

  resetSave: () => {
    const acc = get().account;
    if (!acc) {
      const save = createNewSave();
      set({ save, selectedTankUid: null, selectedEggUid: null, selectedFisheryId: null });
      return;
    }
    const save = createNewSave();
    save.started = true;
    save.scene = "aquarium";
    save.playerName = acc;
    persist(save, true);
    set({ save, selectedTankUid: null, selectedEggUid: null, selectedFisheryId: null });
    toast("本账号存档已重置");
  },

  tick: (now) => {
    get().finishExpandIfReady();
    get().simulateIdle(now);
    const cur = get().save;
    const save = { ...cur };
    applyStaminaRegen(save, now);
    if (
      save.stamina !== cur.stamina ||
      save.yuanqiBottles !== cur.yuanqiBottles ||
      save.yuanqiProgress !== cur.yuanqiProgress ||
      save.staminaUpdatedAt !== cur.staminaUpdatedAt
    ) {
      persist(save);
      set({ save });
    }
    get().settleDays(now);
    get().resolveScent(now);
    get().claimMonthlyIfNeeded();
    const inbox = get().save;
    const mailed = {
      ...inbox,
      mails: copyMails(inbox),
      mailFlags: { ...(inbox.mailFlags ?? {}) },
    };
    if (ensureInbox(mailed)) {
      persist(mailed);
      set({ save: mailed });
    }
  },

  settleDays: (now) => {
    const save = {
      ...get().save,
      tank: get().save.tank.map((f) => ({ ...f })),
      eggs: [...get().save.eggs],
      tanks: get().save.tanks.map((t) => ({ ...t })),
      foodStock: { ...get().save.foodStock },
    };
    const days = (() => {
      const calendar = beijingCalendarDaysPassed(save.lastDayTickAt, now);
      const speed = save.gameSpeed > 1 ? save.gameSpeed : 1;
      const speedDays = Math.floor(((now - save.lastDayTickAt) * speed) / 86_400_000);
      return Math.max(calendar, speedDays);
    })();
    if (days <= 0) return;
    let newEggs = 0;
    let newPairs = 0;
    let hostUnfed = 0;
    let hostBought = 0;
    for (let d = 0; d < days; d++) {
      const endingDay = save.gameDay + d;
      if (save.hostedTankIds.length > 0) {
        const fed = tryAutoFeedDay(save, endingDay);
        hostUnfed += fed.unfed;
        hostBought += fed.bought;
      }
      const deadCount = save.tank.filter((f) => f.dead).length;
      for (const f of save.tank) {
        if (f.dead) continue;
        if (f.lastFedDay === endingDay) continue;
        f.health = Math.max(0, f.health - healthDropForDay(f.health, deadCount));
        if (f.health <= 0) {
          f.dead = true;
          breakPair(save, f.uid);
        }
        f.lastSettledAt = now;
      }
      const tick = tickPairsAndEggs(save, endingDay);
      newPairs += tick.pairs;
      newEggs += tick.eggs;
    }
    save.gameDay += days;
    save.lastDayTickAt = now;
    if (!save.daily || save.daily.day !== save.gameDay) save.daily = freshDaily(save.gameDay);
    if (save.timed && save.gameDay > save.timed.endDay) {
      save.timed = freshTimed(save.gameDay);
    }
    resetSatietyIfNewDay(save);
    persist(save);
    set({ save });
    if (hostBought > 0) toast(`托管代买了 ${hostBought} 份鱼粮`);
    if (hostUnfed > 0) toast(`托管：${hostUnfed} 条没喂到`);
    if (newPairs > 0) toast(`同缸自动结为配偶 ×${newPairs}`);
    if (newEggs > 0) toast(`配偶在缸底下了 ${newEggs} 枚鱼卵`);
  },

  resolveScent: (now) => {
    const save = {
      ...get().save,
      tank: get().save.tank.map((f) => ({ ...f })),
      eggs: [...get().save.eggs],
    };
    const n = resolveScentLays(save, now, save.gameDay);
    if (n <= 0) return;
    persist(save);
    set({ save });
    toast(`求偶香催产：缸底下了 ${n} 枚鱼卵`);
  },

  simulateIdle: (now, force) => {
    const prev = get().save;
    if (!prev.idle) return;
    // 人在码头看着时由画面循环结算；切到后台则仍按时间补算。
    if (!force && prev.scene === "fishing" && (typeof document === "undefined" || !document.hidden)) return;
    const save = cloneForIdle(prev);
    const idle = save.idle!;
    if (!FISHERY_BY_ID[idle.fisheryId]) {
      save.idle = null;
      persist(save);
      set({ save });
      return;
    }
    let attempts = Math.floor((now - idle.lastSimAt) / IDLE_MS_PER_CAST);
    if (attempts <= 0) return;
    while (attempts > 0) {
      const outcome = runIdleAttempt(save, false);
      if (!outcome.ok) {
        save.idle = null;
        toastIdleStop(outcome.reason);
        break;
      }
      attempts -= 1;
      if (save.idle) save.idle.lastSimAt += IDLE_MS_PER_CAST;
    }
    persist(save);
    set({ save });
  },

  idleCatchOnce: () => {
    const prev = get().save;
    if (!prev.idle) return null;
    const save = cloneForIdle(prev);
    const outcome = runIdleAttempt(save, true);
    if (!outcome.ok) {
      save.idle = null;
      toastIdleStop(outcome.reason);
      persist(save);
      set({ save });
      return null;
    }
    if (save.idle) save.idle.lastSimAt = Date.now();
    persist(save);
    set({ save });
    if (outcome.kind === "junk") return { kind: "junk", junk: outcome.junk, story: outcome.story };
    return { kind: "fish", fish: outcome.fish, bag: outcome.bag };
  },

  claimMonthlyIfNeeded: () => {
    if (!get().account) return;
    const prev = get().save;
    if (!prev.started || prev.scene === "login") return;
    const save = { ...prev, mails: copyMails(prev) };
    const { mailed, popup } = settleMonthlyGold(save, true);
    if (mailed > 0) {
      persist(save);
      set({ save });
      toast(mailed > 1 ? `月卡 ${mailed} 天金币已寄到邮箱` : "昨天的月卡金币已寄到邮箱");
    }
    if (popup) useUi.getState().openMonthlyGold();
  },

  claimMonthlyGold: () => {
    const save = { ...get().save };
    if (save.monthlyCardUntilDay < save.gameDay) {
      useUi.getState().closeMonthlyGold();
      return false;
    }
    if (save.lastMonthlyClaimDay >= save.gameDay) {
      useUi.getState().closeMonthlyGold();
      return false;
    }
    save.gold += MONTHLY_CARD_DAILY_GOLD;
    save.lastMonthlyClaimDay = save.gameDay;
    persist(save);
    set({ save });
    useUi.getState().closeMonthlyGold();
    return true;
  },

  putToTank: (basketUid) => get().putManyToTank([basketUid]),

  putManyToTank: (basketUids) => {
    if (basketUids.length === 0) return;
    const save = {
      ...get().save,
      basket: [...get().save.basket],
      tank: [...get().save.tank],
      caughtFishIds: [...get().save.caughtFishIds],
    };
    const tankId = save.activeTankId;
    const want = new Set(basketUids);
    let count = 0;
    let skipped = 0;
    save.basket = save.basket.filter((bf) => {
      if (!want.has(bf.uid)) return true;
      if (!tankHasRoom(save, tankId, 1)) {
        skipped += 1;
        return true;
      }
      save.tank.push(makeTankFish(save, bf.defId, tankId, {
        personality: bf.personality,
        loveView: bf.loveView,
        sex: bf.sex,
        health: bf.health,
        lastFedDay: bf.lastFedDay,
      }));
      const added = save.tank[save.tank.length - 1];
      if (typeof bf.affection === "number") added.affection = Math.min(10, Math.max(0, bf.affection));
      if (bf.customName) added.customName = bf.customName;
      if (!save.caughtFishIds.includes(bf.defId)) save.caughtFishIds.push(bf.defId);
      count += 1;
      return false;
    });
    if (count === 0) {
      if (skipped > 0) toast("当前鱼缸已满，先扩建或换缸");
      return;
    }
    applyQuest(save, "tank");
    clearGuideTrip(save);
    checkFillTank(save);
    persist(save);
    set({ save });
    toast(skipped > 0 ? `已存入 ${count} 条，缸满剩下 ${skipped} 条` : `已存入 ${count} 条`);
  },

  feed: (uid, foodId, opts) => {
    const save = {
      ...get().save,
      tank: get().save.tank.map((f) => ({ ...f })),
      foodStock: { ...get().save.foodStock },
      equipped: { ...get().save.equipped },
    };
    const fish = save.tank.find((f) => f.uid === uid);
    if (!fish || fish.dead) return "skip";
    const offer = foodId ?? save.equipped.food;
    if ((save.foodStock[offer] ?? 0) <= 0) {
      if (!opts?.quiet) toast("鱼粮不足");
      return "empty";
    }
    if (!canFeed(fish.defId, offer)) {
      useUi.getState().cueTankFish(uid, "refuse");
      return "refused";
    }
    save.foodStock[offer] -= 1;
    save.equipped.food = offer;
    fish.lastFedDay = save.gameDay;
    addAffection(fish, affectionGainForFeed(fish.defId, offer));
    markDaily(save, "fed");
    applyQuest(save, "feed");
    clearGuideTrip(save);
    persist(save);
    set({ save });
    useUi.getState().cueTankFish(uid, "eat");
    return "ate";
  },

  feedMany: (uids, foodIds) => {
    if (foodIds.length === 0) {
      toast("先选鱼粮");
      return;
    }
    const save = {
      ...get().save,
      tank: get().save.tank.map((f) => ({ ...f })),
      foodStock: { ...get().save.foodStock },
      equipped: { ...get().save.equipped },
    };
    const unhappy: string[] = [];
    let ate = 0;
    for (const uid of uids) {
      const fish = save.tank.find((f) => f.uid === uid);
      if (!fish || fish.dead) continue;
      const foodId = pickFoodForFish(fish.defId, foodIds, save.foodStock);
      if (!foodId) {
        unhappy.push(fishDisplayName(fish));
        useUi.getState().cueTankFish(uid, "refuse");
        continue;
      }
      save.foodStock[foodId] -= 1;
      save.equipped.food = foodId;
      fish.lastFedDay = save.gameDay;
      addAffection(fish, affectionGainForFeed(fish.defId, foodId));
      useUi.getState().cueTankFish(uid, "eat");
      ate += 1;
    }
    if (ate > 0) {
      markDaily(save, "fed");
      applyQuest(save, "feed");
    }
    persist(save);
    set({ save });
    if (ate) toast(ate === 1 ? "吃了" : `喂了 ${ate} 条`);
    if (unhappy.length > 0) {
      askConfirm({
        title: "喂食",
        message: `${unhappy.join("、")}不满的向你甩尾巴`,
        confirmLabel: "知道了",
        cancelLabel: "关闭",
        onConfirm: () => {},
      });
    } else if (ate === 0) {
      toast("选的粮里没有能喂的");
    }
  },

  renameFish: (uid, raw) => {
    const name = normalizeFishName(raw);
    if (!name) {
      toast("名字不能为空");
      return false;
    }
    const save = { ...get().save, tank: get().save.tank.map((f) => ({ ...f })) };
    const fish = save.tank.find((f) => f.uid === uid);
    if (!fish || fish.dead) return false;
    if (!canNameFish(fish)) {
      toast("好感满 10 才能起名");
      return false;
    }
    fish.customName = name;
    persist(save);
    set({ save });
    toast(`已起名「${name}」`);
    return true;
  },

  petFish: (uid) => {
    const save = { ...get().save, tank: get().save.tank.map((f) => ({ ...f })) };
    const fish = save.tank.find((f) => f.uid === uid);
    if (!fish || !tryPetFish(fish, save.gameDay)) return;
    persist(save);
    set({ save });
  },

  release: (uid) => {
    const tank = get().save.tank.map((f) => ({ ...f }));
    const save = { ...get().save, tank };
    breakPair(save, uid);
    save.tank = save.tank.filter((f) => f.uid !== uid);
    if (get().selectedTankUid === uid) set({ selectedTankUid: null });
    persist(save);
    set({ save });
  },

  releaseMany: (uids) => {
    for (const uid of uids) get().release(uid);
  },

  cleanDead: (uid) => {
    const save = { ...get().save, tank: get().save.tank.filter((f) => !(f.uid === uid && f.dead)) };
    persist(save);
    set({ save });
  },

  cleanAllDead: () => {
    const tankId = get().save.activeTankId;
    const save = { ...get().save, tank: get().save.tank.filter((f) => !(f.dead && f.tankId === tankId)) };
    persist(save);
    set({ save });
    toast("已清理死鱼");
  },

  setHostedTanks: (tankIds) => {
    const save = get().save;
    const valid = tankIds.filter((id) => save.tanks.some((t) => t.id === id) && isTankPlaced(save, id));
    const fee = hostingDailyFee(valid.length);
    if (valid.length > 0 && save.gold < fee) {
      toast("托管费不够");
      return;
    }
    const next = { ...save, hostedTankIds: valid };
    persist(next);
    set({ save: next });
    toast(valid.length > 0 ? `已托管 ${valid.length} 口缸 · ${fee} 金/天` : "已关托管");
  },

  switchTank: (dir) => {
    const save = get().save;
    const placed = placedTanks(save);
    const i = placed.findIndex((t) => t.id === save.activeTankId);
    if (i < 0 || placed.length <= 1) return;
    const next = placed[(i + dir + placed.length) % placed.length];
    get().setActiveTank(next.id);
  },

  setActiveTank: (id) => {
    const save = get().save;
    if (!isTankPlaced(save, id) || save.activeTankId === id) return;
    const next = { ...save, activeTankId: id };
    persist(next);
    set({ save: next, selectedTankUid: null, selectedEggUid: null });
  },

  moveTankFish: (uids, destTankId) => {
    const uniq = [...new Set(uids)];
    if (uniq.length === 0) return false;
    const prev = get().save;
    if (!prev.tanks.some((t) => t.id === destTankId)) return false;
    const save = { ...prev, tank: prev.tank.map((f) => ({ ...f })) };
    const moving = save.tank.filter((f) => uniq.includes(f.uid) && !f.dead);
    if (moving.length === 0) return false;
    const fromId = moving[0].tankId;
    if (moving.some((f) => f.tankId !== fromId)) {
      toast("先在同一口缸里选");
      return false;
    }
    if (fromId === destTankId) {
      toast("已经在这口缸里");
      return false;
    }
    if (!tankHasRoom(save, destTankId, moving.length)) {
      toast("目标缸位不够");
      return false;
    }
    const moveSet = new Set(moving.map((f) => f.uid));
    for (const f of moving) {
      if (!f.pairId) continue;
      const mate = save.tank.find((x) => x.pairId === f.pairId && x.uid !== f.uid);
      if (mate && !moveSet.has(mate.uid)) breakPair(save, f.uid);
    }
    for (const f of save.tank) {
      if (moveSet.has(f.uid)) f.tankId = destTankId;
    }
    save.activeTankId = destTankId;
    persist(save);
    set({ save, selectedTankUid: null, selectedEggUid: null });
    toast(`已换到${save.tanks.find((t) => t.id === destTankId)?.name ?? "另一口缸"}`);
    return true;
  },

  putTankToBasket: (uids) => {
    const uniq = [...new Set(uids)];
    if (uniq.length === 0) return false;
    const save = {
      ...get().save,
      tank: get().save.tank.map((f) => ({ ...f })),
      basket: [...get().save.basket],
    };
    const moving = save.tank.filter((f) => uniq.includes(f.uid) && !f.dead);
    if (moving.length === 0) {
      toast("没有可放的活鱼");
      return false;
    }
    let count = 0;
    let skipped = 0;
    const moved = new Set<string>();
    for (const f of moving) {
      const def = FISH_BY_ID[f.defId];
      if (!def || !basketFits(save, def)) {
        skipped += 1;
        continue;
      }
      breakPair(save, f.uid);
      save.basket.push({
        uid: genUid("b"),
        defId: f.defId,
        personality: f.personality,
        loveView: f.loveView,
        sex: f.sex,
        health: f.health,
        lastFedDay: f.lastFedDay,
        affection: f.affection,
        customName: f.customName,
      });
      moved.add(f.uid);
      count += 1;
    }
    if (count === 0) {
      const first = moving[0];
      const def = first ? FISH_BY_ID[first.defId] : undefined;
      const why = def ? basketRejectReason(get().save, def) : null;
      toast(why ?? (skipped > 0 ? "鱼筐满了，先腾位置" : "没有可放的鱼"));
      return false;
    }
    save.tank = save.tank.filter((f) => !moved.has(f.uid));
    persist(save);
    set({
      save,
      selectedTankUid: moved.has(get().selectedTankUid ?? "") ? null : get().selectedTankUid,
    });
    toast(skipped > 0 ? `已存筐 ${count} 条，筐满剩下 ${skipped} 条` : `已存筐 ${count} 条`);
    return true;
  },

  setDefaultTank: () => {
    const save = { ...get().save, defaultTankId: get().save.activeTankId };
    persist(save);
    set({ save });
    toast("已设为默认鱼缸");
  },

  buyTank: (defId) => {
    const def = TANK_BY_ID[defId];
    if (!def) return false;
    const save = {
      ...get().save,
      tanks: [...get().save.tanks],
      tankSlotIds: [...ensureTankSlotArray(get().save)],
      basket: [...get().save.basket],
    };
    if (def.currency === "pearl") {
      if (save.pearl < def.price) {
        toast("珍珠不足");
        return false;
      }
      save.pearl -= def.price;
    } else {
      if (save.gold < def.price) {
        toast("金币不足");
        return false;
      }
      save.gold -= def.price;
    }
    const id = genUid("tank");
    save.tanks.push(emptyTank(id, nextTankName(save.tanks), def.quality));
    bumpNewbieFlag(save, "buyTank");
    const emptyIdx = firstEmptySlotIndex(save);
    if (emptyIdx >= 0) {
      save.tankSlotIds[emptyIdx] = id;
      save.activeTankId = id;
      persist(save);
      set({ save, selectedTankUid: null, selectedEggUid: null });
      toast(`${def.name}到了，已摆到缸位 ${emptyIdx + 1}`);
    } else {
      persist(save);
      set({ save, selectedTankUid: null, selectedEggUid: null });
      toast(`${def.name}到了，去缸位管理摆出来`);
    }
    return true;
  },

  startExpand: () => {
    const save = { ...get().save };
    if (save.expandReadyAt != null) {
      toast("扩建进行中");
      return false;
    }
    if (save.gold < EXPAND_GOLD) {
      toast("金币不足");
      return false;
    }
    save.gold -= EXPAND_GOLD;
    save.expandReadyAt = Date.now() + EXPAND_MS;
    persist(save);
    set({ save });
    toast("扩建开始…");
    return true;
  },

  finishExpandIfReady: () => {
    const save = { ...get().save, newbieTasks: { ...(get().save.newbieTasks ?? freshNewbieTasks()) } };
    if (save.expandReadyAt == null || Date.now() < save.expandReadyAt) return false;
    save.tankSlots = save.tankSlots + EXPAND_STEP;
    save.tankSlotIds = [...ensureTankSlotArray(save), null];
    save.expandReadyAt = null;
    bumpNewbieFlag(save, "expand");
    persist(save);
    set({ save });
    toast("空位腾好了，可以去商城买缸");
    return true;
  },

  tryAssignTankSlot: (slotIndex, tankId) => {
    if (slotIndex < 0 || slotIndex >= get().save.tankSlots) return false;
    const prev = get().save;
    const save = {
      ...prev,
      tanks: prev.tanks.map((t) => ({ ...t })),
      tank: prev.tank.map((f) => ({ ...f })),
      eggs: [...prev.eggs],
      basket: [...prev.basket],
      tankSlotIds: [...ensureTankSlotArray(prev)],
    };

    if (tankId !== null && !save.tanks.some((t) => t.id === tankId)) {
      toast("鱼缸不存在");
      return false;
    }

    const current = save.tankSlotIds[slotIndex];
    if (tankId === current) {
      useUi.getState().closeSlotPicker();
      return true;
    }

    if (tankId !== null) {
      const overflow = checkSlotAssignOverflow(save, slotIndex, tankId);
      if (overflow) {
        useUi.getState().setSlotOverflow(overflow);
        useUi.getState().closeSlotPicker();
        return false;
      }
    }

    const result = applySlotAssign(save, slotIndex, tankId);
    if (!result.ok) {
      toast(result.reason ?? "更换失败");
      return false;
    }
    persist(save);
    set({ save, selectedTankUid: null, selectedEggUid: null });
    useUi.getState().closeSlotPicker();
    toast(tankId ? "缸位已更换" : "缸位已空置");
    return true;
  },

  confirmSlotOverflow: (basketUids) => {
    const overflow = useUi.getState().slotOverflow;
    if (!overflow) return false;
    const prev = get().save;
    const save = {
      ...prev,
      tanks: prev.tanks.map((t) => ({ ...t })),
      tank: prev.tank.map((f) => ({ ...f })),
      eggs: [...prev.eggs],
      basket: [...prev.basket],
      tankSlotIds: [...ensureTankSlotArray(prev)],
    };
    const remaining = save.tank.filter(
      (f) => f.tankId === overflow.fromTankId && !f.dead && !basketUids.includes(f.uid),
    ).length;
    if (remaining > overflow.capacity) {
      toast("还要多选几条鱼放进鱼筐");
      return false;
    }
    const result = applySlotAssign(save, overflow.slotIndex, overflow.toTankId, basketUids);
    if (!result.ok) {
      toast(result.reason ?? "更换失败");
      return false;
    }
    persist(save);
    set({ save, selectedTankUid: null, selectedEggUid: null });
    useUi.getState().setSlotOverflow(null);
    toast("缸位已更换");
    return true;
  },

  unpair: (pairId) => {
    const save = { ...get().save, tank: get().save.tank.map((f) => ({ ...f })) };
    const one = save.tank.find((f) => f.pairId === pairId);
    if (one) breakPair(save, one.uid);
    persist(save);
    set({ save });
    toast("已解除配偶");
  },

  buyAttractant: (id) => {
    const def = ATTRACTANT_BY_ID[id];
    if (!def) return false;
    const save = { ...get().save, attractantStock: { ...(get().save.attractantStock ?? {}) } };
    if (def.currency === "gold") {
      if (save.gold < def.price) {
        toast("金币不足");
        return false;
      }
      save.gold -= def.price;
    } else {
      if (save.pearl < def.price) {
        toast("珍珠不足");
        return false;
      }
      save.pearl -= def.price;
    }
    save.attractantStock[id] = (save.attractantStock[id] ?? 0) + 1;
    persist(save);
    set({ save });
    toast(`买到 ${def.name}`);
    return true;
  },

  applyAttractantToFish: (uid, id) => {
    const def = ATTRACTANT_BY_ID[id];
    if (!def || def.scope !== "fish") return false;
    const save = {
      ...get().save,
      tank: get().save.tank.map((f) => ({ ...f })),
      attractantStock: { ...(get().save.attractantStock ?? {}) },
    };
    if ((save.attractantStock[id] ?? 0) <= 0) {
      toast("没有这种求偶香");
      return false;
    }
    const fish = save.tank.find((f) => f.uid === uid);
    if (!fish || fish.dead) {
      toast("选一条活鱼");
      return false;
    }
    const until = save.gameDay + def.durationDays - 1;
    if ((fish.attractUntilDay ?? 0) < save.gameDay) {
      fish.attractUntilDay = until;
      fish.attractBonus = def.bonus;
    } else {
      fish.attractUntilDay = Math.max(fish.attractUntilDay, until);
      fish.attractBonus = Math.max(fish.attractBonus ?? 0, def.bonus);
    }
    save.attractantStock[id] -= 1;
    const now = Date.now();
    if (scentBuyTimeForFish(save, uid, now)) {
      persist(save);
      set({ save });
      toast(`${FISH_BY_ID[fish.defId]?.name ?? "鱼"} 已配对，5 分钟后产卵`);
      return true;
    }
    persist(save);
    set({ save });
    toast(`${FISH_BY_ID[fish.defId]?.name ?? "鱼"} 身上有求偶香了，持续 ${def.durationDays} 天`);
    return true;
  },

  applyAttractantToTank: (id) => {
    const def = ATTRACTANT_BY_ID[id];
    if (!def || def.scope !== "tank") return false;
    const save = {
      ...get().save,
      tanks: get().save.tanks.map((t) => ({ ...t })),
      tank: get().save.tank.map((f) => ({ ...f })),
      attractantStock: { ...(get().save.attractantStock ?? {}) },
    };
    if ((save.attractantStock[id] ?? 0) <= 0) {
      toast("没有这种香氛");
      return false;
    }
    const tank = save.tanks.find((t) => t.id === save.activeTankId);
    if (!tank) return false;
    const until = save.gameDay + def.durationDays - 1;
    if ((tank.tankAttractUntilDay ?? 0) < save.gameDay) {
      tank.tankAttractUntilDay = until;
      tank.tankAttractBonus = def.bonus;
    } else {
      tank.tankAttractUntilDay = Math.max(tank.tankAttractUntilDay, until);
      tank.tankAttractBonus = Math.max(tank.tankAttractBonus ?? 0, def.bonus);
    }
    save.attractantStock[id] -= 1;
    const n = scentBuyTimeForTank(save, tank.id, Date.now());
    persist(save);
    set({ save });
    toast(
      n > 0
        ? `${tank.name} 喷了香氛，${n} 对将在 5 分钟后产卵`
        : `${tank.name} 喷了整缸香氛，持续 ${def.durationDays} 天`,
    );
    return true;
  },

  hatchEgg: (eggUid) => {
    const save = {
      ...get().save,
      tank: [...get().save.tank],
      eggs: get().save.eggs.map((e) => ({ ...e })),
      caughtFishIds: [...get().save.caughtFishIds],
    };
    const egg = save.eggs.find((e) => e.uid === eggUid);
    if (!egg) return false;
    if (!egg.started) {
      const cost = hatchGoldForParents(egg.parentA, egg.parentB);
      if (save.gold < cost) {
        toast("金币不足");
        return false;
      }
      save.gold -= cost;
      egg.started = true;
      egg.readyDay = save.gameDay + hatchDaysForParents(egg.parentA, egg.parentB);
      persist(save);
      set({ save });
      toast(`已开工，${egg.readyDay - save.gameDay} 游戏天后可领苗`);
      return true;
    }
    if (save.gameDay < egg.readyDay) {
      toast(`还要等 ${egg.readyDay - save.gameDay} 天，可用珍珠或看广告加速`);
      return false;
    }
    if (!tankHasRoom(save, egg.tankId, 1)) {
      toast("鱼缸已满，先扩建或换缸");
      return false;
    }
    const defId = pickOffspringDefId(egg.parentA, egg.parentB);
    const born = rollOffspringTraits();
    const child = makeTankFish(save, defId, egg.tankId, born);
    save.tank.push(child);
    save.eggs = save.eggs.filter((e) => e.uid !== eggUid);
    if (!save.caughtFishIds.includes(defId)) save.caughtFishIds.push(defId);
    checkFillTank(save);
    persist(save);
    set({ save, selectedEggUid: null });
    toast(`孵出 ${FISH_BY_ID[defId]?.name ?? "鱼"}（种类像亲本，性格爱情观重掷）`);
    return true;
  },

  accelerateEgg: (eggUid, mode) => {
    const save = { ...get().save, eggs: get().save.eggs.map((e) => ({ ...e })) };
    const egg = save.eggs.find((e) => e.uid === eggUid);
    if (!egg) return false;
    if (!egg.started) {
      toast("先花金币开工");
      return false;
    }
    if (save.gameDay >= egg.readyDay) {
      toast("已经可以领苗了");
      return false;
    }
    if (mode === "pearl") {
      if (save.pearl < HATCH_PEARL) {
        toast("珍珠不足");
        return false;
      }
      save.pearl -= HATCH_PEARL;
    }
    egg.readyDay = Math.max(save.gameDay, egg.readyDay - 1);
    persist(save);
    set({ save });
    toast(mode === "ad" ? "看完广告，工期 −1 天" : "已用珍珠加速 1 天");
    return true;
  },

  listEgg: (eggUid, price) => {
    const save = { ...get().save, eggs: [...get().save.eggs], listings: [...get().save.listings] };
    const idx = save.eggs.findIndex((e) => e.uid === eggUid);
    if (idx < 0) return;
    const [egg] = save.eggs.splice(idx, 1);
    save.listings.push({
      uid: genUid("l"),
      defId: egg.parentA,
      price,
      source: "player",
      kind: "egg",
      parentB: egg.parentB,
    });
    persist(save);
    set({ save, selectedEggUid: null });
    toast("鱼卵已挂到鱼行");
  },

  hasFisheryCard: (fisheryId) => {
    const save = get().save;
    const until = save.fisheryCards[fisheryId] ?? -1;
    return until >= save.gameDay;
  },

  buyFisheryCard: (fisheryId) => {
    const save = { ...get().save, fisheryCards: { ...get().save.fisheryCards } };
    const fishery = FISHERY_BY_ID[fisheryId];
    const price = fishery?.entry.cardPrice;
    if (!price) return false;
    if (save.gold < price) {
      toast("金币不足");
      return false;
    }
    save.gold -= price;
    save.fisheryCards[fisheryId] = save.gameDay + MONTHLY_CARD_DAYS;
    persist(save);
    set({ save });
    toast(`已办理 ${fishery.name} 月卡`);
    return true;
  },

  enterFishery: (fisheryId, mode) => {
    const save = { ...get().save };
    const fishery = FISHERY_BY_ID[fisheryId];
    if (!fishery) return false;
    if (fishery.entry.type === "free" || mode === "free" || mode === "sneak") {
      save.lastFisheryId = fisheryId;
      persist(save);
      set({ save, selectedFisheryId: fisheryId });
      return true;
    }
    if (mode === "card") {
      if (!get().hasFisheryCard(fisheryId)) {
        if (!get().buyFisheryCard(fisheryId)) return false;
      }
      const next = { ...get().save, lastFisheryId: fisheryId };
      persist(next);
      set({ save: next, selectedFisheryId: fisheryId });
      return true;
    }
    const ticket = fishery.entry.ticketPrice ?? 0;
    if (save.gold < ticket) {
      toast("金币不足");
      return false;
    }
    save.gold -= ticket;
    save.lastFisheryId = fisheryId;
    persist(save);
    set({ save, selectedFisheryId: fisheryId });
    return true;
  },

  paySneakFine: (fisheryId) => {
    const fishery = FISHERY_BY_ID[fisheryId];
    const fine = fishery?.entry.ticketPrice ?? 20;
    const save = { ...get().save };
    if (save.gold < fine) {
      toast("金币不够交罚款");
      return false;
    }
    save.gold -= fine;
    persist(save);
    set({ save });
    toast(`交了 ${fine} 金罚款，回地图`);
    return true;
  },

  consumeBait: () => {
    const save = { ...get().save, baitStock: { ...get().save.baitStock } };
    const baitId = save.equipped.bait;
    const n = save.baitStock[baitId] ?? 0;
    if (n <= 0) {
      toast("鱼饵用完了");
      return false;
    }
    save.baitStock[baitId] = n - 1;
    persist(save);
    set({ save });
    get().notifyQuest("cast");
    return true;
  },

  catchFish: (fishDef, personality) => {
    const save = {
      ...get().save,
      basket: [...get().save.basket],
      caughtFishIds: [...get().save.caughtFishIds],
    };
    const traits = personality ? { personality, loveView: rollTraits().loveView } : rollTraits();
    const added = addToBasket(save, fishDef, traits);
    noteCatch(save, fishDef);
    persist(save);
    set({ save });
    return added ? "added" : "full";
  },

  replaceBasketCatch: (uid, fishDef, personality) => {
    const save = { ...get().save, basket: [...get().save.basket] };
    const traits = personality ? { personality, loveView: rollTraits().loveView } : rollTraits();
    if (!replaceBasketFish(save, uid, fishDef, traits)) {
      toast("换了会超重，选另一条");
      return false;
    }
    persist(save);
    set({ save });
    toast(`已换上 ${fishDef.name}`);
    return true;
  },

  releaseBasket: (uid) => {
    const save = { ...get().save, basket: get().save.basket.filter((b) => b.uid !== uid) };
    persist(save);
    set({ save });
    toast("已放生");
  },

  releaseBasketMany: (uids) => {
    const drop = new Set(uids);
    const save = { ...get().save, basket: get().save.basket.filter((b) => !drop.has(b.uid)) };
    persist(save);
    set({ save });
    toast(`已放生 ${uids.length} 条`);
  },

  pickBite: () => {
    const save = get().save;
    const fid = get().selectedFisheryId;
    const fishery = fid ? FISHERY_BY_ID[fid] : null;
    if (!fishery) return null;
    return pickBiteOutcome(fishery.pool, save.equipped.bait, effectiveLuck(save));
  },

  applyJunkCatch: (junk) => {
    const save = cloneForIdle(get().save);
    const story = applyJunkToSave(save, junk);
    persist(save);
    set({ save });
    return story;
  },

  startIdle: () => {
    const save = get().save;
    const fid = get().selectedFisheryId;
    if (!fid) return false;
    if ((save.baitStock[save.equipped.bait] ?? 0) <= 0) {
      toast("没有鱼饵，无法挂机");
      return false;
    }
    if (save.stamina < 6) {
      toast("能量不足，无法挂机");
      return false;
    }
    const now = Date.now();
    const next = { ...save, idle: { fisheryId: fid, startedAt: now, lastSimAt: now } };
    persist(next);
    set({ save: next });
    return true;
  },

  stopIdle: () => {
    if (!get().save.idle) return;
    get().simulateIdle(Date.now(), true);
    const save = { ...get().save, idle: null };
    persist(save);
    set({ save });
  },

  cookFish: (uid, from) => {
    const prev = get().save;
    const save: SaveData = {
      ...prev,
      tank: prev.tank.map((f) => ({ ...f })),
      basket: [...prev.basket],
      dishes: [...(prev.dishes ?? [])],
    };
    resetSatietyIfNewDay(save);
    applyStaminaRegen(save, Date.now());
    if ((save.saltStock ?? 0) < 1) {
      toast("没有盐，去商城买");
      return false;
    }
    if (from !== "basket") {
      toast("只能用鱼筐里的鱼做菜");
      return false;
    }
    const b = save.basket.find((x) => x.uid === uid);
    if (!b) {
      toast("这条不在鱼筐里");
      return false;
    }
    const defId = b.defId;
    save.basket = save.basket.filter((x) => x.uid !== uid);
    const first = save.firstCookDay !== save.gameDay;
    const rec = cookRestore(defId, first);
    save.saltStock -= 1;
    if (first) save.firstCookDay = save.gameDay;
    save.dishes.push({
      uid: genUid("d"),
      defId,
      restore: rec,
      cookedDay: save.gameDay,
    });
    bumpNewbieCount(save, "cook");
    persist(save);
    set({
      save,
      selectedTankUid: get().selectedTankUid === uid ? null : get().selectedTankUid,
    });
    const name = FISH_BY_ID[defId]?.name ?? "鱼";
    toast(`做好了「${name}菜」，去背包·道具吃。保质期 3 天${first ? "（今日首次 +50%）" : ""}`);
    get().notifyQuest("cook");
    return true;
  },

  eatDish: (uid) => {
    const save = { ...get().save, dishes: [...(get().save.dishes ?? [])] };
    const now = Date.now();
    resetSatietyIfNewDay(save);
    applyStaminaRegen(save, now);
    const idx = save.dishes.findIndex((d) => d.uid === uid);
    if (idx < 0) return false;
    const dish = save.dishes[idx];
    if (dishExpired(dish.cookedDay, save.gameDay)) {
      toast("这道菜过期了，只能丢掉");
      return false;
    }
    if (save.satietyUsed >= satietyMax(save.playerLevel)) {
      toast("无法再进食");
      return false;
    }
    const wait = dishEatWaitMs(save.lastDishAteAt, now);
    if (wait > 0) {
      toast(`刚吃过，还要等 ${formatWait(wait)}`);
      return false;
    }
    save.dishes.splice(idx, 1);
    addStamina(save, dish.restore);
    save.satietyUsed += 1;
    save.lastDishAteAt = now;
    persist(save);
    set({ save });
    toast(`吃了菜，能量 +${dish.restore}`);
    get().notifyQuest("eat");
    return true;
  },

  discardDish: (uid) => {
    const save = { ...get().save, dishes: [...(get().save.dishes ?? [])] };
    const idx = save.dishes.findIndex((d) => d.uid === uid);
    if (idx < 0) return false;
    save.dishes.splice(idx, 1);
    persist(save);
    set({ save });
    toast("已丢掉");
    return true;
  },

  buySalt: (n) => {
    const qty = Math.max(1, Math.floor(n));
    if (qty % SALT_PACK_SIZE !== 0) {
      toast(`盐一次买 ${SALT_PACK_SIZE} 份`);
      return false;
    }
    const cost = SALT_PRICE * qty;
    const save = { ...get().save };
    if (save.gold < cost) return false;
    save.gold -= cost;
    save.saltStock = (save.saltStock ?? 0) + qty;
    persist(save);
    set({ save });
    return true;
  },

  buyEnergyDrink: (n) => {
    const qty = Math.max(1, Math.floor(n));
    const cost = ENERGY_DRINK_PRICE * qty;
    const save = { ...get().save };
    if (save.pearl < cost) {
      toast("珍珠不足");
      return false;
    }
    save.pearl -= cost;
    save.energyDrinkStock = (save.energyDrinkStock ?? 0) + qty;
    persist(save);
    set({ save });
    return true;
  },

  drinkEnergy: () => {
    const save = { ...get().save };
    applyStaminaRegen(save, Date.now());
    if ((save.energyDrinkStock ?? 0) < 1) {
      toast("没有能量饮料");
      return false;
    }
    save.energyDrinkStock -= 1;
    addStamina(save, ENERGY_DRINK_STAMINA);
    persist(save);
    set({ save });
    toast(`喝了能量饮料，能量 +${ENERGY_DRINK_STAMINA}`);
    return true;
  },

  drinkYuanqi: () => {
    const save = { ...get().save };
    applyStaminaRegen(save, Date.now());
    if ((save.yuanqiBottles ?? 0) < 1) {
      toast("没有元气瓶");
      return false;
    }
    save.yuanqiBottles -= 1;
    addStamina(save, YUANQI_RESTORE);
    persist(save);
    set({ save });
    toast(`喝了元气瓶，能量 +${YUANQI_RESTORE}`);
    return true;
  },

  sellToMarket: (basketUid) => {
    const save = { ...get().save, basket: [...get().save.basket] };
    const idx = save.basket.findIndex((b) => b.uid === basketUid);
    if (idx < 0) return;
    const [bf] = save.basket.splice(idx, 1);
    const def = FISH_BY_ID[bf.defId];
    if (def) save.gold += def.sellPrice;
    markDaily(save, "sold");
    applyQuest(save, "sell");
    persist(save);
    set({ save });
  },

  sellFromTank: (tankUid) => {
    const fish = get().save.tank.find((f) => f.uid === tankUid);
    if (!fish) return;
    const def = FISH_BY_ID[fish.defId];
    const price = def ? tankSellPrice(def.sellPrice, fish.health, fish.dead) : null;
    if (price == null) {
      toast("死鱼不能售卖，只能清理");
      return;
    }
    const tank = get().save.tank.map((f) => ({ ...f }));
    const save = { ...get().save, tank };
    breakPair(save, tankUid);
    const idx = save.tank.findIndex((f) => f.uid === tankUid);
    if (idx < 0) return;
    save.tank.splice(idx, 1);
    save.gold += price;
    if (get().selectedTankUid === tankUid) set({ selectedTankUid: null });
    markDaily(save, "sold");
    applyQuest(save, "sell");
    persist(save);
    set({ save });
  },

  sellManyToMarket: (uids) => {
    for (const uid of uids) get().sellToMarket(uid);
  },

  listFish: (basketUid, price) => {
    const save = { ...get().save, basket: [...get().save.basket], listings: [...get().save.listings] };
    const idx = save.basket.findIndex((b) => b.uid === basketUid);
    if (idx < 0) return;
    const [bf] = save.basket.splice(idx, 1);
    save.listings.push({ uid: genUid("l"), defId: bf.defId, price, source: "player", kind: "fish" });
    persist(save);
    set({ save });
  },

  listFromTank: (tankUid, price) => {
    const fish = get().save.tank.find((f) => f.uid === tankUid);
    if (!fish || fish.dead) {
      toast("死鱼不能挂售");
      return;
    }
    const tank = get().save.tank.map((f) => ({ ...f }));
    const save = { ...get().save, tank, listings: [...get().save.listings] };
    breakPair(save, tankUid);
    const idx = save.tank.findIndex((f) => f.uid === tankUid);
    if (idx < 0) return;
    const [tf] = save.tank.splice(idx, 1);
    save.listings.push({ uid: genUid("l"), defId: tf.defId, price, source: "player", kind: "fish" });
    if (get().selectedTankUid === tankUid) set({ selectedTankUid: null });
    persist(save);
    set({ save });
  },

  unlistListing: (listingUid) => {
    const save = {
      ...get().save,
      listings: [...get().save.listings],
      basket: [...get().save.basket],
      eggs: [...get().save.eggs],
    };
    const idx = save.listings.findIndex((l) => l.uid === listingUid);
    if (idx < 0) return;
    const listing = save.listings[idx];
    if (listing.source !== "player") return;
    if (listing.kind !== "egg") {
      const def = FISH_BY_ID[listing.defId];
      if (!def) return;
      const why = basketRejectReason(save, def);
      if (why) {
        toast(why);
        return;
      }
    }
    save.listings.splice(idx, 1);
    if (listing.kind === "egg") {
      save.eggs.push({
        uid: genUid("e"),
        tankId: save.activeTankId,
        pairId: "",
        parentA: listing.defId,
        parentB: listing.parentB ?? listing.defId,
        laidDay: save.gameDay,
        readyDay: 0,
        started: false,
      });
      toast("已下架，鱼卵回到当前缸底");
    } else {
      const t = rollTraits();
      save.basket.push({ uid: genUid("b"), defId: listing.defId, personality: t.personality, loveView: t.loveView });
      toast("已下架，回到鱼筐");
    }
    persist(save);
    set({ save });
  },

  listManyFromTank: (uids, priceOf) => {
    for (const uid of uids) {
      const f = get().save.tank.find((x) => x.uid === uid);
      if (!f || f.dead) continue;
      const def = FISH_BY_ID[f.defId];
      const fallback = def ? (tankSellPrice(def.sellPrice, f.health, false) ?? def.sellPrice) : 1;
      get().listFromTank(uid, priceOf ? priceOf(f.defId) : fallback);
    }
  },

  listMany: (uids, priceOf) => {
    for (const uid of uids) {
      const b = get().save.basket.find((x) => x.uid === uid);
      if (b) get().listFish(uid, priceOf(b.defId));
    }
  },

  buyListing: (listingUid) => {
    const save = {
      ...get().save,
      listings: [...get().save.listings],
      basket: [...get().save.basket],
      eggs: [...get().save.eggs],
    };
    const idx = save.listings.findIndex((l) => l.uid === listingUid);
    if (idx < 0) return false;
    const listing = save.listings[idx];
    if (save.gold < listing.price) {
      toast("金币不足");
      return false;
    }
    if (listing.kind !== "egg") {
      const def = FISH_BY_ID[listing.defId];
      if (!def) return false;
      const why = basketRejectReason(save, def);
      if (why) {
        toast(why);
        return false;
      }
    }
    save.gold -= listing.price;
    if (listing.kind === "egg") {
      save.eggs.push({
        uid: genUid("e"),
        tankId: save.activeTankId,
        pairId: "",
        parentA: listing.defId,
        parentB: listing.parentB ?? listing.defId,
        laidDay: save.gameDay,
        readyDay: 0,
        started: false,
      });
    } else {
      const t = rollTraits();
      save.basket.push({ uid: genUid("b"), defId: listing.defId, personality: t.personality, loveView: t.loveView });
    }
    if (listing.source !== "market") save.listings.splice(idx, 1);
    persist(save);
    set({ save });
    const bought = FISH_BY_ID[listing.defId];
    toast(listing.kind === "egg" ? "买下鱼卵，已放到当前缸底" : `买下 ${bought?.name ?? "鱼"}，进了鱼筐`);
    if (listing.kind !== "egg") get().notifyQuest("buy_fish");
    return true;
  },

  buyBaitPack: (baitId, packs) => {
    const save = { ...get().save, baitStock: { ...get().save.baitStock } };
    const def = CONSUMABLE_BY_ID[baitId];
    if (!def) return false;
    const cost = def.baitPrice * 20 * packs;
    if (save.gold < cost) return false;
    save.gold -= cost;
    save.baitStock[baitId] = (save.baitStock[baitId] ?? 0) + 20 * packs;
    persist(save);
    set({ save });
    return true;
  },

  buyFoodPack: (foodId, packs) => {
    const save = { ...get().save, foodStock: { ...get().save.foodStock } };
    const baitId = foodId.replace(/^food_/, "bait_");
    const def = CONSUMABLE_BY_ID[baitId];
    if (!def) return false;
    const cost = def.foodPrice * 10 * packs;
    if (save.gold < cost) return false;
    save.gold -= cost;
    save.foodStock[foodId] = (save.foodStock[foodId] ?? 0) + 10 * packs;
    if (save.questStep === "q_feed" && !save.guideShopDone) save.guideShopDone = true;
    persist(save);
    set({ save });
    return true;
  },

  buyRod: (rodId) => {
    const save = { ...get().save };
    const def = ROD_BY_ID[rodId];
    if (!def || save.ownedRods.includes(rodId)) return false;
    if (def.currency === "gold" && save.gold < def.price) return false;
    if (def.currency === "pearl" && save.pearl < def.price) return false;
    if (def.currency === "gold") save.gold -= def.price;
    else save.pearl -= def.price;
    save.ownedRods = [...save.ownedRods, rodId];
    grantRodKit(save, rodId);
    bumpNewbieFlag(save, "buyRod");
    persist(save);
    set({ save });
    toast(`买下 ${def.name}，配套轮、线、钩、漂也到了`);
    return true;
  },

  buyStool: (stoolId) => {
    const save = { ...get().save };
    const def = STOOL_BY_ID[stoolId];
    if (!def || save.ownedStools.includes(stoolId)) return false;
    if (def.currency === "gold" && save.gold < def.price) return false;
    if (def.currency === "pearl" && save.pearl < def.price) return false;
    if (def.currency === "gold") save.gold -= def.price;
    else save.pearl -= def.price;
    save.ownedStools = [...save.ownedStools, stoolId];
    persist(save);
    set({ save });
    return true;
  },

  buyBasket: (basketId) => {
    const save = { ...get().save };
    const def = BASKET_BY_ID[basketId];
    if (!def || save.ownedBaskets.includes(basketId)) return false;
    if (def.currency === "gold" && save.gold < def.price) return false;
    if (def.currency === "pearl" && save.pearl < def.price) return false;
    if (def.currency === "gold") save.gold -= def.price;
    else save.pearl -= def.price;
    save.ownedBaskets = [...save.ownedBaskets, basketId];
    persist(save);
    set({ save });
    return true;
  },

  buyPart: (partId) => {
    const save = { ...get().save };
    const def = PART_BY_ID[partId];
    if (!def || save.ownedParts.includes(partId)) return false;
    if (def.currency === "gold" && save.gold < def.price) return false;
    if (def.currency === "pearl" && save.pearl < def.price) return false;
    if (def.currency === "gold") save.gold -= def.price;
    else save.pearl -= def.price;
    save.ownedParts = [...save.ownedParts, partId];
    persist(save);
    set({ save });
    return true;
  },

  equip: (slot, id) => {
    const equipped = { ...get().save.equipped, [slot]: id };
    let equippedBaitIds = [...(get().save.equippedBaitIds ?? [])];
    if (slot === "bait" && !equippedBaitIds.includes(id)) equippedBaitIds = [...equippedBaitIds, id];
    const save = { ...get().save, equipped, equippedBaitIds };
    if (slot === "rod") applyRodKit(save, id);
    persist(save);
    set({ save });
  },

  equipPart: (slot, partId) => {
    const def = PART_BY_ID[partId];
    if (!def || def.slot !== slot) return;
    if (!get().save.ownedParts.includes(partId)) {
      toast("包里还没有这件");
      return;
    }
    const save = { ...get().save, equippedParts: { ...get().save.equippedParts, [slot]: partId } };
    if (get().save.equippedParts[slot] !== partId) bumpNewbieFlag(save, "swapPart");
    persist(save);
    set({ save });
  },

  toggleTripBait: (baitId) => {
    const save = { ...get().save };
    const setIds = new Set(save.equippedBaitIds ?? []);
    if (setIds.has(baitId)) {
      if (setIds.size <= 1) {
        toast("至少带一种鱼饵");
        return;
      }
      setIds.delete(baitId);
      if (save.equipped.bait === baitId) {
        const next = [...setIds][0];
        save.equipped = { ...save.equipped, bait: next };
      }
    } else {
      if ((save.baitStock[baitId] ?? 0) <= 0) {
        toast("这种饵没有库存");
        return;
      }
      setIds.add(baitId);
    }
    save.equippedBaitIds = [...setIds];
    persist(save);
    set({ save });
  },

  setLoadoutName: (name) => {
    const save = { ...get().save, loadouts: get().save.loadouts.map((l) => ({ ...l })) };
    save.loadoutName = name;
    const cur = save.loadouts.find((l) => l.id === save.activeLoadoutId);
    if (cur) cur.name = name;
    persist(save);
    set({ save });
  },

  applyLoadout: (id) => {
    const save = { ...get().save };
    const l = save.loadouts.find((x) => x.id === id);
    if (!l) return;
    applyLoadoutToSave(save, l);
    persist(save);
    set({ save });
    toast(`已换上「${l.name}」`);
  },

  saveNewLoadout: (name) => {
    const trimmed = name.trim() || "新搭配";
    const save = { ...get().save, loadouts: [...get().save.loadouts] };
    const l = snapshotLoadout(save, genUid("loadout"), trimmed);
    save.loadouts.push(l);
    save.activeLoadoutId = l.id;
    save.loadoutName = l.name;
    persist(save);
    set({ save });
    toast(`已新建「${l.name}」`);
  },

  overwriteLoadout: (id) => {
    const save = { ...get().save, loadouts: get().save.loadouts.map((l) => ({ ...l })) };
    const i = save.loadouts.findIndex((l) => l.id === id);
    if (i < 0) return;
    const name = save.loadouts[i].name;
    save.loadouts[i] = snapshotLoadout(save, id, name);
    save.activeLoadoutId = id;
    save.loadoutName = name;
    persist(save);
    set({ save });
    toast(`已覆盖「${name}」`);
  },

  deleteLoadout: (id) => {
    const save = { ...get().save, loadouts: get().save.loadouts.filter((l) => l.id !== id) };
    if (save.loadouts.length === 0) {
      toast("至少留一套搭配");
      return;
    }
    if (save.activeLoadoutId === id) {
      applyLoadoutToSave(save, save.loadouts[0]);
    }
    persist(save);
    set({ save });
  },

  buyOutfit: (outfitId) => {
    const save = { ...get().save };
    const def = OUTFIT_BY_ID[outfitId];
    if (!def || save.ownedOutfits.includes(outfitId)) return false;
    if (def.currency === "gold" && save.gold < def.price) return false;
    if (def.currency === "pearl" && save.pearl < def.price) return false;
    if (def.currency === "gold") save.gold -= def.price;
    else save.pearl -= def.price;
    save.ownedOutfits = [...save.ownedOutfits, outfitId];
    persist(save);
    set({ save });
    toast(`买下 ${def.name}`);
    return true;
  },

  buyBook: (bookId) => {
    const save = { ...get().save };
    const def = BOOK_BY_ID[bookId];
    if (!def || save.ownedBooks.includes(bookId)) return false;
    if (def.currency === "gold" && save.gold < def.price) return false;
    if (def.currency === "pearl" && save.pearl < def.price) return false;
    if (def.currency === "gold") save.gold -= def.price;
    else save.pearl -= def.price;
    save.ownedBooks = [...save.ownedBooks, bookId];
    persist(save);
    set({ save });
    toast(`${def.name}买下了`);
    return true;
  },

  buyGearPack: () => {
    const save = { ...get().save };
    if (save.claimedGearPack) {
      toast("装备礼包已售罄");
      return false;
    }
    save.claimedGearPack = true;
    if (!save.ownedRods.includes("rod_fiberglass")) {
      save.ownedRods = [...save.ownedRods, "rod_fiberglass"];
      grantRodKit(save, "rod_fiberglass");
      bumpNewbieFlag(save, "buyRod");
    }
    if (!save.ownedStools.includes("stool_folding")) save.ownedStools = [...save.ownedStools, "stool_folding"];
    if (!save.ownedBaskets.includes("basket_medium")) save.ownedBaskets = [...save.ownedBaskets, "basket_medium"];
    save.baitStock = { ...save.baitStock, bait_basic: (save.baitStock.bait_basic ?? 0) + 20 };
    persist(save);
    set({ save });
    toast("玻璃钢竿连套配件、折叠凳、中鱼筐，还有糠面饵二十个，都进包了");
    return true;
  },

  buyOutfitPack: () => {
    const save = { ...get().save };
    if (save.claimedOutfitPack) {
      toast("服装礼包已售罄");
      return false;
    }
    save.claimedOutfitPack = true;
    if (!save.ownedOutfits.includes("outfit_festival")) {
      save.ownedOutfits = [...save.ownedOutfits, "outfit_festival"];
    }
    save.equippedOutfit = "outfit_festival";
    persist(save);
    set({ save });
    toast("节庆套穿上了");
    return true;
  },

  buyTankPack: () => {
    const save = {
      ...get().save,
      tanks: [...get().save.tanks],
      tankSlotIds: [...ensureTankSlotArray(get().save)],
    };
    if (save.claimedTankPack) {
      toast("鱼缸礼包已售罄");
      return false;
    }
    save.tankSlots += 1;
    save.claimedTankPack = true;
    const id = genUid("tank");
    const tank = emptyTank(id, nextTankName(save.tanks), "fine", "coral");
    save.tanks.push(tank);
    bumpNewbieFlag(save, "buyTank");
    bumpNewbieFlag(save, "expand");
    const emptyIdx = firstEmptySlotIndex(save);
    if (emptyIdx >= 0) {
      save.tankSlotIds[emptyIdx] = id;
      save.activeTankId = id;
    }
    while (save.tankSlotIds.length < save.tankSlots) save.tankSlotIds.push(null);
    persist(save);
    set({ save, selectedTankUid: null, selectedEggUid: null });
    toast("鱼缸礼包到了：多一个缸位，一口优良缸带着珊瑚");
    return true;
  },

  equipOutfit: (outfitId) => {
    if (!get().save.ownedOutfits.includes(outfitId)) return;
    const save = { ...get().save, equippedOutfit: outfitId };
    persist(save);
    set({ save });
  },

  setLookSex: (sex) => {
    const save = { ...get().save, lookSex: sex };
    persist(save);
    set({ save });
  },

  claimDaily: (kind) => {
    const save = { ...get().save, daily: { ...get().save.daily } };
    if (save.daily.day !== save.gameDay) save.daily = freshDaily(save.gameDay);
    if (kind === "fed") {
      if (!save.daily.fed || save.daily.fedClaimed) return;
      save.daily.fedClaimed = true;
      save.gold += 15;
      toast("常驻任务：今日喂食 +15金");
    } else {
      if (!save.daily.sold || save.daily.soldClaimed) return;
      save.daily.soldClaimed = true;
      save.gold += 20;
      toast("常驻任务：今日售卖 +20金");
    }
    persist(save);
    set({ save });
  },

  claimTimed: (itemId) => {
    const save = {
      ...get().save,
      timed: {
        ...get().save.timed,
        items: (get().save.timed?.items ?? []).map((it) => ({ ...it })),
      },
    };
    if (!save.timed.items.length) save.timed = freshTimed(save.gameDay);
    if (save.gameDay > save.timed.endDay) {
      toast("本期已结束");
      return;
    }
    const it = save.timed.items.find((x) => x.id === itemId);
    if (!it || it.claimed || it.progress < it.target) return;
    it.claimed = true;
    save.gold += it.rewardGold;
    persist(save);
    set({ save });
    toast(`限时任务完成 +${it.rewardGold}金`);
  },

  claimNewbieTask: (id) => {
    const def = NEWBIE_TASK_BY_ID[id];
    if (!def) return;
    const save = {
      ...get().save,
      newbieTasks: {
        ...(get().save.newbieTasks ?? freshNewbieTasks()),
        claimed: { ...(get().save.newbieTasks?.claimed ?? {}) },
      },
    };
    if (save.newbieTasks.claimed[id]) return;
    const progress = save.newbieTasks[def.progressKey] ?? 0;
    if (progress < def.target) return;
    save.newbieTasks.claimed[id] = true;
    save.gold += def.rewardGold;
    persist(save);
    set({ save });
    toast(`新手任务：${def.title} +${def.rewardGold}金`);
  },

  topUpPearl: (amount) => {
    const save = { ...get().save, pearl: get().save.pearl + amount };
    persist(save);
    set({ save });
    toast(`模拟充值 +${amount} 珍珠`);
  },

  exchangePearlToGold: (pearls) => {
    const save = { ...get().save };
    if (pearls <= 0 || save.pearl < pearls) return false;
    save.pearl -= pearls;
    save.gold += pearls * PEARL_TO_GOLD;
    persist(save);
    set({ save });
    toast(`兑换 ${pearls * PEARL_TO_GOLD} 金`);
    return true;
  },

  buyNewbiePack: () => {
    const save = { ...get().save };
    if (save.claimedNewbiePack) {
      toast("新人礼包已售罄");
      return false;
    }
    if (save.gameDay >= (save.newbiePackUntilDay ?? NEWBIE_PACK_DAYS)) {
      toast("新人礼包只在前 7 天可买");
      return false;
    }
    save.claimedNewbiePack = true;
    if (!save.ownedRods.includes("rod_golden_vortex")) {
      save.ownedRods = [...save.ownedRods, "rod_golden_vortex"];
      bumpNewbieFlag(save, "buyRod");
    }
    if (!save.ownedBaskets.includes("basket_gift")) save.ownedBaskets = [...save.ownedBaskets, "basket_gift"];
    save.equipped = { ...save.equipped, rod: "rod_golden_vortex", basket: "basket_gift" };
    applyRodKit(save, "rod_golden_vortex");
    save.baitStock = {
      ...save.baitStock,
      bait_honey_bean: (save.baitStock.bait_honey_bean ?? 0) + 10,
    };
    persist(save);
    set({ save });
    toast("金涡纹竿、涡纹鱼筐和优质鱼饵十个都到了");
    return true;
  },

  buyMonthlyCard: () => {
    const save = { ...get().save };
    extendMonthlyCard(save);
    const gift = MONTHLY_GIFT_REEL;
    const gifted = !save.ownedParts.includes(gift);
    if (gifted) save.ownedParts = [...save.ownedParts, gift];
    persist(save);
    set({ save });
    const left = monthlyDaysLeft(save);
    toast(
      gifted
        ? `月卡开通，送了一枚渔线轮，还剩 ${left} 天`
        : `月卡 +${MONTHLY_CARD_DAYS} 天，还剩 ${left} 天`,
    );
    get().claimMonthlyIfNeeded();
    return true;
  },

  setGameSpeed: (speed) => {
    const v = Number(speed);
    if (!Number.isFinite(v) || v <= 0) return;
    const save = { ...get().save, gameSpeed: v };
    persist(save);
    set({ save });
    toast(`游戏时速设为 ${v}（现实1秒=游戏${v}秒）`);
  },

  setGold: (n) => {
    const v = Math.max(0, Math.floor(Number(n) || 0));
    const save = { ...get().save, gold: v };
    persist(save);
    set({ save });
    toast(`金币设为 ${v}`);
  },

  setPearl: (n) => {
    const v = Math.max(0, Math.floor(Number(n) || 0));
    const save = { ...get().save, pearl: v };
    persist(save);
    set({ save });
    toast(`珍珠设为 ${v}`);
  },

  visitLeader: (npcId) => {
    const npc = LEADER_BY_ID[npcId];
    if (!npc) {
      toast("钓友不在");
      return;
    }
    const save = { ...get().save, scene: "visit_aquarium" as const, visitNpcId: npcId };
    if (Math.random() < 0.4 && save.luck < LUCK_CAP) {
      save.luck += 1;
      toast(`进了${npc.name}的馆，沾到一层欧气`);
    } else {
      toast(`进了${npc.name}的馆`);
    }
    persist(save);
    set({ save, selectedTankUid: null, selectedEggUid: null });
  },

  leaveVisit: () => {
    const save = { ...get().save, scene: "leaderboard" as const, visitNpcId: null };
    persist(save);
    set({ save, selectedTankUid: null, selectedEggUid: null });
    get().notifyQuest("visit");
  },

  buyLeaderFish: (uid) => {
    const npcId = get().save.visitNpcId;
    const npc = npcId ? LEADER_BY_ID[npcId] : undefined;
    if (!npc) return false;
    const taken = get().save.leaderTakenUids ?? [];
    const fish = visibleLeaderFish(npc, taken).find((f) => f.uid === uid);
    if (!fish || fish.dead) {
      toast("这条不在了");
      return false;
    }
    const def = FISH_BY_ID[fish.defId];
    if (!def) return false;
    const price = leaderBuyPrice(def.id);
    const save = { ...get().save, basket: [...get().save.basket], leaderTakenUids: [...taken] };
    if (save.gold < price) {
      toast("金币不足");
      return false;
    }
    const why = basketRejectReason(save, def);
    if (why) {
      toast(why);
      return false;
    }
    save.gold -= price;
    save.basket.push({
      uid: genUid("b"),
      defId: def.id,
      personality: fish.personality,
      loveView: fish.loveView,
      sex: fish.sex,
      health: fish.health,
      lastFedDay: fish.lastFedDay,
    });
    save.leaderTakenUids = [...save.leaderTakenUids, fish.uid];
    persist(save);
    set({ save, selectedTankUid: null });
    toast(`求购成功，${def.name}进了鱼筐`);
    return true;
  },

  applyLeaderMate: (leaderUid, myUid) => {
    const npcId = get().save.visitNpcId;
    const npc = npcId ? LEADER_BY_ID[npcId] : undefined;
    if (!npc) return false;
    const taken = get().save.leaderTakenUids ?? [];
    const guest = visibleLeaderFish(npc, taken).find((f) => f.uid === leaderUid);
    if (!guest || guest.dead) {
      toast("这条不在了");
      return false;
    }
    if (guest.pairId) {
      toast("已经有配偶了");
      return false;
    }
    const def = FISH_BY_ID[guest.defId];
    if (!def) return false;
    const price = leaderMatePrice(def.id);
    if (get().save.gold < price) {
      toast("金币不足");
      return false;
    }
    const save = {
      ...get().save,
      tank: get().save.tank.map((f) => ({ ...f })),
      leaderTakenUids: [...taken],
    };
    const mine = save.tank.find((f) => f.uid === myUid);
    if (!mine || mine.dead) {
      toast("你选的鱼不在了");
      return false;
    }
    if (!tankHasRoom(save, mine.tankId, 1)) {
      toast("那口缸满了，先腾位置");
      return false;
    }
    const guestCopy = {
      ...guest,
      tankId: mine.tankId,
      pairId: null,
      gestationLeft: 0,
      scentLayAt: 0,
      layCount: 0,
    };
    const roll = rollPairAccept(mine, guestCopy, 0.12, { requireSameTank: false });
    if (!roll.ok) {
      toast(roll.reason === "这回没看对眼" ? `${npc.name}这边没看对眼` : roll.reason);
      return false;
    }
    save.gold -= price;
    save.tank.push(guestCopy);
    bindPair(save, mine.uid, guestCopy.uid);
    save.leaderTakenUids = [...save.leaderTakenUids, guest.uid];
    persist(save);
    set({ save, selectedTankUid: null });
    toast(`${npc.name}答应了，${def.name}进缸结为配偶`);
    return true;
  },

  rentLeaderFish: (leaderUid, tankId, days) => {
    const npcId = get().save.visitNpcId;
    const npc = npcId ? LEADER_BY_ID[npcId] : undefined;
    if (!npc) return false;
    const d = Math.max(1, Math.floor(days));
    const taken = get().save.leaderTakenUids ?? [];
    const fish = visibleLeaderFish(npc, taken).find((f) => f.uid === leaderUid);
    if (!fish || fish.dead) {
      toast("这条不在了");
      return false;
    }
    const def = FISH_BY_ID[fish.defId];
    if (!def) return false;
    const total = leaderRentPricePerDay(def.id) * d;
    if (get().save.gold < total) {
      toast("金币不足");
      return false;
    }
    const save = {
      ...get().save,
      tank: [...get().save.tank],
      leaderTakenUids: [...taken],
    };
    if (!tankHasRoom(save, tankId, 1)) {
      toast("租借失败：鱼缸没空位，已退回钱");
      return false;
    }
    save.gold -= total;
    const copy = makeTankFish(save, fish.defId, tankId, {
      sex: fish.sex,
      personality: fish.personality,
      loveView: fish.loveView,
      health: fish.health,
      lastFedDay: fish.lastFedDay,
    });
    save.tank.push(copy);
    save.leaderTakenUids = [...save.leaderTakenUids, fish.uid];
    persist(save);
    set({ save, selectedTankUid: null });
    toast(`租借成功，${def.name}进了鱼缸（${d} 天）`);
    return true;
  },

  readMail: (uid) => {
    const save = { ...get().save, mails: copyMails(get().save) };
    const mail = save.mails.find((m) => m.uid === uid);
    if (!mail || mail.read) return;
    mail.read = true;
    persist(save);
    set({ save });
  },

  claimMail: (uid) => {
    const save = {
      ...get().save,
      mails: copyMails(get().save),
      baitStock: { ...get().save.baitStock },
      foodStock: { ...get().save.foodStock },
    };
    const mail = save.mails.find((m) => m.uid === uid);
    const def = mail ? MAIL_BY_ID[mail.defId] : undefined;
    if (!mail || !def) return false;
    if (mailExpired(mail, save.gameDay, def)) {
      toast("这封信过期了");
      return false;
    }
    if (!mailHasReward(def) || mail.claimed) return false;
    mail.read = true;
    mail.claimed = true;
    const bits = grantMailReward(save, def);
    persist(save);
    set({ save });
    toast(bits.length ? `已领取 ${bits.join(" ")}` : "已领取");
    return true;
  },

  claimAllMail: () => {
    const save = {
      ...get().save,
      mails: copyMails(get().save),
      baitStock: { ...get().save.baitStock },
      foodStock: { ...get().save.foodStock },
    };
    let n = 0;
    const bits: string[] = [];
    for (const mail of save.mails) {
      const def = MAIL_BY_ID[mail.defId];
      if (!def || !mailHasReward(def) || mail.claimed) continue;
      if (mailExpired(mail, save.gameDay, def)) continue;
      mail.read = true;
      mail.claimed = true;
      bits.push(...grantMailReward(save, def));
      n += 1;
    }
    if (n === 0) {
      toast("没有可领的附件");
      return;
    }
    persist(save);
    set({ save });
    toast(`领取 ${n} 封${bits.length ? ` ${bits.join(" ")}` : ""}`);
  },

  deleteMail: (uid) => {
    const save = { ...get().save, mails: copyMails(get().save) };
    const mail = save.mails.find((m) => m.uid === uid);
    const def = mail ? MAIL_BY_ID[mail.defId] : undefined;
    if (!mail) return false;
    if (def && mailHasReward(def) && !mail.claimed) {
      toast("请先领取附件");
      return false;
    }
    save.mails = save.mails.filter((m) => m.uid !== uid);
    persist(save);
    set({ save });
    return true;
  },

  createNote: () => {
    const uid = genUid("n");
    const note = { uid, title: "", content: "", updatedAt: Date.now() };
    const save = { ...get().save, notes: [note, ...get().save.notes] };
    persist(save);
    set({ save });
    return uid;
  },

  saveNote: (uid, title, content) => {
    const notes = get().save.notes;
    if (!notes.some((n) => n.uid === uid)) return false;
    const next = notes.map((n) =>
      n.uid === uid
        ? { ...n, title: title.trim(), content, updatedAt: Date.now() }
        : n,
    );
    const save = { ...get().save, notes: next };
    persist(save);
    set({ save });
    toast("已保存");
    return true;
  },

  deleteNote: (uid) => {
    const save = { ...get().save, notes: get().save.notes.filter((n) => n.uid !== uid) };
    persist(save);
    set({ save });
  },

  notifyQuest: (trigger) => {
    const save = { ...get().save };
    if (!applyQuest(save, trigger)) return;
    persist(save);
    set({ save });
  },

  skipGuide: () => {
    useUi.getState().resetGuideHints();
    const save = { ...get().save, guideSkipped: true, guideTripPhase: 0 as const };
    persist(save);
    set({ save });
    toast("已关掉引导，可随时在任务页重温");
  },

  resumeGuide: (stepId) => {
    const cur = get().save;
    const step = stepId ?? (cur.questStep === "q_done" ? "q_go_fish" : cur.questStep);
    useUi.getState().resetGuideHints();
    useUi.getState().setGuideReviewStep(step);
    const save = { ...cur, guideSkipped: false };
    if (save.scene === "quests") save.scene = "aquarium";
    // 重温存缸 / 筐里有鱼在馆：相位 4（回程存鱼）。
    // 新流程里 q_feed 是第一步（起始鱼已在缸），不再设相位 5。
    if (
      (step === "q_tank" || save.questStep === "q_tank") &&
      save.basket.length > 0 &&
      (save.scene === "aquarium" || save.scene === "store_tank")
    ) {
      save.guideTripPhase = 4;
      useUi.getState().setGuideTripPhase(4);
    }
    persist(save);
    set({ save });
    toast("引导已开启");
  },

  answerGuidePrompt: (accept) => {
    const save = { ...get().save, guidePrompted: true };
    if (!accept) save.guideSkipped = true;
    persist(save);
    set({ save });
    if (accept) toast("新手引导已开启，跟着高亮走");
    else toast("已关掉引导，可随时在任务页开启");
  },
}));

export { foodIdFromBait };
