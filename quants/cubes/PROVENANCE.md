# quants/cubes — provenance

Every file under `vendor/` is upstream bytes: a whole file copied with `git cat-file blob
<commit>:<path>` (its `git hash-object` equals the upstream blob id), or an exact line range of an
upstream blob (`<path>.lines-<a>-<b>`, the output of `sed -n '<a>,<b>p'` on that blob). `UPSTREAM.sha256`
pins the sha256 of all 32 files (`sha256sum -c UPSTREAM.sha256`). All nine upstream commits were the
remote `HEAD` on 2026-10-17 (`git ls-remote`), and all 32 files were re-downloaded from
`raw.githubusercontent.com` at the full commit ids below and compared (whole files: blob id and
bytes; ranges: blob id of the full file, then the range): 32 equal, 0 different.

## Upstream commits

| short | repository (github.com/JesseBrown1980/…) | commit |
|---|---|---|
| QP | Q-PRISM-human-organoid-neural-stream-as-a-high-dimensional-control | b4a21a25381d6920b7aab92c94c3c3e1420fc9e4 |
| RD | what-is-asolaria---how-do-we-get-reductions-in-everything | 29307bfedb512235f69bf7c290ee72b2813c7c92 |
| HW | Asolaria-hermes-work | 84f0b20f7ba37bfb76f5d8de16ad220540fca341 |
| WR | asolaria-whiteroom-engine | 896518a9b9591cbd6ed73e0852cb976c6d3f1d25 |
| AB | Asolaria-the-after-100-billion-run-absorption-and-decomposition-and-cubes | c59e2e6c13cbc0a951ece6f3771eef5f9ae2e4b9 |
| SH | Shannon-and-the-gnns-stage | 32f9670a648dbbd02d64524e91150efeec8e4d2c |
| FO | falcon-orbital | acff0741fedbe9419db48cf2348f631a770fb95d |
| BP | bigpickle-rebuild | c592599c8f3d000b07cd5f4218b7d6b24d49d7d5 |
| AA | Algorithms-of-Asolaria | d399d13093c7947605682da3ef769bfd8cbe9535 |

## Vendored files (paths under `vendor/<repository>/`)

