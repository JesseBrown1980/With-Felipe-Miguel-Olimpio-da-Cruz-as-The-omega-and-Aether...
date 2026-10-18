// gpu-lane.cjs — HyperBEHCS GPU lane module
// PID: AGT-FORGE-AUTO_DAEMON-W19A-GPU-LANE-2026-05-21
// Authority: OP-JESSE-GPU-FABRIC-FULL-SYSTEM-W19 (operator-witness granted 2026-05-21)
// Substrate: NVIDIA GeForce GTX 1050 via DML adapter 0 (W18 registry fix: NVIDIA=0, Intel=1)
// Proven: 422 GFLOPS sustained, P-state P8->P0, 43% util, 43 MiB VRAM allocated
//
// 12-lane architecture canonically includes 'gnn' lane; operator requested explicit 'gpu' sub-lane.
//
// NEW FILE: gates per W19A — DO NOT mutate hyperbehcs-daemon.js (W19D wires it).

'use strict';

const { spawn } = require('child_process');
const crypto = require('crypto');

const LANE_NAME = 'gpu';
const APEX_COSIGN = 'OP-JESSE-GPU-FABRIC-FULL-SYSTEM-W19';
const DEFAULT_ADAPTER_REGISTRY = {
  0: { device_id: 0, name: 'NVIDIA GeForce GTX 1050', vendor: 'NVIDIA', driver_version: '582.53' },
  1: { device_id: 1, name: 'Intel UHD Graphics', vendor: 'Intel', driver_version: 'unknown' }
};

function sha8(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex').slice(0, 8);
}

function nowIso() {
  return new Date().toISOString();
}

function mintGpuPid(role, payload) {
  const roleU = String(role || 'UNKNOWN').toUpperCase();
  const supervisor = (payload && payload.supervisor) || 'FORGE';
  const prof = (payload && payload.prof) || 'AUTO_DAEMON';
  const seed = `${supervisor}|${prof}|${roleU}|${nowIso()}|${JSON.stringify(payload || {})}`;
  const tag = sha8(seed);
  return `AGT-${String(supervisor).toUpperCase()}-${String(prof).toUpperCase()}-GPU-${roleU}-${tag}`;
}

function selectAdapter(deviceId) {
  const id = (typeof deviceId === 'number') ? deviceId : 0;
  const info = DEFAULT_ADAPTER_REGISTRY[id];
  if (!info) {
    return { device_id: id, name: 'unknown', vendor: 'unknown', driver_version: 'unknown', warning: 'not_in_registry' };
  }
  return Object.assign({}, info);
}

function liveProbe(timeoutMs) {
  const to = timeoutMs || 200;
  return new Promise((resolve) => {
    const args = [
      '--query-gpu=name,driver_version,pstate,memory.used,memory.total,utilization.gpu,temperature.gpu',
      '--format=csv,noheader,nounits'
    ];
    let stdout = '';
    let stderr = '';
    let finished = false;
    const finish = (obj) => {
      if (finished) return;
      finished = true;
      resolve(obj);
    };
    let child;
    try {
      child = spawn('nvidia-smi', args, { windowsHide: true });
    } catch (e) {
      return finish({ ok: false, error: 'spawn_failed', message: e.message, ts: nowIso() });
    }
    const timer = setTimeout(() => {
      try { child.kill(); } catch (_) { /* ignore */ }
      finish({ ok: false, error: 'timeout', timeout_ms: to, partial_stdout: stdout, ts: nowIso() });
    }, to);
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (e) => {
      clearTimeout(timer);
      finish({ ok: false, error: 'child_error', message: e.message, ts: nowIso() });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        return finish({ ok: false, error: 'nonzero_exit', code, stderr: stderr.trim(), ts: nowIso() });
      }
      const line = stdout.trim().split('\n')[0] || '';
      const parts = line.split(',').map((s) => s.trim());
      finish({
        ok: true,
        name: parts[0] || null,
        driver_version: parts[1] || null,
        pstate: parts[2] || null,
        vram_used_mib: parts[3] ? Number(parts[3]) : null,
        vram_total_mib: parts[4] ? Number(parts[4]) : null,
        util_pct: parts[5] ? Number(parts[5]) : null,
        temp_c: parts[6] ? Number(parts[6]) : null,
        ts: nowIso()
      });
    });
  });
}

function createGpuLane(opts) {
  const o = opts || {};
  const adapter = selectAdapter(o.device_id != null ? o.device_id : 0);
  const state = {
    lane_name: LANE_NAME,
    apex_cosign: APEX_COSIGN,
    created_at: nowIso(),
    adapter,
    gpu_path_ready: true,
    last_dispatch_ms: null,
    last_dispatch_at: null,
    dispatch_count: 0,
    vram_in_use_mib: 0,
    pstate: null,
    util_pct: null,
    lane_pid: mintGpuPid('LANE', { supervisor: 'LIVEFREE', prof: 'LAZY_MINT', adapter })
  };

  function getLaneStatus() {
    return {
      lane_name: state.lane_name,
      gpu_path_ready: state.gpu_path_ready,
      adapter: state.adapter,
      last_dispatch_ms: state.last_dispatch_ms,
      last_dispatch_at: state.last_dispatch_at,
      dispatch_count: state.dispatch_count,
      vram_in_use_mib: state.vram_in_use_mib,
      pstate: state.pstate,
      util_pct: state.util_pct,
      lane_pid: state.lane_pid,
      ts: nowIso()
    };
  }

  async function refreshFromProbe() {
    const p = await liveProbe();
    if (p.ok) {
      state.pstate = p.pstate;
      state.util_pct = p.util_pct;
      state.vram_in_use_mib = p.vram_used_mib;
    }
    return p;
  }

  function recordDispatch(elapsedMs) {
    state.last_dispatch_ms = elapsedMs;
    state.last_dispatch_at = nowIso();
    state.dispatch_count += 1;
  }

  return {
    LANE_NAME,
    state,
    getLaneStatus,
    refreshFromProbe,
    recordDispatch,
    mintGpuPid,
    selectAdapter,
    liveProbe
  };
}

module.exports = {
  LANE_NAME,
  APEX_COSIGN,
  createGpuLane,
  selectAdapter,
  mintGpuPid,
  liveProbe
};
