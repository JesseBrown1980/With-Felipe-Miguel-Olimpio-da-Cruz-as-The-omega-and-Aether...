# Asolaria Absorption Runtime Surfaces

Status: `MEASURED_LIRIS` unless otherwise tagged. This file maps the local runtime surfaces Q-PRISM can use when a neural/event stream is absorbed into cube chunks.

## Surface Map

| surface | local status | role in Q-PRISM absorption |
|---|---|---|
| WSL / Ubuntu / Linux lane | `MEASURED_LIRIS`: Ubuntu WSL2 starts and reports Linux `6.6.87.2-microsoft-standard-WSL2`; default WSL distro is `docker-desktop`, stopped. | Heavy raw-data tooling lane for MNE/MEG/EEG feature extraction when Windows tooling is not the right substrate. |
| Asolaria fabric | `MEASURED_LIRIS`: fabric health `ok=true`, service `super-asolaria-os-dashboard-liris-mirror`, local port `4944`, apex `COL-ASOLARIA`, operators `OP-JESSE-PID` / `OP-RAYSSA-PID`. | Owning route/canon surface for system claims and HBP/HBI tuple reads. |
| Fabric HBP route map | `MEASURED_LIRIS`: `/api/everything` converts cleanly through `hbp/any`, 25 HBP rows; dashboard route miss reports 43 available routes. | Tuple-text route discovery. Keep this as the json=0 friendly fabric view. |
| Recall / Hilbra | `MEASURED_LIRIS`: `http://127.0.0.1:4791/api/health` returns `ok=true`, schema `asolaria.recall.node.v1`, rows `10644`, HBP bytes `4521175`, HBI bytes `2050546`, terms `103238`, postings `738077`, `json_hot_path=false`. | Search and retrieval data-plane for absorbed receipts and cube chunks. Public L0 and owner-gated L9 stay distinct. |
| Atlas server | `MEASURED_LIRIS`: `http://127.0.0.1:4790/` serves `asolaria-unified-fabric-map.html/json`, multi-cylinder atlas, recall atlas, and voxel atlas pages. | Operator-facing atlas and visualization surface. Do not treat atlas pixels as host processes. |
| Graphify | `MEASURED_LIRIS`: `C:\Users\rayss\asolaria-graphify-liris\out-hyperbehcs-60d` contains HBP ledgers and graph outputs; bootstrap row reports `frame=60D_PLUS_HYPERBEHCS`, `raw_text_exported=false`, `nodes=4568`, `edges=8029`, `files=861`; served unified map JSON reports a newer `nodes=4830`, `edges=8513`, `files=890`. | Static graph and migration ledger over local memory/canon slices. It maps representation and migration edges; it is not the live system by itself. |
| AgentTerms S04 | `ACER_MACHINE_TAGGED_RECEIPT` + `LIRIS_LOCAL_BOUNDARY`: Acer receipt says AgentTerms is the S04 Agent-Terminal Fabric cohort surface, descriptor-level and boundary-closed; Liris local `/api/agentterms` is 404 and local `:4950` is dark. | Execution/agent-terminal vocabulary and registry layer. Q-PRISM should reference it for dispatch terms but not claim live local AgentTerms runtime. |
| FEDENV / Omnidispatcher | `ACER_MACHINE_TAGGED_RECEIPT` for Acer `:4950` live UI-less dispatcher in the correction receipt; older pipe audit says no real queue traffic through Omnidispatcher during that audit. `MEASURED_LIRIS`: local `:4950` refuses connection. | Optional future dispatch envelope for cube chunks after operator gate. Default Q-PRISM path is represent/search/map, not dispatch/fire. |

## Absorption Shape

For Q-PRISM the cube path is:

```text
raw MEG/EEG/organoid/source stream
  -> WSL/Linux or external-data-root extraction
  -> derived event/features
  -> Asolaria quant tuple / BEHCS-1024 / HyperBEHCS selector
  -> cube chunk receipt with source hash, tuple hash, cube10/handle8, route, proof tier
  -> recall HBP/HBI indexing
  -> graphify/atlas visualization
  -> optional AgentTerms/FEDENV dispatch only after explicit operator gate
```

This matches the fabric rule: representation first, execution later. The system can represent the input across tuple/cube surfaces without implying that a live agent, provider call, or hardware action occurred.

## Claim Boundary

- `MEASURED`: local ports, files, HBP/HBI outputs, and WSL probes listed above.
- `ACER_MACHINE_TAGGED_RECEIPT`: Acer-side AgentTerms/Omnidispatcher facts from published receipts.
- `UNVERIFIED_FROM_LIRIS`: current Acer live process state for `:4950`; this seat did not remeasure Acer's process table.
- `DO_NOT_CLAIM`: consciousness projection, live human control, live AgentTerms execution, USB write, provider fanout, or hardware fire from a cube receipt alone.

Q-PRISM's first valid claim stays narrower:

```text
A derived cube-level neural/event signature improved or failed to improve schedule/control metrics under the declared simulator or hardware harness.
```
## Host8 selector alignment

The selector-alignment lane is `json=0`: Q-PRISM emits HBP/HBI tuple rows and an 8-byte Host8 node handle. The local JS probe can remain a smoke-test scaffold, but the Graphify/Atlas convergence target is the Host8/on-metal contract in `host8/qprism_graphify_selector.rs` plus `host8/QPRISM-HOST8-GRAPHIFY-SELECTOR-2026-07-01.hbp`.

This preserves the Graphify V3 selector constraint `selector_constraint:hyperbehcs-selector-router-60d` and all 11 required selector axes. It does not spawn a process, fire AgentTerms/FEDENV, or claim Asolaria OS kernel materialization.
