#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SKILLS_ROOT = path.join(ROOT, "skills");
const ALLOWED_RISKS = new Set(["low", "medium", "high", "critical"]);

function parseArgs(argv) {
  const out = {
    mapPath: "",
    dryRun: false,
    failOnMissing: false,
    mode: "map_only"
  };
  for (const arg of Array.isArray(argv) ? argv : []) {
    const raw = String(arg || "").trim();
    if (!raw) continue;
    if (raw === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    if (raw === "--fail-on-missing") {
      out.failOnMissing = true;
      continue;
    }
    if (raw.startsWith("--map=")) {
      out.mapPath = String(raw.slice("--map=".length)).trim();
      continue;
    }
    if (raw.startsWith("--mode=")) {
      const mode = String(raw.slice("--mode=".length)).trim().toLowerCase();
      if (mode === "map_only" || mode === "map_then_heuristic" || mode === "heuristic_only") {
        out.mode = mode;
      }
      continue;
    }
  }
  return out;
}

function normalizeRisk(value) {
  const risk = String(value || "").trim().toLowerCase();
  if (!ALLOWED_RISKS.has(risk)) return "";
  return risk;
}

function normalizeCodexKey(value) {
  return String(value || "").trim().toLowerCase();
}

function loadJson(filePath) {
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(text);
}

function normalizePolicyEntry(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const risk = normalizeRisk(value);
    if (!risk) return null;
    return { risk };
  }
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const risk = normalizeRisk(value.risk || value.level);
  if (!risk) return null;
  const out = { risk };
  if (Object.prototype.hasOwnProperty.call(value, "approvalRequired")) {
    out.approvalRequired = Boolean(value.approvalRequired);
  }
  return out;
}

function mapFromObject(obj) {
  const out = new Map();
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return out;
  for (const [keyRaw, valueRaw] of Object.entries(obj)) {
    const key = normalizeCodexKey(keyRaw);
    const entry = normalizePolicyEntry(valueRaw);
    if (!key || !entry) continue;
    out.set(key, entry);
  }
  return out;
}

function mapFromArray(rows) {
  const out = new Map();
  if (!Array.isArray(rows)) return out;
  for (const rowRaw of rows) {
    const row = rowRaw && typeof rowRaw === "object" ? rowRaw : {};
    const key = normalizeCodexKey(
      row.codexId
      || row.id
      || row.sourceSkill
      || row.skill
      || row.skillId
      || row.wrapperSkillId
      || row.wrapper
    );
    const entry = normalizePolicyEntry(row);
    if (!key || !entry) continue;
    out.set(key, entry);
  }
  return out;
}

function loadRiskPolicy(filePath) {
  const parsed = loadJson(filePath);
  const maps = [];
  let defaultRisk = "";
  let defaultApprovalRequired = undefined;
  if (Array.isArray(parsed)) {
    maps.push(mapFromArray(parsed));
  } else if (parsed && typeof parsed === "object") {
    maps.push(mapFromObject(parsed));
    if (Array.isArray(parsed.items)) maps.push(mapFromArray(parsed.items));
    if (Array.isArray(parsed.skills)) maps.push(mapFromArray(parsed.skills));
    if (Array.isArray(parsed.wrappers)) maps.push(mapFromArray(parsed.wrappers));
    if (parsed.overrides && typeof parsed.overrides === "object") maps.push(mapFromObject(parsed.overrides));
    if (parsed.riskMap && typeof parsed.riskMap === "object") maps.push(mapFromObject(parsed.riskMap));
    if (parsed.risk_by_skill && typeof parsed.risk_by_skill === "object") maps.push(mapFromObject(parsed.risk_by_skill));
    if (parsed.defaults && typeof parsed.defaults === "object") {
      const normalizedDefaultRisk = normalizeRisk(parsed.defaults.risk || parsed.defaults.level);
      if (normalizedDefaultRisk) {
        defaultRisk = normalizedDefaultRisk;
      }
      if (Object.prototype.hasOwnProperty.call(parsed.defaults, "approvalRequired")) {
        defaultApprovalRequired = Boolean(parsed.defaults.approvalRequired);
      }
    }
    if (parsed.riskPolicy && typeof parsed.riskPolicy === "object") {
      const nestedDefaults = parsed.riskPolicy.defaults && typeof parsed.riskPolicy.defaults === "object"
        ? parsed.riskPolicy.defaults
        : {};
      const nestedDefaultRisk = normalizeRisk(nestedDefaults.risk || nestedDefaults.level);
      if (nestedDefaultRisk) {
        defaultRisk = nestedDefaultRisk;
      }
      if (Object.prototype.hasOwnProperty.call(nestedDefaults, "approvalRequired")) {
        defaultApprovalRequired = Boolean(nestedDefaults.approvalRequired);
      }
    }
  }
  const entries = new Map();
  for (const m of maps) {
    for (const [k, v] of m.entries()) {
      entries.set(k, v);
    }
  }
  return {
    entries,
    defaultRisk,
    defaultApprovalRequired
  };
}

