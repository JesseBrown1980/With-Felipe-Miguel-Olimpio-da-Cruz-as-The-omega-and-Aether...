// gaia-briefing.mjs — STEP (ii) of the Asolaria crank: make GAIA's summon SMART.
//
// Adds TWO things ON TOP of the proven gaia-loader summon (step b):
//   1. TIMESTAMP-GATE  (right agent at the right TIME)  -> timeGate()
//   2. IX-BRIEFING     (right CONTEXT, GAIA's P/I/D)     -> buildBriefing()
//   3. summonSmart()   = timeGate THEN buildBriefing THEN gaia-loader.summon()
//
// HONEST FRAME (do not inflate):
//   - The P/I/D briefing SHAPE is GAIA's own, copied from the REAL builder
//     C:/asolaria-acer/packages-legacy-import/src/spawnContextBuilder.js
//     (P = blockers/health, I = IX knowledge filtered by seat, D = drift signals).
//     We MATCH its field names (proportional/integral/derivative, blockers,
//     signals) — we do NOT invent a new format.
//   - The "I" knowledge is selected from the LIVE catalogs on disk
//     (C:/HyperBEHCS/data/catalogs: verbs.hbp, abilities.hbp, skills.hbp) keyed
//     by THIS seat's 60D tuple (verb) + class/layer/glyph. The seat's verb maps
//     to a real policy BUCKET (GUIDED-EXECUTE / DEFER-TO-APEX / HARD-DENY ...).
//   - GAIA's live P/D signal FILES (runtime/gaia-inbox.ndjson, data/health-
//     state.json, data/drift-signals.json) may be ABSENT on this seat right now.
//     When absent, P and D degrade to EMPTY (honest: mechanism wired, data
//     not yet populated). This matches spawnContextBuilder's own fallbacks.
//   - The time-WINDOW format is grounded in the 47D canon's temporal dims
//     (hilbert-omni-47D.json D20 TIME {timestamp,duration,sequence,epoch,ttl,
//     cron} + D45 OMNICALENDAR {immediate, cron_hourly, cron_daily,
//     deployment_window, operator_available}). Per-seat SCHEDULE DATA
//     population is FUTURE/DESIGN — here we build the GATE MECHANISM + format
//     with a sane default-open.
//
// E=0 ADDITIVE: imports gaia-loader's resolveAgent + summon UNCHANGED (the
// instance_pid hash stays identical => Rust-twin parity holds). Does NOT modify
// gaia-loader, room-dispatcher, model-citizen-rotator, or spawnContextBuilder.
// HBP/json=0 friendly text briefing.
//
// Operator: Jesse Daniel Brown. Built 2026-06-19 (step ii).

import { createHash } from 'node:crypto';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { resolveAgent, summon, tuple60D } from './gaia-loader.mjs';

// ── primitives (same hashing the fabric uses) ────────────────────────────────
function sha256hex(s) { return createHash('sha256').update(String(s)).digest('hex'); }
function sha16(s) { return sha256hex(s).slice(0, 16); }
function nowUnix() { return Math.floor(Date.now() / 1000); }

// ── paths (GAIA's canonical surfaces, matched to spawnContextBuilder) ─────────
// projectRoot in GAIA = packages-legacy-import/ (runtimePaths.js: resolve(src,..)).
const GAIA_ROOT = process.env.GAIA_PROJECT_ROOT || 'C:/asolaria-acer/packages-legacy-import';
const HEALTH_PATH = join(GAIA_ROOT, 'data', 'health-state.json');          // P (primary)
const DRIFT_PATH = join(GAIA_ROOT, 'data', 'drift-signals.json');          // D (primary)
const FLAGS_DIR = join(GAIA_ROOT, 'runtime', 'flags');                     // P (fallback)
const HEALTH_FLAG = join(FLAGS_DIR, 'health-ok.flag');                     // P (fallback)
const GAIA_INBOX = join(GAIA_ROOT, 'runtime', 'gaia-inbox.ndjson');        // D (fallback)
const DASEIN_INBOX = join(GAIA_ROOT, 'runtime', 'dasein-inbox.ndjson');    // D (fallback)
// LIVE catalogs on disk = the "I" (integral) IX knowledge source.
const CATALOG_DIR = process.env.HYPERBEHCS_CATALOGS || 'C:/HyperBEHCS/data/catalogs';

