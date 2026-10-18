// IX noun: nerve | PID: asolaria | Profile: asolaria
// GET /api/integrations/slack/events/status — returns {ok, running, pollCount}
const BASE = process.env.ASO_URL || 'http://localhost:4781';

async function nerve() {
  try {
    const res = await fetch(`${BASE}/api/integrations/slack/events/status`);
    const data = await res.json();
    return { ok: true, running: !!data.running, pollCount: data.pollCount || 0, ts: Date.now() };
  } catch (e) {
    return { ok: false, error: e.message, ts: Date.now() };
  }
}

module.exports = nerve;
if (require.main === module) nerve().then(r => console.log(JSON.stringify(r, null, 2)));
