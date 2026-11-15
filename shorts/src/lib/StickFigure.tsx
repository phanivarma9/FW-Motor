import React from "react";
import { DIM, Pose } from "./rig";

type Props = {
  pose: Pose;
  position: [number, number, number]; // pelvis position in world
  facing?: number; // rotation around Y. 0 = facing +X
  color?: string;
  accent?: string; // optional accent (e.g. a red headband) - undefined = none
  shadows?: boolean;
};

const FigureMaterial: React.FC<{ color: string }> = ({ color }) => (
  <meshPhysicalMaterial
    color={color}
    roughness={0.32}
    metalness={0}
    clearcoat={1}
    clearcoatRoughness={0.25}
  />
);

const Limb: React.FC<{
  length: number;
  radius: number;
  color: string;
  shadows: boolean;
}> = ({ length, radius, color, shadows }) => (
  <mesh position={[0, -length / 2, 0]} castShadow={shadows}>
    <capsuleGeometry args={[radius, length, 8, 20]} />
    <FigureMaterial color={color} />
  </mesh>
);

const Leg: React.FC<{
  hip: number;
  knee: number;
  z: number;
  color: string;
  shadows: boolean;
}> = ({ hip, knee, z, color, shadows }) => (
  <group position={[0, 0, z]} rotation={[0, 0, hip]}>
    <Limb length={DIM.thigh} radius={DIM.limbR} color={color} shadows={shadows} />
    <group position={[0, -DIM.thigh, 0]} rotation={[0, 0, knee]}>
      <Limb length={DIM.shin} radius={DIM.limbR} color={color} shadows={shadows} />
    </group>
  </group>
);

const Arm: React.FC<{
  sh: number;
  el: number;
  z: number;
  out: number;
  color: string;
  shadows: boolean;
}> = ({ sh, el, z, out, color, shadows }) => (
  <group position={[0, 0, z]} rotation={[Math.sign(z) * -out, 0, 0]}>
    <group rotation={[0, 0, sh]}>
      <Limb
        length={DIM.upperArm}
        radius={DIM.limbR * 0.92}
        color={color}
        shadows={shadows}
      />
      <group position={[0, -DIM.upperArm, 0]} rotation={[0, 0, el]}>
        <Limb
          length={DIM.foreArm}
          radius={DIM.limbR * 0.92}
          color={color}
          shadows={shadows}
        />
      </group>
    </group>
  </group>
);

export const StickFigure: React.FC<Props> = ({
  pose,
  position,
  facing = 0,
  color = "#f4f4f2",
  accent,
  shadows = true,
}) => {
  return (
    <group position={position} rotation={[0, facing, 0]}>
      {/* Legs hang from pelvis */}
      <Leg hip={pose.lHip} knee={pose.lKnee} z={DIM.hipZ} color={color} shadows={shadows} />
      <Leg hip={pose.rHip} knee={pose.rKnee} z={-DIM.hipZ} color={color} shadows={shadows} />
      {/* Torso pivots at pelvis. Negative z-rotation tips it forward (+X). */}
      <group rotation={[0, 0, -pose.lean]}>
        <mesh position={[0, DIM.torso / 2, 0]} castShadow={shadows}>
          <capsuleGeometry args={[DIM.torsoR, DIM.torso, 8, 20]} />
          <FigureMaterial color={color} />
        </mesh>
        {/* pelvis bar joins the two legs */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow={shadows}>
          <capsuleGeometry args={[DIM.limbR * 1.05, DIM.hipZ * 2, 6, 16]} />
          <FigureMaterial color={color} />
        </mesh>
        <group position={[0, DIM.torso, 0]}>
          <Arm sh={pose.lSh} el={pose.lEl} z={DIM.shoulderZ * 0.6} out={pose.armOut} color={color} shadows={shadows} />
          <Arm sh={pose.rSh} el={pose.rEl} z={-DIM.shoulderZ * 0.6} out={pose.armOut} color={color} shadows={shadows} />
          <group rotation={[0, 0, -pose.head]}>
            <mesh position={[0.02, DIM.neckGap, 0]} castShadow={shadows}>
              <sphereGeometry args={[DIM.headR, 40, 40]} />
              <FigureMaterial color={color} />
            </mesh>
            {accent ? (
              <mesh position={[0.02, DIM.neckGap + 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[DIM.headR * 1.01, 0.03, 10, 48]} />
                <meshStandardMaterial color={accent} roughness={0.4} />
              </mesh>
            ) : null}
          </group>
        </group>
      </group>
    </group>
  );
};
