import { useEffect, useState } from "react";
import { useGame } from "../store/gameStore";
import { FISH_BY_ID } from "../data/fishDefs";
import { ATTRACTANT_DEFS, attractRemainingDays, bonusLabel } from "../data/attractantDefs";
import { LOVE_VIEW_LABEL, QUALITY_LABEL } from "../types";
import { hostingDailyFee, tankSellPrice } from "../game/economy";
import { useUi } from "../store/uiStore";
import { fishSex, hatchGoldForParents, HATCH_PEARL } from "../game/pairing";
import { EXPAND_DAYS, EXPAND_GOLD, EXPAND_PEARL, EXPAND_STEP, occupancy } from "../game/tanks";
import { TANK_DEFS } from "../data/tankDefs";
import TankCanvas from "./TankCanvas";
import { FishPortrait, GearIcon } from "../art/Art";
import { ownsFishManual } from "../data/bookDefs";
import FishTraitChips from "../ui/FishTraitChips";

type Panel = "none" | "host" | "expand" | "hatch" | "pairs";

export default function AquariumScene() {
  const save = useGame((s) => s.save);
  const selectedUid = useGame((s) => s.selectedTankUid);
  const selectedEggUid = useGame((s) => s.selectedEggUid);
  const setScene = useGame((s) => s.setScene);
  const feed = useGame((s) => s.feed);
  const release = useGame((s) => s.release);
  const cleanAllDead = useGame((s) => s.cleanAllDead);
  const setHosting = useGame((s) => s.setHosting);
  const listFromTank = useGame((s) => s.listFromTank);
  const switchTank = useGame((s) => s.switchTank);
  const setDefaultTank = useGame((s) => s.setDefaultTank);
  const buyTank = useGame((s) => s.buyTank);
  const startExpand = useGame((s) => s.startExpand);
  const accelerateExpand = useGame((s) => s.accelerateExpand);
  const unpair = useGame((s) => s.unpair);
  const applyAttractantToFish = useGame((s) => s.applyAttractantToFish);
  const applyAttractantToTank = useGame((s) => s.applyAttractantToTank);
  const hatchEgg = useGame((s) => s.hatchEgg);
  const accelerateEgg = useGame((s) => s.accelerateEgg);
  const listEgg = useGame((s) => s.listEgg);
  const hubPanel = useUi((s) => s.hubPanel);
  const setHubPanel = useUi((s) => s.setHubPanel);
  const openAd = useUi((s) => s.openAd);

  const [panel, setPanel] = useState<Panel>("none");
  const [listPrice, setListPrice] = useState<number | null>(null);

  const tank = save.tanks.find((t) => t.id === save.activeTankId);
  const selected = save.tank.find((f) => f.uid === selectedUid && f.tankId === save.activeTankId) ?? null;
  const selectedDef = selected ? FISH_BY_ID[selected.defId] : null;
  const selectedEgg = save.eggs.find((e) => e.uid === selectedEggUid && e.tankId === save.activeTankId) ?? null;
  const deadCount = save.tank.filter((f) => f.dead && f.tankId === save.activeTankId).length;
  const fee = hostingDailyFee(save.tank);
  const used = occupancy(save, save.activeTankId);
  const cap = tank?.capacity ?? 0;
  const livingHere = save.tank.filter((f) => !f.dead && f.tankId === save.activeTankId);
  const eggReady = selectedEgg ? Boolean(selectedEgg.started) && save.gameDay >= selectedEgg.readyDay : false;
  const eggStarted = Boolean(selectedEgg?.started);
  const hatchCost = selectedEgg ? hatchGoldForParents(selectedEgg.parentA, selectedEgg.parentB) : 0;
  const currentPairs = (() => {
    const seen = new Set<string>();
    return livingHere.filter((f) => {
      if (!f.pairId || seen.has(f.pairId)) return false;
      seen.add(f.pairId);
      return true;
    });
  })();
  const fishScentDays = selected ? attractRemainingDays(selected.attractUntilDay, save.gameDay) : 0;
  const tankScentDays = tank ? attractRemainingDays(tank.tankAttractUntilDay, save.gameDay) : 0;
  const goldScents = ATTRACTANT_DEFS.filter((a) => a.scope === "fish");
  const pearlMists = ATTRACTANT_DEFS.filter((a) => a.scope === "tank");

  useEffect(() => {
    if (hubPanel === "none") return;
    if (hubPanel === "basket") {
      setHubPanel("none");
      setScene("store_tank");
      return;
    }
    setPanel("host");
    setHubPanel("none");
  }, [hubPanel, setHubPanel, setScene]);

  const bar2Fish = selected && selectedDef && !selected.dead;
  const bar2Egg = Boolean(selectedEgg);

  return (
    <div className="hub">
      <div className="hub-top">
        <button onClick={() => switchTank(-1)} disabled={save.tanks.length <= 1}>⬅️</button>
        <span className="chip">{tank?.name ?? "鱼缸"}{tank ? ` · ${QUALITY_LABEL[tank.quality]}` : ""} {used}/{cap}</span>
        <button onClick={() => switchTank(1)} disabled={save.tanks.length <= 1}>➡️</button>
        <button
          className={save.defaultTankId === save.activeTankId ? "primary" : ""}
          onClick={setDefaultTank}
        >
          设为默认
        </button>
        <button onClick={cleanAllDead} disabled={deadCount === 0}>清理</button>
      </div>

      <div className="hub-mid">
        <TankCanvas />
        {tank?.decor && tank.decor !== "none" && <div className={`tank-decor ${tank.decor}`} />}
        <div className="hub-side left">
          <button onClick={() => setScene("quests")}>任务</button>
          <button onClick={() => setScene("shop")}>商城</button>
          <button onClick={() => setScene("cook")}>做菜</button>
        </div>
        <div className="hub-side right">
          <button onClick={() => setScene("select_fish")}>选鱼</button>
          <button onClick={() => setScene("store_tank")}>鱼筐</button>
          <button onClick={() => setPanel(panel === "host" ? "none" : "host")}>托管</button>
          <button onClick={() => setPanel(panel === "expand" ? "none" : "expand")}>扩建</button>
          <button onClick={() => setPanel(panel === "pairs" ? "none" : "pairs")}>配偶</button>
        </div>
        {bar2Fish && selectedDef && selected && (
          <div className="hub-bar2">
            <div className="hub-bar2-name">
              <FishPortrait id={selectedDef.id} size={40} alt={selectedDef.name} />
              {selectedDef.name}
              <span className={`chip ${selectedDef.quality}`}>{QUALITY_LABEL[selectedDef.quality]}</span>
              <FishTraitChips sex={fishSex(selected)} loveView={selected.loveView} ownedBooks={save.ownedBooks} />
              <span className="dim">
                健康 {selected.health}
                {selected.pairId ? ` · 已配对${selected.gestationLeft > 0 ? ` · 孕期 ${selected.gestationLeft} 天` : ""}` : ""}
                {fishScentDays > 0 ? ` · 求偶香 ${fishScentDays} 天` : ""}
              </span>
            </div>
            <div className="hub-bar2-actions">
              <button onClick={() => release(selected.uid)}>放生</button>
              <button onClick={() => feed(selected.uid)}>喂食</button>
              <button onClick={() => setListPrice(tankSellPrice(selectedDef.sellPrice, selected.health, false) ?? selectedDef.sellPrice)}>挂售</button>
              <button onClick={() => setPanel("pairs")}>
                {selected.pairId ? "配偶表" : "求偶香"}
              </button>
            </div>
          </div>
        )}
        {bar2Egg && selectedEgg && (
          <div className="hub-bar2">
            <div className="hub-bar2-name">
              鱼卵（{FISH_BY_ID[selectedEgg.parentA]?.name} × {FISH_BY_ID[selectedEgg.parentB]?.name}）
              <span className="dim">
                {!eggStarted
                  ? "未开工"
                  : eggReady
                    ? "可以领苗"
                    : `还要 ${selectedEgg.readyDay - save.gameDay} 天`}
              </span>
            </div>
            <div className="hub-bar2-actions cols-2">
              <button className="primary" onClick={() => setPanel("hatch")}>孵化</button>
              <button onClick={() => listEgg(selectedEgg.uid, Math.max(2, hatchCost))}>挂售</button>
            </div>
          </div>
        )}
      </div>

      {save.basket.length > 0 && panel === "none" && !bar2Fish && !bar2Egg && (
        <div className="basket-banner">
          <GearIcon kind="basket" size={28} />
          鱼筐里有 {save.basket.length} 条，点右侧「鱼筐」再存入
        </div>
      )}

      {panel === "host" && (
        <div className="modal-backdrop" onClick={() => setPanel("none")}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">托管</div>
            <p className="dim">每天按鱼的品质自动喂食：先扣库存，没有对应鱼粮就用金币代买。粮没有且买不起仍会掉健康。服务费：普通免费，优良 10 / 稀有 50 / 珍贵 150 / 极品 600 金一条。</p>
            <p>今日预估 {fee} 金 · {save.hosting ? "托管中" : "未托管"}</p>
            <button className="primary" onClick={() => setHosting(!save.hosting)}>
              {save.hosting ? "取消托管" : "开始托管"}
            </button>
            <button onClick={() => setPanel("none")}>关闭</button>
          </div>
        </div>
      )}

      {panel === "expand" && (
        <div className="modal-backdrop" onClick={() => setPanel("none")}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">扩建</div>
            <p className="dim">扩建加的是水族馆缸位（能摆几口缸）。缸要按品质另买；一口缸能养多少鱼看它的品质。</p>
            <p>缸位 {save.tanks.length}/{save.tankSlots} · 当前 {tank?.name} {QUALITY_LABEL[tank?.quality ?? "common"]} {used}/{cap}</p>
            {save.expandSlotReadyDay != null && (
              <p>扩建中，第 {save.expandSlotReadyDay} 天完工</p>
            )}
            <button disabled={save.expandSlotReadyDay != null} onClick={() => startExpand()}>
              加缸位 +{EXPAND_STEP} · {EXPAND_GOLD}金 · {EXPAND_DAYS}天
            </button>
            <button onClick={() => accelerateExpand("pearl")}>珍珠加速 {EXPAND_PEARL}</button>
            <button onClick={() => openAd({ kind: "expand" })}>看广告加速</button>
            <div className="dim" style={{ marginTop: 8 }}>买缸（要有空缸位）</div>
            {TANK_DEFS.map((def) => (
              <button
                key={def.id}
                disabled={save.tanks.length >= save.tankSlots}
                onClick={() => buyTank(def.id)}
              >
                {def.name} <span className={`chip ${def.quality}`}>{QUALITY_LABEL[def.quality]}</span>
                {" "}{def.capacity}条 · {def.currency === "gold" ? `${def.price}金` : `${def.price}珍珠`}
              </button>
            ))}
            <button onClick={() => setPanel("none")}>关闭</button>
          </div>
        </div>
      )}

      {panel === "pairs" && (
        <div className="modal-backdrop" onClick={() => setPanel("none")}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">配偶表</div>
            <p className="dim">同缸每天自动配对。爱情观看品质。只有配偶下卵。求偶香加快已合格的对，已配对可 5 分钟产卵。</p>
            {tankScentDays > 0 && (
              <p>整缸香氛还剩 {tankScentDays} 天{tank ? ` · ${bonusLabel(tank.tankAttractBonus)}` : ""}</p>
            )}
            {currentPairs.length === 0 && <p className="dim">还没有配偶。未配对的一公一母会在每日结算时掷骰。</p>}
            {currentPairs.map((a) => {
              const b = livingHere.find((f) => f.pairId === a.pairId && f.uid !== a.uid);
              const ad = FISH_BY_ID[a.defId];
              const bd = b ? FISH_BY_ID[b.defId] : null;
              if (!ad) return null;
              return (
                <div className="panel row-between" key={a.pairId ?? a.uid}>
                  <span className="row" style={{ alignItems: "center" }}>
                    <FishPortrait id={ad.id} size={36} alt={ad.name} />
                    {bd && <FishPortrait id={bd.id} size={36} alt={bd.name} />}
                    {ad.name} × {bd?.name ?? "?"}
                    {b && (
                      <span className="dim">
                        {ownsFishManual(save.ownedBooks)
                          ? ` ${LOVE_VIEW_LABEL[a.loveView]} × ${LOVE_VIEW_LABEL[b.loveView]}`
                          : ""}
                        {a.gestationLeft > 0 ? ` · 孕期 ${a.gestationLeft} 天` : ""}
                      </span>
                    )}
                  </span>
                  <button onClick={() => { if (a.pairId) unpair(a.pairId); }}>解除</button>
                </div>
              );
            })}
            <div className="dim" style={{ marginTop: 8 }}>金币求偶香 · 喂给一条活鱼；已配对会催产</div>
            {selected && selectedDef ? (
              <>
                <p>给 {selectedDef.name} 用{fishScentDays > 0 ? `（身上还剩 ${fishScentDays} 天）` : ""}</p>
                {goldScents.map((a) => {
                  const n = save.attractantStock?.[a.id] ?? 0;
                  return (
                    <button
                      key={a.id}
                      disabled={n <= 0}
                      onClick={() => applyAttractantToFish(selected.uid, a.id)}
                    >
                      {a.name} ×{n} · {bonusLabel(a.bonus)} · {a.durationDays}天
                    </button>
                  );
                })}
              </>
            ) : (
              <p className="dim">点缸里一条活鱼，再来给它用求偶香。已配对会催产。</p>
            )}
            <div className="dim" style={{ marginTop: 8 }}>珍珠香氛 · 喷整缸</div>
            {pearlMists.map((a) => {
              const n = save.attractantStock?.[a.id] ?? 0;
              return (
                <button key={a.id} disabled={n <= 0} onClick={() => applyAttractantToTank(a.id)}>
                  {a.name} ×{n} · {bonusLabel(a.bonus)} · {a.durationDays}天
                </button>
              );
            })}
            <button onClick={() => setScene("shop")}>去商城买</button>
            <button onClick={() => setPanel("none")}>关闭</button>
          </div>
        </div>
      )}

      {panel === "hatch" && selectedEgg && (
        <div className="modal-backdrop" onClick={() => setPanel("none")}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">孵化</div>
            <p className="dim">先花金币开工，再等 6～7 天。1 珍珠或 1 次广告减 1 天。</p>
            <p>
              {!eggStarted
                ? "还没开工"
                : eggReady
                  ? "已经可以领苗"
                  : `还要 ${selectedEgg.readyDay - save.gameDay} 天`}
            </p>
            {!eggStarted ? (
              <button className="primary" onClick={() => { hatchEgg(selectedEgg.uid); }}>
                开工 {hatchCost}金
              </button>
            ) : (
              <button className="primary" disabled={!eggReady} onClick={() => { if (hatchEgg(selectedEgg.uid)) setPanel("none"); }}>
                领苗
              </button>
            )}
            <button disabled={!eggStarted || eggReady} onClick={() => accelerateEgg(selectedEgg.uid, "pearl")}>珍珠加速 {HATCH_PEARL}</button>
            <button disabled={!eggStarted || eggReady} onClick={() => openAd({ kind: "egg", uid: selectedEgg.uid })}>看广告加速</button>
            <button onClick={() => setPanel("none")}>关闭</button>
          </div>
        </div>
      )}

      <div className="hub-bottom">
        <button onClick={() => setScene("fishing_map")}><GearIcon kind="rod" size={22} />钓鱼</button>
        <button onClick={() => setScene("equipment")}><GearIcon kind="stool" size={22} />装备</button>
        <button onClick={() => setScene("market")}><GearIcon kind="food" size={22} />鱼行</button>
        <button onClick={() => setScene("leaderboard")}><GearIcon kind="luck" size={22} />榜单</button>
      </div>

      {listPrice != null && selected && selectedDef && (
        <div className="modal-backdrop" onClick={() => setListPrice(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">挂售 {selectedDef.name}</div>
            <input type="number" value={listPrice} onChange={(e) => setListPrice(Number(e.target.value))} />
            <button className="primary" onClick={() => {
              listFromTank(selected.uid, listPrice);
              setListPrice(null);
            }}>挂到鱼行</button>
            <button onClick={() => setListPrice(null)}>取消</button>
          </div>
        </div>
      )}
    </div>
  );
}
