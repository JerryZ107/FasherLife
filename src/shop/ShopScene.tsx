import { useEffect, useState } from "react";
import { useGame } from "../store/gameStore";
import { useUi } from "../store/uiStore";
import { CONSUMABLE_DEFS, baitShopHint, foodIdFromBait, foodShopHint } from "../data/consumableDefs";
import {
  BASKET_BY_ID,
  BASKET_DEFS,
  PART_DEFS,
  ROD_BY_ID,
  ROD_DEFS,
  STOOL_BY_ID,
  STOOL_DEFS,
  basketShopHint,
  partStatHint,
  rodShopHint,
  stoolHint,
} from "../data/equipmentDefs";
import { OUTFIT_DEFS } from "../data/outfitDefs";
import { BOOK_DEFS } from "../data/bookDefs";
import { TANK_DEFS, tankShopHint } from "../data/tankDefs";
import { ATTRACTANT_DEFS, attractantShopHint } from "../data/attractantDefs";
import { ROD_PART_LABEL } from "../types";
import { MONTHLY_CARD_DAILY_GOLD, MONTHLY_CARD_DAYS, PEARL_TO_GOLD } from "../game/constants";
import { ENERGY_DRINK_PRICE, ENERGY_DRINK_STAMINA, SALT_PACK_SIZE, SALT_PRICE } from "../game/stamina";
import { monthlyCardActive, monthlyDaysLeft } from "../game/monthlyCard";
import { ensureTankSlotArray, hasEmptySlot } from "../game/tanks";
import { GearIcon } from "../art/Art";
import { GoodsRow, Page, PageBody, PageHead, PriceBtn, TabBar } from "../ui/chrome";

type Tab = "pack" | "gear" | "food" | "tank" | "attractant" | "stamina" | "pearl";
type GearSub = "outfit" | "rod" | "parts" | "bait" | "stool" | "basket" | "book";

function afford(saveGold: number, savePearl: number, currency: "gold" | "pearl", price: number) {
  return currency === "gold" ? saveGold >= price : savePearl >= price;
}

