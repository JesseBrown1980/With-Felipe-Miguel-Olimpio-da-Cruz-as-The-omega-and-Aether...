# quants/hyperbehcs — provenance

Rust 1.81 hot-lane port of the owner's four HyperBEHCS vector quants (combined-quant registry
slots 9-12) and the triple reconstruction, with a stdlib Python referee that mirrors the
JavaScript line by line. Every behaviour traces to an upstream file:line below; nothing was added.

## Vendored, byte-identical

| file | repo @ commit | path | git blob | sha256 |
|---|---|---|---|---|
| `vendor/Asolaria-ASI-On-Metal-Fabric-and-matrix/tools/falcon/omni-acer/lib/hyperbehcs-core.cjs` | JesseBrown1980/Asolaria-ASI-On-Metal-Fabric-and-matrix @ a1a707835c087c2215c50a805bdad0c0f5e06a2a | `tools/falcon/omni-acer/lib/hyperbehcs-core.cjs` | a81796acaed1f9ad46c8cf8be23dd92430398bd4 | 668a938a8b0281694797d64a6ff31921031b9af58fd7afb77a50dd3e0ee31e08 |
| `vendor/Algorithms-of-Asolaria/ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp` | JesseBrown1980/Algorithms-of-Asolaria @ d399d13093c7947605682da3ef769bfd8cbe9535 | `ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp` | 7f4fff24f6c393b78aa0887ef025de7efa9de9c0 | 147cf6e56a6b0a49e8bb29dd9dea65bcd1b7865796b9266511c637609abcdb5f |

Both commits were the remote `HEAD` when read (2026-10-17). `UPSTREAM.sha256` pins both files.
The served host pins the same library bytes: `omnicoder-server-v2.mjs:38-39` (same repo and
commit, blob fc30b0b9) has `CANON_BUNDLE["hyperbehcs-core.cjs"] =
"668a938a8b0281694797d64a6ff31921031b9af58fd7afb77a50dd3e0ee31e08"`; `tests/recorded.rs` checks it.
The registry sha256 equals the repository's own sidecar `ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp.sha256`.

Privacy: both files were scanned for e-mail addresses, phone numbers, IP addresses, keys and
private names before copying. The only name is the owner's handle `JesseBrown1980` (registry
line 1); `acer` and `falcon` are the owner's device names inside repository paths. Nothing else
was found; no private mirror file was used.

## Slots (registry lines 15-18)

| n | id | alias | upstream lines | Rust | algorithm string |
|---|---|---|---|---|---|
| 9 | `Q-JL-ACHLIOPTAS-SEEDED-v1` | JL-Achlioptas | 55-59, 61-67, 69-90 | `johnson_lindenstrauss` | `johnson-lindenstrauss-achlioptas-sparse.v1` |
| 10 | `Q-TURBO-MINMAX-U8-v1` | Turbo-uniform | 92-115 | `turbo_quant` | `turbo-uniform-quant.v1` |
| 11 | `Q-POLAR-RTHETA-v1` | Polar-pair | 117-150 | `polar_quant` | `polar-pair-quant.v1` |
| 12 | `Q-TRIPLE-SPHERICAL-v1` | Triple-spherical | 152-194, 196-213 | `triple_quant`, `reconstruct_triple` | `triple-spherical-quant.v1` |

Shared helpers: `sha256`/`sha16` (24-30), `round` (32-36), `finiteNumber` (38-41), `quantBits`
(43-46), `toVector` (48-53, array input), `ZERO_COUNTERS` (5-22), and `vectorFromText` (239-249),
which the served route uses for text input (`omnicoder-server-v2.mjs:208`).
`tests/registry.rs` checks the slot table against the vendored registry rows and the algorithm
strings against the vendored source.

## How each JavaScript operation is reproduced

- **Numbers.** `src/number.rs` holds a JavaScript Number as its IEEE-754 binary64 bit pattern
  and computes `+ - * /` and `Math.sqrt` with integers, round to nearest, ties to even,
  including both zeros, subnormals, infinities and NaN; `Math.round`, `Math.ceil`, `Math.min`,
  `Math.max` (with `-0` below `+0`), `===`, `<` and `x || 0` follow the language specification.
  `l0_edge::jsnum::Dbl` holds non-negative values only and has no subtraction, square root or
  word access, so it cannot express these computations; this crate carries its own type
  (`quants/head8` carries a similar one; the integrator may merge them).
