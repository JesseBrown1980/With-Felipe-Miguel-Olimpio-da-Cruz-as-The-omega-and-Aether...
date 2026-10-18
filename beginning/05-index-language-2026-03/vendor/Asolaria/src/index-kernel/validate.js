const fs = require("fs");
const path = require("path");
const {
  indexKernelRoot,
  projectRoot,
  SCHEMA_VERSION,
  CANONICAL_TYPES,
  CANONICAL_NAMESPACE_PREFIXES
} = require("./schema");
const { resolveUnifiedIndexProfile } = require("./profile");
const { searchDocuments } = require("./query");
const KERNEL_MODULE_LINE_LIMIT = 300;
const KERNEL_FACADE_LINE_LIMIT = 180;
const KERNEL_CLI_LINE_LIMIT = 180;
const CANONICAL_NAMESPACE_SET = new Set(CANONICAL_NAMESPACE_PREFIXES.map((value) => String(value || "").toUpperCase()));

function validatePayloadForProfile(payload, profileInput = {}) {
  const profile = resolveUnifiedIndexProfile(profileInput);
  const errors = [];
  if (!payload || typeof payload !== "object") {
    return { ok: false, errors: ["payload_missing"] };
  }
  if (Number(payload.schemaVersion || 0) !== SCHEMA_VERSION) {
    errors.push(`schema_version_mismatch:${payload.schemaVersion || 0}`);
  }
  if (!Array.isArray(payload.documents)) {
    errors.push("documents_missing");
    return { ok: false, errors };
  }
  if (profile.profile === "staging") {
    if (String(payload.profile || "").toLowerCase() !== "staging") {
      errors.push(`profile_mismatch:${payload.profile || ""}`);
    }
    if (String(payload.sourceContract || "") !== profile.sourceContract) {
      errors.push(`source_contract_mismatch:${payload.sourceContract || ""}`);
    }
    for (const document of payload.documents) {
      const prefix = String(document.prefix || "").toUpperCase();
      if (!CANONICAL_NAMESPACE_SET.has(prefix)) {
        errors.push(`staging_non_canonical_prefix:${document.id}`);
        continue;
      }
      if (document.layer !== "canonical") {
        errors.push(`staging_non_canonical:${document.id}`);
      }
      if (document.sourceKind !== `canonical_${prefix.toLowerCase()}`) {
        errors.push(`staging_non_canonical_source:${document.id}`);
      }
    }
    if (Array.isArray(payload.auxiliarySourceFiles) && payload.auxiliarySourceFiles.length > 0) {
      errors.push("staging_has_auxiliary_sources");
    }
  }
  if (profile.profile === "running" || profile.profile === "prod") {
    if (String(payload.profile || "").toLowerCase() !== profile.profile) {
      errors.push(`profile_mismatch:${payload.profile || ""}`);
    }
    if (String(payload.sourceContract || "") !== profile.sourceContract) {
      errors.push(`source_contract_mismatch:${payload.sourceContract || ""}`);
    }
  }
  if (profile.profile === "running") {
    if (!payload.validated) {
      errors.push("running_not_validated");
    }
    if (String(payload.promotedFromProfile || "").toLowerCase() !== "staging") {
      errors.push(`running_invalid_source:${payload.promotedFromProfile || ""}`);
    }
  }
  return {
    ok: errors.length < 1,
    errors
  };
}
function countLines(filePath) {
  return String(fs.readFileSync(filePath, "utf8") || "").split(/\r?\n/g).length;
}

