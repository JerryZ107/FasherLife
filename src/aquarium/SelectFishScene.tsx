import { useState, useEffect } from "react";
import { useGame } from "../store/gameStore";
import type { SaveData } from "../save/saveSchema";
import { FISH_BY_ID } from "../data/fishDefs";
import { FishPortrait } from "../art/Art";
import { FeedPanel } from "../ui/FeedPanel";
import { ALL_TANKS, capacityNeedForFishUids, livingInFilter, occupancy, tankHasRoom } from "../game/tanks";
import FishTraitChips from "../ui/FishTraitChips";
import { fishHealthMax } from "../game/growth";
import { fishTitle } from "../game/affection";
import { fishSex } from "../game/pairing";
import { SexIcon } from "../ui/marks";
import { EmptyHint, HealthBar, Page, PageBody, PageFoot, PageHead, QualityChip, GrowthStageChip, TabBar } from "../ui/chrome";
import { askConfirm, useUi } from "../store/uiStore";

type Sub = "feed" | "move" | "basket" | "list" | "sell" | "release";

const FISH_SUB_TABS: { id: Sub; label: string; guide?: string }[] = [
  { id: "feed", label: "喂食" },
  { id: "move", label: "换缸" },
  { id: "basket", label: "存筐", guide: "tab-basket" },
  { id: "list", label: "挂售" },
  { id: "sell", label: "销售" },
  { id: "release", label: "放生" },
];

function defaultSelectFishSub(save: SaveData): Sub {
  const tankLive = save.tank.filter((f) => !f.dead).length;
  if (save.questStep === "q_basket") return "basket";
  if (save.questStep === "q_sell" && save.basket.length === 0 && tankLive > 0) return "basket";
  return "feed";
}

