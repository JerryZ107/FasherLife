import { useEffect, useRef, useState } from "react";
import { Application, Graphics, Container, Sprite, Circle, Rectangle, Text } from "pixi.js";
import { useGame } from "../store/gameStore";
import { useUi } from "../store/uiStore";
import { ART, loadKeyedTexture, loadTankFrameOverlay, loadTexture } from "../art/assets";
import { FISH_BY_ID } from "../data/fishDefs";
import { PERSONALITY_SPEED, type Personality } from "../types";
import type { TankEgg, TankFish } from "../save/saveSchema";
import { rollDocileReact } from "../game/affection";

/** 木框占整图比例，量自 bg_tank.png（框和水是一张图）。 */
const FRAME = { left: 0.088, right: 0.088, top: 0.066, bottom: 0.092 };
/** 游动区比框内沿再收一点，鱼身不会探到木头上。 */
const SWIM = { left: 0.12, right: 0.12, top: 0.11, bottom: 0.14 };
const FISH_SIZE = 88;
/** ADR-018：游速 100 的原模长。 */
const SWIM_LEN = 0.7;
const SWIM_SCALE_HOT = 0.5;
const SWIM_SCALE_REST = 1 / 3;
const FLEE_DIST_MIN = 80;
const FLEE_DIST_MAX = 140;
const RAGE_SECS = 3;
/** 温顺点选爱心气泡时长。 */
const HEART_BUBBLE_SECS = 2.4;
/** 高冷第一次「？」，7 秒内再点才变成「...」。 */
const ALOOF_WINDOW_SECS = 7;
/** 胆小冲到位后轻抖时长（再延长一倍）。 */
const TIMID_SHAKE_SECS = 8;
const TIMID_SHAKE_AMP = 1.05;
const TIMID_SHAKE_FREQ_X = 13;
const TIMID_SHAKE_FREQ_Y = 10.5;
const FEED_FLICK_SECS = 0.38;
const FEED_EAT_FLICK_SECS = 0.26;
const FEED_EAT_BUBBLE_SECS = 1.35;
const FEED_REFUSE_BUBBLE_SECS = 1.35;
const REFUSE_DIST_MIN = 100;
const REFUSE_DIST_MAX = 160;

interface TrailPt {
  x: number;
  y: number;
  life: number;
}

interface TankSprite {
  uid: string;
  sprite: Sprite;
  ring: Graphics;
  flame: Graphics;
  heart: Text;
  trail: Graphics;
  vx: number;
  vy: number;
  dead: boolean;
  personality: Personality;
  health: number;
  reactLeft: number;
  shakeLeft: number;
  shakeOx: number;
  shakeOy: number;
  flameT: number;
  fleeLeft: number;
  fleeDur: number;
  fleeFromX: number;
  fleeFromY: number;
  fleeToX: number;
  fleeToY: number;
  trailPts: TrailPt[];
  aloofDots: boolean;
  aloofWindowLeft: number;
  feedCue: "none" | "eat" | "refuse";
  flickLeft: number;
  cueLeft: number;
  fleeKind: "none" | "timid" | "refuse";
  /** 亲密度触发的温顺反馈（慢游 + 爱心），与实际性格无关。 */
  gentleReact: boolean;
}

interface EggSprite {
  uid: string;
  g: Graphics;
}

function layoutBg(
  bgA: Sprite,
  bgB: Sprite,
  frameA: Sprite,
  frameB: Sprite,
  hit: Graphics,
  w: number,
  h: number,
) {
  for (const s of [bgA, bgB, frameA, frameB]) {
    s.width = w;
    s.height = h;
  }
  bgA.x = 0;
  bgB.x = w;
  frameA.x = 0;
  frameB.x = w;
  hit.clear();
  hit.rect(0, 0, w * 2, h);
  hit.fill({ color: 0xffffff, alpha: 0.001 });
}

function swimBox(screenW: number, screenH: number) {
  const pad = FISH_SIZE * 0.42;
  return {
    minX: screenW * SWIM.left + pad,
    maxX: screenW * 2 - screenW * SWIM.right - pad,
    minY: screenH * SWIM.top + pad,
    maxY: screenH * (1 - SWIM.bottom) - pad,
  };
}

function paintRing(ring: Graphics, selected: boolean) {
  ring.clear();
  if (!selected) return;
  ring.circle(0, 0, 48);
  ring.stroke({ color: 0xffd166, width: 4, alpha: 0.95 });
}

function paintEgg(g: Graphics, selected: boolean) {
  g.clear();
  g.ellipse(0, 0, 18, 13);
  g.fill({ color: selected ? 0xffe08a : 0xfff4cc });
  g.stroke({ color: selected ? 0xffd166 : 0xc4894a, width: selected ? 3 : 2 });
}

