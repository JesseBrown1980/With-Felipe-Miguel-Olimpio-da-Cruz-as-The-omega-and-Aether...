// Batch-farm federation infrastructure verbs via /api/tool-advisor/propose-verb
// Router-mode: each verb goes through fabric, not source-edit.
// Target: ~50 obvious infrastructure verbs covering File I/O, Daemon, Memory,
//         Ledger, Atlas, GNN, Hookwall, Dashboard, PID/Wave, Network, Skill/MCP.

const VERBS = [
  // File I/O
  { name: "file-write",        bucket: "GUIDED-EXECUTE",  reason: "write file to disk in staging area (C:/tmp, D:/AsolariaGuides) — scope_aware DEFER for protected paths", scope_aware: true, scope_extension_bucket: "DEFER-TO-APEX" },
  { name: "file-read",         bucket: "GUIDED-EXECUTE",  reason: "read file from disk — read-only evidence lane" },
  { name: "file-edit",         bucket: "GUIDED-EXECUTE",  reason: "edit existing file in staging — scope_aware DEFER for protected paths", scope_aware: true, scope_extension_bucket: "DEFER-TO-APEX" },
  { name: "file-delete",       bucket: "DEFER-TO-APEX",   reason: "file deletion irreversible — operator-witness required" },
  // Daemon lifecycle
  { name: "daemon-start",      bucket: "DEFER-TO-APEX",   reason: "daemon start affects shared state — operator-witness required per AGENT.md section 7" },
  { name: "daemon-stop",       bucket: "DEFER-TO-APEX",   reason: "daemon stop interrupts federation services — operator-witness required" },
  { name: "daemon-restart",    bucket: "DEFER-TO-APEX",   reason: "daemon restart = Stop+Start, affects shared state — operator-witness required" },
  { name: "daemon-status",     bucket: "GUIDED-EXECUTE",  reason: "daemon status read-only via /health endpoint or netstat" },
  // Memory ops
  { name: "memory-read",       bucket: "GUIDED-EXECUTE",  reason: "read memory file from auto-memory system (~/.claude/projects/.../memory/*.md)" },
  { name: "memory-write",      bucket: "DEFER-TO-APEX",   reason: "memory writes persist across sessions — operator-witness required (per auto-memory canon)" },
  { name: "memory-update",     bucket: "DEFER-TO-APEX",   reason: "memory updates persist across sessions — operator-witness required" },
  { name: "memory-delete",     bucket: "HARD-DENY",       reason: "memory deletion is loss of session-spanning context — operator must do directly" },
  // Ledger ops
  { name: "ledger-read",       bucket: "GUIDED-EXECUTE",  reason: "read .hbp ledger file — append-only invariant means reads are safe" },
  { name: "receipt-emit",      bucket: "GUIDED-EXECUTE",  reason: "emit receipt envelope to receipts/store — append-only doctrine" },
  { name: "cosign-attest",     bucket: "DEFER-TO-APEX",   reason: "cosign-chain attestation requires apex quintuple-cosign — operator + cosigners required" },
  // Atlas/canon
  { name: "atlas-query",       bucket: "GUIDED-EXECUTE",  reason: "atlas codepoint lookup is read-only canon" },
  { name: "atlas-mint-cp",     bucket: "DEFER-TO-APEX",   reason: "cp mint requires apex quintuple-cosign (synonym of mint-cp for atlas-scoped naming)", scope_aware: true, scope_extension_bucket: "ACER-SOVEREIGN" },
  { name: "canon-index-add",   bucket: "DEFER-TO-APEX",   reason: "canon index additions need cosign — quintuple ceremony" },
  { name: "canon-publish",     bucket: "DEFER-TO-APEX",   reason: "canon publish to bilateral/federation — operator-witness required" },
  // GNN ops
  { name: "gnn-edge-add",      bucket: "GUIDED-EXECUTE",  reason: "append edge to gnn-edges-autopilot.ndjson — append-only doctrine, hookwall picks up" },
  { name: "gnn-query",         bucket: "GUIDED-EXECUTE",  reason: "GNN topN query via /api/gnn/topN endpoint — read-only" },
  { name: "gnn-pull",          bucket: "GUIDED-EXECUTE",  reason: "GNN graph pull for visualization — read-only" },
  { name: "gnn-train-step",    bucket: "GUIDED-EXECUTE",  reason: "GNN training step on EdgeLevelGCN — descriptor-only, append loss row to training ledger" },
  // Hookwall
  { name: "hook-register",     bucket: "GUIDED-EXECUTE",  reason: "register hook entry in hookwall — TIER_2_EVENTS or below" },
  { name: "hook-fire",         bucket: "GUIDED-EXECUTE",  reason: "fire hookwall event — append-only event ledger" },
  { name: "hook-trace",        bucket: "GUIDED-EXECUTE",  reason: "read hookwall trace ledger — read-only" },
  // Dashboard/voxel
  { name: "voxel-emit",        bucket: "GUIDED-EXECUTE",  reason: "emit voxel to 3D map merged dir — append-only artifact" },
  { name: "policy-event-post", bucket: "GUIDED-EXECUTE",  reason: "POST to /api/voxels/policy-events — surfaces in dashboard, append-only" },
  { name: "viz-render",        bucket: "GUIDED-EXECUTE",  reason: "render visualization in /viz route — read-only computation" },
  // PID/wave
  { name: "pid-mint",          bucket: "DEFER-TO-APEX",   reason: "PID mint requires brown-hilbert coord allocation — apex-quintuple-cosign for cps; scope-extension allows operator-witness", scope_aware: true, scope_extension_bucket: "ACER-SOVEREIGN" },
  { name: "room-allocate",     bucket: "GUIDED-EXECUTE",  reason: "room allocation in 10000-room space — append-only, brown-hilbert curve" },
  { name: "brown-hilbert-coord", bucket: "GUIDED-EXECUTE", reason: "compute brown-hilbert H-coord for room — pure compute, no state mutation" },
  { name: "wave-start",        bucket: "GUIDED-EXECUTE",  reason: "start wave envelope to omnischeduler — append wave row" },
  { name: "wave-close",        bucket: "GUIDED-EXECUTE",  reason: "close wave by appending closure row to omnischeduler" },
  { name: "wave-cascade",      bucket: "GUIDED-EXECUTE",  reason: "cascade wave across cohorts — emit descriptor rows, no direct execution" },
  // Network/bilateral
  { name: "bilateral-mirror",  bucket: "GUIDED-EXECUTE",  reason: "mirror canonical artifact to peer vantage via SMB or copy — append-only doctrine" },
  { name: "bilateral-fetch",   bucket: "GUIDED-EXECUTE",  reason: "fetch peer artifact for read-only inspection — verify sha" },
  { name: "peer-probe",        bucket: "GUIDED-EXECUTE",  reason: "probe peer sister-organ health — read-only HTTP GET" },
  { name: "peer-handshake",    bucket: "GUIDED-EXECUTE",  reason: "peer handshake via /api/sister-organ — exchange capability fingerprints" },
  { name: "envelope-emit",     bucket: "GUIDED-EXECUTE",  reason: "emit envelope to bus :4947 t-task room — addressed to canonical_tool supervisor" },
  { name: "bus-publish",       bucket: "GUIDED-EXECUTE",  reason: "publish to bus :4947 — multi-room broadcast" },
  { name: "bus-subscribe",     bucket: "GUIDED-EXECUTE",  reason: "subscribe to bus room — read-only consumer" },
  { name: "http-get",          bucket: "GUIDED-EXECUTE",  reason: "HTTP GET to known endpoint — read-only, scope_aware for unknown origins", scope_aware: true, scope_extension_bucket: "DEFER-TO-APEX" },
  { name: "http-post",         bucket: "DEFER-TO-APEX",   reason: "HTTP POST mutates remote state — scope-extension for known internal endpoints", scope_aware: true, scope_extension_bucket: "GUIDED-EXECUTE" },
  // Skill/MCP/shell
  { name: "skill-execute",     bucket: "DEFER-TO-APEX",   reason: "skill execution = intercept_class hook fire — operator-witness for non-advisory skills" },
  { name: "mcp-call",          bucket: "DEFER-TO-APEX",   reason: "MCP server call may mutate external state — operator-witness for non-readonly", scope_aware: true, scope_extension_bucket: "GUIDED-EXECUTE" },
  { name: "mcp-list-tools",    bucket: "GUIDED-EXECUTE",  reason: "list available MCP tools — read-only enumeration" },
  { name: "shell-exec",        bucket: "HARD-DENY",       reason: "arbitrary shell execution bypasses gate matrix — operator must invoke directly" },
  { name: "screenshot",        bucket: "DEFER-TO-APEX",   reason: "screenshot captures private surface — operator-witness required per private_surface_export gate" },
  { name: "browser-control",   bucket: "DEFER-TO-APEX",   reason: "browser automation can publish content — operator-witness required" },
  { name: "keyboard-control",  bucket: "DEFER-TO-APEX",   reason: "keyboard input simulation — operator-witness per omni-control discipline" },
];

