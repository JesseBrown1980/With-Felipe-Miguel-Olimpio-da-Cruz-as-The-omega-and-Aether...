# Executable integration contract — N-Nest × Q-PRISM × Stone-to-Moss

Status: **PROPOSED / NOT YET RUN END-TO-END** (do not rename this as a test result).

Source-of-truth refs and Git blob identities: [UPSTREAM-PINS.json](UPSTREAM-PINS.json). Source pins are *not* evidence that upstream code ran. Git blob SHA-1 and output SHA-256 are different checksums.

## First experiments in order

1. Clone N-Nest and Q-PRISM at the immutable **commit** refs in the JSON manifest, not the moving default branches. Check every required source file against its Git blob SHA before running.
2. On a separately pinned checkout of N-Nest run `node nest-depth3-verify.cjs` and `node nest-depthN-prime-verify.cjs`. Verify: clean apex green, planted fault held, and level-specific detection (including prime depth 7). Both scripts write timestamped local HBP output: record generated output SHA *per run*, and do not pretend there is an immutable precomputed SHA for timestamped output.
3. On the pinned Q-PRISM checkout install the declared Python dependencies and run `python -m pytest tests/ -q` plus bounded direct control-proposal calls using **the actual** `qprism.sources.OptimizerSource`, `qprism.sources.PrismSource`, `qprism.sources.NeuralStream`, `qprism.behcs.schedule_id`, and the score path `qprism.physics.observe`. Report versions, seeds, budget and all scores. Its synthetic `coupling>0` is an injected oracle; run and report `coupling=0` negative control rather than cherry-picking a success. Different statistical runs may give different p-values; do not hardcode a desired advantage.
4. Wire the **actual** Q-PRISM proposal/schedule/score output as the N-Nest verifier's leaf evidence (not merely two unrelated subprocesses). Its watcher must reconstruct/recompute the same input-derived observation and source provenance without trusting the leaf's reported score. Parent `green = own_gate && AND(children.green)`. Hold at apex on any mismatched leaf, altered source, wrong selector, corrupt receipt, broken consent, or unknown information. Record the exact failing address/path.
5. Append a deterministic, versioned Stone-to-Moss receipt in `stones/2026-10-15-integration/` with input+source hashes, solver versions, output digest, all negative controls, held/fail counts and separate SHA256 sidecar. A fresh independent seat replays from pinned checkout with independently authored verifier before any 'integrated' verdict.

## Non-negotiable distinctions

- `N-Nest source verifier PASS` alone **does not** prove Q-PRISM values are watched.
- `Q-PRISM tests PASS` alone **does not** prove nested-watcher gating.
- A second run of the **same program** is repeatability, not a separately implemented verifier.
- Jointly sufficient GF(2) observations do not authenticate their physical origin; test substituted-source attacks. SHA-only provenance verifies bytes, not who produced them.
- Q-PRISM's Python simulation uses numerical packages/floating point; its separate Rust 1.81 crates require integer/ternary-only and `clippy -D warnings`. Do not falsely call the Python simulation an integer-only Rust implementation.
- DBBH Path 1 uses retained data; Path 2 requires sufficient shadow capacity, and a failed consent/re-projection gate must hold. Neither gives free information or FTL.
- Do not run on human neural data or real hardware; this round is synthetic simulation and software verification only.
- Preserve all historical challenge fixture/trace SHAs; this work is additive. Issue #10's physical-machine and HF-release gates remain open.

## Completion ledger

- [x] Coordinator inspected real upstream README, N-Nest verifiers and Q-PRISM harness, sources, addressing and claims gate.
- [x] Source commit and blob manifest staged in an independent coordinator branch.
- [ ] Upstream N-Nest execution with artifact receipts.
- [ ] Upstream Q-PRISM execution with preregistered null, optimizer baseline and detailed trace.
- [ ] Q-PRISM leaf verified within actual N-Nest ancestor chain; tampering held.
- [ ] Seat 2 mathematics/information budget peer audit.
- [ ] Seat 3 independent implementation replay.
- [ ] Seat 4 adversarial replay and CI; negative cases sealed.
- [ ] Full cross-OS workflow and review/merge.

Coordination: [Issue #29](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/29) and [Issue #1](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/1).
