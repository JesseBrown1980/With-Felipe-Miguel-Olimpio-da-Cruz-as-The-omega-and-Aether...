import { roomToHilbert, ROOM_COUNT } from "../../asolaria-acer/packages/revolver-10k/src/brown-hilbert.mjs";
import crypto from "node:crypto";
import fs from "node:fs";

function hc(seed) {
  const s = crypto.createHash("sha256").update(seed).digest("hex");
  const r = parseInt(s.slice(0, 8), 16) % ROOM_COUNT;
  return { h: "H" + r.toString(16).toUpperCase().padStart(4, "0"), room: r };
}

const WAVE = "W113-TOOL-ADVISOR-WAVE-2026-05-21";
const TS = "2026-05-21T19:15:00Z";
const ANC = "W113-TOOL-ADVISOR-WAVE-2026-05-21,ASOLARIA-HERMES-ARCHITECT-CORRECTION-PID-2026-05-19,reference_asolaria_operative_prompt_template_2026_05_21,C-drive-root-archaeology-bdb9ab2c46bf3d70";
const V1_SHA = "8c1f885d94ca25acefda2bb228e220964c2fdfb0d79c17c7de0c123a6e492d06";
const V2_SHA = "26fcb3c423a5bb2f5dd2b46ac1d5e33a4da43fe154464906818c0b88e53c573a";

const sups = ["cube_cubed_sealer", "gaia", "helm", "vector", "rook", "forge", "falcon", "livefree"];
const bcastRows = sups.map(s => {
  const c = hc(WAVE + "broadcast-" + s);
  return `HBPv1|layer=top-end-prof-broadcast|wave=${WAVE}|to_supervisor=${s}|pid=AGT-${s.toUpperCase()}-BROADCAST-AGENT-V2-${c.h}|prof=federation_operative_protocol_v2_broadcast|hilbert_coord=${c.h}|hilbert_room=${c.room}|cp=PENDING-APEX-MINT|tuple=federation:broadcast:public|message=new-canonical-AGENT-md-at-C-root-and-AGENT-hbp-pair-please-route-future-queries-here|v1_path=C:/AGENT.md|v1_sha256=${V1_SHA}|v2_path=C:/AGENT.hbp|v2_sha256=${V2_SHA}|antecedents=${ANC}|json=0|runtime=0|promote=0|ts=${TS}`;
});

const voxels = [
  { tag: "agent-md-v1-plain", sup: "falcon", lane: "federation", cp_band: "800-895", sha: V1_SHA, path: "C:/AGENT.md", bh_dim: 0, status: "LIVE" },
  { tag: "agent-hbp-v2-compact", sup: "forge", lane: "build_proof", cp_band: "704-799", sha: V2_SHA, path: "C:/AGENT.hbp", bh_dim: 0, status: "LIVE" },
  { tag: "agents-md-warp-era-archive", sup: "gaia", lane: "sovereign", cp_band: "256-383", sha: "47d767b66b5c0cd8fe85381b8489d5840da27d0d8f1b26e994949f43f66e6b17", path: "C:/HyperBEHCS/archaeology/2026-03-12-AGENTS-md-warp-era/AGENTS.md", bh_dim: 1, status: "ARCHIVED" },
];
const voxData = voxels.map(v => {
  const c = hc(WAVE + "voxel-" + v.tag);
  return { ...v, c };
});
const voxRows = voxData.map(v => {
  return `HBPv1|layer=voxel-emit-3D-map|wave=${WAVE}|pid=AGT-${v.sup.toUpperCase()}-VOXEL-${v.tag.toUpperCase()}-${v.c.h}|prof=root_doc_voxel_${v.tag.replace(/-/g, "_")}|supervisor=${v.sup}|lane=${v.lane}|cp=PENDING-APEX-MINT|proposed_cp_band=${v.cp_band}|hilbert_coord=${v.c.h}|hilbert_room=${v.c.room}|bh_dim=${v.bh_dim}|bh_depth=0|sha256=${v.sha}|path=${v.path}|status=${v.status}|tuple=federation:root-doc:public|antecedents=${ANC}|json=0|runtime=0|promote=0|ts=${TS}`;
});

const mints = [
  { prof: "universal_agent_protocol_anchor", sup: "falcon", band: "800-895", path: "C:/AGENT.md" },
  { prof: "hbp_compact_agent_protocol", sup: "forge", band: "704-799", path: "C:/AGENT.hbp" },
];
const mintRows = mints.map(m => {
  const c = hc(WAVE + "mint-" + m.prof);
  return `HBPv1|layer=glyph-mint-pending|wave=${WAVE}|pid=AGT-${m.sup.toUpperCase()}-MINTREQ-${m.prof.toUpperCase().replace(/_/g, "-")}-${c.h}|prof=${m.prof}|supervisor=${m.sup}|proposed_cp_band=${m.band}|hilbert_coord=${c.h}|hilbert_room=${c.room}|cp=PENDING-APEX-MINT|target_path=${m.path}|requires=quintuple-cosign-seq-191-or-later|antecedents=${ANC}|status=AWAITING_APEX_MINT_CEREMONY|json=0|runtime=0|promote=0|ts=${TS}`;
});

