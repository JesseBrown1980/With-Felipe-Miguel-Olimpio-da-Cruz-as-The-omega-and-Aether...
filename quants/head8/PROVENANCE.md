# Provenance: asolaria-quant-head8

This crate ports quants 1-8 of the owner's combined quant registry, the eight-stage large-message
quant head `quant8`, from ASOLARIA-AS-NEURAL-NETWORK into integer-only Rust. This file records
where every upstream byte came from, what was ported and what was only vendored, and how the
port was checked.

## Lanes

| Lane | What runs there | Here |
|---|---|---|
| Hot (per request, in process) | Rust only: `quant8`, its count-sketch and channels, the tuple and both dot products, on integers and binary64 bit patterns | `src/` |
| Cold (verification, CI only) | The stdlib Python referee, integer arithmetic only | `tools/referee.py` |

The vendored `.mjs` files are pinned bytes; nothing in this crate or its CI executes them. Their
numbers are reproduced by `tools/referee.py`. Node was run outside the crate, as a measurement
of the vendored file itself (see [Node measurements](#node-measurements)).

## Vendored upstream files

Every file under `vendor/` is byte-identical to its upstream: `git hash-object <file>` gives the
blob id below, CI runs `sha256sum -c UPSTREAM.sha256`, and the sha256 of each file that has an
upstream `.sha256` sidecar equals that sidecar. The two repositories' remote `HEAD`s were read
with `git ls-remote` on 2026-10-17 and equal the commits below.

| Vendored path | Upstream repository @ commit | Upstream path | Git blob | sha256 |
|---|---|---|---|---|
| `vendor/ASOLARIA-AS-NEURAL-NETWORK/tools/behcs/quant-huge-message-benchmark.mjs` | `JesseBrown1980/ASOLARIA-AS-NEURAL-NETWORK` @ `4cc7624fb51ff8a64051ace7a1ff62edaa51d422` (file last changed in `a509bdc2afafa5326bd34f53fdfe9e55d7f24729`) | `tools/behcs/quant-huge-message-benchmark.mjs` | `a0e4ea8ff739399728211e39241415f4b626c77f` | `f425d3d9e9e0706b5a3dfb30f12923fea94b0867456d40d2b2aa8c0a45ab1e91` |
| `vendor/ASOLARIA-AS-NEURAL-NETWORK/tests/quant-huge-message-benchmark.unit.test.mjs` | same @ `4cc7624f…` (last changed `a509bdc2…`) | `tests/quant-huge-message-benchmark.unit.test.mjs` | `2007e64c6339e1224339a9e361df20e9781f3a48` | `3084acbbb3b69aa83bfb1c492dd1b4256c03da2d694f2366587c8cb577907cc2` |
| `vendor/ASOLARIA-AS-NEURAL-NETWORK/docs/ACER-QUANT-HUGE-MESSAGE-BENCH-2026-06-11.hbp` | same @ `4cc7624f…` (last changed `a509bdc2…`) | `docs/ACER-QUANT-HUGE-MESSAGE-BENCH-2026-06-11.hbp` | `9f4c6f30876c26224774a197dd179b48d04ece85` | `b00ecaa34b0b30678a41a17331310dec6ab68c437f9551974bfacaaf4cc9ffa8` |
| `vendor/ASOLARIA-AS-NEURAL-NETWORK/docs/LIRIS-QUANT-HUGE-MESSAGE-BENCH-READBACK-2026-06-11.hbp` | same @ `4cc7624f…` (last changed `e501fc98196e921f7bea0c5428f21abb08f05db6`) | `docs/LIRIS-QUANT-HUGE-MESSAGE-BENCH-READBACK-2026-06-11.hbp` | `a12f6bb01fd4b3abc52ed0eaf710d47b5893896a` | `3a980994f8f316fae8ad0f7d734c11fc2d72eb8d9156cb50b5994e34c74db63f` |
| `vendor/Algorithms-of-Asolaria/ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp` | `JesseBrown1980/Algorithms-of-Asolaria` @ `d399d13093c7947605682da3ef769bfd8cbe9535` | `ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp` | `7f4fff24f6c393b78aa0887ef025de7efa9de9c0` | `147cf6e56a6b0a49e8bb29dd9dea65bcd1b7865796b9266511c637609abcdb5f` |
| `vendor/Algorithms-of-Asolaria/ASOLARIA-COMBINED-QUANT-ATLAS-2026-07-13.md` | same @ `d399d130…` | `ASOLARIA-COMBINED-QUANT-ATLAS-2026-07-13.md` | `6d03443e4800e08eaa8183a22a37c8d4c8254b90` | `6e3df208579206dceca12fad183a4dee9426e42b084ae1e388dd481f8373a006` |

Read and cited, not vendored (same `Algorithms-of-Asolaria` commit):
`ASOLARIA-COMBINED-QUANT-LATTICE-2026-07-13.hbp` (blob `217eed77bb047c67cf01bf1a5b72b7cecaaf42d2`;
its rows 14-22 register the same eight channels as `Q8-*` ids and the 3,200-byte packet),
`ASOLARIA-COMBINED-QUANT-LATTICE-2026-07-13.md` (`a812d82a9875160a219ce12d89f59766f7cd7e93`),
`ASOLARIA-COMBINED-QUANT-MEASURED-ADDENDUM-2026-07-13.hbp` (`be69458471281bcc3b820593031305c306655433`)
and `.md` (`a20fb94680c8df931c1882313ab0013db0f7a399`). The addendum's `Q8` row (Q4-3200 and
Q8v2 on enwik8) describes, in its own words, "a corpus-based independent implementation", not
this file's `quant8`, so its numbers are not benchmark numbers of this code.

**Privacy.** Before copying, all six vendored files were scanned for e-mail addresses, IPv4
addresses, phone numbers, key material, local user paths and personal names. They carry the
owner's handle, the machine names `acer` and `liris`, a CPU model and Node versions, and no
third-party personal data.

## V8's `Math.log2`

Line 72 calls `Math.log2`. V8 binds it to `base::ieee754::log2`
(`src/codegen/external-reference.cc:978` in V8 12.4.254.21), the FreeBSD/fdlibm `e_log2.c`
algorithm with `k_log1p`, in `src/base/ieee754.cc` lines 1939-2050 (constants 1939-1945,
`k_log1p` 1951-1962, `log2` 1973-2050). That file at tag `12.4.254.21` (Node v22's V8) has
sha256 `da01a54955911cfc550117988de91516c6f1aac343af28142dce619b433a67fc`; at `branch-heads/13.6`
(the V8 line of Node v24, which the receipts name) the text from `Lg1` through `log2` is
identical. `src/log2.rs` and the referee's `v8_log2` port those statements one for one, each
`+ - * /` rounded once; the ten constants equal the hexadecimal values in the C comments and
the C decimal literals, which the referee parses exactly and rounds to nearest (`dec`;
`tests/number.rs`, `CONST` rows; V8's own parse of the same literals gives the same 17 `CONST`
values).

## What is ported and what is only vendored

| Upstream (quant-huge-message-benchmark.mjs) | Ported to |
|---|---|
| `D` (:18), `CALIBRATION_ROWS` (:20-33) | `D`, `CALIBRATION_ROWS` (`tests/upstream.rs` compares the strings with lines 21-32) |
| `PPOW` (:35-49) | `PPOW` (a `const` table built by the same loops) |
| `quant8` (:51-79) | `count_sketch` (stage 1), `quantize` (stages 2-8), `quant8` |
| `tupleBuffer` (:81-86) | `tuple_buffer` |
| `dotRaw` (:88), `dotQ` (:89) | `dot_raw`, `dot_q` |
| `fill` (:91), `Math.floor(mb * 1048576 / 8)` (:103) | `Fill`, `fill`, `message_dims` |
| `runLiveBenchmark` and the command line (:93-139) | `examples/quant_bench.rs` (timing harness, cold) |

Only vendored: the upstream unit test (its inputs use `Math.sin`/`Math.cos`, which are not
ported; `tests/upstream.rs` makes its checks on `fill` inputs) and the two benchmark receipts.

## Referee in Python instead of Node

`tools/referee.py` mirrors the upstream lines one by one (each function is marked with its
upstream line numbers) in integer arithmetic only, as OWNER-RULES rule 4 asks of every referee;
it uses no Python float. A JavaScript number is held as its 64-bit pattern in a Python `int`:

| JavaScript | Integer mirror |
|---|---|
| `+ - * /` | `add`, `sub`, `mul`, `div`: the operands' exact values `m * 2^e`, the exact sum, difference, product, or quotient with a remainder bit, rounded once by `pack` to the nearest binary64, ties to even, with signed zeros, subnormals, overflow to `±Infinity` and NaN (`x / ±0` is `±Infinity`, `0 / 0` is NaN) |
| `<`, `>`, `===`, `Math.abs` | `lt`, `gt`, `js_eq`, `js_abs` on the bit patterns (NaN compares false, `-0 === 0`) |
| `(i * 2654435761) >>> 0` | `to_uint32(mul(from_int(i), HASH_MUL))` |
| `ToInt32`, `ToUint32`, Int8Array/Uint8Array/Uint32Array stores | `to_int32`, `to_uint32`, `to_int8`, and `& 0xFF` / `& 0xFFFFFFFF` on integer Numbers, from the ECMAScript definitions |
| `Math.round(x)` | `js_round`: `floor(x + 1/2)` in integers, `-0` for `-0.5 <= x < 0`, NaN, infinities and zeros unchanged |
| `Math.log2(x)` | `v8_log2`: V8's `ieee754::log2` statement by statement on these operations; words by bit masks |
| Decimal literals (`1e-12`, `0.33`, the `log2` constants) | `dec`: the literal as an exact `Fraction` of two integers, rounded once by `pack` |
| `fill` (:91) | a generator: the state update in integers (exact, below `2^53`), then `(s / 2147483648) - 1` through `div` and `sub` |

The integer referee regenerates both committed fixtures with the same data rows as the earlier
referee, which did this arithmetic in Python floats (`quant8-expected.hbp` byte for byte; in
`number-vectors.hbp` only the header comment changed), and its `--grid` and `--log2-grid`
streams are byte-identical to that referee's (sha256 `6661e712…69b6` and `55e14da7…3405`).

`--check` regenerates `tests/fixtures/number-vectors.hbp` (18,176 rows) and
`tests/fixtures/quant8-expected.hbp` (63 rows) in memory and diffs them byte for byte; `--grid`
and `--log2-grid` stream 2,000,000 and 1,343,524 cases to `examples/number_grid.rs`.

## Node measurements

To check the referee against the running upstream, Node v22.22.0 (V8 12.4.254.21-node.33) was
run in the scratchpad, outside this crate, on 2026-10-17:

1. The vendored `quant-huge-message-benchmark.mjs` imported as is, its `quant8` and
   `tupleBuffer` applied to every `INPUT` of `quant8-expected.hbp` (the `fill` messages built with
   the text of line 91, which the module does not export), printing `QUANT8` rows: the 14 rows
   are byte-identical to the fixture.
2. The same for the `fill` messages of 256, 1,024 and 2,048 MB at seeds 12345 and 99999: the 6
   rows are byte-identical to `examples/quant8_rows`. Their tuple SHA-256s:
   256 MB `01bd5c1c…d9a5` / `49694d39…c9af`, 1,024 MB `a78e36d0…9325` / `c386218b…0675`,
   2,048 MB `344dc3b8…8f25` / `d80f6ca2…81ab` (seed 12345 / 99999).
3. `Math.log2`, `Math.round`, `| 0`, `+ - * /`, `<` and `===` on all 2,018,176 grid and
   fixture cases: 0 differences from the referee. Re-run on the integer referee: its 2,000,000
   `--grid` lines, 1,343,524 `--log2-grid` lines, 18,176 `CASE` rows and 17 `CONST` rows give
   0 differences from Node, and the vendored `quant8` (lines 52-56, 88, 89 and 91 copied
   verbatim for `PROJ`, `DOT` and `fill`) reproduces all 31 `PROJ`, `QUANT8` and `DOT` rows of
   `quant8-expected.hbp`.
4. The vendored tool's own `--run --sizes=1,8,64,256,1024,2048 --disk`, recorded in README.md.

No Node file is part of this crate or its CI.
