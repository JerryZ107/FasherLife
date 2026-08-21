import type { OutfitDef } from "../types";

/** 服装无属性，仅外观（ADR-001）。每套分男女两版。 */
export const OUTFIT_DEFS: OutfitDef[] = [
  { id: "outfit_default", name: "日常钓服", quality: "common", currency: "gold", price: 0, look: "casual", hue: 0 },
  { id: "outfit_rain", name: "蓑衣套装", quality: "fine", currency: "gold", price: 80, look: "rain", hue: 72 },
  { id: "outfit_shell", name: "冲锋衣套装", quality: "fine", currency: "gold", price: 100, look: "shell", hue: 24 },
  { id: "outfit_tide", name: "海潮套", quality: "fine", currency: "pearl", price: 3, look: "tide", hue: 196 },
  {
    id: "outfit_festival",
    name: "节庆套",
    quality: "rare",
    currency: "pearl",
    price: 4,
    look: "festival",
    hue: 318,
    hiddenFromShop: true,
  },
];

export const OUTFIT_BY_ID: Record<string, OutfitDef> = Object.fromEntries(
  OUTFIT_DEFS.map((o) => [o.id, o]),
);
