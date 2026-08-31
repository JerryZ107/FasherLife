import { useEffect, useRef, type MutableRefObject } from "react";
import { Application, Container, Graphics, Text } from "pixi.js";
import { makeGuardView, paintGuard } from "./sneakGuard";
import { armLiftForMotion, lookOfOutfit, makePersonView, paintPerson, pixiPen } from "../art/paintPerson";
import type { Sex } from "../types";
import {
  BUSHES,
  GOAL,
  START,
  TREES,
  WORLD_H,
  WORLD_W,
  clampCamY,
  conePoints,
  guardSees,
  hiddenInBush,
  inBush,
  inGoal,
  makeGuards,
  resolvePos,
  stepGuard,
  visibleWorldH,
  type Guard,
} from "./sneakLogic";

const SQUASH = 0.62;
const PAD_X = 8;
const PAD_Y = 8;
const CAM_LERP = 0.12;
const CG_STAGE_MS = [650, 480, 420] as const;

export type SneakPhase = "cg" | "play" | "caught" | "win";

type Stick = { dx: number; dy: number; active: boolean };

type Layout = { scale: number; ox: number; oy: number; camX: number; camY: number };

function layoutOf(w: number, camY: number): Layout {
  const scale = (w - PAD_X * 2) / WORLD_W;
  return {
    scale,
    ox: (w - WORLD_W * scale) / 2,
    oy: PAD_Y,
    camX: 0,
    camY,
  };
}

function toScreen(lay: Layout, x: number, y: number) {
  return {
    x: lay.ox + (x - lay.camX) * lay.scale,
    y: lay.oy + (y - lay.camY) * lay.scale * SQUASH,
  };
}

function paintIntroBackdrop(g: Graphics, w: number, h: number) {
  g.clear();
  g.rect(0, 0, w, h);
  g.fill({ color: 0x0c1828 });
  for (let i = 0; i < 24; i++) {
    const sx = hash(i + 2) * w;
    const sy = hash(i + 9) * h * 0.22;
    g.circle(sx, sy, 1 + hash(i + 11) * 1.2);
    g.fill({ color: 0xfff6e8, alpha: 0.35 + hash(i + 3) * 0.45 });
  }
  const moonX = w * 0.82;
  const moonY = h * 0.1;
  g.circle(moonX, moonY, 28);
  g.fill({ color: 0xffe08a, alpha: 0.1 });
  g.circle(moonX, moonY, 16);
  g.fill({ color: 0xfff4c8, alpha: 0.95 });
  g.circle(moonX - 5, moonY - 2, 12);
  g.fill({ color: 0x0c1828, alpha: 0.55 });
  const groundY = h * 0.78;
  g.rect(0, groundY, w, h - groundY);
  g.fill({ color: 0x16384d });
  const wallX = w * 0.42;
  g.rect(wallX, h * 0.14, w * 0.055, h * 0.64);
  g.fill({ color: 0x6b4a32 });
  g.rect(wallX - w * 0.01, h * 0.13, w * 0.075, h * 0.014);
  g.fill({ color: 0x8a6238 });
  for (let i = 0; i < 4; i++) {
    const bx = wallX - w * 0.01 + i * (w * 0.018);
    g.moveTo(bx, h * 0.13);
    g.lineTo(bx + w * 0.009, h * 0.11);
    g.lineTo(bx + w * 0.018, h * 0.13);
    g.closePath();
    g.fill({ color: 0x8a6238 });
  }
}

function hash(n: number) {
  const t = Math.sin(n * 127.1) * 43758.5453;
  return t - Math.floor(t);
}

