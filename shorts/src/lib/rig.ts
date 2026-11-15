// Pose model for the pictogram stick figure.
// All joint angles are radians in the figure's sagittal plane (side view).
// Positive hip / shoulder = limb swings forward. Negative knee = normal knee bend.
// Positive elbow = forearm bends forward/up. Positive lean = torso tips forward.

export type Pose = {
  lean: number;
  head: number; // extra head nod (+ = look down)
  lHip: number;
  lKnee: number;
  rHip: number;
  rKnee: number;
  lSh: number;
  lEl: number;
  rSh: number;
  rEl: number;
  armOut: number; // sideways spread of arms (for celebration / shrug)
};

export const DIM = {
  thigh: 0.45,
  shin: 0.45,
  torso: 0.56,
  upperArm: 0.32,
  foreArm: 0.32,
  limbR: 0.072,
  torsoR: 0.095,
  headR: 0.2,
  neckGap: 0.28,
  hipZ: 0.1,
  shoulderZ: 0.19,
};

export const STAND: Pose = {
  lean: 0.03,
  head: 0,
  lHip: 0.02,
  lKnee: -0.04,
  rHip: -0.02,
  rKnee: -0.04,
  lSh: 0.08,
  lEl: 0.1,
  rSh: -0.06,
  rEl: 0.1,
  armOut: 0,
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const smooth = (t: number) => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};

export const mixPose = (a: Pose, b: Pose, t: number): Pose => {
  const out = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => {
    out[k] = lerp(a[k], b[k], t);
  });
  return out;
};

export const mirrorPose = (p: Pose): Pose => ({
  ...p,
  lHip: p.rHip,
  lKnee: p.rKnee,
  rHip: p.lHip,
  rKnee: p.lKnee,
  lSh: p.rSh,
  lEl: p.rEl,
  rSh: p.lSh,
  rEl: p.lEl,
});

// Vertical distance from pelvis down to a foot for given hip / knee angles.
export const legDrop = (hip: number, knee: number) =>
  DIM.thigh * Math.cos(hip) + DIM.shin * Math.cos(hip + knee);
export const legReach = (hip: number, knee: number) =>
  DIM.thigh * Math.sin(hip) + DIM.shin * Math.sin(hip + knee);

// Piecewise keyframe sampler for poses
export const samplePoses = (keys: [number, Pose][], t: number): Pose => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, p0] = keys[i];
    const [t1, p1] = keys[i + 1];
    if (t <= t1) return mixPose(p0, p1, smooth((t - t0) / (t1 - t0)));
  }
  return keys[keys.length - 1][1];
};

// Piecewise numeric keyframes with smoothstep easing
export const sampleNum = (keys: [number, number][], t: number): number => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    if (t <= t1) return lerp(v0, v1, smooth((t - t0) / (t1 - t0)));
  }
  return keys[keys.length - 1][1];
};

// Same but linear (for constant-speed motion)
export const sampleLinear = (keys: [number, number][], t: number): number => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    if (t <= t1) return lerp(v0, v1, (t - t0) / (t1 - t0));
  }
  return keys[keys.length - 1][1];
};
