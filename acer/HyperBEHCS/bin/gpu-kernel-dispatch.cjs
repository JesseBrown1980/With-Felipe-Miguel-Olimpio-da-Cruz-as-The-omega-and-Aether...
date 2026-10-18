#!/usr/bin/env node
// W19C GPU kernel dispatcher
// PID-lineage: AGT-VECTOR-THROUGHPUT-W19C-GPU-KERNEL-2026-05-21
const { execFile } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KERNELS = {
  matmul: {
    script: 'C:/HyperBEHCS/bin/gpu-microkernel-matmul.py',
    optMap: { dim: '--dim', iters: '--iters', device_id: '--device-id' },
    defaults: { dim: 1024, iters: 10, device_id: 0 },
  },
  vecadd: {
    script: 'C:/HyperBEHCS/bin/gpu-microkernel-vector-add.py',
    optMap: { n: '--n', iters: '--iters', device_id: '--device-id' },
    defaults: { n: 1048576, iters: 100, device_id: 0 },
  },
};

const LOG_PATH = 'C:/HyperBEHCS/store/gpu-kernel-dispatches.ndjson';

function mintKernelPid(payloadSha16, ts) {
  const h = crypto.createHash('sha256').update(String(payloadSha16) + String(ts)).digest('hex').slice(0, 8);
  return `AGT-VECTOR-THROUGHPUT-GPU-KERNEL-EXEC-${h}`;
}

function buildArgs(kernelDef, opts) {
  const merged = Object.assign({}, kernelDef.defaults, opts || {});
  const args = [kernelDef.script];
  for (const [k, flag] of Object.entries(kernelDef.optMap)) {
    if (merged[k] !== undefined && merged[k] !== null) {
      args.push(flag, String(merged[k]));
    }
  }
  return args;
}

function dispatch(envelope, callback) {
  const kid = envelope.kernel_id;
  const kdef = KERNELS[kid];
  if (!kdef) return callback(new Error(`unknown kernel_id: ${kid}`));

  const ts = Date.now();
  const payloadSha16 = envelope.payload_sha16 || crypto.randomBytes(8).toString('hex');
  const kernelPid = mintKernelPid(payloadSha16, ts);

  const args = buildArgs(kdef, envelope.dispatch_opts || {});
  const t0 = Date.now();

  execFile('python', args, { maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
    const wall_ms = Date.now() - t0;
    let result = null, parseErr = null;
    try { result = JSON.parse(stdout); } catch (e) { parseErr = e.message; }

    const logEntry = {
      ts_iso: new Date(ts).toISOString(),
      kernel_id: kid,
      kernel_pid: kernelPid,
      payload_sha16: payloadSha16,
      args: args.slice(1),
      wall_ms,
      ok: !err && !parseErr,
      result,
      stderr: stderr ? String(stderr).slice(0, 2000) : '',
      parse_err: parseErr,
    };
    try {
      fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
      fs.appendFileSync(LOG_PATH, JSON.stringify(logEntry) + '\n');
    } catch (_) {}

    if (err) return callback(err, { ok: false, kernel_pid: kernelPid, wall_ms, stderr });
    if (parseErr) return callback(new Error('json parse: ' + parseErr), { ok: false, kernel_pid: kernelPid, wall_ms, stdout });
    callback(null, { ok: true, result, kernel_pid: kernelPid, wall_ms });
  });
}

module.exports = { dispatch, mintKernelPid, KERNELS };

if (require.main === module) {
  const argv = process.argv.slice(2);
  const opts = {};
  let kernel = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--kernel') kernel = argv[++i];
    else if (a === '--dim') opts.dim = parseInt(argv[++i], 10);
    else if (a === '--iters') opts.iters = parseInt(argv[++i], 10);
    else if (a === '--device-id') opts.device_id = parseInt(argv[++i], 10);
    else if (a === '--n') opts.n = parseInt(argv[++i], 10);
  }
  if (!kernel) { console.error('--kernel required'); process.exit(2); }
  const env = { kernel_id: kernel, dispatch_opts: opts, payload_sha16: crypto.randomBytes(8).toString('hex') };
  dispatch(env, (err, res) => {
    if (err) {
      console.error(JSON.stringify({ ok: false, error: err.message, kernel_pid: res && res.kernel_pid, wall_ms: res && res.wall_ms, stderr: res && res.stderr }));
      process.exit(1);
    }
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  });
}
