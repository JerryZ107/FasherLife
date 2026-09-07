import type { SceneId } from "../save/saveSchema";

/**
 * 新手引导线（界面高亮 + 功能弹窗）。
 *
 * 顺序：钓鱼→存缸→存筐→卖鱼→喂食→买鲫鱼→做菜→吃菜→配偶→渔聊→图鉴→圣殿
 *
 * 规则摘要：
 * - effectiveQuest = 重温步 reviewStep ?? 真实 questStep
 * - 子步标志（guideShopDone 等）只在对应动作完成时写入存档
 * - 误闯无关页面时不显示「回馆」类引导（见各 *QuestBeat 末尾 return null）
 * - 喂食/配偶面板打开时不显示遮罩（避免挡操作）
 * - 渔聊/图鉴首次点击不再弹 FeatureIntroSheet；配偶直接进面板
 */
const QUEST_ORDER = [
  "q_go_fish",
  "q_catch",
  "q_tank",
  "q_basket",
  "q_sell",
  "q_feed",
  "q_buy_carp",
  "q_cook",
  "q_eat",
  "q_mate",
  "q_fishchat",
  "q_read_encyc",
  "q_visit_temple",
  "q_done",
] as const;

function questIndex(id: string): number {
  const i = QUEST_ORDER.indexOf(id as (typeof QUEST_ORDER)[number]);
  return i >= 0 ? i : 0;
}

export { questIndex };

const QUEST_SET = new Set<string>(QUEST_ORDER);

/** 旧引导线跳过配偶/渔聊/图鉴时，把任务步拉回到第一个未完成环节。 */
export function migrateGuideQuestLine(save: {
  questStep: string;
  eggs: { customName?: string | null }[];
  fishFeedPosts?: unknown[];
  guideEncycDone?: boolean;
  guideMateSprayDone?: boolean;
  guideFishchatPostDone?: boolean;
  guideFishchatShowcaseDone?: boolean;
}): void {
  const idx = questIndex(save.questStep);
  const mateIdx = questIndex("q_mate");
  if (idx < mateIdx) return;

  const eggNamed = save.eggs.some((e) => Boolean(e.customName?.trim()));
  const mateDone = Boolean(save.guideMateSprayDone) && eggNamed;
  const fishchatDone =
    (Boolean(save.guideFishchatPostDone) && Boolean(save.guideFishchatShowcaseDone)) ||
    (save.fishFeedPosts ?? []).length > 0;

  if (!mateDone) {
    save.questStep = "q_mate";
    return;
  }
  if (!fishchatDone) {
    if (idx >= questIndex("q_fishchat")) save.questStep = "q_fishchat";
    return;
  }
  if (!save.guideEncycDone && idx >= questIndex("q_read_encyc")) {
    save.questStep = "q_read_encyc";
  }
}

export function isGuideQuestStep(step: string): boolean {
  return QUEST_SET.has(step);
}

/** 渔聊引导线是否激活（含任务页重温）。 */
export function isFishchatGuideActive(
  save: { questStep: string; started: boolean; guideSkipped: boolean },
  reviewStep?: string | null,
): boolean {
  if (!save.started) return false;
  if (reviewStep === "q_fishchat") return true;
  if (save.guideSkipped) return false;
  return save.questStep === "q_fishchat";
}

/** 钓鱼行程相位：0空闲 1馆→地图 2地图→钓点 3钓点→地图 4地图→馆 5鱼筐→馆。 */
export type GuideTripPhase = 0 | 1 | 2 | 3 | 4 | 5;

/** 相位 3/4：回程存鱼，与「进地图选渔场」互斥。 */
export function isReturnTrip(phase: GuideTripPhase | undefined): boolean {
  return phase === 3 || phase === 4;
}

/** 相位 5：回馆后待喂食。 */
export function isFeedTrip(phase: GuideTripPhase | undefined): boolean {
  return phase === 5;
}

/** 钓鱼任务线且筐里有鱼：应催回馆存缸，地图选点应锁定。 */
export function mustStoreCatchFish(g: {
  questStep: string;
  basketCount: number;
  reviewStep?: string | null;
}): boolean {
  const q = g.reviewStep ?? g.questStep;
  const fishingRoute = q === "q_go_fish" || q === "q_catch" || q === "q_tank";
  return fishingRoute && g.basketCount > 0;
}

/** 重温时跟 reviewStep；正常游玩时跟 questStep。任务推进时 applyQuest 会清掉过期的 reviewStep。 */
function effectiveQuest(g: GuideInput): string {
  return g.reviewStep ?? g.questStep;
}

export type GuideBeat = {
  id: string;
  title: string;
  body: string;
  /** 对应界面上的 data-guide。 */
  target?: string;
  /** 同时高亮多个区域。 */
  targets?: string[];
  /** 无高亮时卡片位置。有高亮则躲开目标。 */
  place?: "top" | "bottom";
  /** 有按钮高亮时才铺一层暗罩。 */
  dim?: boolean;
};

