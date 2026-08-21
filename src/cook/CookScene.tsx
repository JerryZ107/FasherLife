import { useState } from "react";
import { useGame } from "../store/gameStore";
import { FISH_BY_ID } from "../data/fishDefs";
import { QUALITY_LABEL, type LoveView, type Sex } from "../types";
import { FishPortrait } from "../art/Art";
import { fishSex } from "../game/pairing";
import { cookRestore, ENERGY_DRINK_STAMINA, satietyMax, staminaCap } from "../game/stamina";
import FishTraitChips from "../ui/FishTraitChips";

type Row = {
  uid: string;
  from: "basket" | "tank";
  defId: string;
  label: string;
  pair: boolean;
  sex?: Sex;
  loveView?: LoveView;
};

export default function CookScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const cookFish = useGame((s) => s.cookFish);
  const drinkEnergy = useGame((s) => s.drinkEnergy);
  const drinkYuanqi = useGame((s) => s.drinkYuanqi);
  const [picked, setPicked] = useState<string | null>(null);

  const rows: Row[] = [];
  for (const b of save.basket) {
    rows.push({
      uid: b.uid,
      from: "basket",
      defId: b.defId,
      label: "鱼筐",
      pair: false,
      sex: b.sex,
      loveView: b.loveView,
    });
  }
  for (const f of save.tank) {
    if (f.dead) continue;
    const tankName = save.tanks.find((t) => t.id === f.tankId)?.name ?? "鱼缸";
    rows.push({
      uid: f.uid,
      from: "tank",
      defId: f.defId,
      label: tankName,
      pair: Boolean(f.pairId),
      sex: fishSex(f),
      loveView: f.loveView,
    });
  }

  const selected = rows.find((r) => r.uid === picked) ?? null;
  const first = save.firstCookDay !== save.gameDay;
  const restore = selected ? cookRestore(selected.defId, first) : 0;
  const cap = staminaCap(save.playerLevel);
  const meals = satietyMax(save.playerLevel);
  const left = Math.max(0, meals - save.satietyUsed);

  return (
    <div className="page">
      <div className="page-head">
        <button onClick={() => setScene("aquarium")}>← 返回</button>
        <h2>做菜</h2>
      </div>
      <div className="page-body">
        <div className="panel">
          <p>
            能量 {Math.floor(save.stamina)}/{cap} · 盐 {save.saltStock} · 饱腹 {left}/{meals}
            {save.yuanqiBottles > 0 ? ` · 元气瓶 ${save.yuanqiBottles}` : ""}
          </p>
          <p className="dim">选一条活鱼，扣 1 份盐。筐里缸里都能选；死鱼和卵不行。今日首次回复 +50%。</p>
          <div className="row" style={{ marginTop: 8 }}>
            <button disabled={(save.energyDrinkStock ?? 0) < 1} onClick={() => drinkEnergy()}>
              喝能量饮料（库存 {save.energyDrinkStock}，+{ENERGY_DRINK_STAMINA}）
            </button>
            <button disabled={(save.yuanqiBottles ?? 0) < 1} onClick={() => drinkYuanqi()}>
              喝元气瓶
            </button>
          </div>
        </div>
        {rows.length === 0 && <p className="dim" style={{ padding: 12 }}>没有可做的鱼。去钓鱼或看缸里还有没有活鱼。</p>}
        {rows.map((r) => {
          const def = FISH_BY_ID[r.defId];
          if (!def) return null;
          const on = picked === r.uid;
          return (
            <button
              key={r.uid}
              className={`panel row-between cook-pick ${on ? "panel-active" : ""}`}
              onClick={() => setPicked(on ? null : r.uid)}
            >
              <div className="row" style={{ alignItems: "center" }}>
                <FishPortrait id={def.id} size={40} alt={def.name} />
                <div style={{ textAlign: "left" }}>
                  <strong>{def.name}</strong>
                  <span className={`chip ${def.quality}`}>{QUALITY_LABEL[def.quality]}</span>
                  <FishTraitChips sex={r.sex} loveView={r.loveView} ownedBooks={save.ownedBooks} />
                  {r.pair && <span className="chip">配对中</span>}
                  <div className="dim">{r.label} · 做菜约 +{cookRestore(r.defId, first)} 能量</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="page-foot">
        <button
          className="primary"
          disabled={!selected || left <= 0 || save.saltStock < 1}
          onClick={() => {
            if (!selected) return;
            if (cookFish(selected.uid, selected.from)) setPicked(null);
          }}
        >
          {selected ? `做这道 · +${restore} 能量` : "先选一条鱼"}
        </button>
      </div>
    </div>
  );
}