- **`Math.atan2`, `Math.acos`, `Math.sin`, `Math.cos`.** `src/fdlibm.rs` follows V8's
  `src/base/ieee754.cc` statement by statement: v8/v8 tag 12.4.254.21 (the V8 of Node v22.22.0),
  file sha256 da01a54955911cfc550117988de91516c6f1aac343af28142dce619b433a67fc, git blob
  e71b63fd7c17711e5dc04d9acc040be0aa0b7c40; `atan` 1116-1200, `atan2` 1228-1319, `acos`
  862-921, `__ieee754_rem_pio2` 118-270, `__kernel_rem_pio2` 443-644, `__kernel_cos` 305-336,
  `__kernel_sin` 673-698, `cos` 1352-1383, `sin` 2448-2479. Node v22.22.0, v24.10.0 and v26.0.0
  define `V8_USE_LIBM_TRIG_FUNCTIONS` in none of `common.gypi`, `tools/v8_gypfiles/features.gypi`,
  `toolchain.gypi` or `v8.gyp` (v24.0.0: none in `features.gypi` or `v8.gyp`), so `Math.sin` and
  `Math.cos` are these fdlibm versions, not the glibc-derived ones (ieee754.cc:1351, 2447, 3026). The same
  function bodies in V8 14.6.202.33 (Node v26.0.0) are byte-identical to 12.4.254.21 (compared
  function by function). `Math.sqrt` is the correctly rounded square root.
- **`JSON.stringify` of a Number.** `src/text.rs` writes `Number::toString(10)`: the shortest
  digits that read back to the same binary64, nearest the exact value, formatted with the
  ECMA-262 rules (`1e-7`, `0.000001`, `1e+21`, `-0` as `0`, non-finite as `null`).
- **`fingerprint`.** Upstream sets `fingerprint = sha256(JSON.stringify(packet)).slice(0, 16)`
  on the packet without it (core:29, 89, 114, 149, 193). Each Rust packet type writes that exact
  text in `fingerprint_preimage()` and hashes it with `sha2` 0.10.9; the text is a hash input
  only, never parsed or stored (as `hbp/src/hbp.rs` does for `canonicalStringify`).
- **`Number.parseInt(digest.slice(0, 12), 16) % 6`** (core:63) is the first six digest bytes
  big-endian, modulo 6.

The four Rust option fields are the four properties the functions read (`bits`, `maxRadius`,
`targetDimension`, `seed`); `None` is an absent property. The served caller passes the same
object to all four quants (`omnicoder-server-v2.mjs:210-214`).

## Referee and fixture (cold verification lane)

`tools/referee.py` (stdlib only) mirrors hyperbehcs-core.cjs and the V8 fdlibm functions
statement by statement, with integer arithmetic only (OWNER-RULES rule 4). A JavaScript Number is
held as its binary64 bit pattern in a Python int; `+ - * /` and `Math.sqrt` are computed exactly on
integers (`math.isqrt` for the root) and rounded once, to nearest, ties to even; `Number::toString`
finds the fewest digits that read back, nearest the exact value, by an integer search. The file
creates no Python float: it has no float literal, no `/` operator, no `float(` and no `math` call
other than `isqrt` (checked by walking its syntax tree). Its integers are unbounded (the exact sum,
product or quotient, then one rounding), where `src/number.rs` works in fixed-width `u128` with
shortcuts such as returning the larger addend past a 70-bit exponent gap (number.rs:435-438). It
writes `tests/fixtures/hyperbehcs-quants.hbp` (HBP rows, 405 rows, 168,274 bytes, sha256
3889badfa868ff6f9819c9d0c4ac56bbdcdc3395fe033b2b2f901566c7aec137) and `--check` regenerates it in
memory and diffs. The earlier version of the referee computed on Python floats; the integer version
writes the same file byte for byte. `--grid N` prints N lines per operation for `examples/grid.rs`,
with inputs drawn as integers (random bit patterns, specials, subnormals, and values in a range as
`lo + (hi - lo) * k / 2^53` for a random 53-bit `k`).

