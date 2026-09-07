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
import MailScene from "./mail/MailScene";
import NotesScene from "./notes/NotesScene";
import SelectFishScene from "./aquarium/SelectFishScene";
import StoreTankScene from "./aquarium/StoreTankScene";
import CookScene from "./cook/CookScene";
import LoginScene from "./login/LoginScene";
import SneakScene from "./fishing/SneakScene";
import LeaderboardScene from "./aquarium/LeaderboardScene";
import VisitAquariumScene from "./aquarium/VisitAquariumScene";
import ProfileScene from "./profile/ProfileScene";
import HudOverlays from "./ui/HudOverlays";
import AdScene from "./ui/AdScene";
import TopHud from "./ui/TopHud";
import { useUi } from "./store/uiStore";

export default function App() {
  const save = useGame((s) => s.save);
  const tick = useGame((s) => s.tick);
  const booting = useGame((s) => s.booting);

  useEffect(() => {
    void useGame.getState().bootSession();
  }, []);

  useEffect(() => {
    tick(Date.now());
    const t = setInterval(() => tick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [tick]);

  const scene = save.scene;
  const adJob = useUi((s) => s.adJob);

  if (booting) {
    return (
      <div className="app">
        <div className="login">
          <div className="login-card">
            <p className="login-ver">读取存档…</p>
          </div>
        </div>
      </div>
    );
  }

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
      <TopHud />
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
            {scene === "mail" && <MailScene />}
            {scene === "notes" && <NotesScene />}
            {scene === "select_fish" && <SelectFishScene />}
            {scene === "store_tank" && <StoreTankScene />}
            {scene === "cook" && <CookScene />}
            {scene === "sneak" && <SneakScene />}
            {scene === "leaderboard" && <LeaderboardScene />}
            {scene === "visit_aquarium" && <VisitAquariumScene />}
            {scene === "profile" && <ProfileScene />}
          </>
        )}
      </div>
      <HudOverlays />
    </div>
  );
}