function paintSky(g: Graphics, w: number, h: number, t: number) {
  g.clear();
  g.rect(0, 0, w, h);
  g.fill({ color: 0x0c1828 });
  g.rect(0, 0, w, h * 0.28);
  g.fill({ color: 0x1a2c4a, alpha: 0.95 });
  const moonX = w * 0.82;
  const moonY = h * 0.08;
  g.circle(moonX, moonY, 18);
  g.fill({ color: 0xfff4c8, alpha: 0.95 });
  g.circle(moonX - 6, moonY - 2, 13);
  g.fill({ color: 0x1a2c4a, alpha: 0.55 });
  g.circle(moonX, moonY, 32);
  g.fill({ color: 0xffe08a, alpha: 0.08 });
  const horizon = h * 0.2;
  g.moveTo(0, horizon + 10);
  g.lineTo(w * 0.18, horizon);
  g.lineTo(w * 0.4, horizon + 8);
  g.lineTo(w * 0.62, horizon - 2);
  g.lineTo(w * 0.84, horizon + 6);
  g.lineTo(w, horizon);
  g.lineTo(w, horizon + 22);
  g.lineTo(0, horizon + 22);
  g.closePath();
  g.fill({ color: 0x15283c, alpha: 0.92 });
  for (let i = 0; i < 16; i++) {
    const sx = hash(i + 2) * w;
    const sy = hash(i + 9) * h * 0.18;
    const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.4 + i));
    g.circle(sx, sy, 1.1);
    g.fill({ color: 0xfff6e8, alpha: 0.25 + 0.55 * tw });
  }
}

function paintGround(g: Graphics, lay: Layout) {
  g.clear();
  const a = toScreen(lay, 0, 0);
  const b = toScreen(lay, WORLD_W, WORLD_H);
  g.rect(a.x, a.y, b.x - a.x, b.y - a.y);
  g.fill({ color: 0x1e4a2c });

  for (let i = 0; i < 90; i++) {
    const x = 4 + hash(i) * (WORLD_W - 8);
    const y = 10 + hash(i + 40) * (WORLD_H - 20);
    const p = toScreen(lay, x, y);
    const s = lay.scale;
    g.ellipse(p.x, p.y, (3 + hash(i + 3) * 6) * s * 0.2, (2 + hash(i + 5) * 3) * s * 0.1);
    g.fill({ color: hash(i + 7) > 0.5 ? 0x2f6a3c : 0x16532c, alpha: 0.5 });
  }

  const path = [
    [36, 136], [34, 122], [28, 112], [22, 98], [36, 90], [48, 78],
    [40, 66], [24, 54], [36, 46], [36, 22],
  ];
  const p0 = toScreen(lay, path[0][0], path[0][1]);
  g.moveTo(p0.x, p0.y);
  for (const [x, y] of path.slice(1)) {
    const p = toScreen(lay, x, y);
    g.lineTo(p.x, p.y);
  }
  g.stroke({ width: lay.scale * 6.8, color: 0x6b4a22, alpha: 0.85, cap: "round", join: "round" });
  g.moveTo(p0.x, p0.y);
  for (const [x, y] of path.slice(1)) {
    const p = toScreen(lay, x, y);
    g.lineTo(p.x, p.y);
  }
  g.stroke({ width: lay.scale * 3.6, color: 0x8a6230, alpha: 0.7, cap: "round", join: "round" });

  const wall0 = toScreen(lay, 0, WORLD_H - 10);
  const wall1 = toScreen(lay, WORLD_W, WORLD_H);
  g.rect(wall0.x, wall0.y, wall1.x - wall0.x, wall1.y - wall0.y + 8);
  g.fill({ color: 0x4a3728 });
  g.stroke({ color: 0x2a1a0c, width: 2 });
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 10; col++) {
      const wx = 2 + col * 7 + (row % 2) * 3;
      const wy = WORLD_H - 9 + row * 4;
      const p = toScreen(lay, wx, wy);
      g.roundRect(p.x, p.y, lay.scale * 5.6, lay.scale * SQUASH * 3.2, 2);
      g.fill({ color: row % 2 ? 0x6b4a32 : 0x5a3c28 });
    }
  }

  const dock0 = toScreen(lay, GOAL.xMin, 8);
  const dock1 = toScreen(lay, GOAL.xMax, GOAL.y + 4);
  g.rect(dock0.x, dock0.y, dock1.x - dock0.x, dock1.y - dock0.y);
  g.fill({ color: 0x6b4428, alpha: 0.96 });
  for (let i = 0; i < 6; i++) {
    const y = 9 + i * 2.2;
    const pA = toScreen(lay, GOAL.xMin, y);
    const pB = toScreen(lay, GOAL.xMax, y);
    g.moveTo(pA.x, pA.y);
    g.lineTo(pB.x, pB.y);
    g.stroke({ width: Math.max(3, lay.scale * 0.18), color: i % 2 ? 0xc4894a : 0x8a6238, alpha: 0.95 });
  }
  for (const x of [GOAL.xMin + 2, (GOAL.xMin + GOAL.xMax) / 2, GOAL.xMax - 2]) {
    const p = toScreen(lay, x, 8.6);
    g.roundRect(p.x - lay.scale * 0.55, p.y, lay.scale * 1.1, lay.scale * SQUASH * 3.4, 2);
    g.fill({ color: 0x4a311c });
    g.stroke({ color: 0x2a1a0c, width: 1.4 });
  }

  const lamps: [number, number][] = [[20, 120], [52, 96], [18, 68], [54, 52], [36, 34]];
  for (const [x, y] of lamps) {
    const p = toScreen(lay, x, y);
    g.ellipse(p.x, p.y, lay.scale * 5.8, lay.scale * SQUASH * 2.8);
    g.fill({ color: 0xffd166, alpha: 0.12 });
    g.ellipse(p.x, p.y, lay.scale * 2.1, lay.scale * SQUASH * 1);
    g.fill({ color: 0xffe08a, alpha: 0.28 });
  }
}

