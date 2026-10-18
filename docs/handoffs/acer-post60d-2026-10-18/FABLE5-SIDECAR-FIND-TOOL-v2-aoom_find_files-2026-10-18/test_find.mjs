// Stdio JSON-RPC test + runner for aoom_find_files. usage: node test_find.mjs <server.js> '<json-args>' [more '<json-args>' ...]
// Each JSON arg is one aoom_find_files call. Prints the tool's HBP rows. Read-only by construction of the tool.
import { spawn } from "node:child_process";
const [serverPath, ...calls] = process.argv.slice(2);
const srv = spawn(process.execPath, [serverPath], { stdio: ["pipe", "pipe", "ignore"], env: process.env });
let buf = ""; const pending = new Map(); let id = 0;
srv.stdout.on("data", (d) => { buf += d; let i; while ((i = buf.indexOf("\n")) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1);
  if (l.trim()) { const m = JSON.parse(l); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } } } });
const call = (method, params) => new Promise((res) => { const i = ++id; pending.set(i, res); srv.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: i, method, params }) + "\n"); });
await call("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "find-test", version: "0" } });
srv.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }) + "\n");
const tools = (await call("tools/list", {})).result.tools;
const t = tools.find((x) => x.name === "aoom_find_files");
console.log(`TOOL|aoom_find_files=${t ? 1 : 0}|tools_total=${tools.length}|json=0`);
for (const c of calls) {
  const r = await call("tools/call", { name: "aoom_find_files", arguments: JSON.parse(c) });
  console.log(`--- call ${c}\n${r.result?.content?.[0]?.text ?? JSON.stringify(r.error)}`);
}
srv.kill(); process.exit(0);
