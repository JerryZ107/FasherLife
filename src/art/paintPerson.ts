import { Container, Graphics } from "pixi.js";
import type { OutfitLook, Sex } from "../types";
import { OUTFIT_BY_ID } from "../data/outfitDefs";

/** 和鱼立绘同一套 Q 版：大头、厚描边、亮眼睛、软高光。 */
export type PersonPose = "stand" | "sit";

export type PersonOpts = {
  sex: Sex;
  look: OutfitLook;
  pose?: PersonPose;
  facingLeft?: boolean;
  t?: number;
  /** 0 垂臂，1 满弓后甩。 */
  armLift?: number;
};

export type Pen = {
  ellipse(x: number, y: number, rx: number, ry: number): void;
  roundRect(x: number, y: number, w: number, h: number, r: number): void;
  circle(x: number, y: number, r: number): void;
  fill(color: number, alpha?: number): void;
  stroke(color: number, width: number, alpha?: number): void;
};

const INK = 0x2a1a0c;

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

function ink(p: Pen, color: number, line = 2.05, alpha = 1) {
  p.fill(color, alpha);
  p.stroke(INK, line, 0.95);
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
};

function palette(look: OutfitLook, female: boolean): Palette {
  const hair = female
    ? look === "festival" ? 0x2a1210 : look === "tide" ? 0x1a2438 : 0x4a2818
    : look === "festival" ? 0x1a1008 : 0x3d2414;
  if (look === "rain") {
    return {
      cloth: 0xc49a48,
      clothDark: 0x8a6230,
      clothLight: 0xe8c878,
      pants: 0x4a311c,
      shoes: 0x3d2918,
      accent: 0x6b4422,
      hat: 0xe0b03a,
      hatDark: 0xa06a18,
      inner: 0x5c3a20,
      hair,
    };
  }
  if (look === "shell") {
    return {
      cloth: 0xff8a3a,
      clothDark: 0xd45a18,
      clothLight: 0xffc08a,
      pants: 0x3a4a58,
      shoes: 0x2a2a32,
      accent: 0xffe08a,
      hat: 0x4a5a68,
      hatDark: 0x2a3844,
      inner: 0x2a2a38,
      hair,
    };
  }
  if (look === "tide") {
    return {
      cloth: 0x3aa0c8,
      clothDark: 0x1d6a8a,
      clothLight: 0x8ad4f0,
      pants: 0x1c3a50,
      shoes: 0x12202c,
      accent: 0xb8eeff,
      hat: 0x1c4a72,
      hatDark: 0x12243c,
      inner: 0x2a5a7a,
      hair,
    };
  }
  if (look === "festival") {
    return {
      cloth: 0xef3a52,
      clothDark: 0xb01c34,
      clothLight: 0xff8aa0,
      pants: 0x3a1a14,
      shoes: 0x2a100c,
      accent: 0xffe08a,
      hat: 0xef3a52,
      hatDark: 0x8a1428,
      inner: 0xfff4d0,
      hair,
    };
  }
  return {
    cloth: 0x6bb04a,
    clothDark: 0x3d7a28,
    clothLight: 0xa8d86a,
    pants: 0x4a6a9a,
    shoes: 0x6b4422,
    accent: 0xffe08a,
    hat: 0xe8b84a,
    hatDark: 0xb07a20,
    inner: 0xfff6e8,
    hair,
  };
}

export function paintPerson(p: Pen, opts: PersonOpts) {
  const female = opts.sex === "female";
  const sit = opts.pose === "sit";
  const look = opts.look;
  const pal = palette(look, female);
  const flip = opts.facingLeft ? -1 : 1;
  const t = opts.t ?? 0;
  const bob = Math.sin(t * 8) * (sit ? 0.35 : 0.55);
  const lift = Math.max(0, Math.min(1, opts.armLift ?? (sit ? 0.55 : 0.12)));
  const skin = 0xffd4a8;
  const skinDeep = 0xe8a878;

  p.ellipse(0, sit ? 9 : 8, sit ? 15 : 13, 4.6);
  p.fill(0x000000, 0.28);

  const torsoY = sit ? -10 + bob : -8 + bob;
  const headY = sit ? -27 + bob : -26 + bob;

  paintBackArm(p, pal, flip, torsoY, sit);
  paintLegs(p, pal, sit, bob);
  paintBody(p, pal, look, sit, torsoY);
  paintFrontArm(p, pal, skin, flip, torsoY, sit, lift);
  paintHairBack(p, pal, female, look, headY, flip);
  paintHead(p, skin, skinDeep, female, headY, flip);
  paintHat(p, pal, look, female, headY, flip);
}

