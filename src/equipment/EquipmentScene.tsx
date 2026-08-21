import { useState } from "react";
import { useGame } from "../store/gameStore";
import { PART_BY_ID, PART_DEFS, ROD_BY_ID, STOOL_BY_ID, BASKET_BY_ID } from "../data/equipmentDefs";
import { CONSUMABLE_BY_ID, CONSUMABLE_DEFS, foodIdFromBait } from "../data/consumableDefs";
import { OUTFIT_DEFS } from "../data/outfitDefs";
import { BOOK_DEFS } from "../data/bookDefs";
import { QUALITY_LABEL, ROD_PART_DESC, ROD_PART_LABEL, ROD_PART_SLOTS, type RodPartSlot } from "../types";
import { basketWeightKg } from "../game/weight";
import { GearIcon } from "../art/Art";
import PersonView from "../art/PersonView";

type Tab = "rod" | "bait" | "stool" | "basket" | "outfit" | "book";

export default function EquipmentScene() {
  const save = useGame((s) => s.save);
  const equip = useGame((s) => s.equip);
  const equipPart = useGame((s) => s.equipPart);
  const equipOutfit = useGame((s) => s.equipOutfit);
  const setLookSex = useGame((s) => s.setLookSex);
  const toggleTripBait = useGame((s) => s.toggleTripBait);
  const setScene = useGame((s) => s.setScene);
  const [tab, setTab] = useState<Tab>("rod");
  const [rodInspect, setRodInspect] = useState<string | null>(null);
  const [swapSlot, setSwapSlot] = useState<RodPartSlot | null>(null);

  const basket = BASKET_BY_ID[save.equipped.basket];
  const trip = save.equippedBaitIds ?? [save.equipped.bait];
  const bw = basketWeightKg(save.basket);

  const slotParts = (slot: RodPartSlot) =>
    PART_DEFS.filter((p) => p.slot === slot && save.ownedParts.includes(p.id));

  return (
    <div className="page">
      <div className="page-head">
        <button onClick={() => setScene("aquarium")}>← 返回</button>
        <h2>装备</h2>
      </div>
      <div className="tabrow wrap">
        {([
          ["rod", "鱼竿"],
          ["bait", "鱼饵"],
          ["stool", "板凳"],
          ["basket", "鱼筐"],
          ["outfit", "服装"],
          ["book", "书籍"],
        ] as [Tab, string][]).map(([t, l]) => (
          <button key={t} className={tab === t ? "primary" : ""} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>
      <div className="page-body">
        {tab === "rod" && (
          <>
            {save.ownedRods.map((id) => {
              const r = ROD_BY_ID[id];
              return (
                <button
                  key={id}
                  className={`panel fish-pick ${save.equipped.rod === id ? "picked" : ""}`}
                  onClick={() => {
                    equip("rod", id);
                    setRodInspect(id);
                  }}
                >
                  <GearIcon kind="rod" size={48} />
                  <span className="fish-pick-meta">
                    <strong>{r.name}</strong>
                    <span className={`chip ${r.quality}`}>{QUALITY_LABEL[r.quality]}</span>
                    {save.equipped.rod === id && <span className="dim">已装备 · 点开改装五件套</span>}
                  </span>
                </button>
              );
            })}
            {rodInspect && ROD_BY_ID[rodInspect] && (
              <div className="modal-backdrop" onClick={() => { setRodInspect(null); setSwapSlot(null); }}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-title">{ROD_BY_ID[rodInspect].name} · 五个组件</div>
                  <p className="dim">手杆对其余四件做系数增幅。改装换已拥有的散件。</p>
                  <div className="rod-parts">
                    {ROD_PART_SLOTS.map((slot) => {
                      const pid = save.equippedParts[slot];
                      const part = PART_BY_ID[pid];
                      return (
                        <div className="rod-part" key={slot}>
                          <div>
                            <strong>{ROD_PART_LABEL[slot]}</strong>
                            <div className="dim">{ROD_PART_DESC[slot]} · {part?.name ?? "—"}</div>
                          </div>
                          <button onClick={() => setSwapSlot(slot)}>改装</button>
                        </div>
                      );
                    })}
                  </div>
                  {swapSlot && (
                    <div className="panel" style={{ margin: "8px 0" }}>
                      <div className="dim">换成{ROD_PART_LABEL[swapSlot]}</div>
                      {slotParts(swapSlot).map((p) => (
                        <button
                          key={p.id}
                          className={save.equippedParts[swapSlot] === p.id ? "primary" : ""}
                          onClick={() => { equipPart(swapSlot, p.id); setSwapSlot(null); }}
                        >
                          {p.name} <span className={`chip ${p.quality}`}>{QUALITY_LABEL[p.quality]}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button className="primary" onClick={() => { setRodInspect(null); setSwapSlot(null); }}>关闭</button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "bait" && (
          <>
            <div className="panel dim">勾选出钓携带（可多选），高亮为当前下竿消耗的那一种。鱼食在本页下方切换，喂鱼用。</div>
            {Object.entries(save.baitStock).filter(([, n]) => n > 0).map(([id, n]) => {
              const c = CONSUMABLE_BY_ID[id];
              if (!c) return null;
              const inTrip = trip.includes(id);
              const active = save.equipped.bait === id;
              return (
                <div className="panel row-between" key={id}>
                  <div className="row" style={{ alignItems: "center" }}>
                    <GearIcon kind="bait" size={40} />
                    <div>
                      {c.name} ×{n} <span className={`chip ${c.quality}`}>{QUALITY_LABEL[c.quality]}</span>
                      <div className="dim">同品质鱼上钩加成；主偏饵再加成</div>
                    </div>
                  </div>
                  <div className="row">
                    <button className={inTrip ? "primary" : ""} onClick={() => toggleTripBait(id)}>
                      {inTrip ? "已携带" : "携带"}
                    </button>
                    <button className={active ? "primary" : ""} onClick={() => equip("bait", id)}>当前</button>
                  </div>
                </div>
              );
            })}
            <div className="panel dim">当前鱼食（水族馆喂食，不是鱼饵）</div>
            {CONSUMABLE_DEFS.filter((c) => (save.foodStock[foodIdFromBait(c.id)] ?? 0) > 0 || save.equipped.food === foodIdFromBait(c.id)).map((c) => {
              const fid = foodIdFromBait(c.id);
              const n = save.foodStock[fid] ?? 0;
              return (
                <div className="panel row-between" key={fid}>
                  <div>
                    {c.name}鱼食 ×{n} <span className={`chip ${c.quality}`}>{QUALITY_LABEL[c.quality]}</span>
                  </div>
                  <button className={save.equipped.food === fid ? "primary" : ""} onClick={() => equip("food", fid)}>
                    {save.equipped.food === fid ? "喂食用" : "设为当前"}
                  </button>
                </div>
              );
            })}
          </>
        )}

        {tab === "stool" && save.ownedStools.map((id) => {
          const s = STOOL_BY_ID[id];
          return (
            <button key={id} className={save.equipped.stool === id ? "primary" : ""} onClick={() => equip("stool", id)}>
              <GearIcon kind="stool" size={22} /> {s.name} · 玩家滑块 +{s.playerSliderBonus}
            </button>
          );
        })}

        {tab === "basket" && (
          <>
            <div className="panel dim">当前 {save.basket.length}/{basket?.capacity} 条 · {bw.toFixed(1)}/{basket?.weightCap}kg</div>
            {save.ownedBaskets.map((id) => {
              const b = BASKET_BY_ID[id];
              return (
                <button key={id} className={save.equipped.basket === id ? "primary" : ""} onClick={() => equip("basket", id)}>
                  <GearIcon kind="basket" size={22} /> {b.name}（{b.capacity}条 / {b.weightCap}kg）
                </button>
              );
            })}
          </>
        )}

        {tab === "outfit" && (
          <>
            <div className="panel">
              <div className="row-between">
                <strong>外观</strong>
                <span className="row">
                  <button className={save.lookSex === "male" ? "primary" : ""} onClick={() => setLookSex("male")}>男</button>
                  <button className={save.lookSex === "female" ? "primary" : ""} onClick={() => setLookSex("female")}>女</button>
                </span>
              </div>
              <PersonView outfitId={save.equippedOutfit} sex={save.lookSex} size={96} />
              <div className="dim">服装无属性，仅换外观；男女各一版。</div>
            </div>
            {OUTFIT_DEFS.filter((o) => save.ownedOutfits.includes(o.id)).map((o) => (
              <button key={o.id} className={save.equippedOutfit === o.id ? "primary" : ""} onClick={() => equipOutfit(o.id)}>
                {o.name} · 无属性仅外观
              </button>
            ))}
          </>
        )}

        {tab === "book" && (
          <>
            <div className="panel">
              <h2>可阅读书籍</h2>
              <button className="primary" onClick={() => setScene("encyclopedia")}>阅读图鉴</button>
            </div>
            {BOOK_DEFS.filter((b) => save.ownedBooks.includes(b.id)).map((b) => (
              <div className="panel" key={b.id}>
                <strong>{b.name}</strong>
                <div className="dim">{b.hint} · 持有即生效</div>
              </div>
            ))}
            {save.ownedBooks.length === 0 && <div className="panel dim">还没有增益书籍，去商城买。</div>}
          </>
        )}
      </div>
    </div>
  );
}
