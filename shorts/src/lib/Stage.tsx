import React, { useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/** Static studio environment for glossy reflections. Set once, never animated. */
const Environment: React.FC = () => {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = tex;
    scene.environmentIntensity = 0.45;
    scene.background = new THREE.Color("#000000");
    scene.fog = new THREE.Fog("#000000", 60, 130);
    return () => {
      scene.environment = null;
      tex.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
};

export const Lights: React.FC = () => (
  <>
    <Environment />
    <ambientLight intensity={0.18} />
    <directionalLight
      position={[-4, 9, 7]}
      intensity={1.9}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-10}
      shadow-camera-right={14}
      shadow-camera-top={12}
      shadow-camera-bottom={-6}
      shadow-bias={-0.0004}
      shadow-radius={4}
    />
    {/* cool rim from behind */}
    <directionalLight position={[6, 5, -8]} intensity={1.3} color="#dfe8ff" />
    {/* warm low fill */}
    <pointLight position={[-3, 1.5, 4]} intensity={6} distance={12} color="#ffe6cc" />
  </>
);

/**
 * Black glossy floor: renders `children` normally, plus a mirrored copy under the floor
 * seen through a dark translucent plane - deterministic fake reflection.
 */
export const MirrorStage: React.FC<{
  children: (mirror: boolean) => React.ReactNode;
  floorSize?: number;
}> = ({ children, floorSize = 80 }) => (
  <>
    {children(false)}
    <group scale={[1, -1, 1]}>{children(true)}</group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0005, 0]} renderOrder={1}>
      <planeGeometry args={[floorSize, floorSize]} />
      <meshBasicMaterial color="#000000" transparent opacity={0.8} depthWrite={false} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow renderOrder={2}>
      <planeGeometry args={[floorSize, floorSize]} />
      <shadowMaterial transparent opacity={0.55} depthWrite={false} />
    </mesh>
  </>
);

export type Brick = { x: number; y: number; z: number; sx: number; sy: number; sz: number };

const BRICK_SHADES = ["#b9ab99", "#ad9f8d", "#c2b5a4", "#a89a88", "#b4a693"];

/** Many bricks in one draw call. Positions are static (geometry, not animation). */
export const Bricks: React.FC<{
  bricks: Brick[];
  mirror?: boolean;
  visibleCount?: number; // how many bricks are shown (for build-up animations)
}> = ({ bricks, mirror = false, visibleCount }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geom = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 2, 0.06), []);
  const count = visibleCount ?? bricks.length;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    bricks.forEach((b, i) => {
      m.compose(
        new THREE.Vector3(b.x, b.y, b.z),
        new THREE.Quaternion(),
        new THREE.Vector3(b.sx, b.sy, b.sz),
      );
      mesh.setMatrixAt(i, m);
      c.set(BRICK_SHADES[(i * 7 + Math.floor(b.y * 13)) % BRICK_SHADES.length]);
      mesh.setColorAt(i, c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [bricks]);
  useLayoutEffect(() => {
    if (ref.current) ref.current.count = Math.min(count, bricks.length);
  }, [count, bricks.length]);
  return (
    <instancedMesh
      ref={ref}
      args={[geom, undefined, bricks.length]}
      castShadow={!mirror}
      receiveShadow={!mirror}
    >
      <meshStandardMaterial roughness={0.82} metalness={0} side={THREE.DoubleSide} />
    </instancedMesh>
  );
};

/** Brick staircase: `steps` columns, each stacked from the floor. */
export const stairBricks = (
  steps: number,
  rise: number,
  run: number,
  width: number,
  brickLen = 0.6,
  gap = 0.018,
): Brick[] => {
  const out: Brick[] = [];
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j <= i; j++) {
      const offset = (j + i) % 2 === 0 ? 0 : brickLen / 2;
      let z0 = -width / 2;
      let first = true;
      while (z0 < width / 2 - 0.001) {
        const len = first && offset > 0 ? offset : brickLen;
        const z1 = Math.min(width / 2, z0 + len);
        out.push({
          x: (i + 0.5) * run,
          y: j * rise + rise / 2,
          z: (z0 + z1) / 2,
          sx: run - gap,
          sy: rise - gap,
          sz: z1 - z0 - gap,
        });
        z0 = z1;
        first = false;
      }
    }
  }
  return out;
};
