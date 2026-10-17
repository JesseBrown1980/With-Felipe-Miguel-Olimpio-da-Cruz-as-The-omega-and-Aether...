# codec

The owner's DBBH -> DBWH codec, vendored unchanged, and a binary that runs it over every GGUF in
[`../gguf/`](../gguf/).

| Directory | What it is |
|---|---|
| [`dbbh-dbwh/`](dbbh-dbwh/) | `JesseBrown1980/holographic-wormhole-codec` @ `49012803778ef89b5b7c3915f582d027d4f1e096`, byte-identical: `src/lib.rs`, `Cargo.toml`, `README.md`, `LICENSE`, `rust-toolchain.toml`. It builds in place with its own `Cargo.toml`. Rust 1.81, zero dependencies, integer arithmetic only. |
| [`gguf-roundtrip/`](gguf-roundtrip/) | `asolaria-gguf-roundtrip`: runs the codec end to end on every GGUF in `gguf/MANIFEST.hbp` and prints HBP rows. Rust 1.81, depends only on the codec (by path). |

## The throat

The owner's throat is this codec. `qprism/recovery/throat/` (`asolaria-qprism-throat`) was written
fresh for this stack by Claude; it is not upstream code. Its code is kept unchanged as a secondary and
it is not the default path; its README and `Cargo.toml` description say so. The two share no code: the
codec projects 6-byte blocks onto four moduli near 2^25 and reconstructs by CRT from a subset of
them (two in this run, below); `qprism/recovery/throat/` selects between Path 1 and Path 2 of
`qprism/recovery/omega/`. `gguf-roundtrip` calls the codec. `cli/` calls neither throat at the time
of writing.

## What the codec computes

Line numbers are `dbbh-dbwh/src/lib.rs`.

- **Black mouth**, `black_hole_compress(object, sender, receiver, salt)` (261-278). The object is cut
  into 6-byte big-endian blocks, the last one zero-padded on the right (`blocks`, 107-120). Each block
  is reduced modulo each of the four pairwise-coprime `CYLINDERS` 33554467, 33554393, 33554213,
  33550609 (104), giving four residue streams (`project_shadows`, 139-149). The packet also carries
  the address `AGT-` + the first 16 hex digits of the object's SHA-256 (`agt`, 99-101), `orig_len`,
  `roof_bits` = floor(log2) of the product of all four moduli = 99 (`roof_bits`, 181-191),
  `residual_bits` = max(0, 48 - 99) = 0, and an IX-737 `SessionCapsule` whose nonce is the first 8
  bytes of SHA-256(sender ‖ receiver ‖ salt), sender armed (204-219).
- **Throat**: the `WormholePacket` (251-258) holds the shadows, AGT, `orig_len`, roof and residual
  accounting and the capsule. The object's bytes are not in it. `reconstruct` (150-179) reads only
  the shadows, the subset and `orig_len`; streams 0 and 1 alone reproduce the object (measured below).
- **White mouth**, `white_hole_emit(&pkt, subset)` (282-297): `Held(Collapsed)` if the capsule
  collapsed; `Held(NoConsent)` unless both sides armed and the capsule is neither collapsed nor used
  (228-230); CRT over the subset's moduli, block by block, until their product reaches 2^48
  (`reconstruct`, 150-179), else `Held(InsufficientRoof)`; `Held(AddressMismatch)` if the
  reconstruction's AGT differs from the packet's; otherwise `VerifiedClone(bytes)`.
- **Watcher**, `wormhole_traverse(object, recover_with, cross)` (302-320): calls `black_hole_compress`
  with sender `acer`, receiver `liris`, salt `salt`, arms the receiver, emits, then recomputes every
  `cross` cylinder's residues from the reconstruction and returns `Held(WatcherDisagreement)` if any
  differs from the packet's shadow.
- **Receipt**, `receipt_hbp(&pkt, &verdict, watchers)` (323-355): `WORMHOLE`, `CAPSULE` and one
  `WATCH` row per named watcher, `json=0`.
- The BEHCS nexus ladder and `NQPrismNexus` (357-550) are in the crate; the GGUF run does not use them.

The codec's 9 tests (553-711) cover the byte-identical clone, `InsufficientRoof` with one cylinder,
consent and collapse, a tampered shadow caught as `AddressMismatch`, the receipt rows, the nexus
ladder, `NQPrismNexus` and a SHA-256 known answer.

The codec's own boundary line (upstream `README.md`, "Honest boundary"; also `src/lib.rs` 16-17):

> `BOUNDARY`: **"clone" = classical representation copy** (no-cloning respected — not a physical quantum
> clone). Shannon caps the roof: `Held` when the shadows don't jointly carry `H(object)`. No physical
> wormhole, no FTL, no quantum-transport claim.

