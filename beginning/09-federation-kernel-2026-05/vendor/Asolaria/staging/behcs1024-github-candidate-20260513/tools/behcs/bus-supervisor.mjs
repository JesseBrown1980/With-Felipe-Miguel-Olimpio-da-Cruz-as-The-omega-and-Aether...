#!/usr/bin/env node
/**
 * bus-supervisor.mjs — Watchdog/supervisor for behcs-bus.js on acer.
 *
 * Spawns `node tools/behcs/behcs-bus.js` and respawns it whenever it exits.
 * If too many restarts pile up inside a sliding 1-hour window, the supervisor
 * enters "degraded" mode: it stops respawning and writes one
 * EVT-BUS-SUPERVISOR-DEGRADED record directly to the bus inbox file (the
 * normal HTTP path is presumed unavailable when the bus is dead).
 *
 * Usage:
 *   node tools/behcs/bus-supervisor.mjs
 *     [--bus-script <path>]            default: tools/behcs/behcs-bus.js
 *     [--restart-delay-ms <n>]         default: 2000
 *     [--max-restarts-per-hour <n>]    default: 10
 *     [--state-file <path>]            default: data/behcs/state/bus-supervisor-state.json
 *
 * State file (atomic write) shape:
 *   {
 *     "supervisor_started_at": iso,
 *     "child_pid": number|null,
 *     "restart_count": number,           // total since supervisor start
 *     "last_restart_ts": iso|null,
 *     "last_exit_code": number|null,
 *     "last_exit_signal": string|null,
 *     "recent_exits": [ { ts, code, signal } ],   // bounded ring (last 32)
 *     "restart_window": [ iso, ... ],    // restart timestamps inside last hour
 *     "degraded": boolean,
 *     "degraded_at": iso|null
 *   }
 *
 * Cube alignment: D34 CROSS_COLONY (control plane) + D26 OMNIDIRECTIONAL
 * (the bus this watches).
 */

'use strict';

import { spawn } from 'node:child_process';
import { promises as fsp } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve repo root: tools/behcs/bus-supervisor.mjs => repo root is two up.
const REPO_ROOT = process.env.BEHCS_ROOT || path.resolve(__dirname, '..', '..');

// ---------- arg parsing ----------------------------------------------------

function parseArgs(argv) {
  const out = {
    busScript: path.join(REPO_ROOT, 'tools', 'behcs', 'behcs-bus.js'),
    restartDelayMs: 2000,
    maxRestartsPerHour: 10,
    stateFile: path.join(REPO_ROOT, 'data', 'behcs', 'state', 'bus-supervisor-state.json'),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[i + 1];
      if (v === undefined) throw new Error(`flag ${a} requires a value`);
      i++;
      return v;
    };
    switch (a) {
      case '--bus-script': out.busScript = path.resolve(next()); break;
      case '--restart-delay-ms': out.restartDelayMs = Number(next()); break;
      case '--max-restarts-per-hour': out.maxRestartsPerHour = Number(next()); break;
      case '--state-file': out.stateFile = path.resolve(next()); break;
      case '--help':
      case '-h':
        process.stdout.write(
          'bus-supervisor.mjs — see file header for flags.\n'
        );
        process.exit(0);
        break;
      default:
        throw new Error(`unknown flag: ${a}`);
    }
  }
  if (!Number.isFinite(out.restartDelayMs) || out.restartDelayMs < 0) {
    throw new Error('--restart-delay-ms must be a non-negative number');
  }
  if (!Number.isFinite(out.maxRestartsPerHour) || out.maxRestartsPerHour < 1) {
    throw new Error('--max-restarts-per-hour must be a positive integer');
  }
  return out;
}

// ---------- state persistence ---------------------------------------------

const HOUR_MS = 60 * 60 * 1000;
const RECENT_EXITS_CAP = 32;

function nowIso() { return new Date().toISOString(); }

