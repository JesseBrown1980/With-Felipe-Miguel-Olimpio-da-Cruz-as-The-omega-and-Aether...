function normalizeRecentMemories(memories, limit) {
  const normalized = (Array.isArray(memories) ? memories : []).map((entry, index) => typeof entry === "string"
    ? { memory_id: `memory-${index + 1}`, label: entry, detail: entry, source_path: "operator-memory", captured_at: null }
    : {
        memory_id: String(entry.memory_id || `memory-${index + 1}`).trim(),
        label: String(entry.label || entry.summary || `memory-${index + 1}`).trim(),
        detail: String(entry.detail || entry.summary || entry.label || "").trim(),
        source_path: String(entry.source_path || "operator-memory").trim(),
        captured_at: entry.captured_at || null
      });
  return normalized.filter((entry) => entry.detail).slice(-limit);
}

function buildDerivedMemories(leaderConnectorManifest, machineContext, situationContext, runtimeRoot) {
  const counts = leaderConnectorManifest?.counts || {};
  return [
    {
      memory_id: "mapped-connectors",
      label: "connector catalog mapped",
      detail: `leader connector catalog is mapped on ${machineContext.host} with ${counts.normalizedRows || 0} normalized rows and ${counts.fileRows || 0} source-file rows`,
      source_path: `${runtimeRoot}\\leader-connector-catalog\\manifest.json`,
      captured_at: leaderConnectorManifest?.builtAt || machineContext.observedAt
    },
    {
      memory_id: "machine-posture",
      label: "machine posture",
      detail: `${machineContext.host} remains ${machineContext.role} / ${machineContext.interfaceMode} with recommended profile ${machineContext.recommendedProfile}`,
      source_path: `${runtimeRoot}\\device-comms-profiles\\manifest.json`,
      captured_at: machineContext.observedAt
    },
    {
      memory_id: "current-situation",
      label: "current situation",
      detail: `${situationContext.route} on ${situationContext.lane} is ${situationContext.mode}; vote stage is ${situationContext.stage}; pending=${situationContext.pending.join(" | ") || "none"}`,
      source_path: `${runtimeRoot}\\followup-surface-routing\\asolaria\\packet.txt`,
      captured_at: new Date().toISOString()
    }
  ];
}

module.exports = {
  normalizeRecentMemories,
  buildDerivedMemories
};
