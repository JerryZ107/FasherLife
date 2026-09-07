import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { currentGuide, mustStoreCatchFish, type GuideTripPhase } from "../game/guide";
import { useGame } from "../store/gameStore";
import { askConfirm, useUi } from "../store/uiStore";
import { CONSUMABLE_DEFS, foodIdFromBait } from "../data/consumableDefs";
import { ATTRACTANT_DEFS } from "../data/attractantDefs";
import { hasTodayCatchForFeed, hasSelfFeedPostToday } from "../data/fishFeedDefs";

const PAD = 6;

type Box = { left: number; top: number; width: number; height: number; bottom: number };

const CARD_GAP = 10;
const CARD_EST = 150;
const CARD_MARGIN = 56;

function findGuideTarget(target: string, fishChatOpen: boolean): HTMLElement | null {
  if (target === "top-stamina") {
    const el = document.querySelector('.topbar [data-guide="top-stamina"]');
    return el instanceof HTMLElement ? el : null;
  }
  if (fishChatOpen) {
    const el = document.querySelector(`.fishchat-backdrop [data-guide="${target}"]`);
    return el instanceof HTMLElement ? el : null;
  }
  if (target === "feed-btn") {
    const candidates = [
      document.querySelector('.hub-side.right [data-guide="feed-btn"]'),
      document.querySelector('.hub [data-guide="feed-btn"]'),
      document.querySelector(`[data-guide="feed-btn"]`),
    ];
    for (const node of candidates) {
      if (node instanceof HTMLElement && node.offsetWidth > 0 && node.offsetHeight > 0) return node;
    }
    return null;
  }
  const el =
    document.querySelector(`.dock-view [data-guide="${target}"]`) ??
    document.querySelector(`.scene [data-guide="${target}"]`) ??
    document.querySelector(`[data-guide="${target}"]`);
  return el instanceof HTMLElement ? el : null;
}

function measureGuideBoxes(
  beat: { target?: string; targets?: string[] },
  fishChatOpen: boolean,
  origin: DOMRect,
): Box[] {
  const keys = beat.targets?.length ? beat.targets : beat.target ? [beat.target] : [];
  const boxes: Box[] = [];
  for (const key of keys) {
    const el = findGuideTarget(key, fishChatOpen);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    boxes.push({
      left: r.left - origin.left,
      top: r.top - origin.top,
      width: r.width,
      height: r.height,
      bottom: r.bottom - origin.top,
    });
  }
  return boxes;
}

function mergeBoxes(boxes: Box[]): Box | null {
  if (boxes.length === 0) return null;
  const left = Math.min(...boxes.map((b) => b.left));
  const top = Math.min(...boxes.map((b) => b.top));
  const right = Math.max(...boxes.map((b) => b.left + b.width));
  const bottom = Math.max(...boxes.map((b) => b.bottom));
  return { left, top, width: right - left, height: bottom - top, bottom };
}

