import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { loadFont as loadMono } from "@remotion/google-fonts/SpaceMono";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const mono = loadMono("normal", { weights: ["700"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["500", "800"], subsets: ["latin"] });

export const MONO = mono.fontFamily;
export const SANS = inter.fontFamily;

const fade = (frame: number, start: number, end: number, len = 12) =>
  interpolate(frame, [start, start + len, end - len, end], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Small spaced-out caps label, like an infographic tag. */
export const Tag: React.FC<{
  text: string;
  sub?: string;
  x: number;
  y: number;
  align?: "left" | "right";
  from?: number;
  to?: number;
  color?: string;
}> = ({ text, sub, x, y, align = "left", from = 0, to = 99999, color = "#ffffff" }) => {
  const frame = useCurrentFrame();
  const o = fade(frame, from, to);
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        [align]: x,
        textAlign: align,
        opacity: o,
        transform: `translateY(${(1 - o) * 10}px)`,
        fontFamily: MONO,
        color,
      }}
    >
      <div style={{ fontSize: 34, letterSpacing: 6, fontWeight: 700 }}>{text}</div>
      {sub ? (
        <div
          style={{
            fontSize: 26,
            letterSpacing: 4,
            marginTop: 10,
            opacity: 0.55,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
};

/** Big centred statement; each line pops in. */
export const Statement: React.FC<{
  lines: string[];
  from: number;
  to: number;
  top?: number;
  size?: number;
  stagger?: number;
  highlight?: number; // index of line to colour with accent
  accent?: string;
}> = ({ lines, from, to, top = 260, size = 76, stagger = 18, highlight, accent = "#ff3b30" }) => {
  const frame = useCurrentFrame();
  const outro = interpolate(frame, [to - 12, to], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: top, paddingLeft: 90, paddingRight: 90 }}>
      {lines.map((line, i) => {
        const start = from + i * stagger;
        const p = interpolate(frame, [start, start + 14], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={i}
            style={{
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: size,
              lineHeight: 1.12,
              letterSpacing: -1.5,
              textAlign: "center",
              color: i === highlight ? accent : "#ffffff",
              opacity: p * outro,
              transform: `translateY(${(1 - p) * 24}px)`,
              filter: `blur(${(1 - p) * 8}px)`,
              textShadow: "0 4px 30px rgba(0,0,0,0.8)",
            }}
          >
            {line}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Watermark: React.FC<{ handle: string }> = ({ handle }) => (
  <div
    style={{
      position: "absolute",
      bottom: 430,
      width: "100%",
      textAlign: "center",
      fontFamily: MONO,
      fontSize: 22,
      letterSpacing: 6,
      color: "rgba(255,255,255,0.22)",
    }}
  >
    {handle.toUpperCase()}
  </div>
);

/** Closing call to action shown in the last seconds. */
export const FollowCta: React.FC<{ handle: string; from: number }> = ({ handle, from }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 1380,
        width: "100%",
        textAlign: "center",
        opacity: p,
        transform: `translateY(${(1 - p) * 16}px)`,
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 30,
          letterSpacing: 5,
          color: "#fff",
          padding: "16px 30px",
          border: "2px solid rgba(255,255,255,0.35)",
          borderRadius: 999,
        }}
      >
        FOLLOW {handle.toUpperCase()}
      </span>
    </div>
  );
};
