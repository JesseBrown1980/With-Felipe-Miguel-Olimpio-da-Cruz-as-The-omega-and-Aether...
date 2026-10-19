// test-gaia-briefing.mjs — bounded tests for gaia-briefing.mjs (step ii).
// TEST 1: timeGate DEFER (window in the PAST) -> deferred, NO opencode spawn (FREE).
// TEST 2: summonSmart LIVE (ONE real $0 fire) on FORMULA-CHIEF 0155964ffc8ef1f8.
// Exactly ONE live fire. Leaves nothing running.

import { loadCatalog } from './src/gaia-loader.mjs';
import { timeGate, buildBriefing, summonSmart } from './src/gaia-briefing.mjs';

const TARGET = '0155964ffc8ef1f8'; // FORMULA-CHIEF

function nowUnix() { return Math.floor(Date.now() / 1000); }

async function main() {
  console.log('=== load catalog (roster from :5088) ===');
  const cat = await loadCatalog();
  console.log(`catalog ok=${cat.ok} count=${cat.count} source=${cat.source}`);
  const seat = cat.positions.find((p) => p.handle8 === TARGET);
  if (!seat) { console.error(`FATAL: seat ${TARGET} not in roster`); process.exit(2); }
  console.log(`seat: name=${seat.name} class=${seat.class} layer=${seat.layer} cube=${seat.cube_bh}`);

  // --- briefing build preview (no fire) ---
  console.log('\n=== buildBriefing preview (no fire) ===');
  const b = buildBriefing(seat);
  console.log(b.text);
  console.log('packet.integral.totalEntries =', b.packet.integral.totalEntries,
    '| P.blockers =', b.packet.proportional.blockers.length,
    '| D.signals =', b.packet.derivative.signals.length);

  // --- unit: timeGate shapes ---
  console.log('\n=== timeGate unit checks ===');
  const now = nowUnix();
  console.log('no-window    :', JSON.stringify(timeGate(seat, now, null)));
  console.log('past-window  :', JSON.stringify(timeGate(seat, now, { start_unix: now - 7200, end_unix: now - 3600 })));
  console.log('future-window:', JSON.stringify(timeGate(seat, now, { start_unix: now + 3600, end_unix: now + 7200 })));
  console.log('in-window    :', JSON.stringify(timeGate(seat, now, { start_unix: now - 60, end_unix: now + 60 })));
  console.log('interval     :', JSON.stringify(timeGate(seat, now, { interval_s: 3600, anchor_unix: 0, window_s: 60 })));
  console.log('omnical-imm  :', JSON.stringify(timeGate(seat, now, { omnicalendar: 'immediate' })));
  console.log('omnical-op   :', JSON.stringify(timeGate(seat, now, { omnicalendar: 'operator_available' })));

  // ====================================================================
  // TEST 1 — DEFER (window in the PAST): assert deferred, fired=false, NO spawn.
  // live:true would fire, BUT the gate must hold BEFORE any opencode launch.
  // ====================================================================
  console.log('\n=== TEST 1: DEFER (past window, live:true requested) ===');
  const t0 = Date.now();
  const pastWindow = { start_unix: now - 7200, end_unix: now - 3600 }; // ended 1h ago
  const deferRes = await summonSmart(seat, 'acer', now, {
    window: pastWindow,
    task: 'THIS MUST NOT FIRE — gate should hold.',
    live: true,            // request a real fire; gate must override
    timeoutMs: 120000,
  });
  const deferMs = Date.now() - t0;
  console.log('defer result:', JSON.stringify({
    deferred: deferRes.deferred, fired: deferRes.fired, cost: deferRes.cost,
    gate: deferRes.gate, reason: deferRes.reason, next_window: deferRes.next_window,
    instance_pid: deferRes.instance_pid,
  }, null, 2));
  const test1Pass = deferRes.deferred === true && deferRes.fired === false &&
    deferRes.cost === 0 && deferMs < 2000; // <2s => no opencode subprocess was ever launched
  console.log(`TEST 1 ${test1Pass ? 'PASS' : 'FAIL'} (elapsed=${deferMs}ms, expected <2000ms = no spawn)`);
  if (!test1Pass) { console.error('TEST 1 FAILED — aborting before live fire'); process.exit(1); }

  // ====================================================================
  // TEST 2 — LIVE (ONE real $0 fire): active/default-open window.
  // FORMULA-CHIEF seat, benign task. EXACTLY ONE live fire.
  // ====================================================================
  console.log('\n=== TEST 2: LIVE summon (ONE real $0 fire, default-open window) ===');
  const t1 = Date.now();
  const liveRes = await summonSmart(seat, 'acer', nowUnix(), {
    window: null, // default-open
    task: 'In ONE short sentence: what is your seat role? Reply plainly, no tools.',
    live: true,
    nodeDirect: true,     // OPENCODE_CLI empty => force node-direct replica against real JS bin
    timeoutMs: 120000,
  });
  const liveMs = Date.now() - t1;
  console.log('live result:', JSON.stringify({
    deferred: liveRes.deferred, fired: liveRes.fired, gate: liveRes.gate,
    gate_reason: liveRes.gate_reason, briefing_used: liveRes.briefing_used,
    instance_pid: liveRes.instance_pid, base_handle8: liveRes.base_handle8,
    agent_type: liveRes.agent_type, cost: liveRes.cost, exit: liveRes.exit,
    mock: liveRes.mock, live: liveRes.live, duration_ms: liveRes.duration_ms,
    room_dir: liveRes.room_dir,
  }, null, 2));
  console.log('\n--- briefing_excerpt (injected into prompt) ---');
  console.log(liveRes.briefing_excerpt);
  console.log('\n--- response ---');
  console.log(liveRes.response || '(empty)');
  console.log(`\n(elapsed=${liveMs}ms)`);

  const test2Pass = liveRes.fired === true && liveRes.deferred === false &&
    liveRes.gate === 'active' && liveRes.briefing_used === true && liveRes.cost === 0;
  console.log(`TEST 2 ${test2Pass ? 'PASS' : 'PARTIAL'} (fired+briefing_used+gate=active+cost0; exit=${liveRes.exit})`);

  console.log('\n=== SUMMARY ===');
  console.log(`TEST 1 (defer/no-fire): ${test1Pass ? 'PASS' : 'FAIL'}`);
  console.log(`TEST 2 (live $0 fire):  fired=${liveRes.fired} exit=${liveRes.exit} cost=${liveRes.cost} briefing_used=${liveRes.briefing_used}`);
}

main().then(() => { console.log('\n[done] no leftover processes'); process.exit(0); })
  .catch((e) => { console.error('TEST HARNESS ERROR:', e && e.stack || e); process.exit(3); });