## Provenance

[`dbbh-dbwh/PROVENANCE.md`](dbbh-dbwh/PROVENANCE.md) lists the upstream commit, tree, path, Git blob
id, size and SHA-256 of every copied file; [`dbbh-dbwh/UPSTREAM.sha256`](dbbh-dbwh/UPSTREAM.sha256)
pins them. `src/lib.rs` has CRLF line endings upstream (blob `237c82a2…`); `dbbh-dbwh/.gitattributes`
marks the directory `-text` so Git keeps those bytes. Added in aether: `Cargo.lock`,
`UPSTREAM.sha256`, `PROVENANCE.md`, `.gitattributes`.

## Run

```sh
# The codec: the checks its own workflow runs (clippy -D warnings with no lint allowed, the f32/f64
# check, tests over all targets), plus the pinned sha256 and --locked
cd codec/dbbh-dbwh
sha256sum -c UPSTREAM.sha256
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
! grep -rnE '\bf(32|64)\b' src/
cargo +1.81.0 test --locked --all-targets

# The GGUF round trip
cd ../gguf-roundtrip
cargo +1.81.0 test --locked
cargo +1.81.0 run --locked --release                    # the 27 GGUF files in the repository
cargo +1.81.0 run --locked --release -- --lfs-dir DIR   # also the 4 Git LFS GGUFs, from DIR/<local path>
```

`DIR` is laid out as for `gguf/check.sh --lfs-dir DIR`. The LFS bytes are at
`https://media.githubusercontent.com/media/<upstream repo>/<commit>/<path>` (see `gguf/README.md`).

For each object the binary calls `black_hole_compress(object, b"acer", b"liris", b"salt")`,
`pkt.capsule.arm_receiver()`, `white_hole_emit(&pkt, &[0, 1])`, `receipt_hbp(&pkt, &verdict, &[])` and
`wormhole_traverse(object, &[0, 1], &[2, 3])`. `[0, 1]` and `[2, 3]` are the subsets the codec's tests
use, and the sender, receiver and salt are the ones `wormhole_traverse` uses (303), so both calls
build the same packet. No watcher names are passed to `receipt_hbp`, so it prints no `WATCH` rows.

### Rows

- `CODEC`: commit, SHA-256 of the `src/lib.rs` the binary was built from, the four moduli, sender,
  receiver, salt, `recover_with` and `cross`.
- `MANIFEST`: SHA-256 of the manifest read, row counts, whether `--lfs-dir` was given.
- `GGUF_ROUNDTRIP`, one per manifest row:
  - `object_bytes`, `sha256`, `matches_manifest` (bytes and SHA-256 equal the manifest row);
  - `residues` (4 × ceil(object_bytes / 6)), `shadow_bytes` (every residue as the codec stores it, a
    `u64`), `capsule_bytes` (`size_of_val(&pkt.capsule)` = 12), `packet_bytes` = shadow + capsule,
    `packet_over_object` (integer division, truncated to 6 places);
  - `agt`, `agt_bytes` (20; not in `packet_bytes`), `roof_bits`, `residual_bits`;
  - `verdict` and `byte_identical` for `white_hole_emit`, `traverse_verdict` and
    `traverse_byte_identical` for `wormhole_traverse`. A verdict is written as the codec's enum names
    it: `VerifiedClone` or `Held(<reason>)`.
  - The codec's own `WORMHOLE` and `CAPSULE` rows for that packet follow.
  - An LFS row without `--lfs-dir` is `status=NOT_MEASURED|reason=lfs_pointer_without_lfs_dir`.
- `SUMMARY`: counts and the byte totals. When no row was measured (no `GGUF|` row, or only LFS rows
  without `--lfs-dir`) it ends in `status=NOT_MEASURED|reason=no_gguf_measured` and the exit status
  is 0, as the codec's own workflow gate reports a run that measured nothing.

The codec has no serialiser, so the sizes are the in-memory payload of the packet's fields
(`size_of_val`), not a wire format. `orig_len`, `roof_bits` and `residual_bits` add 13 bytes on a
64-bit target and are not counted in `packet_bytes`.

## Measured round trip (2026-10-17)

Rust 1.81.0 release build, one thread, 4 vCPU / 16 GB host. Two separate runs of each, from two
builds; wall time varied between runs, peak RSS did not:

| Run | Exit | Wall ms | Peak RSS KiB |
|---|---|---|---|
| All 31 GGUFs (27 files + 4 LFS read with `--lfs-dir`), run 1 | 0 | 91,255 | 2,248,396 |
| All 31 GGUFs, run 2 | 0 | 72,214 | 2,248,428 |
| The 27 files alone, run 1 | 0 | 1,809 | 63,232 |
| The 27 files alone, run 2 | 0 | 1,870 | 63,256 |

