import { useState } from "react";
import { useGame } from "../store/gameStore";
import { QUEST_DEFS, QUEST_BY_ID } from "../data/questDefs";
import { NEWBIE_TASK_DEFS } from "../data/newbieTaskDefs";
import { freshNewbieTasks } from "../save/saveSchema";
import { useUi } from "../store/uiStore";
import { Page, PageBody, PageHead, TabBar } from "../ui/chrome";

type Tab = "guide" | "newbie" | "timed" | "daily";

export default function QuestScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const claimDaily = useGame((s) => s.claimDaily);
  const claimTimed = useGame((s) => s.claimTimed);
  const claimNewbieTask = useGame((s) => s.claimNewbieTask);
  const resumeGuide = useGame((s) => s.resumeGuide);
  const guideReviewStep = useUi((s) => s.guideReviewStep);
  const current = QUEST_BY_ID[save.questStep];
  const guideDone = save.questStep === "q_done";
  const [tab, setTab] = useState<Tab>(guideDone ? "newbie" : "guide");

  const daily = save.daily.day === save.gameDay
    ? save.daily
    : { day: save.gameDay, fed: false, sold: false, fedClaimed: false, soldClaimed: false };
  const timedExpired = save.gameDay > save.timed.endDay;
  const timedItems = save.timed?.items ?? [];
  const nt = save.newbieTasks ?? freshNewbieTasks();

  const tabs = guideDone
    ? [
        { id: "newbie" as const, label: "新手任务" },
        { id: "timed" as const, label: "限时任务" },
        { id: "daily" as const, label: "常驻任务" },
        { id: "guide" as const, label: "新手引导" },
      ]
    : [
        { id: "guide" as const, label: "新手引导" },
        { id: "newbie" as const, label: "新手任务" },
        { id: "timed" as const, label: "限时任务" },
        { id: "daily" as const, label: "常驻任务" },
      ];

  function replay(stepId?: string) {
    resumeGuide(stepId);
    setScene("aquarium");
  }

  return (
    <Page>
      <PageHead onBack={() => setScene("aquarium")} title="任务" />
      <TabBar wrap items={tabs} value={tab} onChange={setTab} />
      <PageBody>
        {tab === "guide" && (
          <>
            <div className="panel">
              {guideDone ? (
                <div style={{ color: "var(--accent-2)" }}>新手引导已完成。</div>
              ) : (
                <div>
                  当前：<strong>{current?.title}</strong>
                  <div className="dim">{current?.hint}</div>
                </div>
              )}
              <p className="dim" style={{ marginTop: 8, fontSize: 12, lineHeight: 1.45 }}>
                共 {QUEST_DEFS.length} 步：钓鱼 → 存缸 → 存筐 → 卖鱼 → 喂食 → 买鲫鱼 → 做菜 → 吃菜 → 配偶 → 渔聊 → 图鉴 →{" "}
                <strong>圣殿排行参观</strong>
              </p>
              <button className="primary" style={{ marginTop: 8 }} onClick={() => replay()}>
                重温引导
              </button>
              <p className="dim" style={{ marginTop: 6, fontSize: 12 }}>
                {guideDone
                  ? "从第一步重新看一遍操作提示。"
                  : "随时可重看当前步骤的界面引导。往下滚可看全部步骤。"}
              </p>
            </div>
            {QUEST_DEFS.map((q, i) => {
              const done = guideDone || QUEST_DEFS.findIndex((x) => x.id === save.questStep) > QUEST_DEFS.findIndex((x) => x.id === q.id);
              const active = q.id === save.questStep;
              const reviewing = guideReviewStep === q.id;
              return (
                <button
                  type="button"
                  key={q.id}
                  className={`panel quest-row ${active ? "panel-active" : ""} ${reviewing ? "is-reviewing" : ""}`}
                  style={{ opacity: done && !active && !reviewing ? 0.55 : 1, width: "100%", textAlign: "left" }}
                  onClick={() => replay(q.id)}
                >
                  <strong>
                    {done && !active ? "✓ " : active ? "▶ " : ""}
                    {i + 1}/{QUEST_DEFS.length} {q.title}
                  </strong>
                  <div className="dim">{q.hint}</div>
                  <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>点我重温这一步</div>
                </button>
              );
            })}
          </>
        )}

        {tab === "newbie" && (
          <>
            <p className="dim" style={{ padding: "4px 14px" }}>
              完成可领经验，与界面引导无关，慢慢做就行。
            </p>
            {NEWBIE_TASK_DEFS.map((t) => {
              const progress = nt[t.progressKey] ?? 0;
              const done = progress >= t.target;
              const claimed = Boolean(nt.claimed[t.id]);
              return (
                <div className="panel row-between" key={t.id}>
                  <div>
                    <strong>{t.title}</strong>
                    <div className="dim">{t.hint}</div>
                    <div className="dim" style={{ marginTop: 4 }}>
                      进度 {Math.min(progress, t.target)}/{t.target} · +{t.rewardXp}经验
                    </div>
                  </div>
                  {claimed ? (
                    <span className="chip ok">已领取</span>
                  ) : (
                    <button className="primary" disabled={!done} onClick={() => claimNewbieTask(t.id)}>
                      {done ? "领取" : "未完成"}
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}

        {tab === "timed" && (
          <>
            <p className="dim" style={{ padding: "4px 14px" }}>
              {timedExpired
                ? "本期已结束，跨天后会刷新。"
                : `本期截止第 ${save.timed.endDay} 天 · 还有 ${Math.max(0, save.timed.endDay - save.gameDay)} 天`}
            </p>
            {timedItems.length === 0 && <div className="panel dim">暂无限时任务</div>}
            {timedItems.map((it) => {
              const done = it.progress >= it.target;
              return (
                <div className="panel row-between" key={it.id}>
                  <div>
                    <strong>{it.title}</strong>
                    <div className="dim">{it.hint}</div>
                    <div className="dim" style={{ marginTop: 4 }}>
                      进度 {Math.min(it.progress, it.target)}/{it.target} · +{it.rewardXp}经验
                    </div>
                  </div>
                  {timedExpired ? (
                    <span className="chip">已过期</span>
                  ) : it.claimed ? (
                    <span className="chip ok">已领取</span>
                  ) : (
                    <button className="primary" disabled={!done} onClick={() => claimTimed(it.id)}>
                      {done ? "领取" : "未完成"}
                    </button>
                  )}
                </div>
              );
            })}
          </>
        )}

        {tab === "daily" && (
          <>
            <div className="panel row-between">
              <div>
                <strong>今日喂食</strong>
                <div className="dim">喂一条缸里的鱼 · 15 金</div>
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
                <div className="dim">卖或挂售成交 · 20 金</div>
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
      </PageBody>
    </Page>
  );
}
