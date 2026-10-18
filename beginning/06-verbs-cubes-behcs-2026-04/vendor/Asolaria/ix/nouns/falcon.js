// IX noun: falcon | PID: asolaria | Profile: asolaria
// GET Falcon bridge health at 192.168.1.16 via HTTP, returns {ok, battery}
const FALCON = process.env.FALCON_URL || 'http://192.168.1.16:4799';

async function falcon() {
  try {
    const res = await fetch(`${FALCON}/health`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    return { ok: true, battery: data.battery || null, ts: Date.now() };
  } catch (e) {
    return { ok: false, error: e.message, ts: Date.now() };
  }
}

module.exports = falcon;
if (require.main === module) falcon().then(r => console.log(JSON.stringify(r, null, 2)));
