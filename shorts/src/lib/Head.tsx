import React, { useMemo } from "react";
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// One smooth, sculpted head: a sphere deformed with soft gaussian "brushes" (nose, sockets,
// cheekbones, jaw, chin) so the face is a single continuous surface - no stuck-on bumps.
// Origin = head centre, +Z = face direction. Units: metres.

export const HEAD_COLORS = {
  skin: "#a8704a",
  skinShade: "#8f5a39",
  hair: "#16100c",
  khaki: "#c4a372",
  khakiShade: "#a98a5c",
  visor: "#0b0908",
  gold: "#e3b33a",
};

const SX = 0.128;
const SY = 0.168;
const SZ = 0.15;

const G = (dx: number, dy: number, sx: number, sy: number) => Math.exp(-((dx / sx) ** 2) - (dy / sy) ** 2);
const sstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** unit-sphere point -> sculpted head point (metres) */
export const sculpt = (x0: number, y0: number, z0: number): [number, number, number] => {
  let x = x0;
  const y = y0;
  let z = z0;
  // jaw / chin taper
  if (y < 0) {
    const k = sstep(0, -1, y);
    x *= 1 - 0.3 * k;
    if (z < 0) z *= 1 - 0.25 * k;
  }
  // fuller cranium at the back
  if (y > -0.2 && z < 0) z *= 1.06;
  const front = sstep(0.25, 0.85, z0);
  // flatten the face plane slightly
  if (z > 0) z *= 1 - 0.1 * front;
  // eye sockets
  for (const s of [1, -1]) z -= 0.075 * front * G(x - s * 0.36, y - 0.1, 0.17, 0.11);
  // brow ridge
  z += 0.045 * front * G(x, y - 0.27, 0.6, 0.07);
  // nose: bridge, tip, wings
  z += 0.1 * front * G(x, y + 0.02, 0.075, 0.22);
  z += 0.17 * front * G(x, y + 0.25, 0.1, 0.085);
  for (const s of [1, -1]) z += 0.06 * front * G(x - s * 0.12, y + 0.29, 0.07, 0.055);
  // cheekbones
  for (const s of [1, -1]) z += 0.035 * front * G(x - s * 0.47, y + 0.1, 0.2, 0.14);
  // mouth area + chin
  z += 0.045 * front * G(x, y + 0.52, 0.33, 0.18);
  z += 0.06 * front * G(x, y + 0.84, 0.22, 0.11);
  return [x * SX, y * SY, z * SZ];
};

/** surface point at unit-face coordinates (u, v) on the front */
const surf = (u: number, v: number, push = 0): THREE.Vector3 => {
  const z = Math.sqrt(Math.max(0, 1 - u * u - v * v));
  const [x, y, zz] = sculpt(u, v, z);
  return new THREE.Vector3(x, y, zz + push);
};

const buildHeadGeometry = (keep?: (x: number, y: number, z: number) => boolean, inflate = 1) => {
  let g: THREE.BufferGeometry = new THREE.SphereGeometry(1, 128, 96);
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  g = mergeVertices(g);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const flags: boolean[] = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    flags.push(keep ? keep(x, y, z) : true);
    const [a, b, c] = sculpt(x, y, z);
    pos.setXYZ(i, a * inflate, b * inflate, c * inflate);
  }
  if (keep && g.index) {
    const idx = g.index.array;
    const out: number[] = [];
    for (let i = 0; i < idx.length; i += 3) {
      if (flags[idx[i]] && flags[idx[i + 1]] && flags[idx[i + 2]]) out.push(idx[i], idx[i + 1], idx[i + 2]);
    }
    g.setIndex(out);
  }
  g.computeVertexNormals();
  return g;
};

const extrudeShape = (pts: [number, number][], depth: number, bevel = 0.003) => {
  const sh = new THREE.Shape();
  pts.forEach(([x, y], i) => (i === 0 ? sh.moveTo(x, y) : sh.lineTo(x, y)));
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -depth / 2);
  return g;
};

const half: [number, number][] = [
  [0.0, 0.011], [0.012, 0.014], [0.026, 0.013], [0.039, 0.008], [0.05, -0.002], [0.057, -0.015],
  [0.054, -0.019], [0.046, -0.012], [0.035, -0.006], [0.022, -0.005], [0.01, -0.006], [0.0, -0.003],
];
const MOUSTACHE: [number, number][] = [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y] as [number, number])];
const BROW: [number, number][] = [
  [0, -0.006], [0.02, -0.003], [0.038, -0.003], [0.05, -0.008], [0.048, -0.001], [0.035, 0.005], [0.017, 0.007], [0, 0.006],
];