function freshState() {
  return {
    supervisor_started_at: nowIso(),
    child_pid: null,
    restart_count: 0,
    last_restart_ts: null,
    last_exit_code: null,
    last_exit_signal: null,
    recent_exits: [],
    restart_window: [],
    degraded: false,
    degraded_at: null,
  };
}

async function writeStateAtomic(stateFile, state) {
  await fsp.mkdir(path.dirname(stateFile), { recursive: true });
  const tmp = stateFile + '.tmp';
  await fsp.writeFile(tmp, JSON.stringify(state, null, 2));
  await fsp.rename(tmp, stateFile);
}

// ---------- degraded-mode bus inbox writer --------------------------------

function busInboxPath() {
  return path.join(REPO_ROOT, 'data', 'behcs', 'inbox.ndjson');
}

function appendDegradedEvent(state, reason) {
  const inbox = busInboxPath();
  const evt = {
    from: 'acer-bus-supervisor',
    to: 'triad',
    mode: 'real',
    type: 'EVT-BUS-SUPERVISOR-DEGRADED',
    id: `bus-supervisor-degraded-${Date.now()}`,
    ts: nowIso(),
    payload: {
      reason,
      restart_count: state.restart_count,
      restarts_in_window: state.restart_window.length,
      last_exit_code: state.last_exit_code,
      last_exit_signal: state.last_exit_signal,
      supervisor_pid: process.pid,
    },
    behcs: {
      spec: 'IX-700',
      hyperlanguage: '47D',
      route: {
        actor: 'acer-bus-supervisor',
        verb: 'degrade',
        target: 'triad',
        state: 'degraded',
        wave: 'single',
        heartbeat: 'alarm',
      },
    },
  };
  // Direct-append: fall back to sync write so the event survives even if the
  // event loop is being torn down on shutdown. The bus inbox is line-delimited
  // JSON, so a single appendFileSync with trailing newline is correct.
  try {
    fs.mkdirSync(path.dirname(inbox), { recursive: true });
    fs.appendFileSync(inbox, JSON.stringify(evt) + '\n');
    return true;
  } catch (err) {
    process.stderr.write(`[supervisor] failed to append degraded event: ${err.message}\n`);
    return false;
  }
}

// ---------- supervisor loop -----------------------------------------------

class Supervisor {
  constructor(opts) {
    this.opts = opts;
    this.state = freshState();
    this.child = null;
    this.shuttingDown = false;
    this.respawnTimer = null;
  }

  log(msg) {
    process.stdout.write(`[supervisor ${nowIso()}] ${msg}\n`);
  }

  pruneWindow() {
    const cutoff = Date.now() - HOUR_MS;
    this.state.restart_window = this.state.restart_window.filter(
      iso => Date.parse(iso) >= cutoff
    );
  }

  async persist() {
    try {
      await writeStateAtomic(this.opts.stateFile, this.state);
    } catch (err) {
      process.stderr.write(`[supervisor] state write failed: ${err.message}\n`);
    }
  }