type GuideInput = {
  questStep: string;
  scene: SceneId;
  skipped: boolean;
  started: boolean;
  dockPhase: string | null;
  dockCaught: boolean;
  catchPopupOpen?: boolean;
  leaveGuideAfterCatch?: boolean;
  selectedUid: string | null;
  tankLive: number;
  basketCount: number;
  idle: boolean;
  storeTab?: "basket" | "cook" | "list" | "sell";
  feedPanelOpen?: boolean;
  tankScatterFeed?: boolean;
  matePanelOpen?: boolean;
  tankMateSpray?: boolean;
  fishChatOpen?: boolean;
  fishChatTab?: string | null;
  selectedEggUid?: string | null;
  guideMateShopDone?: boolean;
  guideMateSprayDone?: boolean;
  guideEncycDone?: boolean;
  guideFishchatPostDone?: boolean;
  guideFishchatShowcaseDone?: boolean;
  hasSelfFeedPostToday?: boolean;
  fishChatComposeOpen?: boolean;
  fishChatShowcasePickOpen?: boolean;
  hasMateScent?: boolean;
  hasMatchFood?: boolean;
  hasTodayCatchInBasket?: boolean;
  hasTodayCatchForFeed?: boolean;
  hasCrucianInBasket?: boolean;
  mapPicked?: string | null;
  guideSellPrompted?: boolean;
  guideTripPhase?: GuideTripPhase;
  guideShopDone?: boolean;
  /** 未弹过引导询问前抑制引导（等玩家在欢迎弹窗里选择）。 */
  guidePrompted?: boolean;
  /** 钓鱼成功后的挂机引导是否已完成。 */
  guideIdleDone?: boolean;
  /** 搏斗教学是否已完成。 */
  guideFightIntroDone?: boolean;
  /** 搏斗教学子步：0 拇指+玩家滑块，1 鱼滑块+进度，2 搏斗提示。 */
  guideFightIntroStep?: number | null;
  /** 搏斗教学倒计时 3→2→1。 */
  guideFightCountdown?: number | null;
  /** 挂机后「能量消耗」提示是否已看过，看过则引导退出钓点。 */
  guideIdleStaminaHinted?: boolean;
  /** 吃菜后的体力提示是否已展示。 */
  guideStaminaHinted?: boolean;
  /** 商城当前 tab。 */
  shopCurrentTab?: string | null;
  /** 鱼行当前 tab。 */
  marketCurrentTab?: string | null;
  /** 装备页当前 tab。 */
  equipCurrentTab?: string | null;
  selectFishSub?: string | null;
  selectFishHasPick?: boolean;
  reviewStep?: string | null;
};

/** 跟着新手引导线走，只提示当前该点的那一步。 */
export function currentGuide(g: GuideInput): GuideBeat | null {
  if (!g.started) return null;
  if (g.scene === "login") return null;
  // 未弹过引导询问前不显示引导（等玩家在欢迎弹窗里选择）
  if (!g.guidePrompted) return null;

  const reviewing = Boolean(g.reviewStep);
  if (g.skipped && !reviewing) return null;

  const qPeek = effectiveQuest(g);
  const fishingRoute =
    qPeek === "q_go_fish" || qPeek === "q_catch" || qPeek === "q_tank" || qPeek === "q_basket";
  /** 钓鱼任务段且筐里已有鱼：只催存缸，禁止再点钓鱼。钓获弹窗打开时先走挂机教学。 */
  const mustStoreCatch =
    fishingRoute && g.basketCount > 0 && qPeek !== "q_basket" && !g.catchPopupOpen;

  // 钓鱼成功后、离开钓点前：挂机 → 体力提示 → 退出（优先于「回馆存缸」文案）
  if (
    g.scene === "fishing" &&
    !g.guideIdleDone &&
    (qPeek === "q_tank" || (qPeek === "q_catch" && g.basketCount > 0))
  ) {
    const idle = idleGuideBeat(g);
    if (idle) return idle;
  }

  // 钓鱼段筐里已有鱼：只引导回馆存缸，绝不再进清溪/点钓鱼
  if (mustStoreCatch) {
    const beat = storageQuestBeat(g);
    if (beat) return beat;
  }

  const q = qPeek;
  if (!q || q === "q_done") {
    return null;
  }

  // 子场景做完一步后：优先高亮返回（买鱼/做菜/吃菜/存筐等）
  const returnBeat = subSceneReturnBeat(g);
  if (returnBeat) return returnBeat;

  // 吃菜后：回馆后一次性高亮体力条
  if (!g.guideStaminaHinted && q === "q_mate" && g.scene === "aquarium" && !g.matePanelOpen && !g.tankMateSpray) {
    return {
      id: "stamina-hint",
      title: "体力这样补",
      body: "体力不足时，做菜、吃菜能补充；能量饮料也行。",
      target: "top-stamina",
      place: "bottom",
      dim: true,
    };
  }

  // 喂食任务：先去商城买鱼粮
  if (q === "q_feed" && !g.guideShopDone && !g.hasMatchFood) {
    const shop = shopPreludeBeat(g);
    if (shop) return shop;
  }

  if (q === "q_go_fish" || q === "q_catch") {
    if (g.basketCount > 0) {
      const beat = storageQuestBeat(g);
      if (beat) return beat;
      return null;
    }
    if (!mustStoreCatch) {
      const fish = fishingQuestBeat(g);
      if (fish) return fish;
    }
  }

  if (q === "q_tank" || q === "q_basket") {
    const beat = storageQuestBeat(g);
    if (beat) return beat;
  }

  if (q === "q_sell") {
    const beat = sellQuestBeat(g);
    if (beat) return beat;
  }

  if (q === "q_feed") {
    const beat = feedQuestBeat(g);
    if (beat) return beat;
  }

  if (q === "q_buy_carp") {
    const beat = buyCarpQuestBeat(g);
    if (beat) return beat;
  }

  if (q === "q_cook") {
    const beat = cookQuestBeat(g);
    if (beat) return beat;
  }

  if (q === "q_eat") {
    const beat = eatQuestBeat(g);
    if (beat) return beat;
  }

  if (q === "q_mate") {
    const beat = mateQuestBeat(g);
    if (beat) return beat;
  }

  if (q === "q_fishchat") {
    const beat = fishchatQuestBeat(g);
    if (beat) return beat;
  }

  if (q === "q_read_encyc") {
    const beat = encycQuestBeat(g);
    if (beat) return beat;
  }

  if (q === "q_visit_temple") {
    const beat = templeVisitQuestBeat(g);
    if (beat) return beat;
  }

  return null;
}

