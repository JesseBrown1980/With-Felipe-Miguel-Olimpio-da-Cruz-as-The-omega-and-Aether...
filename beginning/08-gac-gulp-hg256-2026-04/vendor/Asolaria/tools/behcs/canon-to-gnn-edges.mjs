#!/usr/bin/env node
// canon-to-gnn-edges.mjs — Post-processor: emit GNN edges from canon-load events.
//
// Reads `data/behcs/state/canon-cursor.json` (per-session canon ingestion ledger
// written by tools/behcs/canon-load-on-session-start.mjs) and emits one GNN edge
// per never-emitted entry into `data/behcs/gnn-live-edges.ndjson`.
//
// State is tracked in `data/behcs/state/canon-to-gnn-cursor.json`:
//   { last_processed_ingested_at: <iso>, processed_session_ids: [<id>, ...] }
//
// Idempotent: re-runs don't double-emit. Designed to run as a periodic task
// (cron/agent every minute) or as a SessionStart post-hook companion.
//
// CLI:
//   node canon-to-gnn-edges.mjs            # real run, append to ndjson
//   node canon-to-gnn-edges.mjs --dry-run  # print edges to stdout, don't write
//
// Conventions follow canon-load-on-session-start.mjs:
//   - resolve repo root via __dirname/../..
//   - JSON written with 2-space indent + trailing newline
//   - audit log under logs/

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");

const CANON_CURSOR = path.join(ROOT, "data", "behcs", "state", "canon-cursor.json");
const GNN_CURSOR   = path.join(ROOT, "data", "behcs", "state", "canon-to-gnn-cursor.json");
const EDGES_FILE   = path.join(ROOT, "data", "behcs", "gnn-live-edges.ndjson");
const AUDIT_LOG    = path.join(ROOT, "logs", "canon-to-gnn-edges.log");

// Bound the processed-id set so the file doesn't grow forever. Canon cursor
// itself is bounded at 500 entries, so we keep a slightly larger window.
const MAX_PROCESSED_IDS = 1000;

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run") || argv.includes("-n");

function audit(...parts) {
  try {
    fs.mkdirSync(path.dirname(AUDIT_LOG), { recursive: true });
    fs.appendFileSync(
      AUDIT_LOG,
      `[${new Date().toISOString()}] ${parts.join(" ")}\n`,
      "utf8"
    );
  } catch (e) {
    process.stderr.write(`canon-to-gnn-edges: audit_failed ${e.message}\n`);
  }
}

