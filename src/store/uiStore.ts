import { create } from "zustand";
import type { SlotOverflow } from "../game/slotAssign";
import type { SceneId } from "../save/saveSchema";
import { INITIAL_FRIEND_UIDS, normalizePlayerUid } from "../data/playerDefs";

export type AdJob = { kind: "egg"; uid: string };

export type ConfirmRequest = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

/** 与存档 guideTripPhase 同步：0空闲 1馆→地图 2地图→钓点 3钓点→地图 4地图→馆 5鱼筐→馆。 */
export type GuideTripPhase = 0 | 1 | 2 | 3 | 4 | 5;

export type FishChatTab = "msg" | "friends" | "feed" | "mine";

interface UiStore {
  toast: string | null;
  comingSoon: string | null;
  confirm: ConfirmRequest | null;
  /** 回到水族馆后要打开的侧栏（钓获进鱼筐，不自动打开入缸）。 */
  hubPanel: "none" | "basket" | "host";
  tankCue: { uid: string; kind: "eat" | "refuse"; n: number } | null;
  feedPanelOpen: boolean;
  /** 水族馆散点喂食：点缸空白落粮。 */
  tankScatterFeed: boolean;
  /** 配偶喷雾：点鱼喷求偶香。 */
  tankMateSpray: boolean;
  /** 配偶页选中的求偶香批次。 */
  mateScentLotUid: string | null;
  /** 交配面板：已喷中的鱼 uid（最多 2）。 */
  matePick: string[];
  /** 喷香后两鱼靠近交配动画。 */
  matingSession: { fishA: string; fishB: string } | null;
  matePanelOpen: boolean;
  /** 水族馆渔聊手机界面。 */
  fishChatOpen: boolean;
  shopTab: "tank" | "attractant" | "food" | null;
  adJob: AdJob | null;
  monthlyGoldOpen: boolean;
  dockGuide: { phase: string; caught: boolean; catchPopupOpen?: boolean; leaveGuideAfterCatch?: boolean } | null;
  storeTab: "basket" | "cook" | "list" | "sell" | null;
  /** 进入鱼筐页时要打开的子页（用完即清）。 */
  storeTabPref: "basket" | "cook" | null;
  /** 进入背包时要打开的 tab（用完即清）。 */
  equipTabPref: string | null;
  mapPicked: string | null;
  /** 渔聊应约跳转：解锁地图选点并预选中钓场。 */
  meetFisheryId: string | null;
  guideSellPrompted: boolean;
  guideTripPhase: GuideTripPhase;
  /** 重温模式：按指定任务步展示引导，不影响真实任务进度。 */
  guideReviewStep: string | null;
  /** 新玩家首次进游戏弹欢迎 + 引导询问。 */
  welcomeOpen: boolean;
  /** 调试面板是否打开。 */
  debugOpen: boolean;
  /** 挂机引导：能量提示是否已点「下一步」。 */
  guideIdleStaminaHinted: boolean;
  /** 搏斗教学子步：0 拇指+玩家滑块，1 鱼滑块+进度，2 搏斗提示，null 已结束。 */
  guideFightIntroStep: number | null;
  /** 搏斗教学倒计时 3→2→1，结束后正式开始搏斗。 */
  guideFightCountdown: number | null;
  /** 商城当前 tab（供引导判断是否在鱼粮页）。 */
  shopCurrentTab: string | null;
  /** 鱼行当前 tab（供引导判断是否在购买页）。 */
  marketCurrentTab: string | null;
  /** 装备页当前 tab（供引导判断是否在能量页）。 */
  equipCurrentTab: string | null;
  /** 从个人主页进入背包时的返回场景。 */
  stackReturn: SceneId | null;
  /** 离馆去商城后回馆要恢复的水族馆侧栏（配偶/喂食页）。 */
  aquariumPanelResume: "mate" | "feed" | null;
  /** 进入图鉴时的直接返回场景（主页 / 背包）。 */
  encycReturn: SceneId | null;
  /** 正在查看的玩家 UID；null=自己的主页。 */
  viewProfileUid: string | null;
  /** 离开他人主页时的返回场景。 */
  profileReturnScene: SceneId | null;
  /** 渔聊打开时直接进入的会话 id。 */
  fishChatOpenThread: string | null;
  /** 渔聊打开时默认选中的 Tab（用完即清）。 */
  fishChatOpenTab: FishChatTab | null;
  /** 渔聊当前选中的 Tab（供引导）。 */
  fishChatCurrentTab: FishChatTab | null;
  /** 渔聊发布页是否打开（供引导）。 */
  fishChatComposeOpen: boolean;
  /** 渔聊「我的」展示鱼选择弹窗是否打开。 */
  fishChatShowcasePickOpen: boolean;
  /** 新手教程全部完成祝贺弹窗。 */
  guideTutorialCompleteOpen: boolean;
  /** 喷求偶香后：产卵与健康提示。 */
  mateLayHealthHintOpen: boolean;
  /** 鱼缸页当前子页（供引导）。 */
  selectFishSub: string | null;
  /** 鱼缸页是否已选中鱼（供引导）。 */
  selectFishHasPick: boolean;
  /** 已加好友的 UID 列表（Demo 会话态）。 */
  friendUids: string[];
  slotPicker: number | null;
  slotOverflow: SlotOverflow | null;
  showToast: (msg: string) => void;
  showComingSoon: (feature: string) => void;
  clearComingSoon: () => void;
  askConfirm: (req: ConfirmRequest) => void;
  clearConfirm: () => void;
  openMonthlyGold: () => void;
  closeMonthlyGold: () => void;
  setHubPanel: (panel: UiStore["hubPanel"]) => void;
  cueTankFish: (uid: string, kind: "eat" | "refuse") => void;
  setFeedPanelOpen: (open: boolean) => void;
  setTankScatterFeed: (on: boolean) => void;
  setTankMateSpray: (on: boolean) => void;
  setMateScentLotUid: (uid: string | null) => void;
  toggleMatePick: (uid: string) => void;
  clearMatePick: () => void;
  setMatingSession: (v: UiStore["matingSession"]) => void;
  clearMatingSession: () => void;
  setMatePanelOpen: (open: boolean) => void;
  openFishChat: (tab?: FishChatTab) => void;
  closeFishChat: () => void;
  clearFishChatOpenTab: () => void;
  setFishChatCurrentTab: (tab: FishChatTab | null) => void;
  setFishChatComposeOpen: (open: boolean) => void;
  setFishChatShowcasePickOpen: (open: boolean) => void;
  openGuideTutorialComplete: () => void;
  closeGuideTutorialComplete: () => void;
  openMateLayHealthHint: () => void;
  closeMateLayHealthHint: () => void;
  setSelectFishGuide: (sub: string, hasPick: boolean) => void;
  clearSelectFishGuide: () => void;
  openShopTab: (tab: "tank" | "attractant" | "food") => void;
  clearShopTab: () => void;
  openAd: (job: AdJob) => void;
  closeAd: () => void;
  setDockGuide: (v: UiStore["dockGuide"]) => void;
  setStoreTab: (tab: "basket" | "cook" | "list" | "sell" | null) => void;
  openStoreTab: (tab: "basket" | "cook") => void;
  clearStoreTabPref: () => void;
  openEquipTab: (tab: string) => void;
  clearEquipTabPref: () => void;
  setMapPicked: (id: string | null) => void;
  setMeetFisheryId: (id: string | null) => void;
  clearMeetFisheryId: () => void;
  markGuideSellPrompted: () => void;
  setGuideTripPhase: (phase: GuideTripPhase) => void;
  setGuideReviewStep: (step: string | null) => void;
  openWelcome: () => void;
  closeWelcome: () => void;
  openDebug: () => void;
  closeDebug: () => void;
  markGuideIdleStaminaHinted: () => void;
  setGuideFightIntroStep: (step: number | null) => void;
  setGuideFightCountdown: (n: number | null) => void;
  setShopCurrentTab: (tab: string | null) => void;
  setMarketCurrentTab: (tab: string | null) => void;
  setEquipCurrentTab: (tab: string | null) => void;
  setStackReturn: (scene: SceneId | null) => void;
  openAquariumShopFromPanel: (panel: "mate" | "feed") => void;
  clearAquariumPanelResume: () => void;
  setEncycReturn: (scene: SceneId | null) => void;
  openPlayerProfile: (uid: string, returnScene?: SceneId | null) => void;
  clearViewProfile: () => void;
  addFriend: (uid: string) => boolean;
  isFriend: (uid: string) => boolean;
  openFishChatThread: (threadId: string) => void;
  clearFishChatOpenThread: () => void;
  openSlotPicker: (slotIndex: number) => void;
  closeSlotPicker: () => void;
  setSlotOverflow: (v: SlotOverflow | null) => void;
  resetGuideHints: () => void;
}

