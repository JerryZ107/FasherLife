import { useGame } from "../store/gameStore";
import { LEADERBOARD } from "../data/leaderboard";
import { GearIcon } from "../art/Art";
import { bookLuck } from "../data/bookDefs";

export default function LeaderboardScene() {
  const save = useGame((s) => s.save);
  const setScene = useGame((s) => s.setScene);
  const visitLeader = useGame((s) => s.visitLeader);

  return (
    <div className="page">
      <div className="page-head">
        <button onClick={() => setScene("aquarium")}>← 水族馆</button>
        <h2>榜单</h2>
      </div>
      <div className="page-body">
        <div className="panel dim">
          参观榜上钓友的水族馆，有概率获得欧气（当前 <GearIcon kind="luck" size={16} /> {save.luck + bookLuck(save.ownedBooks)} 层）。
        </div>
        {LEADERBOARD.map((n) => (
          <div className="panel row-between" key={n.id}>
            <div>
              <strong>{n.name}</strong>
              <div className="dim">{n.tank} · {n.blurb}</div>
            </div>
            <button className="primary" onClick={() => visitLeader(n.id)}>参观</button>
          </div>
        ))}
      </div>
    </div>
  );
}
