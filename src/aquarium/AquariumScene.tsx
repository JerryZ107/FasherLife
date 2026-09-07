import { useEffect, useRef, useState } from "react";
import { useGame } from "../store/gameStore";
import { FISH_BY_ID } from "../data/fishDefs";
import { hostingDailyFee, tankSellPrice } from "../game/economy";
import { unreadMailCount } from "../game/mail";
import { demoFishChatThreads } from "../data/chatDefs";
import { shouldShowFeatureIntro } from "../game/featureIntro";
import { askConfirm, useUi } from "../store/uiStore";
import { fishHealthMax } from "../game/growth";
import { hatchGoldForParents, HATCH_PEARL } from "../game/pairing";
import { EXPAND_GOLD, EXPAND_MS, countPlacedSlots, ensureTankSlotArray, occupancy, placedTanks, tankById } from "../game/tanks";
import { AFFECTION_MAX, fishTitle, FISH_NAME_MAX_LEN } from "../game/affection";
import TankCanvas from "./TankCanvas";
import SlotOverflowModal, { SlotPickerModal } from "./SlotModals";
import { GearIcon } from "../art/Art";
import {
  HubFab,
  ModalSheet,
  NavArrow,
  TankPlaque,
  GrowthStageChip,
} from "../ui/chrome";
import { MatePanel } from "../ui/MatePanel";
import { FeedPanel } from "../ui/FeedPanel";
import {
  IcoBasket,
  IcoExpand,
  IcoEye,
  IcoFeed,
  IcoEncyc,
  IcoHatch,
  IcoHost,
  IcoList,
  IcoMail,
  IcoFriends,
  IcoName,
  IcoNotes,
  IcoPair,
  IcoQuest,
  IcoRelease,
  IcoSelect,
  IcoShop,
  IcoEquip,
  IcoTemple,
  SexIcon,
} from "../ui/marks";

type Panel = "none" | "host" | "slots" | "slot_manage" | "hatch" | "mate" | "feed";

