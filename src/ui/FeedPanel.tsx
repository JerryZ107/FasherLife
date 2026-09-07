import { useEffect, useState } from "react";
import { QUALITY_ORDER, type Quality } from "../types";
import { ModalSheet, NavArrow } from "./chrome";
import { foodsInStock, FoodListPicker } from "./FoodPicker";
import { IcoFeed } from "./marks";

function sortFoods(
  items: ReturnType<typeof foodsInStock>,
  matchQualities?: Quality[],
) {
  const match = new Set(matchQualities ?? []);
  return [...items].sort((a, b) => {
    const am = match.has(a.def.quality) ? 0 : 1;
    const bm = match.has(b.def.quality) ? 0 : 1;
    if (am !== bm) return am - bm;
    return QUALITY_ORDER.indexOf(a.def.quality) - QUALITY_ORDER.indexOf(b.def.quality);
  });
}

export function FeedPanel({
  stock,
  equippedFoodId,
  matchQualities,
  onBackAquarium,
  onShop,
  onClose,
  batchFeed,
  guideFeed,
}: {
  stock: Record<string, number>;
  equippedFoodId?: string;
  matchQualities?: Quality[];
  onBackAquarium?: (foodId: string) => void;
  onShop: () => void;
  onClose: () => void;
  batchFeed?: { onFeed: (foodId: string) => void };
  guideFeed?: boolean;
}) {
  const pool = sortFoods(foodsInStock(stock), matchQualities);
  const [idx, setIdx] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const cur = pool[idx] ?? null;
  const displayFoodId = selectedFoodId ?? cur?.foodId ?? null;
  const displayItem = pool.find((p) => p.foodId === displayFoodId) ?? cur;
  const displayName = pool.length === 0 ? "无" : (displayItem?.def.foodName ?? "鱼粮");
  const displayStock = displayItem?.n ?? 0;

  useEffect(() => {
    if (pool.length === 0) {
      setSelectedFoodId(null);
      return;
    }
    const target = selectedFoodId ?? equippedFoodId;
    if (!target) return;
    const i = pool.findIndex((p) => p.foodId === target);
    if (i >= 0) setIdx(i);
    else setSelectedFoodId(null);
  }, [pool, selectedFoodId, equippedFoodId]);

  function resolveFoodId(): string | null {
    const id = selectedFoodId ?? cur?.foodId ?? null;
    if (!id) return null;
    const item = pool.find((p) => p.foodId === id);
    if (!item || item.n <= 0) return null;
    return id;
  }

  function openFoodList() {
    if (pool.length === 0) return;
    setListOpen(true);
  }

  function confirmFeed() {
    const foodId = resolveFoodId();
    if (!foodId) return;
    if (batchFeed) batchFeed.onFeed(foodId);
    else onBackAquarium?.(foodId);
  }

  return (
    <>
      <ModalSheet title="喂食" onClose={onClose}>
        <p className="dim">
          {batchFeed
            ? "选好鱼粮后，点「开始喂食」给选中的鱼喂食。"
            : "选好鱼粮后，点缸空白处抛洒喂食。"}
        </p>
        <div className="mate-scent-row">
          <NavArrow
            dir="prev"
            disabled={pool.length <= 1}
            onClick={() => setIdx((i) => (i - 1 + pool.length) % pool.length)}
          />
          <button
            type="button"
            className="mate-scent-btn tank-plaque"
            disabled={pool.length === 0}
            onClick={openFoodList}
          >
            <span className="mate-scent-ico" aria-hidden>
              <IcoFeed size={28} />
            </span>
            <span className="mate-scent-label">{displayName}</span>
            {pool.length > 0 && <span className="mate-scent-stock">×{displayStock}</span>}
          </button>
          <NavArrow
            dir="next"
            disabled={pool.length <= 1}
            onClick={() => setIdx((i) => (i + 1) % pool.length)}
          />
        </div>
        <button
          type="button"
          className="scent-picker-shop"
          data-guide={guideFeed && !batchFeed ? "feed-aquarium-go" : undefined}
          disabled={!resolveFoodId()}
          onClick={confirmFeed}
        >
          {batchFeed ? "开始喂食" : "去水族馆喂食"}
        </button>
        <button type="button" className="scent-picker-shop" onClick={onShop}>
          去商城买鱼粮
        </button>
      </ModalSheet>
      {listOpen && (
        <FoodListPicker
          stock={stock}
          selectedFoodId={displayFoodId}
          matchQualities={matchQualities}
          onSelect={(foodId) => {
            setSelectedFoodId(foodId);
            const i = pool.findIndex((p) => p.foodId === foodId);
            if (i >= 0) setIdx(i);
            setListOpen(false);
          }}
          onClose={() => setListOpen(false)}
        />
      )}
    </>
  );
}
