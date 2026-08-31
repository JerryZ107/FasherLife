import type { AttractantDef } from "../types";
import { bonusLabel } from "../data/attractantDefs";
import { ModalSheet } from "./chrome";

export function ScentPickerBody({
  items,
  stock,
  onUse,
  onShop,
}: {
  items: AttractantDef[];
  stock: Record<string, number> | undefined;
  onUse: (id: string) => void;
  onShop: () => void;
}) {
  return (
    <>
      <div className="scent-picker-list">
        {items.map((a) => {
          const n = stock?.[a.id] ?? 0;
          return (
            <button
              key={a.id}
              type="button"
              disabled={n <= 0}
              onClick={() => onUse(a.id)}
            >
              {a.name} ×{n} · {bonusLabel(a.bonus)} · {a.durationDays}天
            </button>
          );
        })}
      </div>
      <button type="button" className="scent-picker-shop" onClick={onShop}>
        去商城买求偶香
      </button>
    </>
  );
}

export function ScentPickerSheet({
  title,
  hint,
  items,
  stock,
  onUse,
  onShop,
  onClose,
}: {
  title: string;
  hint?: string;
  items: AttractantDef[];
  stock: Record<string, number> | undefined;
  onUse: (id: string) => void;
  onShop: () => void;
  onClose: () => void;
}) {
  return (
    <ModalSheet title={title} onClose={onClose} className="scent-picker-layer">
      {hint ? <p className="dim">{hint}</p> : null}
      <ScentPickerBody items={items} stock={stock} onUse={onUse} onShop={onShop} />
    </ModalSheet>
  );
}
