import { useUi } from "../store/uiStore";

export default function HudOverlays() {
  const toast = useUi((s) => s.toast);
  const comingSoon = useUi((s) => s.comingSoon);
  const clearComingSoon = useUi((s) => s.clearComingSoon);

  return (
    <>
      {toast && <div className="toast">{toast}</div>}
      {comingSoon && (
        <div className="modal-backdrop" onClick={clearComingSoon}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{comingSoon}</div>
            <p>这一项还没做进 Demo。</p>
            <button className="primary" onClick={clearComingSoon}>知道了</button>
          </div>
        </div>
      )}
    </>
  );
}
