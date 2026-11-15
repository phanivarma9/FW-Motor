/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);
// No GPU in the render box: use SwiftShader-backed ANGLE for WebGL (three.js)
Config.setChromiumOpenGlRenderer("swangle");
Config.setConcurrency(4);
// Use the pre-installed Chromium when present (cloud box); otherwise Remotion downloads its own.
import fs from "fs";
if (fs.existsSync("/opt/pw-browsers/chromium")) {
  Config.setBrowserExecutable("/opt/pw-browsers/chromium");
}
