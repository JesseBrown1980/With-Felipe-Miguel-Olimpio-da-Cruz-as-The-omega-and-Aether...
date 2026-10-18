#!/usr/bin/env python3
"""Internal generator used once by W32C to materialise unified-dashboard-v6.html
from the v5 template via surgical transforms. Sidecar-discipline-safe: v5 stays
read-only; output is a new file. This script is a build-time helper, not part of
the dashboard runtime."""
from __future__ import annotations
import os

SRC = r"C:/HyperBEHCS/bin/unified-dashboard-v5.html"
DST = r"C:/HyperBEHCS/bin/unified-dashboard-v6.html"

html = open(SRC, "r", encoding="utf-8").read()

# 1. Title
html = html.replace(
    "<title>Asolaria Federation \u2014 Overnight Status (v5: Fresh Ledger)</title>",
    "<title>Asolaria Federation \u2014 Overnight Status (v6: Ledger Barrier)</title>",
)

# 2. v6 CSS (inserted before </style>)
V6_CSS = r"""
  /* v6 (W32C) - Ledger barrier / reconciliation / concurrency panels */
  .snapshot-status-badge { display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 4px; font-size: 11px; letter-spacing: 0.06em;
    text-transform: uppercase; font-weight: 700; border: 1px solid var(--grid);
    background: var(--bg3); color: var(--muted); margin-left: 8px; }
  .snapshot-status-badge .sdot { width: 8px; height: 8px; border-radius: 50%;
    box-shadow: 0 0 6px currentColor; }
  .snapshot-status-badge.complete { background: rgba(126,231,135,0.10);
    color: var(--accent); border-color: var(--accent-dim); }
  .snapshot-status-badge.complete .sdot { background: var(--accent); }
  .snapshot-status-badge.partial { background: rgba(240,180,41,0.10);
    color: var(--amber); border-color: var(--amber-dim); }
  .snapshot-status-badge.partial .sdot { background: var(--amber); }
  .snapshot-status-badge.stale { background: rgba(255,166,87,0.10);
    color: var(--orange); border-color: #4a2a10; }
  .snapshot-status-badge.stale .sdot { background: var(--orange); }
  .snapshot-status-badge.race { background: rgba(255,92,92,0.10);
    color: var(--bad); border-color: #4a1010;
    box-shadow: 0 0 12px rgba(255,92,92,0.35); }
  .snapshot-status-badge.race .sdot { background: var(--bad); }
  .snapshot-status-badge.unknown { background: var(--bg3); color: var(--muted); }
  .snapshot-status-badge.unknown .sdot { background: var(--muted); }
  .panel.recon { border-color: #2f4a6a;
    box-shadow: 0 0 0 1px rgba(121,192,255,0.07) inset; }
  .panel.concur { border-color: #2b6a4a;
    box-shadow: 0 0 0 1px rgba(126,231,135,0.06) inset; }
  .panel.concur.fail { border-color: #6a2f2f;
    box-shadow: 0 0 0 1px rgba(255,92,92,0.10) inset; }
  .recon-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
    margin-top: 10px; }
  @media (max-width: 900px) { .recon-grid { grid-template-columns: 1fr; } }
  .recon-side { background: var(--bg3); border: 1px dotted var(--grid);
    border-radius: 4px; padding: 8px 10px; }
  .recon-side h3 { margin: 0 0 6px 0; font-size: 11px; color: var(--muted);
    letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; }
  .recon-side table { width: 100%; }
  .recon-side td.k { color: var(--muted); font-size: 11px; }
  .recon-side td.v { text-align: right; font-feature-settings: "tnum";
    font-size: 11px; }
  .delta-row td { color: var(--orange); }
  .delta-row td.k { color: var(--orange); }
  .concur-row { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; }
  .concur-cell { flex: 1 1 220px; padding: 10px 12px; border-radius: 4px;
    border: 1px solid var(--grid); background: var(--bg3);
    display: flex; flex-direction: column; gap: 4px; }
  .concur-cell.pass { border-color: var(--accent-dim);
    background: rgba(126,231,135,0.04); }
  .concur-cell.fail { border-color: #6a2f2f;
    background: rgba(255,92,92,0.06); }
  .concur-cell.pending { border-color: var(--amber-dim);
    background: rgba(240,180,41,0.04); }
  .concur-cell .scen-name { font-size: 11px; color: var(--muted);
    text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
  .concur-cell .scen-status { font-size: 16px; font-weight: 700; }
  .concur-cell.pass .scen-status { color: var(--accent); }
  .concur-cell.fail .scen-status { color: var(--bad); }
  .concur-cell.pending .scen-status { color: var(--amber); }
  .recon-banner { padding: 8px 12px; border-radius: 4px; margin-top: 8px;
    border: 1px solid var(--grid); background: var(--bg3); font-size: 12px; }
  .recon-banner.pass { border-color: var(--accent-dim);
    background: rgba(126,231,135,0.06); color: var(--accent); }
  .recon-banner.fail { border-color: #6a2f2f;
    background: rgba(255,92,92,0.06); color: var(--bad); }
  .recon-banner.pending { border-color: var(--amber-dim);
    background: rgba(240,180,41,0.06); color: var(--amber); }
</style>"""
assert "</style>" in html
html = html.replace("</style>", V6_CSS, 1)

