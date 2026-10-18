const BASE = process.env.SHANNON_URL || "http://localhost:4791";

async function shannonGate(verb, args, envelope) {
  const pid = envelope?.pid || "unknown", ts = new Date().toISOString(), g = envelope?.gnnResult || {};
  const risk = Number(g.score ?? g.risk?.score ?? envelope?.risk?.score ?? envelope?.risk ?? 0);
  const level = g.level ?? g.risk?.level ?? envelope?.risk?.level ?? "unknown";
  if (risk < 3) return { allow: true, gate: "shannon", skipped: true, reason: "gnn risk below threshold", pid, verb, ts };
  const mode = risk >= 7 ? "full" : "dry_run";
  try {
    const r = await fetch(`${BASE}/security/shannon/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verb, args: typeof args === "string" ? args : JSON.stringify(args)?.slice(0, 500), pid, risk, level, mode }),
      signal: AbortSignal.timeout(5000)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const result = await r.json();
    if (result.blocked) return { allow: false, gate: "shannon", reason: result.reason || "Shannon blocked", flags: result.flags, pid, verb, ts };
    return { allow: true, gate: "shannon", score: result.score, flags: result.flags || [], mode, pid, verb, ts };
  } catch {
    if (risk >= 5) return { allow: false, gate: "shannon", reason: `Shannon unreachable, ${level} risk ${risk} blocked (fail-closed)`, pid, verb, ts };
    return { allow: true, gate: "shannon", degraded: true, reason: `Shannon unreachable, allowing ${level} risk ${risk}`, pid, verb, ts };
  }
}

module.exports = shannonGate;
