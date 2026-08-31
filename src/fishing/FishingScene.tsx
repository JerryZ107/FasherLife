import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../store/gameStore";
import { FISHERY_BY_ID } from "../data/fisheryDefs";
import { CONSUMABLE_BY_ID } from "../data/consumableDefs";
import { BASKET_BY_ID } from "../data/equipmentDefs";
import { FISH_BY_ID } from "../data/fishDefs";
import { type BottleStory, type JunkDef } from "../data/junkDefs";
import { type FishDef, type Personality } from "../types";
import { resolvedGear, biteReactMs } from "../game/gear";
import { basketWeightKg } from "../game/weight";
import { replaceWouldFit } from "../game/fishingLogic";
import { askConfirm, useUi } from "../store/uiStore";
import FishingCanvas from "./FishingCanvas";
import { playBiteCue } from "./biteCue";
import { FishPortrait, GearIcon, JunkMark } from "../art/Art";
import { FISHING_SPOTS, initialNeighbors, tickNeighbors, type NeighborState } from "./neighbors";
import DockWorld, { panToSpotX, worldWidthPx, type Phase } from "./DockWorld";
import { rollPersonality } from "../game/traits";
import { QualityChip } from "../ui/chrome";

/** 挂机一轮：等鱼 + 搏斗 + 飞入，对齐 IDLE_MS_PER_CAST（10s）。 */
const IDLE_WAIT_MS = 6400;
const IDLE_FIGHT_MS = 2400;
const IDLE_CATCH_MS = 1200;

