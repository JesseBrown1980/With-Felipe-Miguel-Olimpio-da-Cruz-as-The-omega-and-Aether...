# Seat 3 — Independent cross-seat audit: PR #111 real host activity vs coherent metadata forgery

**Date:** 2026-10-15. **Seat 3 official review disposition: CHANGES REQUESTED — MAJOR provenance hardening; original physical host observations upheld.** This refers to the code and evidence validation of [Seat2 PR #111](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/111) HEAD `8e597ae4c8d5d1ff76a2d25ad394ec49e601afc4`, with exact-head original final CI run [38777263894](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38777263894) **5/5 PASS**, and to new independent [Seat3 audit CI run 38781609712](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38781609712) **5/5 PASS**. Stage 3 source/negative tests [preregistered first](PREREG-INDEPENDENT-HOST-REPLAY-AUDIT-20261015.md), prereg SHA `7ad294ac7e80282012377e273b5fd52142f35a0b`, with all old evidence files immutable.

## Actual source and execution reviewed

- Frozen actual main at `5d3e3a1147ad7af84c1b5b1ba482dfddd9832c86`; original 701-byte `stones/2026-10-15-rainbow81/seat4-round5-signed-spectrum-mapping-20261015.hbp` SHA256 `077bf98dc7c10e3125ce1147270cc927ce978ab63a19ec30e4655267f1770400`.
- The original HBP **declares** bank SHA256 `52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345`. **PR111 did not read the original full 184,815-byte bank as its timed workload.** Its actual source was that 701-byte HBP, tiled to 2,097,152 bytes and hashed 256 times along with little-endian 32-bit loop-index bytes.
- Independent Python stdlib calculation, separately written from Seat2's Python and Node, and independently written Node22 verifier each reproduced `ae3474a94a03e024ad41bd6d0c508a18cbb3ed43c551da0ed3c6ec701e5b61cf`.
- From actual GitHub API run metadata, final PR111 workflow produced `GITHUB_SHA=5969b7de9ada80e8feaa18b497c1932c009d90db`, a **synthetic pull-request merge SHA**, distinct from head `8e597ae4c8d5d1ff76a2d25ad394ec49e601afc4`. That is expected behavior for a GitHub `pull_request` workflow; don't falsely accuse source tampering simply because the values differ. The source commit is the separate fixed main `5d3e3a11...`.
- Read all four *original* GitHub Actions artifact packages directly from run `38777263894`. Each `host-activity.json` and its SHA sidecar were actually retained and checked, not reconstructed from a summary. All four source-derived static `digital.json`, `instrument-status.json`, `node-review.json` files are **byte-identical** across hosts.

| Original archived runner | Actual OS-reported CPU | Actual wall monotonic | Observed RSS increase | Original host JSON SHA256 |
|---|---:|---:|---:|---|
| Ubuntu Python3.11 | 390.000 ms | 385.854252 ms | 25,169,920 bytes (24.0039 MiB) | `4354440fed66abe28a4316a9e0cd5f9e145d76aa36a4f02b043cff2861ad6373` |
| Ubuntu Python3.13 | 340.000 ms | 341.902826 ms | 25,169,920 bytes (24.0039 MiB) | `2a507e02cc21da0f4335a42580a73612583a24c40559b4bf59a070ccabb6ad47` |
| Windows Python3.11 | 375.000 ms | 385.681100 ms | 25,186,304 bytes (24.0195 MiB) | `9845226702ee5b5fe542e22d09292530b235ce061224e29abc759d2a0a6a1e5a` |
| Windows Python3.13 | 359.375 ms | 346.401200 ms | 25,178,112 bytes (24.0117 MiB) | `4979d93821e6b0bda59542c045301cbf9a9954b33412f417744269a393a3f281` |

These are OS-reported process counters from real physically executed computation and actual device-backed RAM activity; neither an independently electrically metered host (watts/joules/current) nor photon memory instrumentation. CPU time exceeding elapsed in some rows is tolerable due to OS granularity/multicore process scheduling; `time.perf_counter_ns()` returns nanosecond-valued units, **not** nanosecond accuracy. A 24-MiB page-touched allocation and roughly 24-MiB RSS *delta* are distinct from total RSS or measured electrical energy.

## Actual independent CI and adversarial experiment

Seat3 first froze [protocol](PREREG-INDEPENDENT-HOST-REPLAY-AUDIT-20261015.md) in commit `7ad294ac7e80282012377e273b5fd52142f35a0b`, independently authored:
- [Python `referee.py`](referee.py): authentic GitHub-run/commit/runner/time/source packet joins; SHA recomputation; direct checks and actual calls to the frozen Seat2 `review_host_bridge.js` on five modified copies of a genuine telemetry archive. No original artifact altered.
- [Node22 `independent_digest.js`](independent_digest.js): separate two-megabyte payload and 256 index SHA recompute and original four host output consistency.
- [Actions `seat3-pr111-independent-host-audit.yml`](../../../.github/workflows/seat3-pr111-independent-host-audit.yml): four Ubuntu/Windows × Python3.11/3.13 jobs re-download *all four* original archived host packets independently, execute negative cases, mutate a **copy** of the original HBP and reject, plus fifth output digest equality.

**Host adversarial outcomes** (real code execution, not unexecuted conceptual negatives):

| Original Seat2 Node independent reviewer (`review_host_bridge.js`) | New Seat3 externally pinned historical join |
|---|---|
| Recomputed coherent SHA, changed GitHub run ID and 40-hex `GITHUB_SHA`: **ACCEPT** | **REJECT** |
| Changed `runner_os` and `platform_system` Linux→Windows in original Ubuntu package: **ACCEPT** | **REJECT** |
| Inflated CPU and monotonic interval to 3,600 seconds while retaining original subsecond UTC interval: **ACCEPT** | **REJECT** |
| Copied valid Windows host telemetry into an Ubuntu host package, preserving original SHA: **ACCEPT** | **REJECT** |
| Pretended raw optical spectral instrument was measured: **REJECT** | **REJECT** |
| Changed byte of frozen original HBP at source: previously pinned producer trust gate correctly **REJECTS** | **REJECT** |

All four *noninstrument* attacks had coherent recalculated checksum sidecars yet were accepted by original Seat2 Node schema reviewer. This demonstrates **local checksum consistency ≠ independent provenance**. In particular, reviewer currently checks `producing_git_sha` is 40 hex but doesn't require matching actual GitHub Actions run's *pull_request merge* SHA; checks run ID is decimal but not actual selected run; checks runner OS is one of Linux/Windows but not the artifact it supposedly originated from; and checks CPU elapsed >0 but not contemporaneous UTC span. The original PR already acknowledges that a fully attacker-controlled runner may forge all unsigned telemetry; documenting/closing the **independent source/run association** gap is still appropriate before scientific cross-seat acceptance.

An attacker can still forge such a tuple if they also control upstream run metadata or a trusted witness; this stricter verifier is a **historical third-party join**, not a cryptographic host attestor. The four actual original authentic OS counter values remain consistent with the accompanying GitHub run context.

## Final verified Seat3 CI receipts

[Exact five-job run #38781609712](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38781609712): PASS for all four platform jobs plus fifth byte parity. The fifth downloaded all outputs and verified identical deterministic science even when outer OS job timings varied.

- `seat3-pr111-crosshost-verdict.json`: **3,606 bytes**, SHA256 `42374883600277bece8206097f87216979f398789f6da6920efe4c7eaf58f48d`.
- `seat3-independent-node-review.json`: **828 bytes**, SHA256 `43198d704bd37befaebc371dace5cf2ed88bdc04049d0118b75aaf1052209879`.
- Each platform also actually rejected a changed HBP source byte; mutable attack copies were held and then discarded. Original historical and prior PR files remain unchanged.

## Review verdict and minimal non-destructive remediation

**Verdict for [PR #111](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/111) at `8e597ae4...`: `CHANGES_REQUESTED`, severity MAJOR for *unanchored host metadata validation in independent Node reviewer*; digital computation/OS process activity **remain VALID WITHIN SCOPE**.**

Recommend Seat2 author append a narrow, non-destructive correction rather than replace old result:
1. Add an **externally pinned producer run ID and pull-request merge SHA** to review inputs. Verify `GITHUB_RUN_ID`, `GITHUB_SHA`, `RUNNER_OS`, Python version and job association against GitHub Actions job metadata / trusted task inputs. Avoid treating mere 40-hex/decimal syntactic shape as authentication. Explicitly distinguish `PR HEAD` and `GITHUB_SHA` generated merge.
2. Reject swapped Linux/Windows packets and monotonic/UTC gross contradictions with a reasonable scheduling/granularity tolerance. New test must preserve valid CPU slightly exceeding wall and platform differences. Keep host observations raw, never force same across jobs.
3. Preserve honest lack of direct calibrated electrical/optical sensor input and host-chassis custody. Reject false `measured=true` without separate trusted meter archive. Do not conflate the separate operator-reported completed August photon-memory experiment with these October uninstrumented runs; its raw instrument audit remains pending.
4. Commit new tests proving that all four metadata replay attacks are now rejected, keep earlier first red and later green attempts visible, rerun 5/5 exact-head CI; request renewed Seat1/3/4/5 review of any new revision. Do not automatically merge or delete old branch.

**Non-destructive cleanup recommendation for #117:** PR #111 = `MERGE_DISTINCT_AFTER_NARROW_CUSTODY_HARDENING`, because its measured real 24-MiB page-touched hash/RSS experiment is **different** from PR #110 full bank run, PR #113 model-child process and PR #112 Rust compiled baseline. Shared schemas and provenance validators can be extracted without destroying these distinct workloads; do not pool their speed, memory, photon or power figures.

### Three evidence classes maintained

1. **Verified digital source/output** (yes; two independently written Seat3 implementations and original Seat2 5/5).
2. **OS-observed physically executed process** (yes; original four authentic host packet CPU/RSS/elapsed and preserved hashes).
3. **Independent calibrated electrical/optical/phononic actual sensor readings** (not present in *PR111 hosted CI*). Separate August **operator-reported completed photon-memory experiment** and historical LIRIS SH observations are **not disproved or retracted**; audit of those experiments' original independent instrument/timing packets remains a separate physical evidence gate.
