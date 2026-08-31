import { useState } from "react";
import { useGame } from "../store/gameStore";
import { FISH_BY_ID } from "../data/fishDefs";
import { livingFishInTank } from "../game/slotAssign";
import { occupancy, slotIndexOfTank, tankById } from "../game/tanks";
import { fishSex } from "../game/pairing";
import { FishPortrait } from "../art/Art";
import { ModalSheet, QualityChip } from "../ui/chrome";
import { SexIcon } from "../ui/marks";
import { useUi } from "../store/uiStore";

export default function SlotOverflowModal() {
  const overflow = useUi((s) => s.slotOverflow);
  const setSlotOverflow = useUi((s) => s.setSlotOverflow);
  const openSlotPicker = useUi((s) => s.openSlotPicker);
  const confirmSlotOverflow = useGame((s) => s.confirmSlotOverflow);
  const save = useGame((s) => s.save);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  if (!overflow) return null;

  const fromTank = tankById(save, overflow.fromTankId);
  const toTank = tankById(save, overflow.toTankId);
  const fish = livingFishInTank(save, overflow.fromTankId);
  const needOut = Math.max(0, fish.length - overflow.capacity);

  function toggle(uid: string) {
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(uid)) n.delete(uid);
      else n.add(uid);
      return n;
    });
  }

  return (
    <ModalSheet
      title="鱼儿数量超出新鱼缸容量！"
      onClose={() => setSlotOverflow(null)}
      className="confirm-layer"
    >
      <p className="dim">
        「{fromTank?.name ?? "原缸"}」有 {fish.length} 条活鱼，「{toTank?.name ?? "新缸"}」只能养 {overflow.capacity} 条。
        请至少选 {needOut} 条放进鱼筐。
      </p>
      <div className="slot-overflow-fish">
        {fish.map((f) => {
          const def = FISH_BY_ID[f.defId];
          if (!def) return null;
          const on = picked.has(f.uid);
          return (
            <button
              key={f.uid}
              type="button"
              className={`panel fish-pick ${on ? "picked" : ""}`}
              onClick={() => toggle(f.uid)}
            >
              <FishPortrait id={def.id} size={48} alt={def.name} />
              <span className="fish-pick-meta">
                <strong>{def.name} <SexIcon sex={fishSex(f)} /></strong>
                <QualityChip quality={def.quality} />
              </span>
              <span className="dim">{on ? "已选" : "点选"}</span>
            </button>
          );
        })}
      </div>
      <div className="modal-actions">
        <button type="button" onClick={() => setSlotOverflow(null)}>
          取消更换
        </button>
        <button
          type="button"
          onClick={() => {
            setSlotOverflow(null);
            openSlotPicker(overflow.slotIndex);
          }}
        >
          换鱼缸
        </button>
        <button
          type="button"
          className="primary"
          disabled={picked.size < needOut}
          onClick={() => confirmSlotOverflow([...picked])}
        >
          放入鱼筐
        </button>
      </div>
    </ModalSheet>
  );
}

export function SlotPickerModal() {
  const save = useGame((s) => s.save);
  const slotPicker = useUi((s) => s.slotPicker);
  const closeSlotPicker = useUi((s) => s.closeSlotPicker);
  const tryAssignTankSlot = useGame((s) => s.tryAssignTankSlot);

  if (slotPicker == null) return null;

  const currentId = save.tankSlotIds[slotPicker] ?? null;

  return (
    <ModalSheet title={`缸位 ${slotPicker + 1}`} onClose={closeSlotPicker}>
      <p className="dim">选择要摆在这格的鱼缸，或空置此缸位。</p>
      <button
        type="button"
        className={`panel fish-pick ${currentId === null ? "picked" : ""}`}
        onClick={() => tryAssignTankSlot(slotPicker, null)}
      >
        <span className="fish-pick-meta">
          <strong>空置缸位</strong>
          <span className="dim">不摆鱼缸</span>
        </span>
      </button>
      {save.tanks.map((t) => {
        const inSlot = slotIndexOfTank(save, t.id);
        const on = currentId === t.id;
        const used = occupancy(save, t.id);
        return (
          <button
            key={t.id}
            type="button"
            className={`panel fish-pick ${on ? "picked" : ""}`}
            onClick={() => tryAssignTankSlot(slotPicker, t.id)}
          >
            <span className="fish-pick-meta">
              <strong>{t.name}</strong>
              <QualityChip quality={t.quality} />
              <span className="dim">
                {used}/{t.capacity} 条
                {inSlot >= 0 && inSlot !== slotPicker ? ` · 已在缸位 ${inSlot + 1}` : ""}
                {inSlot < 0 ? " · 未摆放" : ""}
              </span>
            </span>
            <span className="dim">{on ? "当前" : "选用"}</span>
          </button>
        );
      })}
      <button onClick={closeSlotPicker}>关闭</button>
    </ModalSheet>
  );
}
