// IX verb: dispatch | PID: asolaria | Profile: asolaria
// POST /api/integrations/slack/send — sends message to C0APKFR4PSA
const BASE = process.env.ASO_URL || 'http://localhost:4781';
const CHANNEL = 'C0APKFR4PSA';

async function dispatch(text) {
  try {
    const res = await fetch(`${BASE}/api/integrations/slack/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: CHANNEL, text: text || '[ix:dispatch] ping' })
    });
    const data = await res.json();
    return { ok: true, channel: CHANNEL, sent: true, ts: Date.now() };
  } catch (e) {
    return { ok: false, error: e.message, ts: Date.now() };
  }
}

module.exports = dispatch;
if (require.main === module) dispatch(process.argv[2]).then(r => console.log(JSON.stringify(r, null, 2)));
