#!/usr/bin/env node
// IX chain: link | PID: asolaria-core-v1 | Profile: asolaria | THE LINKING CHAIN
// The nervous system. Runs all chains in sequence, pipes outputs between them.
// mistake-learn → skill-extract → fabricate → review → report
// Every chain's output becomes the next chain's context.
// Links: ALL gates, ALL chains, ALL nouns, GNN construction watcher
// Reference: IX-060 (index IS language), IX-491 (immune), IX-492 (flywheel), IX-518 (V2.1)

const mistakeLearn = require('./mistake-learn');
const skillExtract = require('./skill-extract');
const fabricate = require('./fabricate');
const review = require('./review');
const heartbeat = require('./heartbeat');
const report = require('./report');
const securitySweep = require('./security-sweep');

const PID = 'asolaria-core-v1';

async function link(goal) {
  const ts = new Date().toISOString();
  const results = {};
  const timeline = [];
  let blocked = false;
  let blockReason = null;

  function log(step, msg) {
    timeline.push({ step, msg, at: Date.now() });
  }

  // === PHASE 1: SENSE — what's the system state? ===
  log('heartbeat', 'checking system health');
  try {
    results.heartbeat = await heartbeat();
    log('heartbeat', results.heartbeat.ok ? 'GREEN' : 'RED');
  } catch (e) {
    results.heartbeat = { ok: false, error: e.message };
    log('heartbeat', 'DEGRADED: ' + e.message);
  }

  // === PHASE 2: LEARN — what mistakes exist? what skills are missing? ===
  log('mistake-learn', 'scanning mistake ledger');
  try {
    results.mistakeLearn = await mistakeLearn();
    log('mistake-learn', results.mistakeLearn.summary);
  } catch (e) {
    results.mistakeLearn = { ok: false, error: e.message };
    log('mistake-learn', 'ERROR: ' + e.message);
  }

  log('skill-extract', 'finding tool→skill gaps');
  try {
    results.skillExtract = await skillExtract();
    log('skill-extract', results.skillExtract.summary);
  } catch (e) {
    results.skillExtract = { ok: false, error: e.message };
    log('skill-extract', 'ERROR: ' + e.message);
  }

  // === PHASE 3: COMPOSE — if there's a goal, fabricate a chain for it ===
  if (goal) {
    log('fabricate', `composing chain for: "${goal}"`);
    try {
      results.fabricate = await fabricate(goal);
      log('fabricate', results.fabricate.summary);

      // Feed fabrication result through review
      const fabricationDesc = results.fabricate.proposal?.components
        ?.map(c => c.name).join(' + ') || goal;

      // === PHASE 4: REVIEW — 3 scouts verify the composition ===
      log('review', `3-scout review of: "${fabricationDesc.slice(0, 100)}"`);
      results.review = await review(fabricationDesc);
      log('review', results.review.summary);

      if (results.review.verdict === 'BLOCKED') {
        blocked = true;
        blockReason = results.review.scouts.security?.failures?.join(', ') || 'security blocked';
        log('review', 'BLOCKED: ' + blockReason);
      }
    } catch (e) {
      results.fabricate = { ok: false, error: e.message };
      log('fabricate', 'ERROR: ' + e.message);
    }
  } else {
    log('fabricate', 'no goal provided — skipping composition');
    log('review', 'no composition to review');
  }

  // === PHASE 5: REPORT — dispatch status ===
  log('report', 'dispatching status');
  try {
    results.report = await report();
    log('report', results.report.ok ? 'dispatched' : 'dispatch failed');
  } catch (e) {
    results.report = { ok: false, error: e.message };
    log('report', 'ERROR: ' + e.message);
  }

  // === BUILD THE LINK MAP ===
  const links = {
    'heartbeat → mistake-learn': {
      from: 'system state',
      to: 'mistake patterns',
      signal: results.heartbeat?.ok ? 'healthy' : 'degraded'
    },
    'mistake-learn → skill-extract': {
      from: `${results.mistakeLearn?.ledger?.recurring || 0} recurring mistakes`,
      to: `${results.skillExtract?.toolGaps?.length || 0} tools need skills`,
      signal: results.mistakeLearn?.gaps?.length > 0 ? 'gaps found' : 'covered'
    },
    'skill-extract → fabricate': {
      from: `${results.skillExtract?.inventory?.skills || 0} skills available`,
      to: goal ? `composing "${goal}"` : 'idle',
      signal: goal ? 'active' : 'waiting'
    },
    'fabricate → review': {
      from: `${results.fabricate?.proposal?.components?.length || 0} components`,
      to: results.review?.verdict || 'not reviewed',
      signal: blocked ? 'BLOCKED' : results.review?.verdict || 'idle'
    },
    'review → report': {
      from: results.review?.verdict || 'no review',
      to: results.report?.ok ? 'dispatched' : 'failed',
      signal: blocked ? 'BLOCKED — not dispatched' : 'dispatched'
    },
    // Cross-links to immune system
    'GNN ← all chains': {
      signal: 'every chain step records edges for GNN training'
    },
    'Shannon ← review': {
      signal: results.review?.scouts?.security?.risk || 'not assessed'
    },
    'hookwall ← all chains': {
      signal: '18 events fire on every verb in every chain'
    }
  };

  const elapsed = Date.now() - new Date(ts).getTime();

  return {
    ok: !blocked,
    chain: 'link',
    pid: PID,
    ts,
    goal: goal || null,
    blocked,
    blockReason,
    phases: {
      sense: { heartbeat: results.heartbeat?.ok },
      learn: {
        mistakes: results.mistakeLearn?.summary,
        skills: results.skillExtract?.summary
      },
      compose: goal ? {
        components: results.fabricate?.proposal?.components?.length || 0,
        constraints: results.fabricate?.proposal?.constraints?.length || 0
      } : 'idle',
      review: results.review?.verdict || 'skipped',
      report: results.report?.ok ? 'dispatched' : 'failed'
    },
    links,
    timeline,
    elapsed: elapsed + 'ms',
    summary: goal
      ? `LINK: ${results.review?.verdict || 'ERROR'} — ${results.fabricate?.proposal?.components?.length || 0} components, ${results.mistakeLearn?.gaps?.length || 0} mistake gaps, ${results.skillExtract?.toolGaps?.length || 0} skill gaps`
      : `LINK: sense=${results.heartbeat?.ok ? 'GREEN' : 'RED'}, ${results.mistakeLearn?.ledger?.recurring || 0} recurring mistakes, ${results.skillExtract?.toolGaps?.length || 0} skill gaps`
  };
}

module.exports = link;
if (require.main === module) {
  const goal = process.argv.slice(2).join(' ') || null;
  link(goal).then(r => console.log(JSON.stringify(r, null, 2)));
}
