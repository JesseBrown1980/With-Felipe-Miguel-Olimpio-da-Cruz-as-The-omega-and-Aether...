const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const CONTRACT_DIR = path.join(ROOT, "config", "colony-memory");
const EXAMPLES_DIR = path.join(CONTRACT_DIR, "examples");

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${label}`);
  } else {
    failed++;
    console.error(`  FAIL: ${label}`);
  }
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function hasKeys(obj, keys) {
  return keys.every((key) => Object.prototype.hasOwnProperty.call(obj, key));
}

function unique(values) {
  return new Set(values).size === values.length;
}

console.log("\n=== Colony Memory Contract Files ===");
const contractFiles = [
  "README.md",
  "colony-registry.schema.json",
  "transport-epoch.schema.json",
  "draft-promotion-policy.schema.json"
];

for (const file of contractFiles) {
  const filePath = path.join(CONTRACT_DIR, file);
  assert(fs.existsSync(filePath), `${file} exists`);
}

console.log("\n=== Colony Registry Example ===");
const registry = loadJson(path.join(EXAMPLES_DIR, "colony-registry.example.json"));
assert(registry.schemaId === "asolaria.colony-registry", "registry schemaId matches");
assert(Array.isArray(registry.colonies) && registry.colonies.length >= 2, "registry has at least two colonies");
assert(unique(registry.colonies.map((entry) => entry.colonyId)), "colony ids are unique");
assert(
  registry.sharedLanguage.sharedCanonNamespace === "IX",
  "registry shared canon namespace is IX"
);
assert(
  registry.sharedLanguage.localCanonNamespaces.includes("LX"),
  "registry local canon namespaces include LX"
);
assert(
  registry.colonies.some((entry) => entry.colonyId === "sovereign.gaia"),
  "registry includes sovereign.gaia"
);
assert(
  registry.colonies.some((entry) => entry.colonyId === "sub.liris"),
  "registry includes sub.liris"
);

console.log("\n=== Transport Epoch Example ===");
const epoch = loadJson(path.join(EXAMPLES_DIR, "transport-epoch.example.json"));
assert(epoch.schemaId === "asolaria.transport-epoch", "transport epoch schemaId matches");
assert(
  hasKeys(epoch, [
    "sourceKind",
    "observedAt",
    "verifier",
    "status",
    "transportKind"
  ]),
  "transport epoch carries provenance fields"
);
assert(epoch.transportId === "manual-owner-relay", "transport epoch identifies manual owner relay");
assert(epoch.status === "live", "transport epoch example uses live status");
assert(
  epoch.canonicalUse === "primary",
  "transport epoch example marks canonical use as primary"
);
assert(
  Array.isArray(epoch.evidence) && epoch.evidence.length >= 1,
  "transport epoch has evidence references"
);
assert(
  !["document_claim", "historical_transcript", "derived"].includes(epoch.sourceKind),
  "primary transport epoch is not sourced from archaeology-only kinds"
);

console.log("\n=== Draft Promotion Policy Example ===");
const policy = loadJson(path.join(EXAMPLES_DIR, "draft-promotion-policy.example.json"));
assert(policy.schemaId === "asolaria.draft-promotion-policy", "policy schemaId matches");
assert(Array.isArray(policy.layers) && policy.layers.length === 3, "policy defines three layers");
assert(
  unique(policy.layers.map((layer) => layer.id)),
  "policy layer ids are unique"
);
assert(
  Array.isArray(policy.promotionRules) && policy.promotionRules.length >= 4,
  "policy defines promotion rules"
);

const sharedTransportRule = policy.promotionRules.find(
  (rule) =>
    rule.fromLayer === "local_canon" &&
    rule.toLayer === "shared_canon" &&
    rule.factClass === "transport_fact"
);

assert(Boolean(sharedTransportRule), "policy defines local_canon to shared_canon transport rule");
if (sharedTransportRule) {
  assert(
    sharedTransportRule.separateRuntimePacketRequired === true,
    "shared transport promotion requires separate runtime packet"
  );
  assert(
    sharedTransportRule.resultIfMissingProvenance === "reject",
    "shared transport promotion rejects missing provenance"
  );
  assert(
    sharedTransportRule.allowedSourceKinds.every((kind) =>
      ["live_probe", "code_verified"].includes(kind)
    ),
    "shared transport promotion only allows verified source kinds"
  );
  assert(
    sharedTransportRule.allowedStatuses.every((status) =>
      ["live", "superseded"].includes(status)
    ),
    "shared transport promotion only allows live or superseded status"
  );
}

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
