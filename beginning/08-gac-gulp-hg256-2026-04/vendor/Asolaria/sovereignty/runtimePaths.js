// runtimePaths.js — USB sovereignty shim
// When running from USB, projectRoot IS the USB root.
// When running inside Asolaria, this gets overridden by Asolaria's own runtimePaths.
const path = require("path");

const projectRoot = path.resolve(__dirname);
const instanceRoot = projectRoot;

function resolveDataPath(...segments) {
  return path.join(projectRoot, "data", ...segments);
}

module.exports = { projectRoot, instanceRoot, resolveDataPath };
