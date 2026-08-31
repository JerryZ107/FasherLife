import { Container, Graphics } from "pixi.js";
import type { OutfitLook, Sex } from "../types";
import { OUTFIT_BY_ID } from "../data/outfitDefs";

/** 星露谷式农场主：头约占身高三分之一，厚描边，靠剪影认服装。 */
export type PersonPose = "stand" | "sit";
export type PersonViewDir = "front" | "back";
export type MotionId = "idle" | "ready" | "charging" | "casting" | "waiting" | "reeling" | "fight" | "walk";

export type PersonOpts = {
  sex: Sex;
  look: OutfitLook;
  pose?: PersonPose;
  view?: PersonViewDir;
  facingLeft?: boolean;
  t?: number;
  armLift?: number;
  walking?: boolean;
  lean?: number;
  holdRod?: boolean;
  rodAngle?: number;
};

export type FishPose = {
  armLift: number;
  lean: number;
  rodAngle: number;
};

export type Pen = {
  ellipse(x: number, y: number, rx: number, ry: number): void;
  roundRect(x: number, y: number, w: number, h: number, r: number): void;
  circle(x: number, y: number, r: number): void;
  line(x1: number, y1: number, x2: number, y2: number): void;
  poly(pts: Array<readonly [number, number]>): void;
  fill(color: number, alpha?: number): void;
  stroke(color: number, width: number, alpha?: number): void;
};

const INK = 0x24160c;
const SKIN = 0xf3c39a;
const SKIN_DEEP = 0xd49a72;
const SKIN_SHADE = 0xe8b086;

export function lookOfOutfit(outfitId?: string | null): OutfitLook {
  return OUTFIT_BY_ID[outfitId ?? ""]?.look ?? "casual";
}

export function pixiPen(g: Graphics): Pen {
  return {
    ellipse(x, y, rx, ry) {
      g.ellipse(x, y, rx, ry);
    },
    roundRect(x, y, w, h, r) {
      g.roundRect(x, y, w, h, r);
    },
    circle(x, y, r) {
      g.circle(x, y, r);
    },
    line(x1, y1, x2, y2) {
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
    },
    poly(pts) {
      if (pts.length < 2) return;
      g.poly(
        pts.flatMap(([x, y]) => [x, y]),
        true,
      );
    },
    fill(color, alpha = 1) {
      g.fill({ color, alpha });
    },
    stroke(color, width, alpha = 1) {
      g.stroke({ color, width, alpha, cap: "round", join: "round" });
    },
  };
}

export function canvasPen(ctx: CanvasRenderingContext2D): Pen {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  return {
    ellipse(x, y, rx, ry) {
      ctx.beginPath();
      ctx.ellipse(x, y, Math.max(0.2, rx), Math.max(0.2, ry), 0, 0, Math.PI * 2);
    },
    roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    },
    circle(x, y, r) {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.2, r), 0, Math.PI * 2);
    },
    line(x1, y1, x2, y2) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    },
    poly(pts) {
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
    },
    fill(color, alpha = 1) {
      ctx.fillStyle = rgba(color, alpha);
      ctx.fill();
    },
    stroke(color, width, alpha = 1) {
      ctx.strokeStyle = rgba(color, alpha);
      ctx.lineWidth = width;
      ctx.stroke();
    },
  };
}

