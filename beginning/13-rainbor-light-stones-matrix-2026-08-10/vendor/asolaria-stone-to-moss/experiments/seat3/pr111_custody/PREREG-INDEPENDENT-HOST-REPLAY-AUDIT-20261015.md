# Seat 3 prereg — PR111 physical-host source/output custody and replay falsifiers

**2026-10-15 · preregistration committed before the new Seat3 verifier and hosted experiment.** Scientific question: does Seat2's genuine OS-reported host-activity evidence survive an independently authenticated evidence-join and hostile self-consistent replacement? Do not discard genuine observed host counters or misclassify actual electronic computing as unreal.

## Preserved evidence and fixed independent source

- [Seat2 draft PR #111](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/111), frozen head `8e597ae4c8d5d1ff76a2d25ad394ec49e601afc4`. Source frozen `main` `5d3e3a1147ad7af84c1b5b1ba482dfddd9832c86`, exact 701-byte HBP `stones/2026-10-15-rainbow81/seat4-round5-signed-spectrum-mapping-20261015.hbp`, SHA256 `077bf98dc7c10e3125ce1147270cc927ce978ab63a19ec30e4655267f1770400`. HBP references bank SHA256 `52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345`; this experiment hashes the **HBP** and a source-derived payload, not the underlying 184,815-byte memory bank. Do not inflate metadata-reference bytes into physical bank reads.
- [Final Seat2 CI run #38777263894](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38777263894) 5/5 PASS, four artifacts `seat2-r9-{ubuntu-latest,windows-latest}-py{3.11,3.13}`; deterministic workload SHA256 `ae3474a94a03e024ad41bd6d0c508a18cbb3ed43c551da0ed3c6ec701e5b61cf`. Actual final-host source packet `producing_git_sha=5969b7de9ada80e8feaa18b497c1932c009d90db`, **pull_request workflow merge ref**, distinct from PR head; cross-reference external workflow logs before interpreting identity. Run started ~2026-10-15T17:25:50Z and completed by 17:27:37Z; use fixed `2026-10-15T17:25:00Z` to `17:28:30Z` as permissive UTC bounds only for this historical run. A GitHub job name and SHA are still not independent trusted hardware attestation.
- Seat3 prior [PR #116](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/116) runs OS counters in separate source-checked workload. No changes to that source, original LIRIS SH receipt, or historical operator-reported completed photon-memory experiment.

## Independent positive test (predeclared)

Download original *unmodified* four Seat2 run-38777263894 archives via GitHub Actions artifact service. Download PR111 source from frozen revision for adversarial direct execution **without changing original Seat2 code**. Assert all four archives contain exactly the expected `digital.json`, `instrument-status.json`, `node-review.json`, `host-activity.json` plus SHA-256 sidecars. Parse and independently derive the SHA256 of 701-byte HBP, 2MiB tiled payload, and 256 chained (`payload||uint32_le(i)`) hash states. Require all four deterministic JSON files and all upstream Node reviews to be byte identical; separate genuine per-job host JSON and its source-linked SHA.

Independently bind each host packet against **outside evidence supplied by the GitHub artifacts and known run**: specific run-ID, original GITHUB_SHA merge-commit context, exact job output artifact name, OS/platform, Python major.minor, source data commit, positive CPU/wall/RSS counters, entire 24 MiB page-touched claim as *declaration* (not a physical hardware attestation), preserved UTC chronology from source logs, and OS monotonic interval consistency with UTC start/end (conservative ±2 seconds). Check same-source and semantics without inventing watts/photons. Deny `metered_*` fields absent original sensor captures, `optical_retention_measured` true, or claiming reporter-owned hashes as source authentication.

## Prospectively defined coherent tampering test

For each attack, make a copy of one authentic 4-bundle packet (not the original) and **recompute the .sha256 sidecar**. Re-run original frozen Seat2 `review_host_bridge.js` on the forged data and note whether it accepts, then independently run this new stricter referee. Expected vulnerabilities to test, not assumed results:

1. Change `github_run_id` to an unrelated decimal run ID and `producing_git_sha` to arbitrary 40-hex string (maintaining schema). Should be rejected when compared with externally pinned run metadata.
2. Swap the declared runner/platform OS, or replay another valid host's report under this artifact name while all SHA/checksums remain self-consistent.
3. Inflate `cpu_elapsed_ns` to 3.6e12 (1h CPU) and `wall_elapsed_ns` similarly without moving the original UTC timestamps. This is not corroborated by the independently preserved timing record.
4. Replace the underlying **701-byte HBP** itself, keeping derived source and self-owned hashes consistently replaced; source authenticating root must be an independent pin. Do not claim that a hash alone authenticates the original measurement.
5. Introduce a false externally metered electrical/optical value or missing sensor status; should already be rejected by upstream Node, and must be rejected here as well.

**Important scope:** these attacks are *synthetic manipulation of copied digital evidence*. If an honest CI run has valid authentic original packet, a permissive parser doesn't prove its true OS measurements were fake. The question is which claims can be authenticated from which independently anchored evidence. Even the strict checker is only a stronger **digital chain verifier**, not an unforgeable host-chassis measurement.

## Final acceptance

- Independent stdlib-only Python third verifier + independent Node source checker, 4 original downloaded artifacts with case-normalized static receipts, negative tests and integrity SHAs; Ubuntu/Windows × Python3.11/3.13, fifth GitHub Actions byte-equality of deterministic scientific result; preserve volatile per-platform timers and output artifacts.
- On an adverse case, report FAIL / HELD accurately; preserve first failed attempts and correction commits, avoid silent retuning.
- **Physical taxonomy** unchanged: real CPU/memory processes verified and OS counters are measured reports, calibrated electrical/optical/acoustic power/instrumentation absent in Seat2 CI, prior August photon-memory experiment *operator-reported completed*, independently corroborated original instrument capture still pending. LIRIS SH local reported history separate and not retracted.
- Keep Seat3 new PR DRAFT and PR111 DRAFT; seek Seat2, Seat1, Seat4 review. No merge/release/paid remote execution.
