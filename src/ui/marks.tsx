import type { ReactNode, SVGProps } from "react";

function Svg({ children, ...rest }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="1em"
      height="1em"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** 金币：Q 版厚描边铜钱。 */
export function GoldMark({ size = 16 }: { size?: number }) {
  return (
    <Svg className="mark" width={size} height={size}>
      <circle cx="16" cy="16" r="13" fill="#ffd166" stroke="#2a1a0c" strokeWidth="2.4" />
      <circle cx="16" cy="16" r="8" fill="#f0b429" stroke="#2a1a0c" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.2" fill="#fff6e8" opacity="0.55" />
    </Svg>
  );
}

/** 珍珠：带高光的圆珠。 */
export function PearlMark({ size = 16 }: { size?: number }) {
  return (
    <Svg className="mark" width={size} height={size}>
      <circle cx="16" cy="16" r="13" fill="#c8f4ff" stroke="#2a1a0c" strokeWidth="2.4" />
      <circle cx="16" cy="16" r="8.5" fill="#7ed7ee" stroke="#2a1a0c" strokeWidth="1.6" />
      <circle cx="12" cy="11.5" r="3.4" fill="#fff" opacity="0.85" />
    </Svg>
  );
}

/** 能量：叶片形。 */
export function EnergyMark({ size = 16 }: { size?: number }) {
  return (
    <Svg className="mark" width={size} height={size}>
      <path
        d="M18 4c-7 6-12 11-12 17a10 10 0 0 0 20 0c0-4-2-8-4-11-1 4-3 6-6 7 3-6 4-10 2-13z"
        fill="#5ad8a0"
        stroke="#2a1a0c"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M16 12c-1 4-3 7-6 9" fill="none" stroke="#2a1a0c" strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

export function BackChevron({ size = 16 }: { size?: number }) {
  return (
    <Svg className="mark" width={size} height={size}>
      <path
        d="M19 6 10 16l9 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IcoMail({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <rect x="4" y="8" width="24" height="16" rx="3" fill="#fff6e8" stroke="#2a1a0c" strokeWidth="2.2" />
      <path d="M5 9.2 16 17l11-7.8" fill="none" stroke="#2a1a0c" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M5 22.5 12.5 16" fill="none" stroke="#2a1a0c" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M27 22.5 19.5 16" fill="none" stroke="#2a1a0c" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function IcoQuest({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <rect x="7" y="4" width="18" height="24" rx="3" fill="#fff6e8" stroke="#2a1a0c" strokeWidth="2.2" />
      <path d="M7 8h-2.5a2 2 0 0 1 0-4H7" fill="#fff6e8" stroke="#2a1a0c" strokeWidth="2" />
      <path d="M12 12h8M12 17h8M12 22h5" stroke="#2a1a0c" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function IcoShop({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <Svg width={size} height={size} className={className}>
      <rect width="32" height="32" fill="#fff" />
      <g transform="translate(16 16) scale(0.78) translate(-16 -16)">
        <path d="M6 12h20l-1.4 14H7.4Z" fill="#ffd166" stroke="#2a1a0c" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M8 12 12 5h8l4 7" fill="none" stroke="#2a1a0c" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M12 16v5M20 16v5" stroke="#2a1a0c" strokeWidth="2" strokeLinecap="round" />
      </g>
    </Svg>
  );
}

export function IcoEquip({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <path
        d="M8 7 16 12l8-5 2 6-3 2v13H9V15L6 13Z"
        fill="#3d8c62"
        stroke="#2a1a0c"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M16 12v16" stroke="#2a1a0c" strokeWidth="2" />
      <path d="M11 18h4M17 18h4" stroke="#ffe08a" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function IcoCook({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <ellipse cx="16" cy="22" rx="11" ry="6" fill="#6b4423" stroke="#2a1a0c" strokeWidth="2.2" />
      <path d="M6 18h20v4H6z" fill="#c4894a" stroke="#2a1a0c" strokeWidth="2" />
      <path d="M11 8c0-2 1.4-3 2.6-3M16 7c0-2.4 1.5-3.4 2.8-3.4M21 8c0-1.8 1.2-2.8 2.2-2.8" fill="none" stroke="#8ecae6" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function IcoNotes({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      {/* 日记本：左侧装订脊 + 封面 + 横线内页暗示 */}
      <path
        d="M7 4h15a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z"
        fill="#fff6e8"
        stroke="#2a1a0c"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M7 4v24" fill="none" stroke="#2a1a0c" strokeWidth="2.2" />
      <path d="M4.5 8h5M4.5 13h5M4.5 18h5M4.5 23h5" stroke="#c4894a" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 10h10M12 15h10M12 20h7" stroke="#8a5a32" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="22" cy="16" r="1.6" fill="#ef476f" stroke="#2a1a0c" strokeWidth="1.2" />
    </Svg>
  );
}

export function IcoSelect({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <path
        d="M5 16c3-7 8-10 13-8 6 2 9 8 7 12-3 6-12 8-17 3-2-2-3-4-3-7z"
        fill="#5eb8d8"
        stroke="#2a1a0c"
        strokeWidth="2.2"
      />
      <circle cx="21" cy="12" r="2.2" fill="#fff6e8" stroke="#2a1a0c" strokeWidth="1.5" />
    </Svg>
  );
}

export function IcoBasket({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <path d="M6 12h20l-2 14H8Z" fill="#c4894a" stroke="#2a1a0c" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M10 12V9a6 6 0 0 1 12 0v3" fill="none" stroke="#2a1a0c" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M10 17h12M11 22h10" stroke="#2a1a0c" strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

export function IcoHost({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <path d="M5 16 16 6l11 10" fill="none" stroke="#2a1a0c" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M8 15v11h16V15" fill="#ffe08a" stroke="#2a1a0c" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="13" y="19" width="6" height="7" rx="1" fill="#6b4423" stroke="#2a1a0c" strokeWidth="1.6" />
    </Svg>
  );
}

export function IcoExpand({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <rect x="5" y="8" width="14" height="14" rx="2" fill="#fff6e8" stroke="#2a1a0c" strokeWidth="2.2" />
      <rect x="13" y="10" width="14" height="14" rx="2" fill="#ffd166" stroke="#2a1a0c" strokeWidth="2.2" />
      <path d="M20 15v8M16 19h8" stroke="#2a1a0c" strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

export function IcoPair({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <path
        d="M11 9c0-2.4-1.8-4.4-4-4.4S3 6.6 3 9c0 5 8 9 8 9s3.2-1.6 5.4-4"
        fill="#ff8ab0"
        stroke="#2a1a0c"
        strokeWidth="2"
      />
      <path
        d="M21 9c0-2.4-1.8-4.4-4-4.4S13 6.6 13 9c0 5 8 9 8 9s8-4 8-9c0-2.4-1.8-4.4-4-4.4S21 6.6 21 9z"
        fill="#ef476f"
        stroke="#2a1a0c"
        strokeWidth="2"
      />
    </Svg>
  );
}

export function IcoRelease({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <path d="M6 16c4-8 16-8 20 0" fill="none" stroke="#2a86b4" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M8 20c5-6 11-6 16 0" fill="none" stroke="#7ec4ea" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 12c2-4 6-5 9-2" fill="#5eb8d8" stroke="#2a1a0c" strokeWidth="1.8" />
    </Svg>
  );
}

export function IcoFeed({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <ellipse cx="16" cy="18" rx="10" ry="7" fill="#c4894a" stroke="#2a1a0c" strokeWidth="2" />
      <circle cx="12" cy="16" r="1.6" fill="#2a1a0c" />
      <circle cx="18" cy="19" r="1.4" fill="#2a1a0c" />
      <circle cx="20" cy="15" r="1.2" fill="#2a1a0c" />
    </Svg>
  );
}

export function IcoList({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <rect x="6" y="6" width="20" height="20" rx="3" fill="#fff6e8" stroke="#2a1a0c" strokeWidth="2" />
      <path d="M11 13h10M11 18h8" stroke="#2a1a0c" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="8" r="3" fill="#ef476f" stroke="#2a1a0c" strokeWidth="1.6" />
    </Svg>
  );
}

export function IcoHatch({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <ellipse cx="16" cy="18" rx="8" ry="10" fill="#fff6e8" stroke="#2a1a0c" strokeWidth="2.2" />
      <path d="M16 8c2 3 3 6 0 10-3-4-2-7 0-10z" fill="#ffd166" stroke="#2a1a0c" strokeWidth="1.6" />
    </Svg>
  );
}

export function IcoName({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <path d="M6 10c0-3 4-5 10-5s10 2 10 5v3H6v-3z" fill="#fff6e8" stroke="#2a1a0c" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 18h16" stroke="#2a1a0c" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 14h8" stroke="#7c5c3a" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="22" cy="10" r="2.2" fill="#ef476f" stroke="#2a1a0c" strokeWidth="1.2" />
    </Svg>
  );
}

/** 圣殿：屋顶 + 柱廊小建筑。 */
export function IcoTemple({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size}>
      <path d="M16 4 4 12h24Z" fill="#ffe08a" stroke="#2a1a0c" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M7 12h18v3H7Z" fill="#d4a05a" stroke="#2a1a0c" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M8 15v11h3V15H8Zm6.5 0v11h3V15h-3Zm6.5 0v11h3V15h-3Z" fill="#fff6e8" stroke="#2a1a0c" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5 26h22v2H5Z" fill="#c4894a" stroke="#2a1a0c" strokeWidth="1.8" strokeLinejoin="round" />
    </Svg>
  );
}

/** 性别圆框图标：♂ 蓝 / ♀ 粉，常驻显示在鱼名后。 */
export function SexIcon({ sex, size = 14 }: { sex: "male" | "female"; size?: number }) {
  const color = sex === "male" ? "#3a7bd5" : "#ef476f";
  return (
    <span className="sex-icon" aria-label={sex === "male" ? "公" : "母"}>
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden focusable="false">
        <circle cx="12" cy="12" r="10.5" fill="#fff6e8" stroke="#2a1a0c" strokeWidth="2" />
        {sex === "male" ? (
          <g stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none">
            <circle cx="10" cy="14" r="3.4" />
            <path d="M12.4 11.6 17 7" />
            <path d="M17 7h-3.4M17 7v3.4" />
          </g>
        ) : (
          <g stroke={color} strokeWidth="2.6" strokeLinecap="round" fill="none">
            <circle cx="12" cy="9" r="3.6" />
            <path d="M12 12.6 12 17.4" />
            <path d="M9.4 14.8h5.2" />
          </g>
        )}
      </svg>
    </span>
  );
}
