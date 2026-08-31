import type { SceneId } from "../save/saveSchema";

const QUEST_ORDER = ["q_feed", "q_sell", "q_read_encyc", "q_go_fish", "q_catch", "q_tank", "q_buy_carp", "q_cook", "q_eat", "q_visit_temple", "q_done"] as const;

function questIndex(id: string): number {
  const i = QUEST_ORDER.indexOf(id as (typeof QUEST_ORDER)[number]);
  return i >= 0 ? i : 0;
}

export { questIndex };

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
  storeTab?: "basket" | "cook" | "tank";
  feedPickOpen?: boolean;
  hasMatchFood?: boolean;
  mapPicked?: string | null;
  guideSellPrompted?: boolean;
  guideTripPhase?: GuideTripPhase;
  guideShopDone?: boolean;
  /** 未弹过引导询问前抑制引导（等玩家在欢迎弹窗里选择）。 */
  guidePrompted?: boolean;
  /** 钓鱼成功后的挂机引导是否已完成。 */
  guideIdleDone?: boolean;
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

  const phase = g.guideTripPhase ?? 0;
  const qPeek = effectiveQuest(g);
  const fishingRoute =
    qPeek === "q_go_fish" || qPeek === "q_catch" || qPeek === "q_tank";
  /** 钓鱼任务段且筐里已有鱼：只催存缸，禁止再点钓鱼。 */
  const mustStoreCatch = fishingRoute && g.basketCount > 0;

  // 5 鱼筐→馆：仅开局喂食任务需要；入缸后的买鲫/做菜不要被相位 5 劫持
  if (isFeedTrip(phase) && (qPeek === "q_feed" || g.questStep === "q_feed")) {
    const feed = feedTripBeat(g);
    if (feed) return feed;
  }

  // 钓鱼成功后、离开钓点前：挂机 → 顶部能量提示 → 退出（优先于「回馆存缸」文案）
  if (
    g.scene === "fishing" &&
    (g.questStep === "q_tank" || qPeek === "q_tank") &&
    !g.guideIdleDone
  ) {
    const idle = idleGuideBeat(g);
    if (idle) return idle;
  }

  // 回程相位，或钓鱼段筐里已有鱼：只引导回馆存缸，绝不再进清溪/点钓鱼
  if (fishingRoute && (isReturnTrip(phase) || mustStoreCatch)) {
    const tank = tankQuestBeat(g);
    if (tank) return tank;
  }

  const q = qPeek;
  if (!q || q === "q_done") {
    return null;
  }

  // 吃菜后：一次性高亮体力条，提示可以补充体力（在圣殿参观引导之前）
  if (!g.guideStaminaHinted && (q === "q_visit_temple" || q === "q_done")) {
    return {
      id: "stamina-hint",
      title: "体力这样补",
      body: "体力不足时，做菜、吃菜能补充；能量饮料也行。",
      target: "top-stamina",
      place: "bottom",
      dim: true,
    };
  }

  // 最开始：先买鱼粮再喂鱼
  if (q === "q_feed" && !g.guideShopDone) {
    const shop = shopPreludeBeat(g);
    if (shop) return shop;
  }

  if (q === "q_go_fish" || q === "q_catch") {
    // 筐里已经有鱼：上面 mustStoreCatch 已处理；这里只走「还没钓到」的甩竿引导
    if (g.basketCount > 0) {
      const tank = tankQuestBeat(g);
      if (tank) return tank;
      return null;
    }
    if (!isReturnTrip(phase) && !isFeedTrip(phase)) {
      const fish = fishingQuestBeat(g);
      if (fish) return fish;
    }
  }

  if (q === "q_tank") {
    const tank = tankQuestBeat(g);
    if (tank) return tank;
  }

  if (q === "q_buy_carp") {
    const beat = buyCarpQuestBeat(g);
    if (beat) return beat;
  }

  if (q === "q_read_encyc") {
    const beat = encycQuestBeat(g);
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

  if (q === "q_visit_temple") {
    const beat = templeVisitQuestBeat(g);
    if (beat) return beat;
  }

  if (q === "q_feed") {
    if (g.scene === "shop") {
      return {
        id: "feed-leave-shop",
        title: "购买鱼粮喂鱼",
        body: "买好了，返回水族馆去喂鱼。",
        target: "back-aquarium",
        dim: true,
      };
    }
    if (g.tankLive <= 0) {
      if (g.scene === "aquarium" && g.basketCount > 0) {
        return {
          id: "feed-need-tank",
          title: "先入缸",
          body: "点「鱼筐」，把鱼存进缸。",
          target: "open-basket",
          dim: true,
        };
      }
      if (g.scene === "aquarium") {
        // 开局喂食阶段不该跳去钓鱼（钓鱼在更后面）；引导去鱼行买一条
        return {
          id: "feed-need-fish",
          title: "缸里还没有鱼",
          body: "点「鱼行」买一条先入缸，别急着去钓鱼。",
          target: "go-market",
          dim: true,
        };
      }
    }

    if (g.feedPickOpen) {
      return {
        id: "feed-pick-food",
        title: "选鱼粮",
        body: g.hasMatchFood ? "选一份鱼粮。" : "还没有对口粮，去买一份。",
        target: g.hasMatchFood ? "feed-food" : "feed-shop",
        dim: true,
      };
    }

    if (g.scene === "aquarium") {
      if (!g.selectedUid) {
        return {
          id: "feed-pick",
          title: "喂鱼",
          body: "点缸里的一条鱼。",
          place: "bottom",
        };
      }
      return {
        id: "feed-btn",
        title: "喂鱼",
        body: "点「喂食」。",
        target: "feed-btn",
        dim: true,
      };
    }

    if (g.scene === "select_fish") {
      return {
        id: "feed-select",
        title: "喂鱼",
        body: "选鱼，点「喂食」。",
        target: "feed-many",
        dim: true,
      };
    }

    if (g.scene === "store_tank") {
      return {
        id: "feed-leave-store",
        title: "回水族馆",
        body: "回去点缸里的鱼喂食。",
        target: "back-aquarium",
        dim: true,
      };
    }
  }

  if (q === "q_sell") {
    const needCatch = g.basketCount === 0 && g.tankLive === 0;
    if (needCatch) {
      // 卖鱼任务缺鱼：优先鱼行购买，避免把主线拽回「再去钓鱼」死循环
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
        return {
          id: "sell-need-catch-back",
          title: "回水族馆",
          body: "回水族馆，去鱼行买一条或再去钓。",
          target: "back-aquarium",
          dim: true,
        };
      }
      // 已在钓点/地图：允许钓，但不在水族馆反复高亮钓鱼按钮
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
          title: "存筐售卖",
          body: "需要存到鱼筐里向鱼行售卖",
          target: "open-basket",
          dim: true,
        };
      }
    }

    if (g.scene === "store_tank") {
      if (g.basketCount === 0) {
        if (g.storeTab !== "tank") {
          return {
            id: "sell-to-basket",
            title: "存筐售卖",
            body: "切到「鱼缸」，把缸里的鱼存回筐。",
            target: "tab-basket",
            dim: false,
          };
        }
        return {
          id: "sell-put-basket",
          title: "存筐售卖",
          body: "选一条要售卖的鱼，存进鱼筐里。",
          target: "store-to-basket",
          dim: false,
        };
      }
      return {
        id: "sell-leave-store",
        title: "去鱼行",
        body: "回水族馆，点「鱼行」。",
        target: "back-aquarium",
        dim: true,
      };
    }

    if (g.scene === "market") {
      if (g.basketCount === 0) {
        return {
          id: "sell-no-basket",
          title: "筐里没有鱼",
          body: g.tankLive > 0 ? "先把缸里的鱼存回筐。" : "切到「购买」买一条，或回馆再准备。",
          target: g.tankLive > 0 ? "back-aquarium" : "market-tab-buy",
          dim: true,
        };
      }
      if (g.guideSellPrompted) {
        return {
          id: "sell-after-prompt",
          title: "卖给鱼行",
          body: "点「售卖」并确认即可；取消也没关系，稍后再卖也行。",
          place: "bottom",
          dim: false,
        };
      }
      return {
        id: "sell-fish",
        title: "卖给鱼行",
        body: "在「售卖」里选一条，点「售卖」。",
        target: "sell-fish",
        dim: true,
      };
    }
  }

  // 自由探索：非闭环页面不再拦截，返回 null，让玩家自由浏览。
  // 仅在重温模式下提示回水族馆。
  if (reviewing) {
    return {
      id: "review-back",
      title: "回水族馆",
      body: "先回水族馆，跟着高亮走。",
      target: "back-aquarium",
      dim: true,
    };
  }

  return null;
}