const Skin: React.FC<{ color?: string }> = ({ color = HEAD_COLORS.skin }) => (
  <meshPhysicalMaterial color={color} roughness={0.58} clearcoat={0.12} sheen={0.35} sheenColor="#ffb592" />
);
const Cloth: React.FC<{ color: string }> = ({ color }) => <meshStandardMaterial color={color} roughness={0.8} />;
const Gloss: React.FC<{ color: string; metal?: number; rough?: number }> = ({ color, metal = 0, rough = 0.15 }) => (
  <meshPhysicalMaterial color={color} metalness={metal} roughness={rough} clearcoat={1} clearcoatRoughness={0.08} />
);

// ---------- peaked cap ----------
const Cap: React.FC = () => {
  const g = useMemo(() => {
    // crown: band up to a flared, stiff top
    const prof = [
      new THREE.Vector2(0.0001, 0.112),
      new THREE.Vector2(0.06, 0.112),
      new THREE.Vector2(0.125, 0.106),
      new THREE.Vector2(0.155, 0.098),
      new THREE.Vector2(0.161, 0.09),
      new THREE.Vector2(0.158, 0.078),
      new THREE.Vector2(0.147, 0.056),
      new THREE.Vector2(0.14, 0.04),
      new THREE.Vector2(0.139, 0.0),
    ];
    const crown = new THREE.LatheGeometry(prof, 64);
    // visor: half-ellipse plate
    const vs = new THREE.Shape();
    vs.moveTo(-0.128, 0);
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI - (i / 24) * Math.PI;
      vs.lineTo(Math.cos(a) * 0.128, Math.sin(a) * 0.085);
    }
    vs.lineTo(0.128, 0);
    vs.closePath();
    const visor = new THREE.ExtrudeGeometry(vs, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.003, bevelSegments: 2 });
    return { crown, visor };
  }, []);
  return (
    // band is elliptical like the skull; the crown tilts up at the front
    <group position={[0, 0.098, -0.004]} rotation={[-0.1, 0, 0]} scale={[0.95, 1, 1.07]}>
      <mesh geometry={g.crown} castShadow scale={[1, 0.72, 1]}>
        <Cloth color={HEAD_COLORS.khaki} />
      </mesh>
      {/* top piping */}
      <mesh position={[0, 0.071, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.156, 0.005, 8, 64]} />
        <Cloth color={HEAD_COLORS.khakiShade} />
      </mesh>
      {/* dark band */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.1415, 0.1415, 0.04, 64, 1, true]} />
        <meshStandardMaterial color="#2a1a10" roughness={0.45} side={THREE.DoubleSide} />
      </mesh>
      {/* chin strap + buttons */}
      <mesh position={[0, 0.006, 0.137]} rotation={[-0.08, 0, 0]}>
        <boxGeometry args={[0.2, 0.011, 0.006]} />
        <Gloss color="#111" rough={0.25} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * 0.105, 0.006, 0.098]} rotation={[0, s * 0.8, 0]}>
          <sphereGeometry args={[0.008, 12, 10]} />
          <Gloss color={HEAD_COLORS.gold} metal={0.9} rough={0.2} />
        </mesh>
      ))}
      {/* glossy visor angled down */}
      <mesh geometry={g.visor} position={[0, 0.0, 0.11]} rotation={[Math.PI / 2 + 0.42, 0, 0]} castShadow>
        <Gloss color={HEAD_COLORS.visor} />
      </mesh>
      {/* badge: gold disc with a star, on the crown front */}
      <group position={[0, 0.05, 0.148]} rotation={[-0.3, 0, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 0.006, 28]} />
          <Gloss color={HEAD_COLORS.gold} metal={0.95} rough={0.22} />
        </mesh>
        <mesh position={[0, 0, 0.004]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.005, 6]} />
          <Gloss color="#b7802a" metal={0.95} rough={0.25} />
        </mesh>
      </group>
    </group>
  );
};

