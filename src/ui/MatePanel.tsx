import { ATTRACTANT_DEFS, ATTRACTANT_BY_ID } from "../data/attractantDefs";
import { useUi } from "../store/uiStore";
import { ModalSheet, NavArrow } from "./chrome";
import { ScentLotPicker } from "./ScentPicker";
import { IcoScent } from "./marks";
import { useEffect, useState } from "react";
import type { AttractantLot } from "../save/saveSchema";
import type { AttractantDef } from "../types";

const FISH_SCENTS = ATTRACTANT_DEFS.filter((a) => a.scope === "fish");

function ownedScentTypes(lots: AttractantLot[]): AttractantDef[] {
  const latest = new Map<string, number>();
  for (const l of lots ?? []) {
    if (!ATTRACTANT_BY_ID[l.defId]) continue;
    latest.set(l.defId, Math.max(latest.get(l.defId) ?? 0, l.boughtAt));
  }
  return FISH_SCENTS.filter((a) => latest.has(a.id)).sort(
    (a, b) => (latest.get(b.id) ?? 0) - (latest.get(a.id) ?? 0),
  );
}

function lotsForDef(lots: AttractantLot[], defId: string): AttractantLot[] {
  return [...(lots ?? [])].filter((l) => l.defId === defId).sort((a, b) => b.boughtAt - a.boughtAt);
}

function newestLot(lots: AttractantLot[], defId: string): AttractantLot | null {
  return lotsForDef(lots, defId)[0] ?? null;
}

function stockCount(lots: AttractantLot[], defId: string): number {
  return lotsForDef(lots, defId).length;
}

export function MatePanel({
  lots,
  onBackAquarium,
  onShop,
  onClose,
}: {
  lots: AttractantLot[];
  onBackAquarium: () => void;
  onShop: () => void;
  onClose: () => void;
}) {
  const setMateScentLotUid = useUi((s) => s.setMateScentLotUid);
  const pool = ownedScentTypes(lots);
  const [idx, setIdx] = useState(0);
  const [lotOpen, setLotOpen] = useState(false);
  const [selectedLotUid, setSelectedLotUid] = useState<string | null>(null);
  const cur = pool[idx] ?? null;
  const selectedLot = selectedLotUid ? (lots ?? []).find((l) => l.uid === selectedLotUid) : null;
  const displayDef = selectedLot ? ATTRACTANT_BY_ID[selectedLot.defId] : cur;
  const displayName = pool.length === 0 ? "无" : (displayDef?.name ?? cur?.name ?? "求偶香");
  const displayStock = displayDef ? stockCount(lots, displayDef.id) : 0;

  function resolveLotUid(): string | null {
    if (selectedLotUid) {
      const lot = (lots ?? []).find((l) => l.uid === selectedLotUid);
      if (lot) return selectedLotUid;
    }
    if (cur) return newestLot(lots, cur.id)?.uid ?? null;
    return null;
  }

  useEffect(() => {
    setMateScentLotUid(resolveLotUid());
  }, [idx, selectedLotUid, lots, setMateScentLotUid]);

  function openScentList() {
    if (pool.length === 0) return;
    setLotOpen(true);
  }

  return (
    <>
      <ModalSheet title="配偶" onClose={onClose}>
        <p className="dim">选好求偶香后，点缸里的鱼喷香。喷满两条即开始靠近交配。</p>
        <div className="mate-scent-row">
          <NavArrow
            dir="prev"
            disabled={pool.length <= 1}
            onClick={() => setIdx((i) => (i - 1 + pool.length) % pool.length)}
          />
          <button
            type="button"
            className="mate-scent-btn tank-plaque"
            data-guide="mate-scent"
            disabled={pool.length === 0}
            onClick={openScentList}
          >
            <span className="mate-scent-ico" aria-hidden>
              <IcoScent size={28} />
            </span>
            <span className="mate-scent-label">{displayName}</span>
            {pool.length > 0 && (
              <span className="mate-scent-stock">×{displayStock}</span>
            )}
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
          data-guide="mate-aquarium"
          disabled={!resolveLotUid()}
          onClick={onBackAquarium}
        >
          去水族馆用香
        </button>
        <button type="button" className="scent-picker-shop" onClick={onShop}>
          去商城买香
        </button>
      </ModalSheet>
      {lotOpen && (
        <ScentLotPicker
          lots={lots}
          onSelect={(uid) => {
            setSelectedLotUid(uid);
            const lot = lots.find((l) => l.uid === uid);
            if (lot) {
              const i = pool.findIndex((d) => d.id === lot.defId);
              if (i >= 0) setIdx(i);
            }
            setLotOpen(false);
          }}
          onClose={() => setLotOpen(false)}
        />
      )}
    </>
  );
}
