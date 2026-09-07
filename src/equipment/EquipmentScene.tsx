import { useEffect, useState } from "react";
import { useGame } from "../store/gameStore";
import { PART_BY_ID, PART_DEFS, ROD_BY_ID, STOOL_BY_ID, BASKET_BY_ID, basketShopHint, partStatHint, rodShopHint, stoolHint, rodGearBlurb, stoolGearBlurb } from "../data/equipmentDefs";
import { CONSUMABLE_BY_ID, baitShopHint } from "../data/consumableDefs";
import { OUTFIT_DEFS } from "../data/outfitDefs";
import { BOOK_DEFS } from "../data/bookDefs";
import { ROD_PART_LABEL, ROD_PART_SLOTS, type RodPartSlot } from "../types";
import { basketWeightKg } from "../game/weight";
import { dishDaysLeft, dishEatWaitMs, dishExpired, ENERGY_DRINK_STAMINA, formatWait, satietyHint, satietyLeft, YUANQI_RESTORE } from "../game/stamina";
import { FISH_BY_ID } from "../data/fishDefs";
import { FishPortrait, GearIcon } from "../art/Art";
import PersonView from "../art/PersonView";
import { EmptyHint, GoodsRow, ModalSheet, Page, PageBody, PageHead, QualityChip, TabBar } from "../ui/chrome";
import { useUi } from "../store/uiStore";

type Tab = "rod" | "bait" | "stool" | "basket" | "energy" | "outfit" | "book";

