import { FEATURE_INTRO_COPY, type FeatureIntroId } from "../game/featureIntro";
import { ModalSheet } from "./chrome";

export function FeatureIntroSheet({
  feature,
  onConfirm,
}: {
  feature: FeatureIntroId;
  onConfirm: () => void;
}) {
  const copy = FEATURE_INTRO_COPY[feature];
  return (
    <ModalSheet title={copy.title} onClose={onConfirm}>
      <p className="dim">{copy.lead}</p>
      <ol className="feature-intro-steps">
        {copy.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="modal-actions">
        <button type="button" className="primary" onClick={onConfirm}>
          {copy.cta}
        </button>
      </div>
    </ModalSheet>
  );
}
