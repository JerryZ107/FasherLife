import { useMemo, useState, type ReactNode } from "react";
import { useGame } from "../store/gameStore";
import { FISH_BY_ID } from "../data/fishDefs";
import { QUALITY_LABEL, QUALITY_ORDER, type Quality } from "../types";
import { qualitySortRank } from "../game/weight";
import { FishPortrait } from "../art/Art";
import { tankSellPrice } from "../game/economy";

type Tab = "list" | "sell" | "buy";

export default function MarketScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const sellToMarket = useGame((s) => s.sellToMarket);
  const sellFromTank = useGame((s) => s.sellFromTank);
  const listFish = useGame((s) => s.listFish);
  const listFromTank = useGame((s) => s.listFromTank);
  const unlistListing = useGame((s) => s.unlistListing);
  const buyListing = useGame((s) => s.buyListing);
  const [tab, setTab] = useState<Tab>("list");
  const [filter, setFilter] = useState<Quality | "all">("all");
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [price, setPrice] = useState<Record<string, number>>({});
  const [filterOpen, setFilterOpen] = useState(false);

  const searching = Boolean(applied) || filter !== "all";

  function matchName(name: string, quality: Quality) {
    if (filter !== "all" && quality !== filter) return false;
    if (applied && !name.includes(applied)) return false;
    return true;
  }

  const basketFish = useMemo(() => {
    return save.basket
      .map((b) => ({ ...b, def: FISH_BY_ID[b.defId] }))
      .filter((f) => f.def && matchName(f.def.name, f.def.quality))
      .sort((a, b) => qualitySortRank(a.def.quality) - qualitySortRank(b.def.quality));
  }, [save.basket, filter, applied]);

  const tankFish = useMemo(() => {
    return save.tank
      .filter((f) => !f.dead)
      .map((f) => ({ ...f, def: FISH_BY_ID[f.defId] }))
      .filter((f) => f.def && matchName(f.def.name, f.def.quality))
      .sort((a, b) => qualitySortRank(a.def.quality) - qualitySortRank(b.def.quality));
  }, [save.tank, filter, applied]);

  const myListings = useMemo(() => {
    return save.listings
      .filter((l) => l.source === "player")
      .map((l) => ({ ...l, def: FISH_BY_ID[l.defId] }))
      .filter((l) => l.def && matchName(l.def.name, l.def.quality))
      .sort((a, b) => qualitySortRank(a.def.quality) - qualitySortRank(b.def.quality));
  }, [save.listings, filter, applied]);

  const listings = useMemo(() => {
    return save.listings
      .map((l) => ({ ...l, def: FISH_BY_ID[l.defId] }))
      .filter((l) => l.def && matchName(l.def.name, l.def.quality))
      .sort((a, b) => qualitySortRank(a.def.quality) - qualitySortRank(b.def.quality));
  }, [save.listings, filter, applied]);

  const emptyHint = tab === "buy"
    ? "没有符合条件的商品"
    : "筐里和缸里都没有符合条件的鱼";

  return (
    <div className="page">
      <div className="page-head">
        <button onClick={() => setScene("aquarium")}>← 返回</button>
        <h2>鱼行</h2>
      </div>
      <div className="split">
        <div className="split-left">
          {(["list", "sell", "buy"] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? "primary" : ""} onClick={() => setTab(t)}>
              {t === "list" ? "挂售" : t === "sell" ? "售卖" : "购买"}
            </button>
          ))}
          <p className="dim" style={{ fontSize: 11, padding: "0 4px" }}>
            {tab === "list" ? "卖给玩家" : tab === "sell" ? "卖给鱼行" : "鱼行和玩家都有"}
          </p>
        </div>
        <div className="split-right">
          <div className="search-bar">
            <input placeholder="搜索鱼名" value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="primary" onClick={() => setApplied(query.trim())}>搜索</button>
            <button onClick={() => setFilterOpen((v) => !v)}>筛选</button>
          </div>
          {filterOpen && (
            <div className="filter-pop">
              <div className="dim">品质</div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as Quality | "all")}
              >
                <option value="all">全部</option>
                {QUALITY_ORDER.map((q) => (
                  <option key={q} value={q}>{QUALITY_LABEL[q]}</option>
                ))}
              </select>
            </div>
          )}
          <div className="page-body" style={{ padding: 0 }}>
            {!searching && <div className="dim" style={{ padding: "4px 12px" }}>按品质从上到下</div>}
            {searching && <div className="dim" style={{ padding: "4px 12px" }}>搜索/筛选结果</div>}

            {tab === "list" && (
              <>
                <Section title="鱼筐" empty={basketFish.length === 0 && "筐里没有可挂售的鱼"}>
                  {basketFish.map((f) => (
                    <div className="panel market-row" key={f.uid}>
                      <FishPortrait id={f.def.id} size={40} alt={f.def.name} />
                      <div className="market-meta">
                        <strong>{f.def.name}</strong>
                        <span className={`chip ${f.def.quality}`}>{QUALITY_LABEL[f.def.quality]}</span>
                        <span className="chip">鱼筐</span>
                      </div>
                      <input
                        type="number"
                        value={price[f.uid] ?? f.def.sellPrice}
                        onChange={(e) => setPrice((p) => ({ ...p, [f.uid]: Number(e.target.value) }))}
                      />
                      <button className="primary" onClick={() => listFish(f.uid, price[f.uid] ?? f.def.sellPrice)}>挂售</button>
                    </div>
                  ))}
                </Section>
                <Section title="鱼缸" empty={tankFish.length === 0 && "缸里没有可挂售的鱼"}>
                  {tankFish.map((f) => {
                    const ask = tankSellPrice(f.def.sellPrice, f.health, false) ?? f.def.sellPrice;
                    return (
                    <div className="panel market-row" key={f.uid}>
                      <FishPortrait id={f.def.id} size={40} alt={f.def.name} />
                      <div className="market-meta">
                        <strong>{f.def.name}</strong>
                        <span className={`chip ${f.def.quality}`}>{QUALITY_LABEL[f.def.quality]}</span>
                        <span className="chip">鱼缸</span>
                        <span className="dim">健康 {f.health}</span>
                      </div>
                      <input
                        type="number"
                        value={price[f.uid] ?? ask}
                        onChange={(e) => setPrice((p) => ({ ...p, [f.uid]: Number(e.target.value) }))}
                      />
                      <button className="primary" onClick={() => listFromTank(f.uid, price[f.uid] ?? ask)}>挂售</button>
                    </div>
                    );
                  })}
                </Section>
                <Section title="我的挂售" empty={myListings.length === 0 && "还没有挂在鱼行的鱼"}>
                  {myListings.map((l) => (
                    <div className="panel market-row" key={l.uid}>
                      <FishPortrait id={l.def.id} size={40} alt={l.def.name} />
                      <div className="market-meta">
                        <strong>{l.kind === "egg" ? `鱼卵（${l.def.name}）` : l.def.name}</strong>
                        <span className={`chip ${l.def.quality}`}>{QUALITY_LABEL[l.def.quality]}</span>
                        {l.kind === "egg" && <span className="chip">鱼卵</span>}
                        <span className="chip ok">我的挂售</span>
                        <div className="dim">{l.price}金</div>
                      </div>
                      <button onClick={() => unlistListing(l.uid)}>下架</button>
                    </div>
                  ))}
                </Section>
              </>
            )}

            {tab === "sell" && (
              <>
                <Section title="鱼筐" empty={basketFish.length === 0 && "筐里没有可售卖的鱼"}>
                  {basketFish.map((f) => (
                    <div className="panel market-row" key={f.uid}>
                      <FishPortrait id={f.def.id} size={40} alt={f.def.name} />
                      <div className="market-meta">
                        <strong>{f.def.name}</strong>
                        <span className={`chip ${f.def.quality}`}>{QUALITY_LABEL[f.def.quality]}</span>
                        <span className="chip">鱼筐</span>
                      </div>
                      <button className="primary" onClick={() => sellToMarket(f.uid)}>售卖 {f.def.sellPrice}金</button>
                    </div>
                  ))}
                </Section>
                <Section title="鱼缸" empty={tankFish.length === 0 && "缸里没有可售卖的鱼"}>
                  {tankFish.map((f) => {
                    const ask = tankSellPrice(f.def.sellPrice, f.health, false) ?? f.def.sellPrice;
                    return (
                    <div className="panel market-row" key={f.uid}>
                      <FishPortrait id={f.def.id} size={40} alt={f.def.name} />
                      <div className="market-meta">
                        <strong>{f.def.name}</strong>
                        <span className={`chip ${f.def.quality}`}>{QUALITY_LABEL[f.def.quality]}</span>
                        <span className="chip">鱼缸</span>
                        <span className="dim">健康 {f.health}</span>
                      </div>
                      <button className="primary" onClick={() => sellFromTank(f.uid)}>售卖 {ask}金</button>
                    </div>
                    );
                  })}
                </Section>
              </>
            )}

            {tab === "buy" && listings.map((l) => {
              const mine = l.source === "player";
              return (
                <div className="panel market-row" key={l.uid}>
                  <FishPortrait id={l.def.id} size={40} alt={l.def.name} />
                  <div className="market-meta">
                    <strong>{l.kind === "egg" ? `鱼卵（${l.def.name}）` : l.def.name}</strong>
                    <span className={`chip ${l.def.quality}`}>{QUALITY_LABEL[l.def.quality]}</span>
                    {l.kind === "egg" && <span className="chip">鱼卵</span>}
                    <span className={`chip ${mine ? "ok" : ""}`}>{mine ? "我的挂售" : "鱼行"}</span>
                  </div>
                  {mine ? (
                    <button onClick={() => unlistListing(l.uid)}>下架</button>
                  ) : (
                    <button disabled={save.gold < l.price} onClick={() => buyListing(l.uid)}>购买 {l.price}金</button>
                  )}
                </div>
              );
            })}

            {tab === "buy" && listings.length === 0 && <div className="dim" style={{ padding: 12 }}>{emptyHint}</div>}
            {tab === "sell" && basketFish.length === 0 && tankFish.length === 0 && (
              <div className="dim" style={{ padding: 12 }}>{emptyHint}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: string | false;
  children: ReactNode;
}) {
  const hasKids = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="market-section">
      <div className="market-sec-title">{title}</div>
      {hasKids ? children : empty ? <div className="dim" style={{ padding: "0 12px 8px" }}>{empty}</div> : null}
    </div>
  );
}
