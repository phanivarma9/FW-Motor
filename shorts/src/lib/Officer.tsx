import React from "react";
import { Head } from "./Head";

// Stylized-realistic police officer, seen from the FRONT (+Z faces the camera).
// Built from primitives so it renders anywhere; expressions are driven by props (frame-based).

export const UNIFORM = {
  khaki: "#c9aa7c",
  khakiShade: "#b39363",
  skin: "#a8704a",
  skinShade: "#8d5a3a",
  hair: "#1b1410",
  belt: "#6a3a1c",
  shoe: "#0f0f0f",
  gold: "#e8b93c",
  silver: "#d9dde3",
  lanyard: "#1d2a52",
};

const Cloth: React.FC<{ color: string }> = ({ color }) => <meshStandardMaterial color={color} roughness={0.78} metalness={0} />;
const Skin: React.FC<{ color?: string }> = ({ color = UNIFORM.skin }) => (
  <meshPhysicalMaterial color={color} roughness={0.55} clearcoat={0.15} sheen={0.3} sheenColor="#ffb08a" />
);
const Shiny: React.FC<{ color: string; metal?: number; rough?: number }> = ({ color, metal = 0, rough = 0.3 }) => (
  <meshPhysicalMaterial color={color} metalness={metal} roughness={rough} clearcoat={0.6} />
);

// tapered limb segment hanging down from the origin
const Seg: React.FC<{ len: number; r0: number; r1: number; children?: React.ReactNode; mat: React.ReactNode }> = ({ len, r0, r1, mat }) => (
  <>
    <mesh position={[0, -len / 2, 0]} castShadow>
      <cylinderGeometry args={[r0, r1, len, 20]} />
      {mat}
    </mesh>
    <mesh position={[0, -len, 0]} castShadow>
      <sphereGeometry args={[r1, 16, 12]} />
      {mat}
    </mesh>
  </>
);

type Props = {
  position: [number, number, number]; // feet on the ground
  rotationY?: number;
  salute?: number; // 0..1
  breathe?: number; // -1..1 idle
  blink?: number; // 0 open .. 1 closed
  smile?: number; // 0..1
  brows?: number; // 0..1 raised
  look?: number; // eye direction left/right -1..1
};

// proportions (metres-ish, total ~1.95 incl. cap)
const THIGH = 0.45;
const SHIN = 0.44;
const HIP_X = 0.105;
const PELVIS_Y = THIGH + SHIN + 0.07;
const TORSO = 0.56;
const SHOULDER_X = 0.235;
const UARM = 0.3;
const FARM = 0.27;
const NECK = 0.09;

const Leg: React.FC<{ x: number }> = ({ x }) => (
  <group position={[x, 0, 0]}>
    <Seg len={THIGH} r0={0.092} r1={0.07} mat={<Cloth color={UNIFORM.khaki} />} />
    <group position={[0, -THIGH, 0]}>
      <Seg len={SHIN} r0={0.068} r1={0.056} mat={<Cloth color={UNIFORM.khaki} />} />
      {/* trouser hem + shoe */}
      <mesh position={[0, -SHIN + 0.01, 0]}>
        <cylinderGeometry args={[0.062, 0.064, 0.04, 18]} />
        <Cloth color={UNIFORM.khakiShade} />
      </mesh>
      <mesh position={[0, -SHIN - 0.035, 0.045]} scale={[0.85, 0.55, 1.6]} castShadow>
        <sphereGeometry args={[0.07, 20, 14]} />
        <Shiny color={UNIFORM.shoe} rough={0.18} />
      </mesh>
    </group>
  </group>
);

/** side +1 = officer's left (+X). raise: sideways lift, elbow: forearm fold toward head. */
const Arm: React.FC<{ side: 1 | -1; raise: number; elbow: number; forward: number; watch?: boolean }> = ({ side, raise, elbow, forward, watch }) => (
  <group position={[side * SHOULDER_X, TORSO - 0.06, 0]} rotation={[-forward, 0, side * (0.08 + raise)]}>
    {/* short sleeve */}
    <mesh position={[0, -0.09, 0]} castShadow>
      <cylinderGeometry args={[0.072, 0.074, 0.18, 18]} />
      <Cloth color={UNIFORM.khaki} />
    </mesh>
    <mesh castShadow>
      <sphereGeometry args={[0.074, 18, 14]} />
      <Cloth color={UNIFORM.khaki} />
    </mesh>
    <group position={[0, -0.17, 0]}>
      <Seg len={UARM - 0.17} r0={0.052} r1={0.048} mat={<Skin />} />
    </group>
    <group position={[0, -UARM, 0]} rotation={[-0.06, 0, side * elbow]}>
      <Seg len={FARM} r0={0.047} r1={0.04} mat={<Skin />} />
      {watch ? (
        <mesh position={[0, -FARM + 0.04, 0]}>
          <cylinderGeometry args={[0.046, 0.046, 0.03, 18]} />
          <Shiny color="#151515" rough={0.25} />
        </mesh>
      ) : null}
      {/* hand */}
      <mesh position={[0, -FARM - 0.05, 0.005]} scale={[0.75, 1.15, 0.5]} castShadow>
        <sphereGeometry args={[0.055, 18, 14]} />
        <Skin />
      </mesh>
    </group>
  </group>
);

