#!/usr/bin/env node
// Acer fabric revolver runtime.
//
// Concrete invariant:
// - The huge backend is BEHCS-1024 tuple/range packets.
// - Only bounded chambers are live workers.
// - Real free-agent/TUI execution is opt-in with --execute.
// - Default ticks load/route work without pretending model output exists.

import { createHash } from 'node:crypto';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..', '..');
const STARTED_AT = new Date().toISOString();

const PATHS = {
  tasklist: path.join(ROOT, 'data', 'behcs', 'fabric-revolver', 'tasklist-latest.ndjson'),
  chamberState: path.join(ROOT, 'data', 'behcs', 'fabric-revolver', 'chambers-latest.json'),
  receipts: path.join(ROOT, 'data', 'behcs', 'fabric-revolver', 'chamber-receipts.ndjson'),
  completed: path.join(ROOT, 'data', 'behcs', 'fabric-revolver', 'completed-tasks.ndjson'),
  dashboard: path.join(ROOT, 'data', 'behcs', 'dashboard-feeds', 'fabric-revolver-runtime-latest.json'),
  outbox: path.join(ROOT, 'data', 'behcs', 'outbox.ndjson'),
  reportJson: path.join(ROOT, 'reports', 'behcs1024-fabric-revolver-runtime-latest.json'),
  reportMd: path.join(ROOT, 'reports', 'behcs1024-fabric-revolver-runtime-latest.md')
};

const MODELS = [
  'opencode/deepseek-v4-flash-free',
  'opencode/big-pickle',
  'opencode/hy3-preview-free',
  'opencode/ling-2.6-flash-free',
  'opencode/minimax-m2.5-free',
  'opencode/nemotron-3-super-free'
];

const OPENCODE_PS1 = process.env.OPENCODE_PS1 || '${WINDOWS_LOCAL_PATH}';

const TASK_TYPES = [
  'surface_registry',
  'dashboard_pipe',
  'spacedesk_vision',
  'falcon_usb_vision',
  'aether_heartbeat',
  'liris_mirror',
  'hookwall_gate',
  'gnn_gulp_2000',
  'gnn_super_gulp_5000',
  'genius_mint',
  'mistake_mint',
  'gc_compact'
];

function parseArgs(argv) {
  const flags = { command: argv[2] || 'status', chambers: 8, maxClaims: 8, timeoutMs: 45000, execute: false };
  for (let index = 3; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--chambers' && next) { flags.chambers = Math.max(1, Number(next) || flags.chambers); index += 1; }
    if (arg === '--max-claims' && next) { flags.maxClaims = Math.max(1, Number(next) || flags.maxClaims); index += 1; }
    if (arg === '--timeout-ms' && next) { flags.timeoutMs = Math.max(1000, Number(next) || flags.timeoutMs); index += 1; }
    if (arg === '--execute') flags.execute = true;
    if (arg === '--no-execute') flags.execute = false;
  }
  return flags;
}

