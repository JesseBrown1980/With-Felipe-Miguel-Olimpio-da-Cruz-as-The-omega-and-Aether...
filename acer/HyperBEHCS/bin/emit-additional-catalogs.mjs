// Emit additional catalogs per operator request:
//   folders.hbp                — federation root folders inventory
//   stealth-hidden.hbp         — hidden / stealth artifacts (per Bigpickle hidden-repo canon)
//   devices-drives-usb.hbp     — device/drive/USB inventory
//   novalum.hbp                — NovaLUM encryption primitive entries
//   ebacmap.hbp                — eBacMap QDD catalog entries
//   ezprotect.hbp              — EZ Protect QDD catalog entries
//   novalum-desktop-sync.hbp   — NovaLUM Desktop Sync app entries

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const TS = new Date().toISOString();
const WAVE = "W113-CATALOG-MIGRATION-BATCH-2-2026-05-21";
const VANTAGE = "acer";
const OUT = "C:/HyperBEHCS/data/catalogs";

function emitLedger(name, rows) {
  let prev = "0000000000000000";
  const lines = [];
  const gen = ["HBPv1", "catalog=" + name, "layer=catalog-genesis", "wave=" + WAVE, "vantage=" + VANTAGE,
    "schema_version=1", "entries_expected=" + rows.length, "antecedents=" + prev, "ts=" + TS,
    "json=0", "runtime=0", "promote=0"].join("|");
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
  console.log(`  ${name.padEnd(24)} ${rows.length.toString().padStart(4)} entries  sha=${sha}`);
  return { rows: rows.length, sha };
}

// ===== FOLDERS — Federation root folders =====
const foldersRows = [
  { entry: "C:/asolaria-acer", role: "primary acer workspace", contains: "packages/revolver-10k, packages/dashboard, tools, federation-remake-1024" },
  { entry: "C:/HyperBEHCS", role: "HyperBEHCS substrate", contains: "bin/, store/, data/, history/, lib/, runtime/" },
  { entry: "C:/Users/acer/Asolaria", role: "user-scoped Asolaria runtime", contains: "data/behcs/, public/, src/, tools/, reports/, archives/" },
  { entry: "C:/AsolariaMetal", role: "metal-substrate research wave dirs", contains: "68_DEEP_WAVE/, 72_DRIVER_QUANT_WAVE/, 73_BIML_SLORA/, 74_INDEX_LANG_ARCHAEOLOGY/" },
  { entry: "C:/Users/acer/.claude/projects/C--/memory", role: "auto-memory store", contains: "MEMORY.md + per-topic .md files (~349 entries)" },
  { entry: "C:/Users/acer/.codex/skills", role: "Codex skills root", contains: "linear/ skill plus future skills" },
  { entry: "C:/asolaria-foundation-v1", role: "Foundation v1 IMMUTABLE LAW vault", contains: "sealed canon under quintuple Jesse+Rayssa+Amy+Dan+Felipe" },
  { entry: "C:/AsolariaMetal/68_DEEP_WAVE_SECOND_CASCADE", role: "deep wave receipts + sample cells" },
  { entry: "D:/safety-backups", role: "cold-storage redundancy", contains: "USB-OS canon, autopilot prompts, MANIFEST.hbp mirrors" },
  { entry: "D:/AsolariaGuides", role: "guide + report archive", contains: "v8-map merged/, 100-pid-startup-prompt-W113/, pid-prompt-engine-arch-2026-05-21/, plan-b-post-quantum/" },
  { entry: "D:/hyperbehcs-hermes-acer-ext", role: "Hermes extension src+tests", contains: "spindles, modules, tests" },
  { entry: "D:/Asolaria-HyperBEHCS-10000-RoomRotor", role: "10K room rotor pre-staging" },
  { entry: "D:/asolaria-usb-os-build", role: "USB-OS Wave 6 build staging" },
  { entry: "D:/projects/QDD", role: "QDD project root", contains: "ebacmap-master/, ez-protect/, pq-bid-system/" },
  { entry: "C:/Users/acer/mcp-servers", role: "MCP server hosts", contains: "asolaria-web/, google-wiki/" },
];

