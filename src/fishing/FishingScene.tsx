import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../store/gameStore";
import { FISHERY_BY_ID } from "../data/fisheryDefs";
import { CONSUMABLE_BY_ID } from "../data/consumableDefs";
import { BASKET_BY_ID } from "../data/equipmentDefs";
import { FISH_BY_ID } from "../data/fishDefs";
import { QUALITY_LABEL, type FishDef, type Personality } from "../types";
import { resolvedGear } from "../game/gear";
import { basketWeightKg } from "../game/weight";
import { replaceWouldFit } from "../game/fishingLogic";
import { useUi } from "../store/uiStore";
import FishingCanvas from "./FishingCanvas";
import { playBiteCue } from "./biteCue";
import { FishPortrait, GearIcon } from "../art/Art";
import { FISHING_SPOTS, initialNeighbors, tickNeighbors, type NeighborState } from "./neighbors";
import DockWorld, { panToSpotX, worldWidthPx, type Phase } from "./DockWorld";
import { rollPersonality } from "../game/traits";

export default function FishingScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const catchFish = useGame((s) => s.catchFish);
  const releaseBasket = useGame((s) => s.releaseBasket);
  const replaceBasketCatch = useGame((s) => s.replaceBasketCatch);
  const consumeBait = useGame((s) => s.consumeBait);
  const pickBiteFish = useGame((s) => s.pickBiteFish);
  const startIdle = useGame((s) => s.startIdle);
  const stopIdle = useGame((s) => s.stopIdle);
  const equip = useGame((s) => s.equip);
  const fisheryId = useGame((s) => s.selectedFisheryId);

  const idle = save.idle;
  const [phase, setPhase] = useState<Phase>(() => (idle ? "ready" : "pick"));
  const [spot, setSpot] = useState<string | null>(() => (idle ? "s2" : null));
  const [neighbors, setNeighbors] = useState<NeighborState[]>(initialNeighbors);
  const [showBasket, setShowBasket] = useState(false);
  const [showBait, setShowBait] = useState(false);
  const [pickingReplace, setPickingReplace] = useState(false);
  const [result, setResult] = useState<{
    escaped: boolean;
    bag?: "added" | "replaced" | "full";
    fishId?: string;
    fishName?: string;
  } | null>(null);
  const [fightFish, setFightFish] = useState<FishDef | null>(null);
  const [fightPersonality, setFightPersonality] = useState<Personality>("docile");
  const [progress, setProgress] = useState(30);
  const [holding, setHolding] = useState(false);
  const [pan, setPan] = useState(0);
  const [snapping, setSnapping] = useState(false);

  const [castPower, setCastPower] = useState(0.55);
  const [chargePower, setChargePower] = useState(0);
  const biteTimerRef = useRef<number | null>(null);
  const reactionTimerRef = useRef<number | null>(null);
  const castTimerRef = useRef<number | null>(null);
  const reelTimerRef = useRef<number | null>(null);
  const drag = useRef<{ x: number; y: number; pan: number; moved: boolean } | null>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  const fishery = fisheryId ? FISHERY_BY_ID[fisheryId] : null;
  const baitCount = save.baitStock[save.equipped.bait] ?? 0;
  const basket = BASKET_BY_ID[save.equipped.basket];
  const mods = useMemo(
    () => resolvedGear(save.equippedParts, save.equipped.stool, save.ownedBooks),
    [save.equippedParts, save.equipped.stool, save.ownedBooks],
  );
  const trip = save.equippedBaitIds ?? [save.equipped.bait];
  const bw = basketWeightKg(save.basket);
  const panLocked = phase === "minigame";
  const biteWindowMs = Math.max(3200, mods.reactionWindow + 1800);

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
    if (phase !== "bite" && phase !== "minigame") return;
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
    if (phase !== "waiting") return;
    cancelIdle();
    clearTimers();
    setPhase("reeling");
    reelTimerRef.current = window.setTimeout(() => nextCast(), 480);
  }

  function hook() {
    if (phase !== "bite") return;
    cancelIdle();
    clearTimers();
    const def = pickBiteFish();
    if (!def) return;
    setFightFish(def);
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
    if (phase === "result" && result && !result.escaped) {
      if (result.bag === "full") return;
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
      if (phase === "pick" || phase === "ready") {
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
    phase === "pick" ? "左右拖木板 · 点空位坐下"
    : idle ? "点空位换座会取消挂机 · 下滑收竿 · 返回离开"
    : phase === "ready" ? (baitCount > 0 ? "上滑甩杆，滑得越远漂越远 · 点空位换座" : "鱼饵用完了 · 点空位仍可换座")
    : phase === "casting" ? "甩杆中"
    : phase === "reeling" ? "收竿中"
    : phase === "waiting" ? "下滑收竿 · 左右拖看别人"
    : phase === "bite" ? "鱼上钩了！下滑收竿"
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
              if (phase === "minigame" || phase === "casting" || phase === "reeling" || phase === "bite") return;
              setShowBasket(false);
              setShowBait(true);
            }}
            disabled={phase === "minigame" || phase === "casting" || phase === "reeling" || phase === "bite"}
          >
            <GearIcon kind="bait" size={22} /> 换饵
          </button>
        )}
        {spot && phase !== "pick" && (
          <button
            className={idle ? "primary" : ""}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (idle) {
                stopIdle();
                return;
              }
              if (phase === "minigame" || phase === "casting" || phase === "reeling" || phase === "bite") return;
              clearTimers();
              setPhase("ready");
              startIdle();
            }}
          >
            {idle ? "✅挂机" : "挂机"}
          </button>
        )}
        {spot && phase !== "pick" && (
          <span className="chip stamina">能 {Math.floor(save.stamina)}</span>
        )}
      </div>

      <DockWorld
        pan={pan}
        snapping={snapping}
        phase={phase}
        spotId={spot}
        neighbors={neighbors}
        playerFishId={phase === "result" && result && !result.escaped ? result.fishId ?? null : null}
        playerEscaped={Boolean(result?.escaped)}
        onPickSpot={pickSpot}
        castPower={castPower}
        playerOutfitId={save.equippedOutfit}
        playerSex={save.lookSex}
        chargePower={chargePower}
      />

      {hint && phase !== "minigame" && phase !== "result" && !showBait && (
        <div className={`dock-hint ${phase === "bite" ? "accent" : ""}`}>
          {hint}
        </div>
      )}

      {showBasket && (
        <div className="basket-peek" onPointerDown={(e) => e.stopPropagation()}>
          <div className="row-between">
            <strong>鱼筐</strong>
            <span className="dim">{bw.toFixed(1)}/{basket?.weightCap}kg</span>
          </div>
          <p className="dim">点放生可把鱼放回水里</p>
          {save.basket.length === 0 && <div className="dim">空</div>}
          {save.basket.map((b) => {
            const def = FISH_BY_ID[b.defId];
            if (!def) return null;
            return (
              <div className="peek-fish" key={b.uid}>
                <FishPortrait id={def.id} size={36} alt={def.name} />
                <span>{def.name} <span className={`chip ${def.quality}`}>{QUALITY_LABEL[def.quality]}</span></span>
                <button
                  className="danger"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    releaseBasket(b.uid);
                  }}
                >
                  放生
                </button>
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
            <p className="dim">选出钓携带的一种，下竿会消耗它。</p>
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
            {trip.length === 0 && <p className="dim">没有携带鱼饵，去地图页勾选。</p>}
            <button onClick={() => setShowBait(false)}>关闭</button>
          </div>
        </div>
      )}

      {phase === "minigame" && fightFish && (
        <div className="minigame dock-minigame">
          <div className="row-between dock-fight-hud">
            <span className="row" style={{ alignItems: "center" }}>
              <FishPortrait id={fightFish.id} size={36} alt={fightFish.name} />
              搏斗：{fightFish.name} <span className={`chip ${fightFish.quality}`}>{QUALITY_LABEL[fightFish.quality]}</span>
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
            onPointerDown={(e) => { e.stopPropagation(); setHolding(true); }}
            onPointerUp={(e) => { e.stopPropagation(); setHolding(false); }}
          >
            拇指区 · 按住上拉
          </button>
        </div>
      )}

      {phase === "result" && result?.escaped && (
        <div className="dock-sheet" onPointerDown={(e) => e.stopPropagation()}>
          <div>鱼跑了……</div>
          <button className="primary" onClick={nextCast}>继续等下一条</button>
        </div>
      )}

      {phase === "result" && result && !result.escaped && result.fishId && result.bag === "full" && !pickingReplace && (
        <div className="modal-backdrop" onPointerDown={(e) => e.stopPropagation()}>
          <div className="modal" onPointerDown={(e) => e.stopPropagation()}>
            <div className="modal-title">鱼筐满了</div>
            <FishPortrait id={result.fishId} size={72} alt={result.fishName} />
            <p>钓到了 {result.fishName}。要换掉筐里的一条吗？</p>
            <button className="primary" onClick={() => setPickingReplace(true)}>替换</button>
            <button onClick={nextCast}>放生这条</button>
          </div>
        </div>
      )}

      {phase === "result" && result && !result.escaped && result.fishId && result.bag === "full" && pickingReplace && (
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
                    {def.name} <span className={`chip ${def.quality}`}>{QUALITY_LABEL[def.quality]}</span>
                    {ok ? "" : " · 超重"}
                  </span>
                </button>
              );
            })}
            <button onClick={() => setPickingReplace(false)}>返回</button>
          </div>
        </div>
      )}

      {phase === "result" && result && !result.escaped && result.fishId && result.bag !== "full" && (
        <div className="modal-backdrop" onPointerDown={() => nextCast()}>
          <div className="stage-card catch-card">
            <FishPortrait id={result.fishId} size={120} alt={result.fishName} />
            <strong>{result.fishName}</strong>
            <div className="catch-into">
              <GearIcon kind="basket" size={48} />
              <span>
                {result.bag === "replaced" ? "已换进鱼筐" : "已放入鱼筐"}
              </span>
            </div>
            <div className="dim">点任意处继续</div>
          </div>
        </div>
      )}
    </div>
  );
}
