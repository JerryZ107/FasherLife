import type { SaveData } from "../save/saveSchema";
import { MONTHLY_CARD_DAYS } from "./constants";
import { enqueueMonthlyGoldMail } from "./mail";

export const MONTHLY_GIFT_REEL = "part_gift_reel";

export function monthlyCardActive(save: SaveData): boolean {
  return save.monthlyCardUntilDay >= save.gameDay;
}

export function monthlyDaysLeft(save: SaveData): number {
  if (!monthlyCardActive(save)) return 0;
  return save.monthlyCardUntilDay - save.gameDay + 1;
}

/** 每买一份在当前到期日上 +30 天；过期或未开通则从今天起算 30 天。 */
export function extendMonthlyCard(save: SaveData): void {
  if (monthlyCardActive(save)) {
    save.monthlyCardUntilDay += MONTHLY_CARD_DAYS;
    return;
  }
  save.monthlyCardUntilDay = save.gameDay + MONTHLY_CARD_DAYS - 1;
  save.lastMonthlyClaimDay = save.gameDay - 1;
}

/**
 * 已过的有效天进邮箱；当天已登录则弹窗领取。
 * 不把当天金币直接打进存档，等弹窗点领取。
 */
export function settleMonthlyGold(save: SaveData, loggedIn: boolean): { mailed: number; popup: boolean } {
  if (save.monthlyCardUntilDay < 0) return { mailed: 0, popup: false };
  const until = Math.min(save.gameDay, save.monthlyCardUntilDay);
  if (save.lastMonthlyClaimDay >= until) return { mailed: 0, popup: false };

  let mailed = 0;
  let popup = false;
  for (let day = save.lastMonthlyClaimDay + 1; day <= until; day++) {
    if (loggedIn && day === save.gameDay) {
      popup = true;
      break;
    }
    enqueueMonthlyGoldMail(save, save.gameDay);
    save.lastMonthlyClaimDay = day;
    mailed += 1;
  }
  return { mailed, popup };
}
