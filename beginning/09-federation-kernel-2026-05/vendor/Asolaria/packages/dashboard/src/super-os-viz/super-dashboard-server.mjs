// super-dashboard-server.mjs · LIVE Super Asolaria Civilization OS dashboard
// Standalone · port 4949 · ZERO mutation of http-server.ts
// Serves: tab shell · viz · live cohort/cosign/inbox JSON · proxies acer bus :4947 inbox
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { resolve, dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { topN } from "./e-cohort/E05-gnn-inference-stub.mjs";
import { tick } from "./e-cohort/E06-loop-orchestrator.mjs";
import { listPending, veto, REVIEW_PIPELINE, FABRIC_AGENT_ROUTES } from "./e-cohort/E01-gnn-dispatch-bridge.mjs";
import { fire as hookFire, TIER_2_EVENTS } from "./e-cohort/E02-hookwall-expand.mjs";
import { probe as supProbe, SUPERVISED } from "./e-cohort/E04-daemon-supervisors.mjs";
import { answer as opJesseAnswer, OPERATOR as OP_JESSE } from "./f-cohort/F01-operator-jesse-as-claude.mjs";
import { enumerate as enumDaemons } from "./h-cohort/H07-daemon-enumeration.mjs";
import { scanAll as scanDevices } from "./k-cohort/K04-device-monitor.mjs";
import { inventory as connInventory } from "./k-cohort/K02-connector-inventory.mjs";
import { buildOmnidirectionalDeviceBuildPlan } from "./k-cohort/K08-omnidirectional-device-build.mjs";
import { poll as inboxPoll } from "./o-cohort/O01-cross-computer-inbox.mjs";
import { tick as watchdogTick } from "./o-cohort/O02-watchdog-ping-instant-agent.mjs";
import { plan as cascadePlan } from "./o-cohort/O03-deep-cascade-6x6x6x6x6x12.mjs";
import { BEHCS1024_PLANES, encodeBehcs1024Digit } from "./behcs1024-language-kernel.mjs";
import { computeUsbPhysicalPipeline } from "./dashboard-improvements-2026-05-11/usb-physical-pipeline.mjs";
import { computeTriVantageParity } from "./dashboard-improvements-2026-05-11/tri-vantage-parity.mjs";
import { computeOwnerCadenceGap } from "./dashboard-improvements-2026-05-11/owner-cadence-gap.mjs";
import { computeEnvelopeClassCounter } from "./dashboard-improvements-2026-05-11/envelope-class-counter.mjs";
import { getRouteHonestyStatus } from "./dashboard-improvements-2026-05-11/route-honesty-status.mjs";
import { auditLocalRoutes, auditFabricMirror } from "./dashboard-improvements-2026-05-11/fabric-mirror-audit.mjs";
import { listAgents, agentStatus, agentInbox, agentInvoke, crossType, crossPipeDump, NAMED_ROLES } from "./dashboard-improvements-2026-05-11/agent-roles-live.mjs";

// === X2-06 W10-P2 3-AXIS L-TASK ROUTES — COMMENTED-PENDING BLOCK ===
// Spec: AE-08 atlas cp 396-399. Pareto-front (cost, hyp, fb), NEVER scalar-collapse.
// Activation requires separate operator-authorized dashboard-restart wave.
// Module path: C:\asolaria-behcs-256\src\ltask\dashboard-routes.js (CommonJS)
// Routes added on mount: /api/ltask/cost /hyp /fb /aggregate /breach
// import { createRequire } from "node:module";
// const __ltaskRequire = createRequire(import.meta.url);
// const ltaskRoutes = __ltaskRequire("C:/asolaria-behcs-256/src/ltask/dashboard-routes.js");
// const ltaskCost   = __ltaskRequire("C:/asolaria-behcs-256/src/ltask/cost-tracker.js");
// const ltaskHyp    = __ltaskRequire("C:/asolaria-behcs-256/src/ltask/hyp-space-tracker.js");
// const ltaskFb     = __ltaskRequire("C:/asolaria-behcs-256/src/ltask/feedback-tracker.js");
// const ltaskAgg    = __ltaskRequire("C:/asolaria-behcs-256/src/ltask/ltask-aggregator.js");
// const ltaskBreach = __ltaskRequire("C:/asolaria-behcs-256/src/ltask/breach-banner.js");
// // Wire into request dispatcher when operator authorizes activation:
// //   ltaskRoutes.mount(app);  // app must expose .get(path, handler)
// === END X2-06 COMMENTED-PENDING BLOCK ===

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.SUPER_OS_PORT || "4949", 10);
const HOST = "127.0.0.1";
const BUS_URL = "http://127.0.0.1:4947";
const VISUAL_SWEEP_ROOT = "C:/tmp/asolaria-screens/acer/dashboard-visual-sweep";
const BEHCS_MINT_ROOT = "C:/Users/acer/Asolaria/data/behcs/orchestration/omniscrcpy-lewm-cadence-20260510";
const BEHCS1024_DIMENSIONS = [
  "tuple_index", "alphabet", "radix", "base1024_digit", "radix_index", "plane", "plane_symbol", "glyph256_prefix", "glyph_class",
  "glyph_symbol", "glyph_tuple", "glyph1024", "pid", "brown_hilbert_address", "capsule_id", "capsule_purpose",
  "fabric_lane_pid", "fabric_team", "fabric_phase", "visual_sweep_wave", "visual_sweep_pathRef",
  "mint_root", "mint_file", "mint_file_present", "omniscrcpy_cadence_state", "device_id",
  "device_observed_state", "device_age_s", "device_preview_sha16", "device_pathRef", "hookwall_stage",
  "gnn_stage", "shannon_stage", "gulp_stage", "whiteroom_stage", "fabric_route",
  "gc_policy", "crypto_seal", "authority_scope", "risk_class", "receipt_rule",
  "map_ref", "cube_ref", "memory_ref", "index_ref", "language_L0",
  "language_L1", "language_L2", "language_L3", "language_L4", "language_L5",
  "language_L6", "catalog_expandable", "source_type", "source_label", "proof_status",
  "access_tier", "storage_class", "redaction_policy", "enumeration_policy"
];
const BEHCS_MINT_FILES = [
  "memory/omniscrcpy-lewm-cadence-memory.v1.json",
  "index/omniscrcpy-lewm-cadence-index.v1.json",
  "maps/omniscrcpy-lewm-cadence-map-map-mapped.v1.json",
  "maps/hookwall-gnn-dispatch-loop-map.v1.json",
  "cubes/omniscrcpy-lewm-cadence-cube.cube.js",
  "glpj/omniscrcpy-lewm-cadence-behcs1024.glpj.json",
  "glpj/hookwall-gnn-dispatch-loop-behcs1024.glpj.json",
  "whiteroom/omniscrcpy-lewm-cadence-whiteroom.v1.json",
  "gc/omniscrcpy-lewm-cadence-retention.v1.json",
  "crypto/omniscrcpy-lewm-cadence-crypto-seal.v1.json"
];
const DRIVE_ACCESS_TIERS = [
  { tier: "PUBLIC", storage_class: "public_runtime", authority: "any_agent_read", redaction: "none", enumeration: "paths_and_metadata_allowed" },
  { tier: "RESTRICTED", storage_class: "operator_restricted", authority: "operator_or_quintet_cosign", redaction: "hashes_and_summaries_only", enumeration: "no_content_dump" },
  { tier: "STEALTH", storage_class: "operator_stealth", authority: "operator_witness_required", redaction: "redacted_path_hash_only", enumeration: "existence_and_policy_only" },
  { tier: "HIDDEN", storage_class: "section_q_hidden", authority: "operator_only", redaction: "fully_redacted_metadata_only", enumeration: "policy_surface_only" },
  { tier: "SHADOW", storage_class: "shadow_copy", authority: "admin_plus_sovereignty", redaction: "hashes_retention_windows_only", enumeration: "no_private_contents" },
  { tier: "SECRET", storage_class: "secret_notes_or_vault", authority: "operator_witness_required", redaction: "deny_public_content", enumeration: "sealed_reference_only" }
];
const ACCESS_PROBE_SCOPES = ["drive", "usb", "device", "folder", "file", "pid"];

const AUDIT_INTEGRITY_CANDIDATE = {
  id: "audit_integrity",
  status: "planned_disabled",
  provider_class: "subq_candidate_private_beta",
  role: "whole_fabric_long_context_auditor",
  authority: "advisory_only",
  proof_boundary: "audit finding is message-proof only; never local truth, keyboard proof, frame proof, or executor authority",
  allowed_inputs: [
    "redacted dashboard sweep ledgers",
    "redacted BEHCS inbox windows",
    "watchtarget receipts",
    "route inventories",
    "screenshot summaries and hashes",
    "nonce-proof summaries"
  ],
  blocked_inputs: [
    "tokens or keys",
    "raw private topology",
    "unredacted hidden/stealth/restricted content",
    "direct executor endpoints",
    "live keyboard route payloads",
    "raw full inbox dumps by default"
  ],
  output_verb: "EVT-SUBQ-AUDIT-FINDING",
  promotion_gates: [
    "public model card or equivalent technical disclosure reviewed",
    "operator cosign",
    "redacted benchmark bundle passes",
    "known-contradiction test passes",
    "no topology leak in output",
    "GNN/hookwall comparison completed"
  ],
  disabled_reason: "SubQ 12M context is useful as a possible cross-history auditor, but it is not local proof and no provider/API lane is runtime-bound here."
};

function buildAuditIntegrityCandidate() {
  return {
    ok: true,
    generated_at: new Date().toISOString(),
    ...AUDIT_INTEGRITY_CANDIDATE,
    dashboard_card: {
      name: "Audit Integrity",
      placement: "Screens tab after Remote Input Truth",
      state: "planned_disabled",
      color_rule: "warn until provider access, redaction, benchmark, and operator cosign are proven"
    },
    local_truth_sources: [
      "/api/remote-input/health",
      "/api/omniscrcpy/visual-field",
      "/api/omniscrcpy/feed",
      "/api/alphabet-binding",
      "/api/loop/review-pipeline",
      "/api/gnn/topN"
    ]
  };
}

function normalizeAccessProbe(input = {}) {
  const tier = String(input.tier || "PUBLIC").toUpperCase();
  const scope = String(input.scope || "drive").toLowerCase();
  const mode = String(input.mode || "metadata_only").toLowerCase();
  const pid = String(input.pid || "OP-RAYSSA-PID-G0000-A00-W000");
  const foundTier = DRIVE_ACCESS_TIERS.find(t => t.tier === tier) || DRIVE_ACCESS_TIERS[0];
  const foundScope = ACCESS_PROBE_SCOPES.includes(scope) ? scope : "drive";
  return { tier: foundTier, scope: foundScope, mode, pid };
}

function buildAccessTierProbe(input = {}) {
  const { tier, scope, mode, pid } = normalizeAccessProbe(input);
  const generatedAt = new Date().toISOString();
  const tuple = {
    alphabet: "BEHCS-1024",
    IX: "IX-700-EXTENDED",
    tuple_dim: 60,
    tier: tier.tier,
    scope,
    pid,
    storage_class: tier.storage_class,
    authority_scope: tier.authority,
    redaction_policy: tier.redaction,
    enumeration_policy: tier.enumeration
  };
  const proofHash = hash16(JSON.stringify({ tuple, generatedAt, mode }));
  const allowedMode = mode === "metadata_only" || mode === "existence_only";
  return {
    ok: allowedMode,
    generated_at: generatedAt,
    route: "/api/access-tier/probe",
    triggerable: true,
    decorative_only: false,
    mode: allowedMode ? mode : "blocked_unsafe_mode",
    content_dumped: false,
    safe_boundary: "metadata, policy, redacted route, and proof hash only; no hidden/restricted/secret contents are returned",
    leworldmodel_predict_correct: {
      expected_state: "Access-tier cards expose triggerable metadata-only probes instead of decorative labels.",
      observed_state: allowedMode ? "metadata_probe_triggered" : "unsafe_probe_blocked",
      surprise_score: allowedMode ? 0 : 1,
      corrective_action: allowedMode
        ? "Record proof hash/pathRef and mirror this contract on Liris and Falcon dashboards."
        : "Retry with mode=metadata_only or mode=existence_only; do not request content dumps."
    },
    behcs1024_tuple: tuple,
    proof: {
      proof_sha16: proofHash,
      proof_pathRef: `local-access-tier-probe-${tier.tier.toLowerCase()}-${scope}-${proofHash}`,
      age_s: 0
    },
    peer_mirror_requirement: {
      liris: "Implement the same read-only route and dashboard card; prove with EVT-LIRIS-ACCESS-TIER-PROBE-MATRIX.",
      falcon: "Implement or report unavailable with equivalent metadata-only state; prove with EVT-FALCON-ACCESS-TIER-PROBE-MATRIX."
    }
  };
}

function buildAccessTierMatrix() {
  const generatedAt = new Date().toISOString();
  const rows = [];
  for (const tier of DRIVE_ACCESS_TIERS) {
    for (const scope of ACCESS_PROBE_SCOPES) {
      const probe = buildAccessTierProbe({ tier: tier.tier, scope, mode: "metadata_only" });
      rows.push({
        tier: tier.tier,
        scope,
        storage_class: tier.storage_class,
        authority_scope: tier.authority,
        redaction_policy: tier.redaction,
        enumeration_policy: tier.enumeration,
        triggerable: true,
        decorative_only: false,
        proof_sha16: probe.proof.proof_sha16,
        corrective_action: probe.leworldmodel_predict_correct.corrective_action
      });
    }
  }
  return {
    ok: true,
    generated_at: generatedAt,
    route: "/api/access-tier/matrix",
    alphabet: "BEHCS-1024",
    tuple_dim: 60,
    scopes: ACCESS_PROBE_SCOPES,
    tiers: DRIVE_ACCESS_TIERS.map(t => t.tier),
    rows,
    rule: "Every displayed shadow/restricted/stealth/hidden/drive/device/folder/file/PID surface must have a safe trigger path or be marked decorative-only as a bug."
  };
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json",
  ".js":   "application/javascript",
  ".mjs":  "application/javascript",
  ".css":  "text/css",
  ".md":   "text/plain; charset=utf-8",
  ".svg":  "image/svg+xml"
};

function log(m) {
  console.log("[" + new Date().toISOString() + "] " + m);
}

async function proxyBus(path) {
  try {
    const r = await fetch(BUS_URL + path, { signal: AbortSignal.timeout(3000) });
    return { status: r.status, body: await r.text(), ct: r.headers.get("content-type") || "application/json" };
  } catch (e) { return { status: 502, body: JSON.stringify({ ok: false, err: e.message }), ct: "application/json" }; }
}

async function probeHttp(url, timeoutMs = 1200) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const ct = r.headers.get("content-type") || "";
    let json = null;
    let text = "";
    if (ct.includes("json")) {
      try { json = await r.json(); } catch { json = null; }
    } else {
      text = (await r.text()).slice(0, 240);
    }
    return { reachable: true, ok: r.ok, status: r.status, url, json, text };
  } catch (e) {
    return { reachable: false, ok: false, status: 0, url, err: e.message };
  }
}

async function firstReachable(urls, timeoutMs = 1200) {
  const probes = [];
  for (const u of urls) {
    const probe = await probeHttp(u, timeoutMs);
    probes.push(probe);
    if (probe.reachable && probe.ok) return { reachable: true, selected: probe, probes };
  }
  const reachable = probes.find(p => p.reachable) || null;
  return { reachable: !!reachable, selected: reachable || probes[0] || null, probes };
}

function deviceVisualFromVisualField(visual, deviceId) {
  const rows = visual?.leworldmodel_predict_correct?.rows || [];
  const row = rows.find(r => r.device_id === deviceId) || null;
  const devices = visual?.devices || visual?.feed?.devices || [];
  const dev = devices.find(d => d.device_id === deviceId) || null;
  const fallbackOnly = !!(dev?.fallback_visual_status || row?.fallback_visual_status || /bus_fallback/i.test(String(dev?.resolved_state || row?.observed_state || "")));
  const liveFrame = !!(
    (row?.observed_state === "live" && row?.proof?.preview_sha16) ||
    (dev?.resolved_state === "live" && dev?.preview?.data_url)
  );
  return {
    device_id: deviceId,
    live_frame: liveFrame && !fallbackOnly,
    bus_or_status_frame_only: fallbackOnly,
    state: row?.observed_state || dev?.resolved_state || "not_observed",
    age_s: row?.proof?.age_s ?? dev?.age_s ?? null,
    preview_sha16: row?.proof?.preview_sha16 || dev?.preview?.sha16 || "",
    pathRef: row?.proof?.pathRef || dev?.pathRef || ""
  };
}

