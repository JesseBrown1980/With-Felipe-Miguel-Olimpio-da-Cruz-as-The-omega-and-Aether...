#!/usr/bin/env node
// IX chain: poll-whatsapp | PID: mobile-falcon-v1 | Profile: asolaria
// 30-second poll: screenshot WhatsApp, check for new messages, respond
// Timestamps every action for catalog/index chain
// Reference: IX-311 (WhatsApp ADB Send), IX-519 (recursive loop)
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEVICE = 'R5CXA4MGQXV';
const POLL_INTERVAL = parseInt(process.argv[2] || '30000', 10);
const LOG_PATH = path.join(__dirname, '..', '..', 'data', 'whatsapp-poll.ndjson');
const SCREENSHOT_DIR = '/sdcard/whatsapp-polls/';
const PID = 'mobile-falcon-v1';
let pollCount = 0;

function ensureDir() {
  try { execSync(`adb -s ${DEVICE} shell mkdir -p ${SCREENSHOT_DIR}`, { stdio: 'pipe' }); } catch (_) {}
  const localDir = path.dirname(LOG_PATH);
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
}

function log(entry) {
  entry.ts = new Date().toISOString();
  entry.pid = PID;
  entry.poll = pollCount;
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(LOG_PATH, line);
  console.log(line.trim());
}

function screenshot() {
  const name = `wa-poll-${Date.now()}.png`;
  const remote = `${SCREENSHOT_DIR}${name}`;
  try {
    execSync(`adb -s ${DEVICE} shell screencap -p ${remote}`, { stdio: 'pipe', timeout: 10000 });
    return { ok: true, remote, name };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function poll() {
  pollCount++;
  const ts = new Date().toISOString();

  // Take screenshot
  const sc = screenshot();
  log({ type: 'poll', screenshot: sc.ok ? sc.name : 'FAILED', ts });
}

// Start
ensureDir();
log({ type: 'poll-start', interval: POLL_INTERVAL, device: DEVICE });
poll(); // first poll immediately
setInterval(poll, POLL_INTERVAL);
