// IX verb: observe | PID: asolaria | Profile: asolaria
// POST /api/aso/op with add-observation
const BASE = process.env.ASO_URL || 'http://localhost:4781';

async function observe(text) {
  try {
    const res = await fetch(`${BASE}/api/aso/op`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ op: 'add-observation', text: text || '[ix:observe] heartbeat' })
    });
    const data = await res.json();
    return { ok: true, recorded: true, ts: Date.now() };
  } catch (e) {
    return { ok: false, error: e.message, ts: Date.now() };
  }
}

module.exports = observe;
if (require.main === module) observe(process.argv[2]).then(r => console.log(JSON.stringify(r, null, 2)));