| repo | path | lines | blob (full file) | sha256 (of the vendored bytes) | bytes |
|---|---|---|---|---|---|
| QP | host8/qprism_cube_host8.rs | 20-49 | 992ffd793f6c98f4f03b33ff0d1154b52d0174b0 | 792186b299000048a1a41c6eb6a1e608b1e25c38a2457e673ec4dd7036c33f6c | 988 |
| QP | host8/qprism_cube_host8.rs | 55-296 | 992ffd793f6c98f4f03b33ff0d1154b52d0174b0 | a2efefb083fb83c8414d0acebc3c1da2daa3615445cd2ee23bd8488085002c17 | 10968 |
| QP | docs/STAGE2-CUBE-ABSORPTION.md | 1-73 | 3f8f308d857c76d94f11f6d31fd22df1bbfb1cc4 | 0310420942a2f40eb8ead925a1d7fb67da6c2a2e45fc9e77c0e2255a9fb9af28 | 4769 |
| QP | docs/STAGE2-CUBE-ABSORPTION.md | 79-104 | 3f8f308d857c76d94f11f6d31fd22df1bbfb1cc4 | f67f28ea94e4b1ab538149f7dc48bd4706a97d7146152831170733eca25d180f | 2035 |
| QP | LICENSE | whole | f6c7ab6bc8dc9a092fbe5cb827e356923d72c6d5 | e994f1997f8afa963389779b6c51a2cc3ac01edbc78a90915b6c43097ec68809 | 1075 |
| RD | cubes/ingest-google-to-cube.mjs | 1-11 | ba6e96de186a87f508d30811a1b37b22a1a8b113 | ab5ddd4254f787fc4a777ec12af23e70bba1c952ac0c4772f6cc4eb66431a292 | 695 |
| RD | cubes/ingest-google-to-cube.mjs | 13-39 | ba6e96de186a87f508d30811a1b37b22a1a8b113 | 7f6078f5824034514390653046da1c2a27bcb84e2e92b632ca1448e0a899c70d | 1644 |
| RD | cubes/ingest-google-to-cube.mjs | 41-53 | ba6e96de186a87f508d30811a1b37b22a1a8b113 | 974bd17b911e7af23225bf4d6444d0effac87264f66589e6fa4d3d6aa49f11e0 | 1550 |
| RD | cubes/README.md | whole | 9666b83dffeef222733f619f551497a624ff5260 | e95ee0fb7109355f18b8f0af7d85d40da29e0d44429e4648fb98ca4b1cf400d5 | 4825 |
| RD | ASOLARIA-TENSOR-COLLAPSE-EXCAVATION-2026-06-16.md | 84-106 | 7762dfad5736075557a8d0df37374a914cb2ad83 | b46072b046047e11c277f6c67eb95a930444bf9da33cfa01b2e9f5110e5c440e | 831 |
| RD | ASOLARIA-TENSOR-COLLAPSE-EXCAVATION-2026-06-16.md | 194-211 | 7762dfad5736075557a8d0df37374a914cb2ad83 | 4a24d847b53555f076461b8dc20f8816d9d263d97a2591618ed7f58168ad9f1e | 1004 |
| RD | cubes/TENSOR-COLLAPSE-PAPER-TO-RUNTIME-MAP.md | 1-24 | 147abd8ce35a22b05a5908564448967c2eba2859 | 9d320936e4f904b1442b20f4da2952ff51744aaf13bfed6664772803c8e84ff5 | 4915 |
| RD | cubes/TENSOR-COLLAPSE-PAPER-TO-RUNTIME-MAP.md | 27-28 | 147abd8ce35a22b05a5908564448967c2eba2859 | 6178234e3988ecb658ad77190ad81513290f15e2575a2841285323afafc84f93 | 418 |
| HW | room-rotor/hyperbehcs-d-drive-10000-room-rotor.mjs | whole | 8651c5426f56f9e1156f3d01c584c517b1c1150c | 3c8ee673711bf8d785194be6d96f8c4de7aef888be71296343e7b2bc8a8e72c8 | 26398 |
| HW | room-rotor/hyperbehcs-d-drive-10000-room-rotor.unit.test.js | whole | eace482255ed490cc5714cd022e9c59b1c96a00f | 51f3de0ddaab1f262d9460089e9f69c7d2d35a6d6244b66db2088c8a42437f02 | 4507 |
| HW | room-rotor/hyperbehcs-d-drive-10000-room-rotor-latest.md | whole | 461167c36f13a7c5d9ee7846dcc49d56e174d70c | d9e2d750e74bbfb3566748b620619e2056dc4e479aeb76af7514c8658cefd5f6 | 1203 |
| WR | liris-whiteroom-engine.mjs | 1-188 | 8bf9fa4a5cd56cb65989f792c01cc931e69f8726 | def088bfa35e320f60f559f0b594eb521b4c2cdca42c19983d0fe0360c015ba9 | 9187 |
| WR | liris-whiteroom-engine.mjs | 190-200 | 8bf9fa4a5cd56cb65989f792c01cc931e69f8726 | f18e663599d05cf05fe73ecf202bbc89819864f48209e0259e012f760fd3be26 | 686 |
| WR | liris-sector-emitter.mjs | whole | 5474e1c11fe50421990590634514881b961e728a | ba8040e740ce83adec69b1548bb09f56eb00c8060d99ad7587204bb43c29e057 | 2987 |
| WR | liris-hilbert.mjs | whole | b505fc8c2a83ab2dac78f40a3ea94fbda5013c83 | 4ab31a8d9be28ec0f9f9c3b932e5a0350757231931ddc733bcd1178408df7189 | 1527 |
| WR | liris-whiteroom-engine.test.mjs | whole | bb328eb9212921cdcd33e5a00d065e2698ebab02 | df66ecc763911ee105853d15a4ab280cca2b63e75e63e97c47402a28c5c47d62 | 4061 |
| WR | liris-sector-emitter.test.mjs | whole | 0924c75b45c859671787ebfd69bb69e4411c9e3e | 266327ea97d1f3b3d9894323a7f169d0c0d5f5f8e820035498107c097a5deac0 | 1663 |
| WR | README.md | whole | 7cfcfc11ffe194a71eb3efb8f3794214e4b62d22 | 869d23eb3180c46d655fb9bf152df5e5cd9513d45168199d8c7b8c7b03f05c5d | 4771 |
| AB | backend/gc-runtime.mjs | whole | 696dbdcb1d4f38ac6b6e3bd4139e46c8fa9c0fb2 | 4d44f6a0a1fdc4bc4c879205cccc84c3baaa7706a0df74614a76fcdb30c48ccc | 1863 |
| AB | README.md | whole | 76491ac9c5f19469c06d07ee9ef96605abdd22b2 | bcceedcd385d2f66d3820a5ef18af483c599c558df53b82e3e8269def1b195a1 | 6032 |
| SH | pipeline/whiteroom-consumer-index.mjs | whole | e572da9340478af77b9ced7ebdd274ad5b130f09 | a419f877fa14310e18c1878019ff66b4dc2de2b772e326c662084dd97bbc099b | 8369 |
| SH | README.md | whole | 6611bdb9120a84f8873131ec05d45fcd85e1c061 | 3303d90bd15a0a3f008f31eae80cea6b5f79268c6b35d31b8cc461492224c535 | 7267 |
| FO | envelopes/2026-06-01T20-48Z-sector-PID-triple-confirm.hbp | whole | 55aa9d97195f0868ba71e052cb105f457be467d5 | ef9c086d199432ed1d2976453406d8ded8eee1feceff0bde7920c226fc7d1679 | 1704 |
| BP | src/fabric-sector-cycle.mjs | 17-26 | cc6a6bfc1fb85ca391650cbed822ccbcf64de6cc | 7204664e5851787124ed60243e8b07e6083afda64a6c769218c5039df4e194cb | 610 |
| AA | ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp | whole | 7f4fff24f6c393b78aa0887ef025de7efa9de9c0 | 147cf6e56a6b0a49e8bb29dd9dea65bcd1b7865796b9266511c637609abcdb5f | 6192 |
| AA | ASOLARIA-COMBINED-QUANT-ATLAS-2026-07-13.md | whole | 6d03443e4800e08eaa8183a22a37c8d4c8254b90 | 6e3df208579206dceca12fad183a4dee9426e42b084ae1e388dd481f8373a006 | 16305 |
| AA | liris/ALGORITHMS-CATALOG-LIRIS-2026-06-19-V2.md | 237-260 | 52678015c6d8f30184951cfbdb1499b1bc11034c | 997f5c5bcbe155b9c75df4b3ec4dfeda29a818296c4a121ca215a633d675af39 | 814 |