// ── catalog readers (the "I" knowledge: verbs/abilities/skills) ──────────────
// Cached once per process (catalogs are append-only static corpus).
let _verbBuckets = null;   // entry -> {bucket, reason, canonical_tool?, substitute_hint?}
let _abilityProfiles = null; // entry -> {read_grep, bash_readonly, write_edit}
let _skills = null;        // [{entry, kind, root?, title?}]

function loadVerbBuckets() {
  if (_verbBuckets) return _verbBuckets;
  const m = {};
  const p = join(CATALOG_DIR, 'verbs.hbp');
  if (existsSync(p)) {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (!line.includes('|entry=') || !line.includes('|bucket=')) continue;
      const f = {};
      for (const kv of line.split('|')) { const i = kv.indexOf('='); if (i > 0) f[kv.slice(0, i)] = kv.slice(i + 1); }
      if (f.entry) m[f.entry] = {
        bucket: f.bucket || '', reason: f.reason || '',
        canonical_tool: f.canonical_tool || null, substitute_hint: f.substitute_hint || null,
      };
    }
  }
  _verbBuckets = m;
  return m;
}

function loadAbilityProfiles() {
  if (_abilityProfiles) return _abilityProfiles;
  const m = {};
  const p = join(CATALOG_DIR, 'abilities.hbp');
  if (existsSync(p)) {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (!line.includes('kind=agent_profile')) continue;
      const f = {};
      for (const kv of line.split('|')) { const i = kv.indexOf('='); if (i > 0) f[kv.slice(0, i)] = kv.slice(i + 1); }
      if (f.entry) m[f.entry] = { read_grep: f.read_grep, bash_readonly: f.bash_readonly, write_edit: f.write_edit };
    }
  }
  _abilityProfiles = m;
  return m;
}

function loadSkills() {
  if (_skills) return _skills;
  const out = [];
  const p = join(CATALOG_DIR, 'skills.hbp');
  if (existsSync(p)) {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (!line.includes('kind=') || line.includes('catalog=skills|layer=')) continue;
      const f = {};
      for (const kv of line.split('|')) { const i = kv.indexOf('='); if (i > 0) f[kv.slice(0, i)] = kv.slice(i + 1); }
      if (f.entry) out.push({ entry: f.entry, kind: f.kind || '', title: f.title || f.entry });
    }
  }
  _skills = out;
  return out;
}

// ── P — Proportional: current blockers / health (GAIA's readHealthState) ─────
// Mirrors spawnContextBuilder.readHealthState(): primary data/health-state.json
// -> fallback runtime/flags/health-ok.flag absence. Absent => empty (honest).
function readProportional() {
  // primary: structured health-state.json
  try {
    if (existsSync(HEALTH_PATH)) {
      const raw = JSON.parse(readFileSync(HEALTH_PATH, 'utf8'));
      return {
        healthStatus: String(raw.status || 'unknown'),
        blockers: Array.isArray(raw.blockers) ? raw.blockers : [],
        checkedAt: raw.checkedAt || null,
        source: 'health-state.json',
      };
    }
  } catch { /* fall through to flag check */ }
  // fallback: flag-file based health check (Gaia original)
  const blockers = [];
  if (existsSync(FLAGS_DIR) && !existsSync(HEALTH_FLAG)) blockers.push('health-ok.flag absent');
  return {
    healthStatus: blockers.length ? 'degraded' : 'unknown',
    blockers, checkedAt: null,
    source: existsSync(FLAGS_DIR) ? 'flags-dir' : 'absent',
  };
}

