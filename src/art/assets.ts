import { Texture } from "pixi.js";

export const ART = {
  bgLogin: "/art/bg_login.png",
  bgTank: "/art/bg_tank.png",
  bgMap: "/art/bg_map.png",
  bgFishing: "/art/bg_fishing.png",
  char: "/art/char_fisher.png",
  fish: (id: string) => `/art/fish_${id}.png`,
  icon: {
    rod: "/art/icon_rod.png",
    bait: "/art/icon_bait.png",
    stool: "/art/icon_stool.png",
    basket: "/art/icon_basket.png",
    food: "/art/icon_food.png",
    luck: "/art/icon_luck.png",
  },
  fxRage: "/art/fx_rage.png",
} as const;

export type GearIconKind = keyof typeof ART.icon;

const keyedCache = new Map<string, Promise<Texture>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`load failed: ${url}`));
    img.src = url;
  });
}

/** AI 鱼图是白底，入缸游动前把近白像素抠掉。 */
export function loadKeyedTexture(url: string): Promise<Texture> {
  return loadKeyedTextureMode(url, "fish");
}

/** 特效贴图：只抠掉纯白底，保留红/粉色怒火。 */
export function loadFxTexture(url: string): Promise<Texture> {
  return loadKeyedTextureMode(url, "fx");
}

function loadKeyedTextureMode(url: string, mode: "fish" | "fx"): Promise<Texture> {
  const cacheKey = `${mode}:${url}`;
  const hit = keyedCache.get(cacheKey);
  if (hit) return hit;
  const job = (async () => {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return Texture.from(img);
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      if (mode === "fx") {
        if (r > 248 && g > 248 && b > 248) d[i + 3] = 0;
        continue;
      }
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max - min;
      const bright = (r + g + b) / 3;
      if (bright > 246 && sat < 14) d[i + 3] = 0;
      else if (bright > 232 && sat < 24) d[i + 3] = Math.round(d[i + 3] * ((246 - bright) / 14));
    }
    ctx.putImageData(imageData, 0, 0);
    return Texture.from(canvas);
  })();
  keyedCache.set(cacheKey, job);
  job.catch(() => keyedCache.delete(cacheKey));
  return job;
}

export interface FrameInsets {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** 从整张鱼缸图抠出木框层：中间挖空，盖在鱼上面，看起来像游在框里。 */
export async function loadTankFrameOverlay(url: string, insets: FrameInsets): Promise<Texture> {
  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Texture.from(img);
  ctx.drawImage(img, 0, 0);
  const x = img.naturalWidth * insets.left;
  const y = img.naturalHeight * insets.top;
  const w = img.naturalWidth * (1 - insets.left - insets.right);
  const h = img.naturalHeight * (1 - insets.top - insets.bottom);
  const r = Math.min(w, h) * 0.035;
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  return Texture.from(canvas);
}
