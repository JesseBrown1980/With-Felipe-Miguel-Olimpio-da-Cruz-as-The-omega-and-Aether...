/**
 * Connector Manifest Registry
 * Defines the IConnector interface contract and provides manifest discovery.
 * Each connector should export a manifest() function returning its capabilities.
 */

const fs = require("fs");
const path = require("path");

const CONNECTORS_DIR = path.join(__dirname, "connectors");

// Required fields in every connector manifest
const MANIFEST_SCHEMA = {
  required: ["id", "version", "capabilities"],
  optional: ["readScopes", "writeScopes", "approvalRequired", "healthCheck", "retrySemantics", "timeoutMs", "secretRequirements", "sideEffects", "failureModes", "emittedEvents", "description"]
};

function validateManifest(manifest) {
  const missing = MANIFEST_SCHEMA.required.filter(f => !manifest[f]);
  return {
    valid: missing.length === 0,
    missing,
    manifest
  };
}

function discoverConnectors() {
  try {
    return fs.readdirSync(CONNECTORS_DIR)
      .filter(f => f.endsWith("Connector.js") || f.endsWith("connector.js"))
      .map(f => ({
        filename: f,
        id: f.replace(/Connector\.js$/i, "").replace(/\.js$/i, ""),
        path: path.join(CONNECTORS_DIR, f)
      }));
  } catch {
    return [];
  }
}

function getConnectorManifest(connectorId) {
  const connectors = discoverConnectors();
  const match = connectors.find(c => c.id === connectorId || c.filename === connectorId);
  if (!match) return null;

  try {
    const mod = require(match.path);
    if (typeof mod.manifest === "function") {
      return validateManifest(mod.manifest());
    }
    return { valid: false, missing: ["manifest function"], manifest: null, note: "Connector does not export manifest()" };
  } catch (err) {
    return { valid: false, missing: [], manifest: null, error: err.message };
  }
}

function getAllManifests() {
  const connectors = discoverConnectors();
  return connectors.map(c => {
    try {
      const mod = require(c.path);
      if (typeof mod.manifest === "function") {
        const m = mod.manifest();
        const v = validateManifest(m);
        return { ...c, ...v };
      }
      return { ...c, valid: false, manifest: null, note: "no manifest() export" };
    } catch (err) {
      return { ...c, valid: false, manifest: null, error: err.message };
    }
  });
}

function getManifestSummary() {
  const all = getAllManifests();
  return {
    total: all.length,
    withManifest: all.filter(c => c.valid).length,
    withoutManifest: all.filter(c => !c.valid).length,
    connectors: all.map(c => ({
      id: c.id,
      filename: c.filename,
      valid: c.valid,
      capabilities: c.manifest?.capabilities || [],
      note: c.note || c.error || null
    }))
  };
}

module.exports = {
  discoverConnectors,
  getConnectorManifest,
  getAllManifests,
  getManifestSummary,
  validateManifest,
  MANIFEST_SCHEMA
};