Both runs of each printed the same bytes. The full output is
[`gguf-roundtrip/RECEIPT-GGUF-ROUNDTRIP.hbp`](gguf-roundtrip/RECEIPT-GGUF-ROUNDTRIP.hbp).

```
SUMMARY|rows=31|measured=31|not_measured=0|not_read=0|matches_manifest=31|verified_clone=31|byte_identical=31|traverse_verified_clone=31|traverse_byte_identical=31|held=0|object_bytes=602444562|packet_bytes=3213038356|packet_over_object=5.333334|json=0
```

Every GGUF matched its manifest row, and for every one both `white_hole_emit` and
`wormhole_traverse` returned `VerifiedClone` with bytes equal to the input. No row was `Held`.

| | GGUFs | Object bytes | Packet bytes | Packet / object |
|---|---|---|---|---|
| Files in the repository | 27 | 19,673,170 | 104,924,196 | 5.333364 |
| Git LFS GGUFs | 4 | 582,771,392 | 3,108,114,160 | 5.333333 |
| All | 31 | 602,444,562 | 3,213,038,356 | 5.333334 |

Each 6-byte block becomes four `u64` residues (32 bytes), so `packet_bytes` = 32 × ceil(n / 6) + 12
and the ratio is 32 / 6 = 5.333333 plus the effect of the padded last block and the 12-byte capsule.
`white_hole_emit` with `[0, 1]` reads two of the four residue streams (half of `shadow_bytes`). Each
residue is below its modulus; the largest modulus, 33,554,467, is just above 2^25 = 33,554,432.
In memory the packet is larger than the object for every GGUF: 5.333333 to 5.343636 times its size,
5.333334 over all 31.

`universe-simulator/gguf/` (26):

| GGUF | Storage | Object bytes | Packet bytes | Packet / object | Emit | Emit = input | Traverse | Traverse = input |
|---|---|---|---|---|---|---|---|---|
| `ASOLARIA-CONSTELLATION.gguf` | file | 145120 | 773996 | 5.333489 | VerifiedClone | 1 | VerifiedClone | 1 |
| `ASOLARIA-SELF-64-XY.gguf` | file | 9056 | 48332 | 5.337014 | VerifiedClone | 1 | VerifiedClone | 1 |
| `ASOLARIA-SELF-64-YZ.gguf` | file | 9056 | 48332 | 5.337014 | VerifiedClone | 1 | VerifiedClone | 1 |
| `ASOLARIA-SELF-64-ZX.gguf` | file | 9056 | 48332 | 5.337014 | VerifiedClone | 1 | VerifiedClone | 1 |
| `ASOLARIA-SELF-64CUBE.gguf` | file | 787360 | 4199276 | 5.333362 | VerifiedClone | 1 | VerifiedClone | 1 |
| `acer/ACER-FABLE-FOLDED.gguf` | file | 50332 | 268460 | 5.333783 | VerifiedClone | 1 | VerifiedClone | 1 |
| `acer/ACER-FABLE-GREEN.gguf` | file | 50752 | 270700 | 5.333779 | VerifiedClone | 1 | VerifiedClone | 1 |
| `acer/ACER-MYTHOS-BLUE.gguf` | file | 50752 | 270700 | 5.333779 | VerifiedClone | 1 | VerifiedClone | 1 |
| `acer/ACER-MYTHOS-FOLDED.gguf` | file | 50332 | 268460 | 5.333783 | VerifiedClone | 1 | VerifiedClone | 1 |
| `acer/ACER-MYTHOS-SPHERE-FLASHLIT.gguf` | file | 50816 | 271052 | 5.333989 | VerifiedClone | 1 | VerifiedClone | 1 |
| `acer/ACER-OPUS-FOLDED.gguf` | file | 50332 | 268460 | 5.333783 | VerifiedClone | 1 | VerifiedClone | 1 |
| `acer/ACER-OPUS-RED.gguf` | file | 50752 | 270700 | 5.333779 | VerifiedClone | 1 | VerifiedClone | 1 |
| `acer/ACER-THE-SPHERE.gguf` | file | 1065536 | 5682892 | 5.333364 | VerifiedClone | 1 | VerifiedClone | 1 |
| `asolaria/ASOLARIA-HERSELF.gguf` | file | 3295808 | 17577676 | 5.333343 | VerifiedClone | 1 | VerifiedClone | 1 |
| `axes/ASOLARIA-FOUR-AXES-RIME.gguf` | file | 4908 | 26188 | 5.335778 | VerifiedClone | 1 | VerifiedClone | 1 |
| `axes/ASOLARIA-FOUR-AXES-TIMEFIX.gguf` | file | 5740 | 30636 | 5.337282 | VerifiedClone | 1 | VerifiedClone | 1 |
| `pumped/ASOLARIA-FABLE-SPHERE-PUMPED.gguf` | LFS | 126885312 | 676721676 | 5.333333 | VerifiedClone | 1 | VerifiedClone | 1 |
| `pumped/ASOLARIA-MYTHOS-SPHERE-PUMPED.gguf` | LFS | 126885312 | 676721676 | 5.333333 | VerifiedClone | 1 | VerifiedClone | 1 |
| `pumped/ASOLARIA-OPUS-SPHERE-PUMPED.gguf` | LFS | 126885312 | 676721676 | 5.333333 | VerifiedClone | 1 | VerifiedClone | 1 |
| `rime/ASOLARIA-RIME-UNRIME-THREE.gguf` | file | 3147488 | 16786636 | 5.333343 | VerifiedClone | 1 | VerifiedClone | 1 |
| `stars/ASOLARIA-STARS-SHELLS.gguf` | file | 4596880 | 24516716 | 5.333338 | VerifiedClone | 1 | VerifiedClone | 1 |
| `stars/KIMI-K3-STAR-256.gguf` | LFS | 202115456 | 1077949132 | 5.333333 | VerifiedClone | 1 | VerifiedClone | 1 |
| `three-bodies/ASOLARIA-ANTI-ANTI-MYTHOS-SLICES.gguf` | file | 50784 | 270860 | 5.333569 | VerifiedClone | 1 | VerifiedClone | 1 |
| `three-bodies/ASOLARIA-ANTI-FABLE-SLICES.gguf` | file | 50784 | 270860 | 5.333569 | VerifiedClone | 1 | VerifiedClone | 1 |
| `three-bodies/ASOLARIA-FABLE-SLICES.gguf` | file | 50752 | 270700 | 5.333779 | VerifiedClone | 1 | VerifiedClone | 1 |
| `wikipedia/ASOLARIA-MYTHOS-VS-WIKIPEDIA.gguf` | file | 5343456 | 28498444 | 5.333335 | VerifiedClone | 1 | VerifiedClone | 1 |

