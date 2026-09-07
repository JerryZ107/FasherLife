import { MAIL_BY_ID, MAIL_DEFS, MONTHLY_GOLD_MAIL, mailHasReward, type MailDef } from "../data/mailDefs";
import type { MailItem, SaveData } from "../save/saveSchema";
import { genUid } from "./fishingLogic";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function mailReceivedAt(m: MailItem, save: SaveData): number {
  if (m.receivedAt && m.receivedAt > 0) return m.receivedAt;
  const daysAgo = Math.max(0, save.gameDay - m.receivedDay);
  return save.lastDayTickAt - daysAgo * 86_400_000;
}

export function formatMailReceivedAt(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function copyMails(save: SaveData): MailItem[] {
  return (save.mails ?? []).map((m) => ({ ...m }));
}

export function unreadMailCount(save: SaveData): number {
  return (save.mails ?? []).filter((m) => {
    const def = MAIL_BY_ID[m.defId];
    if (!def) return false;
    if (mailExpired(m, save.gameDay, def)) return false;
    return !m.read || (mailHasReward(def) && !m.claimed);
  }).length;
}

export function mailExpired(m: MailItem, gameDay: number, def: MailDef): boolean {
  if (!def.expireDays) return false;
  return gameDay - m.receivedDay > def.expireDays;
}

export function visibleMails(save: SaveData): MailItem[] {
  const day = save.gameDay;
  return copyMails(save)
    .filter((m) => {
      const def = MAIL_BY_ID[m.defId];
      return Boolean(def) && !mailExpired(m, day, def);
    })
    .sort((a, b) => mailReceivedAt(b, save) - mailReceivedAt(a, save));
}

export function enqueueMonthlyGoldMail(save: SaveData, receivedDay: number): void {
  if (!save.mails) save.mails = [];
  save.mails.unshift({
    uid: genUid("m"),
    defId: MONTHLY_GOLD_MAIL.id,
    receivedDay,
    receivedAt: Date.now(),
    read: false,
    claimed: false,
  });
}

export function ensureInbox(save: SaveData): boolean {
  if (!save.mails) save.mails = [];
  if (!save.mailFlags) save.mailFlags = {};
  let changed = false;
  for (const def of MAIL_DEFS) {
    if (save.mailFlags[def.id]) continue;
    save.mails.unshift({
      uid: genUid("m"),
      defId: def.id,
      receivedDay: save.gameDay,
      receivedAt: Date.now(),
      read: false,
      claimed: !mailHasReward(def),
    });
    save.mailFlags[def.id] = true;
    changed = true;
  }
  return changed;
}

export function grantMailReward(save: SaveData, def: MailDef): string[] {
  const bits: string[] = [];
  if (def.gold) {
    save.gold += def.gold;
    bits.push(`+${def.gold}金`);
  }
  if (def.pearl) {
    save.pearl += def.pearl;
    bits.push(`+${def.pearl}珍珠`);
  }
  if (def.salt) {
    save.saltStock = (save.saltStock ?? 0) + def.salt;
    bits.push(`+${def.salt}盐`);
  }
  if (def.bait) {
    save.baitStock = {
      ...save.baitStock,
      [def.bait.id]: (save.baitStock[def.bait.id] ?? 0) + def.bait.n,
    };
    bits.push(`鱼饵×${def.bait.n}`);
  }
  if (def.food) {
    save.foodStock = {
      ...save.foodStock,
      [def.food.id]: (save.foodStock[def.food.id] ?? 0) + def.food.n,
    };
    bits.push(`鱼粮×${def.food.n}`);
  }
  return bits;
}
