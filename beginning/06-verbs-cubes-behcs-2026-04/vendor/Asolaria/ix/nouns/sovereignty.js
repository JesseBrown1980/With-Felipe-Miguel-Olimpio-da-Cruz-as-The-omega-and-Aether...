// IX noun: sovereignty | PID: asolaria | Profile: asolaria
// GET /api/sovereignty/status — returns {ok, source, colonies}
const BASE = process.env.ASO_URL || 'http://localhost:4781';

async function sovereignty() {
  try {
    const res = await fetch(`${BASE}/api/sovereignty/status`);
    const data = await res.json();
    return { ok: true, source: data.source, colonies: data.colonies || [], ts: Date.now() };
  } catch (e) {
    return { ok: false, error: e.message, ts: Date.now() };
  }
}

module.exports = sovereignty;
if (require.main === module) sovereignty().then(r => console.log(JSON.stringify(r, null, 2)));