Fixture inputs: the two inputs upstream itself defaults to, `vectorFromText("", 1536)`
(core:239-240) and `vectorFromText("{}", 1536)` (`benchmark({})`, core:269); `vectorFromText` of
strings from the same file at widths 1, 2, 3, 4, 5, 7 and 64; and ten literal vectors that reach
every branch (empty, zeros, signed zeros, constant, `[3,-4,-3,4]`, unit axes, NaN/±Infinity,
values that underflow, values that overflow, subnormals). Each input runs with default options;
three inputs also run 19 option sets (bits 1, 4, 12, 16, 24, 0, 30, 7.5, NaN; maxRadius 1, 0, -2,
Infinity; targetDimension 1, 5, 2.5, -3; a second seed; one mixed set) and `[3,-4,-3,4]` runs
targetDimension 5000. That is 77 runs of each quant plus 77 reconstructions. Lists longer than
300 entries are recorded as their length and the sha256 of their comma-joined text.

## Measured (2026-10-17, this container: 4 vCPU Intel Xeon 2.1 GHz)

- `cargo +1.81.0 test --locked`: 14 tests pass, including every field of all 405 fixture rows
  (inputs, codes, metadata bit patterns, projections, reconstructions, fingerprints and the full
  sha256 of each fingerprint preimage) and the recorded shard-0000 receipt (below).
- `python3 -I tools/referee.py --grid 500000 | examples/grid`: 5,500,000 lines, 0 differences
  (add, sub, mul, div, sqrt, Math.round, Number::toString, atan2, acos, sin, cos: 500,000 each;
  inputs include random bit patterns, subnormals, specials and sin/cos arguments up to 1.8e308).
  Generating the 500,000 grid took 2 min 49 s of CPU time; `--check` takes about 3 s.
- Cold oracle, run in scratch space and not part of this directory (float appears there only
  inside Node: the owner's file run unchanged, and V8's own arithmetic and `Math` results printed by
  a review harness): Node v22.22.0 (V8 12.4.254.21-node.33) executing the
  vendored `hyperbehcs-core.cjs` agrees with all 404 data rows of the fixture (712 checks: input
  values, fingerprints, preimage sha256 and reconstructions; 0 failed). On 3,200,000 operations
  whose results V8 itself printed (a separate review harness: `+ - * /`, `Math.sqrt`, `Math.round`,
  `Math.ceil`, `Math.min`, `Math.max`, core `round(x, 6)` and `round(x, 12)`, `Number::toString`,
  `Math.atan2/acos/sin/cos`, 200,000 each, including `__kernel_rem_pio2` arguments, arguments near
  multiples of pi/2 and subnormals), both the integer referee and the Rust port give V8's result
  every time (0 differences each).
- First 1536-wide default run, Node and Rust identical: turbo fingerprint `cf135af855a29f6e`
  (min -2.765625, max -0.164062, scale 0.010202207843), JL `7aa1e8e4e4eb60d2` (79 rows, first
  0.254745080519), polar `13f49e4cd9ef724d` (maxRadius 3.635289813928), triple
  `348e532f9b1142a7` (radiusScale 0.01460777117), reconstruction first value -0.729485412431.
- The referee carries V8's fdlibm source because a C library's own functions can differ from it
  in the last bit: with the earlier float version of the referee, Python's `math.atan2/acos/sin/cos`
  (glibc 2.39) differed from fdlibm on 65,264 / 30,829 / 14,669 / 15,108 of that version's 500,000
  grid inputs, and substituting glibc changed 0 of the 405 fixture rows (the codes and 12-decimal
  roundings absorb those last-bit differences there). That float measurement is not repeated: the
  integer referee does not call a C library.