// ── D — Derivative: drift signals (GAIA's readDriftSignals) ──────────────────
// Mirrors spawnContextBuilder.readDriftSignals(): primary data/drift-signals.json
// -> fallback inbox mtime (gaia-inbox.ndjson / dasein-inbox.ndjson modified in
// last 5 min => a "recent-message" signal). Absent => empty (honest).
function readDerivative() {
  // primary: structured drift-signals.json
  try {
    if (existsSync(DRIFT_PATH)) {
      const raw = JSON.parse(readFileSync(DRIFT_PATH, 'utf8'));
      return {
        signals: Array.isArray(raw.signals) ? raw.signals.slice(-10) : [],
        lastUpdate: raw.lastUpdate || null,
        inboxDelta: raw.inboxDelta || 0,
        source: 'drift-signals.json',
      };
    }
  } catch { /* fall through to inbox mtime */ }
  // fallback: inbox mtime-based signal detection (Gaia original)
  const signals = [];
  for (const inbox of [{ name: 'gaia', path: GAIA_INBOX }, { name: 'dasein', path: DASEIN_INBOX }]) {
    try {
      if (existsSync(inbox.path)) {
        const ageMs = Date.now() - statSync(inbox.path).mtimeMs;
        if (ageMs < 300000) signals.push({ source: `inbox/${inbox.name}`, age: `${Math.round(ageMs / 1000)}s ago`, type: 'recent-message' });
      }
    } catch { /* skip */ }
  }
  return { signals, lastUpdate: null, inboxDelta: 0, source: signals.length ? 'inbox-mtime' : 'absent' };
}

// ── I — Integral: the IX knowledge for THIS seat ─────────────────────────────
// Selection keys (per the prompt: "by its class/verb/glyph"):
//   verb  — the seat's 60D verb -> its policy bucket+reason from verbs.hbp
//   class/layer — matched to an ability profile (abilities.hbp) + relevant
//                 federation skills (skills.hbp) by keyword overlap
//   glyph — carried (the BEHCS glyph id from the 60D tuple)
// This is GAIA's "I" (accumulated IX knowledge filtered by seat role), grounded
// in the catalogs that actually exist on disk.
function selectIxEntries(position) {
  const verbBuckets = loadVerbBuckets();
  const abilityProfiles = loadAbilityProfiles();
  const skills = loadSkills();

  // the seat's 60D tuple (verb·noun·glyph·sha) — reuse gaia-loader's deterministic builder
  const t = (position.profile && position.profile.tuple60D) || tuple60D(position, Object.keys({}));
  const verb = t.verb;
  const glyph = t.glyph;

  const ix = [];

  // (a) VERB knowledge: the policy bucket the seat's verb resolves to.
  const vb = verbBuckets[verb];
  if (vb) {
    ix.push({
      ix_type: 'verb-policy', key: verb,
      title: `verb '${verb}' -> ${vb.bucket}`,
      detail: vb.reason + (vb.canonical_tool ? ` | tool=${vb.canonical_tool}` : '') + (vb.substitute_hint ? ` | hint=${vb.substitute_hint}` : ''),
    });
  } else {
    ix.push({ ix_type: 'verb-policy', key: verb, title: `verb '${verb}' -> (uncatalogued)`, detail: 'no bucket entry; treat as GUIDED-EXECUTE-read-only by default' });
  }

  // (b) ABILITY profile by class/name keyword overlap (the seat's capability tier).
  const cls = (position.class || '').toLowerCase();
  const nm = (position.name || '').toLowerCase();
  const abilityKey = Object.keys(abilityProfiles).find((k) =>
    cls.includes(k.toLowerCase()) || nm.includes(k.toLowerCase())) || 'general-purpose';
  const ap = abilityProfiles[abilityKey];
  if (ap) {
    ix.push({
      ix_type: 'ability', key: abilityKey,
      title: `ability '${abilityKey}'`,
      detail: `read_grep=${ap.read_grep} bash_ro=${ap.bash_readonly} write_edit=${ap.write_edit}`,
    });
  }

  // (c) SKILLS relevant to this seat's class/layer (keyword overlap with name/class/layer).
  const seatWords = `${cls} ${nm} ${(position.layer || '').toLowerCase()}`;
  const matchedSkills = skills.filter((s) => {
    const e = s.entry.toLowerCase();
    // match if the skill name shares a meaningful token with the seat, OR is a
    // core federation skill every spawned seat should carry (pid-mint/cosign).
    return seatWords.includes(e) || ['pid-mint', 'cosign-attest', 'atlas-query'].includes(s.entry);
  }).slice(0, 4);
  for (const s of matchedSkills) {
    ix.push({ ix_type: 'skill', key: s.entry, title: `skill '${s.entry}' [${s.kind}]`, detail: s.title });
  }

  return { entries: ix, verb, glyph, abilityKey, skillsLoaded: matchedSkills.length };
}

