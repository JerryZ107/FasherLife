/** 潜入关：竖屏世界（宽 72 × 高 150）。底部翻墙，顶部钓鱼区。 */

export interface TreeDef {
  x: number;
  y: number;
  r: number;
  losR: number;
  canopy: number;
}

export interface BushDef {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

export interface Guard {
  x: number;
  y: number;
  facing: number;
  kind: "patrol" | "sentry";
  path: { x: number; y: number }[];
  pathI: number;
  wait: number;
  hold: number;
  speed: number;
  range: number;
  fov: number;
  look: number[];
  lookI: number;
  turnSpeed: number;
}

export const WORLD_W = 72;
export const WORLD_H = 150;
export const START = { x: 36, y: 134 };
export const DROP_FROM = { x: 36, y: 146 };
export const GOAL = { y: 18, xMin: 22, xMax: 50 };
export const PLAYER_R = 2.2;
export const BUSH_SPOT_R = 6.2;
export const BODY_SPOT_R = 4.0;

export const TREES: TreeDef[] = [
  { x: 14, y: 40, r: 3.1, losR: 5.2, canopy: 8.8 },
  { x: 36, y: 48, r: 3.4, losR: 5.7, canopy: 10 },
  { x: 58, y: 40, r: 3.1, losR: 5.2, canopy: 8.8 },
  { x: 22, y: 64, r: 3.3, losR: 5.5, canopy: 9.4 },
  { x: 50, y: 72, r: 3.5, losR: 5.8, canopy: 10.2 },
  { x: 12, y: 82, r: 3.0, losR: 5.0, canopy: 8.4 },
  { x: 60, y: 86, r: 3.2, losR: 5.4, canopy: 9 },
  { x: 28, y: 100, r: 3.3, losR: 5.5, canopy: 9.2 },
  { x: 50, y: 110, r: 3.4, losR: 5.6, canopy: 9.6 },
  { x: 16, y: 118, r: 3.0, losR: 5.1, canopy: 8.6 },
];

export const BUSHES: BushDef[] = [
  { x: 10, y: 46, rx: 5.6, ry: 4.0 },
  { x: 62, y: 46, rx: 5.6, ry: 4.0 },
  { x: 36, y: 58, rx: 6.0, ry: 4.2 },
  { x: 8, y: 72, rx: 5.4, ry: 3.8 },
  { x: 64, y: 70, rx: 5.4, ry: 3.8 },
  { x: 36, y: 88, rx: 6.2, ry: 4.4 },
  { x: 10, y: 104, rx: 5.6, ry: 4.0 },
  { x: 62, y: 108, rx: 5.6, ry: 4.0 },
  { x: 22, y: 128, rx: 5.8, ry: 4.0 },
  { x: 50, y: 128, rx: 5.8, ry: 4.0 },
];

const DOWN = Math.PI / 2;
const LEFT = Math.PI;
const RIGHT = 0;

export function makeGuards(): Guard[] {
  return [
    {
      kind: "sentry",
      x: 36,
      y: 28,
      facing: DOWN,
      path: [{ x: 36, y: 28 }],
      pathI: 0,
      wait: 0.4,
      hold: 1.15,
      speed: 0,
      range: 27,
      fov: (32 * Math.PI) / 180,
      look: [DOWN, DOWN + 0.72, DOWN, DOWN - 0.72],
      lookI: 0,
      turnSpeed: 1.35,
    },
    {
      kind: "patrol",
      x: 16,
      y: 44,
      facing: RIGHT,
      path: [{ x: 16, y: 44 }, { x: 56, y: 44 }],
      pathI: 1,
      wait: 0,
      hold: 1.05,
      speed: 9.2,
      range: 18,
      fov: (42 * Math.PI) / 180,
      look: [],
      lookI: 0,
      turnSpeed: 0,
    },
    {
      kind: "patrol",
      x: 20,
      y: 74,
      facing: RIGHT,
      path: [
        { x: 20, y: 74 },
        { x: 52, y: 74 },
        { x: 52, y: 58 },
        { x: 20, y: 58 },
      ],
      pathI: 1,
      wait: 0.25,
      hold: 0.85,
      speed: 10.4,
      range: 20,
      fov: (46 * Math.PI) / 180,
      look: [],
      lookI: 0,
      turnSpeed: 0,
    },
    {
      kind: "patrol",
      x: 54,
      y: 108,
      facing: LEFT,
      path: [{ x: 18, y: 108 }, { x: 54, y: 108 }],
      pathI: 0,
      wait: 0.15,
      hold: 1.2,
      speed: 8.6,
      range: 17,
      fov: (40 * Math.PI) / 180,
      look: [],
      lookI: 0,
      turnSpeed: 0,
    },
  ];
}

export function inBush(px: number, py: number, b: BushDef): boolean {
  const dx = (px - b.x) / b.rx;
  const dy = (py - b.y) / b.ry;
  return dx * dx + dy * dy <= 1;
}

export function hiddenInBush(px: number, py: number): boolean {
  return BUSHES.some((b) => inBush(px, py, b));
}

export function losBlocked(ax: number, ay: number, bx: number, by: number): boolean {
  const len = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(8, Math.ceil(len / 1.4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    for (const tree of TREES) {
      if (Math.hypot(x - tree.x, y - tree.y) < tree.losR) return true;
    }
  }
  return false;
}

export function marchRay(ax: number, ay: number, ang: number, maxR: number): { x: number; y: number } {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const step = 0.7;
  for (let d = step; d < maxR; d += step) {
    const x = ax + dx * d;
    const y = ay + dy * d;
    if (x < 2 || x > WORLD_W - 2 || y < 4 || y > WORLD_H - 4) {
      return { x: ax + dx * (d - step), y: ay + dy * (d - step) };
    }
    for (const tree of TREES) {
      if (Math.hypot(x - tree.x, y - tree.y) < tree.losR) {
        const back = d - step;
        return { x: ax + dx * back, y: ay + dy * back };
      }
    }
  }
  return { x: ax + dx * maxR, y: ay + dy * maxR };
}

export function conePoints(g: Guard, rays = 16): { x: number; y: number }[] {
  const pts = [{ x: g.x, y: g.y }];
  for (let i = 0; i <= rays; i++) {
    const ang = g.facing - g.fov + (g.fov * 2 * i) / rays;
    pts.push(marchRay(g.x, g.y, ang, g.range));
  }
  return pts;
}

function angDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function guardSees(g: Guard, px: number, py: number, hidden: boolean): boolean {
  const dx = px - g.x;
  const dy = py - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < BODY_SPOT_R) return true;
  if (dist > g.range) return false;
  if (hidden && dist > BUSH_SPOT_R) return false;
  if (Math.abs(angDiff(Math.atan2(dy, dx), g.facing)) > g.fov) return false;
  if (losBlocked(g.x, g.y, px, py)) return false;
  return true;
}

export function resolvePos(x: number, y: number, r = PLAYER_R): { x: number; y: number } {
  for (let n = 0; n < 3; n++) {
    for (const tree of TREES) {
      const dx = x - tree.x;
      const dy = y - tree.y;
      const d = Math.hypot(dx, dy);
      const min = tree.r + r;
      if (d < min && d > 1e-4) {
        x += (dx / d) * (min - d);
        y += (dy / d) * (min - d);
      }
    }
  }
  return {
    x: Math.max(6, Math.min(WORLD_W - 6, x)),
    y: Math.max(10, Math.min(WORLD_H - 8, y)),
  };
}

export function stepGuard(g: Guard, dt: number) {
  if (g.kind === "sentry") {
    if (g.wait > 0) {
      g.wait -= dt;
      return;
    }
    const target = g.look[g.lookI] ?? g.facing;
    const d = angDiff(target, g.facing);
    const step = g.turnSpeed * dt;
    if (Math.abs(d) <= step) {
      g.facing = target;
      g.lookI = (g.lookI + 1) % g.look.length;
      g.wait = g.hold;
    } else {
      g.facing += Math.sign(d) * step;
    }
    return;
  }
  if (g.wait > 0) {
    g.wait -= dt;
    return;
  }
  const target = g.path[g.pathI];
  if (!target) return;
  const dx = target.x - g.x;
  const dy = target.y - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1.1) {
    g.pathI = (g.pathI + 1) % g.path.length;
    g.wait = g.hold;
    return;
  }
  g.facing = Math.atan2(dy, dx);
  g.x += (dx / dist) * g.speed * dt;
  g.y += (dy / dist) * g.speed * dt;
}

export function inGoal(x: number, y: number): boolean {
  return y <= GOAL.y && x >= GOAL.xMin && x <= GOAL.xMax;
}

export function visibleWorldH(screenH: number, scale: number, squash: number, padY: number) {
  return Math.max(40, (screenH - padY * 2) / (scale * squash));
}

export function visibleWorldW(screenW: number, scale: number, padX: number) {
  return Math.max(20, (screenW - padX * 2) / scale);
}

export function clampCamY(camY: number, visH: number) {
  return Math.max(0, Math.min(Math.max(0, WORLD_H - visH), camY));
}
