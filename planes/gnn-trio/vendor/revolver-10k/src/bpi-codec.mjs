// BPI codec — binary / hash / hex / crypto encoding for revolver-10k envelopes.
// Uses BEHCS-1024 alphabet at C:/asolaria-acer/data/behcs/codex/alphabet-1024.json.
// 10 bits per symbol, 4 symbols pack into 5 bytes (40 bits). 25% denser than base-256.
//
// Public:
//   hilbertAddress(key) -> 6-glyph string         (SHA-256 → low 64 bits → 6-symbol base-1024 glyph)
//   encodeFrame(fields) -> string                 (positional fields → glyph frame, NO JSON keys)
//   decodeFrame(str)    -> array                  (round-trip)
//   pidChamber(roomId)  -> string                 (`ACER-REVOLVER-CHAMBER-NNNN-<6glyph>` form)
//   bytesToHex(buf)     -> hex string

import fs from 'node:fs';
import crypto from 'node:crypto';

const ALPHABET_PATH = process.env.BEHCS_ALPHABET || 'C:/asolaria-acer/data/behcs/codex/alphabet-1024.json';
const ALPHA = JSON.parse(fs.readFileSync(ALPHABET_PATH, 'utf8'));
if (ALPHA.base !== 1024 || ALPHA.glyphs.length !== 1024) {
  throw new Error(`BEHCS-1024 alphabet broken at ${ALPHABET_PATH}`);
}
const GLYPHS = ALPHA.glyphs;
const GLYPH_INDEX = new Map(GLYPHS.map((g, i) => [g, i]));
export const WIDTH = ALPHA.canonical_width; // 6

// Encode a 64-bit unsigned BigInt as `width` glyphs of base-1024.
export function encodeGlyph(value, width = WIDTH) {
  let v = BigInt.asUintN(64, BigInt(value));
  const out = [];
  const base = 1024n;
  for (let i = 0; i < width; i++) {
    out.push(GLYPHS[Number(v & 1023n)]);
    v >>= 10n;
  }
  return out.join('');
}

// Glyphs are NOT 1:1 with JS string chars — many are surrogate pairs or multi-codepoint.
// Use Array.from to split into code points then greedy-match against the alphabet.
function splitGlyphs(str) {
  // Greedy longest-match split (alphabet has glyphs of varying string-length in JS).
  // Pre-sort glyphs by descending JS-string length for greedy match safety.
  const out = [];
  let i = 0;
  while (i < str.length) {
    let matched = null;
    // Try lengths 4..1 (most multi-codepoint glyphs are ≤ 4 JS chars)
    for (let len = Math.min(4, str.length - i); len >= 1; len--) {
      const candidate = str.slice(i, i + len);
      if (GLYPH_INDEX.has(candidate)) { matched = candidate; break; }
    }
    if (!matched) throw new Error(`unknown glyph at offset ${i}: U+${str.charCodeAt(i).toString(16)}`);
    out.push(matched);
    i += matched.length;
  }
  return out;
}

export function decodeGlyph(str) {
  const glyphs = splitGlyphs(str);
  let v = 0n;
  for (let i = glyphs.length - 1; i >= 0; i--) {
    const idx = GLYPH_INDEX.get(glyphs[i]);
    if (idx === undefined) throw new Error(`unknown glyph: ${glyphs[i]}`);
    v = (v << 10n) | BigInt(idx);
  }
  return v;
}

// SHA-256(key) → low 64 bits → 6-glyph base-1024 address. Deterministic, collision-resistant.
export function hilbertAddress(key) {
  const h = crypto.createHash('sha256').update(String(key)).digest();
  const v = h.readBigUInt64BE(0);
  return encodeGlyph(v, WIDTH);
}

// Compact bytes → hex without dashes.
export function bytesToHex(buf) {
  return Buffer.from(buf).toString('hex');
}

// Frame format (no JSON):
//   <tag>|<v1>|<v2>|...|<vN>|<sha8>
//   tag    = 4-char ASCII verb (e.g. "FAOR" for FREE_AGENT_OUTPUT_RESULT)
//   v1..N  = positional values (numbers as decimal ASCII, strings as glyph-encoded if BigInt-able,
//            or raw-with-pipe-escape — pipes in strings become "\|")
//   sha8   = first 8 hex chars of SHA-256(tag|v1|...|vN). integrity check.
//
// At 10K-per-min this is ~70-150 bytes per frame vs ~200-500 for JSON. NO key names on the wire.
const PIPE_ESC = '\\|';
function escape(s) { return String(s).replace(/\\/g, '\\\\').replace(/\|/g, PIPE_ESC); }
function unescape(s) { return s.replace(/\\\|/g, '|').replace(/\\\\/g, '\\'); }

