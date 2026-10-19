#!/usr/bin/env node
// BEHCS-1024 real free-agent wave runner.
//
// Runs bounded OpenCode free-model workers in parallel, captures receipts, and
// writes an operator-readable report. The workers are advisory: they do not edit
// files or run shell commands. Codex applies any accepted result later.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..', '..');
const OPENCODE_PS1 = process.env.OPENCODE_PS1 || '${WINDOWS_LOCAL_PATH}';

const PATHS = {
  plan: path.join(ROOT, 'plans', 'BEHCS-1024-REMAKE-GITHUB-200-STEP-IMPROVEMENT-PLAN.md'),
  waveDir: path.join(ROOT, 'data', 'behcs', 'free-agent-waves'),
  dashboard: path.join(ROOT, 'data', 'behcs', 'dashboard-feeds', 'free-agent-wave-latest.json'),
  report: path.join(ROOT, 'reports', 'behcs1024-free-agent-wave-latest.md'),
  outbox: path.join(ROOT, 'data', 'behcs', 'outbox.ndjson')
};

const MODELS = [
  'opencode/deepseek-v4-flash-free',
  'opencode/big-pickle',
  'opencode/hy3-preview-free',
  'opencode/ling-2.6-flash-free',
  'opencode/minimax-m2.5-free',
  'opencode/nemotron-3-super-free'
];

const TASKS = [
  {
    id: 'P01-P02-baseline-git-segmentation',
    phase: 'P01/P02',
    title: 'Baseline freeze plus dirty-tree GitHub segmentation',
    ask: 'Map the next concrete evidence artifacts and partial GitHub candidate list. Focus on source files, tests, and no-push readiness.'
  },
  {
    id: 'P08-P16-github-security-redaction',
    phase: 'P08/P16',
    title: 'GitHub upgrade path with redaction gates',
    ask: 'Find the safest private-to-public promotion sequence. Include secret/topology scan criteria, rollback notes, and release blockers.'
  },
  {
    id: 'P11-P12-validator-white-room-replay',
    phase: 'P11/P12',
    title: 'Validator harness and OMNICODER white-room replay',
    ask: 'Design the next validator additions for OMNICODER, revolver receipts, Falcon USB, and white-room replay without fake proof.'
  },
  {
    id: 'P13-P15-liris-mobile-parity',
    phase: 'P13/P15',
    title: 'Liris SCRCPY and mobile parity packet',
    ask: 'Draft exact Liris-side replication work for SCRCPY and connected phones, including ${BEHCS_DEVICE_MODEL} style multi-device ports and receipts.'
  },
  {
    id: 'P06-P09-revolver-tier-agent-runtime',
    phase: 'P06/P09',
    title: 'Revolver, tier scouts, and agent runtime viability',
    ask: 'Review how bounded revolver chambers, free agents, access tiers, and tier scouts should interact without uncontrolled process storms.'
  },
  {
    id: 'P17-P20-release-governance',
    phase: 'P17/P20',
    title: 'Issue, release, rollback, and governance closure',
    ask: 'Define the final promotion checklist from private evidence to GitHub issue/PR/release with ${BEHCS_OPERATOR_LABEL} and quintet governance gates.'
  }
];

function parseArgs(argv) {
  const flags = { count: 3, concurrency: 3, timeoutMs: 120000, dry: false };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--count' && next) { flags.count = Math.max(1, Number(next) || flags.count); index += 1; }
    else if (arg === '--concurrency' && next) { flags.concurrency = Math.max(1, Number(next) || flags.concurrency); index += 1; }
    else if (arg === '--timeout-ms' && next) { flags.timeoutMs = Math.max(5000, Number(next) || flags.timeoutMs); index += 1; }
    else if (arg === '--dry') flags.dry = true;
  }
  return flags;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sha16(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

function readText(filePath, fallback = '') {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return fallback; }
}

