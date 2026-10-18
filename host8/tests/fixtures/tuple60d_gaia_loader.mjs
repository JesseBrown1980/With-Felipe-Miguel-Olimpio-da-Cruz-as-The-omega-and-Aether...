// Node's own rows for host8's tuple60D parity test. Cold lane only (node 22.22.0): it loads
// gaia-loader.mjs from its own bytes (sha256 checked), resolves its two sibling imports to stubs that
// throw, appends one line exporting three of its private functions, and calls tuple60D, resolveAgent,
// loadVerbCatalog and parseSeatRow. It never calls loadCatalog or summon (no HTTP, no process launch).
// From host8/:
//   node tests/fixtures/tuple60d_gaia_loader.mjs <gaia-loader.mjs> <verbs.hbp> <seats.hbp> \
//     <seats-raw.tsv> <empty dir for verbs.hbp> <out.hbp> [fixture|bulk] [seed] [random rows] \
//     [file of handle8s to leave out, one per line]
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { register } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";
import { join } from "node:path";

const GAIA_SHA256 = "8b45c7245b03c9c8d3342f82b233e3e149a4ecb25100761a16d2c8fa2e991043";
const [, , GAIA, VERBS, SEATS, SEATS_RAW, CATDIR, OUT, MODE = "fixture", SEED = "1", NRAND = "800", EXCLUDE] =
  process.argv;
const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const gaiaBytes = readFileSync(GAIA);
if (sha256(gaiaBytes) !== GAIA_SHA256) throw new Error(`gaia-loader.mjs sha256 is not ${GAIA_SHA256}`);

const gaiaUrl = pathToFileURL(GAIA).href;
const hooks = `
import { createHash } from "node:crypto";
let gaiaUrl;
const stub = (name) => "data:text/javascript," + encodeURIComponent(
  "export function " + name + "() { throw new Error('stub: the parity harness never runs " + name + "'); }");
export async function initialize(data) { gaiaUrl = data.gaiaUrl; }
export async function resolve(specifier, context, next) {
  if (context.parentURL === gaiaUrl && specifier === "./room-dispatcher.mjs")
    return { url: stub("runFreeAgent"), shortCircuit: true };
  if (context.parentURL === gaiaUrl && specifier === "./free-agent-receipt.mjs")
    return { url: stub("buildReceipt"), shortCircuit: true };
  return next(specifier, context);
}
export async function load(url, context, next) {
  const r = await next(url, context);
  if (url !== gaiaUrl) return r;
  const bytes = Buffer.from(r.source);
  if (createHash("sha256").update(bytes).digest("hex") !== "${GAIA_SHA256}") throw new Error("gaia-loader bytes changed");
  const source = bytes.toString("utf8") + "\\nexport { loadVerbCatalog, parseSeatRow, sha16 };\\n";
  return { format: "module", source, shortCircuit: true };
}`;
register("data:text/javascript," + encodeURIComponent(hooks), { data: { gaiaUrl } });
process.env.HYPERBEHCS_CATALOGS = CATDIR;
const g = await import(gaiaUrl);

