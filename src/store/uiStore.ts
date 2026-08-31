import { create } from "zustand";
import type { SlotOverflow } from "../game/slotAssign";

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

interface UiStore {
  toast: string | null;
  comingSoon: string | null;
  confirm: ConfirmRequest | null;
  /** 回到水族馆后要打开的侧栏（钓获进鱼筐，不自动打开入缸）。 */
  hubPanel: "none" | "basket" | "host";
  tankCue: { uid: string; kind: "eat" | "refuse"; n: number } | null;
  feedPickOpen: boolean;
  shopTab: "tank" | "attractant" | "food" | null;
  adJob: AdJob | null;
  monthlyGoldOpen: boolean;
  dockGuide: { phase: string; caught: boolean; catchPopupOpen?: boolean; leaveGuideAfterCatch?: boolean } | null;
  storeTab: "basket" | "cook" | "tank" | null;
  /** 进入鱼筐页时要打开的子页（用完即清）。 */
  storeTabPref: "basket" | "cook" | "tank" | null;
  mapPicked: string | null;
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
  /** 商城当前 tab（供引导判断是否在鱼粮页）。 */
  shopCurrentTab: string | null;
  /** 鱼行当前 tab（供引导判断是否在购买页）。 */
  marketCurrentTab: string | null;
  /** 装备页当前 tab（供引导判断是否在能量页）。 */
  equipCurrentTab: string | null;
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
  setFeedPickOpen: (open: boolean) => void;
  openShopTab: (tab: "tank" | "attractant" | "food") => void;
  clearShopTab: () => void;
  openAd: (job: AdJob) => void;
  closeAd: () => void;
  setDockGuide: (v: UiStore["dockGuide"]) => void;
  setStoreTab: (tab: "basket" | "cook" | "tank" | null) => void;
  openStoreTab: (tab: "basket" | "cook" | "tank") => void;
  clearStoreTabPref: () => void;
  setMapPicked: (id: string | null) => void;
  markGuideSellPrompted: () => void;
  setGuideTripPhase: (phase: GuideTripPhase) => void;
  setGuideReviewStep: (step: string | null) => void;
  openWelcome: () => void;
  closeWelcome: () => void;
  openDebug: () => void;
  closeDebug: () => void;
  markGuideIdleStaminaHinted: () => void;
  setShopCurrentTab: (tab: string | null) => void;
  setMarketCurrentTab: (tab: string | null) => void;
  setEquipCurrentTab: (tab: string | null) => void;
  openSlotPicker: (slotIndex: number) => void;
  closeSlotPicker: () => void;
  setSlotOverflow: (v: SlotOverflow | null) => void;
  resetGuideHints: () => void;
}

let toastTimer = 0;

export const useUi = create<UiStore>((set) => ({
  toast: null,
  comingSoon: null,
  confirm: null,
  monthlyGoldOpen: false,
  tankCue: null,
  feedPickOpen: false,
  hubPanel: "none",
  shopTab: null,
  adJob: null,
  dockGuide: null,
  storeTab: null,
  storeTabPref: null,
  mapPicked: null,
  guideSellPrompted: false,
  guideTripPhase: 0,
  guideReviewStep: null,
  welcomeOpen: false,
  debugOpen: false,
  guideIdleStaminaHinted: false,
  shopCurrentTab: null,
  marketCurrentTab: null,
  equipCurrentTab: null,
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
  setFeedPickOpen: (open) => set({ feedPickOpen: open }),
  setHubPanel: (panel) => set({ hubPanel: panel }),
  openShopTab: (tab) => set({ shopTab: tab }),
  clearShopTab: () => set({ shopTab: null }),
  openAd: (job) => set({ adJob: job }),
  closeAd: () => set({ adJob: null }),
  setDockGuide: (v) => set({ dockGuide: v }),
  setStoreTab: (tab) => set({ storeTab: tab }),
  openStoreTab: (tab) => set({ storeTabPref: tab }),
  clearStoreTabPref: () => set({ storeTabPref: null }),
  setMapPicked: (id) => set({ mapPicked: id }),
  markGuideSellPrompted: () => set({ guideSellPrompted: true }),
  setGuideTripPhase: (phase) => set({ guideTripPhase: phase }),
  setGuideReviewStep: (step) => set({ guideReviewStep: step }),
  openWelcome: () => set({ welcomeOpen: true }),
  closeWelcome: () => set({ welcomeOpen: false }),
  openDebug: () => set({ debugOpen: true }),
  closeDebug: () => set({ debugOpen: false }),
  markGuideIdleStaminaHinted: () => set({ guideIdleStaminaHinted: true }),
  setShopCurrentTab: (tab) => set({ shopCurrentTab: tab }),
  setMarketCurrentTab: (tab) => set({ marketCurrentTab: tab }),
  setEquipCurrentTab: (tab) => set({ equipCurrentTab: tab }),
  openSlotPicker: (slotIndex) => set({ slotPicker: slotIndex }),
  closeSlotPicker: () => set({ slotPicker: null }),
  setSlotOverflow: (v) => set({ slotOverflow: v }),
  resetGuideHints: () =>
    set({
      guideSellPrompted: false,
      mapPicked: null,
      guideReviewStep: null,
      guideTripPhase: 0,
      guideIdleStaminaHinted: false,
    }),
}));

export function askConfirm(req: ConfirmRequest) {
  useUi.getState().askConfirm(req);
}