function paintTrail(g: Graphics, pts: TrailPt[]) {
  g.clear();
  if (pts.length < 2) return;
  for (let i = 1; i < pts.length; i++) {
    const a = Math.min(pts[i - 1].life, pts[i].life);
    if (a <= 0.02) continue;
    g.moveTo(pts[i - 1].x, pts[i - 1].y);
    g.lineTo(pts[i].x, pts[i].y);
    g.stroke({ width: 3 + 7 * a, color: 0xb7f0ff, alpha: 0.18 + 0.42 * a, cap: "round" });
  }
  const last = pts[pts.length - 1];
  if (last && last.life > 0.15) {
    g.ellipse(last.x, last.y, 10 * last.life, 5 * last.life);
    g.fill({ color: 0xe7fbff, alpha: 0.22 * last.life });
  }
}

/** 漫画井字青筋发火标记，不是火苗。 */
function paintAngerMark(g: Graphics, t: number) {
  g.clear();
  const p = 1 + Math.sin(t * 14) * 0.06;
  g.circle(0, 0, 32 * p);
  g.fill({ color: 0xff2a2a, alpha: 0.32 });
  g.circle(0, 0, 18 * p);
  g.fill({ color: 0xfff0f0, alpha: 0.2 });

  const k = 12 * p;
  const m = 24 * p;
  const corners = [
    { x: -k, y: -k, ax: -m, ay: -k, bx: -k, by: -m },
    { x: k, y: -k, ax: m, ay: -k, bx: k, by: -m },
    { x: -k, y: k, ax: -m, ay: k, bx: -k, by: m },
    { x: k, y: k, ax: m, ay: k, bx: k, by: m },
  ];
  const outline = { width: 12, color: 0x4a0000, cap: "round" as const, join: "round" as const };
  const fill = { width: 7.5, color: 0xff3333, cap: "round" as const, join: "round" as const };
  for (const c of corners) {
    g.moveTo(c.ax, c.ay);
    g.lineTo(c.x, c.y);
    g.lineTo(c.bx, c.by);
    g.stroke(outline);
  }
  for (const c of corners) {
    g.moveTo(c.ax, c.ay);
    g.lineTo(c.x, c.y);
    g.lineTo(c.bx, c.by);
    g.stroke(fill);
  }
}

function placeRage(s: TankSprite) {
  paintAngerMark(s.flame, s.flameT);
  s.flame.visible = true;
  s.flame.alpha = 1;
  s.flame.scale.set(1);
  s.flame.x = s.sprite.x + 34;
  s.flame.y = s.sprite.y - 42;
  s.heart.visible = false;
}

function paintHeartBubble(g: Graphics) {
  g.clear();
  g.roundRect(-28, -56, 56, 38, 16);
  g.fill({ color: 0xfff6e8, alpha: 0.98 });
  g.stroke({ color: 0x2a1a0c, width: 2.5 });
  g.moveTo(-8, -18);
  g.lineTo(8, -18);
  g.lineTo(0, -4);
  g.closePath();
  g.fill({ color: 0xfff6e8, alpha: 0.98 });
  g.moveTo(-8, -18);
  g.lineTo(0, -4);
  g.lineTo(8, -18);
  g.stroke({ color: 0x2a1a0c, width: 2.5, cap: "round", join: "round" });
}

function placeHeartBubble(s: TankSprite) {
  paintHeartBubble(s.flame);
  const pop = s.flameT < 0.18 ? 0.55 + (s.flameT / 0.18) * 0.45 : 1;
  const bob = Math.sin(s.flameT * 9) * 2.5;
  s.flame.visible = true;
  s.flame.alpha = 1;
  s.flame.scale.set(pop);
  s.flame.x = s.sprite.x + (s.sprite.scale.x >= 0 ? 8 : -8);
  s.flame.y = s.sprite.y - 10 + bob;
  s.heart.visible = true;
  s.heart.alpha = 1;
  s.heart.scale.set(pop);
  s.heart.x = s.flame.x;
  s.heart.y = s.flame.y - 38;
}

/** 聊天框里的 Q 版感叹号。 */
function paintShockBubble(g: Graphics) {
  paintHeartBubble(g);
  g.roundRect(-5.5, -50.5, 11, 16, 5.5);
  g.fill({ color: 0x2a1a0c });
  g.roundRect(-3, -49, 4.5, 6, 2);
  g.fill({ color: 0xffffff, alpha: 0.4 });
  g.circle(0, -27.5, 5.2);
  g.fill({ color: 0x2a1a0c });
  g.circle(-1.4, -28.8, 1.6);
  g.fill({ color: 0xffffff, alpha: 0.35 });
}