let toastTimer = 0;

export const useUi = create<UiStore>((set, get) => ({
  toast: null,
  comingSoon: null,
  confirm: null,
  monthlyGoldOpen: false,
  tankCue: null,
  feedPanelOpen: false,
  tankScatterFeed: false,
  tankMateSpray: false,
  mateScentLotUid: null,
  matePick: [],
  matingSession: null,
  matePanelOpen: false,
  fishChatOpen: false,
  hubPanel: "none",
  shopTab: null,
  adJob: null,
  dockGuide: null,
  storeTab: null,
  storeTabPref: null,
  equipTabPref: null,
  mapPicked: null,
  meetFisheryId: null,
  guideSellPrompted: false,
  guideTripPhase: 0,
  guideReviewStep: null,
  welcomeOpen: false,
  debugOpen: false,
  guideIdleStaminaHinted: false,
  guideFightIntroStep: null,
  guideFightCountdown: null,
  shopCurrentTab: null,
  marketCurrentTab: null,
  equipCurrentTab: null,
  stackReturn: null,
  aquariumPanelResume: null,
  encycReturn: null,
  viewProfileUid: null,
  profileReturnScene: null,
  fishChatOpenThread: null,
  fishChatOpenTab: null,
  fishChatCurrentTab: null,
  fishChatComposeOpen: false,
  fishChatShowcasePickOpen: false,
  guideTutorialCompleteOpen: false,
  mateLayHealthHintOpen: false,
  selectFishSub: null,
  selectFishHasPick: false,
  friendUids: [...INITIAL_FRIEND_UIDS],
  slotPicker: null,
  slotOverflow: null,
  showToast: (msg) => {
    set({ toast: msg });
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => set({ toast: null }), 2200);
  },
  showComingSoon: (feature) => set({ comingSoon: feature }),
  clearComingSoon: () => set({ comingSoon: null }),
  askConfirm: (req) => set({ confirm: req }),
  clearConfirm: () => set({ confirm: null }),
  openMonthlyGold: () => set({ monthlyGoldOpen: true }),
  closeMonthlyGold: () => set({ monthlyGoldOpen: false }),
  cueTankFish: (uid, kind) =>
    set((s) => ({ tankCue: { uid, kind, n: (s.tankCue?.n ?? 0) + 1 } })),
  setFeedPanelOpen: (open) => set({ feedPanelOpen: open }),
  setTankScatterFeed: (on) => set({ tankScatterFeed: on, ...(on ? { tankMateSpray: false } : {}) }),
  setTankMateSpray: (on) =>
    set({
      tankMateSpray: on,
      ...(on ? { tankScatterFeed: false, feedPanelOpen: false } : { matePick: [] }),
    }),
  setMateScentLotUid: (uid) => set({ mateScentLotUid: uid }),
  toggleMatePick: (uid) =>
    set((s) => {
      const cur = s.matePick;
      if (cur.includes(uid)) return { matePick: cur.filter((x) => x !== uid) };
      if (cur.length >= 2) return { matePick: [cur[1], uid] };
      return { matePick: [...cur, uid] };
    }),
  clearMatePick: () => set({ matePick: [] }),
  setMatingSession: (v) => set({ matingSession: v }),
  clearMatingSession: () => set({ matingSession: null }),
  setMatePanelOpen: (open) => set({ matePanelOpen: open }),
  openFishChat: (tab) =>
    set({
      fishChatOpen: true,
      fishChatOpenTab: tab ?? "msg",
      fishChatCurrentTab: tab ?? "msg",
      fishChatComposeOpen: false,
      fishChatShowcasePickOpen: false,
    }),
  closeFishChat: () =>
    set({
      fishChatOpen: false,
      fishChatOpenTab: null,
      fishChatCurrentTab: null,
      fishChatComposeOpen: false,
      fishChatShowcasePickOpen: false,
    }),
  clearFishChatOpenTab: () => set({ fishChatOpenTab: null }),
  setFishChatCurrentTab: (tab) => set({ fishChatCurrentTab: tab }),
  setFishChatComposeOpen: (open) => set({ fishChatComposeOpen: open }),
  setFishChatShowcasePickOpen: (open) => set({ fishChatShowcasePickOpen: open }),
  openGuideTutorialComplete: () => set({ guideTutorialCompleteOpen: true }),
  closeGuideTutorialComplete: () => set({ guideTutorialCompleteOpen: false }),
  openMateLayHealthHint: () => set({ mateLayHealthHintOpen: true }),
  closeMateLayHealthHint: () => set({ mateLayHealthHintOpen: false }),
  setSelectFishGuide: (sub, hasPick) => set({ selectFishSub: sub, selectFishHasPick: hasPick }),
  clearSelectFishGuide: () => set({ selectFishSub: null, selectFishHasPick: false }),
  setHubPanel: (panel) => set({ hubPanel: panel }),
  openShopTab: (tab) => set({ shopTab: tab }),
  clearShopTab: () => set({ shopTab: null }),
  openAd: (job) => set({ adJob: job }),
  closeAd: () => set({ adJob: null }),
  setDockGuide: (v) => set({ dockGuide: v }),
  setStoreTab: (tab) => set({ storeTab: tab }),
  openStoreTab: (tab) => set({ storeTabPref: tab }),
  clearStoreTabPref: () => set({ storeTabPref: null }),
  openEquipTab: (tab) => set({ equipTabPref: tab }),
  clearEquipTabPref: () => set({ equipTabPref: null }),
  setMapPicked: (id) => set({ mapPicked: id }),
  setMeetFisheryId: (id) => set({ meetFisheryId: id }),
  clearMeetFisheryId: () => set({ meetFisheryId: null }),
  markGuideSellPrompted: () => set({ guideSellPrompted: true }),
  setGuideTripPhase: (phase) => set({ guideTripPhase: phase }),
  setGuideReviewStep: (step) => set({ guideReviewStep: step }),
  openWelcome: () => set({ welcomeOpen: true }),
  closeWelcome: () => set({ welcomeOpen: false }),
  openDebug: () => set({ debugOpen: true }),
  closeDebug: () => set({ debugOpen: false }),
  markGuideIdleStaminaHinted: () => set({ guideIdleStaminaHinted: true }),
  setGuideFightIntroStep: (step) => set({ guideFightIntroStep: step }),
  setGuideFightCountdown: (n) => set({ guideFightCountdown: n }),
  setShopCurrentTab: (tab) => set({ shopCurrentTab: tab }),
  setMarketCurrentTab: (tab) => set({ marketCurrentTab: tab }),
  setEquipCurrentTab: (tab) => set({ equipCurrentTab: tab }),
  setStackReturn: (scene) => set({ stackReturn: scene }),
  openAquariumShopFromPanel: (panel) => set({ aquariumPanelResume: panel }),
  clearAquariumPanelResume: () => set({ aquariumPanelResume: null }),
  setEncycReturn: (scene) => set({ encycReturn: scene }),
  openPlayerProfile: (uid, returnScene) =>
    set({
      viewProfileUid: normalizePlayerUid(uid),
      profileReturnScene: returnScene ?? null,
      fishChatOpen: false,
    }),
  clearViewProfile: () => set({ viewProfileUid: null, profileReturnScene: null }),
  addFriend: (uid) => {
    const key = normalizePlayerUid(uid);
    if (!key) return false;
    const cur = get().friendUids;
    if (cur.includes(key)) return false;
    set({ friendUids: [...cur, key] });
    return true;
  },
  isFriend: (uid) => {
    const key = normalizePlayerUid(uid);
    return get().friendUids.includes(key);
  },
  openFishChatThread: (threadId) => set({ fishChatOpen: true, fishChatOpenThread: threadId }),
  clearFishChatOpenThread: () => set({ fishChatOpenThread: null }),
  openSlotPicker: (slotIndex) => set({ slotPicker: slotIndex }),
  closeSlotPicker: () => set({ slotPicker: null }),
  setSlotOverflow: (v) => set({ slotOverflow: v }),
  resetGuideHints: () =>
    set({
      guideSellPrompted: false,
      mapPicked: null,
      meetFisheryId: null,
      guideReviewStep: null,
      guideTripPhase: 0,
      guideIdleStaminaHinted: false,
      guideFightIntroStep: null,
      guideFightCountdown: null,
    }),
}));

export function askConfirm(req: ConfirmRequest) {
  useUi.getState().askConfirm(req);
}