/** 子场景完成一步后：高亮返回水族馆。 */
function subSceneReturnBeat(g: GuideInput): GuideBeat | null {
  const q = effectiveQuest(g);
  if (g.scene === "shop" && q === "q_feed" && (g.guideShopDone || g.hasMatchFood)) {
    return {
      id: "feed-leave-shop",
      title: "回水族馆喂鱼",
      body: "买好了，点返回回馆，点右边「喂食」。",
      target: "back-aquarium",
      place: "bottom",
      dim: true,
    };
  }
  if (g.scene === "market" && (q === "q_cook" || (q === "q_buy_carp" && g.hasCrucianInBasket))) {
    return {
      id: "buy-done-leave",
      title: "回水族馆",
      body: "鲫鱼买好了，点返回回馆去做菜。",
      target: "back-aquarium",
      place: "bottom",
      dim: true,
    };
  }
  if ((g.scene === "market" || g.scene === "store_tank") && q === "q_feed") {
    return {
      id: "sell-done-leave",
      title: "回水族馆喂鱼",
      body: "卖好了，点返回回馆，点右边「喂食」。",
      target: "back-aquarium",
      place: "bottom",
      dim: true,
    };
  }
  if (g.scene === "select_fish" && q === "q_sell") {
    return {
      id: "basket-done-leave",
      title: "回水族馆",
      body: "鱼存好了，点返回回馆。",
      target: "back-aquarium",
      place: "bottom",
      dim: true,
    };
  }
  if (g.scene === "store_tank" && q === "q_eat") {
    return {
      id: "cook-done-leave",
      title: "回水族馆",
      body: "菜做好了，点返回回馆去背包吃。",
      target: "back-aquarium",
      place: "bottom",
      dim: true,
    };
  }
  // 存缸任务完成（已进入 q_basket）或筐已空：优先高亮返回
  if (
    g.scene === "store_tank" &&
    (q === "q_tank" || q === "q_basket") &&
    (q === "q_basket" || g.basketCount === 0)
  ) {
    return {
      id: "tank-stored-leave",
      title: "回水族馆",
      body: "鱼存好了，点返回回馆，再点「鱼缸」。",
      target: "back-aquarium",
      place: "bottom",
      dim: true,
    };
  }
  if (g.scene === "equipment" && q === "q_mate") {
    return {
      id: "eat-done-leave",
      title: "回水族馆",
      body: "吃好了，点返回回馆。",
      target: "back-aquarium",
      place: "bottom",
      dim: true,
    };
  }
  return null;
}

