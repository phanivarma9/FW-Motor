import React, { useLayoutEffect, useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { PerspectiveCamera } from "three";
import { useThree } from "@react-three/fiber";
import { StickFigure } from "../lib/StickFigure";
import { Lights, MirrorStage } from "../lib/Stage";
import { GrowingArrow } from "../lib/Arrow";
import { makePath } from "../lib/path";
import { Pose, STAND, legDrop, lerp, mixPose, sampleNum, smooth } from "../lib/rig";
import { MONO, Statement, Tag, Watermark } from "../lib/Hud";

export const ARROW_FPS = 30;
export const ARROW_DURATION = 420;

const PATH = makePath([
  [-0.6, 0.08],
  [1.8, 1.4],
  [2.6, 0.7], // dip 1
  [4.6, 2.4],
  [5.3, 1.7], // dip 2
  [7.4, 3.6],
  [8.0, 3.0], // dip 3
  [8.8, 3.9],
  [12.5, 13.2], // breakthrough
]);
const ROCKET_SEG = PATH.lens.length - 1;
const PRE_ROCKET = PATH.vertexDist[ROCKET_SEG];
const THICK = 0.16;
const BEHIND = 0.75; // rider stands this far behind the tip

const G_START = 20;
const SPEED = 0.085; // path units per frame while grinding (running pace)
const G_END = G_START + (PRE_ROCKET - 0.5) / SPEED; // ~385
const ROCKET_FRAMES = 30;
const R_END = G_END + ROCKET_FRAMES;
const REVEAL_END = R_END + 45;

export const arrowLength = (f: number) => {
  if (f < G_START) return 0;
  if (f < G_END) return 0.5 + (f - G_START) * SPEED;
  const t = Math.min(1, (f - G_END) / ROCKET_FRAMES);
  return PRE_ROCKET + (PATH.total - PRE_ROCKET) * t * t;
};

// frame where the rider enters a given segment (used for captions + sound)
const frameAtRider = (dist: number) => G_START + (dist + BEHIND - 0.5) / SPEED;
export const DIP_FRAMES = [1, 3, 5].map((s) => Math.round(frameAtRider(PATH.vertexDist[s])));

const walk = (phase: number, lean: number): Pose => ({
  lean,
  head: -0.05,
  lHip: 0.5 * Math.sin(phase),
  lKnee: -0.25 - 0.7 * Math.max(0, Math.cos(phase)),
  rHip: -0.5 * Math.sin(phase),
  rKnee: -0.25 - 0.7 * Math.max(0, -Math.cos(phase)),
  lSh: -0.55 * Math.sin(phase),
  lEl: 0.55,
  rSh: 0.55 * Math.sin(phase),
  rEl: 0.55,
  armOut: 0,
});

const balance = (f: number): Pose => ({
  lean: -0.18 + Math.sin(f * 0.35) * 0.1,
  head: 0.15,
  lHip: 0.35,
  lKnee: -0.55,
  rHip: -0.15,
  rKnee: -0.35,
  lSh: 0.25,
  lEl: 0.3,
  rSh: 0.1,
  rEl: 0.3,
  armOut: 1.25 + Math.sin(f * 0.5) * 0.25,
});

const SURF: Pose = {
  lean: 0.45,
  head: -0.45,
  lHip: 1.05,
  lKnee: -1.45,
  rHip: 0.45,
  rKnee: -1.0,
  lSh: 0.7,
  lEl: 0.2,
  rSh: -0.4,
  rEl: 0.2,
  armOut: 1.0,
};

const segPose = (seg: number, u: number, f: number): Pose => {
  if (seg === ROCKET_SEG) return SURF;
  if (seg % 2 === 1 && seg < ROCKET_SEG - 1) return balance(f);
  const slope = Math.tan(PATH.at(u).angle);
  return walk(u * 3.2, 0.28 + slope * 0.25);
};

const rider = (f: number) => {
  const L = arrowLength(f);
  const u = Math.max(0, L - BEHIND);
  const p = PATH.at(u);
  let pose: Pose;
  if (f < G_START) {
    pose = STAND;
  } else {
    const cur = segPose(p.seg, u, f);
    const into = u - PATH.vertexDist[p.seg];
    pose = p.seg > 0 && into < 0.4 ? mixPose(segPose(p.seg - 1, u, f), cur, smooth(into / 0.4)) : cur;
    if (f < G_START + 12) pose = mixPose(STAND, pose, smooth((f - G_START) / 12));
  }
  const drop = Math.max(legDrop(pose.lHip, pose.lKnee), legDrop(pose.rHip, pose.rKnee));
  return { pose, pos: [p.x, p.y + THICK / 2 + drop, 0] as [number, number, number], y: p.y };
};

const FLOOR_SIT: Pose = {
  lean: -0.35,
  head: -0.35,
  lHip: 1.45,
  lKnee: -0.15,
  rHip: 1.35,
  rKnee: -0.35,
  lSh: -0.65,
  lEl: 0,
  rSh: -0.6,
  rEl: 0,
  armOut: 0,
};
const WAIT_POS: [number, number, number] = [-2.3, 0, -1.6];

const waiter = (f: number) => {
  const lookUp: Pose = { ...STAND, head: -0.45 + Math.sin(f * 0.05) * 0.06 };
  const t = smooth((f - 100) / 20);
  const pose = mixPose(lookUp, FLOOR_SIT, t);
  const drop = lerp(legDrop(STAND.lHip, STAND.lKnee), 0.1, t);
  return { pose, pos: [WAIT_POS[0], drop, WAIT_POS[2]] as [number, number, number], facing: -0.35 * t };
};

const Rig: React.FC<{ frame: number }> = ({ frame }) => {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    const r = rider(frame);
    const tip = PATH.at(arrowLength(frame));
    const followRocket = smooth((frame - G_END) / 30);
    const fx = lerp(r.pos[0], tip.x - 0.6, followRocket);
    const fy = lerp(r.pos[1], tip.y - 0.8, followRocket);
    const reveal = smooth((frame - R_END + 4) / (REVEAL_END - R_END + 4));
    const intro = sampleNum([[0, 0.6], [G_START + 14, 0]], frame); // starts a bit wider to show both
    const tx = lerp(lerp(fx, -0.9, intro), 5.2, reveal);
    const ty = lerp(lerp(fy + 0.3, 0.9, intro), 6.3, reveal);
    const dist = lerp(lerp(12 + followRocket * 4, 15, intro), 42, reveal);
    let shake = 0;
    for (const d of [...DIP_FRAMES, Math.round(G_END)]) {
      const k = frame - d;
      if (k >= 0 && k < 14) shake += Math.exp(-k / 4) * Math.sin(k * 2.6) * 0.18;
    }
    const dir = { x: -0.3, y: 0.2, z: 0.93 };
    cam.fov = 38;
    cam.aspect = size.width / size.height;
    cam.position.set(tx + dir.x * dist, ty + dir.y * dist, dir.z * dist);
    cam.position.y += shake;
    cam.lookAt(tx, ty + shake * 0.5, 0);
    cam.updateProjectionMatrix();
  }, [camera, frame, size]);
  return null;
};

