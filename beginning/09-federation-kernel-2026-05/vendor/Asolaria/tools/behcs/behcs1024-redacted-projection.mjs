#!/usr/bin/env node
// BEHCS-1024 redacted projection builder.
//
// Produces sanitized copies of bounded GitHub candidate files under
// projections/. Source files are never modified.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..', '..');

const DEFAULT_PROJECTION_ID = 'behcs1024-github-candidate-20260513';
const PATHS = {
  manifest: path.join(ROOT, 'reports', 'behcs1024-github-candidate-hash-manifest-20260513.json'),
  redactionPlan: path.join(ROOT, 'reports', 'behcs1024-redaction-plan-20260513.json'),
  outbox: path.join(ROOT, 'data', 'behcs', 'outbox.ndjson'),
  feed: path.join(ROOT, 'data', 'behcs', 'dashboard-feeds', 'behcs1024-redacted-projection-latest.json'),
  report: path.join(ROOT, 'reports', 'behcs1024-redacted-projection-20260513.md'),
  envTemplate: path.join(ROOT, 'reports', 'behcs1024-redacted-projection-env-template-20260513.env'),
  summary: path.join(ROOT, 'reports', 'behcs1024-redacted-projection-20260513.json')
};

const SCANNERS = [
  {
    category: 'private_ip',
    pattern: /\b(?:10\.(?:\d{1,3}\.){2}\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3})\b/g
  },
  {
    category: 'windows_path',
    pattern: /\b[A-Za-z]:\\(?:[^\s"'`<>|;:]+\\)*[^\s"'`<>|;:]*/g
  },
  {
    category: 'android_path',
    pattern: /\/(?:sdcard|storage\/emulated\/0|data\/data\/com\.termux\/files\/home)\/[^\s"'`<>)]*/g
  },
  {
    category: 'device_serial',
    pattern: /\bR[A-Z0-9]{9,15}(?:_adb-tls-connect)?\b/g
  },
  {
    category: 'operator_label',
    pattern: /\b(?:OP-[A-Z0-9_-]+|Jesse|Rayssa|jesse|rayssa)\b/g
  },
  {
    category: 'phone_model',
    pattern: /\b(?:SM-[A-Z0-9]+|S2[24]\s*(?:Ultra|FE)|Galaxy\s+S\d+\s*(?:Ultra|FE)?)\b/gi
  }
];

function parseArgs(argv) {
  const flags = {
    manifest: PATHS.manifest,
    redactionPlan: PATHS.redactionPlan,
    projectionId: DEFAULT_PROJECTION_ID,
    clean: false
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--manifest' && next) { flags.manifest = path.resolve(next); index += 1; }
    else if (arg === '--plan' && next) { flags.redactionPlan = path.resolve(next); index += 1; }
    else if (arg === '--projection-id' && next) { flags.projectionId = next.replace(/[^a-zA-Z0-9._-]/g, '-'); index += 1; }
    else if (arg === '--clean') flags.clean = true;
  }
  flags.outDir = path.join(ROOT, 'staging', flags.projectionId);
  return flags;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function appendNdjson(filePath, row) {
  ensureDir(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(row)}\n`, 'utf8');
}

function sha16(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function normalize(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function candidateEntries(manifest) {
  const entries = [];
  for (const [group, rows] of Object.entries(manifest.groups || {})) {
    for (const row of rows || []) {
      if (row.path) entries.push({ ...row, group });
    }
  }
  return entries;
}

function redactionCatalog(plan) {
  const catalog = new Map();
  for (const row of plan.redaction_catalog || []) {
    if (!row.category || !row.value_sha16 || !row.suggested_replacement) continue;
    catalog.set(`${row.category}:${row.value_sha16}`, row.suggested_replacement);
  }
  return catalog;
}

function suffixAfter(value, marker) {
  const at = value.toLowerCase().indexOf(marker.toLowerCase());
  if (at < 0) return '';
  return value.slice(at + marker.length);
}

function replacementFor(category, value) {
  if (category === 'private_ip') return '${BEHCS_PRIVATE_HOST}';
  if (category === 'device_serial') return '${BEHCS_DEVICE_SERIAL}';
  if (category === 'operator_label') return value.startsWith('OP-') ? '${BEHCS_OPERATOR_LABEL}' : '${BEHCS_OPERATOR_NAME}';
  if (category === 'phone_model') return '${BEHCS_DEVICE_MODEL}';
  if (category === 'android_path') {
    if (value.startsWith('/sdcard/Asolaria')) return '${ANDROID_ASOLARIA_ROOT}' + suffixAfter(value, '/sdcard/Asolaria');
    if (value.startsWith('/storage/emulated/0/Asolaria')) return '${ANDROID_ASOLARIA_ROOT}' + suffixAfter(value, '/storage/emulated/0/Asolaria');
    if (value.startsWith('/data/data/com.termux/files/home')) return '${TERMUX_HOME}' + suffixAfter(value, '/data/data/com.termux/files/home');
    return '${ANDROID_LOCAL_PATH}';
  }
  if (category === 'windows_path') {
    const lower = value.toLowerCase();
    if (lower.includes('\\asolaria')) return '${ASOLARIA_ROOT}' + suffixAfter(value, '\\Asolaria');
    if (lower.startsWith('c:\\users\\acer')) return '${USER_HOME}' + suffixAfter(value, 'C:\\Users\\acer');
    if (lower.startsWith('c:\\nvm4w')) return '${NODE_HOME}' + suffixAfter(value, 'C:\\nvm4w');
    return '${WINDOWS_LOCAL_PATH}';
  }
  return '${BEHCS_REDACTED_VALUE}';
}

function shouldSkip(category, value) {
  if (!value || value.length < 3) return true;
  if (category === 'windows_path' && /^[A-Za-z]:\\$/.test(value)) return true;
  return false;
}

function redactContent(text, catalog) {
  const findings = [];
  const unplanned = [];
  let output = text;
  for (const scanner of SCANNERS) {
    const pattern = new RegExp(scanner.pattern.source, scanner.pattern.flags);
    output = output.replace(pattern, (match) => {
      if (shouldSkip(scanner.category, match)) return match;
      const valueHash = sha16(match);
      const catalogKey = `${scanner.category}:${valueHash}`;
      const plannedReplacement = catalog.get(catalogKey);
      const replacement = plannedReplacement || replacementFor(scanner.category, match);
      if (!plannedReplacement) {
        unplanned.push({
          category: scanner.category,
          value_sha16: valueHash,
          fallback_replacement: replacement
        });
      }
      findings.push({
        category: scanner.category,
        value_sha16: valueHash,
        replacement,
        replacement_sha16: sha16(replacement),
        planned: Boolean(plannedReplacement)
      });
      return replacement;
    });
  }
  return { output, findings, unplanned };
}

function scanRemaining(text) {
  const remaining = [];
  const lines = text.split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    for (const scanner of SCANNERS) {
      const pattern = new RegExp(scanner.pattern.source, scanner.pattern.flags);
      let match;
      while ((match = pattern.exec(line)) !== null) {
        if (shouldSkip(scanner.category, match[0])) continue;
        remaining.push({
          category: scanner.category,
          line: lineIndex + 1,
          value_sha16: sha16(match[0])
        });
      }
    }
  }
  return remaining;
}

function normalizeProjectedText(text, relPath) {
  if (!relPath.toLowerCase().endsWith('.md')) return text;
  return `${text
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n+$/g, '')}\n`;
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function uniqueEnvKeys(findings) {
  const keys = new Set();
  for (const finding of findings) {
    const matches = finding.replacement.match(/\$\{([A-Z0-9_]+)\}/g) || [];
    for (const match of matches) keys.add(match.slice(2, -1));
  }
  return [...keys].sort();
}

function writeEnvExample(outDir, keys) {
  const lines = [
    '# BEHCS-1024 public projection env example',
    '# Fill deployment-specific values outside Git.',
    ''
  ];
  for (const key of keys) lines.push(`${key}=`);
  const content = `${lines.join('\n')}\n`;
  fs.writeFileSync(path.join(outDir, '.env.example'), content, 'utf8');
  ensureDir(PATHS.envTemplate);
  fs.writeFileSync(PATHS.envTemplate, content, 'utf8');
}

function writeReadme(outDir, summary) {
  const lines = [
    '# BEHCS-1024 Redacted GitHub Candidate Projection',
    '',
    `Generated: ${summary.generated_at}`,
    '',
    'This directory contains sanitized copies of bounded candidate files only.',
    'It is not a replacement for the live Acer source tree.',
    '',
    '## Status',
    '',
    `- Files projected: ${summary.files_projected}`,
    `- Redactions applied: ${summary.redactions_applied}`,
    `- Remaining blockers: ${summary.remaining_blockers}`,
    `- Public projection: ${summary.public_projection.status}`,
    '',
    '## Rules',
    '',
    '- Review before staging or committing.',
    '- Keep runtime data, screenshots, bus receipts, and private topology out of Git.',
    '- Fill `.env.example` values outside the repository.'
  ];
  fs.writeFileSync(path.join(outDir, 'README.md'), `${lines.join('\n')}\n`, 'utf8');
}

function writeReport(summary) {
  const categoryRows = Object.entries(summary.counts.by_category)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => `- ${category}: ${count}`);
  const fileRows = summary.files
    .filter((file) => file.redactions > 0 || file.remaining_blockers > 0)
    .sort((a, b) => b.redactions - a.redactions)
    .map((file) => `- ${file.path}: ${file.redactions} redactions, ${file.remaining_blockers} remaining blockers`);

  const lines = [
    '# BEHCS-1024 Redacted Projection',
    '',
    `Generated: ${summary.generated_at}`,
    `Projection: ${summary.projection}`,
    '',
    '## Summary',
    '',
    `- Files considered: ${summary.files_considered}`,
    `- Files projected: ${summary.files_projected}`,
    `- Redactions applied: ${summary.redactions_applied}`,
    `- Remaining blockers: ${summary.remaining_blockers}`,
    `- Public projection: ${summary.public_projection.status}`,
    '',
    '## Redactions By Category',
    '',
    ...(categoryRows.length ? categoryRows : ['- none']),
    '',
    '## Files Requiring Review',
    '',
    ...(fileRows.length ? fileRows : ['- none']),
    '',
    '## Outputs',
    '',
    `- Projection directory: \`${summary.projection}\``,
    `- Projection manifest: \`${summary.outputs.projection_manifest}\``,
    `- Env example: \`${summary.outputs.env_example}\``,
    '',
    '## Decision',
    '',
    summary.remaining_blockers === 0
      ? 'The projected copy has no scanner-visible private topology blockers. It still requires human review before staging.'
      : 'Projection remains blocked; scanner-visible private topology remains in projected copies.'
  ];
  ensureDir(PATHS.report);
  fs.writeFileSync(PATHS.report, `${lines.join('\n')}\n`, 'utf8');
}

const flags = parseArgs(process.argv);
const manifest = readJson(flags.manifest);
const plan = readJson(flags.redactionPlan);
const catalog = redactionCatalog(plan);
const entries = candidateEntries(manifest);

if (flags.clean && fs.existsSync(flags.outDir)) {
  fs.rmSync(flags.outDir, { recursive: true, force: true });
}
fs.mkdirSync(flags.outDir, { recursive: true });

const files = [];
const allFindings = [];
const allUnplanned = [];
let filesProjected = 0;
let remainingBlockers = 0;

for (const entry of entries) {
  const sourcePath = path.join(ROOT, entry.path);
  if (!fs.existsSync(sourcePath)) {
    files.push({ path: entry.path, group: entry.group, status: 'missing', redactions: 0, remaining_blockers: 0 });
    continue;
  }

  const original = fs.readFileSync(sourcePath, 'utf8');
  const redacted = redactContent(original, catalog);
  const output = normalizeProjectedText(redacted.output, entry.path);
  const findings = redacted.findings;
  const unplanned = redacted.unplanned;
  const remaining = scanRemaining(output);
  const projectedPath = path.join(flags.outDir, entry.path);
  ensureDir(projectedPath);
  fs.writeFileSync(projectedPath, output, 'utf8');

  filesProjected += 1;
  remainingBlockers += remaining.length;
  allFindings.push(...findings.map((finding) => ({ ...finding, path: entry.path, group: entry.group })));
  allUnplanned.push(...unplanned.map((finding) => ({ ...finding, path: entry.path, group: entry.group })));
  files.push({
    path: entry.path,
    group: entry.group,
    status: remaining.length > 0 ? 'projected_with_remaining_blockers' : 'projected',
    source_sha256: sha256(original),
    projected_sha256: sha256(output),
    bytes: Buffer.byteLength(output),
    redactions: findings.length,
    planned_redactions: findings.filter((finding) => finding.planned).length,
    fallback_redactions: findings.filter((finding) => !finding.planned).length,
    remaining_blockers: remaining.length,
    remaining_categories: countBy(remaining, 'category')
  });
}

const envKeys = uniqueEnvKeys(allFindings);
writeEnvExample(flags.outDir, envKeys);

const summary = {
  ok: true,
  artifact: 'behcs1024-redacted-github-candidate-projection',
  generated_at: new Date().toISOString(),
  projection: normalize(flags.outDir),
  source_manifest: normalize(flags.manifest),
  redaction_plan: normalize(flags.redactionPlan),
  redaction_catalog_entries: catalog.size,
  files_considered: entries.length,
  files_projected: filesProjected,
  redactions_applied: allFindings.length,
  planned_redactions: allFindings.filter((finding) => finding.planned).length,
  fallback_redactions: allFindings.filter((finding) => !finding.planned).length,
  remaining_blockers: remainingBlockers,
  counts: {
    by_category: countBy(allFindings, 'category'),
    by_group: countBy(allFindings, 'group')
  },
  unplanned_fallbacks: allUnplanned,
  env_keys: envKeys,
  files,
  public_projection: {
    status: remainingBlockers === 0 ? 'scanner_clear_review_required' : 'blocked_remaining_topology',
    rule: 'sanitized projection only; source tree untouched'
  },
  outputs: {
    projection_manifest: `${normalize(flags.outDir)}/PROJECTION-MANIFEST.json`,
    env_example: `${normalize(flags.outDir)}/.env.example`,
    env_template: normalize(PATHS.envTemplate),
    report: normalize(PATHS.report),
    dashboard_feed: normalize(PATHS.feed)
  }
};

writeJson(path.join(flags.outDir, 'PROJECTION-MANIFEST.json'), summary);
writeReadme(flags.outDir, summary);
writeJson(PATHS.summary, summary);
writeJson(PATHS.feed, summary);
writeReport(summary);

appendNdjson(PATHS.outbox, {
  id: `acer-behcs1024-redacted-projection-${sha16(JSON.stringify({
    generated_at: summary.generated_at,
    projection: summary.projection,
    redactions_applied: summary.redactions_applied,
    remaining_blockers: summary.remaining_blockers
  }))}`,
  from: 'acer',
  to: 'federation',
  actor: 'codex-acer',
  mode: 'real',
  type: 'BEHCS1024_REDACTED_PROJECTION',
  verb: 'EVT-ACER-BEHCS1024-REDACTED-PROJECTION-READY',
  ts: summary.generated_at,
  body: {
    projection: summary.projection,
    files_projected: summary.files_projected,
    redactions_applied: summary.redactions_applied,
    remaining_blockers: summary.remaining_blockers,
    public_projection: summary.public_projection,
    outputs: summary.outputs
  }
});

console.log(JSON.stringify({
  ok: true,
  projection: summary.projection,
  files_projected: summary.files_projected,
  redactions_applied: summary.redactions_applied,
  remaining_blockers: summary.remaining_blockers,
  public_projection: summary.public_projection,
  outputs: summary.outputs
}, null, 2));