function placeShockBubble(s: TankSprite) {
  paintShockBubble(s.flame);
  const pop = s.flameT < 0.18 ? 0.55 + (s.flameT / 0.18) * 0.45 : 1;
  const bob = Math.sin(s.flameT * 8) * 2.2;
  s.flame.visible = true;
  s.flame.scale.set(pop);
  s.flame.x = s.sprite.x + (s.sprite.scale.x >= 0 ? 8 : -8);
  s.flame.y = s.sprite.y - 10 + bob;
  s.heart.visible = false;
}

function paintAskBubble(g: Graphics) {
  paintHeartBubble(g);
  // 单独起笔，避免接到气泡小三角上。钩在上、点在下。
  g.moveTo(-7.2, -42);
  g.bezierCurveTo(-8.5, -53.5, 9.5, -53.5, 7.4, -41.5);
  g.bezierCurveTo(6.6, -35.5, 2.2, -34, 1.1, -30);
  g.stroke({ width: 5.6, color: 0x2a1a0c, cap: "round", join: "round" });
  g.circle(1.1, -23.2, 3.7);
  g.fill({ color: 0x2a1a0c });
  g.moveTo(-3.2, -48.5);
  g.quadraticCurveTo(0, -51.5, 4.2, -47.5);
  g.stroke({ width: 2, color: 0xffffff, alpha: 0.35, cap: "round" });
}

function paintDotsBubble(g: Graphics) {
  paintHeartBubble(g);
  for (const x of [-11, 0, 11]) {
    g.circle(x, -37, 3.3);
    g.fill({ color: 0x2a1a0c });
  }
}

function placeAloofBubble(s: TankSprite) {
  if (s.aloofDots) paintDotsBubble(s.flame);
  else paintAskBubble(s.flame);
  const pop = s.flameT < 0.18 ? 0.55 + (s.flameT / 0.18) * 0.45 : 1;
  const bob = Math.sin(s.flameT * 5) * 1.6;
  s.flame.visible = true;
  s.flame.scale.set(pop);
  s.flame.x = s.sprite.x + (s.sprite.scale.x >= 0 ? 8 : -8);
  s.flame.y = s.sprite.y - 10 + bob;
  s.heart.visible = false;
}

function placeDisdainBubble(s: TankSprite) {
  paintDotsBubble(s.flame);
  const pop = s.flameT < 0.16 ? 0.6 + (s.flameT / 0.16) * 0.4 : 1;
  const bob = Math.sin(s.flameT * 7) * 1.4;
  s.flame.visible = true;
  s.flame.alpha = s.cueLeft < 0.28 ? s.cueLeft / 0.28 : 1;
  s.flame.scale.set(pop);
  s.flame.x = s.sprite.x + (s.sprite.scale.x >= 0 ? 10 : -10);
  s.flame.y = s.sprite.y - 12 + bob;
  s.heart.visible = false;
}

/** 聊天框里的 Q 版开心脸。 */
function paintHappyBubble(g: Graphics) {
  paintHeartBubble(g);
  g.moveTo(-12, -40);
  g.quadraticCurveTo(-8, -44.5, -4, -40);
  g.stroke({ width: 3.2, color: 0x2a1a0c, cap: "round" });
  g.moveTo(4, -40);
  g.quadraticCurveTo(8, -44.5, 12, -40);
  g.stroke({ width: 3.2, color: 0x2a1a0c, cap: "round" });
  g.moveTo(-10, -32);
  g.quadraticCurveTo(0, -24, 10, -32);
  g.stroke({ width: 3.2, color: 0x2a1a0c, cap: "round" });
}

function placeHappyBubble(s: TankSprite) {
  paintHappyBubble(s.flame);
  const pop = s.flameT < 0.18 ? 0.55 + (s.flameT / 0.18) * 0.45 : 1;
  const bob = Math.sin(s.flameT * 8) * 2;
  s.flame.visible = true;
  s.flame.alpha = s.cueLeft < 0.28 ? s.cueLeft / 0.28 : 1;
  s.flame.scale.set(pop);
  s.flame.x = s.sprite.x + (s.sprite.scale.x >= 0 ? 8 : -8);
  s.flame.y = s.sprite.y - 10 + bob;
  s.heart.visible = false;
}

function clearFeedCue(s: TankSprite) {
  s.feedCue = "none";
  s.flickLeft = 0;
  s.cueLeft = 0;
  s.sprite.rotation = 0;
}

function startEatFeed(s: TankSprite) {
  if (s.dead) return;
  s.reactLeft = 0;
  s.flame.visible = false;
  s.heart.visible = false;
  s.feedCue = "eat";
  s.flickLeft = FEED_EAT_FLICK_SECS;
  s.cueLeft = 0;
  s.flameT = 0;
  s.fleeLeft = 0;
  s.fleeKind = "none";
}