export const Officer: React.FC<Props> = ({ position, rotationY = 0, salute = 0, breathe = 0, blink = 0, smile = 0, brows = 0, look = 0 }) => {
  const s = salute;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group position={[0, PELVIS_Y, 0]}>
        <Leg x={HIP_X} />
        <Leg x={-HIP_X} />
        {/* hips / trousers seat */}
        <mesh position={[0, 0.0, 0]} scale={[1, 1, 0.7]} castShadow>
          <cylinderGeometry args={[0.185, 0.17, 0.14, 28]} />
          <Cloth color={UNIFORM.khaki} />
        </mesh>
        <mesh position={[0, -0.06, 0]} scale={[1.6, 0.7, 1]}>
          <sphereGeometry args={[0.085, 18, 12]} />
          <Cloth color={UNIFORM.khaki} />
        </mesh>
        <group scale={[1, 1 + breathe * 0.006, 1]}>
          {/* shirt torso: tapered, flattened front-back */}
          <mesh position={[0, TORSO / 2 + 0.02, 0]} scale={[1, 1, 0.68]} castShadow>
            <cylinderGeometry args={[0.215, 0.18, TORSO, 28]} />
            <Cloth color={UNIFORM.khaki} />
          </mesh>
          <mesh position={[0, TORSO + 0.02, 0]} scale={[1, 0.45, 0.68]} castShadow>
            <sphereGeometry args={[0.215, 28, 16]} />
            <Cloth color={UNIFORM.khaki} />
          </mesh>
          {/* button placket */}
          <mesh position={[0, TORSO / 2 + 0.03, 0.135]}>
            <boxGeometry args={[0.035, TORSO - 0.06, 0.008]} />
            <Cloth color={UNIFORM.khakiShade} />
          </mesh>
          {[0.18, 0.3, 0.42].map((y) => (
            <mesh key={y} position={[0, y, 0.141]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.009, 0.009, 0.006, 10]} />
              <Shiny color={UNIFORM.silver} metal={0.8} />
            </mesh>
          ))}
          {/* chest pockets with flaps */}
          {[1, -1].map((side) => (
            <group key={side} position={[side * 0.1, TORSO * 0.68, 0.128]} rotation={[-0.12, 0, 0]}>
              <mesh>
                <boxGeometry args={[0.1, 0.11, 0.01]} />
                <Cloth color={UNIFORM.khaki} />
              </mesh>
              <mesh position={[0, 0.045, 0.007]}>
                <boxGeometry args={[0.105, 0.035, 0.008]} />
                <Cloth color={UNIFORM.khakiShade} />
              </mesh>
            </group>
          ))}
          {/* name plate */}
          <mesh position={[0.1, TORSO * 0.82, 0.14]}>
            <boxGeometry args={[0.085, 0.022, 0.006]} />
            <Shiny color="#111" />
          </mesh>
          {/* collar */}
          {[1, -1].map((side) => (
            <mesh key={side} position={[side * 0.045, TORSO + 0.06, 0.07]} rotation={[0.5, 0, side * 0.6]}>
              <boxGeometry args={[0.07, 0.045, 0.012]} />
              <Cloth color={UNIFORM.khakiShade} />
            </mesh>
          ))}
          {/* epaulettes */}
          {[1, -1].map((side) => (
            <mesh key={side} position={[side * (SHOULDER_X - 0.07), TORSO + 0.065, 0]} rotation={[0, 0, side * -0.15]}>
              <boxGeometry args={[0.15, 0.022, 0.085]} />
              <Cloth color={UNIFORM.khakiShade} />
            </mesh>
          ))}
          {/* lanyard over left shoulder */}
          <mesh position={[0.16, TORSO * 0.7, 0.05]} rotation={[0.2, 0.3, 0.35]}>
            <torusGeometry args={[0.12, 0.009, 6, 30, Math.PI * 1.1]} />
            <meshStandardMaterial color={UNIFORM.lanyard} roughness={0.7} />
          </mesh>
          {/* belt, buckle, holster */}
          <mesh position={[0, 0.07, 0]} scale={[1, 1, 0.7]}>
            <cylinderGeometry args={[0.188, 0.188, 0.06, 32]} />
            <Shiny color={UNIFORM.belt} rough={0.35} />
          </mesh>
          <mesh position={[0, 0.07, 0.135]}>
            <boxGeometry args={[0.08, 0.055, 0.012]} />
            <Shiny color={UNIFORM.silver} metal={0.9} rough={0.2} />
          </mesh>
          <mesh position={[-0.2, -0.03, 0.02]} rotation={[0, 0, 0.08]} castShadow>
            <boxGeometry args={[0.06, 0.17, 0.09]} />
            <Shiny color={UNIFORM.belt} rough={0.35} />
          </mesh>

          <Arm side={1} raise={0.02} elbow={0.06} forward={0.03} watch />
          <Arm side={-1} raise={0.02 + s * 1.4} elbow={0.06 + s * 2.45} forward={0.04 + s * 0.35} />

          {/* neck + head */}
          <mesh position={[0, TORSO + 0.08, 0]}>
            <cylinderGeometry args={[0.055, 0.06, NECK, 18]} />
            <Skin />
          </mesh>
          <group position={[0, TORSO + 0.08 + NECK / 2 + 0.15, 0.012]}>
            <Head blink={blink} smile={smile} brows={brows} look={look} />
          </group>
        </group>
      </group>
    </group>
  );
};

export const OFFICER_HEIGHT = PELVIS_Y + TORSO + 0.08 + NECK / 2 + 0.15 + 0.29;
