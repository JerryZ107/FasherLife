import { useEffect, useState } from "react";
import { FISH_BY_ID } from "../data/fishDefs";
import { fishTitle } from "../game/affection";
import { ownsFishManual } from "../data/bookDefs";
import { fishSex, pairLayCount, pairLayTimeText } from "../game/pairing";
import type { TankFish } from "../save/saveSchema";
import { LOVE_VIEW_LABEL } from "../types";
import { FishPortrait } from "../art/Art";
import { SexIcon } from "./marks";

export default function PairRoster({
  pairs,
  ownedBooks,
  onUnpair,
}: {
  pairs: { pairId: string; a: TankFish; b: TankFish }[];
  ownedBooks: string[] | undefined;
  onUnpair: (pairId: string) => void;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const showView = ownsFishManual(ownedBooks);

  if (pairs.length === 0) return null;

  return (
    <>
      {pairs.map(({ pairId, a, b }) => {
        const ad = FISH_BY_ID[a.defId];
        const bd = FISH_BY_ID[b.defId];
        if (!ad || !bd) return null;
        return (
          <div className="pair-row" key={pairId}>
            <span className="pair-faces">
              <FishPortrait id={ad.id} size={36} alt={ad.name} />
              <FishPortrait id={bd.id} size={36} alt={bd.name} />
              <span className="pair-meta">
                <strong className="pair-names">{fishTitle(a)} <SexIcon sex={fishSex(a)} /> × {fishTitle(b)} <SexIcon sex={fishSex(b)} /></strong>
                {showView && (
                  <span className="pair-stat">
                    配偶观 {LOVE_VIEW_LABEL[a.loveView]} × {LOVE_VIEW_LABEL[b.loveView]}
                  </span>
                )}
                <span className="pair-stat">产卵时间 {pairLayTimeText(a, b, now)}</span>
                <span className="pair-stat">产卵次数 {pairLayCount(a, b)}</span>
              </span>
            </span>
            <button onClick={() => onUnpair(pairId)}>解除</button>
          </div>
        );
      })}
    </>
  );
}
