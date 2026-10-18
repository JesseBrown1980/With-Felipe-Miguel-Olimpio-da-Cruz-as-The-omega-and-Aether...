function resolveOmniShannonIdentity(authorityRows, machineContext, builtAt, shannonPid, shannonProfile) {
  const hostExecution = authorityRows.find((row) => row.entry_point_id === "surface::host.execution_surface");
  return {
    name: `omnihannon-${machineContext.host}`,
    pid: String(shannonPid || "asolaria").trim(),
    profile: String(shannonProfile || "asolaria").trim(),
    host: machineContext.host,
    lane: String(hostExecution?.lane || "local-execution").trim(),
    surface: "security/shannon/*",
    device_id: machineContext.deviceId,
    authority_class: "derived_gate",
    approval_state: String(hostExecution?.approval_state || "owner_gated_via_host_root").trim(),
    captured_at: hostExecution?.captured_at || builtAt,
    verified_at: hostExecution?.verified_at || builtAt,
    source_path: "E:/sovereignty/ix/verbs/shannon.js | E:/sovereignty/ix/gates/shannon.js",
    freshness: "configured_not_live",
    runtime_state: "no_local_listener_on_4791_confirmed"
  };
}

module.exports = {
  resolveOmniShannonIdentity
};