export default function AquariumScene() {
  const save = useGame((s) => s.save);
  const selectedUid = useGame((s) => s.selectedTankUid);
  const selectedEggUid = useGame((s) => s.selectedEggUid);
  const setScene = useGame((s) => s.setScene);
  const equip = useGame((s) => s.equip);
  const renameFish = useGame((s) => s.renameFish);
  const setHostedTanks = useGame((s) => s.setHostedTanks);
  const listFromTank = useGame((s) => s.listFromTank);
  const sellFromTank = useGame((s) => s.sellFromTank);
  const release = useGame((s) => s.release);
  const putTankToBasket = useGame((s) => s.putTankToBasket);
  const selectTankFish = useGame((s) => s.selectTankFish);
  const selectEgg = useGame((s) => s.selectEgg);
  const switchTank = useGame((s) => s.switchTank);
  const setDefaultTank = useGame((s) => s.setDefaultTank);
  const startExpand = useGame((s) => s.startExpand);
  const finishExpandIfReady = useGame((s) => s.finishExpandIfReady);
  const moveTankFish = useGame((s) => s.moveTankFish);
  const renameEgg = useGame((s) => s.renameEgg);
  const moveEggToTank = useGame((s) => s.moveEggToTank);
  const sellEggFromTank = useGame((s) => s.sellEggFromTank);
  const accelerateEgg = useGame((s) => s.accelerateEgg);
  const listEgg = useGame((s) => s.listEgg);
  const flushEggHatch = useGame((s) => s.flushEggHatch);
  const ackFeatureIntro = useGame((s) => s.ackFeatureIntro);
  const openSlotPicker = useUi((s) => s.openSlotPicker);
  const hubPanel = useUi((s) => s.hubPanel);
  const setHubPanel = useUi((s) => s.setHubPanel);
  const openFishChat = useUi((s) => s.openFishChat);
  const guideReviewStep = useUi((s) => s.guideReviewStep);
  const openAd = useUi((s) => s.openAd);

  const [panel, setPanel] = useState<Panel>("none");
  const [expandPct, setExpandPct] = useState(0);
  const [listPrice, setListPrice] = useState<number | null>(null);
  const [nameOpen, setNameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [eggNameOpen, setEggNameOpen] = useState(false);
  const [eggNameDraft, setEggNameDraft] = useState("");
  const [eggSellOpen, setEggSellOpen] = useState(false);
  const [sellPickOpen, setSellPickOpen] = useState(false);
  const [moveTankOpen, setMoveTankOpen] = useState(false);
  const [moveEggOpen, setMoveEggOpen] = useState(false);
  const [hostPick, setHostPick] = useState<Set<string>>(() => new Set());
  const [uiHidden, setUiHidden] = useState(false);
  const pickDismissAfterRef = useRef(0);
  const feedPanelOpen = useUi((s) => s.feedPanelOpen);
  const setFeedPanelOpen = useUi((s) => s.setFeedPanelOpen);
  const scatterFeed = useUi((s) => s.tankScatterFeed);
  const setTankScatterFeed = useUi((s) => s.setTankScatterFeed);
  const tankMateSpray = useUi((s) => s.tankMateSpray);
  const setTankMateSpray = useUi((s) => s.setTankMateSpray);
  const matePanelOpen = useUi((s) => s.matePanelOpen);
  const setMatePanelOpen = useUi((s) => s.setMatePanelOpen);
  const clearMatePick = useUi((s) => s.clearMatePick);

  const tank = save.tanks.find((t) => t.id === save.activeTankId);
  const selected = save.tank.find((f) => f.uid === selectedUid && f.tankId === save.activeTankId) ?? null;
  const selectedDef = selected ? FISH_BY_ID[selected.defId] : null;
  const selectedEgg = save.eggs.find((e) => e.uid === selectedEggUid && e.tankId === save.activeTankId) ?? null;
  const hostedCount = save.hostedTankIds.length;
  const used = occupancy(save, save.activeTankId);
  const cap = tank?.capacity ?? 0;
  const placed = placedTanks(save);
  const slotIds = ensureTankSlotArray(save);
  const slotFree = slotIds.filter((id) => id == null).length;
  const expandBusy = save.expandReadyAt != null;

  useEffect(() => {
    if (save.eggs.some((e) => e.started && save.gameDay >= e.readyDay)) {
      flushEggHatch();
    }
  }, [flushEggHatch, save.gameDay, save.eggs]);

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
  const eggDaysLeft = selectedEgg ? Math.max(0, selectedEgg.readyDay - save.gameDay) : 0;
  const eggHatchDue = Boolean(selectedEgg?.started && save.gameDay >= selectedEgg.readyDay);
  useEffect(() => {
    if (panel === "hatch" && (!selectedEgg || eggDaysLeft <= 0)) {
      if (eggHatchDue) flushEggHatch();
      setPanel("none");
    }
  }, [panel, selectedEgg, eggDaysLeft, eggHatchDue, flushEggHatch]);
  const hatchCost = selectedEgg ? hatchGoldForParents(selectedEgg.parentA, selectedEgg.parentB) : 0;
  const eggDefId = selectedEgg?.defId ?? selectedEgg?.parentA;
  const eggDef = eggDefId ? FISH_BY_ID[eggDefId] : null;
  const otherTanks = placedTanks(save).filter((t) => t.id !== save.activeTankId);

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
      setNameOpen(false);
      setMoveTankOpen(false);
    } else if (selected) {
      setNameDraft(selected.customName ?? "");
    }
  }, [bar2Fish, selected]);

  useEffect(() => {
    if (!bar2Egg) {
      setEggNameOpen(false);
      setEggSellOpen(false);
      setMoveEggOpen(false);
    } else if (selectedEgg) {
      setEggNameDraft(selectedEgg.customName ?? "");
    }
  }, [bar2Egg, selectedEgg]);

  useEffect(() => {
    if (selectedUid || selectedEggUid) {
      pickDismissAfterRef.current = Date.now() + 500;
    }
  }, [selectedUid, selectedEggUid]);

  useEffect(() => {
    const resume = useUi.getState().aquariumPanelResume;
    if (!resume) return;
    useUi.getState().clearAquariumPanelResume();
    if (resume === "mate") {
      setPanel("mate");
      setMatePanelOpen(true);
    } else if (resume === "feed") {
      setPanel("feed");
      setFeedPanelOpen(true);
    }
  }, [setMatePanelOpen, setFeedPanelOpen]);

  useEffect(() => () => {
    if (useUi.getState().aquariumPanelResume) return;
    setFeedPanelOpen(false);
    setTankScatterFeed(false);
    setTankMateSpray(false);
    setMatePanelOpen(false);
    clearMatePick();
  }, [setFeedPanelOpen, setTankScatterFeed, setTankMateSpray, setMatePanelOpen, clearMatePick]);

  function closeFeedPanel() {
    setPanel("none");
    setFeedPanelOpen(false);
  }

  function backAquariumFromFeed(foodId: string) {
    equip("food", foodId);
    setPanel("none");
    setFeedPanelOpen(false);
    if ((save.foodStock[foodId] ?? 0) <= 0) {
      useUi.getState().showToast("鱼粮不足");
      setTankScatterFeed(false);
      return;
    }
    setTankScatterFeed(true);
  }

  useEffect(() => {
    if (!scatterFeed) return;
    const foodId = save.equipped.food;
    if ((save.foodStock[foodId] ?? 0) <= 0) setTankScatterFeed(false);
  }, [scatterFeed, save.equipped.food, save.foodStock]);

  function toggleFeedPanel() {
    if (scatterFeed) {
      setTankScatterFeed(false);
      return;
    }
    if (feedPanelOpen) {
      closeFeedPanel();
      return;
    }
    setTankMateSpray(false);
    setMatePanelOpen(false);
    clearMatePick();
    setPanel("feed");
    setFeedPanelOpen(true);
  }

  useEffect(() => {
    if (panel === "host") {
      setHostPick(new Set(save.hostedTankIds));
    }
  }, [panel, save.hostedTankIds]);

  function closeMatePanel() {
    setPanel("none");
    setMatePanelOpen(false);
    setTankMateSpray(false);
    clearMatePick();
  }

  function backAquariumFromMate() {
    setPanel("none");
    setMatePanelOpen(false);
    setTankMateSpray(true);
  }

  function toggleMateSpray() {
    if (shouldShowFeatureIntro(save, guideReviewStep, "mate")) {
      ackFeatureIntro("mate");
    }
    if (tankMateSpray) {
      closeMatePanel();
      return;
    }
    setFeedPanelOpen(false);
    setTankScatterFeed(false);
    setTankMateSpray(true);
    setMatePanelOpen(true);
    setPanel("mate");
  }

  function openEncyclopedia() {
    useUi.getState().setEncycReturn("aquarium");
    setScene("encyclopedia");
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

  function dismissTankPick(e: React.MouseEvent) {
    if (!selectedUid && !selectedEggUid) return;
    if (Date.now() < pickDismissAfterRef.current) return;
    const el = e.target as HTMLElement;
    if (el.closest(".hub-bar2")) return;
    if (el.closest(".tank-canvas")) return;
    selectTankFish(null);
    selectEgg(null);
  }

  return (
    <div className={`hub${uiHidden ? " is-ui-hidden" : ""}`}>
      <div className="hub-mid">
        <TankCanvas />
        {tank?.decor && tank.decor !== "none" && <div className={`tank-decor ${tank.decor}`} />}
        <div className="hub-chrome" onClickCapture={dismissTankPick}>
        <div className="hub-top-row">
          <div className="hub-top-row-main">
            <div className="hub-top">
              <NavArrow dir="prev" onClick={() => switchTank(-1)} disabled={placed.length <= 1} />
              <TankPlaque
                name={tank?.name ?? "鱼缸"}
                quality={tank?.quality}
                used={used}
                cap={cap}
                onClick={() => setPanel("slots")}
              />
              <NavArrow dir="next" onClick={() => switchTank(1)} disabled={placed.length <= 1} />
              <button
                className={`pill ${save.defaultTankId === save.activeTankId ? "primary" : ""}`}
                onClick={setDefaultTank}
              >
                默认
              </button>
            </div>
            <div className="hub-top-right-row">
              <HubFab
                label={hostedCount > 0 ? "✅托管" : "托管"}
                active={panel === "host" || hostedCount > 0}
                onClick={() => setPanel(panel === "host" ? "none" : "host")}
              >
                <IcoHost />
              </HubFab>
          <HubFab
            label="渔聊"
            guide="open-fishchat"
            badge={demoFishChatThreads().reduce((n, t) => n + t.unread, 0)}
            onClick={() => openFishChat("msg")}
          >
                <IcoFriends />
              </HubFab>
              <HubFab label="邮件" badge={unreadMailCount(save)} onClick={() => setScene("mail")}>
                <IcoMail />
              </HubFab>
            </div>
          </div>
          <div className="hub-top-right-sub">
            <div className="hub-top-right-row">
              <HubFab label="鱼缸" guide="go-select-fish" onClick={() => setScene("select_fish")}><IcoSelect /></HubFab>
              <HubFab label="鱼筐" badge={save.basket.length} badgeExact guide="open-basket" onClick={() => setScene("store_tank")}><IcoBasket /></HubFab>
            </div>
          </div>
        </div>
        <div className="hub-side left">
          <HubFab label="任务" onClick={() => setScene("quests")}><IcoQuest /></HubFab>
          <HubFab label="背包" guide="go-equip" onClick={() => { useUi.getState().setStackReturn(null); setScene("equipment"); }}><IcoEquip /></HubFab>
          <HubFab label="笔记" onClick={() => setScene("notes")}><IcoNotes /></HubFab>
        </div>
        <div className="hub-side right">
          <HubFab
            label="图鉴"
            guide="open-encyc"
            onClick={openEncyclopedia}
          >
            <IcoEncyc />
          </HubFab>
          <HubFab
            label={scatterFeed ? "✅喂食" : "喂食"}
            active={scatterFeed || feedPanelOpen}
            guide="feed-btn"
            onClick={toggleFeedPanel}
          >
            <IcoFeed />
          </HubFab>
          <HubFab
            label={tankMateSpray ? "✅配偶" : "配偶"}
            active={tankMateSpray || matePanelOpen}
            guide="mate-btn"
            onClick={toggleMateSpray}
          >
            <IcoPair />
          </HubFab>
        </div>
        {bar2Fish && selectedDef && selected && (
          <div className="hub-bar2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="dim hub-bar2-title"
              onClick={() => setNameOpen(true)}
            >
              {fishTitle(selected)} <SexIcon sex={selected.sex} /> <GrowthStageChip healthMax={fishHealthMax(selected)} /> · 健康 {selected.health}/{fishHealthMax(selected)} · 好感 {selected.affection ?? 0}/{AFFECTION_MAX}
            </button>
            <div className="hub-bar2-actions cols-5">
              <button onClick={() => setNameOpen(true)}>
                <IcoName />{selected.customName ? "改名" : "起名"}
              </button>
              <button onClick={() => setMoveTankOpen(true)}>
                <IcoExpand />换缸
              </button>
              <button
                data-guide="store-to-basket"
                onClick={() => {
                  if (putTankToBasket([selected.uid])) selectTankFish(null);
                }}
              >
                <IcoBasket />存筐
              </button>
              <button onClick={() => setSellPickOpen(true)}>
                <IcoList />售卖
              </button>
              <button
                className="danger"
                onClick={() =>
                  askConfirm({
                    title: "确认放生",
                    message: `确定放生「${fishTitle(selected)}」？放生后无法找回。`,
                    confirmLabel: "放生",
                    danger: true,
                    onConfirm: () => release(selected.uid),
                  })
                }
              >
                <IcoRelease />放生
              </button>
            </div>
          </div>
        )}
        {bar2Egg && selectedEgg && eggDef && (
          <div className="hub-bar2" onClick={(e) => e.stopPropagation()}>
            <div className="dim" style={{ padding: "0 10px 6px", fontSize: 12 }}>
              {selectedEgg.customName ? `${selectedEgg.customName} · ` : ""}
              {eggDef.name}
              {eggDaysLeft > 0 ? ` · 还要 ${eggDaysLeft} 天孵化` : " · 孵化中"}
            </div>
            <div className="hub-bar2-actions cols-4">
              <button onClick={() => setEggNameOpen(true)} data-guide="egg-name"><IcoName />起名</button>
              <button
                onClick={() => {
                  if (eggHatchDue) {
                    flushEggHatch();
                    return;
                  }
                  setPanel("hatch");
                }}
              >
                <IcoHatch />加速孵化
              </button>
              <button onClick={() => setMoveEggOpen(true)}><IcoExpand />换缸</button>
              <button onClick={() => setEggSellOpen(true)}><IcoList />售卖</button>
            </div>
          </div>
        )}
        </div>
        <button
          type="button"
          className="hub-ui-toggle"
          title={uiHidden ? "显示选项" : "隐藏选项"}
          aria-label={uiHidden ? "显示选项" : "隐藏选项"}
          aria-pressed={uiHidden}
          onClick={() => setUiHidden((v) => !v)}
        >
          <IcoEye size={20} off={uiHidden} />
        </button>
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

      {panel === "mate" && matePanelOpen && (
        <MatePanel
          lots={save.attractantLots ?? []}
          onBackAquarium={backAquariumFromMate}
          onShop={() => {
            useUi.getState().openAquariumShopFromPanel("mate");
            useUi.getState().openShopTab("attractant");
            setScene("shop");
          }}
          onClose={closeMatePanel}
        />
      )}
      {panel === "feed" && feedPanelOpen && (
        <FeedPanel
          stock={save.foodStock}
          equippedFoodId={save.equipped.food}
          matchQualities={selectedDef ? [selectedDef.quality] : undefined}
          guideFeed={save.started && !save.guideSkipped && save.questStep === "q_feed"}
          onBackAquarium={backAquariumFromFeed}
          onShop={() => {
            useUi.getState().openAquariumShopFromPanel("feed");
            useUi.getState().openShopTab("food");
            setScene("shop");
          }}
          onClose={closeFeedPanel}
        />
      )}
      {moveTankOpen && selected && (
        <ModalSheet title="换缸" onClose={() => setMoveTankOpen(false)}>
          {otherTanks.length === 0 ? (
            <p className="dim">只有一口缸。扩建后再买新缸。</p>
          ) : (
            <div className="tank-target-scroll">
              {otherTanks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="primary"
                  onClick={() => {
                    if (moveTankFish([selected.uid], t.id)) {
                      setMoveTankOpen(false);
                      selectTankFish(null);
                    }
                  }}
                >
                  换到 {t.name}（{occupancy(save, t.id)}/{t.capacity}）
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setMoveTankOpen(false)}>关闭</button>
        </ModalSheet>
      )}
      {moveEggOpen && selectedEgg && (
        <ModalSheet title="卵换缸" onClose={() => setMoveEggOpen(false)}>
          {otherTanks.length === 0 ? (
            <p className="dim">只有一口缸。</p>
          ) : (
            <div className="tank-target-scroll">
              {otherTanks.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="primary"
                  onClick={() => {
                    if (moveEggToTank(selectedEgg.uid, t.id)) setMoveEggOpen(false);
                  }}
                >
                  换到 {t.name}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setMoveEggOpen(false)}>关闭</button>
        </ModalSheet>
      )}
      {eggNameOpen && selectedEgg && (
        <ModalSheet title={selectedEgg.customName ? "卵改名" : "卵起名"} onClose={() => setEggNameOpen(false)}>
          <input
            value={eggNameDraft}
            maxLength={FISH_NAME_MAX_LEN}
            placeholder="给这枚卵起个名字"
            onChange={(e) => setEggNameDraft(e.target.value)}
          />
          <button
            className="primary"
            onClick={() => {
              if (renameEgg(selectedEgg.uid, eggNameDraft)) setEggNameOpen(false);
            }}
          >
            确定
          </button>
          <button onClick={() => setEggNameOpen(false)}>取消</button>
        </ModalSheet>
      )}
      {eggSellOpen && selectedEgg && eggDef && (
        <ModalSheet title={`售卖 ${eggDef.name}卵`} onClose={() => setEggSellOpen(false)}>
          <p className="dim">销售立刻换成金币；挂售放到鱼行等别人买。</p>
          <button
            className="primary"
            onClick={() => {
              const price = Math.max(2, Math.floor(hatchCost * 0.65));
              askConfirm({
                title: "确认销售",
                message: `立刻卖掉这枚卵，到手 ${price} 金？`,
                confirmLabel: "销售",
                onConfirm: () => {
                  sellEggFromTank(selectedEgg.uid);
                  setEggSellOpen(false);
                },
              });
            }}
          >
            销售
          </button>
          <button
            onClick={() =>
              askConfirm({
                title: "确认挂售",
                message: `确定把这枚鱼卵挂到鱼行，售价 ${Math.max(2, hatchCost)} 金？`,
                confirmLabel: "挂售",
                onConfirm: () => {
                  listEgg(selectedEgg.uid, Math.max(2, hatchCost));
                  setEggSellOpen(false);
                },
              })
            }
          >
            挂售
          </button>
          <button onClick={() => setEggSellOpen(false)}>取消</button>
        </ModalSheet>
      )}

      {panel === "hatch" && selectedEgg && eggDaysLeft > 0 && (
        <ModalSheet title="加速孵化" onClose={() => setPanel("none")}>
            <p className="dim">还要 {eggDaysLeft} 天自动孵化。珍珠或广告可加速 1 天。</p>
            <button onClick={() => accelerateEgg(selectedEgg.uid, "pearl")}>珍珠加速 {HATCH_PEARL}</button>
            <button onClick={() => openAd({ kind: "egg", uid: selectedEgg.uid })}>看广告加速</button>
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
          <p className="dim">最多 {FISH_NAME_MAX_LEN} 个字。</p>
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

      {sellPickOpen && selected && selectedDef && (
        <ModalSheet title={`售卖 ${fishTitle(selected)}`} onClose={() => setSellPickOpen(false)}>
          <p className="dim">销售立刻换成金币；挂售放到鱼行等别人买。</p>
          <button
            onClick={() => {
              setSellPickOpen(false);
              setListPrice(tankSellPrice(selectedDef.sellPrice, fishHealthMax(selected), false) ?? selectedDef.sellPrice);
            }}
          >
            挂售
          </button>
          <button
            className="primary"
            onClick={() => {
              const price = tankSellPrice(selectedDef.sellPrice, fishHealthMax(selected), false);
              if (price == null) return;
              setSellPickOpen(false);
              askConfirm({
                title: "确认销售",
                message: `立刻卖掉「${fishTitle(selected)}」，到手 ${price} 金？`,
                confirmLabel: "销售",
                onConfirm: () => sellFromTank(selected.uid),
              });
            }}
          >
            销售
          </button>
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
