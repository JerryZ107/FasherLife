import { useMemo, useState } from "react";
import { useGame } from "../store/gameStore";
import { FISH_DEFS } from "../data/fishDefs";
import { FishPortrait } from "../art/Art";
import { FISHERY_BY_ID } from "../data/fisheryDefs";
import { CONSUMABLE_BY_ID } from "../data/consumableDefs";
import { QUALITY_LABEL, QUALITY_ORDER, type Quality } from "../types";
import { EmptyHint, ModalSheet, Page, PageBody, PageHead, QualityChip } from "../ui/chrome";
import { useUi } from "../store/uiStore";

export default function EncyclopediaScene() {
  const setScene = useGame((s) => s.setScene);
  const notifyQuest = useGame((s) => s.notifyQuest);
  const encycReturn = useUi((s) => s.encycReturn);
  const setEncycReturn = useUi((s) => s.setEncycReturn);
  const caughtFishIds = useGame((s) => s.save.caughtFishIds);
  const unlockedSet = useMemo(() => new Set(caughtFishIds), [caughtFishIds]);
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

  function leave() {
    notifyQuest("read_encyc");
    const back =
      encycReturn === "profile" || encycReturn === "equipment" || encycReturn === "aquarium"
        ? encycReturn
        : "aquarium";
    setEncycReturn(null);
    setScene(back);
  }

  const visible = FISH_DEFS.filter((f) => {
    if (applied && !f.name.includes(applied)) return false;
    if (qualities.size && !qualities.has(f.quality)) return false;
    if (waters.size && !waters.has(f.fisheryId)) return false;
    if (baits.size && !baits.has(f.preferredBaitId)) return false;
    return true;
  });

  const backLabel =
    encycReturn === "profile" ? "主页" : encycReturn === "equipment" ? "书籍" : "水族馆";

  return (
    <Page>
      <PageHead
        onBack={leave}
        backLabel={backLabel}
        title={`图鉴 · ${FISH_DEFS.length}`}
        backGuide="encyc-back"
      />
      <div className="search-bar">
        <input placeholder="搜索鱼名" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="primary" onClick={() => setApplied(query.trim())}>搜索</button>
        <button onClick={() => setShowFilter(true)}>筛选</button>
      </div>
      {showFilter && (
        <ModalSheet title="筛选（可多选）" onClose={() => setShowFilter(false)}>
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
        </ModalSheet>
      )}
      <PageBody className="encyclopedia-grid">
        {visible.length === 0 && <EmptyHint>没有符合条件的鱼</EmptyHint>}
        {visible.map((f) => {
          const fishery = FISHERY_BY_ID[f.fisheryId];
          const bait = CONSUMABLE_BY_ID[f.preferredBaitId];
          const unlocked = unlockedSet.has(f.id);
          return (
            <div className="panel ency-card" key={f.id}>
              <div className="row-between">
                <strong>{f.name}</strong>
                <QualityChip quality={f.quality} />
              </div>
              <div className="ency-art">
                <FishPortrait id={f.id} size={88} alt={f.name} locked={!unlocked} />
              </div>
              <div className="dim" style={{ fontSize: 11 }}>
                <div>水域：{fishery?.name}</div>
                <div>偏好饵：{bait?.name}</div>
                <div>卖价：{f.sellPrice}金</div>
              </div>
            </div>
          );
        })}
      </PageBody>
    </Page>
  );
}
