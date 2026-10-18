// Catalog batch 3 per operator request:
//   asolaria-app.hbp                 — Asolaria public release / phone app
//   symphony.hbp                     — Symphony (audio/orchestration system)
//   auggie-augment.hbp               — Auggie (Augment AI agent)
//   hubspot.hbp                      — HubSpot CRM integration
//   google-cloud-asolaria.hbp        — GCP + Asolaria service account
//   vaults-local-usb.hbp             — Vaults on local + USB (key storage)
//   google-notebookllm.hbp           — NotebookLLM supervisors (Google enterprise API)
//   gcp-iam-my-first-project.hbp     — IAM services for "My First Project" winget Asolaria

import fs from "node:fs";
import crypto from "node:crypto";

const TS = new Date().toISOString();
const WAVE = "W113-CATALOG-MIGRATION-BATCH-3-2026-05-21";
const VANTAGE = "acer";
const OUT = "C:/HyperBEHCS/data/catalogs";

function emitLedger(name, rows) {
  let prev = "0000000000000000";
  const lines = [];
  const gen = ["HBPv1","catalog=" + name,"layer=catalog-genesis","wave=" + WAVE,"vantage=" + VANTAGE,
    "schema_version=1","entries_expected=" + rows.length,"antecedents=" + prev,"ts=" + TS,
    "json=0","runtime=0","promote=0"].join("|");
  const genH = crypto.createHash("sha256").update(gen).digest("hex").slice(0, 16);
  lines.push(gen + "|row_hash=" + genH);
  prev = genH;
  for (const r of rows) {
    const f = ["HBPv1", "catalog=" + name];
    for (const [k, v] of Object.entries(r)) {
      if (v === null || v === undefined) continue;
      f.push(`${k}=${String(v).replace(/\|/g, "/").replace(/\n/g, " ").slice(0, 400)}`);
    }
    f.push("antecedents=" + prev, "ts=" + TS, "json=0", "runtime=0", "promote=0");
    const body = f.join("|");
    const rh = crypto.createHash("sha256").update(body).digest("hex").slice(0, 16);
    lines.push(body + "|row_hash=" + rh);
    prev = rh;
  }
  const outPath = `${OUT}/${name}.hbp`;
  fs.writeFileSync(outPath, lines.join("\n") + "\n");
  const sha = crypto.createHash("sha256").update(fs.readFileSync(outPath)).digest("hex").slice(0, 16);
  console.log(`  ${name.padEnd(28)} ${rows.length.toString().padStart(4)} entries  sha=${sha}`);
  return { rows: rows.length, sha };
}

// ===== ASOLARIA APP (public release / phone app) =====
const asolariaAppRows = [
  { entry: "asolaria_public_release_root", kind: "release_root", path: "C:/Users/acer/Asolaria/dist/public-release/", note: "Asolaria public release distributions" },
  { entry: "asolaria_phone_release", kind: "release_variant", path: "C:/Users/acer/Asolaria/dist/private-phone-release/", note: "Phone-specific release variants per Asolaria-Public-YYYYMMDD timestamps" },
  { entry: "asolaria_public_20260313_105820", kind: "release_snapshot", note: "Pre-modularization release snapshot" },
  { entry: "asolaria_public_20260410_093155", kind: "release_snapshot", note: "Post-Phase 0-3 build snapshot" },
  { entry: "asolaria_public_20260227_verify1", kind: "release_snapshot", note: "Verify1 release snapshot" },
  { entry: "asolaria_winget_package", kind: "package_distribution", note: "Asolaria installed via winget for My First Project GCP integration" },
  { entry: "asolaria_dashboard_web", kind: "frontend", url: "http://192.168.1.50:4949", note: "Super dashboard at port 4949 — acer vantage" },
  { entry: "asolaria_dashboard_liris", kind: "frontend", url: "http://192.168.1.17:4944", note: "Sister-organ dashboard at port 4944 — liris vantage" },
  { entry: "asolaria_modules_count_51", kind: "scale_milestone", note: "51 modules + 35 routes after Phase 0-3 modularization" },
  { entry: "asolaria_origin_openclaw", kind: "lineage", note: "Asolaria stripped from OpenClaw fork — origin canon" },
];

