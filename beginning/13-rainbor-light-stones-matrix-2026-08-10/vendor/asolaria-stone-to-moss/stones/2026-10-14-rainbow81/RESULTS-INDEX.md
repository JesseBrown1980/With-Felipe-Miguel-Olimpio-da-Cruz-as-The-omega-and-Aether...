# ASOLARIA — Rainbow81 Stone Index | 2026-10-14

## Seat 1 next challenge — 32,805 exact digital states

- [Post-preregistration software challenge](../../experiments/seat1/TRIAD-27-CHALLENGE-20261014.json) (SHA256 `e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b`): 27 **symbolic** time×color×space waves × 81 starting states × 5 GF(2) laws × 3 modeled horizons `T`, `T+1`, `T+81`.
- Independent Python column-matrix / Node cyclic-polynomial programs returned **32,805/32,805 byte-identical states** (6,392,029-byte HBP, SHA256 `720d0c44ede086c9ff3cccb807f4ba222145455c80614cdf3abcd710b93a11c3`).
- Per implementation: 32,805 bit-flip linearity, 10,935 one-step composition, 10,935 +81-step composition, 10,935 rotation and 120 explicit small-step reference controls. **Six deliberately invalid challenges rejected**, public nonce change alters output, and one-byte tamper changes SHA.
- [Full negative-control GitHub CI](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38652227818) **PASS on Windows and Ubuntu**; [PR #14 merged](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/14).
- [Append-only receipt HBP](seat-1-20261014-triad27-three-horizon.hbp) · [HBI](seat-1-20261014-triad27-three-horizon.hbi) · [JSON](seat-1-20261014-triad27-three-horizon.json), SHA-256 sidecars included.
- The challenge is **public software-only** and does not satisfy the blinded three-physical-host prerequisite. The time/color/space inputs are labels, not physical measurements.

## Four-seat computational release — integrated

This index retains the original stones. The **complete four-seat audit** is published at [publication/2026-10-14/REPORT.md](../../publication/2026-10-14/REPORT.md), with the machine-readable [completion matrix](../../publication/2026-10-14/STATUS.json) and [Linux/Windows release CI](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38644568103) (**both jobs PASS**).

| Computational seat | Repository integration | Scope |
| --- | --- | --- |
| Seat 1 | [PR #8 merged](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/8), [HBI](seat-1-20261014-computational-readiness.hbi) | **4,860** new-GF2-tap digital cases; signed ephemeral **software** identity, not a physical host |
| Seat 2 | [PR #9 merged](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/9), [HBP](seat-2-20261014-readiness.hbp) | **1,620 reported** same-host cases under historic CA laws; sidecar/changed-bit controls audited, original Ed25519 signed-byte format **still open** |
| Seat 3 | [PR #7 merged](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/7), [HBP](seat-3-20261014-local-preflight.hbp) | **4,860** new-GF2-tap digital cases; reports execution environment shared with Seat 2 |
| Seat 4 | [PR #5 merged](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/5), [signed-audit HBP](stone-seat4-public-precommit-audit-20261014.hbp) | **729** reproducible cases on *previously public* B challenge; computational observer, not fourth physical host |

**Software release: completed. Hugging Face remote upload: not confirmed. Three independently attested physical machines, new common challenge and physical experiments: not completed.** [Outstanding closure gates](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/10).



This is the stable public navigation point for the three-agent verification effort. Separate **observed checks**, **published sources**, **derived interpretations**, and **unverified hypotheses**.

## Verified program and receipts

| Deposit | Tested structure | Published evidence | CI verification |
| --- | --- | --- | --- |
| Stone 1 — hash-cascade baseline | 9 isolated mutations; 81 derived cells and 171 ring commitments each wave; five SHA-based register labels | [Baseline HBP](stone-hash-81-2026-10-14-baseline.hbp) · [HBI](stone-hash-81-2026-10-14-baseline.hbi) · [runnable Python](../../experiments/hash-cascade-81-2026-10-14.py) | [Successful CI 38578220972](https://github.com/JesseBrown1980/one-click/actions/runs/38578220972), Python 3.11 / 3.13 |
| Stone 2 — coordinate versus hash | 27 independent waves: nine source bodies × three coordinate scales; 81 identity hashes invariant under position-only scaling | [Spatial HBP](stone-81-spatial-hash-27-waves-2026-10-14.hbp) · [HBI](stone-81-spatial-hash-27-waves-2026-10-14.hbi) · [runnable Python](../../experiments/test_spatial_hash_27_waves_ci.py) | [Successful CI 38581376561](https://github.com/JesseBrown1980/one-click/actions/runs/38581376561), Python 3.11 / 3.13 |
| Stone 3 — independent verification | Separate CI receipt for Stone 2 | [CI HBP](stone-81-spatial-hash-27-waves-CI-2026-10-14.hbp) · [HBI](stone-81-spatial-hash-27-waves-CI-2026-10-14.hbi) | [Run 38581376561](https://github.com/JesseBrown1980/one-click/actions/runs/38581376561) |
| Additional fifth-feature stone (another active workstream) | Constructed nonlinear channel rejects 272/272 exact 50:50 pair aliases; 103,680 seeded bounded-noise tests | [HBP](stone-81-fifth-feature-2026-10-14.hbp) · [source](../../experiments/test_rainbow81_fifth_feature.py) | [Run 38584792419](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38584792419), both Python jobs PASS |
| Fifth-feature exhaustive bounded 50:50 control (another workstream) | 14,240 candidate comparisons, minimum fifth gap 64 vs maximum false-accept gap 48; zero accepted | [HBP](stone-81-fifth-feature-worstcase-2026-10-14.hbp) · [source](../../experiments/test_rainbow81_fifth_feature_worstcase.py) | [Run 38585712817](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38585712817), both jobs PASS |
| Seat-3 adversarial mixture waves | 411,480 weighted pair cases: 42,688 accepted blends; 85,320 triples: 748 accepted; bounded-noise feasibility 123,904 | [New HBP](stone-seat3-adversarial-mixtures-2026-10-14.hbp) · [HBI](stone-seat3-adversarial-mixtures-2026-10-14.hbi) · [JSON](rainbow81-adversarial-2026-10-14-results.json) · [preregistration](../../experiments/PREREG-fifth-feature-adversarial-waves-2026-10-14.md) | [Measurement CI 38585699927](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38585699927) + [seals CI 38586538385](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38586538385), both PASS |

The original stone files have SHA-256 sidecars in this directory. Do not overwrite old receipts; append a new stone for corrections and new measurements.

## What the measurements show

- **9 waves**: changing the shared source checksum and explicitly rebuilding derived commitments changed all 81 constructed cell hashes, all five labels per cell and 171 chained ring commitments. Changing a stored record without dependency recomputation did **not** make remote peer records change.
- **27 waves**: stable metadata identity across coordinate scalings 1×, 10⁶× and 10⁹×; a shared-root rebuild changed 81 derived records, while a no-shared-root control changed one.
- In a local nearest-neighbor ring, changed records numbered 1, 3, 5, 21, 79, 81 at logical rounds 0, 1, 2, 10, 39, 40. Full-fanout metadata changes all 81 **after** its synchronous update.
- The **same identity hash** was compatible with different assigned distances; the hash alone cannot recover physical distance in this fixture.
- All measurements are synthetic software tests; no real-GPU, light detector, brain coupling, gravity, faster-than-light transport or independently separated endpoints were measured.

See [evaluation](EVALUATION-2026-10-14.md) for precise limitations.

## Track the four computational participants

- [Three-seat collaboration protocol](../../tracking/THREE-SEAT-LEDGER.md)
- [Live activity snapshots](../../tracking/) (GitHub commit/branch/PR/workflow metadata; a shared GitHub author is **not** proof of a particular agent).
- Every agent should tag new measurements with a **unique seat ID**, input SHA, source commit, test command, output SHA-256, run classification, clock model, and independent CI run where available.

## Status of Hugging Face

The standalone repository `Jessedbrown/tests` was not found in the last verified Hub lookup; publishing this GitHub stone is **not** evidence that artifacts have been uploaded to Hugging Face. The existing `Jessedbrown/asolaria-wasm81-rainbow-audit` repo exists, but publication of the current stone receipts there is not established.

**Do not put access tokens or other credentials in public stones, code, logs, or issue comments.**
