import { MONTHLY_CARD_DAILY_GOLD, MONTHLY_CARD_DAILY_PEARL } from "../game/constants";
import { monthlyDaysLeft } from "../game/monthlyCard";
import { useGame } from "../store/gameStore";
import { GoldMark, PearlMark } from "./marks";
import { ModalCloseX } from "./chrome";

export default function MonthlyGoldModal() {
  const save = useGame((s) => s.save);
  const claim = useGame((s) => s.claimMonthlyGold);
  const left = monthlyDaysLeft(save);

  return (
    <div className="modal-backdrop monthly-gold-back" onClick={() => claim()}>
      <div
        className="monthly-gold"
        role="dialog"
        aria-labelledby="monthly-gold-title"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalCloseX onClose={() => claim()} />
        <div className="monthly-gold-rays" aria-hidden />
        <div className="monthly-gold-coins" aria-hidden>
          <span className="monthly-gold-coin a"><GoldMark size={28} /></span>
          <span className="monthly-gold-coin b"><GoldMark size={22} /></span>
          <span className="monthly-gold-coin c"><GoldMark size={18} /></span>
        </div>
        <div className="monthly-gold-pile">
          <GoldMark size={72} />
        </div>
        <h2 id="monthly-gold-title">月卡补给到了</h2>
        <div className="monthly-gold-amt">
          <div className="monthly-gold-amt-row">
            <span>{MONTHLY_CARD_DAILY_GOLD}金币</span>
            <GoldMark size={26} />
          </div>
          <div className="monthly-gold-amt-row">
            <span>{MONTHLY_CARD_DAILY_PEARL}珍珠</span>
            <PearlMark size={18} />
          </div>
        </div>
        <p className="dim">{left > 0 ? `月卡还剩 ${left} 天` : "今天的份"}</p>
        <button className="primary monthly-gold-btn" onClick={() => claim()}>
          领取
        </button>
      </div>
    </div>
  );
}