function startRefuseFeed(
  s: TankSprite,
  box: { minX: number; maxX: number; minY: number; maxY: number },
) {
  if (s.dead) return;
  s.reactLeft = 0;
  s.shakeLeft = 0;
  const x = s.sprite.x - s.shakeOx;
  const y = s.sprite.y - s.shakeOy;
  s.shakeOx = 0;
  s.shakeOy = 0;
  s.sprite.x = x;
  s.sprite.y = y;
  s.sprite.rotation = 0;
  s.flame.visible = false;
  s.heart.visible = false;
  const ang = Math.random() * Math.PI * 2;
  const dist = REFUSE_DIST_MIN + Math.random() * (REFUSE_DIST_MAX - REFUSE_DIST_MIN);
  const toX = Math.max(box.minX, Math.min(box.maxX, x + Math.cos(ang) * dist));
  const toY = Math.max(box.minY, Math.min(box.maxY, y + Math.sin(ang) * dist));
  const run = Math.hypot(toX - x, toY - y);
  s.fleeFromX = x;
  s.fleeFromY = y;
  s.fleeToX = toX;
  s.fleeToY = toY;
  s.fleeDur = Math.max(0.62, Math.min(0.98, run / 130));
  s.fleeLeft = 0;
  s.fleeKind = "refuse";
  s.feedCue = "refuse";
  s.flickLeft = FEED_FLICK_SECS;
  s.cueLeft = FEED_REFUSE_BUBBLE_SECS;
  s.flameT = 0;
  s.trailPts = [{ x, y, life: 1 }];
}

function startGentleReact(s: TankSprite) {
  if (s.dead) return;
  clearFeedCue(s);
  s.gentleReact = true;
  s.fleeLeft = 0;
  s.shakeLeft = 0;
  s.shakeOx = 0;
  s.shakeOy = 0;
  s.reactLeft = HEART_BUBBLE_SECS;
  s.flameT = 0;
  placeHeartBubble(s);
}

function startPersonalityReact(
  s: TankSprite,
  box: { minX: number; maxX: number; minY: number; maxY: number },
  personality: Personality,
) {
  if (s.dead) return;
  clearFeedCue(s);
  s.personality = personality;
  if (personality === "hot") {
    s.fleeLeft = 0;
    s.shakeLeft = 0;
    s.shakeOx = 0;
    s.shakeOy = 0;
    s.reactLeft = RAGE_SECS;
    s.flameT = 0;
    s.heart.visible = false;
    placeRage(s);
    return;
  }
  s.flame.visible = false;
  s.heart.visible = false;
  if (personality === "aloof") {
    s.fleeLeft = 0;
    s.shakeLeft = 0;
    s.shakeOx = 0;
    s.shakeOy = 0;
    if (s.aloofWindowLeft > 0) s.aloofDots = true;
    else {
      s.aloofDots = false;
      s.aloofWindowLeft = ALOOF_WINDOW_SECS;
    }
    s.reactLeft = HEART_BUBBLE_SECS;
    s.flameT = 0;
    placeAloofBubble(s);
    return;
  }
  if (s.personality === "timid") {
    const x = s.sprite.x - s.shakeOx;
    const y = s.sprite.y - s.shakeOy;
    s.shakeOx = 0;
    s.shakeOy = 0;
    s.shakeLeft = 0;
    const ang = Math.random() * Math.PI * 2;
    const dist = FLEE_DIST_MIN + Math.random() * (FLEE_DIST_MAX - FLEE_DIST_MIN);
    const toX = Math.max(box.minX, Math.min(box.maxX, x + Math.cos(ang) * dist));
    const toY = Math.max(box.minY, Math.min(box.maxY, y + Math.sin(ang) * dist));
    const run = Math.hypot(toX - x, toY - y);
    s.fleeFromX = x;
    s.fleeFromY = y;
    s.fleeToX = toX;
    s.fleeToY = toY;
    s.fleeDur = Math.max(0.76, Math.min(1.16, run / 115));
    s.fleeLeft = s.fleeDur;
    s.fleeKind = "timid";
    s.sprite.x = x;
    s.sprite.y = y;
    s.trailPts = [{ x, y, life: 1 }];
    s.reactLeft = s.fleeDur + TIMID_SHAKE_SECS;
    s.flameT = 0;
    placeShockBubble(s);
  }
}

