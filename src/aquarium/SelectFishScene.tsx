import { useState } from "react";
import { useGame } from "../store/gameStore";
import { FISH_BY_ID } from "../data/fishDefs";
import { ATTRACTANT_DEFS, attractRemainingDays, bonusLabel } from "../data/attractantDefs";
import { QUALITY_LABEL } from "../types";
import { FishPortrait } from "../art/Art";
import { fishSex } from "../game/pairing";
import { occupancy, tankHasRoom } from "../game/tanks";
import FishTraitChips from "../ui/FishTraitChips";

type Sub = "feed" | "pair" | "release" | "list" | "move" | "basket";

export default function SelectFishScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const feedMany = useGame((s) => s.feedMany);
  const releaseMany = useGame((s) => s.releaseMany);
  const listManyFromTank = useGame((s) => s.listManyFromTank);
  const unpair = useGame((s) => s.unpair);
  const applyAttractantToFish = useGame((s) => s.applyAttractantToFish);
  const applyAttractantToTank = useGame((s) => s.applyAttractantToTank);
  const setActiveTank = useGame((s) => s.setActiveTank);
  const moveTankFish = useGame((s) => s.moveTankFish);
  const putTankToBasket = useGame((s) => s.putTankToBasket);
  const [sub, setSub] = useState<Sub>("feed");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  function toggle(uid: string) {
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(uid)) n.delete(uid);
      else n.add(uid);
      return n;
    });
  }

  function showTank(id: string) {
    if (id === save.activeTankId) return;
    setPicked(new Set());
    setActiveTank(id);
  }

  const tank = save.tanks.find((t) => t.id === save.activeTankId);
  const living = save.tank.filter((f) => !f.dead && f.tankId === save.activeTankId);
  const uids = [...picked];
  const scentTarget = uids.length === 1 ? living.find((f) => f.uid === uids[0]) : undefined;
  const pairs = (() => {
    const seen = new Set<string>();
    const out: { id: string; a: string; b: string }[] = [];
    for (const f of living) {
      if (!f.pairId || seen.has(f.pairId)) continue;
      seen.add(f.pairId);
      const mate = living.find((x) => x.pairId === f.pairId && x.uid !== f.uid);
      out.push({
        id: f.pairId,
        a: FISH_BY_ID[f.defId]?.name ?? "?",
        b: mate ? (FISH_BY_ID[mate.defId]?.name ?? "?") : "?",
      });
    }
    return out;
  })();
  const tankScentDays = tank ? attractRemainingDays(tank.tankAttractUntilDay, save.gameDay) : 0;
  const goldScents = ATTRACTANT_DEFS.filter((a) => a.scope === "fish");
  const pearlMists = ATTRACTANT_DEFS.filter((a) => a.scope === "tank");
  const otherTanks = save.tanks.filter((t) => t.id !== save.activeTankId);

  return (
    <div className="page">
      <div className="page-head">
        <button onClick={() => setScene("aquarium")}>← 返回</button>
        <h2>选鱼</h2>
        {sub !== "pair" && (
          <button
            style={{ marginLeft: "auto" }}
            disabled={living.length === 0}
            onClick={() => {
              if (picked.size === living.length) setPicked(new Set());
              else setPicked(new Set(living.map((f) => f.uid)));
            }}
          >
            {picked.size === living.length && living.length > 0 ? "取消全选" : "全选"}
          </button>
        )}
      </div>
      <div className="tabrow wrap">
        {save.tanks.map((t) => {
          const used = occupancy(save, t.id);
          return (
            <button
              key={t.id}
              className={t.id === save.activeTankId ? "primary" : ""}
              onClick={() => showTank(t.id)}
            >
              {t.name} {used}/{t.capacity}
            </button>
          );
        })}
      </div>
      <div className="tabrow wrap">
        {(["feed", "pair", "release", "list", "move", "basket"] as Sub[]).map((t) => (
          <button
            key={t}
            className={sub === t ? "primary" : ""}
            onClick={() => {
              setSub(t);
              setPicked(new Set());
            }}
          >
            {t === "feed" ? "喂食" : t === "pair" ? "配偶" : t === "release" ? "放生" : t === "list" ? "挂售" : t === "move" ? "换缸" : "放筐"}
          </button>
        ))}
      </div>
      <div className="page-body">
        {sub === "pair" && (
          <>
            <p className="dim">同缸每天自动配对，不能指定对象。勾一条活鱼再用求偶香；已配对会催产。</p>
            {tankScentDays > 0 && tank && (
              <p>整缸香氛还剩 {tankScentDays} 天 · {bonusLabel(tank.tankAttractBonus)}</p>
            )}
            {pairs.length === 0 && <div className="dim" style={{ padding: 8 }}>还没有配偶</div>}
            {pairs.map((p) => (
              <div className="panel row-between" key={p.id}>
                <span>{p.a} × {p.b}</span>
                <button onClick={() => unpair(p.id)}>解除</button>
              </div>
            ))}
          </>
        )}
        {sub === "move" && (
          <p className="dim">勾这口缸里的活鱼，再点要换去的缸。一口缸满了进不去。只挪配对里的一条会解配；两条一起挪，配偶还在。</p>
        )}
        {sub === "basket" && (
          <p className="dim">勾活鱼放回鱼筐。筐满（条数或重量）进不去。配对会解配。健康会带着走，再存入不会回满。</p>
        )}
        {living.length === 0 && <div className="dim" style={{ padding: 12 }}>这口缸还没有活鱼</div>}
        {living.map((f) => {
          const def = FISH_BY_ID[f.defId];
          if (!def) return null;
          const scentDays = attractRemainingDays(f.attractUntilDay, save.gameDay);
          return (
            <label className="panel row-between" key={f.uid}>
              <span className="row" style={{ alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={picked.has(f.uid)}
                  onChange={() => {
                    if (sub === "pair") {
                      setPicked((prev) => (prev.has(f.uid) ? new Set() : new Set([f.uid])));
                    } else {
                      toggle(f.uid);
                    }
                  }}
                />
                <FishPortrait id={def.id} size={40} alt={def.name} />
                {def.name} <span className={`chip ${def.quality}`}>{QUALITY_LABEL[def.quality]}</span>
                <FishTraitChips sex={fishSex(f)} loveView={f.loveView} ownedBooks={save.ownedBooks} />
                <span className="dim">
                  {" "}健康 {f.health}
                  {f.pairId ? ` · 已配对${f.gestationLeft > 0 ? ` · 孕期 ${f.gestationLeft} 天` : ""}` : ""}
                  {scentDays > 0 ? ` · 求偶香 ${scentDays} 天` : ""}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <div className="page-foot">
        {sub === "feed" && (
          <button className="primary" disabled={uids.length === 0} onClick={() => feedMany(uids)}>
            喂食选中 {uids.length} 条
          </button>
        )}
        {sub === "release" && (
          <button className="danger" disabled={uids.length === 0} onClick={() => { releaseMany(uids); setPicked(new Set()); }}>
            放生选中
          </button>
        )}
        {sub === "list" && (
          <button
            className="primary"
            disabled={uids.length === 0}
            onClick={() => {
              listManyFromTank(uids);
              setPicked(new Set());
            }}
          >
            挂售选中到鱼行
          </button>
        )}
        {sub === "move" && (
          <>
            {otherTanks.length === 0 && <p className="dim">只有一口缸，扩建或再买缸后才能换缸。</p>}
            {otherTanks.map((t) => {
              const used = occupancy(save, t.id);
              const can = uids.length > 0 && tankHasRoom(save, t.id, uids.length);
              return (
                <button
                  key={t.id}
                  className="primary"
                  disabled={!can}
                  onClick={() => {
                    if (moveTankFish(uids, t.id)) setPicked(new Set());
                  }}
                >
                  换到 {t.name}（{used}/{t.capacity}）
                </button>
              );
            })}
          </>
        )}
        {sub === "basket" && (
          <button
            className="primary"
            disabled={uids.length === 0}
            onClick={() => {
              if (putTankToBasket(uids)) setPicked(new Set());
            }}
          >
            放回鱼筐 {uids.length > 0 ? `${uids.length} 条` : ""}
          </button>
        )}
        {sub === "pair" && (
          <>
            <div className="dim">金币求偶香 · 勾一条活鱼；已配对会催产</div>
            {scentTarget ? (
              goldScents.map((a) => {
                const n = save.attractantStock?.[a.id] ?? 0;
                return (
                  <button
                    key={a.id}
                    disabled={n <= 0}
                    onClick={() => applyAttractantToFish(scentTarget.uid, a.id)}
                  >
                    {a.name} ×{n} · {bonusLabel(a.bonus)}
                  </button>
                );
              })
            ) : (
              <p className="dim">先勾一条活鱼</p>
            )}
            <div className="dim" style={{ marginTop: 8 }}>珍珠香氛 · 喷整缸</div>
            {pearlMists.map((a) => {
              const n = save.attractantStock?.[a.id] ?? 0;
              return (
                <button key={a.id} disabled={n <= 0} onClick={() => applyAttractantToTank(a.id)}>
                  {a.name} ×{n} · {bonusLabel(a.bonus)} · {a.durationDays}天
                </button>
              );
            })}
            <button onClick={() => setScene("shop")}>去商城买求偶香</button>
          </>
        )}
      </div>
    </div>
  );
}