- Achlioptas weights over the default seed and the 79 x 1536 default matrix: +sqrt(3) 20,331/121,344,
  0 80,699/121,344, -sqrt(3) 20,314/121,344, against the recorded `prob{1/6,2/3,1/6}`
  (ASOLARIA-AS-NEURAL-NETWORK `docs/QUANT8DEFS-CODE-GROUNDED-2026-06-11.hbp` line 3);
  `tests/recorded.rs` checks the counts.
- Per call on `vectorFromText("", 1536)`, integer microseconds. Method: one process runs 5 batches
  of each call (200 calls per batch for vectorFromText and turbo, 100 for polar, triple and
  reconstruct, 5 for JL) and keeps the fastest batch, so the batches after the first run warm;
  each figure is the lowest of 6 such processes. Rust release build against Node v22.22.0 running
  the vendored file, on this shared host at load average 7-9, where a single process's figure was
  up to three times the lowest. Rust [Node]: vectorFromText 260 [92]; JL 1536->79 27,539
  [134,887]; turbo 165 [100]; polar 711 [94]; triple 859 [147]; reconstruct 512 triples 778 [63].
  The Rust figures use integer binary64 arithmetic throughout.

## Recorded receipt reproduced

what-is-asolaria---how-do-we-get-reductions-in-everything @ 29307bfedb512235f69bf7c290ee72b2813c7c92
(the remote `HEAD` when read), `cubes/sample-shard-quant-cube.annotated.json` (blob
34af1934237e880f9e49a330199e56013840f0af), lines 11-45, records the four quants on shard-0000 of the
owner's 10,000-room rotor; its line 2 describes it as an extract of line 1 of
`shard-quant-receipts-latest.ndjson`.
The rotor (Asolaria-hermes-work @ 84f0b20 `room-rotor/hyperbehcs-d-drive-10000-room-rotor.mjs:281-304`)
builds the vector `[100, 9, 9, 8, 8, 8, 0, 4950]` for that shard (derived in `quants/cubes`,
README.md:36-40, `tests/fixtures/shard-vectors.hbp:2`) and passes `targetDimension: 4` and the seed
`HYP-D-10000-ROOM-ROTOR:shard-0000`. On that input this crate, and Node running the vendored file,
give every recorded value: dimensions 8 -> 4 (lines 11-12), projection `[0.883159333634,
0.00297360045, 0.000174917674, -0.004372941837]` (18), turbo codes `[5,0,0,0,0,0,0,255]` with bits 8,
min 0, max 4950, scale 19.411764705882, levels 256, maxCode 255 (25-26), polar codes
`[[5,4],[1,29],[1,32],[255,64]]` with maxRadius 4950, radiusScale 19.411764705882,
angleScaleRadians 0.024639942381 (32-33), and triple codes `[[5,120,4],[1,78,32],[255,128,64]]`
(39); `tests/recorded.rs` checks them and CI checks the quoted lines against the upstream file.
The receipt's fingerprints (`e6f9b1e70d83c377`, `aeb89437d368a39c`, `bcedf0fa35ddfb71`,
`9083f572b7853c75`, lines 20, 27, 34, 45, and `payloadFingerprint` `24c347a1008e5e3e`, line 56)
hash packets of another shape: its metadata adds
`zeroPoint` (26), `radiusBits`/`angleBits` (33) and lane objects with bits 4/8/8 (40-44), written by
`buildQuantizedSubstrateReceipt` of `src/behcs/hyperbehcsQuantSubstrate.js` (rotor:13-16), which no
repository holds. They cannot be compared with this crate's packets, whose fingerprints on that
input are `7537cbc978efdf3d`, `d00ff9cd55610664`, `2924d8a9cfab3c1d` and `41b742e1c3318458` in both
Rust and Node.

## Upstream behaviour measured and recorded as it is

- `turboQuant`, `polarQuant` and `tripleQuant` call `Math.min(...raw)` / `Math.max(...raw)` /
  `Math.max(...radii)` (core:96-97, 131, 169), passing every element as a call argument. Under
  Node v22.22.0 with its default stack these raise `RangeError` from about 125,000 (turbo),
  250,000 (polar) and 375,000 (triple) elements. The exact first length depends on the stack in
  use at the call: with one fresh `node` process per probe calling the function at top level
  (a scratch harness, not in this directory), turbo throws from 125,527, polar from 251,033 and
  triple from 376,531, in 8 of 8 processes at each of those lengths and 0 of 8 one element below;
  one probe during the search threw at polar 251,030. The Rust port returns packets for every
  length; for lengths under the bound its packets equal Node's.
