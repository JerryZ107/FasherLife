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
  freshDaily,
  freshTimed,
} from "../save/saveSchema";
import { FISH_BY_ID } from "../data/fishDefs";
import { CONSUMABLE_BY_ID, foodIdFromBait } from "../data/consumableDefs";
import { kitPartIds, PART_BY_ID, ROD_BY_ID, STOOL_BY_ID, BASKET_BY_ID } from "../data/equipmentDefs";
import { OUTFIT_BY_ID } from "../data/outfitDefs";
import { BOOK_BY_ID, bookLuck } from "../data/bookDefs";
import { FISHERY_BY_ID } from "../data/fisheryDefs";
import { QUEST_BY_ID } from "../data/questDefs";
import { TANK_BY_ID } from "../data/tankDefs";
import { ATTRACTANT_BY_ID } from "../data/attractantDefs";
import type { FishDef, LoveView, Personality, QuestTrigger, RodPartSlot, Sex } from "../types";
import { QUALITY_ORDER } from "../types";
import {
  IDLE_MS_PER_CAST,
  LUCK_CAP,
  MONTHLY_CARD_DAILY_GOLD,
  MONTHLY_CARD_DAYS,
  MONTHLY_CARD_PEARL,
  NEWBIE_PACK_DAYS,
  NEWBIE_PACK_PEARL,
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
} from "../game/economy";
import { genUid, pickFishFromPool, addToBasket, replaceBasketFish, tryAddToBasket, basketFits } from "../game/fishingLogic";
import { sexFromUid } from "../game/sex";
import {
  breakPair,
  hatchDaysForParents,
  hatchGoldForParents,
  HATCH_PEARL,
  pickOffspringDefId,
  resolveScentLays,
  rollOffspringTraits,
  scentBuyTimeForFish,
  scentBuyTimeForTank,
  tickPairsAndEggs,
} from "../game/pairing";
import { rollTraits } from "../game/traits";
import {
  accountExists,
  clearLegacySave,
  createAccountSlot,
  getSessionAccount,
  hashPassword,
  peekLegacySaveRaw,
  setSessionAccount,
  validateAccount,
  validatePassword,
  verifyAccountHash,
} from "../save/accounts";
import {
  EXPAND_DAYS,
  EXPAND_GOLD,
  EXPAND_PEARL,
  EXPAND_STEP,
  emptyTank,
  hasFreeTankSlot,
  nextTankName,
  tankHasRoom,
} from "../game/tanks";
import { LEADERBOARD } from "../data/leaderboard";
import { useUi } from "./uiStore";
import {
  addStamina,
  applyStaminaRegen,
  cookRestore,
  ENERGY_DRINK_PRICE,
  ENERGY_DRINK_STAMINA,
  grantCatchXp,
  idleStaminaCostForDef,
  PLAYER_LEVEL_MAX,
  resetSatietyIfNewDay,
  SALT_PRICE,
  satietyMax,
  YUANQI_RESTORE,
} from "../game/stamina";
import { beijingCalendarDaysPassed } from "../game/time";

const bootSave = loadSave() ?? createNewSave();

interface GameStore {
  save: SaveData;
  selectedTankUid: string | null;
  selectedEggUid: string | null;
  selectedFisheryId: string | null;
  account: string | null;

  setScene: (scene: SceneId) => void;
  selectTankFish: (uid: string | null) => void;
  selectEgg: (uid: string | null) => void;
  selectFishery: (id: string | null) => void;
  startGame: (playerName?: string) => void;
  login: (account: string, password: string) => Promise<string | null>;
  logout: () => void;
  resetSave: () => void;

  tick: (now: number) => void;
  settleDays: (now: number) => void;
  resolveScent: (now: number) => void;
  simulateIdle: (now: number) => void;
  claimMonthlyIfNeeded: () => void;

  putToTank: (basketUid: string) => void;
  putManyToTank: (basketUids: string[]) => void;
  feed: (uid: string) => boolean;
  feedMany: (uids: string[]) => void;
  release: (uid: string) => void;
  releaseMany: (uids: string[]) => void;
  cleanDead: (uid: string) => void;
  cleanAllDead: () => void;
  setHosting: (on: boolean) => void;

