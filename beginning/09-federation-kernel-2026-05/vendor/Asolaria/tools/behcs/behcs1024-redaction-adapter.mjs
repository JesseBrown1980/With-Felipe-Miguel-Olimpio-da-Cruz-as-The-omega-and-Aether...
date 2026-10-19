#!/usr/bin/env node
// BEHCS-1024 P16 redaction adapter.
//
// Scans the bounded GitHub candidate set for private topology references and
// writes an internal redaction plan. It does not rewrite source by default.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..', '..');

const PATHS = {
  manifest: path.join(ROOT, 'reports', 'behcs1024-github-candidate-hash-manifest-20260513.json'),
  report: path.join(ROOT, 'reports', 'behcs1024-redaction-plan-20260513.md'),
  plan: path.join(ROOT, 'reports', 'behcs1024-redaction-plan-20260513.json'),
  feed: path.join(ROOT, 'data', 'behcs', 'dashboard-feeds', 'behcs1024-redaction-plan-latest.json'),
  outbox: path.join(ROOT, 'data', 'behcs', 'outbox.ndjson')
};

const SCANNERS = [
  {
    category: 'private_ip',
    severity: 'public_blocker',
    pattern: /\b(?:10\.(?:\d{1,3}\.){2}\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3})\b/g
  },
  {
    category: 'windows_path',
    severity: 'public_blocker',
    pattern: /\b[A-Za-z]:\\(?:[^\s"'`<>|;:]+\\)*[^\s"'`<>|;:]*/g
  },
  {
    category: 'android_path',
    severity: 'public_blocker',
    pattern: /\/(?:sdcard|storage\/emulated\/0|data\/data\/com\.termux\/files\/home)\/[^\s"'`<>)]*/g
  },
  {
    category: 'device_serial',
    severity: 'public_blocker',
    pattern: /\bR[A-Z0-9]{9,15}(?:_adb-tls-connect)?\b/g
  },
  {
    category: 'operator_label',
    severity: 'public_blocker',
    pattern: /\b(?:OP-[A-Z0-9_-]+|Jesse|Rayssa|jesse|rayssa)\b/g
  },
  {
    category: 'phone_model',
    severity: 'public_blocker',
    pattern: /\b(?:SM-[A-Z0-9]+|S2[24]\s*(?:Ultra|FE)|Galaxy\s+S\d+\s*(?:Ultra|FE)?)\b/gi
  }
];

function parseArgs(argv) {
  const flags = {
    manifest: PATHS.manifest,
    includeRaw: false,
    strict: false,
    maxFindingsPerFile: 500
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--manifest' && next) { flags.manifest = path.resolve(next); index += 1; }
    else if (arg === '--include-raw') flags.includeRaw = true;
    else if (arg === '--strict') flags.strict = true;
    else if (arg === '--max-findings-per-file' && next) {
      flags.maxFindingsPerFile = Math.max(1, Number(next) || flags.maxFindingsPerFile);
      index += 1;
    }
  }
  return flags;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sha16(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function appendNdjson(filePath, row) {
  ensureDir(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(row)}\n`, 'utf8');
}

function candidatePaths(manifest) {
  const groups = manifest.groups || {};
  return Object.values(groups)
    .flat()
    .map((entry) => entry.path)
    .filter(Boolean);
}

function normalizePathForReport(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function maskValue(category, value) {
  if (category === 'private_ip') {
    const parts = value.split('.');
    return `${parts[0]}.${parts[1]}.x.x`;
  }
  if (category === 'windows_path') {
    const drive = value.slice(0, 2).toUpperCase();
    const base = path.win32.basename(value);
    return `${drive}\\...\\${base || 'path'}`;
  }
  if (category === 'android_path') {
    const base = path.posix.basename(value);
    return `/.../${base || 'path'}`;
  }
  if (category === 'device_serial') return `${value.slice(0, 2)}...${value.slice(-2)}`;
  if (category === 'operator_label') return value.startsWith('OP-') ? 'OP-...' : 'operator_name';
  if (category === 'phone_model') return value.toUpperCase().startsWith('SM-') ? 'SM-...' : 'phone_model';
  return 'redacted_value';
}

function suffixAfter(value, marker) {
  const at = value.toLowerCase().indexOf(marker.toLowerCase());
  if (at < 0) return '';
  return value.slice(at + marker.length);
}

function suggestedReplacement(category, value) {
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
  if (category === 'operator_label' && value === 'json') return true;
  return false;
}

function scanFile(filePath, relPath, flags) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const findings = [];
  const seen = new Set();
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    for (const scanner of SCANNERS) {
      const pattern = new RegExp(scanner.pattern.source, scanner.pattern.flags);
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const value = match[0];
        if (shouldSkip(scanner.category, value)) continue;
        const signature = `${scanner.category}:${lineIndex + 1}:${match.index}:${value}`;
        if (seen.has(signature)) continue;
        seen.add(signature);
        const finding = {
          path: relPath,
          line: lineIndex + 1,
          column: match.index + 1,
          category: scanner.category,
          severity: scanner.severity,
          value_sha16: sha16(value),
          masked_value: maskValue(scanner.category, value),
          suggested_replacement: suggestedReplacement(scanner.category, value)
        };
        if (flags.includeRaw) finding.raw_value = value;
        findings.push(finding);
        if (findings.length >= flags.maxFindingsPerFile) return findings;
      }
    }
  }
  return findings;
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function catalogFindings(findings) {
  const byValue = new Map();
  for (const finding of findings) {
    const key = `${finding.category}:${finding.value_sha16}`;
    const existing = byValue.get(key);
    if (!existing) {
      byValue.set(key, {
        category: finding.category,
        severity: finding.severity,
        value_sha16: finding.value_sha16,
        masked_value: finding.masked_value,
        suggested_replacement: finding.suggested_replacement,
        occurrences: 1,
        first_seen: {
          path: finding.path,
          line: finding.line
        }
      });
    } else {
      existing.occurrences += 1;
    }
  }
  return [...byValue.values()].sort((a, b) => {
    if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
    return `${a.category}:${a.value_sha16}`.localeCompare(`${b.category}:${b.value_sha16}`);
  });
}

function writeReport(plan) {
  const counts = plan.counts.by_category;
  const fileRows = Object.entries(plan.counts.by_file)
    .sort((a, b) => b[1] - a[1])
    .map(([file, count]) => `- ${file}: ${count}`);
  const catalogRows = plan.redaction_catalog
    .slice(0, 40)
    .map((row) => `- ${row.category} ${row.value_sha16} (${row.occurrences}x) -> \`${row.suggested_replacement}\``);

  const lines = [
    '# BEHCS-1024 P16 Redaction Plan',
    '',
    `Generated: ${plan.generated_at}`,
    `Candidate files scanned: ${plan.files_scanned}`,
    `Findings: ${plan.findings_total}`,
    `Public promotion: ${plan.public_projection.status}`,
    '',
    '## Category Counts',
    '',
    ...Object.keys(counts).sort().map((key) => `- ${key}: ${counts[key]}`),
    '',
    '## Files With Findings',
    '',
    ...(fileRows.length ? fileRows : ['- none']),
    '',
    '## Redaction Catalog',
    '',
    ...(catalogRows.length ? catalogRows : ['- none']),
    '',
    '## Required Next Actions',
    '',
    '- Move private hosts, device serials, and local roots into env/config placeholders.',
    '- Keep Group D docs internal-only until sanitized summaries exist.',
    '- Re-run this adapter before any public projection or GitHub commit candidate promotion.',
    '- Use `--include-raw` only on a private terminal when making manual source edits.'
  ];

  ensureDir(PATHS.report);
  fs.writeFileSync(PATHS.report, `${lines.join('\n')}\n`, 'utf8');
}

const flags = parseArgs(process.argv);
const manifest = readJson(flags.manifest);
const candidates = candidatePaths(manifest);
const findings = [];
const missing = [];
const scanned = [];

for (const relPath of candidates) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    missing.push(relPath);
    continue;
  }
  scanned.push({
    path: relPath,
    sha256: sha256File(fullPath),
    bytes: fs.statSync(fullPath).size
  });
  findings.push(...scanFile(fullPath, relPath, flags));
}

const blockerCount = findings.filter((finding) => finding.severity === 'public_blocker').length;
const plan = {
  ok: true,
  artifact: 'behcs1024-p16-redaction-plan',
  generated_at: new Date().toISOString(),
  scope: 'Acer BEHCS-1024 bounded source candidate set',
  mode: flags.includeRaw ? 'private_raw_values_included' : 'safe_fingerprints_only',
  manifest: normalizePathForReport(flags.manifest),
  files_scanned: scanned.length,
  files_missing: missing.length,
  missing,
  findings_total: findings.length,
  blocker_findings: blockerCount,
  counts: {
    by_category: countBy(findings, 'category'),
    by_file: countBy(findings, 'path')
  },
  redaction_catalog: catalogFindings(findings),
  findings,
  scanned_files: scanned,
  public_projection: {
    status: blockerCount > 0 ? 'blocked_until_redacted' : 'clear_for_private_review',
    blockers: blockerCount,
    rule: 'no public push with private topology references'
  },
  outputs: {
    report: normalizePathForReport(PATHS.report),
    plan: normalizePathForReport(PATHS.plan),
    dashboard_feed: normalizePathForReport(PATHS.feed)
  }
};

writeJson(PATHS.plan, plan);
writeJson(PATHS.feed, plan);
writeReport(plan);

appendNdjson(PATHS.outbox, {
  id: `acer-behcs1024-redaction-plan-${sha16(JSON.stringify({
    generated_at: plan.generated_at,
    files_scanned: plan.files_scanned,
    findings_total: plan.findings_total,
    catalog: plan.redaction_catalog
  }))}`,
  from: 'acer',
  to: 'federation',
  actor: 'codex-acer',
  mode: 'real',
  type: 'BEHCS1024_REDACTION_PLAN',
  verb: 'EVT-ACER-BEHCS1024-REDACTION-PLAN-READY',
  ts: plan.generated_at,
  body: {
    files_scanned: plan.files_scanned,
    findings_total: plan.findings_total,
    blocker_findings: plan.blocker_findings,
    counts: plan.counts,
    public_projection: plan.public_projection,
    outputs: plan.outputs,
    raw_values_included: flags.includeRaw
  }
});

console.log(JSON.stringify({
  ok: true,
  files_scanned: plan.files_scanned,
  findings_total: plan.findings_total,
  blocker_findings: plan.blocker_findings,
  counts: plan.counts.by_category,
  public_projection: plan.public_projection,
  outputs: plan.outputs
}, null, 2));

if (flags.strict && blockerCount > 0) process.exit(2);
