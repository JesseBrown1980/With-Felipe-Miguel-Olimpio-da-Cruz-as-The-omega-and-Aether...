/**
 * Remote Node Registry
 *
 * Tracks sub-colony nodes that connect to this sovereign Asolaria instance
 * via MQTT. Each remote node publishes health, colony, and world snapshots
 * under namespaced topics (asolaria/nodes/<nodeId>/...).
 */

const NODE_OFFLINE_THRESHOLD_MS = 90000; // 3x health interval (30s)
const MAX_TRANSPORT_EPOCHS = 8;
const VALID_PROVENANCE_STATUSES = new Set(["live", "stale", "proposed", "myth", "superseded"]);
const VALID_SOURCE_KINDS = new Set(["live_probe", "code_verified", "document_claim", "historical_transcript", "derived"]);

const nodes = new Map();

function normalizeNodeId(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "_").slice(0, 80) || "";
}

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value, maxLen = 240) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.slice(0, maxLen);
}

function cleanStatus(value, fallback = "live") {
  const normalized = cleanText(value, 32).toLowerCase();
  return VALID_PROVENANCE_STATUSES.has(normalized) ? normalized : fallback;
}

function cleanSourceKind(value, fallback = "derived") {
  const normalized = cleanText(value, 64).toLowerCase();
  return VALID_SOURCE_KINDS.has(normalized) ? normalized : fallback;
}

function cleanVerifier(value) {
  return cleanText(value, 120) || "unknown";
}

function cleanObservedAt(value, fallback = nowIso()) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function cloneValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_error) {
    return null;
  }
}

function cloneNode(node) {
  return cloneValue(node);
}

function normalizePresenceState(value) {
  return String(value || "").trim().toLowerCase() === "offline" ? "offline" : "online";
}

function normalizeProvenanceEnvelope(nodeId, channel, metadata = {}) {
  const normalizedNodeId = normalizeNodeId(nodeId) || "unknown";
  const receivedAt = cleanObservedAt(metadata.received_at, nowIso());
  return {
    channel: cleanText(channel, 40) || "unknown",
    source_kind: cleanSourceKind(metadata.source_kind, "derived"),
    source_topic: cleanText(metadata.source_topic, 320),
    host_scope: cleanText(metadata.host_scope, 160) || `remote_node:${normalizedNodeId}`,
    observed_at: cleanObservedAt(metadata.observed_at, receivedAt),
    received_at: receivedAt,
    verifier: cleanVerifier(metadata.verifier),
    transport_epoch: cleanText(metadata.transport_epoch, 160),
    status: cleanStatus(metadata.status, "live"),
    evidence_ref: cleanText(metadata.evidence_ref, 320),
    payload_hash: cleanText(metadata.payload_hash, 120)
  };
}

function updateTransportEpochs(node, envelope) {
  const epoch = cleanText(envelope?.transport_epoch, 160);
  if (!epoch) {
    return;
  }
  const next = [epoch, ...(Array.isArray(node.transportEpochs) ? node.transportEpochs : []).filter((item) => item !== epoch)];
  node.transportEpochs = next.slice(0, MAX_TRANSPORT_EPOCHS);
}

function ensureNode(nodeId) {
  const id = normalizeNodeId(nodeId);
  if (!id) return null;
  if (!nodes.has(id)) {
    const stamp = nowIso();
    nodes.set(id, {
      nodeId: id,
      status: "online",
      presence: null,
      health: null,
      colony: null,
      world: null,
      compute: null,
      provenance: {
        last: null,
        health: null,
        presence: null,
        colony: null,
        world: null,
        compute: null
      },
      transportEpochs: [],
      lastSeenAt: stamp,
      firstSeenAt: stamp,
      healthUpdates: 0,
      presenceUpdates: 0,
      colonyUpdates: 0,
      worldUpdates: 0,
      computeUpdates: 0
    });
  }
  return nodes.get(id);
}

