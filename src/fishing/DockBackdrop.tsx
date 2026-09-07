/** 星露谷式分层钓点。viewBox 接近竖屏码头宽高比，用 slice 避免把树拉成长椭圆。 */

const W = 3400;
const H = 1480;

type Variant = "pond" | "stream";

const TREES_POND = [
  { x: 160, y: 528, s: 1.05, kind: "oak" as const },
  { x: 420, y: 538, s: 0.78, kind: "round" as const },
  { x: 700, y: 518, s: 1.22, kind: "oak" as const },
  { x: 980, y: 534, s: 0.86, kind: "fruit" as const },
  { x: 1280, y: 522, s: 1.12, kind: "oak" as const },
  { x: 1580, y: 540, s: 0.74, kind: "round" as const },
  { x: 1880, y: 516, s: 1.18, kind: "fruit" as const },
  { x: 2180, y: 532, s: 0.9, kind: "oak" as const },
  { x: 2480, y: 520, s: 1.08, kind: "oak" as const },
  { x: 2780, y: 536, s: 0.82, kind: "round" as const },
  { x: 3080, y: 524, s: 1.14, kind: "fruit" as const },
  { x: 3320, y: 540, s: 0.76, kind: "oak" as const },
];

const TREES_STREAM = [
  { x: 140, y: 518, s: 1.2, kind: "pine" as const },
  { x: 400, y: 500, s: 1.38, kind: "pine" as const },
  { x: 680, y: 528, s: 0.92, kind: "oak" as const },
  { x: 980, y: 494, s: 1.46, kind: "pine" as const },
  { x: 1280, y: 520, s: 1.04, kind: "oak" as const },
  { x: 1600, y: 498, s: 1.32, kind: "pine" as const },
  { x: 1920, y: 526, s: 0.88, kind: "round" as const },
  { x: 2240, y: 504, s: 1.4, kind: "pine" as const },
  { x: 2560, y: 522, s: 1.1, kind: "oak" as const },
  { x: 2880, y: 500, s: 1.28, kind: "pine" as const },
  { x: 3180, y: 518, s: 1.16, kind: "pine" as const },
];

const BUSHES = [
  { x: 300, y: 548, s: 0.9 },
  { x: 860, y: 552, s: 1.1 },
  { x: 1500, y: 546, s: 0.8 },
  { x: 2140, y: 550, s: 1.05 },
  { x: 2700, y: 548, s: 0.95 },
];

const LILIES = [
  { x: 220, y: 720, s: 1, bloom: true },
  { x: 520, y: 860, s: 0.82, bloom: false },
  { x: 840, y: 760, s: 1.12, bloom: true },
  { x: 1180, y: 920, s: 0.9, bloom: false },
  { x: 1520, y: 740, s: 1.04, bloom: true },
  { x: 1860, y: 880, s: 0.76, bloom: false },
  { x: 2200, y: 780, s: 1.14, bloom: true },
  { x: 2540, y: 900, s: 0.86, bloom: false },
  { x: 2860, y: 750, s: 0.98, bloom: true },
  { x: 3180, y: 840, s: 1.06, bloom: false },
];

function range(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}

