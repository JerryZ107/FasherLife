/** 鱼友通用表情包（渔聊 / 钓鱼点等共用）。 */

export type FishSticker = {
  id: string;
  label: string;
  glyph: string;
};

export const FISH_STICKERS: FishSticker[] = [
  { id: "heart", label: "冒爱心", glyph: "❤️" },
  { id: "rage", label: "暴躁", glyph: "💢" },
  { id: "ask", label: "?", glyph: "❓" },
  { id: "dots", label: "...", glyph: "..." },
  { id: "bang", label: "！", glyph: "❗" },
];

/** 其他玩家钓到鱼时随机冒泡的反应表情。 */
export const CATCH_REACTION_GLYPHS = ["❤️", "❓", "❗"] as const;

export function pickCatchReaction(): string {
  const i = Math.floor(Math.random() * CATCH_REACTION_GLYPHS.length);
  return CATCH_REACTION_GLYPHS[i]!;
}