  switchTank: (dir: -1 | 1) => void;
  setActiveTank: (id: string) => void;
  moveTankFish: (uids: string[], destTankId: string) => boolean;
  putTankToBasket: (uids: string[]) => boolean;
  setDefaultTank: () => void;
  buyTank: (defId: string) => boolean;
  startExpand: () => boolean;
  accelerateExpand: (mode: "pearl" | "ad") => boolean;
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
  pickBiteFish: () => FishDef | null;
  startIdle: () => boolean;
  stopIdle: () => void;
  cookFish: (uid: string, from: "basket" | "tank") => boolean;
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
  claimTimed: () => void;
  topUpPearl: (amount: number) => void;
  exchangePearlToGold: (pearls: number) => boolean;
  buyNewbiePack: () => boolean;
  buyMonthlyCard: () => boolean;
  visitLeader: (npcId: string) => void;

  notifyQuest: (trigger: QuestTrigger) => void;
}

function persist(save: SaveData) {
  writeSave(save);
}

function toast(msg: string) {
  useUi.getState().showToast(msg);
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
  if (!save.timed) save.timed = freshTimed(save.gameDay);
  if (save.timed.claimed || save.gameDay > save.timed.endDay) return;
  const q = QUALITY_ORDER.indexOf(FISH_BY_ID[defId]?.quality ?? "common");
  if (q >= 1) save.timed.progress = Math.min(save.timed.target, save.timed.progress + 1);
}

function noteCatch(save: SaveData, fishDef: FishDef) {
  if (!save.caughtFishIds.includes(fishDef.id)) {
    save.caughtFishIds = [...save.caughtFishIds, fishDef.id];
  }
  bumpTimedCatch(save, fishDef.id);
  applyQuest(save, "catch");
  const lv = grantCatchXp(save, fishDef.quality);
  if (lv.to > lv.from) {
    const msg = lv.to >= PLAYER_LEVEL_MAX
      ? `升到 ${lv.to} 级，能量已回满`
      : `升到 ${lv.to} 级`;
    toast(msg);
  }
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
  const bits: string[] = [`任务完成：${q.title}`];
  if (q.rewardGold) bits.push(`+${q.rewardGold}金`);
  if (q.rewardSalt) bits.push(`+${q.rewardSalt}盐`);
  toast(bits.join(" "));
  return true;
}