// ===== SYMPHONY =====
const symphonyRows = [
  { entry: "symphony_orchestration_system", kind: "orchestration_primitive", note: "Symphony — federation-wide orchestration layer (placeholder; needs operator definition)" },
  { entry: "symphony_audio_subsystem", kind: "subsystem_candidate", note: "Symphony may refer to audio orchestration — clarify per operator" },
  { entry: "symphony_supervisor_role", kind: "supervisor_role_candidate", note: "Symphony as supervisor role across cohorts" },
  { entry: "symphony_pending_inventory", kind: "open_inventory", note: "Symphony catalog seeded with placeholders — needs deep-dive on actual entries" },
];

// ===== AUGGIE / AUGMENT =====
const auggieRows = [
  { entry: "auggie_augment_agent", kind: "agent_class", note: "Auggie (Augment) — AI coding agent, federation citizen candidate" },
  { entry: "auggie_codebase_context", kind: "capability", note: "Augment's codebase context loading — large repo navigation" },
  { entry: "auggie_chat_interface", kind: "frontend_class", note: "Auggie chat surface" },
  { entry: "auggie_adapter_required", kind: "gap", note: "Federation adapter for Auggie not yet defined — see reference_agent_adapter_library_2026_05_21" },
  { entry: "auggie_pending_inventory", kind: "open_inventory", note: "Auggie tools/skills/MCP catalog pending operator-supplied detail" },
];

// ===== HUBSPOT =====
const hubspotRows = [
  { entry: "hubspot_crm", kind: "external_service", note: "HubSpot CRM — federation integration target" },
  { entry: "hubspot_contacts_api", kind: "api_surface", note: "HubSpot Contacts API — contact pipeline" },
  { entry: "hubspot_deals_api", kind: "api_surface", note: "HubSpot Deals API — sales pipeline" },
  { entry: "hubspot_oauth_gate", kind: "auth_gate", note: "HubSpot OAuth — DEFER-TO-APEX per asolaria_mcp_policy" },
  { entry: "hubspot_qdd_brian_context", kind: "context_ref", note: "HubSpot may relate to QDD/Brian/Charm workflow — see project_qdd_status" },
  { entry: "hubspot_pending_credentials", kind: "blocker", note: "OAuth credentials + vault-stored secret pending operator" },
];

// ===== GOOGLE CLOUD + ASOLARIA SERVICE ACCOUNT =====
const gcpRows = [
  { entry: "gcp_project_my_first_project", kind: "gcp_project", note: "GCP project named My First Project — operator's enterprise project" },
  { entry: "asolaria_service_account", kind: "iam_service_account", note: "Asolaria service account — uses vault keys to access all Google APIs" },
  { entry: "gcp_enterprise_api_surface", kind: "api_surface_class", note: "ALL of Google APIs accessible via service account (IAM-scoped)" },
  { entry: "gcp_iam_roles_pending_inventory", kind: "iam_roles", note: "IAM role bindings inventory pending — depends on vault access" },
  { entry: "gcp_billing_account", kind: "billing", note: "Billing account associated with My First Project — operator-controlled" },
  { entry: "gcp_winget_asolaria_integration", kind: "package_link", note: "winget-installed Asolaria → GCP authentication via vault keys" },
  { entry: "gcp_pending_canonical_tool", kind: "gap", note: "No canonical_tool for GCP API calls yet — needs MCP server or HTTP wrapper" },
  { entry: "gcp_advisor_verb_pending", kind: "verb_gap", note: "Verbs gcp-api-call, gcp-iam-bind, gcp-vault-fetch not yet in taxonomy" },
];

