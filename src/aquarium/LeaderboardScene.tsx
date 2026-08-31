import { useState } from "react";
import { useGame } from "../store/gameStore";
import { rankedLeaders } from "../data/leaderboard";
import { GearIcon } from "../art/Art";
import { bookLuck } from "../data/bookDefs";
import { ModalSheet, Page, PageBody, PageHead } from "../ui/chrome";

function RankMark({ rank }: { rank: number }) {
  if (rank === 1) return <span className="temple-rank temple-rank-1" title="第1名">①</span>;
  if (rank === 2) return <span className="temple-rank temple-rank-2" title="第2名">②</span>;
  if (rank === 3) return <span className="temple-rank temple-rank-3" title="第3名">③</span>;
  return <span className="temple-rank temple-rank-n" title={`第${rank}名`}>{rank}</span>;
}

export default function LeaderboardScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const visitLeader = useGame((s) => s.visitLeader);
  const [helpOpen, setHelpOpen] = useState(false);
  const rows = rankedLeaders();

  return (
    <Page>
      <PageHead
        onBack={() => setScene("aquarium")}
        backLabel="水族馆"
        title={
          <>
            <span>钓鱼佬圣殿</span>
            <button
              type="button"
              className="page-head-help"
              aria-label="圣殿说明"
              onClick={() => setHelpOpen(true)}
            >
              ?
            </button>
          </>
        }
      />
      <PageBody>
        <div className="panel dim">
          点参观进对方水族馆。进门有概率沾欧气（当前 <GearIcon kind="luck" size={16} />{" "}
          {save.luck + bookLuck(save.ownedBooks)} 层）。馆里点鱼可求购或申请配偶。
        </div>
        {rows.map(({ npc: n, score, rank }, i) => (
          <div className="panel row-between temple-row" key={n.id}>
            <div className="temple-who">
              <div className="temple-name-line">
                <RankMark rank={rank} />
                <strong className="temple-name">{n.name}</strong>
                <span className="temple-score" aria-label={`积分 ${score}`}>
                  {score}
                </span>
              </div>
              <div className="dim temple-blurb">{n.blurb}</div>
            </div>
            <button className="primary" data-guide={i === 0 ? "temple-visit" : undefined} onClick={() => visitLeader(n.id)}>
              参观
            </button>
          </div>
        ))}
      </PageBody>
      {helpOpen && (
        <ModalSheet title="钓鱼佬圣殿" onClose={() => setHelpOpen(false)}>
          <p>
            圣殿里住着各路钓鱼佬。点「参观」可以进对方水族馆看看鱼、沾点欧气，也可以求购鱼或申请配偶。
          </p>
          <p className="dim">
            积分按馆内活鱼品级累加：普通 +1 · 优良 +10 · 稀有 +30 · 珍贵 +80 · 极品 +200。
          </p>
          <p className="dim">欧气越高，钓鱼时越容易碰上好货。参观进门时有概率叠一层欧气。</p>
          <button className="primary" onClick={() => setHelpOpen(false)}>
            知道了
          </button>
        </ModalSheet>
      )}
    </Page>
  );
}
