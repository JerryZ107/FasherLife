import { useState } from "react";
import { useGame } from "../store/gameStore";
import { QUEST_DEFS, QUEST_BY_ID } from "../data/questDefs";

type Tab = "newbie" | "timed" | "daily";

export default function QuestScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const claimDaily = useGame((s) => s.claimDaily);
  const claimTimed = useGame((s) => s.claimTimed);
  const current = QUEST_BY_ID[save.questStep];
  const [tab, setTab] = useState<Tab>("newbie");

  const daily = save.daily.day === save.gameDay
    ? save.daily
    : { day: save.gameDay, fed: false, sold: false, fedClaimed: false, soldClaimed: false };
  const timedExpired = save.gameDay > save.timed.endDay;
  const timedDone = save.timed.progress >= save.timed.target;

  return (
    <div className="page">
      <div className="page-head">
        <button onClick={() => setScene("aquarium")}>← 返回</button>
        <h2>任务</h2>
      </div>
      <div className="tabrow">
        <button className={tab === "newbie" ? "primary" : ""} onClick={() => setTab("newbie")}>新手任务</button>
        <button className={tab === "timed" ? "primary" : ""} onClick={() => setTab("timed")}>限时任务</button>
        <button className={tab === "daily" ? "primary" : ""} onClick={() => setTab("daily")}>常驻任务</button>
      </div>
      <div className="page-body">
        {tab === "newbie" && (
          <>
            <div className="panel">
              {save.questStep === "q_done" ? (
                <div style={{ color: "var(--accent-2)" }}>引导已完成。</div>
              ) : (
                <div>
                  当前：<strong>{current?.title}</strong>
                  <div className="dim">{current?.hint}</div>
                </div>
              )}
            </div>
            {QUEST_DEFS.map((q) => {
              const done = save.questStep === "q_done" || QUEST_DEFS.findIndex((x) => x.id === save.questStep) > QUEST_DEFS.findIndex((x) => x.id === q.id);
              const active = q.id === save.questStep;
              return (
                <div className={`panel ${active ? "panel-active" : ""}`} key={q.id} style={{ opacity: done && !active ? 0.55 : 1 }}>
                  <strong>{done && !active ? "✓ " : active ? "▶ " : ""}{q.title}</strong>
                  <div className="dim">{q.hint}</div>
                </div>
              );
            })}
          </>
        )}
        {tab === "timed" && (
          <div className="panel">
            <h2>优良以上上钩</h2>
            <p className="dim">7 天内钓到 3 条优良及以上的鱼，领 80 金。</p>
            {timedExpired ? (
              <p>本期已结束，跨天后会刷新。</p>
            ) : (
              <>
                <p>进度 {save.timed.progress}/{save.timed.target} · 截止第 {save.timed.endDay} 天</p>
                {save.timed.claimed ? (
                  <span className="chip ok">已领取</span>
                ) : (
                  <button className="primary" disabled={!timedDone} onClick={claimTimed}>
                    {timedDone ? "领取 80金" : "尚未完成"}
                  </button>
                )}
              </>
            )}
          </div>
        )}
        {tab === "daily" && (
          <>
            <div className="panel row-between">
              <div>
                <strong>今日喂食</strong>
                <div className="dim">水族馆喂至少一条 · 15 金</div>
              </div>
              {daily.fedClaimed ? (
                <span className="chip ok">已领取</span>
              ) : (
                <button className="primary" disabled={!daily.fed} onClick={() => claimDaily("fed")}>
                  {daily.fed ? "领取 15金" : "未完成"}
                </button>
              )}
            </div>
            <div className="panel row-between">
              <div>
                <strong>今日售卖</strong>
                <div className="dim">卖给鱼行或挂售成交 · 20 金</div>
              </div>
              {daily.soldClaimed ? (
                <span className="chip ok">已领取</span>
              ) : (
                <button className="primary" disabled={!daily.sold} onClick={() => claimDaily("sold")}>
                  {daily.sold ? "领取 20金" : "未完成"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
