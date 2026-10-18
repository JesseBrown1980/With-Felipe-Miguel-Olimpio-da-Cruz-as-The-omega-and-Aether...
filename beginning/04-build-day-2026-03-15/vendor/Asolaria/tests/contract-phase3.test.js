// contract-phase3.test.js — Phase 3 endpoint contract tests
// Target: http://127.0.0.1:4781 (loopback)

const http = require('http');

const BASE = 'http://127.0.0.1:4781';

const endpoints = [
  { method: 'GET', path: '/api/jobs' },
  { method: 'GET', path: '/api/vault/status' },
  { method: 'GET', path: '/api/daily-sites/natural20' },
  { method: 'GET', path: '/api/bootstrap/friend-codex-pack' },
  { method: 'GET', path: '/api/task-ledger/summary' },
  { method: 'GET', path: '/api/personas' },
  { method: 'GET', path: '/api/policy/clawbot' },
];

function request(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const req = http.request(url, { method, timeout: 5000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', (err) => reject(err));
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const ep of endpoints) {
    const label = `${ep.method} ${ep.path}`;
    try {
      const res = await request(ep.method, ep.path);

      // Check: status is 2xx
      if (res.status < 200 || res.status >= 300) {
        console.log(`FAIL  ${label} — status ${res.status}`);
        failed++;
        continue;
      }

      // Check: response body is valid JSON
      try {
        JSON.parse(res.body);
      } catch {
        console.log(`FAIL  ${label} — response is not valid JSON`);
        failed++;
        continue;
      }

      // Check: content-type includes json
      const ct = res.headers['content-type'] || '';
      if (!ct.includes('json')) {
        console.log(`FAIL  ${label} — content-type is "${ct}", expected json`);
        failed++;
        continue;
      }

      console.log(`PASS  ${label} — ${res.status}`);
      passed++;
    } catch (err) {
      console.log(`FAIL  ${label} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
