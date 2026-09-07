import { useEffect, useState } from "react";
import { useGame } from "../store/gameStore";
import { FISH_BY_ID } from "../data/fishDefs";
import { ALL_TANKS, occupancy } from "../game/tanks";
import { cookRestore } from "../game/stamina";
import { fishTitle } from "../game/affection";
import { FishPortrait } from "../art/Art";
import FishTraitChips from "../ui/FishTraitChips";
import { SexIcon, IcoList } from "../ui/marks";
import { EmptyHint, GoodsRow, Page, PageBody, PageFoot, PageHead, QualityChip, GrowthStageChip, TabBar } from "../ui/chrome";
import { askConfirm, useUi } from "../store/uiStore";

type Tab = "basket" | "cook" | "list" | "sell";

const STORE_TABS: { id: Tab; label: string; guide?: string }[] = [
  { id: "basket", label: "存缸", guide: "tab-store" },
  { id: "cook", label: "做菜", guide: "tab-cook" },
  { id: "list", label: "挂售" },
  { id: "sell", label: "销售", guide: "sell-fish" },
];

/** 水族馆「鱼筐」：存缸 / 做菜 / 挂售 / 销售。 */
export default function StoreTankScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const putManyToTank = useGame((s) => s.putManyToTank);
  const setActiveTank = useGame((s) => s.setActiveTank);
  const cookFish = useGame((s) => s.cookFish);
  const listMany = useGame((s) => s.listMany);
  const sellManyToMarket = useGame((s) => s.sellManyToMarket);
  const showToast = useUi((s) => s.showToast);
  const storeTabPref = useUi((s) => s.storeTabPref);
  const clearStoreTabPref = useUi((s) => s.clearStoreTabPref);
  const [tab, setTab] = useState<Tab>("basket");
  const [tankFilter, setTankFilter] = useState(save.activeTankId);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const setStoreTab = useUi((s) => s.setStoreTab);

  useEffect(() => {
    if (!storeTabPref) return;
    if (storeTabPref === "basket" || storeTabPref === "cook") setTab(storeTabPref);
    clearStoreTabPref();
  }, [storeTabPref, clearStoreTabPref]);

  useEffect(() => {
    setStoreTab(tab);
    return () => setStoreTab(null);
  }, [tab, setStoreTab]);

  const basketUids = [...picked].filter((uid) => save.basket.some((b) => b.uid === uid));
  const firstCook = save.firstCookDay !== save.gameDay;
  const noSalt = save.saltStock < 1;
  const tankLive = save.tank.filter((f) => !f.dead).length;

  function toggle(uid: string) {
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(uid)) n.delete(uid);
      else n.add(uid);
      return n;
    });
  }

  function switchTab(next: Tab) {
    setTab(next);
    setPicked(new Set());
  }

  function showTank(id: string) {
    if (id === tankFilter) return;
    setPicked(new Set());
    setTankFilter(id);
    if (id !== ALL_TANKS) setActiveTank(id);
  }

  function toggleAll() {
    if (allOn) setPicked(new Set());
    else setPicked(new Set(save.basket.map((b) => b.uid)));
  }

  function cook(uid: string) {
    if (noSalt) {
      showToast("没有盐，去商城买");
      return;
    }
    cookFish(uid, "basket");
  }

  const allOn = save.basket.length > 0 && picked.size === save.basket.length;
  const pickTab = tab === "basket" || tab === "list" || tab === "sell";
  const tankTabs = [
    { id: ALL_TANKS, label: "全部" },
    ...save.tanks.map((t) => ({
      id: t.id,
      label: `${t.name} ${occupancy(save, t.id)}/${t.capacity}`,
    })),
  ];
  return (
    <Page>
      <PageHead onBack={() => setScene("aquarium")} backLabel="水族馆" title="鱼筐" backGuide="back-aquarium" />
      <TabBar items={STORE_TABS} value={tab} onChange={switchTab} />
      {pickTab && (
        <TabBar tankScroll items={tankTabs} value={tankFilter} onChange={showTank} />
      )}
      <PageBody>
        {tab === "cook" && (
          <>
            <div className="panel">
              <p>盐 {save.saltStock}</p>
              <p className="dim">用筐里的鱼 + 盐做菜。去背包页吃，能量不会马上加。</p>
              {noSalt && <p className="dim">没有盐，去商城买。</p>}
            </div>
            {save.basket.length === 0 && (
              <EmptyHint>
                {tankLive > 0 ? "筐是空的，回馆点「鱼缸」把缸里的鱼存进来。" : "筐是空的，去钓鱼。"}
              </EmptyHint>
            )}
            {save.basket.map((r, i) => {
              const def = FISH_BY_ID[r.defId];
              if (!def) return null;
              return (
                <GoodsRow
                  key={r.uid}
                  icon={<FishPortrait id={def.id} size={40} alt={def.name} />}
                  title={def.name}
                  quality={def.quality}
                  hint={`做成菜约 +${cookRestore(r.defId, firstCook)} 能量`}
                  action={
                    <button className="primary" data-guide={i === 0 ? "cook-fish" : undefined} onClick={() => cook(r.uid)}>
                      做成菜
                    </button>
                  }
                />
              );
            })}
          </>
        )}

        {pickTab && save.basket.length === 0 && <EmptyHint>鱼筐是空的</EmptyHint>}
        {pickTab && save.basket.map((b) => {
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
                <strong>{fishTitle(b)}{b.sex ? <><SexIcon sex={b.sex} /> <GrowthStageChip healthMax={b.healthMax} /></> : null}</strong>
                <QualityChip quality={def.quality} />
                <FishTraitChips sex={b.sex} loveView={b.loveView} ownedBooks={save.ownedBooks} />
              </span>
              <span className="dim">{on ? "已选" : "点选"}</span>
            </button>
          );
        })}
      </PageBody>
      {tab === "basket" && (
        <PageFoot>
          <div className="foot-row">
            <button disabled={save.basket.length === 0} onClick={toggleAll}>
              {allOn ? "取消" : "全选"}
            </button>
            <button
              className="primary span-2"
              data-guide="store-to-tank"
              disabled={basketUids.length === 0}
              onClick={() => {
                putManyToTank(basketUids);
                setPicked(new Set());
              }}
            >
              存缸{basketUids.length > 0 ? ` ${basketUids.length}` : ""}
            </button>
          </div>
        </PageFoot>
      )}
      {tab === "list" && (
        <PageFoot>
          <div className="foot-row">
            <button disabled={save.basket.length === 0} onClick={toggleAll}>
              {allOn ? "取消" : "全选"}
            </button>
            <button
              className="primary span-2"
              disabled={basketUids.length === 0}
              onClick={() =>
                askConfirm({
                  title: "确认挂售",
                  message: `确定把选中的 ${basketUids.length} 条鱼挂到鱼行？`,
                  confirmLabel: "挂售",
                  onConfirm: () => {
                    listMany(basketUids);
                    setPicked(new Set());
                  },
                })
              }
            >
              <IcoList />挂售{basketUids.length > 0 ? ` ${basketUids.length}` : ""}
            </button>
          </div>
        </PageFoot>
      )}
      {tab === "sell" && (
        <PageFoot>
          <div className="foot-row">
            <button disabled={save.basket.length === 0} onClick={toggleAll}>
              {allOn ? "取消" : "全选"}
            </button>
            <button
              className="primary span-2"
              data-guide="sell-fish"
              disabled={basketUids.length === 0}
              onClick={() =>
                askConfirm({
                  title: "确认销售",
                  message: `立刻卖掉选中的 ${basketUids.length} 条鱼？`,
                  confirmLabel: "销售",
                  onConfirm: () => {
                    sellManyToMarket(basketUids);
                    setPicked(new Set());
                  },
                })
              }
            >
              销售{basketUids.length > 0 ? ` ${basketUids.length}` : ""}
            </button>
          </div>
        </PageFoot>
      )}
    </Page>
  );
}
