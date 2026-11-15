import React, { useMemo } from "react";
import * as THREE from "three";
import { makePath } from "./path";

const ArrowMat: React.FC<{ color: string }> = ({ color }) => (
  <meshPhysicalMaterial
    color={color}
    roughness={0.28}
    clearcoat={1}
    clearcoatRoughness={0.2}
    emissive={color}
    emissiveIntensity={0.18}
  />
);

/** A thick 3D arrow that grows along a polyline up to `length`. Lies in the XY plane at z. */
export const GrowingArrow: React.FC<{
  path: ReturnType<typeof makePath>;
  length: number;
  z?: number;
  thickness?: number;
  depth?: number;
  color?: string;
  mirror?: boolean;
}> = ({ path, length, z = 0, thickness = 0.16, depth = 0.55, color = "#ff3b30", mirror = false }) => {
  const head = useMemo(() => {
    const s = new THREE.Shape();
    const h = 0.7;
    const w = 0.42;
    s.moveTo(0, -w);
    s.lineTo(h, 0);
    s.lineTo(0, w);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
    g.translate(0, 0, -depth / 2);
    return g;
  }, [depth]);

  if (length <= 0.01) return null;
  const L = Math.min(length, path.total);
  const parts: React.ReactNode[] = [];
  let acc = 0;
  for (let i = 0; i < path.lens.length; i++) {
    const segLen = path.lens[i];
    if (acc >= L) break;
    const visible = Math.min(segLen, L - acc);
    const [x0, y0] = path.pts[i];
    const [x1, y1] = path.pts[i + 1];
    const a = Math.atan2(y1 - y0, x1 - x0);
    const cx = x0 + Math.cos(a) * (visible / 2);
    const cy = y0 + Math.sin(a) * (visible / 2);
    parts.push(
      <mesh key={`s${i}`} position={[cx, cy, z]} rotation={[0, 0, a]} castShadow={!mirror}>
        <boxGeometry args={[visible, thickness, depth]} />
        <ArrowMat color={color} />
      </mesh>,
    );
    // round joint at the start vertex hides gaps at corners
    parts.push(
      <mesh key={`j${i}`} position={[x0, y0, z]} rotation={[Math.PI / 2, 0, 0]} castShadow={!mirror}>
        <cylinderGeometry args={[thickness / 2, thickness / 2, depth, 24]} />
        <ArrowMat color={color} />
      </mesh>,
    );
    acc += segLen;
  }
  const tip = path.at(L);
  return (
    <group>
      {parts}
      <mesh geometry={head} position={[tip.x, tip.y, z]} rotation={[0, 0, tip.angle]} castShadow={!mirror}>
        <ArrowMat color={color} />
      </mesh>
    </group>
  );
};
