import { useEffect, useRef, useState } from "react";
import { useUi } from "../store/uiStore";
import { ConfirmSheet, ModalSheet } from "./chrome";
import MonthlyGoldModal from "./MonthlyGoldModal";
import GuideOverlay from "./GuideOverlay";
import WelcomeModal from "./WelcomeModal";
import DebugModal from "./DebugModal";

const FAB_KEY = "fash-debug-fab-pos";
const FAB_SIZE = 36;
const FAB_MARGIN = 8;
const DRAG_THRESH = 10;

function loadFabPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(FAB_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { x?: number; y?: number };
    if (typeof p.x === "number" && typeof p.y === "number" && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      return { x: p.x, y: p.y };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function clampFab(x: number, y: number) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const maxX = Math.max(FAB_MARGIN, w - FAB_SIZE - FAB_MARGIN);
  const maxY = Math.max(FAB_MARGIN, h - FAB_SIZE - FAB_MARGIN);
  return {
    x: Math.min(maxX, Math.max(FAB_MARGIN, x)),
    y: Math.min(maxY, Math.max(FAB_MARGIN, y)),
  };
}

function defaultFabPos() {
  return clampFab(window.innerWidth - FAB_SIZE - 12, window.innerHeight - FAB_SIZE - 96);
}

function DebugFab() {
  const openDebug = useUi((s) => s.openDebug);
  const [pos, setPos] = useState(() => {
    const saved = loadFabPos();
    return saved ? clampFab(saved.x, saved.y) : defaultFabPos();
  });
  const drag = useRef<{
    ox: number;
    oy: number;
    sx: number;
    sy: number;
    moved: boolean;
    pid: number;
  } | null>(null);

  useEffect(() => {
    const onResize = () => setPos((p) => clampFab(p.x, p.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function onDown(e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = {
      ox: pos.x,
      oy: pos.y,
      sx: e.clientX,
      sy: e.clientY,
      moved: false,
      pid: e.pointerId,
    };
  }

  function onMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pid) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > DRAG_THRESH) d.moved = true;
    if (!d.moved) return;
    setPos(clampFab(d.ox + dx, d.oy + dy));
  }

  function onUp(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pid) return;
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (!d.moved) {
      openDebug();
      return;
    }
    setPos((p) => {
      const next = clampFab(p.x, p.y);
      try {
        localStorage.setItem(FAB_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <button
      type="button"
      className="debug-fab"
      title="调试面板（可拖动）"
      aria-label="调试面板"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <span className="debug-fab-dot" />
    </button>
  );
}

export default function HudOverlays() {
  const toast = useUi((s) => s.toast);
  const comingSoon = useUi((s) => s.comingSoon);
  const confirm = useUi((s) => s.confirm);
  const monthlyGoldOpen = useUi((s) => s.monthlyGoldOpen);
  const debugOpen = useUi((s) => s.debugOpen);
  const clearComingSoon = useUi((s) => s.clearComingSoon);
  const clearConfirm = useUi((s) => s.clearConfirm);

  return (
    <>
      <WelcomeModal />
      {comingSoon && (
        <ModalSheet title={comingSoon} onClose={clearComingSoon}>
            <p>这一项还没做进 Demo。</p>
            <button className="primary" onClick={clearComingSoon}>知道了</button>
        </ModalSheet>
      )}
      {confirm && (
        <ConfirmSheet
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          cancelLabel={confirm.cancelLabel}
          danger={confirm.danger}
          onClose={clearConfirm}
          onCancel={confirm.onCancel}
          onConfirm={confirm.onConfirm}
        />
      )}
      {monthlyGoldOpen && <MonthlyGoldModal />}
      <GuideOverlay />
      {debugOpen ? <DebugModal /> : <DebugFab />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
