#!/usr/bin/env node
// gpu-thermal-watch-cli.cjs — descriptor CLI
// PID: AGT-FALCON-DRIFT_DETECT-W25C-GPU-THERMAL-WATCH-2026-05-21
// Usage:
//   node gpu-thermal-watch-cli.cjs status
//   node gpu-thermal-watch-cli.cjs analyze [N]
//   node gpu-thermal-watch-cli.cjs playbook
// READ-ONLY. NO mitigations executed.

'use strict';

const watch = require('../lib/gpu-thermal-watch.cjs');

function cmdStatus() {
  const beats = watch.readRecentTemps(1);
  if (beats.length === 0) {
    console.log('NO_DATA: no heartbeat beats with gpu_lane.temp_c found');
    process.exit(2);
  }
  const b = beats[0];
  const sev = watch.classifyTemp(b.temp_c);
  console.log(`status:`);
  console.log(`  beat_seq    : ${b.beat_seq}`);
  console.log(`  ts          : ${b.ts}`);
  console.log(`  temp_c      : ${b.temp_c}`);
  console.log(`  severity    : ${sev}`);
  console.log(`  thresholds  : WARN>=85 ATTENTION>=90 HOT>=92 CRITICAL>=95 (Tjmax 97, trip 99)`);
}

function cmdAnalyze(n) {
  const N = Number(n) || 20;
  const a = watch.analyzeWindow(N);
  console.log(`analyze (last ${N} beats):`);
  console.log(`  count        : ${a.count}`);
  console.log(`  min          : ${a.min}°C`);
  console.log(`  max          : ${a.max}°C`);
  console.log(`  mean         : ${a.mean}°C`);
  console.log(`  trend        : ${a.trend}`);
  console.log(`  max_severity : ${a.max_severity}`);
  console.log(`  recommendation: ${a.recommendation_text}`);
  console.log(`  proposed_mitigation:`);
  for (const m of watch.proposeMitigation(a.max_severity)) console.log(`    - ${m}`);
}

function cmdPlaybook() {
  console.log('GPU THERMAL WATCH — full mitigation playbook (DESCRIBE-ONLY)');
  console.log('Hardware: GTX 1050 Mobile (Pascal GP107M), TDP 30W');
  console.log(`Thresholds: WARN>=85  ATTENTION>=90  HOT>=92  CRITICAL>=95  Tjmax=${watch.TJMAX}  trip=${watch.TRIP}`);
  console.log('');
  console.log('Steps (operator-witness gated, NONE executed by this CLI):');
  for (const s of watch.proposeMitigation('CRITICAL')) console.log(`  ${s}`);
  console.log('');
  console.log('apex_cosign: OP-JESSE-W25-GPU-THERMAL-WATCH');
}

const cmd = process.argv[2];
const arg = process.argv[3];
if (cmd === 'status') cmdStatus();
else if (cmd === 'analyze') cmdAnalyze(arg);
else if (cmd === 'playbook') cmdPlaybook();
else {
  console.log('usage: gpu-thermal-watch-cli.cjs <status|analyze [N]|playbook>');
  process.exit(1);
}
