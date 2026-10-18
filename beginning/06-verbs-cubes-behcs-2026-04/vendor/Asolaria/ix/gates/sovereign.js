// IX gate: sovereign | PID: asolaria | Profile: asolaria
// Checks if E:\sovereignty exists and USB is mounted
const fs = require('fs');
const path = require('path');

const SOV_ROOT = 'E:\\sovereignty';

async function sovereign() {
  try {
    const exists = fs.existsSync(SOV_ROOT);
    const bootFile = path.join(SOV_ROOT, 'kernel', 'sovereignty-boot.js');
    const bootExists = fs.existsSync(bootFile);
    const locked = !exists || !bootExists;
    return { ok: !locked, locked, path: SOV_ROOT, boot: bootExists, ts: Date.now() };
  } catch (e) {
    return { ok: false, locked: true, error: e.message, ts: Date.now() };
  }
}

module.exports = sovereign;
if (require.main === module) sovereign().then(r => console.log(JSON.stringify(r, null, 2)));
