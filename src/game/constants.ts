import type { Quality } from "../types";

/** 已废弃：结算不再用间隔，改用北京自然日（见 `beijingCalendarDaysPassed`）。 */
export const DEFAULT_REAL_MS_PER_GAME_DAY = 86_400_000;

/** 挂机每次尝试间隔：约等于手动「等待 + 搏斗」均值，便于 5 分钟演示。 */
export const IDLE_MS_PER_CAST = 10_000;

/** 珍珠→金币商店汇率（ADR-001）。 */
export const PEARL_TO_GOLD = 100;

/** 托管日费：普通免费，其余按品质（ADR-001 玩法设定）。 */
export const HOSTING_FEE: Record<Quality, number> = {
  common: 0,
  fine: 10,
  rare: 50,
  precious: 150,
  ultimate: 600,
};

/** 月卡：30 珍珠，每日 300 金币，持续 30 游戏天。 */
export const MONTHLY_CARD_PEARL = 30;
export const MONTHLY_CARD_DAILY_GOLD = 300;
export const MONTHLY_CARD_DAYS = 30;

/** 6 元新人礼包。新人前期 7 游戏天可买（ADR-003）。 */
export const NEWBIE_PACK_PEARL = 6;
export const NEWBIE_PACK_DAYS = 7;

/** 欧气上限（参观榜单叠加）。 */
export const LUCK_CAP = 8;
