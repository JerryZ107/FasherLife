import type { BookDef } from "../types";

/** 增益类书籍：仅持有即可获得对应增益（ADR-001）。欧气/滑块类不改难度公式；养鱼手册只解锁查看性别与配偶观。 */
export const BOOK_DEFS: BookDef[] = [
  {
    id: "book_luck",
    name: "欧气札",
    hint: "持有 +1 层欧气（只改上钩概率）",
    currency: "gold",
    price: 200,
    luck: 1,
    playerSliderBonus: 0,
  },
  {
    id: "book_steady",
    name: "手稳手册",
    hint: "持有则玩家滑块略增大",
    currency: "pearl",
    price: 4,
    luck: 0,
    playerSliderBonus: 0.03,
  },
  {
    id: "book_keep",
    name: "养鱼手册",
    hint: "持有后可看鱼的性别和配偶观",
    currency: "gold",
    price: 80,
    luck: 0,
    playerSliderBonus: 0,
  },
];

export const FISH_MANUAL_ID = "book_keep";

export function ownsFishManual(owned: string[] | undefined): boolean {
  return (owned ?? []).includes(FISH_MANUAL_ID);
}

export const BOOK_BY_ID: Record<string, BookDef> = Object.fromEntries(
  BOOK_DEFS.map((b) => [b.id, b]),
);

export function bookLuck(owned: string[]): number {
  return owned.reduce((s, id) => s + (BOOK_BY_ID[id]?.luck ?? 0), 0);
}

export function bookSliderBonus(owned: string[]): number {
  return owned.reduce((s, id) => s + (BOOK_BY_ID[id]?.playerSliderBonus ?? 0), 0);
}
