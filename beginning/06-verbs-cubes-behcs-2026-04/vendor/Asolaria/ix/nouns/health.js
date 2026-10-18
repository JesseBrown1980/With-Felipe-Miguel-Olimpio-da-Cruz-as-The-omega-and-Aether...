// IX noun: health | PID: asolaria | Profile: asolaria
// GET /api/health/fast — returns {ok, uptime}
const BASE = process.env.ASO_URL || 'http://localhost:4781';

async function health() {
  try {
    const res = await fetch(`${BASE}/api/health/fast`);
    const data = await res.json();
    return { ok: true, uptime: data.uptime || 0, ts: Date.now() };
  } catch (e) {
    return { ok: false, error: e.message, ts: Date.now() };
  }
}

module.exports = health;
if (require.main === module) health().then(r => console.log(JSON.stringify(r, null, 2)));