function paintBackArm(p: Pen, pal: Palette, flip: number, torsoY: number, sit: boolean) {
  const x = -11 * flip;
  p.ellipse(x, torsoY + (sit ? 8 : 6), 4.2, sit ? 7 : 6.2);
  ink(p, pal.cloth, 1.9);
  p.circle(x, torsoY + (sit ? 14 : 12), 3.1);
  ink(p, 0xffd4a8, 1.7);
}

function paintLegs(p: Pen, pal: Palette, sit: boolean, bob: number) {
  if (sit) {
    p.ellipse(-5, 4 + bob, 7.2, 4.2);
    ink(p, pal.pants, 1.9);
    p.ellipse(6, 4 + bob, 7.2, 4.2);
    ink(p, pal.pants, 1.9);
    p.ellipse(-8, 8 + bob, 4.4, 2.6);
    ink(p, pal.shoes, 1.8);
    p.ellipse(9, 8 + bob, 4.4, 2.6);
    ink(p, pal.shoes, 1.8);
    return;
  }
  p.ellipse(-5, 1 + bob, 4.4, 6.4);
  ink(p, pal.pants, 1.9);
  p.ellipse(5, 1 + bob, 4.4, 6.4);
  ink(p, pal.pants, 1.9);
  p.ellipse(-5.2, 7.2 + bob, 4.6, 2.5);
  ink(p, pal.shoes, 1.8);
  p.ellipse(5.2, 7.2 + bob, 4.6, 2.5);
  ink(p, pal.shoes, 1.8);
  p.ellipse(-4, 6.2 + bob, 1.6, 0.7);
  p.fill(0xfff4c8, 0.35);
}

function paintBody(p: Pen, pal: Palette, look: OutfitLook, sit: boolean, torsoY: number) {
  const h = sit ? 16 : 15;
  p.ellipse(0, torsoY + 4, sit ? 13 : 11.5, h * 0.58);
  ink(p, pal.cloth, 2.15);

  if (look === "casual") {
    p.ellipse(0, torsoY + 5, 8.5, 7);
    ink(p, pal.inner, 1.7);
    p.roundRect(-12, torsoY - 1, 24, 7, 4);
    ink(p, pal.cloth, 1.9);
    p.circle(-4, torsoY + 1, 1.15);
    ink(p, pal.accent, 1.2);
    p.circle(4, torsoY + 1, 1.15);
    ink(p, pal.accent, 1.2);
    p.ellipse(-4, torsoY, 4, 1.6);
    p.fill(0xffffff, 0.28);
  } else if (look === "rain") {
    p.ellipse(0, torsoY + 6, 14.5, 8.5);
    ink(p, pal.clothLight, 2.1);
    p.ellipse(0, torsoY + 10, 13, 6);
    ink(p, pal.clothDark, 1.9);
    p.roundRect(-1.2, torsoY - 1, 2.4, 14, 1);
    p.fill(pal.hatDark, 0.55);
    p.stroke(INK, 1.3);
    for (let i = 0; i < 4; i++) {
      p.ellipse(-8 + i * 5.2, torsoY + 5, 2.2, 3.4);
      p.fill(pal.hatDark, 0.18);
    }
  } else if (look === "shell") {
    p.ellipse(0, torsoY + 3, 13, 9);
    ink(p, pal.cloth, 2.15);
    p.roundRect(-1.4, torsoY - 2, 2.8, 13, 1.2);
    ink(p, pal.accent, 1.5);
    p.circle(0, torsoY + 2, 1.3);
    ink(p, pal.hatDark, 1.2);
    p.circle(0, torsoY + 6, 1.3);
    ink(p, pal.hatDark, 1.2);
    p.ellipse(-5, torsoY - 1, 5, 2.2);
    p.fill(0xffffff, 0.32);
    p.roundRect(-12, torsoY + 9, 24, 5, 3);
    ink(p, pal.pants, 1.8);
  } else if (look === "tide") {
    p.ellipse(0, torsoY + 4, 12, 8.5);
    ink(p, pal.cloth, 2.1);
    p.roundRect(-11, torsoY + 2, 22, 3.2, 2);
    ink(p, pal.accent, 1.5);
    p.ellipse(-4, torsoY - 1, 5, 2);
    p.fill(0xffffff, 0.4);
  } else {
    p.ellipse(0, torsoY + 4, 12, 8);
    ink(p, pal.cloth, 2.1);
    p.roundRect(-11, torsoY + 8, 22, 4, 2);
    ink(p, pal.accent, 1.7);
    p.ellipse(0, torsoY + 3, 4.5, 5);
    ink(p, pal.inner, 1.6);
  }
}

