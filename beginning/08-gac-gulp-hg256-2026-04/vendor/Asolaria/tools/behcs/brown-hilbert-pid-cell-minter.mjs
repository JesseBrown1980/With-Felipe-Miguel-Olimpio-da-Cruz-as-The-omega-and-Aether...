#!/usr/bin/env node
// brown-hilbert-pid-cell-minter.mjs — PID minter for cascade-wave pi-cells.
//
// Per acer's cascade-waves-thinking-by-PID design (2026-04-29):
//   PID format: PID-H{04}-A{01}-W{wave_id}-P{cell_idx}-N{seq}
//                       ↑       ↑
//               Hilbert coord  division of labor
//
// Adjacent PIDs auto-specialize in adjacent concerns. The Hilbert ordering
// IS the division of labor — no scheduler needed.
//
// Also exports the canonical 47-byte BEHCS-256 PID encoding for cells (matches
// big-pickle row schema's 47-D Brown-Hilbert space).

import crypto from "node:crypto";

// 4-digit Hilbert coord (H), 2-digit aspect (A), wave id (W), cell index (P), seq (N).
// Pad with leading zeros for sortability.
function pad(n, w) { return String(n).padStart(w, "0"); }

export function mintPidCell({ wave_id, cell_idx, seq = 0, hilbert_coord = null, aspect = "01" }) {
  // Derive Hilbert coord deterministically from wave_id + cell_idx if not given.
  // Use first 16 bits of sha256 mapped to 0-9999.
  let H;
  if (hilbert_coord !== null) {
    H = hilbert_coord & 0xffff;
  } else {
    const hash = crypto.createHash("sha256").update(`${wave_id}-${cell_idx}`).digest();
    H = hash.readUInt16BE(0) % 10000;
  }
  return `PID-H${pad(H, 4)}-A${aspect}-W${wave_id}-P${pad(cell_idx, 2)}-N${pad(seq, 5)}`;
}

export function mintPidWave({ wave_id, cell_count, aspects = null, base_hilbert_coord = null }) {
  const cells = [];
  for (let i = 0; i < cell_count; i++) {
    const aspect = aspects && aspects[i] ? aspects[i] : "01";
    // Adjacent PIDs get adjacent Hilbert coords (linear in i so neighbors specialize naturally).
    const H = base_hilbert_coord !== null ? (base_hilbert_coord + i) % 10000 : null;
    cells.push({
      pid: mintPidCell({ wave_id, cell_idx: i, hilbert_coord: H, aspect }),
      cell_idx: i,
      aspect,
    });
  }
  return { wave_id, cell_count, cells };
}

// 47-byte BEHCS-256 PID (Brown-Hilbert canonical) — for binary-row use.
// Each byte is a glyph index in the BEHCS-256 alphabet.
export function mintBehcs256Pid47({ entropy_seed }) {
  const buf = Buffer.alloc(47);
  let h = crypto.createHash("sha512").update(String(entropy_seed)).digest();
  // 64 bytes; cycle through to fill 47.
  for (let i = 0; i < 47; i++) buf[i] = h[i % h.length];
  return buf;
}

// Helper: classify a PID by its Hilbert coord into an "aspect-region" (the
// "division of labor" per acer's design). Maps H 0-9999 into 10 regions:
// 0-999 = corpus-mining, 1000-1999 = pen-test, etc. Configurable.
export const ASPECT_REGIONS = {
  CORPUS_MINING: { range: [0, 999], aspect: "01", verbs: ["EVT-PI-AGENT-REQUEST", "EVT-OPENCODE-AGENT-REQUEST"] },
  PEN_TEST: { range: [1000, 1999], aspect: "02", verbs: ["EVT-HERMES-PACKET-VALIDATE-REQUEST", "EVT-SHANNON-TRUST-SCORE-REQUEST"] },
  GNN_SCORING: { range: [2000, 2999], aspect: "03", verbs: ["EVT-GNN-INFER-REQUEST"] },
  COUNCIL_VOTE: { range: [3000, 3999], aspect: "04", verbs: ["EVT-FABRIC-QUERY-REQUEST"] },
  SUPERVISOR_EXERCISE: { range: [4000, 4999], aspect: "05", verbs: ["EVT-FED-SUPERVISOR-EXERCISE"] },
  COSIGN_CHAIN_ENTRY: { range: [5000, 5999], aspect: "06", verbs: ["EVT-COSIGN-CHAIN-MIRROR-CHUNK"] },
  WHITE_ROOM_STAGE: { range: [6000, 6999], aspect: "07", verbs: ["EVT-WHITE-ROOM-STAGE-INGEST"] },
  CASCADE_AGGREGATE: { range: [7000, 7999], aspect: "08", verbs: ["EVT-CASCADE-WAVE-AGGREGATE"] },
  GLYPH_GENESIS: { range: [8000, 8999], aspect: "09", verbs: ["EVT-GLYPH-GENESIS"] },
  RESERVED: { range: [9000, 9999], aspect: "99", verbs: [] },
};

export function classifyPidAspect(pid) {
  const m = pid.match(/^PID-H(\d{4})-/);
  if (!m) return null;
  const H = parseInt(m[1], 10);
  for (const [name, def] of Object.entries(ASPECT_REGIONS)) {
    if (H >= def.range[0] && H <= def.range[1]) return { aspect_name: name, ...def, hilbert: H };
  }
  return null;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  // CLI demo: mint a wave of 5 cells.
  const wave = mintPidWave({ wave_id: "001", cell_count: 5 });
  console.log("=== Demo wave (5 cells) ===");
  for (const cell of wave.cells) {
    const cls = classifyPidAspect(cell.pid);
    console.log(`  ${cell.pid}  aspect_region=${cls?.aspect_name ?? "?"}`);
  }
  console.log("\n=== 47-byte BEHCS-256 PID for cell 0 ===");
  const pid47 = mintBehcs256Pid47({ entropy_seed: wave.cells[0].pid });
  console.log(`  hex: ${pid47.toString("hex")}`);
  console.log(`  bytes: ${pid47.length}`);
}