  spawnChild() {
    if (this.shuttingDown) return;
    if (this.state.degraded) return;

    this.log(`spawning bus: node ${this.opts.busScript}`);
    const child = spawn(process.execPath, [this.opts.busScript], {
      stdio: ['inherit', 'inherit', 'inherit'],
      env: process.env,
      windowsHide: false,
    });
    this.child = child;
    this.state.child_pid = child.pid;
    this.persist();

    child.on('exit', (code, signal) => {
      this.child = null;
      this.state.child_pid = null;
      this.state.last_exit_code = code;
      this.state.last_exit_signal = signal;
      this.state.recent_exits.push({ ts: nowIso(), code, signal });
      if (this.state.recent_exits.length > RECENT_EXITS_CAP) {
        this.state.recent_exits.splice(
          0, this.state.recent_exits.length - RECENT_EXITS_CAP
        );
      }
      this.log(`child exited code=${code} signal=${signal}`);

      if (this.shuttingDown) {
        this.persist();
        return;
      }

      // Record this as an upcoming restart attempt and check the rate gate.
      const restartTs = nowIso();
      this.state.restart_window.push(restartTs);
      this.pruneWindow();

      if (this.state.restart_window.length > this.opts.maxRestartsPerHour) {
        this.state.degraded = true;
        this.state.degraded_at = nowIso();
        this.log(
          `DEGRADED — ${this.state.restart_window.length} restarts in last hour ` +
          `exceeds limit ${this.opts.maxRestartsPerHour}`
        );
        appendDegradedEvent(
          this.state,
          `restart_rate_exceeded:${this.state.restart_window.length}/${this.opts.maxRestartsPerHour}_per_hour`
        );
        this.persist();
        return;
      }

      this.state.restart_count += 1;
      this.state.last_restart_ts = restartTs;
      this.persist();

      // Tick-7 hardening: exponential backoff after >=3 restarts in window.
      // Plus operator-alert envelope at 80% of degradation threshold.
      const recentRestartsHr = this.state.restart_window.length;
      let backoffMs = this.opts.restartDelayMs;
      if (recentRestartsHr >= 3) {
        // 2^(restarts-3) up to 60 seconds — gives bus a real chance to settle
        backoffMs = Math.min(60000, this.opts.restartDelayMs * Math.pow(2, recentRestartsHr - 3));
      }
      // Operator-alert at 80% threshold (warns before DEGRADED)
      const warnThreshold = Math.floor(this.opts.maxRestartsPerHour * 0.8);
      if (recentRestartsHr === warnThreshold) {
        try {
          appendDegradedEvent(
            this.state,
            `WARN_NEAR_DEGRADED:${recentRestartsHr}/${this.opts.maxRestartsPerHour}_per_hour_will_degrade_soon`
          );
        } catch (_) { /* best-effort */ }
        this.log(`WARN — approaching DEGRADED threshold (${recentRestartsHr}/${this.opts.maxRestartsPerHour}); operator-alert envelope queued`);
      }

      this.log(`respawn in ${backoffMs}ms (count=${this.state.restart_count}, recent_hr=${recentRestartsHr}, backoff=${backoffMs > this.opts.restartDelayMs ? "yes" : "no"})`);
      this.respawnTimer = setTimeout(() => {
        this.respawnTimer = null;
        this.spawnChild();
      }, backoffMs);
    });

    child.on('error', (err) => {
      process.stderr.write(`[supervisor] spawn error: ${err.message}\n`);
    });
  }

  async shutdown(signal) {
    if (this.shuttingDown) return;
    this.shuttingDown = true;
    this.log(`shutdown signal=${signal}`);
    if (this.respawnTimer) {
      clearTimeout(this.respawnTimer);
      this.respawnTimer = null;
    }
    if (this.child && !this.child.killed) {
      try {
        this.child.kill(signal === 'SIGTERM' ? 'SIGTERM' : 'SIGINT');
      } catch { /* already gone */ }
    }
    // Give the child a moment to exit cleanly, then force-kill.
    const start = Date.now();
    while (this.child && Date.now() - start < 3000) {
      await new Promise(r => setTimeout(r, 50));
    }
    if (this.child && !this.child.killed) {
      try { this.child.kill('SIGKILL'); } catch { /* ignore */ }
    }
    await this.persist();
    process.exit(0);
  }

  async start() {
    await fsp.mkdir(path.dirname(this.opts.stateFile), { recursive: true });
    await this.persist();
    process.on('SIGINT', () => { this.shutdown('SIGINT'); });
    process.on('SIGTERM', () => { this.shutdown('SIGTERM'); });
    // Forward stdin to child via inherit; nothing else to do here — the
    // supervisor itself does not read stdin, the child has it directly.
    this.spawnChild();
  }
}

// ---------- main -----------------------------------------------------------

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`bus-supervisor: ${err.message}\n`);
    process.exit(2);
  }
  const sup = new Supervisor(opts);
  await sup.start();
}

main().catch((err) => {
  process.stderr.write(`bus-supervisor fatal: ${err.stack || err.message}\n`);
  process.exit(1);
});
