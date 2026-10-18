// Append the 50 PID-prompt edges to the canonical GNN edges feed.
// Schema:
//   {from, to, verb, weight, ts, id, pathGlyph, messageGlyph}
//
// Verdict: GUIDED-EXECUTE (audit row 6fbd10f6024346c9) — append-only doctrine.

import fs from "node:fs";
import crypto from "node:crypto";

const SRC = "C:/HyperBEHCS/data/catalogs/pid-prompt-edges.ndjson";
const DST = "C:/Users/acer/Asolaria/data/behcs/gnn-edges.ndjson";

// 8-glyph alphabet for path/message glyphs (deterministic from sha)
const GLYPHS = "⟦⟧μ⑪⁂σu∇÷%④ωl☮ο♣F◉┐5bO┘❀⏚⏛⏜⏝⏞⏟⌬⌭⌮⌯⌰⌱⌲⌳⌴⌵⌶P∃▲J'V◊☶";

function deriveGlyph(seed, len = 8) {
  const h = crypto.createHash("sha256").update(seed).digest();
  let out = "";
  for (let i = 0; i < len; i++) {
    out += GLYPHS[h[i] % GLYPHS.length];
  }
  return out;
}

const edges = fs.readFileSync(SRC, "utf8").trim().split("\n").map(l => JSON.parse(l));

const out = [];
for (const e of edges) {
  const ts = e.ts;
  const pidA = e.source_pid;
  const pidB = e.target_pid;
  const verb = (e.verb === "_structural_" || e.verb === "_geometric_") ? e.edge_type : e.verb;
  const id = "pid-prompt-edge-" + crypto.createHash("sha256").update(pidA + "|" + pidB + "|" + verb + "|" + ts).digest("hex").slice(0, 16);
  out.push({
    from: pidA,
    to: pidB,
    verb,
    weight: e.confidence || 0.5,
    ts,
    id,
    pathGlyph: deriveGlyph(pidA + verb),
    messageGlyph: deriveGlyph(pidB + ts),
    _source: "pid-prompt-engine-encoding-2026-05-21",
    _evidence: e.evidence || null,
    _edge_type: e.edge_type,
  });
}

// Append (do not overwrite)
const lines = out.map(o => JSON.stringify(o)).join("\n") + "\n";
fs.appendFileSync(DST, lines);

const newCount = fs.readFileSync(DST, "utf8").split("\n").filter(Boolean).length;
const fileSha = crypto.createHash("sha256").update(fs.readFileSync(DST)).digest("hex").slice(0, 16);
console.log("appended:", out.length, "edges to gnn-edges.ndjson");
console.log("new total edges in file:", newCount);
console.log("gnn-edges.ndjson sha:", fileSha);
console.log("first appended id:", out[0].id);
console.log("last appended id:", out[out.length - 1].id);