/** 存缸 → 存筐：固定顺序，按场景一步步高亮。 */
function storageQuestBeat(g: GuideInput): GuideBeat | null {
  if (g.scene === "fishing") {
    return {
      id: "tank-leave-dock",
      title: "先回馆里",
      body: "鱼在筐里了，点左上角返回去存缸。",
      target: "fishing-back",
      dim: true,
    };
  }
  if (g.scene === "fishing_map") {
    return {
      id: "tank-leave-map",
      title: "回水族馆",
      body: "点「水族馆」，再点「鱼筐」存进缸。",
      target: "back-aquarium",
      dim: true,
    };
  }
  // 1. 馆里筐有鱼 → 鱼筐
  if (g.scene === "aquarium" && g.basketCount > 0) {
    return {
      id: "open-basket",
      title: "打开鱼筐",
      body: "点「鱼筐」，选鱼存进缸。",
      target: "open-basket",
      dim: true,
    };
  }
  // 2. 鱼筐页：存缸 tab → 选鱼存缸；存缸任务完成后 → 返回
  if (g.scene === "store_tank") {
    const q = effectiveQuest(g);
    if (q === "q_basket" || g.basketCount === 0) {
      return {
        id: "tank-stored-leave",
        title: "回水族馆",
        body: "鱼存好了，点返回回馆，再点「鱼缸」。",
        target: "back-aquarium",
        place: "bottom",
        dim: true,
      };
    }
    if (g.storeTab && g.storeTab !== "basket") {
      return {
        id: "store-tab-basket",
        title: "存进缸",
        body: "先切到「存缸」页签。",
        target: "tab-store",
        place: "bottom",
        dim: true,
      };
    }
    return {
      id: "store-to-tank",
      title: "存进缸",
      body: "选一条鱼、选一口缸，点「存缸」。",
      target: "store-to-tank",
      place: "bottom",
      dim: false,
    };
  }
  // 3. 馆里筐空、缸有鱼 → 鱼缸
  if (g.scene === "aquarium" && g.basketCount === 0 && g.tankLive > 0) {
    return {
      id: "open-tank-select",
      title: "打开鱼缸",
      body: "点「鱼缸」，选鱼后点「存筐」。",
      target: "go-select-fish",
      dim: true,
    };
  }
  // 4. 鱼缸页 → 存筐 tab → 选鱼 → 确认
  if (g.scene === "select_fish") {
    return selectFishBasketBeat(g, "basket", "存回鱼筐");
  }
  if (g.scene === "aquarium" && g.tankLive <= 0) {
    return {
      id: "basket-need-fish",
      title: "缸里要有鱼",
      body: "先去钓鱼，把鱼存进缸再来。",
      target: "go-fish",
      dim: true,
    };
  }
  return null;
}

function selectFishBasketBeat(
  g: GuideInput,
  idPrefix: string,
  title: string,
): GuideBeat | null {
  if (g.scene !== "select_fish") return null;
  const sub = g.selectFishSub ?? "feed";
  if (sub !== "basket") {
    return {
      id: `${idPrefix}-tab`,
      title,
      body: "切到「存筐」，选鱼后点「存筐」。",
      target: "tab-basket",
      place: "bottom",
      dim: true,
    };
  }
  if (!g.selectFishHasPick) {
    return {
      id: `${idPrefix}-pick`,
      title,
      body: "点选要存进鱼筐的鱼。",
      target: "pick-tank-fish",
      place: "bottom",
    };
  }
  return {
    id: `${idPrefix}-store`,
    title,
    body: "点下面「存筐」确认。",
    target: "store-to-basket",
    place: "bottom",
    dim: true,
  };
}

/** 卖鱼任务线。 */
function sellQuestBeat(g: GuideInput): GuideBeat | null {
  const needCatch = g.basketCount === 0 && g.tankLive === 0;
  if (needCatch) {
    if (g.scene === "aquarium") {
      return {
        id: "sell-need-buy",
        title: "先有条鱼",
        body: "点「鱼行」买一条，或自己去钓一条再来卖。",
        target: "go-market",
        dim: true,
      };
    }
    if (g.scene === "market") {
      return {
        id: "sell-need-buy-tab",
        title: "先买一条",
        body: "切到「购买」买一条鱼进筐，再回来卖。",
        target: "market-tab-buy",
        dim: true,
      };
    }
    if (g.scene !== "fishing" && g.scene !== "fishing_map") {
      return null;
    }
    const fish = fishingQuestBeat(g);
    if (fish && fish.id !== "go-fish") return fish;
  }

  if (g.scene === "aquarium") {
    if (g.basketCount > 0) {
      return {
        id: "go-market",
        title: "去鱼行",
        body: "点「鱼行」。",
        target: "go-market",
        dim: true,
      };
    }
    if (g.tankLive > 0) {
      return {
        id: "sell-prep-basket",
        title: "先存筐",
        body: "点「鱼缸」，选鱼后点「存筐」。",
        target: "go-select-fish",
        dim: true,
      };
    }
  }

  if (g.scene === "select_fish" && g.basketCount === 0 && g.tankLive > 0) {
    return selectFishBasketBeat(g, "sell-prep", "先存筐");
  }

  if (g.scene === "store_tank") {
    return null;
  }

  if (g.scene === "market") {
    if (g.basketCount === 0) {
      return {
        id: "sell-no-basket",
        title: "筐里没有鱼",
        body: g.tankLive > 0 ? "先把缸里的鱼存回筐。" : "切到「购买」买一条，或回馆再准备。",
        target: g.tankLive > 0 ? undefined : "market-tab-buy",
        place: g.tankLive > 0 ? "bottom" : undefined,
        dim: g.tankLive <= 0,
      };
    }
    if (g.guideSellPrompted) {
      return {
        id: "sell-after-prompt",
        title: "卖给鱼行",
        body: "点「销售」并确认即可；取消也没关系，稍后再卖也行。",
        place: "bottom",
        dim: false,
      };
    }
    return {
      id: "sell-fish",
      title: "卖给鱼行",
      body: "在「销售」里选一条，点「销售」。",
      target: "sell-fish",
      dim: true,
    };
  }
  return null;
}

