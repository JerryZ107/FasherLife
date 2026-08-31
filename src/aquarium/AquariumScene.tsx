import { useEffect, useState } from "react";
import { useGame } from "../store/gameStore";
import { FISH_BY_ID } from "../data/fishDefs";
import { ATTRACTANT_DEFS, attractRemainingDays, bonusLabel } from "../data/attractantDefs";
import { hostingDailyFee, tankSellPrice } from "../game/economy";
import { unreadMailCount } from "../game/mail";
import { askConfirm, useUi } from "../store/uiStore";
import { hatchGoldForParents, HATCH_PEARL, uniquePairs } from "../game/pairing";
import { EXPAND_GOLD, EXPAND_MS, countPlacedSlots, ensureTankSlotArray, occupancy, placedTanks, tankById } from "../game/tanks";
import { AFFECTION_MAX, canNameFish, fishTitle, FISH_NAME_MAX_LEN } from "../game/affection";
import TankCanvas from "./TankCanvas";
import SlotOverflowModal, { SlotPickerModal } from "./SlotModals";
import { GearIcon } from "../art/Art";
import {
  HubFab,
  ModalSheet,
  NavArrow,
  TankPlaque,
} from "../ui/chrome";
import PairRoster from "../ui/PairRoster";
import { ScentPickerBody, ScentPickerSheet } from "../ui/ScentPicker";
import { FoodPickerSheet } from "../ui/FoodPicker";
import {
  IcoBasket,
  IcoExpand,
  IcoFeed,
  IcoHatch,
  IcoHost,
  IcoList,
  IcoMail,
  IcoName,
  IcoNotes,
  IcoPair,
  IcoQuest,
  IcoSelect,
  IcoShop,
  IcoEquip,
  IcoTemple,
  SexIcon,
} from "../ui/marks";

type Panel = "none" | "host" | "slots" | "slot_manage" | "hatch" | "pairs";