// -- encoding: UTF-8 bytes, unreserved ASCII kept, every other byte %XX ---------
const SAFE = new Set([..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~:+@/"]);
function pct(s) {
  let o = "";
  for (const b of Buffer.from(String(s), "utf8")) {
    const c = String.fromCharCode(b);
    o += SAFE.has(c) ? c : "%" + b.toString(16).toUpperCase().padStart(2, "0");
  }
  return o;
}
function typed(v) {
  if (v === undefined) return "u";
  if (v === null) return "z";
  if (typeof v === "string") return "s:" + pct(v);
  if (typeof v === "number") return "n:" + pct(Object.is(v, -0) ? "-0" : String(v));
  if (typeof v === "bigint") return "i:" + pct(String(v));
  if (typeof v === "boolean") return "b:" + String(v);
  return "o:" + pct(String(v));
}
const hasLone = (s) => /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(String(s));

// -- catalogs ----------------------------------------------------------------
const verbsBody = readFileSync(VERBS);
const callLoadVerbCatalog = (body) => {
  writeFileSync(join(CATDIR, "verbs.hbp"), body);
  return g.loadVerbCatalog();
};
const V73 = callLoadVerbCatalog(verbsBody);
const GEN_SIZES = [1, 2, 3, 5, 7, 16, 64, 73, 100, 255, 256, 257, 1000, 4096, 65535, 65536, 65537, 1000003];
const catalogs = new Map();
const rows = [];
catalogs.set("v73", V73);
rows.push(`CAT|id=v73|n=${V73.length}|verbs=${V73.map(pct).join(",")}`);
catalogs.set("c0", []);
rows.push("CAT|id=c0|n=0|verbs=");
catalogs.set("c1", ["format"]);
rows.push("CAT|id=c1|n=1|verbs=format");
const W6 = ["", "a|b", "\u00fcn\u00ef", "\u{1F600}", " ", "x,y"];
catalogs.set("w6", W6);
rows.push(`CAT|id=w6|n=${W6.length}|verbs=${W6.map(pct).join(",")}`);
for (const n of GEN_SIZES) {
  catalogs.set(`g${n}`, Array.from({ length: n }, (_, k) => `g${n}.${k}`));
  rows.push(`CAT|id=g${n}|n=${n}|gen=g${n}.<k>`);
}
const catRows = rows.length;

// -- tuple rows --------------------------------------------------------------
let t60 = 0, throws = 0, served = 0, lone = 0, skipped = 0;
const v73Hit = new Set();
function t60row(src, catId, position, device, timestamp, viaDisk = false) {
  const catalog = catalogs.get(catId);
  const t = g.tuple60D(position, catalog);
  let dev = "!", ts = "!", pid = "!throw";
  try {
    const p = viaDisk ? { ...position } : { ...position, profile: { tuple60D: t } };
    const a = resolveViaGaia(p, device, timestamp);
    if (JSON.stringify(a.tuple60D) !== JSON.stringify(t)) throw new Error("tuple via disk catalog differs");
    dev = pct(a.device); ts = pct(a.ts); pid = a.instance_pid;
  } catch (e) {
    if (!String(e.message).startsWith("resolveAgent: position must carry handle8")) throw e;
    throws++;
  }
  if (catId === "v73") v73Hit.add(t.verb);
  if ([position.name, position.handle8, position.cube_bh, device, timestamp].some(hasLone)) lone++;
  rows.push(
    `T60|i=${t60++}|src=${src}|cat=${catId}|name=${pct(position.name)}|handle8=${pct(position.handle8)}` +
      `|cube_bh=${pct(position.cube_bh)}|device_in=${typed(device)}|ts_in=${typed(timestamp)}` +
      `|verb=${pct(t.verb)}|noun=${pct(t.noun)}|glyph=${pct(t.glyph)}|sha=${pct(t.sha)}` +
      `|device=${dev}|ts=${ts}|instance_pid=${pid}`,
  );
}
function resolveViaGaia(p, device, timestamp) {
  // undefined/null timestamps make resolveAgent read the clock; the corpus never passes them.
  if (timestamp === undefined || timestamp === null) throw new Error("clock-dependent input");
  return g.resolveAgent(p, device, timestamp);
}

// the seat book: every seat as host8-serve holds it, and as gaia-loader reads it from /seats.hbp
const raw = readFileSync(SEATS_RAW, "utf8").split("\n").filter(Boolean).map((l) => {
  const [name, handle8, cube_bh] = l.split("\t").map(decodeURIComponent);
  return { name, handle8, cube_bh };
});
const servedPositions = readFileSync(SEATS, "utf8").split("\n").map((l) => g.parseSeatRow(l.trim())).filter(Boolean);
if (servedPositions.length !== raw.length) throw new Error("seats.hbp and seats-raw.tsv disagree on count");
const excluded = new Set(EXCLUDE ? readFileSync(EXCLUDE, "utf8").split("\n").filter(Boolean) : []);
const DEVICES = ["acer", "liris", "falcon", "aether"];
const seatPasses = MODE === "bulk" ? [0, 1, 2] : [0];
writeFileSync(join(CATDIR, "verbs.hbp"), verbsBody);
for (const pass of seatPasses) {
  raw.forEach((seat, i) => {
    const s = servedPositions[i];
    if (s.handle8 !== seat.handle8) throw new Error(`seat ${i}: served handle8 differs`);
    if (excluded.has(seat.handle8)) {
      if (pass === 0) { rows.push(`SKIP|handle8=${pct(seat.handle8)}`); skipped++; }
      return;
    }
    const device = DEVICES[(i + pass) % 4];
    const ts = String(1750000000 + i + pass * 86400);
    t60row("book", "v73", seat, device, ts, true);
    if (s.name !== seat.name || s.cube_bh !== seat.cube_bh) {
      t60row("served", "v73", { name: s.name, handle8: s.handle8, cube_bh: s.cube_bh }, device, ts, true);
      served++;
    }
  });
}

// upstream's node vector (host8-serve main.rs:1654-1676) and typed device/ts edges
const CHIEF = { name: "FORMULA-CHIEF", handle8: "0155964ffc8ef1f8", cube_bh: "BH.51.0.591" };
const vec = g.resolveAgent({ ...CHIEF }, "acer", "1750000000");
if (vec.tuple60D.verb !== "format" || vec.tuple60D.glyph !== "c844dff6b59b40cf" || vec.instance_pid !== "d125579d9644c37a")
  throw new Error("upstream node vector not reproduced");
for (const cat of ["c1", "v73", "c0"]) t60row("vector", cat, CHIEF, "acer", "1750000000");
const DEVICE_EDGES = ["", undefined, null, 0, false, 0n, NaN, "ACER", " acer", "acer\n", "0", "false", "undefined",
  "null", 1, true, 5n, [], {}, "|", "\u{1F600}", "\ud800", "a".repeat(300)];
const TS_EDGES = [0, -0, 1.5, 1e21, 2 ** 53, 2 ** 53 + 2, NaN, Infinity, -Infinity, 5e-324, 1.7976931348623157e308,
  "", " ", "1750000000", "2026-10-18T00:00:00.000Z", 1750000000n, true, false, [], {}, "\udfff"];
for (const d of DEVICE_EDGES) t60row("edge", "v73", CHIEF, d, "1750000000");
for (const t of TS_EDGES) t60row("edge", "v73", CHIEF, "acer", t);
for (const cat of catalogs.keys()) {
  t60row("edge", cat, { name: "", handle8: "", cube_bh: "" }, "acer", "1");
  t60row("edge", cat, { name: "|", handle8: "|", cube_bh: "|" }, "|", "|");
  t60row("edge", cat, { name: "\ud800", handle8: "\udfff", cube_bh: "\ufffd" }, "\u{10000}", "\u2028");
}

// seeded random rows
function rng(seed) {
  let a = 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = seed >>> 0;
  const next = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0; t = (t + d) | 0; c = (c + t) | 0;
    return t >>> 0;
  };
  for (let i = 0; i < 20; i++) next();
  return next;
}
const next = rng(Number(SEED));
const int = (n) => next() % n;
const POOL = [..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  "|", "=", ".", "%", ",", " ", "-", "_", ":", "/", "\\", '"', "'", "{", "}", "#", "&", "?", "+", "@", "~", "!",
  "\t", "\r", "\n", "\0", "\x7f", "\x1b", "\u00e9", "\u00df", "\u00a0", "\u0130", "\u212a", "\u4e2d", "\u2028", "\u2029", "\ufeff",
  "\u200d", "\u0301", "\u2014", "\u039b", "\u03bd", "\u00a7", "\u00d7", "\u{1F600}", "\u{10FFFF}", "\u{1D11E}"];
const HEX = "0123456789abcdef";
function rstr(maxClass) {
  const r = int(100);
  const len = r < 70 ? int(17) : r < 95 ? 17 + int(48) : 65 + int(maxClass);
  let s = "";
  for (let i = 0; i < len; i++) s += POOL[int(POOL.length)];
  if (int(100) === 0) s = s.slice(0, int(s.length + 1)) + (int(2) ? "\ud800" : "\udfff") + s.slice(int(s.length + 1));
  return s;
}
function rhex(n) { let s = ""; for (let i = 0; i < n; i++) s += HEX[int(16)]; return s; }
function rhandle() {
  const r = int(100);
  if (r < 45) return rhex(16);
  if (r < 55) return rhex(16).toUpperCase();
  if (r < 65) return rhex(1 + int(32));
  if (r < 95) return rstr(64);
  return "";
}
function rdevice() {
  const r = int(100);
  if (r < 40) return DEVICES[int(4)];
  if (r < 50) return "";
  if (r < 55) return undefined;
  if (r < 60) return null;
  if (r < 63) return 0;
  if (r < 65) return false;
  return rstr(64);
}
function rts() {
  const r = int(100);
  if (r < 40) return String(1000000000 + int(1000000000));
  if (r < 60) return int(4000000000);
  if (r < 65) return int(4000000000) / (1 + int(1000));
  if (r < 70) return TS_EDGES[int(11)];
  if (r < 80) return new Date(int(4000000000) * 1000).toISOString();
  if (r < 95) return rstr(64);
  return "";
}
const catIds = [...catalogs.keys()];
for (let i = 0; i < Number(NRAND); i++) {
  const r = int(100);
  const cat = r < 40 ? "v73" : r < 90 ? `g${GEN_SIZES[int(GEN_SIZES.length)]}` : catIds[int(catIds.length)];
  const long = int(200) === 0 ? 1000 : 300;
  const position = { name: rstr(long), handle8: rhandle(), cube_bh: int(2) ? `BH.${int(128)}.${int(3)}.${int(1024)}` : rstr(64) };
  t60row("rand", cat, position, rdevice(), rts());
}

// -- verb-catalog parse rows (loadVerbCatalog through a real file) ------------
const RE = /\|entry=([^|]+)\|/;
let vp = 0, gapLines = 0;
function vprow(src, body, byHash = false) {
  const verbs = callLoadVerbCatalog(body);
  let k = 0;
  for (const line of String(body).split("\n")) {
    const i = line.indexOf("|entry=");
    if (i >= 0 && line[i + 7] === "|" && line.match(RE)) k++;
  }
  gapLines += k;
  const b = byHash ? `body_sha256=${sha256(Buffer.from(body, "utf8"))}` : `body=${pct(body)}`;
  rows.push(`VP|i=${vp++}|src=${src}|${b}|n=${verbs.length}|verbs=${verbs.map(pct).join(",")}|empty_first_entry_lines=${k}`);
}
vprow("verbs.hbp", verbsBody.toString("utf8"), true);
const PARSE_EDGES = ["", "\n", "|entry=a|", "X|entry=a|", "X|entry=a", "X|entry=|", "X|entry=|entry=a|",
  "X|entry=||entry=b|", "X|entry=a|entry=b|", "X|entry= a |", "X|entry=a\r", "X|entry=a|\r", "|entry=\r|",
  "X|ENTRY=a|", "X|entry =a|", "X|xentry=a|", "entry=a|", "X|entry=a=b|", "\ufeffX|entry=a|", "X|entry=\u00e9\u{1F600}|",
  "X|entry=a|\nY|entry=b|", "X|entry=a|\r\nY|entry=b|\r\n", "X|entry=\n|", "X|entry=|entry=|entry=c|",
  "X|entry=|entry=", "X|entry=|x|entry=y|z", "|entry=|entry=|", "X|entry=\t|", "X|entry=\u2028|"];
for (const b of PARSE_EDGES) vprow("edge", b);
const TOK = ["|entry=", "|entry=", "|", "|", "entry=", "=", "a", "verb", "format", "\r", " ", "\u00e9", "\u{1F600}", "|entry=|",
  "HBPv1", "catalog=verbs", "\t", "x=1", "ENTRY="];
function rline() { let s = ""; const n = int(9); for (let i = 0; i < n; i++) s += TOK[int(TOK.length)]; return s; }
const NVP = MODE === "bulk" ? Number(NRAND) / 5 : 600;
for (let i = 0; i < NVP; i++) vprow("rand", rline());
for (let i = 0; i < NVP / 4; i++) {
  const n = 1 + int(6), sep = int(3) ? "\n" : "\r\n";
  vprow("rand", Array.from({ length: n }, rline).join(sep) + (int(2) ? sep : ""));
}

const self = readFileSync(fileURLToPath(import.meta.url));
rows.unshift(
  `T60GAIAHDR|source=gaia-loader.mjs|source_bytes=${gaiaBytes.length}|source_sha256=${GAIA_SHA256}` +
    `|source_git_blob=703cb8e24773821d75a2ce32a24ccc42b21339b8|public=JesseBrown1980/bigpickle-rebuild@2a45d54:src/gaia-loader.mjs` +
    `|node=${process.version}|generator=tuple60d_gaia_loader.mjs|generator_sha256=${sha256(self)}` +
    `|verbs_sha256=${sha256(verbsBody)}|seats_sha256=${sha256(readFileSync(SEATS))}|seats_raw_sha256=${sha256(readFileSync(SEATS_RAW))}` +
    `|seats=${raw.length}|seats_left_out=${skipped}|mode=${MODE}|seed=${SEED}|cat_rows=${catRows}|t60_rows=${t60}|vp_rows=${vp}|throw_rows=${throws}` +
    `|served_rows=${served}|lone_surrogate_rows=${lone}|v73_verbs_hit=${v73Hit.size}|empty_first_entry_lines=${gapLines}` +
    `|fns=tuple60D+resolveAgent+loadVerbCatalog+parseSeatRow|appended=export_loadVerbCatalog+parseSeatRow+sha16` +
    `|stubs=runFreeAgent+buildReceipt_throw|enc=pct-utf8|json=0`,
);
rows.push(`T60GAIAFTR|rows_sha256=${sha256(rows.join("\n"))}|json=0`);
writeFileSync(OUT, rows.join("\n") + "\n");
console.log(rows[0]);
console.log(rows[rows.length - 1]);