function Tree({
  x,
  y,
  s,
  kind,
}: {
  x: number;
  y: number;
  s: number;
  kind: "oak" | "round" | "fruit" | "pine";
}) {
  if (kind === "pine") {
    return (
      <g transform={`translate(${x} ${y}) scale(${s})`}>
        <ellipse cx="1" cy="40" rx="16" ry="5.5" fill="#142010" opacity="0.32" />
        <rect x="-4" y="6" width="8" height="36" rx="1.2" fill="#5a3a1c" stroke="#24160c" strokeWidth="2.2" />
        <rect x="-1.4" y="10" width="2.8" height="24" fill="#c4894a" opacity="0.35" />
        <polygon points="0,-36 -26,4 26,4" fill="#16582c" stroke="#24160c" strokeWidth="2.3" />
        <polygon points="0,-24 -21,12 21,12" fill="#1c6a34" stroke="#24160c" strokeWidth="2.2" />
        <polygon points="0,-10 -16,22 16,22" fill="#248044" stroke="#24160c" strokeWidth="2.1" />
        <polygon points="0,4 -11,28 11,28" fill="#2d9450" stroke="#24160c" strokeWidth="2" />
        <polygon points="-5,-28 1,-32 3,-24" fill="#c4f09a" opacity="0.38" />
      </g>
    );
  }
  const canopy = kind === "fruit" ? "#3a9a48" : kind === "round" ? "#2a7a3c" : "#2f8f44";
  const canopy2 = kind === "fruit" ? "#248a38" : "#1e6a32";
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="2" cy="42" rx="20" ry="6.5" fill="#142010" opacity="0.3" />
      <rect x="-5" y="8" width="10" height="36" rx="1.6" fill="#6b4422" stroke="#24160c" strokeWidth="2.3" />
      <rect x="-1.8" y="12" width="3.4" height="28" fill="#c4894a" opacity="0.42" />
      <ellipse cx="-16" cy="10" rx="18" ry="16" fill={canopy2} stroke="#24160c" strokeWidth="2.5" />
      <ellipse cx="17" cy="12" rx="17" ry="15" fill="#247a38" stroke="#24160c" strokeWidth="2.5" />
      <ellipse cx="-4" cy="-2" rx="16" ry="14" fill="#1e6a32" stroke="#24160c" strokeWidth="2.3" />
      <ellipse cx="8" cy="-4" rx="15" ry="13" fill="#2a8440" stroke="#24160c" strokeWidth="2.3" />
      <ellipse cx="0" cy="-12" rx="22" ry="19" fill={canopy} stroke="#24160c" strokeWidth="2.7" />
      <ellipse cx="-7" cy="-16" rx="8" ry="5" fill="#c4f09a" opacity="0.42" />
      {kind === "fruit" && (
        <>
          <circle cx="-9" cy="2" r="2.6" fill="#e23c4a" stroke="#24160c" strokeWidth="1.2" />
          <circle cx="8" cy="-3" r="2.4" fill="#e8a020" stroke="#24160c" strokeWidth="1.2" />
          <circle cx="2" cy="8" r="2.2" fill="#e23c4a" stroke="#24160c" strokeWidth="1.2" />
          <circle cx="-3" cy="-6" r="2.1" fill="#e8a020" stroke="#24160c" strokeWidth="1.1" />
        </>
      )}
    </g>
  );
}

function Cattail({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 18 C -2 8 2 -6 1 -18" fill="none" stroke="#2a5a28" strokeWidth="2.2" />
      <path d="M0 18 C 4 6 8 -2 11 -10" fill="none" stroke="#3d824c" strokeWidth="1.8" />
      <rect x="-2.4" y="-22" width="5" height="12" rx="2" fill="#8a4a28" stroke="#24160c" strokeWidth="1.4" />
      <rect x="-1.4" y="-26" width="3" height="5" rx="1" fill="#3a2414" />
    </g>
  );
}

function LeapFish({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <g className="db-leap" style={{ animationDelay: `${delay}s` }} transform={`translate(${x} ${y})`}>
      <ellipse rx="11" ry="4.6" fill="#2a6080" stroke="#24160c" strokeWidth="1.6" />
      <path d="M10 0 L18 -5 L16 4 Z" fill="#1c4864" stroke="#24160c" strokeWidth="1.3" />
      <circle cx="-4" cy="-1" r="1.1" fill="#fff6c8" />
    </g>
  );
}

function Bush({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cy="8" rx="18" ry="6" fill="#142010" opacity="0.2" />
      <ellipse cx="-10" cy="0" rx="12" ry="9" fill="#1e6a32" stroke="#24160c" strokeWidth="2" />
      <ellipse cx="10" cy="1" rx="11" ry="8" fill="#248044" stroke="#24160c" strokeWidth="2" />
      <ellipse cx="0" cy="-6" rx="13" ry="10" fill="#2f8f44" stroke="#24160c" strokeWidth="2.1" />
      <ellipse cx="-4" cy="-8" rx="4" ry="2.5" fill="#c4f09a" opacity="0.35" />
    </g>
  );
}

