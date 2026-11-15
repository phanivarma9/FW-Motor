import React, { useMemo } from "react";
import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { PerspectiveCamera } from "three";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { StickFigure } from "../lib/StickFigure";
import { Lights, MirrorStage, Bricks, stairBricks } from "../lib/Stage";
import { CHEER, RISE, RUN, SIT, TIRED, climbAt, sitPelvis, standAt } from "../lib/stairs";
import { Pose, STAND, mixPose, sampleNum, smooth, lerp } from "../lib/rig";
import { Statement, Tag, Watermark } from "../lib/Hud";

export const STAIRS_FPS = 30;
export const STAIRS_DURATION = 720;
const STEPS = 18;
const WIDTH = 2.6;
const Z_MOT = 0.65; // front lane (closer to camera)
const Z_CON = -0.65; // back lane

// ---- timeline (frames) ----
const C_START = 45;
const C_RATE = 24; // frames per step: steady
const C_TOP = C_START + STEPS * C_RATE; // 477

// Motivated: two bursts, each ending in exhaustion + sitting down
const motSteps = (f: number) =>
  sampleNum(
    [
      [C_START, 0],
      [150, 7],
      [330, 7],
      [390, 10],
    ],
    f,
  );

type FigState = { pose: Pose; pos: [number, number, number]; facing: number };

const motivated = (f: number): FigState => {
  const s = motSteps(f);
  const climb = (vigor: number) => climbAt(s, vigor, Z_MOT);
  // phases: [start, end, kind]
  if (f < C_START) {
    return { pose: STAND, pos: standAt(0, Z_MOT, STAND), facing: 0 };
  }
  const burst = (from: number, to: number, k: number, next?: number): FigState | null => {
    // climbing
    if (f < to) {
      const c = climb(1);
      return { pose: c.pose, pos: c.position, facing: 0 };
    }
    // tired: hands on knees, breathing
    const tiredEnd = to + 40;
    const sitEnd = tiredEnd + 30;
    const standPos = standAt(k, Z_MOT, TIRED);
    const breathe = Math.sin((f - to) * 0.45) * 0.04;
    if (f < tiredEnd) {
      const c = climb(1);
      const t = smooth((f - to) / 12);
      const p = mixPose(c.pose, TIRED, t);
      return {
        pose: { ...p, lean: p.lean + breathe },
        pos: [lerp(c.position[0], standPos[0], t), lerp(c.position[1], standPos[1], t) + breathe * 0.3, Z_MOT],
        facing: 0,
      };
    }
    const sitPos = sitPelvis(k, Z_MOT);
    if (f < sitEnd || next === undefined || f < next) {
      const t = smooth((f - tiredEnd) / 30);
      const slump = Math.sin(f * 0.08) * 0.03;
      const p = mixPose(TIRED, SIT, t);
      return {
        pose: { ...p, head: p.head + slump },
        pos: [lerp(standPos[0], sitPos[0], t), lerp(standPos[1], sitPos[1], t), Z_MOT],
        facing: lerp(0, Math.PI, t),
      };
    }
    void from;
    return null;
  };
  if (f < 330) {
    const r = burst(C_START, 150, 7, 330);
    if (r) return r;
  }
  if (f < 345) {
    // gets up again, determined
    const t = smooth((f - 330) / 15);
    const sitPos = sitPelvis(7, Z_MOT);
    const c = climbAt(7, 1, Z_MOT);
    return {
      pose: mixPose(SIT, c.pose, t),
      pos: [lerp(sitPos[0], c.position[0], t), lerp(sitPos[1], c.position[1], t), Z_MOT],
      facing: lerp(Math.PI, 0, t),
    };
  }
  return burst(345, 390, 10) as FigState;
};

const consistent = (f: number): FigState => {
  if (f < C_START) return { pose: STAND, pos: standAt(0, Z_CON, STAND), facing: 0 };
  if (f < C_TOP) {
    const c = climbAt((f - C_START) / C_RATE, 0, Z_CON);
    return { pose: c.pose, pos: c.position, facing: 0 };
  }
  const end = climbAt(STEPS, 0, Z_CON);
  const top = standAt(STEPS, Z_CON, STAND);
  const t = smooth((f - C_TOP) / 12);
  const toStand: [number, number, number] = [
    lerp(end.position[0], top[0], t),
    lerp(end.position[1], top[1], t),
    Z_CON,
  ];
  const standPose = mixPose(end.pose, STAND, t);
  const cheerT = smooth((f - (C_TOP + 18)) / 16);
  return { pose: mixPose(standPose, CHEER, cheerT), pos: toStand, facing: -0.5 * cheerT };
};

/** Camera driven purely by frame */
const Rig: React.FC<{ frame: number }> = ({ frame }) => {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    // Fixed wide 3/4 shot over the whole staircase, slow push-in, gentle rise at the end
    const push = sampleNum([[0, 0], [C_TOP, 1], [STAIRS_DURATION, 1.15]], frame);
    const lift = sampleNum([[C_TOP - 60, 0], [C_TOP + 60, 1]], frame);
    const target = { x: 3.4 + push * 0.4, y: 1.7 + lift * 0.5 };
    cam.fov = 38;
    cam.aspect = size.width / size.height;
    const dist = 23 - push * 3.5;
    const dir = { x: -0.5, y: 0.36, z: 0.79 };
    cam.position.set(target.x + dir.x * dist, target.y + dir.y * dist, dir.z * dist);
    cam.lookAt(target.x, target.y, 0);
    cam.updateProjectionMatrix();
  }, [camera, frame, size]);
  return null;
};

export const StairsOfConsistency: React.FC<{ handle: string }> = ({ handle }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const bricks = useMemo(() => stairBricks(STEPS, RISE, RUN, WIDTH), []);
  const mot = motivated(frame);
  const con = consistent(frame);
  const motStep = Math.min(10, Math.round(motSteps(frame)));
  const conStep = Math.min(STEPS, Math.max(0, Math.floor((frame - C_START) / C_RATE + 0.5)));

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 34, near: 0.1, far: 80 }}>
        <Rig frame={frame} />
        <Lights />
        <MirrorStage>
          {(mirror) => (
            <>
              <Bricks bricks={bricks} mirror={mirror} />
              <StickFigure pose={mot.pose} position={mot.pos} facing={mot.facing} shadows={!mirror} accent="#ff3b30" />
              <StickFigure pose={con.pose} position={con.pos} facing={con.facing} shadows={!mirror} />
            </>
          )}
        </MirrorStage>
      </ThreeCanvas>

      {/* labels */}
      <Tag text="MOTIVATED" sub={`STEP ${String(motStep).padStart(2, "0")}`} x={90} y={1330} from={8} to={C_TOP + 30} color="#ff6b61" />
      <Tag text="CONSISTENT" sub={`STEP ${String(conStep).padStart(2, "0")}`} x={90} y={470} align="right" from={100} to={C_TOP + 30} />

      {/* hook */}
      <Statement lines={["Same stairs.", "Different strategy."]} from={4} to={100} top={300} size={80} highlight={1} />
      {/* payoff */}
      <Statement
        lines={["Motivation gets you started.", "Consistency gets you there."]}
        from={C_TOP + 40}
        to={STAIRS_DURATION + 30}
        top={250}
        size={66}
        highlight={1}
      />
      <Watermark handle={handle} />
      <Audio src={staticFile("audio/stairs.wav")} />
    </AbsoluteFill>
  );
};
