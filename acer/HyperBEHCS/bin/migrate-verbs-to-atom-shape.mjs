// Real-scale migration: 72 verbs from old 35-line tuple-form
// to omnidirectional atom + atlas-full + .hbi indexes pattern.
//
// Input:  C:/HyperBEHCS/data/catalogs/verbs.hbp (1 genesis + 72 verb rows)
// Output:
//   C:/HyperBEHCS/data/catalogs/atoms/verbs-atoms.hbp         — 72 atomic rows
//   C:/HyperBEHCS/data/catalogs/atoms/verbs-atlas-full.hbp    — 72 full-content rows
//   C:/HyperBEHCS/data/catalogs/atoms/verbs-indexes.hbi       — 5 wide indexes

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const TS = new Date().toISOString();
const SRC = "C:/HyperBEHCS/data/catalogs/verbs.hbp";
const OUT_DIR = "C:/HyperBEHCS/data/catalogs/atoms";
fs.mkdirSync(OUT_DIR, { recursive: true });

function sha16(s) {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
}

function encodeGlyph(cp) {
  const high = Math.floor(cp / 1024);
  const low = cp % 1024;
  if (high === 0) return `1024:${low.toString(16).padStart(3, "0")}`;
  return `1024:${high.toString(16).padStart(3, "0")}:${low.toString(16).padStart(3, "0")}`;
}

// Parse existing verbs.hbp
const lines = fs.readFileSync(SRC, "utf8").trim().split("\n");
const verbs = [];
for (const ln of lines) {
  if (!ln.includes("|entry=")) continue;  // skip genesis
  const fields = {};
  for (const seg of ln.split("|")) {
    const i = seg.indexOf("=");
    if (i > 0) fields[seg.slice(0, i)] = seg.slice(i + 1);
  }
  if (!fields.entry || !fields.bucket) continue;
  verbs.push(fields);
}

console.log(`Parsed ${verbs.length} verbs from ${SRC}`);

// Old size baseline
const oldSize = fs.statSync(SRC).size;
const oldLineCount = lines.length;

// Assign cps starting at 5000 (verbs band)
let cpCounter = 5000;
const atoms = verbs.map(v => {
  const cp = cpCounter++;
  const pid = `PROF-VERB-${v.entry.toUpperCase().replace(/[^A-Z0-9]/g, "-")}`;
  const supervisor = v.bucket.startsWith("REDIRECT-TO-LIRIS") ? "vector"
                   : v.bucket === "DEFER-TO-APEX" ? "rook"
                   : v.bucket === "HARD-DENY" ? "omniwhiteroom"
                   : v.bucket === "ACER-SOVEREIGN" ? "falcon"
                   : "forge";  // default GUIDED-EXECUTE
  const tuple = `${pid}+${v.bucket}+${supervisor}+cp${cp}`;
  const sha = sha16(tuple);
  const glyph = encodeGlyph(cp);
  return {
    cp, pid, sha16: sha, glyph, tuple, supervisor,
    verb_name: v.entry,
    bucket: v.bucket,
    reason: v.reason || "",
    canonical_tool: v.canonical_tool || null,
    scope_aware: v.scope_aware === "1",
    scope_extension_bucket: v.scope_extension_bucket || null,
    substitute_hint: v.substitute_hint || null,
  };
});

// ============ 1. verbs-atoms.hbp ============
const atomLines = [];
let prev = "0000000000000000";
const genAtom = `HBPv1|kind=atom-genesis|catalog=verbs|cp_range=5000-${5000 + atoms.length - 1}|count=${atoms.length}|antecedents=${prev}|ts=${TS}|row_hash=${sha16("verb-atom-genesis-" + TS)}`;
atomLines.push(genAtom);
prev = sha16("verb-atom-genesis-" + TS);
for (const a of atoms) {
  const body = `HBPv1|cp=${a.cp}|pid=${a.pid}|sha16=${a.sha16}|tuple=${a.tuple}`;
  const rh = sha16(body + prev);
  atomLines.push(`${body}|antecedents=${prev}|row_hash=${rh}`);
  prev = rh;
}
fs.writeFileSync(path.join(OUT_DIR, "verbs-atoms.hbp"), atomLines.join("\n") + "\n");

// ============ 2. verbs-atlas-full.hbp ============
const atlasLines = [];
prev = "0000000000000000";
atlasLines.push(`HBPv1|kind=atlas-genesis|catalog=verbs|count=${atoms.length}|antecedents=${prev}|ts=${TS}|row_hash=${sha16("verb-atlas-genesis-" + TS)}`);
prev = sha16("verb-atlas-genesis-" + TS);
for (const a of atoms) {
  let body = `HBPv1|cp=${a.cp}|pid=${a.pid}|sha16=${a.sha16}|glyph=${a.glyph}|verb_name=${a.verb_name}|bucket=${a.bucket}|supervisor=${a.supervisor}|reason=${a.reason.slice(0, 200)}`;
  if (a.canonical_tool) body += `|canonical_tool=${a.canonical_tool}`;
  if (a.scope_aware) body += `|scope_aware=1`;
  if (a.scope_extension_bucket) body += `|scope_extension_bucket=${a.scope_extension_bucket}`;
  if (a.substitute_hint) body += `|substitute_hint=${a.substitute_hint}`;
  body += `|tuple=${a.tuple}`;
  const rh = sha16(body + prev);
  atlasLines.push(`${body}|antecedents=${prev}|row_hash=${rh}`);
  prev = rh;
}
fs.writeFileSync(path.join(OUT_DIR, "verbs-atlas-full.hbp"), atlasLines.join("\n") + "\n");