function House({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-28" y="4" width="56" height="32" fill="#ead4a8" stroke="#24160c" strokeWidth="2.4" />
      <path d="M-32 4 L0 -24 L32 4 Z" fill="#b45c48" stroke="#24160c" strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="-18" y="-6" width="10" height="12" fill="#8a5040" stroke="#24160c" strokeWidth="1.6" />
      <rect x="-8" y="16" width="12" height="18" fill="#5a3a20" stroke="#24160c" strokeWidth="1.8" />
      <rect x="8" y="10" width="12" height="10" fill="#7eb8d8" stroke="#24160c" strokeWidth="1.8" />
      <rect x="10" y="13" width="8" height="1.6" fill="#fff" opacity="0.35" />
      <rect x="-40" y="34" width="80" height="6" fill="#6b8a40" stroke="#24160c" strokeWidth="1.6" />
    </g>
  );
}

function Cloud({
  cx,
  cy,
  s = 1,
  dur,
  delay,
  tint = "#fff",
}: {
  cx: number;
  cy: number;
  s?: number;
  dur: number;
  delay: number;
  tint?: string;
}) {
  return (
    <g className="db-cloud" style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }}>
      <ellipse cx={cx} cy={cy} rx={72 * s} ry={22 * s} fill={tint} />
      <ellipse cx={cx + 54 * s} cy={cy - 12 * s} rx={46 * s} ry={20 * s} fill={tint} />
      <ellipse cx={cx + 92 * s} cy={cy + 6 * s} rx={40 * s} ry={16 * s} fill="#f4fbff" />
      <ellipse cx={cx + 18 * s} cy={cy + 10 * s} rx={36 * s} ry={14 * s} fill="#eef7ff" opacity="0.9" />
    </g>
  );
}

const CLOUDS = [
  { cx: 160, cy: 92, s: 1.18, dur: 34, delay: -2 },
  { cx: 420, cy: 168, s: 0.72, dur: 42, delay: -11, tint: "#eef6fc" },
  { cx: 680, cy: 78, s: 1.42, dur: 38, delay: -19 },
  { cx: 980, cy: 148, s: 0.86, dur: 46, delay: -7, tint: "#f2f8ff" },
  { cx: 1220, cy: 64, s: 1.08, dur: 31, delay: -24 },
  { cx: 1480, cy: 186, s: 0.64, dur: 48, delay: -14, tint: "#e8f2fa" },
  { cx: 1720, cy: 96, s: 1.28, dur: 36, delay: -5 },
  { cx: 1980, cy: 154, s: 0.78, dur: 44, delay: -21, tint: "#f4fbff" },
  { cx: 2240, cy: 72, s: 1.36, dur: 33, delay: -9 },
  { cx: 2480, cy: 132, s: 0.92, dur: 40, delay: -17 },
  { cx: 2720, cy: 58, s: 1.16, dur: 37, delay: -28 },
  { cx: 2960, cy: 176, s: 0.7, dur: 50, delay: -3, tint: "#eef6fc" },
  { cx: 3180, cy: 88, s: 1.22, dur: 35, delay: -13 },
  { cx: 340, cy: 214, s: 0.58, dur: 52, delay: -30, tint: "#e8f2fa" },
  { cx: 2060, cy: 210, s: 0.54, dur: 54, delay: -22, tint: "#f2f8ff" },
];

function Lily({ x, y, s, bloom }: { x: number; y: number; s: number; bloom: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="db-lily">
        <ellipse cx="5" cy="4" rx="19" ry="8" fill="#163a28" opacity="0.3" />
        <path
          d="M0 -9 A20 9 0 1 1 -1.2 -8.6 L0 -1 Z"
          fill="#3da85a"
          stroke="#24160c"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path d="M0 -1 L16 -3" stroke="#1e6a32" strokeWidth="1.5" />
        <ellipse cx="-6" cy="-2" rx="6" ry="3" fill="#c8f4a8" opacity="0.4" />
        {bloom ? (
          <>
            <circle r="5.2" fill="#ef476f" stroke="#24160c" strokeWidth="1.7" />
            <circle r="2" fill="#ffe08a" />
          </>
        ) : (
          <circle r="2.8" fill="#e8f8c8" stroke="#24160c" strokeWidth="1.4" />
        )}
      </g>
    </g>
  );
}

