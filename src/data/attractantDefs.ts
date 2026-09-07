import type { AttractantDef } from "../types";

/** 求偶香：交配时消耗。自动配偶 buff / 整缸喷雾见 ADR-015 #进阶方案。 */
export const ATTRACTANT_DEFS: AttractantDef[] = [
  { id: "attr_common", name: "青荇香", quality: "common", currency: "gold", price: 8, scope: "fish", bonus: 0.15, durationDays: 2, blurb: "池边青草气。" },
  { id: "attr_fine", name: "桂花求偶香", quality: "fine", currency: "gold", price: 20, scope: "fish", bonus: 0.2, durationDays: 2, blurb: "甜香，引鱼靠近。" },
  { id: "attr_rare", name: "龙涎香", quality: "rare", currency: "gold", price: 60, scope: "fish", bonus: 0.28, durationDays: 3, blurb: "海上来的腥香。" },
  { id: "attr_precious", name: "沉香露", quality: "precious", currency: "gold", price: 150, scope: "fish", bonus: 0.32, durationDays: 3, blurb: "一滴入水，沉底还香。" },
  { id: "attr_ultimate", name: "鲛珠香", quality: "ultimate", currency: "gold", price: 400, scope: "fish", bonus: 0.35, durationDays: 4, blurb: "传说鲛人泪研的。柜上不常进。" },
];

export const ATTRACTANT_BY_ID: Record<string, AttractantDef> = Object.fromEntries(
  ATTRACTANT_DEFS.map((a) => [a.id, a]),
);

export const PAIR_CHANCE_CAP = 0.92;

export function attractRemainingDays(untilDay: number, gameDay: number): number {
  if (untilDay <= 0) return 0;
  return Math.max(0, untilDay - gameDay + 1);
}

export function bonusLabel(bonus: number): string {
  return `配对 +${Math.round(bonus * 100)}%`;
}

export function attractantShopHint(a: AttractantDef, stock: number): string {
  const stockBit = stock > 0 ? ` · 库存 ${stock}` : "";
  return `交配用 · ${a.blurb}${stockBit}`;
}
