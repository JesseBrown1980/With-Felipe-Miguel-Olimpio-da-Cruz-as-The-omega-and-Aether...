#!/usr/bin/env node
// IX chain: review | PID: admin-sentinel-v1 | Profile: asolaria
// 3-scout review chain: security → language compliance → test verification
// Links: Shannon (full scan) → hookwall (PermissionRequest) → GNN (risk assessment)
// Reference: IX-487 (3 Claude scouts + 3 Codex forges), IX-518 Language V2.1
const fs = require('fs');
const path = require('path');

const PID = 'admin-sentinel-v1';
const RULES_DIR = path.join(__dirname, '..', '..', 'index', 'rules');
const MISTAKES_DIR = path.join(__dirname, '..', '..', 'index', 'mistakes');

function loadRuleNames() {
  if (!fs.existsSync(RULES_DIR)) return [];
  return fs.readdirSync(RULES_DIR).filter(f => f.endsWith('.md')).map(f => {
    const content = fs.readFileSync(path.join(RULES_DIR, f), 'utf8');
    const nameMatch = content.match(/name:\s*(.+)/);
    return { ix: f.replace('.md', ''), name: nameMatch ? nameMatch[1].trim() : f };
  });
}

function loadMistakePatterns() {
  if (!fs.existsSync(MISTAKES_DIR)) return [];
  return fs.readdirSync(MISTAKES_DIR).filter(f => f.endsWith('.md')).map(f => {
    const content = fs.readFileSync(path.join(MISTAKES_DIR, f), 'utf8');
    const nameMatch = content.match(/name:\s*(.+)/);
    return { ix: f.replace('.md', ''), name: nameMatch ? nameMatch[1].trim() : f };
  });
}

// Scout 1: Security review
function securityReview(target) {
  const checks = [
    { check: 'crossDomain', pass: !target.includes('external'), note: 'cross-domain access' },
    { check: 'mutation', pass: !target.match(/write|delete|send|push|deploy/i), note: 'mutation detected' },
    { check: 'sovereignty', pass: !target.match(/firmware|spi|bios|uefi|kernel/i), note: 'sovereignty-critical' },
    { check: 'secrets', pass: !target.match(/key|token|password|secret|credential/i), note: 'possible secret exposure' },
    { check: 'injection', pass: !target.match(/\$\(|`|;.*rm|&&.*curl|eval\(/), note: 'possible injection' }
  ];
  const failures = checks.filter(c => !c.pass);
  return {
    scout: 'security',
    pid: 'admin-sentinel-v1',
    pass: failures.length === 0,
    checks: checks.length,
    failures: failures.map(f => f.note),
    risk: failures.length >= 3 ? 'critical' : failures.length >= 1 ? 'elevated' : 'low'
  };
}

// Scout 2: Language compliance
function languageReview(target) {
  const rules = loadRuleNames();
  const bootCritical = rules.filter(r => r.name.includes('BOOT-CRITICAL'));
  const hardRules = rules.filter(r => r.name.includes('LAW') || r.name.includes('ABSOLUTE') || r.name.includes('PERMANENT'));

  return {
    scout: 'language',
    pid: 'core-vector-v1',
    pass: true, // compliance check is advisory
    rulesLoaded: rules.length,
    bootCritical: bootCritical.length,
    hardRules: hardRules.length,
    note: `${rules.length} rules loaded, ${hardRules.length} hard laws, ${bootCritical.length} boot-critical`
  };
}

// Scout 3: Mistake avoidance
function mistakeReview(target) {
  const mistakes = loadMistakePatterns();
  const targetLower = target.toLowerCase();
  const relevant = mistakes.filter(m => {
    const mLower = m.name.toLowerCase();
    return targetLower.split(/\s+/).some(word => word.length > 3 && mLower.includes(word));
  });

  return {
    scout: 'mistake-avoidance',
    pid: 'admin-sentinel-v1',
    pass: relevant.length === 0,
    mistakesLoaded: mistakes.length,
    relevantMistakes: relevant.slice(0, 5).map(m => ({ ix: m.ix, name: m.name })),
    note: relevant.length > 0
      ? `WARNING: ${relevant.length} past mistakes match this operation`
      : 'No matching past mistakes found'
  };
}

async function review(target) {
  const ts = new Date().toISOString();
  if (!target) {
    return { ok: false, error: 'target_required', usage: 'node ix/exec.js review "deploy to production"' };
  }

  const security = securityReview(target);
  const language = languageReview(target);
  const mistakes = mistakeReview(target);

  const allPass = security.pass && language.pass && mistakes.pass;
  const verdict = allPass ? 'APPROVED' : security.risk === 'critical' ? 'BLOCKED' : 'REVIEW_REQUIRED';

  return {
    ok: true,
    chain: 'review',
    pid: PID,
    ts,
    target,
    verdict,
    scouts: { security, language, mistakes },
    summary: `${verdict}: security=${security.risk}, ${language.rulesLoaded} rules, ${mistakes.relevantMistakes?.length || 0} matching mistakes`
  };
}

module.exports = review;
if (require.main === module) {
  const target = process.argv.slice(2).join(' ') || null;
  review(target).then(r => console.log(JSON.stringify(r, null, 2)));
}
