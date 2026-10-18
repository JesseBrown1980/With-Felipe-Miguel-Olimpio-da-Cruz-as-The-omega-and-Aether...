# 03 — GNN design seed (2026-03-03 to 2026-03-07)

Build-order step 3 of the beginning. This is where the graph-neural-network idea entered Asolaria: the owner asked for the Edge-Level GNN paper to be read against the system, a research review set the build order, and the first graph-runtime code, UI, exporter and dataset were written. ADR-0010 (2026-03-15) is the training contract written from this seed before any model was trained.

Everything under `vendor/Asolaria/` is byte-identical to the public repo `JesseBrown1980/Asolaria`, at the commit and path given in `PROVENANCE.md`. Check it from this directory with `sha256sum -c UPSTREAM.sha256`.

## In the owner's words

The owner note (`vendor/Asolaria/tmp/docs/Alright pull the Edge GNN paper from downloads.txt`) opens:

> Alright pull the Edge GNN paper from downloads, and intergrate that into realization of how this systems's GNN was planned, (maybe incorretly?), if it really represents the ground breaking idea and algorithms, or if it is better? or worse? in reality.

The 2026-03-03 system card already listed the sidecar as roadmap item 5:

> 5. **GNN sidecar v1**
>    - Rule+prototype edge classifier pilot on connector/action telemetry.

and, under "GNN concept transposition (targeted)":

> - Start with rule-based edge scoring + interpretable prototype-style modeling
> - Progress to temporal graph modeling after collecting labeled telemetry

The 2026-03-07 review states the decision:

> - Use `Edge-Level Graph Neural Network Architectures for Network Intrusion Detection` as a strong design input for a future **runtime edge-risk sidecar** inside Asolaria.

> - Do **not** continue treating the healthcare repo as the main home for this idea. The natural home is Asolaria itself.

> `policy kernel first, graph second, learned model third`

and its build sequence:

> 1. formalize canonical event and manifest schemas
> 2. add graph-event emission at task ledger, gateway, provider-routing, and phone/voice boundaries
> 3. build a deterministic edge-risk engine
> 4. create replay tooling over recorded event graphs
> 5. add a prototype-based sidecar for explainable edge archetypes
> 6. only then experiment with contrastive and learned-structure models
> 7. later, move to temporal heterogeneous graph models if the replay evidence justifies it

It records the paper's figures: "Original ToN-IoT distribution was `96.4% attacks, 3.6% normal`" and test accuracy "`91.87`, `94.24`, `94.71`, and `96.66`" for baseline, Prototype, Contrastive and GSL.

ADR-0010 (2026-03-15):

> Before any model training, we need: edge label policy, node/edge feature definitions, export format, temporal split rules, shadow-mode evaluation contract, and fallback-to-heuristics contract.

## Date range

- 2026-02-19 19:15: `riskEngine.js` b745570e, in the first release snapshot (the origin of the edge-risk scorer).
- 2026-03-03: system card, roadmap item "GNN sidecar v1".
- 2026-03-05 01:23: `riskEngine.js` 4c9ec07e (file date inside gaia-full-src.zip).
- 2026-03-07: research review; `edgeRiskEngine.js` 16:58, `graphRuntimeStore.js` 17:11, `graphRuntimeQuery.js` 20:01 (file dates inside gaia-full-src.zip, same bytes as the vendored blobs); first dataset `generatedAt` 2026-03-07T23:04:32.999Z.
- On or after 2026-03-07: the owner note (undated; it reads `edgeRiskEngine.js`, `graphRuntimeStore.js` and `graphRuntimeQuery.js`).
- By 2026-03-13: the UI files and the exporter are in release `Asolaria-Public-20260313-105820`.
- 2026-03-15: first commits to the repo (b49a725 14:41, e8c3369 15:20, ADR-0010 at 64b1a14 19:06).
- 2026-04-11: the owner note and the paper are committed (fbcb630).

## What each part is