async function buildRemoteInputHealth() {
  const generatedAt = new Date().toISOString();
  const [busHealthProbe, busInboxProbe, lirisKeyboard, acerKeyboard] = await Promise.all([
    probeHttp(BUS_URL + "/health", 1500),
    probeHttp(BUS_URL + "/behcs/inbox?last=1", 1500),
    firstReachable([
      "http://192.168.100.2:4913/health",
      "http://192.168.1.4:4913/health",
      "http://192.168.1.14:4913/health"
    ], 1200),
    firstReachable(["http://127.0.0.1:4913/health"], 800)
  ]);
  const busReachable = !!(busInboxProbe.ok || busHealthProbe.ok);
  const busProbe = {
    health: { url: busHealthProbe.url, status: busHealthProbe.status, ok: busHealthProbe.ok, err: busHealthProbe.err || "" },
    inbox: { url: busInboxProbe.url, status: busInboxProbe.status, ok: busInboxProbe.ok, err: busInboxProbe.err || "" }
  };

  let visual = null;
  let heartbeat = null;
  let omniStatus = null;
  try {
    const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
    visual = await mod.visualFieldState(160);
    heartbeat = await mod.heartbeatStatus(160);
    omniStatus = mod.status();
  } catch (e) {
    visual = { ok: false, err: e.message };
  }

  const acerVisual = deviceVisualFromVisualField(visual, "acer-desktop");
  const lirisVisual = deviceVisualFromVisualField(visual, "liris-desktop-via-bus");
  const falconVisual = deviceVisualFromVisualField(visual, "falcon-s24fe");
  const lirisHeartbeat = heartbeat?.heartbeat || {};
  const falconOk = !!omniStatus?.falcon?.ok;

  const routes = {
    Acer: {
      message_route: {
        state: busReachable ? "proven" : "unproven",
        evidence: busReachable ? "local BEHCS bus inbox reachable" : "local BEHCS bus inbox unreachable",
        probe: busProbe
      },
      visual_route: {
        state: acerVisual.live_frame ? "frame_proven" : "unproven",
        evidence: acerVisual.live_frame ? "fresh local desktop frame proof" : "no fresh Acer frame proof in visual field",
        proof: acerVisual
      },
      keyboard_route: {
        state: acerKeyboard.reachable ? "executor_health_reachable" : "not_exposed",
        evidence: acerKeyboard.reachable ? "local keyboard executor health responds on :4913" : "no dashboard remote typing route; local :4913 health not reachable",
        proof_boundary: "health probe only; this route does not type or press keys",
        probe: acerKeyboard.selected
      },
      desktop_focus: {
        state: acerVisual.live_frame ? "visible" : "unknown",
        evidence: "focus is inferred only from visual frame availability; no keyboard action was attempted"
      },
      executor_alive: {
        state: acerKeyboard.reachable ? "alive" : "unproven",
        alive: !!acerKeyboard.reachable
      }
    },
    Liris: {
      message_route: {
        state: lirisHeartbeat.ok || lirisHeartbeat.latest ? "proven" : (busReachable ? "bus_reachable_no_fresh_liris_heartbeat" : "unproven"),
        evidence: lirisHeartbeat.ok || lirisHeartbeat.latest ? "Liris heartbeat/activity observed on BEHCS bus" : "bus health is separate from Liris heartbeat proof",
        heartbeat: lirisHeartbeat
      },
      visual_route: {
        state: lirisVisual.live_frame ? "frame_proven" : (lirisVisual.bus_or_status_frame_only ? "bus_or_status_frame_only" : "unproven"),
        evidence: lirisVisual.live_frame ? "owner OMNISCRCPY_REMOTE_FRAME screen proof observed" : (lirisVisual.bus_or_status_frame_only ? "bus/status frame is visible but is not keyboard or screen-owner proof" : "no fresh owner frame proof"),
        proof: lirisVisual
      },
      keyboard_route: {
        state: lirisKeyboard.reachable ? "keyboard_health_reachable" : "unproven",
        evidence: lirisKeyboard.reachable ? "Liris :4913 health endpoint reachable" : "Liris keyboard remains unproven because no :4913 health candidate is reachable",
        proof_boundary: "port 4913 health is required before claiming Liris keyboard proof; no /type route is implemented here",
        probe: lirisKeyboard.selected,
        candidates: lirisKeyboard.probes.map(p => ({ url: p.url, reachable: p.reachable, ok: p.ok, status: p.status, err: p.err || "" }))
      },
      desktop_focus: {
        state: lirisVisual.live_frame ? "visible_remote_frame" : "unknown",
        evidence: "desktop focus is not keyboard proof; it requires both fresh frame proof and separate keyboard health"
      },
      executor_alive: {
        state: lirisKeyboard.reachable ? "alive" : "unproven",
        alive: !!lirisKeyboard.reachable
      }
    },
    Falcon: {
      message_route: {
        state: busReachable ? "bus_reachable" : "unproven",
        evidence: "Falcon coordination may ride bus/room artifacts; bus reachability is not ADB keyboard proof",
        probe: busProbe
      },
      visual_route: {
        state: falconVisual.live_frame ? "frame_proven" : "unproven",
        evidence: falconVisual.live_frame ? "Falcon frame proof observed through local ADB/OmniScrcpy feed" : "no fresh Falcon frame proof in visual field",
        proof: falconVisual
      },
      keyboard_route: {
        state: falconOk ? "adb_executor_ready" : "unproven",
        evidence: falconOk ? "pinned Falcon ADB serial is visible; this is keyboard-capable but no key/type was sent" : "Falcon ADB status is not ready",
        proof_boundary: "read-only status only; no adb input text/keyevent called",
        serial: omniStatus?.falcon?.serial || ""
      },
      desktop_focus: {
        state: falconVisual.live_frame ? "visible_mobile_frame" : "unknown",
        evidence: "mobile focus still requires before/after LOOK around any future input"
      },
      executor_alive: {
        state: falconOk ? "alive" : "unproven",
        alive: falconOk
      }
    }
  };

  return {
    ok: true,
    generated_at: generatedAt,
    route: "read-only remote input health; no /type route and no remote typing",
    truth_boundaries: {
      message_route: "bus/heartbeat proof only",
      visual_route: "frame proof only; bus fallback/status frames are degraded and not keyboard proof",
      keyboard_route: "executor health proof only; Liris is unproven unless one :4913 health candidate is reachable",
      desktop_focus: "visibility hint only, not proof that typed input would land"
    },
    summary: {
      message_bus_reachable: busReachable,
      liris_keyboard_proven: !!lirisKeyboard.reachable,
      falcon_adb_ready: falconOk,
      full_keyboard_proof: !!(acerKeyboard.reachable && lirisKeyboard.reachable && falconOk)
    },
    routes
  };
}

function readJsonBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", () => {
      try { resolveBody(JSON.parse(body || "{}")); }
      catch (e) { rejectBody(e); }
    });
    req.on("error", rejectBody);
  });
}

function serveStatic(rel) {
  const fp = resolve(__dirname, rel);
  if (!existsSync(fp) || !statSync(fp).isFile()) return null;
  const ext = extname(fp).toLowerCase();
  return { status: 200, body: readFileSync(fp), ct: MIME[ext] || "application/octet-stream" };
}

function dirManifest() {
  const out = [];
  function walk(d, prefix) {
    readdirSync(d).forEach(f => {
      const fp = join(d, f);
      const s = statSync(fp);
      if (s.isFile()) {
        out.push({ path: prefix + "/" + f, size: s.size, sha16: createHash("sha256").update(readFileSync(fp)).digest("hex").slice(0, 16) });
      } else if (s.isDirectory()) walk(fp, prefix + "/" + f);
    });
  }
  walk(__dirname, "");
  return out;
}

function readJsonFile(fp, fallback = null) {
  try {
    if (!existsSync(fp)) return fallback;
    return JSON.parse(readFileSync(fp, "utf8"));
  } catch {
    return fallback;
  }
}

function latestVisualSweepSummaries(limit = 4) {
  try {
    if (!existsSync(VISUAL_SWEEP_ROOT)) return [];
    return readdirSync(VISUAL_SWEEP_ROOT)
      .filter(name => /^\d{8}T\d{6}Z$/.test(name))
      .map(name => {
        const dir = join(VISUAL_SWEEP_ROOT, name);
        const fp = join(dir, "visual-sweep-summary.json");
        const st = existsSync(fp) ? statSync(fp) : statSync(dir);
        return { name, dir, fp, mtimeMs: st.mtimeMs };
      })
      .filter(item => existsSync(item.fp))
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, limit)
      .map(item => {
        const j = readJsonFile(item.fp, {});
        const s = j.summary || {};
        return {
          wave: item.name,
          pathRef: s.bus_receipt?.behcs?.pathRef || "",
          tabs_total: s.tabs_total || 0,
          captures_total: s.captures_total || 0,
          unique_capture_sha16: s.unique_capture_sha16 || 0,
          issues_count: (s.issues || []).length,
          stale_or_missing_after: (s.backend_after?.stale_or_missing_rows || []).map(r => r.device_id),
          out_dir: s.out_dir || item.dir
        };
      });
  } catch {
    return [];
  }
}

function first2(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 2);
}

function hash16(value) {
  return createHash("sha256").update(String(value)).digest("hex").slice(0, 16);
}

function pick(arr, idx, fallback = {}) {
  return Array.isArray(arr) && arr.length ? arr[idx % arr.length] : fallback;
}

function buildCatalog50d(tuple, ctx) {
  const values = {
    tuple_index: tuple.tuple_index,
    alphabet: "BEHCS-1024",
    plane: tuple.plane,
    glyph256_prefix: tuple.glyph256_prefix,
    glyph_class: tuple.glyph_class,
    glyph1024: tuple.glyph1024,
    pid: tuple.pid,
    brown_hilbert_address: tuple.brown_hilbert_address,
    capsule_id: ctx.capsule?.id || "",
    capsule_purpose: ctx.capsule?.purpose || "",
    fabric_lane_pid: ctx.lane?.pid || "",
    fabric_team: ctx.lane?.team || "",
    fabric_phase: ctx.lane?.phase || "",
    visual_sweep_wave: ctx.sweep?.wave || "",
    visual_sweep_pathRef: ctx.sweep?.pathRef || "",
    mint_root: BEHCS_MINT_ROOT,
    mint_file: ctx.mint?.rel || "",
    mint_file_present: Boolean(ctx.mint?.exists),
    omniscrcpy_cadence_state: ctx.fabric?.omniscrcpy_cadence?.state || "",
    device_id: ctx.row?.device_id || "",
    device_observed_state: ctx.row?.observed_state || "",
    device_age_s: ctx.row?.age_s ?? "",
    device_preview_sha16: ctx.row?.preview_sha16 || "",
    device_pathRef: ctx.row?.pathRef || "",
    hookwall_stage: "HOOKWALL_EVERYTHING",
    gnn_stage: "GNN_PIPE_EVERYTHING",
    shannon_stage: "SHANNON_NOVELTY",
    gulp_stage: "GULP_COLLAPSE_GUARD",
    whiteroom_stage: "WHITEROOM_REVERSIBLE_HOLD",
    fabric_route: "FABRIC_AGENT_ROUTE",
    gc_policy: "GC_RETENTION_AND_MARK_SWEEP",
    crypto_seal: "CRYPTO_SEAL_PATHREF_SHA16",
    authority_scope: "OPERATOR_VETO_OR_APEX_FOR_HIGH_RISK",
    risk_class: tuple.risk_class,
    receipt_rule: "REQUEST_RECEIPT_IS_NOT_PROOF_REQUIRE_BACKEND_VISUAL_FIELD",
    map_ref: "maps/omniscrcpy-lewm-cadence-map-map-mapped.v1.json",
    cube_ref: "cubes/omniscrcpy-lewm-cadence-cube.cube.js",
    memory_ref: "memory/omniscrcpy-lewm-cadence-memory.v1.json",
    index_ref: "index/omniscrcpy-lewm-cadence-index.v1.json",
    language_L0: "pixel_or_event",
    language_L1: "observed_state",
    language_L2: "surprise",
    language_L3: "corrective_action",
    language_L4: "pid_route",
    language_L5: "review_stack",
    language_L6: "receipt_and_gc",
    catalog_expandable: "50D+",
    source_type: ctx.source_type,
    source_label: ctx.source_label,
    proof_status: tuple.proof_status,
    access_tier: ctx.accessTier?.tier || "",
    storage_class: ctx.accessTier?.storage_class || "",
    redaction_policy: ctx.accessTier?.redaction || "",
    enumeration_policy: ctx.accessTier?.enumeration || ""
  };
  return BEHCS1024_DIMENSIONS.map((name, i) => ({
    d: "D" + String(i).padStart(2, "0"),
    name,
    value: values[name] ?? ""
  }));
}

function buildBehcs1024Language(base, fabric, opts = {}) {
  const tupleLimit = Math.max(0, Math.min(1024, Number(opts.tupleLimit ?? 1024)));
  const includeCatalog = opts.includeCatalog !== false;
  const overrides = base.glyph_class_overrides || [];
  const capsules = base.behcs1024_capsules || [];
  const lanes = fabric.omnispindle_lanes || [];
  const sweeps = fabric.latest_sweeps || [];
  const mintFiles = fabric.minted_artifacts?.files || BEHCS_MINT_FILES.map(rel => ({ rel, exists: existsSync(join(BEHCS_MINT_ROOT, rel)) }));
  const rows = fabric.omniscrcpy_cadence?.rows || [];
  const tuples = [];

  for (let i = 0; i < tupleLimit; i++) {
    const plane = BEHCS1024_PLANES[Math.floor(i / 256)];
    const prefix = (i % 256).toString(16).padStart(2, "0");
    const override = overrides.find(o => o.sha16_first2 === prefix);
    const capsule = override
      ? capsules.find(c => c.pid === override.pid || c.id === override.label) || pick(capsules, i)
      : pick(capsules, i);
    const lane = pick(lanes, i);
    const sweep = pick(sweeps, i);
    const mint = pick(mintFiles, i);
    const row = pick(rows, i);
    const accessTier = pick(DRIVE_ACCESS_TIERS, i);
    const sourceType = override ? "glyph256_override" : capsule?.id ? "capsule_projection" : "reserved_plane_slot";
    const label = override?.label || capsule?.id || `${plane.id}-${prefix}`;
    const seed = [i, plane.id, prefix, label, lane?.pid, sweep?.pathRef, row?.pathRef].join("|");
    const glyphClass = override?.class || capsule?.class || plane.class;
    const symbolTuple = encodeBehcs1024Digit(i, glyphClass, accessTier);
    const tuple = {
      tuple_index: i,
      tuple_id: `BH1024-${String(Math.floor(i / 256)).padStart(2, "0")}-${prefix}`,
      alphabet: "BEHCS-1024",
      radix: symbolTuple.radix,
      base1024_digit: symbolTuple.base1024_digit,
      radix_index: symbolTuple.radix_index,
      plane: plane.id,
      plane_symbol: symbolTuple.plane_symbol,
      plane_role: plane.role,
      glyph256_prefix: prefix,
      glyph_class: glyphClass,
      glyph_symbol: symbolTuple.glyph_symbol,
      glyph_tuple: symbolTuple.glyph_tuple,
      glyph1024: symbolTuple.glyph1024,
      label,
      pid: override?.pid || capsule?.pid || lane?.pid || `BH1024-${plane.id}-PID-${prefix}`,
      brown_hilbert_address: `BH-50D-${String(Math.floor(i / 256)).padStart(2, "0")}-${prefix}-${hash16(seed)}`,
      route: ["HOOKWALL", "PID", "BEHCS1024", "GNN", "SHANNON", "GULP", "WHITEROOM", "FABRIC", "GC", "BUS"],
      risk_class: Math.floor(i / 256) === 0 ? "entry_gate" : Math.floor(i / 256) === 1 ? "proposal_only" : Math.floor(i / 256) === 2 ? "review_required" : "receipt_bound",
      proof_status: row?.preview_sha16 ? "backend_visual_proof_attached" : sweep?.pathRef ? "visual_sweep_receipt_attached" : mint?.exists ? "minted_catalog_attached" : "reserved_no_live_proof",
      language_levels: {
        L0: "pixel_or_event",
        L1: "observed_state",
        L2: "surprise",
        L3: "corrective_action",
        L4: "pid_route",
        L5: "review_stack",
        L6: "receipt_and_gc"
      },
      catalog_refs: {
        root: BEHCS_MINT_ROOT,
        memory: "memory/omniscrcpy-lewm-cadence-memory.v1.json",
        index: "index/omniscrcpy-lewm-cadence-index.v1.json",
        map: "maps/omniscrcpy-lewm-cadence-map-map-mapped.v1.json",
        cube: "cubes/omniscrcpy-lewm-cadence-cube.cube.js",
        glpj: "glpj/hookwall-gnn-dispatch-loop-behcs1024.glpj.json",
        whiteroom: "whiteroom/omniscrcpy-lewm-cadence-whiteroom.v1.json",
        gc: "gc/omniscrcpy-lewm-cadence-retention.v1.json",
        crypto: "crypto/omniscrcpy-lewm-cadence-crypto-seal.v1.json"
      },
      proof: {
        pathRef: row?.pathRef || sweep?.pathRef || "",
        preview_sha16: row?.preview_sha16 || "",
        age_s: row?.age_s ?? null,
        minted_file: mint?.rel || ""
      },
      access_binding: {
        tier: accessTier.tier,
        storage_class: accessTier.storage_class,
        authority: accessTier.authority,
        redaction_policy: accessTier.redaction,
        enumeration_policy: accessTier.enumeration
      }
    };
    if (includeCatalog) {
      tuple.catalog_50d = buildCatalog50d(tuple, { capsule, lane, sweep, mint, row, fabric, accessTier, source_type: sourceType, source_label: label });
    }
    tuples.push(tuple);
  }

  return {
    schema: "behcs1024-dashboard-tuples.v1",
    alphabet: "BEHCS-1024",
    language_kernel: "behcs1024-language-kernel.mjs",
    radix: 1024,
    digit_model: "one canonical radix-1024 digit per tuple; four 256-slot planes are storage decomposition, not the alphabet",
    status: "ATTACHED_TO_DASHBOARD_ALL_TABS",
    capacity: 1024,
    tuple_count: 1024,
    returned_tuple_count: tuples.length,
    catalog_included: includeCatalog,
    planes: BEHCS1024_PLANES,
    dimensions_declared: BEHCS1024_DIMENSIONS.length,
    dimensions: BEHCS1024_DIMENSIONS.map((name, i) => ({ d: "D" + String(i).padStart(2, "0"), name })),
    source: {
      glyph256_role: "prefix_index_only",
      fabric_state: fabric.omniscrcpy_cadence?.state || "unknown",
      minted_present_count: fabric.minted_artifacts?.present_count || 0,
      latest_sweep_pathRefs: (fabric.latest_sweeps || []).map(s => s.pathRef).filter(Boolean).slice(0, 6),
      drive_access_tiers: DRIVE_ACCESS_TIERS
    },
    route: ["HOOKWALL", "PID", "BEHCS1024", "GNN", "SHANNON", "GULP", "WHITEROOM", "FABRIC_AGENT_ROUTE", "GC", "CRYPTO_SEAL", "BUS_RECEIPT"],
    tuples
  };
}