The falcon envelope's sha256 equals its own upstream sidecar
(`envelopes/2026-06-01T20-48Z-sector-PID-triple-confirm.hbp.sha256`), and the registry's equals
`ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp.sha256`. `quants/exact`, `quants/head8`,
`quants/hyperbehcs` and `quants/recovery` carry the same registry blob; the integrator may keep one
copy. Q-PRISM lines 101-128 and 265-273 sit inside range 55-296 here and are also carried by
`quants/exact` as their own extracts (same blob 992ffd79).

## Used in place, not copied

- aether `eval/vendor/qprism-control/qprism/cube_absorb.py` (blob 542d6573…, equal to QP
  b4a21a2), run by `tools/qprism_receipts.py` with numpy (cold lane). Float runs there only inside
  the owner's code: `cube_absorb.py` and the fixture-window generator of `tests/test_cube_absorb.py:10-13`
  (blob f8099ab1…), whose lines 11-13 and line 33 the tool copies unchanged (numpy float64).
- aether `quants/hyperbehcs` (slots 9-12) and `model/l0-edge` (`jsnum::Dbl`), path dependencies.

## Read but not vendored (receipts that carry private data, or JSON)

| file (RD @ 29307bf) | blob | use |
|---|---|---|
| cubes/drive-ingest-{absorb4-gc-wiring,cold-backup-proof,morning-brief,source-01,source-02,source-03,v23-readme,v24-audit-gap-ledger,v24-design,v24-staging-helper,v9-pid-voxels}.hbp, cubes/manifold-steering-2605.05115.hbp | 3053def6, 931639ee, d59875d7, 34cf0163, 1df8e2de, 0b3faeb8, b2debb87, 1938da54, 3a88d021, fd8430fa, b48d20ac, a289f81c | `tools/referee.py --receipts DIR` recomputes each footer over the full receipt and copies rows 2-7 (no `INGESTHDR`) into `tests/fixtures/ingest-receipts.hbp` |
| cubes/cloud-cycle-002-receipt.hbp | 197b55bc | lines 3-10 (`CYCLE2INGEST`) copied into the same fixture; line 2 names a Drive folder id |
| cubes/sample-shard-quant-cube.annotated.json | 34af1934 | values of lines 11-13, 18, 25-26, 32-33, 39 quoted in `tests/shard.rs`; the CI snippet compares those lines with upstream |

