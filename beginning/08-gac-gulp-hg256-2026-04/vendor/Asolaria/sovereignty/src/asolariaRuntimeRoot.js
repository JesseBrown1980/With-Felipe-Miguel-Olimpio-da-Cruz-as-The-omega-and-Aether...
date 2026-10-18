const path = require("node:path");

function resolveAsolariaRuntimeRoot(baseRoot = process.env.ASOLARIA_INSTANCE_ROOT || process.cwd()) {
  const resolvedRoot = path.resolve(baseRoot);
  return path.basename(resolvedRoot).toLowerCase() === "runtime"
    ? resolvedRoot
    : path.join(resolvedRoot, "runtime");
}

module.exports = {
  resolveAsolariaRuntimeRoot
};