function listWrapperSkillFiles() {
  const out = [];
  let entries = [];
  try {
    entries = fs.readdirSync(SKILLS_ROOT, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = String(entry.name || "").trim().toLowerCase();
    if (!name.startsWith("codex-ref-")) continue;
    const filePath = path.join(SKILLS_ROOT, entry.name, "skill.json");
    if (fs.existsSync(filePath)) {
      out.push(filePath);
    }
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function inferHeuristicRisk(codexId) {
  const id = normalizeCodexKey(codexId);
  if (!id) return "low";
  if (/\bsecurity-threat-model\b/.test(id)) return "high";
  if (/\b(security-best-practices|security-ownership-map|gh-fix-ci|deploy)\b/.test(id)) return "medium";
  return "low";
}

function upsertTag(tags, tag) {
  const list = Array.isArray(tags) ? tags.slice(0, 32).map((x) => String(x || "").trim().toLowerCase()).filter(Boolean) : [];
  const filtered = list.filter((x) => !x.startsWith("risk:"));
  if (!filtered.includes(tag)) filtered.push(tag);
  return filtered;
}

function upsertApprovalTag(tags, required) {
  const list = Array.isArray(tags) ? tags.slice(0, 32).map((x) => String(x || "").trim().toLowerCase()).filter(Boolean) : [];
  const filtered = list.filter((x) => !x.startsWith("approval:"));
  const tag = required ? "approval:required" : "approval:none";
  if (!filtered.includes(tag)) filtered.push(tag);
  return filtered;
}

function readWrapperSkill(filePath) {
  const parsed = loadJson(filePath);
  const skill = parsed && typeof parsed === "object" ? parsed : {};
  const step0 = Array.isArray(skill.steps) && skill.steps.length > 0 ? skill.steps[0] : {};
  const payload = step0 && typeof step0.payload === "object" ? step0.payload : {};
  const codexId = normalizeCodexKey(payload.codexId || "");
  const wrapperSkillId = normalizeCodexKey(skill.id || payload.wrapperSkillId || "");
  return {
    filePath,
    skill,
    codexId,
    wrapperSkillId
  };
}

function resolvePolicyForWrapper(wrapper, riskPolicy, mode) {
  const keys = [
    normalizeCodexKey(wrapper.codexId),
    normalizeCodexKey(wrapper.wrapperSkillId),
    normalizeCodexKey(String(wrapper.wrapperSkillId || "").replace(/^codex\.ref\./, "")),
    normalizeCodexKey(String(wrapper.wrapperSkillId || "").replace(/^codex\.ref\./, "").replace(/\./g, "/"))
  ].filter(Boolean);

  let fromMap = null;
  const entries = riskPolicy && riskPolicy.entries instanceof Map ? riskPolicy.entries : new Map();
  for (const key of keys) {
    const entry = normalizePolicyEntry(entries.get(key));
    if (entry && entry.risk) {
      fromMap = entry;
      break;
    }
  }

  const hasDefaultRisk = Boolean(normalizeRisk(riskPolicy?.defaultRisk));
  const defaultRisk = hasDefaultRisk ? normalizeRisk(riskPolicy.defaultRisk) : "";
  const defaultApprovalRequired = riskPolicy?.defaultApprovalRequired;

  if (mode === "map_only") {
    if (fromMap) {
      return {
        risk: fromMap.risk,
        approvalRequired: fromMap.approvalRequired !== undefined
          ? Boolean(fromMap.approvalRequired)
          : (defaultApprovalRequired !== undefined ? Boolean(defaultApprovalRequired) : false)
      };
    }
    if (hasDefaultRisk) {
      return {
        risk: defaultRisk,
        approvalRequired: defaultApprovalRequired !== undefined ? Boolean(defaultApprovalRequired) : false
      };
    }
    return null;
  }
  if (mode === "heuristic_only") {
    return {
      risk: inferHeuristicRisk(wrapper.codexId),
      approvalRequired: false
    };
  }
  if (fromMap) {
    return {
      risk: fromMap.risk,
      approvalRequired: fromMap.approvalRequired !== undefined
        ? Boolean(fromMap.approvalRequired)
        : (defaultApprovalRequired !== undefined ? Boolean(defaultApprovalRequired) : false)
    };
  }
  if (hasDefaultRisk) {
    return {
      risk: defaultRisk,
      approvalRequired: defaultApprovalRequired !== undefined ? Boolean(defaultApprovalRequired) : false
    };
  }
  return {
    risk: inferHeuristicRisk(wrapper.codexId),
    approvalRequired: false
  };
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.mapPath && options.mode !== "heuristic_only") {
    console.error("Missing --map=... (or use --mode=heuristic_only)");
    process.exit(2);
  }

  const riskPolicy = options.mapPath
    ? loadRiskPolicy(path.resolve(options.mapPath))
    : { entries: new Map(), defaultRisk: "", defaultApprovalRequired: undefined };
  const files = listWrapperSkillFiles();
  const result = {
    ok: true,
    generatedAt: new Date().toISOString(),
    mode: options.mode,
    mapPath: options.mapPath ? path.resolve(options.mapPath) : "",
    mapEntries: riskPolicy.entries.size,
    defaultRisk: normalizeRisk(riskPolicy.defaultRisk) || "",
    defaultApprovalRequired: riskPolicy.defaultApprovalRequired,
    wrappersTotal: files.length,
    updated: 0,
    unchanged: 0,
    missingRisk: 0,
    errors: 0,
    riskCounts: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    },
    rows: []
  };

  for (const filePath of files) {
    try {
      const wrapper = readWrapperSkill(filePath);
      const nextPolicy = resolvePolicyForWrapper(wrapper, riskPolicy, options.mode);
      if (!nextPolicy || !nextPolicy.risk) {
        result.missingRisk += 1;
        result.rows.push({
          filePath,
          codexId: wrapper.codexId,
          wrapperSkillId: wrapper.wrapperSkillId,
          status: "missing_risk"
        });
        continue;
      }

      const nextRisk = normalizeRisk(nextPolicy.risk) || "low";
      const prevRisk = normalizeRisk(wrapper.skill.risk) || "low";
      const step0 = Array.isArray(wrapper.skill.steps) && wrapper.skill.steps[0] && typeof wrapper.skill.steps[0] === "object"
        ? wrapper.skill.steps[0]
        : null;
      const prevApprovalRequired = step0 ? Boolean(step0.requiresApproval) : false;
      const nextApprovalRequired = Boolean(nextPolicy.approvalRequired);
      const changed = prevRisk !== nextRisk || prevApprovalRequired !== nextApprovalRequired;
      wrapper.skill.risk = nextRisk;
      wrapper.skill.tags = upsertTag(wrapper.skill.tags, `risk:${nextRisk}`);
      wrapper.skill.tags = upsertApprovalTag(wrapper.skill.tags, nextApprovalRequired);
      if (step0) {
        step0.requiresApproval = nextApprovalRequired;
      }
      if (step0 && typeof step0.payload === "object") {
        step0.payload.codexRisk = nextRisk;
        step0.payload.codexApprovalRequired = nextApprovalRequired;
      }
      result.riskCounts[nextRisk] += 1;
      if (changed) {
        result.updated += 1;
      } else {
        result.unchanged += 1;
      }
      if (!options.dryRun) {
        writeJson(filePath, wrapper.skill);
      }
      result.rows.push({
        filePath,
        codexId: wrapper.codexId,
        wrapperSkillId: wrapper.wrapperSkillId,
        previousRisk: prevRisk,
        previousApprovalRequired: prevApprovalRequired,
        nextRisk,
        nextApprovalRequired,
        status: changed ? "updated" : "unchanged"
      });
    } catch (error) {
      result.errors += 1;
      result.rows.push({
        filePath,
        status: "error",
        error: String(error && error.message ? error.message : error || "unknown_error")
      });
    }
  }

  if (options.failOnMissing && result.missingRisk > 0) {
    result.ok = false;
  }
  if (result.errors > 0) {
    result.ok = false;
  }

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
}

main();
