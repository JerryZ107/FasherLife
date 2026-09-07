import { useEffect, useRef, useState } from "react";
import { Application, Graphics, Container, Sprite, Circle, Rectangle, Text } from "pixi.js";
import { useGame } from "../store/gameStore";
import { useUi } from "../store/uiStore";
import { ART, loadKeyedTexture, loadTankFrameOverlay, loadTexture } from "../art/assets";
import { FISH_BY_ID } from "../data/fishDefs";
import { PERSONALITY_SPEED, type Personality } from "../types";
import type { TankEgg, TankFish } from "../save/saveSchema";
import { rollDocileReact } from "../game/affection";
import { canFeedFishToday, canMateFish, fishHealthMax, fishSizeScale, wantsFood } from "../game/growth";
import { canFeed } from "../game/economy";
import { swimSpeedMultiplier } from "../game/health";
import { fishSex } from "../game/pairing";
import { mateRefuseReason, mateSelectBlockReason } from "../game/mating";
import { tankViewSpan } from "../game/tanks";
import type { Quality } from "../types";

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
const FEED_EAT_BUBBLE_SECS = 1.55;
const FEED_REFUSE_BUBBLE_SECS = 1.35;
const FEED_HEART_COLORS = [0xff3355, 0xff6b8a, 0xff8fab, 0xff4d6d, 0xff9eb5] as const;
const REFUSE_DIST_MIN = 100;
const REFUSE_DIST_MAX = 160;
const MATE_TOUCH_DIST = 34;
const MATE_PAUSE_SECS = 3;
const MATE_APPROACH_SLOW = 0.3;
const MATE_EGG_SINK_MUL = 2.5;
const SPRAY_BURST_SECS = 0.55;

type MatingPhase = "approach" | "pause";

interface MatingAnim {
  fishA: string;
  fishB: string;
  femaleUid: string;
  phase: MatingPhase;
  pauseLeft: number;
  laid: boolean;
}

interface EggFall {
  uid: string;
  x: number;
  y: number;
  vy: number;
  targetY: number;
  done: boolean;
}

interface TrailPt {
  x: number;
  y: number;
  life: number;
}

/** 喂食成功后环绕鱼身漂出的爱心粒子。 */
interface FeedHeartPt {
  ang: number;
  r: number;
  vr: number;
  size: number;
  phase: number;
  delay: number;
  color: number;
}

interface TankSprite {
  uid: string;
  sprite: Sprite;
  ring: Graphics;
  flame: Graphics;
  heart: Text;
  nameLabel: Text;
  trail: Graphics;
  baseScale: number;
  healthMax: number;
  bodyBulk?: 1 | 2 | 3;
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
  feedHearts: FeedHeartPt[];
  shyBubbleLeft: number;
  dizzyBubbleLeft: number;
}

interface SprayBurst {
  g: Graphics;
  life: number;
  maxLife: number;
}

interface EggSprite {
  uid: string;
  g: Graphics;
  falling: boolean;
}

interface Pellet {
  id: number;
  g: Graphics;
  x: number;
  y: number;
  foodId: string;
}

/** 下沉鱼粮速度 ≈ 满健康温顺鱼游速的 1/10（慢飘落，方便看清）。 */
const PELLET_SINK = SWIM_LEN * SWIM_SCALE_REST * PERSONALITY_SPEED.docile * 0.1;
/** 交配产卵落地速度为鱼粮的 2.5 倍。 */
const EGG_SINK = PELLET_SINK * MATE_EGG_SINK_MUL;
const PELLET_SEEK = 220;
/** 仅嘴部可吃：相对鱼身半长的前伸比例。 */
const PELLET_MOUTH_REACH = 0.42;
/** 嘴部吃粮判定半径（世界像素）。 */
const PELLET_MOUTH_R = 11;
/** 寻食时游速倍率。 */
const PELLET_CHASE_SPEED = 1.2;

function layoutBg(
  bgA: Sprite,
  bgB: Sprite,
  frameA: Sprite,
  frameB: Sprite,
  hit: Graphics,
  w: number,
  h: number,
  span: 1 | 2,
) {
  for (const s of [bgA, bgB, frameA, frameB]) {
    s.width = w;
    s.height = h;
  }
  bgA.x = 0;
  frameA.x = 0;
  const wide = span === 2;
  bgB.visible = wide;
  frameB.visible = wide;
  if (wide) {
    bgB.x = w;
    frameB.x = w;
  }
  hit.clear();
  hit.rect(0, 0, w * span, h);
  hit.fill({ color: 0xffffff, alpha: 0.001 });
  hit.cursor = wide ? "grab" : "default";
}

