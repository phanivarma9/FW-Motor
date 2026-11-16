import React, { useMemo } from "react";
import * as THREE from "three";

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
const HEAD_R = 0.135;
const NECK = 0.09;
const HEAD_SCALE = 1.2;

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

const shapeGeom = (pts: [number, number][], depth: number, bevel = 0.004) => {
  const sh = new THREE.Shape();
  pts.forEach(([x, y], i) => (i === 0 ? sh.moveTo(x, y) : sh.lineTo(x, y)));
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 8 });
  g.translate(0, 0, -depth / 2);
  return g;
};

// Classic thick police moustache: full in the middle, tapering and drooping at the ends.
const halfMoustache: [number, number][] = [
  [0.0, 0.013], [0.012, 0.016], [0.026, 0.015], [0.04, 0.01], [0.052, 0.0], [0.06, -0.014],
  [0.058, -0.02], [0.05, -0.012], [0.038, -0.006], [0.024, -0.005], [0.01, -0.007], [0.0, -0.004],
];
const moustachePts: [number, number][] = [
  ...halfMoustache,
  ...halfMoustache.slice(1, -1).reverse().map(([x, y]) => [-x, y] as [number, number]),
];
// tapered, slightly arched eyebrow (inner end at x=0)
const browPts: [number, number][] = [
  [0, -0.008], [0.02, -0.004], [0.04, -0.003], [0.055, -0.008], [0.052, -0.002], [0.038, 0.005], [0.018, 0.008], [0, 0.007],
];