- The served route `POST /api/quant` (`omnicoder-server-v2.mjs:433-437`) calls
  `quadQuantFingerprint` (207-229), which runs all four quants with one options object and
  records `target_dim: jl.length` (222); `jl` is the packet object, which has no `length`
  property, so that field is `undefined` and `JSON.stringify` leaves it out.
- The atlas (`ASOLARIA-COMBINED-QUANT-ATLAS-2026-07-13.md`, section B) states these four "overlap
  the eight-stage aliases but implement different mathematics"; QUANT8DEFS line 6 records
  "the-TRIPLE-is-the-THREE-spherical-components-r-theta-phi".
- The upstream host on falcon ran under Termux Node (`tools/falcon/CLAUDE.md` names node v26;
  `artifacts/ACER-ATLAS-ENGINE-MTP-HRM-2026-06-14.hbp` line 7 names node-v24 on acer);
  Node's gyp files set `-ffp-contract=off` only for s390x and ppc64
  (`tools/v8_gypfiles/toolchain.gypi`). x86-64 builds have no fused multiply-add in the baseline
  instruction set, so fdlibm runs unfused there, as ported. Whether an arm64 build fused any
  `a * b + c` in ieee754.cc was not measured (no arm64 V8 here).

## Not brought in

- **The receipt builder and the other 99 shard receipts.** One recorded output of these four
  functions exists: the shard-0000 receipt above (a git grep at `HEAD` of the 186 repositories
  under `scratchpad/census/src` for the four algorithm strings finds it, beside the vendored core,
  QUANT8DEFS and reductions `cubes/TENSOR-COLLAPSE-MECHANISMS-PIPES-CONTROLS-acer.md`). The
  builder that shaped it, `src/behcs/hyperbehcsQuantSubstrate.js` (`buildQuantizedSubstrateReceipt`, rotor:13-16), and
  the full `shard-quant-receipts-latest.ndjson` it was extracted from are in no repository on disk,
  not in any of the 132 refs of the private mirror (`git rev-list --objects --all`), and not on
  this disk (`find / -name 'shard-quant-receipts*'`: none), so the receipt's packet shape and its
  five fingerprints are not reproduced. Other hits of the earlier search (every repository under
  `scratchpad/census/src` and `/home/user`, the mirror's refs, the Algorithms-of-Asolaria
  registry, lattice, atlas and measured addendum) are source, call sites and descriptions
  (QUANT8DEFS lines 3-6; mirror branch `acer/formula-corpus-pid-registration-2026-06-19` file
  `ALGORITHMS-PID-REGISTRATION-WAVE2-ACER-2026-06-19.hbp` lines 80, 151-161, 230, 464, 836, which
  register these formulas and cite `C:/Users/acer/Asolaria/src/behcs/hyperbehcsRepresentationAlgorithms.js`
  and `A12-OMNIQUANT-RUST/src/jl.rs`, neither of which is in any repository or the mirror).
- `buildFastPacket` (core:215-237) and `benchmark`/`timedLoop` (core:251-306) are outside slots
  9-12. `benchmark` times `JSON.parse`/`JSON.stringify` with `process.hrtime` and has no
  reproducible output; `buildFastPacket` hashes `JSON.stringify(input)` of arbitrary objects.
- `quadQuantFingerprint` (omnicoder-server-v2.mjs:207-229) composes these quants with
  `zeta-process.mjs` `bandWeight`, a separate component.
- Calling conventions only JavaScript has: `toVector` of `{vector}` / `{values}` objects and of
  non-number array entries (core:49-51), and a numeric `options.seed` (`String(n)`, core:71). The
  Rust functions take the Number array and the seed string. `vectorFromText` takes a Rust `&str`
  (UTF-8); JavaScript strings holding lone surrogates have no `&str` form.
