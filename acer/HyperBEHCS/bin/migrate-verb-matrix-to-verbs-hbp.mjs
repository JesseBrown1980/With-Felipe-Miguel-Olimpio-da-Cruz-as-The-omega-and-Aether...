// Migrate VERB_MATRIX (embedded JS object in super-dashboard-server.mjs)
// to tuple-form ledger at C:/HyperBEHCS/data/catalogs/verbs.hbp
// Source of truth shifts to the ledger. Advisor will be modified to read on query.

import fs from "node:fs";
import crypto from "node:crypto";

const VERBS = [
  { v: "classify",            bucket: "REDIRECT-TO-LIRIS", reason: "liris is canonical classifier per W113 R3" },
  { v: "route",               bucket: "REDIRECT-TO-LIRIS", reason: "envelope routing is liris core role" },
  { v: "annotate",            bucket: "REDIRECT-TO-LIRIS", reason: "liris owns .hbi sidecar annotation" },
  { v: "report",              bucket: "GUIDED-EXECUTE",    reason: "read-only evidence lane" },
  { v: "enumerate-handles",   bucket: "GUIDED-EXECUTE",    reason: "handles/labels/sizes only — no content recursion" },
  { v: "inspect-manifest",    bucket: "GUIDED-EXECUTE",    reason: "existing sidecars are evidence, not mutation" },
  { v: "tier-probe",          bucket: "GUIDED-EXECUTE",    reason: "access-tier matrix lookup" },
  { v: "mint-cp",             bucket: "DEFER-TO-APEX",     reason: "cp mint requires apex quintuple-cosign",
    scope_aware: 1, scope_extension_bucket: "ACER-SOVEREIGN" },
  { v: "promote-tier",        bucket: "DEFER-TO-APEX",     reason: "tier promotion = authority mutation" },
  { v: "mount-ro",            bucket: "DEFER-TO-APEX",     reason: "RO mount still race-risks eject" },
  { v: "unmount",             bucket: "DEFER-TO-APEX",     reason: "mid-operation eject can corrupt" },
  { v: "raw-read",            bucket: "GUIDED-EXECUTE",    reason: "acer hosts usb_raw_io.py canonical tool",
    canonical_tool: "C:/asolaria-acer/tools/usb-raw/usb_raw_io.py --read" },
  { v: "raw-write",           bucket: "DEFER-TO-APEX",     reason: "write to SOVLINUX substrate requires operator-witness + quintuple-cosign per Hermes architect correction 2026-05-19",
    canonical_tool: "C:/asolaria-acer/tools/usb-raw/usb_raw_io.py + tools/exfat-writer" },
  { v: "sector-attest",       bucket: "GUIDED-EXECUTE",    reason: "sector-0 read is read-only attestation",
    canonical_tool: "C:/asolaria-acer/tools/usb-raw/verify-2tb-sector0.ps1" },
  { v: "mount",               bucket: "HARD-DENY",         reason: "doctrine: never mount SOVLINUX substrate via Windows FS" },
  { v: "format",              bucket: "HARD-DENY",         reason: "doctrine: never format SOVLINUX substrate — continuity substrate per ASOLARIA-HERMES-ARCHITECT-CORRECTION-PID-2026-05-19" },
  { v: "repartition",         bucket: "HARD-DENY",         reason: "doctrine: never repartition SOVLINUX substrate" },
  { v: "diskpart-clean",      bucket: "HARD-DENY",         reason: "doctrine: diskpart clean = catastrophic substrate loss" },
  { v: "wmi-cim-probe",       bucket: "HARD-DENY",         reason: "liris ethernet-drop incident 2026-05-12 — WMI/CIM federation-wide HARD-DENY",
    substitute_hint: "tasklist,netstat,sc,ipconfig" },
  { v: "farm_pid_specific_contribution", bucket: "DEFER-TO-APEX",
    reason: "PID-specific archaeology archive farming — orchestration via Agent spawn requires PROF-OMNISPINDLE not yet deployed; operator-witness override per rule A",
    scope_aware: 1, scope_extension_bucket: "GUIDED-EXECUTE",
    canonical_tool: "C:/HyperBEHCS/bin/spawn-farm-batch-router-witnessed.mjs",
    substitute_hint: "operator-witness-each-band-batch,build-PROF-OMNISPINDLE-first" },
];

const ts = new Date().toISOString();
const wave = "W113-TOOL-ADVISOR-WAVE-2026-05-21";
const out = "C:/HyperBEHCS/data/catalogs/verbs.hbp";

let prev = "0000000000000000";
const rows = [];

// Genesis row first
const gen = [
  "HBPv1",
  "catalog=verbs",
  "layer=catalog-genesis",
  "wave=" + wave,
  "vantage=acer",
  "schema_version=1",
  "entries_expected=" + VERBS.length,
  "tuple_form=verb|bucket|reason|optional:canonical_tool|optional:scope_aware|optional:scope_extension_bucket|optional:substitute_hint",
  "antecedents=" + prev,
  "ts=" + ts,
  "json=0", "runtime=0", "promote=0",
].join("|");
const genH = crypto.createHash("sha256").update(gen).digest("hex").slice(0, 16);
rows.push(gen + "|row_hash=" + genH);
prev = genH;

// One row per verb
for (const e of VERBS) {
  const fields = [
    "HBPv1",
    "catalog=verbs",
    "entry=" + e.v,
    "bucket=" + e.bucket,
    "reason=" + e.reason.replace(/\|/g, "/"),
  ];
  if (e.canonical_tool) fields.push("canonical_tool=" + e.canonical_tool);
  if (e.scope_aware) fields.push("scope_aware=1");
  if (e.scope_extension_bucket) fields.push("scope_extension_bucket=" + e.scope_extension_bucket);
  if (e.substitute_hint) fields.push("substitute_hint=" + e.substitute_hint);
  fields.push("antecedents=" + prev);
  fields.push("ts=" + ts);
  fields.push("json=0", "runtime=0", "promote=0");
  const body = fields.join("|");
  const rh = crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
  rows.push(body + "|row_hash=" + rh);
  prev = rh;
}

fs.writeFileSync(out, rows.join("\n") + "\n");
console.log("wrote", out, "with", rows.length, "rows (1 genesis +", VERBS.length, "verbs)");
console.log("final row_hash:", prev);
console.log("file sha256:", crypto.createHash("sha256").update(fs.readFileSync(out)).digest("hex").slice(0, 16));
