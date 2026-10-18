const http = require('http');

const BASE = '127.0.0.1';
const PORT = 4781;

let passed = 0;
let failed = 0;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: BASE,
      port: PORT,
      path,
      method,
      headers: {}
    };
    if (body) {
      const data = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = http.request(opts, (res) => {
      let chunks = '';
      res.on('data', (c) => chunks += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(chunks));
        } catch {
          resolve(chunks);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function check(name, condition) {
  if (condition) {
    console.log(`PASS: ${name}`);
    passed++;
  } else {
    console.log(`FAIL: ${name}`);
    failed++;
  }
}

async function run() {
  console.log('=== Contract Phase 2 Security Tests ===\n');

  // 1) GET /api/security/dashboard
  try {
    const r = await request('GET', '/api/security/dashboard');
    check('GET /api/security/dashboard returns ok:true', r.ok === true);
    check('GET /api/security/dashboard has rbac', r.rbac !== undefined);
    check('GET /api/security/dashboard has hardening', r.hardening !== undefined);
    check('GET /api/security/dashboard has riskClasses', r.riskClasses !== undefined);
  } catch (e) {
    check('GET /api/security/dashboard - request failed: ' + e.message, false);
  }

  // 2) GET /api/security/roles
  try {
    const r = await request('GET', '/api/security/roles');
    check('GET /api/security/roles returns ok:true', r.ok === true);
    check('GET /api/security/roles has roles object', r.roles !== undefined && typeof r.roles === 'object');
  } catch (e) {
    check('GET /api/security/roles - request failed: ' + e.message, false);
  }

  // 3) GET /api/security/risk-classes
  try {
    const r = await request('GET', '/api/security/risk-classes');
    check('GET /api/security/risk-classes returns ok:true', r.ok === true);
  } catch (e) {
    check('GET /api/security/risk-classes - request failed: ' + e.message, false);
  }

  // 4) GET /api/security/hardening/status
  try {
    const r = await request('GET', '/api/security/hardening/status');
    check('GET /api/security/hardening/status returns ok:true', r.ok === true);
    check('GET /api/security/hardening/status has dpapiAvailable', r.dpapiAvailable !== undefined);
  } catch (e) {
    check('GET /api/security/hardening/status - request failed: ' + e.message, false);
  }

  // 5) GET /api/security/hardening/keys
  try {
    const r = await request('GET', '/api/security/hardening/keys');
    check('GET /api/security/hardening/keys returns ok:true', r.ok === true);
    check('GET /api/security/hardening/keys has keys array', Array.isArray(r.keys));
  } catch (e) {
    check('GET /api/security/hardening/keys - request failed: ' + e.message, false);
  }

  // 6) GET /api/security/logs/status
  try {
    const r = await request('GET', '/api/security/logs/status');
    check('GET /api/security/logs/status returns ok:true', r.ok === true);
    check('GET /api/security/logs/status has logs object', r.logs !== undefined && typeof r.logs === 'object');
  } catch (e) {
    check('GET /api/security/logs/status - request failed: ' + e.message, false);
  }

  // 7) POST /api/security/classify-command
  try {
    const r = await request('POST', '/api/security/classify-command', { command: 'ls -la' });
    check('POST /api/security/classify-command returns ok:true', r.ok === true);
  } catch (e) {
    check('POST /api/security/classify-command - request failed: ' + e.message, false);
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed, ${passed + failed} total ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
