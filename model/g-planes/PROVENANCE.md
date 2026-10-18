# model/g-planes provenance

This crate is a Rust port. It vendors no upstream bytes. `tools/g_planes_referee.py --upstream <fnns clone>`
checks the sha256 of the three mirrored plane files below.

## Upstream sources

| repo @ commit | path | git blob | sha256 | used for |
|---|---|---|---|---|
| Asolaria-fnns-trained-and-reverse-gnns-many @ c4b2458c88358c46155d3b308c594f9991720847 | src/planes/glsm.mjs | 9006f5cca08fab56c906bb67237e17974090cfe8 | 45b6f984bfb9e2cc2e792cfbbede0dea9e90e6571c54d2d966d5850af23c848e | ported (`transition`) |
| same | src/planes/gnn-edge-mining.mjs | 482c6a9ebd21935ee2585820a97ecae57b42b4b8 | 44a72b29c39677867d11c9d1bea9877d22444a7e30ed4102fc32e20b78f2addd | ported (`popcount16`) |
| same | src/planes/gnn-forward-genius.mjs | 0b1673c52048c4c7212e8e9a0e2cabb33429b1bb | 4127bd1126a1709bf8897c7742dd4964f1bcc9ed65036c7683b934b95c24b4ee | ported (`hexHamming`, `popcount`, `scoreEnvelope`, `pathPid`) |
| same | src/planes/gnn.mjs | 3d0e6f27c10085c5e102664befa492305128f467 | fc812edad13f42f387a32d230ce2577de2b1b5129d14d6c3f9278f52cddc2287 | read; not ported (see below) |
| bigpickle-rebuild @ c592599c8f3d000b07cd5f4218b7d6b24d49d7d5 | src/asolaria-score.mjs | b101c0989de3af0ca41db0eac1293c758d7e5296 | aee9c38328e75bc71f6e17a288637ddd1dbc4633576006dce9bc50c898093530 | consumer of g1..g4 (:36-70, :131-138, :176) |
| same | src/fischer-kernel.mjs | 72ab2e6a3015eefed8f68b7091dd126f716a163e | 383c1b2d9811c3ed49f9118e35814efefa14845ce8f6fde31c706a27a9183715 | `GLSM_CPL_MOD` (:68-75), `g4_state` default (:253, :313) |

gnn-edge-mining.mjs, gnn-forward-genius.mjs, gnn.mjs and asolaria-score.mjs have the same blob ids in
Shannon-and-the-gnns-stage @ 32f9670a648dbbd02d64524e91150efeec8e4d2c `pipeline/`. glsm.mjs is not in that copy.

## Ported items

| Rust | upstream |
|---|---|
| `Latent`, `Latent::as_str`, `Latent::from_g4_state` | glsm.mjs:31-37 `LATENT_STATES`; :55 maps any other `prev_state` to "DESCRIBED" |
| `TAU_PATH`, `TAU_GAIN` (binary64 0.5) | glsm.mjs:40-41 |
| `transition` | glsm.mjs:48-50 `isFiniteNum`, :53-76 `transition` |
| `popcount_bits` | gnn-edge-mining.mjs:30-35 `popcount16`; gnn-forward-genius.mjs:47-53 `popcount` |
| `hex_hamming`, `HexHamming::value` | gnn-forward-genius.mjs:30-45 `hexHamming` |
| `score_envelope` | gnn-forward-genius.mjs:57-62 `scoreEnvelope` |
| `path_pid` | gnn-forward-genius.mjs:65-68 `pathPid` |

Numbers: a JavaScript number is held exactly, either as its binary64 bit pattern (`JsNumber`, signed, including
-0, subnormals, the infinities and NaN) or as `l0_edge::jsnum::Dbl` (non-negative, normal). `transition` compares
the bit patterns through an integer total order. The other functions round each JavaScript operation once to
binary64 through `Dbl`. Domains: `path_pid` covers rooms within +-`Number.MAX_SAFE_INTEGER` and returns
`None` outside it. `hex_hamming` takes `&str`, which cannot hold a lone UTF-16 surrogate.

Referee: `tools/g_planes_referee.py` (stdlib, integer arithmetic only, exact rationals rounded once per JS
operation) writes `tests/fixtures/g-planes-referee.hbp`. `tests/referee.rs` runs every row through the Rust
functions. The fixture also checks the selfTest walk at glsm.mjs:148-159.

## Not ported, with where the code was registered

The owner's registration file is on the private mirror branch `acer/formula-corpus-pid-registration-2026-06-19`
@ fe6b629baddbdf54d7cf6901cbf68df8a55d0493, `ALGORITHMS-PID-REGISTRATION-WAVE2-ACER-2026-06-19.hbp` (blob
66f8caa5a72d73f3688fb07b1291983b9fe41871). That commit is not an ancestor of the mirror's a876e21. The paths below
are the paths it registers on the acer machine. When this file was written (2026-10-17), no file with these
names was in the clones on this container or in the private mirror's history.

Searched again on 2026-10-18. No path named `gnn-reverse-gain.mjs`, `omniquant.mjs`, `quant-bus.mjs` or
`bpi-codec.mjs` is in the history of the 186 repository clones under `scratchpad/census/src` or in the 132 refs
of the private mirror. Files named `omniquant.mjs`, `quant-bus.mjs` and `bpi-codec.mjs` arrived from the owner
on 2026-10-18 (OWNER-RULES 7j) as an extract, not from a committed ref. They are vendored byte-identical at
`planes/gnn-trio/vendor/revolver-10k/src/` (blobs 5852c36b…, c420b046… and a42fb071…), and `planes/gnn-trio/src/`
ports them to integer Rust. This crate does not use them, and it is not established here that they are the
versions the registration's line ranges describe. The G3 file `gnn-reverse-gain.mjs` (sha256 0e381f92…,
`planes/gnn-trio/PROVENANCE.md`) is held by the owner under OWNER-RULES 7j, and its MASK_GLYPHS set is not
published. `planes/gnn-trio` reimplements the G3 algorithm and tests it against a synthetic set.

