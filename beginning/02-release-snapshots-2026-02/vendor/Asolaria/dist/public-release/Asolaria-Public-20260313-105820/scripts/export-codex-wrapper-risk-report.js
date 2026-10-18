#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { listSkillSummaries } = require("../src/skillRegistry");

const ROOT = path.join(__dirname, "..");
const REPORTS_DIR = path.join(ROOT, "reports");
const RISK_ORDER = Object.freeze({
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
});

function normalizeRisk(value) {
  const risk = String(value || "").trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(RISK_ORDER, risk)) return risk;
  return "low";
}

function parseArgs(argv) {
  const out = {
    top: 10,
    file: "",
    compatJohn: false,
    top10Only: false,
    orderFromMap: ""
  };
  for (const argRaw of Array.isArray(argv) ? argv : []) {
    const arg = String(argRaw || "").trim();
    if (!arg) continue;
    if (arg.startsWith("--top=")) {
      const n = Number(arg.slice("--top=".length));
      if (Number.isFinite(n) && n > 0) {
        out.top = Math.max(1, Math.min(1000, Math.round(n)));
      }
      continue;
    }
    if (arg.startsWith("--file=")) {
      out.file = String(arg.slice("--file=".length)).trim();
    }
    if (arg === "--compat-john") {
      out.compatJohn = true;
    }
    if (arg === "--top10-only") {
      out.top10Only = true;
    }
    if (arg.startsWith("--order-from-map=")) {
      out.orderFromMap = String(arg.slice("--order-from-map=".length)).trim();
    }
  }
  return out;
}

function byRiskThenId(a, b) {
  const ar = RISK_ORDER[normalizeRisk(a.risk)] || 0;
  const br = RISK_ORDER[normalizeRisk(b.risk)] || 0;
  if (br !== ar) return br - ar;
  return String(a.id || "").localeCompare(String(b.id || ""));
}

function buildReport(topN) {
  const all = listSkillSummaries();
  const wrappers = all
    .filter((skill) => String(skill?.id || "").trim().toLowerCase().startsWith("codex.ref."))
    .map((skill) => ({
      id: String(skill.id || "").trim().toLowerCase(),
      title: String(skill.title || "").trim(),
      risk: normalizeRisk(skill.risk),
      tags: Array.isArray(skill.tags) ? skill.tags.slice(0, 24) : []
    }))
    .sort(byRiskThenId);

  const riskCounts = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  };
  for (const row of wrappers) {
    riskCounts[row.risk] += 1;
  }

  const top = wrappers.slice(0, Math.max(1, Math.min(wrappers.length, topN)));
  return {
    generatedAt: new Date().toISOString(),
    wrapperTotal: wrappers.length,
    riskCounts,
    top,
    items: wrappers
  };
}

function loadTop10OrderFromMap(filePath) {
  if (!filePath) return [];
  try {
    const text = fs.readFileSync(path.resolve(filePath), "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed?.top10Order) ? parsed.top10Order : [];
    return rows.map((x) => String(x || "").trim().toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
}

function toJohnCompatReport(report, top10Only, orderFromMap) {
  const sourceRows = top10Only ? report.top : report.items;
  const fullRows = Array.isArray(report.items) ? report.items : sourceRows;
  const bySourceSkill = new Map();
  for (const row of fullRows) {
    const sourceSkill = String(row.id || "").replace(/^codex\.ref\./, "").toLowerCase();
    if (!sourceSkill) continue;
    bySourceSkill.set(sourceSkill, row);
  }

  let selectedRows = sourceRows;
  if (top10Only && Array.isArray(orderFromMap) && orderFromMap.length > 0) {
    const ordered = [];
    const seen = new Set();
    for (const key of orderFromMap) {
      const row = bySourceSkill.get(String(key || "").trim().toLowerCase());
      if (!row) continue;
      const id = String(row.id || "");
      if (seen.has(id)) continue;
      seen.add(id);
      ordered.push(row);
    }
    for (const row of sourceRows) {
      const id = String(row.id || "");
      if (seen.has(id)) continue;
      ordered.push(row);
    }
    selectedRows = ordered.slice(0, sourceRows.length);
  }

  const wrappers = selectedRows.map((row) => {
    const sourceSkill = String(row.id || "").replace(/^codex\.ref\./, "");
    return {
      sourceSkill,
      risk: normalizeRisk(row.risk),
      approvalRequired: Boolean(Array.isArray(row.tags) && row.tags.includes("approval:required"))
    };
  });
  const riskBreakdown = {
    low: wrappers.filter((w) => w.risk === "low").length,
    medium: wrappers.filter((w) => w.risk === "medium").length,
    high: wrappers.filter((w) => w.risk === "high").length,
    critical: wrappers.filter((w) => w.risk === "critical").length
  };
  return {
    generatedAt: report.generatedAt,
    selectionMode: top10Only ? "top10_only" : "all",
    riskPolicy: {
      version: "local-export",
      defaults: {
        risk: "low",
        approvalRequired: false
      }
    },
    summary: {
      wrappers: wrappers.length,
      riskBreakdown
    },
    wrappers
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseReport = buildReport(args.top);
  const top10Order = loadTop10OrderFromMap(args.orderFromMap);
  const report = args.compatJohn
    ? toJohnCompatReport(baseReport, args.top10Only, top10Order)
    : baseReport;
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  const defaultName = args.compatJohn
    ? `wrapper-skills.${args.top10Only ? "top10" : "all"}.json`
    : `codex-wrapper-risk-report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const outPath = path.resolve(args.file ? args.file : path.join(REPORTS_DIR, defaultName));
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const wrappersCount = Number(
    report.wrapperTotal
    || report?.summary?.wrappers
    || (Array.isArray(report.items) ? report.items.length : 0)
    || (Array.isArray(report.wrappers) ? report.wrappers.length : 0)
  ) || 0;
  const riskCounts = report.riskCounts || report?.summary?.riskBreakdown || {};
  console.log(JSON.stringify({
    ok: true,
    path: outPath,
    wrapperTotal: wrappersCount,
    riskCounts,
    topCount: Array.isArray(report.top) ? report.top.length : (args.top10Only ? wrappersCount : Math.min(10, wrappersCount)),
    compatJohn: args.compatJohn
  }, null, 2));
}

main();