function paintFrontArm(
  p: Pen,
  pal: Palette,
  skin: number,
  flip: number,
  torsoY: number,
  sit: boolean,
  lift: number,
) {
  const ax = 11 * flip;
  const ay = torsoY + 2 - lift * 10;
  p.ellipse(ax, ay + 3, 4.4, sit ? 7.2 : 6.4);
  ink(p, pal.cloth, 1.95);
  const hx = ax + (5 + lift * 7) * flip;
  const hy = ay - 1 - lift * 8;
  p.ellipse((ax + hx) / 2, (ay + hy) / 2, 3.2 + lift * 2, 3.4);
  ink(p, pal.clothDark, 1.8);
  p.circle(hx, hy, 3.3);
  ink(p, skin, 1.7);
  p.ellipse(hx - 0.8 * flip, hy - 1, 1.3, 0.8);
  p.fill(0xffffff, 0.35);
}

function paintHairBack(p: Pen, pal: Palette, female: boolean, look: OutfitLook, headY: number, flip: number) {
  if (female) {
    p.ellipse(-11 * flip, headY + 4, 5.2, 8);
    ink(p, pal.hair, 1.9);
    p.ellipse(11 * flip, headY + 4, 5.2, 8);
    ink(p, pal.hair, 1.9);
    if (look === "casual" || look === "shell") {
      p.ellipse(12 * flip, headY + 10, 3.2, 6);
      ink(p, pal.hair, 1.7);
    }
    if (look === "festival") {
      p.circle(-12 * flip, headY + 8, 3.4);
      ink(p, pal.accent, 1.6);
    }
    return;
  }
    p.ellipse(0, headY - 6, 13.5, 8);
    ink(p, pal.hair, 2);
}

function paintHead(p: Pen, skin: number, skinDeep: number, female: boolean, headY: number, flip: number) {
  p.circle(0, headY, 14.4);
  ink(p, skin, 2.25);
  p.ellipse(-3.5, headY - 5, 7, 4.5);
  p.fill(0xffffff, 0.32);
  p.ellipse(0, headY + 6, 8, 4);
  p.fill(skinDeep, 0.28);

  const eyeY = headY - 1.2;
  const eyeX = 5.4;
  paintEye(p, -eyeX * (flip < 0 ? -1 : 1), eyeY, female);
  paintEye(p, eyeX * (flip < 0 ? -1 : 1), eyeY, female);

  p.ellipse(-9.2, headY + 4.2, 3.2, 2);
  p.fill(0xff8aa0, 0.42);
  p.ellipse(9.2, headY + 4.2, 3.2, 2);
  p.fill(0xff8aa0, 0.42);

  p.ellipse(0, headY + 5.6, 2.4, 1.5);
  p.fill(skinDeep, 0.55);
  p.ellipse(0, headY + 8.4, 3.6, 2.4);
  ink(p, 0xffb090, 1.5);
  p.ellipse(0, headY + 8.6, 2.2, 1.2);
  p.fill(0xff6b7a, 0.7);
}

function paintEye(p: Pen, x: number, y: number, female: boolean) {
  p.ellipse(x, y, female ? 4.5 : 4.3, female ? 5.2 : 4.9);
  ink(p, 0xfff6e8, 1.7);
  p.ellipse(x, y + 0.4, 3.5, 4.1);
  p.fill(0x3a2418);
  p.stroke(INK, 1.3);
  p.ellipse(x, y + 0.8, 2.4, 3);
  p.fill(0x1a1008);
  p.ellipse(x - 1.1, y - 1.4, 1.55, 1.7);
  p.fill(0xffffff, 0.95);
  p.ellipse(x + 1.1, y + 1.6, 0.7, 0.75);
  p.fill(0xffffff, 0.8);
  if (female) {
    p.ellipse(x - 2.6, y - 4.4, 1.1, 0.55);
    ink(p, 0x1a1008, 1.1);
    p.ellipse(x, y - 4.8, 1.1, 0.55);
    ink(p, 0x1a1008, 1.1);
    p.ellipse(x + 2.4, y - 4.4, 1.1, 0.55);
    ink(p, 0x1a1008, 1.1);
  }
}

