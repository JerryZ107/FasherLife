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
  { id: "tank_common_gold", name: "陶泥缸", quality: "common", currency: "gold", price: 80, capacity: 6, blurb: "乡下窑里烧的。能养 6 条。" },
  { id: "tank_common_pearl", name: "流光陶泥缸", quality: "common", currency: "pearl", price: 1, capacity: 6, blurb: "釉面亮一档。能养 6 条。" },
  { id: "tank_fine_gold", name: "柏木缸", quality: "fine", currency: "gold", price: 200, capacity: 10, blurb: "木香压水腥。能养 10 条。" },
  { id: "tank_fine_pearl", name: "流光柏木缸", quality: "fine", currency: "pearl", price: 2, capacity: 10, blurb: "柏木打的，漆面带光。能养 10 条。" },
  { id: "tank_rare_gold", name: "琉璃缸", quality: "rare", currency: "gold", price: 800, capacity: 14, blurb: "通透，鱼游过去能数鳞。能养 14 条。" },
  { id: "tank_rare_pearl", name: "流光琉璃缸", quality: "rare", currency: "pearl", price: 8, capacity: 14, blurb: "琉璃里夹金线。能养 14 条。" },
  { id: "tank_precious_gold", name: "玉石缸", quality: "precious", currency: "gold", price: 2000, capacity: 18, blurb: "玉壁养水。能养 18 条。" },
  { id: "tank_precious_pearl", name: "流光玉石缸", quality: "precious", currency: "pearl", price: 20, capacity: 18, blurb: "玉里走光。能养 18 条。" },
  { id: "tank_ultimate_gold", name: "玄铁缸", quality: "ultimate", currency: "gold", price: 8000, capacity: 24, blurb: "压箱底那口。能养 24 条。" },
  { id: "tank_ultimate_pearl", name: "珠光玄铁缸", quality: "ultimate", currency: "pearl", price: 80, capacity: 24, blurb: "玄铁缸的珠光款。能养 24 条。" },
];

export const TANK_BY_ID: Record<string, TankDef> = Object.fromEntries(TANK_DEFS.map((t) => [t.id, t]));

export function capacityForQuality(quality: Quality): number {
  return TANK_CAPACITY[quality];
}

export function tankShopHint(tank: TankDef): string {
  return `容量 ${tank.capacity}条`;
}
