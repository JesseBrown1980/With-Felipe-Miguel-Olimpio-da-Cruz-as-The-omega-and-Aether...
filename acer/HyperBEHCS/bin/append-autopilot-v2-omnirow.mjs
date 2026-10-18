import fs from "node:fs";
import crypto from "node:crypto";

const p = "C:/asolaria-acer/packages/revolver-10k/data/omnischeduler/tasks.hbp";
const lines = fs.readFileSync(p, "utf8").trimEnd().split("\n");
const lastHash = lines[lines.length - 1].match(/row_hash=([a-f0-9]+)/)?.[1];
const ts = "2026-05-21T19:25:00Z";

const body = [
  "HBPv1",
  "layer=omnischeduler-task",
  "pid=OMNISCHED-W113-AUTOPILOT-V2-CANONIZED-H1F88",
  "prof=autopilot_prompt_v2_canonized",
  "supervisor=helm",
  "wave=W113-TOOL-ADVISOR-WAVE-2026-05-21",
  "hilbert_coord=H1F88",
  "hilbert_room=8072",
  "tuple=omnischeduler:landed:restricted",
  "triple_quant=polar_turbo_js",
  "polar_quant=task", "js_quant=task", "turbo_quant=task",
  "json=0", "runtime=0", "promote=0",
  "status=AUTOPILOT_PROMPT_V2_LIVE_AT_C_HYPERBEHCS_REPLACING_STALE_V1",
  "chain_id=ACER-OMNISCHEDULER-v1",
  "antecedents=" + lastHash,
  "transition_kind=TASK_LANDED",
  "reason=v1 autopilot stale boilerplate fired 3 times this session generating Guide bloat. v2 at C:/HyperBEHCS/autopilot-prompt-v2.txt sha 84832adc3c1ea3cc replaces it / 4 step procedure / forbids wave-N-report.md / single HBP row per fire to autopilot-fires.hbp / operator installs at cron source when found",
  "tier=RESTRICTED",
  "endpoint=0", "provider=0", "mcp=0", "usb_write=0", "device_write=0", "dispatch=0", "route=0",
  "shell=0", "terminal=0", "file_write=1", "memory_write=0", "tool_execute=0", "skill_execute=0",
  "mcp_execute=0", "webmcp_execute=0", "provider_call=0", "endpoint_open=0", "browser_control=0",
  "keyboard_control=0", "screenshot_capture=0", "network_call=0", "webhook_open=0", "cron_create=0",
  "device_read=0", "usb_read=0", "private_surface_export=0", "hidden_surface_export=0",
  "restricted_surface_export=0", "secret_surface_export=0", "repo_publish=0", "package_release=0",
  "ts=" + ts,
].join("|");

const rh = crypto.createHash("sha256").update(body).digest("hex");
fs.appendFileSync(p, "\n" + body + "|row_hash=" + rh + "\n");
console.log("omnischeduler row: " + rh.slice(0, 16));
