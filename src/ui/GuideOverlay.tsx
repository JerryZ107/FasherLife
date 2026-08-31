import { useLayoutEffect, useRef, useState } from "react";
import { currentGuide, isReturnTrip, type GuideTripPhase } from "../game/guide";
import { useGame } from "../store/gameStore";
import { askConfirm, useUi } from "../store/uiStore";
import { FISH_BY_ID } from "../data/fishDefs";
import { CONSUMABLE_DEFS, foodIdFromBait } from "../data/consumableDefs";

const PAD = 6;

type Box = { left: number; top: number; width: number; height: number; bottom: number };

export default function GuideOverlay() {
  const save = useGame((s) => s.save);
  const selectedUid = useGame((s) => s.selectedTankUid);
  const skipGuide = useGame((s) => s.skipGuide);
  const adJob = useUi((s) => s.adJob);
  const comingSoon = useUi((s) => s.comingSoon);
  const monthlyGoldOpen = useUi((s) => s.monthlyGoldOpen);
  const dockGuide = useUi((s) => s.dockGuide);
  const storeTab = useUi((s) => s.storeTab);
  const feedPickOpen = useUi((s) => s.feedPickOpen);
  const mapPicked = useUi((s) => s.mapPicked);
  const guideSellPrompted = useUi((s) => s.guideSellPrompted);
  const guideTripPhaseUi = useUi((s) => s.guideTripPhase);
  const guideReviewStep = useUi((s) => s.guideReviewStep);
  const shopCurrentTab = useUi((s) => s.shopCurrentTab);
  const marketCurrentTab = useUi((s) => s.marketCurrentTab);
  const equipCurrentTab = useUi((s) => s.equipCurrentTab);
  const guideIdleStaminaHinted = useUi((s) => s.guideIdleStaminaHinted);
  const markGuideIdleStaminaHinted = useUi((s) => s.markGuideIdleStaminaHinted);
  const rootRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Box | null>(null);
  const [fishingHudBottom, setFishingHudBottom] = useState<number | null>(null);

  const tankLive = save.tank.filter((f) => !f.dead).length;
  const guideTripPhase = (save.guideTripPhase ?? guideTripPhaseUi) as GuideTripPhase;
  const returning = isReturnTrip(guideTripPhase);
  const selected = selectedUid ? save.tank.find((f) => f.uid === selectedUid) : save.tank.find((f) => !f.dead);
  const fishQ = selected ? FISH_BY_ID[selected.defId]?.quality : undefined;
  const hasMatchFood = Boolean(
    fishQ &&
      CONSUMABLE_DEFS.some(
        (c) => c.quality === fishQ && (save.foodStock[foodIdFromBait(c.id)] ?? 0) > 0,
      ),
  );
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
    tankLive,
    basketCount: save.basket.length,
    idle: Boolean(save.idle),
    storeTab: storeTab ?? undefined,
    feedPickOpen,
    hasMatchFood,
    mapPicked: returning ? null : mapPicked,
    guideSellPrompted,
    guideTripPhase,
    guideShopDone: save.guideShopDone,
    guidePrompted: save.guidePrompted,
    guideIdleDone: save.guideIdleDone,
    guideIdleStaminaHinted,
    guideStaminaHinted: save.guideStaminaHinted,
    shopCurrentTab,
    marketCurrentTab,
    equipCurrentTab,
    reviewStep: guideReviewStep,
  });
  const blocked = Boolean(adJob || comingSoon || monthlyGoldOpen);

  useLayoutEffect(() => {
    if (!beat || blocked) {
      setRect(null);
      setFishingHudBottom(null);
      return;
    }
    const measure = () => {
      const origin = rootRef.current?.getBoundingClientRect();
      if (!origin) return;

      if (save.scene === "fishing") {
        const hud = document.querySelector(".fishing-hud");
        if (hud instanceof HTMLElement) {
          const next = hud.getBoundingClientRect().bottom - origin.top + 8;
          setFishingHudBottom((prev) => (prev != null && Math.abs(prev - next) < 0.5 ? prev : next));
        }
      } else {
        setFishingHudBottom(null);
      }

      if (!beat.target) {
        setRect(null);
        return;
      }
      const el = document.querySelector(`[data-guide="${beat.target}"]`);
      if (!(el instanceof HTMLElement)) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const next: Box = {
        left: r.left - origin.left,
        top: r.top - origin.top,
        width: r.width,
        height: r.height,
        bottom: r.bottom - origin.top,
      };
      setRect((prev) => {
        if (
          prev &&
          Math.abs(prev.left - next.left) < 0.5 &&
          Math.abs(prev.top - next.top) < 0.5 &&
          Math.abs(prev.width - next.width) < 0.5 &&
          Math.abs(prev.height - next.height) < 0.5
        ) {
          return prev;
        }
        return next;
      });
    };
    measure();
    const t = window.setInterval(measure, 160);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [beat?.id, beat?.target, blocked, save.scene]);

  if (!beat || blocked) return null;

  const hole = beat.target ? rect : null;
  const viewH = rootRef.current?.clientHeight ?? window.innerHeight;
  const pinUnderFishingHud = save.scene === "fishing";
  const pinBottom = !pinUnderFishingHud && beat.place === "bottom";
  const cardTop = pinUnderFishingHud
    ? (fishingHudBottom ?? 96)
    : pinBottom
      ? undefined
      : hole
        ? hole.top > viewH * 0.48
          ? Math.max(56, hole.top - 132)
          : Math.min(viewH - 170, hole.bottom + 12)
        : beat.place === "top"
          ? 72
          : undefined;
  const cardBottom = pinBottom ? 72 : hole || beat.place === "top" || pinUnderFishingHud ? undefined : 108;

  function handleSkip() {
    askConfirm({
      title: "跳过引导？",
      message: "之后可在任务页重新开启。",
      confirmLabel: "跳过",
      danger: true,
      onConfirm: skipGuide,
    });
  }

  const cardStyle =
    cardTop != null
      ? { top: cardTop, bottom: "auto" as const }
      : { bottom: cardBottom, top: "auto" as const };

  return (
    <div className="guide-root" ref={rootRef} aria-live="polite">
      {hole && (
        <div
          className="guide-spot"
          style={{
            left: hole.left - PAD,
            top: hole.top - PAD,
            width: hole.width + PAD * 2,
            height: hole.height + PAD * 2,
          }}
        />
      )}
      <div className={`guide-card${pinUnderFishingHud ? " under-fishing-hud" : ""}`} style={cardStyle}>
        <button type="button" className="guide-skip" onClick={handleSkip}>
          跳过
        </button>
        <strong>{beat.title}</strong>
        <p>{beat.body}</p>
        {beat.id === "dock-idle-stamina" && (
          <button type="button" className="primary" style={{ marginTop: 8, width: "100%" }} onClick={markGuideIdleStaminaHinted}>
            下一步
          </button>
        )}
      </div>
    </div>
  );
}
