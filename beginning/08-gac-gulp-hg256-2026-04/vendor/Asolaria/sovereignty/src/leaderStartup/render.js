const path = require("node:path");

function buildInstantPacket(row) {
  return [
    `@startup ${row.leader_id}`,
    `task=${row.task_id}`,
    `rule=${row.rule_id}`,
    `leader=${row.leader_title}`,
    `startup_profile_id=${row.startup_profile_id}`,
    `startup_snapshot_id=${row.startup_snapshot_id}`,
    `machine_profile_id=${row.machine_profile_id}`,
    `situation_id=${row.situation_id}`,
    `active_ruler=${row.active_ruler}`,
    `ruler_profile=${row.ruler_profile}`,
    `host=${row.host}`,
    `device_id=${row.device_id}`,
    `route=${row.followup_route}`,
    `lane=${row.followup_lane}`,
    `vote_stage=${row.vote_stage}`,
    `memory_limit=${row.memory_limit}`,
    `security_fallbacks=${row.security_fallbacks}`,
    `leader_connector_catalog=${row.leader_connector_catalog}`,
    `authority_map=${row.authority_map}`,
    `omni_shannon=${row.omni_shannon_name}`,
    "instruction=Read the mapped startup memories first, then follow the machine- and situation-specific profile before acting.",
    "boundary=Startup packets are bounded memory surfaces; host execution remains owner-gated root."
  ].join("\n");
}

function buildPacketLines(manifest, situationContext, leaderRows) {
  return [
    `@leader-startup ${manifest.taskId}`,
    `rule=${manifest.ruleId}`,
    `host=${manifest.host}`,
    `machine_profile_id=${manifest.machineProfileId}`,
    `situation_id=${manifest.situationId}`,
    `leaders=${leaderRows.map((row) => row.leader_id).join(" ")}`,
    `memory_limit=${manifest.memoryLimit}`,
    `security_fallbacks=${manifest.securityFallbacks.join(" ")}`,
    `leader_connector_catalog=${path.join(manifest.runtimeRoot, "leader-connector-catalog", "leader-connector-catalog.json")}`,
    `authority_map=${manifest.sources.authorityMapPath}`,
    `followup=${situationContext.route} ${situationContext.mode}`,
    `vote_stage=${situationContext.stage}`,
    `pending=${situationContext.pending.join(" | ") || "none"}`,
    "boundary=Startup packets are machine-specific and situation-specific. They do not grant sovereign authority."
  ];
}

module.exports = {
  buildInstantPacket,
  buildPacketLines
};
