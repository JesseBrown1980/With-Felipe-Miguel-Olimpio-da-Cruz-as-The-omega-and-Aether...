#!/usr/bin/env node
// IX executor | PID: asolaria | Profile: asolaria | IX-484 Phase 0
// Gate chain: hookwall → gnn → shannon → execute
// Usage: node ix/exec.js <name> [arg]
const registry = require('./index');
const hookwall = require('./gates/hookwall');
const gnnGate = require('./gates/gnn');
const shannonGate = require('./gates/shannon');

const name = process.argv[2];
const arg = process.argv[3];
const envelope = { pid: "asolaria-cli", permissionTier: "operator", host: require("os").hostname() };

if (!name || name === '--help') {
  console.log('IX runtime — available:', Object.keys(registry).join(', '));
  process.exit(0);
}
const mod = registry[name];
if (!mod) { console.error(`IX: unknown "${name}"`); process.exit(1); }

(async () => {
  // Gate 1: hookwall (Dan's 6 hooks — fail-closed)
  const hw = await hookwall(name, typeof arg === 'string' ? { command: arg, target: arg } : {}, envelope);
  if (!hw.allow) { console.log(JSON.stringify({ ok: false, blocked: hw.gate, reason: hw.reason })); process.exit(1); }

  // Gate 2: gnn (edge scoring — records + learns)
  const gnn = await gnnGate(name, { target: arg }, { ...envelope, risk: hw.risk });
  if (!gnn.allow) { console.log(JSON.stringify({ ok: false, blocked: "gnn", reason: gnn.reason })); process.exit(1); }

  // Gate 3: shannon (pen test — falls closed on high risk)
  const sh = await shannonGate(name, { target: arg }, { ...envelope, risk: gnn.risk, gnnResult: gnn });
  if (!sh.allow) { console.log(JSON.stringify({ ok: false, blocked: "shannon", reason: sh.reason })); process.exit(1); }

  // All gates passed — execute
  const result = await mod(arg);
  hookwall.postExec(name, result, envelope);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
})().catch(e => { console.error(`IX: ${name} threw:`, e.message); process.exit(1); });
