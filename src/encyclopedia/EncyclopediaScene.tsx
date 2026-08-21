import { useMemo, useState } from "react";
import { useGame } from "../store/gameStore";
import { FISH_DEFS } from "../data/fishDefs";
import { FishPortrait } from "../art/Art";
import { FISHERY_BY_ID } from "../data/fisheryDefs";
import { CONSUMABLE_BY_ID } from "../data/consumableDefs";
import { QUALITY_LABEL, QUALITY_ORDER, type Quality } from "../types";

export default function EncyclopediaScene() {
  const setScene = useGame((s) => s.setScene);
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [qualities, setQualities] = useState<Set<Quality>>(new Set());
  const [waters, setWaters] = useState<Set<string>>(new Set());
  const [baits, setBaits] = useState<Set<string>>(new Set());

  const waterOpts = useMemo(() => [...new Set(FISH_DEFS.map((f) => f.fisheryId))], []);
  const baitOpts = useMemo(() => [...new Set(FISH_DEFS.map((f) => f.preferredBaitId))], []);

  function toggle<T>(set: Set<T>, v: T, setter: (s: Set<T>) => void) {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    setter(n);
  }

  const visible = FISH_DEFS.filter((f) => {
    if (applied && !f.name.includes(applied)) return false;
    if (qualities.size && !qualities.has(f.quality)) return false;
    if (waters.size && !waters.has(f.fisheryId)) return false;
    if (baits.size && !baits.has(f.preferredBaitId)) return false;
    return true;
  });

  return (
    <div className="page">
      <div className="page-head">
        <button onClick={() => setScene("equipment")}>← 书籍</button>
        <h2>图鉴 · {FISH_DEFS.length}</h2>
      </div>
      <div className="search-bar">
        <input placeholder="搜索鱼名" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="primary" onClick={() => setApplied(query.trim())}>搜索</button>
        <button onClick={() => setShowFilter(true)}>筛选</button>
      </div>
      {showFilter && (
        <div className="modal-backdrop" onClick={() => setShowFilter(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">筛选（可多选）</div>
            <div className="dim">品质</div>
            <div className="row">
              {QUALITY_ORDER.map((q) => (
                <button key={q} className={qualities.has(q) ? "primary" : ""} onClick={() => toggle(qualities, q, setQualities)}>
                  {QUALITY_LABEL[q]}
                </button>
              ))}
            </div>
            <div className="dim">水域</div>
            <div className="row">
              {waterOpts.map((id) => (
                <button key={id} className={waters.has(id) ? "primary" : ""} onClick={() => toggle(waters, id, setWaters)}>
                  {FISHERY_BY_ID[id]?.name ?? id}
                </button>
              ))}
            </div>
            <div className="dim">饵食偏好</div>
            <div className="row">
              {baitOpts.map((id) => (
                <button key={id} className={baits.has(id) ? "primary" : ""} onClick={() => toggle(baits, id, setBaits)}>
                  {CONSUMABLE_BY_ID[id]?.name ?? id}
                </button>
              ))}
            </div>
            <button className="primary" onClick={() => setShowFilter(false)}>完成</button>
          </div>
        </div>
      )}
      <div className="page-body encyclopedia-grid">
        {visible.map((f) => {
          const fishery = FISHERY_BY_ID[f.fisheryId];
          const bait = CONSUMABLE_BY_ID[f.preferredBaitId];
          return (
            <div className="panel" key={f.id}>
              <div className="row-between">
                <strong>{f.name}</strong>
                <span className={`chip ${f.quality}`}>{QUALITY_LABEL[f.quality]}</span>
              </div>
              <div className="ency-art">
                <FishPortrait id={f.id} size={88} alt={f.name} />
              </div>
              <div className="dim" style={{ fontSize: 11 }}>
                <div>水域：{fishery?.name}</div>
                <div>偏好饵：{bait?.name}</div>
                <div>卖价：{f.sellPrice}金</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
