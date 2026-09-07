import { useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ADULT_HEALTH_MAX, fishGrowthStage, GROWTH_STAGE_LABEL } from "../game/growth";
import { QUALITY_LABEL, type Quality } from "../types";
import { BackChevron, GoldMark, PearlMark } from "./marks";

export function Page({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`page ${className}`.trim()}>{children}</div>;
}

export function PageHead({
  onBack,
  backLabel = "返回",
  title,
  extra,
  backGuide = "back-aquarium",
}: {
  onBack: () => void;
  backLabel?: string;
  title: ReactNode;
  extra?: ReactNode;
  backGuide?: string;
}) {
  return (
    <div className="page-head">
      <button className="back-btn" data-guide={backGuide} onClick={onBack} aria-label={backLabel}>
        <BackChevron />
        <span>{backLabel}</span>
      </button>
      <h2>{title}</h2>
      {extra ? <div className="page-head-extra">{extra}</div> : null}
    </div>
  );
}

export function PageBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`page-body ${className}`.trim()}>{children}</div>;
}

export function PageFoot({ children }: { children: ReactNode }) {
  return <div className="page-foot">{children}</div>;
}

export function TabBar<T extends string>({
  items,
  value,
  onChange,
  wrap,
  tankScroll,
}: {
  items: readonly { id: T; label: string; guide?: string }[];
  value: T;
  onChange: (id: T) => void;
  wrap?: boolean;
  /** 鱼缸筛选：可横滑；触摸可拖，鼠标直接点选。 */
  tankScroll?: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ active: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });
  const suppressClickRef = useRef(false);

  const rowClass = tankScroll ? "tabrow-tank-scroll" : wrap ? "wrap" : "tabrow-single";

  function onRowPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // 鼠标只点选，不抢拖拽；触摸/手写笔才拖滚动
    if (!tankScroll || e.pointerType === "mouse" || e.button !== 0) return;
    const el = rowRef.current;
    if (!el) return;
    panRef.current = {
      active: false,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
    el.setPointerCapture(e.pointerId);
  }

  function onRowPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse") return;
    const el = rowRef.current;
    const pan = panRef.current;
    if (!el) return;
    const dx = e.clientX - pan.startX;
    const dy = e.clientY - pan.startY;
    if (!pan.active && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) pan.active = true;
    if (!pan.active) return;
    el.scrollLeft = pan.scrollLeft - dx;
    el.scrollTop = pan.scrollTop - dy;
  }

  function onRowPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse") return;
    const el = rowRef.current;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    suppressClickRef.current = panRef.current.active;
    panRef.current.active = false;
  }

  function pick(id: T) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onChange(id);
  }

  return (
    <div
      ref={rowRef}
      className={`tabrow ${rowClass}`}
      role="tablist"
      onPointerDown={tankScroll ? onRowPointerDown : undefined}
      onPointerMove={tankScroll ? onRowPointerMove : undefined}
      onPointerUp={tankScroll ? onRowPointerUp : undefined}
      onPointerCancel={tankScroll ? onRowPointerUp : undefined}
    >
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={value === it.id}
          data-guide={it.guide}
          className={value === it.id ? "tab is-on" : "tab"}
          onClick={() => pick(it.id)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function ModalCloseX({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" className="modal-close-x" onClick={onClose} aria-label="关闭">
      ×
    </button>
  );
}

export function ModalSheet({
  title,
  children,
  onClose,
  wide,
  className = "",
  modalClassName = "",
  showClose = true,
}: {
  title?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
  modalClassName?: string;
  showClose?: boolean;
}) {
  return (
    <div className={`modal-backdrop ${className}`.trim()} onClick={onClose}>
      <div
        className={`modal ${wide ? "wide" : ""} ${modalClassName}`.trim()}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {showClose && <ModalCloseX onClose={onClose} />}
        <div className="modal-scroll">
          {title != null && <div className="modal-title">{title}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}

export function ConfirmSheet({
  title,
  message,
  confirmLabel = "确定",
  cancelLabel = "取消",
  danger,
  onConfirm,
  onCancel,
  onClose,
}: {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose: () => void;
}) {
  function cancel() {
    onCancel?.();
    onClose();
  }
  return (
    <ModalSheet title={title} onClose={cancel} className="confirm-layer">
      {message != null && message !== "" ? <p>{message}</p> : null}
      <div className="modal-actions">
        <button type="button" onClick={cancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={danger ? "danger" : "primary"}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalSheet>
  );
}

export function QualityChip({ quality }: { quality: Quality }) {
  return <span className={`chip q ${quality}`}>{QUALITY_LABEL[quality]}</span>;
}

export function GrowthStageChip({ healthMax }: { healthMax?: number }) {
  const stage = fishGrowthStage(healthMax ?? ADULT_HEALTH_MAX);
  return <span className={`chip growth ${stage}`}>{GROWTH_STAGE_LABEL[stage]}</span>;
}

export function HealthBar({ value, max = 100, compact = false }: { value: number; max?: number; compact?: boolean }) {
  const cap = Math.max(1, max);
  const v = Math.max(0, Math.min(cap, Math.round(value)));
  const pct = (v / cap) * 100;
  const tone = v <= 0 ? "dead" : pct < 60 ? "warn" : "ok";
  return (
    <span className={`hp ${tone} ${compact ? "compact" : ""}`} title={`健康 ${v}/${cap}`}>
      <span className="hp-track">
        <span className="hp-fill" style={{ width: `${pct}%` }} />
      </span>
      {!compact && <span className="hp-n">{v}/{cap}</span>}
    </span>
  );
}

export function Occupancy({ used, cap }: { used: number; cap: number }) {
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  return (
    <span className="occupancy">
      <span className="cap-bar">
        <span style={{ width: `${pct}%` }} />
      </span>
      <span>
        {used}/{cap}
      </span>
    </span>
  );
}

export function TankPlaque({
  name,
  quality,
  used,
  cap,
  extra,
  onClick,
}: {
  name: string;
  quality?: Quality;
  used: number;
  cap: number;
  extra?: ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <>
      <div className="tank-plaque-name">
        <strong>{name}</strong>
        {quality ? <QualityChip quality={quality} /> : null}
        {extra}
      </div>
      <Occupancy used={used} cap={cap} />
    </>
  );
  if (onClick) {
    return (
      <div className="tank-plaque" role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}>
        {body}
      </div>
    );
  }
  return <div className="tank-plaque">{body}</div>;
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <div className="empty-hint">{children}</div>;
}

export function GoldAmt({ n }: { n: number | string }) {
  return (
    <span className="cur gold">
      <GoldMark />
      {n}
    </span>
  );
}

export function PearlAmt({ n }: { n: number | string }) {
  return (
    <span className="cur pearl">
      <PearlMark />
      {n}
    </span>
  );
}

export function PriceBtn({
  currency,
  price,
  label,
  ...rest
}: {
  currency: "gold" | "pearl";
  price: number;
  label?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`price ${currency}`} {...rest}>
      {currency === "gold" ? <GoldMark /> : <PearlMark />}
      {label ?? price}
    </button>
  );
}

export function GoodsRow({
  icon,
  title,
  quality,
  qualityExtra,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  quality?: Quality;
  qualityExtra?: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="goods">
      <div className="goods-main">
        {icon}
        <div className="goods-copy">
          <div className="goods-title">
            {title}
            {quality ? <QualityChip quality={quality} /> : null}
            {qualityExtra}
          </div>
          {hint ? <div className="dim">{hint}</div> : null}
        </div>
      </div>
      {action ? <div className="goods-action">{action}</div> : null}
    </div>
  );
}

export function HubFab({
  label,
  children,
  onClick,
  active,
  badge,
  badgeExact,
  guide,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  badge?: number;
  /** 显示实际数字，不收成 9+。 */
  badgeExact?: boolean;
  guide?: string;
}) {
  return (
    <button type="button" className={`hub-fab ${active ? "is-on" : ""}`} data-guide={guide} onClick={onClick}>
      <span className="hub-fab-ico">{children}</span>
      <span className="hub-fab-label">{label}</span>
      {badge != null && badge > 0 ? (
        <span className={`hub-fab-badge ${badgeExact ? "is-ice" : ""}`}>{!badgeExact && badge > 9 ? "9+" : badge}</span>
      ) : null}
    </button>
  );
}

export function NavArrow({
  dir,
  onClick,
  disabled,
}: {
  dir: "prev" | "next";
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="nav-arrow"
      disabled={disabled}
      onClick={onClick}
      aria-label={dir === "prev" ? "上一口缸" : "下一口缸"}
    >
      {dir === "prev" ? "‹" : "›"}
    </button>
  );
}