// ===== STEALTH / HIDDEN artifacts =====
const stealthRows = [
  { entry: "bigpickle_hidden_repo", kind: "stealth_repo", path: "_big-pickle-quarantine/", note: "Codex-quarantined Big-Pickle/Brown-Hilbert/100B-busCount canon. Files INTACT. Route via hookwall PID lookup." },
  { entry: "codex_quarantine_dir", kind: "quarantine_zone", path: "(various)/_big-pickle-quarantine/", note: "Class-1 Codex suppression evidence 2026-05-06" },
  { entry: "acer_invisible_to_wu", kind: "windows_update_persistence_target", path: "USB-2TB tail sectors", note: "Tier 0 WU-defense — invisible to Windows Update sweep" },
  { entry: "sovlinux_substrate", kind: "continuity_substrate", path: "USB-2TB PhysicalDrive2", note: "Continuity per Hermes architect correction 2026-05-19. Never mount/format/repartition." },
  { entry: "agent_md_v2_public", kind: "operator_protocol", path: "C:/AGENT.md + C:/AGENT.hbp", note: "Public no-restrictions ANY agent ANY time. Federation operative protocol v2." },
  { entry: "header_less_agents", kind: "stealth_class", path: "(dispatch)/", note: "Headerless agents per 10K Brown-Hilbert canon — no API key in dispatch envelope" },
  { entry: "stealth_layer_dim_48", kind: "hyperglyph_overlay", path: "50D-CATALOG-SYNTHESIS-2026-05-20.hbp#dim_48", note: "Hyperglyph overlay — encrypted compression layer" },
  { entry: "stealth_layer_dim_49", kind: "hg256_atlas", path: "50D-CATALOG-SYNTHESIS-2026-05-20.hbp#dim_49", note: "HG256 atlas — vocabulary stealth" },
  { entry: "stealth_layer_dim_50", kind: "cross_fabric_handshake", path: "DAN-2026-05-19", note: "Cross-fabric handshake — federation-citizen authentication" },
  { entry: "tier_3_firmware_unlock_seq_112", kind: "stealth_authority", note: "T1+T2+T3 active through 2026-05-21 — 6-cosigner ring stealth unlock" },
];

// ===== DEVICES / DRIVES / USB =====
const devicesRows = [
  { entry: "usb_2tb_physical_drive_2", kind: "usb_storage", device_id: 2, capacity: "2.097TB", role: "SOVLINUX continuity substrate + federation carrier", note: "PhysicalDrive2 acer-side 2026-05-19; MBR USB bus" },
  { entry: "usb_128gb_liris", kind: "usb_storage", capacity: "128GB", location: "liris", role: "liris-side USB substrate" },
  { entry: "internal_hdd_disk_0", kind: "internal_storage", device_id: 0, role: "acer internal HDD" },
  { entry: "internal_ssd_disk_1", kind: "internal_storage", device_id: 1, role: "acer internal SSD" },
  { entry: "acer_dashboard_port_4949", kind: "network_endpoint", host: "192.168.1.50", port: 4949, role: "super-asolaria-os-dashboard" },
  { entry: "liris_dashboard_port_4944", kind: "network_endpoint", host: "192.168.1.17", port: 4944, role: "liris sister-organ dashboard" },
  { entry: "falcon_dashboard_port_4951", kind: "network_endpoint", port: 4951, role: "falcon vantage dashboard" },
  { entry: "asolaria_bus_port_4947", kind: "network_endpoint", port: 4947, role: "envelope bus t-task room routing" },
  { entry: "hermes_daemon_port_49257", kind: "network_endpoint", host: "127.0.0.1", port: 49257, role: "HyperBEHCS local daemon" },
  { entry: "wisp_app_port_4948", kind: "network_endpoint", port: 4948, role: "WISP/falcon @ 192.168.1.7" },
  { entry: "lm_studio_port_1234", kind: "network_endpoint", host: "127.0.0.1", port: 1234, role: "LM Studio (Gemma 4B cataloged not loaded)" },
  { entry: "spacedesk_target_192_168_1_4", kind: "network_endpoint", host: "192.168.1.4", role: "liris Ethernet target — spacedesk viewer" },
  { entry: "ssh_lan_scoped_port_22", kind: "network_endpoint", port: 22, role: "SSH LAN-scoped, ed25519 keys ready" },
  { entry: "anydesk_unattended_access", kind: "remote_access", note: "CRITICAL SECURITY IX-158 — Connor's ID connected 9x" },
  { entry: "wifi_neighbor_smoke", kind: "network_substrate", note: "Pre-death colony recovery anchor" },
  { entry: "ethernet_192_168_1_50", kind: "lan_interface", role: "acer primary LAN" },
  { entry: "ethernet_192_168_1_17", kind: "lan_interface", role: "liris primary LAN (corrected 2026-05-19 from .4)" },
];