/** 鱼筐 → 存缸。 */
function tankQuestBeat(g: GuideInput): GuideBeat | null {
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
  if (g.scene === "aquarium") {
    if (g.basketCount <= 0) {
      // 已存完：交给后续任务（买鲫鱼等），绝不再唆使去钓鱼
      return null;
    }
    return {
      id: "open-basket",
      title: "打开鱼筐",
      body: "点「鱼筐」，选鱼存进缸。",
      target: "open-basket",
      dim: true,
    };
  }
  if (g.scene === "store_tank") {
    if (g.storeTab === "tank") {
      return {
        id: "tab-store",
        title: "切到存缸",
        body: "切到「存缸」，选鱼后点存缸。",
        target: "tab-store",
        dim: false,
      };
    }
    if (g.basketCount === 0) {
      return {
        id: "tank-stored-leave",
        title: "回水族馆",
        body: "鱼存好了，点返回，接着去鱼行买鲫鱼做菜。",
        target: "back-aquarium",
        dim: true,
      };
    }
    return {
      id: "store-to-tank",
      title: "存进缸",
      body: "选一条鱼、选一口缸，点「存缸」。",
      place: "bottom",
      dim: false,
    };
  }
  return null;
}

/** 相位 5：回馆后点鱼喂食。 */
function feedTripBeat(g: GuideInput): GuideBeat | null {
  if (g.scene === "store_tank") {
    return {
      id: "feed-leave-store",
      title: "回水族馆",
      body: "回去点缸里的鱼喂食。",
      target: "back-aquarium",
      dim: true,
    };
  }
  if (g.tankLive <= 0) {
    if (g.scene === "aquarium" && g.basketCount > 0) {
      return {
        id: "feed-need-tank",
        title: "先入缸",
        body: "点「鱼筐」，把鱼存进缸。",
        target: "open-basket",
        dim: true,
      };
    }
    if (g.scene === "aquarium") {
      return {
        id: "feed-need-fish",
        title: "缸里还没有鱼",
        body: "点「鱼行」买一条先入缸，别急着去钓鱼。",
        target: "go-market",
        dim: true,
      };
    }
  }
  if (g.feedPickOpen) {
    return {
      id: "feed-pick-food",
      title: "选鱼粮",
      body: g.hasMatchFood ? "选一份鱼粮。" : "还没有对口粮，去买一份。",
      target: g.hasMatchFood ? "feed-food" : "feed-shop",
      dim: true,
    };
  }
  if (g.scene === "aquarium") {
    if (!g.selectedUid) {
      return {
        id: "feed-pick",
        title: "喂鱼",
        body: "点缸里的一条鱼。",
        place: "bottom",
      };
    }
    return {
      id: "feed-btn",
      title: "喂鱼",
      body: "点「喂食」。",
      target: "feed-btn",
      dim: true,
    };
  }
  if (g.scene === "select_fish") {
    return {
      id: "feed-select",
      title: "喂鱼",
      body: "选鱼，点「喂食」。",
      target: "feed-many",
      dim: true,
    };
  }
  return {
    id: "feed-back-home",
    title: "回水族馆",
    body: "回去点缸里的鱼喂食。",
    target: "back-aquarium",
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

/** 钓鱼成功后：挂机 → 顶部能量提示 → 退出钓点。 */
function idleGuideBeat(g: GuideInput): GuideBeat | null {
  if (g.scene !== "fishing") return null;
  if (g.catchPopupOpen) {
    return {
      id: "caught-dismiss-idle",
      title: "钓到了",
      body: "点击关闭钓获提示，接下来试试挂机。",
      place: "bottom",
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
      title: "挂机要耗体力",
      body: "挂机会持续消耗体力。点「下一步」继续。",
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
    return {
      id: "buy-carp-leave-store",
      title: "回水族馆",
      body: "鱼存好了，回水族馆去鱼行买鲫鱼。",
      target: "back-aquarium",
      dim: true,
    };
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

/** 图鉴阅读：水族馆 → 背包 → 书籍 → 阅读图鉴 → 看完返回。 */
function encycQuestBeat(g: GuideInput): GuideBeat | null {
  if (g.scene === "aquarium") {
    return {
      id: "go-equip-encyc",
      title: "去看图鉴",
      body: "点「背包」，打开书籍里的图鉴，看看清溪有哪些鱼。",
      target: "go-equip",
      dim: true,
    };
  }
  if (g.scene === "equipment") {
    if (g.equipCurrentTab !== "book") {
      return {
        id: "equip-pick-book",
        title: "切到书籍",
        body: "点「书籍」。",
        target: "equip-tab-book",
        dim: true,
      };
    }
    return {
      id: "open-encyc",
      title: "打开图鉴",
      body: "点「阅读图鉴」。",
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
    return tankQuestBeat(g);
  }
  if (g.scene === "encyclopedia" || g.scene === "equipment") {
    return {
      id: "fish-leave-encyc",
      title: "去钓鱼",
      body: "图鉴看过了，回水族馆点「钓鱼」。",
      target: g.scene === "encyclopedia" ? "encyc-back" : "back-aquarium",
      dim: true,
    };
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
  // 回程相位绝不引导进清溪
  if (isReturnTrip(g.guideTripPhase)) {
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
    return {
      id: "fight",
      title: "搏斗",
      body: "按住拇指区，追上鱼。",
      target: "fight-hold",
      dim: true,
    };
  }
  if (phase === "result") {
    if (g.dockCaught && g.catchPopupOpen) {
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
