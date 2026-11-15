import React from "react";
import { Composition, Folder } from "remotion";
import { ARROW_DURATION, ARROW_FPS, GrowthArrow } from "./videos/GrowthArrow";
import { STAIRS_DURATION, STAIRS_FPS, StairsOfConsistency } from "./videos/StairsOfConsistency";

// Vertical 9:16 for Reels / Shorts / TikTok
const W = 1080;
const H = 1920;

export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="Shorts">
      <Composition
        id="StairsOfConsistency"
        component={StairsOfConsistency}
        durationInFrames={STAIRS_DURATION}
        fps={STAIRS_FPS}
        width={W}
        height={H}
        defaultProps={{ handle: "@yourpage" }}
      />
      <Composition
        id="GrowthArrow"
        component={GrowthArrow}
        durationInFrames={ARROW_DURATION}
        fps={ARROW_FPS}
        width={W}
        height={H}
        defaultProps={{ handle: "@yourpage" }}
      />
    </Folder>
  );
};