# 3. Panel 10 header: append snapshot_status badge slot
html = html.replace(
    'Panel 10 - Audit Mode (OP-W30-SHADOW-BLOCK-FIRST) <span id="panel-10-fresh-stamp"></span></h2>',
    'Panel 10 - Audit Mode (OP-W30-SHADOW-BLOCK-FIRST) '
    '<span id="panel-10-fresh-stamp"></span> '
    '<span id="panel-10-snapshot-status"></span></h2>',
)

# 4. Insert Panel 12 + Panel 13 just before Panel 8
PANEL_8_MARKER = '    <div class="panel full seam"><h2>Panel 8 - Vocab Seam Status'
NEW_PANELS = (
    '    <div class="panel full recon"><h2>Panel 12 - Reconciliation Status '
    '(OP-W32-LEDGER-BARRIER-FIRST) <span id="panel-12-status"></span></h2>'
    '<div id="panel-reconciliation">--</div></div>\n'
    '\n'
    '    <div class="panel full concur" id="panel-13-wrap"><h2>Panel 13 - '
    'Concurrency Test Results (W32B) <span id="panel-13-status"></span></h2>'
    '<div id="panel-concurrency-test">--</div></div>\n'
    '\n'
)
assert PANEL_8_MARKER in html
html = html.replace(PANEL_8_MARKER, NEW_PANELS + PANEL_8_MARKER)

# 5. Replace the entire footer-assignment block in v6 (skip an earlier blanket
# rename; we do the full block replacement once to keep things deterministic).

V5_FOOTER = (
    '  document.getElementById("footer").textContent =\n'
    '    "unified-dashboard-built-v5.html - W31C - Fresh Ledger Snapshot - snapshot v5 "\n'
    '    + (D.snapshot_at_v5 || D.snapshot_at_v4 || D.snapshot_at_v3 || D.snapshot_at_v2 || D.snapshot_at || "?")\n'
    '    + " - ledger_fresh_at " + ((D.ledger_summary || {}).fresh_snapshot_at || "?")\n'
    '    + " - sidecar PID AGT-VECTOR-VIZ_RENDER-W31C-DASHBOARD-V5-LEDGER-REVIEW-2026-05-21";\n'
)
assert V5_FOOTER in html, "v5 footer block not found verbatim"

