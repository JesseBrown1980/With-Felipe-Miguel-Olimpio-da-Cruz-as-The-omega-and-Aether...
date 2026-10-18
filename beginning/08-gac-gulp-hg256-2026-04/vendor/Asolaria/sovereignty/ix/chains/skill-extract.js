#!/usr/bin/env node
// IX chain: skill-extract | PID: build-forge-v1 | Profile: asolaria
// Extracts skills from successful patterns: tool usage → pattern → skill template
// Links: GNN (construction watcher) → hookwall (TaskCompleted) → IX index
// Reference: IX-321 self-indexing rule, IX-518 Language V2.1
const fs = require('fs');
const path = require('path');

const TOOLS_DIR = path.join(__dirname, '..', '..', 'index', 'tools');
const SKILLS_DIR = path.join(__dirname, '..', '..', 'index', 'skills');
const PATTERNS_DIR = path.join(__dirname, '..', '..', 'index', 'patterns');

const PID = 'build-forge-v1';

function listEntries(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    const nameMatch = content.match(/name:\s*(.+)/);
    const tagsMatch = content.match(/tags:\s*\[(.+)\]/);
    return {
      file: f,
      ix: f.replace('.md', ''),
      name: nameMatch ? nameMatch[1].trim() : f,
      tags: tagsMatch ? tagsMatch[1].split(',').map(t => t.trim()) : []
    };
  });
}

function findToolsWithoutSkills(tools, skills) {
  const skillNames = new Set(skills.map(s => s.name.toLowerCase()));
  const skillTags = new Set(skills.flatMap(s => s.tags.map(t => t.toLowerCase())));
  return tools.filter(t => {
    const tName = t.name.toLowerCase();
    const tTags = t.tags.map(tag => tag.toLowerCase());
    // Tool has no matching skill if neither name nor tags overlap
    const nameMatch = skillNames.has(tName) || [...skillNames].some(sn => sn.includes(tName) || tName.includes(sn));
    const tagMatch = tTags.some(tt => skillTags.has(tt));
    return !nameMatch && !tagMatch;
  });
}

function findPatternsWithoutSkills(patterns, skills) {
  const skillTags = new Set(skills.flatMap(s => s.tags.map(t => t.toLowerCase())));
  return patterns.filter(p => {
    const pTags = p.tags.map(t => t.toLowerCase());
    return !pTags.some(pt => skillTags.has(pt));
  }).filter(p => {
    // Only patterns that look like they SHOULD be skills (reusable, actionable)
    const name = p.name.toLowerCase();
    return name.includes('skill') || name.includes('how') || name.includes('method') ||
           name.includes('breakthrough') || name.includes('milestone') || name.includes('protocol');
  });
}

async function skillExtract(arg) {
  const ts = new Date().toISOString();
  const tools = listEntries(TOOLS_DIR);
  const skills = listEntries(SKILLS_DIR);
  const patterns = listEntries(PATTERNS_DIR);

  const toolGaps = findToolsWithoutSkills(tools, skills);
  const patternGaps = findPatternsWithoutSkills(patterns, skills);

  return {
    ok: true,
    chain: 'skill-extract',
    pid: PID,
    ts,
    inventory: { tools: tools.length, skills: skills.length, patterns: patterns.length },
    toolGaps: toolGaps.slice(0, 15).map(t => ({ ix: t.ix, name: t.name })),
    patternGaps: patternGaps.slice(0, 15).map(p => ({ ix: p.ix, name: p.name })),
    summary: `${tools.length} tools, ${skills.length} skills, ${patterns.length} patterns | ${toolGaps.length} tools need skills, ${patternGaps.length} patterns could become skills`
  };
}

module.exports = skillExtract;
if (require.main === module) skillExtract().then(r => console.log(JSON.stringify(r, null, 2)));
