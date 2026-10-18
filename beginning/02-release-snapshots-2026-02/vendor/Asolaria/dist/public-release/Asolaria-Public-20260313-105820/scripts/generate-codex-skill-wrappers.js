#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  discoverCodexSkills,
  buildCodexWrapperSkillId,
  buildCodexWrapperFolderName
} = require("../src/codexSkillCatalog");
const { listSkillSummaries } = require("../src/skillRegistry");

const ROOT = path.join(__dirname, "..");
const SKILLS_ROOT = path.join(ROOT, "skills");

function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  const out = {
    all: false,
    limit: 10,
    overwrite: false,
    dryRun: false,
    scope: "all"
  };
  for (const arg of args) {
    const raw = String(arg || "").trim();
    if (!raw) continue;
    if (raw === "--all") {
      out.all = true;
      continue;
    }
    if (raw === "--overwrite") {
      out.overwrite = true;
      continue;
    }
    if (raw === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    if (raw.startsWith("--limit=")) {
      const parsed = Number(raw.slice("--limit=".length));
      if (Number.isFinite(parsed) && parsed > 0) {
        out.limit = Math.min(5000, Math.max(1, Math.round(parsed)));
      }
      continue;
    }
    if (raw.startsWith("--scope=")) {
      const value = String(raw.slice("--scope=".length)).trim().toLowerCase();
      if (value === "all" || value === "custom" || value === "system") {
        out.scope = value;
      }
      continue;
    }
  }
  return out;
}

function shouldIncludeByScope(item, scope) {
  if (scope === "all") return true;
  return String(item.scope || "").trim().toLowerCase() === scope;
}

function buildWrapperSkillDef(item) {
  const codexId = String(item.id || "").trim().toLowerCase();
  const codexName = String(item.name || path.basename(String(item.relativePath || codexId || "skill"))).trim();
  const scope = String(item.scope || "custom").trim().toLowerCase();
  const wrapperSkillId = String(item.wrapperSkillId || buildCodexWrapperSkillId(item.relativePath || codexId)).trim().toLowerCase();
  const relativePath = String(item.relativePath || "").trim();
  const fullPath = String(item.fullPath || "").trim();
  const labels = ["source:codex", `scope:${scope}`, "integration:wrapper"];
  const safeTitle = `Codex Wrapper: ${codexName}`.slice(0, 120);
  const safeDescription = `Reference wrapper for local Codex skill "${codexId}" (${relativePath || "unknown path"}).`;

  return {
    id: wrapperSkillId,
    title: safeTitle,
    description: safeDescription,
    version: "0.1.0",
    risk: "low",
    tags: ["codex", "wrapper", "reference", `scope:${scope}`],
    permissions: [],
    steps: [
      {
        action: "codex_skill_reference",
        note: `Expose reference metadata for Codex skill ${codexId}.`,
        payload: {
          source: "codex",
          integration: "wrapper",
          wrapperSkillId,
          codexId,
          codexName,
          scope,
          relativePath,
          fullPath,
          labels
        }
      }
    ]
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const existingAsolariaIds = listSkillSummaries().map((item) => item.id);
  const catalog = discoverCodexSkills({
    asolariaSkillIds: existingAsolariaIds
  });

  let candidates = catalog.items.filter((item) => shouldIncludeByScope(item, options.scope));
  candidates.sort((a, b) => String(a.id || "").localeCompare(String(b.id || "")));
  if (!options.all) {
    candidates = candidates.slice(0, options.limit);
  }

  const results = {
    generatedAt: new Date().toISOString(),
    options,
    discoveredTotal: catalog.total,
    candidateTotal: candidates.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    files: []
  };

  for (const item of candidates) {
    const wrapperSkillId = String(item.wrapperSkillId || buildCodexWrapperSkillId(item.relativePath || item.id)).trim().toLowerCase();
    const wrapperFolder = String(item.wrapperFolder || buildCodexWrapperFolderName(item.relativePath || item.id)).trim().toLowerCase();
    const dirPath = path.join(SKILLS_ROOT, wrapperFolder);
    const filePath = path.join(dirPath, "skill.json");
    const exists = fs.existsSync(filePath);
    if (exists && !options.overwrite) {
      results.skipped += 1;
      results.files.push({
        codexId: item.id,
        skillId: wrapperSkillId,
        filePath,
        status: "skipped_exists"
      });
      continue;
    }
    try {
      const skill = buildWrapperSkillDef({
        ...item,
        wrapperSkillId,
        wrapperFolder
      });
      if (!options.dryRun) {
        writeJson(filePath, skill);
      }
      if (exists) {
        results.updated += 1;
      } else {
        results.created += 1;
      }
      results.files.push({
        codexId: item.id,
        skillId: wrapperSkillId,
        filePath,
        status: exists ? "updated" : "created"
      });
    } catch (error) {
      results.errors += 1;
      results.files.push({
        codexId: item.id,
        skillId: wrapperSkillId,
        filePath,
        status: "error",
        error: String(error && error.message ? error.message : error || "unknown_error")
      });
    }
  }

  console.log(JSON.stringify(results, null, 2));
  if (results.errors > 0) {
    process.exitCode = 1;
  }
}

main();
