import type { AttractantDef } from "../types";

/**
 * 求偶香。金币喂一条鱼，珍珠喷整缸（ADR-015）。
 * 成功率加成有上限，不能让品质差四档必成。
 */
export const ATTRACTANT_DEFS: AttractantDef[] = [
  { id: "attr_common", name: "青荇香", quality: "common", currency: "gold", price: 8, scope: "fish", bonus: 0.15, durationDays: 2 },
  { id: "attr_fine", name: "桂花求偶香", quality: "fine", currency: "gold", price: 20, scope: "fish", bonus: 0.2, durationDays: 2 },
  { id: "attr_rare", name: "龙涎香", quality: "rare", currency: "gold", price: 60, scope: "fish", bonus: 0.28, durationDays: 3 },
  { id: "attr_precious", name: "沉香露", quality: "precious", currency: "gold", price: 150, scope: "fish", bonus: 0.32, durationDays: 3 },
  { id: "attr_ultimate", name: "鲛珠香", quality: "ultimate", currency: "gold", price: 400, scope: "fish", bonus: 0.35, durationDays: 4 },
  { id: "attr_mist_common", name: "流光青荇雾", quality: "common", currency: "pearl", price: 1, scope: "tank", bonus: 0.25, durationDays: 3 },
  { id: "attr_mist_fine", name: "流光桂花雾", quality: "fine", currency: "pearl", price: 2, scope: "tank", bonus: 0.25, durationDays: 3 },
  { id: "attr_mist_rare", name: "流光龙涎雾", quality: "rare", currency: "pearl", price: 4, scope: "tank", bonus: 0.25, durationDays: 3 },
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
  return `成功率 +${Math.round(bonus * 100)}%`;
}