/** 喂食：右侧「喂食」→ 选粮 → 抛洒。 */
function feedQuestBeat(g: GuideInput): GuideBeat | null {
  if (g.scene === "shop") {
    return {
      id: "feed-leave-shop",
      title: "购买鱼粮喂鱼",
      body: "买好了，返回水族馆去喂鱼。",
      target: "back-aquarium",
      dim: true,
    };
  }
  if (g.scene === "aquarium" && g.feedPanelOpen) {
    if (g.tankScatterFeed) {
      return {
        id: "feed-scatter",
        title: "抛洒喂食",
        body: "点缸里空白处抛洒鱼粮，鱼会游过来吃。",
        place: "bottom",
      };
    }
    return {
      id: "feed-pick-food",
      title: "选鱼粮",
      body: "确认鱼粮后点「去水族馆喂食」，进缸空白处抛洒。",
      target: "feed-aquarium-go",
      place: "bottom",
      dim: true,
    };
  }
  if (g.feedPanelOpen) return null;
  if (g.tankScatterFeed && g.scene === "aquarium") {
    return {
      id: "feed-scatter",
      title: "抛洒喂食",
      body: "点缸里空白处抛洒鱼粮，鱼会游过来吃。",
      place: "bottom",
    };
  }
  if (g.scene === "aquarium") {
    return {
      id: "feed-btn",
      title: "喂鱼",
      body: "点右边「喂食」，选鱼粮后进缸抛洒。",
      target: "feed-btn",
      place: "bottom",
      dim: true,
    };
  }
  return null;
}

/** 配偶：买香 → 喷香 → 起名鱼卵。 */
function mateQuestBeat(g: GuideInput): GuideBeat | null {
  if (g.matePanelOpen && !g.guideMateSprayDone) {
    return {
      id: "mate-go-aquarium",
      title: "去缸里喷香",
      body: "点「去水族馆用香」，回缸里给鱼喷求偶香。",
      target: "mate-aquarium",
      place: "bottom",
      dim: true,
    };
  }
  const scentReady = g.guideMateShopDone || g.hasMateScent;
  if (!scentReady) {
    if (g.scene === "aquarium") {
      return {
        id: "mate-go-shop",
        title: "买求偶香",
        body: "点「商城」，买一份求偶香。",
        target: "go-shop",
        dim: true,
      };
    }
    if (g.scene === "shop") {
      if (g.shopCurrentTab !== "attractant") {
        return {
          id: "mate-shop-tab",
          title: "买求偶香",
          body: "点「求偶香」。",
          target: "shop-attractant",
          dim: true,
        };
      }
      return {
        id: "mate-buy-scent",
        title: "买求偶香",
        body: "买一份青荇香，买完返回水族馆。",
        target: "shop-scent-list",
        place: "bottom",
        dim: true,
      };
    }
    return null;
  }

  if (!g.guideMateSprayDone) {
    if (g.scene === "shop") {
      return {
        id: "mate-leave-shop",
        title: "回水族馆",
        body: "买好了，回馆点右边「配偶」喷香。",
        target: "back-aquarium",
        dim: true,
      };
    }
    if (g.tankMateSpray && g.scene === "aquarium") {
      return {
        id: "mate-spray-shy",
        title: "给鱼喷香",
        body: "点缸里一公一母两条能交配的鱼；选满两条会自动喷香，害羞气泡标出可配对的对象。",
        place: "bottom",
      };
    }
    if (g.scene === "aquarium") {
      return {
        id: "mate-open-panel",
        title: "配偶喷香",
        body: "点右边「配偶」，选好求偶香后进缸喷香。",
        target: "mate-btn",
        dim: true,
      };
    }
    return null;
  }

  if (g.scene === "aquarium") {
    if (!g.selectedEggUid) {
      return {
        id: "mate-pick-egg",
        title: "给鱼卵起名",
        body: "点缸里的鱼卵，再点「起名」。",
        place: "bottom",
      };
    }
    return {
      id: "mate-name-egg",
      title: "给鱼卵起名",
      body: "点「起名」，给这枚卵取个名字。",
      target: "egg-name",
      dim: true,
    };
  }
  return null;
}