function applyChannelUpdate(node, channel, payload, metadata = {}) {
  if (!node) return null;
  const envelope = normalizeProvenanceEnvelope(node.nodeId, channel, metadata);
  node.lastSeenAt = envelope.received_at;
  if (channel === "presence") {
    const state = normalizePresenceState(payload);
    node.presence = {
      state,
      updatedAt: envelope.received_at
    };
    node.status = state;
    node.presenceUpdates += 1;
  } else {
    node[channel] = payload && typeof payload === "object" ? cloneValue(payload) : null;
    node.status = "online";
    node[`${channel}Updates`] += 1;
  }
  node.provenance[channel] = envelope;
  node.provenance.last = envelope;
  updateTransportEpochs(node, envelope);
  return cloneNode(node);
}

function updateNodeHealth(nodeId, payload, metadata = {}) {
  return applyChannelUpdate(ensureNode(nodeId), "health", payload, metadata);
}

function updateNodeColony(nodeId, payload, metadata = {}) {
  return applyChannelUpdate(ensureNode(nodeId), "colony", payload, metadata);
}

function updateNodeWorld(nodeId, payload, metadata = {}) {
  return applyChannelUpdate(ensureNode(nodeId), "world", payload, metadata);
}

function updateNodePresence(nodeId, state, metadata = {}) {
  return applyChannelUpdate(ensureNode(nodeId), "presence", state, metadata);
}

function updateNodeCompute(nodeId, payload, metadata = {}) {
  return applyChannelUpdate(ensureNode(nodeId), "compute", payload, metadata);
}

function refreshStaleNodes() {
  const cutoff = Date.now() - NODE_OFFLINE_THRESHOLD_MS;
  for (const node of nodes.values()) {
    if (node.status !== "offline" && new Date(node.lastSeenAt).getTime() < cutoff) {
      node.status = "offline";
    }
  }
}

function getRemoteNode(nodeId) {
  refreshStaleNodes();
  const id = normalizeNodeId(nodeId);
  return id ? cloneNode(nodes.get(id) || null) : null;
}

function getRemoteNodes() {
  refreshStaleNodes();
  return new Map(Array.from(nodes.entries(), ([id, node]) => [id, cloneNode(node)]));
}

function getRemoteNodesSummary() {
  refreshStaleNodes();
  const all = [];
  let online = 0;
  for (const node of nodes.values()) {
    const last = node.provenance?.last || null;
    all.push({
      nodeId: node.nodeId,
      status: node.status,
      lastSeenAt: node.lastSeenAt,
      firstSeenAt: node.firstSeenAt,
      healthUpdates: node.healthUpdates,
      presenceUpdates: node.presenceUpdates,
      colonyUpdates: node.colonyUpdates,
      worldUpdates: node.worldUpdates,
      computeUpdates: node.computeUpdates,
      hasHealth: Boolean(node.health),
      hasPresence: Boolean(node.presence),
      hasColony: Boolean(node.colony),
      hasWorld: Boolean(node.world),
      hasCompute: Boolean(node.compute),
      compute: cloneValue(node.compute),
      lastSourceKind: cleanText(last?.source_kind, 64),
      lastSourceTopic: cleanText(last?.source_topic, 320),
      lastTransportEpoch: cleanText(last?.transport_epoch, 160),
      lastObservedAt: cleanText(last?.observed_at, 64),
      lastReceivedAt: cleanText(last?.received_at, 64),
      lastPayloadHash: cleanText(last?.payload_hash, 120)
    });
    if (node.status === "online") online += 1;
  }
  return {
    total: nodes.size,
    online,
    offline: nodes.size - online,
    nodes: all
  };
}

function removeNode(nodeId) {
  const id = normalizeNodeId(nodeId);
  return id ? nodes.delete(id) : false;
}

function resetRegistry() {
  nodes.clear();
}

module.exports = {
  updateNodeHealth,
  updateNodeColony,
  updateNodeWorld,
  updateNodePresence,
  updateNodeCompute,
  getRemoteNode,
  getRemoteNodes,
  getRemoteNodesSummary,
  removeNode,
  resetRegistry
};
