import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ThreeCanvas } from "@remotion/three";
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadTelugu } from "@remotion/google-fonts/AnekTelugu";
import { Officer, OFFICER_HEIGHT } from "../lib/Officer";
import { Insignia, InsigniaItem } from "../lib/Insignia";
import { smooth } from "../lib/rig";
import { MONO } from "../lib/Hud";

const poppins = loadPoppins("normal", { weights: ["700", "800"], subsets: ["latin"] });
const telugu = loadTelugu("normal", { weights: ["700", "800"], subsets: ["telugu", "latin"] });

type Rank = { abbr: string; full: string; te: string; items: InsigniaItem[]; goldTrim?: boolean };

export const RANKS: Rank[] = [
  { abbr: "Constable", full: "Police Constable", te: "గస్తీ • ట్రాఫిక్ • ప్రజల భద్రత", items: [] },
  { abbr: "Head Constable", full: "Head Constable", te: "కానిస్టేబుళ్లకు నాయకత్వం • స్టేషన్ రికార్డులు", items: [{ kind: "chevrons", count: 3 }] },
  { abbr: "ASI", full: "Assistant Sub-Inspector", te: "చిన్న కేసుల దర్యాప్తు • SIకి సహాయం", items: [{ kind: "star", count: 1 }, { kind: "ribbon" }] },
  { abbr: "SI", full: "Sub-Inspector", te: "FIR నమోదు • దర్యాప్తు • అరెస్ట్ అధికారం", items: [{ kind: "star", count: 2 }, { kind: "ribbon" }] },
  { abbr: "CI", full: "Circle Inspector", te: "సర్కిల్ స్టేషన్ల పర్యవేక్షణ • పెద్ద కేసులు", items: [{ kind: "star", count: 3 }, { kind: "ribbon" }] },
  { abbr: "DSP", full: "Deputy Superintendent of Police", te: "సబ్-డివిజన్ మొత్తం బాధ్యత", items: [{ kind: "star", count: 3 }] },
  { abbr: "Addl. SP", full: "Additional Superintendent of Police", te: "జిల్లాలో SPకి కుడిభుజం", items: [{ kind: "emblem" }] },
  { abbr: "SP", full: "Superintendent of Police", te: "జిల్లా పోలీస్ బాస్ • శాంతిభద్రతలు", items: [{ kind: "emblem" }, { kind: "star", count: 1 }] },
  { abbr: "SSP", full: "Senior Superintendent of Police", te: "పెద్ద జిల్లాలకు సీనియర్ SP", items: [{ kind: "emblem" }, { kind: "star", count: 2 }] },
  { abbr: "DIG", full: "Deputy Inspector General", te: "రేంజ్ (కొన్ని జిల్లాలు) అధిపతి", items: [{ kind: "emblem" }, { kind: "star", count: 3 }] },
  { abbr: "IG", full: "Inspector General of Police", te: "జోన్ మొత్తం పర్యవేక్షణ", items: [{ kind: "star", count: 1 }, { kind: "crossed" }] },
  { abbr: "ADGP", full: "Additional Director General", te: "ఇంటెలిజెన్స్, లా & ఆర్డర్ విభాగాల అధిపతి", items: [{ kind: "emblem" }, { kind: "crossed" }] },
  { abbr: "DGP", full: "Director General of Police", te: "రాష్ట్ర పోలీస్ దళానికి అత్యున్నత అధికారి", items: [{ kind: "emblem" }, { kind: "crossed" }], goldTrim: true },
];

export const POLICE_FPS = 30;
export const INTRO = 84;
export const PER = 126; // 4.2 s per rank
export const OUTRO = 96;
export const POLICE_DURATION = INTRO + RANKS.length * PER + OUTRO;
const WHIP = 12;

const SPACING = 2.35;
const RADIUS = 0.82;
const pedX = (i: number) => i * SPACING;
const pedH = (i: number) => 0.85 + i * 0.16;

