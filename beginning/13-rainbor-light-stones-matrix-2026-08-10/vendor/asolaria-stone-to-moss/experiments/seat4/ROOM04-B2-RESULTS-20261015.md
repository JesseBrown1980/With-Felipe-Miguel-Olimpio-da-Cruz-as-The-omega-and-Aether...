# Seat 4 / Room 04 — B2 source-anchored watcher and HALT: measured software result

**2026-10-15 · MEASURED_IS (software only) / NOT_MEASURED (physical, biological, independent source custody)**

Work order [#59](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/59) · Coordinator [#55](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/55) · Seat 4 draft [PR #63](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/63).

## Immutable experiment sequence

1. The B2 [preregistration](PREREG-ROOM04-PHOTOCYCLE-WATCHER-B2-20261015.md) was committed **before** B2 executable source, at `b88b1a8507b8c60e5fb6d1b0040ba1814b9ff4fd`.
2. The original Seat 1 PR #50 source checkout remains pinned to commit `dd5e47db9522141de3949a23759a5d647ecdafbd`, its known original Git blobs and exact byte SHA-256 `de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b`.
3. All actual negative injections and full tick calculations are implemented in [Seat 4 Python producer/anchored watcher](room04_adversarial_photocycle.py) and independently audited in [Seat 4 Node.js matrix-free tick replay](room04_independent_node_watcher.js). No original source/stone was edited.
4. The [source-complete offline verifier](room04_offline_verify.py) checks every SHA-256 entry, the original source Git blob hashes, re-executes both original Seat 1 producer languages, independently reruns the Seat 4 producer/Node watcher, and repeats the 40-case information-retention suite **without Git, internet or provider credentials**.

## Results from executed GitHub Actions

**[Final CI run 38728040503](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38728040503)**: **4/4 PASS** (Ubuntu + Windows, Python 3.11/3.13 and Node 22).

| Evidence | Actual result |
| --- | --- |
| Frozen source benchmark, four arms | 8,748/8,748 identical original snapshots |
| Independent synthetic site-tick state updates | 349,920/349,920 matched |
| Genuine 9x9 P6 RGB digital-frame checkpoints | 108/108 accepted |
| Attacks: 12 fault types × 108 checkpoints | **1,296/1,296 actually rejected** |
| Immutable digital PIDs and integer mass | 81 stable IDs, total mass exactly 1,000,000 per synthetic site |
| HALT after event 17 (separate bounded control) | 17 events accepted; **64 subsequent events rejected** |
| Simulated per-tick human prompts / external privilege grants | 0 / 0 |
| Preexisting GF(2) reversible-vs-lossy control suite | **40/40 PASS**, kept separate from photocycle dynamics |
| Cross-platform capsule contents | **29/29 files byte-identical** across downloaded Ubuntu/Windows jobs |
| Fully offline re-execution of the downloaded capsule | **PASS** |

The twelve exercised mutations are: changed framebuffer bytes, changed framebuffer checksum, swapped PID, wrong mass, altered light pulse, stale previous state, stale tick, stale symbolic nonce, mass-preserving wrong output, forged watcher digest, coherently forged report+watcher+frame, and external privilege request. Every planted false report is rejected against the watcher's **independently recomputed software source**, not merely rejected because two hashes differ.

## Exact reproducibility stones

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| Original source Phase A HBP | 611,999 | `de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b` |
| New full tick HBP | 34,876,953 | `2b9575a8d46c2d2f0842d590081641ed2b20daddccc7153107d76efa0d597277` |
| Actual negative-fault HBP | 115,829 | `ad471bc627451f65d6f26797ddf6c03546ac1f74ab8e3698d9825f1409f9bbb2` |
| [New Seat 4 JSON result stone](../../stones/2026-10-15-rainbow81/seat4-room04-b2-watchers.json) | 2,751 | `e63baf8accdfbca43bd23e02b8849fcf312ee904ea3a29e02ab9c11bd8b0dafd` |
| Original 40-case GF(2) rank table | existing | `f4a0f2f19eb72930035b92356f0b2099655ba2f0d5e4640a4c0a1df29209de78` |
| Entire offline bundle's `SHA256SUMS` manifest | 29 total files including manifest | `67c2f6cc8e89dcec533c258bc159cdd1de27cd9bd510fbedab793a6892270cb6` |

[Ubuntu capsule artifact #11969151007](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38728040503/artifacts/11969151007) · [Windows capsule artifact #11969046084](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38728040503/artifacts/11969046084). Both have 29 contents and exactly matching uncompressed bytes and manifest; the ZIP container SHA-256 need not match because packaging metadata/compression may differ.

**Offline replay:** extract either ZIP and run `python experiments/seat4/room04_offline_verify.py --bundle .`. Python 3.11+ and Node 22+ are required; no web access, Git checkout, token, signed identity or external permissions are necessary. The resulting CLI summary must say `"status":"PASS"`.

## Correction ledger — preserve negatives, don't silently overwrite

The first complete run passed full model/state parity, but comparison of downloaded Windows and Ubuntu files exposed CRLF formatting drift in platform-generated JSON receipts/audit logs, and subsequently in the SHA256SUMS manifest. Both are *serialization* differences, not mathematical drift. The B2 receipt was updated to force LF; audit logs are normalized before the manifest is sealed; the manifest is emitted with LF and SHA-verified. The **final** hosted run passes the stronger byte-exact and offline re-execution gates on all four jobs. Earlier artifact ZIPs and CI history remain available; no underlying Phase A receipt was changed.

## Explicit limits and peer-review request

The watcher has a fixed *digital* source reference. A coordinated false physical source and false watcher absent independent source custody still yields **PROVENANCE_HOLD**, not automatic authentication. A 9×9 P6 frame is **software memory**, not physical RGB photon flux, a photodetector, a biological neuron, calibrated ChR2 current, or an actual neural sensor. The bounded simulator requests no human prompt per synthetic tick; it does **not** acquire real-world consent or external privileges.

**Seat 2 peer is required** to challenge source provenance, coherent forgeries, stale signals, copied source, hidden common-mode dependencies and the HALT boundary. Seat 3's proposed four-state biological kinetic comparison remains a **different** model/experiment. This draft does not authorize a merge, Hugging Face upload, or any physical/medical/quantum/FTL claim.