export function encodeFrame(tag, fields) {
  if (typeof tag !== 'string' || tag.length === 0 || tag.length > 8) throw new Error('bad tag');
  const parts = [tag, ...fields.map((f) => escape(f == null ? '' : f))];
  const body = parts.join('|');
  const sha = crypto.createHash('sha256').update(body).digest('hex').slice(0, 8);
  return `${body}|${sha}`;
}

export function decodeFrame(str) {
  // Split on unescaped pipes
  const parts = [];
  let cur = '';
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '\\' && str[i + 1] === '|') { cur += '|'; i++; continue; }
    if (str[i] === '\\' && str[i + 1] === '\\') { cur += '\\'; i++; continue; }
    if (str[i] === '|') { parts.push(cur); cur = ''; continue; }
    cur += str[i];
  }
  parts.push(cur);
  if (parts.length < 2) throw new Error('frame too short');
  const sha = parts.pop();
  const body = parts.join('|');
  const check = crypto.createHash('sha256').update(body).digest('hex').slice(0, 8);
  if (check !== sha) throw new Error(`frame sha mismatch: ${check} vs ${sha}`);
  const tag = parts[0];
  const fields = parts.slice(1).map(unescape);
  return { tag, fields, sha };
}

// ────────────────────────────────────────────────────────────────────────────
// HBPv1 row grammar — alignment with upstream hyperbehcs_hermes/packet.py.
// Source truth: D:/hyperbehcs-hermes-upstream/hyperbehcs_hermes/packet.py + SPEC.md.
// A canonical row: HBPv1|key=value|key=value|...|status=<STATUS>
// 13 required fields below MUST be present. 32 authority fields default closed ("0").
// JSON hot path is REJECTED (json must be "0"). Append-only emission.
// ────────────────────────────────────────────────────────────────────────────

export const HBPV1_PREFIX = 'HBPv1';

// 13 required fields, mirroring REQUIRED_FIELDS in upstream packet.py.
export const HBPV1_REQUIRED_FIELDS = Object.freeze([
  'layer',
  'pid',
  'prof',
  'supervisor',
  'tuple',
  'triple_quant',
  'polar_quant',
  'js_quant',
  'turbo_quant',
  'json',
  'runtime',
  'promote',
  'status',
]);

// 32 authority fields, mirroring AUTHORITY_FIELDS = LEGACY_CLOSED_FIELDS ∪ EXECUTION_FIELDS
// from upstream authority.py (dedup-ordered: 8 legacy + 26 execution − 2 dup = 32).
export const HBPV1_AUTHORITY_FIELDS = Object.freeze([
  // legacy closed
  'json',
  'runtime',
  'promote',
  'endpoint',
  'provider',
  'mcp',
  'usb_write',
  'device_write',
  // execution (de-duped against legacy)
  'dispatch',
  'route',
  'shell',
  'terminal',
  'file_write',
  'memory_write',
  'tool_execute',
  'skill_execute',
  'mcp_execute',
  'webmcp_execute',
  'provider_call',
  'endpoint_open',
  'browser_control',
  'keyboard_control',
  'screenshot_capture',
  'network_call',
  'webhook_open',
  'cron_create',
  'device_read',
  'usb_read',
  'private_surface_export',
  'hidden_surface_export',
  'restricted_surface_export',
  'secret_surface_export',
  'repo_publish',
  'package_release',
]);

