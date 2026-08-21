import { useState } from "react";
import { useGame } from "../store/gameStore";
import { FISH_BY_ID } from "../data/fishDefs";
import { QUALITY_LABEL } from "../types";
import { BASKET_BY_ID } from "../data/equipmentDefs";
import { basketWeightKg } from "../game/weight";
import { occupancy } from "../game/tanks";
import { FishPortrait, GearIcon } from "../art/Art";
import FishTraitChips from "../ui/FishTraitChips";

/** 水族馆「鱼筐」：筐里选中鱼，再点存入。 */
export default function StoreTankScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const putManyToTank = useGame((s) => s.putManyToTank);
  const releaseBasketMany = useGame((s) => s.releaseBasketMany);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const basket = BASKET_BY_ID[save.equipped.basket];
  const bw = basketWeightKg(save.basket);
  const used = occupancy(save, save.activeTankId);
  const cap = save.tanks.find((t) => t.id === save.activeTankId)?.capacity ?? 0;
  const uids = [...picked].filter((uid) => save.basket.some((b) => b.uid === uid));

  function toggle(uid: string) {
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(uid)) n.delete(uid);
      else n.add(uid);
      return n;
    });
  }

  return (
    <div className="page">
      <div className="page-head">
        <button onClick={() => setScene("aquarium")}>← 水族馆</button>
        <h2>鱼筐</h2>
        <GearIcon kind="basket" size={28} />
        <button
          style={{ marginLeft: "auto" }}
          disabled={save.basket.length === 0}
          onClick={() => {
            if (picked.size === save.basket.length) setPicked(new Set());
            else setPicked(new Set(save.basket.map((b) => b.uid)));
          }}
        >
          {picked.size === save.basket.length && save.basket.length > 0 ? "取消全选" : "全选"}
        </button>
      </div>
      <div className="dim" style={{ padding: "8px 12px" }}>
        {save.basket.length}/{basket?.capacity ?? 0} 条 · {bw.toFixed(1)}/{basket?.weightCap ?? 0}kg
        {" · "}当前缸 {used}/{cap}
        {" · "}点选鱼，再点存入或放生
      </div>
      <div className="page-body">
        {save.basket.length === 0 && <div className="dim" style={{ padding: 12 }}>鱼筐是空的，去钓鱼装满它</div>}
        {save.basket.map((b) => {
          const def = FISH_BY_ID[b.defId];
          if (!def) return null;
          const on = picked.has(b.uid);
          return (
            <button
              key={b.uid}
              className={`panel fish-pick ${on ? "picked" : ""}`}
              onClick={() => toggle(b.uid)}
            >
              <FishPortrait id={def.id} size={56} alt={def.name} />
              <span className="fish-pick-meta">
                <strong>{def.name}</strong>
                <span className={`chip ${def.quality}`}>{QUALITY_LABEL[def.quality]}</span>
                <FishTraitChips sex={b.sex} loveView={b.loveView} ownedBooks={save.ownedBooks} />
              </span>
              <span className="dim">{on ? "已选" : "点选"}</span>
            </button>
          );
        })}
      </div>
      <div className="page-foot">
        <button
          className="primary"
          disabled={uids.length === 0}
          onClick={() => {
            putManyToTank(uids);
            setPicked(new Set());
          }}
        >
          存入{uids.length > 0 ? ` ${uids.length} 条` : ""}
        </button>
        <button
          className="danger"
          disabled={uids.length === 0}
          onClick={() => {
            releaseBasketMany(uids);
            setPicked(new Set());
          }}
        >
          放生选中
        </button>
      </div>
    </div>
  );
}