V6_JS = r"""
  // ----- v6 (W32C) - snapshot_status badge + Panel 12 + Panel 13 -----

  // Panel 10 snapshot_status badge (top-level field exposed by v6 snapshot)
  (function() {
    var slot = document.getElementById("panel-10-snapshot-status");
    if (!slot) return;
    var val = D.ledger_snapshot_status || "UNKNOWN-W32A-NOT-PRESENT";
    var cls = "unknown";
    if (val === "COMPLETE") cls = "complete";
    else if (val === "PARTIAL") cls = "partial";
    else if (val === "STALE") cls = "stale";
    else if (val === "RACE-DETECTED") cls = "race";
    var label = (val === "UNKNOWN-W32A-NOT-PRESENT")
      ? "snapshot: PENDING (W32A absent)"
      : ("snapshot: " + val);
    slot.innerHTML = '<span class="snapshot-status-badge ' + cls + '">'
                   + '<span class="sdot"></span>' + escapeHTML(label) + '</span>';
  })();

  // Panel 12: Reconciliation Status
  (function() {
    var c = document.getElementById("panel-reconciliation");
    if (!c) return;
    c.innerHTML = "";
    var r = D.reconciliation || {};
    var dash = r.dashboard_totals || {};
    var recomp = r.recomputed_totals || {};
    var deltas = r.deltas || {};
    var hasRecomp = Object.keys(recomp).length > 0;
    var w32aMissing = !hasRecomp && (String(r._status || "").toLowerCase().indexOf("absent") >= 0);

    // Header pass/fail badge
    var slot12 = document.getElementById("panel-12-status");
    if (slot12) {
      var hcls, htext;
      if (w32aMissing) { hcls = "partial"; htext = "PENDING (W32A absent)"; }
      else if (r.pass) { hcls = "complete"; htext = "PASS"; }
      else { hcls = "race"; htext = "FAIL"; }
      slot12.innerHTML = '<span class="snapshot-status-badge ' + hcls + '">'
                       + '<span class="sdot"></span>' + escapeHTML(htext) + '</span>';
    }

    // Banner
    var bannerCls = w32aMissing ? "pending" : (r.pass ? "pass" : "fail");
    var banner = el("div", { class: "recon-banner " + bannerCls });
    if (w32aMissing) {
      banner.textContent = "Reconciliation PENDING - W32A reconcileLedger not yet present "
        + "(race-safe). Will populate when "
        + "D:/AsolariaGuides/autopilot-overnight-2026-05-20/W32A-LEDGER-BARRIER/ "
        + "exports reconcileLedger.";
    } else if (r.pass) {
      banner.textContent = "Reconciliation PASS - recomputed totals match dashboard "
        + "(mismatch_count=" + (r.mismatch_count == null ? 0 : r.mismatch_count) + ").";
    } else {
      banner.textContent = "Reconciliation FAIL - mismatch_count="
        + (r.mismatch_count == null ? "?" : r.mismatch_count) + ". See deltas.";
    }
    c.appendChild(banner);

    // Chips
    var chips = el("div");
    chips.style.display = "flex"; chips.style.flexWrap = "wrap";
    chips.style.gap = "8px"; chips.style.marginTop = "8px";
    function chip(label, val, pillCls) {
      var w = el("span");
      w.appendChild(el("span", { class: "muted small" }, label + ": "));
      w.appendChild(el("span", { class: "pill " + (pillCls || "blue") }, String(val)));
      return w;
    }
    chips.appendChild(chip("pass",
      w32aMissing ? "PENDING" : (r.pass ? "TRUE" : "FALSE"),
      w32aMissing ? "amber" : (r.pass ? "green" : "red")));
    chips.appendChild(chip("mismatch_count",
      r.mismatch_count == null ? "?" : r.mismatch_count,
      (r.mismatch_count && r.mismatch_count > 0) ? "red" : "green"));
    chips.appendChild(chip("last_reconciled_at",
      r.last_reconciled_at
        ? r.last_reconciled_at.replace("T", " ").replace("Z", " UTC")
        : "(never)",
      "blue"));
    c.appendChild(chips);

    // Side-by-side totals
    var grid = el("div", { class: "recon-grid" });
    function buildSide(title, totals) {
      var box = el("div", { class: "recon-side" });
      box.appendChild(el("h3", null, title));
      var t = el("table");
      var tb = el("tbody");
      var keys = ["total_entries","would_block_count","pending_review_count",
                  "true_positive_count","false_positive_count",
                  "confirmed_violation_count","update_of_marker_count","raw_line_count"];
      keys.forEach(function(k) {
        var tr = el("tr");
        if (deltas[k]) tr.className = "delta-row";
        tr.appendChild(el("td", { class: "k" }, k));
        tr.appendChild(el("td", { class: "v" },
          String(totals[k] == null ? "-" : totals[k])));
        tb.appendChild(tr);
      });
      t.appendChild(tb);
      box.appendChild(t);
      return box;
    }
    grid.appendChild(buildSide("Dashboard totals (v5 fresh_ledger)", dash));
    grid.appendChild(buildSide("Recomputed totals (W32A reconcileLedger)",
      hasRecomp ? recomp : {}));
    c.appendChild(grid);

    // Notes / deltas
    var notes = el("div");
    notes.style.marginTop = "10px";
    var nh = el("h3");
    nh.style.fontSize = "11px"; nh.style.color = "var(--muted)";
    nh.style.letterSpacing = "0.1em"; nh.style.textTransform = "uppercase";
    nh.style.fontWeight = "600"; nh.style.margin = "0 0 6px 0";
    nh.textContent = "Notes";
    notes.appendChild(nh);
    var deltaKeys = Object.keys(deltas);
    if (deltaKeys.length > 0) {
      var dt = el("table", { class: "sub-table" });
      var thr = el("tr");
      ["metric","dashboard","recomputed","delta"].forEach(function(h) {
        thr.appendChild(el("th", null, h));
      });
      dt.appendChild(el("thead", null, thr));
      var dtb = el("tbody");
      deltaKeys.forEach(function(k) {
        var d = deltas[k] || {};
        var tr = el("tr");
        tr.appendChild(el("td", { class: "small mono" }, k));
        tr.appendChild(el("td", { class: "num small mono" },
          String(d.dashboard == null ? "?" : d.dashboard)));
        tr.appendChild(el("td", { class: "num small mono" },
          String(d.recomputed == null ? "?" : d.recomputed)));
        var dCell = el("td", { class: "num small mono" });
        dCell.appendChild(el("span", {
          class: "pill " + ((d.delta || 0) !== 0 ? "amber" : "green")
        }, String(d.delta == null ? "?" : d.delta)));
        tr.appendChild(dCell);
        dtb.appendChild(tr);
      });
      dt.appendChild(dtb);
      notes.appendChild(dt);
    } else {
      var nm = el("div", { class: "muted small" });
      nm.textContent = w32aMissing
        ? "(no deltas - reconciliation has not yet run)"
        : "(no deltas - recomputed totals match dashboard totals exactly)";
      notes.appendChild(nm);
    }
    c.appendChild(notes);

    var sf = el("div", { class: "muted small" });
    sf.style.marginTop = "8px";
    sf.textContent = "_status: " + (r._status || "?");
    c.appendChild(sf);
  })();

  // Panel 13: Concurrency Test Results (W32B scenarios A/B/C)
  (function() {
    var c = document.getElementById("panel-concurrency-test");
    if (!c) return;
    c.innerHTML = "";
    var ct = D.concurrency_test || {};
    var anyFail = (ct.scenario_A === "FAIL" || ct.scenario_B === "FAIL"
                || ct.scenario_C === "FAIL");
    var allPass = (ct.scenario_A === "PASS" && ct.scenario_B === "PASS"
                && ct.scenario_C === "PASS");

    var wrap = document.getElementById("panel-13-wrap");
    if (wrap) {
      wrap.classList.remove("fail");
      if (anyFail) wrap.classList.add("fail");
    }

    var slot13 = document.getElementById("panel-13-status");
    if (slot13) {
      var cls, lbl;
      if (allPass) { cls = "complete"; lbl = "ALL PASS"; }
      else if (anyFail) { cls = "race"; lbl = "FAIL"; }
      else { cls = "partial"; lbl = ct.overall || "PENDING"; }
      slot13.innerHTML = '<span class="snapshot-status-badge ' + cls + '">'
                       + '<span class="sdot"></span>' + escapeHTML(lbl) + '</span>';
    }

    var row = el("div", { class: "concur-row" });
    ["A","B","C"].forEach(function(letter) {
      var s = ct["scenario_" + letter] || "PENDING";
      var ccls = (s === "PASS") ? "pass" : (s === "FAIL") ? "fail" : "pending";
      var cell = el("div", { class: "concur-cell " + ccls });
      cell.appendChild(el("div", { class: "scen-name" }, "Scenario " + letter));
      cell.appendChild(el("div", { class: "scen-status" }, s));
      var hint = "";
      if (letter === "A") hint = "writer-vs-reader race";
      else if (letter === "B") hint = "concurrent-write barrier";
      else if (letter === "C") hint = "snapshot-during-mutation";
      cell.appendChild(el("div", { class: "muted small" }, hint));
      row.appendChild(cell);
    });
    c.appendChild(row);

    var link = el("div", { class: "queue-hint" });
    var receiptPath = ct.receipt_path
      || "D:/AsolariaGuides/autopilot-overnight-2026-05-20/W32B-CONCURRENCY-FIXTURE/RECEIPT.md";
    link.innerHTML = "<b>W32B receipt:</b> <code>" + escapeHTML(receiptPath) + "</code><br>"
                   + "<b>overall:</b> " + escapeHTML(ct.overall || "PENDING") + "<br>"
                   + "<b>_status:</b> " + escapeHTML(ct._status || "?");
    c.appendChild(link);
  })();

"""

