#!/usr/bin/env node
// heartbeat-cli.cjs — CLI wrapper for the HyperBEHCS heartbeat module
// PID: AGT-FALCON-AUTO_DAEMON-W19G-HEARTBEAT-CLI-2026-05-21

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const hb = require('../lib/heartbeat.cjs');

const LOOP_PID_FILE = 'C:/HyperBEHCS/store/heartbeat-loop.pid';
const LOOP_LOG_FILE = 'C:/HyperBEHCS/store/heartbeat-loop.log';

async function main() {
  const cmd = (process.argv[2] || 'pulse').toLowerCase();
  const arg = process.argv[3];
  if (cmd === 'pulse') {
    const beat = await hb.pulse();
    process.stdout.write(JSON.stringify(beat, null, 2) + '\n');
    return 0;
  }
  if (cmd === 'recent') {
    const n = Number(arg) || 10;
    const beats = hb.readRecent(n);
    process.stdout.write(JSON.stringify(beats, null, 2) + '\n');
    return 0;
  }
  if (cmd === 'summarize') {
    const n = Number(arg) || 60;
    const s = hb.summarizeWindow(n);
    process.stdout.write(JSON.stringify(s, null, 2) + '\n');
    return 0;
  }
  if (cmd === 'start') {
    const iv = Number(arg) || 10000;
    // Spawn detached child running this same script with internal mode
    const child = spawn(process.execPath, [__filename, '__loop', String(iv)], {
      detached: true,
      stdio: ['ignore', fs.openSync(LOOP_LOG_FILE, 'a'), fs.openSync(LOOP_LOG_FILE, 'a')],
      windowsHide: true
    });
    child.unref();
    fs.writeFileSync(LOOP_PID_FILE, String(child.pid), 'utf8');
    process.stdout.write(JSON.stringify({ ok: true, loop_pid: child.pid, interval_ms: iv, log: LOOP_LOG_FILE }) + '\n');
    return 0;
  }
  if (cmd === 'stop') {
    let pid = null;
    try { pid = parseInt(fs.readFileSync(LOOP_PID_FILE, 'utf8').trim(), 10); } catch (_) {}
    if (!pid) { process.stdout.write(JSON.stringify({ ok: false, error: 'no_pid_file' }) + '\n'); return 1; }
    try { process.kill(pid); fs.unlinkSync(LOOP_PID_FILE); process.stdout.write(JSON.stringify({ ok: true, killed_pid: pid }) + '\n'); return 0; }
    catch (e) { process.stdout.write(JSON.stringify({ ok: false, error: e.message, pid }) + '\n'); return 1; }
  }
  if (cmd === '__loop') {
    const iv = Number(arg) || 10000;
    const handle = hb.startLoop(iv, { log: true });
    process.on('SIGTERM', () => { handle.stop(); process.exit(0); });
    process.on('SIGINT', () => { handle.stop(); process.exit(0); });
    // Keep alive forever — never resolve
    await new Promise(() => {});
    return 0;
  }
  process.stderr.write(`unknown command: ${cmd}\nusage: pulse | recent [N] | summarize [N] | start [intervalMs] | stop\n`);
  return 2;
}

main().then((code) => process.exit(code || 0)).catch((e) => { process.stderr.write('ERR: ' + (e.stack || e.message) + '\n'); process.exit(99); });
