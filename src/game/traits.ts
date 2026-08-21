import { LOVE_VIEWS, PERSONALITIES, type LoveView, type Personality } from "../types";

export function rollPersonality(): Personality {
  return PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)] ?? "docile";
}

export function rollLoveView(): LoveView {
  return LOVE_VIEWS[Math.floor(Math.random() * LOVE_VIEWS.length)] ?? "any";
}

export function rollTraits(): { personality: Personality; loveView: LoveView } {
  return { personality: rollPersonality(), loveView: rollLoveView() };
}

export function parsePersonality(v: unknown): Personality | null {
  return typeof v === "string" && (PERSONALITIES as string[]).includes(v) ? (v as Personality) : null;
}

export function parseLoveView(v: unknown): LoveView | null {
  return typeof v === "string" && (LOVE_VIEWS as string[]).includes(v) ? (v as LoveView) : null;
}