/** 可左右滑动观看鱼缸不同位置；点空白取消选中；点死鱼清理。 */
export default function TankCanvas({
  fish,
  tankId,
  eggs,
  allowCleanDead = true,
}: {
  fish?: TankFish[];
  tankId?: string;
  eggs?: TankEgg[];
  allowCleanDead?: boolean;
} = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const spritesRef = useRef<Map<string, TankSprite>>(new Map());
  const eggsRef = useRef<Map<string, EggSprite>>(new Map());
  const panRef = useRef(0);
  const [ready, setReady] = useState(false);
  const save = useGame((s) => s.save);
  const selectedUid = useGame((s) => s.selectedTankUid);
  const tankCue = useUi((s) => s.tankCue);
  const selectedEggUid = useGame((s) => s.selectedEggUid);
  const selectedUidRef = useRef(selectedUid);
  selectedUidRef.current = selectedUid;
  const tankFish = fish ?? save.tank;
  const activeId = tankId ?? save.activeTankId;
  const tankEggs = eggs ?? save.eggs;
  const fishRef = useRef(tankFish);
  fishRef.current = tankFish;
  const allowCleanRef = useRef(allowCleanDead);
  allowCleanRef.current = allowCleanDead;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const app = new Application();
    let raf = 0;
    let destroyed = false;
    let dragging = false;
    let moved = false;
    let lastX = 0;

    app.init({ background: 0x6eb8d8, resizeTo: el, antialias: true }).then(async () => {
      if (destroyed || !el) {
        app.destroy(true);
        return;
      }
      el.appendChild(app.canvas);
      appRef.current = app;
      app.stage.eventMode = "static";
      app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);
      const world = new Container();
      world.sortableChildren = true;
      worldRef.current = world;
      app.stage.addChild(world);

      const bgA = new Sprite();
      const bgB = new Sprite();
      const frameA = new Sprite();
      const frameB = new Sprite();
      for (const s of [bgA, bgB, frameA, frameB]) s.eventMode = "none";
      bgA.zIndex = 0;
      bgB.zIndex = 0;
      frameA.zIndex = 40;
      frameB.zIndex = 40;
      try {
        const tex = await loadTexture(ART.bgTank);
        const frameTex = await loadTankFrameOverlay(ART.bgTank, FRAME);
        if (destroyed) return;
        bgA.texture = tex;
        bgB.texture = tex;
        frameA.texture = frameTex;
        frameB.texture = frameTex;
      } catch (err) {
        console.error("tank bg load failed", err);
      }
      if (destroyed) return;

      const hit = new Graphics();
      hit.eventMode = "static";
      hit.cursor = "grab";
      hit.zIndex = 1;
      layoutBg(bgA, bgB, frameA, frameB, hit, app.screen.width, app.screen.height);
      world.addChild(bgA, bgB, hit, frameA, frameB);
      app.renderer.on("resize", () => {
        layoutBg(bgA, bgB, frameA, frameB, hit, app.screen.width, app.screen.height);
        app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);
      });

      const clampPan = () => {
        const max = Math.max(0, app.screen.width);
        panRef.current = Math.max(0, Math.min(max, panRef.current));
        world.x = -panRef.current;
      };

      let downOnBg = false;
      hit.on("pointerdown", (e) => {
        downOnBg = true;
        dragging = true;
        moved = false;
        lastX = e.global.x;
        hit.cursor = "grabbing";
      });
      hit.on("pointermove", (e) => {
        if (!dragging) return;
        const dx = e.global.x - lastX;
        if (Math.abs(dx) > 4) moved = true;
        lastX = e.global.x;
        panRef.current -= dx;
        clampPan();
      });
      const endDrag = () => {
        if (!dragging) return;
        dragging = false;
        hit.cursor = "grab";
        if (downOnBg && !moved) {
          useGame.getState().selectTankFish(null);
          useGame.getState().selectEgg(null);
        }
        downOnBg = false;
      };
      hit.on("pointerup", endDrag);
      hit.on("pointerupoutside", endDrag);

      const tick = () => {
        const sprites = spritesRef.current;
        const w = app.screen.width;
        const h = app.screen.height;
        const box = swimBox(w, h);
        for (const s of sprites.values()) {
          if (s.dead) {
            s.sprite.y = Math.min(box.maxY, s.sprite.y + 0.6);
            s.ring.x = s.sprite.x;
            s.ring.y = s.sprite.y;
            s.flame.visible = false;
            s.heart.visible = false;
            s.trailPts = [];
            s.trail.clear();
            continue;
          }
          const dt = 1 / 60;
          if (s.aloofWindowLeft > 0) s.aloofWindowLeft = Math.max(0, s.aloofWindowLeft - dt);
          const picked = selectedUidRef.current === s.uid;
          const slow = picked && (s.personality === "docile" || s.gentleReact) ? 0.12 : picked && s.personality === "timid" ? 0.5 : 1;
          const raging = s.personality === "hot" && s.reactLeft > 0;
          const mul = (s.health / 100) * PERSONALITY_SPEED[s.personality];
          const scale = s.personality === "hot" ? SWIM_SCALE_HOT : SWIM_SCALE_REST;
          const len = SWIM_LEN * mul * scale * (raging ? 2 : 1);
          const cur = Math.hypot(s.vx, s.vy) || 1;
          s.vx = (s.vx / cur) * len;
          s.vy = (s.vy / cur) * len;
          s.sprite.x -= s.shakeOx;
          s.sprite.y -= s.shakeOy;
          if (s.flickLeft > 0) {
            s.flickLeft = Math.max(0, s.flickLeft - dt);
            s.flameT += dt;
            if (s.feedCue === "refuse") {
              const amp = s.flickLeft / FEED_FLICK_SECS;
              s.sprite.rotation = Math.sin(s.flameT * 48) * 0.52 * amp;
              s.shakeOx = Math.cos(s.flameT * 40) * 2.4 * amp;
              s.shakeOy = Math.sin(s.flameT * 56) * 4.2 * amp;
            } else {
              s.sprite.rotation = Math.sin(s.flameT * 24) * 0.14;
              s.shakeOx = 0;
              s.shakeOy = Math.sin(s.flameT * 32) * 1.8;
            }
            if (s.flickLeft <= 0) {
              s.sprite.rotation = 0;
              s.shakeOx = 0;
              s.shakeOy = 0;
              if (s.feedCue === "refuse") {
                s.fleeLeft = s.fleeDur;
              } else if (s.feedCue === "eat" && s.cueLeft <= 0) {
                s.cueLeft = FEED_EAT_BUBBLE_SECS;
                s.flameT = 0;
              }
            }
          } else if (s.fleeLeft > 0) {
            s.fleeLeft = Math.max(0, s.fleeLeft - dt);
            const u = s.fleeDur <= 0 ? 1 : 1 - s.fleeLeft / s.fleeDur;
            const e = 1 - (1 - u) ** 3;
            s.sprite.x = s.fleeFromX + (s.fleeToX - s.fleeFromX) * e;
            s.sprite.y = s.fleeFromY + (s.fleeToY - s.fleeFromY) * e;
            const dx = s.fleeToX - s.fleeFromX;
            const dy = s.fleeToY - s.fleeFromY;
            if (Math.abs(dx) > 0.4) {
              s.sprite.scale.x = Math.abs(s.sprite.scale.x) * (dx >= 0 ? 1 : -1);
            }
            s.trailPts.push({ x: s.sprite.x, y: s.sprite.y, life: 1 });
            if (s.fleeLeft <= 0) {
              if (s.fleeKind === "timid") s.shakeLeft = TIMID_SHAKE_SECS;
              const mag = Math.hypot(dx, dy) || 1;
              s.vx = (dx / mag) * len;
              s.vy = (dy / mag) * len;
              s.fleeKind = "none";
            }
          } else {
            s.sprite.x += s.vx * slow;
            s.sprite.y += s.vy * slow;
            s.sprite.scale.x = Math.abs(s.sprite.scale.x) * (s.vx >= 0 ? 1 : -1);
            if (s.sprite.x < box.minX) { s.sprite.x = box.minX; s.vx = Math.abs(s.vx); }
            if (s.sprite.x > box.maxX) { s.sprite.x = box.maxX; s.vx = -Math.abs(s.vx); }
            if (s.sprite.y < box.minY) { s.sprite.y = box.minY; s.vy = Math.abs(s.vy); }
            if (s.sprite.y > box.maxY) { s.sprite.y = box.maxY; s.vy = -Math.abs(s.vy); }
          }
          if (s.shakeLeft > 0 && s.fleeLeft <= 0 && s.flickLeft <= 0) {
            s.shakeLeft = Math.max(0, s.shakeLeft - dt);
            const amp = TIMID_SHAKE_AMP * (s.shakeLeft / TIMID_SHAKE_SECS);
            s.shakeOx = Math.sin(s.flameT * TIMID_SHAKE_FREQ_X) * amp;
            s.shakeOy = Math.cos(s.flameT * TIMID_SHAKE_FREQ_Y) * amp * 0.7;
          } else if (s.flickLeft <= 0) {
            s.shakeOx = 0;
            s.shakeOy = 0;
          }
          s.sprite.x += s.shakeOx;
          s.sprite.y += s.shakeOy;
          s.ring.x = s.sprite.x;
          s.ring.y = s.sprite.y;
          for (const p of s.trailPts) p.life -= dt * 1.6;
          s.trailPts = s.trailPts.filter((p) => p.life > 0);
          if (s.trailPts.length > 48) s.trailPts.splice(0, s.trailPts.length - 48);
          paintTrail(s.trail, s.trailPts);
          if (s.feedCue === "eat" && s.cueLeft > 0) {
            s.cueLeft = Math.max(0, s.cueLeft - dt);
            s.flameT += dt;
            placeHappyBubble(s);
            if (s.cueLeft <= 0) {
              s.feedCue = "none";
              s.flame.visible = false;
              s.flame.scale.set(1);
              s.flame.alpha = 1;
            }
          } else if (s.feedCue === "refuse" && s.cueLeft > 0) {
            s.cueLeft = Math.max(0, s.cueLeft - dt);
            s.flameT += s.flickLeft > 0 ? 0 : dt;
            placeDisdainBubble(s);
            if (s.cueLeft <= 0) {
              s.feedCue = "none";
              s.flame.visible = false;
              s.flame.scale.set(1);
              s.flame.alpha = 1;
            }
          } else if (s.personality === "hot" && s.reactLeft > 0) {
            s.reactLeft = Math.max(0, s.reactLeft - dt);
            s.flameT += dt;
            placeRage(s);
            if (s.reactLeft < 0.25) s.flame.alpha = s.reactLeft / 0.25;
            if (s.reactLeft <= 0) {
              s.flame.visible = false;
              s.flame.scale.set(1);
            }
          } else if ((s.gentleReact || s.personality === "docile") && s.reactLeft > 0) {
            s.reactLeft = Math.max(0, s.reactLeft - dt);
            s.flameT += dt;
            placeHeartBubble(s);
            if (s.reactLeft < 0.28) {
              const a = s.reactLeft / 0.28;
              s.flame.alpha = a;
              s.heart.alpha = a;
            }
            if (s.reactLeft <= 0) {
              s.flame.visible = false;
              s.heart.visible = false;
              s.flame.scale.set(1);
              s.heart.scale.set(1);
              s.gentleReact = false;
            }
          } else if (s.personality === "aloof" && s.reactLeft > 0) {
            s.reactLeft = Math.max(0, s.reactLeft - dt);
            s.flameT += dt;
            placeAloofBubble(s);
            if (s.reactLeft < 0.28) s.flame.alpha = s.reactLeft / 0.28;
            else s.flame.alpha = 1;
            if (s.reactLeft <= 0) {
              s.flame.visible = false;
              s.flame.scale.set(1);
            }
          } else if (s.personality === "timid" && s.reactLeft > 0) {
            s.reactLeft = Math.max(0, s.reactLeft - dt);
            s.flameT += dt;
            placeShockBubble(s);
            if (s.reactLeft < 0.28) s.flame.alpha = s.reactLeft / 0.28;
            else s.flame.alpha = 1;
            if (s.reactLeft <= 0) {
              s.flame.visible = false;
              s.flame.scale.set(1);
            }
          } else {
            s.flame.visible = false;
            s.heart.visible = false;
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      setReady(true);
    }).catch((err) => console.error("PixiJS init failed", err));

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      setReady(false);
      worldRef.current = null;
      spritesRef.current.clear();
      eggsRef.current.clear();
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      } else {
        app.destroy(true);
      }
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    const world = worldRef.current;
    if (!app || !world || !ready) return;
    let cancelled = false;
    const sprites = spritesRef.current;
    const visible = tankFish.filter((f) => f.tankId === activeId);
    const presentUids = new Set(visible.map((f) => f.uid));

    (async () => {
      for (const f of visible) {
        if (cancelled) return;
        let s = sprites.get(f.uid);
        if (!s) {
          const spriteId = FISH_BY_ID[f.defId]?.spriteId ?? f.defId;
          let tex;
          try {
            tex = await loadKeyedTexture(ART.fish(spriteId));
          } catch {
            continue;
          }
          if (cancelled || !worldRef.current) return;
          const sprite = new Sprite(tex);
          sprite.anchor.set(0.5);
          const target = FISH_SIZE;
          const scale = target / Math.max(tex.width, tex.height);
          sprite.scale.set(scale);
          sprite.hitArea = new Circle(0, 0, Math.max(tex.width, tex.height) * 0.48);
          const box = swimBox(app.screen.width, app.screen.height);
          sprite.x = box.minX + Math.random() * (box.maxX - box.minX);
          sprite.y = box.minY + Math.random() * (box.maxY - box.minY);
          sprite.eventMode = "static";
          sprite.cursor = "pointer";
          sprite.zIndex = 10;
          sprite.on("pointerdown", (e) => {
            e.stopPropagation();
            const cur = fishRef.current.find((x) => x.uid === f.uid);
            if (cur?.dead) {
              if (allowCleanRef.current) useGame.getState().cleanDead(f.uid);
              return;
            }
            useGame.getState().selectTankFish(f.uid);
            useGame.getState().petFish(f.uid);
            const appNow = appRef.current;
            const spr = spritesRef.current.get(f.uid);
            const after = useGame.getState().save.tank.find((x) => x.uid === f.uid);
            if (appNow && spr && after) {
              const box = swimBox(appNow.screen.width, appNow.screen.height);
              const personality = after.personality ?? spr.personality;
              if (personality === "docile" || rollDocileReact(after.affection ?? 0)) {
                startGentleReact(spr);
              } else {
                startPersonalityReact(spr, box, personality);
              }
            }
          });
          const ring = new Graphics();
          ring.eventMode = "none";
          ring.zIndex = 11;
          const flame = new Graphics();
          flame.eventMode = "none";
          flame.zIndex = 45;
          flame.visible = false;
          const heart = new Text({
            text: "❤️",
            style: {
              fontFamily: "Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif",
              fontSize: 22,
            },
          });
          heart.anchor.set(0.5);
          heart.eventMode = "none";
          heart.zIndex = 46;
          heart.visible = false;
          const trail = new Graphics();
          trail.eventMode = "none";
          trail.zIndex = 9;
          world.addChild(trail, sprite, ring, flame, heart);
          const angle = Math.random() * Math.PI * 2;
          s = {
            uid: f.uid,
            sprite,
            ring,
            flame,
            heart,
            trail,
            vx: Math.cos(angle),
            vy: Math.sin(angle),
            dead: f.dead,
            personality: f.personality ?? "docile",
            health: f.health,
            reactLeft: 0,
            shakeLeft: 0,
            shakeOx: 0,
            shakeOy: 0,
            flameT: 0,
            fleeLeft: 0,
            fleeDur: 0,
            fleeFromX: sprite.x,
            fleeFromY: sprite.y,
            fleeToX: sprite.x,
            fleeToY: sprite.y,
            trailPts: [],
            aloofDots: false,
            aloofWindowLeft: 0,
            feedCue: "none",
            flickLeft: 0,
            cueLeft: 0,
            fleeKind: "none",
            gentleReact: false,
          };
          sprites.set(f.uid, s);
        }
        s.dead = f.dead;
        s.personality = f.personality ?? "docile";
        s.health = f.health;
        s.sprite.tint = f.dead ? 0x777777 : 0xffffff;
        s.sprite.alpha = f.dead ? 0.72 : 1;
        if (f.dead) {
          s.vx = 0;
          s.vy = 0;
          s.fleeLeft = 0;
          s.fleeKind = "none";
          s.flame.visible = false;
          s.heart.visible = false;
          s.reactLeft = 0;
          s.flickLeft = 0;
          s.cueLeft = 0;
          s.feedCue = "none";
          s.gentleReact = false;
          s.sprite.rotation = 0;
          s.trailPts = [];
          s.trail.clear();
        }
        paintRing(s.ring, selectedUid === f.uid);
        s.ring.x = s.sprite.x;
        s.ring.y = s.sprite.y;
      }

      for (const [uid, s] of sprites) {
        if (!presentUids.has(uid)) {
          world.removeChild(s.sprite);
          world.removeChild(s.ring);
          world.removeChild(s.flame);
          world.removeChild(s.heart);
          world.removeChild(s.trail);
          s.sprite.destroy();
          s.ring.destroy();
          s.flame.destroy();
          s.heart.destroy();
          s.trail.destroy();
          sprites.delete(uid);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tankFish, activeId, selectedUid, ready]);

  useEffect(() => {
    if (!tankCue || !ready) return;
    const app = appRef.current;
    const spr = spritesRef.current.get(tankCue.uid);
    if (!app || !spr) return;
    const box = swimBox(app.screen.width, app.screen.height);
    if (tankCue.kind === "refuse") startRefuseFeed(spr, box);
    else startEatFeed(spr);
  }, [tankCue, ready]);

  useEffect(() => {
    const app = appRef.current;
    const world = worldRef.current;
    if (!app || !world || !ready) return;
    const eggs = eggsRef.current;
    const visibleEggs = tankEggs.filter((e) => e.tankId === activeId);
    const present = new Set(visibleEggs.map((e) => e.uid));
    visibleEggs.forEach((egg, i) => {
      let s = eggs.get(egg.uid);
      if (!s) {
        const g = new Graphics();
        g.eventMode = "static";
        g.cursor = "pointer";
        g.zIndex = 12;
        const box = swimBox(app.screen.width, app.screen.height);
        g.x = box.minX + 24 + (i * 70) % Math.max(80, box.maxX - box.minX - 48);
        g.y = box.maxY;
        g.on("pointerdown", (e) => {
          e.stopPropagation();
          const cur = useGame.getState().selectedEggUid;
          useGame.getState().selectEgg(cur === egg.uid ? null : egg.uid);
        });
        world.addChild(g);
        s = { uid: egg.uid, g };
        eggs.set(egg.uid, s);
      }
      paintEgg(s.g, selectedEggUid === egg.uid);
    });
    for (const [uid, s] of eggs) {
      if (!present.has(uid)) {
        world.removeChild(s.g);
        s.g.destroy();
        eggs.delete(uid);
      }
    }
  }, [tankEggs, activeId, selectedEggUid, ready]);

  return <div ref={containerRef} className="tank-canvas" />;
}
