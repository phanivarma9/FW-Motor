import React from "react";

// Stylized police officer built from the same glossy-capsule language as the pictogram figure,
// but designed to be seen from the FRONT. Local axes: +Z is the direction the officer faces.

export const UNIFORM = {
  khaki: "#c7a676",
  khakiDark: "#a88a5d",
  skin: "#f4f1ec",
  belt: "#6b3f22",
  shoe: "#141414",
  gold: "#e8b93c",
  silver: "#d9dde3",
};

const Gloss: React.FC<{ color: string; rough?: number; metal?: number }> = ({ color, rough = 0.42, metal = 0 }) => (
  <meshPhysicalMaterial color={color} roughness={rough} metalness={metal} clearcoat={0.6} clearcoatRoughness={0.35} />
);

const Capsule: React.FC<{ r: number; len: number; color: string; y?: number }> = ({ r, len, color, y = -len / 2 }) => (
  <mesh position={[0, y, 0]} castShadow>
    <capsuleGeometry args={[r, len, 6, 16]} />
    <Gloss color={color} />
  </mesh>
);

type Props = {
  position: [number, number, number]; // feet position (on the pedestal top)
  rotationY?: number;
  salute?: number; // 0..1
  breathe?: number; // small idle motion value
};

const THIGH = 0.46;
const SHIN = 0.46;
const LEG_R = 0.075;
const HIP_X = 0.1;
const TORSO = 0.5;
const TORSO_R = 0.135;
const SHOULDER_X = 0.215;
const UARM = 0.31;
const FARM = 0.3;
const ARM_R = 0.062;
const HEAD_R = 0.19;
const PELVIS_Y = THIGH + SHIN + 0.06;

const Leg: React.FC<{ x: number }> = ({ x }) => (
  <group position={[x, 0, 0]}>
    <Capsule r={LEG_R} len={THIGH} color={UNIFORM.khaki} />
    <group position={[0, -THIGH, 0]}>
      <Capsule r={LEG_R * 0.95} len={SHIN} color={UNIFORM.khaki} />
      {/* shoe */}
      <mesh position={[0, -SHIN - 0.03, 0.06]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <capsuleGeometry args={[0.065, 0.14, 6, 12]} />
        <Gloss color={UNIFORM.shoe} rough={0.25} />
      </mesh>
    </group>
  </group>
);

/** side: +1 = officer's left (+X), -1 = right (-X). */
const Arm: React.FC<{ side: 1 | -1; raise: number; elbow: number; forward: number; swing: number }> = ({
  side,
  raise,
  elbow,
  forward,
  swing,
}) => (
  // raise: sideways lift (rad), elbow: forearm fold toward the head (rad), forward: tilt toward +Z
  <group position={[side * SHOULDER_X, TORSO, 0]} rotation={[-forward + swing, 0, side * (0.1 + raise)]}>
    <Capsule r={ARM_R} len={UARM} color={UNIFORM.khaki} />
    {/* short sleeve cuff */}
    <mesh position={[0, -UARM * 0.55, 0]} castShadow>
      <cylinderGeometry args={[ARM_R * 1.25, ARM_R * 1.25, 0.06, 16]} />
      <Gloss color={UNIFORM.khakiDark} />
    </mesh>
    <group position={[0, -UARM, 0]} rotation={[-0.08, 0, side * elbow]}>
      <Capsule r={ARM_R * 0.9} len={FARM} color={UNIFORM.skin} />
    </group>
  </group>
);

export const Officer: React.FC<Props> = ({ position, rotationY = 0, salute = 0, breathe = 0 }) => {
  const s = salute;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group position={[0, PELVIS_Y, 0]}>
        <Leg x={HIP_X} />
        <Leg x={-HIP_X} />
        <group rotation={[breathe * 0.02, 0, 0]}>
          {/* torso / shirt */}
          <mesh position={[0, TORSO / 2, 0]} castShadow>
            <capsuleGeometry args={[TORSO_R, TORSO, 8, 20]} />
            <Gloss color={UNIFORM.khaki} />
          </mesh>
          {/* hips */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.02, 0]} castShadow>
            <capsuleGeometry args={[LEG_R * 1.15, HIP_X * 2, 6, 16]} />
            <Gloss color={UNIFORM.khaki} />
          </mesh>
          {/* belt + buckle */}
          <mesh position={[0, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[TORSO_R * 1.02, 0.032, 10, 40]} />
            <Gloss color={UNIFORM.belt} rough={0.3} />
          </mesh>
          <mesh position={[0, 0.09, TORSO_R + 0.03]} castShadow>
            <boxGeometry args={[0.1, 0.07, 0.02]} />
            <Gloss color={UNIFORM.silver} rough={0.2} metal={0.8} />
          </mesh>
          {/* name plate + pocket flaps */}
          <mesh position={[0.07, TORSO * 0.78, TORSO_R + 0.005]}>
            <boxGeometry args={[0.09, 0.025, 0.01]} />
            <Gloss color="#111" />
          </mesh>
          {/* shoulder epaulettes */}
          {[1, -1].map((side) => (
            <mesh key={side} position={[side * (SHOULDER_X - 0.06), TORSO + 0.05, 0]} castShadow>
              <boxGeometry args={[0.15, 0.03, 0.09]} />
              <Gloss color={UNIFORM.khakiDark} />
            </mesh>
          ))}
          <Arm side={1} raise={0.02} elbow={0.08} forward={0.02} swing={breathe * 0.03} />
          <Arm side={-1} raise={0.02 + s * 1.35} elbow={0.08 + s * 2.3} forward={0.04 + s * 0.35} swing={-breathe * 0.03 * (1 - s)} />
          {/* head */}
          <group position={[0, TORSO + 0.28, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[HEAD_R, 40, 40]} />
              <Gloss color={UNIFORM.skin} rough={0.3} />
            </mesh>
            {/* cap */}
            <group position={[0, HEAD_R * 0.62, 0]} rotation={[-0.08, 0, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[HEAD_R * 1.08, HEAD_R * 1.0, 0.13, 40]} />
                <Gloss color={UNIFORM.khaki} />
              </mesh>
              <mesh position={[0, -0.045, 0]}>
                <cylinderGeometry args={[HEAD_R * 1.03, HEAD_R * 1.03, 0.04, 40]} />
                <Gloss color={UNIFORM.belt} rough={0.3} />
              </mesh>
              {/* visor */}
              <mesh position={[0, -0.06, HEAD_R * 0.75]} rotation={[0.25, 0, 0]} scale={[1, 0.18, 0.75]}>
                <sphereGeometry args={[HEAD_R * 0.75, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <Gloss color="#1a1410" rough={0.15} />
              </mesh>
              {/* badge */}
              <mesh position={[0, 0.0, HEAD_R * 1.05]}>
                <cylinderGeometry args={[0.035, 0.035, 0.015, 20]} />
                <Gloss color={UNIFORM.gold} rough={0.2} metal={0.9} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

export const OFFICER_HEIGHT = PELVIS_Y + TORSO + 0.28 + HEAD_R + 0.15;
