import fs from "node:fs";
const s = fs.readFileSync("C:/asolaria-acer/packages/dashboard/src/super-os-viz/super-dashboard-server.mjs","utf8");
const start = s.indexOf("const VERB_MATRIX = {");
const end = s.indexOf("\n};", start);
const block = s.slice(start, end);
const matches = block.match(/^  '[a-z0-9_-]+':\s*\{/gm) || [];
console.log("VERB_MATRIX entries:", matches.length);
console.log("verbs:", matches.map(x => x.match(/'([^']+)'/)[1]).join(", "));
