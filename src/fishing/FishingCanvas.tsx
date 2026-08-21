import { useEffect, useRef } from "react";
import { Application, Graphics, Container } from "pixi.js";
import type { FishDef, Personality } from "../types";

export interface GearMods {
  sensitivity: number;
  progressRate: number;
  fishSliderBonus: number;
  playerSliderSize: number;
}

interface Props {
  fishDef: FishDef;
  mods: GearMods;
  holding: boolean;
  overlay?: boolean;
  personality?: Personality;
  onWin: () => void;
  onLose: () => void;
  onProgress: (p: number) => void;
}

function clamp01(v: number, lo = 0.05, hi = 0.95): number {
  return Math.max(lo, Math.min(hi, v));
}

const HOT_LO = 0.12;
const HOT_HI = 0.88;
const HOT_HOLD = 1.8;
const ALOOF_DIST = 0.22;
const ALOOF_DASH = 0.34;
const TRAIL_N = 10;

function easeOutCubic(u: number): number {
  const x = Math.max(0, Math.min(1, u));
  return 1 - (1 - x) ** 3;
}

/** 中间水面+钓者，右边竖槽两条滑块（ADR-001 / ADR-012 / ADR-018）。 */
export default function FishingCanvas({
  fishDef,
  mods,
  holding,
  overlay,
  personality = "docile",
  onWin,
  onLose,
  onProgress,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const holdingRef = useRef(holding);
  const doneRef = useRef(false);
  const onWinRef = useRef(onWin);
  const onLoseRef = useRef(onLose);
  const onProgressRef = useRef(onProgress);

  holdingRef.current = holding;
  onWinRef.current = onWin;
  onLoseRef.current = onLose;
  onProgressRef.current = onProgress;

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const app = new Application();
    let destroyed = false;
    let raf = 0;
    doneRef.current = false;

    const state = {
      fishY: 0.5,
      playerY: 0.5,
      fishVel: 0,
      progress: 30,
      t: 0,
      hotDir: -1,
      hotHold: 0,
      hotEnd: HOT_LO,
      timidFlip: 0.4,
      timidFrom: 0.5,
      timidTo: 0.5,
      timidDash: 0,
      timidDur: 0.35,
      aloofCd: 0,
      aloofDash: 0,
      aloofFrom: 0.5,
      aloofTo: 0.5,
      trail: [] as number[],
    };

    app.init({ backgroundAlpha: 0, resizeTo: el, antialias: true }).then(() => {
      if (destroyed || !el) {
        app.destroy(true);
        return;
      }
      el.appendChild(app.canvas);
      const stage = app.stage as Container;
      const water = new Graphics();
      const angler = new Graphics();
      const track = new Graphics();
      stage.addChild(water, angler, track);

      let last = performance.now();
      const mo = fishDef.motion;
      const fishSize = mo.sliderSize + mods.fishSliderBonus;
      const playerSize = mods.playerSliderSize;
      const freq = personality === "docile" ? mo.frequency * 0.55 : mo.frequency;
      const noiseW = personality === "docile" ? 0 : mo.noiseWeight;
      const damp = personality === "docile" ? 0.8 : 0.92;

      const loop = (now: number) => {
        if (destroyed || doneRef.current) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        state.t += dt;
        state.aloofCd = Math.max(0, state.aloofCd - dt);

        if (personality === "hot") {
          const oneWay = 0.4 / Math.max(0.2, mo.speed);
          const v = (HOT_HI - HOT_LO) / oneWay;
          if (state.hotHold > 0) {
            state.hotHold -= dt;
            state.fishY = state.hotEnd;
            state.fishVel = 0;
          } else {
            state.fishY += state.hotDir * v * dt;
            if (state.hotDir < 0 && state.fishY <= HOT_LO) {
              state.fishY = HOT_LO;
              state.hotEnd = HOT_LO;
              state.hotHold = HOT_HOLD;
              state.hotDir = 1;
            } else if (state.hotDir > 0 && state.fishY >= HOT_HI) {
              state.fishY = HOT_HI;
              state.hotEnd = HOT_HI;
              state.hotHold = HOT_HOLD;
              state.hotDir = -1;
            }
          }
          state.fishY = clamp01(state.fishY);
        } else if (personality === "timid") {
          if (state.timidDash > 0) {
            state.timidDash = Math.max(0, state.timidDash - dt);
            const u = state.timidDur <= 0 ? 1 : 1 - state.timidDash / state.timidDur;
            state.fishY = clamp01(state.timidFrom + (state.timidTo - state.timidFrom) * easeOutCubic(u));
            state.fishVel = 0;
          } else {
            state.timidFlip -= dt;
            if (state.timidFlip <= 0) {
              state.timidFrom = state.fishY;
              state.timidTo = clamp01(state.fishY + (Math.random() * 2 - 1) * 0.4);
              const run = Math.abs(state.timidTo - state.timidFrom);
              state.timidDur = Math.max(0.28, Math.min(0.48, 0.22 + run * 0.45));
              state.timidDash = state.timidDur;
              state.timidFlip = 0.35 + Math.random() * 0.35;
            } else {
              const sine = Math.sin(state.t * freq * Math.PI * 2) * mo.amplitude * 0.25;
              const target = clamp01(state.fishY + sine * dt * 2);
              state.fishVel += (target - state.fishY) * mo.speed * 2 * dt;
              state.fishVel *= 0.88;
              state.fishY = clamp01(state.fishY + state.fishVel * dt * 3);
            }
          }
        } else if (personality === "aloof") {
          if (state.aloofDash > 0) {
            state.aloofDash = Math.max(0, state.aloofDash - dt);
            const u = 1 - state.aloofDash / ALOOF_DASH;
            state.fishY = clamp01(state.aloofFrom + (state.aloofTo - state.aloofFrom) * easeOutCubic(u));
            state.fishVel = 0;
          } else {
            const sine = Math.sin(state.t * freq * Math.PI * 2) * mo.amplitude;
            const noise = (Math.random() - 0.5) * noiseW * 0.3;
            const target = 0.5 + sine + noise;
            state.fishVel += (target - state.fishY) * mo.speed * 4 * dt;
            state.fishVel *= damp;
            state.fishY = clamp01(state.fishY + state.fishVel * dt * 3);
            const near = Math.abs(state.fishY - state.playerY) < Math.min(fishSize, playerSize) * 0.25;
            if (near && state.aloofCd <= 0) {
              const away = state.fishY >= state.playerY ? 1 : -1;
              state.aloofFrom = state.fishY;
              state.aloofTo = clamp01(state.fishY + away * ALOOF_DIST);
              if (Math.abs(state.aloofTo - state.aloofFrom) < 0.08) {
                state.aloofTo = clamp01(state.fishY - away * ALOOF_DIST);
              }
              state.aloofDash = ALOOF_DASH;
              state.aloofCd = 0.8;
            }
          }
        } else {
          const sine = Math.sin(state.t * freq * Math.PI * 2) * mo.amplitude;
          const noise = (Math.random() - 0.5) * noiseW * 0.3;
          const target = 0.5 + sine + noise;
          state.fishVel += (target - state.fishY) * mo.speed * 4 * dt;
          state.fishVel *= damp;
          state.fishY = clamp01(state.fishY + state.fishVel * dt * 3);
        }

        const lift = holdingRef.current ? 0.9 : -0.7;
        state.playerY = clamp01(state.playerY + lift * mods.sensitivity * dt, 0.02, 0.98);

        state.trail.push(state.fishY);
        if (state.trail.length > TRAIL_N) state.trail.shift();

        const overlap = Math.abs(state.fishY - state.playerY) < (fishSize + playerSize) / 2;
        if (overlap) state.progress += 30 * mods.progressRate * dt;
        else state.progress -= 22 * mods.progressRate * dt;
        state.progress = Math.max(0, Math.min(100, state.progress));
        onProgressRef.current(state.progress);

        const w = app.screen.width;
        const h = app.screen.height;
        const sceneW = overlay ? 0 : w * 0.7;

        water.clear();
        angler.clear();
        if (!overlay) {
          water.rect(0, 0, sceneW, h);
          water.fill({ color: 0x0a3048, alpha: 0.28 });
          for (let i = 0; i < 6; i++) {
            const y = 40 + ((state.t * 28 + i * 36) % (h + 24));
            water.moveTo(0, y);
            water.lineTo(sceneW * 0.5, y + 10);
            water.lineTo(sceneW, y);
            water.stroke({ color: 0x9be7ff, width: 2, alpha: 0.35 });
          }

          const ax = sceneW * 0.52;
          const ay = h * 0.58;
          const tilt = holdingRef.current ? -0.55 : -0.2;
          angler.moveTo(ax + 18, ay - 8);
          angler.lineTo(ax + 78 * Math.cos(tilt), ay - 8 + 96 * Math.sin(tilt));
          angler.stroke({ color: 0xc9a227, width: 3 });
        }

        const pad = overlay ? 6 : 16;
        const barX = overlay ? 4 : sceneW + 18;
        const barW = overlay ? Math.max(20, w - 8) : Math.max(22, w - sceneW - 36);
        const barH = h - pad * 2;
        track.clear();
        track.roundRect(barX - 3, pad - 3, barW + 6, barH + 6, 10);
        track.fill({ color: 0x5a3a20, alpha: 0.95 });
        track.roundRect(barX - 3, pad - 3, barW + 6, barH + 6, 10);
        track.stroke({ color: 0xc4894a, width: 2 });
        track.roundRect(barX, pad, barW, barH, 8);
        track.fill({ color: 0x0c2430, alpha: 0.94 });
        for (let i = 1; i < 5; i++) {
          const ty = pad + (barH * i) / 5;
          track.moveTo(barX + 3, ty);
          track.lineTo(barX + barW - 3, ty);
          track.stroke({ color: 0x3a6a48, width: 1, alpha: 0.35 });
        }
        const fishH = fishSize * barH;
        for (let i = 0; i < state.trail.length; i++) {
          const a = ((i + 1) / state.trail.length) * 0.32;
          const ty = pad + state.trail[i] * barH;
          track.roundRect(barX + 4, ty - fishH / 2, barW - 8, fishH, 5);
          track.fill({ color: 0xef476f, alpha: a });
        }
        const fy = pad + state.fishY * barH;
        track.roundRect(barX + 2, fy - fishH / 2, barW - 4, fishH, 6);
        track.fill({ color: 0xef476f, alpha: 0.96 });
        track.roundRect(barX + 4, fy - fishH / 2 + 2, barW - 10, Math.max(4, fishH * 0.35), 4);
        track.fill({ color: 0xffc4d0, alpha: 0.45 });
        const py = pad + state.playerY * barH;
        track.roundRect(barX + 4, py - (playerSize * barH) / 2, barW - 8, playerSize * barH, 6);
        track.fill({ color: 0x5ad8a0, alpha: 0.88 });
        track.roundRect(barX + 6, py - (playerSize * barH) / 2 + 2, barW - 14, Math.max(4, playerSize * barH * 0.32), 4);
        track.fill({ color: 0xe8ffe8, alpha: 0.4 });

        if (state.progress >= 100) {
          doneRef.current = true;
          onWinRef.current();
          return;
        }
        if (state.progress <= 0) {
          doneRef.current = true;
          onLoseRef.current();
          return;
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }).catch((err) => console.error("FishingCanvas init failed", err));

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      app.destroy(true);
    };
  }, [fishDef, mods, overlay, personality]);

  return <div ref={hostRef} className="fishing-canvas" />;
}
