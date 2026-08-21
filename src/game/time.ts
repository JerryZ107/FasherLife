/** 游戏天按北京（Asia/Shanghai）自然日：当天 0 点到次日 0 点为 1 天。 */

export const BEIJING_TZ = "Asia/Shanghai";

export function beijingDateKey(ts: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BEIJING_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

/** 两个时间戳之间跨过了几个北京自然日（不含当天）。 */
export function beijingCalendarDaysPassed(fromTs: number, toTs: number): number {
  const a = beijingDateKey(fromTs);
  const b = beijingDateKey(toTs);
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const utcA = Date.UTC(ay, am - 1, ad);
  const utcB = Date.UTC(by, bm - 1, bd);
  return Math.max(0, Math.round((utcB - utcA) / 86_400_000));
}