function paintHat(p: Pen, pal: Palette, look: OutfitLook, female: boolean, headY: number, flip: number) {
  p.ellipse(0, headY - 8.5, 11, 4.2);
  ink(p, pal.hair, 1.7);
  if (look === "rain") {
    p.ellipse(0, headY - 6, 18, 5);
    ink(p, pal.hatDark, 2.1);
    p.ellipse(0, headY - 8.5, 12.5, 6.5);
    ink(p, pal.hat, 2.15);
    p.ellipse(0, headY - 12, 5.5, 3.2);
    ink(p, pal.clothLight, 1.7);
    p.circle(0, headY - 15, 2.3);
    ink(p, pal.hatDark, 1.6);
    p.ellipse(-3, headY - 10, 4, 1.6);
    p.fill(0xffffff, 0.28);
    return;
  }
  if (look === "shell") {
    p.ellipse(0, headY - 9, 13, 7.5);
    ink(p, pal.hat, 2.1);
    p.ellipse(0, headY - 4, 15, 4);
    ink(p, pal.hatDark, 1.9);
    p.ellipse(-3, headY - 11, 5, 2.2);
    p.fill(0xffffff, 0.22);
    return;
  }
  if (look === "tide") {
    p.roundRect(-13, headY - 16, 26, 12, 6);
    ink(p, pal.hat, 2.1);
    p.ellipse(0, headY - 5, 14, 3.6);
    ink(p, pal.hatDark, 1.9);
    p.roundRect(-12, headY - 9, 24, 3, 2);
    ink(p, pal.accent, 1.5);
    p.ellipse(-4, headY - 14, 5, 2);
    p.fill(0xffffff, 0.28);
    return;
  }
  if (look === "festival") {
    p.ellipse(0, headY - 9, 14, 7);
    ink(p, pal.hat, 2.15);
    p.ellipse(0, headY - 4.5, 16, 3.4);
    ink(p, pal.accent, 1.9);
    p.circle(0, headY - 16, 2.6);
    ink(p, pal.accent, 1.6);
    if (female) {
      p.circle(-11 * flip, headY + 6, 3.2);
      ink(p, pal.accent, 1.6);
    }
    p.ellipse(-4, headY - 11, 4.5, 1.8);
    p.fill(0xffffff, 0.25);
    return;
  }
  p.ellipse(0, headY - 8, 13, 6.5);
  ink(p, pal.hat, 2.15);
  p.ellipse(0, headY - 4.2, 17.5, 4.2);
  ink(p, pal.hat, 2.2);
  p.ellipse(0, headY - 5, 14, 2);
  p.fill(pal.hatDark, 0.28);
  p.ellipse(-4, headY - 10, 5, 2);
  p.fill(0xffffff, 0.3);
  p.ellipse(-11.5 * flip, headY + 2, 3.2, 4.2);
  ink(p, pal.hair, 1.6);
  p.ellipse(10.5 * flip, headY + 1.5, 2.8, 3.6);
  ink(p, pal.hair, 1.6);
  if (female) {
    p.ellipse(-10 * flip, headY - 2, 3.5, 3);
    ink(p, pal.hair, 1.6);
  }
}

export function makePersonView(): { root: Container; body: Graphics } {
  const root = new Container();
  const body = new Graphics();
  root.addChild(body);
  return { root, body };
}

export function armLiftForMotion(
  motion: "idle" | "ready" | "charging" | "casting" | "waiting" | "reeling" | "fight" | "walk",
  charge: number,
  t: number,
): number {
  if (motion === "charging") return 0.72 + charge * 0.28;
  if (motion === "ready") return 0.7;
  if (motion === "casting") {
    const k = (t % 0.9) / 0.9;
    return k < 0.35 ? 0.95 : 0.95 - Math.min(1, (k - 0.35) / 0.4) * 0.55;
  }
  if (motion === "waiting") return 0.48;
  if (motion === "reeling") return 0.82;
  if (motion === "fight") return 0.5 + Math.sin(t * 14) * 0.12;
  if (motion === "walk") return 0.18;
  return 0.12;
}
