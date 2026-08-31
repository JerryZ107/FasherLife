import { CONSUMABLE_DEFS, foodIdFromBait } from "../data/consumableDefs";
import { QUALITY_ORDER, type Quality } from "../types";
import { ModalSheet, QualityChip } from "./chrome";

function foodsInStock(foodStock: Record<string, number> | undefined) {
  const list: { foodId: string; def: (typeof CONSUMABLE_DEFS)[number]; n: number }[] = [];
  for (const def of CONSUMABLE_DEFS) {
    const foodId = foodIdFromBait(def.id);
    const n = foodStock?.[foodId] ?? 0;
    if (n <= 0) continue;
    list.push({ foodId, def, n });
  }
  return list;
}

export function FoodPickerBody({
  stock,
  matchQualities,
  multi,
  selected,
  onToggle,
  onConfirm,
  onUse,
  onShop,
}: {
  stock: Record<string, number> | undefined;
  matchQualities?: Quality[];
  /** 批量喂：可多选不同品质鱼粮。 */
  multi?: boolean;
  selected?: Set<string>;
  onToggle?: (foodId: string) => void;
  onConfirm?: () => void;
  onUse?: (foodId: string) => void;
  onShop: () => void;
}) {
  const match = new Set(matchQualities ?? []);
  const items = foodsInStock(stock).sort((a, b) => {
    const am = match.has(a.def.quality) ? 0 : 1;
    const bm = match.has(b.def.quality) ? 0 : 1;
    if (am !== bm) return am - bm;
    return QUALITY_ORDER.indexOf(a.def.quality) - QUALITY_ORDER.indexOf(b.def.quality);
  });
  let guided = false;

  return (
    <>
      <div className="scent-picker-list food-picker-list">
        {items.length === 0 && <p className="dim">还没有鱼粮</p>}
        {items.map((it) => {
          const isGuide = !guided && match.has(it.def.quality);
          if (isGuide) guided = true;
          const on = selected?.has(it.foodId) ?? false;
          if (multi) {
            return (
              <button
                key={it.foodId}
                type="button"
                className={`food-picker-row ${on ? "picked" : ""}`}
                onClick={() => onToggle?.(it.foodId)}
              >
                <span>
                  {it.def.foodName} ×{it.n}
                </span>
                <QualityChip quality={it.def.quality} />
                <span className="dim">{on ? "已选" : "点选"}</span>
              </button>
            );
          }
          return (
            <button
              key={it.foodId}
              type="button"
              data-guide={isGuide ? "feed-food" : undefined}
              className="food-picker-row"
              onClick={() => onUse?.(it.foodId)}
            >
              <span>
                {it.def.foodName} ×{it.n}
              </span>
              <QualityChip quality={it.def.quality} />
            </button>
          );
        })}
      </div>
      {multi ? (
        <button
          type="button"
          className="primary scent-picker-shop"
          disabled={!selected || selected.size === 0}
          onClick={onConfirm}
        >
          开始喂食
        </button>
      ) : null}
      <button
        type="button"
        className="scent-picker-shop"
        data-guide={guided || multi ? undefined : "feed-shop"}
        onClick={onShop}
      >
        去商城买鱼粮
      </button>
    </>
  );
}

export function FoodPickerSheet({
  title,
  hint,
  stock,
  matchQualities,
  multi,
  selected,
  onToggle,
  onConfirm,
  onUse,
  onShop,
  onClose,
}: {
  title: string;
  hint?: string;
  stock: Record<string, number> | undefined;
  matchQualities?: Quality[];
  multi?: boolean;
  selected?: Set<string>;
  onToggle?: (foodId: string) => void;
  onConfirm?: () => void;
  onUse?: (foodId: string) => void;
  onShop: () => void;
  onClose: () => void;
}) {
  return (
    <ModalSheet title={title} onClose={onClose} className="food-picker-layer">
      {hint ? <p className="dim">{hint}</p> : null}
      <FoodPickerBody
        stock={stock}
        matchQualities={matchQualities}
        multi={multi}
        selected={selected}
        onToggle={onToggle}
        onConfirm={onConfirm}
        onUse={onUse}
        onShop={onShop}
      />
    </ModalSheet>
  );
}
