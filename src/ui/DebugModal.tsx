import { useState } from "react";
import { useGame } from "../store/gameStore";
import { useUi } from "../store/uiStore";
import { ModalSheet } from "./chrome";
import { GoldMark, PearlMark } from "./marks";

export default function DebugModal() {
  const save = useGame((s) => s.save);
  const setGameSpeed = useGame((s) => s.setGameSpeed);
  const setGold = useGame((s) => s.setGold);
  const setPearl = useGame((s) => s.setPearl);
  const closeDebug = useUi((s) => s.closeDebug);

  const [speed, setSpeed] = useState(String(save.gameSpeed));
  const [gold, setGoldV] = useState(String(save.gold));
  const [pearl, setPearlV] = useState(String(save.pearl));

  return (
    <ModalSheet title="调试面板" onClose={closeDebug} className="debug-layer">
      <div className="debug-panel">
        <div className="debug-row">
          <label className="debug-label">游戏时速</label>
          <span className="dim">现实 1 秒 = 多少游戏秒</span>
          <div className="row">
            <input
              className="debug-input"
              type="number"
              min={1}
              step={1}
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
            />
            <button
              className="primary"
              onClick={() => {
                const v = Number(speed);
                if (Number.isFinite(v) && v > 0) setGameSpeed(v);
              }}
            >
              应用
            </button>
          </div>
          <div className="dim">当前 {save.gameSpeed}（1=实时，86400=1秒1天）</div>
        </div>

        <div className="debug-row">
          <label className="debug-label">
            <GoldMark /> 金币
          </label>
          <div className="row">
            <input
              className="debug-input"
              type="number"
              min={0}
              step={10}
              value={gold}
              onChange={(e) => setGoldV(e.target.value)}
            />
            <button
              className="primary"
              onClick={() => {
                const v = Number(gold);
                if (Number.isFinite(v) && v >= 0) setGold(v);
              }}
            >
              设置
            </button>
          </div>
          <div className="dim">当前 {save.gold}</div>
        </div>

        <div className="debug-row">
          <label className="debug-label">
            <PearlMark /> 珍珠
          </label>
          <div className="row">
            <input
              className="debug-input"
              type="number"
              min={0}
              step={1}
              value={pearl}
              onChange={(e) => setPearlV(e.target.value)}
            />
            <button
              className="primary"
              onClick={() => {
                const v = Number(pearl);
                if (Number.isFinite(v) && v >= 0) setPearl(v);
              }}
            >
              设置
            </button>
          </div>
          <div className="dim">当前 {save.pearl}</div>
        </div>

        <button className="primary" onClick={closeDebug}>
          关闭
        </button>
      </div>
    </ModalSheet>
  );
}
