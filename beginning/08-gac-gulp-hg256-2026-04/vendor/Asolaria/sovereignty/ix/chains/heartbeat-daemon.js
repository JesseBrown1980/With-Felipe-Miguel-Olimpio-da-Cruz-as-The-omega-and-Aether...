#!/usr/bin/env node
// IX chain: heartbeat-daemon | PID: asolaria-core-v1 | Profile: asolaria
// 10-second heartbeat loop with state change detection and escalation
// Reference: IX-506 Section 6, IX-518 Language V2.1
// Usage: node ix/chains/heartbeat-daemon.js [interval_ms]
// Default: 10000ms (10s). MQTT publish on every beat. Report on state change or 60s.

const heartbeat = require('./heartbeat');
const dispatch = require('../verbs/dispatch');

const INTERVAL = parseInt(process.argv[2] || '10000', 10);
const REPORT_INTERVAL = 60000; // force report every 60s even if no change
const PID = 'asolaria-core-v1';

let lastState = null;
let lastReportTs = 0;
let consecutiveFailures = 0;
let beatCount = 0;

function stateChanged(prev, curr) {
  if (!prev) return true;
  return prev.health?.ok !== curr.health?.ok ||
         prev.sovereignty?.ok !== curr.sovereignty?.ok ||
         prev.nerve?.ok !== curr.nerve?.ok ||
         prev.falcon?.ok !== curr.falcon?.ok;
}

function stateString(hb) {
  return [
    `health=${hb.health?.ok ? 'UP' : 'DOWN'}`,
    `sov=${hb.sovereignty?.ok ? 'UP' : 'DOWN'}`,
    `nerve=${hb.nerve?.ok ? 'UP' : 'DOWN'}`,
    `falcon=${hb.falcon?.ok ? 'UP' : 'DOWN'}`
  ].join(' ');
}

async function beat() {
  beatCount++;
  const ts = Date.now();

  let hb;
  try {
    hb = await heartbeat();
  } catch (e) {
    consecutiveFailures++;
    console.log(JSON.stringify({
      type: 'heartbeat-error', pid: PID, beat: beatCount,
      error: e.message, consecutiveFailures, ts: new Date().toISOString()
    }));

    // Escalation: 3 consecutive failures → dispatch alert
    if (consecutiveFailures >= 3) {
      try {
        await dispatch(`[IX:heartbeat] CRITICAL — ${consecutiveFailures} consecutive failures: ${e.message}`);
      } catch (_) {}
    }
    return;
  }

  consecutiveFailures = 0;
  const changed = stateChanged(lastState, hb);
  const forceReport = (ts - lastReportTs) >= REPORT_INTERVAL;

  // Log every beat
  console.log(JSON.stringify({
    type: 'heartbeat', pid: PID, beat: beatCount,
    ok: hb.ok, state: stateString(hb),
    changed, ts: new Date().toISOString()
  }));

  // Report on state change or 60s interval
  if (changed || forceReport) {
    const status = hb.ok ? 'GREEN' : 'RED';
    const msg = `[IX:heartbeat] ${status} #${beatCount} | ${stateString(hb)}${changed ? ' | STATE CHANGED' : ''}`;
    try {
      await dispatch(msg);
    } catch (_) {}
    lastReportTs = ts;
  }

  lastState = hb;
}

// Main loop
console.log(JSON.stringify({
  type: 'heartbeat-daemon-start', pid: PID,
  interval: INTERVAL, reportInterval: REPORT_INTERVAL,
  ts: new Date().toISOString()
}));

beat(); // first beat immediately
setInterval(beat, INTERVAL);