function writeJson(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function appendNdjson(filePath, row) {
  ensureDir(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(row)}\n`, 'utf8');
}

function makePrompt(task, planExcerpt) {
  return [
    'You are a real bounded BEHCS-1024 free-agent worker running inside Acer fabric.',
    'Return compact JSON only. Do not edit files. Do not run shell commands.',
    'Your output must help Codex continue the 200-step plan and GitHub upgrade safely.',
    `task_id=${task.id}`,
    `phase=${task.phase}`,
    `title=${task.title}`,
    `ask=${task.ask}`,
    '',
    'Required JSON keys:',
    'phase, task_id, next_files, exact_next_commands, github_gate, liris_message, risks, receipts_to_emit',
    '',
    'Plan excerpt:',
    planExcerpt
  ].join('\n');
}

function invocation(model, prompt) {
  if (process.platform === 'win32') {
    return {
      command: 'powershell.exe',
      args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', OPENCODE_PS1, 'run', '--format', 'json', '-m', model, '--dir', ROOT, prompt]
    };
  }
  return {
    command: 'opencode',
    args: ['run', '--format', 'json', '-m', model, '--dir', ROOT, prompt]
  };
}

function runAgent(task, model, prompt, flags) {
  if (flags.dry) {
    return Promise.resolve({
      ok: true,
      dry: true,
      task_id: task.id,
      phase: task.phase,
      model,
      status: 0,
      stdout_excerpt: '{"dry":true}',
      stderr_excerpt: ''
    });
  }
  const inv = invocation(model, prompt);
  return new Promise((resolve) => {
    const started = Date.now();
    let child;
    try {
      child = spawn(inv.command, inv.args, {
        cwd: ROOT,
        windowsHide: true,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });
    } catch (err) {
      resolve({
        ok: false,
        task_id: task.id,
        phase: task.phase,
        model,
        status: null,
        signal: null,
        timed_out: false,
        error: String(err.message || err),
        ms: Date.now() - started,
        stdout_sha16: sha16(''),
        stderr_sha16: sha16(String(err.message || err)),
        stdout_excerpt: '',
        stderr_excerpt: String(err.stack || err).slice(0, 2500)
      });
      return;
    }
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill(); } catch {}
    }, flags.timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        task_id: task.id,
        phase: task.phase,
        model,
        status: null,
        signal: null,
        timed_out: timedOut,
        error: String(err.message || err),
        ms: Date.now() - started,
        stdout_sha16: sha16(stdout),
        stderr_sha16: sha16(stderr),
        stdout_excerpt: stdout.slice(0, 2500),
        stderr_excerpt: stderr.slice(0, 2500)
      });
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({
        ok: code === 0 && !timedOut,
        task_id: task.id,
        phase: task.phase,
        model,
        status: code,
        signal,
        timed_out: timedOut,
        error: null,
        ms: Date.now() - started,
        stdout_sha16: sha16(stdout),
        stderr_sha16: sha16(stderr),
        stdout_excerpt: stdout.slice(0, 2500),
        stderr_excerpt: stderr.slice(0, 2500)
      });
    });
  });
}

async function runBounded(tasks, flags, planExcerpt) {
  const queue = tasks.slice();
  const results = [];
  async function worker(offset) {
    while (queue.length) {
      const task = queue.shift();
      const model = MODELS[(results.length + offset) % MODELS.length];
      const prompt = makePrompt(task, planExcerpt);
      results.push(await runAgent(task, model, prompt, flags));
    }
  }
  await Promise.all(Array.from({ length: Math.min(flags.concurrency, tasks.length) }, (_, index) => worker(index)));
  return results;
}

function writeReport(wave) {
  const lines = [
    '# BEHCS-1024 Free-Agent Wave',
    '',
    `Generated: ${wave.generated_at}`,
    `Wave ID: ${wave.wave_id}`,
    `Executed: ${wave.executed}`,
    '',
    '## Results',
    '',
    ...wave.results.map((row) => [
      `### ${row.task_id}`,
      '',
      `- Phase: ${row.phase}`,
      `- Model: ${row.model}`,
      `- OK: ${row.ok}`,
      `- Status: ${row.status}`,
      `- Timed out: ${row.timed_out}`,
      `- Runtime ms: ${row.ms ?? 0}`,
      `- stdout sha16: ${row.stdout_sha16 || ''}`,
      `- stderr sha16: ${row.stderr_sha16 || ''}`,
      '',
      '```text',
      row.stdout_excerpt || row.stderr_excerpt || '(no output)',
      '```',
      ''
    ].join('\n'))
  ];
  ensureDir(PATHS.report);
  fs.writeFileSync(PATHS.report, `${lines.join('\n')}\n`, 'utf8');
}

const flags = parseArgs(process.argv);
const planExcerpt = readText(PATHS.plan, 'plan_not_found').slice(0, 7000);
const selectedTasks = TASKS.slice(0, flags.count);
const waveId = `free-agent-wave-${sha16(`${Date.now()}:${selectedTasks.map((task) => task.id).join(',')}`)}`;
const results = await runBounded(selectedTasks, flags, planExcerpt);
const wave = {
  ok: results.some((row) => row.ok),
  wave_id: waveId,
  generated_at: new Date().toISOString(),
  runtime: 'acer-behcs1024-free-agent-wave',
  executed: !flags.dry,
  bounded: true,
  no_file_edits_by_agents: true,
  no_shell_by_agents: true,
  count: selectedTasks.length,
  concurrency: flags.concurrency,
  timeout_ms: flags.timeoutMs,
  models: MODELS,
  results
};

writeJson(path.join(PATHS.waveDir, `${waveId}.json`), wave);
writeJson(PATHS.dashboard, wave);
writeReport(wave);
appendNdjson(PATHS.outbox, {
  id: `acer-free-agent-wave-${waveId}`,
  from: 'acer',
  to: 'federation',
  actor: 'codex-acer',
  mode: 'real',
  type: 'FREE_AGENT_WAVE',
  verb: 'EVT-ACER-FREE-AGENT-WAVE-RAN',
  ts: wave.generated_at,
  body: {
    wave_id: waveId,
    executed: wave.executed,
    ok_count: results.filter((row) => row.ok).length,
    total: results.length,
    report: path.relative(ROOT, PATHS.report).replace(/\\/g, '/'),
    dashboard_feed: path.relative(ROOT, PATHS.dashboard).replace(/\\/g, '/')
  }
});

console.log(JSON.stringify({
  ok: wave.ok,
  wave_id: wave.wave_id,
  executed: wave.executed,
  ok_count: results.filter((row) => row.ok).length,
  total: results.length,
  report: path.relative(ROOT, PATHS.report).replace(/\\/g, '/'),
  dashboard_feed: path.relative(ROOT, PATHS.dashboard).replace(/\\/g, '/')
}, null, 2));