function paintWater(g: Graphics, lay: Layout, t: number) {
  g.clear();
  const left = toScreen(lay, 0, 0);
  const right = toScreen(lay, WORLD_W, 8);
  g.rect(left.x, left.y - 6, right.x - left.x, toScreen(lay, 0, 8).y - left.y + 8);
  g.fill({ color: 0x1a6a88, alpha: 0.82 });
  const side0 = toScreen(lay, 0, 8);
  const side1 = toScreen(lay, GOAL.xMin, GOAL.y + 2);
  g.rect(side0.x, side0.y, side1.x - side0.x, side1.y - side0.y);
  g.fill({ color: 0x185878, alpha: 0.5 });
  const side2 = toScreen(lay, GOAL.xMax, 8);
  const side3 = toScreen(lay, WORLD_W, GOAL.y + 2);
  g.rect(side2.x, side2.y, side3.x - side2.x, side3.y - side2.y);
  g.fill({ color: 0x185878, alpha: 0.5 });
  for (let i = 0; i < 7; i++) {
    const y = 1.4 + i * 2.2 + Math.sin(t * 1.6 + i) * 0.45;
    const p0 = toScreen(lay, 4, y);
    const p1 = toScreen(lay, WORLD_W - 4, y);
    g.moveTo(p0.x, p0.y);
    g.lineTo(p1.x, p1.y);
    g.stroke({ width: 2.2, color: 0xa8e8ff, alpha: 0.16 + 0.14 * Math.sin(t * 2 + i) });
  }
  const pads: [number, number, number][] = [
    [10, 3.2, 0.9],
    [22, 5.4, 1.15],
    [48, 2.6, 0.8],
    [60, 4.8, 1.05],
  ];
  for (const [x, y, s] of pads) {
    const p = toScreen(lay, x, y);
    g.ellipse(p.x, p.y, lay.scale * 2.4 * s, lay.scale * SQUASH * 1.1 * s);
    g.fill({ color: 0x3da85a, alpha: 0.72 });
    g.circle(p.x, p.y - 1, lay.scale * 0.55 * s);
    g.fill({ color: 0xff8aa0, alpha: 0.8 });
  }
}

