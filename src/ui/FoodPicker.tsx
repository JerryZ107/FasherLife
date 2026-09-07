import { CONSUMABLE_DEFS, foodIdFromBait } from "../data/consumableDefs";
import { QUALITY_ORDER, type Quality } from "../types";
import { ModalSheet, QualityChip } from "./chrome";
import { IcoFeed } from "./marks";

export function foodsInStock(foodStock: Record<string, number> | undefined) {
  const list: { foodId: string; def: (typeof CONSUMABLE_DEFS)[number]; n: number }[] = [];
  for (const def of CONSUMABLE_DEFS) {
    const foodId = foodIdFromBait(def.id);
    const n = foodStock?.[foodId] ?? 0;
    if (n <= 0) continue;
    list.push({ foodId, def, n });
  }
  return list;
}

function FoodPickerRow({
  def,
  n,
  on,
  showPickHint,
}: {
  def: (typeof CONSUMABLE_DEFS)[number];
  n: number;
  on?: boolean;
  showPickHint?: boolean;
}) {
  return (
    <span className="mate-scent-list-row">
      <span className="mate-scent-list-main">
        <IcoFeed size={22} />
        <span>{def.foodName}</span>
        <QualityChip quality={def.quality} />
        {showPickHint ? <span className="dim">{on ? "已选" : "点选"}</span> : null}
      </span>
      <span className="mate-scent-stock">×{n}</span>
    </span>
  );
}

export function FoodPickerBody({
  stock,
  matchQualities,
  multi,
  confirmPick,
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
  /** 点选一种鱼粮后按「开始喂食」确认。 */
  confirmPick?: boolean;
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
          if (multi || confirmPick) {
            return (
              <button
                key={it.foodId}
                type="button"
                data-guide={isGuide ? "feed-food" : undefined}
                className={`food-picker-row ${on ? "picked" : ""}`}
                onClick={() => onToggle?.(it.foodId)}
              >
                <FoodPickerRow def={it.def} n={it.n} on={on} showPickHint />
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
              <FoodPickerRow def={it.def} n={it.n} />
            </button>
          );
        })}
      </div>
      {multi || confirmPick ? (
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
        data-guide={guided || multi || confirmPick ? undefined : "feed-shop"}
        onClick={onShop}
      >
        去商城买鱼粮
      </button>
    </>
  );
}

export function FoodListPicker({
  stock,
  selectedFoodId,
  matchQualities,
  onSelect,
  onClose,
}: {
  stock: Record<string, number> | undefined;
  selectedFoodId: string | null;
  matchQualities?: Quality[];
  onSelect: (foodId: string) => void;
  onClose: () => void;
}) {
  const match = new Set(matchQualities ?? []);
  const items = foodsInStock(stock).sort((a, b) => {
    const am = match.has(a.def.quality) ? 0 : 1;
    const bm = match.has(b.def.quality) ? 0 : 1;
    if (am !== bm) return am - bm;
    return QUALITY_ORDER.indexOf(a.def.quality) - QUALITY_ORDER.indexOf(b.def.quality);
  });

  return (
    <ModalSheet title="鱼粮" onClose={onClose} className="scent-picker-layer" showClose={false}>
      {items.length === 0 ? (
        <p className="dim">无</p>
      ) : (
        <div className="scent-picker-list">
          {items.map((it) => {
            const on = it.foodId === selectedFoodId;
            return (
              <button
                key={it.foodId}
                type="button"
                onClick={() => onSelect(it.foodId)}
              >
                <FoodPickerRow def={it.def} n={it.n} on={on} showPickHint />
              </button>
            );
          })}
        </div>
      )}
      <button type="button" className="scent-picker-shop" onClick={onClose}>返回</button>
    </ModalSheet>
  );
}

export function FoodPickerSheet({
  title,
  hint,
  stock,
  matchQualities,
  multi,
  confirmPick,
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
  confirmPick?: boolean;
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
        confirmPick={confirmPick}
        selected={selected}
        onToggle={onToggle}
        onConfirm={onConfirm}
        onUse={onUse}
        onShop={onShop}
      />
    </ModalSheet>
  );
}
