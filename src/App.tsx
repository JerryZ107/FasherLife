import { useEffect } from "react";
import { useGame } from "./store/gameStore";
import AquariumScene from "./aquarium/AquariumScene";
import FishingMapScene from "./fishing/FishingMapScene";
import FishingScene from "./fishing/FishingScene";
import ShopScene from "./shop/ShopScene";
import MarketScene from "./market/MarketScene";
import EquipmentScene from "./equipment/EquipmentScene";
import EncyclopediaScene from "./encyclopedia/EncyclopediaScene";
import QuestScene from "./quests/QuestScene";
import SelectFishScene from "./aquarium/SelectFishScene";
import StoreTankScene from "./aquarium/StoreTankScene";
import CookScene from "./cook/CookScene";
import LoginScene from "./login/LoginScene";
import SneakScene from "./fishing/SneakScene";
import LeaderboardScene from "./aquarium/LeaderboardScene";
import HudOverlays from "./ui/HudOverlays";
import AdScene from "./ui/AdScene";
import { useUi } from "./store/uiStore";
import { GearIcon } from "./art/Art";
import { bookLuck } from "./data/bookDefs";
import { satietyMax, staminaCap, xpToNext } from "./game/stamina";

export default function App() {
  const save = useGame((s) => s.save);
  const account = useGame((s) => s.account);
  const logout = useGame((s) => s.logout);
  const drinkYuanqi = useGame((s) => s.drinkYuanqi);
  const tick = useGame((s) => s.tick);

  useEffect(() => {
    tick(Date.now());
    const t = setInterval(() => tick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [tick]);

  const scene = save.scene;
  const adJob = useUi((s) => s.adJob);

  if (scene === "login" || !save.started) {
    return (
      <div className="app">
        <LoginScene />
        <HudOverlays />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="coins">
          <span className="coin"><span className="icon">●</span> {save.gold} 金</span>
          <span className="coin pearl"><span className="icon">●</span> {save.pearl} 珍珠</span>
          <span className="chip stamina" title={`盐 ${save.saltStock} · 饱腹 ${Math.max(0, satietyMax(save.playerLevel) - save.satietyUsed)}/${satietyMax(save.playerLevel)}`}>
            能 {Math.floor(save.stamina)}/{staminaCap(save.playerLevel)}
          </span>
        </div>
        <div className="coins">
          {(save.playerName || account) && <span className="chip">{save.playerName || account}</span>}
          <span className="chip" title={save.playerLevel >= 30 ? "满级" : `经验 ${save.playerXp}/${xpToNext(save.playerLevel)}`}>
            Lv.{save.playerLevel}
          </span>
          <span className="chip">第 {save.gameDay} 天</span>
          <span className="chip luck" title="欧气（参观 + 书籍）">
            <GearIcon kind="luck" size={16} /> {save.luck + bookLuck(save.ownedBooks)}
          </span>
          {save.yuanqiBottles > 0 && (
            <button className="logout-btn" title="喝元气瓶" onClick={drinkYuanqi}>瓶×{save.yuanqiBottles}</button>
          )}
          <button className="logout-btn" onClick={logout}>退出</button>
        </div>
      </div>

      <div className="scene">
        {adJob ? (
          <AdScene />
        ) : (
          <>
            {scene === "aquarium" && <AquariumScene />}
            {scene === "fishing_map" && <FishingMapScene />}
            {scene === "fishing" && <FishingScene />}
            {scene === "shop" && <ShopScene />}
            {scene === "market" && <MarketScene />}
            {scene === "equipment" && <EquipmentScene />}
            {scene === "encyclopedia" && <EncyclopediaScene />}
            {scene === "quests" && <QuestScene />}
            {scene === "select_fish" && <SelectFishScene />}
            {scene === "store_tank" && <StoreTankScene />}
            {scene === "cook" && <CookScene />}
            {scene === "sneak" && <SneakScene />}
            {scene === "leaderboard" && <LeaderboardScene />}
          </>
        )}
      </div>
      <HudOverlays />
    </div>
  );
}
