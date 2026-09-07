import type { AttractantDef } from "../types";
import { ATTRACTANT_DEFS, ATTRACTANT_BY_ID, bonusLabel } from "../data/attractantDefs";
import { ModalSheet } from "./chrome";
import { IcoScent } from "./marks";
import type { AttractantLot } from "../save/saveSchema";

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

const FISH_SCENTS = ATTRACTANT_DEFS.filter((a) => a.scope === "fish");

function scentTypesInLots(lots: AttractantLot[]) {
  const latest = new Map<string, number>();
  for (const l of lots ?? []) {
    if (!ATTRACTANT_BY_ID[l.defId]) continue;
    latest.set(l.defId, Math.max(latest.get(l.defId) ?? 0, l.boughtAt));
  }
  return FISH_SCENTS.filter((a) => latest.has(a.id)).sort(
    (a, b) => (latest.get(b.id) ?? 0) - (latest.get(a.id) ?? 0),
  );
}

function newestLotForDef(lots: AttractantLot[], defId: string): AttractantLot | null {
  const owned = [...(lots ?? [])].filter((l) => l.defId === defId).sort((a, b) => b.boughtAt - a.boughtAt);
  return owned[0] ?? null;
}

export function ScentLotPicker({
  lots,
  onSelect,
  onClose,
}: {
  lots: AttractantLot[];
  onSelect: (lotUid: string) => void;
  onClose: () => void;
}) {
  const types = scentTypesInLots(lots);
  return (
    <ModalSheet title="求偶香" onClose={onClose} className="scent-picker-layer" showClose={false}>
      {types.length === 0 ? (
        <p className="dim">无</p>
      ) : (
        <div className="scent-picker-list">
          {types.map((def) => {
            const count = (lots ?? []).filter((l) => l.defId === def.id).length;
            const lot = newestLotForDef(lots, def.id);
            return (
              <button
                key={def.id}
                type="button"
                disabled={!lot}
                onClick={() => lot && onSelect(lot.uid)}
              >
                <span className="mate-scent-list-row">
                  <span className="mate-scent-list-main">
                    <IcoScent size={22} />
                    <span>{def.name}</span>
                  </span>
                  <span className="mate-scent-stock">×{count}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <button type="button" onClick={onClose}>返回</button>
    </ModalSheet>
  );
}
