#!/usr/bin/env node
// IX chain: fabricate | PID: build-forge-v1 | Profile: asolaria
// MLC-style fabrication: compose existing skills + tools into new chains
// The Meta-Learning for Compositionality unit — learns to COMBINE
// Links: GNN (construction prediction) → skill-extract → Shannon (verify)
// Reference: IX-121 MLC, IX-492 Unified ML Flywheel, IX-518 Language V2.1
const fs = require('fs');
const path = require('path');

const INDEX_ROOT = path.join(__dirname, '..', '..', 'index');
const CHAINS_DIR = path.join(__dirname);

const PID = 'build-forge-v1';

// MLC unit: given a goal, find which existing skills/tools/chains compose to achieve it
function findComposable(goal, inventory) {
  const goalTokens = goal.toLowerCase().split(/[\s\-_,]+/).filter(t => t.length > 2);
  const scored = [];

  for (const item of inventory) {
    const itemTokens = [
      ...item.name.toLowerCase().split(/[\s\-_,]+/),
      ...item.tags.map(t => t.toLowerCase())
    ];
    const overlap = goalTokens.filter(gt => itemTokens.some(it => it.includes(gt) || gt.includes(it)));
    if (overlap.length > 0) {
      scored.push({ ...item, relevance: overlap.length / goalTokens.length, matchedTokens: overlap });
    }
  }

  return scored.sort((a, b) => b.relevance - a.relevance);
}

function readInventory(dir) {
  const fullDir = path.join(INDEX_ROOT, dir);
  if (!fs.existsSync(fullDir)) return [];
  return fs.readdirSync(fullDir).filter(f => f.endsWith('.md')).map(f => {
    const content = fs.readFileSync(path.join(fullDir, f), 'utf8');
    const nameMatch = content.match(/name:\s*(.+)/);
    const tagsMatch = content.match(/tags:\s*\[(.+)\]/);
    const chainMatch = content.match(/chain:\s*\[(.+)\]/);
    return {
      file: f, ix: f.replace('.md', ''), type: dir.replace('/', ''),
      name: nameMatch ? nameMatch[1].trim() : f,
      tags: tagsMatch ? tagsMatch[1].split(',').map(t => t.trim()) : [],
      chain: chainMatch ? chainMatch[1].split(',').map(t => t.trim()) : []
    };
  });
}

function listExistingChains() {
  return fs.readdirSync(CHAINS_DIR)
    .filter(f => f.endsWith('.js') && f !== 'fabricate.js')
    .map(f => f.replace('.js', ''));
}

async function fabricate(goal) {
  const ts = new Date().toISOString();
  if (!goal) {
    return { ok: false, error: 'goal_required', usage: 'node ix/exec.js fabricate "build cross-domain threat detector"' };
  }

  // Load full inventory
  const skills = readInventory('skills');
  const tools = readInventory('tools');
  const patterns = readInventory('patterns');
  const rules = readInventory('rules');
  const existingChains = listExistingChains();

  const allItems = [...skills, ...tools, ...patterns];

  // MLC composition: find what matches the goal
  const composable = findComposable(goal, allItems);
  const relevantRules = findComposable(goal, rules);

  // Build a chain proposal
  const topComponents = composable.slice(0, 8);
  const constraints = relevantRules.slice(0, 3);

  // Check if an existing chain already covers this
  const existingMatch = existingChains.find(c =>
    goal.toLowerCase().includes(c) || c.includes(goal.toLowerCase().split(' ')[0])
  );

  const proposal = {
    goal,
    components: topComponents.map(c => ({
      ix: c.ix, type: c.type, name: c.name,
      relevance: Math.round(c.relevance * 100) + '%',
      matchedTokens: c.matchedTokens
    })),
    constraints: constraints.map(r => ({ ix: r.ix, name: r.name })),
    existingChain: existingMatch || null,
    chainSteps: topComponents
      .filter(c => c.type === 'skills' || c.type === 'tools')
      .slice(0, 5)
      .map((c, i) => `Step ${i + 1}: ${c.name} (${c.ix})`),
    gateRequirements: {
      hookwall: 'PreToolUse on each step',
      gnn: 'construction prediction between steps',
      shannon: composable.some(c => c.tags.includes('security') || c.tags.includes('CRITICAL'))
        ? 'full scan required' : 'dry_run if risk < 5'
    }
  };

  return {
    ok: true,
    chain: 'fabricate',
    pid: PID,
    ts,
    proposal,
    inventory: { skills: skills.length, tools: tools.length, patterns: patterns.length, rules: rules.length, chains: existingChains.length },
    summary: `Found ${topComponents.length} composable components for "${goal}" with ${constraints.length} constraints`
  };
}

module.exports = fabricate;
if (require.main === module) {
  const goal = process.argv.slice(2).join(' ') || null;
  fabricate(goal).then(r => console.log(JSON.stringify(r, null, 2)));
}