function rgba(color: number, alpha: number) {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function ink(p: Pen, color: number, line = 1.9, alpha = 1) {
  p.fill(color, alpha);
  p.stroke(INK, line, 0.96);
}

function wash(p: Pen, color: number, alpha = 1) {
  p.fill(color, alpha);
}

type Palette = {
  cloth: number;
  clothDark: number;
  clothLight: number;
  pants: number;
  shoes: number;
  accent: number;
  hat: number;
  hatDark: number;
  inner: number;
  hair: number;
  hairLight: number;
};

function palette(look: OutfitLook, female: boolean): Palette {
  const hair = female
    ? look === "festival"
      ? 0x2a1410
      : look === "tide"
        ? 0x1c2434
        : 0x6a3a1c
    : look === "festival"
      ? 0x1c120c
      : 0x5a3418;
  const hairLight = female ? 0x8a5228 : 0x7a4a24;
  if (look === "rain") {
    return {
      cloth: 0xd2a24a,
      clothDark: 0x8a6220,
      clothLight: 0xe8c878,
      pants: 0x4a321c,
      shoes: 0x3a2414,
      accent: 0x6b4422,
      hat: 0xe0b44a,
      hatDark: 0xa06a14,
      inner: 0x5c3a18,
      hair,
      hairLight,
    };
  }
  if (look === "shell") {
    return {
      cloth: 0xe07038,
      clothDark: 0xb04a18,
      clothLight: 0xf4a06a,
      pants: 0x3a4858,
      shoes: 0x242830,
      accent: 0xffe08a,
      hat: 0x4a5a68,
      hatDark: 0x2a3844,
      inner: 0x2a2c38,
      hair,
      hairLight,
    };
  }
  if (look === "tide") {
    return {
      cloth: 0x3a88b4,
      clothDark: 0x1c5a7a,
      clothLight: 0x7ec8e8,
      pants: 0x1c3448,
      shoes: 0x121c28,
      accent: 0xd8f4ff,
      hat: 0x1c4a72,
      hatDark: 0x12243c,
      inner: 0x2a5a7a,
      hair,
      hairLight,
    };
  }
  if (look === "festival") {
    return {
      cloth: 0xd43c48,
      clothDark: 0xa01c2c,
      clothLight: 0xf08090,
      pants: 0x3a1a14,
      shoes: 0x24100c,
      accent: 0xffe08a,
      hat: 0xd43c48,
      hatDark: 0x8a1428,
      inner: 0xfff4d0,
      hair,
      hairLight,
    };
  }
  return {
    cloth: 0x3d8c62,
    clothDark: 0x2a6244,
    clothLight: 0x7cbc7a,
    pants: 0x6b4a32,
    shoes: 0x5a3418,
    accent: 0xe8c878,
    hat: 0xe0b44a,
    hatDark: 0xa07a28,
    inner: 0xfff4dc,
    hair,
    hairLight,
  };
}

/** 0° 为竖直朝水面（屏幕上方）。正值顺时针，蓄力时竿向右后方躺倒。 */
export function poseForMotion(motion: MotionId, charge: number, t: number, elapsed = t): FishPose {
  const c = Math.max(0, Math.min(1, charge));
  if (motion === "charging") {
    return { armLift: 0.78 + c * 0.22, lean: 0.22 + c * 0.55, rodAngle: 44 + c * 34 };
  }
  if (motion === "ready") {
    return { armLift: 0.74, lean: 0.12, rodAngle: 36 };
  }
  if (motion === "casting") {
    const k = Math.max(0, Math.min(1, elapsed / 0.52));
    const snap = k < 0.28 ? k / 0.28 : 1;
    const follow = k < 0.28 ? 0 : (k - 0.28) / 0.72;
    return {
      armLift: 0.96 - follow * 0.4,
      lean: 0.72 - snap * 0.9,
      rodAngle: 78 - snap * 84 + follow * 20,
    };
  }
  if (motion === "waiting") {
    return {
      armLift: 0.52 + Math.sin(t * 1.35) * 0.03,
      lean: 0.04 + Math.sin(t * 1.35) * 0.03,
      rodAngle: 13 + Math.sin(t * 1.35) * 3.2,
    };
  }
  if (motion === "reeling") {
    const k = Math.max(0, Math.min(1, elapsed / 0.45));
    return { armLift: 0.56 + k * 0.28, lean: 0.16 + k * 0.22, rodAngle: 16 + k * 38 };
  }
  if (motion === "fight") {
    const s = Math.sin(t * 13);
    return { armLift: 0.62 + s * 0.16, lean: 0.18 + s * 0.16, rodAngle: 17 + s * 15 };
  }
  if (motion === "walk") return { armLift: 0.16, lean: 0, rodAngle: 12 };
  return { armLift: 0.1, lean: 0, rodAngle: 12 };
}

export function armLiftForMotion(motion: MotionId, charge: number, t: number): number {
  return poseForMotion(motion, charge, t, t).armLift;
}

export function paintPerson(p: Pen, opts: PersonOpts) {
  const female = opts.sex === "female";
  const sit = opts.pose === "sit";
  const back = opts.view === "back";
  const pal = palette(opts.look, female);
  const flip = opts.facingLeft ? -1 : 1;
  const t = opts.t ?? 0;
  const lift = Math.max(0, Math.min(1, opts.armLift ?? (sit ? 0.52 : 0.08)));
  const bob = Math.sin(t * (sit ? 4.2 : 5.6)) * (sit ? 0.14 : 0.26);
  const stride = opts.walking && !sit ? Math.sin(t * 11) : 0;
  const lean = opts.lean ?? 0;
  const holdRod = Boolean(opts.holdRod);
  const rodAngle = opts.rodAngle ?? (sit ? 16 : 12);

  p.ellipse(0, sit ? 13.4 : 11.4, sit ? 12.4 : 10.2, 2.7);
  wash(p, 0x000000, 0.22);

  if (back) paintBack(p, pal, opts.look, female, sit, flip, lift, lean, bob, holdRod, rodAngle);
  else paintFront(p, pal, opts.look, female, sit, flip, lift, stride, bob, lean);
}

function paintFront(
  p: Pen,
  pal: Palette,
  look: OutfitLook,
  female: boolean,
  sit: boolean,
  flip: number,
  lift: number,
  stride: number,
  bob: number,
  lean: number,
) {
  const sk = skeleton(sit, bob, lean);
  const hand = fishingHand(sk, flip, lift, true);
  paintArm(p, pal, -8.8 * flip + lean * 0.6 * flip, sk.collarY + 6.6 + stride * 0.6, 0.08, flip, false, look);
  paintLegs(p, pal, sit, bob, stride, flip, false, look);
  paintTorso(p, pal, look, sit, sk, female, false, flip);
  paintNeck(p, sk);
  paintHairBack(p, pal, female, look, sk.headY, flip, false);
  paintHead(p, pal, female, sk.headY, sk.headH, flip, false);
  paintHairFront(p, pal, female, look, sk.headY, flip);
  paintCollar(p, pal, look, sit, sk);
  paintHat(p, pal, look, female, sk.headY, flip, false);
  paintArm(p, pal, hand.sx, hand.sy, lift, flip, true, look);
}

function paintBack(
  p: Pen,
  pal: Palette,
  look: OutfitLook,
  female: boolean,
  sit: boolean,
  flip: number,
  lift: number,
  lean: number,
  bob: number,
  holdRod: boolean,
  rodAngle: number,
) {
  const sk = skeleton(sit, bob, lean);
  const hand = fishingHand(sk, flip, lift, true);
  paintStool(p, sit, bob);
  paintLegs(p, pal, sit, bob, 0, flip, true, look);
  paintArm(p, pal, -8.4 * flip, sk.collarY + 7.4, 0.1, flip, false, look);
  paintTorso(p, pal, look, sit, sk, female, true, flip);
  paintNeck(p, sk);
  paintHairBack(p, pal, female, look, sk.headY, flip, true);
  paintHead(p, pal, female, sk.headY, sk.headH, flip, true);
  paintCollar(p, pal, look, sit, sk);
  paintHat(p, pal, look, female, sk.headY, flip, true);
  paintCapeTail(p, pal, look, sit, sk, true);
  paintArm(p, pal, hand.sx, hand.sy, lift, flip, true, look);
  if (holdRod) paintRod(p, hand.hx, hand.hy, rodAngle, flip);
}

function skeleton(sit: boolean, bob: number, lean: number) {
  const back = lean * 2.15;
  const collarY = (sit ? -14.6 : -15.6) + bob + back;
  const headH = sit ? 14.8 : 15.6;
  const overlap = 2.2;
  const headY = collarY - headH / 2 + overlap + lean * 0.35;
  return {
    collarY,
    headY,
    headH,
    torsoH: sit ? 15.8 : 16.4,
    hipY: sit ? 3.2 + bob : 1.4 + bob,
  };
}

function fishingHand(sk: ReturnType<typeof skeleton>, flip: number, lift: number, front: boolean) {
  const sx = (front ? 8.6 : 7.8) * flip;
  const sy = sk.collarY + 5.1 - lift * 7.6;
  const hx = sx + (2.1 + lift * 6.3) * (front ? flip : -flip * 0.32);
  const hy = sy - lift * 8.1;
  return { sx, sy, hx, hy };
}

function paintStool(p: Pen, sit: boolean, bob: number) {
  if (!sit) return;
  const y = 7.2 + bob;
  p.ellipse(0, y + 6.2, 11, 2.2);
  wash(p, 0x000000, 0.16);
  p.roundRect(-9.4, y + 1.4, 3.1, 7.2, 1);
  ink(p, 0x6b4220, 1.55);
  p.roundRect(6.3, y + 1.4, 3.1, 7.2, 1);
  ink(p, 0x6b4220, 1.55);
  p.ellipse(0, y, 12.2, 3.4);
  ink(p, 0xc4894a, 1.85);
  p.ellipse(-2.4, y - 1.1, 6.2, 1.3);
  wash(p, 0xf0d080, 0.35);
}

function paintNeck(p: Pen, sk: ReturnType<typeof skeleton>) {
  p.roundRect(-2.6, sk.collarY - 3.2, 5.2, 5.8, 1.8);
  ink(p, SKIN, 1.5);
}

function paintCollar(
  p: Pen,
  pal: Palette,
  look: OutfitLook,
  sit: boolean,
  sk: ReturnType<typeof skeleton>,
) {
  const bw = sit ? 16.6 : 15.2;
  p.roundRect(-bw / 2 + 0.3, sk.collarY - 0.7, bw - 0.6, 3.6, 1.7);
  ink(p, look === "casual" ? pal.clothDark : pal.cloth, 1.65);
  p.poly([
    [-2.5, sk.collarY - 0.5],
    [0, sk.collarY + 2.6],
    [2.5, sk.collarY - 0.5],
  ]);
  ink(p, SKIN, 1.35);
}

function paintLegs(
  p: Pen,
  pal: Palette,
  sit: boolean,
  bob: number,
  stride: number,
  flip: number,
  back: boolean,
  look: OutfitLook,
) {
  const boot = look === "tide" || look === "shell";
  if (sit) {
    if (back) {
      p.roundRect(-9.6, 2.2 + bob, 8.8, 6.4, 2.4);
      ink(p, pal.pants, 1.75);
      p.roundRect(0.8, 2.2 + bob, 8.8, 6.4, 2.4);
      ink(p, pal.pants, 1.75);
      p.ellipse(-8.2, 8.6 + bob, 3.4, 2.2);
      ink(p, pal.pants, 1.5);
      p.ellipse(8.2, 8.6 + bob, 3.4, 2.2);
      ink(p, pal.pants, 1.5);
      p.roundRect(-10.4, 9.6 + bob, 6.4, 3.2, 1.3);
      ink(p, pal.shoes, 1.6);
      p.roundRect(4, 9.6 + bob, 6.4, 3.2, 1.3);
      ink(p, pal.shoes, 1.6);
      if (boot) {
        p.roundRect(-10.2, 7.4 + bob, 6.2, 3.4, 1.2);
        ink(p, pal.hatDark, 1.4);
        p.roundRect(4, 7.4 + bob, 6.2, 3.4, 1.2);
        ink(p, pal.hatDark, 1.4);
      }
      return;
    }
    p.roundRect(-11.4, 0.4 + bob, 10.8, 5.5, 2.3);
    ink(p, pal.pants, 1.8);
    p.roundRect(0.6, 0.4 + bob, 10.8, 5.5, 2.3);
    ink(p, pal.pants, 1.8);
    p.roundRect(-12, 4.6 + bob, 5.7, 6.2, 1.9);
    ink(p, pal.pants, 1.7);
    p.roundRect(6.3, 4.6 + bob, 5.7, 6.2, 1.9);
    ink(p, pal.pants, 1.7);
    p.roundRect(-12.6, 9.4 + bob, 7.1, 3.1, 1.3);
    ink(p, pal.shoes, 1.65);
    p.roundRect(5.5, 9.4 + bob, 7.1, 3.1, 1.3);
    ink(p, pal.shoes, 1.65);
    return;
  }
  const l = stride * 1.5;
  p.roundRect(-6.3 + l * 0.12 * flip, -2.2 + bob + Math.max(0, l), 5.7, 12.4, 2.1);
  ink(p, pal.pants, 1.8);
  p.roundRect(0.6 - l * 0.12 * flip, -2.2 + bob + Math.max(0, -l), 5.7, 12.4, 2.1);
  ink(p, pal.pants, 1.8);
  p.roundRect(-6.7, 8.4 + bob + Math.max(0, l), boot ? 6.6 : 6.4, boot ? 4.2 : 3.1, 1.3);
  ink(p, pal.shoes, 1.65);
  p.roundRect(0.3, 8.4 + bob + Math.max(0, -l), boot ? 6.6 : 6.4, boot ? 4.2 : 3.1, 1.3);
  ink(p, pal.shoes, 1.65);
}

function paintTorso(
  p: Pen,
  pal: Palette,
  look: OutfitLook,
  sit: boolean,
  sk: ReturnType<typeof skeleton>,
  female: boolean,
  back: boolean,
  flip: number,
) {
  const bw = (sit ? 16.8 : 15.2) * (female ? 0.94 : 1);
  const { collarY, torsoH } = sk;
  p.roundRect(-bw / 2, collarY, bw, torsoH, sit ? 4.2 : 3.5);
  ink(p, pal.cloth, 1.95);

  if (look === "casual") {
    p.roundRect(-bw / 2 + 1.4, collarY + 4, bw - 2.8, torsoH - 5.2, 2.2);
    ink(p, pal.inner, 1.45);
    p.roundRect(-bw / 2, collarY, bw, 5.4, 2.5);
    ink(p, pal.clothDark, 1.6);
    if (back) {
      p.line(-3.6, collarY + 1.2, -2.2, collarY + torsoH - 2);
      p.stroke(pal.accent, 1.45, 0.95);
      p.line(3.6, collarY + 1.2, 2.2, collarY + torsoH - 2);
      p.stroke(pal.accent, 1.45, 0.95);
    } else {
      p.line(-3.2, collarY + 5.2, -3.2, collarY + 11.8);
      p.stroke(pal.accent, 1.3, 0.9);
      p.line(3.2, collarY + 5.2, 3.2, collarY + 11.8);
      p.stroke(pal.accent, 1.3, 0.9);
      p.circle(-3.2, collarY + 6.8, 0.75);
      ink(p, pal.accent, 1);
      p.circle(3.2, collarY + 6.8, 0.75);
      ink(p, pal.accent, 1);
    }
  } else if (look === "rain") {
    p.poly([
      [-bw / 2 - 1.2, collarY + 1.6],
      [bw / 2 + 1.2, collarY + 1.6],
      [bw / 2 + 4.8, collarY + torsoH + 3.4],
      [-bw / 2 - 4.8, collarY + torsoH + 3.4],
    ]);
    ink(p, pal.cloth, 1.9);
    p.poly([
      [-bw / 2 + 0.6, collarY + 4.2],
      [bw / 2 - 0.6, collarY + 4.2],
      [bw / 2 + 2.6, collarY + torsoH + 0.6],
      [-bw / 2 - 2.6, collarY + torsoH + 0.6],
    ]);
    ink(p, pal.clothLight, 1.55);
    for (let i = -3; i <= 3; i++) {
      const x = i * 3.2;
      p.poly([
        [x - 1.5, collarY + torsoH + 3.1],
        [x, collarY + torsoH + 6.2],
        [x + 1.5, collarY + torsoH + 3.1],
      ]);
      ink(p, i % 2 ? pal.clothDark : pal.cloth, 1.25);
    }
  } else if (look === "shell") {
    p.roundRect(-bw / 2 - 0.8, collarY + 0.4, bw + 1.6, torsoH + 1.2, 4.4);
    ink(p, pal.cloth, 1.9);
    p.line(-bw / 2 + 1.4, collarY + 5.2, bw / 2 - 1.4, collarY + 5.2);
    p.stroke(pal.clothDark, 1.2, 0.7);
    p.line(-bw / 2 + 1.8, collarY + 9.2, bw / 2 - 1.8, collarY + 9.2);
    p.stroke(pal.clothDark, 1.2, 0.7);
    p.roundRect(-1.2, collarY + 1.4, 2.4, torsoH - 2.2, 1);
    ink(p, pal.accent, 1.3);
    if (!back) {
      p.circle(0, collarY + 5.4, 0.9);
      ink(p, pal.hatDark, 1);
      p.circle(0, collarY + 9.2, 0.9);
      ink(p, pal.hatDark, 1);
    }
  } else if (look === "tide") {
    p.roundRect(-bw / 2 + 0.5, collarY + 4.2, bw - 1, 2.3, 1);
    ink(p, pal.accent, 1.3);
    p.roundRect(-bw / 2 + 0.5, collarY + 9.8, bw - 1, 1.8, 1);
    ink(p, pal.hatDark, 1.2);
    p.roundRect(-bw / 2 - 0.4, collarY - 0.4, bw + 0.8, 4.4, 2);
    ink(p, pal.clothDark, 1.55);
  } else {
    p.roundRect(-bw / 2 + 0.6, collarY + torsoH - 4.2, bw - 1.2, 3.1, 1.2);
    ink(p, pal.accent, 1.4);
    if (back) {
      p.line(-bw / 2 + 2, collarY + 3.2, bw / 2 - 2.4, collarY + torsoH - 5);
      p.stroke(pal.inner, 2.1, 0.85);
    } else {
      p.ellipse(0, collarY + 6.2, 3.3, 3.6);
      ink(p, pal.inner, 1.35);
      if (female) {
        p.ellipse(0, collarY + 3.4, 4.6, 1.5);
        ink(p, pal.accent, 1.2);
      }
    }
  }

  p.ellipse(-bw / 2 + 3.6 * flip, collarY + 2.2, 3.1, 1.15);
  wash(p, 0xffffff, back ? 0.08 : 0.16);
}

function paintCapeTail(
  p: Pen,
  pal: Palette,
  look: OutfitLook,
  sit: boolean,
  sk: ReturnType<typeof skeleton>,
  back: boolean,
) {
  if (!back || look !== "rain") return;
  const y = sk.collarY + sk.torsoH + (sit ? 1.2 : 0.4);
  p.ellipse(0, y, sit ? 13 : 11.5, 3.2);
  ink(p, pal.clothDark, 1.5);
}

function paintArm(
  p: Pen,
  pal: Palette,
  x: number,
  y: number,
  lift: number,
  flip: number,
  front: boolean,
  look: OutfitLook,
) {
  const sleeve = front ? pal.cloth : pal.clothDark;
  const puff = look === "shell" || look === "rain" ? 1.18 : 1;
  p.ellipse(x, y + 3.0, 3.15 * puff, (5.3 + lift * 0.7) * puff);
  ink(p, sleeve, 1.7);
  const hx = x + (2.1 + lift * 6.3) * (front ? flip : -flip * 0.32);
  const hy = y - lift * 8.1;
  if (lift > 0.18) {
    p.ellipse((x + hx) / 2, (y + hy) / 2 + 0.7, 2.55 + lift, 3.05);
    ink(p, pal.clothDark, 1.5);
  }
  p.circle(hx, hy, 2.4);
  ink(p, SKIN, 1.5);
  p.ellipse(hx - 0.5 * flip, hy - 0.6, 0.8, 0.5);
  wash(p, 0xffffff, 0.22);
}

function paintRod(p: Pen, hx: number, hy: number, deg: number, flip: number) {
  const rad = (deg * Math.PI) / 180;
  const len = 27.5;
  const tx = hx + Math.sin(rad) * len * flip;
  const ty = hy - Math.cos(rad) * len;
  p.line(hx, hy + 1.2, tx, ty);
  p.stroke(INK, 3.15, 0.95);
  p.line(hx, hy + 1.2, tx, ty);
  p.stroke(0xe6c56a, 1.7);
  p.line(hx, hy + 1.2, hx + Math.sin(rad) * 7 * flip, hy - Math.cos(rad) * 7);
  p.stroke(0x6b4422, 2.35);
  p.roundRect(hx - 1.5, hy - 0.4, 3.1, 5.6, 1.1);
  ink(p, 0x5a3a20, 1.4);
  p.circle(hx + 2.35 * flip, hy + 2.4, 2.15);
  ink(p, 0x6a7a88, 1.35);
  p.circle(hx + 2.35 * flip, hy + 2.4, 0.7);
  wash(p, INK, 0.9);
  p.circle(tx, ty, 0.95);
  ink(p, 0x24160c, 1.15);
  p.circle(tx, ty, 0.35);
  wash(p, 0xf4d790);
}

function paintHairBack(
  p: Pen,
  pal: Palette,
  female: boolean,
  look: OutfitLook,
  headY: number,
  flip: number,
  back: boolean,
) {
  if (female) {
    if (look === "festival") {
      p.ellipse(-8.4 * flip, headY + 1.6, 3.6, 3.8);
      ink(p, pal.hair, 1.7);
      p.ellipse(8.2 * flip, headY + 1.6, 3.6, 3.8);
      ink(p, pal.hair, 1.7);
      p.circle(-8.4 * flip, headY + 1.2, 1.15);
      ink(p, pal.accent, 1.2);
      return;
    }
    p.ellipse(-8.4 * flip, headY + 6.6, 4.3, 8.2);
    ink(p, pal.hair, 1.75);
    p.ellipse(8.1 * flip, headY + 6.4, 4.1, 7.8);
    ink(p, pal.hair, 1.7);
    if (back) {
      p.ellipse(0, headY + 3.4, 9, 8.4);
      ink(p, pal.hair, 1.85);
    }
    return;
  }
  if (back) {
    p.ellipse(0, headY - 1.2, 8.4, 6.8);
    ink(p, pal.hair, 1.75);
    p.ellipse(0, headY + 3.6, 6.4, 3.4);
    ink(p, pal.hair, 1.45);
  }
}

function paintHead(
  p: Pen,
  pal: Palette,
  female: boolean,
  headY: number,
  headH: number,
  flip: number,
  back: boolean,
) {
  const hw = 15.0;
  p.ellipse(-7.7 * flip, headY + 0.5, 1.5, 2.15);
  ink(p, SKIN, 1.4);
  p.ellipse(7.7 * flip, headY + 0.5, 1.5, 2.15);
  ink(p, SKIN, 1.4);

  p.roundRect(-hw / 2, headY - headH / 2, hw, headH, 5.8);
  ink(p, SKIN, 2);
  p.ellipse(0, headY + 5.0, 6.0, 2.6);
  wash(p, SKIN_SHADE, 0.28);
  p.ellipse(-2.4, headY - 4.0, 4.0, 1.8);
  wash(p, 0xffffff, 0.14);

  if (back) {
    p.ellipse(0, headY - 1.2, 6.8, 4.6);
    wash(p, pal.hair, 0.45);
    p.ellipse(-5.2 * flip, headY - 3.4, 3.4, 3.0);
    ink(p, pal.hair, 1.4);
    p.ellipse(5.0 * flip, headY - 3.2, 3.2, 2.8);
    ink(p, pal.hair, 1.35);
    return;
  }

  p.ellipse(-4.7 * flip, headY - 4.6, 4.1, 3.0);
  ink(p, pal.hair, 1.45);
  p.ellipse(4.5 * flip, headY - 4.4, 3.9, 2.8);
  ink(p, pal.hair, 1.4);
  p.ellipse(0, headY - 6.0, 5.2, 2.4);
  ink(p, pal.hair, 1.35);

  paintEye(p, -3.05 * (flip < 0 ? -1 : 1), headY - 0.1, female);
  paintEye(p, 3.05 * (flip < 0 ? -1 : 1), headY - 0.1, female);

  p.ellipse(0, headY + 2.4, 1.05, 0.58);
  wash(p, SKIN_DEEP, 0.55);
  p.ellipse(0, headY + 4.7, 1.9, 0.85);
  wash(p, SKIN_DEEP, 0.72);
  p.ellipse(0, headY + 4.5, 1.0, 0.38);
  wash(p, 0xc45c58, 0.5);
  p.ellipse(-5.6, headY + 2.5, 1.9, 1.1);
  wash(p, 0xff8aa0, female ? 0.28 : 0.12);
  p.ellipse(5.6, headY + 2.5, 1.9, 1.1);
  wash(p, 0xff8aa0, female ? 0.28 : 0.12);
}

function paintEye(p: Pen, x: number, y: number, female: boolean) {
  p.ellipse(x, y, female ? 1.45 : 1.32, female ? 1.85 : 1.7);
  wash(p, 0x1a1008);
  p.stroke(INK, 0.95);
  p.ellipse(x - 0.4, y - 0.58, 0.42, 0.48);
  wash(p, 0xffffff, 0.95);
  if (female) {
    p.ellipse(x, y - 2.05, 1.45, 0.36);
    wash(p, 0x1a1008, 0.85);
  }
}

function paintHairFront(p: Pen, pal: Palette, female: boolean, look: OutfitLook, headY: number, flip: number) {
  if (look === "rain" || look === "shell" || look === "tide") return;
  p.ellipse(-3.6 * flip, headY - 5.0, 3.0, 2.0);
  wash(p, pal.hairLight, 0.28);
  if (female) {
    p.ellipse(-6.6 * flip, headY + 1.1, 2.3, 3.2);
    ink(p, pal.hair, 1.35);
  }
}

function paintHat(
  p: Pen,
  pal: Palette,
  look: OutfitLook,
  female: boolean,
  headY: number,
  flip: number,
  back: boolean,
) {
  if (look === "rain") {
    p.ellipse(0, headY - 2.8, 14.4, 3.4);
    ink(p, pal.hatDark, 1.95);
    p.poly([
      [-8.4, headY - 3.6],
      [0, headY - 16.2],
      [8.4, headY - 3.6],
    ]);
    ink(p, pal.hat, 2);
    p.ellipse(0, headY - 6.8, 4.6, 1.1);
    wash(p, pal.clothLight, 0.35);
    return;
  }
  if (look === "shell") {
    p.ellipse(0, headY - 6.2, 8.6, 5.8);
    ink(p, pal.hat, 1.9);
    p.ellipse(0, headY - 1.6, 9.6, 2.6);
    ink(p, pal.hatDark, 1.6);
    p.circle(0.4 * flip, headY - 11.6, 1.7);
    ink(p, pal.cloth, 1.35);
    if (!back) {
      p.roundRect(-6.0, headY - 8.2, 12.0, 1.8, 0.9);
      ink(p, pal.accent, 1.15);
    }
    return;
  }
  if (look === "tide") {
    p.roundRect(-8.8, headY - 12.0, 17.6, 8.4, 3.8);
    ink(p, pal.hat, 1.9);
    p.ellipse(0, headY - 3.4, 9.2, 2.3);
    ink(p, pal.hatDark, 1.6);
    p.roundRect(-8.0, headY - 6.2, 16.0, 1.9, 0.9);
    ink(p, pal.accent, 1.2);
    if (!back) {
      p.ellipse(0, headY - 1.2, 10.4, 2.2);
      ink(p, pal.hatDark, 1.45);
    }
    return;
  }
  if (look === "festival") {
    p.ellipse(0, headY - 6.6, 8.8, 4.8);
    ink(p, pal.hat, 1.95);
    p.ellipse(0, headY - 2.6, 10.2, 2.3);
    ink(p, pal.accent, 1.6);
    p.circle(0, headY - 12.0, 1.7);
    ink(p, pal.accent, 1.35);
    if (female && !back) {
      p.circle(-7.6 * flip, headY + 4.0, 1.9);
      ink(p, pal.accent, 1.35);
    }
    return;
  }
  p.ellipse(0, headY - 5.4, 8.5, 4.1);
  ink(p, pal.hat, 1.95);
  p.ellipse(0, headY - 2.4, 13.2, 3.0);
  ink(p, pal.hat, 2);
  p.ellipse(-1.6, headY - 6.2, 3.4, 1.2);
  wash(p, 0xfff4c8, 0.28);
  p.ellipse(0, headY - 3.0, 9.6, 1.15);
  wash(p, pal.hatDark, 0.32);
  if (!back) {
    p.roundRect(-3.6, headY - 4.0, 7.2, 1.45, 0.7);
    ink(p, pal.clothDark, 1.15);
  }
}

export function makePersonView(): { root: Container; body: Graphics } {
  const root = new Container();
  const body = new Graphics();
  root.addChild(body);
  return { root, body };
}
