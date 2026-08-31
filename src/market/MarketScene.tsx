import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useGame } from "../store/gameStore";
import { FISH_BY_ID } from "../data/fishDefs";
import { QUALITY_LABEL, QUALITY_ORDER, type Quality } from "../types";
import { qualitySortRank } from "../game/weight";
import { FishPortrait } from "../art/Art";
import { EmptyHint, Page, PageHead, QualityChip } from "../ui/chrome";
import { askConfirm, useUi } from "../store/uiStore";

type Tab = "sell" | "buy" | "list";

export default function MarketScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const sellToMarket = useGame((s) => s.sellToMarket);
  const unlistListing = useGame((s) => s.unlistListing);
  const buyListing = useGame((s) => s.buyListing);
  const [tab, setTab] = useState<Tab>("sell");
  const [filter, setFilter] = useState<Quality | "all">("all");
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const markGuideSellPrompted = useUi((s) => s.markGuideSellPrompted);
  const setMarketCurrentTab = useUi((s) => s.setMarketCurrentTab);

  useEffect(() => {
    setMarketCurrentTab(tab);
    return () => setMarketCurrentTab(null);
  }, [tab, setMarketCurrentTab]);

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

  const myListings = useMemo(() => {
    return save.listings
      .filter((l) => l.source === "player")
      .map((l) => ({ ...l, def: FISH_BY_ID[l.defId] }))
      .filter((l) => l.def && matchName(l.def.name, l.def.quality))
      .sort((a, b) => qualitySortRank(a.def.quality) - qualitySortRank(b.def.quality));
  }, [save.listings, filter, applied]);

  const shopListings = useMemo(() => {
    return save.listings
      .filter((l) => l.source === "market")
      .map((l) => ({ ...l, def: FISH_BY_ID[l.defId] }))
      .filter((l) => l.def && matchName(l.def.name, l.def.quality))
      .sort((a, b) => qualitySortRank(a.def.quality) - qualitySortRank(b.def.quality));
  }, [save.listings, filter, applied]);

  const otherListings = useMemo(() => {
    return save.listings
      .filter((l) => l.source === "other")
      .map((l) => ({ ...l, def: FISH_BY_ID[l.defId] }))
      .filter((l) => l.def && matchName(l.def.name, l.def.quality))
      .sort((a, b) => a.price - b.price);
  }, [save.listings, filter, applied]);

  return (
    <Page>
      <PageHead onBack={() => setScene("aquarium")} title="鱼行" backGuide="back-aquarium" />
      <div className="split">
        <div className="split-left">
          {(["buy", "sell", "list"] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? "tab is-on" : "tab"} data-guide={t === "buy" ? "market-tab-buy" : undefined} onClick={() => setTab(t)}>
              {t === "list" ? "挂售" : t === "sell" ? "售卖" : "购买"}
            </button>
          ))}
          <p className="dim" style={{ fontSize: 11, padding: "0 4px" }}>
            {tab === "list" ? "正在挂出的鱼" : tab === "sell" ? "只卖鱼筐里的鱼" : "鱼行和其他钓友"}
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
                {myListings.length === 0 && <EmptyHint>您暂时未挂售鱼</EmptyHint>}
                {myListings.map((l) => (
                  <div className="panel market-row" key={l.uid}>
                    <FishPortrait id={l.def.id} size={40} alt={l.def.name} />
                    <div className="market-meta">
                      <strong>{l.kind === "egg" ? `鱼卵（${l.def.name}）` : l.def.name}</strong>
                      <QualityChip quality={l.def.quality} />
                      {l.kind === "egg" && <span className="chip">鱼卵</span>}
                      <div className="dim">{l.price}金</div>
                    </div>
                    <button
                      className="danger"
                      onClick={() =>
                        askConfirm({
                          title: "确认撤回",
                          message: `确定撤回「${l.kind === "egg" ? "鱼卵（" + l.def.name + "）" : l.def.name}」？${l.kind === "egg" ? "鱼卵会回到当前缸底。" : "鱼会回到鱼筐。"}`,
                          confirmLabel: "撤回",
                          danger: true,
                          onConfirm: () => unlistListing(l.uid),
                        })
                      }
                    >
                      撤回
                    </button>
                  </div>
                ))}
              </>
            )}

            {tab === "sell" && (
              <>
                {basketFish.length === 0 && <EmptyHint>筐里没有可售卖的鱼</EmptyHint>}
                {basketFish.map((f, i) => (
                  <div className="panel market-row" key={f.uid}>
                    <FishPortrait id={f.def.id} size={40} alt={f.def.name} />
                    <div className="market-meta">
                      <strong>{f.def.name}</strong>
                      <QualityChip quality={f.def.quality} />
                    </div>
                    <button
                      data-guide={i === 0 ? "sell-fish" : undefined}
                      className="primary"
                      onClick={() => {
                        markGuideSellPrompted();
                        askConfirm({
                          title: "确认售卖",
                          message: `确定把「${f.def.name}」卖给鱼行，获得 ${f.def.sellPrice} 金？卖出后无法找回。`,
                          confirmLabel: "售卖",
                          onConfirm: () => sellToMarket(f.uid),
                          onCancel: () => markGuideSellPrompted(),
                        });
                      }}
                    >
                      售卖 {f.def.sellPrice}金
                    </button>
                  </div>
                ))}
              </>
            )}

            {tab === "buy" && (
              <>
                <Section title="其他钓友" empty={otherListings.length === 0 && "暂时没有钓友挂便宜鱼"}>
                  {otherListings.map((l) => (
                    <div className="panel market-row" key={l.uid}>
                      <FishPortrait id={l.def.id} size={40} alt={l.def.name} />
                      <div className="market-meta">
                        <strong>{l.def.name}</strong>
                        <QualityChip quality={l.def.quality} />
                        <span className="chip ok">钓友</span>
                      </div>
                      <button data-guide={l.defId === "crucian" ? "buy-crucian" : undefined} disabled={save.gold < l.price} onClick={() => buyListing(l.uid)}>
                        购买 {l.price}金
                      </button>
                    </div>
                  ))}
                </Section>
                <Section title="鱼行" empty={shopListings.length === 0 && "鱼行暂时没货"}>
                  {shopListings.map((l) => (
                    <div className="panel market-row" key={l.uid}>
                      <FishPortrait id={l.def.id} size={40} alt={l.def.name} />
                      <div className="market-meta">
                        <strong>{l.kind === "egg" ? `鱼卵（${l.def.name}）` : l.def.name}</strong>
                        <QualityChip quality={l.def.quality} />
                        {l.kind === "egg" && <span className="chip">鱼卵</span>}
                        <span className="chip">鱼行</span>
                      </div>
                      <button data-guide={l.defId === "crucian" && !otherListings.some((o) => o.defId === "crucian") ? "buy-crucian" : undefined} disabled={save.gold < l.price} onClick={() => buyListing(l.uid)}>
                        购买 {l.price}金
                      </button>
                    </div>
                  ))}
                </Section>
              </>
            )}
          </div>
        </div>
      </div>
    </Page>
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
