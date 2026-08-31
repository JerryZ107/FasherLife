import { useMemo, useState } from "react";
import { useGame } from "../store/gameStore";
import { FISH_BY_ID } from "../data/fishDefs";
import { LEADER_BY_ID, leaderBuyPrice, leaderRentPricePerDay, visibleLeaderFish } from "../data/leaderboard";
import { occupancy } from "../game/tanks";
import TankCanvas from "./TankCanvas";
import { ModalSheet, NavArrow, TankPlaque } from "../ui/chrome";
import { BackChevron, IcoList, IcoPair } from "../ui/marks";
import { askConfirm } from "../store/uiStore";

export default function VisitAquariumScene() {
  const save = useGame((s) => s.save);
  const selectedUid = useGame((s) => s.selectedTankUid);
  const selectTankFish = useGame((s) => s.selectTankFish);
  const leaveVisit = useGame((s) => s.leaveVisit);
  const buyLeaderFish = useGame((s) => s.buyLeaderFish);
  const rentLeaderFish = useGame((s) => s.rentLeaderFish);
  const [tankIdx, setTankIdx] = useState(0);
  const [rentOpen, setRentOpen] = useState(false);
  const [rentDays, setRentDays] = useState(1);

  const npc = save.visitNpcId ? LEADER_BY_ID[save.visitNpcId] : undefined;
  const tanks = npc?.tanks ?? [];
  const safeIdx = tanks.length === 0 ? 0 : Math.min(tankIdx, tanks.length - 1);
  const tank = tanks[safeIdx];
  const fish = useMemo(
    () => (npc ? visibleLeaderFish(npc, save.leaderTakenUids) : []),
    [npc, save.leaderTakenUids],
  );
  const here = tank ? fish.filter((f) => f.tankId === tank.id) : [];
  const selected = here.find((f) => f.uid === selectedUid) ?? null;
  const selectedDef = selected ? FISH_BY_ID[selected.defId] : null;
  const cap = tank?.capacity ?? 0;
  const used = tank ? here.length : 0;
  const buyPrice = selected ? leaderBuyPrice(selected.defId) : 0;
  const rentPerDay = selected ? leaderRentPricePerDay(selected.defId) : 0;
  const rentTotal = rentPerDay * Math.max(1, rentDays);

  if (!npc || !tank) {
    return (
      <div className="hub">
        <div className="hub-top">
          <button className="back-btn" data-guide="back-aquarium" onClick={leaveVisit}>圣殿</button>
          <span className="chip">钓友不在</span>
        </div>
      </div>
    );
  }

  const closeFish = () => {
    setRentOpen(false);
    selectTankFish(null);
  };

  return (
    <div className="hub">
      <div className="hub-top">
        <button className="back-btn" data-guide="back-aquarium" onClick={leaveVisit} aria-label="返回">
          <BackChevron />
          <span>返回</span>
        </button>
        <NavArrow dir="prev" onClick={() => { selectTankFish(null); setTankIdx((i) => Math.max(0, i - 1)); }} disabled={tanks.length <= 1} />
        <TankPlaque
          name={`${npc.name} · ${tank.name}`}
          quality={tank.quality}
          used={used}
          cap={cap}
        />
        <NavArrow dir="next" onClick={() => { selectTankFish(null); setTankIdx((i) => Math.min(tanks.length - 1, i + 1)); }} disabled={tanks.length <= 1} />
      </div>

      <div className="hub-mid">
        <TankCanvas fish={fish} tankId={tank.id} eggs={[]} allowCleanDead={false} />
        {tank.decor !== "none" && <div className={`tank-decor ${tank.decor}`} />}
        {selected && selectedDef && !rentOpen && (
          <div className="hub-bar2">
            <div className="hub-bar2-actions cols-2">
              <button
                className="primary"
                onClick={() =>
                  askConfirm({
                    title: "确认求购",
                    message: `花 ${buyPrice} 金求购「${selectedDef.name}」？鱼会进你的鱼筐。`,
                    confirmLabel: "求购",
                    onConfirm: () => {
                      if (buyLeaderFish(selected.uid)) closeFish();
                    },
                  })
                }
              >
                <IcoList />求购 {buyPrice}金
              </button>
              <button
                onClick={() => {
                  setRentDays(1);
                  setRentOpen(true);
                }}
              >
                <IcoPair />租借 {rentPerDay}金/天
              </button>
            </div>
          </div>
        )}
      </div>

      {rentOpen && selected && selectedDef && (
        <ModalSheet title={`租借 ${selectedDef.name}`} onClose={() => setRentOpen(false)}>
          <p className="dim">
            按天计费：{rentPerDay} 金/天。租完后选一口鱼缸放进去，缸没空位会退回钱。
          </p>
          <div className="rent-stepper">
            <button
              type="button"
              onClick={() => setRentDays((d) => Math.max(1, d - 1))}
              aria-label="减少天数"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={rentDays}
              onChange={(e) => setRentDays(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
            />
            <button
              type="button"
              onClick={() => setRentDays((d) => d + 1)}
              aria-label="增加天数"
            >
              +
            </button>
            <span className="dim">天 · 共 {rentTotal} 金</span>
          </div>
          <div className="dim" style={{ marginTop: 8 }}>选一口鱼缸：</div>
          <div className="rent-tank-pick">
            {save.tanks.map((t) => {
              const full = occupancy(save, t.id) >= t.capacity;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={full}
                  onClick={() => {
                    askConfirm({
                      title: "确认租借",
                      message: `租「${selectedDef.name}」${rentDays} 天，花 ${rentTotal} 金，放进 ${t.name}？`,
                      confirmLabel: "租借",
                      onConfirm: () => {
                        if (rentLeaderFish(selected.uid, t.id, rentDays)) setRentOpen(false);
                      },
                    });
                  }}
                >
                  <span className="fish-pick-meta">
                    <strong>{t.name}</strong>
                    <span className="dim">{occupancy(save, t.id)}/{t.capacity} 条{full ? " · 满" : ""}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <button onClick={() => setRentOpen(false)}>取消</button>
        </ModalSheet>
      )}
    </div>
  );
}
