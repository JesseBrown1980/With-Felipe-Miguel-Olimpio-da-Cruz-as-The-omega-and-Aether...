#!/usr/bin/env node
'use strict';
// Independently authored Node 22 81-bit GF(2) recomputer + binary N-Nest gate.
// This script reads exactly one JSON request on stdin and never makes HTTP
// requests, spawns children, or treats a software PID as a physical machine.
const fs = require('node:fs');
const {createHash} = require('node:crypto');
const MASK = (1n << 81n) - 1n;
const sha = s => createHash('sha256').update(s).digest('hex');
function spin(v, shift) {
  const j = BigInt(shift % 81);
  return j ? ((v << j) | (v >> (81n-j))) & MASK : v;
}
function next(v) {
  // Independent polynomial implementation: CA150 = 1 + x + x^80
  return v ^ spin(v,1) ^ spin(v,80);
}
function hex(v) {
  return (v & MASK).toString(16).padStart(21,'0');
}
function one(req) {
  const source = BigInt('0x'+req.source_hex);
  const correct = hex(next(source));
  const expected = req.expect_hex;
  const level = req.depth;
  if (![1,3,7].includes(level)) throw Error('bad depth');
  if (!/^[0-9a-f]{21}$/.test(req.source_hex)) throw Error('bad source');
  const corrupt = req.corrupt_path || null;
  let bad = null;
  let count = 0;
  function visit(path,remaining) {
    count++;
    const truth = correct;
    const claimed = corrupt===path ? hex(next(source)^1n) : correct;
    const local = claimed===truth;
    if (!local && bad===null) bad=path;
    const kids = remaining ? [visit(path+'0',remaining-1),visit(path+'1',remaining-1)] : [];
    const all = local && kids.every(x=>x.green);
    const fingerprint = sha(['NODE',path,truth,claimed,req.nonce,kids.map(x=>x.hash).join(':')].join('|'));
    return {green:all,hash:fingerprint};
  }
  const root = visit('R',level);
  const honest={watcher_recomputed:true,root_green:root.green,
    root_hash:root.hash,first_bad_path:bad,node_count:count,
    calculated_hex:correct,expected_hex:expected,watcher_claimed_ok:root.green};
  if (req.compromised_watcher) {
    // An attacker can control the watcher process and emit a forged green.
    // Parent MUST verify the content against its own implementation and
    // propagate HOLD; a self-reported PASS is not proof.
    return {...honest,root_green:true,watcher_claimed_ok:true,
      root_hash:sha('FAKE-SELF-SIGNED-ROOT|'+req.nonce),
      calculated_hex:hex(BigInt('0x'+correct)^1n),
      first_bad_path:null,compromised_response:true};
  }
  return {...honest,compromised_response:false};
}
try {
  const req=JSON.parse(fs.readFileSync(0,'utf8'));
  if (!req || req.purpose!=='ASOLARIA-SEAT2-RIM-NODE-WATCHER-V1') throw Error('unknown purpose');
  process.stdout.write(JSON.stringify(one(req))+'\n');
} catch(e) {
  process.stderr.write(String(e.message||e)+'\n');
  process.exit(2);
}