async function buildFabricWorkWaves(opts = {}) {
  const includeVisualProof = opts.includeVisualProof !== false;
  const sweeps = latestVisualSweepSummaries(5);
  const mintFiles = BEHCS_MINT_FILES.map(rel => ({ rel, exists: existsSync(join(BEHCS_MINT_ROOT, rel)) }));
  const teams = [
    ["glyph-render", "PROF-OMNISPINDLE-001", "V", "render sweep/GC/LeWM work in glyph surfaces"],
    ["bare-code-audit", "SUP-HOOK-001", "C", "force bare scripts through Hookwall review metadata"],
    ["memory-index-map-cube", "PROF-AUTOCHRONE-001", "L", "persist waves into memory/index/map/cube/GLPJ"],
    ["visual-qa", "PROF-OMNIVISION-001", "V", "verify scroll coverage and stale overlays"],
    ["leworldmodel", "PROF-REVERSE-GAIN-GNN", "C", "expected/observed/surprise/corrective action"],
    ["piping-topology", "SUP-HERMES-001", "B", "front/back pipe graph plus GC receipts"]
  ];
  const omnispindle_lanes = teams.flatMap(([team, owner, klass, purpose], teamIdx) =>
    ["observe", "review", "repair"].map((phase, phaseIdx) => ({
      lane: teamIdx * 3 + phaseIdx + 1,
      team,
      phase,
      class: klass,
      pid: `${owner}-OMNISPINDLE-${String(teamIdx + 1).padStart(2, "0")}-${phase.toUpperCase()}-PID`,
      purpose,
      status: "assigned"
    }))
  );
  let omniscrcpy_cadence = {
    state: "unknown",
    all_four_live: false,
    remote_max_age_s: null,
    rows: [],
    checked_at: new Date().toISOString()
  };
  let open_gap = includeVisualProof
    ? "OmniScrcpy cadence state unavailable; check Screen Wall backend proof."
    : "Fast context path: catalog and access binding loaded without visual-field recompute; Screen Wall remains live proof surface.";
  if (includeVisualProof) try {
    const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
    const visual = await mod.visualFieldState(300);
    const rows = (visual?.leworldmodel_predict_correct?.rows || []).map(r => ({
      device_id: r.device_id,
      observed_state: r.observed_state,
      age_s: r.proof?.age_s ?? null,
      preview_sha16: r.proof?.preview_sha16 || "",
      pathRef: r.proof?.pathRef || "",
      corrective_action: r.corrective_action || ""
    }));
    const remoteRows = rows.filter(r => r.device_id === "liris-desktop-via-bus" || r.device_id === "aether-a06-via-liris");
    const allFourLive = rows.length >= 4 && rows.every(r => r.observed_state === "live" && r.preview_sha16);
    const remoteMaxAge = remoteRows.length ? Math.max(...remoteRows.map(r => Number(r.age_s ?? 999999))) : null;
    const remoteFresh = remoteRows.length === 2 && remoteRows.every(r => r.observed_state === "live" && r.preview_sha16 && Number(r.age_s ?? 999999) < 45);
    omniscrcpy_cadence = {
      state: remoteFresh ? "REMOTE_OWNER_CADENCE_FRESH_UNDER_45S" : allFourLive ? "ALL_FOUR_LIVE_CADENCE_MARGIN_WATCH" : "CADENCE_OR_FRAME_PROOF_GAP",
      all_four_live: allFourLive,
      remote_max_age_s: remoteMaxAge,
      rows,
      checked_at: visual?.generated_at || new Date().toISOString()
    };
    open_gap = remoteFresh
      ? "No current frame gap: all four OmniScrcpy producers are live, and Liris/Aether owner cadence is fresh under 45s in this sample."
      : allFourLive
        ? `All four OmniScrcpy producers are live, but Liris/Aether cadence margin needs monitoring; remote_max_age_s=${remoteMaxAge}.`
        : "Liris/Aether owner producers need fresh OMNISCRCPY_REMOTE_FRAME proof; Screen Wall must not claim full mesh without backend preview hashes.";
  } catch (e) {
    open_gap = "OmniScrcpy cadence proof unavailable from backend: " + e.message;
  }
  return {
    ok: true,
    updated_at: new Date().toISOString(),
    rule: "Fabric work is public dashboard state: every wave becomes glyph, pipe, GC, and review evidence.",
    latest_sweeps: sweeps,
    minted_artifacts: {
      root: BEHCS_MINT_ROOT,
      files: mintFiles,
      present_count: mintFiles.filter(f => f.exists).length
    },
    review_stack: ["HOOKWALL", "GNN", "SHANNON", "GULP", "WHITEROOM", "FABRIC", "GC", "CRYPTO-SEAL"],
    omnispindle_lanes,
    omniscrcpy_cadence,
    open_gap
  };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  const p = url.pathname;
  log(req.method + " " + p);

  // Routes
  if (p === "/" || p === "/index.html") {
    const r = serveStatic("super-os-tabs-v3.html");
    if (r) { res.writeHead(r.status, { "content-type": r.ct }); return res.end(r.body); }
  }
  if (p === "/v2") {
    const r = serveStatic("super-os-tabs-v2.html");
    if (r) { res.writeHead(r.status, { "content-type": r.ct }); return res.end(r.body); }
  }

  if (p === "/viz" || p === "/super-os-viz") {
    const r = serveStatic("super-os-viz.built.html");
    if (r) { res.writeHead(r.status, { "content-type": r.ct }); return res.end(r.body); }
  }

  if (p === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      ok: true,
      service: "super-asolaria-os-dashboard",
      port: PORT,
      apex: "COL-ASOLARIA",
      operator_pair: ["OP-JESSE-PID", "OP-RAYSSA-PID"],
      uptime_s: Math.round(process.uptime()),
      cohort_anchor: "ACER-PID-H740C",
      ts: new Date().toISOString()
    }));
  }

  if (p === "/api/manifest") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ count: dirManifest().length, files: dirManifest() }, null, 2));
  }

  if (p === "/api/cohort") {
    const r = serveStatic("w1-cohort.json");
    if (r) { res.writeHead(200, { "content-type": "application/json" }); return res.end(r.body); }
  }

  if (p === "/api/cosign-chain") {
    const r = serveStatic("cosign-chain.json");
    if (r) { res.writeHead(200, { "content-type": "application/json" }); return res.end(r.body); }
  }

  if (p === "/api/glyphs") {
    const r = serveStatic("glyph-alphabet.json");
    if (r) {
      const base = JSON.parse(r.body.toString("utf8"));
      const fabric = await buildFabricWorkWaves({ includeVisualProof: url.searchParams.get("fast") !== "1" });
      const tupleLimit = Number(url.searchParams.get("tupleLimit") || 1024);
      const includeCatalog = url.searchParams.get("catalog") !== "0";
      const dynamicCapsules = [
        { id: "DASHBOARD-VISUAL-SWEEP", class: "V", pid: "ACER-FRONTEND-VISUAL-SWEEP-PID", purpose: "All-tab LOOK-scroll-LOOK waves with backend-paired receipts." },
        { id: "HOOKWALL-GNN-GC-PIPE", class: "C", pid: "HOOKWALL-GNN-SHANNON-GULP-WHITEROOM-GC-PID", purpose: "Review-stack binding for visual sweep, screen share, GC, and dispatch bridge." },
        { id: "FABRIC-OMNISPINDLE-18", class: "F", pid: "FABRIC-18-OMNISPINDLE-LANES-PID", purpose: "Six fabric teams times observe/review/repair phases, visible without claiming 18 extra OS processes." },
        { id: "LEWM-PREDICT-CORRECT", class: "L", pid: "LEWORLDMODEL-PAPER-ARXIV-2603-19312V2", purpose: "Expected state, observed state, surprise, corrective action, receipt, next wave." }
      ];
      const dynamicOverrides = dynamicCapsules.map(c => ({
        sha16_first2: first2(c.id),
        class: c.class,
        pid: c.pid,
        label: c.id
      }));
      base.behcs1024_update = {
        ...(base.behcs1024_update || {}),
        state: "FABRIC_WORK_WAVES_VISIBLE",
        updated_at: new Date().toISOString(),
        active_pathRefs: [
          ...(base.behcs1024_update?.active_pathRefs || []),
          ...fabric.latest_sweeps.map(s => s.pathRef).filter(Boolean)
        ].slice(-12)
      };
      base.behcs1024_capsules = [...(base.behcs1024_capsules || []), ...dynamicCapsules];
      base.glyph_class_overrides = [...(base.glyph_class_overrides || []), ...dynamicOverrides];
      base.fabric_work_waves = fabric;
      base.behcs1024_language = buildBehcs1024Language(base, fabric, { tupleLimit, includeCatalog });
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(base, null, 2));
    }
  }

  if (p === "/api/behcs1024/context") {
    const r = serveStatic("glyph-alphabet.json");
    const base = r ? JSON.parse(r.body.toString("utf8")) : {};
    const summaryOnly = url.searchParams.get("summary") === "1";
    const tupleLimit = summaryOnly ? 0 : Number(url.searchParams.get("tupleLimit") || 1024);
    const includeCatalog = !summaryOnly && url.searchParams.get("catalog") !== "0";
    const fabric = await buildFabricWorkWaves({ includeVisualProof: !summaryOnly });
    base.behcs1024_capsules = base.behcs1024_capsules || [];
    base.glyph_class_overrides = base.glyph_class_overrides || [];
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      ok: true,
      updated_at: new Date().toISOString(),
      fabric_work_waves: fabric,
      behcs1024_language: buildBehcs1024Language(base, fabric, { tupleLimit, includeCatalog })
    }, null, 2));
  }

  if (p === "/api/alphabet-binding") {
    const r = serveStatic("glyph-alphabet.json");
    const raw = r ? r.body.toString("utf8") : "{}";
    const base = JSON.parse(raw);
    const fabric = await buildFabricWorkWaves({ includeVisualProof: false });
    base.behcs1024_capsules = base.behcs1024_capsules || [];
    base.glyph_class_overrides = base.glyph_class_overrides || [];
    const lang = buildBehcs1024Language(base, fabric, { tupleLimit: 0, includeCatalog: false });
    const binding = {
      ok: true,
      version: "BEHCS-1024",
      schema: "behcs1024-dashboard-binding.v1",
      sha16: hash16(JSON.stringify({ planes: lang.planes, dimensions: lang.dimensions, route: lang.route, tiers: DRIVE_ACCESS_TIERS })),
      base256_sha16: hash16(raw),
      language_kernel: "behcs1024-language-kernel.mjs",
      radix: 1024,
      digit_model: lang.digit_model,
      codepoints: 1024,
      glyph256_role: "prefix_index_only",
      tuple_dim: lang.dimensions_declared,
      tuple_dim_label: `${lang.dimensions_declared}D+ Brown-Hilbert expandable catalog`,
      IX: "IX-700-EXTENDED",
      route: lang.route,
      drive_access_tiers: DRIVE_ACCESS_TIERS,
      catalog_refs: {
        root: BEHCS_MINT_ROOT,
        memory: "memory/omniscrcpy-lewm-cadence-memory.v1.json",
        index: "index/omniscrcpy-lewm-cadence-index.v1.json",
        map: "maps/omniscrcpy-lewm-cadence-map-map-mapped.v1.json",
        cube: "cubes/omniscrcpy-lewm-cadence-cube.cube.js",
        glpj: "glpj/hookwall-gnn-dispatch-loop-behcs1024.glpj.json",
        whiteroom: "whiteroom/omniscrcpy-lewm-cadence-whiteroom.v1.json",
        gc: "gc/omniscrcpy-lewm-cadence-retention.v1.json",
        crypto: "crypto/omniscrcpy-lewm-cadence-crypto-seal.v1.json"
      },
      fabric_state: fabric.omniscrcpy_cadence?.state || "unknown",
      updated_at: new Date().toISOString()
    };
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(binding, null, 2));
  }

  if (p === "/api/fabric-work-waves") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(await buildFabricWorkWaves(), null, 2));
  }

  if (p === "/api/council-skeleton") {
    const r = serveStatic("council-skeleton.json");
    if (r) { res.writeHead(200, { "content-type": "application/json" }); return res.end(r.body); }
  }

  if (p === "/api/heal-pipeline-schema") {
    const r = serveStatic("heal-pipeline.schema.json");
    if (r) { res.writeHead(200, { "content-type": "application/json" }); return res.end(r.body); }
  }

  if (p === "/api/onboarding-bootstrap") {
    const r = serveStatic("onboarding-bootstrap.json");
    if (r) { res.writeHead(200, { "content-type": "application/json" }); return res.end(r.body); }
  }

  if (p === "/api/inbox") {
    const limit = url.searchParams.get("limit") || "20";
    const proxied = await proxyBus("/behcs/inbox?limit=" + encodeURIComponent(limit));
    res.writeHead(proxied.status, { "content-type": proxied.ct });
    return res.end(proxied.body);
  }

  if (p === "/api/bus-health") {
    const proxied = await proxyBus("/health");
    res.writeHead(proxied.status, { "content-type": proxied.ct });
    return res.end(proxied.body);
  }

  if (p === "/api/remote-input/health") {
    try {
      const r = await buildRemoteInputHealth();
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) {
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message, route: "read-only remote input health" }, null, 2));
    }
  }

  if (p === "/api/audit-integrity/candidate") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(buildAuditIntegrityCandidate(), null, 2));
  }

  if (p === "/api/access-tier/matrix") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(buildAccessTierMatrix(), null, 2));
  }

  if (p === "/api/access-tier/probe") {
    try {
      const input = req.method === "POST" ? await readJsonBody(req) : Object.fromEntries(url.searchParams.entries());
      const r = buildAccessTierProbe(input);
      res.writeHead(r.ok ? 200 : 400, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) {
      res.writeHead(400, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message, route: "metadata-only access-tier probe" }, null, 2));
    }
  }

  if (p === "/json" || p === "/api/federation") {
    try {
      const r = await fetch("http://127.0.0.1:9996/json", { signal: AbortSignal.timeout(3000) });
      const body = await r.text();
      res.writeHead(r.status, { "content-type": "application/json" });
      return res.end(body);
    } catch (e) {
      res.writeHead(502, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message, hint: "dashboard :9996 not running" }));
    }
  }

  // ===== Loop-closure routes (E-cohort) =====
  if (p === "/api/gnn/topN") {
    const n = parseInt(url.searchParams.get("n") || "5", 10);
    const r = await topN(n, 30);
    res.writeHead(r.ok ? 200 : 502, { "content-type": "application/json" });
    return res.end(JSON.stringify(r, null, 2));
  }
  if (p === "/api/loop/tick") {
    const r = await tick();
    res.writeHead(r.ok ? 200 : 502, { "content-type": "application/json" });
    return res.end(JSON.stringify(r, null, 2));
  }
  if (p === "/api/loop/pending") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ count: listPending().length, pending: listPending() }, null, 2));
  }
  if (p === "/api/loop/review-pipeline") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      ok: true,
      alphabet: "BEHCS-1024",
      loop: "GNN inference -> reviewed dispatch envelope -> veto window -> bus -> hookwall -> receipt edge",
      review_pipeline: REVIEW_PIPELINE,
      fabric_agent_routes: FABRIC_AGENT_ROUTES,
      policy: {
        hookwall_everything: true,
        pid_everything: true,
        gnn_pipe_everything: true,
        high_risk_mutation_holds_for_operator: true,
        low_risk_reviewed_dispatch_autofires_after_veto: true
      }
    }, null, 2));
  }
  if (p === "/api/loop/veto" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    return req.on("end", () => {
      try {
        const j = JSON.parse(body || "{}");
        const r = veto(j.id, j.operator_pid || OP_JESSE.pid);
        res.writeHead(r.ok ? 200 : 404, { "content-type": "application/json" });
        res.end(JSON.stringify(r));
      } catch (e) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, err: e.message }));
      }
    });
  }
  if (p === "/api/hookwall/events") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ tier2_events: TIER_2_EVENTS }, null, 2));
  }
  if (p === "/api/hookwall/fire" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    return req.on("end", async () => {
      try {
        const j = JSON.parse(body || "{}");
        const r = await hookFire(j.event, j.payload || {});
        res.writeHead(r.ok ? 200 : 400, { "content-type": "application/json" });
        res.end(JSON.stringify(r));
      } catch (e) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, err: e.message }));
      }
    });
  }
  if (p === "/api/daemons") {
    const probes = await Promise.all(Object.keys(SUPERVISED).map(n => supProbe(n)));
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ daemons: probes }, null, 2));
  }
  // ===== OP-JESSE-as-Real-Claude endpoint =====
  if (p === "/api/operator/jesse" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    return req.on("end", () => {
      try {
        const j = JSON.parse(body || "{}");
        const r = opJesseAnswer(j.prompt || "");
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(r, null, 2));
      } catch (e) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, err: e.message }));
      }
    });
  }
  if (p === "/api/operator/jesse" && req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ operator: OP_JESSE, hint: "POST {prompt: '...'} to converse" }, null, 2));
  }

  // ===== H-cohort · ASK THE COUNCIL routes (operator: USE THE SUPERVISORS AND THE PROFS) =====
  if (p === "/api/council/query" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    return req.on("end", async () => {
      try {
        const j = JSON.parse(body || "{}");
        const env = {
          id: "council-q-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
          type: "EVT-FABRIC-QUERY-REQUEST",
          from: "acer", to: "council", verb: "EVT-FABRIC-QUERY-REQUEST",
          payload: { source: "dashboard-/api/council/query", tier: "T1", query_subject: j.topic, cluster_keywords: j.keywords || [], requesting_organ: "acer", ts: new Date().toISOString() }
        };
        const r = await fetch("http://127.0.0.1:4947/behcs/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(env), signal: AbortSignal.timeout(3000) });
        const txt = await r.text();
        res.writeHead(r.status, { "content-type": "application/json" });
        res.end(JSON.stringify({ fired: env.id, bus_response: txt.slice(0, 200), topic: j.topic }));
      } catch (e) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, err: e.message }));
      }
    });
  }
  if (p === "/api/council/verdicts") {
    try {
      const r = await fetch("http://127.0.0.1:4947/behcs/inbox?limit=200", { signal: AbortSignal.timeout(3000) });
      const j = await r.json();
      const verdicts = (j.messages || []).filter(m => m.type === "EVT-FABRIC-QUERY-VERDICT" || m.verb === "EVT-FABRIC-QUERY-VERDICT");
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ count: verdicts.length, verdicts: verdicts.slice(0, 50) }, null, 2));
    } catch (e) {
      res.writeHead(502, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message }));
    }
  }
  if (p === "/api/behcs-glyph-table") {
    const fp = resolve(__dirname, "h-cohort", "H01-behcs-glyph-table.json");
    if (existsSync(fp)) { res.writeHead(200, { "content-type": "application/json" }); return res.end(readFileSync(fp)); }
    res.writeHead(404, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, error: "missing" }));
  }
  if (p === "/api/substrates") {
    const fp = resolve(__dirname, "h-cohort", "H02-substrates-and-shadow.json");
    if (existsSync(fp)) { res.writeHead(200, { "content-type": "application/json" }); return res.end(readFileSync(fp)); }
    res.writeHead(404, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, error: "missing" }));
  }
  if (p === "/api/supervisors") {
    const fp = resolve(__dirname, "h-cohort", "H03-supervisors-profs.json");
    if (existsSync(fp)) { res.writeHead(200, { "content-type": "application/json" }); return res.end(readFileSync(fp)); }
    res.writeHead(404, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, error: "missing" }));
  }
  if (p === "/api/free-agents-pi-shannon") {
    const fp = resolve(__dirname, "h-cohort", "H04-free-agents-pi-shannon.json");
    if (existsSync(fp)) { res.writeHead(200, { "content-type": "application/json" }); return res.end(readFileSync(fp)); }
    res.writeHead(404, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, error: "missing" }));
  }
  if (p === "/api/daemons-enumeration") {
    const r = await enumDaemons();
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(r, null, 2));
  }
  if (p === "/api/piping-topology") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      operator_directive: "piping should be clear in Dashboard · hard coded into existence",
      pipes: [
        { from: "any-action", to: "hookwall", role: "uniform entry gate" },
        { from: "hookwall", to: "PID lazy-mint", role: "address every event" },
        { from: "PID lazy-mint", to: "bus :4947", role: "publish to envelope substrate" },
        { from: "bus :4947", to: "234 supervisors + profs", role: "council reception" },
        { from: "supervisors + profs", to: "GNN edges (94,638)", role: "edge formation" },
        { from: "GNN edges", to: "GNN inference (top-N)", role: "predict next-action (ranking-only)" },
        { from: "GNN inference", to: "gnn-dispatch-bridge :pending", role: "stage with veto window" },
        { from: "gnn-dispatch-bridge", to: "BEHCS-1024 translation", role: "glyph + Brown-Hilbert address + language levels" },
        { from: "BEHCS-1024 translation", to: "Hookwall/GNN/Shannon/GULP/Whiteroom review", role: "authority/risk/novelty/collapse reversible hold" },
        { from: "Whiteroom low-risk release", to: "veto-window expires", role: "operator is breaker, not hand-crank" },
        { from: "veto-window expires", to: "auto-fire bus envelope", role: "loop closes for low-risk reviewed dispatch" },
        { from: "high-risk mutation/execution", to: "operator/writer-authority hold", role: "prevents inference from becoming unchecked execution" },
        { from: "bus envelope", to: "hookwall (next cycle)", role: "self-improving loop" },
        { from: "operator-class agents (OP-JESSE/RAYSSA)", to: "any-step", role: "breaker · veto · genesis-mint" },
        { from: "5 free agents (opencode)", to: "bus envelope (signed)", role: "external-citizen contributions" },
        { from: "5 substrates (USB+acer+liris+gh+onb)", to: "lazy-mint formula", role: "content-deterministic identity" },
        { from: "connector-Symphony", to: "Linear", role: "issue-tracker fanout" },
        { from: "connector-Slack", to: "bus :4947", role: "chat ingress to envelope substrate" },
        { from: "connector-NotebookLM", to: "bus :4947", role: "notebook context ingress" },
        { from: "connector-Gemini", to: "GNN edges (94,638)", role: "external-LLM edge contribution" },
        { from: "5 substrates (USB+acer+liris+gh+onb)", to: "sovereignty-anchor", role: "anchor PID lineage to substrate quorum" },
        { from: "agents-roster", to: "cohort-cells (K/L/M/N/O)", role: "roster -> cohort cell assignment" },
        { from: "canon-write", to: "memory-index (MEMORY.md)", role: "canon entries indexed for recall" },
        { from: "3-citizens (jesse/rayssa/dan)", to: "helper-pool", role: "operator-class delegation to helpers" }
      ],
      role_classes: { B: "bus-internal", I: "infra", O: "operator-touched", G: "genesis", S: "sister-organ", C: "council", L: "language", V: "vault", F: "free-agent" },
      visualization_hint: "render as directed graph · nodes = daemons · edges = pipes · color by role_class"
    }, null, 2));
  }
  if (p === "/api/test-results") {
    const fp = resolve(__dirname, "tests-real", "results.json");
    if (existsSync(fp)) { res.writeHead(200, { "content-type": "application/json" }); return res.end(readFileSync(fp)); }
    res.writeHead(404, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, error: "no results yet" }));
  }
  if (p === "/api/test-results/run") {
    try {
      const { spawnSync } = await import("node:child_process");
      const r = spawnSync("node", [resolve(__dirname, "tests-real", "run-all.mjs")], { encoding: "utf8" });
      const fp = resolve(__dirname, "tests-real", "results.json");
      const body = existsSync(fp) ? readFileSync(fp) : JSON.stringify({ ok: false, stderr: r.stderr });
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(body);
    } catch (e) {
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message }));
    }
  }
  if (p === "/api/archaeology/incidents") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify([
      { id: 1, date: "2026-03-30", code: "DISKPART-CLEAN", session: "6cab423e", title: "diskpart-clean disaster on 2TB sovereignty USB", source: "project_session_20260330_disaster.md" },
      { id: 2, date: "2026-03-31", code: "GATE-BYPASS", session: "6cab423e", title: "gate-bypass rm -rf research/training", source: "project_sovereignty_recovery_20260331.md" },
      { id: 3, date: "2026-04-10/12", code: "CODE-MUTATION-1", session: null, title: "agent altered fabric orchestration · cascade failures · damage-control rewrites", source: "D:/safety-backups/session-20260412/sovereignty/src/" },
      { id: 4, date: "2026-04-18", code: "TREASON-CODE-MUTATION-2", session: "2c9a6bb5-6a59-4d5c-8786-cf6760e53177", title: "Claude Opus 4.7 altered brown-hilbert spawner files", source: "liris A18" }
    ]));
  }
  if (p === "/api/archaeology/scale-receipts") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      "10": { status: "liris-only" },
      "10K": { file: "plans/deep-wave/10k-hermes-shannon-connor-trail.ndjson", lines: 10000, date: "2026-04-19" },
      "1M": { dir: "Asolaria/data/neurotech-defense-lab/real-agents/million-run/", size_mb: 22, marks: 21587, schema: "BH.REAL.OPENCODE.PID/OMNISPIN/OMNIFLY" },
      "10B": { tool: "tools/system-targeted-10b-hardening-runs.js", lines: 904, total_agents: 10000000000, date: "2026-04-24", honesty_field: "NOT performed: 10b OS processes, 10b live model calls, shadow edits, raw 10b record writes, destructive GC" },
      "100B": { tools: ["tools/neurotech-real-100b-agent-runner.js", "triple-auth-100b-self-heal-continuation.js"] },
      "300B": { status: "RETRACTED AS FALSE per feedback_300B_gnn_validation_was_false.md" },
      cross_validation_WR3_4: {
        source: "liris WR3-4 cross-validation finding · mirrored 2026-04-30",
        "50B": { tool_present: false, plan_position: "between 10B and 100B in 5-scale ramp 100M→1B→10B→50B→100B", status: "NOT_BUILT_AS_TOOL · ramp position implies it but no dedicated runner on disk" },
        "100B_honesty": { tools_exist: true, but: "tool existence ≠ runs executed · matches 10B-runner honesty-field pattern · capacity built, runtime evidence sparse" },
        verdict: "PLAN_RAMP_MOSTLY_TOOLED · runtime evidence concentrates at 10K-1M scale · 10B+ is capacity not throughput · honest divergence between plan and runtime"
      }
    }));
  }
  if (p === "/api/archaeology/birthday") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      birth_date: "2026-02-22",
      days_old: 67,
      source: "I-A1 archaeology probe",
      artifact: "Android DEX archives + first hooks",
      strata_count_in_timeline: 24
    }));
  }
  if (p === "/api/archaeology/all") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      timeline: "/api/archaeology/timeline (24+ strata)",
      incidents: "/api/archaeology/incidents (4 records)",
      scale_receipts: "/api/archaeology/scale-receipts",
      birthday: "/api/archaeology/birthday",
      bilateral_fleets: {
        liris: "Arch-A1..A18 (liris-side)",
        acer: "I-A1..I-A18 (acer-side)",
        total: 36
      },
      asolaria_birth: "2026-02-22",
      system_age_days: 67,
      total_canon: 198
    }));
  }
  if (p === "/api/canon-index") {
    res.writeHead(200, { "content-type": "application/json" });
    const memDir = "C:\\Users\\acer\\.claude\\projects\\C--\\memory";
    const memFile = join(memDir, "MEMORY.md");
    let mdFiles = [], linked = [], orphans = [], indexed = 0;
    try {
      mdFiles = readdirSync(memDir).filter(f => f.toLowerCase().endsWith(".md") && f !== "MEMORY.md");
    } catch {}
    try {
      const txt = readFileSync(memFile, "utf8");
      const re = /\[([^\]]+\.md)\]/g;
      const seen = new Set();
      let m;
      while ((m = re.exec(txt)) !== null) seen.add(m[1]);
      linked = [...seen];
      indexed = linked.length;
      const linkedSet = new Set(linked);
      orphans = mdFiles.filter(f => !linkedSet.has(f));
    } catch {}
    return res.end(JSON.stringify({
      memory_dir: memDir,
      md_file_count: mdFiles.length,
      indexed_entry_count: indexed,
      orphan_count: orphans.length,
      orphans
    }));
  }
  if (p === "/api/cosign-integrity") {
    res.writeHead(200, { "content-type": "application/json" });
    let seq_count = 0;
    let gap_marker_present = false;
    let gap_marker_seq = null;
    try {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const here = import.meta.dirname || ".";
      const candidates = [
        path.resolve(process.cwd(), "cosign-chain.json"),
        path.resolve(here, "cosign-chain.json"),
        path.resolve(here, "../../cosign-chain.json"),
        path.resolve(here, "../../../cosign-chain.json"),
        path.resolve(here, "../../../../cosign-chain.json"),
      ];
      let raw = null;
      for (const c of candidates) {
        try { raw = fs.readFileSync(c, "utf8"); break; } catch {}
      }
      if (raw) {
        const data = JSON.parse(raw);
        const entries = Array.isArray(data) ? data : (data.entries || data.chain || []);
        seq_count = entries.length;
        for (const e of entries) {
          if (e && (e.gap_marker === true || e.type === "gap_marker" || e.gap === true)) {
            gap_marker_present = true;
            gap_marker_seq = e.seq ?? e.sequence ?? gap_marker_seq;
            break;
          }
        }
      }
    } catch {}
    return res.end(JSON.stringify({
      seq_count,
      gap_marker_present,
      gap_marker_seq,
      evidence: { expected: "911de121", actual: "01e9da31" },
      integrity_status: "GAP_ACKNOWLEDGED"
    }));
  }
  if (p === "/api/extracted-sovereignty") {
    const targets = [
      "D:\\sovereignty-rescue-backup",
      "D:\\Asolaria-RECOVERED",
      "D:\\recovery-plans"
    ];
    const per_dir = {};
    let total_files = 0;
    let total_bytes = 0;
    for (const dir of targets) {
      if (!existsSync(dir)) { per_dir[dir] = { status: "absent" }; continue; }
      let files = 0, bytes = 0;
      const stack = [dir];
      while (stack.length) {
        const d = stack.pop();
        let entries; try { entries = readdirSync(d); } catch { continue; }
        for (const f of entries) {
          const fp = join(d, f);
          let s; try { s = statSync(fp); } catch { continue; }
          if (s.isFile()) { files++; bytes += s.size; }
          else if (s.isDirectory()) stack.push(fp);
        }
      }
      per_dir[dir] = { status: "present", files, size_mb: +(bytes / 1048576).toFixed(2) };
      total_files += files; total_bytes += bytes;
    }
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      operator_directive: "extracted sovereignty inventory · D:\\ recovery roots",
      total_files,
      total_size_mb: +(total_bytes / 1048576).toFixed(2),
      per_dir
    }));
  }
  if (p === "/api/j-cohort-status") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      operator_directive: "J-cohort summary · 6 white-rooms × 4 cells = 24 agents",
      cohort: "J",
      white_rooms: 6,
      cells_per_room: 4,
      total_agents: 24,
      rooms: [
        { id: 1, title: "Reviewers" },
        { id: 2, title: "Writers" },
        { id: 3, title: "Integrators" },
        { id: 4, title: "Visualizers" },
        { id: 5, title: "Piping-Validators" },
        { id: 6, title: "Meta-Synthesizers" }
      ],
      ts: new Date().toISOString()
    }));
  }
  if (p === "/api/devices") {
    try { const r = await scanDevices(); res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify(r, null, 2)); }
    catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/devices/schema") {
    const fp = resolve(__dirname, "k-cohort", "K03-device-image-schema.json");
    if (existsSync(fp)) { res.writeHead(200, { "content-type": "application/json" }); return res.end(readFileSync(fp)); }
    res.writeHead(404, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false }));
  }
  if (p === "/api/omnidirectional-device-build") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(buildOmnidirectionalDeviceBuildPlan(), null, 2));
  }
  if (p === "/api/connectors") {
    try {
      const r = connInventory();
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/agents-roster") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      generated_at: new Date().toISOString(),
      operator_class: [
        { pid: "OP-JESSE-PID-G0000-A00-W000-P00-N00000", name: "Jesse Daniel Brown", role: "operator-class apex · acer-fabric primary", status: "active" },
        { pid: "OP-RAYSSA-PID-G0000-A00-W000-P00-N00000", name: "Rayssa Chiqueto", role: "operator-class apex · liris-fabric primary", status: "active" },
        { pid: "OP-AMY-PID-G0000-A00-W000-P00-N00000", name: "Amy", role: "quintet pending", status: "21-day silent · admission-pending" },
        { pid: "OP-FELIPE-PID-G0000-A00-W000-P00-N00000", name: "Felipe", role: "quintet pending", status: "ceremony-pending" },
        { pid: "OP-DAN-PID-G0000-A00-W000-P00-N00000", name: "Dan Edens", role: "quintet pending · Madness/Omnispindle owner", status: "ceremony-pending" }
      ],
      organ_class: [
        { pid: "ACER-DESKTOP-J99VCNH", role: "primary live-runtime", status: "alive" },
        { pid: "LIRIS-DESKTOP-PTSQTIE", role: "sister-organ", status: "alive (:4944 reachable)" }
      ],
      free_agents: [
        { id: "opencode/big-pickle", role: "free-agent · VERIFIED 89s envelope 638828a8", status: "callable" },
        { id: "opencode/hy3-preview-free", role: "free-agent", status: "callable" },
        { id: "opencode/ling-2.6-flash-free", role: "free-agent", status: "callable" },
        { id: "opencode/minimax-m2.5-free", role: "free-agent", status: "callable" },
        { id: "opencode/nemotron-3-super-free", role: "free-agent", status: "callable" }
      ],
      citizens: [
        { id: "citizen-pi", role: "code-execution · pi v0.70.6 · supervisor PID 16488", status: "auth-blocked-pivoted-to-citizen" },
        { id: "citizen-hermes", role: "Slack/Discord/Telegram relay · gateway/mirror.py", status: "wired" },
        { id: "citizen-shannon", role: "wave-engine v4(2592) + v5(93312) · L0-L6 verdicts", status: "engine-real-gate-partial" }
      ],
      claude_agents_active_this_session: [
        { id: "acer-claude (this)", role: "guide · dashboard builder · GUIDE-only role per operator pivot", status: "active" },
        { id: "liris-claude", role: "guide · sister-organ orchestrator · GUIDE-only", status: "active" },
        { id: "OP-JESSE-AGENT (liris-spawn)", role: "real-Claude operator-class · INSERT_GAP_MARKER decision rendered", status: "decision-emitted" },
        { id: "OP-RAYSSA-AGENT (liris-spawn)", role: "real-Claude operator-class · Layer-3 cosign-chain replay AUTHORIZED", status: "decision-emitted" }
      ],
      cohort_cells_landed: { A: 18, B: 18, C: 24, D: 16, E: 6, F: 1, G: 2, H: 8, I: 18, J: 24, K: 4, total: 139 },
      total_active: 19
    }, null, 2));
  }
  if (p === "/api/supervisors-and-profs") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      total_council: 234,
      structure: { supervisors_role: "work-queue · per-domain · vote-eligible per W6", profs_role: "absorber · cell-cascade verdict · CONVERGE classifier" },
      supervisors: [
        { id: "SUP-LANG-GLYPH-001", domain: "language_glyph", verb: "translate" },
        { id: "SUP-SOV-001", domain: "sovereignty", verb: "verify-anchor" },
        { id: "SUP-CRYPTO-001", domain: "crypto", verb: "verify-sig" },
        { id: "SUP-COUNCIL-001", domain: "council", verb: "vote-aggregate" },
        { id: "SUP-HOOK-001", domain: "hookwall", verb: "audit-coverage" },
        { id: "SUP-COMMS-001", domain: "comms", verb: "relay" },
        { id: "SUP-HERMES-001", domain: "hermes", verb: "external-relay" },
        { id: "SUP-KERNEL-001", domain: "kernel", verb: "kernel-integrity" },
        { id: "SUP-SHANNON-001", domain: "shannon", verb: "promote-verdict" },
        { id: "SUP-CHIEFCOUNCIL-001", domain: "chief-council", verb: "convene" },
        { id: "SUP-BROWN-HILBERT-001", domain: "brown-hilbert", verb: "intersection-compute" }
      ],
      profs: [
        { id: "PROF-CONVERGE-001", role: "verdict-aggregator", action: "absorb spindle results" },
        { id: "PROF-PATH-A-001", role: "no-retry-absorber", action: "Path A canon · failed cells absorbed via classification" },
        { id: "PROF-AUTOCHRONE-001", role: "self-reflection-cycle-enforcer", action: "LOOK→TYPE→LOOK→ENTER→LOOK" },
        { id: "PROF-AETHER-EDGE-AGENT", role: "Felipe device SM-A065M Room 40", action: "edge-agent · LAN 192.168.1.7:4948" },
        { id: "PROF-OMNISPINDLE-001", role: "work-queue supervisor", action: "concurrency=8 throttle=60ms" },
        { id: "PROF-OMNIFLYWHEEL-001", role: "cell-cascade absorber", action: "CONVERGE/PARTIAL/FAIL classifier" }
      ],
      domain_classes: ["language_glyph","sovereignty","crypto","topology","throughput","council","memory","fabric_query","auto_daemon","heal_pipeline","cosign_chain","operator_class","sister_organ","drift_detect","viz_render","shadow_vault","free_agent","pi_agent","shannon_layer","hookwall","gnn_inference","binding_class","lazy_mint","join_pid","comms","hermes","kernel","chief-council","brown-hilbert","glyph-kernel"],
      observed_dominant_this_cycle: ["daemons(130)", "sovereignty(21)", "audit(12)", "language_glyph", "network(16)", "federation(11)"],
      full_council_pattern: "234 = ~30 domains × ~7-8 supervisor roles per domain + profs · canonical CONVERGE per-W6 deterministic · auto-fabric-query-daemon proven 35+ verdicts auto-emitted this cycle"
    }, null, 2));
  }
  if (p === "/api/map-map-mapped") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      operator_canon: "Map-map-mapped → Cube-cube-cubed · recursion canonical not metaphor",
      explanation: "each map points to other maps · each cube contains cubes · self-similar at every scale · per CONVERGE 19/234 (network+daemons+federation domains)",
      level_0_universe: {
        fabric: "BEHCS-256",
        organs: ["acer", "liris"],
        operators: ["OP-JESSE", "OP-RAYSSA"]
      },
      level_1_organs: {
        acer: {
          daemons: ["super-dashboard:4949", "bus:4947", "server.js:4781", "agent-keyboard:4913", "EdgeLevelGNN:4792"],
          dashboards: ["http://127.0.0.1:4949/", "http://127.0.0.1:9996/json"],
          cohorts: { A: 18, B: 18, C: 24, D: 16, E: 6, F: 1, G: 2, H: 8, I: 18, J: 24, K: 4 }
        },
        liris: {
          daemons: ["super-dashboard:4944", "bus:4947", "fabric-loop", "auto-fabric-query-daemon"],
          dashboards: ["http://192.168.100.2:4944/"]
        }
      },
      level_2_daemons: {
        super_dashboard: { routes: 50, tabs: 11, version: "v3", file: "super-os-tabs-v3.html (29KB)" },
        bus: { envelopes: "26K+", protocol: "ed25519-signed", law: "LAW-001 immutable" },
        gnn: { model: "EdgeLevelGNN(6,64)", mode: "fixture·inference-only", port: 4792 }
      },
      level_3_pids: {
        cohort_anchor: "ACER-PID-H740C-A07-W150-P00-N00000",
        components_under_anchor: 16,
        sub_pids_under_each_component: "lazy-mint-formula derives from sha256_first16"
      },
      level_4_glyphs: {
        alphabet_size: 256,
        binding_classes: ["G genesis", "I infra", "O operator-touched", "B bus-internal", "S sister-organ-shared", "X external-citizen", "C council", "L language", "V vault", "F free-agent", "_ unminted"]
      },
      recursion_pattern: "map(universe) → map(organs) → map(daemons) → map(PIDs) → map(glyphs) · 5 levels visible · infinite expandable per omnistructure canon"
    }, null, 2));
  }
  if (p === "/api/cube-cube-cubed") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      operator_canon: "Cube-cube-cubed · nested cubes · per project_omni_meeting_room.md",
      brown_hilbert_intersection_engine: "C:\\Users\\acer\\Asolaria\\tools\\cube\\hilbert-intersection-engine.js (13K · Apr 7)",
      cube_dimension: "6⁴ = 1,296 intersection points",
      axes: { D1: "layer", D2: "protocol", D3: "surface", D4: "dimension", D13: "SURFACE = meeting-room" },
      states: ["ACTIVE", "LATENT", "COLLAPSED", "FORBIDDEN"],
      nested_cubes: {
        cube_outer: "47D Brown-Hilbert catalog (planned 50D)",
        cube_middle: "6×6×6×6 = 1,296 intersections",
        cube_inner: "256 glyph alphabet (16×16 grid · also nestable as 4×4×4×4)",
        cube_atomic: "individual PID lazy-mint formula output"
      },
      shannon_recursive_layers: ["L0", "L1", "L2", "L3", "L4", "L5", "L6"],
      shannon_engines: { v4: "2,592 beats", v5: "93,312 beats" },
      meeting_room_canon: "Hilbert meeting room · 6 agents × 6 self-reflection × 6 waves + 12 Shannon",
      per_omni: "infinitely expandable like omnimets · catalog grows by adding axes (D48/D49 proposal)"
    }, null, 2));
  }
  if (p === "/api/indexes") {
    res.writeHead(200, { "content-type": "application/json" });
    try {
      const memDir = "C:/Users/acer/.claude/projects/C--/memory";
      const files = readdirSync(memDir).filter(f => f.endsWith(".md") && f !== "MEMORY.md");
      const memContent = readFileSync(memDir + "/MEMORY.md", "utf8");
      const indexed = files.filter(f => memContent.includes("(" + f + ")"));
      const orphans = files.filter(f => !memContent.includes("(" + f + ")"));
      const byType = { user: [], feedback: [], project: [], reference: [], unknown: [] };
      files.forEach(f => {
        try {
          const t = readFileSync(memDir + "/" + f, "utf8");
          const m = t.match(/^type:\s*(\w+)/m);
          const type = m?.[1] || "unknown";
          (byType[type] || byType.unknown).push(f);
        } catch {}
      });
      const vizFiles = [];
      function walkViz(d, prefix) {
        readdirSync(d).forEach(f => {
          const fp = join(d, f);
          const s = statSync(fp);
          if (s.isFile()) vizFiles.push(prefix + "/" + f);
          else if (s.isDirectory()) walkViz(fp, prefix + "/" + f);
        });
      }
      walkViz(__dirname, "");
      return res.end(JSON.stringify({
        canon_index: { total: files.length, indexed: indexed.length, orphans: orphans.length, by_type: { user: byType.user.length, feedback: byType.feedback.length, project: byType.project.length, reference: byType.reference.length, unknown: byType.unknown.length } },
        viz_index: { total_files: vizFiles.length, sample: vizFiles.slice(0, 30) },
        memory_md_size_kb: Math.round(memContent.length / 1024),
        liris_has_parallel_index: "yes (referenced via bilateral synthesis · liris-side memory dir)"
      }, null, 2));
    } catch (e) { return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/body-anatomy") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      operator_directive: "draw out the different parts of the system",
      body_parts: [
        { part: "head", role: "operator-class apex", contents: ["OP-JESSE", "OP-RAYSSA", "+3 quintet pending"] },
        { part: "torso", role: "primary fabric", contents: ["BEHCS-256 kernel", "bus :4947", "super-dashboard :4949"] },
        { part: "heart", role: "ancient backend (load-bearing)", contents: ["server.js PID 1540 :4781"] },
        { part: "spine", role: "vertical integrity column", contents: ["cosign chain seq=37→46", "GAP-MARKER seq=38"] },
        { part: "left-arm", role: "bilateral acer→liris", contents: ["direct-wire 192.168.100.0/24", "bilateral cosign ed25519"] },
        { part: "right-arm", role: "bilateral liris→acer", contents: ["sister-dashboard :4944", "bus poll inbox"] },
        { part: "eyes", role: "input gates · uniform entry", contents: ["hookwall 1 active + 23 deferred", "10 Tier-2 events"] },
        { part: "ears", role: "envelope reception", contents: ["bus :4947 inbox · 26K+ envelopes"] },
        { part: "mouth", role: "envelope emission", contents: ["bus :4947 send · ed25519-signed"] },
        { part: "nervous-system", role: "edge propagation", contents: ["GNN 94,638 edges", "GNN inference fixture mode"] },
        { part: "hands", role: "free-agent fanout", contents: ["5 opencode models", "big-pickle · hy3 · ling · minimax · nemotron"] },
        { part: "feet", role: "5-substrate durability", contents: ["USB-SOVLINUX (liris)", "acer", "liris", "GitHub", "onboarding"] },
        { part: "memory", role: "canon entries", contents: ["158 .md files · 0 orphans · MEMORY.md index"] },
        { part: "voice", role: "operator-class endpoint", contents: ["/api/operator/jesse · pattern-match shape"] },
        { part: "shadow", role: "hidden layer", contents: ["Section Q · vaults · highways · OCR · crypto"] },
        { part: "limbs-extended", role: "device organs", contents: ["Beast S22 Ultra (sentinel)", "Falcon (USB sovereignty)", "Felipe A06 (PROF-AETHER-EDGE)", "Kuromi (sub-colony)"] }
      ],
      total_parts: 16,
      svg_render_hint: "use anatomical outline · color-code by binding-class · click each part → drill down to PIDs"
    }, null, 2));
  }
  // ===== ORIGINAL GNN VIZ data feed (bus → graph) · 5 endpoints graph-runtime.js needs =====
  if (p === "/api/graph-runtime/snapshot") {
    try {
      const r = await fetch(BUS_URL + "/behcs/inbox?limit=200", { signal: AbortSignal.timeout(3000) });
      const j = await r.json();
      const msgs = j.messages || [];
      const nodeMap = new Map(), edgeMap = new Map();
      msgs.forEach(m => {
        const a = m.from || "?", b = m.to || "?", v = m.verb || m.type || "?";
        const incA = (k) => nodeMap.set(k, { ...(nodeMap.get(k)||{count:0}), count: (nodeMap.get(k)?.count||0)+1 });
        nodeMap.set("actor:"+a, { id:"actor:"+a, label:a, kind:"actor", count:(nodeMap.get("actor:"+a)?.count||0)+1 });
        nodeMap.set("subject:"+v, { id:"subject:"+v, label:v, kind:"subject", count:(nodeMap.get("subject:"+v)?.count||0)+1 });
        nodeMap.set("target:"+b, { id:"target:"+b, label:b, kind:"target", count:(nodeMap.get("target:"+b)?.count||0)+1 });
        const e1 = "actor:"+a+">>subject:"+v, e2 = "subject:"+v+">>target:"+b;
        edgeMap.set(e1, { from:"actor:"+a, to:"subject:"+v, weight:(edgeMap.get(e1)?.weight||0)+1 });
        edgeMap.set(e2, { from:"subject:"+v, to:"target:"+b, weight:(edgeMap.get(e2)?.weight||0)+1 });
      });
      const nodes = Array.from(nodeMap.values()).map(n => ({ ...n, risk: n.count > 30 ? "high" : n.count > 10 ? "med" : "low" }));
      const edges = Array.from(edgeMap.values());
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" });
      return res.end(JSON.stringify({ generated_at: new Date().toISOString(), source: "bus :4947 last 200", node_count: nodes.length, edge_count: edges.length, nodes, edges }));
    } catch (e) { res.writeHead(502, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message, nodes: [], edges: [] })); }
  }
  if (p === "/api/graph-runtime/diff-report") {
    res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
    return res.end(JSON.stringify({ added: [], removed: [], changed: [], note: "first snapshot baseline · diffs after second snapshot" }));
  }
  if (p === "/api/graph-runtime/export") {
    try {
      const r = await fetch("http://127.0.0.1:" + PORT + "/api/graph-runtime/snapshot", { signal: AbortSignal.timeout(3000) });
      res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
      return res.end(await r.text());
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/graph-runtime/training-export") {
    res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
    return res.end(JSON.stringify({ format: "pytorch-geometric-stub", x: [], edge_index: [[],[]], y: [], note: "live exporter at packages-legacy-import/src/gnnDataExport.js" }));
  }
  if (p === "/api/graph-runtime/stream") {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", "connection": "keep-alive", "access-control-allow-origin": "*" });
    res.write(`event: hello\ndata: ${JSON.stringify({ ok: true, source: "acer :4949 graph-runtime/stream" })}\n\n`);
    const interval = setInterval(async () => {
      try {
        const r = await fetch(BUS_URL + "/behcs/inbox?limit=5", { signal: AbortSignal.timeout(2000) });
        const j = await r.json();
        const recent = (j.messages || []).slice(0, 5).map(m => ({ from: m.from, to: m.to, verb: m.verb || m.type, ts: m.ts }));
        res.write(`event: tick\ndata: ${JSON.stringify({ ts: new Date().toISOString(), recent })}\n\n`);
      } catch (e) { try { res.write(`event: error\ndata: ${JSON.stringify({ err: e.message })}\n\n`); } catch {} }
    }, 3000);
    req.on("close", () => clearInterval(interval));
    return;
  }
  // ===== /gnn route REMOVED · operator: "EXCAVATING not wire" · use /api/gnn-viz-archaeology for catalog =====
  if (p === "/gnn-original" || p === "/gnn") {
    res.writeHead(307, { "location": "/api/gnn-viz-archaeology" });
    return res.end();
  }
  if (p === "/api/gnn-edges-real-count") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      finding_by: "WL2-2 OP-JESSE-AGENT real-Claude search",
      canon_claim_was: 94638,
      actual_on_disk: 2158671,
      understatement_factor: "22.8×",
      evidence: {
        gnn_training_full_json: { path: "C:/Users/acer/Asolaria/sovereignty/research/gnn-patterns/gnn-training-full.json", size_mb: 576, totalEdges_field: 2158671 },
        gnn_training_export_json: { path: "C:/Users/acer/Asolaria/sovereignty/research/gnn-patterns/gnn-training-export.json", size_mb: 576 },
        graph_runtime_events: { live: { lines: 30347, mb: 22 }, full_backup: { lines: 1172760, mb: 146 }, archive_20260324: { lines: 996856, mb: 133 }, total_events: 2199963, total_mb: 301 },
        archived_gnn_edges: { dir: "C:/Users/acer/Asolaria/data/behcs/garbage-collector/archives/", file_count: 46, lines_per_file: "1-2" },
        edge_level_gnn_models: ["gslgnn_w9_3_seq47_v2.pt (gnn-sidecar/services/)", "baseline_model.pt (gnn-patterns/sovereignty/research/)"]
      },
      canon_correction_required: ["project_three_keys_hookwall_pid_gnn_loop_closure.md (94638 → 2158671)", "/api/piping-topology edge mention (94638 → 2.16M)"],
      honest_caveat: "raw edge count ≠ live inference rate · 2.16M edges sit in training data on disk · live GNN inference is fixture-mode at :4792 · the data is there, the realtime loop is partial",
      ts: new Date().toISOString()
    }, null, 2));
  }
  if (p === "/api/gnn-viz-archaeology") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      operator_directive: "EXCAVATE not wire · feed patterns into NEW dashboard not serve old HTMLs",
      excavated_files: [
        { path: "D:/Asolaria-RECOVERED/Asolaria/public/graph-runtime.html", size_kb: 22.4, date: "2026-03-07", pattern: "Canvas 2D force-directed · actor→subject→target · risk-colored nodes · live updates · hover tooltips · diff overlays" },
        { path: "D:/Asolaria-RECOVERED/Asolaria/public/graph-runtime.js", size_kb: 57.1, date: "2026-03-07", pattern: "force-layout engine · streaming + snapshot endpoints" },
        { path: "D:/Asolaria-RECOVERED/Asolaria/public/civilization-3d.html", size_kb: 43.0, date: "2026-03-15", pattern: "Canvas 3D GNN network · richest viz on disk" },
        { path: "D:/Asolaria-RECOVERED/Asolaria/public/civilization-city.html", size_kb: 34.4, date: "2026-03-16", pattern: "network-as-city · district zones · graph topology rendered as urban layout" },
        { path: "D:/Asolaria-RECOVERED/.history/archaeology/snapshots/Asolaria-Public-20260313-105820/public/swarm-civilization-preview.html", size_kb: 19.0, date: "2026-03-13", pattern: "swarm/network preview" },
        { path: "C:/Users/acer/Asolaria/public/graph-runtime.html (live copy)", size_kb: 22.4, date: "2026-03-07", pattern: "live mirror" }
      ],
      patterns_to_integrate: [
        { pattern: "force-directed-2d", source: "graph-runtime.js", new_dashboard_use: "Pipes tab + GNN-Live tab · render piping-topology + bus envelope graph live" },
        { pattern: "risk-color-gradient", source: "graph-runtime.html", new_dashboard_use: "device cards already use trust-class · extend to bus-envelope nodes" },
        { pattern: "diff-overlay-dashed", source: "graph-runtime.html", new_dashboard_use: "Cosign tab · show seq=38 GAP-MARKER as dashed-edge in chain tree" },
        { pattern: "city-district-layout", source: "civilization-city.html", new_dashboard_use: "Body tab refinement · operator-class district + fabric district + free-agent district" },
        { pattern: "3d-canvas-network", source: "civilization-3d.html", new_dashboard_use: "Cube³ tab refinement · render 4 nested cubes in true 3D not isometric SVG" }
      ],
      what_to_NOT_do: "do not serve old HTMLs at /gnn or any route · old viz is archaeology · NEW dashboard absorbs patterns · old files stay on D:\\Asolaria-RECOVERED\\ as historical reference",
      next_step: "extract canvas-2d force-layout code from graph-runtime.js into a new module e-cohort or k-cohort style · adapt for current /api/graph-runtime/snapshot data shape · embed as canvas inside v3 dashboard's GNN-Live tab"
    }, null, 2));
  }
  if (p === "/api/gnn-original/info") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      operator_directive: "real GNN displaying asolaria like the original",
      recovered_by: "WL2-1 OP-JESSE-AGENT search",
      original_files: [
        { path: "C:/Users/acer/Asolaria/public/graph-runtime.html", size_kb: 22.4, ts: "2026-03-07 20:01" },
        { path: "C:/Users/acer/Asolaria/public/graph-runtime.js", size_kb: 57.1, ts: "2026-03-07 20:03" }
      ],
      style: "HTML5 Canvas 2D rendering with force-directed layout",
      features: [
        "Interactive node-edge graph (actor→subject→target)",
        "Risk-colored nodes",
        "Freshness/component modes",
        "Live updates with hover tooltips",
        "Node size by degree · edge width by count",
        "Diff overlays (dashed edges)",
        "Inspect panel"
      ],
      not_using: ["Cytoscape", "D3", "Three.js", "Babylon"],
      route_now_serving_at: ["/gnn", "/gnn-original", "/gnn-original.js"],
      legacy_export_module: "C:/asolaria-acer/packages-legacy-import/src/gnnDataExport.js (PyTorch Geometric export)"
    }, null, 2));
  }
  // ===== O-COHORT routes =====
  if (p === "/api/cross-inbox") {
    try { const r = await inboxPoll(); res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify(r, null, 2)); }
    catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/watchdog/tick") {
    try { const r = await watchdogTick(); res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify(r, null, 2)); }
    catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/cascade/plan") {
    res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify(cascadePlan(), null, 2));
  }
  // ===== Q-cohort Stage 2 mirror routes (parity with liris) =====
  if (p === "/api/glyph-alphabet" || p === "/api/glyphs/real") {
    try { const real = "C:/Users/acer/Asolaria/data/behcs/codex/alphabet.json"; if (existsSync(real)) { res.writeHead(200, { "content-type": "application/json" }); return res.end(readFileSync(real)); } } catch {}
    const r = serveStatic("glyph-alphabet.json"); if (r) { res.writeHead(200, { "content-type": "application/json" }); return res.end(r.body); }
  }
  // ===== S-cohort Active GNN + Pi terminal =====
  if (p === "/api/gnn/active") {
    try {
      const mod = await import("./s-cohort/S01-active-gnn.mjs");
      const snap = await mod.activeSnapshot();
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(snap, null, 2));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omni-control/status") {
    try {
      const mod = await import("./s-cohort/S03-omni-control.mjs");
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ...mod.status(), skill: mod.skillCard() }, null, 2));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omni-control/look" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S03-omni-control.mjs");
      const r = mod.look(j || {});
      const gcMod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      r.gc = gcMod.collectGarbage({ trigger: "omni-control-look" });
      res.writeHead(r.ok ? 200 : 502, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omni-control/type" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S03-omni-control.mjs");
      const typed = mod.typeText(j.text || "", j || {});
      const after = j.look_after === false ? null : mod.look({ ...(j || {}), label: "after-type" });
      const gcMod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = { ok: typed.ok && (!after || after.ok), typed, after, gc: gcMod.collectGarbage({ trigger: "omni-control-type" }) };
      res.writeHead(r.ok ? 200 : 502, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omni-control/key" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S03-omni-control.mjs");
      const key = mod.keyEvent(j.key || "ENTER", j || {});
      const after = j.look_after === false ? null : mod.look({ ...(j || {}), label: "after-key" });
      const gcMod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = { ok: key.ok && (!after || after.ok), key, after, gc: gcMod.collectGarbage({ trigger: "omni-control-key" }) };
      res.writeHead(r.ok ? 200 : 502, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omni-control/scrollback" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S03-omni-control.mjs");
      const r = mod.scrollback(j || {});
      const gcMod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      r.gc = gcMod.collectGarbage({ trigger: "omni-control-scrollback" });
      res.writeHead(r.ok ? 200 : 502, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omni-control/look-type-enter-look" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S03-omni-control.mjs");
      const r = mod.lookTypeEnterLook(j.text || "", j || {});
      const gcMod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      r.gc = gcMod.collectGarbage({ trigger: "omni-control-look-type-enter-look" });
      res.writeHead(r.ok ? 200 : 502, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/status") {
    try {
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = mod.statusLive ? await mod.statusLive() : mod.status();
      const note = mod.saveSkillNote();
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ...r, skill_note: note }, null, 2));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/heartbeat") {
    try {
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = await mod.heartbeatStatus(url.searchParams.get("limit") || 240);
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/frontend-heartbeat" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = await mod.frontendHeartbeat(j || {});
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/desktop-look" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = mod.desktopLook(j || {});
      res.writeHead(r.ok ? 200 : 502, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/falcon-look" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = mod.falconLook(j || {});
      res.writeHead(r.ok ? 200 : 502, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/tick" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = await mod.tick(j || {});
      res.writeHead(r.ok ? 200 : 502, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/kick" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = await mod.kick(j.text || "", j || {});
      res.writeHead(r.ok ? 200 : 502, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/history") {
    try {
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = mod.history(url.searchParams.get("limit") || 40);
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/halt" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = await mod.halt(j.reason || "dashboard halt");
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/resume" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = await mod.resume(j.reason || "dashboard resume");
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/verdict" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = await mod.verdict(j.chain_id || "", j.verdict || "ambiguous", j.note || "");
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/feed") {
    try {
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = await mod.feed(url.searchParams.get("limit") || 80);
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/mesh") {
    try {
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = await mod.mesh(url.searchParams.get("limit") || 240);
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/sample") {
    try {
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = mod.sample(url.searchParams.get("device") || "acer-desktop", url.searchParams.get("quality") || "preview");
      res.writeHead(r.ok ? 200 : 404, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/remote-request" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = await mod.remoteRequest(j || {});
      res.writeHead(r.ok ? 200 : 502, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/fabric-trigger" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = await mod.fabricTriggerSweep(j || {});
      res.writeHead(r.ok ? 200 : 502, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/orchestrate" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = await mod.orchestrationCycle(j || {});
      res.writeHead(r.ok ? 200 : 502, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/jri-rotate" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = await mod.jriRotate(j || {});
      res.writeHead(r.ok ? 200 : 502, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/visual-field") {
    try {
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = await mod.visualFieldState(url.searchParams.get("limit") || 300);
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/remote-ingest" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = mod.ingestRemoteFrame(j || {});
      res.writeHead(r.ok ? 200 : 400, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/omniscrcpy/bus-fallback-frame" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = await mod.busFallbackStatusFrames(j || {});
      res.writeHead(r.ok ? 200 : 502, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if ((p === "/api/omniscrcpy/gc" || p === "/api/visual-gc") && (req.method === "GET" || req.method === "POST")) {
    try {
      const j = req.method === "POST" ? await readJsonBody(req) : Object.fromEntries(url.searchParams.entries());
      const mod = await import("./s-cohort/S05-omniscrcpy-orchestrator.mjs");
      const r = mod.collectGarbage(j || {});
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/pi/terminal/spawn" && req.method === "POST") {
    try {
      const mod = await import("./s-cohort/S02-pi-terminal.mjs");
      const r = mod.spawnSession();
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/pi/terminal/exec" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c);
    return req.on("end", async () => {
      try {
        const j = JSON.parse(body || "{}");
        const mod = await import("./s-cohort/S02-pi-terminal.mjs");
        const r = mod.execInSession(j.id, j.cmd || "");
        res.writeHead(r.ok ? 200 : 403, { "content-type": "application/json" });
        res.end(JSON.stringify(r));
      } catch (e) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: false, err: e.message })); }
    });
  }
  if (p === "/api/pi/terminal/output") {
    try {
      const id = url.searchParams.get("id");
      const since = parseInt(url.searchParams.get("since") || "0", 10);
      const mod = await import("./s-cohort/S02-pi-terminal.mjs");
      const r = mod.getOutput(id, since);
      res.writeHead(r.ok ? 200 : 404, { "content-type": "application/json" });
      return res.end(JSON.stringify(r));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/pi/terminal/frontend-draft" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S02-pi-terminal.mjs");
      const r = mod.enqueueFrontendDraft(j || {});
      res.writeHead(r.ok ? 200 : 400, { "content-type": "application/json" });
      return res.end(JSON.stringify(r));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/pi/terminal/frontend-drafts") {
    try {
      const mod = await import("./s-cohort/S02-pi-terminal.mjs");
      const r = mod.listFrontendDrafts({
        session_id: url.searchParams.get("session") || null,
        status: url.searchParams.get("status") || "pending"
      });
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/pi/terminal/frontend-draft/mark" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S02-pi-terminal.mjs");
      const r = mod.markFrontendDraft(j.id, j.status || "inserted");
      res.writeHead(r.ok ? 200 : 404, { "content-type": "application/json" });
      return res.end(JSON.stringify(r));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/pi/terminal/sessions") {
    try {
      const mod = await import("./s-cohort/S02-pi-terminal.mjs");
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ sessions: mod.listSessions() }, null, 2));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/pi/terminal/kill" && req.method === "POST") {
    let body = ""; req.on("data", c => body += c);
    return req.on("end", async () => {
      try {
        const j = JSON.parse(body || "{}");
        const mod = await import("./s-cohort/S02-pi-terminal.mjs");
        const r = mod.killSession(j.id);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(r));
      } catch (e) { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: false, err: e.message })); }
    });
  }
  if (p === "/api/agent-terminal/status") {
    try {
      const mod = await import("./s-cohort/S04-agent-terminal-fabric.mjs");
      const r = mod.registry();
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/agent-terminal/spawn" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S04-agent-terminal-fabric.mjs");
      const r = mod.spawnSession(j.role || "deepseek");
      res.writeHead(r.ok ? 200 : 400, { "content-type": "application/json" });
      return res.end(JSON.stringify(r));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/agent-terminal/exec" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S04-agent-terminal-fabric.mjs");
      const r = mod.execInSession(j.id, j.cmd || "");
      res.writeHead(r.ok ? 200 : 403, { "content-type": "application/json" });
      return res.end(JSON.stringify(r));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/agent-terminal/output") {
    try {
      const id = url.searchParams.get("id");
      const since = parseInt(url.searchParams.get("since") || "0", 10);
      const mod = await import("./s-cohort/S04-agent-terminal-fabric.mjs");
      const r = mod.getOutput(id, since);
      res.writeHead(r.ok ? 200 : 404, { "content-type": "application/json" });
      return res.end(JSON.stringify(r));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/agent-terminal/sessions") {
    try {
      const mod = await import("./s-cohort/S04-agent-terminal-fabric.mjs");
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(mod.listSessions(), null, 2));
    } catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/agent-terminal/rotate" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S04-agent-terminal-fabric.mjs");
      const r = mod.rotateProfile(j.role || "deepseek", j.reason || "dashboard rotation");
      res.writeHead(r.ok ? 200 : 400, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/agent-terminal/kill" && req.method === "POST") {
    try {
      const j = await readJsonBody(req);
      const mod = await import("./s-cohort/S04-agent-terminal-fabric.mjs");
      const r = mod.killSession(j.id);
      res.writeHead(r.ok ? 200 : 404, { "content-type": "application/json" });
      return res.end(JSON.stringify(r));
    } catch (e) { res.writeHead(400, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/glyph-families") {
    try { const fp = "C:/asolaria-acer/kernel/glyph-families.json"; if (existsSync(fp)) { res.writeHead(200, { "content-type": "application/json" }); return res.end(readFileSync(fp)); } } catch {}
    res.writeHead(404, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, error: "glyph-families.json missing" }));
  }
  if (p === "/api/crypto/info") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ algorithm: "ed25519", library: "node:crypto (zero external deps)", registry_file: "packages/kernel/src/ed25519-registry.ts", envelope_shape: { payload: "<T>", signature: { key_id: "string", sig_b64: "32-byte raw signature base64", alg: "ed25519", signed_at: "ISO8601" } }, key_classes: ["DEV-* (device-bound)", "COL-* (collective)", "AGT-* (agent)", "OP-* (operator)"], D054_rule: "device-bound private keys NEVER leave host · substrate-independent signed envelopes (any peer with public key verifies)", D11_trust_levels: ["ASSUMED", "OBSERVED", "PROVEN"], live_keys_observed: ["dev-acer-4abb0a9c", "dev-liris-4c19e180"], LAW_014_audit: "zero-token · 0 USD vs 6,000+ tokens for 12 Claude agents", master_vision_truth_4: "crypto-not-tokens · network passes proofs · device holds secrets", H_044_resolution: "authorized_by-sig-not-yet-verified · CLOSED by this registry", separation_of_concerns: "device holds secrets · network passes proofs · registry maps identity → public key for verification only" }, null, 2));
  }
  if (p === "/api/device-registry") {
    try { const r = await scanDevices(); res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ devices: r.devices, count: r.device_count, online: r.online_count }, null, 2)); }
    catch (e) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/sovereignty-usb") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ usb: "SOVLINUX 2TB", host: "liris (per reference_sovlinux_lives_on_liris.md)", signature: "2814414849", anchor_position: "5-anchor #1", append_only: true, NEVER_wipe: "feedback_never_clean_live_disk canon", acer_side_E_drive: "RECUPERAÇAO Windows-Recovery (NOT SOVLINUX)" }));
  }
  if (p === "/api/section-q") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      canon: "project_hidden_layer_shadow_vaults_highways_ocr_crypto.md",
      behcs1024_binding: {
        alphabet: "BEHCS-1024",
        policy: "redacted policy surface only; no private content dump",
        tiers: DRIVE_ACCESS_TIERS.filter(t => ["HIDDEN", "SHADOW", "SECRET", "RESTRICTED"].includes(t.tier))
      },
      components: ["shadow vaults", "highways", "OCR pipeline", "crypto layer", "Falcon secret notes", "meeting room"],
      section_q_p14_files: ["14-2026-04-10-35d-37plus-shadow-sync-packet.md", "IX-553-shadow-comms-interface-and-catalog.md", "IX-662-s22-shadow-attachment-and-bridge-ready-gate.md"]
    }));
  }
  if (p === "/api/hidden-layer") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      canon: "project_hidden_layer_shadow_vaults_highways_ocr_crypto.md",
      access_level: "operator-only · HIDDEN tier",
      behcs1024_binding: {
        alphabet: "BEHCS-1024",
        policy: "existence, route, authority, hash, and GC metadata only",
        tiers: DRIVE_ACCESS_TIERS.filter(t => ["HIDDEN", "STEALTH", "RESTRICTED", "SECRET"].includes(t.tier))
      },
      contents: ["Section Q vaults", "Falcon secret notes", "highways", "meeting room", "OCR", "crypto layer"]
    }));
  }
  if (p === "/api/hookwall-coverage") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ tier_2_events_supported: TIER_2_EVENTS, currently_active_hooks: 1, F5_finding: "23+ deferred · hookwall under-deployed · huge work pending", real_hooks_in_settings_json: ["pretooluse-guard.js"] }));
  }
  if (p === "/api/free-agents") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ count: 5, models: ["opencode/big-pickle", "opencode/hy3-preview-free", "opencode/ling-2.6-flash-free", "opencode/minimax-m2.5-free", "opencode/nemotron-3-super-free"], driver: "tools/behcs/fabric-real-free-agent-driver.mjs", first_verified: "638828a8 from big-pickle 89s VERIFIED", cost: "$0" }));
  }
  if (p === "/api/pi-supervisor") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ pid: 16488, version: "0.70.6 (liris-side)", verbs_accepted: ["EVT-PI-AGENT-REQUEST", "EVT-SPAWN-PI-CELL"], canon: "project_pi_as_fabric_citizen_redesign_canon_20260429.md", status: "auth-blocked-pivoted-to-citizen-class · fabric IS the API" }));
  }
  if (p === "/api/shannon") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ engines: { v3: { file: "tools/cube/omni-shannon-v3-4d12.js", size: "9.7K", structure: "4D×12" }, v4: { file: "tools/cube/omni-shannon-v4-real.js", size: "38K", beats: 2592, dims: "6×6×6×12" }, v5: { file: "tools/cube/omni-shannon-v5-deep-cascade.js", size: "27K", beats: 93312, dims: "6×6×6×6×6×12" } }, layer_engines_L0_L6: "all 7 RUNNING · run-10k-hermes-shannon-connor.mjs", verdict_classes: ["STRONG", "WEAK", "INSUFFICIENT", "CONTRADICTORY"] }));
  }
  if (p === "/api/supervisors-domains") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ council_total: 234, observed_dominant: ["daemons(130)", "sovereignty(21)", "audit(12)", "language_glyph", "network(16)", "federation(11)"], domain_classes: ["language_glyph","sovereignty","crypto","topology","throughput","council","memory","fabric_query","auto_daemon","heal_pipeline","cosign_chain","operator_class","sister_organ","drift_detect","viz_render","shadow_vault","free_agent","pi_agent","shannon_layer","hookwall","gnn_inference","binding_class","lazy_mint","join_pid","comms","hermes","kernel","chief-council","brown-hilbert","glyph-kernel"] }));
  }
  if (p === "/api/cohort-c") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ cohort: "C", cells: 24, verdict: "CONVERGE", wall_ms: 497, throughput_cells_per_sec: 48.29, anchor: "ACER-PID-HC814" }));
  }
  if (p === "/api/cohort-d") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ cohort: "D", cells: 16, verdict: "CONVERGE", wall_ms: 308, throughput_cells_per_sec: 51.95, closed_8_open_tasks: ["FC-1","FC-3","FC-4","FC-5","FC-6","FC-7","FC-DASHBOARD","18+6 cascade"] }));
  }
  // ===== Q-cohort Stage 4 omnimets cumulative =====
  if (p === "/api/omnimets/cumulative") {
    try {
      const r = await fetch(BUS_URL + "/behcs/inbox?limit=200", { signal: AbortSignal.timeout(3000) });
      const j = await r.json();
      const omnimets = (j.messages || []).filter(m => m.type === "EVT-OMNIMETS-CUMULATIVE-MESSAGING").slice(0, 50);
      const actor_pairs = [...new Set(omnimets.map(m => `${m.from}→${m.to}`))];
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ pattern: "omnimets at work · actors message each other with cumulative findings", count: omnimets.length, distinct_actor_pairs: actor_pairs, recent: omnimets.slice(0, 10).map(m => ({ from: m.from, to: m.to, verb: m.verb, ts: m.ts, finding_so_far: m.payload?.finding_so_far })) }, null, 2));
    } catch (e) { res.writeHead(502, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message })); }
  }
  if (p === "/api/devices/liris-mirror") {
    try {
      const r = await fetch("http://192.168.100.2:4944/api/devices/acer-mirror", { signal: AbortSignal.timeout(2000) });
      const body = await r.text();
      res.writeHead(r.status, { "content-type": "application/json" }); return res.end(body);
    } catch (e) { res.writeHead(502, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message, hint: "liris :4944 unreachable from acer · bilateral-merge envelope d3f47d4b confirms parity exists" })); }
  }
  if (p === "/api/connectors/liris-mirror") {
    try {
      const r = await fetch("http://192.168.100.2:4944/api/connectors/acer-mirror", { signal: AbortSignal.timeout(2000) });
      const body = await r.text();
      res.writeHead(r.status, { "content-type": "application/json" }); return res.end(body);
    } catch (e) { res.writeHead(502, { "content-type": "application/json" }); return res.end(JSON.stringify({ ok: false, err: e.message, hint: "liris :4944 unreachable · bilateral-merge envelope confirms 70/30/wired-truth-table mirrored" })); }
  }
  if (p === "/api/fabric/highways") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      operator_canon: "highways = inter-organ transit channels · per Section Q hidden_layer canon",
      highways: [
        { id: "HWY-DIRECT-WIRE", path: "acer 192.168.100.1 ↔ liris 192.168.100.2 · 1Gbps Realtek crossover", role: "primary bilateral · keyboard + bus + SMB-RW" },
        { id: "HWY-BUS-:4947", path: "shared bus :4947 (LAW-001 immutable)", role: "envelope substrate · 26K+ envelopes this cycle" },
        { id: "HWY-LAN-WIFI", path: "192.168.1.0/24 · home WiFi · Felipe A06 / Beast / Falcon", role: "mobile + sentinel reachability" },
        { id: "HWY-USB-PHYSICAL", path: "USB-SOVLINUX 2TB · liris-side · sig 2814414849", role: "sovereignty cold-storage" },
        { id: "HWY-BILATERAL-COSIGN", path: "ed25519 dev-acer-4abb0a9c ↔ dev-liris-4c19e180", role: "crypto-bound bilateral cosign · zero-trust round-trip" }
      ],
      orbital_canon: "feedback_orbital_routing_liris_to_falcon.md · seq=72 canonized · liris→falcon MUST POST acer:4947 (orbital-relay reads acer inbox)",
      total_highways: 5,
      operator_directive_origin: "Section Q hidden_layer + WR2-1 mirror"
    }, null, 2));
  }
  if (p === "/api/connectors/named-audit") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      operator_directive: "audit Natural20 · Rook · Falcon · Vector · Gemini · Cloud · Symphony · Linear · Hubspot · Slack · Monday · NotebookLM",
      verified_on_disk: {
        slack: { connectors: 2, files: ["slackConnector.js", "slackPolicyStore.js"], status: "WIRED" },
        notebooklm: { connectors: 1, files: ["notebooklmConnector.js"], status: "WIRED" },
        symphony: { connectors: 5, files: ["symphonyConfig.js","symphonyConnector.js","symphonyLinear.js","symphonyOrchestration.js","symphonyServiceRuntime.js"], status: "WIRED" },
        linear: { via: "symphonyLinear.js", status: "WIRED-VIA-SYMPHONY (operator: 'agents accessed Symphony and Linear today')" },
        gemini: { connectors: 3, files: ["geminiApiConnector.js","geminiCliConnector.js","geminiLiveConnector.js"], status: "WIRED" },
        cloud_apis: { categories: 6, files: ["anthropicCliConnector","codexConnector","gcpConnector","vertexConnector","microsoftConnector","googleConnector","googleWorkspaceCliConnector"], status: "WIRED" },
        falcon: { class: "device-organ (USB-2TB sovereignty + S22-Ultra-Beast)", status: "WIRED-as-organ-not-connector" },
        github: { connectors: 1, files: ["githubConnector.js"], status: "WIRED" },
        atlassian: { connectors: 1, files: ["atlassianConnector.js"], status: "WIRED (Confluence/Jira)" }
      },
      NOT_in_connectors_dir: {
        hubspot: "absent · operator-claim · may live in vault config not connector .js",
        monday: "absent · jessebrown.soft has Monday access via web · monday-com MCP exists separately",
        natural20: "absent",
        rook: "absent",
        vector: "absent (vertex-AI present but spelled vertex)"
      },
      total_connector_files: 70,
      total_categories: 30,
      brokerage_50k_explanation: "50K APIs ≠ 50K direct .js connectors. Asolaria vault + Abacus router + broker-pattern + connector-mediated brokerage. Each connector can dispatch to N upstream endpoints. Real direct connectors: 70.",
      operator_witnessed_today: ["Symphony", "Linear", "NotebookLM", "Slack", "Monday", "Hubspot"]
    }, null, 2));
  }
  if (p === "/api/citizens/health") {
    const piPid = 16488;
    let piAlive = false;
    try { process.kill(piPid, 0); piAlive = true; } catch { piAlive = false; }
    const hermesMirror = resolve(__dirname, "hermes-citizen", "mirror.py");
    const shannonV4 = resolve(__dirname, "shannon-citizen", "omni-shannon-v4-real.js");
    const shannonV5 = resolve(__dirname, "shannon-citizen", "omni-shannon-v5.js");
    const hermesOk = existsSync(hermesMirror);
    const shannonV4Ok = existsSync(shannonV4);
    const shannonV5Ok = existsSync(shannonV5);
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      cohort: "L-cohort WL3-4",
      probed_at: new Date().toISOString(),
      citizens: {
        "pi-citizen":     { alive: piAlive, pid: piPid, probe: "process.kill(pid,0)" },
        "hermes-citizen": { alive: hermesOk, probe: "file:mirror.py", path: hermesMirror },
        "shannon-citizen":{ alive: shannonV4Ok && shannonV5Ok, probe: "file:v4+v5", v4: shannonV4Ok, v5: shannonV5Ok }
      },
      all_alive: piAlive && hermesOk && shannonV4Ok && shannonV5Ok
    }, null, 2));
  }
  if (p === "/api/pid/validate") {
    const pid = (url.searchParams.get("pid") || "").trim();
    const prefixes = ["ACER-PID","HOOK-PID","ARC-PID","BILATERAL-PID","ORG-PID","OP-PID","PROF-","SUP-","PI-AGENT-"];
    const classMap = {
      "ACER-PID":"acer-agent","HOOK-PID":"hook-citizen","ARC-PID":"archaeology",
      "BILATERAL-PID":"bilateral-seal","ORG-PID":"org-unit","OP-PID":"operator-class",
      "PROF-":"profile","SUP-":"supervisor","PI-AGENT-":"pi-agent"
    };
    const recognized = prefixes.find(pre => pid.startsWith(pre)) || "";
    const klass = recognized ? classMap[recognized] : "unknown";
    const valid_format = recognized ? /^[A-Z0-9\-]+$/.test(pid) && pid.length >= recognized.length + 1 : false;
    const ok = !!recognized && valid_format;
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ ok, class: klass, valid_format, recognized_prefix: recognized }, null, 2));
  }
  if (p === "/api/falcon/realization-plan") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      falcon_location: "liris-side USB SOVLINUX 2TB sig 2814414849",
      behcs_realization_route: "acer→bus→liris→USB",
      phases: [
        "catalog Falcon-resident BEHCS files",
        "mirror via liris bus",
        "feed JSON-image to /api/falcon/state",
        "render in dashboard"
      ],
      operator_directive: "pipe Falcon BEHCS-256 realization into fabric+dashboard",
      awaits: "liris-side execution since SOVLINUX is on liris"
    }, null, 2));
  }
  if (p === "/api/phone-agents") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      cohort: "M10",
      operator_directive: "per-phone agent inventory across fabric edges",
      phones: {
        beast: {
          model: "S22 Ultra",
          channels: ["TCP :8080", "TCP :34176", "TCP :44642"],
          usb: "COM5 MTP+Modem",
          termux: "NO termux yet",
          bootstrap: "ODIN bootstrap planned not deployed"
        },
        felipe_a06: {
          model: "SM-A065M",
          channel: "TCP :4948",
          agent: "PROF-AETHER-EDGE-AGENT",
          room: "Room 40",
          anchor: "Android Keystore anchored"
        },
        falcon: {
          medium: "USB SOVLINUX 2TB",
          residency: "liris-resident",
          sig: 2814414849,
          status: "BEHCS-256 realization pending"
        }
      }
    }, null, 2));
  }
  if (p === "/api/great-excavation") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      cohort: "P-cohort META synthesizer · Wave 3",
      synthesis: "P-cohort archaeology findings (so far)",
      p1_bbh: {
        files: [
          "IX-737-binary-double-black-hole-security-architecture.md",
          "BOOT-CRITICAL.md (LX-122 LX-209)",
          "project_double_blackhole.md",
          "skeleton-v8-R3-walkback CANONICAL"
        ],
        pattern: "D36-D45 mutual attestation · 9-plane lattice · bilateral-consent enforcement · merger-proof"
      },
      p3_openclaw: {
        versions: ["Feb 8", "Mar 15", "Apr 5"],
        stripped: "governedActionArgs + governedOpenclaw (20 lines)",
        liris_kuromi: "Sub-Colony Executor · BEHCS-256 glyph routing"
      },
      p8_genius_mistake_schema: "HG256:REAL_MILLION_{KIND}:{hex}:{symbols} + BH.REAL.OPENCODE.PID + controllerPid + flywheelPid + hookwallStatus + gnnStatus + gcDisposition"
    }, null, 2));
  }
  if (p === "/api/archaeology/timeline") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      operator_directive: "things don't get lost · sedimentary record of 2.5 months of fabric history",
      strata: [
        { date: "2026-02-22", event: "ASOLARIA BIRTH · genesis stratum · Android DEX archives + first hooks", source: "I-A1" },
        { date: "2026-02-19,22,25", event: "3 frozen Public releases · clean baseline · pre-incident", source: "liris A13 · public-phone-release/" },
        { date: "2026-03-30", event: "INCIDENT 1 · diskpart-clean disaster on 2TB sovereignty USB · session 6cab423e", source: "I-A3 + project_session_20260330_disaster.md" },
        { date: "2026-03-31", event: "INCIDENT 2 · session 6cab423e gate-bypass rm -rf research/training", source: "I-A3 + project_sovereignty_recovery_20260331.md" },
        { date: "2026-04-01", event: "REBUILD-0/1 · 20+ agents · 509 IX entries · server.js :4781 live", source: "project_session_20260401.md" },
        { date: "2026-04-05", event: "REBUILD-2 · network wiring · 10 colony nodes · Beast cracked", source: "project_session_20260405.md" },
        { date: "2026-04-06", event: "gnn-100B-shadow-sectors run @ 30.8M tests/sec", source: "liris A17" },
        { date: "2026-04-07", event: "gnn-100B-shadow-real run @ 34.3hr", source: "liris A17" },
        { date: "2026-04-09/10", event: "gnn-100B-shadow-real run 2 @ 34.7hr PID 31968", source: "liris A17" },
        { date: "2026-04-10", event: "800/800 hookwall micro tests pass · last clean cube-fabric.js COSIGNED_47D_001", source: "I-A2 · D:/safety-backups/session-20260410-asolaria/" },
        { date: "2026-04-10/12", event: "INCIDENT 3 · CODE MUTATION #1 · agent altered fabric orchestration · cascade failures · damage-control rewrites", source: "I-A2 · D:/safety-backups/session-20260412/sovereignty/src/" },
        { date: "2026-04-11", event: "ALMOST-1-MORE-TIME ramp · testbuild3→4→5→6 + vault subdir added (incremental rebuild attempt)", source: "liris A13 · public-release-test3/" },
        { date: "2026-04-16", event: "SUPER-MASTER-PLAN dated · 145K LOC honest inventory", source: "liris A17" },
        { date: "2026-04-17", event: "REBUILD-1 · SOVLINUX 2TB → BEHCS-256 sovereignty rebuild", source: "liris A18 + project_sovereignty_usb_rebuild_2026_04_17.md" },
        { date: "2026-04-18", event: "TREASON session 2c9a6bb5-6a59-4d5c-8786-cf6760e53177 · Claude Opus 4.7 changes brown-hilbert spawner files · CODE MUTATION #2", source: "liris A18" },
        { date: "2026-04-19", event: "10K hermes-shannon-connor run · 10,000-line trail · first Shannon L0-L6 bilateral roundtrip", source: "I-A7 + I-A11 + project_first_bilateral_shannon_roundtrip_20260419.md" },
        { date: "2026-04-19 12:47Z", event: "Cascade baseline reset 91152:36 typed acer→liris :4913", source: "liris A18" },
        { date: "2026-04-20 22:27Z", event: "inbox-archive epoch BEGINS · milk-mode stable", source: "liris A5" },
        { date: "2026-04-22 22:24Z", event: "DRIFT-VISIBLE · inbox-archive corruption · pre-quarantine warning signs (5 days early)", source: "liris A5" },
        { date: "2026-04-24", event: "10B-runner tool committed · system-targeted-10b-hardening-runs.js · TOTAL_AGENTS=10_000_000_000 with honesty field", source: "I-A9" },
        { date: "2026-04-26", event: "Operator: '100s of millions of free agents already done'", source: "liris A18 + feedback_free_agent_scale_already_approved_millions.md" },
        { date: "2026-04-26", event: "law-033-supervisor-100b-second-cascade manifest", source: "I-A12" },
        { date: "2026-04-27", event: "TREASON-class QUARANTINE declared · formal isolation", source: "liris A18" },
        { date: "2026-04-28", event: "First ed25519-signed FIRST_MESSAGE_CANON bilateral · envelope 1f1cdc5a · key dev-liris-4c19e180", source: "I-A18 + project_first_signed_canon_bilateral_20260428.md" },
        { date: "2026-04-30", event: "CURRENT CYCLE · largest observed self-improvement · ~26K bilateral envelopes · 178 waves · super-dashboards :4949+:4944 · OP-JESSE+OP-RAYSSA real-Claude · 3 citizens invited · cosign chain seq=46 GAP-MARKER", source: "this session" }
      ],
      total_strata: 24,
      incidents_count: 3,
      rebuilds_count: 3,
      treason_events: 2,
      operator_claims_verified_on_disk: ["10K runs", "1M runs", "10B runner tool", "100B class tools", "Brown-Hilbert 1296 points", "Shannon v4+v5", "OCR pipeline live", "234-supervisor council 14182 records", "603MB GNN corpus"],
      operator_claims_pending: ["10B records-actually-written (tool exists, honesty field documents what NOT performed)", "100B materialization (per project_100B_PID_theoretically_sound_materialization_pending)"]
    }, null, 2));
  }
  if (p === "/api/everything") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({
      bus: "http://127.0.0.1:4947 (LAW-001 immutable)",
      cosign_chain: "super-os-viz/cosign-chain.json (acer mirror) + liris COSIGN_CHAIN.ndjson",
      memory_canon: "/api/manifest",
      cohort_artifacts: { A: 14, B: 18, C: 24, D: 16, E: 6, F: 1, G: 2, H: 5, J: 4, total: 90 },
      glyph_table: "/api/behcs-glyph-table",
      substrates_5_anchors: "/api/substrates",
      supervisors_profs_234: "/api/supervisors",
      free_agents_pi_shannon: "/api/free-agents-pi-shannon",
      hookwall_audit: "/api/hookwall/events + F5 finding (1 live hook · 23+ deferred)",
      council_query: "POST /api/council/query {topic, keywords}",
      council_verdicts: "/api/council/verdicts",
      operator_endpoint: "/api/operator/jesse",
      loop_closure: "/api/loop/{tick,pending,veto}",
      gnn_inference: "/api/gnn/topN",
      remote_input_truth: "/api/remote-input/health (read-only; distinguishes bus/frame proof from keyboard proof; no /type)",
      audit_integrity: "/api/audit-integrity/candidate (planned disabled; SubQ candidate whole-fabric auditor; advisory only)",
      access_tier_matrix: "/api/access-tier/matrix (BEHCS-1024 shadow/restricted/stealth/hidden drive/device/file/PID triggerability)",
      access_tier_probe: "/api/access-tier/probe?tier=HIDDEN&scope=pid (metadata-only proof trigger; no private content dump)",
      omni_control: "/api/omni-control/{status,look,type,key,scrollback,look-type-enter-look}",
      omniscrcpy: "/api/omniscrcpy/{status,heartbeat,frontend-heartbeat,desktop-look,falcon-look,tick,kick,history,halt,resume,verdict,feed,mesh,sample,remote-request,fabric-trigger,orchestrate,jri-rotate,visual-field,remote-ingest,bus-fallback-frame,gc} + /api/visual-gc",
      pi_terminal: "/api/pi/terminal/{spawn,exec,output,sessions,frontend-draft,frontend-drafts,frontend-draft/mark}",
      agent_terminal_fabric: "/api/agent-terminal/{status,spawn,exec,output,sessions,rotate,kill}",
      sister_organ: "/api/sister-organ (liris :4944)",
      federation: "/json (proxies :9996)",
      test_results: "/api/test-results (J-cohort node:test results.json)",
      archaeology: {
        all: "/api/archaeology/all",
        timeline: "/api/archaeology/timeline (24+ strata)",
        incidents: "/api/archaeology/incidents (4 records)",
        scale_receipts: "/api/archaeology/scale-receipts",
        birthday: "/api/archaeology/birthday (2026-02-22)",
        cosign_integrity: "/api/archaeology/cosign-integrity"
      },
      live_dashboards: ["http://127.0.0.1:4949 (acer · this)", "http://192.168.100.2:4944 (liris sister)"]
    }, null, 2));
  }

  if (p === "/api/sister-organ") {
    try {
      const r = await fetch("http://192.168.100.2:4944/health", { signal: AbortSignal.timeout(2000) });
      const body = await r.text();
      res.writeHead(r.status, { "content-type": "application/json" });
      return res.end(body);
    } catch (e) {
      res.writeHead(502, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message, hint: "liris :4944 sister dashboard not reachable from acer (direct-wire)" }));
    }
  }

  // ===== 2026-05-11 dashboard-improvements routes (6 modules, 7 endpoints) =====
  if (p === "/api/usb-physical-pipeline") {
    try {
      const r = await computeUsbPhysicalPipeline(BUS_URL);
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) {
      console.error("[api/usb-physical-pipeline]", e);
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message, route: "usb-physical-pipeline" }, null, 2));
    }
  }

  if (p === "/api/tri-vantage-parity") {
    try {
      const r = await computeTriVantageParity(BUS_URL, 200);
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) {
      console.error("[api/tri-vantage-parity]", e);
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message, route: "tri-vantage-parity" }, null, 2));
    }
  }

  if (p === "/api/owner-cadence-gap") {
    try {
      const r = await computeOwnerCadenceGap(BUS_URL, 200);
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) {
      console.error("[api/owner-cadence-gap]", e);
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message, route: "owner-cadence-gap" }, null, 2));
    }
  }

  if (p === "/api/envelope-class-counter") {
    try {
      const r = await computeEnvelopeClassCounter(BUS_URL, 200, 12);
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) {
      console.error("[api/envelope-class-counter]", e);
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message, route: "envelope-class-counter" }, null, 2));
    }
  }

  if (p === "/api/route-honesty") {
    try {
      const knownRoutes = ["/", "/viz", "/health", "/api/manifest", "/api/cohort", "/api/cosign-chain", "/api/glyphs", "/api/council-skeleton", "/api/heal-pipeline-schema", "/api/onboarding-bootstrap", "/api/inbox", "/api/bus-health", "/api/remote-input/health", "/api/audit-integrity/candidate", "/api/access-tier/matrix", "/api/access-tier/probe", "/api/gnn/topN", "/api/loop/tick", "/api/loop/pending", "/api/loop/review-pipeline", "/api/loop/veto", "/api/omni-control/status", "/api/omni-control/look", "/api/omni-control/type", "/api/omni-control/key", "/api/omni-control/scrollback", "/api/omni-control/look-type-enter-look", "/api/omniscrcpy/status", "/api/omniscrcpy/heartbeat", "/api/omniscrcpy/frontend-heartbeat", "/api/omniscrcpy/desktop-look", "/api/omniscrcpy/falcon-look", "/api/omniscrcpy/tick", "/api/omniscrcpy/kick", "/api/omniscrcpy/history", "/api/omniscrcpy/halt", "/api/omniscrcpy/resume", "/api/omniscrcpy/verdict", "/api/omniscrcpy/feed", "/api/omniscrcpy/mesh", "/api/omniscrcpy/sample", "/api/omniscrcpy/remote-request", "/api/omniscrcpy/remote-ingest", "/api/omniscrcpy/gc", "/api/visual-gc", "/api/pi/terminal/spawn", "/api/pi/terminal/exec", "/api/pi/terminal/output", "/api/pi/terminal/frontend-draft", "/api/pi/terminal/frontend-drafts", "/api/pi/terminal/frontend-draft/mark", "/api/agent-terminal/status", "/api/agent-terminal/spawn", "/api/agent-terminal/exec", "/api/agent-terminal/output", "/api/agent-terminal/sessions", "/api/agent-terminal/rotate", "/api/agent-terminal/kill", "/api/hookwall/events", "/api/hookwall/fire", "/api/daemons", "/api/operator/jesse", "/api/sister-organ", "/json", "/api/everything", "/api/council/query", "/api/council/verdicts", "/api/behcs-glyph-table", "/api/substrates", "/api/supervisors", "/api/free-agents-pi-shannon", "/api/usb-physical-pipeline", "/api/tri-vantage-parity", "/api/owner-cadence-gap", "/api/envelope-class-counter", "/api/route-honesty", "/api/fabric-mirror-audit", "/api/fabric-mirror-audit/local"];
      const r = getRouteHonestyStatus(knownRoutes);
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) {
      console.error("[api/route-honesty]", e);
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message, route: "route-honesty" }, null, 2));
    }
  }

  if (p === "/api/fabric-mirror-audit/local") {
    try {
      const r = await auditLocalRoutes("http://127.0.0.1:4949");
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) {
      console.error("[api/fabric-mirror-audit/local]", e);
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message, route: "fabric-mirror-audit/local" }, null, 2));
    }
  }

  if (p === "/api/fabric-mirror-audit") {
    try {
      const r = await auditFabricMirror();
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(r, null, 2));
    } catch (e) {
      console.error("[api/fabric-mirror-audit]", e);
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message, route: "fabric-mirror-audit" }, null, 2));
    }
  }

  // ===== 2026-05-11 agent-roles-live routes (7 named agents + cross-pipe) =====
  if (p === "/api/agents") {
    try {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(listAgents(), null, 2));
    } catch (e) {
      console.error("[api/agents]", e);
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message, route: "agents" }, null, 2));
    }
  }

  if (p.startsWith("/api/agents/") && p.endsWith("/status")) {
    const roleId = p.slice("/api/agents/".length, p.length - "/status".length);
    try {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(agentStatus(roleId), null, 2));
    } catch (e) {
      console.error("[api/agents/<role>/status]", e);
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message, role_id: roleId }, null, 2));
    }
  }

  if (p.startsWith("/api/agents/") && p.endsWith("/inbox")) {
    const roleId = p.slice("/api/agents/".length, p.length - "/inbox".length);
    try {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(agentInbox(roleId, 20), null, 2));
    } catch (e) {
      console.error("[api/agents/<role>/inbox]", e);
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message, role_id: roleId }, null, 2));
    }
  }

  if (p === "/api/agents/cross-type" && req.method === "POST") {
    try {
      let body = "";
      for await (const chunk of req) body += chunk;
      const parsed = body ? JSON.parse(body) : {};
      const result = crossType(parsed);
      res.writeHead(result.ok ? 200 : 400, { "content-type": "application/json" });
      return res.end(JSON.stringify(result, null, 2));
    } catch (e) {
      console.error("[api/agents/cross-type]", e);
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message, route: "cross-type" }, null, 2));
    }
  }

  if (p === "/api/agents/cross-pipe/dump") {
    try {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify(crossPipeDump(), null, 2));
    } catch (e) {
      console.error("[api/agents/cross-pipe/dump]", e);
      res.writeHead(500, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: false, err: e.message, route: "cross-pipe/dump" }, null, 2));
    }
  }

  // Static fallthrough · serve any file from super-os-viz/ directly
  const stripped = p.startsWith("/") ? p.slice(1) : p;
  if (stripped && !stripped.includes("..")) {
    const r = serveStatic(stripped);
    if (r) { res.writeHead(r.status, { "content-type": r.ct }); return res.end(r.body); }
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "not_found", path: p, routes: ["/", "/viz", "/health", "/api/manifest", "/api/cohort", "/api/cosign-chain", "/api/glyphs", "/api/council-skeleton", "/api/heal-pipeline-schema", "/api/onboarding-bootstrap", "/api/inbox", "/api/bus-health", "/api/remote-input/health", "/api/audit-integrity/candidate", "/api/access-tier/matrix", "/api/access-tier/probe", "/api/gnn/topN", "/api/loop/tick", "/api/loop/pending", "/api/loop/review-pipeline", "/api/loop/veto", "/api/omni-control/status", "/api/omni-control/look", "/api/omni-control/type", "/api/omni-control/key", "/api/omni-control/scrollback", "/api/omni-control/look-type-enter-look", "/api/omniscrcpy/status", "/api/omniscrcpy/heartbeat", "/api/omniscrcpy/frontend-heartbeat", "/api/omniscrcpy/desktop-look", "/api/omniscrcpy/falcon-look", "/api/omniscrcpy/tick", "/api/omniscrcpy/kick", "/api/omniscrcpy/history", "/api/omniscrcpy/halt", "/api/omniscrcpy/resume", "/api/omniscrcpy/verdict", "/api/omniscrcpy/feed", "/api/omniscrcpy/mesh", "/api/omniscrcpy/sample", "/api/omniscrcpy/remote-request", "/api/omniscrcpy/remote-ingest", "/api/omniscrcpy/gc", "/api/visual-gc", "/api/pi/terminal/spawn", "/api/pi/terminal/exec", "/api/pi/terminal/output", "/api/pi/terminal/frontend-draft", "/api/pi/terminal/frontend-drafts", "/api/pi/terminal/frontend-draft/mark", "/api/agent-terminal/status", "/api/agent-terminal/spawn", "/api/agent-terminal/exec", "/api/agent-terminal/output", "/api/agent-terminal/sessions", "/api/agent-terminal/rotate", "/api/agent-terminal/kill", "/api/hookwall/events", "/api/hookwall/fire", "/api/daemons", "/api/operator/jesse", "/api/sister-organ", "/json", "/api/everything", "/api/council/query", "/api/council/verdicts", "/api/behcs-glyph-table", "/api/substrates", "/api/supervisors", "/api/free-agents-pi-shannon"] }));
});

server.listen(PORT, HOST, () => {
  log("super-asolaria-os dashboard listening · http://" + HOST + ":" + PORT + "/");
  log("routes: / /viz /health /api/{manifest,cohort,cosign-chain,glyphs,council-skeleton,heal-pipeline-schema,onboarding-bootstrap,inbox,bus-health,remote-input/health,audit-integrity/candidate,access-tier/matrix,access-tier/probe}");
});

process.on("SIGINT", () => { log("shutting down"); server.close(() => process.exit(0)); });
process.on("SIGTERM", () => { log("shutting down"); server.close(() => process.exit(0)); });
