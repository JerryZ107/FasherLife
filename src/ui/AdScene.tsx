import { useGame } from "../store/gameStore";
import { useUi } from "../store/uiStore";

/** Demo 广告页：看完后发放加速。 */
export default function AdScene() {
  const adJob = useUi((s) => s.adJob);
  const closeAd = useUi((s) => s.closeAd);
  const accelerateEgg = useGame((s) => s.accelerateEgg);

  function finish() {
    if (!adJob) {
      closeAd();
      return;
    }
    accelerateEgg(adJob.uid, "ad");
    closeAd();
  }

  return (
    <div className="placeholder ad-page">
      <div className="ad-page-label">这是广告</div>
      <p className="dim">看完可加速孵化。</p>
      <button className="primary" onClick={finish}>看完了</button>
      <button onClick={closeAd}>关闭</button>
    </div>
  );
}