export default function EquipmentScene() {
  const save = useGame((s) => s.save);
  const equip = useGame((s) => s.equip);
  const equipPart = useGame((s) => s.equipPart);
  const equipOutfit = useGame((s) => s.equipOutfit);
  const setLookSex = useGame((s) => s.setLookSex);
  const toggleTripBait = useGame((s) => s.toggleTripBait);
  const eatDish = useGame((s) => s.eatDish);
  const discardDish = useGame((s) => s.discardDish);
  const drinkEnergy = useGame((s) => s.drinkEnergy);
  const drinkYuanqi = useGame((s) => s.drinkYuanqi);
  const setScene = useGame((s) => s.setScene);
  const [tab, setTab] = useState<Tab>("rod");
  const [rodInspect, setRodInspect] = useState<string | null>(null);
  const [swapSlot, setSwapSlot] = useState<RodPartSlot | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const setEquipCurrentTab = useUi((s) => s.setEquipCurrentTab);
  const stackReturn = useUi((s) => s.stackReturn);
  const setStackReturn = useUi((s) => s.setStackReturn);
  const setEncycReturn = useUi((s) => s.setEncycReturn);
  const equipTabPref = useUi((s) => s.equipTabPref);
  const clearEquipTabPref = useUi((s) => s.clearEquipTabPref);

  function leave() {
    const back = stackReturn === "profile" ? "profile" : "aquarium";
    setStackReturn(null);
    setScene(back);
  }

  useEffect(() => {
    if (!equipTabPref) return;
    const allowed: Tab[] = ["rod", "bait", "stool", "basket", "energy", "outfit", "book"];
    if (allowed.includes(equipTabPref as Tab)) setTab(equipTabPref as Tab);
    clearEquipTabPref();
  }, [equipTabPref, clearEquipTabPref]);

  useEffect(() => {
    setEquipCurrentTab(tab);
    return () => setEquipCurrentTab(null);
  }, [tab, setEquipCurrentTab]);

  useEffect(() => {
    if (tab !== "energy") return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [tab]);

  const basket = BASKET_BY_ID[save.equipped.basket];
  const trip = save.equippedBaitIds ?? [save.equipped.bait];
  const bw = basketWeightKg(save.basket);
  const meals = satietyLeft(save);
  const eatWait = dishEatWaitMs(save.lastDishAteAt, now);

  const slotParts = (slot: RodPartSlot) =>
    PART_DEFS.filter((p) => p.slot === slot && save.ownedParts.includes(p.id));

  return (
    <Page>
      <PageHead onBack={leave} title="背包" backLabel={stackReturn === "profile" ? "主页" : "水族馆"} />
      <TabBar
        items={[
          { id: "rod", label: "鱼竿" },
          { id: "bait", label: "鱼饵" },
          { id: "stool", label: "板凳" },
          { id: "basket", label: "鱼筐" },
          { id: "energy", label: "道具", guide: "equip-tab-energy" },
          { id: "outfit", label: "服装" },
          { id: "book", label: "书籍", guide: "equip-tab-book" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <PageBody>
        {tab === "rod" && (
          <>
            <p className="dim" style={{ padding: "4px 14px" }}>
              {rodGearBlurb()}右侧可装备或改装配件（轮、线、钩、漂）。
            </p>
            {save.ownedRods.map((id) => {
              const r = ROD_BY_ID[id];
              const equipped = save.equipped.rod === id;
              return (
                <GoodsRow
                  key={id}
                  icon={<GearIcon kind="rod" size={48} />}
                  title={r.name}
                  quality={r.quality}
                  hint={`${rodShopHint(r)}${equipped ? " · 使用中" : ""}`}
                  action={
                    <div className="row equip-rod-actions">
                      <button
                        type="button"
                        className={equipped ? "primary" : ""}
                        onClick={() => equip("rod", id)}
                      >
                        装备
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          equip("rod", id);
                          setRodInspect(id);
                          setSwapSlot(null);
                        }}
                      >
                        改装
                      </button>
                    </div>
                  }
                />
              );
            })}
            {rodInspect && ROD_BY_ID[rodInspect] && (
              <ModalSheet
                title={ROD_BY_ID[rodInspect].name}
                onClose={() => { setRodInspect(null); setSwapSlot(null); }}
              >
                  <p className="dim">
                    点「更换」换配件。
                  </p>
                  <div className="rod-parts">
                    {ROD_PART_SLOTS.map((slot) => {
                      const pid = save.equippedParts[slot];
                      const part = PART_BY_ID[pid];
                      return (
                        <div className="rod-part" key={slot}>
                          <div>
                            <strong>{ROD_PART_LABEL[slot]}</strong>
                            <div className="dim">{part ? `${part.name} · ${partStatHint(part)}` : "空"}</div>
                          </div>
                          <button onClick={() => setSwapSlot(slot)}>更换</button>
                        </div>
                      );
                    })}
                  </div>
                  {swapSlot && (
                    <div className="panel" style={{ margin: "8px 0" }}>
                      <div className="dim">选用{ROD_PART_LABEL[swapSlot]}</div>
                      {slotParts(swapSlot).map((p) => (
                        <button
                          key={p.id}
                          className={save.equippedParts[swapSlot] === p.id ? "primary" : ""}
                          onClick={() => { equipPart(swapSlot, p.id); setSwapSlot(null); }}
                        >
                          {p.name} · {partStatHint(p)} <QualityChip quality={p.quality} />
                        </button>
                      ))}
                      {slotParts(swapSlot).length === 0 && <p className="dim">包里还没有别的{ROD_PART_LABEL[swapSlot]}，去商城看看。</p>}
                    </div>
                  )}
                  <button className="primary" onClick={() => { setRodInspect(null); setSwapSlot(null); }}>关闭</button>
              </ModalSheet>
            )}
          </>
        )}

        {tab === "bait" && (
          <>
            <p className="dim" style={{ padding: "4px 14px" }}>勾选要带的饵。高亮的是下竿用的。</p>
            {Object.entries(save.baitStock).filter(([, n]) => n > 0).map(([id, n]) => {
              const c = CONSUMABLE_BY_ID[id];
              if (!c) return null;
              const inTrip = trip.includes(id);
              const active = save.equipped.bait === id;
              return (
                <GoodsRow
                  key={id}
                  icon={<GearIcon kind="bait" size={40} />}
                  title={`${c.name} ×${n}`}
                  quality={c.quality}
                  hint={baitShopHint(c)}
                  action={
                    <div className="row">
                      <button className={inTrip ? "primary" : ""} onClick={() => toggleTripBait(id)}>
                        {inTrip ? "已携带" : "携带"}
                      </button>
                      <button className={active ? "primary" : ""} onClick={() => equip("bait", id)}>当前</button>
                    </div>
                  }
                />
              );
            })}
          </>
        )}

        {tab === "stool" && (
          <>
            <p className="dim" style={{ padding: "4px 14px" }}>
              {stoolGearBlurb()}
            </p>
            {save.ownedStools.map((id) => {
              const s = STOOL_BY_ID[id];
              return (
                <GoodsRow
                  key={id}
                  icon={<GearIcon kind="stool" size={40} />}
                  title={s.name}
                  quality={s.quality}
                  hint={stoolHint(s)}
                  action={
                    <button className={save.equipped.stool === id ? "primary" : ""} onClick={() => equip("stool", id)}>
                      {save.equipped.stool === id ? "已装备" : "装备"}
                    </button>
                  }
                />
              );
            })}
          </>
        )}

        {tab === "basket" && (
          <>
            <p className="dim" style={{ padding: "4px 14px" }}>当前 {save.basket.length}/{basket?.capacity} 条 · {bw.toFixed(1)}/{basket?.weightCap}kg</p>
            {save.ownedBaskets.map((id) => {
              const b = BASKET_BY_ID[id];
              return (
                <GoodsRow
                  key={id}
                  icon={<GearIcon kind="basket" size={40} />}
                  title={b.name}
                  quality={b.quality}
                  hint={basketShopHint(b)}
                  action={
                    <button className={save.equipped.basket === id ? "primary" : ""} onClick={() => equip("basket", id)}>
                      {save.equipped.basket === id ? "已装备" : "装备"}
                    </button>
                  }
                />
              );
            })}
          </>
        )}

        {tab === "energy" && (
          <>
            <p className="dim" style={{ padding: "4px 14px" }}>
              {satietyHint(save)}。菜 3 天过期。饮料随时能喝。
            </p>
            {(save.dishes ?? []).map((d, i) => {
              const def = FISH_BY_ID[d.defId];
              if (!def) return null;
              const expired = dishExpired(d.cookedDay, save.gameDay);
              const shelf = dishDaysLeft(d.cookedDay, save.gameDay);
              const eatLabel = expired ? "丢弃"
                : meals.left <= 0 ? "无法再进食"
                : eatWait > 0 ? `还要等 ${formatWait(eatWait)}`
                : "吃";
              return (
                <div className="panel row-between" key={d.uid}>
                  <div className="row" style={{ alignItems: "center" }}>
                    <FishPortrait id={def.id} size={40} alt={def.name} />
                    <div>
                      <strong>{def.name}菜</strong>
                      <QualityChip quality={def.quality} />
                      <div className="dim">
                        +{d.restore} 能量 · {expired ? "已过期" : `还能放 ${shelf} 天`}
                      </div>
                    </div>
                  </div>
                  {expired ? (
                    <button className="danger" onClick={() => discardDish(d.uid)}>丢弃</button>
                  ) : (
                    <button className="primary" data-guide={i === 0 ? "eat-dish" : undefined} onClick={() => eatDish(d.uid)}>{eatLabel}</button>
                  )}
                </div>
              );
            })}
            {(save.dishes ?? []).length === 0 && <EmptyHint>还没有菜，去做菜页做。</EmptyHint>}
            <div className="panel row-between">
              <div>
                <strong>能量饮料</strong>
                <div className="dim">+{ENERGY_DRINK_STAMINA} 能量 · 无保质期 · 库存 {save.energyDrinkStock ?? 0}</div>
              </div>
              <button
                className="primary"
                disabled={(save.energyDrinkStock ?? 0) < 1}
                onClick={() => drinkEnergy()}
              >
                使用
              </button>
            </div>
            <div className="panel row-between">
              <div>
                <strong>元气瓶</strong>
                <div className="dim">+{YUANQI_RESTORE} 能量 · 无保质期 · 库存 {save.yuanqiBottles ?? 0}</div>
              </div>
              <button
                className="primary"
                disabled={(save.yuanqiBottles ?? 0) < 1}
                onClick={() => drinkYuanqi()}
              >
                使用
              </button>
            </div>
          </>
        )}

        {tab === "outfit" && (
          <>
            <div className="panel">
              <div className="row-between">
                <strong>外观</strong>
                <span className="row">
                  <button className={save.lookSex === "male" ? "primary" : ""} onClick={() => setLookSex("male")}>男</button>
                  <button className={save.lookSex === "female" ? "primary" : ""} onClick={() => setLookSex("female")}>女</button>
                </span>
              </div>
              <PersonView className="outfit-preview" outfitId={save.equippedOutfit} sex={save.lookSex} size={140} />
              <div className="dim">仅外观。男女各一版，钓感不变。</div>
            </div>
            {OUTFIT_DEFS.filter((o) => save.ownedOutfits.includes(o.id)).map((o) => (
              <GoodsRow
                key={o.id}
                title={o.name}
                quality={o.quality}
                hint={o.blurb}
                action={
                  <button className={save.equippedOutfit === o.id ? "primary" : ""} onClick={() => equipOutfit(o.id)}>
                    {save.equippedOutfit === o.id ? "穿着中" : "穿上"}
                  </button>
                }
              />
            ))}
          </>
        )}

        {tab === "book" && (
          <>
            <div className="panel">
              <h2>可阅读书籍</h2>
              <button
                className="primary"
                data-guide="open-encyc"
                onClick={() => {
                  setEncycReturn("equipment");
                  setScene("encyclopedia");
                }}
              >
                阅读图鉴
              </button>
            </div>
            {BOOK_DEFS.filter((b) => save.ownedBooks.includes(b.id)).map((b) => (
              <GoodsRow key={b.id} title={b.name} hint={b.hint} />
            ))}
            {save.ownedBooks.length === 0 && <EmptyHint>还没有增益书籍，去商城买。</EmptyHint>}
          </>
        )}
      </PageBody>
    </Page>
  );
}
