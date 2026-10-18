// IX chain: report | PID: asolaria | Profile: asolaria
// Runs heartbeat then dispatches result to Slack
const heartbeat = require('./heartbeat');
const dispatch = require('../verbs/dispatch');

async function report() {
  const hb = await heartbeat();
  const status = hb.ok ? 'GREEN' : 'RED';
  const parts = [
    `[IX:report] ${status}`,
    `health=${hb.health.ok} sov=${hb.sovereignty.ok}`,
    `nerve=${hb.nerve.ok} falcon=${hb.falcon.ok}`
  ];
  const msg = parts.join(' | ');
  const sent = await dispatch(msg);
  return { ok: hb.ok && sent.ok, heartbeat: hb, dispatched: sent, ts: Date.now() };
}

module.exports = report;
if (require.main === module) report().then(r => console.log(JSON.stringify(r, null, 2)));