function tryAutoFeedDay(save: SaveData, dayIndex: number): { unfed: number; bought: number } {
  const fee = hostingDailyFee(save.tank);
  if (save.gold < fee) {
    save.hosting = false;
    toast("金币不足，托管已停止");
    return { unfed: 0, bought: 0 };
  }
  save.gold -= fee;
  save.foodStock = { ...save.foodStock };
  const living = save.tank
    .filter((f) => !f.dead)
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

  setScene: (scene) => {
    const save = { ...get().save, scene };
    persist(save);
    set({ save });
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

  login: async (account, password) => {
    const accErr = validateAccount(account);
    if (accErr) return accErr;
    const pwErr = validatePassword(password);
    if (pwErr) return pwErr;
    const name = account.trim();
    const hash = await hashPassword(name, password);
    const leftoverRaw = peekLegacySaveRaw();
    const leftover = leftoverRaw ? hydrateSave(leftoverRaw) : null;

    if (accountExists(name)) {
      if (!verifyAccountHash(name, hash)) return "密码不对";
      setSessionAccount(name);
      let save = loadSave() ?? createNewSave();
      let fromLegacy = false;
      if (leftover && saveLooksUnused(save)) {
        save = leftover;
        fromLegacy = true;
        clearLegacySave();
      }
      if (!save.started || save.scene === "login") {
        save.started = true;
        if (save.scene === "login") save.scene = "aquarium";
        save.playerName = save.playerName || name;
      }
      persist(save);
      set({
        save,
        account: name,
        selectedTankUid: null,
        selectedEggUid: null,
        selectedFisheryId: save.lastFisheryId,
      });
      toast(fromLegacy ? "已接上你之前的存档" : `欢迎回来，${save.playerName || name}`);
      return null;
    }

    const save = leftover ?? createNewSave();
    save.started = true;
    if (!save.scene || save.scene === "login") save.scene = "aquarium";
    save.playerName = save.playerName || name;
    const created = createAccountSlot(name, hash, save);
    if (created) return created;
    if (leftover) clearLegacySave();
    setSessionAccount(name);
    persist(save);
    set({
      save,
      account: name,
      selectedTankUid: null,
      selectedEggUid: null,
      selectedFisheryId: save.lastFisheryId,
    });
    toast(leftover ? "已接上你之前的存档" : `欢迎，${name}`);
    return null;
  },

  logout: () => {
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
    persist(save);
    set({ save, selectedTankUid: null, selectedEggUid: null, selectedFisheryId: null });
    toast("本账号存档已重置");
  },

  tick: (now) => {
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
  },

  settleDays: (now) => {
    const save = {
      ...get().save,
      tank: get().save.tank.map((f) => ({ ...f })),
      eggs: [...get().save.eggs],
      tanks: get().save.tanks.map((t) => ({ ...t })),
      foodStock: { ...get().save.foodStock },
    };
    const days = beijingCalendarDaysPassed(save.lastDayTickAt, now);
    if (days <= 0) return;
    let newEggs = 0;
    let newPairs = 0;
    let expanded = 0;
    let hostUnfed = 0;
    let hostBought = 0;
    for (let d = 0; d < days; d++) {
      const endingDay = save.gameDay + d;
      if (save.hosting) {
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
      if (save.expandSlotReadyDay != null && endingDay >= save.expandSlotReadyDay) {
        save.tankSlots += EXPAND_STEP;
        save.expandSlotReadyDay = null;
        expanded += 1;
      }
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
    if (hostBought > 0) toast(`托管代买了 ${hostBought} 份对应品质鱼粮`);
    if (hostUnfed > 0) toast(`托管：${hostUnfed} 条没有对应鱼粮（金币也不够代买），健康在掉`);
    if (newPairs > 0) toast(`同缸自动结为配偶 ×${newPairs}`);
    if (newEggs > 0) toast(`配偶在缸底下了 ${newEggs} 枚鱼卵`);
    if (expanded > 0) toast(`扩建完成，水族馆可再放 ${EXPAND_STEP * expanded} 口缸`);
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

  simulateIdle: (now) => {
    const prev = get().save;
    if (!prev.idle) return;
    const save: SaveData = { ...prev, idle: { ...prev.idle }, baitStock: { ...prev.baitStock }, basket: [...prev.basket] };
    const idle = save.idle!;
    const fishery = FISHERY_BY_ID[idle.fisheryId];
    if (!fishery) {
      save.idle = null;
      persist(save);
      set({ save });
      return;
    }
    let attempts = Math.floor((now - idle.lastSimAt) / IDLE_MS_PER_CAST);
    if (attempts <= 0) return;
    const baitId = save.equipped.bait;
    let bait = save.baitStock[baitId] ?? 0;
    let stopReason: "bait" | "stamina" | null = null;
    while (attempts > 0) {
      if (bait <= 0) {
        stopReason = "bait";
        break;
      }
      const fish = pickFishFromPool(fishery.pool, baitId, effectiveLuck(save));
      const cost = idleStaminaCostForDef(fish.id);
      if (save.stamina < cost) {
        stopReason = "stamina";
        break;
      }
      bait -= 1;
      save.stamina -= cost;
      const added = tryAddToBasket(save, fish);
      if (added !== "rejected") {
        noteCatch(save, fish);
      }
      attempts -= 1;
      idle.lastSimAt += IDLE_MS_PER_CAST;
    }
    save.baitStock[baitId] = bait;
    if (stopReason === "bait") {
      save.idle = null;
      toast("鱼饵用完，已退出挂机");
    } else if (stopReason === "stamina") {
      save.idle = null;
      toast("能量不足，已退出挂机");
    }
    persist(save);
    set({ save });
  },

  claimMonthlyIfNeeded: () => {
    const save = { ...get().save };
    if (save.monthlyCardUntilDay < 0) return;
    const until = Math.min(save.gameDay, save.monthlyCardUntilDay);
    if (save.lastMonthlyClaimDay >= until) return;
    const days = until - save.lastMonthlyClaimDay;
    save.gold += days * MONTHLY_CARD_DAILY_GOLD;
    save.lastMonthlyClaimDay = until;
    persist(save);
    set({ save });
    toast(days > 1 ? `月卡补领 ${days} 天 +${days * MONTHLY_CARD_DAILY_GOLD}金` : `月卡每日领取 +${MONTHLY_CARD_DAILY_GOLD}金`);
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
      if (!save.caughtFishIds.includes(bf.defId)) save.caughtFishIds.push(bf.defId);
      count += 1;
      return false;
    });
    if (count === 0) {
      if (skipped > 0) toast("当前鱼缸已满，先扩建或换缸");
      return;
    }
    applyQuest(save, "tank");
    persist(save);
    set({ save });
    toast(skipped > 0 ? `已存入 ${count} 条，缸满剩下 ${skipped} 条` : `已存入 ${count} 条`);
  },

  feed: (uid) => {
    const save = { ...get().save, tank: get().save.tank.map((f) => ({ ...f })), foodStock: { ...get().save.foodStock } };
    const fish = save.tank.find((f) => f.uid === uid);
    if (!fish || fish.dead) return false;
    const foodId = save.equipped.food;
    if ((save.foodStock[foodId] ?? 0) <= 0) {
      toast("鱼粮不足");
      return false;
    }
    if (!canFeed(fish.defId, foodId)) {
      toast("这鱼只吃与自身品质相同的鱼粮");
      return false;
    }
    save.foodStock[foodId] -= 1;
    fish.lastFedDay = save.gameDay;
    markDaily(save, "fed");
    applyQuest(save, "feed");
    persist(save);
    set({ save });
    return true;
  },

  feedMany: (uids) => {
    for (const uid of uids) get().feed(uid);
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

  setHosting: (on) => {
    if (on) {
      const fee = hostingDailyFee(get().save.tank);
      if (get().save.gold < fee && fee > 0) {
        toast("金币不够支付今天的托管费");
        return;
      }
    }
    const save = { ...get().save, hosting: on };
    persist(save);
    set({ save });
    toast(on ? `已托管，日费 ${hostingDailyFee(save.tank)} 金` : "已取消托管");
  },

  switchTank: (dir) => {
    const save = get().save;
    const i = save.tanks.findIndex((t) => t.id === save.activeTankId);
    if (i < 0 || save.tanks.length <= 1) return;
    const next = save.tanks[(i + dir + save.tanks.length) % save.tanks.length];
    get().setActiveTank(next.id);
  },

  setActiveTank: (id) => {
    const save = get().save;
    if (!save.tanks.some((t) => t.id === id) || save.activeTankId === id) return;
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
    if (moving.length === 0) return false;
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
      });
      moved.add(f.uid);
      count += 1;
    }
    if (count === 0) {
      toast(skipped > 0 ? "鱼筐满了，先腾位置" : "没有可放的鱼");
      return false;
    }
    save.tank = save.tank.filter((f) => !moved.has(f.uid));
    persist(save);
    set({
      save,
      selectedTankUid: moved.has(get().selectedTankUid ?? "") ? null : get().selectedTankUid,
    });
    toast(skipped > 0 ? `已放回鱼筐 ${count} 条，筐满剩下 ${skipped} 条` : `已放回鱼筐 ${count} 条`);
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
    const save = { ...get().save, tanks: [...get().save.tanks] };
    if (!hasFreeTankSlot(save)) {
      toast("没有空缸位，先扩建水族馆");
      return false;
    }
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
    save.activeTankId = id;
    persist(save);
    set({ save, selectedTankUid: null, selectedEggUid: null });
    toast(`买下 ${def.name}（${def.capacity} 条）`);
    return true;
  },

  startExpand: () => {
    const save = { ...get().save };
    if (save.expandSlotReadyDay != null) {
      toast("已经在扩建缸位了");
      return false;
    }
    if (save.gold < EXPAND_GOLD) {
      toast("金币不足");
      return false;
    }
    save.gold -= EXPAND_GOLD;
    save.expandSlotReadyDay = save.gameDay + EXPAND_DAYS;
    persist(save);
    set({ save });
    toast(`扩建已开工，${EXPAND_DAYS} 天后 +${EXPAND_STEP} 个缸位（可用珍珠/广告加速）`);
    return true;
  },

  accelerateExpand: (mode) => {
    const save = { ...get().save };
    if (save.expandSlotReadyDay == null) {
      if (save.gold < EXPAND_GOLD) {
        toast("金币不足，先开工扩建");
        return false;
      }
      save.gold -= EXPAND_GOLD;
      save.expandSlotReadyDay = save.gameDay + EXPAND_DAYS;
    }
    if (mode === "pearl") {
      if (save.pearl < EXPAND_PEARL) {
        persist(save);
        set({ save });
        toast("珍珠不足");
        return false;
      }
      save.pearl -= EXPAND_PEARL;
    }
    save.tankSlots += EXPAND_STEP;
    save.expandSlotReadyDay = null;
    persist(save);
    set({ save });
    toast(mode === "ad" ? "看完广告，多了一个缸位" : `珍珠加速，缸位 +${EXPAND_STEP}`);
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

  pickBiteFish: () => {
    const save = get().save;
    const fid = get().selectedFisheryId;
    const fishery = fid ? FISHERY_BY_ID[fid] : null;
    if (!fishery) return null;
    return pickFishFromPool(fishery.pool, save.equipped.bait, effectiveLuck(save));
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
    get().simulateIdle(Date.now());
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
    };
    resetSatietyIfNewDay(save);
    applyStaminaRegen(save, Date.now());
    if (save.satietyUsed >= satietyMax(save.playerLevel)) {
      toast("今天已经吃饱了");
      return false;
    }
    if ((save.saltStock ?? 0) < 1) {
      toast("没有盐，去商城买");
      return false;
    }
    let defId: string | null = null;
    if (from === "basket") {
      const b = save.basket.find((x) => x.uid === uid);
      if (!b) return false;
      defId = b.defId;
      save.basket = save.basket.filter((x) => x.uid !== uid);
    } else {
      const f = save.tank.find((x) => x.uid === uid && !x.dead);
      if (!f) return false;
      defId = f.defId;
      breakPair(save, uid);
      save.tank = save.tank.filter((x) => x.uid !== uid);
    }
    const first = save.firstCookDay !== save.gameDay;
    const rec = cookRestore(defId, first);
    save.saltStock -= 1;
    save.satietyUsed += 1;
    if (first) save.firstCookDay = save.gameDay;
    addStamina(save, rec);
    persist(save);
    set({
      save,
      selectedTankUid: get().selectedTankUid === uid ? null : get().selectedTankUid,
    });
    toast(`做好了，能量 +${rec}${first ? "（今日首次 +50%）" : ""}`);
    return true;
  },

  buySalt: (n) => {
    const qty = Math.max(1, Math.floor(n));
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
    if (save.gold < cost) return false;
    save.gold -= cost;
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
    if (listing.source === "player") save.listings.splice(idx, 1);
    persist(save);
    set({ save });
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
    persist(save);
    set({ save });
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
      toast("还没有这件组件");
      return;
    }
    const save = { ...get().save, equippedParts: { ...get().save.equippedParts, [slot]: partId } };
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
    toast(`买下 ${def.name}（持有即生效）`);
    return true;
  },

  buyGearPack: () => {
    const save = { ...get().save };
    const price = 6;
    if (save.pearl < price) {
      toast("珍珠不足");
      return false;
    }
    save.pearl -= price;
    if (!save.ownedRods.includes("rod_fiberglass")) {
      save.ownedRods = [...save.ownedRods, "rod_fiberglass"];
      grantRodKit(save, "rod_fiberglass");
    }
    if (!save.ownedStools.includes("stool_folding")) save.ownedStools = [...save.ownedStools, "stool_folding"];
    if (!save.ownedBaskets.includes("basket_medium")) save.ownedBaskets = [...save.ownedBaskets, "basket_medium"];
    save.baitStock = { ...save.baitStock, bait_basic: (save.baitStock.bait_basic ?? 0) + 20 };
    persist(save);
    set({ save });
    toast("装备礼包：玻璃钢竿套件 + 折叠凳 + 中鱼筐 + 基础饵×20");
    return true;
  },

  buyOutfitPack: () => {
    const save = { ...get().save };
    const price = 4;
    if (save.pearl < price) {
      toast("珍珠不足");
      return false;
    }
    if (save.ownedOutfits.includes("outfit_festival")) {
      toast("已经有节庆套了");
      return false;
    }
    save.pearl -= price;
    save.ownedOutfits = [...save.ownedOutfits, "outfit_festival"];
    save.equippedOutfit = "outfit_festival";
    persist(save);
    set({ save });
    toast("服装礼包：已穿上节庆套（无属性）");
    return true;
  },

  buyTankPack: () => {
    const save = { ...get().save, tanks: [...get().save.tanks] };
    const price = 8;
    if (save.pearl < price) {
      toast("珍珠不足");
      return false;
    }
    if (!hasFreeTankSlot(save)) save.tankSlots += 1;
    save.pearl -= price;
    const id = genUid("tank");
    const tank = emptyTank(id, nextTankName(save.tanks), "fine", "coral");
    save.tanks.push(tank);
    save.activeTankId = id;
    persist(save);
    set({ save, selectedTankUid: null, selectedEggUid: null });
    toast("鱼缸礼包：优良缸 + 珊瑚（无缸位时附赠一个）");
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

  claimTimed: () => {
    const save = { ...get().save, timed: { ...get().save.timed } };
    if (save.timed.claimed || save.timed.progress < save.timed.target) return;
    save.timed.claimed = true;
    save.gold += 80;
    persist(save);
    set({ save });
    toast("限时任务完成 +80金");
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
      toast("已购买过新人礼包");
      return false;
    }
    if (save.gameDay >= (save.newbiePackUntilDay ?? NEWBIE_PACK_DAYS)) {
      toast("新人礼包只在前 7 天可买");
      return false;
    }
    if (save.pearl < NEWBIE_PACK_PEARL) {
      toast("珍珠不足，可先模拟充值");
      return false;
    }
    save.pearl -= NEWBIE_PACK_PEARL;
    save.claimedNewbiePack = true;
    if (!save.ownedRods.includes("rod_golden_vortex")) save.ownedRods = [...save.ownedRods, "rod_golden_vortex"];
    if (!save.ownedBaskets.includes("basket_gift")) save.ownedBaskets = [...save.ownedBaskets, "basket_gift"];
    save.equipped = { ...save.equipped, rod: "rod_golden_vortex", basket: "basket_gift" };
    applyRodKit(save, "rod_golden_vortex");
    persist(save);
    set({ save });
    toast("已装备金涡纹竿与 12 格礼包鱼筐");
    return true;
  },

  buyMonthlyCard: () => {
    const save = { ...get().save };
    if (save.pearl < MONTHLY_CARD_PEARL) {
      toast("珍珠不足");
      return false;
    }
    save.pearl -= MONTHLY_CARD_PEARL;
    save.monthlyCardUntilDay = save.gameDay + MONTHLY_CARD_DAYS;
    save.gold += MONTHLY_CARD_DAILY_GOLD;
    save.lastMonthlyClaimDay = save.gameDay;
    const gift = "part_gift_reel";
    if (!save.ownedParts.includes(gift)) {
      save.ownedParts = [...save.ownedParts, gift];
      toast(`月卡开通，今日领取 ${MONTHLY_CARD_DAILY_GOLD} 金，赠送月卡渔线轮`);
    } else {
      toast(`月卡开通，今日领取 ${MONTHLY_CARD_DAILY_GOLD} 金`);
    }
    persist(save);
    set({ save });
    return true;
  },

  visitLeader: (npcId) => {
    const save = { ...get().save };
    const npc = LEADERBOARD.find((n) => n.id === npcId);
    const who = npc?.name ?? "钓友";
    if (Math.random() < 0.4 && save.luck < LUCK_CAP) {
      save.luck += 1;
      persist(save);
      set({ save });
      toast(`参观${who}的缸，获得一层欧气`);
      return;
    }
    toast(`参观了${who}的缸，这次没沾到欧气`);
  },

  notifyQuest: (trigger) => {
    const save = { ...get().save };
    if (!applyQuest(save, trigger)) return;
    persist(save);
    set({ save });
  },
}));

export { foodIdFromBait };