function makeTree(tree: (typeof TREES)[number], lay: Layout): Container {
  const c = new Container();
  const g = new Graphics();
  const s = lay.scale * (0.7 + tree.y / WORLD_H * 0.42);
  g.ellipse(0, 4, tree.canopy * 0.42 * s, tree.canopy * 0.16 * s);
  g.fill({ color: 0x0a1810, alpha: 0.35 });
  g.roundRect(-s * 0.11, -s * 0.72, s * 0.22, s * 0.78, 3);
  g.fill({ color: 0x4a2c14 });
  g.roundRect(-s * 0.06, -s * 0.72, s * 0.08, s * 0.78, 2);
  g.fill({ color: 0x6b4422, alpha: 0.55 });
  const R = tree.canopy * 0.52 * s;
  g.ellipse(-R * 0.28, -s * 0.95, R * 0.72, R * 0.58);
  g.fill({ color: 0x14532c });
  g.ellipse(R * 0.3, -s * 0.92, R * 0.7, R * 0.55);
  g.fill({ color: 0x1c6b38 });
  g.ellipse(0, -s * 1.12, R * 0.78, R * 0.62);
  g.fill({ color: 0x248448 });
  g.ellipse(-R * 0.12, -s * 1.22, R * 0.4, R * 0.28);
  g.fill({ color: 0x5cb86a, alpha: 0.55 });
  c.addChild(g);
  c.zIndex = tree.y * 10 + 2;
  return c;
}

function makeBush(b: (typeof BUSHES)[number], lay: Layout): { c: Container; g: Graphics } {
  const c = new Container();
  const g = new Graphics();
  paintBush(g, lay, false, 0);
  c.addChild(g);
  c.zIndex = b.y * 10;
  return { c, g };
}

function paintBush(g: Graphics, lay: Layout, rustle: boolean, t: number) {
  g.clear();
  const s = lay.scale;
  const wob = rustle ? Math.sin(t * 9) * s * 0.04 : 0;
  g.ellipse(0, 4, s * 1.05, s * 0.34);
  g.fill({ color: 0x08140c, alpha: rustle ? 0.45 : 0.28 });
  g.ellipse(-s * 0.5 + wob, -s * 0.14, s * 0.64, s * 0.38);
  g.fill({ color: rustle ? 0x1c6b38 : 0x14532c });
  g.ellipse(s * 0.46 - wob, -s * 0.1, s * 0.62, s * 0.36);
  g.fill({ color: rustle ? 0x248448 : 0x176338 });
  g.ellipse(wob, -s * 0.34, s * 0.66, s * 0.44);
  g.fill({ color: rustle ? 0x3da85a : 0x1e7a40 });
  g.ellipse(-s * 0.16, -s * 0.48, s * 0.26, s * 0.14);
  g.fill({ color: 0x7ed68a, alpha: rustle ? 0.7 : 0.35 });
}

function paintCone(g: Graphics, lay: Layout, guard: Guard) {
  const pts = conePoints(guard);
  const screen: number[] = [];
  for (const p of pts) {
    const s = toScreen(lay, p.x, p.y);
    screen.push(s.x, s.y);
  }
  g.poly(screen);
  g.fill({ color: 0xffd166, alpha: 0.17 });
  g.stroke({ color: 0xffc14a, width: 1.2, alpha: 0.38 });
}

type Props = {
  phase: SneakPhase;
  stickRef: MutableRefObject<Stick>;
  outfitId: string;
  lookSex: Sex;
  onLanded: () => void;
  onCaught: () => void;
  onWin: () => void;
  onHiddenChange: (hidden: boolean) => void;
};