V6_FOOTER = (
    '  document.getElementById("footer").textContent =\n'
    '    "unified-dashboard-built-v6.html - W32C - Ledger Barrier - snapshot v6 "\n'
    '    + (D.snapshot_at_v6 || D.snapshot_at_v5 || D.snapshot_at_v4 || D.snapshot_at_v3 || D.snapshot_at_v2 || D.snapshot_at || "?")\n'
    '    + " - ledger_snapshot_status=" + (D.ledger_snapshot_status || "?")\n'
    '    + " - reconciliation.pass=" + String((D.reconciliation||{}).pass)\n'
    '    + " - sidecar PID AGT-VECTOR-VIZ_RENDER-W32C-DASHBOARD-V6-SNAPSHOT-STATUS-2026-05-21";\n'
)

html = html.replace(V5_FOOTER, V6_JS + V6_FOOTER)

for token in [
    "Panel 12 - Reconciliation Status",
    "Panel 13 - Concurrency Test Results (W32B)",
    "panel-10-snapshot-status",
    "snapshot-status-badge",
    "ledger_snapshot_status",
    "unified-dashboard-built-v6.html",
    "v6 (W32C) - snapshot_status badge",
]:
    assert token in html, f"missing token after transform: {token!r}"

open(DST, "w", encoding="utf-8").write(html)
print(f"wrote {DST} bytes={os.path.getsize(DST)} lines={html.count(chr(10)) + 1}")