/** 渔聊：发动态 → 我的 → 展示鱼 → 收起。 */
function fishchatQuestBeat(g: GuideInput): GuideBeat | null {
  if (!g.fishChatOpen) {
    if (g.scene === "aquarium") {
      return {
        id: "fishchat-open",
        title: "打开渔聊",
        body: "点上面「渔聊」，先进消息页，再切到动态发动态。",
        target: "open-fishchat",
        dim: true,
      };
    }
    return null;
  }

  const postDone = Boolean(g.guideFishchatPostDone) || Boolean(g.hasSelfFeedPostToday);
  const showcaseDone = Boolean(g.guideFishchatShowcaseDone);

  if (!postDone) {
    if (g.fishChatTab !== "feed") {
      return {
        id: "fishchat-tab-feed",
        title: "切到动态",
        body: "点下面「动态」。",
        target: "fishchat-tab-feed",
        dim: true,
      };
    }
    if (g.fishChatComposeOpen) {
      return {
        id: "fishchat-send",
        title: "发布动态",
        body: "选今天钓到的鱼，点「发送」发布。",
        target: "fishchat-send",
        dim: true,
      };
    }
    if (!g.hasTodayCatchForFeed && !g.hasTodayCatchInBasket) {
      if (g.fishChatOpen) {
        return {
          id: "fishchat-need-catch",
          title: "还没有今日渔获",
          body: "今天钓一条鱼后，再点右上角鱼图标发动态。",
          target: "fishchat-post",
          dim: true,
        };
      }
      if (g.scene === "aquarium") {
        return {
          id: "fishchat-need-catch",
          title: "先钓一条",
          body: "今天钓一条放进鱼筐，再来渔聊发动态晒渔获。",
          target: "go-fish",
          dim: true,
        };
      }
      return null;
    }
    return {
      id: "fishchat-post",
      title: "发布动态",
      body: "点右上角鱼图标，发布今日渔获。",
      target: "fishchat-post",
      dim: true,
    };
  }

  if (!showcaseDone) {
    if (g.fishChatTab !== "mine") {
      return {
        id: "fishchat-tab-mine",
        title: "切到我的",
        body: "点下面「我的」，设置展示鱼。",
        target: "fishchat-tab-mine",
        dim: true,
      };
    }
    if (g.fishChatShowcasePickOpen) return null;
    return {
      id: "fishchat-showcase-pick",
      title: "展示鱼",
      body: "点「选择」，挑几条鱼展示在主页。",
      target: "fishchat-showcase-pick",
      place: "bottom",
      dim: true,
    };
  }

  return {
    id: "fishchat-close",
    title: "收起渔聊",
    body: "点「收起」退出渔聊。",
    target: "fishchat-close",
    dim: true,
  };
}

/** 开局：引导去商城买鱼粮喂鱼。 */
function shopPreludeBeat(g: GuideInput): GuideBeat | null {
  if (g.scene === "aquarium") {
    return {
      id: "go-shop",
      title: "购买鱼粮喂鱼",
      body: "点「商城」，买点鱼粮再喂鱼。",
      target: "go-shop",
      dim: true,
    };
  }
  if (g.scene === "shop") {
    if (g.shopCurrentTab !== "food") {
      return {
        id: "shop-pick-food",
        title: "购买鱼粮喂鱼",
        body: "点「鱼粮」。",
        target: "shop-food",
        dim: true,
      };
    }
    return {
      id: "shop-buy-food",
      title: "购买鱼粮喂鱼",
      body: "选一份买下，买完返回水族馆去喂鱼。",
      target: "shop-food-list",
      place: "bottom",
      dim: true,
    };
  }
  return null;
}

/** 钓鱼成功后：挂机 → 挂机体力提示 → 退出钓点。 */
function idleGuideBeat(g: GuideInput): GuideBeat | null {
  if (g.scene !== "fishing") return null;
  if (g.catchPopupOpen) {
    return {
      id: "caught-card",
      title: "钓到了",
      body: "看看这条鱼，点卡片关闭后再试试挂机。",
      target: "catch-card",
      place: "bottom",
      dim: true,
    };
  }
  if (!g.idle) {
    return {
      id: "dock-idle",
      title: "试试挂机",
      body: "点「挂机」能自动钓鱼，不用手动操作。",
      target: "dock-idle",
      dim: true,
    };
  }
  if (!g.guideIdleStaminaHinted) {
    return {
      id: "dock-idle-stamina",
      title: "挂机耗体力",
      body: "挂机时钓鱼会消耗体力。留意顶部体力条，点「下一步」继续。",
      target: "top-stamina",
      place: "bottom",
      dim: true,
    };
  }
  return {
    id: "caught-leave",
    title: "退出钓点",
    body: "点左上角返回，退出会取消挂机。回去把鱼存进缸。",
    target: "fishing-back",
    place: "bottom",
    dim: true,
  };
}

/** 买鲫鱼任务线：水族馆 → 鱼行 → 切购买 → 买鲫鱼。 */
function buyCarpQuestBeat(g: GuideInput): GuideBeat | null {
  if (g.scene === "aquarium") {
    return {
      id: "go-market-carp",
      title: "去鱼行",
      body: "点「鱼行」，买条鲫鱼回来做菜。",
      target: "go-market",
      dim: true,
    };
  }
  if (g.scene === "market") {
    if (g.marketCurrentTab !== "buy") {
      return {
        id: "market-pick-buy",
        title: "切到购买",
        body: "点「购买」。",
        target: "market-tab-buy",
        dim: true,
      };
    }
    return {
      id: "buy-crucian",
      title: "买鲫鱼",
      body: "买一条鲫鱼（最便宜的就行），进了鱼筐。",
      target: "buy-crucian",
      place: "bottom",
      dim: true,
    };
  }
  if (g.scene === "store_tank") {
    return null;
  }
  return null;
}

