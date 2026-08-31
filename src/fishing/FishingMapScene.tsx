import { useEffect, useState } from "react";
import { useGame } from "../store/gameStore";
import { FISHERY_DEFS, FISHERY_MAP_POS } from "../data/fisheryDefs";
import { FISH_BY_ID } from "../data/fishDefs";
import { CONSUMABLE_BY_ID } from "../data/consumableDefs";
import { ROD_BY_ID, STOOL_BY_ID, BASKET_BY_ID } from "../data/equipmentDefs";
import { OUTFIT_DEFS } from "../data/outfitDefs";
import { basketWeightKg } from "../game/weight";
import { CharImg, FishPortrait, GearIcon } from "../art/Art";
import { ART } from "../art/assets";
import { ModalSheet, Page, PageHead, QualityChip } from "../ui/chrome";
import { useUi } from "../store/uiStore";
import { isReturnTrip } from "../game/guide";

type Picker = "none" | "bait" | "rod" | "stool" | "basket" | "loadout" | "outfit";

export default function FishingMapScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const enterFishery = useGame((s) => s.enterFishery);
  const selectFishery = useGame((s) => s.selectFishery);
  const hasFisheryCard = useGame((s) => s.hasFisheryCard);
  const equip = useGame((s) => s.equip);
  const toggleTripBait = useGame((s) => s.toggleTripBait);
  const applyLoadout = useGame((s) => s.applyLoadout);
  const saveNewLoadout = useGame((s) => s.saveNewLoadout);
  const overwriteLoadout = useGame((s) => s.overwriteLoadout);
  const deleteLoadout = useGame((s) => s.deleteLoadout);
  const equipOutfit = useGame((s) => s.equipOutfit);
  const setLookSex = useGame((s) => s.setLookSex);
  const [picked, setPicked] = useState<string | null>(null);
  const [gate, setGate] = useState<string | null>(null);
  const [picker, setPicker] = useState<Picker>("none");
  const [newLoadoutName, setNewLoadoutName] = useState("");
  const setMapPicked = useUi((s) => s.setMapPicked);
  const uiTripPhase = useUi((s) => s.guideTripPhase);
  const storeFishMode = isReturnTrip(save.guideTripPhase ?? uiTripPhase);

  useEffect(() => {
    if (storeFishMode) setPicked(null);
  }, [storeFishMode]);

  useEffect(() => {
    setMapPicked(storeFishMode ? null : picked);
    return () => setMapPicked(null);
  }, [picked, setMapPicked, storeFishMode]);

  const rod = ROD_BY_ID[save.equipped.rod];
  const bait = CONSUMABLE_BY_ID[save.equipped.bait];
  const stool = STOOL_BY_ID[save.equipped.stool];
  const basket = BASKET_BY_ID[save.equipped.basket];
  const trip = save.equippedBaitIds ?? [save.equipped.bait];
  const bw = basketWeightKg(save.basket);

  function goIn(id: string) {
    if (storeFishMode) return;
    const f = FISHERY_DEFS.find((x) => x.id === id);
    if (!f) return;
    if (f.entry.type === "free" || hasFisheryCard(id)) {
      if (enterFishery(id, "free")) setScene("fishing");
      return;
    }
    setGate(id);
  }

  const baitLabel = trip.length > 1
    ? `${CONSUMABLE_BY_ID[trip[0]]?.name ?? "饵"}+${trip.length - 1}`
    : (bait?.name ?? "—");

  return (
    <Page>
      <PageHead onBack={() => setScene("aquarium")} backLabel="水族馆" title="钓鱼地图" backGuide="back-aquarium" />
      <div className="map-field" style={{ backgroundImage: `url(${ART.bgMap})` }}>
        {FISHERY_DEFS.map((fishery) => {
          const card = hasFisheryCard(fishery.id);
          const selected = picked === fishery.id;
          const pos = FISHERY_MAP_POS[fishery.id] ?? { left: "40%", top: "40%" };
          const mapGuide =
            !storeFishMode && fishery.id === "clear_stream" ? "fishery-clear_stream" : undefined;
          const enterGuide =
            !storeFishMode && selected && fishery.id === "clear_stream" ? "enter-fishery" : undefined;
          return (
            <div
              key={fishery.id}
              className={`map-node ${selected ? "selected" : ""}`}
              data-guide={mapGuide}
              style={{ left: pos.left, top: pos.top }}
              onClick={() => {
                if (storeFishMode) return;
                setPicked(fishery.id);
              }}
              onDoubleClick={() => goIn(fishery.id)}
            >
              <div className="map-name">{fishery.name}</div>
              <div className="dim" style={{ fontSize: 11 }}>
                {fishery.entry.type === "free" ? "免费" : card ? "月卡有效" : `${fishery.entry.ticketPrice}金/次`}
              </div>
              {selected && (
                <button
                  className="primary enter-float"
                  data-guide={enterGuide}
                  onClick={(e) => { e.stopPropagation(); goIn(fishery.id); }}
                >
                  进入
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="loadout-bar">
        <div className="avatar dressed" onClick={() => setPicker("outfit")} title="换装">
          <CharImg size={64} />
        </div>
        <Slot kind="bait" label="鱼饵" value={baitLabel} onClick={() => setPicker("bait")} />
        <Slot kind="rod" label="鱼竿" value={rod?.name} onClick={() => setPicker("rod")} />
        <Slot kind="stool" label="板凳" value={stool?.name} onClick={() => setPicker("stool")} />
        <Slot kind="basket" label="鱼筐" value={basket ? `${save.basket.length}/${basket.capacity}` : ""} onClick={() => setPicker("basket")} />
        <button className="loadout-preset" onClick={() => setPicker("loadout")}>
          {save.loadoutName || "默认搭配"}
        </button>
      </div>

      {picker !== "none" && (
        <ModalSheet
          title={
            picker === "bait" ? "鱼饵（可多选携带）"
            : picker === "basket" ? `鱼筐 ${save.basket.length}/${basket?.capacity} · ${bw.toFixed(1)}/${basket?.weightCap}kg`
            : picker === "loadout" ? "自定义装备组合"
            : picker === "outfit" ? "服装"
            : picker === "rod" ? "鱼竿"
            : picker === "stool" ? "板凳"
            : undefined
          }
          onClose={() => setPicker("none")}
        >
            {picker === "bait" && (
              <>
                {Object.entries(save.baitStock).filter(([, n]) => n > 0).map(([id, n]) => {
                  const c = CONSUMABLE_BY_ID[id];
                  if (!c) return null;
                  return (
                    <div className="row-between" key={id} style={{ marginBottom: 6 }}>
                      <span>{c.name} ×{n}</span>
                      <div className="row">
                        <button className={trip.includes(id) ? "primary" : ""} onClick={() => toggleTripBait(id)}>携带</button>
                        <button className={save.equipped.bait === id ? "primary" : ""} onClick={() => equip("bait", id)}>当前</button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            {picker === "rod" && save.ownedRods.map((id) => (
              <button key={id} className={save.equipped.rod === id ? "primary" : ""} onClick={() => { equip("rod", id); setPicker("none"); }}>
                {ROD_BY_ID[id].name}
              </button>
            ))}
            {picker === "stool" && save.ownedStools.map((id) => (
              <button key={id} className={save.equipped.stool === id ? "primary" : ""} onClick={() => { equip("stool", id); setPicker("none"); }}>
                {STOOL_BY_ID[id].name}
              </button>
            ))}
            {picker === "basket" && (
              <>
                {save.ownedBaskets.map((id) => (
                  <button key={id} className={save.equipped.basket === id ? "primary" : ""} onClick={() => { equip("basket", id); }}>
                    {BASKET_BY_ID[id].name}
                  </button>
                ))}
                <div className="dim">存进缸：回馆里开鱼筐</div>
                {save.basket.map((b) => {
                  const def = FISH_BY_ID[b.defId];
                  if (!def) return null;
                  return (
                    <div className="peek-fish" key={b.uid}>
                      <FishPortrait id={def.id} size={36} alt={def.name} />
                      <span>{def.name} <QualityChip quality={def.quality} /></span>
                    </div>
                  );
                })}
              </>
            )}
            {picker === "loadout" && (
              <>
                <p className="dim">点一套立刻换上。</p>
                {save.loadouts.map((l) => (
                  <div className="panel row-between" key={l.id}>
                    <button
                      className={save.activeLoadoutId === l.id ? "primary" : ""}
                      onClick={() => applyLoadout(l.id)}
                    >
                      {l.name}
                    </button>
                    <div className="row">
                      <button onClick={() => overwriteLoadout(l.id)}>覆盖</button>
                      <button disabled={save.loadouts.length <= 1} onClick={() => deleteLoadout(l.id)}>删除</button>
                    </div>
                  </div>
                ))}
                <input
                  placeholder="新搭配名字"
                  value={newLoadoutName}
                  onChange={(e) => setNewLoadoutName(e.target.value)}
                />
                <button
                  className="primary"
                  onClick={() => {
                    saveNewLoadout(newLoadoutName);
                    setNewLoadoutName("");
                  }}
                >
                  新建当前搭配
                </button>
              </>
            )}
            {picker === "outfit" && (
              <>
                <p className="dim">只换外观。</p>
                <div className="row" style={{ marginBottom: 8 }}>
                  <button className={save.lookSex === "male" ? "primary" : ""} onClick={() => setLookSex("male")}>男</button>
                  <button className={save.lookSex === "female" ? "primary" : ""} onClick={() => setLookSex("female")}>女</button>
                </div>
                {OUTFIT_DEFS.filter((o) => save.ownedOutfits.includes(o.id)).map((o) => (
                  <button
                    key={o.id}
                    className={save.equippedOutfit === o.id ? "primary" : ""}
                    onClick={() => equipOutfit(o.id)}
                  >
                    {o.name}
                  </button>
                ))}
              </>
            )}
            <button onClick={() => setPicker("none")}>关闭</button>
        </ModalSheet>
      )}

      {gate && (
        <ModalSheet title={`进入 ${FISHERY_DEFS.find((f) => f.id === gate)?.name}`} onClose={() => setGate(null)}>
            <button className="primary" onClick={() => {
              if (enterFishery(gate, "card")) setScene("fishing");
              setGate(null);
            }}>
              办卡 {FISHERY_DEFS.find((f) => f.id === gate)?.entry.cardPrice} 金
            </button>
            <button onClick={() => {
              if (enterFishery(gate, "ticket")) setScene("fishing");
              setGate(null);
            }}>
              购买门票 {FISHERY_DEFS.find((f) => f.id === gate)?.entry.ticketPrice} 金
            </button>
            <button onClick={() => {
              selectFishery(gate);
              setScene("sneak");
              setGate(null);
            }}>偷偷溜进去</button>
            <button onClick={() => setGate(null)}>取消</button>
        </ModalSheet>
      )}
    </Page>
  );
}

function Slot({
  kind,
  label,
  value,
  onClick,
}: {
  kind: "bait" | "rod" | "stool" | "basket";
  label: string;
  value?: string;
  onClick: () => void;
}) {
  return (
    <button className="slot" onClick={onClick}>
      <GearIcon kind={kind} size={28} />
      <span className="dim">{label}</span>
      <span>{value ?? "—"}</span>
    </button>
  );
}