export default function SneakCanvas({
  phase,
  stickRef,
  outfitId,
  lookSex,
  onLanded,
  onCaught,
  onWin,
  onHiddenChange,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const landedRef = useRef(false);
  const endedRef = useRef(false);
  const hiddenRef = useRef(false);
  const cb = useRef({ onLanded, onCaught, onWin, onHiddenChange });
  cb.current = { onLanded, onCaught, onWin, onHiddenChange };

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const app = new Application();
    let destroyed = false;
    let camY = START.y - 50;
    let cgStage = 0;
    let cgStageT = 0;
    let cgDone = false;
    let playReady = false;

    app.init({ background: 0x0c1828, resizeTo: el, antialias: true }).then(async () => {
      if (destroyed || !el) {
        app.destroy(true);
        return;
      }
      el.appendChild(app.canvas);

      const sky = new Graphics();
      const ground = new Graphics();
      const water = new Graphics();
      const cones = new Graphics();
      const fx = new Graphics();
      const worldLayer = new Container();
      const introLayer = new Container();
      const entities = new Container();
      entities.sortableChildren = true;
      worldLayer.addChild(sky, ground, water, cones, entities, fx);
      app.stage.addChild(worldLayer, introLayer);

      const introBg = new Graphics();
      const introPerson = makePersonView();
      const introBubble = new Text({
        text: "「就这里……翻过去就到钓鱼区了！」",
        style: {
          fill: 0xeafcff,
          fontSize: 16,
          fontWeight: "700",
          stroke: { color: 0x061e36, width: 4 },
          wordWrap: true,
          wordWrapWidth: 220,
          align: "center",
        },
      });
      introBubble.anchor.set(0.5);
      introLayer.addChild(introBg, introPerson.root, introBubble);

      let lay = layoutOf(app.screen.width, camY);
      const visH = () => visibleWorldH(app.screen.height, lay.scale, SQUASH, PAD_Y);
      camY = clampCamY(START.y - visH() * 0.62, visH());
      lay = layoutOf(app.screen.width, camY);

      const player = { x: START.x, y: START.y };
      const guards = makeGuards();

      const trees = TREES.map((tree) => {
        const c = makeTree(tree, lay);
        entities.addChild(c);
        return c;
      });
      const bushViews = BUSHES.map((b) => {
        const view = makeBush(b, lay);
        entities.addChild(view.c);
        return view;
      });

      const you = makePersonView();
      const youTag = new Text({
        text: "你",
        style: { fill: 0xfff6e8, fontSize: 11, fontWeight: "700", stroke: { color: 0x2a1a0c, width: 3 } },
      });
      youTag.anchor.set(0.5, 1);
      youTag.y = -50;
      you.root.addChild(youTag);
      entities.addChild(you.root);
      let faceLeft = false;

      const guardViews = guards.map((g) => {
        const view = makeGuardView();
        const tag = new Text({
          text: g.kind === "sentry" ? "岗哨" : "保安",
          style: { fill: 0xffe08a, fontSize: 10, fontWeight: "700", stroke: { color: 0x12141c, width: 3 } },
        });
        tag.anchor.set(0.5, 1);
        tag.y = -48;
        view.root.addChild(tag);
        entities.addChild(view.root);
        return view;
      });

      const goalTag = new Text({
        text: "钓鱼区",
        style: { fill: 0xfff6e8, fontSize: 14, fontWeight: "700", stroke: { color: 0x163246, width: 4 } },
      });
      goalTag.anchor.set(0.5, 0.5);
      entities.addChild(goalTag);

      function beginPlay() {
        if (playReady) return;
        playReady = true;
        player.x = START.x;
        player.y = START.y;
        camY = clampCamY(START.y - visH() * 0.62, visH());
        lay = layoutOf(app.screen.width, camY);
        introLayer.visible = false;
        worldLayer.visible = true;
        if (!landedRef.current) {
          landedRef.current = true;
          cb.current.onLanded();
        }
      }

      function followCam(py: number) {
        const vh = visH();
        const targetY = clampCamY(py - vh * 0.62, vh);
        camY += (targetY - camY) * CAM_LERP;
        camY = clampCamY(camY, vh);
        lay = layoutOf(app.screen.width, camY);
      }

      function introPose(stage: number, k: number, w: number, h: number) {
        const p0 = { x: w * 0.28, y: h * 0.78 };
        const p1 = { x: w * 0.28, y: h * 0.52 };
        const p2 = { x: w * 0.57, y: h * 0.46 };
        const p3 = { x: w * 0.62, y: h * 0.78 };
        if (stage <= 0) {
          return { x: p0.x + (p1.x - p0.x) * k, y: p0.y + (p1.y - p0.y) * k };
        }
        if (stage === 1) {
          return { x: p1.x + (p2.x - p1.x) * k, y: p1.y + (p2.y - p1.y) * k };
        }
        return { x: p2.x + (p3.x - p2.x) * k, y: p2.y + (p3.y - p2.y) * k };
      }

      function paintIntro(now: number) {
        const w = app.screen.width;
        const h = app.screen.height;
        paintIntroBackdrop(introBg, w, h);
        const pos = introPose(cgStage, cgStageT, w, h);
        const climbing = cgStage === 1;
        introPerson.body.clear();
        paintPerson(pixiPen(introPerson.body), {
          sex: lookSex,
          look: lookOfOutfit(outfitId),
          pose: "stand",
          view: "front",
          facingLeft: cgStage >= 1,
          t: now,
          armLift: climbing ? 0.55 : cgStage === 0 ? 0.15 : 0,
          walking: climbing,
        });
        introPerson.root.position.set(pos.x, pos.y);
        introPerson.root.scale.set(1.42);
        introBubble.position.set(w * 0.62, h * 0.34);
      }

      function tickCg(dt: number) {
        if (cgDone) return;
        const ph = phaseRef.current;
        if (ph !== "cg" && ph !== "play") return;
        if (ph === "play") {
          beginPlay();
          cgDone = true;
          return;
        }
        cgStageT += dt;
        const dur = (CG_STAGE_MS[cgStage] ?? 420) / 1000;
        if (cgStageT >= dur) {
          cgStage += 1;
          cgStageT = 0;
          if (cgStage === 1) introBubble.text = "「翻！」";
          else if (cgStage === 2) introBubble.text = "「安全落地！」";
          else if (cgStage >= 3) {
            cgDone = true;
            beginPlay();
          }
        }
      }

      function placeStatic() {
        const p = toScreen(lay, (GOAL.xMin + GOAL.xMax) / 2, 12);
        goalTag.position.set(p.x, p.y);
        TREES.forEach((tree, i) => {
          const pos = toScreen(lay, tree.x, tree.y);
          trees[i]?.position.set(pos.x, pos.y);
        });
        bushViews.forEach(({ c }, i) => {
          const b = BUSHES[i];
          if (!b) return;
          const pos = toScreen(lay, b.x, b.y);
          c.position.set(pos.x, pos.y);
        });
      }

      function relayout() {
        lay = layoutOf(app.screen.width, camY);
        camY = clampCamY(camY, visH());
        lay = layoutOf(app.screen.width, camY);
        paintSky(sky, app.screen.width, app.screen.height, 0);
        paintGround(ground, lay);
        paintWater(water, lay, 0);
        placeStatic();
        paintIntro(0);
      }
      worldLayer.visible = false;
      introLayer.visible = true;
      relayout();
      app.renderer.on("resize", relayout);

      const tick = () => {
        if (destroyed) return;
        const dt = Math.min(0.05, app.ticker.deltaMS / 1000);
        const now = performance.now() / 1000;
        const ph = phaseRef.current;

        tickCg(dt);
        if (ph === "play" && !playReady) beginPlay();

        if (ph === "play" && !endedRef.current) {
          const st = stickRef.current;
          const next = resolvePos(player.x + st.dx * 34 * dt, player.y + st.dy * 34 * dt);
          player.x = next.x;
          player.y = next.y;
          const hid = hiddenInBush(player.x, player.y);
          if (hid !== hiddenRef.current) {
            hiddenRef.current = hid;
            cb.current.onHiddenChange(hid);
          }
          for (const g of guards) {
            stepGuard(g, dt);
            if (guardSees(g, player.x, player.y, hid)) {
              endedRef.current = true;
              cb.current.onCaught();
              break;
            }
          }
          if (!endedRef.current && inGoal(player.x, player.y)) {
            endedRef.current = true;
            cb.current.onWin();
          }
        }

        if (playReady) {
          followCam(player.y);
          paintSky(sky, app.screen.width, app.screen.height, now);
          paintGround(ground, lay);
          paintWater(water, lay, now);
          placeStatic();
        } else {
          paintIntro(now);
        }

        cones.clear();
        if (playReady && (ph === "play" || ph === "cg")) {
          for (const g of guards) paintCone(cones, lay, g);
        }

        fx.clear();
        if (playReady) {
          for (let i = 0; i < 10; i++) {
            const x = 8 + hash(i + 1) * (WORLD_W - 16);
            const y = 16 + hash(i + 4) * (WORLD_H - 28);
            const p = toScreen(lay, x, y);
            const bob = Math.sin(now * 1.7 + i) * 6;
            fx.circle(p.x + Math.sin(now + i) * 8, p.y + bob, 1.6);
            fx.fill({ color: 0xd8ff9a, alpha: 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(now * 3 + i)) });
          }
        }

        const persp = (wy: number) => 0.72 + (wy / WORLD_H) * 0.4;
        const moving = Math.hypot(stickRef.current.dx, stickRef.current.dy) > 0.08 && ph === "play";
        if (playReady) {
          const pScreen = toScreen(lay, player.x, player.y);
          const dx = stickRef.current.dx;
          if (dx < -0.15) faceLeft = true;
          else if (dx > 0.15) faceLeft = false;
          you.body.clear();
          paintPerson(pixiPen(you.body), {
            sex: lookSex,
            look: lookOfOutfit(outfitId),
            pose: "stand",
            view: "front",
            facingLeft: faceLeft,
            t: now,
            armLift: armLiftForMotion(moving ? "walk" : "idle", 0, now),
            walking: moving,
          });
          you.root.position.set(pScreen.x, pScreen.y + (moving ? Math.sin(now * 14) * 1.6 : 0));
          you.root.scale.set(persp(player.y) * 1.5);
          you.root.alpha = hiddenRef.current ? 0.58 : 1;
          you.root.zIndex = player.y * 10 + 3;

          guards.forEach((g, i) => {
            const view = guardViews[i];
            if (!view) return;
            const p = toScreen(lay, g.x, g.y);
            const left = Math.cos(g.facing) < 0;
            paintGuard(view.body, left, now);
            view.root.position.set(p.x, p.y);
            view.root.scale.set(persp(g.y));
            view.root.zIndex = g.y * 10 + 3;
          });

          TREES.forEach((tree, i) => {
            const node = trees[i];
            if (!node) return;
            node.zIndex = tree.y * 10 + 2;
          });

          bushViews.forEach(({ c, g }, i) => {
            const bush = BUSHES[i];
            if (!bush) return;
            const rustle = inBush(player.x, player.y, bush);
            paintBush(g, lay, rustle, now);
            c.zIndex = bush.y * 10;
            c.scale.set(persp(bush.y) * (rustle ? 1.04 : 1));
          });
        }
      };

      app.ticker.add(tick);
    });

    return () => {
      destroyed = true;
      app.destroy(true);
    };
  }, [outfitId, lookSex, stickRef]);

  return <div className="sneak-canvas" ref={hostRef} />;
}
