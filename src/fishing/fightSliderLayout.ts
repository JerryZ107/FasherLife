/** 搏斗竖槽滑块在画布内的像素矩形（与 FishingCanvas 绘制一致）。 */
export type FightSliderRect = { x: number; y: number; width: number; height: number };

export type FightSliderLayout = {
  fish: FightSliderRect;
  player: FightSliderRect;
};

const SLIDER_INSET_X = 4;
const SLIDER_WIDTH_INSET = 8;

/** overlay 搏斗槽：两条滑块共用同一竖轨，仅 Y 与高度不同。 */
export function computeOverlayFightSliderLayout(
  w: number,
  h: number,
  fishSize: number,
  playerSize: number,
  fishY = 0.5,
  playerY = 0.5,
): FightSliderLayout {
  const pad = 6;
  const baseBarW = Math.min(48, w - pad * 2);
  const barW = baseBarW * 2;
  const barX = (w - barW) / 2;
  const barH = h - pad * 2;
  const fishH = fishSize * barH;
  const playerH = playerSize * barH;
  const fy = pad + fishY * barH;
  const py = pad + playerY * barH;
  const blockW = barW - SLIDER_WIDTH_INSET;
  const blockX = barX + SLIDER_INSET_X;
  return {
    fish: { x: blockX, y: fy - fishH / 2, width: blockW, height: fishH },
    player: { x: blockX, y: py - playerH / 2, width: blockW, height: playerH },
  };
}

export function applyFightSliderRect(el: HTMLElement, rect: FightSliderRect) {
  el.style.left = `${rect.x}px`;
  el.style.top = `${rect.y}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.style.right = "auto";
  el.style.bottom = "auto";
}
