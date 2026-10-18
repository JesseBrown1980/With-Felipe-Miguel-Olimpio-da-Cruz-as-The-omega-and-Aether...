// PID: asolaria | profile: asolaria | IX-484 Phase 1
// Generative verb factory — reads verb-table, produces gated executors
const path = require("path");
const hookwall = require("../gates/hookwall");
const gnnGate = require("../gates/gnn");
const shannonGate = require("../gates/shannon");

let table = null;
function loadTable() {
  if (!table) table = require("./verb-table.json");
  return table;
}

function getVerb(name) {
  const t = loadTable();
  return t.verbs.find(v => v.name === name) || null;
}

function createExecutor(verbDef, executeFn) {
  return async function gatedExecutor(args, envelope = {}) {
    const env = { ...envelope, permissionTier: envelope.permissionTier || verbDef.permission };
    // Gate chain: hookwall → gnn → shannon → execute
    const hw = await hookwall(verbDef.name, args, env);
    if (!hw.allow) return { ok: false, blocked: hw.gate, reason: hw.reason };
    const gnn = await gnnGate(verbDef.name, args, { ...env, risk: hw.risk });
    if (!gnn.allow) return { ok: false, blocked: "gnn", reason: gnn.reason };
    const sh = await shannonGate(verbDef.name, args, { ...env, risk: gnn.risk });
    if (!sh.allow) return { ok: false, blocked: "shannon", reason: sh.reason };
    // Execute
    const result = await executeFn(args, env);
    hookwall.postExec(verbDef.name, result, env);
    return result;
  };
}

function listVerbs() { return loadTable().verbs.map(v => ({ name: v.name, category: v.category, risk: v.risk, permission: v.permission })); }

module.exports = { getVerb, createExecutor, listVerbs, loadTable };