function swimBox(screenW: number, screenH: number, span: 1 | 2 = 2) {
  const pad = FISH_SIZE * 0.42;
  const width = screenW * span;
  return {
    minX: screenW * SWIM.left + pad,
    maxX: width - screenW * SWIM.right - pad,
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

function syncFishNameLabel(s: TankSprite, customName?: string | null) {
  const name = customName?.trim();
  if (!name) {
    s.nameLabel.visible = false;
    return;
  }
  s.nameLabel.text = name;
  s.nameLabel.visible = true;
}

function placeFishOverlays(s: TankSprite) {
  s.ring.x = s.sprite.x;
  s.ring.y = s.sprite.y;
  if (!s.nameLabel.visible) return;
  const h = Math.abs(s.sprite.height) || FISH_SIZE;
  s.nameLabel.x = s.sprite.x;
  s.nameLabel.y = s.sprite.y - h * 0.37;
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
  s.heart.text = "❤️";
  s.heart.style.fontSize = 22;
  s.heart.scale.set(pop);
  s.heart.x = s.flame.x;
  s.heart.y = s.flame.y - 38;
}

/** 配偶喷香：能配种的鱼头顶小花聊天气泡。 */
function placeFlowerBubble(s: TankSprite) {
  paintHeartBubble(s.flame);
  s.flame.visible = true;
  s.flame.alpha = 1;
  s.flame.scale.set(1);
  s.flame.x = s.sprite.x + (s.sprite.scale.x >= 0 ? 8 : -8);
  s.flame.y = s.sprite.y - 10;
  s.heart.visible = true;
  s.heart.alpha = 1;
  s.heart.text = "🌸";
  s.heart.style.fontSize = 18;
  s.heart.scale.set(1);
  s.heart.x = s.flame.x;
  s.heart.y = s.flame.y - 38;
}

function placeMateHeart(s: TankSprite) {
  const bob = Math.sin(s.flameT * 8) * 3;
  const pop = 1 + Math.sin(s.flameT * 6) * 0.1;
  s.heart.visible = true;
  s.heart.alpha = 1;
  s.heart.scale.set(pop);
  s.heart.x = s.sprite.x;
  s.heart.y = s.sprite.y - 54 + bob;
  s.flame.visible = false;
}

function applyFishSpriteSize(s: TankSprite, fish: Pick<TankFish, "healthMax" | "bodyBulk">) {
  const mul = fishSizeScale(fish as TankFish);
  const facing = s.sprite.scale.x >= 0 ? 1 : -1;
  const side = s.baseScale * mul;
  s.sprite.scale.set(side * facing, side);
}

function swimLen(s: TankSprite): number {
  const mul = PERSONALITY_SPEED[s.personality] * swimSpeedMultiplier(s.health, s.personality, s.healthMax);
  const scale = s.personality === "hot" ? SWIM_SCALE_HOT : SWIM_SCALE_REST;
  return SWIM_LEN * mul * scale;
}

/** 鱼嘴世界坐标：朝向一侧的前缘，体型缩放后。 */
function fishMouth(s: TankSprite): { x: number; y: number } {
  const facing = s.sprite.scale.x >= 0 ? 1 : -1;
  const sizeMul = s.baseScale > 0 ? Math.abs(s.sprite.scale.y) / s.baseScale : 1;
  const reach = FISH_SIZE * sizeMul * PELLET_MOUTH_REACH;
  return { x: s.sprite.x + facing * reach, y: s.sprite.y };
}

function faceToward(s: TankSprite, tx: number) {
  const mag = Math.abs(s.sprite.scale.x) || 1;
  s.sprite.scale.x = s.sprite.x < tx ? mag : -mag;
}

function releaseMateFish(sa: TankSprite, sb: TankSprite) {
  const dx = sb.sprite.x - sa.sprite.x;
  const dy = sb.sprite.y - sa.sprite.y;
  const d = Math.hypot(dx, dy) || 1;
  sa.vx = -(dx / d) * swimLen(sa);
  sa.vy = -(dy / d) * swimLen(sa);
  sb.vx = (dx / d) * swimLen(sb);
  sb.vy = (dy / d) * swimLen(sb);
  sa.fleeLeft = 0;
  sb.fleeLeft = 0;
  sa.fleeKind = "none";
  sb.fleeKind = "none";
  clearMateCue(sa);
  clearMateCue(sb);
}

function clearMateCue(s: TankSprite) {
  s.heart.visible = false;
  s.heart.text = "❤️";
  s.heart.style.fontSize = 22;
  s.gentleReact = false;
  s.shyBubbleLeft = 0;
  s.dizzyBubbleLeft = 0;
  s.flame.visible = false;
}

/** 害羞表情：淡粉椭圆 + 红色斜杠腮红，无边框。 */
function paintShyBubble(g: Graphics) {
  g.clear();
  g.ellipse(0, -42, 26, 19);
  g.fill({ color: 0xffd6e8, alpha: 0.88 });
  const lines: [number, number, number, number][] = [
    [-14, -50, -6, -38],
    [-8, -50, 0, -38],
    [2, -50, 10, -38],
    [8, -50, 16, -38],
  ];
  for (const [x1, y1, x2, y2] of lines) {
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke({ color: 0xe85a6f, width: 2.2, cap: "round", alpha: 0.85 });
  }
}

function placeShyBubble(s: TankSprite) {
  paintShyBubble(s.flame);
  s.flame.visible = true;
  s.flame.alpha = 1;
  s.flame.scale.set(1);
  s.flame.x = s.sprite.x + (s.sprite.scale.x >= 0 ? 8 : -8);
  s.flame.y = s.sprite.y - 6;
}

/** 漫画式晕眩：喷到暂时无法交配的母鱼时显示。 */
function paintSpiralMark(g: Graphics, cx: number, cy: number, size: number, spin: number) {
  const turns = 1.75;
  const steps = 34;
  const maxT = turns * Math.PI * 2;
  let started = false;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const theta = u * maxT + spin;
    const r = size * (0.1 + u * 0.88);
    const x = cx + Math.cos(theta) * r;
    const y = cy + Math.sin(theta) * r;
    if (!started) {
      g.moveTo(x, y);
      started = true;
    } else {
      g.lineTo(x, y);
    }
  }
  g.stroke({ color: 0x2a1a0c, width: 2.6, cap: "round", join: "round" });
}

function paintDizzyBubble(g: Graphics, t: number) {
  paintHeartBubble(g);
  paintSpiralMark(g, 0, -38, 8, t * 3.2);
}

function placeDizzyBubble(s: TankSprite) {
  paintDizzyBubble(s.flame, s.flameT);
  const pop = s.flameT < 0.2 ? 0.58 + (s.flameT / 0.2) * 0.42 : 1;
  const bob = Math.sin(s.flameT * 6) * 1.8;
  s.flame.visible = true;
  s.flame.scale.set(pop);
  s.flame.x = s.sprite.x + (s.sprite.scale.x >= 0 ? 8 : -8);
  s.flame.y = s.sprite.y - 10 + bob;
  s.heart.visible = false;
}

/** 喷香后：已选中的鱼 + 与锚点鱼可配对的异性对象才害羞。 */
function mateSprayShyTarget(anchor: TankFish, self: TankFish, gameDay: number): boolean {
  if (self.dead || anchor.dead) return false;
  if (self.tankId !== anchor.tankId) return false;
  return mateRefuseReason(anchor, self, gameDay) === null;
}

function paintSprayBurst(g: Graphics, t: number) {
  g.clear();
  const a = 1 - t;
  for (let i = 0; i < 9; i++) {
    const ang = (Math.PI * 2 * i) / 9 + t * 2.4;
    const r = 8 + t * 28;
    const px = Math.cos(ang) * r;
    const py = Math.sin(ang) * r * 0.55 - 6;
    g.circle(px, py, 3 + a * 5);
    g.fill({ color: 0xc8f0ff, alpha: 0.22 * a });
    g.circle(px, py, 1.8 + a * 2);
    g.fill({ color: 0xf8fdff, alpha: 0.45 * a });
  }
  g.circle(0, 0, 10 + t * 6);
  g.fill({ color: 0xe8f8ff, alpha: 0.35 * a });
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

function drawHeartShape(g: Graphics, x: number, y: number, size: number, color: number, alpha: number) {
  const s = size;
  g.moveTo(x, y + s * 0.32);
  g.bezierCurveTo(x - s * 1.05, y - s * 0.42, x - s * 0.52, y - s * 1.12, x, y - s * 0.42);
  g.bezierCurveTo(x + s * 0.52, y - s * 1.12, x + s * 1.05, y - s * 0.42, x, y + s * 0.32);
  g.fill({ color, alpha });
}

function spawnFeedHearts(s: TankSprite) {
  // 鱼身四周四溅：8～12 颗，径向爆开。
  const n = 8 + Math.floor(Math.random() * 5);
  const hearts: FeedHeartPt[] = [];
  for (let i = 0; i < n; i++) {
    const baseAng = (Math.PI * 2 * i) / n;
    hearts.push({
      ang: baseAng + (Math.random() - 0.5) * 0.55,
      r: 6 + Math.random() * 10,
      vr: 42 + Math.random() * 55,
      size: 5 + Math.random() * 12,
      phase: Math.random() * Math.PI * 2,
      delay: Math.random() * 0.1,
      color: FEED_HEART_COLORS[Math.floor(Math.random() * FEED_HEART_COLORS.length)]!,
    });
  }
  s.feedHearts = hearts;
}

/** 喂食成功：爱心从鱼身四溅散开。 */
function placeFeedHearts(s: TankSprite) {
  const g = s.flame;
  g.clear();
  const t = s.flameT;
  for (const h of s.feedHearts) {
    const localT = t - h.delay;
    if (localT <= 0) continue;
    const fadeIn = Math.min(1, localT / 0.08);
    const fadeOut = s.cueLeft < 0.4 ? s.cueLeft / 0.4 : 1;
    const alpha = fadeIn * fadeOut * 0.98;
    if (alpha <= 0.02) continue;
    // 径向爆开 + 轻微上飘。
    const ease = 1 - Math.pow(1 - Math.min(1, localT / 0.55), 2);
    const r = h.r + h.vr * ease;
    const spin = localT * 1.8;
    const x = Math.cos(h.ang + spin * 0.15) * r;
    const y = Math.sin(h.ang + spin * 0.15) * r - localT * 18;
    const pop = localT < 0.1 ? 0.4 + (localT / 0.1) * 0.7 : 1 - localT * 0.12;
    drawHeartShape(g, x, y, h.size * Math.max(0.35, pop), h.color, alpha);
  }
  s.flame.visible = true;
  s.flame.alpha = 1;
  s.flame.scale.set(1);
  s.flame.x = s.sprite.x;
  s.flame.y = s.sprite.y;
  s.heart.visible = false;
}

function clearFeedCue(s: TankSprite) {
  s.feedCue = "none";
  s.flickLeft = 0;
  s.cueLeft = 0;
  s.sprite.rotation = 0;
  s.feedHearts = [];
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
  s.feedHearts = [];
}

/** 抛洒吃到粮：立刻四溅爱心（不走嫌弃/点选那套气泡）。 */
function burstEatHearts(s: TankSprite) {
  if (s.dead) return;
  s.reactLeft = 0;
  s.gentleReact = false;
  s.flame.visible = false;
  s.heart.visible = false;
  s.feedCue = "eat";
  s.flickLeft = 0;
  s.cueLeft = FEED_EAT_BUBBLE_SECS;
  s.flameT = 0;
  s.fleeLeft = 0;
  s.fleeKind = "none";
  spawnFeedHearts(s);
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
  tankQuality,
}: {
  fish?: TankFish[];
  tankId?: string;
  eggs?: TankEgg[];
  allowCleanDead?: boolean;
  /** 参观馆等场景传入缸品质；默认读当前活跃缸。 */
  tankQuality?: Quality;
} = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const spritesRef = useRef<Map<string, TankSprite>>(new Map());
  const eggsRef = useRef<Map<string, EggSprite>>(new Map());
  const panRef = useRef(0);
  const tankSpanRef = useRef<1 | 2>(2);
  const bgLayoutRef = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const save = useGame((s) => s.save);
  const gameDayRef = useRef(save.gameDay);
  gameDayRef.current = save.gameDay;
  const selectedUid = useGame((s) => s.selectedTankUid);
  const tankCue = useUi((s) => s.tankCue);
  const scatterFeed = useUi((s) => s.tankScatterFeed);
  const scatterFeedRef = useRef(scatterFeed);
  scatterFeedRef.current = scatterFeed;
  const feedPanelOpen = useUi((s) => s.feedPanelOpen);
  const feedPanelOpenRef = useRef(feedPanelOpen);
  feedPanelOpenRef.current = feedPanelOpen;
  const tankMateSpray = useUi((s) => s.tankMateSpray);
  const tankMateSprayRef = useRef(tankMateSpray);
  tankMateSprayRef.current = tankMateSpray;
  const matePick = useUi((s) => s.matePick);
  const matePickRef = useRef(matePick);
  matePickRef.current = matePick;
  const mateScentLotUid = useUi((s) => s.mateScentLotUid);
  const mateScentLotUidRef = useRef(mateScentLotUid);
  mateScentLotUidRef.current = mateScentLotUid;
  const sprayBurstsRef = useRef<SprayBurst[]>([]);
  const tryMateSprayOnFishRef = useRef<(uid: string) => void>(() => {});
  const matingSession = useUi((s) => s.matingSession);
  const matingSessionRef = useRef(matingSession);
  matingSessionRef.current = matingSession;
  const matingAnimRef = useRef<MatingAnim | null>(null);
  const eggFallRef = useRef<EggFall[]>([]);
  const selectedEggUid = useGame((s) => s.selectedEggUid);
  const selectedUidRef = useRef(selectedUid);
  selectedUidRef.current = selectedUid;
  const tankFish = fish ?? save.tank;
  const activeId = tankId ?? save.activeTankId;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const activeTank = save.tanks.find((t) => t.id === activeId);
  const quality = tankQuality ?? activeTank?.quality ?? "common";
  const tankSpan = tankViewSpan(quality);
  tankSpanRef.current = tankSpan;
  const tankEggs = eggs ?? save.eggs;
  const fishRef = useRef(tankFish);
  fishRef.current = tankFish;
  const fishSyncKey = tankFish
    .filter((f) => f.tankId === activeId)
    .map((f) => `${f.uid}:${f.healthMax ?? 100}:${f.dead ? 1 : 0}:${f.customName ?? ""}:${f.bodyBulk ?? 0}`)
    .join("|");
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
      const relayoutBg = () => {
        layoutBg(bgA, bgB, frameA, frameB, hit, app.screen.width, app.screen.height, tankSpanRef.current);
      };
      bgLayoutRef.current = relayoutBg;
      relayoutBg();
      world.addChild(bgA, bgB, hit, frameA, frameB);
      app.renderer.on("resize", () => {
        relayoutBg();
        app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height);
      });

      const clampPan = () => {
        const max = tankSpanRef.current === 2 ? Math.max(0, app.screen.width) : 0;
        panRef.current = Math.max(0, Math.min(max, panRef.current));
        world.x = -panRef.current;
      };

      let downOnBg = false;
    const pellets: Pellet[] = [];
    let pelletId = 0;

      const scatterFoodReady = () => {
        const { save } = useGame.getState();
        const foodId = save.equipped.food;
        return (save.foodStock[foodId] ?? 0) > 0;
      };

      const endScatterIfNoFood = () => {
        if (scatterFoodReady()) return;
        useUi.getState().setTankScatterFeed(false);
        useUi.getState().showToast("鱼粮不足");
      };

      const spawnPellet = (x: number, y: number) => {
      const foodId = useGame.getState().spawnScatterPellet();
      if (!foodId) {
        endScatterIfNoFood();
        return;
      }
      const box = swimBox(app.screen.width, app.screen.height, tankSpanRef.current);
      const px = Math.max(box.minX, Math.min(box.maxX, x));
      const py = Math.max(box.minY, Math.min(box.maxY, y));
      const g = new Graphics();
      g.circle(0, 0, 5);
      g.fill({ color: 0xc87820 });
      g.stroke({ width: 1.5, color: 0x8a5010 });
      g.x = px;
      g.y = py;
      g.zIndex = 9;
      g.eventMode = "none";
      world.addChild(g);
      pellets.push({ id: pelletId++, g, x: px, y: py, foodId });
      if (!scatterFoodReady()) endScatterIfNoFood();
    };

    const spawnSprayBurst = (x: number, y: number) => {
      const g = new Graphics();
      g.x = x;
      g.y = y;
      g.zIndex = 50;
      g.eventMode = "none";
      world.addChild(g);
      paintSprayBurst(g, 0);
      sprayBurstsRef.current.push({ g, life: 0, maxLife: SPRAY_BURST_SECS });
    };

    const clearMateSprayShyInTank = (tankId: string) => {
      for (const f of fishRef.current) {
        if (f.tankId !== tankId) continue;
        const sp = spritesRef.current.get(f.uid);
        if (!sp) continue;
        sp.shyBubbleLeft = 0;
        sp.dizzyBubbleLeft = 0;
        if (sp.feedCue === "none" && sp.reactLeft <= 0 && !sp.gentleReact) {
          sp.flame.visible = false;
        }
      }
    };

    const tryMateSprayOnFish = (uid: string) => {
      const cur = fishRef.current.find((x) => x.uid === uid);
      if (!cur) return;
      const spr = spritesRef.current.get(uid);
      if (!spr) return;
      const beforePick = matePickRef.current;
      const wasPicked = beforePick.includes(uid);

      if (!wasPicked) {
        if (beforePick.length === 0) {
          const reason = mateSelectBlockReason(cur);
          if (reason) {
            useUi.getState().showToast(reason);
            return;
          }
        } else if (beforePick.length === 1) {
          const first = fishRef.current.find((f) => f.uid === beforePick[0]);
          if (first) {
            const reason = mateRefuseReason(first, cur, gameDayRef.current);
            if (reason) {
              useUi.getState().showToast(reason);
              return;
            }
          }
        }
      }

      useUi.getState().toggleMatePick(uid);
      const afterPick = useUi.getState().matePick;
      spawnSprayBurst(spr.sprite.x, spr.sprite.y - 8);
      if (afterPick.length === 0) {
        clearMateSprayShyInTank(cur.tankId);
      }
      if (afterPick.length === 2) {
        const [a, b] = afterPick;
        const lotUid = mateScentLotUidRef.current;
        const ok = useGame.getState().sprayMatingScent(a, b, lotUid ?? "");
        if (!ok) {
          useUi.getState().clearMatePick();
          for (const id of [a, b]) {
            const sp = spritesRef.current.get(id);
            if (sp) clearMateCue(sp);
          }
        }
      }
    };
    tryMateSprayOnFishRef.current = tryMateSprayOnFish;

    hit.on("pointerdown", (e) => {
      if (scatterFeedRef.current) {
        const local = hit.toLocal(e.global);
        spawnPellet(local.x, local.y);
        return;
      }
      if (tankMateSprayRef.current) {
        const local = hit.toLocal(e.global);
        spawnSprayBurst(local.x, local.y);
        return;
      }
      downOnBg = true;
      dragging = true;
      moved = false;
      lastX = e.global.x;
      if (tankSpanRef.current === 2) hit.cursor = "grabbing";
    });
    hit.on("pointermove", (e) => {
      if (!dragging || tankSpanRef.current === 1) return;
        const dx = e.global.x - lastX;
        if (Math.abs(dx) > 4) moved = true;
        lastX = e.global.x;
        panRef.current -= dx;
        clampPan();
      });
      const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      hit.cursor = tankSpanRef.current === 2 ? "grab" : "default";
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
        const box = swimBox(w, h, tankSpanRef.current);
        const dt = 1 / 60;
        const session = matingSessionRef.current;
        let anim = matingAnimRef.current;
        if (!session) {
          matingAnimRef.current = null;
          anim = null;
        } else if (!anim || anim.fishA !== session.fishA || anim.fishB !== session.fishB) {
          const a = fishRef.current.find((f) => f.uid === session.fishA);
          const b = fishRef.current.find((f) => f.uid === session.fishB);
          if (a && b) {
            anim = {
              fishA: session.fishA,
              fishB: session.fishB,
              femaleUid: fishSex(a) === "female" ? a.uid : b.uid,
              phase: "approach",
              pauseLeft: 0,
              laid: false,
            };
            matingAnimRef.current = anim;
            eggFallRef.current = [];
          }
        }
        if (anim && session) {
          const sa = sprites.get(anim.fishA);
          const sb = sprites.get(anim.fishB);
          if (!sa || !sb || sa.dead || sb.dead) {
            useUi.getState().clearMatingSession();
            matingAnimRef.current = null;
            eggFallRef.current = [];
            if (sa) clearMateCue(sa);
            if (sb) clearMateCue(sb);
          } else if (anim.phase === "approach") {
            const dx = sb.sprite.x - sa.sprite.x;
            const dy = sb.sprite.y - sa.sprite.y;
            const d = Math.hypot(dx, dy) || 1;
            const lenA = swimLen(sa);
            const lenB = swimLen(sb);
            faceToward(sa, sb.sprite.x);
            faceToward(sb, sa.sprite.x);
            sa.gentleReact = false;
            sb.gentleReact = false;
            sa.shyBubbleLeft = 0;
            sb.shyBubbleLeft = 0;
            sa.flameT += dt;
            sb.flameT += dt;
            placeMateHeart(sa);
            placeMateHeart(sb);
            if (d < MATE_TOUCH_DIST) {
              anim.phase = "pause";
              anim.pauseLeft = MATE_PAUSE_SECS;
              sa.vx = 0;
              sa.vy = 0;
              sb.vx = 0;
              sb.vy = 0;
            } else {
              sa.vx = (dx / d) * lenA;
              sa.vy = (dy / d) * lenA;
              sb.vx = (-dx / d) * lenB;
              sb.vy = (-dy / d) * lenB;
              sa.sprite.x += sa.vx;
              sa.sprite.y += sa.vy;
              sb.sprite.x += sb.vx;
              sb.sprite.y += sb.vy;
            }
            placeFishOverlays(sa);
            placeFishOverlays(sb);
          } else if (anim.phase === "pause") {
            anim.pauseLeft = Math.max(0, anim.pauseLeft - dt);
            sa.flameT += dt;
            sb.flameT += dt;
            placeMateHeart(sa);
            placeMateHeart(sb);
            placeFishOverlays(sa);
            placeFishOverlays(sb);
            if (anim.pauseLeft <= 0 && !anim.laid) {
              anim.laid = true;
              const female = sprites.get(anim.femaleUid);
              const fx = female?.sprite.x ?? (sa.sprite.x + sb.sprite.x) / 2;
              const fy = female?.sprite.y ?? (sa.sprite.y + sb.sprite.y) / 2;
              const { eggUids } = useGame.getState().completeMating(anim.fishA, anim.fishB, { x: fx });
              const n = eggUids.length;
              const positions = eggUids.map((uid, i) => ({
                uid,
                x: fx + (i - (n - 1) / 2) * 5,
                y: box.maxY - 6 - (i % 2) * 3,
              }));
              if (positions.length > 0) useGame.getState().commitEggPositions(positions);
              eggFallRef.current = eggUids.map((uid, i) => ({
                uid,
                x: positions[i]?.x ?? fx + (i - (n - 1) / 2) * 5,
                y: fy + 12 + (i % 3) * 2,
                vy: 0,
                targetY: positions[i]?.y ?? box.maxY - 6 - (i % 2) * 3,
                done: n === 0,
              }));
              releaseMateFish(sa, sb);
              useUi.getState().clearMatingSession();
              matingAnimRef.current = null;
            }
          }
        }
        for (const ef of eggFallRef.current) {
          if (ef.done) continue;
          const eggSpr = eggsRef.current.get(ef.uid);
          if (!eggSpr) continue;
          ef.y = Math.min(ef.targetY, ef.y + EGG_SINK);
          eggSpr.g.x = ef.x;
          eggSpr.g.y = ef.y;
          if (ef.y >= ef.targetY - 0.5) {
            ef.done = true;
            eggSpr.falling = false;
          }
        }
        if (eggFallRef.current.length > 0 && eggFallRef.current.every((e) => e.done)) {
          eggFallRef.current = [];
        }
        for (const s of sprites.values()) {
          if (s.dead) {
            s.sprite.y = Math.min(box.maxY, s.sprite.y + 0.6);
            placeFishOverlays(s);
            s.flame.visible = false;
            s.heart.visible = false;
            s.trailPts = [];
            s.trail.clear();
            continue;
          }
          const dt = 1 / 60;
          if (s.aloofWindowLeft > 0) s.aloofWindowLeft = Math.max(0, s.aloofWindowLeft - dt);
          const mateAnim = matingAnimRef.current;
          const inMateMove =
            Boolean(
              mateAnim &&
                session &&
                (mateAnim.phase === "approach" || mateAnim.phase === "pause") &&
                (s.uid === session.fishA || s.uid === session.fishB),
            );
          if (inMateMove) {
            placeFishOverlays(s);
            continue;
          }
          const picked = selectedUidRef.current === s.uid;
          const mateMarked = matePickRef.current.includes(s.uid);
          const mateSlow = mateMarked ? MATE_APPROACH_SLOW : 1;
          const slow =
            (picked && (s.personality === "docile" || s.gentleReact) ? 0.12 : picked && s.personality === "timid" ? 0.5 : 1) *
            mateSlow;
          const raging = s.personality === "hot" && s.reactLeft > 0;
          const mul = PERSONALITY_SPEED[s.personality] * swimSpeedMultiplier(s.health, s.personality, s.healthMax);
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
                spawnFeedHearts(s);
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
            let chasingPellet = false;
            const saveNow = useGame.getState().save;
            const freshFish = saveNow.tank.find((x) => x.uid === s.uid);
            const canEatPellet =
              freshFish &&
              !freshFish.dead &&
              wantsFood(freshFish) &&
              canFeedFishToday(freshFish, gameDayRef.current) &&
              pellets.some((p) => canFeed(freshFish.defId, p.foodId));
            if (
              canEatPellet &&
              s.fleeLeft <= 0 &&
              s.flickLeft <= 0 &&
              pellets.length > 0
            ) {
              let nearest: Pellet | null = null;
              let best = PELLET_SEEK;
              for (const p of pellets) {
                if (!canFeed(freshFish!.defId, p.foodId)) continue;
                const d = Math.hypot(p.x - s.sprite.x, p.y - s.sprite.y);
                if (d < best) {
                  best = d;
                  nearest = p;
                }
              }
              if (nearest) {
                chasingPellet = true;
                // 朝向跟身体对粮，加死区，避免嘴偏移导致左右抖。
                const faceDx = nearest.x - s.sprite.x;
                if (Math.abs(faceDx) > 10) {
                  s.sprite.scale.x = Math.abs(s.sprite.scale.x) * (faceDx >= 0 ? 1 : -1);
                }
                const mouth = fishMouth(s);
                const dx = nearest.x - mouth.x;
                const dy = nearest.y - mouth.y;
                const d = Math.hypot(dx, dy) || 1;
                if (d < PELLET_MOUTH_R) {
                  const result = useGame.getState().eatScatterPellet(s.uid, nearest.foodId);
                  if (result === "ate") {
                    world.removeChild(nearest.g);
                    nearest.g.destroy();
                    const idx = pellets.indexOf(nearest);
                    if (idx >= 0) pellets.splice(idx, 1);
                    const fresh = useGame.getState().save.tank.find((x) => x.uid === s.uid);
                    if (fresh) {
                      s.health = fresh.health;
                      s.healthMax = fishHealthMax(fresh);
                      applyFishSpriteSize(s, { healthMax: s.healthMax, bodyBulk: s.bodyBulk });
                    }
                    burstEatHearts(s);
                  } else {
                    s.vx = (-dx / d) * len;
                    s.vy = (-dy / d) * len;
                    if (result === "full") useUi.getState().showToast("今天吃饱了");
                  }
                } else {
                  const chaseLen = len * PELLET_CHASE_SPEED;
                  s.vx = (dx / d) * chaseLen;
                  s.vy = (dy / d) * chaseLen;
                  s.sprite.x += s.vx * slow;
                  s.sprite.y += s.vy * slow;
                }
              }
            }
            if (!chasingPellet) {
              s.sprite.x += s.vx * slow;
              s.sprite.y += s.vy * slow;
              s.sprite.scale.x = Math.abs(s.sprite.scale.x) * (s.vx >= 0 ? 1 : -1);
            }
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
          placeFishOverlays(s);
          for (const p of s.trailPts) p.life -= dt * 1.6;
          s.trailPts = s.trailPts.filter((p) => p.life > 0);
          if (s.trailPts.length > 48) s.trailPts.splice(0, s.trailPts.length - 48);
          paintTrail(s.trail, s.trailPts);
          if (s.feedCue === "eat" && s.cueLeft > 0) {
            s.cueLeft = Math.max(0, s.cueLeft - dt);
            s.flameT += dt;
            placeFeedHearts(s);
            if (s.cueLeft <= 0) {
              s.feedCue = "none";
              s.feedHearts = [];
              s.flame.visible = false;
              s.flame.clear();
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
          } else if (s.dizzyBubbleLeft > 0) {
            s.dizzyBubbleLeft = Math.max(0, s.dizzyBubbleLeft - dt);
            s.flameT += dt;
            placeDizzyBubble(s);
            if (s.dizzyBubbleLeft < 0.3) s.flame.alpha = s.dizzyBubbleLeft / 0.3;
            else s.flame.alpha = 1;
            if (s.dizzyBubbleLeft <= 0) {
              s.flame.visible = false;
              s.flame.scale.set(1);
              s.flame.alpha = 1;
            }
            s.heart.visible = false;
          } else if (tankMateSprayRef.current && !matingSessionRef.current) {
            const self = fishRef.current.find((f) => f.uid === s.uid);
            const picks = matePickRef.current;
            const anchor = picks.length > 0 ? fishRef.current.find((f) => f.uid === picks[0]) : null;
            const showShy =
              Boolean(
                self &&
                  anchor &&
                  (picks.includes(s.uid) ||
                    mateSprayShyTarget(anchor, self, gameDayRef.current)),
              );
            if (
              self &&
              self.tankId === activeIdRef.current
            ) {
              if (showShy && canMateFish(self)) {
                s.flameT += dt;
                placeShyBubble(s);
                s.flame.alpha = 1;
                s.heart.visible = false;
              } else if (!anchor && canMateFish(self)) {
                s.flameT += dt;
                placeFlowerBubble(s);
              } else {
                s.flame.visible = false;
                s.heart.visible = false;
              }
            }
          } else if (s.shyBubbleLeft > 0) {
            s.shyBubbleLeft = Math.max(0, s.shyBubbleLeft - dt);
            s.flameT += dt;
            placeShyBubble(s);
            if (s.shyBubbleLeft < 0.28) s.flame.alpha = s.shyBubbleLeft / 0.28;
            else s.flame.alpha = 1;
            if (s.shyBubbleLeft <= 0) {
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
        for (let i = pellets.length - 1; i >= 0; i--) {
          const p = pellets[i];
          if (p.y < box.maxY) {
            p.y = Math.min(box.maxY, p.y + PELLET_SINK);
          }
          p.g.y = p.y;
        }
        const bursts = sprayBurstsRef.current;
        for (let i = bursts.length - 1; i >= 0; i--) {
          const b = bursts[i];
          b.life += dt;
          const t = b.life / b.maxLife;
          if (t >= 1) {
            world.removeChild(b.g);
            b.g.destroy();
            bursts.splice(i, 1);
          } else {
            paintSprayBurst(b.g, t);
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
      for (const b of sprayBurstsRef.current) {
        b.g.destroy();
      }
      sprayBurstsRef.current = [];
      setReady(false);
      bgLayoutRef.current = null;
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
    panRef.current = 0;
    if (worldRef.current) worldRef.current.x = 0;
    bgLayoutRef.current?.();
    const app = appRef.current;
    if (!app) return;
    const box = swimBox(app.screen.width, app.screen.height, tankSpan);
    for (const s of spritesRef.current.values()) {
      s.sprite.x = Math.max(box.minX, Math.min(box.maxX, s.sprite.x));
      s.sprite.y = Math.max(box.minY, Math.min(box.maxY, s.sprite.y));
      placeFishOverlays(s);
    }
  }, [tankSpan]);

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
          const baseScale = target / Math.max(tex.width, tex.height);
          sprite.hitArea = new Circle(0, 0, Math.max(tex.width, tex.height) * 0.48);
          const box = swimBox(app.screen.width, app.screen.height, tankSpan);
          const juvenile = fishHealthMax(f) < 100;
          // 鱼苗散在游动区中下段，避免全挤在左右底角。
          if (juvenile) {
            const padX = Math.max(40, (box.maxX - box.minX) * 0.12);
            sprite.x = box.minX + padX + Math.random() * Math.max(40, box.maxX - box.minX - padX * 2);
            sprite.y = box.minY + (box.maxY - box.minY) * (0.45 + Math.random() * 0.4);
          } else {
            sprite.x = box.minX + Math.random() * (box.maxX - box.minX);
            sprite.y = box.minY + Math.random() * (box.maxY - box.minY);
          }
          sprite.eventMode = scatterFeedRef.current || feedPanelOpenRef.current ? "none" : "static";
          sprite.cursor = scatterFeedRef.current || feedPanelOpenRef.current ? "default" : "pointer";
          sprite.zIndex = 10;
          sprite.on("pointerdown", (e) => {
            if (scatterFeedRef.current || feedPanelOpenRef.current) return;
            e.stopPropagation();
            if (tankMateSprayRef.current) {
              tryMateSprayOnFishRef.current(f.uid);
              return;
            }
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
              const box = swimBox(appNow.screen.width, appNow.screen.height, tankSpanRef.current);
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
          const nameLabel = new Text({
            text: "",
            style: {
              fontFamily: "Segoe UI, PingFang SC, Microsoft YaHei, sans-serif",
              fontSize: 13,
              fontWeight: "600",
              fill: 0xffffff,
              align: "center",
            },
          });
          nameLabel.anchor.set(0.5, 1);
          nameLabel.eventMode = "none";
          nameLabel.zIndex = 47;
          nameLabel.visible = false;
          const trail = new Graphics();
          trail.eventMode = "none";
          trail.zIndex = 9;
          world.addChild(trail, sprite, ring, flame, heart, nameLabel);
          const angle = Math.random() * Math.PI * 2;
          sprite.scale.set(baseScale);
          s = {
            uid: f.uid,
            sprite,
            ring,
            flame,
            heart,
            nameLabel,
            trail,
            baseScale,
            healthMax: fishHealthMax(f),
            bodyBulk: f.bodyBulk,
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
            feedHearts: [],
            shyBubbleLeft: 0,
            dizzyBubbleLeft: 0,
          };
          sprites.set(f.uid, s);
        }
        s.dead = f.dead;
        s.personality = f.personality ?? "docile";
        s.health = f.health;
        s.healthMax = fishHealthMax(f);
        s.bodyBulk = f.bodyBulk;
        applyFishSpriteSize(s, f);
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
          s.feedHearts = [];
          s.gentleReact = false;
          s.shyBubbleLeft = 0;
          s.dizzyBubbleLeft = 0;
          s.sprite.rotation = 0;
          s.trailPts = [];
          s.trail.clear();
        }
        syncFishNameLabel(s, f.customName);
        paintRing(s.ring, selectedUid === f.uid || matePick.includes(f.uid));
        placeFishOverlays(s);
      }

      for (const [uid, s] of sprites) {
        if (!presentUids.has(uid)) {
          world.removeChild(s.sprite);
          world.removeChild(s.ring);
          world.removeChild(s.flame);
          world.removeChild(s.heart);
          world.removeChild(s.nameLabel);
          world.removeChild(s.trail);
          s.sprite.destroy();
          s.ring.destroy();
          s.flame.destroy();
          s.heart.destroy();
          s.nameLabel.destroy();
          s.trail.destroy();
          sprites.delete(uid);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fishSyncKey, tankFish, activeId, selectedUid, matePick, ready]);

  useEffect(() => {
    if (!ready) return;
    const block = scatterFeed || feedPanelOpen;
    for (const s of spritesRef.current.values()) {
      s.sprite.eventMode = block ? "none" : "static";
      s.sprite.cursor = block ? "default" : "pointer";
    }
  }, [scatterFeed, feedPanelOpen, ready, fishSyncKey]);

  useEffect(() => {
    if (!ready || tankMateSpray) return;
    for (const s of spritesRef.current.values()) {
      if (s.dizzyBubbleLeft > 0 || s.shyBubbleLeft > 0 || s.feedCue !== "none" || s.reactLeft > 0) continue;
      s.flame.visible = false;
      s.heart.visible = false;
      s.heart.text = "❤️";
      s.heart.style.fontSize = 22;
    }
  }, [tankMateSpray, ready]);

  useEffect(() => {
    if (!tankCue || !ready) return;
    const app = appRef.current;
    const spr = spritesRef.current.get(tankCue.uid);
    if (!app || !spr) return;
    const box = swimBox(app.screen.width, app.screen.height, tankSpan);
    if (tankCue.kind === "refuse") startRefuseFeed(spr, box);
    else startEatFeed(spr);
  }, [tankCue, ready, tankSpan]);

  useEffect(() => {
    const app = appRef.current;
    const world = worldRef.current;
    if (!app || !world || !ready) return;
    const eggs = eggsRef.current;
    const visibleEggs = tankEggs.filter((e) => e.tankId === activeId);
    const present = new Set(visibleEggs.map((e) => e.uid));
    visibleEggs.forEach((egg, i) => {
      let s = eggs.get(egg.uid);
      const fall = eggFallRef.current.find((f) => f.uid === egg.uid);
      if (!s) {
        const g = new Graphics();
        g.eventMode = "static";
        g.cursor = "pointer";
        g.zIndex = 12;
        const box = swimBox(app.screen.width, app.screen.height, tankSpan);
        if (fall) {
          g.x = fall.x;
          g.y = fall.y;
        } else if (egg.spawnX != null) {
          g.x = egg.spawnX;
          g.y = egg.spawnY ?? box.maxY - 6 - (i % 2) * 3;
        } else {
          g.x = box.minX + 28 + (i * 12) % Math.max(40, box.maxX - box.minX - 56);
          g.y = box.maxY - (i % 3) * 4;
        }
        g.on("pointerdown", (e) => {
          e.stopPropagation();
          const cur = useGame.getState().selectedEggUid;
          useGame.getState().selectEgg(cur === egg.uid ? null : egg.uid);
        });
        world.addChild(g);
        s = { uid: egg.uid, g, falling: Boolean(fall) };
        eggs.set(egg.uid, s);
      } else if (fall && !fall.done) {
        s.falling = true;
        s.g.x = fall.x;
        s.g.y = fall.y;
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
  }, [tankEggs, activeId, selectedEggUid, ready, tankSpan]);

  return (
    <div
      ref={containerRef}
      className={`tank-canvas tank-span-${tankSpan}${scatterFeed ? " is-scatter-feed" : ""}${tankMateSpray ? " is-mate-spray" : ""}`}
    />
  );
}
