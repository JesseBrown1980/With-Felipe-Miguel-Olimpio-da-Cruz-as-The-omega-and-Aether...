const fs = require("node:fs");
const path = require("node:path");

const { parseCsv } = require("../entryPointAuthorityMap");
const { RULE_ID, TASK_ID, DEFAULT_RUNTIME_ROOT, DEFAULT_OUTPUT_DIR } = require("./constants");
const { ensureDir, readJson, readText, writeJson, writeCsv } = require("./io");
const { normalizeMemoryLimit, normalizeSecurityFallbacks, normalizeLeaders, normalizeRulers } = require("./normalize");
const { parseKeyValuePacket, resolveMachineContext, resolveSituationContext } = require("./context");
const { normalizeRecentMemories, buildDerivedMemories } = require("./memories");
const { resolveOmniShannonIdentity } = require("./shannon");
const { buildRulerProfiles } = require("./rulers");
const { buildInstantPacket, buildPacketLines } = require("./render");

function buildLeaderStartupProfileCatalog(options = {}) {
  const runtimeRoot = options.runtimeRoot || DEFAULT_RUNTIME_ROOT;
  const outputDir = path.resolve(options.outputDir || DEFAULT_OUTPUT_DIR);
  const instantStartupDir = path.join(outputDir, "instant-startup");
  ensureDir(outputDir);
  ensureDir(instantStartupDir);

  const builtAt = new Date().toISOString();
  const memoryLimit = normalizeMemoryLimit(options.memoryLimit);
  const securityFallbacks = normalizeSecurityFallbacks(options.securityFallbacks);
  const leaders = normalizeLeaders(options.leaders);
  const rulers = normalizeRulers(options.rulers);
  const sources = {
    leaderConnectorManifestPath: options.leaderConnectorManifestPath || path.join(runtimeRoot, "leader-connector-catalog", "manifest.json"),
    authorityMapPath: options.authorityMapPath || path.join(runtimeRoot, "entry-point-authority-map", "entry-points.csv"),
    followupPacketPath: options.followupPacketPath || path.join(runtimeRoot, "followup-surface-routing", "asolaria", "packet.txt"),
    voteStatusPath: options.voteStatusPath || path.join(runtimeRoot, "deep-vote-window", "3d-index-substrate", "status.json"),
    deviceCommsManifestPath: options.deviceCommsManifestPath || path.join(runtimeRoot, "device-comms-profiles", "manifest.json"),
    deviceProfilesPath: options.deviceProfilesPath || path.join(runtimeRoot, "device-specific-interface-policy", "device-profiles.json")
  };

  const leaderConnectorManifest = readJson(sources.leaderConnectorManifestPath, {});
  const authorityRows = parseCsv(readText(sources.authorityMapPath, ""));
  const followupPacket = parseKeyValuePacket(readText(sources.followupPacketPath, ""));
  const voteStatus = readJson(sources.voteStatusPath, {});
  const deviceManifest = readJson(sources.deviceCommsManifestPath, {});
  const deviceProfiles = readJson(sources.deviceProfilesPath, {});
  const machineContext = resolveMachineContext(deviceManifest, deviceProfiles);
  const situationContext = resolveSituationContext(followupPacket, voteStatus, machineContext, securityFallbacks);
  const omniShannonIdentity = resolveOmniShannonIdentity(authorityRows, machineContext, builtAt, options.shannonPid, options.shannonProfile);
  const derivedMemories = buildDerivedMemories(leaderConnectorManifest, machineContext, situationContext, runtimeRoot);
  const recentMemories = normalizeRecentMemories([...derivedMemories, ...(Array.isArray(options.recentMemories) ? options.recentMemories : [])], memoryLimit);
  const rulerProfiles = buildRulerProfiles(rulers, machineContext, outputDir);
  const activeRuler = rulerProfiles[0];

  const leaderRows = leaders.map((leader) => {
    const startupProfileId = `${leader.id}::${machineContext.machineProfileId}::${situationContext.situationId}`;
    const row = {
      task_id: TASK_ID,
      rule_id: RULE_ID,
      leader_id: leader.id,
      leader_title: leader.title,
      mission: leader.mission,
      auto_start: "yes",
      startup_profile_id: startupProfileId,
      startup_snapshot_id: `${startupProfileId}::${builtAt}`,
      machine_profile_id: machineContext.machineProfileId,
      situation_id: situationContext.situationId,
      host: machineContext.host,
      device_id: machineContext.deviceId,
      role: machineContext.role,
      interface_mode: machineContext.interfaceMode,
      recommended_profile: machineContext.recommendedProfile,
      followup_lane: situationContext.lane,
      followup_route: situationContext.route,
      followup_mode: situationContext.mode,
      vote_stage: situationContext.stage,
      pending_labels: situationContext.pending.join(" | ") || "none",
      security_fallbacks: securityFallbacks.join(" "),
      memory_limit: memoryLimit,
      recent_memory_count: recentMemories.length,
      omni_shannon_name: omniShannonIdentity.name,
      active_ruler: activeRuler?.ruler_id || "none",
      ruler_profile: activeRuler?.profile_path || path.join(outputDir, "ruler-operator-profiles.json"),
      leader_connector_catalog: leaderConnectorManifest?.output?.catalogJson || path.join(runtimeRoot, "leader-connector-catalog", "leader-connector-catalog.json"),
      authority_map: sources.authorityMapPath,
      instant_startup_json: path.join(instantStartupDir, `${leader.id}.json`),
      instant_startup_packet: path.join(instantStartupDir, `${leader.id}.txt`)
    };
    writeJson(row.instant_startup_json, {
      ok: true,
      taskId: TASK_ID,
      ruleId: RULE_ID,
      builtAt,
      leader,
      machineContext,
      situationContext,
      securityFallbacks,
      memoryLimit,
      recentMemories,
      omniShannonIdentity,
      rulerProfiles,
      sources
    });
    fs.writeFileSync(row.instant_startup_packet, `${buildInstantPacket(row)}\n`, "utf8");
    return row;
  });

  const manifest = {
    ok: true,
    ruleId: RULE_ID,
    taskId: TASK_ID,
    builtAt,
    host: machineContext.host,
    machineProfileId: machineContext.machineProfileId,
    situationId: situationContext.situationId,
    memoryLimit,
    leaderCount: leaderRows.length,
    securityFallbacks,
    runtimeRoot,
    output: {
      profilesJson: path.join(outputDir, "leader-startup-profiles.json"),
      profilesCsv: path.join(outputDir, "leader-startup-profiles.csv"),
      packet: path.join(outputDir, "packet.txt"),
      instantStartupDir
    },
    sources
  };

  writeJson(path.join(outputDir, "leader-startup-profiles.json"), {
    manifest,
    machineContext,
    situationContext,
    omniShannonIdentity,
    recentMemories,
    rulers: rulerProfiles,
    leaders: leaderRows
  });
  writeCsv(path.join(outputDir, "leader-startup-profiles.csv"), [
    "leader_id", "leader_title", "mission", "auto_start", "startup_profile_id", "startup_snapshot_id",
    "machine_profile_id", "situation_id", "host", "device_id", "role", "interface_mode",
    "recommended_profile", "followup_lane", "followup_route", "followup_mode", "vote_stage",
    "pending_labels", "security_fallbacks", "memory_limit", "recent_memory_count", "omni_shannon_name",
    "active_ruler", "ruler_profile", "leader_connector_catalog", "authority_map",
    "instant_startup_json", "instant_startup_packet"
  ], leaderRows);
  writeJson(path.join(outputDir, "ruler-operator-profiles.json"), {
    ok: true,
    builtAt,
    host: machineContext.host,
    machineProfileId: machineContext.machineProfileId,
    rulers: rulerProfiles
  });
  fs.writeFileSync(path.join(outputDir, "packet.txt"), `${buildPacketLines(manifest, situationContext, leaderRows).join("\n")}\n`, "utf8");
  writeJson(path.join(outputDir, "leader-auto-agents.json"), {
    ok: true,
    builtAt,
    leaders: leaderRows.map((row) => ({
      leader_id: row.leader_id,
      startup_profile_id: row.startup_profile_id,
      instant_startup_json: row.instant_startup_json,
      instant_startup_packet: row.instant_startup_packet
    }))
  });

  return {
    ok: true,
    outputDir,
    manifest,
    leaderRows,
    recentMemories,
    omniShannonIdentity,
    machineContext,
    situationContext,
    rulerProfiles
  };
}

module.exports = {
  buildLeaderStartupProfileCatalog
};
