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
import { HEAD_Y, Officer, OFFICER_HEIGHT } from "../lib/Officer";
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
      {/* fake bloom: soft additive halos around the LED strips */}
      {[0.09, 0.18].map((hgt, n) => (
        <mesh key={n} position={[0, h - 0.02, DEPTH / 2 + 0.03 + n * 0.01]}>
          <planeGeometry args={[SPACING + hgt, hgt]} />
          <meshBasicMaterial color="#7aa6ff" transparent opacity={glow * (n === 0 ? 0.32 : 0.12)} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
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

// ---------- hook (first ~3.5 s): fast cuts ----------
export const CUTS = [0, 10, 20, 33, 45, 60];
const cutOf = (f: number) => {
  let c = 0;
  for (let i = 0; i < CUTS.length; i++) if (f >= CUTS[i]) c = i;
  return { c, u: f - CUTS[c] };
};
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const insigniaPos = (i: number) => V(pedX(i), pedH(i) + OFFICER_HEIGHT + 0.32, 0);
const hookShot = (f: number) => {
  const { c, u } = cutOf(f);
  const last = RANKS.length - 1;
  if (c === 0) {
    // extreme close-up: DGP insignia spinning in
    const ip = insigniaPos(last);
    return { pos: ip.clone().add(V(0.12, 0.02, 1.7 - ease(u / 10) * 0.45)), look: ip };
  }
  if (c === 1) {
    // snap zoom onto the constable's eyes
    const hp = V(pedX(0), pedH(0) + HEAD_Y + 0.02, 0.12);
    return { pos: hp.clone().add(V(0.04, 0.01, 1.0 - ease(u / 10) * 0.42)), look: hp };
  }
  if (c === 2) {
    // low angle up the staircase while the step lights ignite
    return { pos: V(-2.6 + u * 0.03, 0.55 + u * 0.01, 3.4), look: V(pedX(8), pedH(8) + 1.6, 0) };
  }
  if (c === 3) {
    // fast lateral whip along the saluting line
    const x = pedX(1.5) + ease(u / 12) * (pedX(8) - pedX(1.5));
    const h = pedH(x / SPACING);
    return { pos: V(x - 0.6, h + 1.7, 6.2), look: V(x + 1.5, h + 1.35, 0) };
  }
  if (c === 4) {
    // wide slam: "13 RANKS"
    const z = 15 - ease(u / 15) * 3;
    return { pos: V(pedX(6) - 2.2, pedH(6) + 2.4, z), look: V(pedX(6), pedH(6) + 0.6, 0) };
  }
  // title: from the bottom looking up the whole staircase
  return { pos: V(-3.2 + u * 0.01, 1.1, 6.6), look: V(pedX(6), pedH(6) + 1.6, 0) };
};
const hookShake = (f: number) => {
  let s = 0;
  for (const [at, amp] of [[0, 0.03], [45, 0.12], [60, 0.05]] as const) {
    const k = f - at;
    if (k >= 0 && k < 12) s += Math.exp(-k / 3) * Math.sin(k * 2.9) * amp;
  }
  return s;
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
  // intro: 3-second fast-cut hook, then whip into rank 0
  if (f < INTRO) {
    const shot = hookShot(f);
    const shake = hookShake(f);
    shot.pos.x += shake * 0.6;
    shot.pos.y += shake;
    const e = ease(Math.max(0, (f - (INTRO - 14)) / 14));
    if (e > 0) {
      const target = frame(0, 0);
      return { pos: shot.pos.clone().lerp(target.pos, e), look: shot.look.clone().lerp(target.look, e) };
    }
    return shot;
  }
  // outro: pull back to show the whole ladder
  const outStart = RANKS_END;
  if (f >= outStart) {
    const e = ease(Math.min(1, (f - outStart) / 30));
    const last = frame(RANKS.length - 1, LENS[RANKS.length - 1]);
    const wide = {
      pos: new THREE.Vector3(pedX(11.3), pedH(11.3) + 1.4, 16),
      look: new THREE.Vector3(pedX(11.7), pedH(11.7) + 1.1, 0),
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

// ---------- 3D scene (own component so motion blur can resample it at sub-frame times) ----------
const Scene3D: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const labels = useLabelTextures();
  const { k, t } = focusAt(frame);
  const inRanks = frame >= INTRO && frame < RANKS_END;
  const outStart = RANKS_END;
  const focusX = camAt(frame).look.x;
  return (
      <AbsoluteFill
        style={{
          transform: `scale(${
            frame < INTRO
              ? 1 + Math.max(...CUTS.map((c) => (frame >= c && frame - c < 8 ? 0.07 * Math.exp(-(frame - c) / 2.5) : 0)))
              : 1
          })`,
        }}
      >
      <ThreeCanvas width={width} height={height} shadows camera={{ fov: 32, near: 0.1, far: 60 }}>
        <Rig frame={frame} />
        <Environment />
        <ambientLight intensity={0.22} />
        <directionalLight position={[focusX - 2, 9, 7]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-radius={4}
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
          const inHook = frame < INTRO;
          const hookSalute = inHook ? smooth((frame - 33) / 5) * (1 - smooth((frame - 58) / 6)) : 0;
          const salute = focused ? smooth((lt - 16) / 10) * (1 - smooth((lt - (LENS[i] - 30)) / 12)) : hookSalute;
          const hookGlow = frame >= 20 + i * 0.9 ? (frame < INTRO - 14 ? 1 : 0.3) : 0.05;
          const glow = frame >= outStart ? 1 : inHook ? hookGlow : i < k ? 0.75 : focused ? smooth(lt / 8) : 0;
          // insignia: pop + spin when its rank comes up, gentle sway otherwise
          const hookSpin = inHook && i === RANKS.length - 1 && frame < 10 ? (1 - ease(frame / 10)) * Math.PI * 3 : 0;
          const pop = focused ? 1 + 0.35 * Math.sin(Math.min(1, lt / 14) * Math.PI) : 1;
          const spin = (focused ? (1 - ease(Math.min(1, lt / 18))) * Math.PI * 2 : 0) + hookSpin;
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
                brows={Math.max(salute * 0.8, frame >= 10 && frame < 20 && i === 0 ? smooth((frame - 12) / 4) : 0)}
                smile={focused ? smooth((lt - 70) / 14) : 0.15}
                look={focused || frame < 20 ? 0 : Math.sin((frame + i * 31) * 0.02) * 0.6}
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
      </AbsoluteFill>
  );
};

// ---------- overlays ----------
export const PoliceRanks: React.FC<{ handle: string }> = ({ handle }) => {
  const frame = useCurrentFrame();
  const { k } = focusAt(frame);
  const inRanks = frame >= INTRO && frame < RANKS_END;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Scene3D />

      {/* brand mark, top centre like a channel logo */}
      <div style={{ position: "absolute", top: 80, width: "100%", textAlign: "center", fontFamily: MONO, fontSize: 26, letterSpacing: 6, color: "rgba(255,255,255,0.4)" }}>
        {handle.toUpperCase()}
      </div>

      {/* hook: flash frames on every cut */}
      {frame < INTRO + 2 ? (
        <AbsoluteFill
          style={{
            backgroundColor: "#fff",
            pointerEvents: "none",
            opacity: Math.max(
              ...CUTS.map((c, i) => {
                const k = frame - c;
                const peak = i === 4 ? 0.95 : i === 0 ? 0.0 : 0.55;
                return k >= 0 && k < 4 ? peak * (1 - k / 4) : 0;
              }),
              frame >= INTRO - 14 && frame < INTRO - 10 ? 0.35 : 0,
            ),
          }}
        />
      ) : null}
      {/* "13 RANKS" slam */}
      {frame >= CUTS[4] && frame < CUTS[5] ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              fontFamily: poppins.fontFamily,
              fontWeight: 800,
              fontSize: 168,
              lineHeight: 1,
              color: "#fff",
              letterSpacing: -6,
              textShadow: "0 0 40px rgba(80,140,255,0.8), 0 8px 30px rgba(0,0,0,0.8)",
              transform: `scale(${interpolate(frame, [CUTS[4], CUTS[4] + 5], [1.35, 1], { extrapolateRight: "clamp" })})`,
              opacity: interpolate(frame, [CUTS[4], CUTS[4] + 2, CUTS[5] - 3, CUTS[5]], [0, 1, 1, 0]),
            }}
          >
            13 RANKS
          </div>
          <div style={{ display: "flex", marginTop: 18, width: 520, height: 14 }}>
            <div style={{ flex: interpolate(frame, [CUTS[4] + 2, CUTS[4] + 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), background: "#e53935" }} />
            <div style={{ flex: interpolate(frame, [CUTS[4] + 2, CUTS[4] + 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), background: "#2f6bff" }} />
          </div>
        </AbsoluteFill>
      ) : null}
      {/* title */}
      {frame >= CUTS[5] && frame < INTRO + 4 ? (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 250 }}>
          <div
            style={{
              fontFamily: poppins.fontFamily,
              fontWeight: 800,
              fontSize: 104,
              color: "#ffc72c",
              letterSpacing: -2,
              transform: `scale(${interpolate(frame, [CUTS[5], CUTS[5] + 5], [1.5, 1], { extrapolateRight: "clamp" })})`,
              opacity: interpolate(frame, [CUTS[5], CUTS[5] + 2, INTRO - 4, INTRO + 2], [0, 1, 1, 0], { extrapolateRight: "clamp" }),
              textShadow: "0 6px 30px rgba(0,0,0,0.85)",
            }}
          >
            POLICE RANKS
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 40,
              letterSpacing: 10,
              color: "#fff",
              marginTop: 6,
              opacity: interpolate(frame, [CUTS[5] + 6, CUTS[5] + 10, INTRO - 4, INTRO + 2], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            }}
          >
            BOTTOM → TOP
          </div>
        </AbsoluteFill>
      ) : null}

      {/* rank counter */}
      {inRanks ? (
        <div style={{ position: "absolute", top: 140, width: "100%", textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 34, letterSpacing: 6, color: "#ffc72c" }}>
          {String(k + 1).padStart(2, "0")} / {RANKS.length}
        </div>
      ) : null}




      {/* film finish: vignette + fine animated grain */}
      <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />
      <AbsoluteFill style={{ pointerEvents: "none", opacity: 0.07, mixBlendMode: "overlay" }}>
        <svg width="100%" height="100%">
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={Math.floor(frame) % 50} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </AbsoluteFill>
      {/* single master track: music + SFX + Tarun voice, mixed by scripts/audio_police.py */}
      <Audio src={staticFile("audio/police-mix.wav")} />
    </AbsoluteFill>
  );
};