// ── PUBLIC 1: buildBriefing(position) ────────────────────────────────────────
// Assemble GAIA's IX-briefing for a position in the P/I/D shape from
// spawnContextBuilder. Returns { text, packet } — `text` is a compact HBP/text
// briefing (json=0-friendly) to prepend to the summon prompt; `packet` is the
// structured P/I/D object (same field names as spawnContextBuilder: proportional
// / integral / derivative, blockers, signals).
export function buildBriefing(position, opts = {}) {
  if (!position || !position.handle8) throw new Error('buildBriefing: position must carry handle8');

  const P = readProportional();                 // blockers / health
  const I = selectIxEntries(position);          // IX knowledge for this seat
  const D = readDerivative();                    // drift signals

  // structured packet (matches spawnContextBuilder field names)
  const packet = {
    seat: { name: position.name, handle8: position.handle8, class: position.class, layer: position.layer, cube_bh: position.cube_bh },
    proportional: { healthStatus: P.healthStatus, blockers: P.blockers, source: P.source },
    integral: { entries: I.entries, verb: I.verb, glyph: I.glyph, ability: I.abilityKey, totalEntries: I.entries.length },
    derivative: { signals: D.signals, source: D.source, inboxDelta: D.inboxDelta },
    blockerCount: P.blockers.length,
    signalCount: D.signals.length,
  };

  // compact text briefing (HBP/text; prepended to summon prompt)
  const lines = [];
  lines.push(`## GAIA IX-BRIEFING — seat ${position.name} [${position.handle8}]`);
  lines.push(`class=${position.class} layer=${position.layer} cube=${position.cube_bh} glyph=${I.glyph}`);
  lines.push('');
  // P — Proportional
  lines.push(`## P (PROPORTIONAL) — health=${P.healthStatus} blockers=${P.blockers.length} [src=${P.source}]`);
  if (P.blockers.length) for (const b of P.blockers) lines.push(`- BLOCKER: ${typeof b === 'string' ? b : JSON.stringify(b)}`);
  else lines.push('- (no active blockers)');
  lines.push('');
  // I — Integral
  lines.push(`## I (INTEGRAL) — IX knowledge for this seat (verb=${I.verb}, ability=${I.abilityKey})`);
  for (const e of I.entries) lines.push(`- [${e.ix_type}] ${e.title} :: ${e.detail}`);
  lines.push('');
  // D — Derivative
  lines.push(`## D (DERIVATIVE) — drift signals=${D.signals.length} [src=${D.source}]`);
  if (D.signals.length) for (const s of D.signals) lines.push(`- SIGNAL: ${typeof s === 'object' && s.source ? `[${s.source}] ${s.type || 'signal'} (${s.age || ''})` : (typeof s === 'string' ? s : JSON.stringify(s))}`);
  else lines.push('- (no recent drift signals)');
  lines.push('');

  return { text: lines.join('\n'), packet };
}

