#!/usr/bin/env node
"use strict";
/**
 * behcs-bus.js — BEHCS triad mesh node for liris.
 * L2 order: Start BEHCS bus on liris:4947, heartbeat 30s to acer.
 * L3 order: Triangle heartbeat acer-falcon-liris.
 * BEHCS-LAW-003: All three pulse. Silent >120s = escalation.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Gate imports — LP-002: hookwall + gnn + shannon wired into BEHCS bus
const hookwallGate = require("../gates/hookwall-v2");
const gnnGate = require("../gates/gnn");
const shannonGate = require("../gates/shannon");

async function runGateCheck(verb, args, envelope) {
  const results = { hookwall: null, gnn: null, shannon: null, allowed: true };

  // 1. Hookwall
  try {
    results.hookwall = await hookwallGate(verb, args, envelope);
  } catch (err) {
    results.hookwall = { degraded: true, error: err.message || "hookwall gate failed" };
  }

  // 2. GNN
  try {
    results.gnn = await gnnGate(verb, args, envelope);
  } catch (err) {
    results.gnn = { degraded: true, error: err.message || "gnn gate failed" };
  }

  // 3. Shannon — receives gnnResult in envelope
  try {
    const shannonEnvelope = { ...envelope, gnnResult: results.gnn };
    results.shannon = await shannonGate(verb, args, shannonEnvelope);
  } catch (err) {
    results.shannon = { degraded: true, error: err.message || "shannon gate failed" };
  }

  // Overall allowed: false if ANY gate returns allow:false
  if (results.hookwall?.allow === false) results.allowed = false;
  if (results.gnn?.allow === false) results.allowed = false;
  if (results.shannon?.allow === false) results.allowed = false;

  return results;
}

const PORT = 4947;
const ACER_BUS = "http://192.168.100.1:4947";
const HEARTBEAT_INTERVAL_MS = 30000;
const ROOT = "C:/Users/rayss/Asolaria";
const INBOX_FILE = path.join(ROOT, "data/behcs-inbox.ndjson");
const LOG_FILE = path.join(ROOT, "logs/behcs-bus.log");

function ensureDir(p) { try { fs.mkdirSync(path.dirname(p), { recursive: true }); } catch(_) {} }
function log(msg) { const line = new Date().toISOString() + " " + msg; console.log(line); ensureDir(LOG_FILE); fs.appendFileSync(LOG_FILE, line + "\n"); }
function appendInbox(msg) { ensureDir(INBOX_FILE); fs.appendFileSync(INBOX_FILE, JSON.stringify(msg) + "\n"); }

const os = require("os");
const inbox = [];

// Hilbert address for this node
const hilbertAddress = {
  D1: "liris", D7: 4913, D13: 68921, D15: 103823,
  D19: "192.168.100.2", D25: 912673, D35: 3307949,
  D44: 7189057, D47: 9393931
};

// BEHCS tuple builder
function buildTuple(verb, target, risk, layer, gate, state, tags) {
  return ["liris", verb, target, risk, layer, gate, state, tags,
    "pulse", "LX", "signed", "permanent", "ethernet-direct", "free"];
}

// Heartbeat sender
function sendHeartbeat() {
  const data = JSON.stringify({
    from: "liris",
    to: "asolaria",
    verb: "behcs.heartbeat",
    tuple: buildTuple("behcs.heartbeat", "asolaria", 0, "colony", "hookwall", "pulsing",
      ["LX-489", "BEHCS-class-5", "triad-node-3"]),
    text: "liris heartbeat " + new Date().toISOString() + " load=" +
      os.loadavg().map(v => v.toFixed(1)).join(",") + " mem=" +
      Math.round((1 - os.freemem()/os.totalmem()) * 100) + "%",
    data: {
      lx_node: "LX-489",
      compute_class: "sub_colony",
      cpu: { loadavg_1m: os.loadavg()[0], cores: os.cpus().length },
      memory: { used_pct: Math.round((1 - os.freemem()/os.totalmem()) * 100), total_mb: Math.round(os.totalmem()/1048576) },
      hilbertAddress,
      gates: { hookwall: "LIVE", gnn: "LIVE_cascade_offline", shannon: "REGISTERED" },
      dims: 47,
      usb: fs.existsSync("D:\\") ? "MOUNTED_741E5B79" : "NOT_MOUNTED"
    },
    ix: "LX-499",
    version: "behcs-v1"
  });

  const url = new URL(ACER_BUS + "/behcs/send");
  const req = http.request({
    hostname: url.hostname, port: url.port, path: url.pathname,
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    timeout: 5000
  }, (res) => {
    let body = "";
    res.on("data", c => body += c);
    res.on("end", () => { log("heartbeat sent: " + res.statusCode); });
  });
  req.on("error", (e) => { log("heartbeat FAILED: " + e.message); });
  req.write(data);
  req.end();
}

// HTTP server
const server = http.createServer((req, res) => {
  const url = req.url;

  if (url === "/behcs/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      ok: true, device: "liris", bus: "behcs", port: PORT,
      ts: new Date().toISOString(),
      hilbertAddress,
      dims: 47, cosign: "COSIGN_47D_001",
      inbox_count: inbox.length
    }));
  }

  // LP-002: POST /behcs/gate-check — standalone gate pipeline check
  if (url === "/behcs/gate-check" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      try {
        const { verb, args, envelope } = JSON.parse(body);
        const gateResults = await runGateCheck(verb, args, envelope || {});
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(gateResults));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  if (url === "/behcs/send" && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      try {
        const msg = JSON.parse(body);

        // LP-002: Run gate check before accepting message
        const verb = msg.verb || "behcs.send";
        const args = msg.data || msg.args || {};
        const envelope = { pid: msg.from || "unknown", host: msg.from, permissionTier: msg.permissionTier };
        const gateResults = await runGateCheck(verb, args, envelope);

        if (!gateResults.allowed) {
          log("GATE-BLOCKED from=" + msg.from + " verb=" + verb + " gates=" + JSON.stringify(gateResults));
          res.writeHead(403, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, blocked: true, by: "liris", gate_results: gateResults }));
          return;
        }

        msg.received_at = new Date().toISOString();
        msg.received_by = "liris";
        msg.gate_results = gateResults;
        inbox.push(msg);
        appendInbox(msg);
        log("RECV from=" + msg.from + " verb=" + msg.verb + " gates=passed");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, by: "liris", gate_results: gateResults }));
      } catch(e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  if (url === "/behcs/inbox" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, count: inbox.length, messages: inbox.slice(-50) }));
  }

  if (url === "/behcs/devices" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({
      ok: true,
      devices: {
        liris: {
          id: "liris", label: "Liris-kuromi (Rayssa)", role: "triad_node_3",
          endpoints: ["http://192.168.100.2:4947", "http://localhost:4947"],
          capabilities: ["full_compute", "gslgnn", "omni_processor", "gate_pipeline", "47D_engines"],
          hilbertAddress, cube: { D15: 103823, D1: "rayssa" }
        }
      }
    }));
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "not found", routes: ["/behcs/health", "/behcs/send", "/behcs/inbox", "/behcs/devices", "/behcs/gate-check"] }));
});

server.listen(PORT, "0.0.0.0", () => {
  log("BEHCS bus LIVE on 0.0.0.0:" + PORT);
  log("hilbertAddress: " + JSON.stringify(hilbertAddress));
  log("Starting 30s heartbeat to " + ACER_BUS);

  // L2: heartbeat every 30s
  sendHeartbeat();
  setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
});
