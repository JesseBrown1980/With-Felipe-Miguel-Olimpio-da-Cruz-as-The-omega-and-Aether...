"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const core = require("./hyperbehcs-core.cjs");

const ROOT = path.resolve(__dirname, "..");
const REPORTS = path.join(ROOT, "reports");

function exists(targetPath) {
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

function writable(targetPath) {
  const probe = path.join(targetPath, `.hyperbehcs-write-probe-${process.pid}.tmp`);
  try {
    fs.writeFileSync(probe, "probe", "utf8");
    fs.unlinkSync(probe);
    return true;
  } catch {
    try {
      if (fs.existsSync(probe)) fs.unlinkSync(probe);
    } catch {
      // ignore cleanup failure for a write probe
    }
    return false;
  }
}

function pathState(targetPath, packetTargetPath = targetPath) {
  const mounted = exists(targetPath);
  const packetTargetMounted = exists(packetTargetPath);
  return {
    path: targetPath,
    packet_target_path: packetTargetPath,
    mounted,
    packet_target_mounted: packetTargetMounted,
    writable: packetTargetMounted ? writable(packetTargetPath) : false
  };
}

function targetRegistry() {
  const cpu = os.cpus();
  const acer = {
    id: "acer",
    kind: "local-computer",
    status: "active",
    role: "primary Acer physical CPU runtime",
    runtime_root: ROOT,
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpu_model: cpu[0]?.model || "unknown",
    cpu_threads: cpu.length,
    cpu_path_ready: true,
    gpu_path_ready: false,
    daemon_url: "http://127.0.0.1:49257",
    interface: {
      cli: path.join(ROOT, "bin", "hyperbehcs.cmd"),
      node: ROOT,
      powershell_module: path.join(ROOT, "HyperBEHCS.psm1")
    }
  };

  const driveC = pathState("C:\\", ROOT);
  const driveD = pathState("D:\\", "D:\\HyperBEHCS");
  const usbF = pathState("F:\\", "F:\\HyperBEHCS");

  return {
    schema: "hyperbehcs.local_target_registry.v1",
    runtime_root: ROOT,
    generated_at: new Date().toISOString(),
    targets: [
      acer,
      {
        id: "drive-c",
        kind: "fixed-drive",
        status: driveC.mounted ? "active" : "missing",
        role: "local system drive packet/cache target",
        ...driveC,
        packet_index_supported: driveC.mounted
      },
      {
        id: "drive-d",
        kind: "fixed-drive",
        status: driveD.mounted ? "active" : "missing",
        role: "large local data drive packet/cache target",
        ...driveD,
        packet_index_supported: driveD.mounted
      },
      {
        id: "usb-sovlinux",
        kind: "removable-drive",
        status: usbF.mounted && usbF.writable ? "active" : "not-mounted-or-not-writable",
        role: "portable HyperBEHCS deploy target when removable media is present",
        ...usbF,
        packet_index_supported: usbF.mounted
      },
      {
        id: "liris",
        kind: "remote-or-peer",
        status: "profile-ready-local-deploy-pending",
        role: "peer runtime profile; install C:/HyperBEHCS package on that machine before claiming active acceleration",
        packet_index_supported: false,
        cpu_path_ready: false,
        gpu_path_ready: false
      },
      {
        id: "falcon",
        kind: "remote-or-peer",
        status: "profile-ready-local-deploy-pending",
        role: "phone/peer profile; needs device-specific bridge before local packet kernel can run there",
        packet_index_supported: false,
        cpu_path_ready: false,
        gpu_path_ready: false
      },
      {
        id: "aether",
        kind: "remote-or-peer",
        status: "profile-ready-local-deploy-pending",
        role: "peer runtime profile; install or bind local runtime before claiming active acceleration",
        packet_index_supported: false,
        cpu_path_ready: false,
        gpu_path_ready: false
      }
    ],
    truth_boundary: {
      arbitrary_unmodified_programs_transparently_accelerated: false,
      actual_acer_cpu_runtime_active: true,
      actual_gpu_acceleration_active: false,
      reason: "The local runtime is callable by CLI, PowerShell, Node, and loopback HTTP. Existing programs need a wrapper or integration point to call it."
    },
    ...core.ZERO_COUNTERS
  };
}

function writeTargetReport(report = targetRegistry()) {
  fs.mkdirSync(REPORTS, { recursive: true });
  const reportPath = path.join(REPORTS, "target-registry-latest.json");
  const sealed = { ...report, fingerprint: core.sha16(report) };
  fs.writeFileSync(reportPath, `${JSON.stringify(sealed, null, 2)}\n`, "utf8");
  return { report: sealed, reportPath };
}

module.exports = {
  ROOT,
  REPORTS,
  targetRegistry,
  writeTargetReport
};