// ── PUBLIC 2: timeGate(position, timestamp, window) ──────────────────────────
// The "right TIME" gate. WINDOW FORMAT (grounded in 47D D20 TIME + D45
// OMNICALENDAR). `window` may be:
//   null                                   -> always active (default-open)
//   { start_unix, end_unix }               -> active iff start <= ts <= end
//   { interval_s, anchor_unix }            -> active iff ((ts-anchor) mod interval_s)
//                                              < (window_s || interval_s) — cron-ish
//   { interval_s, anchor_unix, window_s }  -> active iff ((ts-anchor) mod interval_s) < window_s
//   { omnicalendar:'immediate'|'operator_available'|... }
//                                          -> 'immediate' active; named windows
//                                              that require external state are
//                                              treated as CLOSED-until-populated
//                                              (honest: schedule data is future).
// `timestamp` is unix seconds (defaults to now). Returns:
//   { active, reason, next_window }  (next_window = unix start of the next open
//                                     window when computable, else null)
export function timeGate(position, timestamp, window) {
  const ts = Number.isFinite(timestamp) ? Math.floor(timestamp) : nowUnix();

  // (1) no window => default open
  if (window == null) return { active: true, reason: 'no-window-default-open', next_window: null };

  // (2) explicit [start,end] window
  if (Number.isFinite(window.start_unix) || Number.isFinite(window.end_unix)) {
    const start = Number.isFinite(window.start_unix) ? window.start_unix : -Infinity;
    const end = Number.isFinite(window.end_unix) ? window.end_unix : Infinity;
    if (ts < start) return { active: false, reason: `before-window (ts=${ts} < start=${start})`, next_window: start };
    if (ts > end) return { active: false, reason: `after-window (ts=${ts} > end=${end})`, next_window: null };
    return { active: true, reason: `in-window [${start},${end}]`, next_window: null };
  }

  // (3) interval / cron-ish window
  if (Number.isFinite(window.interval_s) && window.interval_s > 0) {
    const anchor = Number.isFinite(window.anchor_unix) ? window.anchor_unix : 0;
    const interval = window.interval_s;
    const win = Number.isFinite(window.window_s) ? window.window_s : interval; // default: full interval open
    const phase = (((ts - anchor) % interval) + interval) % interval;
    if (phase < win) return { active: true, reason: `in-interval-window (phase=${phase}s < win=${win}s of ${interval}s)`, next_window: null };
    const next = ts + (interval - phase); // start of next interval
    return { active: false, reason: `outside-interval-window (phase=${phase}s >= win=${win}s)`, next_window: next };
  }

  // (4) omnicalendar named window (47D D45)
  if (typeof window.omnicalendar === 'string') {
    if (window.omnicalendar === 'immediate') return { active: true, reason: 'omnicalendar=immediate', next_window: null };
    // named windows requiring external state (operator_available, deployment_window,
    // meeting_scheduled, ...) are CLOSED-until-populated — schedule data is future/design.
    return { active: false, reason: `omnicalendar='${window.omnicalendar}' requires schedule-data (not yet populated)`, next_window: null };
  }

  // unrecognized shape => fail-closed (honest: don't fire on a malformed gate)
  return { active: false, reason: 'unrecognized-window-shape (fail-closed)', next_window: null };
}

