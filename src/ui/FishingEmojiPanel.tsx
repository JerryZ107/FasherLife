import { FISH_STICKERS } from "../data/stickerDefs";
import { StickerGlyph } from "./StickerGlyph";

type Props = {
  open: boolean;
  onToggle: () => void;
  onPick: (glyph: string) => void;
};

/** 钓鱼场景右侧：笑脸圆框 + 鱼表情包列表。 */
export default function FishingEmojiPanel({ open, onToggle, onPick }: Props) {
  return (
    <div className="fishing-emoji-dock" onPointerDown={(e) => e.stopPropagation()}>
      {open && (
        <div className="fishing-emoji-panel" role="toolbar" aria-label="选择表情">
          {FISH_STICKERS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="fishing-emoji-item"
              title={s.label}
              aria-label={s.label}
              onClick={() => onPick(s.glyph)}
            >
              <StickerGlyph id={s.id} glyph={s.glyph} className="sticker-glyph" />
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className={`fishing-emoji-fab${open ? " open" : ""}`}
        aria-label="发表情"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="fab-emoji" aria-hidden>
          😄
        </span>
      </button>
    </div>
  );
}
