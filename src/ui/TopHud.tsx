import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGame } from "../store/gameStore";
import { askConfirm } from "../store/uiStore";
import { satietyHint, staminaCap, xpToNext } from "../game/stamina";
import { EnergyMark, GoldMark, PearlMark } from "./marks";

type HudPop = "sta" | "xp" | null;

export default function TopHud() {
  const save = useGame((s) => s.save);
  const account = useGame((s) => s.account);
  const logout = useGame((s) => s.logout);
  const [open, setOpen] = useState<HudPop>(null);
  const staBtnRef = useRef<HTMLButtonElement>(null);
  const idBtnRef = useRef<HTMLButtonElement>(null);
  const [popPos, setPopPos] = useState({ left: 0, top: 0, align: "center" as "left" | "center" });

  const cap = staminaCap(save.playerLevel);
  const sta = Math.floor(save.stamina);
  const staPct = cap > 0 ? Math.min(100, (save.stamina / cap) * 100) : 0;
  const name = save.playerName || account || "钓手";
  const maxed = save.playerLevel >= 30;
  const xpNeed = maxed ? 1 : xpToNext(save.playerLevel);
  const xpPct = maxed ? 100 : Math.min(100, (save.playerXp / xpNeed) * 100);
  const xpLabel = maxed ? "已满级" : `升级 ${save.playerXp}/${xpNeed}`;
  const mealHint = `盐 ${save.saltStock} · ${satietyHint(save)}`;

  useLayoutEffect(() => {
    if (!open) return;
    const anchor =
      open === "sta" ? staBtnRef.current : idBtnRef.current;
    if (!anchor) return;
    const sync = () => {
      const r = anchor.getBoundingClientRect();
      const margin = 8;
      setPopPos({
        left: Math.max(margin, r.left),
        top: r.bottom + 4,
        align: "left",
      });
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let armed = false;
    const armId = requestAnimationFrame(() => {
      armed = true;
    });
    const onPointerDown = (e: PointerEvent) => {
      if (!armed) return;
      const t = e.target as HTMLElement;
      if (t.closest(".hud-pop")) return;
      if (open === "xp" && t.closest(".hud-id")) return;
      if (open === "sta" && t.closest(".cur.energy")) return;
      setOpen(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      cancelAnimationFrame(armId);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <header className="topbar">
      <div className="hud-rail">
        <span className="hud-id-wrap">
          <button
            ref={idBtnRef}
            type="button"
            className="hud-id"
            onClick={() => setOpen((v) => (v === "xp" ? null : "xp"))}
          >
            <span className="hud-name">{name}</span>
            <span className="chip lv">Lv.{save.playerLevel}</span>
          </button>
        </span>
        <span className="hud-sta-wrap">
          <button
            ref={staBtnRef}
            type="button"
            className="cur energy"
            data-guide="top-stamina"
            title={mealHint}
            onClick={() => setOpen((v) => (v === "sta" ? null : "sta"))}
          >
            <EnergyMark />
            <span className="hp-track slim">
              <span className="hp-fill" style={{ width: `${staPct}%` }} />
            </span>
            <span className="cur-n">{sta}</span>
          </button>
        </span>
        <span className="cur gold" title="金币">
          <GoldMark />
          {save.gold}
        </span>
        <span className="cur pearl" title="珍珠">
          <PearlMark />
          {save.pearl}
        </span>
      </div>
      <div className="hud-rail hud-rail-end">
        <button
          className="pill ghost"
          onClick={() =>
            askConfirm({
              title: "退出登录",
              message: "确定退出当前账号？进度会留在这个号上。",
              confirmLabel: "退出登录",
              danger: true,
              onConfirm: logout,
            })
          }
        >
          退出登录
        </button>
      </div>
      {open &&
        createPortal(
          <div
            className={`hud-pop hud-pop-fixed is-anchor-left${open === "xp" ? " hud-xp-pop" : ""}`}
            role="status"
            style={{
              left: popPos.left,
              top: popPos.top,
            }}
          >
            {open === "xp" ? (
              <>
                <span>{xpLabel}</span>
                <span className="hp-track hud-xp-track">
                  <span className="hp-fill xp" style={{ width: `${xpPct}%` }} />
                </span>
              </>
            ) : (
              <>
                <span>体力 {sta}/{cap}</span>
                <span className="dim">{mealHint}</span>
              </>
            )}
          </div>,
          document.body,
        )}
    </header>
  );
}
