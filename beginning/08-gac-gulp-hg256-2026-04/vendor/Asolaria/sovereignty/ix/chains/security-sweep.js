// IX chain: security-sweep | PID: asolaria | Profile: asolaria
// Full security chain: hookwall → GNN → Shannon → report
// Maps to IX-491 7-layer immune system: L0-L6
// Reference: IX-506, IX-491, IX-513

const hookwall = require('../gates/hookwall');
const gnnGate = require('../gates/gnn');
const shannonGate = require('../gates/shannon');
const shannonVerb = require('../verbs/shannon');

/**
 * security-sweep chain
 *
 * Runs all 3 gates + Shannon audit into one executable sweep.
 * Returns combined risk assessment with per-gate results.
 *
 * IX-491 immune layer mapping:
 *   L0 Reflex     → hookwall pre_tool_guard (block known-bad immediately)
 *   L1 Pattern    → hookwall syntax_checker + safety_net (verb exists + risk score)
 *   L2 Context    → hookwall approval_guard (permission tier enforcement)
 *   L3 History    → GNN graph runtime (learned patterns from 2M+ events)
 *   L4 Prediction → GNN score inference (spatial/temporal/compositional)
 *   L5 Coordination → Shannon scan (multi-agent security coordination)
 *   L6 Shannon    → Shannon audit (full pentest: pre-recon → exploit-check → report)
 */
async function securitySweep(verb, args, envelope) {
  const ts = new Date().toISOString();
  const pid = envelope?.pid || 'unknown';
  const results = { hookwall: null, gnn: null, shannon: null };
  let blocked = false;
  let blockGate = null;
  let blockReason = null;
  let maxRisk = 0;
  const allFlags = [];

  // --- Gate 1: Hookwall (L0 Reflex + L1 Pattern + L2 Context) ---
  try {
    const hwResult = await hookwall(verb, args, envelope);
    results.hookwall = { ok: hwResult.allow !== false, ...hwResult };
    if (hwResult.allow === false) {
      blocked = true;
      blockGate = 'hookwall';
      blockReason = hwResult.reason || 'hookwall blocked';
    }
    if (hwResult.risk) maxRisk = Math.max(maxRisk, hwResult.risk);
  } catch (err) {
    results.hookwall = { ok: false, error: err.message, degraded: true };
    // Hookwall failure = fail-closed always
    blocked = true;
    blockGate = 'hookwall';
    blockReason = `hookwall error: ${err.message}`;
  }

  if (blocked) {
    return sweepResult({ verb, pid, ts, results, blocked, blockGate, blockReason, maxRisk, flags: allFlags });
  }

  // --- Gate 2: GNN (L3 History + L4 Prediction) ---
  try {
    const gnnResult = await gnnGate(verb, args, envelope);
    results.gnn = { ok: gnnResult.allow !== false, ...gnnResult };
    const gnnRisk = gnnResult.score || gnnResult.risk || 0;
    maxRisk = Math.max(maxRisk, gnnRisk);
    if (gnnResult.allow === false) {
      blocked = true;
      blockGate = 'gnn';
      blockReason = gnnResult.reason || 'GNN blocked';
    }
    // Pass GNN result into envelope for Shannon
    envelope = { ...envelope, gnnResult: { score: gnnRisk, level: gnnResult.level || 'unknown' } };
  } catch (err) {
    results.gnn = { ok: true, error: err.message, degraded: true };
    // GNN failure = degrade, don't block (matches gnn.js fallback pattern)
  }

  if (blocked) {
    return sweepResult({ verb, pid, ts, results, blocked, blockGate, blockReason, maxRisk, flags: allFlags });
  }

  // --- Gate 3: Shannon (L5 Coordination + L6 Shannon) ---
  try {
    // Use the full audit for a sweep, not just scan
    const shannonResult = await shannonVerb.audit(verb, args, envelope);
    results.shannon = shannonResult;
    maxRisk = Math.max(maxRisk, shannonResult.risk || 0);
    if (shannonResult.flags) allFlags.push(...shannonResult.flags);
    if (shannonResult.blocked) {
      blocked = true;
      blockGate = 'shannon';
      blockReason = shannonResult.reason || 'Shannon blocked';
    }
  } catch (err) {
    results.shannon = { ok: true, error: err.message, degraded: true };
    // Shannon failure: fail-closed if risk >= 5
    if (maxRisk >= 5) {
      blocked = true;
      blockGate = 'shannon';
      blockReason = `Shannon unreachable, fail-closed at risk ${maxRisk}`;
      results.shannon.ok = false;
    }
  }

  return sweepResult({ verb, pid, ts, results, blocked, blockGate, blockReason, maxRisk, flags: allFlags });
}

function sweepResult({ verb, pid, ts, results, blocked, blockGate, blockReason, maxRisk, flags }) {
  const uniqueFlags = [...new Set(flags)];
  const gatesOk = Object.values(results).filter(r => r && r.ok).length;
  const gatesTotal = Object.values(results).filter(r => r !== null).length;
  const degraded = Object.values(results).some(r => r && r.degraded);

  return {
    ok: !blocked,
    risk: maxRisk,
    flags: uniqueFlags,
    blocked,
    blockGate: blockGate || null,
    reason: blocked ? blockReason : `${gatesOk}/${gatesTotal} gates passed`,
    degraded,
    gates: results,
    sweep: {
      verb, pid, ts,
      gatesOk, gatesTotal,
      maxRisk, totalFlags: uniqueFlags.length,
      immune: {
        L0_reflex: results.hookwall ? 'checked' : 'skipped',
        L1_pattern: results.hookwall ? 'checked' : 'skipped',
        L2_context: results.hookwall ? 'checked' : 'skipped',
        L3_history: results.gnn ? 'checked' : 'skipped',
        L4_prediction: results.gnn ? 'checked' : 'skipped',
        L5_coordination: results.shannon ? 'checked' : 'skipped',
        L6_shannon: results.shannon?.phases ? 'audited' : 'skipped'
      }
    }
  };
}

module.exports = securitySweep;
if (require.main === module) {
  const verb = process.argv[2] || 'test.ping';
  securitySweep(verb, '', { pid: 'cli' })
    .then(r => console.log(JSON.stringify(r, null, 2)));
}