export default function GuideOverlay() {
  const save = useGame((s) => s.save);
  const account = useGame((s) => s.account);
  const selectedUid = useGame((s) => s.selectedTankUid);
  const skipGuide = useGame((s) => s.skipGuide);
  const advanceGuideFightIntro = useGame((s) => s.advanceGuideFightIntro);
  const markGuideStaminaHinted = useGame((s) => s.markGuideStaminaHinted);
  const adJob = useUi((s) => s.adJob);
  const comingSoon = useUi((s) => s.comingSoon);
  const monthlyGoldOpen = useUi((s) => s.monthlyGoldOpen);
  const dockGuide = useUi((s) => s.dockGuide);
  const storeTab = useUi((s) => s.storeTab);
  const selectedEggUid = useGame((s) => s.selectedEggUid);
  const feedPanelOpen = useUi((s) => s.feedPanelOpen);
  const tankScatterFeed = useUi((s) => s.tankScatterFeed);
  const matePanelOpen = useUi((s) => s.matePanelOpen);
  const tankMateSpray = useUi((s) => s.tankMateSpray);
  const fishChatOpen = useUi((s) => s.fishChatOpen);
  const fishChatCurrentTab = useUi((s) => s.fishChatCurrentTab);
  const fishChatComposeOpen = useUi((s) => s.fishChatComposeOpen);
  const fishChatShowcasePickOpen = useUi((s) => s.fishChatShowcasePickOpen);
  const mapPicked = useUi((s) => s.mapPicked);
  const meetFisheryId = useUi((s) => s.meetFisheryId);
  const guideSellPrompted = useUi((s) => s.guideSellPrompted);
  const guideTripPhaseUi = useUi((s) => s.guideTripPhase);
  const guideReviewStep = useUi((s) => s.guideReviewStep);
  const shopCurrentTab = useUi((s) => s.shopCurrentTab);
  const marketCurrentTab = useUi((s) => s.marketCurrentTab);
  const equipCurrentTab = useUi((s) => s.equipCurrentTab);
  const selectFishSub = useUi((s) => s.selectFishSub);
  const selectFishHasPick = useUi((s) => s.selectFishHasPick);
  const guideIdleStaminaHinted = useUi((s) => s.guideIdleStaminaHinted);
  const guideFightIntroStep = useUi((s) => s.guideFightIntroStep);
  const guideFightCountdown = useUi((s) => s.guideFightCountdown);
  const markGuideIdleStaminaHinted = useUi((s) => s.markGuideIdleStaminaHinted);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<Box[]>([]);
  const [fishingHudBottom, setFishingHudBottom] = useState<number | null>(null);
  const [cardDragTop, setCardDragTop] = useState<number | null>(null);
  const [cardDragging, setCardDragging] = useState(false);
  const cardDragRef = useRef<{ startY: number; startTop: number; pid: number } | null>(null);

  const tankLive = save.tank.filter((f) => !f.dead).length;
  const guideTripPhase = (save.guideTripPhase ?? guideTripPhaseUi) as GuideTripPhase;
  const returning = mustStoreCatchFish({
    questStep: save.questStep,
    basketCount: save.basket.length,
    reviewStep: guideReviewStep,
  }) && !meetFisheryId;
  const hasMatchFood = CONSUMABLE_DEFS.some(
    (c) => (save.foodStock[foodIdFromBait(c.id)] ?? 0) > 0,
  );
  const hasMateScent = (save.attractantLots ?? []).some((l) =>
    ATTRACTANT_DEFS.some((a) => a.id === l.defId && a.scope === "fish"),
  );
  const hasTodayCatchInBasket = save.basket.some((b) => b.caughtDay === save.gameDay);
  const hasTodayCatchForFeedLog = hasTodayCatchForFeed(save);
  const hasSelfFeedPostTodayLog = hasSelfFeedPostToday(save, account);
  const hasCrucianInBasket = save.basket.some((b) => b.defId === "crucian");
  const beat = currentGuide({
    questStep: save.questStep,
    scene: save.scene,
    skipped: save.guideSkipped,
    started: save.started,
    dockPhase: dockGuide?.phase ?? null,
    dockCaught: Boolean(dockGuide?.caught),
    catchPopupOpen: Boolean(dockGuide?.catchPopupOpen),
    leaveGuideAfterCatch: Boolean(dockGuide?.leaveGuideAfterCatch),
    selectedUid,
    selectedEggUid,
    tankLive,
    basketCount: save.basket.length,
    idle: Boolean(save.idle),
    storeTab: storeTab ?? undefined,
    feedPanelOpen,
    tankScatterFeed,
    matePanelOpen,
    tankMateSpray,
    fishChatOpen,
    fishChatTab: fishChatCurrentTab,
    hasMatchFood,
    hasMateScent,
    hasTodayCatchInBasket,
    hasTodayCatchForFeed: hasTodayCatchForFeedLog,
    hasSelfFeedPostToday: hasSelfFeedPostTodayLog,
    hasCrucianInBasket,
    guideMateShopDone: save.guideMateShopDone,
    guideMateSprayDone: save.guideMateSprayDone,
    guideEncycDone: save.guideEncycDone,
    guideFishchatPostDone: save.guideFishchatPostDone,
    guideFishchatShowcaseDone: save.guideFishchatShowcaseDone,
    fishChatComposeOpen,
    fishChatShowcasePickOpen,
    mapPicked: returning ? null : (mapPicked ?? meetFisheryId),
    guideSellPrompted,
    guideTripPhase,
    guideShopDone: save.guideShopDone,
    guidePrompted: save.guidePrompted,
    guideIdleDone: save.guideIdleDone,
    guideFightIntroDone: save.guideFightIntroDone,
    guideFightIntroStep,
    guideFightCountdown,
    guideIdleStaminaHinted,
    guideStaminaHinted: save.guideStaminaHinted,
    shopCurrentTab,
    marketCurrentTab,
    equipCurrentTab,
    selectFishSub,
    selectFishHasPick,
    reviewStep: guideReviewStep,
  });
  const blocked = Boolean(adJob || comingSoon || monthlyGoldOpen);

  useLayoutEffect(() => {
    if (!beat || blocked) {
      setRects([]);
      setFishingHudBottom(null);
      return;
    }
    const fightBeat = Boolean(
      beat.targets?.some((t) => t.startsWith("fight-")) || beat.target?.startsWith("fight-"),
    );
    let scrolled = false;
    const measure = () => {
      const origin = rootRef.current?.getBoundingClientRect();
      if (!origin) return;

      if (save.scene === "fishing" && !fightBeat) {
        const hud = document.querySelector(".fishing-hud");
        if (hud instanceof HTMLElement) {
          const next = hud.getBoundingClientRect().bottom - origin.top + 8;
          setFishingHudBottom((prev) => (prev != null && Math.abs(prev - next) < 0.5 ? prev : next));
        }
      } else if (!fightBeat) {
        setFishingHudBottom(null);
      }

      const hasTarget = Boolean(beat.target || (beat.targets?.length ?? 0) > 0);
      if (!hasTarget) {
        setRects([]);
        return;
      }
      const nextRects = measureGuideBoxes(beat, fishChatOpen, origin);
      if (nextRects.length === 0) {
        setRects([]);
        return;
      }
      if (!scrolled) {
        for (const el of beat.targets ?? (beat.target ? [beat.target] : [])) {
          const node = findGuideTarget(el, fishChatOpen);
          if (
            node &&
            (beat.id === "tank-stored-leave" ||
              beat.id === "sell-done-leave" ||
              beat.id === "feed-leave-shop" ||
              el === "back-aquarium" ||
              el === "feed-btn" ||
              el === "catch-card" ||
              el === "feed-aquarium-go" ||
              el.startsWith("fight-"))
          ) {
            node.scrollIntoView({ block: "nearest", inline: "nearest" });
          }
        }
        scrolled = true;
      }
      setRects((prev) => {
        if (
          prev.length === nextRects.length &&
          prev.every(
            (p, i) =>
              Math.abs(p.left - nextRects[i].left) < 0.5 &&
              Math.abs(p.top - nextRects[i].top) < 0.5 &&
              Math.abs(p.width - nextRects[i].width) < 0.5 &&
              Math.abs(p.height - nextRects[i].height) < 0.5,
          )
        ) {
          return prev;
        }
        return nextRects;
      });
    };
    measure();
    let rafId = 0;
    if (fightBeat) {
      const loop = () => {
        measure();
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    } else {
      const t = window.setInterval(measure, 160);
      window.addEventListener("resize", measure);
      window.addEventListener("scroll", measure, true);
      return () => {
        window.clearInterval(t);
        window.removeEventListener("resize", measure);
        window.removeEventListener("scroll", measure, true);
      };
    }
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [beat?.id, beat?.target, beat?.targets?.join(","), blocked, save.scene, fishChatOpen]);

  useEffect(() => {
    setCardDragTop(null);
    setCardDragging(false);
    cardDragRef.current = null;
  }, [beat?.id]);

  if (!beat || blocked) return null;
  if (beat.id === "fight-countdown") return null;

  const activeBeat = beat;
  const hole = mergeBoxes(rects);
  const viewH = rootRef.current?.clientHeight ?? window.innerHeight;
  const pinUnderFishingHud =
    save.scene === "fishing" && activeBeat.id !== "dock-idle-stamina";

  function clampCardTop(top: number): number {
    const origin = rootRef.current?.getBoundingClientRect();
    const cardH = cardRef.current?.offsetHeight ?? CARD_EST;
    const min = 8;
    const max = (origin?.height ?? viewH) - cardH - 8;
    return Math.min(max, Math.max(min, top));
  }

  function computeAutoTop(): number {
    if (pinUnderFishingHud) return fishingHudBottom ?? 96;
    if (activeBeat.id === "fishchat-send") {
      const cardH = cardRef.current?.offsetHeight ?? CARD_EST;
      return clampCardTop((viewH * 2) / 6 - cardH / 2);
    }
    if (hole) {
      const below = hole.bottom + CARD_GAP;
      if (below + CARD_EST <= viewH - 16) return below;
      return Math.max(CARD_MARGIN, hole.top - CARD_EST - CARD_GAP);
    }
    if (activeBeat.place === "bottom") return viewH - 72 - CARD_EST;
    if (activeBeat.place === "top") return 72;
    return viewH - 108 - CARD_EST;
  }

  const displayTop = cardDragTop ?? computeAutoTop();

  function onCardDragStart(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button, a, input, textarea, select")) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setCardDragging(true);
    cardDragRef.current = {
      startY: e.clientY,
      startTop: cardDragTop ?? computeAutoTop(),
      pid: e.pointerId,
    };
  }

  function onCardDragMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = cardDragRef.current;
    if (!drag || e.pointerId !== drag.pid) return;
    setCardDragTop(clampCardTop(drag.startTop + (e.clientY - drag.startY)));
  }

  function onCardDragEnd(e: React.PointerEvent<HTMLDivElement>) {
    const drag = cardDragRef.current;
    if (!drag || e.pointerId !== drag.pid) return;
    cardDragRef.current = null;
    setCardDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function handleSkip() {
    askConfirm({
      title: "跳过引导？",
      message: "之后可在任务页重新开启。",
      confirmLabel: "跳过",
      danger: true,
      onConfirm: skipGuide,
    });
  }

  const cardStyle = { top: displayTop, bottom: "auto" as const };

  return (
    <div className={`guide-root${fishChatOpen ? " is-over-fishchat" : ""}`} ref={rootRef} aria-live="polite">
      {rects.map((spot, i) => (
        <div
          key={`${activeBeat.id}-spot-${i}`}
          className="guide-spot"
          style={{
            left: spot.left - PAD,
            top: spot.top - PAD,
            width: spot.width + PAD * 2,
            height: spot.height + PAD * 2,
          }}
        />
      ))}
      <div
        ref={cardRef}
        className={`guide-card${pinUnderFishingHud ? " under-fishing-hud" : ""}${cardDragging ? " is-dragging" : ""}`}
        style={cardStyle}
        onPointerDown={onCardDragStart}
        onPointerMove={onCardDragMove}
        onPointerUp={onCardDragEnd}
        onPointerCancel={onCardDragEnd}
        aria-label="拖动引导提示"
      >
        <button type="button" className="guide-skip" onClick={handleSkip}>
          跳过
        </button>
        <strong>{activeBeat.title}</strong>
        <p>{activeBeat.body}</p>
        {activeBeat.id === "dock-idle-stamina" && (
          <button type="button" className="primary" style={{ marginTop: 8, width: "100%" }} onClick={markGuideIdleStaminaHinted}>
            下一步
          </button>
        )}
        {(activeBeat.id === "fight-intro-player" || activeBeat.id === "fight-intro-fish") && (
          <button type="button" className="primary" style={{ marginTop: 8, width: "100%" }} onClick={advanceGuideFightIntro}>
            下一步
          </button>
        )}
        {activeBeat.id === "fight-intro-go" && (
          <button type="button" className="primary" style={{ marginTop: 8, width: "100%" }} onClick={advanceGuideFightIntro}>
            好的
          </button>
        )}
        {activeBeat.id === "stamina-hint" && (
          <button type="button" className="primary" style={{ marginTop: 8, width: "100%" }} onClick={markGuideStaminaHinted}>
            知道了
          </button>
        )}
      </div>
    </div>
  );
}
