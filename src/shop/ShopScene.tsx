import { useState } from "react";
import { useGame } from "../store/gameStore";
import { CONSUMABLE_DEFS, foodIdFromBait } from "../data/consumableDefs";
import { PART_DEFS, ROD_DEFS, STOOL_DEFS, BASKET_DEFS } from "../data/equipmentDefs";
import { OUTFIT_DEFS } from "../data/outfitDefs";
import { BOOK_DEFS } from "../data/bookDefs";
import { TANK_DEFS } from "../data/tankDefs";
import { ATTRACTANT_DEFS, bonusLabel } from "../data/attractantDefs";
import { QUALITY_LABEL, ROD_PART_LABEL } from "../types";
import { MONTHLY_CARD_PEARL, NEWBIE_PACK_PEARL, PEARL_TO_GOLD } from "../game/constants";
import { ENERGY_DRINK_PRICE, ENERGY_DRINK_STAMINA, SALT_PRICE } from "../game/stamina";
import { GearIcon } from "../art/Art";

type Tab = "pass" | "pack" | "gear" | "food" | "attractant" | "stamina";
type GearSub = "outfit" | "rod" | "parts" | "bait" | "stool" | "basket" | "book" | "tank";

function afford(saveGold: number, savePearl: number, currency: "gold" | "pearl", price: number) {
  return currency === "gold" ? saveGold >= price : savePearl >= price;
}