// Encode an HBPv1 row from a fields object. Canonical pipe-delim, key=value.
// - All 13 required fields MUST be supplied (throws otherwise).
// - Authority fields not supplied default to "0" (closed).
// - json=0, runtime=0, promote=0 are enforced unless explicitly overridden by caller
//   (caller-supplied values pass through; verifier will reject open hot path).
// - Field-order: required (13) → remaining authority fields → other extras.
// - Values are coerced to strings; "|" and "=" inside values are rejected (canonical safety).
export function encodeHbpv1Row(fields) {
  if (!fields || typeof fields !== 'object') throw new Error('encodeHbpv1Row: fields object required');

  // Verify required present.
  const missing = HBPV1_REQUIRED_FIELDS.filter((k) => !(k in fields));
  if (missing.length) throw new Error(`encodeHbpv1Row: missing required fields: ${missing.join(',')}`);

  // Build canonical key=value list. Defensive: reject "|" and "=" inside values
  // (the row grammar has no escape syntax — values must be canonical pre-escaped).
  const seen = new Set();
  const emit = [];
  const push = (k) => {
    if (seen.has(k)) return;
    if (!(k in fields)) return;
    const raw = fields[k];
    const v = raw == null ? '' : String(raw);
    if (v.indexOf('|') !== -1 || v.indexOf('\n') !== -1) {
      throw new Error(`encodeHbpv1Row: value for "${k}" contains forbidden char (| or newline)`);
    }
    if (k.indexOf('=') !== -1 || k.indexOf('|') !== -1) {
      throw new Error(`encodeHbpv1Row: key "${k}" contains forbidden char`);
    }
    emit.push(`${k}=${v}`);
    seen.add(k);
  };

  // 1. Required first (canonical order from SPEC.md). These come from caller (json/runtime/promote also live here).
  for (const k of HBPV1_REQUIRED_FIELDS) push(k);

  // 2. Authority fields: caller-supplied wins, others default to "0" (closed).
  for (const k of HBPV1_AUTHORITY_FIELDS) {
    if (seen.has(k)) continue;
    if (k in fields) { push(k); continue; }
    emit.push(`${k}=0`);
    seen.add(k);
  }

  // 3. Any remaining caller-supplied extras (descriptor / chain / promotion / wave fields).
  for (const k of Object.keys(fields)) push(k);

  return `${HBPV1_PREFIX}|${emit.join('|')}`;
}

// Parse + verify an HBPv1 row. Returns { ok, fields, errors }.
// Mirrors upstream parse_row + verify_packet row-level checks:
// - prefix must be "HBPv1"
// - every field must contain "="
// - no duplicate keys
// - all 13 required keys present
// - json must equal "0" (hot path closed)
// - authority fields must be "0" or absent (default-closed)
export function verifyHbpv1Row(line) {
  const errors = [];
  const fields = {};
  if (typeof line !== 'string') return { ok: false, fields, errors: ['line not a string'] };
  const trimmed = line.replace(/\r?\n$/, '').trim();
  if (!trimmed) return { ok: false, fields, errors: ['empty row'] };
  const parts = trimmed.split('|');
  if (parts[0] !== HBPV1_PREFIX) errors.push(`unsupported prefix: ${parts[0]}`);
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const eq = part.indexOf('=');
    if (eq === -1) { errors.push(`field lacks '=': ${part}`); continue; }
    const k = part.slice(0, eq);
    const v = part.slice(eq + 1);
    if (!k) { errors.push(`empty key in field: ${part}`); continue; }
    if (k in fields) { errors.push(`duplicate key: ${k}`); continue; }
    fields[k] = v;
  }
  const missing = HBPV1_REQUIRED_FIELDS.filter((k) => !(k in fields));
  if (missing.length) errors.push(`missing required: ${missing.join(',')}`);
  if (fields.json !== undefined && fields.json !== '0') errors.push('json hot path not closed');
  for (const k of HBPV1_AUTHORITY_FIELDS) {
    if (k in fields && fields[k] !== '0') errors.push(`authority field "${k}" not closed (=${fields[k]})`);
  }
  return { ok: errors.length === 0, fields, errors };
}

// Chamber PID — adopts existing fabric-revolver naming convention.
//   ACER-REVOLVER-CHAMBER-NNNN-<6glyph>
//   NNNN  = 4-digit room id
//   6glyph = hilbertAddress("chamber:NNNN:<salt>") — deterministic per (room, salt)
export function pidChamber(roomId, salt = '') {
  const n = String(roomId).padStart(4, '0');
  const g = hilbertAddress(`chamber:${n}:${salt}`);
  return `ACER-REVOLVER-CHAMBER-${n}-${g}`;
}

