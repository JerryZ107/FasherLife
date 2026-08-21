import type { Quality, TankDef } from "../types";

/** 鱼缸品质 → 该缸可养鱼条数（ADR-015）。 */
export const TANK_CAPACITY: Record<Quality, number> = {
  common: 6,
  fine: 10,
  rare: 14,
  precious: 18,
  ultimate: 24,
};

export const TANK_DEFS: TankDef[] = [
  { id: "tank_common_gold", name: "陶泥缸", quality: "common", currency: "gold", price: 80, capacity: 6 },
  { id: "tank_common_pearl", name: "流光陶泥缸", quality: "common", currency: "pearl", price: 1, capacity: 6 },
  { id: "tank_fine_gold", name: "柏木缸", quality: "fine", currency: "gold", price: 200, capacity: 10 },
  { id: "tank_fine_pearl", name: "流光柏木缸", quality: "fine", currency: "pearl", price: 2, capacity: 10 },
  { id: "tank_rare_gold", name: "琉璃缸", quality: "rare", currency: "gold", price: 800, capacity: 14 },
  { id: "tank_rare_pearl", name: "流光琉璃缸", quality: "rare", currency: "pearl", price: 8, capacity: 14 },
  { id: "tank_precious_gold", name: "玉石缸", quality: "precious", currency: "gold", price: 2000, capacity: 18 },
  { id: "tank_precious_pearl", name: "流光玉石缸", quality: "precious", currency: "pearl", price: 20, capacity: 18 },
  { id: "tank_ultimate_gold", name: "玄铁缸", quality: "ultimate", currency: "gold", price: 8000, capacity: 24 },
  { id: "tank_ultimate_pearl", name: "珠光玄铁缸", quality: "ultimate", currency: "pearl", price: 80, capacity: 24 },
];

export const TANK_BY_ID: Record<string, TankDef> = Object.fromEntries(TANK_DEFS.map((t) => [t.id, t]));

export function capacityForQuality(quality: Quality): number {
  return TANK_CAPACITY[quality];
}