function collectKernelBudgetViolations() {
  const violations = [];
  if (fs.existsSync(indexKernelRoot)) {
    const entries = fs.readdirSync(indexKernelRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".js")) {
        continue;
      }
      const filePath = path.join(indexKernelRoot, entry.name);
      const lines = countLines(filePath);
      if (lines > KERNEL_MODULE_LINE_LIMIT) {
        violations.push({ filePath, lines, limit: KERNEL_MODULE_LINE_LIMIT });
      }
    }
  }

  const facadePath = path.join(projectRoot, "src", "unifiedAgentIndexStore.js");
  const cliPath = path.join(projectRoot, "tools", "Rebuild-AgentIndex.js");
  for (const [filePath, limit] of [[facadePath, KERNEL_FACADE_LINE_LIMIT], [cliPath, KERNEL_CLI_LINE_LIMIT]]) {
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const lines = countLines(filePath);
    if (lines > limit) {
      violations.push({ filePath, lines, limit });
    }
  }

  return {
    ok: violations.length < 1,
    violations,
    summary: violations.length < 1
      ? "kernel line budgets satisfied"
      : `${violations.length} files exceed the kernel line budgets`
  };
}
function runSearchSmoke(payload) {
  const sample = (payload.documents || []).find((document) =>
    document.layer === "canonical" && CANONICAL_NAMESPACE_SET.has(String(document.prefix || "").toUpperCase())
  );
  if (!sample) {
    return {
      ok: false,
      summary: "no canonical namespace sample available",
      sampleId: ""
    };
  }
  const result = searchDocuments(payload.documents, sample.id, { limit: 1, maxSnippetChars: 120 });
  const ok = result.matches[0]?.id === sample.id;
  return {
    ok,
    summary: ok ? `exact id search resolves ${sample.id}` : `exact id search failed for ${sample.id}`,
    sampleId: sample.id
  };
}
function validateStagingScanContract(scanContract = null) {
  const contract = scanContract && typeof scanContract === "object" ? scanContract : {};
  const mode = String(contract.mode || "").toLowerCase();
  const errors = [];
  if (!["warm", "deep"].includes(mode)) {
    errors.push("mode must be warm or deep");
  }
  if (contract.freshnessChecked !== true) {
    errors.push("freshnessChecked must be true");
  }
  if (contract.builtFromSource !== true) {
    errors.push("builtFromSource must be true");
  }
  if (String(contract.sourceWalk || "") !== "canonical-index-root") {
    errors.push("sourceWalk must be canonical-index-root");
  }
  if (contract.manifestPointer === true) {
    errors.push("manifestPointer must be false");
  }
  if (!["content", "stat"].includes(String(contract.hashMode || "").toLowerCase())) {
    errors.push("hashMode must be stat or content");
  }
  if ((mode === "deep" && String(contract.hashMode || "").toLowerCase() !== "content")
    || (mode === "warm" && String(contract.hashMode || "").toLowerCase() !== "stat")) {
    errors.push(`hashMode must match ${mode}`);
  }
  return {
    ok: errors.length < 1,
    errors,
    contract
  };
}
function runCanonicalPayloadIntegrity(payload) {
  const entries = new Map();
  const referenced = new Set();
  const duplicates = [];
  const missingFields = [];
  const nonCanonicalTypes = [];
  const brokenChains = [];

  for (const document of payload?.documents || []) {
    if (document?.layer !== "canonical") {
      continue;
    }
    if (entries.has(document.id)) {
      duplicates.push({ type: "duplicate", id: document.id, paths: [entries.get(document.id).source, document.source] });
      continue;
    }
    entries.set(document.id, document);
    if (!String(document.title || "").trim()) {
      missingFields.push({ type: "missing_name", id: document.id, path: document.source });
    }
    if (!String(document.type || "").trim()) {
      missingFields.push({ type: "missing_type", id: document.id, path: document.source });
    } else if (!CANONICAL_TYPES.includes(String(document.type || "").trim())) {
      nonCanonicalTypes.push({
        type: "non_canonical_type",
        id: document.id,
        entryType: document.type,
        path: document.source
      });
    }
  }

  for (const document of entries.values()) {
    const prefix = String(document.prefix || "").toUpperCase();
    for (const ref of Array.isArray(document.chain) ? document.chain : []) {
      const normalizedRef = String(ref || "").trim();
      if (!normalizedRef.startsWith(`${prefix}-`)) {
        continue;
      }
      referenced.add(normalizedRef);
      if (!entries.has(normalizedRef)) {
        brokenChains.push({
          type: "broken_chain",
          from: document.id,
          to: normalizedRef,
          path: document.source
        });
      }
    }
  }

  return {
    prefixes: Array.from(new Set(Array.from(entries.values()).map((document) => document.prefix))).sort(),
    totalEntries: entries.size,
    totalErrors: duplicates.length + missingFields.length + nonCanonicalTypes.length + brokenChains.length,
    orphanCount: Array.from(entries.values()).filter((document) =>
      (!Array.isArray(document.chain) || document.chain.length < 1) && !referenced.has(document.id)
    ).length,
    brokenChains: brokenChains.length,
    errors: {
      duplicates,
      noFrontmatter: [],
      missingFields,
      nonCanonicalTypes,
      typeFolderMismatch: [],
      brokenChains
    },
    orphans: [],
    gaps: [],
    checkedAt: new Date().toISOString()
  };
}

function runStagingGates(payload, profileInput = {}, options = {}) {
  const profile = resolveUnifiedIndexProfile(profileInput);
  const gates = [];
  const pushGate = (id, ok, summary, detail = {}) => {
    gates.push({ id, ok: Boolean(ok), summary, detail });
  };

  const payloadValidation = validatePayloadForProfile(payload, profile);
  pushGate(
    "payload_contract",
    payloadValidation.ok,
    payloadValidation.ok ? "payload matches staging profile contract" : payloadValidation.errors.join(", "),
    { errors: payloadValidation.errors }
  );

  const integrityReport = runCanonicalPayloadIntegrity(payload);
  pushGate(
    "source_integrity",
    integrityReport.totalErrors < 1,
    integrityReport.totalErrors < 1
      ? `${integrityReport.totalEntries} canonical entries, 0 integrity errors`
      : `${integrityReport.totalErrors} integrity errors detected`,
    { integrityReport }
  );

  const lineBudget = collectKernelBudgetViolations();
  pushGate("kernel_line_budget", lineBudget.ok, lineBudget.summary, lineBudget);

  const scanContract = payload?.persistedScanContract || payload?.scanContract || null;
  const scanValidation = validateStagingScanContract(scanContract);
  pushGate(
    "scan_contract",
    scanValidation.ok,
    scanValidation.ok
      ? `staging build used ${String(scanValidation.contract.mode || "").toLowerCase()} scan contract`
      : scanValidation.errors.join(", "),
    { scanContract }
  );

  const searchSmoke = runSearchSmoke(payload);
  pushGate("search_smoke", searchSmoke.ok, searchSmoke.summary, searchSmoke);

  return {
    ok: gates.every((gate) => gate.ok),
    profile: profile.profile,
    checkedAt: new Date().toISOString(),
    gates,
    errors: gates.filter((gate) => !gate.ok).map((gate) => `${gate.id}:${gate.summary}`),
    integrityReport,
    lineBudget
  };
}

module.exports = {
  validatePayloadForProfile,
  runStagingGates
};