// Self-test
export function selfTest() {
  const addr = hilbertAddress('test-key');
  const glyphCount = splitGlyphs(addr).length;
  if (glyphCount !== WIDTH) throw new Error(`hilbert width: got ${glyphCount} glyphs, expected ${WIDTH}`);
  // Width-6 fits 60 bits — mask to 60 bits for lossless round-trip test.
  const SIXTY_BIT = (1n << 60n) - 1n;
  const v = 0x123456789abcdef0n & SIXTY_BIT;
  const g = encodeGlyph(v);
  const decoded = decodeGlyph(g);
  if (decoded !== v) throw new Error(`glyph round-trip fail: 0x${decoded.toString(16)} vs 0x${v.toString(16)}`);
  const f = encodeFrame('FAOR', ['opencode-bp', 42, 'hb-007-007-00042-iaof42', '50000.16777215', 'rev-abc', 1, 12345, 99, 256]);
  const d = decodeFrame(f);
  if (d.tag !== 'FAOR' || d.fields.length !== 9) throw new Error('frame round-trip');
  const pid = pidChamber(42, 'salt');
  if (!/^ACER-REVOLVER-CHAMBER-0042-/.test(pid)) throw new Error('pid format');

  // HBPv1 row round-trip — alignment with upstream packet.py.
  const hbpv1 = encodeHbpv1Row({
    layer: 'revolver',
    pid: pid,
    prof: 'free_agent_runner',
    supervisor: 'forge',
    tuple: 'revolver:chamber:42',
    triple_quant: 'polar/turbo/js',
    polar_quant: 'free/described',
    js_quant: 'rev_tuple_42',
    turbo_quant: 'compact_hot',
    json: '0',
    runtime: '0',
    promote: '0',
    status: 'AUTHORITY_DESCRIBED',
  });
  if (!hbpv1.startsWith('HBPv1|')) throw new Error('hbpv1 prefix');
  const rt = verifyHbpv1Row(hbpv1);
  if (!rt.ok) throw new Error(`hbpv1 verify failed: ${rt.errors.join(';')}`);
  if (rt.fields.layer !== 'revolver' || rt.fields.pid !== pid) throw new Error('hbpv1 round-trip mismatch');
  // Confirm authority defaults closed (count exact: 32 authority keys present, all =0).
  let closedCount = 0;
  for (const k of HBPV1_AUTHORITY_FIELDS) if (rt.fields[k] === '0') closedCount++;
  if (closedCount !== HBPV1_AUTHORITY_FIELDS.length) throw new Error(`authority closed-count: ${closedCount}/${HBPV1_AUTHORITY_FIELDS.length}`);
  // Required count check.
  let reqCount = 0;
  for (const k of HBPV1_REQUIRED_FIELDS) if (k in rt.fields) reqCount++;
  if (reqCount !== HBPV1_REQUIRED_FIELDS.length) throw new Error(`required count: ${reqCount}/13`);

  // Negative tests: missing required, open json, open authority must all fail verify.
  const bad1 = encodeHbpv1Row({
    layer: 'x', pid: 'p', prof: 'p', supervisor: 's', tuple: 't',
    triple_quant: 'a', polar_quant: 'b', js_quant: 'c', turbo_quant: 'd',
    json: '0', runtime: '0', promote: '0', status: 'X',
  }).replace('|json=0|', '|json=1|');
  if (verifyHbpv1Row(bad1).ok) throw new Error('hbpv1 should reject json=1');
  const bad2 = 'HBPv1|layer=x|pid=p|prof=p|supervisor=s|tuple=t|triple_quant=a|polar_quant=b|js_quant=c|turbo_quant=d|json=0|runtime=0|promote=0|status=X|shell=1';
  if (verifyHbpv1Row(bad2).ok) throw new Error('hbpv1 should reject shell=1');

  // wire-size comparison
  const jsonSample = JSON.stringify({
    t: 'FAO', f: 'rev10k', v: 'EVT-RAR', pa: null,
    p: { m: 'opencode-bp', r: 42, n: 'hb-007-007-00042-iaof42', pp: '50000.16777215', j: 'rev-abc', ok: 1, ms: 12345, rid: 99, len: 256 },
    ts: 1700000000000,
  });
  return {
    ok: true,
    frame_bytes: f.length,
    json_bytes: jsonSample.length,
    reduction_pct: Math.round((1 - f.length / jsonSample.length) * 100),
    addr_sample: addr,
    pid_sample: pid,
    hbpv1_bytes: hbpv1.length,
    hbpv1_required: HBPV1_REQUIRED_FIELDS.length,
    hbpv1_authority: HBPV1_AUTHORITY_FIELDS.length,
    hbpv1_sample: hbpv1,
  };
}