function readJsonSafe(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function readGnnCursor() {
  const raw = readJsonSafe(GNN_CURSOR, null);
  if (!raw || typeof raw !== "object") {
    return { last_processed_ingested_at: null, processed_session_ids: [] };
  }
  return {
    last_processed_ingested_at: raw.last_processed_ingested_at || null,
    processed_session_ids: Array.isArray(raw.processed_session_ids)
      ? raw.processed_session_ids
      : [],
  };
}

function writeGnnCursor(cursor) {
  fs.mkdirSync(path.dirname(GNN_CURSOR), { recursive: true });
  fs.writeFileSync(GNN_CURSOR, JSON.stringify(cursor, null, 2) + "\n", "utf8");
}

function deterministicEdgeId(sessionId, envelopeId) {
  return crypto
    .createHash("sha256")
    .update(`${sessionId}\n${envelopeId}`)
    .digest("hex")
    .slice(0, 16);
}

function buildEdge(entry) {
  return {
    id: deterministicEdgeId(entry.session_id, entry.envelope_id),
    ts: entry.ingested_at,
    from: "FIRST_MESSAGE_CANON",
    to: `acer_session_${entry.session_id}`,
    verb: "canon_loaded_at_session_start",
    weight: 0.95,
    sig_verdict: entry.sig_verdict || "",
    sig_owner: entry.sig_owner || "",
    canon_version: entry.canon_version || "",
    payload_sha256_8: entry.payload_sha256_8 || "",
  };
}

function appendEdge(edge) {
  fs.mkdirSync(path.dirname(EDGES_FILE), { recursive: true });
  fs.appendFileSync(EDGES_FILE, JSON.stringify(edge) + "\n", "utf8");
}

function main() {
  const canon = readJsonSafe(CANON_CURSOR, null);
  if (!canon || !Array.isArray(canon.sessions)) {
    audit("noop", "canon_cursor_missing_or_malformed");
    process.stdout.write(
      JSON.stringify({
        ok: true,
        dry_run: DRY_RUN,
        emitted: 0,
        skipped: 0,
        reason: "canon_cursor_missing_or_malformed",
      }) + "\n"
    );
    return;
  }

  const gnn = readGnnCursor();
  const seen = new Set(gnn.processed_session_ids);
  const lastTs = gnn.last_processed_ingested_at;

  const sessions = canon.sessions;
  const pending = [];
  let skippedAlready = 0;
  let skippedNoIds = 0;

  for (const s of sessions) {
    if (!s || !s.session_id || !s.envelope_id) {
      skippedNoIds++;
      continue;
    }
    if (seen.has(s.session_id)) {
      skippedAlready++;
      continue;
    }
    // Defensive secondary filter: if we have a prior watermark and this
    // entry's ingested_at is strictly older, skip. processed_session_ids
    // is the primary dedupe; this just guards against id-collision edge
    // cases without blocking new sessions that share an envelope_id.
    if (lastTs && s.ingested_at && s.ingested_at < lastTs && seen.size > 0) {
      // older than watermark AND not in the seen set: treat as already
      // processed under an earlier (now-trimmed) cursor and skip.
      skippedAlready++;
      continue;
    }
    pending.push(s);
  }

  if (pending.length === 0) {
    audit(
      "noop",
      `pending=0`,
      `skipped_already=${skippedAlready}`,
      `skipped_no_ids=${skippedNoIds}`,
      `dry_run=${DRY_RUN}`
    );
    process.stdout.write(
      JSON.stringify({
        ok: true,
        dry_run: DRY_RUN,
        emitted: 0,
        skipped_already: skippedAlready,
        skipped_no_ids: skippedNoIds,
      }) + "\n"
    );
    return;
  }

  // Emit oldest-first so the ndjson stream stays time-ordered.
  pending.sort((a, b) =>
    String(a.ingested_at || "").localeCompare(String(b.ingested_at || ""))
  );

  const emittedEdges = [];
  let maxTs = lastTs || "";
  for (const entry of pending) {
    const edge = buildEdge(entry);
    if (DRY_RUN) {
      process.stdout.write(JSON.stringify(edge) + "\n");
    } else {
      appendEdge(edge);
    }
    emittedEdges.push(edge);
    seen.add(entry.session_id);
    if (entry.ingested_at && entry.ingested_at > maxTs) {
      maxTs = entry.ingested_at;
    }
  }

  if (!DRY_RUN) {
    let processedIds = Array.from(seen);
    if (processedIds.length > MAX_PROCESSED_IDS) {
      processedIds = processedIds.slice(-MAX_PROCESSED_IDS);
    }
    writeGnnCursor({
      last_processed_ingested_at: maxTs || null,
      processed_session_ids: processedIds,
    });
  }

  audit(
    DRY_RUN ? "dry_run" : "emitted",
    `count=${emittedEdges.length}`,
    `skipped_already=${skippedAlready}`,
    `skipped_no_ids=${skippedNoIds}`,
    `max_ts=${maxTs || "null"}`
  );

  process.stdout.write(
    JSON.stringify({
      ok: true,
      dry_run: DRY_RUN,
      emitted: emittedEdges.length,
      skipped_already: skippedAlready,
      skipped_no_ids: skippedNoIds,
      last_processed_ingested_at: maxTs || null,
      edge_ids: emittedEdges.map((e) => e.id),
    }) + "\n"
  );
}

try {
  main();
} catch (e) {
  audit("crashed", e.message || String(e));
  process.stderr.write(`canon-to-gnn-edges: ${e.message || e}\n`);
  process.exit(1);
}
