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

## Trits as the owner's `Zero` (2026-10-18)

Owner, 2026-10-17: "we should be working with trinaries and ternaries". Owner rule relayed from the
ACER seat: "reuse tribit/mod.rs, never reinvent". The trit type is the owner's `Zero` (`Neg = -1`,
`Nil = 0`, `Pos = +1`) from `kernel/tribit` (asolaria-tribit@1292191, vendored byte-identical and
pinned in `ternary/UPSTREAM.sha256` as `../kernel/tribit/src/lib.rs`), re-exported unchanged by
`ternary` (crate `asolaria-ternary`). This crate depends on it by path:
`asolaria-ternary = { path = "../../ternary", version = "0.1.0" }`. `Cargo.lock` (version 3),
updated with cargo 1.81.0 (`cargo metadata --offline`, which adds new packages without
re-resolving), goes from 12 to 14 packages: it gains the two path packages `asolaria-ternary` and
`asolaria-tribit` and nothing else; every registry pin is unchanged (block-buffer 0.10.4, cfg-if
1.0.4, cpufeatures 0.2.17, crypto-common 0.1.7, digest 0.10.7, generic-array 0.14.7, libc 0.2.186,
sha2 0.10.9, typenum 1.20.0, version_check 0.9.5). `Cargo.lock` sha256 `155b5350…f768` before,
`cbd8019b…4c96` after.

A value is a `Zero` only where upstream carries it as a trit. Here that is one place, row A7 of
`ternary/MIGRATION.md` (the audit that decided it):

| Row | Before (`f966009`) | Now | Upstream (`quant-huge-message-benchmark.mjs` @ `4cc7624f…`) |
|---|---|---|---|
| A7 | `Quant8::triple: [i8; D]` (`src/lib.rs:104`), set to `1` / `-1` / `0` at `:304-310` | `[Zero; D]` (`src/lib.rs:107`); starts as `Zero::Nil` (`:288`); `Zero::Pos` / `Zero::Neg` / `Zero::Nil` at `:307-313` | `:62` `const triple = new Int8Array(D)`; `:73` `triple[j] = v > 0.33 ? 1 : (v < -0.33 ? -1 : 0)` (registry `Q-TRIPLE-TERNARY-v1`) |

What the code computes:

- The two comparisons are the ones of line 73 (`v.gt(TRIPLE_EDGE)`, then `v.lt(-TRIPLE_EDGE)`, with
  `TRIPLE_EDGE` the binary64 `0.33`); only the stored type changes. `Zero::direction()` returns the
  `Int8Array` value, `1`, `-1` or `0`.
- `tupleBuffer` (lines 81-86) concatenates turbo, signs, zeta and hist; it does not include
  `triple`, so `tuple_buffer` and every tuple SHA-256 are the same bytes. `dotQ` (line 89) reads
  `turbo` and `scale` only.
- The two readers that print the triple, `tests/quant8.rs:71` and `examples/quant8_rows.rs:39`,
  print `direction() as u8`, which is the byte `t as u8` printed from the `i8` (`01`, `ff`, `00`).
- The public field type changes from `[i8; D]` to `[Zero; D]`; `Quant8` keeps its derives
  (`Clone, Debug, PartialEq, Eq`, all of which `Zero` has). No other crate in the repository
  depends on `asolaria-quant-head8` (searched for `asolaria-quant-head8` and `quant_head8` outside
  this directory: 0 files); `quants/cubes` depends on `quants/hyperbehcs`, `model/l0-edge` and
  `sha2` only.
- The other channels keep the types the source gives them: `turbo` (`Int8Array` of
  `Math.round(v * 127)`), `signs`, `zeta`, `quad` (`Uint8Array`), `hist` (`Uint32Array`).

Trit counts in the triple channel (integer counts, `Neg` / `Nil` / `Pos`): the 14 `QUANT8` rows of
`quant8-expected.hbp`, 773 / 12,804 / 759 of 14,336; the 12 `examples/quant8_rows` messages (1, 8,
64, 256, 1,024 and 2,048 MB at seeds 12345 and 99999), 673 / 10,953 / 662 of 12,288. Mutation
check: with the `Zero::Neg` branch changed to `Zero::Nil`, `tests/quant8.rs` fails at
`zeta-edges triple` (the first fixture row holding a `-1`; it holds 6); the file was restored to
its sha256 and the test passes again.

Measured (rustc/cargo 1.81.0, rustfmt 1.7.1, clippy 0.1.81, Python 3.13.16), the same commands
before (HEAD `f67b300`; this directory is unchanged since `f966009`) and after the change, with
`CARGO_TARGET_DIR` in the scratchpad; every saved output compared with `cmp`:

| Check | Before | After |
|---|---|---|
| `sha256sum -c UPSTREAM.sha256` | 6 / 6 OK | 6 / 6 OK |
| `ternary`: `sha256sum -c UPSTREAM.sha256` | — | 6 / 6 OK (the tribit source included) |
| sha256 of `tests/fixtures/number-vectors.hbp`, `quant8-expected.hbp` | `18cfcc3f…aea6a`, `0009983b…27d2` | identical |
| `cargo +1.81.0 fmt --check`; `clippy --locked --all-targets -- -D warnings` | clean; clean | clean; clean |
| `cargo +1.81.0 test --locked` | 27 passed (lib 14, `count_sketch` 3, `number` 3, `quant8` 4, `upstream` 3) | 27 passed, same split |
| `python3 -I tools/referee.py --check` | `number-vectors.hbp` 18,176 rows `match=1`; `quant8-expected.hbp` 63 rows `match=1` | identical lines |
| `referee.py --grid \| number_grid` | `cases=2000000\|differences=0` | identical line |
| `referee.py --log2-grid \| number_grid` | `cases=1343524\|differences=0` | identical line |
| `quant8_rows` over the 12 messages | 12 rows, sha256 `e32a777a…d175`; rows of 1, 8, 64 MB equal the fixture's 6 bench `QUANT8` rows; tuple SHA-256s at 256, 1,024, 2,048 MB equal those in "Node measurements" item 2 | `cmp` identical |
| `quant_bench` (no `--run`) | 12 rows, sha256 `4204100d…d696` | `cmp` identical |
| `quant_bench --run --sizes=1` | header row and `payload_kb=3.1` row as the CI step checks | same (timing fields vary run to run) |
| no-float greps (`src/ tests/ examples/`; `tools/referee.py`) | 0 hits | 0 hits |

The `DOT` rows (3) are checked by `tests/quant8.rs::dot_products_match_the_referee` in both runs.