export default function SelectFishScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const feedMany = useGame((s) => s.feedMany);
  const releaseMany = useGame((s) => s.releaseMany);
  const listManyFromTank = useGame((s) => s.listManyFromTank);
  const sellManyFromTank = useGame((s) => s.sellManyFromTank);
  const putTankToBasket = useGame((s) => s.putTankToBasket);
  const setActiveTank = useGame((s) => s.setActiveTank);
  const moveTankFish = useGame((s) => s.moveTankFish);
  const [sub, setSub] = useState<Sub>(() => defaultSelectFishSub(save));
  const [tankFilter, setTankFilter] = useState(save.activeTankId);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const feedPanelOpen = useUi((s) => s.feedPanelOpen);
  const setFeedPanelOpen = useUi((s) => s.setFeedPanelOpen);
  const setSelectFishGuide = useUi((s) => s.setSelectFishGuide);
  const clearSelectFishGuide = useUi((s) => s.clearSelectFishGuide);

  useEffect(() => () => setFeedPanelOpen(false), [setFeedPanelOpen]);

  const living = livingInFilter(save, tankFilter);
  const uids = [...picked].filter((uid) => living.some((f) => f.uid === uid));

  useEffect(() => {
    setSelectFishGuide(sub, uids.length > 0);
    return () => clearSelectFishGuide();
  }, [sub, uids.length, setSelectFishGuide, clearSelectFishGuide]);

  function toggle(uid: string) {
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(uid)) n.delete(uid);
      else n.add(uid);
      return n;
    });
  }

  function showTank(id: string) {
    if (id === tankFilter) return;
    setPicked(new Set());
    setFeedPanelOpen(false);
    setTankFilter(id);
    if (id !== ALL_TANKS) setActiveTank(id);
  }

  function toggleAll() {
    if (picked.size === living.length && living.length > 0) setPicked(new Set());
    else setPicked(new Set(living.map((f) => f.uid)));
  }

  const allOn = living.length > 0 && picked.size === living.length;
  const tankTabs = [
    { id: ALL_TANKS, label: "全部" },
    ...save.tanks.map((t) => ({
      id: t.id,
      label: `${t.name} ${occupancy(save, t.id)}/${t.capacity}`,
    })),
  ];
  const otherTanks = tankFilter === ALL_TANKS
    ? save.tanks
    : save.tanks.filter((t) => t.id !== tankFilter);

  return (
    <Page>
      <PageHead onBack={() => setScene("aquarium")} title="鱼缸" />
      <TabBar tankScroll items={tankTabs} value={tankFilter} onChange={showTank} />
      <TabBar
        tankScroll
        items={FISH_SUB_TABS}
        value={sub}
        onChange={(t) => {
          setSub(t);
          setPicked(new Set());
          setFeedPanelOpen(false);
        }}
      />
      <PageBody>
        {sub === "move" && (
          <p className="dim">选活鱼，再点目标缸。</p>
        )}
        {living.length === 0 && (
          <EmptyHint>{tankFilter === ALL_TANKS ? "还没有活鱼" : "这口缸还没有活鱼"}</EmptyHint>
        )}
        {living.map((f, i) => {
          const def = FISH_BY_ID[f.defId];
          if (!def) return null;
          const on = picked.has(f.uid);
          const tankName = save.tanks.find((t) => t.id === f.tankId)?.name;
          const guidePick = sub === "basket" && i === 0 ? "pick-tank-fish" : undefined;
          return (
            <button
              key={f.uid}
              className={`panel fish-pick ${on ? "picked" : ""}`}
              data-guide={guidePick}
              onClick={() => toggle(f.uid)}
            >
              <FishPortrait id={def.id} size={48} alt={fishTitle(f)} />
              <span className="fish-pick-meta attrs-row">
                <strong>{fishTitle(f)} <SexIcon sex={fishSex(f)} /> <GrowthStageChip healthMax={fishHealthMax(f)} /></strong>
                <QualityChip quality={def.quality} />
                {tankFilter === ALL_TANKS && tankName ? <span className="chip">{tankName}</span> : null}
                <FishTraitChips sex={fishSex(f)} loveView={f.loveView} ownedBooks={save.ownedBooks} />
                <HealthBar value={f.health} max={fishHealthMax(f)} compact />
              </span>
              <span className="dim">{on ? "已选" : "点选"}</span>
            </button>
          );
        })}
      </PageBody>
      <PageFoot>
        {sub === "feed" && (
          <div className="foot-row">
            <button disabled={living.length === 0} onClick={toggleAll}>
              {allOn ? "取消" : "全选"}
            </button>
            <button
              className="primary span-2"
              data-guide="feed-many"
              disabled={uids.length === 0}
              onClick={() => setFeedPanelOpen(true)}
            >
              喂食{uids.length > 0 ? ` ${uids.length}` : ""}
            </button>
          </div>
        )}
        {sub === "release" && (
          <div className="foot-row">
            <button disabled={living.length === 0} onClick={toggleAll}>
              {allOn ? "取消" : "全选"}
            </button>
            <button
              className="danger span-2"
              disabled={uids.length === 0}
              onClick={() =>
                askConfirm({
                  title: "确认放生",
                  message: `确定放生选中的 ${uids.length} 条鱼？放生后无法找回。`,
                  confirmLabel: "放生",
                  danger: true,
                  onConfirm: () => {
                    releaseMany(uids);
                    setPicked(new Set());
                  },
                })
              }
            >
              放生
            </button>
          </div>
        )}
        {sub === "list" && (
          <div className="foot-row">
            <button disabled={living.length === 0} onClick={toggleAll}>
              {allOn ? "取消" : "全选"}
            </button>
            <button
              className="primary span-2"
              disabled={uids.length === 0}
              onClick={() =>
                askConfirm({
                  title: "确认挂售",
                  message: `确定把选中的 ${uids.length} 条鱼挂到鱼行？`,
                  confirmLabel: "挂售",
                  onConfirm: () => {
                    listManyFromTank(uids);
                    setPicked(new Set());
                  },
                })
              }
            >
              挂售
            </button>
          </div>
        )}
        {sub === "sell" && (
          <div className="foot-row">
            <button disabled={living.length === 0} onClick={toggleAll}>
              {allOn ? "取消" : "全选"}
            </button>
            <button
              className="primary span-2"
              disabled={uids.length === 0}
              onClick={() =>
                askConfirm({
                  title: "确认销售",
                  message: `立刻卖掉选中的 ${uids.length} 条鱼？`,
                  confirmLabel: "销售",
                  onConfirm: () => {
                    sellManyFromTank(uids);
                    setPicked(new Set());
                  },
                })
              }
            >
              销售
            </button>
          </div>
        )}
        {sub === "basket" && (
          <div className="foot-row">
            <button disabled={living.length === 0} onClick={toggleAll}>
              {allOn ? "取消" : "全选"}
            </button>
            <button
              className="primary span-2"
              data-guide="store-to-basket"
              disabled={uids.length === 0}
              onClick={() => {
                if (putTankToBasket(uids)) setPicked(new Set());
              }}
            >
              存筐{uids.length > 0 ? ` ${uids.length}` : ""}
            </button>
          </div>
        )}
        {sub === "move" && (
          <>
            <div className="foot-row">
              <button disabled={living.length === 0} onClick={toggleAll}>
                {allOn ? "取消" : "全选"}
              </button>
            </div>
            {otherTanks.length === 0 && <p className="dim">只有一口缸。扩建后再买新缸。</p>}
            <div className="tank-target-scroll">
              {otherTanks.map((t) => {
                const used = occupancy(save, t.id);
                const need = capacityNeedForFishUids(save, uids);
                const can = uids.length > 0 && (need === 0 || tankHasRoom(save, t.id, need));
                return (
                  <button
                    key={t.id}
                    className="primary"
                    disabled={!can}
                    onClick={() => {
                      if (moveTankFish(uids, t.id)) setPicked(new Set());
                    }}
                  >
                    换到 {t.name}（{used}/{t.capacity}）
                  </button>
                );
              })}
            </div>
          </>
        )}
      </PageFoot>
      {feedPanelOpen && uids.length > 0 && (
        <FeedPanel
          stock={save.foodStock}
          equippedFoodId={save.equipped.food}
          batchFeed={{
            onFeed: (foodId) => {
              feedMany(uids, [foodId]);
              setFeedPanelOpen(false);
            },
          }}
          onShop={() => {
            setFeedPanelOpen(false);
            useUi.getState().openShopTab("food");
            setScene("shop");
          }}
          onClose={() => setFeedPanelOpen(false)}
        />
      )}
    </Page>
  );
}