/** 做菜任务线：水族馆 → 鱼筐·做菜 → 做成菜。 */
function cookQuestBeat(g: GuideInput): GuideBeat | null {
  if (g.scene === "aquarium") {
    return {
      id: "go-cook",
      title: "去做菜",
      body: "点「鱼筐」，再切到「做菜」。",
      target: "open-basket",
      dim: true,
    };
  }
  if (g.scene === "store_tank") {
    if (g.storeTab !== "cook") {
      return {
        id: "tab-cook",
        title: "做菜",
        body: "切到「做菜」。",
        target: "tab-cook",
        dim: true,
      };
    }
    return {
      id: "cook-fish",
      title: "做成菜",
      body: "点「做成菜」，做好的菜去背包·道具吃。",
      target: "cook-fish",
      place: "bottom",
      dim: true,
    };
  }
  if (g.scene === "cook") {
    return {
      id: "cook-fish",
      title: "做成菜",
      body: "点「做成菜」，做好的菜去背包·道具吃。",
      target: "cook-fish",
      place: "bottom",
      dim: true,
    };
  }
  return null;
}

/** 吃菜任务线：水族馆 → 背包 → 切道具 → 吃。 */
function eatQuestBeat(g: GuideInput): GuideBeat | null {
  if (g.scene === "aquarium") {
    return {
      id: "go-equip-eat",
      title: "去背包",
      body: "点「背包」，去道具页吃菜补体力。",
      target: "go-equip",
      dim: true,
    };
  }
  if (g.scene === "equipment") {
    if (g.equipCurrentTab !== "energy") {
      return {
        id: "equip-pick-energy",
        title: "切到道具",
        body: "点「道具」。",
        target: "equip-tab-energy",
        dim: true,
      };
    }
    return {
      id: "eat-dish",
      title: "吃菜",
      body: "点「吃」把菜吃了，补体力。",
      target: "eat-dish",
      place: "bottom",
      dim: true,
    };
  }
  return null;
}

/** 图鉴阅读：水族馆右侧点「图鉴」→ 看完返回。 */
function encycQuestBeat(g: GuideInput): GuideBeat | null {
  if (g.scene === "aquarium") {
    return {
      id: "open-encyc",
      title: "去看图鉴",
      body: "点右边「图鉴」，看看清溪有哪些鱼。",
      target: "open-encyc",
      dim: true,
    };
  }
  if (g.scene === "encyclopedia") {
    return {
      id: "read-encyc",
      title: "翻翻图鉴",
      body: "扫一眼清溪池有哪些鱼，看完点返回。",
      target: "encyc-back",
      place: "bottom",
      dim: true,
    };
  }
  return null;
}

/** 圣殿排行参观：水族馆 → 圣殿排行 → 参观一位钓鱼佬 → 看完返回。 */
function templeVisitQuestBeat(g: GuideInput): GuideBeat | null {
  if (g.scene === "aquarium") {
    return {
      id: "go-temple",
      title: "去圣殿",
      body: "点「圣殿」，打开钓鱼佬排行，参观一位的馆。",
      target: "go-temple",
      dim: true,
    };
  }
  if (g.scene === "leaderboard") {
    return {
      id: "temple-visit",
      title: "排行参观",
      body: "在排行里点「参观」，进对方水族馆看看。",
      target: "temple-visit",
      place: "bottom",
      dim: true,
    };
  }
  if (g.scene === "visit_aquarium") {
    return {
      id: "temple-look",
      title: "参观水族馆",
      body: "随便逛逛对方的缸，看完点返回。",
      target: "back-aquarium",
      place: "bottom",
      dim: true,
    };
  }
  return null;
}

/** 钓鱼任务线：地图 → 进点 → 甩竿收竿。筐里已有鱼时绝不出现「去钓鱼」。 */
function fishingQuestBeat(g: GuideInput): GuideBeat | null {
  if (g.basketCount > 0) {
    return storageQuestBeat(g);
  }
  if (g.scene === "encyclopedia" || g.scene === "equipment") {
    return null;
  }
  if (g.scene === "aquarium") {
    return {
      id: "go-fish",
      title: "去钓鱼",
      body: "点下面「钓鱼」，去清溪池钓一条。",
      target: "go-fish",
      dim: true,
    };
  }
  if (g.scene === "fishing_map") return fishingMapBeat(g);
  if (g.scene === "fishing") return fishingCatchBeat(g);
  return null;
}

function fishingMapBeat(g: GuideInput): GuideBeat | null {
  // 筐里有鱼才催回馆；空筐回程相位不锁地图
  if (mustStoreCatchFish(g)) {
    return {
      id: "tank-leave-map",
      title: "回水族馆",
      body: "点「水族馆」，再点「鱼筐」存进缸。",
      target: "back-aquarium",
      dim: true,
    };
  }
  const picked = g.mapPicked ?? null;
  if (picked === "clear_stream") {
    return {
      id: "enter-stream",
      title: "进清溪池",
      body: "点「进入」。",
      target: "enter-fishery",
      dim: true,
    };
  }
  return {
    id: "pick-stream",
    title: "选清溪池",
    body: "点地图上的「清溪池」。",
    target: "fishery-clear_stream",
    dim: true,
  };
}

