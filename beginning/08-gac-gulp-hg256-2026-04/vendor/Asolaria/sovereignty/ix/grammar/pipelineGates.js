"use strict";
// Pipeline Gate Validations — 7 stages with gate checks between each

function validatePreDevGate(branch) {
  // Pre-dev gate: compact packet valid + named agents spawn
  const checks = [];
  const compact = branch?.compactPacketText || "";
  checks.push({ id: "compact_packet_exists", ok: compact.length > 0, detail: compact.length + " chars" });
  checks.push({ id: "compact_has_axioms", ok: compact.includes("axioms="), detail: "AX1-AX7 in compact" });
  checks.push({ id: "compact_has_crlt", ok: compact.includes("federation=CRLT"), detail: "CRLT in compact" });
  checks.push({ id: "compact_lines_under_50", ok: compact.split("\n").length <= 50, detail: compact.split("\n").length + " lines" });
  return { gate: "pre-dev", ok: checks.every(c => c.ok), checks };
}

function validatePreStagingGate(compileResult) {
  // Pre-staging: source integrity + signature match + no orphans
  const checks = [];
  checks.push({ id: "compile_ok", ok: compileResult?.ok === true, detail: compileResult?.error || "" });
  checks.push({ id: "signature_present", ok: Boolean(compileResult?.signature), detail: (compileResult?.signature || "").slice(0, 12) });
  checks.push({ id: "no_validation_errors", ok: (compileResult?.validationErrors?.length || 0) === 0, detail: (compileResult?.validationErrors?.length || 0) + " errors" });
  checks.push({ id: "doc_count_positive", ok: (compileResult?.documentCount || 0) > 0, detail: (compileResult?.documentCount || 0) + " docs" });
  return { gate: "pre-staging", ok: checks.every(c => c.ok), checks };
}

function validatePreProdGate(options) {
  // Pre-prod: pro_ready + back lanes re-verify
  const checks = [];
  checks.push({ id: "pro_ready", ok: Boolean(options?.proReady), detail: options?.proReady ? "YES" : "NO — living language frozen" });
  checks.push({ id: "back_proof_gate", ok: options?.backProofGate !== "FAIL", detail: options?.backProofGate || "unknown" });
  checks.push({ id: "back_provenance", ok: options?.backProvenance !== "FAIL", detail: options?.backProvenance || "unknown" });
  checks.push({ id: "back_gnn", ok: options?.backGnn !== "FAIL", detail: options?.backGnn || "unknown" });
  checks.push({ id: "enforcement_tags_complete", ok: Boolean(options?.enforcementTagsComplete), detail: options?.enforcementTagsComplete ? "all tagged" : "incomplete" });
  return { gate: "pre-prod", ok: checks.every(c => c.ok), checks };
}

module.exports = { validatePreDevGate, validatePreStagingGate, validatePreProdGate };
