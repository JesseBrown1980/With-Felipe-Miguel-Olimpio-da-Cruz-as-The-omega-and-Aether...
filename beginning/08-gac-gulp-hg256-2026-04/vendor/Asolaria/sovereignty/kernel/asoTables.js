/**
 * ASO Table Operations — observations, outcomes, relations, surfaces,
 * evidence, conflicts, status. Split from aso.js for kernel line budget.
 * LX chain: LX-153, LX-154, LX-170, LX-015
 */
module.exports = function createTableOps(deps) {
  const { readTable, writeTable, generateRowId, logOp,
    getCrosswalk, VALID_VERBS, ASO_DATA_DIR, _emitWrite } = deps;
  const emit = typeof _emitWrite === "function" ? _emitWrite : () => {};

  function addObservation(input = {}) {
    const topicId = String(input.topicId || "").trim();
    if (!topicId) {
      return { ok: false, error: "topicId_required" };
    }
    const summary = String(input.summary || "").trim();
    if (!summary) {
      return { ok: false, error: "summary_required" };
    }

    const table = readTable("observations");
    const observationId = generateRowId("OBS");
    const row = {
      observationId,
      topicId,
      summary,
      detail: String(input.detail || ""),
      observedAt: input.observedAt || new Date().toISOString(),
      observedBy: String(input.observedBy || process.env.ASOLARIA_AGENT_NAME || "unknown"),
      scope: String(input.scope || "global").toLowerCase(),
      status: String(input.status || "active").toLowerCase(),
      tags: Array.isArray(input.tags) ? input.tags.slice() : []
    };
    table.rows.push(row);
    writeTable("observations", table);

    const result = { ok: true, id: observationId, op: "add-observation" };
    logOp("add-observation", { topicId, summary: summary.slice(0, 80) }, result);
    emit(result);
    return result;
  }

  function getObservations(topicId, limit = 50) {
    const table = readTable("observations");
    return table.rows
      .filter((r) => r.topicId === topicId)
      .sort((a, b) => String(b.observedAt || "").localeCompare(String(a.observedAt || "")))
      .slice(0, limit);
  }

  function addOutcome(input = {}) {
    const topicId = String(input.topicId || "").trim();
    if (!topicId) {
      return { ok: false, error: "topicId_required" };
    }
    const trigger = String(input.trigger || "").trim();
    if (!trigger) {
      return { ok: false, error: "trigger_required" };
    }
    const result = String(input.result || "").trim();
    if (!result) {
      return { ok: false, error: "result_required" };
    }

    const table = readTable("outcomes");
    const outcomeId = generateRowId("OUT");
    const row = {
      outcomeId,
      topicId,
      trigger,
      result,
      linkedMistakes: Array.isArray(input.linkedMistakes) ? input.linkedMistakes.slice() : [],
      linkedSkills: Array.isArray(input.linkedSkills) ? input.linkedSkills.slice() : [],
      lastVerified: new Date().toISOString()
    };
    table.rows.push(row);
    writeTable("outcomes", table);

    const opResult = { ok: true, id: outcomeId, op: "add-outcome" };
    logOp("add-outcome", { topicId, trigger: trigger.slice(0, 80) }, opResult);
    emit(opResult);
    return opResult;
  }

  function getOutcomes(topicId, limit = 50) {
    const table = readTable("outcomes");
    return table.rows
      .filter((r) => r.topicId === topicId)
      .sort((a, b) => String(b.lastVerified || "").localeCompare(String(a.lastVerified || "")))
      .slice(0, limit);
  }

  function addRelation(input = {}) {
    const from = String(input.from || "").trim();
    const verb = String(input.verb || "").trim().toLowerCase();
    const to = String(input.to || "").trim();
    if (!from || !verb || !to) {
      return { ok: false, error: "from_verb_to_required" };
    }
    if (!VALID_VERBS.includes(verb)) {
      return { ok: false, error: `invalid_verb:${verb}` };
    }

    const table = readTable("relations");
    const existing = table.rows.find(
      (r) => r.from === from && r.verb === verb && r.to === to && r.active
    );
    if (existing) {
      return { ok: true, id: existing.relationId, op: "add-relation", note: "already_exists" };
    }

    const relationId = generateRowId("REL");
    const row = {
      relationId,
      from,
      verb,
      to,
      active: true,
      verifiedAt: new Date().toISOString(),
      verifiedBy: String(input.verifiedBy || process.env.ASOLARIA_AGENT_NAME || "unknown")
    };
    table.rows.push(row);
    writeTable("relations", table);

    const result = { ok: true, id: relationId, op: "add-relation" };
    logOp("add-relation", { from, verb, to }, result);
    emit(result);
    return result;
  }

  function getRelations(entryId) {
    const table = readTable("relations");
    return table.rows.filter(
      (r) => r.active && (r.from === entryId || r.to === entryId)
    );
  }

  function addSurface(input = {}) {
    const topicId = String(input.topicId || "").trim();
    if (!topicId) {
      return { ok: false, error: "topicId_required" };
    }

    const table = readTable("surfaces");
    const surfaceId = generateRowId("SRF");
    const row = {
      surfaceId,
      topicId,
      host: String(input.host || ""),
      pid: String(input.pid || ""),
      port: String(input.port || ""),
      path: String(input.path || ""),
      state: String(input.state || "unknown"),
      keyRequired: Boolean(input.keyRequired),
      lastVerified: new Date().toISOString(),
      verifiedBy: String(input.verifiedBy || process.env.ASOLARIA_AGENT_NAME || "unknown")
    };
    table.rows.push(row);
    writeTable("surfaces", table);

    const result = { ok: true, id: surfaceId, op: "add-surface" };
    logOp("add-surface", { topicId, host: row.host, port: row.port }, result);
    emit(result);
    return result;
  }

  function addEvidence(input = {}) {
    const topicId = String(input.topicId || "").trim();
    if (!topicId) {
      return { ok: false, error: "topicId_required" };
    }

    const table = readTable("evidence");
    const evidenceId = generateRowId("EVD");
    const row = {
      evidenceId,
      topicId,
      sourceKind: String(input.sourceKind || "command-output"),
      sourceRef: String(input.sourceRef || ""),
      commandOrPath: String(input.commandOrPath || ""),
      verifiedBy: String(input.verifiedBy || process.env.ASOLARIA_AGENT_NAME || "unknown"),
      verifiedAt: new Date().toISOString()
    };
    table.rows.push(row);
    writeTable("evidence", table);

    const result = { ok: true, id: evidenceId, op: "add-evidence" };
    logOp("add-evidence", { topicId, sourceKind: row.sourceKind }, result);
    emit(result);
    return result;
  }

  function addConflict(input = {}) {
    const topicId = String(input.topicId || "").trim();
    const entryA = String(input.entryA || "").trim();
    const entryB = String(input.entryB || "").trim();
    if (!topicId || !entryA || !entryB) {
      return { ok: false, error: "topicId_entryA_entryB_required" };
    }

    const table = readTable("conflicts");
    const conflictId = generateRowId("CON");
    const row = {
      conflictId,
      topicId,
      entryA,
      entryB,
      description: String(input.description || ""),
      resolutionOwner: String(input.resolutionOwner || "gaia"),
      resolutionState: "open",
      createdAt: new Date().toISOString()
    };
    table.rows.push(row);
    writeTable("conflicts", table);

    const result = { ok: true, id: conflictId, op: "add-conflict" };
    logOp("add-conflict", { topicId, entryA, entryB }, result);
    emit(result);
    return result;
  }

  function resolveConflict(input = {}) {
    const conflictId = String(input.conflictId || "").trim();
    if (!conflictId) {
      return { ok: false, error: "conflictId_required" };
    }

    const table = readTable("conflicts");
    const row = table.rows.find((r) => r.conflictId === conflictId);
    if (!row) {
      return { ok: false, error: `not_found:${conflictId}` };
    }

    row.resolutionState = String(input.resolution || "resolved");
    row.resolutionNote = String(input.note || "");
    row.resolvedAt = new Date().toISOString();
    row.resolvedBy = String(input.resolvedBy || process.env.ASOLARIA_AGENT_NAME || "unknown");
    writeTable("conflicts", table);

    const result = { ok: true, id: conflictId, op: "resolve-conflict" };
    logOp("resolve-conflict", { conflictId, resolution: row.resolutionState }, result);
    emit(result);
    return result;
  }

  function getAsoStatus() {
    const topics = readTable("topics");
    const observations = readTable("observations");
    const outcomes = readTable("outcomes");
    const relations = readTable("relations");
    const surfaces = readTable("surfaces");
    const evidence = readTable("evidence");
    const conflicts = readTable("conflicts");
    const crosswalk = getCrosswalk();

    return {
      ok: true,
      schemaVersion: 1,
      dataDir: ASO_DATA_DIR,
      counts: {
        topics: topics.rows.length,
        observations: observations.rows.length,
        outcomes: outcomes.rows.length,
        relations: relations.rows.length,
        surfaces: surfaces.rows.length,
        evidence: evidence.rows.length,
        conflicts: conflicts.rows.length,
        crosswalkMappings: Object.keys(crosswalk.mappings).length,
        openConflicts: conflicts.rows.filter((r) => r.resolutionState === "open").length
      },
      topicsByType: topics.rows.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {}),
      topicsByTier: topics.rows.reduce((acc, r) => {
        acc[r.tier] = (acc[r.tier] || 0) + 1;
        return acc;
      }, {}),
      lastUpdated: topics.updatedAt || ""
    };
  }

  return { addObservation, getObservations, addOutcome, getOutcomes,
    addRelation, getRelations, addSurface, addEvidence,
    addConflict, resolveConflict, getAsoStatus };
};
