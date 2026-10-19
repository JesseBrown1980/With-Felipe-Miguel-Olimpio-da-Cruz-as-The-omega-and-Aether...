# Preregistration — four-seat nested live mathematical verification

**Registered before the nested runner code and results.** Computational test on real cloud CPU processes. No claim of distinct physical host hardware, unobservable persistent agent identity, neural-network training, photon transfer or physical entanglement.

## Core question
Can four separately scheduled seat workloads each maintain three simultaneously live process levels that verify an identical *class of mathematical laws*, with a parent GF(2) column-matrix evolution running while an independent Node.js polynomial child evaluates the same states and a Python referee grandchild checks metamorphic relations **within the ongoing wave**?

## Frozen public input
- Pinned public Seat 1 triad challenge: `experiments/seat1/TRIAD-27-CHALLENGE-20261014.json` SHA-256 `e02346f41a43ecf6f772a16cb585b4c214a01b9513f1f34f2c9ba1ad52f5773b`.
- Four seat labels `seat-1`, `seat-2`, `seat-3`, `seat-4`, each with distinct deterministic seeds: `SHA256(ASCII "ASOLARIA|NESTED|V1|" + original_nonce + "|" + seat + "|" + wave + "|" + body)` truncated to 81 bits, XOR the basis at body.
- 27 waves, 81 source bodies, five periodic 81-bit GF(2) laws: [0,1], [0,2], [0,1,3], [0,4,7], [0,1,5,9]; horizons `10^13`, `10^13+1`, `10^13+81`.
- All seat runs independently use the same *input definition* with disjoint seat label domains. No secret material or previous private commitment salt is used.

## Three nested process levels per seat
1. Parent: Python 81-column GF(2) matrix exponentiation; streams each wave request to an already-live Node.js subprocess, then independently calculates that wave.
2. Child: Node.js cyclic polynomial exponentiation; holds a running Python referee grandchild; calculates the same full wave, submitting 81×5 successor examples to the grandchild **before sending results to the parent**.
3. Grandchild: Python independently applies a direct one-step bitwise law to each evolved T state, asserts equality to the T+1 state and verifies negative tamper input; returns a digest of its checked batch. Child cannot approve its own unchecked results. Parent compares *all* per-wave full-state SHA-256 digests and counters before accepting.

Each process emits its own `start_ns/end_ns` for the mathematical work, runtime versions and PID/pseudonymous run ID; parent checks process lifetimes overlap, and calculates any actual math-interval overlap instead of inventing it. Process timestamps are same-runner wall-clock times, NOT separate-device clock calibration.

## Exact output and pass gates
- Four independent GitHub Actions matrix jobs `seat-1` through `seat-4`. Workflow `max-parallel: 4`; record actual execution start/end to determine which jobs overlapped instead of assuming concurrency.
- Every seat: 27 × 81 × 5 × 3 = **32,805 parent records** and **32,805 child records**; SHA-256 full canonical record stream identical per seat. Parent also checks 27 matching per-wave SHA digests and total digest.
- Every seat: 27 × 81 × 5 = **10,935 grandchild T→T+1 direct successor checks**; any incorrect test vector must be rejected.
- Every seat: 27 independent grandchild receipts; deliberately tampering an additional referee test must return rejection rather than PASS.
- At each level verify the law tap ordering, nonce, wave ID, seat ID and full result-count; no silently skipped checks.
- At least two independently authored methods at the same mathematical layer (matrix and polynomial); grandchild direct step is a third, narrower method.
- An aggregator job downloads all four JSON/HBP artifacts, checks all four seat identities and counts, verifies SHA256 of their archived HBP bytes, and reports whether the four seat wall-clock computation windows really overlapped (do not force this conclusion).
- GitHub hosted CI evidence is *real compute on server infrastructure*. It does **not independently attest four distinct physical chassis**, nor imply separately persistent GPT identities or actual neural networks. Nesting is a *computational hierarchy* analogous to nested verification, not itself a neural network.

## Negative and failure controls
- Corrupt a T+1 sample and require grandchild rejection.
- Corrupt a child per-wave digest and require parent rejection.
- Modify the frozen law list or original challenge SHA and reject execution.
- Preserve unexpected differences and failed attempts in GitHub history, never edit historical stones to fake agreement.
- No authenticated source provenance is inferred merely from invertibility. This experiment does not replace the outstanding Seat 2 signed-byte issue, three-physical-host protocol, or Hugging Face download-verification gate.