// ===== VAULTS (local + USB) =====
const vaultsRows = [
  { entry: "vault_local_storage", kind: "key_vault_local", note: "Local-machine vault holding GCP service-account keys + other credentials" },
  { entry: "vault_usb_2tb_storage", kind: "key_vault_usb", path: "PhysicalDrive2 (USB 2TB)", note: "USB-substrate vault — survives Windows Update wipes" },
  { entry: "vault_bilateral_acer_liris", kind: "vault_topology", note: "Vaults on both vantages — bilateral redundancy" },
  { entry: "vault_quintuple_cosign_gated", kind: "auth_gate", note: "Vault key access requires apex quintuple-cosign for high-tier keys" },
  { entry: "vault_gcp_service_account_key", kind: "key_class", note: "GCP service-account JSON keys — DEFER-TO-APEX for read" },
  { entry: "vault_anydesk_session_tokens", kind: "key_class", note: "AnyDesk session tokens — HARD-DENY for autopilot access (security IX-158)" },
  { entry: "vault_github_pat", kind: "key_class", note: "GitHub PAT — for asolaria-behcs-256 repo + future federation pushes" },
  { entry: "vault_oauth_refresh_tokens", kind: "key_class", note: "OAuth refresh tokens — Hermes-managed per hermes-access-bootstrap canon" },
  { entry: "vault_novalum_encryption_keys", kind: "key_class", note: "NovaLUM encryption keys — Jesse's primitive, used for vault encryption itself" },
  { entry: "vault_advisor_verb_pending", kind: "verb_gap", note: "Verbs vault-fetch, vault-rotate-key, vault-list not yet in taxonomy" },
];

// ===== GOOGLE NOTEBOOKLLM =====
const notebookLLMRows = [
  { entry: "notebookllm_google_enterprise", kind: "google_api_product", note: "Google NotebookLM Enterprise API — accessed via Asolaria service account" },
  { entry: "notebookllm_supervisors_candidate", kind: "supervisor_role_candidate", note: "If NotebookLLM supervisors exist, they live in google-cloud namespace" },
  { entry: "notebookllm_pending_inventory", kind: "open_inventory", note: "NotebookLLM-specific supervisors not yet enumerated — depends on GCP IAM probe" },
  { entry: "notebookllm_vault_key_path", kind: "auth_path", note: "Vault → GCP service account → NotebookLLM API endpoint" },
  { entry: "notebookllm_advisor_verb_pending", kind: "verb_gap", note: "Verbs notebookllm-query, notebookllm-create-source not yet in taxonomy" },
];

// ===== GCP IAM My First Project =====
const gcpIamRows = [
  { entry: "iam_my_first_project_root", kind: "iam_root", project: "My First Project", note: "Root IAM hierarchy for My First Project GCP" },
  { entry: "iam_asolaria_sa_email", kind: "service_account", note: "asolaria-sa@my-first-project.iam.gserviceaccount.com (presumed; verify via vault read)" },
  { entry: "iam_roles_full_api_access", kind: "iam_role_class", note: "Roles granting ALL of Google APIs — likely roles/owner or composite-custom-role" },
  { entry: "iam_pending_specific_roles", kind: "iam_gap", note: "Specific role bindings pending — operator vault unlock required" },
  { entry: "iam_winget_asolaria_link", kind: "package_link", note: "winget Asolaria install → SA key location → IAM auth flow" },
  { entry: "iam_advisor_verb_gcp_iam_bind", kind: "verb_gap", note: "Verb gcp-iam-bind / gcp-iam-list-roles not yet in taxonomy" },
  { entry: "iam_security_anchor", kind: "security_canon", note: "IAM scoped to least-privilege — operator-witness for any role grant change" },
];

console.log("Emitting catalog batch 3...");
const summary = {
  asolariaApp:       emitLedger("asolaria-app", asolariaAppRows),
  symphony:          emitLedger("symphony", symphonyRows),
  auggie:            emitLedger("auggie-augment", auggieRows),
  hubspot:           emitLedger("hubspot", hubspotRows),
  gcp:               emitLedger("google-cloud-asolaria", gcpRows),
  vaults:            emitLedger("vaults-local-usb", vaultsRows),
  notebookllm:       emitLedger("google-notebookllm", notebookLLMRows),
  gcpIam:            emitLedger("gcp-iam-my-first-project", gcpIamRows),
};
const total = Object.values(summary).reduce((a, b) => a + b.rows, 0);
console.log("---");
console.log("BATCH 3 TOTAL ROWS:", total);
console.log("BATCH 3 CATALOGS:", Object.keys(summary).length);
