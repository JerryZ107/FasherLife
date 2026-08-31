import { useState, useEffect } from "react";
import { useGame } from "../store/gameStore";
import { FISH_BY_ID } from "../data/fishDefs";
import { ATTRACTANT_DEFS, attractRemainingDays, bonusLabel } from "../data/attractantDefs";
import { FishPortrait } from "../art/Art";
import { fishSex, uniquePairs } from "../game/pairing";
import PairRoster from "../ui/PairRoster";
import { ScentPickerBody, ScentPickerSheet } from "../ui/ScentPicker";
import { FoodPickerSheet } from "../ui/FoodPicker";
import { ALL_TANKS, livingInFilter, occupancy, tankHasRoom } from "../game/tanks";
import FishTraitChips from "../ui/FishTraitChips";
import { EmptyHint, HealthBar, Page, PageBody, PageFoot, PageHead, QualityChip, TabBar } from "../ui/chrome";
import { fishTitle } from "../game/affection";
import { SexIcon } from "../ui/marks";
import { askConfirm, useUi } from "../store/uiStore";

type Sub = "feed" | "pair" | "release" | "list" | "move";

export default function SelectFishScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const feedMany = useGame((s) => s.feedMany);
  const releaseMany = useGame((s) => s.releaseMany);
  const listManyFromTank = useGame((s) => s.listManyFromTank);
  const unpair = useGame((s) => s.unpair);
  const applyAttractantToFish = useGame((s) => s.applyAttractantToFish);
  const applyAttractantToTank = useGame((s) => s.applyAttractantToTank);
  const setActiveTank = useGame((s) => s.setActiveTank);
  const moveTankFish = useGame((s) => s.moveTankFish);
  const [sub, setSub] = useState<Sub>("feed");
  const [tankFilter, setTankFilter] = useState(save.activeTankId);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pickedFoods, setPickedFoods] = useState<Set<string>>(new Set());
  const [fishScentOpen, setFishScentOpen] = useState(false);
  const feedOpen = useUi((s) => s.feedPickOpen);
  const setFeedPickOpen = useUi((s) => s.setFeedPickOpen);

  useEffect(() => () => setFeedPickOpen(false), [setFeedPickOpen]);

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
    setFishScentOpen(false);
    setFeedPickOpen(false);
    setTankFilter(id);
    if (id !== ALL_TANKS) setActiveTank(id);
  }

  function toggleAll() {
    if (picked.size === living.length && living.length > 0) setPicked(new Set());
    else setPicked(new Set(living.map((f) => f.uid)));
  }

  const tank = save.tanks.find((t) => t.id === (tankFilter === ALL_TANKS ? save.activeTankId : tankFilter));
  const living = livingInFilter(save, tankFilter);
  const uids = [...picked].filter((uid) => living.some((f) => f.uid === uid));
  const allOn = living.length > 0 && picked.size === living.length;
  const tankTabs = [
    { id: ALL_TANKS, label: "全部" },
    ...save.tanks.map((t) => ({
      id: t.id,
      label: `${t.name} ${occupancy(save, t.id)}/${t.capacity}`,
    })),
  ];
  const scentTarget = uids.length === 1 ? living.find((f) => f.uid === uids[0]) : undefined;
  const pairs = uniquePairs(living);
  const tankScentDays = tank ? attractRemainingDays(tank.tankAttractUntilDay, save.gameDay) : 0;
  const goldScents = ATTRACTANT_DEFS.filter((a) => a.scope === "fish");
  const pearlMists = ATTRACTANT_DEFS.filter((a) => a.scope === "tank");
  const otherTanks = tankFilter === ALL_TANKS
    ? save.tanks
    : save.tanks.filter((t) => t.id !== tankFilter);

  return (
    <Page>
      <PageHead onBack={() => setScene("aquarium")} title="鱼缸" />
      <TabBar tankScroll items={tankTabs} value={tankFilter} onChange={showTank} />
      <TabBar
        items={[
          { id: "feed", label: "喂食" },
          { id: "pair", label: "配偶" },
          { id: "list", label: "挂售" },
          { id: "move", label: "换缸" },
          { id: "release", label: "放生" },
        ]}
        value={sub}
        onChange={(t) => {
          setSub(t);
          setPicked(new Set());
          setFishScentOpen(false);
          setFeedPickOpen(false);
        }}
      />
      <PageBody>
        {sub === "pair" && (
          <>
            <p className="dim">同缸自动配对。先选活鱼再用求偶香。</p>
            {tankScentDays > 0 && tank && (
              <p>整缸香氛还剩 {tankScentDays} 天 · {bonusLabel(tank.tankAttractBonus)}</p>
            )}
            {pairs.length === 0 && <div className="dim" style={{ padding: 8 }}>还没有配偶</div>}
            <PairRoster
              pairs={pairs}
              ownedBooks={save.ownedBooks}
              onUnpair={(id) => unpair(id)}
            />
          </>
        )}
        {sub === "move" && (
          <p className="dim">选活鱼，再点目标缸。只挪一条会解配。</p>
        )}
        {living.length === 0 && (
          <EmptyHint>{tankFilter === ALL_TANKS ? "还没有活鱼" : "这口缸还没有活鱼"}</EmptyHint>
        )}
        {living.map((f) => {
          const def = FISH_BY_ID[f.defId];
          if (!def) return null;
          const scentDays = attractRemainingDays(f.attractUntilDay, save.gameDay);
          const on = picked.has(f.uid);
          const tankName = save.tanks.find((t) => t.id === f.tankId)?.name;
          return (
            <button
              key={f.uid}
              className={`panel fish-pick ${on ? "picked" : ""}`}
              onClick={() => {
                if (sub === "pair") {
                  const wasOn = picked.has(f.uid);
                  setPicked(wasOn ? new Set() : new Set([f.uid]));
                  setFishScentOpen(!wasOn);
                } else {
                  toggle(f.uid);
                }
              }}
            >
              <FishPortrait id={def.id} size={48} alt={fishTitle(f)} />
              <span className="fish-pick-meta attrs-row">
                <strong>{fishTitle(f)} <SexIcon sex={fishSex(f)} /></strong>
                <QualityChip quality={def.quality} />
                {tankFilter === ALL_TANKS && tankName ? <span className="chip">{tankName}</span> : null}
                <FishTraitChips sex={fishSex(f)} loveView={f.loveView} ownedBooks={save.ownedBooks} />
                <HealthBar value={f.health} compact />
                <span className="dim">
                  {f.pairId ? `已配对${f.gestationLeft > 0 ? ` · 孕期 ${f.gestationLeft} 天` : ""}` : "未配对"}
                  {scentDays > 0 ? ` · 求偶香 ${scentDays} 天` : ""}
                </span>
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
              onClick={() => setFeedPickOpen(true)}
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
                const can = uids.length > 0 && tankHasRoom(save, t.id, uids.length);
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
        {sub === "pair" && (
          <>
            {scentTarget ? (
              <button type="button" className="primary" onClick={() => setFishScentOpen(true)}>
                给 {FISH_BY_ID[scentTarget.defId]?.name ?? "这条鱼"} 用求偶香
              </button>
            ) : (
              <p className="dim">先选一条活鱼</p>
            )}
            <div className="dim">珍珠香氛 · 喷整缸</div>
            <ScentPickerBody
              items={pearlMists}
              stock={save.attractantStock}
              onUse={applyAttractantToTank}
              onShop={() => {
                useUi.getState().openShopTab("attractant");
                setScene("shop");
              }}
            />
          </>
        )}
      </PageFoot>
      {feedOpen && uids.length > 0 && (
        <FoodPickerSheet
          title="喂食"
          hint="可多选不同品质鱼粮，按鱼对口喂。"
          stock={save.foodStock}
          multi
          selected={pickedFoods}
          onToggle={(id) =>
            setPickedFoods((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onConfirm={() => {
            setFeedPickOpen(false);
            feedMany(uids, [...pickedFoods]);
            setPickedFoods(new Set());
            setPicked(new Set());
          }}
          onShop={() => {
            setFeedPickOpen(false);
            setPickedFoods(new Set());
            useUi.getState().openShopTab("food");
            setScene("shop");
          }}
          onClose={() => {
            setFeedPickOpen(false);
            setPickedFoods(new Set());
          }}
        />
      )}
      {fishScentOpen && scentTarget && (
        <ScentPickerSheet
          title="求偶香"
          hint={`给 ${FISH_BY_ID[scentTarget.defId]?.name ?? "这条鱼"} 用。`}
          items={goldScents}
          stock={save.attractantStock}
          onUse={(id) => applyAttractantToFish(scentTarget.uid, id)}
          onShop={() => {
            useUi.getState().openShopTab("attractant");
            setScene("shop");
          }}
          onClose={() => setFishScentOpen(false)}
        />
      )}
    </Page>
  );
}