// ============ 3. verbs-indexes.hbi (5 sidecars in one file) ============
const idxLines = [];
idxLines.push(`HBPv1|kind=indexes-genesis|catalog=verbs|sections=by-pid,by-sha16,by-glyph,by-supervisor,by-bucket|count=${atoms.length}|ts=${TS}`);

idxLines.push("# === by-pid (alphabetical) ===");
for (const a of [...atoms].sort((x, y) => x.pid.localeCompare(y.pid))) {
  idxLines.push(`HBPv1|index=by-pid|key=${a.pid}|cp=${a.cp}|sha16=${a.sha16}`);
}

idxLines.push("# === by-sha16 (hex-sorted) ===");
for (const a of [...atoms].sort((x, y) => x.sha16.localeCompare(y.sha16))) {
  idxLines.push(`HBPv1|index=by-sha16|key=${a.sha16}|cp=${a.cp}|pid=${a.pid}`);
}

idxLines.push("# === by-glyph (cp-sorted) ===");
for (const a of [...atoms].sort((x, y) => x.cp - y.cp)) {
  idxLines.push(`HBPv1|index=by-glyph|key=${a.glyph}|cp=${a.cp}|verb=${a.verb_name}`);
}

idxLines.push("# === by-supervisor ===");
const bySup = {};
for (const a of atoms) {
  if (!bySup[a.supervisor]) bySup[a.supervisor] = [];
  bySup[a.supervisor].push(a.cp);
}
for (const [sup, cps] of Object.entries(bySup).sort()) {
  idxLines.push(`HBPv1|index=by-supervisor|key=${sup}|cps=${cps.join(",")}|count=${cps.length}`);
}

idxLines.push("# === by-bucket (verdict class) ===");
const byBucket = {};
for (const a of atoms) {
  if (!byBucket[a.bucket]) byBucket[a.bucket] = [];
  byBucket[a.bucket].push(a.cp);
}
for (const [bk, cps] of Object.entries(byBucket).sort()) {
  idxLines.push(`HBPv1|index=by-bucket|key=${bk}|cps=${cps.join(",")}|count=${cps.length}`);
}

fs.writeFileSync(path.join(OUT_DIR, "verbs-indexes.hbi"), idxLines.join("\n") + "\n");

// ============ MEASURE ============
const atomSize = fs.statSync(path.join(OUT_DIR, "verbs-atoms.hbp")).size;
const atlasSize = fs.statSync(path.join(OUT_DIR, "verbs-atlas-full.hbp")).size;
const idxSize = fs.statSync(path.join(OUT_DIR, "verbs-indexes.hbi")).size;
const totalNew = atomSize + atlasSize + idxSize;

const wirePerSentence_old = 250 * 3;     // 3 inline rows
const wirePerSentence_new = 14;          // 3 cps separated by space, ~14 chars

console.log("=== VERBS REAL-SCALE ATOM MIGRATION ===");
console.log("");
console.log("OLD (verbs.hbp tuple-form):");
console.log("  size:", oldSize, "bytes,", oldLineCount, "rows, ~", Math.round(oldSize/verbs.length), "bytes/row");
console.log("");
console.log("NEW (atom + atlas + indexes):");
console.log("  verbs-atoms.hbp:        ", atomSize.toString().padStart(6), "bytes  (~", Math.round(atomSize/atoms.length), "bytes/atom)");
console.log("  verbs-atlas-full.hbp:   ", atlasSize.toString().padStart(6), "bytes  (~", Math.round(atlasSize/atoms.length), "bytes/entry)");
console.log("  verbs-indexes.hbi:      ", idxSize.toString().padStart(6), "bytes  (5 sidecars)");
console.log("  TOTAL:                  ", totalNew.toString().padStart(6), "bytes");
console.log("");
console.log("STORAGE: " + (totalNew > oldSize ? "+" + ((totalNew-oldSize)/oldSize*100).toFixed(0) + "%" : "-" + ((oldSize-totalNew)/oldSize*100).toFixed(0) + "%") + " vs old single file");
console.log("");
console.log("WIRE FORMAT: ");
console.log("  Old sentence cost (3 inline rows): ~" + wirePerSentence_old + " chars");
console.log("  New sentence cost (3 cps):         ~" + wirePerSentence_new + " chars");
console.log("  RATIO: ~" + Math.round(wirePerSentence_old / wirePerSentence_new) + ":1 per sentence");
console.log("");
console.log("AT FEDERATION SCALE (assume 1M sentences/day across 72 verbs):");
console.log("  Old wire cost: " + (wirePerSentence_old * 1000000 / 1e9).toFixed(2) + " GB/day");
console.log("  New wire cost: " + (wirePerSentence_new * 1000000 / 1e9).toFixed(4) + " GB/day");
console.log("  Atlas loaded ONCE: " + (atlasSize / 1024).toFixed(1) + " KB (one-time)");
console.log("");
console.log("Sample new atom row:");
console.log("  " + atomLines[1]);
console.log("");
console.log("Sample new sentence wire format: '5000 5001 5002' (3-tuple = 14 chars, 30 bits)");
