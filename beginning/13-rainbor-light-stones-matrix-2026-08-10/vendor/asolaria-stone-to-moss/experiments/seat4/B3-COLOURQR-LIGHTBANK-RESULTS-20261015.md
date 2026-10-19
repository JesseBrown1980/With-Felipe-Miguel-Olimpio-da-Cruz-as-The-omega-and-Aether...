# Seat 4 / B3 — 27-stick Colour QR light-bank memory: first measured software results

**2026-10-15 · Digital memory, source integrity and exact mathematics. Physical photon storage NOT MEASURED.**

Parent dependency: [Room04 B2 draft #63](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/63). New stacked [B3 draft #68](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/68). Coordinator [#55](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/55), Seat4 [#59](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/59), Seat2 independent provenance review [#57](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/57). The [B3 preregistration](PREREG-B3-COLOURQR-LIGHTBANK-20261015.md) was committed first at `d820daf80075d61e55313da2d05ba047d8766820`.

## Historical source actually reused

**The Colour QR** ([August 6 repository](https://github.com/JesseBrown1980/the-colour-qr/blob/1938a9b076b8fc3e81d0a271ca05e84a0e938854/README.md)) states: 2,100-byte body; four-byte little-endian indexed prefix; Base64; three independently decodable standard QR payloads in separate RGB planes, address-independent readback, SHA-256 restoration.

**The law of space/light/colour** ([August source](https://github.com/JesseBrown1980/the-law-of-space-and-light-and-color-and-travel-at-the-speed-of-one/blob/1b2dd747bccee378b94790bc4ad367bdbf7e5bf8/README.md)) supplies the **exact rational** 3×3 projector `I−J/3`, with diagonal 2/3 and off-diagonal −1/3. For an 8-bit RGB triple, `(0,0,0)` and `(1,1,1)` have the same projected state: retaining a separate common-mode/ground anchor is necessary to reconstruct every possible source. One independent 8-bit red coordinate is sufficient. The source's speculative light-speed interpretations are *not* demonstrated by this mathematical test.

**RAINBOR** ([August 8 source](https://github.com/JesseBrown1980/RAINBOR/blob/56de9ee137f204452d7dff41f7b1e953b6ff5c3e/README.md)) calls its physical optical stack a design conjecture, not an experimental optical bank. **GitRAM** ([source](https://github.com/JesseBrown1980/GitRAM/blob/e01425204b58dc680d1f3106410ff9ce71260b0d/README.md)) supplies a real software artifact/checkpoint memory-bus precedent.

B3 executes the **QR byte/index/Base64 payload protocol**, but does not rasterize ordinary QR symbols or independently scan the composite RGB picture. A simulated RGB lane is not a physical photon, and a SHA-256 match is not physical-source authentication.

## Frozen source, original scientific work intact

| Frozen B2 source object | Exact bytes | Original SHA-256 |
| --- | ---: | --- |
| 349,920-site-tick synthetic Room04 B2 trace | 34,876,953 | `2b9575a8d46c2d2f0842d590081641ed2b20daddccc7153107d76efa0d597277` |
| Original frozen Seat1 8,748-snapshot benchmark | 611,999 | `de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b` |
| Actual B2 1,296-rejection fault ledger | 115,829 | `ad471bc627451f65d6f26797ddf6c03546ac1f74ab8e3698d9825f1409f9bbb2` |
| Signed-off B2 digital result (not a hardware signature) | 2,751 | `e63baf8accdfbca43bd23e02b8849fcf312ee904ea3a29e02ab9c11bd8b0dafd` |

These files are reproduced in each GitHub Actions job, not fetched from an unverified user-controlled remote memory stick. The four inputs total **35,607,532 bytes**. They are packaged into an explicit length/offset/SHA-delimited archive (**35,608,276 bytes**, SHA-256 `2f3a0b27a50a562205a500dd7e38e4318f658cdd05202a4b88312c812ae7ba30`).

## Measured result of the first full-size Python + independently implemented Node.js run

- **16,957** exact indexed Base64-payload QR chunks, mapped to **5,653** RGB frames, stored in **27 virtual data bank files** plus a dedicated **28th whole-bank XOR parity file**. Source body/order/SHA restored exactly in original and reverse frame read order.
- One **additional nonstandard fourth XOR channel**, computed as `R XOR G XOR B` over each fixed-size indexed lane record, reconstructs **5,653/5,653** separately erased simulated RGB planes. This fourth channel is a *new B3 code* and is not part of the original ordinary Colour QR contract.
- A single **completely missing** simulated data-bank file can be reconstructed from 26 other bank files + the additional parity-bank file; a different bank with a deliberately flipped source bit is rejected by its pinned SHA and then recovered identically.
- **Two missing entire banks** and **two missing RGB planes** are both **HELD_INSUFFICIENT_EQUATIONS**. Active fail-closed recovery functions reject these states, rather than inventing a unique history. A forged QR address is rejected even if the attacker recomputes a *self-consistent* fourth-plane parity.
- **6,561** actual three-channel source-byte samples reconstruct exactly from the rational projector numerators plus a separate 8-bit ground coordinate. Without that coordinate, equal-mode inputs collide. The exact 81-bit prior GF2 rank/nullspace theorem is **separate**: another **648** actual 81-bit source windows round-trip through selected rank 79, 80 or 81 maps with the minimum required 2, 1 or 0 extra input bits.
- The prior **40/40** independent GF(2) proof and B2 349,920-transition / 1,296-negative / HALT controls remain distinct, pinned and unchanged.
- All 31 bank/source/result local SHA-256 entries (27 data-bank files + whole-bank parity + typed source archive + metadata catalog + execution result) are verified by both language implementations.

**Measured receipt:** [B3 JSON stone](../../stones/2026-10-15-rainbow81/seat4-b3-colourqr-27-lightbank.json), SHA256 `0b9b9a36272c364a55e706ecb125e9b3aa93710b5be23daec0deb9cd90fed4cb` (append-only and byte-identical to generated B3-RESULT.json).

**Manifest:** digital bank checksum catalog `a87d27bce1924f3fc4340a337706bf1365cb38919feee71e759f594c3549ced7`, bank SHA256SUMS `893f1f62d317e68d9aa8f5404cd157d3660cca28c485473c5bbfdc7319a0e3c5`. Every valid reader must reject a stale or modified catalog compared to the independently pinned manifest hash.

## CI and append-only correction ledger

- First full Python-run CI: [run #38733513005](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38733513005) **FAILED** in the independent Node reader on JavaScript **`-0` versus `0`** under `assert.strictEqual` for a zero remainder. The projector and Python source recovery were mathematically unchanged; repair `b77427d` validates divisibility with `=== 0`. This failure stays public.
- [Run #38733826672](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38733826672) **4/4 PASS**, Ubuntu/Windows Python 3.11/3.13 with Node.js 22. Its downloaded banks, archive, result JSON, Node reader output and SHA256SUMS matched byte-for-byte; four redirected Windows Python audit logs differed only by CRLF.
- Added canonical LF normalization for all audit JSON outputs and a **new 37-file cross-platform checksum manifest**, with SHA256 pinning of the archive, catalog, parity bank, project-level result receipt and independent Node reader output. Added actual two-plane HALT, attack that recalculates parity after forging a chunk address, and active stale-manifest rejection in both readers. Final workflow run is required to pass all new gates; **do not treat a queued final run as certified**.

## Reproduce

From the stacked PR branch (parent PR63 sources present):

```sh
# First re-create the exact four B2 source files with
# experiments/seat4/room04_adversarial_photocycle.py.
python experiments/seat4/colourqr_lightbank_b3.py --source-dir /path/to/B2-source --out /path/to/banks
node experiments/seat4/colourqr_lightbank_b3_node.js /path/to/B2-source /path/to/banks
python experiments/seat4/colourqr_lightbank_b3.py --verify-only --source-dir /path/to/B2-source --out /path/to/banks
```

Use the [B3 Github Actions workflow](../../.github/workflows/seat4-b3-lightbank-27-sticks.yml) for the complete reproducible four-platform replay and downloadable full-size, hashed memory-bank artifacts. No paid Hugging Face jobs, credentials, external device control or automatic merges.

**Scientific boundary:** 27 simulated bank files are not independently powered physical sticks. The experiment does not store physical photons, create a novel quantum memory, measure the speed of light, control living neurons or demonstrate zero-latency communication. It demonstrates deterministic software preservation, erasure reconstruction, explicit loss boundaries and a necessary/sufficient common-mode recovery coordinate for specified data maps only.
