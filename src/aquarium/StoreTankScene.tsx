import { useEffect, useState } from "react";
import { useGame } from "../store/gameStore";
import { FISH_BY_ID } from "../data/fishDefs";
import { ALL_TANKS, livingInFilter, occupancy } from "../game/tanks";
import { fishSex } from "../game/pairing";
import { cookRestore } from "../game/stamina";
import { FishPortrait } from "../art/Art";
import FishTraitChips from "../ui/FishTraitChips";
import { SexIcon } from "../ui/marks";
import { EmptyHint, GoodsRow, HealthBar, Page, PageBody, PageFoot, PageHead, QualityChip, TabBar } from "../ui/chrome";
import { useUi } from "../store/uiStore";

type Tab = "basket" | "cook" | "tank";

/** 水族馆「鱼筐」：存缸 / 做菜 / 鱼缸（缸鱼存回筐）。 */
export default function StoreTankScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const putManyToTank = useGame((s) => s.putManyToTank);
  const putTankToBasket = useGame((s) => s.putTankToBasket);
  const setActiveTank = useGame((s) => s.setActiveTank);
  const cookFish = useGame((s) => s.cookFish);
  const showToast = useUi((s) => s.showToast);
  const storeTabPref = useUi((s) => s.storeTabPref);
  const clearStoreTabPref = useUi((s) => s.clearStoreTabPref);
  const [tab, setTab] = useState<Tab>("basket");
  const [tankFilter, setTankFilter] = useState(save.activeTankId);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const setStoreTab = useUi((s) => s.setStoreTab);

  useEffect(() => {
    if (!storeTabPref) return;
    setTab(storeTabPref);
    clearStoreTabPref();
  }, [storeTabPref, clearStoreTabPref]);

  useEffect(() => {
    setStoreTab(tab);
    return () => setStoreTab(null);
  }, [tab, setStoreTab]);

  const living = livingInFilter(save, tankFilter);
  const basketUids = [...picked].filter((uid) => save.basket.some((b) => b.uid === uid));
  const tankUids = [...picked].filter((uid) => living.some((f) => f.uid === uid));
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
    if (tab === "tank") setPicked(new Set());
    setTankFilter(id);
    if (id !== ALL_TANKS) setActiveTank(id);
  }

  function toggleAll() {
    if (allOn) setPicked(new Set());
    else if (tab === "basket") setPicked(new Set(save.basket.map((b) => b.uid)));
    else setPicked(new Set(living.map((f) => f.uid)));
  }

  function cook(uid: string) {
    if (noSalt) {
      showToast("没有盐，去商城买");
      return;
    }
    cookFish(uid, "basket");
  }

  const list = tab === "basket" ? save.basket : living;
  const allOn = tab === "basket"
    ? save.basket.length > 0 && picked.size === save.basket.length
    : living.length > 0 && tankUids.length === living.length;
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
      <TabBar
        items={[
          { id: "basket", label: "存缸", guide: "tab-store" },
          { id: "cook", label: "做菜", guide: "tab-cook" },
          { id: "tank", label: "鱼缸", guide: "tab-basket" },
        ]}
        value={tab}
        onChange={switchTab}
      />
      {(tab === "basket" || tab === "tank") && (
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
                {tankLive > 0 ? "筐是空的，先把缸里的鱼存进来。" : "筐是空的，去钓鱼。"}
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

        {tab === "basket" && save.basket.length === 0 && <EmptyHint>鱼筐是空的</EmptyHint>}
        {tab === "tank" && living.length === 0 && (
          <EmptyHint>{tankFilter === ALL_TANKS ? "还没有活鱼" : "这口缸还没有活鱼"}</EmptyHint>
        )}
        {tab === "basket" && save.basket.map((b) => {
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
                <strong>{def.name}{b.sex ? <SexIcon sex={b.sex} /> : null}</strong>
                <QualityChip quality={def.quality} />
                <FishTraitChips sex={b.sex} loveView={b.loveView} ownedBooks={save.ownedBooks} />
              </span>
              <span className="dim">{on ? "已选" : "点选"}</span>
            </button>
          );
        })}
        {tab === "tank" && living.map((f) => {
          const def = FISH_BY_ID[f.defId];
          if (!def) return null;
          const on = picked.has(f.uid);
          const tankName = save.tanks.find((t) => t.id === f.tankId)?.name;
          return (
            <button
              key={f.uid}
              className={`panel fish-pick ${on ? "picked" : ""}`}
              onClick={() => toggle(f.uid)}
            >
              <FishPortrait id={def.id} size={56} alt={def.name} />
              <span className="fish-pick-meta">
                <strong>{def.name} <SexIcon sex={fishSex(f)} /></strong>
                <QualityChip quality={def.quality} />
                {tankFilter === ALL_TANKS && tankName ? <span className="chip">{tankName}</span> : null}
                <FishTraitChips sex={fishSex(f)} loveView={f.loveView} ownedBooks={save.ownedBooks} />
                <HealthBar value={f.health} compact />
              </span>
              <span className="dim">{on ? "已选" : "点选"}</span>
            </button>
          );
        })}
      </PageBody>
      {(tab === "basket" || tab === "tank") && (
        <PageFoot>
          {tab === "basket" && (
            <div className="foot-row">
              <button disabled={list.length === 0} onClick={toggleAll}>
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
          )}
          {tab === "tank" && (
            <div className="foot-row">
              <button disabled={list.length === 0} onClick={toggleAll}>
                {allOn ? "取消" : "全选"}
              </button>
              <button
                className="primary span-2"
                data-guide="store-to-basket"
                disabled={tankUids.length === 0}
                onClick={() => {
                  if (putTankToBasket(tankUids)) setPicked(new Set());
                }}
              >
                存筐{tankUids.length > 0 ? ` ${tankUids.length}` : ""}
              </button>
            </div>
          )}
        </PageFoot>
      )}
    </Page>
  );
}