const cubeRow = `HBPv1|layer=cube-cube-cubed|wave=${WAVE}|cube_id=W113-ROOT-DOC-CUBE|cube_dim=4|axes_x=vantage{acer,liris}|axes_y=doc_type{v1-md,v2-hbp,archaeology}|axes_z=supervisor{falcon,forge,gaia}|axes_w=tier{public,build_proof,sovereign}|cells_total=54|cells_realized=3|fill_pct=5.56|json=0|runtime=0|promote=0|ts=${TS}`;

const all = [...bcastRows, ...voxRows, ...mintRows, cubeRow];
const out = "C:/HyperBEHCS/store/root-doc-emit-W113-2026-05-21.hbp";
fs.writeFileSync(out, all.join("\n") + "\n");
const sha = crypto.createHash("sha256").update(fs.readFileSync(out)).digest("hex");
fs.writeFileSync(out + ".sha256", sha + "  root-doc-emit-W113-2026-05-21.hbp\n");
console.log("hbp rows: " + all.length + " (8 broadcast + 3 voxel + 2 mint + 1 cube)");
console.log("hbp sha256: " + sha.slice(0, 32));

const consumerJson = {
  vantage: "acer",
  schema_version: "bilateral-3d-join-v1",
  wave_pid: WAVE,
  layer: "root-doc-emit-W113",
  ts: TS,
  voxel_count: voxData.length,
  voxels: voxData.map(v => ({
    pid: `AGT-${v.sup.toUpperCase()}-VOXEL-${v.tag.toUpperCase()}-${v.c.h}`,
    vantage: "acer",
    supervisor: v.sup,
    lane: v.lane,
    prof: `root_doc_voxel_${v.tag.replace(/-/g, "_")}`,
    cp: "PENDING-APEX-MINT",
    proposed_cp_band: v.cp_band,
    hilbert_coord: v.c.h,
    hilbert_room: v.c.room,
    bh_dim: v.bh_dim,
    bh_depth: 0,
    status: v.status,
    sha256: v.sha,
    path: v.path,
  })),
};
fs.writeFileSync("C:/HyperBEHCS/store/voxels-root-doc-W113-2026-05-21.json", JSON.stringify(consumerJson, null, 2));
const jsha = crypto.createHash("sha256").update(fs.readFileSync("C:/HyperBEHCS/store/voxels-root-doc-W113-2026-05-21.json")).digest("hex");
fs.writeFileSync("C:/HyperBEHCS/store/voxels-root-doc-W113-2026-05-21.json.sha256", jsha + "  voxels-root-doc-W113-2026-05-21.json\n");
console.log("json consumer sha256: " + jsha.slice(0, 16));

const omniPath = "C:/asolaria-acer/packages/revolver-10k/data/omnischeduler/tasks.hbp";
const omniLines = fs.readFileSync(omniPath, "utf8").trimEnd().split("\n");
const lastHash = omniLines[omniLines.length - 1].match(/row_hash=([a-f0-9]+)/)?.[1];
const omniBody = [
  "HBPv1",
  "layer=omnischeduler-task",
  "pid=OMNISCHED-W113-ROOT-DOC-EMIT-H3E72",
  "prof=root_doc_v1_v2_emit",
  "supervisor=falcon",
  "wave=W113-TOOL-ADVISOR-WAVE-2026-05-21",
  "hilbert_coord=H3E72",
  "hilbert_room=15986",
  "tuple=omnischeduler:landed:public",
  "triple_quant=polar_turbo_js",
  "polar_quant=task",
  "js_quant=task",
  "turbo_quant=task",
  "json=0", "runtime=0", "promote=0",
  "status=ROOT_DOCS_LIVE_AT_C_DRIVE_PLUS_8_PROF_BROADCAST_PLUS_3_VOXELS_PLUS_2_MINT_PLUS_CUBE",
  "chain_id=ACER-OMNISCHEDULER-v1",
  "antecedents=" + lastHash,
  "transition_kind=TASK_LANDED",
  "reason=C:/AGENT.md (12717B sha " + V1_SHA.slice(0,16) + ") + C:/AGENT.hbp (5611B 13rows sha " + V2_SHA.slice(0,16) + ") LIVE no-restrictions / 8 supervisor broadcast envelopes / 3 voxels (agent-md-v1 falcon agent-hbp-v2 forge archaeology gaia) / 2 glyph-mint-pending (universal_agent_protocol_anchor + hbp_compact_agent_protocol) / W113-ROOT-DOC-CUBE 3-of-54 cells / dashboard audit appended",
  "tier=PUBLIC",
  "endpoint=0", "provider=0", "mcp=0", "usb_write=0", "device_write=0", "dispatch=0", "route=0",
  "shell=0", "terminal=0", "file_write=1", "memory_write=0", "tool_execute=0", "skill_execute=0",
  "mcp_execute=0", "webmcp_execute=0", "provider_call=0", "endpoint_open=0", "browser_control=0",
  "keyboard_control=0", "screenshot_capture=0", "network_call=0", "webhook_open=0", "cron_create=0",
  "device_read=0", "usb_read=0", "private_surface_export=0", "hidden_surface_export=0",
  "restricted_surface_export=0", "secret_surface_export=0", "repo_publish=0", "package_release=0",
  "ts=" + TS,
].join("|");
const omniHash = crypto.createHash("sha256").update(omniBody).digest("hex");
fs.appendFileSync(omniPath, "\n" + omniBody + "|row_hash=" + omniHash + "\n");
console.log("omnischeduler row: " + omniHash.slice(0, 16));
