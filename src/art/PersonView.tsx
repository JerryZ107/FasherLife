import { useEffect, useRef } from "react";
import {
  armLiftForMotion,
  canvasPen,
  lookOfOutfit,
  paintPerson,
  type PersonPose,
} from "./paintPerson";
import type { Sex } from "../types";

export type PersonMotion = "idle" | "ready" | "charging" | "casting" | "waiting" | "reeling" | "fight" | "walk";

type Props = {
  outfitId?: string | null;
  sex?: Sex;
  pose?: PersonPose;
  motion?: PersonMotion;
  facingLeft?: boolean;
  charge?: number;
  size?: number;
  className?: string;
};

export default function PersonView({
  outfitId,
  sex = "male",
  pose = "stand",
  motion = "idle",
  facingLeft = false,
  charge = 0,
  size = 96,
  className,
}: Props) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ motion, charge, facingLeft, outfitId, sex, pose, size });
  live.current = { motion, charge, facingLeft, outfitId, sex, pose, size };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const start = performance.now();
    const draw = (now: number) => {
      const s = live.current;
      const box = wrap?.getBoundingClientRect();
      const px = Math.max(32, box?.width || s.size);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(px * dpr);
      const h = Math.round((box?.height || s.size) * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const t = (now - start) / 1000;
      const scale = Math.min(canvas.width, canvas.height) / 70;
      ctx.translate(canvas.width / 2, canvas.height * (s.pose === "sit" ? 0.82 : 0.9));
      ctx.scale(scale, scale);
      paintPerson(canvasPen(ctx), {
        sex: s.sex,
        look: lookOfOutfit(s.outfitId),
        pose: s.pose,
        facingLeft: s.facingLeft,
        t,
        armLift: armLiftForMotion(s.motion, s.charge, t),
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <span className={className} ref={wrapRef} style={{ width: size, height: size, display: "inline-block" }}>
      <canvas ref={canvasRef} aria-hidden style={{ width: "100%", height: "100%", display: "block" }} />
    </span>
  );
}