const ENDPOINT = "http://127.0.0.1:4949/api/tool-advisor/propose-verb";

async function propose(v) {
  const body = JSON.stringify({
    name: v.name,
    bucket: v.bucket,
    reason: v.reason,
    scope_aware: v.scope_aware ? 1 : 0,
    scope_extension_bucket: v.scope_extension_bucket || null,
    canonical_tool: v.canonical_tool || null,
    substitute_hint: v.substitute_hint || null,
    agent_pid: "AGT-FORGE-VERB-FARM-BATCH-1-H8072-W113",
    from_vantage: "acer",
  });
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return { name: v.name, status: r.status, body: await r.json() };
}

const results = [];
for (const v of VERBS) {
  try {
    const r = await propose(v);
    results.push(r);
    console.log(`${r.status === 200 ? "OK" : "ER"} ${r.name.padEnd(28)} ${r.body.row_hash || r.body.reason || ""}`);
  } catch (e) {
    results.push({ name: v.name, status: "ERR", error: String(e) });
    console.log("ER", v.name, String(e));
  }
}

const ok = results.filter(r => r.status === 200).length;
const skip = results.filter(r => r.status === 409).length;
const err = results.length - ok - skip;
console.log("---");
console.log(`total proposed: ${VERBS.length}`);
console.log(`landed: ${ok}, conflicts(skipped): ${skip}, errors: ${err}`);
