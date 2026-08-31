import type { BookDef } from "../types";
import { PLAYER_SLIDER_BASE, fmtAdd, fmtMul } from "./equipmentDefs";

function bookHint(opts: { luck: number; playerSliderBonus: number; extra?: string }): string {
  const bits: string[] = [];
  if (opts.luck) bits.push(fmtAdd("上钩欧气", opts.luck, "档"));
  if (opts.playerSliderBonus) {
    bits.push(fmtMul("玩家滑块", (PLAYER_SLIDER_BASE + opts.playerSliderBonus) / PLAYER_SLIDER_BASE));
  }
  if (opts.extra) bits.push(opts.extra);
  return bits.join(" · ");
}

/** 增益类书籍：仅持有即可获得对应增益（ADR-001）。欧气/滑块类不改难度公式；养鱼手册只解锁查看性别与配偶观。 */
export const BOOK_DEFS: BookDef[] = [
  {
    id: "book_luck",
    name: "欧气札",
    hint: bookHint({ luck: 1, playerSliderBonus: 0 }),
    currency: "gold",
    price: 200,
    luck: 1,
    playerSliderBonus: 0,
  },
  {
    id: "book_steady",
    name: "手稳手册",
    hint: bookHint({ luck: 0, playerSliderBonus: 0.03 }),
    currency: "pearl",
    price: 4,
    luck: 0,
    playerSliderBonus: 0.03,
  },
  {
    id: "book_keep",
    name: "养鱼手册",
    hint: bookHint({ luck: 0, playerSliderBonus: 0, extra: "可查看性别、爱情观" }),
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
