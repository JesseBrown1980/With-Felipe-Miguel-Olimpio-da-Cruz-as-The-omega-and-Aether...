// IX verb: sync | PID: asolaria | Profile: asolaria
// POST /api/manifest-sync/apply — triggers manifest sync
const BASE = process.env.ASO_URL || 'http://localhost:4781';

async function sync() {
  try {
    const res = await fetch(`${BASE}/api/manifest-sync/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'ix-runtime', ts: Date.now() })
    });
    const data = await res.json();
    return { ok: true, synced: true, ts: Date.now() };
  } catch (e) {
    return { ok: false, error: e.message, ts: Date.now() };
  }
}

module.exports = sync;
if (require.main === module) sync().then(r => console.log(JSON.stringify(r, null, 2)));