| vendored file | what it is |
|---|---|
| `reports/asolaria-system-card-20260303.md` | "Asolaria System Card (Sanitized, Frontier-Model Analysis Format)", dated 2026-03-03. Section 12 transposes the healthcare assistant's GNN idea to runtime telemetry edges (agent -> tool, tool -> connector, connector -> external API, device -> control action). |
| `reports/graph-runtime-research-review-20260307.md` | "Graph Runtime Research Review", dated 2026-03-07. Reads the Edge-Level GNN paper and a graph-sampling paper against Asolaria and the healthcare repo; sets the typed temporal heterograph, "score edges, not objects", and "rule engine first, GNN second". |
| `tmp/docs/Alright pull the Edge GNN paper from downloads.txt` | The owner's prompt (line 1) and the session's answer, "Section K: Edge GNN Paper Analysis, Tron World Vision, Google Ecosystem & Hybrid Control Architecture". |
| `dist/private-phone-release/Asolaria-Public-20260219-191542/src/riskEngine.js` | 2026-02-19 risk engine: `scoreToLevel` (>= 9 critical, >= 6 high, >= 3 medium, else low), an `actionRiskScore` table, `evaluateRisk`. |
| `src/riskEngine.js` | The same engine as committed at e8c3369 (file date 2026-03-05); the action table has more entries. |
| `src/edgeRiskEngine.js` | 2026-03-07 `scoreEdgeRisk(input)`: returns `{score, level, reasons, actorDomain, targetDomain, approvalState, autonomous}`; its `mapScoreToLevel` uses the same 9 / 6 / 3 thresholds as `riskEngine.scoreToLevel`. |
| `src/graphRuntimeStore.js` | 2026-03-07 `buildGraphEvent`, `appendGraphEvent`, `buildActionManifest`, `appendActionManifest`; writes `graph-runtime-events.ndjson` and `graph-runtime-manifests.ndjson` and scores each record with `scoreEdgeRisk`. |
| `src/graphRuntimeQuery.js` | 2026-03-07 `buildGraphRuntimeSnapshot`, `listGraphRuntimeRecords`, `buildGraphRuntimeDiffReport`, `buildGraphRuntimeTrainingDataset`; holds `experimentalEdgePrototypes` (provider-route, phone-loop, task-flow, privileged-control). |
| `routes/graphRuntime.js` | The `/graphRuntime` routes as extracted from server.js on 2026-03-15 (header: "extracted from server.js (ADR-0001 strangler-fig)"): GET `/snapshot`, `/export`, `/diff-report`, `/training-export`, `/stream` (SSE). |
| `public/graph-runtime.html`, `public/graph-runtime.js` | The "Asolaria Graph Runtime" page and its script. |
| `tools/export-graph-runtime-dataset.js` | Calls `buildGraphRuntimeTrainingDataset` and writes `reports/graph-runtime-datasets/graph-runtime-training-<ISO stamp>.json`. |
| `reports/graph-runtime-datasets/graph-runtime-training-2026-03-07T23-04-33-000Z.json` | The first dataset in the estate: 11 nodes, 11 edge samples, 24 record samples; pseudoLabels benign 1 / watch 19 / suspicious 4. Its own note: "Pseudo-labeled read-only export for offline graph-runtime experiments. Not for online policy decisions." |
| `docs/adr/ADR-0010-gnn-preconditions.md` | Edge label policy (binary benign / suspicious from approval_denied, guardian_blocked, human_rollback, severe_mistake_pattern_hit, unauthorized_privileged_action, secret_touch; pseudoLabel "watch" counts as benign), 12-dim node and 10-dim edge features, PyG-compatible nodes.csv / edges.csv, 70/15/15 temporal split, shadow-mode and fallback-to-heuristics contracts. |

`graphRuntimeStore.js` requires `./runtimePaths` (`src/runtimePaths.js`, blob 8b703d2c, 852 B), which is pinned in `PROVENANCE.md` and not vendored here.

## Already in aether (later versions)

- `events/vendor/legacy/edgeRiskEngine.js` is blob a1867fac (4065 B, first committed 2026-04-30 at 80bf516 `packages-legacy-import/src/`), a later version of the 2026-03-07 `edgeRiskEngine.js` f691136f vendored here.
- `events/vendor/legacy/graphRuntimeStore.js` is blob db4dd2d2 (8070 B, 2026-04-30, 80bf516), a later version of `graphRuntimeStore.js` 235be28f vendored here.
- `model/l0-edge/vendor/legacy/gnnDataExport.js` is blob f422efea (2026-03-15 20:26, 46e03b0), the exporter that followed this seed.
- Nothing else in this directory was in aether before. `graphRuntimeQuery.js` 7c9de62f is unchanged in the 2026-04-30 `packages-legacy-import/` tree.

## Held, and why

See `HELD.hbp`. The Edge-Level GNN paper PDF (blob e07884be, 1037005 B, sha256 7b6d273b609c1a99...) is a third-party document and sits only under `tmp/docs/whatsapp-*`; it is pinned by sha256, not vendored. `gaia-full-src.zip` (under `tmp/docs/whatsapp-rayssa/`) is held; it was read only for the file dates quoted above.

The owner note sits under `tmp/docs/` but not under `tmp/docs/whatsapp-*`. It was read before vendoring: it is the owner's own prompt and the session's answer, with no credential and no message from anyone else. It names the owner's own account address and subscription tiers as he wrote them.

## Not public

- The second paper the review lists, `Ms_JAMCS_154454.pdf` ("Overlapping Cluster Sampling on Real-World Social Networks"): not on any ref of the mirror or in the estate clones searched.
- The owner's Downloads copies the review cites (`C:\Users\acer\Downloads\...`): local only.
- The live event log the first dataset was cut from (`graph-runtime-events.ndjson` under the data path): never committed.
- The second dataset (2026-03-30T08:45:55.930Z, blob 794a27a1, 1469368 B) is public but outside this step's window; it is pinned in `PROVENANCE.md`.