const Face: React.FC<{ blink: number; smile: number; brows: number; look: number }> = ({ blink, smile, brows, look }) => {
  const g = useMemo(
    () => ({
      moustache: shapeGeom(moustachePts, 0.014),
      brow: shapeGeom(browPts, 0.008, 0.003),
    }),
    [],
  );
  const mouth = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12 - 0.5;
      pts.push(new THREE.Vector3(u * 0.062, u * u * (0.025 + smile * 0.08), 0));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.0045, 6, false);
  }, [smile]);
  const fz = HEAD_R * 0.93;
  const eyeY = 0.016;
  return (
    <group>
      {/* brow ridge / cheek shading for structure */}
      <mesh position={[0, 0.042, fz - 0.03]} scale={[1.7, 0.45, 0.6]}>
        <sphereGeometry args={[0.05, 20, 12]} />
        <Skin />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={`ck${s}`} position={[s * 0.058, -0.03, fz - 0.05]} scale={[1, 0.8, 0.6]}>
          <sphereGeometry args={[0.04, 16, 12]} />
          <Skin />
        </mesh>
      ))}
      {/* eyes */}
      {[1, -1].map((s) => (
        <group key={s} position={[s * 0.046, eyeY, fz - 0.008]}>
          <mesh scale={[1.45, 0.82, 0.55]}>
            <sphereGeometry args={[0.02, 20, 14]} />
            <meshStandardMaterial color="#f2eee6" roughness={0.25} />
          </mesh>
          <mesh position={[look * 0.006, -0.001, 0.0095]} scale={[1, 1, 0.5]}>
            <sphereGeometry args={[0.0118, 18, 14]} />
            <meshStandardMaterial color="#3a2414" roughness={0.2} />
          </mesh>
          <mesh position={[look * 0.006, -0.001, 0.0135]} scale={[1, 1, 0.4]}>
            <sphereGeometry args={[0.0062, 12, 10]} />
            <meshStandardMaterial color="#050302" roughness={0.1} />
          </mesh>
          <mesh position={[look * 0.006 + 0.004, 0.004, 0.0165]}>
            <sphereGeometry args={[0.0024, 8, 6]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* upper lid with lash line, closes for blink */}
          <group position={[0, 0.0, 0.002]} rotation={[-0.75 + blink * 2.0, 0, 0]}>
            <mesh scale={[1.5, 0.9, 0.66]}>
              <sphereGeometry args={[0.0205, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <Skin color={UNIFORM.skinShade} />
            </mesh>
          </group>
          <mesh position={[0, 0.0125 - blink * 0.014, 0.006]} rotation={[0, 0, 0]} scale={[1, 1, 1]}>
            <boxGeometry args={[0.058, 0.0035, 0.006]} />
            <meshStandardMaterial color="#120a06" roughness={0.6} />
          </mesh>
          {/* lower lid */}
          <mesh position={[0, -0.0145, 0.004]} scale={[1.5, 0.35, 0.6]}>
            <sphereGeometry args={[0.02, 16, 8]} />
            <Skin />
          </mesh>
          {/* eyebrow */}
          <mesh geometry={g.brow} position={[s * 0.026 * -1 + s * 0.0, 0.034 + brows * 0.012, 0.012]} scale={[s, 1.45, 1]} rotation={[-0.15, 0, 0]}>
            <meshStandardMaterial color={UNIFORM.hair} roughness={0.95} />
          </mesh>
        </group>
      ))}
      {/* nose: bridge + tip + nostrils */}
      <mesh position={[0, -0.004, fz + 0.004]} rotation={[0.18, 0, 0]} scale={[0.55, 1, 0.7]}>
        <capsuleGeometry args={[0.014, 0.045, 6, 12]} />
        <Skin />
      </mesh>
      <mesh position={[0, -0.034, fz + 0.016]} scale={[1.1, 0.9, 0.95]}>
        <sphereGeometry args={[0.018, 16, 12]} />
        <Skin />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={`n${s}`} position={[s * 0.017, -0.04, fz + 0.006]} scale={[1, 0.8, 0.9]}>
          <sphereGeometry args={[0.012, 12, 10]} />
          <Skin />
        </mesh>
      ))}
      {/* moustache */}
      <mesh geometry={g.moustache} position={[0, -0.06, fz + 0.006]} rotation={[0.25, 0, 0]} scale={[1, 1 + smile * 0.06, 1]}>
        <meshStandardMaterial color="#120c09" roughness={0.92} />
      </mesh>
      {/* lips */}
      <mesh geometry={mouth} position={[0, -0.084, fz - 0.002]}>
        <meshStandardMaterial color="#3a160d" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.093, fz - 0.006]} scale={[1.6, 0.55, 0.7]}>
        <sphereGeometry args={[0.014, 14, 10]} />
        <Skin color="#8a4b35" />
      </mesh>
      {/* chin */}
      <mesh position={[0, -0.112, fz - 0.045]} scale={[1.3, 0.75, 0.7]}>
        <sphereGeometry args={[0.032, 16, 12]} />
        <Skin />
      </mesh>
      {/* ears */}
      {[1, -1].map((s) => (
        <mesh key={`e${s}`} position={[s * HEAD_R * 0.97, 0, -0.005]} scale={[0.45, 1, 0.75]}>
          <sphereGeometry args={[0.035, 14, 12]} />
          <Skin />
        </mesh>
      ))}
      {/* sideburns */}
      {[1, -1].map((s) => (
        <mesh key={`sb${s}`} position={[s * HEAD_R * 0.9, 0.02, 0.03]} scale={[0.35, 1, 0.6]}>
          <sphereGeometry args={[0.03, 12, 10]} />
          <meshStandardMaterial color={UNIFORM.hair} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
};

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
          <group position={[0, TORSO + 0.08 + NECK / 2 + HEAD_R * 0.92 * HEAD_SCALE, 0.01]} scale={HEAD_SCALE}>
            <mesh scale={[0.93, 1.1, 1]} castShadow>
              <sphereGeometry args={[HEAD_R, 40, 32]} />
              <Skin />
            </mesh>
            {/* jaw */}
            <mesh position={[0, -0.06, 0.02]} scale={[0.9, 0.7, 0.9]}>
              <sphereGeometry args={[HEAD_R * 0.8, 28, 20]} />
              <Skin />
            </mesh>
            {/* hair at sides/back, under the cap */}
            <mesh position={[0, 0.03, -0.012]} scale={[0.97, 1.0, 1.02]}>
              <sphereGeometry args={[HEAD_R * 1.0, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
              <meshStandardMaterial color={UNIFORM.hair} roughness={0.9} />
            </mesh>
            <group scale={[0.93, 1.1, 1]}>
              <Face blink={blink} smile={smile} brows={brows} look={look} />
            </group>
            {/* peaked cap */}
            <group position={[0, HEAD_R * 0.9, -0.005]} rotation={[-0.06, 0, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[HEAD_R * 1.2, HEAD_R * 0.98, 0.1, 40]} />
                <Cloth color={UNIFORM.khaki} />
              </mesh>
              <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[HEAD_R * 1.2, HEAD_R * 1.2, 0.012, 40]} />
                <Cloth color={UNIFORM.khakiShade} />
              </mesh>
              <mesh position={[0, -0.032, 0]}>
                <cylinderGeometry args={[HEAD_R * 1.0, HEAD_R * 1.0, 0.035, 40]} />
                <Shiny color="#3b2414" rough={0.3} />
              </mesh>
              <mesh position={[0, -0.05, HEAD_R * 0.78]} rotation={[0.32, 0, 0]} scale={[1, 0.15, 0.7]}>
                <sphereGeometry args={[HEAD_R * 0.85, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <Shiny color="#0d0a08" rough={0.12} />
              </mesh>
              <mesh position={[0, -0.005, HEAD_R * 1.0]} rotation={[Math.PI / 2 - 0.1, 0, 0]}>
                <cylinderGeometry args={[0.024, 0.024, 0.012, 20]} />
                <Shiny color={UNIFORM.gold} metal={0.9} rough={0.2} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

export const OFFICER_HEIGHT = PELVIS_Y + TORSO + 0.08 + NECK + HEAD_R * 2 * HEAD_SCALE + 0.14;
