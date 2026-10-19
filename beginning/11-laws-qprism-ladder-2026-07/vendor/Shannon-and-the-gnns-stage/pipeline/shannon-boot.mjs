// shannon-boot.mjs — Shannon-gate boot fixture (Cohort-R Phase R1)
// AGT-M11-SHANNON-GATE-BOOT-PID-2026-05-19  ·  supervisor=nereus cp=76
//
// LINEAGE HEADER (Dan-Hooks-derived ancestry):
//   ROOT           DAN-HOOKS-LINEAGE-CANON-PID-2026-05-19 (data/dan-hooks-lineage/lineage.hbp seq=1)
//     └── HOOKWALL src/hookwall/{dispatch,event-router,gnn-feeder,promotion-bridge,
//                                cubes-indexer,tier-classifier,dan-hooks-approval-guard}.mjs
//                  └── DAN-HOOKS-APPROVAL-GUARD (gate-prepend pattern)
//                       └── SHANNON-EXECUTION-GATE (packages-legacy-import/src/shannonExecutionGate.js)
//                            └── THIS FIXTURE (bootShannon + checkShannonGate)
//
// CANON SOURCES (read by Explore subs M11-S1..S5):
//   S1: C:/asolaria-acer/packages-legacy-import/src/shannonExecutionGate.js
//   S2: C:/asolaria-acer/packages-legacy-import/src/shannonPacketBuilder.js
//   S3: C:/asolaria-acer/packages-legacy-import/src/shannonApprovalBridge.js
//   S4: C:/asolaria-acer/packages/dashboard/src/super-os-viz/runtime/agent-terminal-fabric/profiles/shannon.profile.json
//   S5: project_shannon_civilization_canon_acer_host_keys_2026_05_12.md  (LX-328/329/331/332/333)
//
// CONSTRAINTS: real-free class · append-only · describe_only · no API spend
// AUTHORITY:   quintuple cosign (OP-JESSE+OP-RAYSSA+Amy+Dan+Felipe) delegated to fabric,
//              window 2026-05-07 .. 200-step-plan complete; Shannon profile rotated 2026-05-10 (P00→P01).

import { readFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { EventEmitter } from 'node:events';

// ---- canonical paths (acer-vantage) ----
const SHANNON_PROFILE_PATH = 'C:/asolaria-acer/packages/dashboard/src/super-os-viz/runtime/agent-terminal-fabric/profiles/shannon.profile.json';
const SHANNON_PID_CANON   = 'AGT-SHANNON-PID-HD16C-A04-W1024-P01-N00001';
const RULE_ANCHORS        = ['LX-328', 'LX-329', 'LX-331', 'LX-332', 'LX-333'];

// ---- in-process bus (subscribed to 'shannon:gate:check') ----
export const shannonBus = new EventEmitter();
let registeredProfile = null;

// ---- 1. bootShannon — load profile, register gate, subscribe to bus ----
export function bootShannon({ profile = SHANNON_PROFILE_PATH } = {}) {
  const path = resolve(profile);
  if (!existsSync(path)) {
    return { ok: false, reason: `profile_not_found:${path}` };
  }
  let doc;
  try { doc = JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { return { ok: false, reason: `profile_parse_error:${e.message}` }; }

  if (doc.agent_pid_current !== SHANNON_PID_CANON) {
    return { ok: false, reason: `pid_mismatch:${doc.agent_pid_current}!=${SHANNON_PID_CANON}` };
  }
  registeredProfile = {
    role: doc.role,
    supervisor_pid: doc.supervisor_pid,
    prof_pid: doc.prof_pid,
    agent_pid: doc.agent_pid_current,
    brown_hilbert_hash: doc.resume_packet?.last_rotation?.brown_hilbert_hash || 'H421B85FD07C14FB4',
    ruleAnchors: RULE_ANCHORS,
    loadedAt: new Date().toISOString()
  };
  // bus wiring: re-emit verdicts back under 'shannon:gate:verdict'
  shannonBus.on('shannon:gate:check', (req) => {
    const verdict = checkShannonGate(req?.action, req?.tier, req?.approval);
    shannonBus.emit('shannon:gate:verdict', { req, verdict });
  });
  return { ok: true, profile: registeredProfile, ruleAnchors: RULE_ANCHORS };
}

// ---- 2. checkShannonGate — LX-328/329/331/332/333 mini-evaluator ----
// Mirrors shannonExecutionGate.evaluateExecution() decision shape.
export function checkShannonGate(action, tier = 1, approval = {}) {
  if (!registeredProfile) return { granted: false, reason: 'gate_not_booted', ruleAnchors: [] };
  if (!action) return { granted: false, reason: 'action_required', ruleAnchors: ['LX-328'] };

  // LX-328 baseline: any booted action with tier<=1 is dry-run-ready (no approval needed)
  if (tier <= 1) {
    return { granted: true, status: 'dry_run_ready', approvalState: 'dry_run_only',
             reason: '', ruleAnchors: ['LX-328'] };
  }

  // LX-329 mode check: tier-2+ requires mode=approved_run
  if (approval.mode !== 'approved_run') {
    return { granted: false, status: 'blocked', approvalState: 'leader_required',
             reason: 'mode_not_approved_run', ruleAnchors: ['LX-329'] };
  }
  // LX-331 explicit approval
  if (!approval.explicitApproval) {
    return { granted: false, status: 'blocked', approvalState: 'leader_required',
             reason: 'execution_approval_required', ruleAnchors: ['LX-331'] };
  }
  // LX-332 authority mode must be asolaria_primary
  if (approval.authorityMode !== 'asolaria_primary') {
    return { granted: false, status: 'blocked', approvalState: 'leader_required',
             reason: 'authority_mode_not_asolaria_primary', ruleAnchors: ['LX-332'] };
  }
  // LX-333 approval-by + approval-ref must be present
  if (!approval.approvedBy || !approval.approvalRef) {
    return { granted: false, status: 'blocked', approvalState: 'leader_required',
             reason: 'execution_approval_reference_required', ruleAnchors: ['LX-333'] };
  }
  return { granted: true, status: 'approved_ready', approvalState: 'leader_approved',
           reason: '', ruleAnchors: RULE_ANCHORS };
}

// ---- 3. selfTest — exercises LX-328 baseline + tier-2 happy path ----
export function selfTest() {
  const results = [];
  const boot = bootShannon({});
  results.push({ name: 'boot', ok: boot.ok === true, detail: boot.profile?.agent_pid || boot.reason });

  // LX-328 baseline: tier-1 dry-run with no approval
  const t1 = checkShannonGate('shannon:status', 1);
  results.push({ name: 'LX-328-baseline', ok: t1.granted === true && t1.status === 'dry_run_ready', detail: t1.reason || t1.status });

  // tier-2 happy path with full approval bundle
  const happyApproval = {
    mode: 'approved_run',
    explicitApproval: true,
    authorityMode: 'asolaria_primary',
    approvedBy: 'OP-JESSE-BROWN+OP-RAYSSA-CHIQUETO',
    approvalRef: 'ASOLARIA-FEDERATION-REMAKE-1024-PID-2026-05-11'
  };
  const t2 = checkShannonGate('usb_raw_io.write', 2, happyApproval);
  results.push({ name: 'tier-2-happy', ok: t2.granted === true && t2.status === 'approved_ready', detail: t2.reason || t2.status });

  // tier-2 blocked: missing approvalRef
  const blocked = checkShannonGate('usb_raw_io.write', 2, { ...happyApproval, approvalRef: '' });
  results.push({ name: 'LX-333-blocked', ok: blocked.granted === false && blocked.reason === 'execution_approval_reference_required', detail: blocked.reason });

  const allGreen = results.every((r) => r.ok);
  return { allGreen, results };
}

// ---- 4. HBPv1 emit helper (append-only, multi-cosign chain head) ----
export function emitFixtureRestored({
  hbpPath = 'C:/asolaria-acer/packages/revolver-10k/data/fixtures/shannon-r1-boot.hbp',
  anchor  = 'FIXTURE-RESTORED-SHANNON-R1-PID-2026-05-19',
  prevHash = 'seq190-multitrack-rollup'
} = {}) {
  const row = [
    'HBPv1',
    'layer=fixture-restoration',
    `pid=${anchor}`,
    'prof=shannon-gate-boot-fixture',
    'supervisor=nereus-cp76',
    'tuple=fixture:shannon:gate:boot',
    'triple_quant=unspecified',
    'polar_quant=unspecified',
    'js_quant=unspecified',
    'turbo_quant=unspecified',
    'json=0', 'runtime=0', 'promote=1', 'status=FIXTURE_RESTORED',
    `antecedents=DAN-HOOKS-LINEAGE-CANON-PID-2026-05-19,${SHANNON_PID_CANON},LX-328,LX-329,LX-331,LX-332,LX-333,seq191-shannon-r1-boot`,
    'chain_id=COHORT-R-FIXTURE-RESTORATION',
    'sequence=191',
    `prev_hash=${prevHash}`,
    'cohort=R', 'phase=R1', 'fixture_class=real-free', 'describe_only=1',
    'cosign=OP-JESSE+OP-RAYSSA+AMY+DAN+FELIPE',
    'rule_anchors=LX-328|LX-329|LX-331|LX-332|LX-333',
    'endpoint=0','provider=0','mcp=0','usb_write=0','device_write=0','dispatch=0','route=0','shell=0','terminal=0',
    'file_write=1','memory_write=0','tool_execute=0','skill_execute=0','mcp_execute=0','webmcp_execute=0',
    'provider_call=0','endpoint_open=0','browser_control=0','keyboard_control=0','screenshot_capture=0',
    'network_call=0','webhook_open=0','cron_create=0','device_read=0','usb_read=0',
    'private_surface_export=0','hidden_surface_export=0','restricted_surface_export=0','secret_surface_export=0',
    'repo_publish=0','package_release=0'
  ];
  const body = row.join('|');
  const row_hash = createHash('sha256').update(body).digest('hex');
  const final = `${body}|row_hash=${row_hash}\n`;
  mkdirSync(dirname(hbpPath), { recursive: true });
  appendFileSync(hbpPath, final, 'utf8');
  return { ok: true, hbpPath, row_hash, anchor, sequence: 191, status: 'FIXTURE_RESTORED' };
}

// ---- entry shim (importable + runnable) ----
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  const r = selfTest();
  const emit = r.allGreen ? emitFixtureRestored({}) : { ok: false, reason: 'selftest_failed' };
  console.log(JSON.stringify({ selfTest: r, emit }, null, 2));
  process.exit(r.allGreen && emit.ok ? 0 : 1);
}