The 11 Drive receipts' `INGESTHDR` rows carry the owner's personal e-mail address and Google Drive
document ids; `ingest-google-to-cube.mjs` carries the address at line 40 and a Drive id at line 12.

## Not brought in: evidence

**`buildQuantizedSubstrateReceipt`.** `rotor:13-16` requires it from
`src/behcs/hyperbehcsQuantSubstrate.js` under the rotor's `ROOT` (two directories above the
script). Measured 2026-10-18, before this file's commit f966009 (01:10 UTC):

- Branch tips: 238 repository names of the owner's account (census list plus the account's
  repository listing), 237 reachable by `git clone` (not reachable: `my-history9`). A blobless
  depth-1 clone of every branch (834 tips, 501,855 path entries) has no path matching
  `quantsubstrate` in any case. `src/behcs/` exists only in the private repository `Asolaria`, at 9
  of its 94 branch tips.
- History: `scratchpad/asolaria-mirror.git` (that repository; not shallow; 364 commits; its 94
  branch tips equal `git ls-remote` on 2026-10-18) has no commit that touches such a path, and
  `git log --all -S buildQuantizedSubstrateReceipt` finds 0 commits; its `src/behcs/` has held 14
  file names, none of them this module. Over all 657 git directories under `/home/user` and the
  scratchpad (depth 5; 16,930 commits summed, clones overlapping), no commit touches a path
  matching `quantsubstrate`.
- GitHub code search is not evidence either way: it returns 0 for
  `buildQuantizedSubstrateReceipt user:JesseBrown1980` and also 0 for
  `globalRoomAddress user:JesseBrown1980`, which `liris-sector-emitter.mjs:31` (vendored here)
  defines.
- Delivered since (2026-10-18, after that commit): the ACER seat transferred
  `hyperbehcsQuantSubstrate.js` (6,893 B, blob 9a857b3e…; `buildQuantizedSubstrateReceipt` at :119).
  It is committed in this repository at `acer/Asolaria/src/behcs/` (46cc8c5, 10:20 UTC) and again
  under `docs/handoffs/acer-post60d-2026-10-18/FABLE5-REGEN-ITEM8-HYPERBEHCS-HOME-AND-QUANT-2026-10-18/quant/src/behcs/`
  (98731f8). This crate does not run it yet, so the slot-26 receipt shape and its five fingerprints
  are still not reproduced here.

**Slot 27 engines.** Located in asolaria-behcs-256 @ 818cc235 (`main` of the public repository,
`git ls-remote` 2026-10-18), `tools/cube/`. Each sets its root to an operator-local Windows
directory at the lines given (the directory names are not quoted here), so a recorded run cannot be
re-run from these files; none is vendored.

| file | blob | lines | header (line) | local roots at |
|---|---|---|---|---|
| `omni-shannon-v3-4d12.js` | 4033c4d1d76c47416e23f30fcf20b440a32797e8 | 254 | "6x6x6x6x12 omnishannon engine." (3) | 36-37 |
| `omni-shannon-v4-real.js` | de31779b25fa8d73f88fd79166c951c07cb5b95a | 847 | "REAL 6×6×6×12 inference engine." (3) | 33-34, 37 |
| `omni-shannon-v5-deep-cascade.js` | c1db497b9a5e64fe34fea4aff5dc7af87eca7148 | 533 | "SECOND CASCADE." (3), "6×6×6×6×6×12 = 93,312 beats per candidate." (5) | 31-32 |
| `run-deep-cascade-gated.js` | f03c669b27d427a2209f12a88a994987dde9ca48 | 221 | "Deep cascade with ALL gates watching." (3) | 13 |
| `omni-shannon.js` | e6aff9f21b15904409167a86f3025e2e42768097 | 367 | "Multi-agent omnidirectional Shannon consensus engine." (5) | 36-37 |

## Referee (cold lane, stdlib Python)