export default function AquariumScene() {
  const save = useGame((s) => s.save);
  const selectedUid = useGame((s) => s.selectedTankUid);
  const selectedEggUid = useGame((s) => s.selectedEggUid);
  const setScene = useGame((s) => s.setScene);
  const feed = useGame((s) => s.feed);
  const renameFish = useGame((s) => s.renameFish);
  const cleanAllDead = useGame((s) => s.cleanAllDead);
  const setHostedTanks = useGame((s) => s.setHostedTanks);
  const listFromTank = useGame((s) => s.listFromTank);
  const sellFromTank = useGame((s) => s.sellFromTank);
  const putTankToBasket = useGame((s) => s.putTankToBasket);
  const selectTankFish = useGame((s) => s.selectTankFish);
  const switchTank = useGame((s) => s.switchTank);
  const setDefaultTank = useGame((s) => s.setDefaultTank);
  const startExpand = useGame((s) => s.startExpand);
  const finishExpandIfReady = useGame((s) => s.finishExpandIfReady);
  const unpair = useGame((s) => s.unpair);
  const applyAttractantToFish = useGame((s) => s.applyAttractantToFish);
  const applyAttractantToTank = useGame((s) => s.applyAttractantToTank);
  const hatchEgg = useGame((s) => s.hatchEgg);
  const accelerateEgg = useGame((s) => s.accelerateEgg);
  const listEgg = useGame((s) => s.listEgg);
  const openSlotPicker = useUi((s) => s.openSlotPicker);
  const hubPanel = useUi((s) => s.hubPanel);
  const setHubPanel = useUi((s) => s.setHubPanel);
  const openAd = useUi((s) => s.openAd);

  const [panel, setPanel] = useState<Panel>("none");
  const [expandPct, setExpandPct] = useState(0);
  const [listPrice, setListPrice] = useState<number | null>(null);
  const [sellMenuOpen, setSellMenuOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [fishScentOpen, setFishScentOpen] = useState(false);
  const [hostPick, setHostPick] = useState<Set<string>>(() => new Set());
  const feedOpen = useUi((s) => s.feedPickOpen);
  const setFeedPickOpen = useUi((s) => s.setFeedPickOpen);

  const tank = save.tanks.find((t) => t.id === save.activeTankId);
  const selected = save.tank.find((f) => f.uid === selectedUid && f.tankId === save.activeTankId) ?? null;
  const selectedDef = selected ? FISH_BY_ID[selected.defId] : null;
  const selectedEgg = save.eggs.find((e) => e.uid === selectedEggUid && e.tankId === save.activeTankId) ?? null;
  const deadCount = save.tank.filter((f) => f.dead && f.tankId === save.activeTankId).length;
  const hostedCount = save.hostedTankIds.length;
  const used = occupancy(save, save.activeTankId);
  const cap = tank?.capacity ?? 0;
  const placed = placedTanks(save);
  const slotIds = ensureTankSlotArray(save);
  const slotFree = slotIds.filter((id) => id == null).length;
  const expandBusy = save.expandReadyAt != null;

  useEffect(() => {
    const at = save.expandReadyAt;
    if (!at) {
      setExpandPct(0);
      return;
    }
    const tick = () => {
      const left = at - Date.now();
      if (left <= 0) {
        setExpandPct(100);
        finishExpandIfReady();
        return;
      }
      setExpandPct(Math.min(100, ((EXPAND_MS - left) / EXPAND_MS) * 100));
    };
    tick();
    const id = window.setInterval(tick, 50);
    return () => window.clearInterval(id);
  }, [save.expandReadyAt, finishExpandIfReady]);
  const livingHere = save.tank.filter((f) => !f.dead && f.tankId === save.activeTankId);
  const eggReady = selectedEgg ? Boolean(selectedEgg.started) && save.gameDay >= selectedEgg.readyDay : false;
  const eggStarted = Boolean(selectedEgg?.started);
  const hatchCost = selectedEgg ? hatchGoldForParents(selectedEgg.parentA, selectedEgg.parentB) : 0;
  const currentPairs = uniquePairs(livingHere);
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

  useEffect(() => {
    if (!bar2Fish) {
      setFishScentOpen(false);
      setFeedPickOpen(false);
      setNameOpen(false);
    } else if (selected) {
      setNameDraft(selected.customName ?? "");
    }
  }, [bar2Fish, selected, setFeedPickOpen]);

  useEffect(() => () => setFeedPickOpen(false), [setFeedPickOpen]);

  useEffect(() => {
    if (panel === "host") {
      setHostPick(new Set(save.hostedTankIds));
    }
  }, [panel, save.hostedTankIds]);

  function closePairs() {
    setFishScentOpen(false);
    setPanel("none");
  }

  function toggleHostTank(id: string) {
    setHostPick((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyHosting() {
    setHostedTanks([...hostPick]);
    setPanel("none");
  }

  const fishActionCols = 4 + (selected && canNameFish(selected) ? 1 : 0);

  function goAttractantShop() {
    closePairs();
    useUi.getState().openShopTab("attractant");
    setScene("shop");
  }

  return (
    <div className="hub">
      <div className="hub-top">
        <NavArrow dir="prev" onClick={() => switchTank(-1)} disabled={placed.length <= 1} />
        <TankPlaque
          name={tank?.name ?? "鱼缸"}
          quality={tank?.quality}
          used={used}
          cap={cap}
        />
        <NavArrow dir="next" onClick={() => switchTank(1)} disabled={placed.length <= 1} />
        <button
          className={`pill ${save.defaultTankId === save.activeTankId ? "primary" : ""}`}
          onClick={setDefaultTank}
        >
          默认
        </button>
        <button className="pill" onClick={cleanAllDead} disabled={deadCount === 0}>清理</button>
      </div>

      <div className="hub-mid">
        <TankCanvas />
        {tank?.decor && tank.decor !== "none" && <div className={`tank-decor ${tank.decor}`} />}
        <div className="hub-side left">
          <HubFab label="邮件" badge={unreadMailCount(save)} onClick={() => setScene("mail")}><IcoMail /></HubFab>
          <HubFab label="任务" onClick={() => setScene("quests")}><IcoQuest /></HubFab>
          <HubFab label="背包" guide="go-equip" onClick={() => setScene("equipment")}><IcoEquip /></HubFab>
          <HubFab label="笔记" onClick={() => setScene("notes")}><IcoNotes /></HubFab>
        </div>
        <div className="hub-side right">
          <HubFab label="鱼缸" onClick={() => setScene("select_fish")}><IcoSelect /></HubFab>
          <HubFab label="鱼筐" badge={save.basket.length} badgeExact guide="open-basket" onClick={() => setScene("store_tank")}><IcoBasket /></HubFab>
          <HubFab label="托管" active={panel === "host" || hostedCount > 0} onClick={() => setPanel(panel === "host" ? "none" : "host")}>
            <IcoHost />
          </HubFab>
          <HubFab label="缸位" active={panel === "slots" || panel === "slot_manage"} onClick={() => setPanel(panel === "slots" || panel === "slot_manage" ? "none" : "slots")}>
            <IcoExpand />
          </HubFab>
        </div>
        {bar2Fish && selectedDef && selected && (
          <div className="hub-bar2">
            <div className="dim" style={{ padding: "0 10px 6px", fontSize: 12 }}>
              {fishTitle(selected)} <SexIcon sex={selected.sex} /> · 好感 {selected.affection ?? 0}/{AFFECTION_MAX}
            </div>
            <div className={`hub-bar2-actions cols-${fishActionCols}`}>
              <button data-guide="feed-btn" onClick={() => setFeedPickOpen(true)}><IcoFeed />喂食</button>
              <button
                onClick={() => {
                  if (putTankToBasket([selected.uid])) selectTankFish(null);
                }}
              >
                <IcoBasket />存筐
              </button>
              <button
                onClick={() => {
                  if (selected.pairId) {
                    setPanel("pairs");
                  } else {
                    setFishScentOpen(true);
                  }
                }}
              >
                <IcoPair />
                {selected.pairId ? "配偶表" : "配偶"}
              </button>
              <button onClick={() => setSellMenuOpen(true)}>
                <IcoList />售卖
              </button>
              {canNameFish(selected) && (
                <button onClick={() => setNameOpen(true)}>
                  <IcoName />
                  {selected.customName ? "改名" : "起名"}
                </button>
              )}
            </div>
          </div>
        )}
        {bar2Egg && selectedEgg && (
          <div className="hub-bar2">
            <div className="hub-bar2-name">
              <IcoHatch size={28} />
              <div className="sheet-meta">
                <div className="sheet-name-row">
                  鱼卵（{FISH_BY_ID[selectedEgg.parentA]?.name} × {FISH_BY_ID[selectedEgg.parentB]?.name}）
                </div>
                <span className="dim">
                  {!eggStarted
                    ? "未开工"
                    : eggReady
                      ? "可以领苗"
                      : `还要 ${selectedEgg.readyDay - save.gameDay} 天`}
                </span>
              </div>
            </div>
            <div className="hub-bar2-actions cols-2">
              <button className="primary" onClick={() => setPanel("hatch")}><IcoHatch />孵化</button>
              <button
                onClick={() =>
                  askConfirm({
                    title: "确认挂售",
                    message: `确定把这枚鱼卵挂到鱼行，售价 ${Math.max(2, hatchCost)} 金？`,
                    confirmLabel: "挂售",
                    onConfirm: () => listEgg(selectedEgg.uid, Math.max(2, hatchCost)),
                  })
                }
              >
                <IcoList />挂售
              </button>
            </div>
          </div>
        )}
      </div>

      {panel === "host" && (
        <ModalSheet title="托管" onClose={() => setPanel("none")}>
            <p className="dim">每天自动喂缸里的鱼。先扣库存，不够会代买。一口缸 100 金/天。</p>
            <p>
              已选 {hostPick.size} 口 · 日费 {hostingDailyFee(hostPick.size)} 金
              {hostedCount > 0 ? ` · 托管中 ${hostedCount} 口` : " · 未开"}
            </p>
            <div className="host-tank-pick">
              {save.tanks.map((t) => {
                const on = hostPick.has(t.id);
                const usedInTank = occupancy(save, t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`panel fish-pick ${on ? "picked" : ""}`}
                    onClick={() => toggleHostTank(t.id)}
                  >
                    <span className="fish-pick-meta">
                      <strong>{t.name}</strong>
                      <span className="dim">{usedInTank}/{t.capacity} 条</span>
                    </span>
                    <span className="dim">{on ? "已选" : "点选"}</span>
                  </button>
                );
              })}
            </div>
            <button className="primary" disabled={hostPick.size === 0 && hostedCount === 0} onClick={applyHosting}>
              {hostPick.size > 0 ? `托管 ${hostPick.size} 口缸` : "取消托管"}
            </button>
            <button onClick={() => setPanel("none")}>关闭</button>
        </ModalSheet>
      )}

      {panel === "slots" && (
        <ModalSheet title="缸位" onClose={() => setPanel("none")}>
            <p className="dim">凹槽用来摆缸。新缸去商城买，摆哪格在缸位管理里换。</p>
            <p>
              已解锁 {save.tankSlots} 个缸位，{countPlacedSlots(save)} 个已摆缸
              {slotFree > 0 ? `，${slotFree} 个空置` : "。"}
            </p>
            {tank && (
              <p className="dim">
                眼前这口「{tank.name}」养了 {used}/{cap} 条。
              </p>
            )}
            {expandBusy && (
              <div>
                <p>扩建中…</p>
                <div className="progress-line">
                  <div style={{ width: `${expandPct}%` }} />
                </div>
              </div>
            )}
            <button className="primary" disabled={expandBusy} onClick={() => startExpand()}>
              {expandBusy ? "扩建中…" : `扩建缸位 · ${EXPAND_GOLD} 金币`}
            </button>
            <button onClick={() => setPanel("slot_manage")}>缸位管理</button>
            <button onClick={() => { setPanel("none"); useUi.getState().openShopTab("tank"); setScene("shop"); }}>
              去商城买缸
            </button>
            <button onClick={() => setPanel("none")}>关闭</button>
        </ModalSheet>
      )}

      {panel === "slot_manage" && (
        <ModalSheet title="缸位管理" onClose={() => setPanel("slots")} wide>
            <p className="dim">点凹槽选鱼缸或空置。换缸时原缸的鱼会进新缸。</p>
            <div className="slot-grid">
              {slotIds.map((tankId, i) => {
                const t = tankId ? tankById(save, tankId) : null;
                const usedIn = tankId ? occupancy(save, tankId) : 0;
                return (
                  <button
                    key={i}
                    type="button"
                    className={`slot-groove ${tankId ? "has-tank" : "is-empty"}`}
                    onClick={() => openSlotPicker(i)}
                  >
                    <span className="slot-groove-label">缸位 {i + 1}</span>
                    {t ? (
                      <>
                        <strong>{t.name}</strong>
                        <span className="dim">{usedIn}/{t.capacity} 条</span>
                      </>
                    ) : (
                      <span className="dim">空置</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setPanel("slots")}>返回</button>
        </ModalSheet>
      )}

      <SlotPickerModal />
      <SlotOverflowModal />

      {panel === "pairs" && (
        <ModalSheet title="配偶表" onClose={closePairs} wide modalClassName="pairs-sheet">
            <div className="pairs-sheet-main">
              <p className="dim">同缸会自动配对，配偶会下卵。</p>
              {tankScentDays > 0 && (
                <p>整缸香氛还剩 {tankScentDays} 天{tank ? ` · ${bonusLabel(tank.tankAttractBonus)}` : ""}</p>
              )}
              {currentPairs.length === 0 && <p className="dim">还没有配偶。</p>}
              <PairRoster
                pairs={currentPairs}
                ownedBooks={save.ownedBooks}
                onUnpair={(id) => unpair(id)}
              />
              {selected && selectedDef && !selected.dead ? (
                <button type="button" className="primary" onClick={() => setFishScentOpen(true)}>
                  给 {selectedDef.name} 用求偶香
                  {fishScentDays > 0 ? `（身上还剩 ${fishScentDays} 天）` : ""}
                </button>
              ) : (
                <p className="dim">先点缸里一条活鱼。</p>
              )}
            </div>
            <div className="dim">珍珠香氛 · 喷整缸</div>
            <ScentPickerBody
              items={pearlMists}
              stock={save.attractantStock}
              onUse={applyAttractantToTank}
              onShop={goAttractantShop}
            />
            <button type="button" onClick={closePairs}>关闭</button>
        </ModalSheet>
      )}
      {feedOpen && selected && selectedDef && !selected.dead && (
        <FoodPickerSheet
          title="喂食"
          hint="选对口鱼粮。不对会嫌弃，不扣粮。"
          stock={save.foodStock}
          matchQualities={[selectedDef.quality]}
          onUse={(id) => {
            setFeedPickOpen(false);
            feed(selected.uid, id);
          }}
          onShop={() => {
            setFeedPickOpen(false);
            useUi.getState().openShopTab("food");
            setScene("shop");
          }}
          onClose={() => setFeedPickOpen(false)}
        />
      )}
      {fishScentOpen && selected && selectedDef && !selected.dead && (
        <ScentPickerSheet
          title="配偶"
          hint={`给 ${fishTitle(selected)} 用求偶香。${fishScentDays > 0 ? `还剩 ${fishScentDays} 天。` : ""}`}
          items={goldScents}
          stock={save.attractantStock}
          onUse={(id) => applyAttractantToFish(selected.uid, id)}
          onShop={goAttractantShop}
          onClose={() => setFishScentOpen(false)}
        />
      )}

      {panel === "hatch" && selectedEgg && (
        <ModalSheet title="孵化" onClose={() => setPanel("none")}>
            <p className="dim">开工后等几天。珍珠或广告可加速。</p>
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
        </ModalSheet>
      )}

      <div className="hub-bottom">
        <button className="is-hero" data-guide="go-fish" onClick={() => setScene("fishing_map")}><GearIcon kind="rod" size={22} />钓鱼</button>
        <button data-guide="go-shop" onClick={() => setScene("shop")}>
          <span className="gear-icon hub-shop-ico"><IcoShop size={22} /></span>
          商城
        </button>
        <button data-guide="go-market" onClick={() => setScene("market")}><GearIcon kind="food" size={22} />鱼行</button>
        <button data-guide="go-temple" onClick={() => setScene("leaderboard")}>
          <span className="gear-icon hub-shop-ico"><IcoTemple size={22} /></span>
          圣殿
        </button>
      </div>

      {nameOpen && selected && selectedDef && (
        <ModalSheet title={selected.customName ? "改名" : "起名"} onClose={() => setNameOpen(false)}>
          <p className="dim">好感满 {AFFECTION_MAX} 后可以起名，最多 {FISH_NAME_MAX_LEN} 个字。</p>
          <input
            value={nameDraft}
            maxLength={FISH_NAME_MAX_LEN}
            placeholder="给这条鱼起个名字"
            onChange={(e) => setNameDraft(e.target.value)}
          />
          <button
            className="primary"
            onClick={() => {
              if (renameFish(selected.uid, nameDraft)) setNameOpen(false);
            }}
          >
            确定
          </button>
          <button onClick={() => setNameOpen(false)}>取消</button>
        </ModalSheet>
      )}

      {sellMenuOpen && selected && selectedDef && (
        <ModalSheet title={`售卖 ${fishTitle(selected)}`} onClose={() => setSellMenuOpen(false)}>
          <p className="dim">销售立刻换成金币；挂售放到鱼行等别人买。</p>
          <button
            className="primary"
            onClick={() => {
              const price = tankSellPrice(selectedDef.sellPrice, selected.health, false);
              if (price == null) return;
              askConfirm({
                title: "确认销售",
                message: `立刻卖掉「${fishTitle(selected)}」，到手 ${price} 金？`,
                confirmLabel: "销售",
                onConfirm: () => {
                  sellFromTank(selected.uid);
                  setSellMenuOpen(false);
                },
              });
            }}
          >
            销售
          </button>
          <button
            onClick={() => {
              setSellMenuOpen(false);
              setListPrice(tankSellPrice(selectedDef.sellPrice, selected.health, false) ?? selectedDef.sellPrice);
            }}
          >
            挂售
          </button>
          <button onClick={() => setSellMenuOpen(false)}>取消</button>
        </ModalSheet>
      )}

      {listPrice != null && selected && selectedDef && (
        <ModalSheet title={`挂售 ${selectedDef.name}`} onClose={() => setListPrice(null)}>
            <input type="number" value={listPrice} onChange={(e) => setListPrice(Number(e.target.value))} />
            <button className="primary" onClick={() => {
              askConfirm({
                title: "确认挂售",
                message: `确定把「${selectedDef.name}」挂到鱼行，售价 ${listPrice} 金？`,
                confirmLabel: "挂售",
                onConfirm: () => {
                  listFromTank(selected.uid, listPrice);
                  setListPrice(null);
                },
              });
            }}>挂到鱼行</button>
            <button onClick={() => setListPrice(null)}>取消</button>
        </ModalSheet>
      )}
    </div>
  );
}
