// Stdio JSON-RPC harness for asolaria-os-on-metal: list tools, call the READ-ONLY new lanes + one refusal probe, then exit.
import { spawn } from "node:child_process";
const srv = spawn(process.execPath, ["C:/Users/acer/mcp-servers/asolaria-os-on-metal/server.js"], { stdio: ["pipe", "pipe", "pipe"] });
let buf = ""; const pending = new Map(); let id = 0;
srv.stdout.on("data", (d) => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1);
  if (!line.trim()) continue; const m = JSON.parse(line); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } } });
srv.stderr.on("data", (d) => process.stderr.write(`[srv-stderr] ${d}`));
const call = (method, params) => new Promise((res) => { const i = ++id; pending.set(i, res); srv.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: i, method, params }) + "\n"); });
await call("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "aoom-test", version: "0" } });
srv.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }) + "\n");
const names = (await call("tools/list", {})).result.tools.map((t) => t.name);
const want = ["aoom_host8_read", "aoom_recall_search", "aoom_office_verify", "aoom_office_seal", "aoom_office_append"];
console.log(`TOOLS|count=${names.length}|${want.map((n) => `${n}=${names.includes(n) ? 1 : 0}`).join("|")}|json=0`);
const calls = [
  ["aoom_host8_read", { route: "/task-manager.hbp" }, 4],
  ["aoom_host8_read", { route: "/shadow-parity.hbp", count: 3 }, 6],
  ["aoom_recall_search", { q: "sidecar", limit: 2 }, 3],
  ["aoom_office_verify", { name: "FABLE5-GNN-REST-MEASURED-2026-10-18.hbp" }, 1],
  ["aoom_office_verify", { name: "../../Windows/win.ini" }, 1],
  ["aoom_office_append", { name: "../escape.hbp", rows: ["X|json=0"], create: true }, 1],
];
for (const [name, args, n] of calls) {
  const r = await call("tools/call", { name, arguments: args });
  const text = r.result?.content?.[0]?.text ?? `ERROR ${JSON.stringify(r.error)}`;
  console.log(`--- ${name} ${JSON.stringify(args)}\n${text.split("\n").slice(0, n).join("\n")}`);
}
srv.kill(); process.exit(0);