function ensureDir(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function sha16(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

function repoRel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  ensureDir(filePath);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function appendNdjson(filePath, row) {
  ensureDir(filePath);
  appendFileSync(filePath, `${JSON.stringify(row)}\n`, 'utf8');
}

function readNdjson(filePath) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
}

function taskPrompt(task, chamber, model) {
  return [
    'You are a bounded BEHCS-1024 fabric worker.',
    'Return compact JSON only.',
    `task_id=${task.id}`,
    `objective=${task.objective_id}`,
    `surface=${task.surface_id}`,
    `logical_range=${task.logical_node_range?.start}-${task.logical_node_range?.end}`,
    `chamber=${chamber.index}`,
    `model=${model}`,
    'Do not edit files. Do not run shell commands. Produce one improvement, one risk, and one receipt summary.'
  ].join('\n');
}

function blankChamber(index) {
  return {
    index,
    state: 'EMPTY',
    model: MODELS[index % MODELS.length],
    pid: `ACER-REVOLVER-CHAMBER-${String(index).padStart(2, '0')}-${sha16(index)}`,
    assigned_task_id: null,
    assigned_at: null,
    updated_at: STARTED_AT,
    cycle_count: 0,
    last_receipt_id: null,
    last_exit_code: null,
    last_error: null
  };
}

function initializeState(chamberCount = 8) {
  const state = readJson(PATHS.chamberState, null);
  if (state?.ok && Array.isArray(state.chambers) && state.chambers.length === chamberCount) {
    return state;
  }
  return {
    ok: true,
    runtime: 'acer-fabric-revolver',
    generated_at: STARTED_AT,
    updated_at: STARTED_AT,
    execute_default: false,
    architecture: {
      active_chambers: chamberCount,
      process_per_logical_node: false,
      tuple_ranges_are_backend_nodes: true,
      real_worker_slots_are_chambers: true,
      cycle: ['EMPTY', 'LOAD', 'RUNNING', 'COLLECT', 'EJECT', 'EMPTY']
    },
    models: MODELS,
    task_types: TASK_TYPES,
    chambers: Array.from({ length: chamberCount }, (_, index) => blankChamber(index)),
    counters: {
      loaded: 0,
      executed: 0,
      dry_assigned: 0,
      collected: 0,
      ejected: 0
    }
  };
}

function writeState(state) {
  state.updated_at = new Date().toISOString();
  writeJson(PATHS.chamberState, state);
  writeDashboard(state);
  writeReport(state);
}

function occupiedTaskIds(state) {
  return new Set(state.chambers.map((chamber) => chamber.assigned_task_id).filter(Boolean));
}

function completedTaskIds() {
  return new Set(readNdjson(PATHS.completed).map((row) => row.task_id).filter(Boolean));
}

function nextTasks(state, maxClaims) {
  const tasks = readNdjson(PATHS.tasklist);
  const occupied = occupiedTaskIds(state);
  const done = completedTaskIds();
  return tasks
    .filter((task) => task.status === 'queue_ready' && !occupied.has(task.id) && !done.has(task.id))
    .sort((a, b) => Number(Boolean(b.priority)) - Number(Boolean(a.priority)))
    .slice(0, maxClaims);
}

function appendReceipt(event, chamber, task, extra = {}) {
  const ts = new Date().toISOString();
  const receipt = {
    id: `revolver-${event}-${sha16(`${ts}:${chamber.index}:${task?.id || 'none'}`)}`,
    ts,
    event,
    chamber: chamber.index,
    chamber_pid: chamber.pid,
    model: chamber.model,
    task_id: task?.id || chamber.assigned_task_id || null,
    surface_id: task?.surface_id || null,
    objective_id: task?.objective_id || null,
    omnispindle: task?.omnispindle || null,
    omniflywheel: task?.omniflywheel || null,
    proof_sha16: sha16(JSON.stringify({ event, chamber: chamber.index, task_id: task?.id || null, extra })),
    ...extra
  };
  appendNdjson(PATHS.receipts, receipt);
  chamber.last_receipt_id = receipt.id;
  return receipt;
}

function emitBusReceipt(state, action, details = {}) {
  const env = {
    id: `acer-fabric-revolver-${action}-${sha16(`${action}:${state.updated_at}:${JSON.stringify(details)}`)}`,
    from: 'acer',
    to: 'federation',
    actor: 'codex-acer',
    mode: 'real',
    type: 'FABRIC_REVOLVER_RUNTIME',
    verb: `EVT-ACER-FABRIC-REVOLVER-${action.toUpperCase()}`,
    ts: new Date().toISOString(),
    body: {
      runtime: 'acer-fabric-revolver',
      active_chambers: state.chambers.length,
      chamber_states: Object.fromEntries(state.chambers.map((chamber) => [chamber.index, chamber.state])),
      counters: state.counters,
      dashboard_feed: repoRel(PATHS.dashboard),
      report: repoRel(PATHS.reportMd),
      ...details
    }
  };
  appendNdjson(PATHS.outbox, env);
  return env;
}

function runFreeAgent(task, chamber, flags) {
  const prompt = taskPrompt(task, chamber, chamber.model);
  const invocation = process.platform === 'win32'
    ? {
      command: 'powershell.exe',
      args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', OPENCODE_PS1, 'run', '--format', 'json', '-m', chamber.model, '--dir', ROOT, prompt]
    }
    : {
      command: 'opencode',
      args: ['run', '--format', 'json', '-m', chamber.model, '--dir', ROOT, prompt]
    };
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: flags.timeoutMs,
    windowsHide: true,
    shell: false
  });
  return {
    status: result.status,
    signal: result.signal,
    timed_out: Boolean(result.error && String(result.error.message || '').includes('ETIMEDOUT')),
    error: result.error ? String(result.error.message || result.error) : null,
    stdout_sha16: sha16(result.stdout || ''),
    stderr_sha16: sha16(result.stderr || ''),
    stdout_excerpt: String(result.stdout || '').slice(0, 500),
    stderr_excerpt: String(result.stderr || '').slice(0, 500),
    runner: invocation.command,
    runner_args: invocation.args.slice(0, -1)
  };
}

