import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ThreeCanvas } from "@remotion/three";
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  interpolate,
  Sequence,
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
import TIMING from "./police-timing.json";

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
// Segment lengths come from the generated voiceover (scripts/vo_police.py) so speech is never cut.
export const INTRO: number = TIMING.intro;
const LENS: number[] = TIMING.ranks;
export const STARTS: number[] = LENS.map((_, k) => INTRO + LENS.slice(0, k).reduce((a, b) => a + b, 0));
export const RANKS_END: number = INTRO + LENS.reduce((a, b) => a + b, 0);
export const OUTRO: number = TIMING.outro;
export const POLICE_DURATION = RANKS_END + OUTRO;
const WHIP = 12;

// Staircase of ranks: step i is a solid block, each one higher than the last.
const SPACING = 2.2; // step run
const DEPTH = 2.4; // step width (towards camera)
const pedX = (i: number) => i * SPACING;
const pedH = (i: number) => 1.0 + i * 0.42;

/** current focused rank + local frame inside its segment */
const focusAt = (f: number) => {
  let k = 0;
  for (let i = 0; i < STARTS.length; i++) if (f >= STARTS[i]) k = i;
  return { k, t: f - STARTS[k] };
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
      // engraved white signage with a red/blue police bar
      g.fillStyle = "#ffffff";
      const size = r.abbr.length > 10 ? 120 : 160;
      g.font = `800 ${size}px ${poppins.fontFamily}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.shadowColor = "rgba(120,170,255,0.55)";
      g.shadowBlur = 24;
      g.fillText(r.abbr, 512, 140);
      g.shadowBlur = 0;
      g.fillStyle = "#e53935";
      g.fillRect(262, 252, 250, 12);
      g.fillStyle = "#2f6bff";
      g.fillRect(512, 252, 250, 12);
      g.fillStyle = "rgba(255,255,255,0.75)";
      g.font = `700 48px ${poppins.fontFamily}`;
      g.fillText(r.full.toUpperCase(), 512, 330, 900);
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
    scene.background = new THREE.Color("#05070c");
    scene.fog = new THREE.Fog("#05070c", 14, 34);
    return () => {
      scene.environment = null;
      tex.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
};

const Step: React.FC<{ i: number; label: THREE.Texture | null; glow: number }> = ({ i, label, glow }) => {
  const h = pedH(i);
  return (
    <group position={[pedX(i), 0, 0]}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[SPACING, h, DEPTH]} />
        <meshStandardMaterial color="#1b1c21" roughness={0.82} />
      </mesh>
      {/* tread top */}
      <mesh position={[0, h + 0.01, 0]} receiveShadow>
        <boxGeometry args={[SPACING + 0.02, 0.02, DEPTH + 0.02]} />
        <meshStandardMaterial color="#2a2c33" roughness={0.6} />
      </mesh>
      {/* LED strip along the front nosing - lights up as the climb reaches this step */}
      <mesh position={[0, h - 0.02, DEPTH / 2 + 0.012]}>
        <boxGeometry args={[SPACING - 0.04, 0.035, 0.02]} />
        <meshStandardMaterial color="#cfe0ff" emissive="#8fb6ff" emissiveIntensity={0.08 + glow * 2.6} toneMapped={false} />
      </mesh>
      {/* LED strip on the riser edge facing the lower step */}
      <mesh position={[-SPACING / 2 - 0.012, h - 0.02, 0]}>
        <boxGeometry args={[0.02, 0.035, DEPTH - 0.04]} />
        <meshStandardMaterial color="#cfe0ff" emissive="#8fb6ff" emissiveIntensity={0.08 + glow * 2.6} toneMapped={false} />
      </mesh>
      {label ? (
        <mesh position={[0, h - 0.42, DEPTH / 2 + 0.006]}>
          <planeGeometry args={[1.7, 1.7 * (420 / 1024)]} />
          <meshBasicMaterial map={label} transparent toneMapped={false} opacity={0.35 + glow * 0.65} />
        </mesh>
      ) : null}
    </group>
  );
};

const camAt = (f: number) => {
  // per-rank framing
  const frame = (k: number, t: number) => {
    const push = smooth(t / LENS[k]) * 0.6;
    const x = pedX(k);
    const h = pedH(k);
    return {
      pos: new THREE.Vector3(x + 1.0, h + 1.35, 9.6 - push),
      look: new THREE.Vector3(x + 0.2, h + 0.85, 0),
    };
  };
  const { k, t } = focusAt(f);
  let cur = frame(k, Math.max(0, t));
  if (k > 0 && t < WHIP) {
    const prev = frame(k - 1, LENS[k - 1]);
    const e = ease(t / WHIP);
    cur = { pos: prev.pos.clone().lerp(cur.pos, e), look: prev.look.clone().lerp(cur.look, e) };
  }
  // intro: wide diagonal of the whole ladder, then whip into rank 0
  const intro = {
    pos: new THREE.Vector3(-3.4, 1.1, 6.5),
    look: new THREE.Vector3(pedX(6), pedH(6) + 1.6, 0),
  };
  if (f < INTRO) {
    const drift = f / INTRO;
    intro.pos.x += drift * 0.8;
    const e = ease(Math.max(0, (f - (INTRO - 16)) / 16));
    const target = frame(0, 0);
    return { pos: intro.pos.clone().lerp(target.pos, e), look: intro.look.clone().lerp(target.look, e) };
  }
  // outro: pull back to show the whole ladder
  const outStart = RANKS_END;
  if (f >= outStart) {
    const e = ease(Math.min(1, (f - outStart) / 30));
    const last = frame(RANKS.length - 1, LENS[RANKS.length - 1]);
    const wide = {
      pos: new THREE.Vector3(pedX(RANKS.length - 1) + 2.6, pedH(RANKS.length - 1) + 4.2, 6.8),
      look: new THREE.Vector3(pedX(7), pedH(7) + 0.6, 0),
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
export const PoliceRanks: React.FC<{ handle: string }> = ({ handle }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const labels = useLabelTextures();
  const { k, t } = focusAt(frame);
  const inRanks = frame >= INTRO && frame < RANKS_END;
  const outStart = RANKS_END;
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
          const salute = focused ? smooth((lt - 16) / 10) * (1 - smooth((lt - (LENS[i] - 30)) / 12)) : 0;
          const glow = frame >= outStart ? 1 : !inRanks ? 0.1 : i < k ? 0.75 : focused ? smooth(lt / 8) : 0;
          // insignia: pop + spin when its rank comes up, gentle sway otherwise
          const pop = focused ? 1 + 0.35 * Math.sin(Math.min(1, lt / 14) * Math.PI) : 1;
          const spin = focused ? (1 - ease(Math.min(1, lt / 18))) * Math.PI * 2 : 0;
          const sway = Math.sin((frame + i * 17) * 0.06) * 0.35;
          const h = pedH(i);
          return (
            <group key={r.abbr}>
              <Step i={i} label={labels ? labels[i] : null} glow={glow} />
              <Officer
                position={[pedX(i), h, 0]}
                salute={salute}
                breathe={Math.sin((frame + i * 11) * 0.08)}
                blink={(() => {
                  const c = (frame + i * 23) % 97;
                  return c < 3 ? c / 3 : c < 6 ? 1 - (c - 3) / 3 : 0;
                })()}
                brows={salute * 0.8}
                smile={focused ? smooth((lt - 70) / 14) : 0.15}
                look={focused ? 0 : Math.sin((frame + i * 31) * 0.02) * 0.6}
              />
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

        </AbsoluteFill>
      ) : null}

      {/* rank counter */}
      {inRanks ? (
        <div style={{ position: "absolute", top: 140, width: "100%", textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 34, letterSpacing: 6, color: "#ffc72c" }}>
          {String(k + 1).padStart(2, "0")} / {RANKS.length}
        </div>
      ) : null}




      <Audio src={staticFile("audio/police.wav")} volume={0.55} />
      {TIMING.voice.map((_, i) => {
        const from = i === 0 ? 4 : i <= RANKS.length ? STARTS[i - 1] + 6 : RANKS_END + 8;
        return (
          <Sequence key={i} from={from} layout="none">
            <Audio src={staticFile(`audio/police-vo/line${String(i).padStart(2, "0")}.wav`)} volume={1} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