export default function FishingScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const catchFish = useGame((s) => s.catchFish);
  const replaceBasketCatch = useGame((s) => s.replaceBasketCatch);
  const consumeBait = useGame((s) => s.consumeBait);
  const pickBite = useGame((s) => s.pickBite);
  const applyJunkCatch = useGame((s) => s.applyJunkCatch);
  const startIdle = useGame((s) => s.startIdle);
  const stopIdle = useGame((s) => s.stopIdle);
  const equip = useGame((s) => s.equip);
  const fisheryId = useGame((s) => s.selectedFisheryId);
  const setDockGuide = useUi((s) => s.setDockGuide);

  const idle = save.idle;
  const idleOn = Boolean(idle);
  const [phase, setPhase] = useState<Phase>(() => (idle ? "waiting" : "pick"));
  const [spot, setSpot] = useState<string | null>(() => (idle ? "s2" : null));
  const [neighbors, setNeighbors] = useState<NeighborState[]>(initialNeighbors);
  const [showBasket, setShowBasket] = useState(false);
  const [showBait, setShowBait] = useState(false);
  const [pickingReplace, setPickingReplace] = useState(false);
  const [result, setResult] = useState<{
    escaped: boolean;
    bag?: "added" | "replaced" | "full" | "rejected";
    fishId?: string;
    fishName?: string;
    junk?: JunkDef;
    story?: BottleStory;
  } | null>(null);
  const [fightFish, setFightFish] = useState<FishDef | null>(null);
  const [fightPersonality, setFightPersonality] = useState<Personality>("docile");
  const [progress, setProgress] = useState(30);
  const [holding, setHolding] = useState(false);
  const [pan, setPan] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const [leaveGuideAfterCatch, setLeaveGuideAfterCatch] = useState(false);

  const [castPower, setCastPower] = useState(0.55);
  const [chargePower, setChargePower] = useState(0);
  const biteTimerRef = useRef<number | null>(null);
  const reactionTimerRef = useRef<number | null>(null);
  const castTimerRef = useRef<number | null>(null);
  const reelTimerRef = useRef<number | null>(null);
  const idleAnimRef = useRef(false);
  const storyCloseRef = useRef<(() => void) | null>(null);
  const drag = useRef<{ x: number; y: number; pan: number; moved: boolean } | null>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  const fishery = fisheryId ? FISHERY_BY_ID[fisheryId] : null;
  const baitCount = save.baitStock[save.equipped.bait] ?? 0;
  const basket = BASKET_BY_ID[save.equipped.basket];
  const mods = useMemo(
    () => resolvedGear(save.equipped.rod, save.equippedParts, save.equipped.stool, save.ownedBooks),
    [save.equipped.rod, save.equippedParts, save.equipped.stool, save.ownedBooks],
  );
  const trip = save.equippedBaitIds ?? [save.equipped.bait];
  const bw = basketWeightKg(save.basket);
  const panLocked = phase === "minigame";
  const dockBusy =
    phase === "minigame" ||
    phase === "casting" ||
    phase === "reeling" ||
    phase === "bite" ||
    phase === "idle_fight";
  const biteWindowMs = biteReactMs(mods.reactionWindow);

  useEffect(() => {
    const caught = phase === "result" && Boolean(result && !result.escaped && result.fishId);
    const catchPopupOpen =
      phase === "result" &&
      !idleOn &&
      Boolean(result && !result.escaped && result.fishId && result.bag !== "full");
    setDockGuide({ phase, caught, catchPopupOpen, leaveGuideAfterCatch });
  }, [phase, result, idleOn, leaveGuideAfterCatch, setDockGuide]);

  useEffect(() => () => setDockGuide(null), [setDockGuide]);

  useEffect(() => {
    return () => {
      if (biteTimerRef.current) clearTimeout(biteTimerRef.current);
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
      if (castTimerRef.current) clearTimeout(castTimerRef.current);
      if (reelTimerRef.current) clearTimeout(reelTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      setNeighbors((prev) => tickNeighbors(prev, fisheryId ?? "village_pond"));
    }, 2400);
    return () => clearInterval(t);
  }, [fisheryId]);

  useEffect(() => {
    if (!idleOn) {
      if (idleAnimRef.current) {
        idleAnimRef.current = false;
        setPhase("ready");
        setResult(null);
      }
      return;
    }

    idleAnimRef.current = true;
    useGame.getState().simulateIdle(Date.now(), true);
    if (!useGame.getState().save.idle) {
      idleAnimRef.current = false;
      setPhase("ready");
      return;
    }

    let cancelled = false;
    let timeoutId = 0;
    let settleWait: (() => void) | null = null;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        settleWait = resolve;
        timeoutId = window.setTimeout(() => {
          settleWait = null;
          resolve();
        }, ms);
      });
    let storyWait: (() => void) | null = null;
    const waitStory = () =>
      new Promise<void>((resolve) => {
        storyWait = resolve;
        storyCloseRef.current = () => {
          storyWait = null;
          storyCloseRef.current = null;
          resolve();
        };
      });
    const interruptWait = () => {
      window.clearTimeout(timeoutId);
      timeoutId = 0;
      settleWait?.();
      settleWait = null;
      storyWait?.();
      storyWait = null;
      storyCloseRef.current = null;
    };

    const runLoop = async () => {
      while (!cancelled && useGame.getState().save.idle) {
        setResult(null);
        setPhase("waiting");
        await wait(IDLE_WAIT_MS);
        if (cancelled || !useGame.getState().save.idle) break;
        setPhase("idle_fight");
        await wait(IDLE_FIGHT_MS);
        if (cancelled || !useGame.getState().save.idle) break;
        const got = useGame.getState().idleCatchOnce();
        if (!got) {
          if (!cancelled) {
            setResult(null);
            setPhase("ready");
          }
          break;
        }
        if (got.kind === "junk") {
          setResult({ escaped: false, junk: got.junk, story: got.story ?? undefined });
          setPhase("result");
          await wait(IDLE_CATCH_MS);
          if (cancelled || !useGame.getState().save.idle) break;
          if (got.story) await waitStory();
          continue;
        }
        setResult({
          escaped: false,
          bag: got.bag,
          fishId: got.fish.id,
          fishName: got.fish.name,
        });
        setPhase("result");
        await wait(IDLE_CATCH_MS);
      }
    };

    const onVis = () => {
      if (document.hidden) {
        cancelled = true;
        interruptWait();
        return;
      }
      cancelled = false;
      useGame.getState().simulateIdle(Date.now(), true);
      if (!useGame.getState().save.idle) {
        idleAnimRef.current = false;
        setPhase("ready");
        return;
      }
      void runLoop();
    };

    document.addEventListener("visibilitychange", onVis);
    void runLoop();

    return () => {
      cancelled = true;
      interruptWait();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [idleOn]);

  useEffect(() => {
    if (phase !== "bite" && phase !== "minigame" && phase !== "idle_fight") return;
    const id = spot;
    if (!id) return;
    const def = FISHING_SPOTS.find((s) => s.id === id);
    const w = viewRef.current?.clientWidth ?? 360;
    if (!def) return;
    setSnapping(true);
    setPan(panToSpotX(def.x, w));
  }, [phase, spot]);

  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const world = worldWidthPx(w);
      setPan((p) => Math.max(0, Math.min(Math.max(0, world - w), p)));
    });
    ro.observe(el);
    if (idle) {
      const def = FISHING_SPOTS.find((s) => s.id === "s2");
      if (def) setPan(panToSpotX(def.x, el.clientWidth));
    }
    return () => ro.disconnect();
  }, []);

  if (!fishery) {
    return (
      <div className="placeholder">
        <div className="big">🎣</div>
        <div>未选择渔场</div>
        <button className="primary" onClick={() => setScene("fishing_map")}>返回地图</button>
      </div>
    );
  }

  function viewW() {
    return viewRef.current?.clientWidth ?? 360;
  }

  function clearTimers() {
    if (biteTimerRef.current) clearTimeout(biteTimerRef.current);
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    if (castTimerRef.current) clearTimeout(castTimerRef.current);
    if (reelTimerRef.current) clearTimeout(reelTimerRef.current);
    biteTimerRef.current = null;
    reactionTimerRef.current = null;
    castTimerRef.current = null;
    reelTimerRef.current = null;
  }

  function cancelIdle() {
    if (useGame.getState().save.idle) stopIdle();
  }

  function pickSpot(id: string) {
    const s = FISHING_SPOTS.find((x) => x.id === id);
    if (!s || s.npc) return;
    cancelIdle();
    clearTimers();
    setResult(null);
    setFightFish(null);
    setSpot(id);
    setSnapping(true);
    setPan(panToSpotX(s.x, viewW()));
    setPhase("ready");
  }

  function swipePower(delta: number) {
    return Math.max(0.24, Math.min(1, Math.abs(delta) / 220));
  }

  function cast(power: number) {
    if (useGame.getState().save.idle) return;
    if (phase !== "ready") return;
    if (baitCount <= 0) return;
    if (!consumeBait()) return;
    setCastPower(power);
    setPhase("casting");
    const ms = Math.round(380 + power * 420);
    castTimerRef.current = window.setTimeout(() => {
      setPhase("waiting");
      const delay = 1500 + Math.random() * 3500;
      biteTimerRef.current = window.setTimeout(() => onBite(), delay);
    }, ms);
  }

  function onBite() {
    setShowBait(false);
    setPhase("bite");
    playBiteCue();
    reactionTimerRef.current = window.setTimeout(() => {
      setResult({ escaped: true });
      setPhase("result");
    }, biteWindowMs);
  }

  function reelEarly() {
    if (idleOn) return;
    if (phase !== "waiting") return;
    clearTimers();
    setPhase("reeling");
    reelTimerRef.current = window.setTimeout(() => nextCast(), 480);
  }

  function hook() {
    if (phase !== "bite") return;
    cancelIdle();
    clearTimers();
    const bite = pickBite();
    if (!bite) return;
    if (bite.kind === "junk") {
      const story = applyJunkCatch(bite.junk) ?? undefined;
      setResult({ escaped: false, junk: bite.junk, story });
      setPhase("result");
      return;
    }
    setFightFish(bite.fish);
    setFightPersonality(rollPersonality());
    setProgress(30);
    setPhase("minigame");
  }

  function nextCast() {
    clearTimers();
    setResult(null);
    setFightFish(null);
    setHolding(false);
    setShowBait(false);
    setPickingReplace(false);
    setPhase("ready");
  }

  function dismissCatchPopup() {
    const hadFish = Boolean(
      phase === "result" && result && !result.escaped && result.fishId && result.bag !== "full",
    );
    nextCast();
    if (hadFish) setLeaveGuideAfterCatch(true);
  }

  function onWin() {
    if (!fightFish) return;
    const bag = catchFish(fightFish, fightPersonality);
    const ui = useUi.getState();
    if (bag === "added") ui.showToast(`${fightFish.name}已放入鱼筐`);
    setResult({ escaped: false, bag, fishId: fightFish.id, fishName: fightFish.name });
    setFightFish(null);
    setPickingReplace(false);
    setPhase("result");
  }

  function onLose() {
    setResult({ escaped: true });
    setPhase("result");
    setFightFish(null);
  }

  function onDockDown(e: React.PointerEvent) {
    if (phase === "result" && result && !result.escaped && !idleOn) {
      if (result.junk?.kind === "bottle") return;
      if (result.bag === "full") return;
      if (result.fishId) return;
      nextCast();
      return;
    }
    if (phase === "minigame" || showBait) return;
    setSnapping(false);
    drag.current = { x: e.clientX, y: e.clientY, pan, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onDockMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) drag.current.moved = true;
    if (phase === "ready" && !idle && baitCount > 0 && dy < -12 && Math.abs(dy) > Math.abs(dx)) {
      setChargePower(swipePower(dy));
    }
    if (panLocked || phase === "bite" || phase === "casting" || phase === "reeling") return;
    if (Math.abs(dx) >= Math.abs(dy)) {
      const w = viewW();
      const world = worldWidthPx(w);
      const next = Math.max(0, Math.min(world - w, drag.current.pan - dx));
      setPan(next);
    }
  }

  function onDockUp(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    const moved = drag.current.moved;
    drag.current = null;
    setChargePower(0);
    if (phase === "minigame") return;
    if (!moved) {
      if (phase === "pick" || phase === "ready" || idleOn) {
        const node = document.elementFromPoint(e.clientX, e.clientY);
        const seat = node instanceof Element ? node.closest("[data-spot]") : null;
        const id = seat?.getAttribute("data-spot");
        if (id && id !== spot) pickSpot(id);
      }
      return;
    }
    const vertical = Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx);
    if (!vertical) return;
    if (idle && dy > 0) {
      cancelIdle();
      return;
    }
    if (idle) return;
    if (phase === "ready" && dy < 0) cast(swipePower(dy));
    if (phase === "waiting" && dy > 0) reelEarly();
    if (phase === "bite") hook();
  }

  const hint =
    phase === "pick" ? "点空位坐下"
    : idle ? "换座会停挂机 · 下滑收竿"
    : phase === "ready" ? (baitCount > 0 ? "向上滑甩竿" : "鱼饵用完了")
    : phase === "casting" ? "甩杆中"
    : phase === "reeling" ? "收竿中"
    : phase === "waiting" ? "浮漂动时下滑收竿"
    : phase === "bite" ? "上钩了！下滑收竿"
    : "";

  return (
    <div
      className="fishing-root dock-mode"
      ref={viewRef}
      onPointerDown={onDockDown}
      onPointerMove={onDockMove}
      onPointerUp={onDockUp}
      onPointerCancel={onDockUp}
    >
      <div className="fishing-hud">
        <button
          data-guide="fishing-back"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (useGame.getState().save.idle) stopIdle();
            setScene("fishing_map");
          }}
        >
          ←
        </button>
        <strong>{fishery.name}</strong>
        <button className="hud-basket" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setShowBasket((v) => !v); }}>
          <GearIcon kind="basket" size={22} /> {save.basket.length}/{basket?.capacity ?? 0}
        </button>
        {spot && phase !== "pick" && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (dockBusy) return;
              setShowBasket(false);
              setShowBait(true);
            }}
            disabled={dockBusy}
          >
            <GearIcon kind="bait" size={22} /> 换饵
          </button>
        )}
        {spot && phase !== "pick" && (
          <button
            className={idle ? "primary" : ""}
            data-guide="dock-idle"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (idle) {
                stopIdle();
                return;
              }
              if (dockBusy) return;
              if (!startIdle()) return;
              clearTimers();
            }}
          >
            {idle ? "✅挂机" : "挂机"}
          </button>
        )}
      </div>

      {(hint && phase !== "minigame" && phase !== "result" && !showBait) ||
      (phase === "result" && result?.escaped && !idleOn) ? (
        <div className="dock-text-rail" onPointerDown={(e) => e.stopPropagation()}>
          {hint && phase !== "minigame" && phase !== "result" && !showBait && (
            <div className={`dock-hint ${phase === "bite" ? "accent" : ""}`}>
              {hint}
            </div>
          )}
          {phase === "result" && result?.escaped && !idleOn && (
            <div className="dock-sheet">
              <div>鱼跑了……</div>
              <button className="primary" onClick={nextCast}>继续等下一条</button>
            </div>
          )}
        </div>
      ) : null}

      <DockWorld
        pan={pan}
        snapping={snapping}
        phase={phase}
        spotId={spot}
        neighbors={neighbors}
        playerFishId={phase === "result" && result && !result.escaped ? result.fishId ?? null : null}
        playerJunkKind={phase === "result" && result && !result.escaped ? result.junk?.kind ?? null : null}
        playerEscaped={Boolean(result?.escaped)}
        onPickSpot={pickSpot}
        castPower={castPower}
        playerOutfitId={save.equippedOutfit}
        playerSex={save.lookSex}
        chargePower={chargePower}
        fisheryId={fisheryId ?? "village_pond"}
      />

      {showBasket && (
        <div className="basket-peek" onPointerDown={(e) => e.stopPropagation()}>
          <div className="row-between">
            <strong>鱼筐</strong>
            <span className="dim">{bw.toFixed(1)}/{basket?.weightCap}kg</span>
          </div>
          {save.basket.length === 0 && <div className="dim">空</div>}
          {save.basket.map((b) => {
            const def = FISH_BY_ID[b.defId];
            if (!def) return null;
            return (
              <div className="peek-fish" key={b.uid}>
                <FishPortrait id={def.id} size={36} alt={def.name} />
                <span>{def.name} <QualityChip quality={def.quality} /></span>
              </div>
            );
          })}
        </div>
      )}

      {showBait && (
        <div
          className="modal-backdrop"
          onPointerDown={(e) => {
            e.stopPropagation();
            setShowBait(false);
          }}
        >
          <div className="modal" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">换鱼饵</div>
            <p className="dim">选一种下竿用的饵。</p>
            {trip.map((id) => {
              const c = CONSUMABLE_BY_ID[id];
              const n = save.baitStock[id] ?? 0;
              if (!c) return null;
              return (
                <button
                  key={id}
                  className={save.equipped.bait === id ? "primary" : ""}
                  disabled={n <= 0}
                  onClick={() => {
                    equip("bait", id);
                    setShowBait(false);
                  }}
                >
                  <GearIcon kind="bait" size={22} /> {c.name} ×{n}
                </button>
              );
            })}
            {trip.length === 0 && <p className="dim">没带饵，去地图页勾选。</p>}
            <button onClick={() => setShowBait(false)}>关闭</button>
          </div>
        </div>
      )}

      {phase === "minigame" && fightFish && (
        <div className="minigame dock-minigame">
          <div className="row-between dock-fight-hud">
            <span className="row" style={{ alignItems: "center" }}>
              <FishPortrait id={fightFish.id} size={36} alt={fightFish.name} />
              搏斗：{fightFish.name} <QualityChip quality={fightFish.quality} />
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="progress-line">
            <div style={{ width: `${progress}%` }} />
          </div>
          <div className="minigame-stage">
            <FishingCanvas
              fishDef={fightFish}
              personality={fightPersonality}
              mods={mods}
              holding={holding}
              overlay
              onWin={onWin}
              onLose={onLose}
              onProgress={setProgress}
            />
          </div>
          <button
            className="primary thumb-btn"
            data-guide="fight-hold"
            onPointerDown={(e) => { e.stopPropagation(); setHolding(true); }}
            onPointerUp={(e) => { e.stopPropagation(); setHolding(false); }}
          >
            拇指区 · 按住上拉
          </button>
        </div>
      )}

      {phase === "result" && result && !result.escaped && result.junk && (result.junk.kind === "bottle" || !idleOn) && (
        <div className="modal-backdrop" onPointerDown={(e) => e.stopPropagation()}>
          <div className="modal" onPointerDown={(e) => e.stopPropagation()}>
            <div className="modal-title">{result.junk.name}</div>
            <JunkMark kind={result.junk.kind} size={88} />
            {result.junk.kind === "bottle" && result.story && (
              <p className="bottle-story">{result.story.body}</p>
            )}
            {result.junk.kind === "bag" && <p>你顺手扔进了垃圾桶。</p>}
            {result.junk.kind === "weed" && <p>洗洗能当普通鱼粮，已经收起来了。</p>}
            <button
              className="primary"
              onClick={() => {
                if (idleOn) storyCloseRef.current?.();
                else nextCast();
              }}
            >
              {result.junk.kind === "bottle" ? "看完了" : "继续"}
            </button>
          </div>
        </div>
      )}

      {phase === "result" && result && !result.escaped && result.fishId && result.bag === "full" && !pickingReplace && !idleOn && (
        <div className="modal-backdrop" onPointerDown={(e) => e.stopPropagation()}>
          <div className="modal" onPointerDown={(e) => e.stopPropagation()}>
            <div className="modal-title">鱼筐满了</div>
            <FishPortrait id={result.fishId} size={72} alt={result.fishName} />
            <p>钓到了 {result.fishName}。要换掉筐里的一条吗？</p>
            <button className="primary" onClick={() => setPickingReplace(true)}>替换</button>
            <button
              onClick={() =>
                askConfirm({
                  title: "确认放生",
                  message: `确定放生「${result.fishName}」？放生后无法找回。`,
                  confirmLabel: "放生",
                  danger: true,
                  onConfirm: nextCast,
                })
              }
            >
              放生这条
            </button>
          </div>
        </div>
      )}

      {phase === "result" && result && !result.escaped && result.fishId && result.bag === "full" && pickingReplace && !idleOn && (
        <div className="modal-backdrop" onPointerDown={(e) => e.stopPropagation()}>
          <div className="modal" onPointerDown={(e) => e.stopPropagation()}>
            <div className="modal-title">选一条换掉</div>
            <p className="dim">换上 {result.fishName}。超重的不能换。</p>
            {save.basket.map((b) => {
              const def = FISH_BY_ID[b.defId];
              const next = FISH_BY_ID[result.fishId ?? ""];
              if (!def || !next) return null;
              const ok = replaceWouldFit(save, b.uid, next);
              return (
                <button
                  key={b.uid}
                  disabled={!ok}
                  onClick={() => {
                    if (replaceBasketCatch(b.uid, next, fightPersonality)) {
                      setResult({ ...result, bag: "replaced" });
                      setPickingReplace(false);
                    }
                  }}
                >
                  <span className="row" style={{ alignItems: "center" }}>
                    <FishPortrait id={def.id} size={36} alt={def.name} />
                    {def.name} <QualityChip quality={def.quality} />
                    {ok ? "" : " · 超重"}
                  </span>
                </button>
              );
            })}
            <button onClick={() => setPickingReplace(false)}>返回</button>
          </div>
        </div>
      )}

      {phase === "result" && result && !result.escaped && result.fishId && result.bag !== "full" && !idleOn && (
        <div className="modal-backdrop" onPointerDown={(e) => e.stopPropagation()}>
          <div className="stage-card catch-card" onPointerDown={(e) => e.stopPropagation()} onClick={dismissCatchPopup}>
            <FishPortrait id={result.fishId} size={120} alt={result.fishName} />
            <strong>{result.fishName}</strong>
            <div className="catch-into">
              <GearIcon kind="basket" size={48} />
              <span>
                {result.bag === "replaced" ? "已换进鱼筐" : "已放入鱼筐"}
              </span>
            </div>
            <div className="dim">点击关闭</div>
          </div>
        </div>
      )}
    </div>
  );
}