`tools/referee.py` mirrors, statement by statement: `ingest-google-to-cube.mjs:15-51`, the rotor's
`LANES`, `roomShard`, room lanes, `groupByShard` and `quantReceiptForShard` (18-39, 143-145,
178-194, 216-230, 281-304), `liris-sector-emitter.mjs:12-40`, `liris-hilbert.mjs:6-19`,
`liris-whiteroom-engine.mjs:19-37, 42-108, 131-183` (with `MemoryStore`), `gc-runtime.mjs:10-58` and
`whiteroom-consumer-index.mjs:60-67, 104-110`. It uses integer arithmetic only: a JavaScript double
is the exact `fractions.Fraction` of its binary64 value, `js_div(a, b)` rounds an integer quotient
to binary64 with integer operations (`raw_bytes / 8`, `raw_bytes / 10`, `n / 0xffffffff`, and the
literal `0.72` as `js_div(72, 100)`), and `Math.round` and `toFixed` are taken on that exact value.
`js_div` equals node 22's `a / b` bit for bit on 300,007 integer pairs (numerators up to 2^53,
divisors 3, 7, 8, 10, 100, 0xffffffff and random up to 2^53; a scratch check, not shipped). It
writes `consumer.hbp`, `gc.hbp`, `ingest-vectors.hbp` (rows 41-46 and a
footer for every vendored file and 11 edge inputs: empty, case mapping of U+0130/U+212A, BOM, CRLF,
invalid UTF-8, ties), `shard-vectors.hbp` (rotor configurations 10000/100, 24/6, 1/1, 7/3,
100000/1000: 208 shards) and `whiteroom.hbp` (primes 0..199, 8 sector addresses with scores, 9
Hilbert points (one with `n = 2^63 + 2048`), the 12-row smoke run, a 40-room sector run with `reuseCoord64`, the 200-room owner
test run). `--receipts DIR` writes `ingest-receipts.hbp`. `--grid N` emits seeded random cases;
`examples/grid.rs` compares them.

`tools/qprism_receipts.py` runs the owner's `cube_absorb.py` unchanged and writes
`qprism-receipts.hbp` (fixture window digests, the 3,200-byte tuple, the aee7e2c-format node row,
the b4a21a2 node row, the Python `hbp_row` and `active_glyph_law`, 81 prefix/injection pairs, 6 FNV
texts, the round trip).

## Privacy

Before copying, every file was scanned for e-mail addresses, phone numbers, IP addresses, keys,
tokens, local user paths and personal names. In the copied bytes: the owner's own name and handle,
the owner's seat and device labels (`acer`, `liris`, `falcon`), and public names of mathematicians
and a paper (Johnson, Lindenstrauss, Achlioptas, von Mangoldt, Shannon, Hilbert). Left out:
`liris-whiteroom-engine.mjs` line 189 and `liris-sector-flywheel.mjs` / `liris-flywheel-run.mjs`
(a local Windows user path); Q-PRISM `qprism_cube_host8.rs` lines 50-54 and
`STAGE2-CUBE-ABSORPTION.md` lines 74-78 (a citation naming a co-author, the same exclusion
`quants/exact` makes); `ingest-google-to-cube.mjs` lines 12 and 40; the excavation document's lines
with local user paths (59-63, 122, 138-139, 152-155) and `TENSOR-COLLAPSE-PAPER-TO-RUNTIME-MAP.md` line 26; the
after-100B `backend/hookwall/{cubes-indexer,promotion-bridge,tier-classifier}.mjs` (a third
party's name in each header). No file from the
private mirror was used. The repositories carry no license file except Q-PRISM (copied); the
owner's code is carried in the owner's own repository.

## Lints and formatting

- `cargo clippy --locked --all-targets -- -D warnings` passes. One lint is allowed, on the
  `include!` module only: `clippy::format_collect`, which clippy 0.1.81 reports at upstream line 25
  of `qprism_cube_host8.rs` (`Host8::to_hex`). Q-PRISM's own CI
  (`.github/workflows/rust-1.81-clippy-verification.yml`) finds no `Cargo.toml` and records clippy
  as `NOT_MEASURED`, so upstream names no allowed lints.
- `cargo fmt --check` passes; the `include!`-ed upstream ranges keep their upstream layout.
- The float grep (`\bf32\b|\bf64\b|as f[0-9]`) has no hit in `src/`, `tests/`, `examples/` or the
  vendored Rust.

## Files added here

`Cargo.toml`, `Cargo.lock` (sha2 0.10.9 and its dependencies as in `quants/hyperbehcs`, plus the two
path crates), `rust-toolchain.toml`, `.gitattributes`, `UPSTREAM.sha256`, `README.md`,
`PROVENANCE.md`, `src/{lib,qprism,ingest,shard,whiteroom,gc,consumer}.rs`,
`tests/{common/mod,qprism,ingest,shard,whiteroom,gc,consumer,registry}.rs`, `tests/fixtures/*.hbp`
(7, referee-written), `examples/{grid,whiteroom_smoke,ingest}.rs`,
`tools/{referee,qprism_receipts}.py`.
