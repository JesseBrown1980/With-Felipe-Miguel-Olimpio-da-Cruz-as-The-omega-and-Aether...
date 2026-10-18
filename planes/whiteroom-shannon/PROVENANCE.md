# planes/whiteroom-shannon: provenance

Every file under `vendor/` is upstream bytes. It is either a whole file copied with
`git cat-file blob <commit>:<path>`, so its `git hash-object` equals the upstream blob id, or an
exact line range of an upstream blob, named `<path>.lines-<a>-<b>` and equal to `sed -n '<a>,<b>p'`
of that blob. `UPSTREAM.sha256` pins the sha256 of all 9 files (`sha256sum -c UPSTREAM.sha256`).

On 2026-10-17 each upstream commit below was the remote `HEAD` (`git ls-remote`). All 9 files were
downloaded again from `raw.githubusercontent.com` at the full commit ids and compared: whole files by
blob id and bytes, ranges by the full file's blob id and then the range. All 9 were equal.

## Upstream commits

| short | repository (github.com/JesseBrown1980/…) | commit |
|---|---|---|
| SH | Shannon-and-the-gnns-stage | 32f9670a648dbbd02d64524e91150efeec8e4d2c |
| BP | bigpickle-rebuild | c592599c8f3d000b07cd5f4218b7d6b24d49d7d5 |
| B256 | asolaria-behcs-256 | 818cc235a6db815e3b2591339cf9b42aad3e85a0 |
| WR | asolaria-whiteroom-engine | 896518a9b9591cbd6ed73e0852cb976c6d3f1d25 (not copied here; see below) |
| FED | asolaria-federation-1024 | dc1da1a9cd88b77eb463053312b7c42a7dbe9b33 (not copied here; see below) |

## Vendored files (paths under `vendor/<repository>/`)

| repo | path | lines | blob (full file) | sha256 (of the vendored bytes) | bytes |
|---|---|---|---|---|---|
| SH | pipeline/hookwall.mjs | 1-44 | 5d300345cd81a60d7eb96498de2dd7504ab511e2 | 374e607c859381b5c6bee8f194ee500818e5f156d24ea5a31712dc42e463f45e | 1347 |
| SH | pipeline/hookwall.mjs | 46-97 | 5d300345cd81a60d7eb96498de2dd7504ab511e2 | e138343afb23b695c125459ff970c215660bef4c0d9c42dc4e36a0f1f0fb636a | 1674 |
| SH | pipeline/shannon-boot.mjs | 1-19 | 6ae92778c54db0289cde3ab92365cc5e4d1c6e33 | a393b991f11ba94731d09ce6974e43aa72e4ee2c53953ccfdfbebeb4f1e5553a | 1347 |
| SH | pipeline/shannon-boot.mjs | 21-117 | 6ae92778c54db0289cde3ab92365cc5e4d1c6e33 | 57b9f2738432ec62255f326ca1861b4a97e5c33479345b4fdf21e9c8b0ad138c | 4582 |
| SH | pipeline/shannon-boot.mjs | 119-154 | 6ae92778c54db0289cde3ab92365cc5e4d1c6e33 | ac2d095c60791ebbc77255214e0897bbab7cb8939e6c2386e56150856cccf01a | 1648 |
| SH | pipeline/shannon-boot.mjs | 156-178 | 6ae92778c54db0289cde3ab92365cc5e4d1c6e33 | 17373af76abaab1318619524ec188a4575a03b3c27079b62c0c72fad71f9fb94 | 1322 |
| BP | src/fabric-thinker-gnn.mjs | whole | 423bd2e60cf76e38e18b7a01370a0092d5dce0da | 85e60d07ecb141132c8f52b66668f0727c63cd0d6341a143e7d15b0b222c1cac | 9358 |
| BP | src/fabric-thinker.mjs | whole | 71dd564dbe983c523cfca10d69ad0da6fbecaebd | 79fb35c31c3d4199cdac76a04bb8ba7525fa2b734f4d2b79ea18e41fa153a272 | 7658 |
| B256 | src/gnn/hybrid-harness.js | whole | 14863cbf4d375c608172b01f97bb4d9396f44f5e | 01bc4e8cdc214fbb5f0b2a248d44b7086780bfc2784a923aee20f007baed639b | 2419 |

## Lines not copied (third-party data)

These lines are named in `scratchpad/universe/WIRING-MAP.md` under "Third-party data present". They are
not in `vendor/`, and their values appear nowhere in this directory (code, tests, fixtures or tools).

| file | line | what it holds | how the port takes it |
|---|---|---|---|
| SH pipeline/hookwall.mjs | 45 | the `authority` object `grantLive` puts in the grant envelope | `EnvelopeIn::quintuple_authority` marks the grant; the operator's `QuantBus` (`enrichEnvelope`) supplies the content |
| SH pipeline/shannon-boot.mjs | 20 | a comment line (AUTHORITY) | not needed by any function |
| SH pipeline/shannon-boot.mjs | 118 | the self-test `approvedBy` value | `ShannonGate::self_test(.., approved_by)`, operator-supplied; the fixtures use the stand-in `OPERATOR-SUPPLIED-APPROVER` |
| SH pipeline/shannon-boot.mjs | 155 | the row's `cosign=` value | `fixture_restored_row(.., cosign)` / `emit_fixture_restored(.., cosign)`, operator-supplied; the fixtures use the stand-in `OPERATOR-SUPPLIED-COSIGN` |