export default function DockBackdrop({
  hot = false,
  variant = "pond",
}: {
  hot?: boolean;
  variant?: Variant;
}) {
  const trees = variant === "stream" ? TREES_STREAM : TREES_POND;
  const posts = [180, 520, 860, 1200, 1540, 1880, 2220, 2560, 2900, 3240];
  const waterId = hot ? "db-water-hot" : "db-water";
  const stream = variant === "stream";
  return (
    <svg
      className={`dock-backdrop is-${variant}${hot ? " is-hot" : ""}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="db-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stream ? "#3e86cc" : "#4e9ad8"} />
          <stop offset="38%" stopColor={stream ? "#86c2ea" : "#96d2f2"} />
          <stop offset="72%" stopColor="#d8eec4" />
          <stop offset="100%" stopColor="#7eb45c" />
        </linearGradient>
        <linearGradient id="db-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stream ? "#8ad8dc" : "#7edcc8"} />
          <stop offset="12%" stopColor={stream ? "#46b0c8" : "#52c0c8"} />
          <stop offset="42%" stopColor={stream ? "#2a84a8" : "#2f8eb4"} />
          <stop offset="78%" stopColor={stream ? "#185878" : "#1c6a90"} />
          <stop offset="100%" stopColor={stream ? "#0e3048" : "#123e5c"} />
        </linearGradient>
        <linearGradient id="db-water-hot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4f8e8" />
          <stop offset="40%" stopColor="#64d8e4" />
          <stop offset="100%" stopColor="#1c6a96" />
        </linearGradient>
        <linearGradient id="db-dock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0b070" />
          <stop offset="22%" stopColor="#c48a48" />
          <stop offset="100%" stopColor="#6b4220" />
        </linearGradient>
        <linearGradient id="db-plank" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8a5224" />
          <stop offset="35%" stopColor="#d4a060" />
          <stop offset="100%" stopColor="#6b3e18" />
        </linearGradient>
        <pattern id="db-tiles" width="56" height="32" patternUnits="userSpaceOnUse">
          <path d="M0 16 Q 14 9 28 16 T 56 16" fill="none" stroke="#e8fbff" strokeWidth="1.8" opacity="0.2" />
          <path d="M-8 28 Q 6 22 20 28 T 48 28" fill="none" stroke="#bfe8f4" strokeWidth="1.2" opacity="0.12" />
        </pattern>
      </defs>

      <rect width={W} height="560" fill="url(#db-sky)" />
      {CLOUDS.map((c) => (
        <Cloud key={`${c.cx}-${c.cy}`} {...c} />
      ))}
      <path className="db-bird a" d="M380 170 q18 -14 36 0" fill="none" stroke="#24160c" strokeWidth="3" opacity="0.42" strokeLinecap="round" />
      <path className="db-bird b" d="M1320 210 q14 -12 28 0" fill="none" stroke="#24160c" strokeWidth="2.6" opacity="0.38" strokeLinecap="round" />
      <path className="db-bird c" d="M1980 132 q12 -10 24 0" fill="none" stroke="#24160c" strokeWidth="2.4" opacity="0.34" strokeLinecap="round" />

      <path d="M0 430 L150 250 L340 410 L540 210 L760 400 L1020 230 L1280 418 L1560 240 L1840 408 L2140 220 L2420 400 L2700 250 L2980 412 L3220 236 L3400 430 L3400 560 L0 560 Z" fill="#9bb4c8" />
      <path d="M0 470 L120 310 L300 450 L500 290 L720 444 L980 300 L1240 456 L1520 308 L1780 448 L2080 292 L2360 452 L2660 310 L2940 454 L3200 300 L3400 470 L3400 560 L0 560 Z" fill="#7a96ac" />
      <path d="M0 510 C200 430 360 460 540 420 C760 372 960 460 1200 418 C1460 370 1700 458 1960 412 C2240 360 2480 452 2760 414 C3020 378 3220 450 3400 420 L3400 560 L0 560 Z" fill="#3d824c" />
      <path d="M0 536 C240 470 460 504 700 464 C980 414 1220 506 1500 468 C1780 428 2040 508 2320 470 C2620 428 2920 506 3220 472 L3400 500 L3400 560 L0 560 Z" fill="#2f6e3e" />

      {!stream && (
        <>
          <House x={640} y={500} s={1} />
          <House x={1760} y={508} s={0.86} />
          <House x={2900} y={498} s={0.92} />
          <g transform="translate(980 548)">
            {range(9).map((i) => (
              <rect key={i} x={i * 14} y="0" width="3" height="16" fill="#8a6238" stroke="#24160c" strokeWidth="1.2" />
            ))}
            <line x1="0" y1="4" x2="126" y2="4" stroke="#24160c" strokeWidth="2" />
          </g>
        </>
      )}
      {BUSHES.map((b) => (
        <Bush key={b.x} {...b} />
      ))}
      {trees.map((t) => (
        <Tree key={t.x} {...t} />
      ))}
      {[240, 640, 1100, 1680, 2220, 2740, 3180].map((x, i) => (
        <Cattail key={x} x={x} y={548} s={0.85 + (i % 3) * 0.12} />
      ))}

      <rect x="0" y="548" width={W} height="560" fill={`url(#${waterId})`} />
      <rect x="0" y="548" width={W} height="560" fill="url(#db-tiles)" />
      <ellipse cx="900" cy="572" rx="520" ry="36" fill="#fff" opacity="0.14" />
      <ellipse cx="2400" cy="584" rx="480" ry="30" fill="#fff" opacity="0.1" />
      {trees.map((t) => (
        <ellipse key={`r${t.x}`} cx={t.x} cy="640" rx={22 * t.s} ry={8 * t.s} fill="#1c4a3a" opacity="0.12" />
      ))}

      <path
        className="db-wave"
        d="M0 620 Q 130 596 260 620 T 520 620 T 780 620 T 1040 620 T 1300 620 T 1560 620 T 1820 620 T 2080 620 T 2340 620 T 2600 620 T 2860 620 T 3120 620 T 3380 620 T 3640 620"
        fill="none"
        stroke="#f2fffe"
        strokeWidth="7"
        opacity="0.38"
      />
      <path
        className="db-wave w2"
        d="M0 740 Q 150 712 300 740 T 600 740 T 900 740 T 1200 740 T 1500 740 T 1800 740 T 2100 740 T 2400 740 T 2700 740 T 3000 740 T 3300 740 T 3600 740"
        fill="none"
        stroke="#d8f4ff"
        strokeWidth="5.5"
        opacity="0.28"
      />
      <path
        className="db-wave w3"
        d="M0 880 Q 110 858 220 880 T 440 880 T 660 880 T 880 880 T 1100 880 T 1320 880 T 1540 880 T 1760 880 T 1980 880 T 2200 880 T 2420 880 T 2640 880 T 2860 880 T 3080 880 T 3300 880 T 3520 880"
        fill="none"
        stroke="#c8ecff"
        strokeWidth="4.5"
        opacity="0.2"
      />
      <path
        className="db-wave w2"
        d="M0 1000 Q 160 978 320 1000 T 640 1000 T 960 1000 T 1280 1000 T 1600 1000 T 1920 1000 T 2240 1000 T 2560 1000 T 2880 1000 T 3200 1000 T 3520 1000"
        fill="none"
        stroke="#b4e0f0"
        strokeWidth="4"
        opacity="0.16"
      />

      {stream &&
        range(10).map((i) => (
          <path
            key={i}
            className="db-foam"
            d={`M${120 + i * 330} 660 q 50 -22 100 0 t 100 0`}
            fill="none"
            stroke="#fff"
            strokeWidth="3.5"
            opacity="0.22"
          />
        ))}

      {!stream && LILIES.map((l) => <Lily key={l.x} {...l} />)}
      <LeapFish x={620} y={780} delay={0} />
      <LeapFish x={1540} y={860} delay={1.8} />
      <LeapFish x={2480} y={740} delay={3.4} />
      <LeapFish x={3100} y={900} delay={5.1} />

      {[
        [280, 980, 1],
        [960, 1020, 0.74],
        [1680, 996, 1.12],
        [2440, 1010, 0.86],
        [3120, 988, 0.96],
      ].map(([x, y, s]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
          <ellipse rx="30" ry="13" fill="#6a7880" stroke="#24160c" strokeWidth="2.3" />
          <ellipse cx="-8" cy="-4" rx="9" ry="4.5" fill="#c0ccd0" opacity="0.38" />
        </g>
      ))}

      {range(18).map((i) => {
        const x = 120 + i * 185;
        const y = 640 + (i % 5) * 70;
        return (
          <path
            key={i}
            className="db-spark"
            d={`M${x} ${y - 6} L${x} ${y + 6} M${x - 6} ${y} L${x + 6} ${y}`}
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        );
      })}

      <path d="M0 1078 C220 1054 460 1094 780 1070 C1180 1042 1600 1100 2040 1072 C2500 1042 2960 1096 3400 1070 L3400 1128 L0 1128 Z" fill="#4a824c" />
      <path d="M0 1108 C260 1088 520 1120 860 1100 C1280 1076 1740 1124 2200 1102 C2680 1078 3080 1118 3400 1100 L3400 1128 L0 1128 Z" fill="#3a6a3c" />
      <ellipse cx="380" cy="1112" rx="28" ry="9" fill="#8a7a62" stroke="#24160c" strokeWidth="1.8" />
      <ellipse cx="1500" cy="1118" rx="22" ry="8" fill="#7a6a52" stroke="#24160c" strokeWidth="1.8" />
      <ellipse cx="2660" cy="1110" rx="26" ry="9" fill="#8a7a62" stroke="#24160c" strokeWidth="1.8" />

      <rect x="0" y="1118" width={W} height="16" fill="#4a2c14" />
      <rect x="0" y="1130" width={W} height="14" fill="#c9a66b" stroke="#24160c" strokeWidth="2" />
      <rect x="0" y="1144" width={W} height="336" fill="url(#db-dock)" />
      {range(56).map((i) => (
        <g key={i}>
          <rect x={i * 61} y="1146" width="52" height="332" fill="url(#db-plank)" opacity="0.55" />
          <rect x={i * 61 + 52} y="1146" width="9" height="332" fill="#4a2c14" opacity="0.55" />
          <circle cx={i * 61 + 10} cy="1162" r="2.4" fill="#2a1a0c" opacity="0.55" />
          <circle cx={i * 61 + 10} cy="1448" r="2.4" fill="#2a1a0c" opacity="0.55" />
        </g>
      ))}
      {range(6).map((i) => (
        <line key={i} x1="0" y1={1184 + i * 44} x2={W} y2={1184 + i * 44} stroke="#24160c" strokeWidth="1.2" opacity="0.1" />
      ))}
      <rect x="0" y="1144" width={W} height="28" fill="#5a7a62" opacity="0.18" />
      <path
        d="M40 1138 Q 200 1152 360 1138 T 680 1138 T 1000 1138 T 1320 1138 T 1640 1138 T 1960 1138 T 2280 1138 T 2600 1138 T 2920 1138 T 3240 1138 T 3560 1138"
        fill="none"
        stroke="#c9a66b"
        strokeWidth="6"
        opacity="0.9"
      />
      {posts.map((x) => (
        <g key={x} transform={`translate(${x} 1118)`}>
          <ellipse cx="0" cy="48" rx="16" ry="6" fill="#0e3048" opacity="0.32" />
          <rect x="-9" y="-18" width="18" height="58" rx="2" fill="#8f5a2c" stroke="#24160c" strokeWidth="2.4" />
          <rect x="-5" y="-14" width="5" height="50" fill="#e0b070" opacity="0.45" />
          <rect x="-14" y="10" width="28" height="8" rx="1" fill="#e0b070" stroke="#24160c" strokeWidth="2" />
        </g>
      ))}
      <g transform="translate(420 1188)">
        <rect x="0" y="0" width="36" height="28" rx="2" fill="#8a5a28" stroke="#24160c" strokeWidth="2.2" />
        <rect x="4" y="6" width="28" height="4" fill="#c4894a" />
        <rect x="48" y="4" width="22" height="24" rx="2" fill="#6a4420" stroke="#24160c" strokeWidth="2" />
      </g>
      <g transform="translate(1980 1192)">
        <rect width="40" height="30" rx="2" fill="#7a4a20" stroke="#24160c" strokeWidth="2.2" />
        <rect x="6" y="8" width="28" height="5" fill="#d4a060" />
      </g>
    </svg>
  );
}