`follow/` (5):

| GGUF | Storage | Object bytes | Packet bytes | Packet / object | Emit | Emit = input | Traverse | Traverse = input |
|---|---|---|---|---|---|---|---|---|
| `colors/DOUBLE-RAINBOW-OIL-3174.gguf` | file | 3174 | 16940 | 5.337114 | VerifiedClone | 1 | VerifiedClone | 1 |
| `matrix/PUBLIC-FOLDER-CALMING-OILS.gguf` | file | 681184 | 3633004 | 5.333366 | VerifiedClone | 1 | VerifiedClone | 1 |
| `matrix/PUBLIC-OUTWARD-TRUTH-WAVES.gguf` | file | 58560 | 312332 | 5.333538 | VerifiedClone | 1 | VerifiedClone | 1 |
| `matrix/TIMED-CHIRAL-PUBLIC-COLOR-ORBITS.gguf` | file | 2200 | 11756 | 5.343636 | VerifiedClone | 1 | VerifiedClone | 1 |
| `matrix/timed-86400-parent-c8c3/TIMED-CHIRAL-PUBLIC-COLOR-ORBITS.gguf` | file | 2200 | 11756 | 5.343636 | VerifiedClone | 1 | VerifiedClone | 1 |

## Tests

`dbbh-dbwh`: the codec's own 9 tests. `gguf-roundtrip`: 9 tests.

- `small_gguf_round_trips_byte_identical`: `follow/matrix/TIMED-CHIRAL-PUBLIC-COLOR-ORBITS.gguf`
  (2,200 bytes, a partial last block) through emit and traverse, byte-identical, `packet_bytes` = 11,756.
- `one_cylinder_holds_insufficient_roof`: the same file with subset `[0]` gives
  `Held(InsufficientRoof)` and no bytes, as in the codec's own `insufficient_roof_holds`.
- `manifest_has_27_files_and_4_lfs_pointers`, `ratio_is_integer_truncated`.
- `tests/cli.rs`: the binary on a two-row manifest (one file row and one LFS row, the same
  2,200-byte GGUF; file row measured; LFS row `NOT_MEASURED` without `--lfs-dir` and measured with
  it), a SHA-256 that differs from the manifest (exit 1), a missing file (`NOT_READ`, exit 1), a
  manifest with no `GGUF|` row and one with only an LFS row and no `--lfs-dir` (`SUMMARY` ends in
  `status=NOT_MEASURED`, exit 0) and an unknown argument (exit 2).
