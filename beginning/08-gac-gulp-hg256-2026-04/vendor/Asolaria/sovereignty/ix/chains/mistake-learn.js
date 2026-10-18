#!/usr/bin/env node
// IX chain: mistake-learn | PID: admin-sentinel-v1 | Profile: asolaria
// Mistake→Skill loop: detect mistake → record → correlate → extract skill → index
// Links: hookwall (PostToolUseFailure) → GNN (pattern edge) → Shannon (if risk≥5)
// Reference: IX-491 L3 History, IX-518 Language V2.1
const fs = require('fs');
const path = require('path');

const MISTAKES_DIR = path.join(__dirname, '..', '..', 'index', 'mistakes');
const SKILLS_DIR = path.join(__dirname, '..', '..', 'index', 'skills');
const LEDGER_PATH = path.join(__dirname, '..', '..', 'data', 'mistake-ledger.ndjson');

const PID = 'admin-sentinel-v1';
const PROFILE = { pid: PID, permissionTier: 'trusted_agent', actorClass: 'colony' };

function readLedger(maxLines = 100) {
  if (!fs.existsSync(LEDGER_PATH)) return [];
  const lines = fs.readFileSync(LEDGER_PATH, 'utf8').trim().split('\n').slice(-maxLines);
  return lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}

function countByPattern(entries) {
  const patterns = {};
  for (const e of entries) {
    const key = e.pattern || e.action || e.error || 'unknown';
    patterns[key] = (patterns[key] || 0) + 1;
  }
  return Object.entries(patterns).sort((a, b) => b[1] - a[1]);
}

function findExistingSkill(pattern) {
  if (!fs.existsSync(SKILLS_DIR)) return null;
  const files = fs.readdirSync(SKILLS_DIR).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(SKILLS_DIR, file), 'utf8');
    if (content.toLowerCase().includes(pattern.toLowerCase())) return file;
  }
  return null;
}

function findExistingMistake(pattern) {
  if (!fs.existsSync(MISTAKES_DIR)) return null;
  const files = fs.readdirSync(MISTAKES_DIR).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(MISTAKES_DIR, file), 'utf8');
    if (content.toLowerCase().includes(pattern.toLowerCase())) return file;
  }
  return null;
}

async function mistakeLearn(arg) {
  const ts = new Date().toISOString();
  const entries = readLedger(200);
  const patterns = countByPattern(entries);
  const recentCount = entries.length;

  // Find patterns that repeat 3+ times (candidates for skill extraction)
  const recurring = patterns.filter(([, count]) => count >= 3);

  // For each recurring pattern, check if a skill already exists
  const gaps = [];
  const covered = [];
  for (const [pattern, count] of recurring) {
    const skill = findExistingSkill(pattern);
    const mistake = findExistingMistake(pattern);
    if (skill) {
      covered.push({ pattern, count, skill, mistake });
    } else {
      gaps.push({ pattern, count, mistake, needsSkill: true });
    }
  }

  // Build GNN training signal: mistake→skill edges
  const gnnEdges = recurring.map(([pattern, count]) => ({
    source: `mistake:${pattern}`,
    target: findExistingSkill(pattern) ? `skill:${findExistingSkill(pattern)}` : `gap:${pattern}`,
    action: findExistingSkill(pattern) ? 'has_cure' : 'needs_cure',
    riskScore: count >= 5 ? 7 : count >= 3 ? 5 : 3,
    count
  }));

  return {
    ok: true,
    chain: 'mistake-learn',
    pid: PID,
    ts,
    ledger: { total: recentCount, patterns: patterns.length, recurring: recurring.length },
    gaps: gaps.slice(0, 10),
    covered: covered.slice(0, 10),
    gnnEdges: gnnEdges.slice(0, 20),
    summary: `${recurring.length} recurring patterns, ${gaps.length} need skills, ${covered.length} already cured`
  };
}

module.exports = mistakeLearn;
if (require.main === module) mistakeLearn().then(r => console.log(JSON.stringify(r, null, 2)));