export default function ShopScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const buyBaitPack = useGame((s) => s.buyBaitPack);
  const buyFoodPack = useGame((s) => s.buyFoodPack);
  const buyRod = useGame((s) => s.buyRod);
  const buyStool = useGame((s) => s.buyStool);
  const buyBasket = useGame((s) => s.buyBasket);
  const buyPart = useGame((s) => s.buyPart);
  const buyOutfit = useGame((s) => s.buyOutfit);
  const buyBook = useGame((s) => s.buyBook);
  const buyGearPack = useGame((s) => s.buyGearPack);
  const buyOutfitPack = useGame((s) => s.buyOutfitPack);
  const buyTank = useGame((s) => s.buyTank);
  const buyTankPack = useGame((s) => s.buyTankPack);
  const buyAttractant = useGame((s) => s.buyAttractant);
  const topUpPearl = useGame((s) => s.topUpPearl);
  const exchangePearlToGold = useGame((s) => s.exchangePearlToGold);
  const buyNewbiePack = useGame((s) => s.buyNewbiePack);
  const buyMonthlyCard = useGame((s) => s.buyMonthlyCard);
  const buySalt = useGame((s) => s.buySalt);
  const buyEnergyDrink = useGame((s) => s.buyEnergyDrink);
  const [tab, setTab] = useState<Tab>("pack");
  const [gear, setGear] = useState<GearSub>("rod");
  const shopTab = useUi((s) => s.shopTab);
  const setShopCurrentTab = useUi((s) => s.setShopCurrentTab);

  useEffect(() => {
    if (!shopTab) return;
    setTab(shopTab);
    useUi.getState().clearShopTab();
  }, [shopTab]);

  useEffect(() => {
    setShopCurrentTab(tab);
    return () => setShopCurrentTab(null);
  }, [tab, setShopCurrentTab]);

  const newbieOpen = save.gameDay < save.newbiePackUntilDay;

  return (
    <Page>
      <PageHead onBack={() => setScene("aquarium")} title="商城" backGuide="back-aquarium" />
      <TabBar
        wrap
        items={[
          { id: "pack", label: "礼包" },
          { id: "gear", label: "装备" },
          { id: "food", label: "鱼粮", guide: "shop-food" },
          { id: "tank", label: "鱼缸" },
          { id: "attractant", label: "求偶香" },
          { id: "stamina", label: "道具" },
          { id: "pearl", label: "珍珠" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "gear" && (
        <TabBar
          items={[
            { id: "outfit", label: "服饰" },
            { id: "rod", label: "鱼竿" },
            { id: "parts", label: "配件" },
            { id: "bait", label: "鱼饵" },
            { id: "stool", label: "板凳" },
            { id: "basket", label: "鱼筐" },
            { id: "book", label: "书籍" },
          ]}
          value={gear}
          onChange={setGear}
        />
      )}
      <PageBody>
        {tab === "pack" && (
          <>
            <div className="panel">
              <h2>月卡 · 30 元</h2>
              <p className="dim">
                每日 {MONTHLY_CARD_DAILY_GOLD} 金 · 漏登进邮箱 · 可叠加
              </p>
              <p>
                {monthlyCardActive(save)
                  ? `还剩 ${monthlyDaysLeft(save)} 天 · 用到第 ${save.monthlyCardUntilDay} 天`
                  : "未开通"}
              </p>
              <button className="primary" onClick={buyMonthlyCard}>
                {monthlyCardActive(save) ? `续费 +${MONTHLY_CARD_DAYS} 天` : "开通月卡"}
              </button>
            </div>
            <div className="panel">
              <h2>限时新人礼包 · 6 元</h2>
              <p className="dim">
                {ROD_BY_ID.rod_golden_vortex.name} {rodShopHint(ROD_BY_ID.rod_golden_vortex)}（含配套四件）
                · {BASKET_BY_ID.basket_gift.name} {basketShopHint(BASKET_BY_ID.basket_gift)}
                · 优质鱼饵×10 · 买完直接装备 · 开局 7 天内
              </p>
              {save.claimedNewbiePack ? (
                <span className="chip">售罄</span>
              ) : !newbieOpen ? (
                <span className="chip">已过期</span>
              ) : (
                <button className="primary" onClick={buyNewbiePack}>
                  购买并装备 · 还剩 {save.newbiePackUntilDay - save.gameDay} 天
                </button>
              )}
            </div>
            <div className="panel">
              <h2>装备礼包 · 6 元</h2>
              <p className="dim">
                {ROD_BY_ID.rod_fiberglass.name} {rodShopHint(ROD_BY_ID.rod_fiberglass)}（含配套四件）
                · {STOOL_BY_ID.stool_folding.name} {stoolHint(STOOL_BY_ID.stool_folding)}
                · {BASKET_BY_ID.basket_medium.name} {basketShopHint(BASKET_BY_ID.basket_medium)}
                · 糠面饵×20
              </p>
              {save.claimedGearPack ? (
                <span className="chip">售罄</span>
              ) : (
                <button className="primary" onClick={buyGearPack}>购买</button>
              )}
            </div>
            <div className="panel">
              <h2>服装礼包 · 10 元</h2>
              <p className="dim">节庆套 · 仅外观 · 男女各一版</p>
              {save.claimedOutfitPack ? (
                <span className="chip">售罄</span>
              ) : (
                <button className="primary" onClick={buyOutfitPack}>购买并穿上</button>
              )}
            </div>
            <div className="panel">
              <h2>鱼缸礼包 · 8 元</h2>
              <p className="dim">
                立即腾出一个新空位，并摆上一口优良缸（容量 {TANK_DEFS.find((t) => t.id === "tank_fine_gold")?.capacity ?? 10} 条）
              </p>
              {save.claimedTankPack ? (
                <span className="chip">售罄</span>
              ) : (
                <button className="primary" onClick={buyTankPack}>购买并切换</button>
              )}
            </div>
          </>
        )}

        {tab === "pearl" && (
          <>
            <div className="panel">
              <h2>珍珠充值</h2>
              <p className="dim">演示用，点击模拟充值成功。</p>
              <div className="row">
                <button onClick={() => topUpPearl(6)}>¥6</button>
                <button onClick={() => topUpPearl(30)}>¥30</button>
                <button onClick={() => topUpPearl(68)}>¥68</button>
              </div>
            </div>
            <div className="panel">
              <h2>珍珠转金币</h2>
              <p className="dim">1 珍珠兑 {PEARL_TO_GOLD} 金币。</p>
              <div className="row">
                <button disabled={save.pearl < 1} onClick={() => exchangePearlToGold(1)}>
                  1 珍珠兑 {PEARL_TO_GOLD} 金
                </button>
                <button disabled={save.pearl < 10} onClick={() => exchangePearlToGold(10)}>
                  10 珍珠兑 {PEARL_TO_GOLD * 10} 金
                </button>
              </div>
            </div>
          </>
        )}

        {tab === "gear" && gear === "outfit" && OUTFIT_DEFS.filter((o) => !o.hiddenFromShop).map((o) => {
          const owned = save.ownedOutfits.includes(o.id);
          const can = afford(save.gold, save.pearl, o.currency, o.price);
          return (
            <GoodsRow
              key={o.id}
              title={o.name}
              quality={o.quality}
              hint={o.blurb}
              action={owned ? <span className="chip ok">已拥有</span> : o.price === 0 ? <span className="chip">开局就有</span> : (
                <PriceBtn currency={o.currency} price={o.price} disabled={!can} onClick={() => buyOutfit(o.id)} />
              )}
            />
          );
        })}
        {tab === "gear" && gear === "book" && BOOK_DEFS.map((b) => {
          const owned = save.ownedBooks.includes(b.id);
          const can = afford(save.gold, save.pearl, b.currency, b.price);
          return (
            <GoodsRow
              key={b.id}
              title={b.name}
              hint={b.hint}
              action={owned ? <span className="chip ok">已拥有</span> : (
                <PriceBtn currency={b.currency} price={b.price} disabled={!can} onClick={() => buyBook(b.id)} />
              )}
            />
          );
        })}
        {tab === "tank" && (
          <>
            <p className="dim" style={{ padding: "4px 14px" }}>
              {hasEmptySlot(save)
                ? `还有 ${ensureTankSlotArray(save).filter((id) => id == null).length} 个空凹槽，买下可直摆。`
                : "买下后去缸位管理摆出来。"}
            </p>
            {TANK_DEFS.map((def) => {
              const can = afford(save.gold, save.pearl, def.currency, def.price);
              return (
                <GoodsRow
                  key={def.id}
                  title={def.name}
                  quality={def.quality}
                  hint={tankShopHint(def)}
                  action={
                    <PriceBtn currency={def.currency} price={def.price} disabled={!can} onClick={() => buyTank(def.id)} />
                  }
                />
              );
            })}
          </>
        )}
        {tab === "attractant" && (
          <>
            <p className="dim" style={{ padding: "4px 14px" }}>
              喂单条或喷整缸，详情看说明。
            </p>
            {ATTRACTANT_DEFS.map((a) => {
              const can = afford(save.gold, save.pearl, a.currency, a.price);
              const n = save.attractantStock?.[a.id] ?? 0;
              return (
                <GoodsRow
                  key={a.id}
                  title={a.name}
                  quality={a.quality}
                  hint={attractantShopHint(a, n)}
                  action={<PriceBtn currency={a.currency} price={a.price} disabled={!can} onClick={() => buyAttractant(a.id)} />}
                />
              );
            })}
          </>
        )}
        {tab === "gear" && gear === "rod" && (
          <>
            <p className="dim" style={{ padding: "4px 14px" }}>
              买竿带配套四件，改装去背包页。
            </p>
            {ROD_DEFS.filter((r) => !r.hiddenFromShop).map((r) => {
              const owned = save.ownedRods.includes(r.id);
              const can = afford(save.gold, save.pearl, r.currency, r.price);
              return (
                <GoodsRow
                  key={r.id}
                  icon={<GearIcon kind="rod" size={48} />}
                  title={r.name}
                  quality={r.quality}
                  hint={rodShopHint(r)}
                  action={owned ? <span className="chip ok">已拥有</span> : r.price === 0 ? <span className="chip">开局就有</span> : (
                    <PriceBtn currency={r.currency} price={r.price} disabled={!can} onClick={() => buyRod(r.id)} />
                  )}
                />
              );
            })}
          </>
        )}
        {tab === "gear" && gear === "parts" && (
          <>
            <p className="dim" style={{ padding: "4px 14px" }}>
              四件配件，装到竿上生效。
            </p>
            {PART_DEFS.filter((p) => !p.hiddenFromShop).map((p) => {
              const owned = save.ownedParts.includes(p.id);
              const can = afford(save.gold, save.pearl, p.currency, p.price);
              return (
                <GoodsRow
                  key={p.id}
                  title={p.name}
                  quality={p.quality}
                  hint={`${ROD_PART_LABEL[p.slot]} · ${partStatHint(p)}`}
                  action={owned ? <span className="chip ok">已拥有</span> : (
                    <PriceBtn currency={p.currency} price={p.price} disabled={!can} onClick={() => buyPart(p.id)} />
                  )}
                />
              );
            })}
          </>
        )}
        {tab === "gear" && gear === "bait" && (
          <>
            <p className="dim" style={{ padding: "4px 14px" }}>
              每次下竿用 1 个。20 个一袋。
            </p>
            {CONSUMABLE_DEFS.filter((c) => !c.hiddenFromShop).map((c) => (
              <GoodsRow
                key={c.id}
                icon={<GearIcon kind="bait" size={48} />}
                title={c.name}
                quality={c.quality}
                hint={baitShopHint(c)}
                action={<PriceBtn currency="gold" price={c.baitPrice * 20} label="买×20" disabled={save.gold < c.baitPrice * 20} onClick={() => buyBaitPack(c.id, 1)} />}
              />
            ))}
          </>
        )}
        {tab === "gear" && gear === "stool" && (
          <>
            <p className="dim" style={{ padding: "4px 14px" }}>
              玩家滑块尺寸。
            </p>
            {STOOL_DEFS.map((s) => {
              const owned = save.ownedStools.includes(s.id);
              const can = afford(save.gold, save.pearl, s.currency, s.price);
              return (
                <GoodsRow
                  key={s.id}
                  icon={<GearIcon kind="stool" size={48} />}
                  title={s.name}
                  quality={s.quality}
                  hint={stoolHint(s)}
                  action={owned ? <span className="chip ok">已拥有</span> : (
                    <PriceBtn currency={s.currency} price={s.price} disabled={!can} onClick={() => buyStool(s.id)} />
                  )}
                />
              );
            })}
          </>
        )}
        {tab === "gear" && gear === "basket" && BASKET_DEFS.filter((b) => !b.hiddenFromShop).map((b) => {
          const owned = save.ownedBaskets.includes(b.id);
          const can = afford(save.gold, save.pearl, b.currency, b.price);
          return (
            <GoodsRow
              key={b.id}
              icon={<GearIcon kind="basket" size={48} />}
              title={b.name}
              quality={b.quality}
              hint={basketShopHint(b)}
              action={owned ? <span className="chip ok">已拥有</span> : (
                <PriceBtn currency={b.currency} price={b.price} disabled={!can} onClick={() => buyBasket(b.id)} />
              )}
            />
          );
        })}

        {tab === "food" && (
          <>
            <p className="dim" style={{ padding: "4px 14px" }}>
              喂缸里的鱼用。10 份一袋。
            </p>
            <div data-guide="shop-food-list">
              {CONSUMABLE_DEFS.filter((c) => !c.hiddenFromShop).map((c) => (
                <GoodsRow
                  key={c.id}
                  icon={<GearIcon kind="food" size={48} />}
                  title={`${c.foodName}*10`}
                  quality={c.quality}
                  hint={foodShopHint(c)}
                  action={<PriceBtn currency="gold" price={c.foodPrice * 10} disabled={save.gold < c.foodPrice * 10} onClick={() => buyFoodPack(foodIdFromBait(c.id), 1)} />}
                />
              ))}
            </div>
          </>
        )}
        {tab === "stamina" && (
          <>
            <div className="panel row-between">
              <div>
                <strong>盐</strong>
                <div className="dim">做菜用 · {SALT_PRICE} 金/份 · 库存 {save.saltStock}</div>
              </div>
              <div className="row">
                <button disabled={save.gold < SALT_PRICE * SALT_PACK_SIZE} onClick={() => buySalt(SALT_PACK_SIZE)}>
                  买×{SALT_PACK_SIZE} · {SALT_PRICE * SALT_PACK_SIZE}金
                </button>
              </div>
            </div>
            <div className="panel row-between">
              <div>
                <strong>能量饮料</strong>
                <div className="dim">+{ENERGY_DRINK_STAMINA} 能量 · 库存 {save.energyDrinkStock} · 去背包页喝</div>
              </div>
              <div className="row">
                <PriceBtn
                  currency="pearl"
                  price={ENERGY_DRINK_PRICE}
                  disabled={save.pearl < ENERGY_DRINK_PRICE}
                  onClick={() => buyEnergyDrink(1)}
                />
              </div>
            </div>
          </>
        )}
      </PageBody>
    </Page>
  );
}