function fishingCatchBeat(g: GuideInput): GuideBeat {
  // 筐里已经有鱼：只催离开，禁止「再甩一次」把人留在钓点
  if (g.basketCount > 0 && (g.dockCaught || g.leaveGuideAfterCatch || (g.dockPhase ?? "") === "result")) {
    return {
      id: "caught-leave",
      title: "进筐了",
      body: "点左上角返回，去鱼筐存进缸。",
      target: "fishing-back",
      place: "bottom",
    };
  }

  if (g.leaveGuideAfterCatch) {
    return {
      id: "caught-leave",
      title: "进筐了",
      body: "点左上角返回，去鱼筐存进缸。",
      target: "fishing-back",
      place: "bottom",
    };
  }

  if (g.idle) {
    return {
      id: "catch-idle",
      title: "自己甩一竿",
      body: "先取消挂机，自己试试。",
      place: "bottom",
    };
  }

  const phase = g.dockPhase ?? "pick";
  if (phase === "pick") {
    return {
      id: "sit",
      title: "坐下",
      body: "点空位坐下。",
      target: "seat",
      dim: true,
    };
  }
  if (phase === "ready" || phase === "casting") {
    return {
      id: "cast",
      title: "甩竿",
      body: "向上滑甩竿。",
      place: "bottom",
    };
  }
  if (phase === "waiting" || phase === "reeling") {
    return {
      id: "wait",
      title: "等鱼",
      body: "浮漂动时，向下滑收竿。",
      place: "bottom",
    };
  }
  if (phase === "bite") {
    return {
      id: "hook",
      title: "上钩了",
      body: "向下滑收竿。",
      place: "bottom",
    };
  }
  if (phase === "minigame" || phase === "idle_fight") {
    const intro = fightIntroGuideBeat(g);
    if (intro) return intro;
    if (needsFightIntro(g)) {
      return {
        id: "fight-countdown",
        title: "",
        body: "",
        place: "bottom",
      };
    }
    return {
      id: "fight",
      title: "搏斗",
      body: "按住拇指区，追上鱼！",
      target: "fight-hold",
      dim: true,
    };
  }
  if (phase === "result") {
    if (g.dockCaught && g.catchPopupOpen) {
      if (!g.guideIdleDone) {
        return {
          id: "caught-card",
          title: "钓到了",
          body: "看看这条鱼，点卡片关闭后再试试挂机。",
          target: "catch-card",
          place: "bottom",
          dim: true,
        };
      }
      return {
        id: "caught-dismiss",
        title: "钓到了",
        body: "点击关闭钓获提示。",
        place: "bottom",
      };
    }
    if (g.dockCaught || g.basketCount > 0) {
      return {
        id: "caught",
        title: "进筐了",
        body: "点左上角返回，去鱼筐存进缸。",
        target: "fishing-back",
        place: "bottom",
      };
    }
    return {
      id: "escaped",
      title: "跑了也没关系",
      body: "再甩一次。",
      place: "bottom",
    };
  }

  return {
    id: "cast",
    title: "甩竿",
    body: "向上滑甩竿。",
    place: "bottom",
  };
}

function needsFightIntro(g: GuideInput): boolean {
  if (!g.started || g.skipped || g.guideFightIntroDone) return false;
  const q = effectiveQuest(g);
  return q === "q_catch" || q === "q_go_fish";
}

/** 搏斗暂停教学：拇指/玩家滑块 → 鱼滑块/进度条 → 搏斗提示 → 倒计时。 */
function fightIntroGuideBeat(g: GuideInput): GuideBeat | null {
  if (!needsFightIntro(g)) return null;
  if (g.guideFightCountdown != null) return null;
  const step = g.guideFightIntroStep ?? 0;
  if (step <= 0) {
    return {
      id: "fight-intro-player",
      title: "你的滑块",
      body: "绿色条是你的滑块，一开始在槽底。按住下方拇指区会上移，松开会落回去。",
      targets: ["fight-player-zone", "fight-hold"],
      place: "bottom",
    };
  }
  if (step === 1) {
    return {
      id: "fight-intro-fish",
      title: "重合涨进度",
      body: "金色条是鱼的滑块。你的滑块与鱼的滑块重合时，左侧进度上升；升到 100% 钓获成功，掉到 0% 则失败。",
      targets: ["fight-fish-zone", "fight-progress", "fight-progress-fill"],
      place: "bottom",
    };
  }
  if (step === 2) {
    return {
      id: "fight-intro-go",
      title: "搏斗",
      body: "按住拇指区，追上鱼！",
      target: "fight-hold",
      place: "bottom",
      dim: true,
    };
  }
  return null;
}
