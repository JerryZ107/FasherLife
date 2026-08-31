import { useRef, useState, type PointerEvent } from "react";
import { useGame } from "../store/gameStore";
import { FISHERY_BY_ID } from "../data/fisheryDefs";
import SneakCanvas, { type SneakPhase } from "./SneakCanvas";
import { PageHead } from "../ui/chrome";

export default function SneakScene() {
  const save = useGame((s) => s.save);
  const fisheryId = useGame((s) => s.selectedFisheryId);
  const setScene = useGame((s) => s.setScene);
  const enterFishery = useGame((s) => s.enterFishery);
  const paySneakFine = useGame((s) => s.paySneakFine);
  const fishery = fisheryId ? FISHERY_BY_ID[fisheryId] : null;

  const [phase, setPhase] = useState<SneakPhase>("cg");
  const [hidden, setHidden] = useState(false);
  const stick = useRef({ dx: 0, dy: 0, active: false });
  const [, bump] = useState(0);

  const ticket = fishery?.entry.ticketPrice ?? 0;
  const card = fishery?.entry.cardPrice ?? 0;

  function onStick(e: PointerEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    stick.current.active = true;
    moveStick(e);
  }
  function moveStick(e: PointerEvent<HTMLDivElement>) {
    if (!stick.current.active) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = ((e.clientY - r.top) / r.height) * 2 - 1;
    const len = Math.hypot(x, y) || 1;
    const s = Math.min(1, len);
    stick.current.dx = (x / len) * s;
    stick.current.dy = (y / len) * s;
    bump((n) => n + 1);
  }
  function endStick() {
    stick.current = { dx: 0, dy: 0, active: false };
    bump((n) => n + 1);
  }

  return (
    <div className="sneak">
      <PageHead onBack={() => setScene("fishing_map")} backLabel="地图" title={`潜入 ${fishery?.name ?? ""}`} />
      <div className="sneak-field">
        <SneakCanvas
          phase={phase}
          stickRef={stick}
          outfitId={save.equippedOutfit}
          lookSex={save.lookSex}
          onLanded={() => setPhase("play")}
          onCaught={() => setPhase("caught")}
          onWin={() => setPhase("win")}
          onHiddenChange={setHidden}
        />
        {phase === "cg" && (
          <>
            <div className="sneak-cg sneak-cg-lite">
              <strong>翻墙而入</strong>
              <div className="dim">上墙 → 翻越 → 落地</div>
            </div>
            <button type="button" className="sneak-skip" onClick={() => setPhase("play")}>
              跳过
            </button>
          </>
        )}
        {phase === "play" && hidden && <div className="sneak-hidden">藏身中</div>}
        {phase === "play" && (
          <div className="sneak-hint">等锥光转开再冲 · 树后穿插 · 向上到钓鱼区</div>
        )}
        {phase === "play" && (
          <div
            className="joystick"
            onPointerDown={onStick}
            onPointerMove={moveStick}
            onPointerUp={endStick}
            onPointerCancel={endStick}
          >
            <div
              className="joystick-knob"
              style={{ transform: `translate(${stick.current.dx * 22}px, ${stick.current.dy * 22}px)` }}
            />
            <span>拇指摇杆</span>
          </div>
        )}
      </div>
      {phase === "caught" && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-title">被抓住了</div>
            <p className="dim">交罚款、补票或办月卡，选一个。</p>
            <p>钱包：{save.gold} 金</p>
            <button onClick={() => {
              if (paySneakFine(fisheryId ?? "")) setScene("fishing_map");
            }}>交罚款 {ticket} 金（回地图）</button>
            <button className="primary" onClick={() => {
              if (fisheryId && enterFishery(fisheryId, "ticket")) setScene("fishing");
            }}>补门票 {ticket} 金</button>
            <button onClick={() => {
              if (fisheryId && enterFishery(fisheryId, "card")) setScene("fishing");
            }}>办月卡 {card} 金</button>
          </div>
        </div>
      )}
      {phase === "win" && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-title">溜进去了</div>
            <p className="dim">没被发现，直接进钓鱼区。</p>
            <button className="primary" onClick={() => {
              if (fisheryId && enterFishery(fisheryId, "sneak")) setScene("fishing");
            }}>开始钓鱼</button>
          </div>
        </div>
      )}
    </div>
  );
}