function tick(flags) {
  const state = initializeState(flags.chambers);
  const empty = state.chambers.filter((chamber) => chamber.state === 'EMPTY').slice(0, flags.maxClaims);
  const tasks = nextTasks(state, empty.length);
  const loaded = [];
  for (let index = 0; index < tasks.length; index += 1) {
    const task = tasks[index];
    const chamber = empty[index];
    chamber.state = flags.execute ? 'RUNNING' : 'ASSIGNED';
    chamber.model = MODELS[(chamber.index + chamber.cycle_count) % MODELS.length];
    chamber.assigned_task_id = task.id;
    chamber.assigned_at = new Date().toISOString();
    chamber.updated_at = chamber.assigned_at;
    chamber.cycle_count += 1;
    state.counters.loaded += 1;
    const loadReceipt = appendReceipt(flags.execute ? 'load_execute' : 'load_dry', chamber, task, {
      execute: flags.execute,
      materialization: task.materialization,
      logical_node_range: task.logical_node_range
    });
    if (flags.execute) {
      const result = runFreeAgent(task, chamber, flags);
      chamber.state = 'COLLECT';
      chamber.last_exit_code = result.status;
      chamber.last_error = result.error;
      state.counters.executed += 1;
      appendReceipt('collect_execute', chamber, task, {
        execute: true,
        model_result: result
      });
    } else {
      state.counters.dry_assigned += 1;
    }
    loaded.push({ task_id: task.id, chamber: chamber.index, receipt_id: loadReceipt.id, execute: flags.execute });
  }
  const bus = emitBusReceipt(state, 'tick', { loaded });
  writeState(state);
  return { ok: true, action: 'tick', loaded, bus_receipt_id: bus.id, execute: flags.execute };
}

function collect(flags) {
  const state = initializeState(flags.chambers);
  const collected = [];
  const tasksById = new Map(readNdjson(PATHS.tasklist).map((task) => [task.id, task]));
  for (const chamber of state.chambers) {
    if (!['ASSIGNED', 'COLLECT'].includes(chamber.state) || !chamber.assigned_task_id) continue;
    const task = tasksById.get(chamber.assigned_task_id) || { id: chamber.assigned_task_id };
    const status = chamber.state === 'COLLECT' ? 'completed_after_execute' : 'assigned_pending_external_tui';
    const receipt = appendReceipt('collect', chamber, task, {
      status,
      no_fake_model_output: chamber.state === 'ASSIGNED'
    });
    state.counters.collected += 1;
    collected.push({ chamber: chamber.index, task_id: task.id, status, receipt_id: receipt.id });
  }
  const bus = emitBusReceipt(state, 'collect', { collected });
  writeState(state);
  return { ok: true, action: 'collect', collected, bus_receipt_id: bus.id };
}

function eject(flags) {
  const state = initializeState(flags.chambers);
  const ejected = [];
  const tasksById = new Map(readNdjson(PATHS.tasklist).map((task) => [task.id, task]));
  for (const chamber of state.chambers) {
    if (!chamber.assigned_task_id) continue;
    const task = tasksById.get(chamber.assigned_task_id) || { id: chamber.assigned_task_id };
    const receipt = appendReceipt('eject', chamber, task, {
      prior_state: chamber.state,
      note: chamber.state === 'ASSIGNED' ? 'ejected_without_model_output' : 'ejected_after_collect'
    });
    appendNdjson(PATHS.completed, {
      ts: new Date().toISOString(),
      task_id: task.id,
      chamber: chamber.index,
      status: chamber.state === 'ASSIGNED' ? 'deferred_external_tui' : 'complete',
      receipt_id: receipt.id
    });
    chamber.state = 'EMPTY';
    chamber.assigned_task_id = null;
    chamber.assigned_at = null;
    chamber.updated_at = new Date().toISOString();
    chamber.last_exit_code = null;
    chamber.last_error = null;
    state.counters.ejected += 1;
    ejected.push({ chamber: chamber.index, task_id: task.id, receipt_id: receipt.id });
  }
  const bus = emitBusReceipt(state, 'eject', { ejected });
  writeState(state);
  return { ok: true, action: 'eject', ejected, bus_receipt_id: bus.id };
}

