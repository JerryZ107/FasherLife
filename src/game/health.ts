import type { Personality } from "../types";
import { PERSONALITY_SPEED } from "../types";
import { ADULT_HEALTH_MAX } from "./growth";

/**
 * 健康不满时移速惩罚：按「相对满血百分比」算（成鱼 100、鱼苗 30 都算满血）。
 * 99%→降50%，98%→51%，97%→52%…
 */
export function healthSpeedPenalty(healthPct: number): number {
  if (healthPct >= 100) return 0;
  const pct = Math.max(0, Math.min(100, healthPct));
  return 0.49 + (100 - pct) * 0.01;
}

/** 当前健康相对上限的百分制（满血=100）。 */
export function healthPercent(health: number, healthMax = ADULT_HEALTH_MAX): number {
  const max = Math.max(1, healthMax);
  return (Math.max(0, health) / max) * ADULT_HEALTH_MAX;
}

/** 游泳速度倍率（含健康与暴躁性格）。healthMax 缺省按成鱼 100。 */
export function swimSpeedMultiplier(
  health: number,
  personality: Personality,
  healthMax = ADULT_HEALTH_MAX,
): number {
  let mul = 1 - healthSpeedPenalty(healthPercent(health, healthMax));
  if (personality === "hot") mul *= 0.8;
  return Math.max(0.05, mul);
}

/** 与 TankCanvas 一致的游速标量。 */
export function swimLenScalar(
  health: number,
  personality: Personality,
  raging: boolean,
  healthMax = ADULT_HEALTH_MAX,
): number {
  const scale = personality === "hot" ? 0.5 : 1 / 3;
  const base = 0.7 * PERSONALITY_SPEED[personality] * scale;
  return base * swimSpeedMultiplier(health, personality, healthMax) * (raging ? 2 : 1);
}
