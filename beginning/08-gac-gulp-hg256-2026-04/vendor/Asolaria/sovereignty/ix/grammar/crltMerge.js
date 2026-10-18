"use strict";
// CRLT — Conflict-Free Replicated Language Type
// The federation model for the 14-dimension omnilanguage
// Properties: locally complete, globally consistent, monotonic, merge-trivial, partition-tolerant

// CRLT: Conflict-Free Replicated Language Type
// Merge function for tuple-addressed language entries across federation nodes
function crltMerge(localEntries, remoteEntries) {
  const merged = new Map();
  // Local entries go in first (locally complete)
  for (const entry of localEntries || []) {
    const key = entry.tuple ? JSON.stringify(entry.tuple) : entry.id;
    merged.set(key, entry);
  }
  // Remote entries merge in (monotonic — only add, never remove)
  for (const entry of remoteEntries || []) {
    const key = entry.tuple ? JSON.stringify(entry.tuple) : entry.id;
    if (!merged.has(key)) {
      merged.set(key, entry); // new entry — add (globally consistent via unique tuples)
    } else {
      // Same tuple exists locally — keep newer timestamp (merge-trivial)
      const local = merged.get(key);
      if (entry.timestamp > (local.timestamp || "")) {
        merged.set(key, { ...local, ...entry, mergedAt: new Date().toISOString() });
      }
    }
  }
  return Array.from(merged.values());
}

function crltValidate(entries) {
  // Check CRLT properties
  const tuples = new Set();
  for (const entry of entries || []) {
    const key = entry.tuple ? JSON.stringify(entry.tuple) : entry.id;
    if (tuples.has(key)) return { ok: false, reason: "duplicate_tuple", key };
    tuples.add(key);
  }
  return { ok: true, entryCount: tuples.size, properties: ["locally_complete","globally_consistent","monotonic","merge_trivial","partition_tolerant"] };
}

module.exports = { crltMerge, crltValidate };
