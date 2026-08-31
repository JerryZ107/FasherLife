import { useState } from "react";
import { useGame } from "../store/gameStore";
import { askConfirm } from "../store/uiStore";
import { satietyHint, staminaCap, xpToNext } from "../game/stamina";
import { EnergyMark, GoldMark, PearlMark } from "./marks";

type HudPop = "id" | "sta" | null;

export default function TopHud() {
  const save = useGame((s) => s.save);
  const account = useGame((s) => s.account);
  const logout = useGame((s) => s.logout);
  const resumeGuide = useGame((s) => s.resumeGuide);
  const setScene = useGame((s) => s.setScene);
  const [open, setOpen] = useState<HudPop>(null);

  const cap = staminaCap(save.playerLevel);
  const sta = Math.floor(save.stamina);
  const staPct = cap > 0 ? Math.min(100, (save.stamina / cap) * 100) : 0;
  const name = save.playerName || account || "钓手";
  const xpHint = save.playerLevel >= 30 ? "满级" : `经验 ${save.playerXp}/${xpToNext(save.playerLevel)}`;
  const mealHint = `盐 ${save.saltStock} · ${satietyHint(save)}`;

  return (
    <header className="topbar">
      <div className="hud-rail">
        <button
          type="button"
          className="hud-id"
          title={xpHint}
          onClick={() => setOpen((v) => (v === "id" ? null : "id"))}
        >
          <span className="hud-name">{name}</span>
          <span className="chip lv">Lv.{save.playerLevel}</span>
        </button>
        <button
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
      {open === "id" && (
        <div className="hud-pop">
          <span>{xpHint}</span>
          <span>{mealHint}</span>
          <button
            type="button"
            className="hud-pop-link"
            onClick={() => {
              resumeGuide();
              setScene("aquarium");
              setOpen(null);
            }}
          >
            重温引导
          </button>
        </div>
      )}
      {open === "sta" && (
        <div className="hud-pop">
          <span>
            体力 {sta}/{cap}
          </span>
          <span>{mealHint}</span>
        </div>
      )}
    </header>
  );
}