The privacy scan of the 9 vendored files looked for e-mail addresses, IP addresses other than
127.0.0.1, phone-number shapes, user-directory paths, key, token and password words, and the names
withheld from the lines above. It found:
- `fabric-thinker.mjs:23,26`: the path `C:/Users/acer/...`. This is the owner's ACER seat. It is
  owner-local, not third-party.
- `shannon-boot.mjs:161`: `secret_surface_export=0`. This is a row field name.

Two judgement items are recorded for the orchestrator:
- The shannon-boot extracts contain the lineage identifier `DAN-HOOKS` / `Dan-Hooks`, at lines 4-8
  (header comments) and line 150. Line 150 is the row's `antecedents=` value, so it is part of the
  `row_hash` pre-image. SH README.md:32 uses the same identifier. WIRING-MAP flags the lineage headers
  of four other Shannon-stage files, gnn-feeder.mjs and its siblings, whose line 2 names a person. It
  does not flag these lines. The identifier is kept here; no personal name beyond it is copied.
  Owner decision, 2026-10-18 (asked whether to publish as-is or to treat the identifier as
  third-party data): "Publish as-is". The vendored lines and the line-150 constant stay unchanged.
- `supervisor=nereus-cp76` (shannon-boot.mjs:143) is an agent identifier in the owner's system.

## Used in place from sibling aether directories, not copied

| what | where in aether | upstream | blob |
|---|---|---|---|
| white-room engine, `DeterministicScorer`, `geniusScore`, seal row, `Scorer` / `Store` / `Emitter`, `to_fixed6` | `quants/cubes` (`quant_cubes::whiteroom`), path dependency | WR liris-whiteroom-engine.mjs | 8bf9fa4a5cd56cb65989f792c01cc931e69f8726 (cubes vendors lines 1-188 and 190-200) |
| `deriveCubeAddress` over the pre-image, `CUBE_LAYERS`, `CUBE_AXIS` | `quants/cubes` (`quant_cubes::consumer`) | SH pipeline/whiteroom-consumer-index.mjs | e572da9340478af77b9ced7ebdd274ad5b130f09 (whole file at `quants/cubes/vendor/Shannon-and-the-gnns-stage/pipeline/`) |
| `hilbertEncode` | `model/hrm-mtp` (`hrm_mtp::hilbert::hilbert_encode`), path dependency | BP src/hilbert.mjs | 1a22e1b6b07d80dd9637cc2f50079d1fe471e46e (`model/hrm-mtp/vendor/bigpickle-rebuild/src/hilbert.mjs`) |
| L0 EdgeLevelGNN forward (Q24), `jsnum::Dbl` | `model/l0-edge`, path dependency | B256 services/gnn-sidecar/inference_server.py, models/gnn_baseline.py | 3089da1d249f0eb76bb79e03a446714636474980, 510f78890ec94b113f0610afbade8bafe6ca20e0 (`model/l0-edge/vendor/gnn-sidecar/`) |
| `baseline_model.pt` (sha256 a09993369d31ca73345914812e5226b513f5fb9092f43e487a2eafc8c3b621f5) | read by `tools/l0_parity.py` in `model/l0-edge/vendor/gnn-sidecar/` (cold lane, torch) | trained L0 checkpoint | 26caf5216a4df3a43250e40e1dd421180ca3c901 |
| white-room STORE verdict `whiteroom_verdict` (lib.rs:402-418), per-mille | `host8/vendor/federation-1024/servers/gnn-oracle/src/lib.rs` (referenced, not linked) | FED servers/gnn-oracle/src/lib.rs | 41e4c109fbbec73a7d262f6998fcbc76d940e5d7 |

Neither `quants/cubes` nor `model/hrm-mtp` is committed yet; both are untracked in the aether working
tree. They must be committed before this crate builds from a clean checkout.

## Written here (not upstream)

`src/*.rs` are Rust ports. Each module cites the upstream lines it reproduces, and `src/jsvalue.rs`
models JavaScript values and the ECMA-262 operations those lines apply. `src/jsvalue/binary64.rs`
rounds an exact decimal to binary64 (ToNumber's rounding) and prints `Number::toString`, in
integers.

`tools/referee.py` is a stdlib, integer-only referee. It mirrors the upstream lines and writes
`tests/fixtures/*.hbp`, except `l0-torch.hbp`. Python float is replaced by exact `Fraction` values
with binary64 rounding done by integer division. A Python-float version of the referee existed
while it was written and was observed to write the same 7 fixtures; it is not kept, so that
observation cannot be re-checked from this tree (and `jsvalue.hbp` has since gained rows).

`tools/l0_parity.py` is the cold-lane torch measurement. It writes `tests/fixtures/l0-torch.hbp`.

`tests/*.rs`, `examples/whiteroom_smoke.rs`, `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`,
`README.md` and this file were also written here. `tests/common/mod.rs` carries the crate's one
lint allowance, `#![allow(dead_code)]`: each test target uses only some of its fixture readers.