function status(flags) {
  const state = initializeState(flags.chambers);
  const pending = nextTasks(state, 10_000).length;
  const out = {
    ok: true,
    action: 'status',
    chambers: state.chambers.length,
    chamber_states: Object.fromEntries(state.chambers.map((chamber) => [chamber.index, chamber.state])),
    pending_queue_ready: pending,
    counters: state.counters,
    dashboard_feed: repoRel(PATHS.dashboard),
    report: repoRel(PATHS.reportMd)
  };
  writeState(state);
  return out;
}

function writeDashboard(state) {
  const tasks = readNdjson(PATHS.tasklist);
  const receipts = readNdjson(PATHS.receipts).slice(-50);
  const feed = {
    ok: true,
    generated_at: new Date().toISOString(),
    feed: 'fabric-revolver-runtime-latest',
    runtime: 'acer-fabric-revolver',
    architecture: state.architecture,
    counters: state.counters,
    models: MODELS,
    task_types: TASK_TYPES,
    queue: {
      source: repoRel(PATHS.tasklist),
      total_rows: tasks.length,
      queue_ready: tasks.filter((task) => task.status === 'queue_ready').length
    },
    chambers: state.chambers,
    recent_receipts: receipts
  };
  writeJson(PATHS.dashboard, feed);
}

function writeReport(state) {
  const feedPath = repoRel(PATHS.dashboard);
  const taskPath = repoRel(PATHS.tasklist);
  const lines = [
    '# BEHCS-1024 Fabric Revolver Runtime',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Viability',
    '',
    '- Logical backend nodes are BEHCS-1024 tuple/range packets.',
    '- Live workers are bounded revolver chambers.',
    '- Default ticks do not call models and do not fake model output.',
    '- `--execute` is the explicit switch for bounded real free-agent calls.',
    '',
    '## State',
    '',
    `- Chambers: ${state.chambers.length}`,
    `- Loaded: ${state.counters.loaded}`,
    `- Executed: ${state.counters.executed}`,
    `- Dry assigned: ${state.counters.dry_assigned}`,
    `- Collected: ${state.counters.collected}`,
    `- Ejected: ${state.counters.ejected}`,
    `- Dashboard feed: \`${feedPath}\``,
    `- Tasklist: \`${taskPath}\``,
    '',
    '## Chambers',
    '',
    '| Chamber | State | Model | Task | PID |',
    '|---:|---|---|---|---|'
  ];
  for (const chamber of state.chambers) {
    lines.push(`| ${chamber.index} | \`${chamber.state}\` | \`${chamber.model}\` | \`${chamber.assigned_task_id || ''}\` | \`${chamber.pid}\` |`);
  }
  lines.push('');
  ensureDir(PATHS.reportMd);
  writeFileSync(PATHS.reportMd, lines.join('\n'), 'utf8');
  writeJson(PATHS.reportJson, state);
}

function main() {
  const flags = parseArgs(process.argv);
  let result;
  if (flags.command === 'status') result = status(flags);
  else if (flags.command === 'tick') result = tick(flags);
  else if (flags.command === 'collect') result = collect(flags);
  else if (flags.command === 'eject') result = eject(flags);
  else if (flags.command === 'cycle') {
    const a = tick(flags);
    const b = collect(flags);
    const c = eject(flags);
    result = { ok: true, action: 'cycle', tick: a, collect: b, eject: c };
  } else {
    result = {
      ok: false,
      error: `unknown_command:${flags.command}`,
      usage: [
        'node tools/behcs/fabric-revolver.mjs status',
        'node tools/behcs/fabric-revolver.mjs tick --chambers 8 --max-claims 8',
        'node tools/behcs/fabric-revolver.mjs tick --execute --timeout-ms 45000',
        'node tools/behcs/fabric-revolver.mjs collect',
        'node tools/behcs/fabric-revolver.mjs eject',
        'node tools/behcs/fabric-revolver.mjs cycle'
      ]
    };
    process.exitCode = 2;
  }
  console.log(JSON.stringify(result, null, 2));
}

main();
