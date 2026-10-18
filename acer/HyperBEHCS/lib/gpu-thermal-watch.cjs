// gpu-thermal-watch.cjs — HyperBEHCS GPU thermal watch descriptor
// PID: AGT-FALCON-DRIFT_DETECT-W25C-GPU-THERMAL-WATCH-2026-05-21
// Apex cosign: OP-JESSE-W25-GPU-THERMAL-WATCH
//
// READ-ONLY on system-heartbeat.ndjson. Pure descriptor.
// NO daemon mutation. NO GPU mutation. NO fan/power/BIOS changes.
// applyMitigation() throws NotImplementedError — operator-witness only.

'use strict';

const fs = require('fs');
const path = require('path');

const STORE_DIR = 'C:/HyperBEHCS/store';
const HB_NDJSON = path.join(STORE_DIR, 'system-heartbeat.ndjson');

// Pascal GP107M GTX 1050 Mobile thermal thresholds
const THRESHOLDS = {
  NORMAL: 0,        // < 85
  WARN: 85,         // 85-89
  ATTENTION: 90,    // 90-91
  HOT: 92,          // 92-94
  CRITICAL: 95      // >= 95 (throttle floor)
};
const TJMAX = 97;
const TRIP = 99;

class NotImplementedError extends Error {
  constructor(msg) { super(msg); this.name = 'NotImplementedError'; }
}

function readRecentTemps(n = 20) {
  if (!fs.existsSync(HB_NDJSON)) return [];
  // Tail-style read: load full file (modest size), split, take last N parseable beats with gpu_lane.temp_c
  const raw = fs.readFileSync(HB_NDJSON, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const out = [];
  for (let i = lines.length - 1; i >= 0 && out.length < n; i--) {
    try {
      const beat = JSON.parse(lines[i]);
      const t = beat && beat.gpu_lane && typeof beat.gpu_lane.temp_c === 'number' ? beat.gpu_lane.temp_c : null;
      if (t !== null) {
        out.unshift({ ts: beat.ts_iso, temp_c: t, beat_seq: beat.beat_seq });
      }
    } catch (_) { /* skip malformed */ }
  }
  return out;
}

function classifyTemp(temp_c) {
  if (typeof temp_c !== 'number' || !Number.isFinite(temp_c)) return 'UNKNOWN';
  if (temp_c >= THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (temp_c >= THRESHOLDS.HOT) return 'HOT';
  if (temp_c >= THRESHOLDS.ATTENTION) return 'ATTENTION';
  if (temp_c >= THRESHOLDS.WARN) return 'WARN';
  return 'NORMAL';
}

const SEVERITY_RANK = { NORMAL: 0, WARN: 1, ATTENTION: 2, HOT: 3, CRITICAL: 4, UNKNOWN: -1 };

function analyzeWindow(n = 20) {
  const temps = readRecentTemps(n);
  if (temps.length === 0) {
    return { count: 0, min: null, max: null, mean: null, trend: 'no-data', max_severity: 'UNKNOWN', recommendation_text: 'No heartbeat data available.' };
  }
  const vals = temps.map(t => t.temp_c);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const mean = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
  // Trend: compare first quartile mean to last quartile mean
  const q = Math.max(1, Math.floor(vals.length / 4));
  const head = vals.slice(0, q).reduce((a, b) => a + b, 0) / q;
  const tail = vals.slice(-q).reduce((a, b) => a + b, 0) / q;
  const delta = tail - head;
  let trend = 'flat';
  if (delta >= 2) trend = 'rising';
  else if (delta <= -2) trend = 'falling';
  // Max severity in window
  let max_sev = 'NORMAL';
  for (const v of vals) {
    const s = classifyTemp(v);
    if (SEVERITY_RANK[s] > SEVERITY_RANK[max_sev]) max_sev = s;
  }
  const recommendation_text = recommendationFor(max_sev, trend, max);
  return { count: vals.length, min, max, mean, trend, max_severity: max_sev, recommendation_text };
}

function recommendationFor(severity, trend, max_temp) {
  const lines = [];
  lines.push(`Window max ${max_temp}°C — ${severity}, trend ${trend}.`);
  if (severity === 'NORMAL') lines.push('No action. Continue normal heartbeat cadence.');
  else if (severity === 'WARN') lines.push('Informational only. Monitor next 10 beats.');
  else if (severity === 'ATTENTION') lines.push('Operator-review: consider playbook step (a) — increase heartbeat interval 10s→30s.');
  else if (severity === 'HOT') lines.push('Operator-witness recommended: steps (a)+(b)+(e). Defer new /gpu/dispatch until cooler.');
  else if (severity === 'CRITICAL') lines.push('OPERATOR IMMEDIATE: throttle imminent. Stop compute lanes, physical inspection (c)+(d).');
  if (trend === 'rising' && severity !== 'NORMAL') lines.push('Trend is rising — escalation likely within next window.');
  return lines.join(' ');
}

function proposeMitigation(severity) {
  const all = [
    '(a) Software: increase heartbeat interval 10s → 30s (daemon-config, ~3× fewer nvidia-smi spawns)',
    '(b) Software: skip GPU probe on alternate heartbeats (~6× fewer probes vs current)',
    '(c) Hardware: physical fan clean — compressed air blast (operator-keyboard)',
    '(d) BIOS: confirm fan curve = Performance/Max (operator-keyboard, BIOS UI)',
    '(e) Daemon: gate /gpu/dispatch acceptance if temp > 92°C (NOT YET IMPLEMENTED, W26 work)'
  ];
  switch (severity) {
    case 'NORMAL': return [];
    case 'WARN':   return [all[0]];
    case 'ATTENTION': return [all[0], all[1]];
    case 'HOT': return [all[0], all[1], all[4]];
    case 'CRITICAL': return all;
    default: return [];
  }
}

function applyMitigation(step, operator_witness_token) {
  throw new NotImplementedError(
    'applyMitigation is descriptor-only. Mitigations require operator-witness execution; ' +
    'this module does NOT mutate daemon, GPU, fan, power, or BIOS state.'
  );
}

module.exports = {
  readRecentTemps,
  classifyTemp,
  analyzeWindow,
  proposeMitigation,
  applyMitigation,
  THRESHOLDS,
  TJMAX,
  TRIP,
  NotImplementedError
};

// ---- selftest ----
if (require.main === module) {
  console.log('=== gpu-thermal-watch selftest ===');
  const beats = readRecentTemps(20);
  console.log(`Read ${beats.length} recent beats with gpu_lane.temp_c`);
  if (beats.length > 0) {
    const latest = beats[beats.length - 1];
    console.log(`Latest: beat_seq=${latest.beat_seq} ts=${latest.ts} temp=${latest.temp_c}°C class=${classifyTemp(latest.temp_c)}`);
  }
  const analysis = analyzeWindow(20);
  console.log('Analysis:', JSON.stringify(analysis, null, 2));
  console.log('Proposed mitigation for max_severity:', proposeMitigation(analysis.max_severity));
  try {
    applyMitigation('(a)', 'fake-token');
  } catch (e) {
    console.log(`applyMitigation gate works: ${e.name}: ${e.message}`);
  }
  console.log('=== selftest complete ===');
}
