import { create } from "zustand";

export type AdJob = { kind: "expand" } | { kind: "egg"; uid: string };

interface UiStore {
  toast: string | null;
  comingSoon: string | null;
  /** 回到水族馆后要打开的侧栏（钓获进鱼筐，不自动打开入缸）。 */
  hubPanel: "none" | "basket" | "host";
  adJob: AdJob | null;
  showToast: (msg: string) => void;
  showComingSoon: (feature: string) => void;
  clearComingSoon: () => void;
  setHubPanel: (panel: UiStore["hubPanel"]) => void;
  openAd: (job: AdJob) => void;
  closeAd: () => void;
}

let toastTimer = 0;

export const useUi = create<UiStore>((set) => ({
  toast: null,
  comingSoon: null,
  hubPanel: "none",
  adJob: null,
  showToast: (msg) => {
    set({ toast: msg });
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => set({ toast: null }), 2200);
  },
  showComingSoon: (feature) => set({ comingSoon: feature }),
  clearComingSoon: () => set({ comingSoon: null }),
  setHubPanel: (panel) => set({ hubPanel: panel }),
  openAd: (job) => set({ adJob: job }),
  closeAd: () => set({ adJob: null }),
}));