/** current focused rank + local frame inside its segment */
const focusAt = (f: number) => {
  const k = Math.max(0, Math.min(RANKS.length - 1, Math.floor((f - INTRO) / PER)));
  return { k, t: f - INTRO - k * PER };
};

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ---------- label texture ----------
const useLabelTextures = () => {
  const [handle] = useState(() => delayRender("label fonts"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([poppins.waitUntilDone(), telugu.waitUntilDone()]).then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);
  return useMemo(() => {
    if (!ready) return null;
    return RANKS.map((r) => {
      const c = document.createElement("canvas");
      c.width = 1024;
      c.height = 420;
      const g = c.getContext("2d")!;
      g.clearRect(0, 0, c.width, c.height);
      // main plate
      g.fillStyle = "#121212";
      g.fillRect(40, 30, 944, 230);
      g.strokeStyle = "#d9a520";
      g.lineWidth = 10;
      g.strokeRect(45, 35, 934, 220);
      g.fillStyle = "#ffc72c";
      const size = r.abbr.length > 10 ? 118 : 150;
      g.font = `800 ${size}px ${poppins.fontFamily}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(r.abbr, 512, 152);
      // sub plate
      g.fillStyle = "#121212";
      g.fillRect(110, 290, 804, 90);
      g.strokeStyle = "#d9a520";
      g.lineWidth = 5;
      g.strokeRect(112, 292, 800, 86);
      g.fillStyle = "#ffffff";
      g.font = `700 50px ${poppins.fontFamily}`;
      g.fillText(r.full, 512, 337, 760);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    });
  }, [ready]);
};

// ---------- scene pieces ----------
const Environment: React.FC = () => {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = tex;
    scene.environmentIntensity = 0.35;
    scene.background = new THREE.Color("#000000");
    scene.fog = new THREE.Fog("#000000", 12, 26);
    return () => {
      scene.environment = null;
      tex.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
};

const Pedestal: React.FC<{ i: number; label: THREE.Texture | null; glow: number }> = ({ i, label, glow }) => {
  const h = pedH(i);
  return (
    <group position={[pedX(i), 0, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[RADIUS, RADIUS, h, 64]} />
        <meshPhysicalMaterial color="#0b0b0b" roughness={0.35} clearcoat={1} clearcoatRoughness={0.2} />
      </mesh>
      {/* gold rim band */}
      <mesh position={[0, h - 0.07, 0]}>
        <cylinderGeometry args={[RADIUS + 0.012, RADIUS + 0.012, 0.14, 64, 1, true]} />
        <meshPhysicalMaterial color="#e3ad2a" metalness={1} roughness={0.25} emissive="#c48a10" emissiveIntensity={0.25 + glow * 0.6} />
      </mesh>
      <mesh position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RADIUS - 0.01, 0.022, 12, 80]} />
        <meshStandardMaterial color="#ffd35a" emissive="#ffc22e" emissiveIntensity={0.5 + glow * 1.5} />
      </mesh>
      {/* top disc */}
      <mesh position={[0, h + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[RADIUS - 0.03, 64]} />
        <meshPhysicalMaterial color="#141414" roughness={0.5} />
      </mesh>
      {/* label (slightly curved plane would be nicer; flat reads clean) */}
      {label ? (
        <mesh position={[0, h - 0.45, RADIUS + 0.01]}>
          <planeGeometry args={[1.45, 1.45 * (420 / 1024)]} />
          <meshBasicMaterial map={label} transparent toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
};

const camAt = (f: number) => {
  // per-rank framing
  const frame = (k: number, t: number) => {
    const push = smooth(t / PER) * 0.6;
    const x = pedX(k);
    const h = pedH(k);
    return {
      pos: new THREE.Vector3(x + 0.35, h + 1.1, 9.6 - push),
      look: new THREE.Vector3(x, h + 0.85, 0),
    };
  };
  const { k, t } = focusAt(f);
  let cur = frame(k, Math.max(0, t));
  if (k > 0 && t < WHIP) {
    const prev = frame(k - 1, PER);
    const e = ease(t / WHIP);
    cur = { pos: prev.pos.clone().lerp(cur.pos, e), look: prev.look.clone().lerp(cur.look, e) };
  }
  // intro: wide diagonal of the whole ladder, then whip into rank 0
  const intro = {
    pos: new THREE.Vector3(-4.2, 1.2, 8.5),
    look: new THREE.Vector3(9, 3.0, -1),
  };
  if (f < INTRO) {
    const drift = f / INTRO;
    intro.pos.x += drift * 0.8;
    const e = ease(Math.max(0, (f - (INTRO - 16)) / 16));
    const target = frame(0, 0);
    return { pos: intro.pos.clone().lerp(target.pos, e), look: intro.look.clone().lerp(target.look, e) };
  }
  // outro: pull back to show the whole ladder
  const outStart = INTRO + RANKS.length * PER;
  if (f >= outStart) {
    const e = ease(Math.min(1, (f - outStart) / 30));
    const last = frame(RANKS.length - 1, PER);
    const wide = {
      pos: new THREE.Vector3(pedX(RANKS.length - 1) + 3.2, 4.4, 9.5),
      look: new THREE.Vector3(pedX(8), 2.6, 0),
    };
    return { pos: last.pos.clone().lerp(wide.pos, e), look: last.look.clone().lerp(wide.look, e) };
  }
  return cur;
};

const Rig: React.FC<{ frame: number }> = ({ frame }) => {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const c = camAt(frame);
    cam.fov = 32;
    cam.aspect = size.width / size.height;
    cam.position.copy(c.pos);
    cam.lookAt(c.look);
    cam.updateProjectionMatrix();
  }, [camera, frame, size]);
  return null;
};

// ---------- overlays ----------
const TeluguCaption: React.FC<{ text: string; from: number; to: number }> = ({ text, from, to }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [from, from + 6, to - 6, to], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(frame, [from, from + 8], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 215, paddingLeft: 60, paddingRight: 60 }}>
      <div
        style={{
          fontFamily: telugu.fontFamily,
          fontWeight: 800,
          fontSize: 46,
          lineHeight: 1.3,
          color: "#fff",
          textAlign: "center",
          opacity: o,
          transform: `translateY(${y}px)`,
          textShadow: "0 3px 18px rgba(0,0,0,0.9)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

export const PoliceRanks: React.FC<{ handle: string }> = ({ handle }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const labels = useLabelTextures();
  const { k, t } = focusAt(frame);
  const inRanks = frame >= INTRO && frame < INTRO + RANKS.length * PER;
  const outStart = INTRO + RANKS.length * PER;
  const focusX = camAt(frame).look.x;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 32, near: 0.1, far: 60 }}>
        <Rig frame={frame} />
        <Environment />
        <ambientLight intensity={0.22} />
        <directionalLight position={[focusX - 2, 9, 7]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={8} shadow-camera-bottom={-2}
          target-position={[focusX, 0, 0]} />
        <pointLight position={[focusX, 6.5, 2.2]} intensity={28} distance={10} color="#fff1dc" />
        <directionalLight position={[focusX + 4, 3, -6]} intensity={0.9} color="#cfe0ff" />
        {/* floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[pedX(6), 0, 0]} receiveShadow>
          <planeGeometry args={[80, 40]} />
          <meshStandardMaterial color="#111111" roughness={0.75} />
        </mesh>
        {RANKS.map((r, i) => {
          const focused = inRanks && i === k;
          const lt = focused ? t : 999;
          const salute = focused ? smooth((lt - 16) / 10) * (1 - smooth((lt - 84) / 12)) : 0;
          const glow = focused ? smooth(lt / 10) : frame >= outStart ? 0.5 : 0;
          // insignia: pop + spin when its rank comes up, gentle sway otherwise
          const pop = focused ? 1 + 0.35 * Math.sin(Math.min(1, lt / 14) * Math.PI) : 1;
          const spin = focused ? (1 - ease(Math.min(1, lt / 18))) * Math.PI * 2 : 0;
          const sway = Math.sin((frame + i * 17) * 0.06) * 0.35;
          const h = pedH(i);
          return (
            <group key={r.abbr}>
              <Pedestal i={i} label={labels ? labels[i] : null} glow={glow} />
              <Officer position={[pedX(i), h, 0]} salute={salute} breathe={Math.sin((frame + i * 11) * 0.08)} />
              <group
                position={[pedX(i), h + OFFICER_HEIGHT + 0.32 + Math.sin((frame + i * 9) * 0.07) * 0.04, 0]}
                rotation={[0, sway + spin, 0]}
                scale={0.72 * pop}
              >
                <Insignia items={r.items} goldTrim={r.goldTrim} />
              </group>
            </group>
          );
        })}
      </ThreeCanvas>

      {/* brand mark, top centre like a channel logo */}
      <div style={{ position: "absolute", top: 80, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 26, letterSpacing: 6, color: "rgba(255,255,255,0.4)" }}>
        {handle.toUpperCase()}
      </div>

      {/* intro hook */}
      {frame < INTRO + 6 ? (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 260 }}>
          <div style={{ fontFamily: poppins.fontFamily, fontWeight: 800, fontSize: 92, color: "#ffc72c", letterSpacing: -1, opacity: interpolate(frame, [0, 6, INTRO - 6, INTRO], [0, 1, 1, 0]) }}>
            POLICE RANKS
          </div>
          <div style={{ fontFamily: telugu.fontFamily, fontWeight: 800, fontSize: 60, color: "#fff", marginTop: 10, opacity: interpolate(frame, [6, 14, INTRO - 6, INTRO], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            ఎవరికి ఎంత పవర్?
          </div>
        </AbsoluteFill>
      ) : null}

      {/* rank counter */}
      {inRanks ? (
        <div style={{ position: "absolute", top: 140, width: "100%", textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 34, letterSpacing: 6, color: "#ffc72c" }}>
          {String(k + 1).padStart(2, "0")} / {RANKS.length}
        </div>
      ) : null}

      {RANKS.map((r, i) => (
        <TeluguCaption key={r.abbr} text={r.te} from={INTRO + i * PER + 10} to={INTRO + (i + 1) * PER} />
      ))}

      {frame >= outStart - 4 ? (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 260, paddingLeft: 80, paddingRight: 80 }}>
          <div style={{ fontFamily: telugu.fontFamily, fontWeight: 800, fontSize: 66, color: "#fff", textAlign: "center", lineHeight: 1.3, opacity: interpolate(frame, [outStart + 10, outStart + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            మీకు ఏ ర్యాంక్ అంటే ఇష్టం?
            <div style={{ color: "#ffc72c", fontSize: 54 }}>కామెంట్ చేయండి</div>
          </div>
        </AbsoluteFill>
      ) : null}

      <Audio src={staticFile("audio/police.wav")} />
    </AbsoluteFill>
  );
};