const Flash: React.FC<{ text: string; at: number; color?: string; size?: number }> = ({ text, at, color = "#ff3b30", size = 64 }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 3, at + 18, at + 24], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const s = interpolate(frame, [at, at + 6], [1.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 400 }}>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: size, letterSpacing: 10, color, opacity: o, transform: `scale(${s})` }}>
        {text}
      </div>
    </AbsoluteFill>
  );
};

export const GrowthArrow: React.FC<{ handle: string }> = ({ handle }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const r = rider(frame);
  const w = waiter(frame);
  const L = arrowLength(frame);
  const growth = Math.max(0, Math.round(r.y * 100));
  const tagsOut = R_END + 10;
  const path = useMemo(() => PATH, []);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 38, near: 0.1, far: 200 }}>
        <Rig frame={frame} />
        <Lights />
        <MirrorStage>
          {(mirror) => (
            <>
              <GrowingArrow path={path} length={L} thickness={THICK} mirror={mirror} />
              <StickFigure pose={r.pose} position={r.pos} shadows={!mirror} />
              <StickFigure pose={w.pose} position={w.pos} facing={w.facing} shadows={!mirror} />
            </>
          )}
        </MirrorStage>
      </ThreeCanvas>

      <Tag text="BUILDING" sub={`GROWTH +${growth}%`} x={90} y={470} align="right" from={G_START + 30} to={tagsOut} color="#ff6b61" />
      <Tag text="WAITING" sub="GROWTH +0%" x={90} y={1330} from={G_START + 34} to={tagsOut} />

      <Statement lines={["Everyone wants growth.", "Nobody wants the dips."]} from={0} to={G_START + 30} top={300} size={74} highlight={1} />
      <Flash text="REJECTED" at={DIP_FRAMES[0]} />
      <Flash text="FAILED" at={DIP_FRAMES[1]} />
      <Flash text="STARTED OVER" at={DIP_FRAMES[2]} size={56} />
      <Flash text="BREAKTHROUGH" at={Math.round(G_END) + 4} color="#ffffff" size={60} />
      <Statement
        lines={["Growth isn't a straight line.", "It's a line that doesn't stop."]}
        from={REVEAL_END - 20}
        to={ARROW_DURATION + 30}
        top={250}
        size={64}
        highlight={1}
      />
      <Watermark handle={handle} />
      <Audio src={staticFile("audio/arrow.wav")} />
    </AbsoluteFill>
  );
};