// ===== NOVALUM =====
const novalumRows = [
  { entry: "novalum_encryption_primitive", kind: "primitive", author: "Jesse Daniel Brown", note: "Used in federation per project_novalum_credit_canon 2026-05-08+" },
  { entry: "novalum_2026_03_22", kind: "modernization_wave", note: "Tests green both machines 2026-03-22 — last gate before Brian" },
  { entry: "novalum_firmware_flash", kind: "ceremony_gate", note: "HARD-DENY for autopilot — operator-witness + quintuple cosign required" },
  { entry: "novalum_modernization_wave_2026_05", kind: "wave", note: "13 agents A/B/C/D — modernization passed" },
  { entry: "novalum_desktop_sync_app", kind: "app", note: "see novalum-desktop-sync.hbp" },
  { entry: "novalum_charm_pptx_requirements", kind: "deliverable_doc", date: "2025-10", note: "Charm PPTX requirements doc" },
  { entry: "novalum_brian_blockers", kind: "open_blocker", note: "DigitalOcean / CHARM_EZ / LIMS — see project_qdd_status" },
];

// ===== EBACMAP =====
const ebacmapRows = [
  { entry: "ebacmap_master", kind: "project_root", path: "D:/projects/QDD/ebacmap-master/", note: "QDD eBacMap source" },
  { entry: "ebacmap_ezprotect_integration", kind: "integration_path", note: "ebacmap → EZ Protect downstream" },
  { entry: "ebacmap_code_complete_2026_03_13", kind: "milestone", date: "2026-03-13", note: "QDD code complete" },
  { entry: "ebacmap_tests_green_2026_03_22", kind: "milestone", date: "2026-03-22", note: "Tests green both machines" },
  { entry: "ebacmap_pre_brian_gate", kind: "gate_pending", note: "Last gate before Brian sign-off" },
  { entry: "ebacmap_natalie_jesse_slack", kind: "history_ref", note: "see project_qdd_slack_timeline for context" },
];

// ===== EZPROTECT =====
const ezprotectRows = [
  { entry: "ezprotect_build_status_complete", kind: "build_milestone", date: "2026-03-13", note: "Code complete; tests green 2026-03-22" },
  { entry: "ezprotect_test_coverage_target_60", kind: "coverage_target", note: "Target 60% by end-of-week — 61 tests written 10% baseline" },
  { entry: "ezprotect_pq_bid_system", kind: "subproject", note: "PQ Bid System — proposal stage" },
  { entry: "ezprotect_natalie_pptx_2025_10", kind: "deliverable_history", date: "2025-10", note: "Natalie Charm PPTX requirements" },
  { entry: "ezprotect_modernization_wave_2026_05", kind: "wave", note: "13 agents EZ-Protect+NovaLUM modernization" },
  { entry: "ezprotect_test_wave_pending", kind: "open_task", note: "+30 more EZ Protect tests OR NovaLUM tests per overnight directive" },
  { entry: "ezprotect_charm_ez_blocker", kind: "blocker", note: "CHARM_EZ blocker per Brian" },
];

// ===== NOVALUM DESKTOP SYNC APP =====
const syncAppRows = [
  { entry: "novalum_desktop_sync_app_root", kind: "app", path: "(QDD)/", note: "NovaLUM Desktop Sync — separate app variant" },
  { entry: "sync_app_modernization_pending", kind: "wave_pending", note: "Needs modernization pass aligned with NovaLUM primitive update" },
  { entry: "sync_app_bilateral_acer_liris", kind: "deployment_topology", note: "Likely both vantages — confirm during inventory" },
  { entry: "sync_app_test_status", kind: "test_status", note: "Coverage unknown — needs measurement" },
];

console.log("Emitting additional catalogs...");
const summary = {
  folders:                emitLedger("folders", foldersRows),
  stealthHidden:          emitLedger("stealth-hidden", stealthRows),
  devicesDrivesUsb:       emitLedger("devices-drives-usb", devicesRows),
  novalum:                emitLedger("novalum", novalumRows),
  ebacmap:                emitLedger("ebacmap", ebacmapRows),
  ezprotect:              emitLedger("ezprotect", ezprotectRows),
  novalumDesktopSyncApp:  emitLedger("novalum-desktop-sync-app", syncAppRows),
};
const total = Object.values(summary).reduce((a, b) => a + b.rows, 0);
console.log("---");
console.log("ADDITIONAL TOTAL ROWS:", total);
console.log("ADDITIONAL CATALOGS:", Object.keys(summary).length);