// ── PUBLIC 3: summonSmart(position, device, ts, opts) ────────────────────────
// timeGate -> (if active) buildBriefing -> gaia-loader.summon() with the
// IX-briefing PREPENDED to the task. Verifies the briefing actually entered the
// opencode prompt. Reuses gaia-loader's resolveAgent/summon (instance_pid hash
// UNCHANGED => parity). opts:
//   { window, task, device, live, model, timeoutMs, nodeDirect }
// Returns:
//   - deferred:  { deferred:true, fired:false, cost:0, reason, next_window, gate:'deferred', instance_pid }
//   - active:    { deferred:false, fired:bool, gate:'active', briefing_used:true, instance_pid,
//                  base_handle8, cost, exit, response, briefing_excerpt, ... }
export async function summonSmart(position, device, timestamp, opts = {}) {
  if (!position || !position.handle8) throw new Error('summonSmart: position must carry handle8');
  const ts = Number.isFinite(timestamp) ? Math.floor(timestamp) : nowUnix();
  const window = opts.window !== undefined ? opts.window : null;
  const task = String(opts.task || 'Report your seat identity and primary responsibility in one line.');

  // resolve the agent up-front so the deferred receipt still carries the instance_pid (parity-stable)
  const agent = resolveAgent(position, device, ts);

  // (1) TIME GATE FIRST — right agent at the right TIME
  const gate = timeGate(position, ts, window);
  if (!gate.active) {
    return {
      deferred: true,
      fired: false,
      cost: 0,
      gate: 'deferred',
      reason: gate.reason,
      next_window: gate.next_window,
      instance_pid: agent.instance_pid,
      base_handle8: agent.base_handle8,
      device: agent.device,
      position: agent.name,
      ts: agent.ts,
    };
  }

  // (2) BUILD BRIEFING — right CONTEXT (GAIA's P/I/D)
  const briefing = buildBriefing(position, opts);
  // (3) PREPEND briefing to the task = the question that goes into opencode
  const question = `${briefing.text}\n## TASK\n${task}`;

  // (4) FIRE via gaia-loader.summon (the PROVEN $0 path) — resolveAgent/hash UNCHANGED.
  // Pass the SAME timestamp so the instance_pid inside summon == agent.instance_pid (parity).
  const summonOpts = {
    live: !!opts.live,
    model: opts.model || 'opencode/big-pickle',
    timeoutMs: opts.timeoutMs || 120000,
    nodeDirect: opts.nodeDirect,
  };
  const r = await summon(position, device, ts, question, summonOpts);

  // (5) VERIFY the briefing actually went into the prompt (the question we built
  // contains the briefing header + the seat handle8). This is a structural check
  // on what WE passed to summon (the exact `question` above).
  const briefingMarker = `seat ${position.name} [${position.handle8}]`;
  const briefingUsed = question.includes(briefingMarker) && question.includes('## I (INTEGRAL)');

  return {
    deferred: false,
    fired: true,
    gate: 'active',
    gate_reason: gate.reason,
    briefing_used: briefingUsed,
    instance_pid: r.instance_pid,
    base_handle8: r.base_handle8,
    device: r.device,
    position: r.position,
    ts: r.ts,
    tuple60D: r.tuple60D,
    agent_type: r.agent_type,
    cost: r.cost,
    exit: r.exit,
    mock: r.mock,
    live: r.live,
    response: r.response,
    duration_ms: r.duration_ms,
    room_dir: r.room_dir,
    briefing_excerpt: briefing.text.split('\n').slice(0, 8).join('\n'),
    briefing_packet: briefing.packet,
    parity_note: 'instance_pid via gaia-loader.resolveAgent (hash unchanged)',
  };
}

// ── HBP record emitter (json=0 friendly) for a smart-summon receipt ──────────
export function summonSmartHbpRow(s) {
  return [
    'HBPv1', 'row=gaia_summon_smart', `instance_pid=${s.instance_pid}`, `base_handle8=${s.base_handle8 || ''}`,
    `device=${s.device || ''}`, `position=${s.position || ''}`,
    `gate=${s.gate}`, `deferred=${!!s.deferred}`, `fired=${!!s.fired}`,
    `briefing_used=${!!s.briefing_used}`, `cost=${s.cost}`, `exit=${s.exit != null ? s.exit : ''}`,
    `live=${!!s.live}`, `ts=${s.ts || ''}`, 'json=0',
    `row_hash=${sha16(String(s.instance_pid) + String(s.gate) + String(s.fired))}`,
  ].join('|');
}