- **G3 reverse-gain plane.** fnns README.md:109 reads "G3 source is withheld due to PII." README.md:27 lists
  "G3 reverse-gain | deception inversion (sign × jlMagnitude) | in-process :4949". README.md:70-72 lists its
  output as `{reverseRisk, promoted, mark: GENIUS|MISTAKE}`. The registration places it at
  `packages\revolver-10k\src\planes\gnn-reverse-gain.mjs:40-59`, as "mineReverseGain (JL-magnitude * sign)"
  (line 820) and "GNN reverse-gain mask-flip scorer" (line 27). asolaria-score.mjs:10 describes signal (e) as
  "G3 gnn-reverse-gain — deception inversion sign×jlMagnitude (in-process :4949)". The `g3` value is one input to
  the composite (:136, :156). glsm.mjs:68 tests `reverse_gain < 0`, so that input is signed.
- **asolaria-score.mjs:103-108 `reverseGain`** is the gate the ensemble applies to the composite (:166). It is not
  G3 and is not in this crate. Its port is `gate/observed/src/score.rs` `reverse_gain` (lines 93-103).
- **omniquant.mjs** (`quantMetadata`, `packQuantPacket`, `quantTag`, `vectorFromEnvelope`; imported at
  gnn-edge-mining.mjs:23, gnn-forward-genius.mjs:20, gnn.mjs:7, Shannon pipeline/gnn-feeder.mjs:12) is
  registered at `packages\revolver-10k\src\omniquant.mjs:22-61` as "omniquant triple/polar/turbo/JL adapter"
  (line 30).
- **quant-bus.mjs** (`enrichEnvelope`, `AUTHORITY_FIELDS`) is registered at
  `packages\revolver-10k\src\quant-bus.mjs:160-206` as "quant-bus G1/G2/G3/G4 composition", KIND=gnn-trio-bus
  (line 824).
- **bpi-codec.mjs** (`encodeFrame`): the registration names `packages\revolver-10k\src\bpi-codec.mjs:25-72` for
  "hilbertAddress (6-glyph base-1024)" (line 269). No registration line names `encodeFrame`.
- **The :4949 `/api/gnn/score` handler** (asolaria-score.mjs:36-70 queries it): no file for it is in the clones
  on this container or in the private mirror (searched 2026-10-17). OWNER-RULES 4a records that the live request
  returns 404 and that no route is registered for it.
- **G1 `mineEdge`** (gnn-edge-mining.mjs:66-98) and **G2 `mineForward`** (gnn-forward-genius.mjs:70-127) need
  `enrichEnvelope`, `AUTHORITY_FIELDS` and `quantMetadata`. Registrations: lines 821 and 822. **G4 `glsmEmit`**
  (glsm.mjs:80-126) needs `enrichEnvelope` and `encodeFrame`.
- **gnn.mjs `gnnScore` / `gnnLearn`** (gnn.mjs:16-43) are registered at line 819 as "gnnScore EWMA routing
  weight". They are self-contained, but this pass does not port them. They hold the conductor bus's per-edge
  routing weights, "Called by bus.emit() after each dispatch" (gnn.mjs:31-32), and they are not among the g1..g4
  values the :4949 response carries. An exact port also needs binary64 subnormal results: under zero rewards
  the EWMA is multiplied by 0.7 on each update (gnn.mjs:41), and `Dbl` leaves subnormals outside its domain
  (l0-edge/src/jsnum.rs:9-11). `gnnEmit` (gnn.mjs:53-82) needs omniquant, quant-bus and bpi-codec.
- **converter.mjs `reverseGainGnnScore`** (asolaria-behcs-256 packages/stage-to-actual-converter/src/converter.mjs:70-84,
  blob 698f9c2a4c6d6fc92dcaad2e0e69aa99fb3f9ecc; registration line 818, CLASS=reverse-gain-mask-flip) is a
  separate on-disk reverse-gain variant that belongs to the stage-to-actual converter. It is not the :4949 G3.
- **47D deep-wave reverse-gain GNN**: excluded under the privacy rule. fnns README.md:73-74 reads "47D
  reverse-gain GNN — deep-wave 47-dimension variant. Source is withheld because it embeds real adversary
  identifiers; mechanism only is published." The on-disk script
  (asolaria-behcs-256 packages/deep-wave/scripts/run-47d-reverse-gain-gnn.mjs) and the mirror's recorded run
  output contain third-party personal data. They are not vendored, ported or quoted.

## g4_state on the running system

g4_state depends on the GLSM module's prior state `_current` (glsm.mjs:43, :86-87) and on the three antecedent row
ids (:83-85), as well as on g1..g3. Against the on-disk system, `queryFabricGNN` resolves all four of g1..g4 to null
(asolaria-score.mjs:61-67), so `score()` returns `g4_state: null` (:176). fischer-kernel.mjs then reads it as
'UNKNOWN' (:253, :313).

`gate/verdict` `KNOWN_G4_STATES` (gate/verdict/src/lib.rs:83-89) lists UNKNOWN, EDGE_MINED, PATH_FOUND, CONVERGED
and MISTAKE_FLAGGED. It does not list DESCRIBED, the GLSM initial state, and :137-139 blocks any other string.
fischer-kernel.mjs:69-70 weights DESCRIBED 0, with the comment "neutral — just started".
