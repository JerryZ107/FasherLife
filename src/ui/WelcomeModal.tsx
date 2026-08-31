import { useGame } from "../store/gameStore";
import { askConfirm, useUi } from "../store/uiStore";
import { ModalSheet } from "./chrome";

/** 新玩家首次进游戏：欢迎 → 是否需要新手引导。 */
export default function WelcomeModal() {
  const open = useUi((s) => s.welcomeOpen);
  const closeWelcome = useUi((s) => s.closeWelcome);
  const answerGuidePrompt = useGame((s) => s.answerGuidePrompt);
  if (!open) return null;

  function start() {
    closeWelcome();
    askConfirm({
      title: "是否需要新手引导？",
      message: "跟着高亮走一遍钓鱼→入缸→喂食→卖鱼的闭环。也可以跳过自由探索，随时在任务页重新开启。",
      confirmLabel: "需要引导",
      cancelLabel: "自由探索",
      onConfirm: () => answerGuidePrompt(true),
      onCancel: () => answerGuidePrompt(false),
    });
  }

  return (
    <ModalSheet title="你是一个钓鱼佬" onClose={start}>
      <p>目前已拥有了自己的钓备和水族馆，还钓到了 3 条鱼</p>
      <p>为了丰富自己的水族馆，更进一步吧！</p>
      <button className="primary" onClick={start}>开始</button>
    </ModalSheet>
  );
}