export const Head: React.FC<{ blink: number; smile: number; brows: number; look: number }> = ({ blink, smile, brows, look }) => {
  const geo = useMemo(() => {
    const head = buildHeadGeometry();
    // hair: sides/back above the ears and a short front hairline, just outside the skin
    const hair = buildHeadGeometry((x, y, z) => (y > 0.08 && z < 0.35) || y > 0.6 || (Math.abs(x) > 0.82 && y > -0.25 && z < 0.2), 1.025);
    return {
      head,
      hair,
      moustache: extrudeShape(MOUSTACHE, 0.012, 0.004),
      brow: extrudeShape(BROW, 0.006, 0.0025),
    };
  }, []);
  const mouth = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14 - 0.5;
      pts.push(new THREE.Vector3(u * 0.05, u * u * (0.02 + smile * 0.07), 0));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, 0.0035, 6, false);
  }, [smile]);

  const eyes = [1, -1].map((s) => ({ s, p: surf(s * 0.36, 0.09, -0.009) }));
  const browP = (s: number) => surf(s * 0.33, 0.29, 0.004);
  const must = surf(0, -0.4, 0.004);
  const mouthP = surf(0, -0.56, -0.001);
  const lipP = surf(0, -0.62, -0.005);

  return (
    <group>
      <mesh geometry={geo.head} castShadow receiveShadow>
        <Skin />
      </mesh>
      <mesh geometry={geo.hair}>
        <meshStandardMaterial color={HEAD_COLORS.hair} roughness={0.95} />
      </mesh>
      {/* ears */}
      {[1, -1].map((s) => (
        <group key={`ear${s}`} position={[s * 0.124, -0.012, -0.008]} rotation={[0, s * 0.35, 0]}>
          <mesh scale={[0.32, 1, 0.72]}>
            <sphereGeometry args={[0.04, 18, 14]} />
            <Skin />
          </mesh>
        </group>
      ))}
      {/* eyes */}
      {eyes.map(({ s, p }) => (
        <group key={s} position={p}>
          <mesh scale={[1.4, 0.95, 0.55]}>
            <sphereGeometry args={[0.0188, 22, 16]} />
            <meshStandardMaterial color="#efeae2" roughness={0.25} />
          </mesh>
          <mesh position={[look * 0.005, -0.001, 0.0088]} scale={[1, 1, 0.45]}>
            <sphereGeometry args={[0.0112, 18, 14]} />
            <meshStandardMaterial color="#3b2313" roughness={0.2} />
          </mesh>
          <mesh position={[look * 0.005, -0.001, 0.0125]} scale={[1, 1, 0.4]}>
            <sphereGeometry args={[0.0058, 12, 10]} />
            <meshStandardMaterial color="#050302" roughness={0.1} />
          </mesh>
          <mesh position={[look * 0.005 + 0.004, 0.004, 0.0152]}>
            <sphereGeometry args={[0.002, 8, 6]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* upper lid (skin) that rolls down to blink, with a dark lash line */}
          <group rotation={[-1.2 + blink * 2.4, 0, 0]}>
            <mesh scale={[1.48, 0.86, 0.62]}>
              <sphereGeometry args={[0.0196, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <Skin color={HEAD_COLORS.skinShade} />
            </mesh>
          </group>
          <mesh position={[0, 0.0135 - blink * 0.015, 0.004]} scale={[1, 1, 1]}>
            <boxGeometry args={[0.052, 0.0032, 0.004]} />
            <meshStandardMaterial color="#120a06" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* eyebrows */}
      {[1, -1].map((s) => {
        const p = browP(s);
        return (
          <mesh key={`b${s}`} geometry={geo.brow} position={[p.x - s * 0.026, p.y + brows * 0.01, p.z]} scale={[s, 1.5, 1]} rotation={[-0.25, 0, 0]}>
            <meshStandardMaterial color={HEAD_COLORS.hair} roughness={0.95} />
          </mesh>
        );
      })}
      {/* moustache */}
      <mesh geometry={geo.moustache} position={must} rotation={[0.3, 0, 0]} scale={[0.95, 1 + smile * 0.05, 1]}>
        <meshStandardMaterial color="#120c09" roughness={0.92} />
      </mesh>
      {/* mouth line + lower lip */}
      <mesh geometry={mouth} position={mouthP}>
        <meshStandardMaterial color="#3a160d" roughness={0.6} />
      </mesh>
      <mesh position={lipP} scale={[1.7, 0.5, 0.6]}>
        <sphereGeometry args={[0.012, 16, 10]} />
        <Skin color="#8c4c36" />
      </mesh>
      <Cap />
    </group>
  );
};

export const HEAD_HALF_HEIGHT = SY;
