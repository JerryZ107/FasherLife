import { useGame } from "../store/gameStore";
import { OUTFIT_DEFS } from "../data/outfitDefs";
import PersonView from "../art/PersonView";
import { ModalSheet, QualityChip } from "../ui/chrome";

type Props = {
  embedded?: boolean;
  onClose: () => void;
  onPicked?: () => void;
};

export default function ProfileOutfitPicker({ embedded = false, onClose, onPicked }: Props) {
  const save = useGame((s) => s.save);
  const setProfileShowcaseOutfit = useGame((s) => s.setProfileShowcaseOutfit);

  const owned = OUTFIT_DEFS.filter((o) => save.ownedOutfits.includes(o.id));

  function pick(outfitId: string) {
    if (setProfileShowcaseOutfit(outfitId)) {
      onPicked?.();
    }
  }

  return (
    <ModalSheet
      title="主页展示服装"
      onClose={onClose}
      showClose={!embedded}
      modalClassName={embedded ? "fishchat-outfit-modal" : ""}
      className={embedded ? "fishchat-outfit-backdrop" : ""}
    >
      <p className="dim profile-outfit-hint">
        仅用于个人主页展示，不影响钓鱼时的实际穿着。
      </p>
      {owned.length === 0 && <p className="dim">还没有可展示的服装</p>}
      <ul className="profile-outfit-list">
        {owned.map((o) => {
          const selected = save.profileShowcaseOutfitId === o.id;
          const wearing = save.equippedOutfit === o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                className={`profile-outfit-row${selected ? " selected" : ""}`}
                onClick={() => pick(o.id)}
              >
                <span className="profile-outfit-thumb" aria-hidden>
                  <PersonView outfitId={o.id} sex={save.lookSex} pose="stand" size={56} />
                </span>
                <span className="profile-outfit-meta">
                  <span className="profile-outfit-name">
                    <strong>{o.name}</strong>
                    <QualityChip quality={o.quality} />
                  </span>
                  <span className="dim profile-outfit-tags">
                    {selected ? "主页展示中" : "设为展示"}
                    {wearing ? " · 实际穿着" : ""}
                  </span>
                </span>
                {selected && <span className="profile-pick-check" aria-hidden>✓</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {save.profileShowcaseOutfitId !== save.equippedOutfit && (
        <button
          type="button"
          className="profile-outfit-sync"
          onClick={() => pick(save.equippedOutfit)}
        >
          同步为当前穿着
        </button>
      )}
    </ModalSheet>
  );
}
