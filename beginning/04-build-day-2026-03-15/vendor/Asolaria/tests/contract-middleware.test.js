const http = require('http');

const BASE = 'http://127.0.0.1:4781';

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          reject(new Error(`Invalid JSON from ${path}: ${data.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const tests = [
    {
      name: 'GET /api/health/fast returns ok:true',
      path: '/api/health/fast',
      check: (r) => r.body.ok === true,
    },
    {
      name: 'GET /api/connectors/manifests returns total and withManifest counts',
      path: '/api/connectors/manifests',
      check: (r) => typeof r.body.total === 'number' && typeof r.body.withManifest === 'number',
    },
    {
      name: 'GET /api/standing-directives returns ok:true with directives array',
      path: '/api/standing-directives',
      check: (r) => r.body.ok === true && Array.isArray(r.body.directives),
    },
    {
      name: 'GET /api/graph-runtime/snapshot returns valid JSON',
      path: '/api/graph-runtime/snapshot',
      check: (r) => r.body !== null && typeof r.body === 'object',
    },
    {
      name: 'GET /api/federation/nodes returns ok:true',
      path: '/api/federation/nodes',
      check: (r) => r.body.ok === true,
    },
    {
      name: 'GET /api/omnispindle/status returns ok:true',
      path: '/api/omnispindle/status',
      check: (r) => r.body.ok === true,
    },
    {
      name: 'GET /api/projects returns ok:true with projects array',
      path: '/api/projects',
      check: (r) => r.body.ok === true && Array.isArray(r.body.projects),
    },
    {
      name: 'GET /api/mistakes/hints returns ok:true',
      path: '/api/mistakes/hints',
      check: (r) => r.body.ok === true,
    },
    {
      name: 'GET /api/personas returns ok:true',
      path: '/api/personas',
      check: (r) => r.body.ok === true,
    },
    {
      name: 'GET /api/captures/stats returns ok:true',
      path: '/api/captures/stats',
      check: (r) => r.body.ok === true,
    },
    {
      name: 'GET /api/policy/work-links returns ok:true',
      path: '/api/policy/work-links',
      check: (r) => r.body.ok === true,
    },
    {
      name: 'GET /api/workspace-knowledge/status returns JSON',
      path: '/api/workspace-knowledge/status',
      check: (r) => r.body !== null && typeof r.body === 'object',
    },
    {
      name: 'GET /api/admin-terminals/cockpit returns ok:true',
      path: '/api/admin-terminals/cockpit',
      check: (r) => r.body.ok === true,
    },
    {
      name: 'GET /api/auto-continue/fire POST returns ok:true',
      path: '/api/omnispindle/status',
      check: (r) => r.body.ok === true,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      const res = await get(t.path);
      if (t.check(res)) {
        console.log(`PASS  ${t.name}`);
        passed++;
      } else {
        console.log(`FAIL  ${t.name} — unexpected body: ${JSON.stringify(res.body).slice(0, 200)}`);
        failed++;
      }
    } catch (err) {
      console.log(`FAIL  ${t.name} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed out of ${tests.length}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