function priceLabel(currency: "gold" | "pearl", price: number) {
  return currency === "gold" ? `${price}金` : `${price}珍珠`;
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
  const drinkEnergy = useGame((s) => s.drinkEnergy);
  const [tab, setTab] = useState<Tab>("pack");
  const [gear, setGear] = useState<GearSub>("rod");

  const newbieOpen = save.gameDay < save.newbiePackUntilDay;

  return (
    <div className="page">
      <div className="page-head">
        <button onClick={() => setScene("aquarium")}>← 返回</button>
        <h2>商城</h2>
      </div>
      <div className="tabrow wrap">
        <button className={tab === "pass" ? "primary" : ""} onClick={() => setTab("pass")}>月卡</button>
        <button className={tab === "pack" ? "primary" : ""} onClick={() => setTab("pack")}>礼包</button>
        <button className={tab === "gear" ? "primary" : ""} onClick={() => setTab("gear")}>装备</button>
        <button className={tab === "food" ? "primary" : ""} onClick={() => setTab("food")}>鱼粮</button>
        <button className={tab === "attractant" ? "primary" : ""} onClick={() => setTab("attractant")}>求偶香</button>
        <button className={tab === "stamina" ? "primary" : ""} onClick={() => setTab("stamina")}>能量</button>
      </div>
      {tab === "gear" && (
        <div className="tabrow wrap">
          {([
            ["outfit", "服饰"],
            ["rod", "鱼竿"],
            ["parts", "组件"],
            ["bait", "鱼饵"],
            ["stool", "板凳"],
            ["basket", "鱼筐"],
            ["book", "书籍"],
            ["tank", "鱼缸"],
          ] as [GearSub, string][]).map(([k, l]) => (
            <button key={k} className={gear === k ? "primary" : ""} onClick={() => setGear(k)}>{l}</button>
          ))}
        </div>
      )}
      <div className="page-body">
        {tab === "pass" && (
          <div className="panel">
            <h2>月卡 · {MONTHLY_CARD_PEARL} 珍珠</h2>
            <p className="dim">每日登录领 300 金币；购买即赠改装组件。错过的天数会一次性补领。</p>
            <p>
              {save.monthlyCardUntilDay >= save.gameDay
                ? `有效至第 ${save.monthlyCardUntilDay} 天`
                : "未开通"}
            </p>
            <button className="primary" disabled={save.pearl < MONTHLY_CARD_PEARL} onClick={buyMonthlyCard}>购买月卡</button>
          </div>
        )}

        {tab === "pack" && (
          <>
            <div className="panel">
              <h2>限时新人礼包 · {NEWBIE_PACK_PEARL} 珍珠</h2>
              <p className="dim">金涡纹竿（优良，不进商城）+ 12 格鱼筐。仅前 7 游戏天可买。</p>
              {save.claimedNewbiePack ? (
                <span className="chip ok">已购买</span>
              ) : !newbieOpen ? (
                <span className="chip">已过期</span>
              ) : (
                <button className="primary" disabled={save.pearl < NEWBIE_PACK_PEARL} onClick={buyNewbiePack}>
                  购买并装备 · 还剩 {save.newbiePackUntilDay - save.gameDay} 天
                </button>
              )}
            </div>
            <div className="panel">
              <h2>装备礼包 · 6 珍珠</h2>
              <p className="dim">玻璃钢竿套件 + 折叠凳 + 中鱼筐 + 基础饵×20。单买更贵。</p>
              <button className="primary" disabled={save.pearl < 6} onClick={buyGearPack}>购买</button>
            </div>
            <div className="panel">
              <h2>服装礼包 · 4 珍珠</h2>
              <p className="dim">节庆套一整套，无属性仅外观，男女各一版，不进散装货架。</p>
              {save.ownedOutfits.includes("outfit_festival") ? (
                <span className="chip ok">已拥有</span>
              ) : (
                <button className="primary" disabled={save.pearl < 4} onClick={buyOutfitPack}>购买并穿上</button>
              )}
            </div>
            <div className="panel">
              <h2>鱼缸礼包 · 8 珍珠</h2>
              <p className="dim">一口优良缸 + 珊瑚。没有缸位时附赠一个缸位。</p>
              <button className="primary" disabled={save.pearl < 8} onClick={buyTankPack}>购买并切换</button>
            </div>
            <div className="panel">
              <h2>模拟充值</h2>
              <p className="dim">1 珍珠 = 1 元 = {PEARL_TO_GOLD} 金币</p>
              <div className="row">
                <button onClick={() => topUpPearl(6)}>¥6</button>
                <button onClick={() => topUpPearl(30)}>¥30</button>
                <button onClick={() => topUpPearl(68)}>¥68</button>
              </div>
              <button style={{ marginTop: 8 }} disabled={save.pearl < 1} onClick={() => exchangePearlToGold(1)}>
                1 珍珠兑 {PEARL_TO_GOLD} 金
              </button>
            </div>
          </>
        )}

        {tab === "gear" && gear === "outfit" && OUTFIT_DEFS.filter((o) => !o.hiddenFromShop).map((o) => {
          const owned = save.ownedOutfits.includes(o.id);
          const can = afford(save.gold, save.pearl, o.currency, o.price);
          return (
            <div className="panel row-between" key={o.id}>
              <div>
                <strong>{o.name}</strong> <span className={`chip ${o.quality}`}>{QUALITY_LABEL[o.quality]}</span>
                <div className="dim">无属性，仅外观。男女各一版。</div>
              </div>
              {owned ? <span className="chip ok">已拥有</span> : o.price === 0 ? <span className="chip">起始</span> : (
                <button disabled={!can} onClick={() => buyOutfit(o.id)}>{priceLabel(o.currency, o.price)}</button>
              )}
            </div>
          );
        })}
        {tab === "gear" && gear === "book" && BOOK_DEFS.map((b) => {
          const owned = save.ownedBooks.includes(b.id);
          const can = afford(save.gold, save.pearl, b.currency, b.price);
          return (
            <div className="panel row-between" key={b.id}>
              <div>
                <strong>{b.name}</strong>
                <div className="dim">{b.hint} · 持有即生效</div>
              </div>
              {owned ? <span className="chip ok">已拥有</span> : (
                <button disabled={!can} onClick={() => buyBook(b.id)}>{priceLabel(b.currency, b.price)}</button>
              )}
            </div>
          );
        })}
        {tab === "gear" && gear === "tank" && (
          <>
            <p className="dim">缸位 {save.tanks.length}/{save.tankSlots}。没缸位先去水族馆点扩建。</p>
            {TANK_DEFS.map((def) => {
              const can = afford(save.gold, save.pearl, def.currency, def.price);
              const slotted = save.tanks.length < save.tankSlots;
              return (
                <div className="panel row-between" key={def.id}>
                  <div>
                    <strong>{def.name}</strong> <span className={`chip ${def.quality}`}>{QUALITY_LABEL[def.quality]}</span>
                    <div className="dim">可养 {def.capacity} 条 · {def.currency === "pearl" ? "珍珠通道，同品质容量持平" : "金币通道"}</div>
                  </div>
                  <button disabled={!can || !slotted} onClick={() => buyTank(def.id)}>
                    {priceLabel(def.currency, def.price)}
                  </button>
                </div>
              );
            })}
          </>
        )}
        {tab === "attractant" && (
          <>
            <p className="dim">金币喂给一条未配对的鱼；珍珠喷整缸。提高自动配对成功率，有上限，不能让品质差四档必成。</p>
            {ATTRACTANT_DEFS.map((a) => {
              const can = afford(save.gold, save.pearl, a.currency, a.price);
              const n = save.attractantStock?.[a.id] ?? 0;
              return (
                <div className="panel row-between" key={a.id}>
                  <div>
                    <strong>{a.name}</strong> <span className={`chip ${a.quality}`}>{QUALITY_LABEL[a.quality]}</span>
                    <div className="dim">
                      {a.scope === "fish" ? "单鱼" : "整缸"} · {bonusLabel(a.bonus)} · {a.durationDays}天
                      {n > 0 ? ` · 库存 ${n}` : ""}
                    </div>
                  </div>
                  <button disabled={!can} onClick={() => buyAttractant(a.id)}>
                    {priceLabel(a.currency, a.price)}
                  </button>
                </div>
              );
            })}
          </>
        )}
        {tab === "gear" && gear === "rod" && ROD_DEFS.filter((r) => !r.hiddenFromShop).map((r) => {
          const owned = save.ownedRods.includes(r.id);
          const can = afford(save.gold, save.pearl, r.currency, r.price);
          return (
            <div className="panel row-between" key={r.id}>
              <div className="row" style={{ alignItems: "center" }}>
                <GearIcon kind="rod" size={48} />
                <div>
                  <strong>{r.name}</strong> <span className={`chip ${r.quality}`}>{QUALITY_LABEL[r.quality]}</span>
                  <div className="dim">{r.currency === "pearl" ? "珍珠通道，同品质数值持平" : "金币通道"} · 买整竿送五件套</div>
                </div>
              </div>
              {owned ? <span className="chip ok">已拥有</span> : r.price === 0 ? <span className="chip">起始</span> : (
                <button disabled={!can} onClick={() => buyRod(r.id)}>
                  {priceLabel(r.currency, r.price)}
                </button>
              )}
            </div>
          );
        })}
        {tab === "gear" && gear === "parts" && PART_DEFS.filter((p) => !p.hiddenFromShop).map((p) => {
          const owned = save.ownedParts.includes(p.id);
          const can = afford(save.gold, save.pearl, p.currency, p.price);
          return (
            <div className="panel row-between" key={p.id}>
              <div>
                <strong>{p.name}</strong> <span className={`chip ${p.quality}`}>{QUALITY_LABEL[p.quality]}</span>
                <div className="dim">{ROD_PART_LABEL[p.slot]} · 散件改装</div>
              </div>
              {owned ? <span className="chip ok">已拥有</span> : (
                <button disabled={!can} onClick={() => buyPart(p.id)}>
                  {priceLabel(p.currency, p.price)}
                </button>
              )}
            </div>
          );
        })}
        {tab === "gear" && gear === "bait" && CONSUMABLE_DEFS.filter((c) => !c.hiddenFromShop).map((c) => (
          <div className="panel row-between" key={c.id}>
            <div className="row" style={{ alignItems: "center" }}>
              <GearIcon kind="bait" size={48} />
              <div>
                <strong>{c.name}</strong> <span className={`chip ${c.quality}`}>{QUALITY_LABEL[c.quality]}</span>
                <div className="dim">{c.baitPrice}金/个</div>
              </div>
            </div>
            <button disabled={save.gold < c.baitPrice * 20} onClick={() => buyBaitPack(c.id, 1)}>买×20</button>
          </div>
        ))}
        {tab === "gear" && gear === "stool" && STOOL_DEFS.map((s) => {
          const owned = save.ownedStools.includes(s.id);
          const can = afford(save.gold, save.pearl, s.currency, s.price);
          return (
            <div className="panel row-between" key={s.id}>
              <div className="row" style={{ alignItems: "center" }}>
                <GearIcon kind="stool" size={48} />
                <div>
                  <strong>{s.name}</strong> <span className={`chip ${s.quality}`}>{QUALITY_LABEL[s.quality]}</span>
                  <div className="dim">玩家滑块 +{s.playerSliderBonus}</div>
                </div>
              </div>
              {owned ? <span className="chip ok">已拥有</span> : (
                <button disabled={!can} onClick={() => buyStool(s.id)}>{priceLabel(s.currency, s.price)}</button>
              )}
            </div>
          );
        })}
        {tab === "gear" && gear === "basket" && BASKET_DEFS.filter((b) => !b.hiddenFromShop).map((b) => {
          const owned = save.ownedBaskets.includes(b.id);
          const can = afford(save.gold, save.pearl, b.currency, b.price);
          return (
            <div className="panel row-between" key={b.id}>
              <div className="row" style={{ alignItems: "center" }}>
                <GearIcon kind="basket" size={48} />
                <div>
                  <strong>{b.name}</strong> <span className={`chip ${b.quality}`}>{QUALITY_LABEL[b.quality]}</span>
                  <div className="dim">{b.capacity} 条 / {b.weightCap}kg</div>
                </div>
              </div>
              {owned ? <span className="chip ok">已拥有</span> : (
                <button disabled={!can} onClick={() => buyBasket(b.id)}>{priceLabel(b.currency, b.price)}</button>
              )}
            </div>
          );
        })}

        {tab === "food" && CONSUMABLE_DEFS.filter((c) => !c.hiddenFromShop).map((c) => (
          <div className="panel row-between" key={c.id}>
            <div className="row" style={{ alignItems: "center" }}>
              <GearIcon kind="food" size={48} />
              <div>
                <strong>{c.name}鱼粮</strong> <span className={`chip ${c.quality}`}>{QUALITY_LABEL[c.quality]}</span>
                <div className="dim">{c.foodPrice}金/份 · 只吃相同品质</div>
              </div>
            </div>
            <button disabled={save.gold < c.foodPrice * 10} onClick={() => buyFoodPack(foodIdFromBait(c.id), 1)}>买×10</button>
          </div>
        ))}
        {tab === "stamina" && (
          <>
            <div className="panel row-between">
              <div>
                <strong>盐</strong>
                <div className="dim">做菜唯一调料，无品质。1 金 1 份 · 库存 {save.saltStock}</div>
              </div>
              <div className="row">
                <button disabled={save.gold < SALT_PRICE * 10} onClick={() => buySalt(10)}>买×10 · {SALT_PRICE * 10}金</button>
                <button disabled={save.gold < SALT_PRICE} onClick={() => buySalt(1)}>买 1 · {SALT_PRICE}金</button>
              </div>
            </div>
            <div className="panel row-between">
              <div>
                <strong>能量饮料</strong>
                <div className="dim">恢复 {ENERGY_DRINK_STAMINA} 能量，无每日次数限制 · 库存 {save.energyDrinkStock}</div>
              </div>
              <div className="row">
                <button disabled={save.gold < ENERGY_DRINK_PRICE} onClick={() => buyEnergyDrink(1)}>买 1 · {ENERGY_DRINK_PRICE}金</button>
                <button disabled={(save.energyDrinkStock ?? 0) < 1} onClick={() => drinkEnergy()}>喝 1</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
