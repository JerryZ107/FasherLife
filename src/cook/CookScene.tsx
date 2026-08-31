import { useGame } from "../store/gameStore";
import { useUi } from "../store/uiStore";
import { useEffect } from "react";

/** 旧入口：跳到鱼筐「做菜」子页。 */
export default function CookScene() {
  const setScene = useGame((s) => s.setScene);
  const openStoreTab = useUi((s) => s.openStoreTab);

  useEffect(() => {
    openStoreTab("cook");
    setScene("store_tank");
  }, [openStoreTab, setScene]);

  return null;
}
