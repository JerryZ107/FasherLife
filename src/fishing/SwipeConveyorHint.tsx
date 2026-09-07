type Props = {
  dir: "up" | "down";
};

export default function SwipeConveyorHint({ dir }: Props) {
  return (
    <div className={`dock-swipe-hint is-${dir}`} aria-hidden>
      <div className="dock-swipe-glyphs">
        {[0, 1, 2].map((i) => (
          <span key={i} className="dock-swipe-glyph">》</span>
        ))}
      </div>
    </div>
  );
}
