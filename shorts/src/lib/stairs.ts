import { DIM, Pose, legDrop, legReach, mirrorPose, mixPose, smooth } from "./rig";

// Staircase geometry shared by scenes. Step k (0-based) spans x in [k*RUN, (k+1)*RUN], top at (k+1)*RISE.
// "Surface" k: 0 = floor in front of the stairs, k>=1 = top of step k-1.
export const RISE = 0.22;
export const RUN = 0.42;

export const surfaceX = (k: number) => (k - 0.5) * RUN;
export const surfaceY = (k: number) => Math.max(0, k) * RISE;

// Climb keyframe with LEFT leg leading (on the higher surface)
const climbA = (vigor: number): Pose => ({
  lean: 0.12 + vigor * 0.35,
  head: -0.05 + vigor * 0.1,
  lHip: 1.0,
  lKnee: -1.25,
  rHip: -0.25,
  rKnee: -0.1,
  lSh: -0.35 - vigor * 0.6,
  lEl: 0.35 + vigor * 0.9,
  rSh: 0.45 + vigor * 0.8,
  rEl: 0.4 + vigor * 1.0,
  armOut: 0,
});

// Mid-step: left leg pushing straight, right leg swinging up
const climbB = (vigor: number): Pose => ({
  lean: 0.08 + vigor * 0.32,
  head: -0.05 + vigor * 0.1,
  lHip: 0.3,
  lKnee: -0.2,
  rHip: 0.85,
  rKnee: -1.7,
  lSh: 0.05,
  lEl: 0.3 + vigor * 0.9,
  rSh: 0.05,
  rEl: 0.3 + vigor * 0.9,
  armOut: 0,
});

const backDrop = legDrop(-0.25, -0.1);
const backReach = legReach(-0.25, -0.1);

/** Pose + pelvis position for a figure that has climbed `s` steps (float). */
export const climbAt = (s: number, vigor: number, z: number) => {
  const n = Math.floor(s);
  const f = s - n;
  const leadLeft = n % 2 === 0;
  const A = climbA(vigor);
  const B = climbB(vigor);
  const startPose = leadLeft ? A : mirrorPose(A);
  const midPose = leadLeft ? B : mirrorPose(B);
  const endPose = leadLeft ? mirrorPose(A) : A;
  const pose =
    f < 0.5
      ? mixPose(startPose, midPose, smooth(f / 0.5))
      : mixPose(midPose, endPose, smooth((f - 0.5) / 0.5));
  const x = surfaceX(s) - backReach;
  const y = s * RISE + backDrop + 0.11 * Math.sin(Math.PI * f);
  return { pose, position: [x, y, z] as [number, number, number] };
};

/** Standing on surface k (both feet together) */
export const standAt = (k: number, z: number, pose: Pose) => {
  const drop = Math.max(legDrop(pose.lHip, pose.lKnee), legDrop(pose.rHip, pose.rKnee));
  return [surfaceX(k + 0.6), surfaceY(k) + drop, z] as [number, number, number];
};

export const TIRED: Pose = {
  lean: 0.95,
  head: 0.25,
  lHip: 0.45,
  lKnee: -0.6,
  rHip: 0.3,
  rKnee: -0.45,
  lSh: 1.3,
  lEl: 0.15,
  rSh: 1.2,
  rEl: 0.2,
  armOut: 0,
};

// Sitting on a step, facing back down the stairs (rotate figure by PI)
export const SIT: Pose = {
  lean: 0.25,
  head: 0.45,
  lHip: 1.5,
  lKnee: -1.65,
  rHip: 1.45,
  rKnee: -1.5,
  lSh: 1.05,
  lEl: 0.75,
  rSh: 0.95,
  rEl: 0.8,
  armOut: 0,
};

export const sitPelvis = (k: number, z: number): [number, number, number] => [
  surfaceX(k) + 0.02,
  surfaceY(k) + DIM.limbR + 0.03,
  z,
];

export const CHEER: Pose = {
  lean: -0.08,
  head: -0.3,
  lHip: 0.04,
  lKnee: -0.04,
  rHip: -0.04,
  rKnee: -0.04,
  lSh: 2.85,
  lEl: 0.15,
  rSh: 2.85,
  rEl: 0.15,
  armOut: -0.42, // negative spreads raised arms into a V
};
