import { useEffect, useRef } from "react";
import {
  canvasPen,
  lookOfOutfit,
  paintPerson,
  poseForMotion,
  type PersonPose,
  type PersonViewDir,
} from "./paintPerson";
import type { Sex } from "../types";

export type PersonMotion = "idle" | "ready" | "charging" | "casting" | "waiting" | "reeling" | "fight" | "walk";

type Props = {
  outfitId?: string | null;
  sex?: Sex;
  pose?: PersonPose;
  view?: PersonViewDir;
  motion?: PersonMotion;
  facingLeft?: boolean;
  charge?: number;
  size?: number;
  className?: string;
  holdRod?: boolean;
};

export default function PersonView({
  outfitId,
  sex = "male",
  pose = "stand",
  view = "front",
  motion = "idle",
  facingLeft = false,
  charge = 0,
  size = 96,
  className,
  holdRod = false,
}: Props) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ motion, charge, facingLeft, outfitId, sex, pose, view, size, holdRod });
  live.current = { motion, charge, facingLeft, outfitId, sex, pose, view, size, holdRod };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const origin = performance.now();
    const clock = { motion: live.current.motion, t0: origin };
    const draw = (now: number) => {
      const s = live.current;
      if (s.motion !== clock.motion) {
        clock.motion = s.motion;
        clock.t0 = now;
      }
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
      const t = (now - origin) / 1000;
      const elapsed = (now - clock.t0) / 1000;
      const pose = poseForMotion(s.motion, s.charge, t, elapsed);
      const world = s.pose === "sit" ? (s.holdRod ? 66 : 56) : 56;
      const scale = Math.min(canvas.width, canvas.height) / world;
      ctx.translate(canvas.width / 2, canvas.height * (s.pose === "sit" ? 0.84 : 0.86));
      ctx.scale(scale, scale);
      paintPerson(canvasPen(ctx), {
        sex: s.sex,
        look: lookOfOutfit(s.outfitId),
        pose: s.pose,
        view: s.view,
        facingLeft: s.facingLeft,
        t,
        armLift: pose.armLift,
        walking: s.motion === "walk",
        lean: pose.lean,
        holdRod: s.holdRod,
        rodAngle: pose.rodAngle,
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const boxH = pose === "sit" && holdRod ? Math.round(size * 1.16) : size;
  return (
    <span
      className={`person-view ${className ?? ""}`.trim()}
      ref={wrapRef}
      style={{ width: size, height: boxH, display: "inline-block" }}
    >
      <canvas ref={canvasRef} aria-hidden style={{ width: "100%", height: "100%", display: "block" }} />
    </span>
  );
}
