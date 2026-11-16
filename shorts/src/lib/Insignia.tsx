import React, { useMemo } from "react";
import * as THREE from "three";

// Shoulder-board style rank insignia, modeled procedurally. Faces +Z.
export type InsigniaItem =
  | { kind: "star"; count: number }
  | { kind: "chevrons"; count: number }
  | { kind: "ribbon" }
  | { kind: "emblem" }
  | { kind: "crossed" };

const BOARD_W = 0.46;
const BOARD_H = 0.82;
const DEPTH = 0.07;

const Mat: React.FC<{ color: string; metal?: number; rough?: number; emissive?: number }> = ({
  color,
  metal = 0,
  rough = 0.4,
  emissive = 0,
}) => (
  <meshPhysicalMaterial
    color={color}
    metalness={metal}
    roughness={rough}
    clearcoat={0.8}
    emissive={color}
    emissiveIntensity={emissive}
  />
);

const extrude = (shape: THREE.Shape, depth: number) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
  g.translate(0, 0, -depth / 2);
  return g;
};

const useGeoms = () =>
  useMemo(() => {
    const board = new THREE.Shape();
    board.moveTo(-BOARD_W / 2, -BOARD_H / 2);
    board.lineTo(BOARD_W / 2, -BOARD_H / 2);
    board.lineTo(BOARD_W / 2, BOARD_H / 2 - 0.16);
    board.lineTo(0, BOARD_H / 2);
    board.lineTo(-BOARD_W / 2, BOARD_H / 2 - 0.16);
    board.closePath();

    const star = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.075 : 0.032;
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) star.moveTo(x, y);
      else star.lineTo(x, y);
    }
    star.closePath();

    const chevron = new THREE.Shape();
    const w = 0.17;
    const t = 0.045;
    chevron.moveTo(-w, 0.05);
    chevron.lineTo(0, -0.05);
    chevron.lineTo(w, 0.05);
    chevron.lineTo(w, 0.05 + t);
    chevron.lineTo(0, -0.05 + t);
    chevron.lineTo(-w, 0.05 + t);
    chevron.closePath();

    return {
      board: extrude(board, DEPTH),
      star: extrude(star, 0.025),
      chevron: extrude(chevron, 0.02),
    };
  }, []);

const Emblem: React.FC<{ y: number }> = ({ y }) => (
  // simplified lion capital: base, abacus with wheel, three lion heads
  <group position={[0, y, DEPTH / 2 + 0.015]}>
    <mesh position={[0, -0.07, 0]}>
      <boxGeometry args={[0.15, 0.03, 0.025]} />
      <Mat color="#e8b93c" metal={0.9} rough={0.25} />
    </mesh>
    <mesh position={[0, -0.035, 0]}>
      <boxGeometry args={[0.12, 0.04, 0.025]} />
      <Mat color="#e8b93c" metal={0.9} rough={0.25} />
    </mesh>
    <mesh position={[0, -0.035, 0.014]}>
      <torusGeometry args={[0.014, 0.004, 6, 16]} />
      <Mat color="#8a6a18" metal={0.9} />
    </mesh>
    {[-0.04, 0, 0.04].map((x) => (
      <mesh key={x} position={[x, 0.02 + (x === 0 ? 0.015 : 0), 0]}>
        <sphereGeometry args={[0.032, 16, 16]} />
        <Mat color="#f0c446" metal={0.9} rough={0.25} />
      </mesh>
    ))}
  </group>
);

const Crossed: React.FC<{ y: number }> = ({ y }) => (
  <group position={[0, y, DEPTH / 2 + 0.015]}>
    {[0.62, -0.62].map((a, i) => (
      <group key={a} rotation={[0, 0, a]}>
        <mesh>
          <boxGeometry args={[0.022, 0.26, 0.02]} />
          <Mat color={i === 0 ? "#d9dde3" : "#e8b93c"} metal={0.9} rough={0.2} />
        </mesh>
        <mesh position={[0, -0.09, 0]}>
          <boxGeometry args={[0.07, 0.016, 0.022]} />
          <Mat color="#e8b93c" metal={0.9} rough={0.2} />
        </mesh>
      </group>
    ))}
  </group>
);

export const Insignia: React.FC<{ items: InsigniaItem[]; goldTrim?: boolean }> = ({ items, goldTrim }) => {
  const g = useGeoms();
  // stack items from top to bottom
  const blocks: React.ReactNode[] = [];
  const has = (k: InsigniaItem["kind"]) => items.some((i) => i.kind === k);
  let y = 0.2;
  items.forEach((it, idx) => {
    if (it.kind === "emblem") {
      blocks.push(<Emblem key={idx} y={y} />);
      y -= 0.2;
    } else if (it.kind === "crossed") {
      blocks.push(<Crossed key={idx} y={y - 0.02} />);
      y -= 0.24;
    } else if (it.kind === "star") {
      for (let s = 0; s < it.count; s++) {
        blocks.push(
          <mesh key={`${idx}-${s}`} geometry={g.star} position={[0, y, DEPTH / 2 + 0.015]}>
            <Mat color="#dfe3e8" metal={0.9} rough={0.2} />
          </mesh>,
        );
        y -= 0.17;
      }
    } else if (it.kind === "chevrons") {
      for (let s = 0; s < it.count; s++) {
        blocks.push(
          <mesh key={`${idx}-${s}`} geometry={g.chevron} position={[0, 0.08 - s * 0.085, DEPTH / 2 + 0.012]}>
            <Mat color="#d8342b" rough={0.35} emissive={0.15} />
          </mesh>,
        );
      }
    }
  });
  return (
    <group>
      <mesh geometry={g.board}>
        <Mat color="#d9be86" rough={0.55} />
      </mesh>
      {goldTrim ? (
        <mesh position={[0, 0, -0.005]} scale={[1.09, 1.06, 1]} geometry={g.board}>
          <Mat color="#e8b93c" metal={0.9} rough={0.25} />
        </mesh>
      ) : null}
      {/* button at the top */}
      <mesh position={[0, BOARD_H / 2 - 0.1, DEPTH / 2 + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.032, 0.032, 0.02, 20]} />
        <Mat color="#e8b93c" metal={0.9} rough={0.25} />
      </mesh>
      {blocks}
      {has("ribbon") ? (
        <>
          <mesh position={[0, -BOARD_H / 2 + 0.07, DEPTH / 2 + 0.006]}>
            <boxGeometry args={[BOARD_W - 0.02, 0.05, 0.01]} />
            <Mat color="#c62828" />
          </mesh>
          <mesh position={[0, -BOARD_H / 2 + 0.025, DEPTH / 2 + 0.006]}>
            <boxGeometry args={[BOARD_W - 0.02, 0.04, 0.01]} />
            <Mat color="#1e3a8a" />
          </mesh>
        </>
      ) : null}
    </group>
  );
};
