# asolaria-quant-head8

Integer-only Rust port of the owner's eight-stage large-message quant head, `quant8` of
ASOLARIA-AS-NEURAL-NETWORK `tools/behcs/quant-huge-message-benchmark.mjs`. It reproduces every
stage's JavaScript output bit for bit: the 1,024 count-sketch accumulators, the eight channels,
`scale`, the 3,200-byte tuple and both dot products. Crate `asolaria-quant-head8`, library
`quant_head8`, `#![forbid(unsafe_code)]`, Rust 1.81, no `f32`/`f64`. One dependency:
`asolaria-ternary` (path `../../ternary`), for the owner's trit `Zero` (see [Trits](#trits)).
Dev-dependencies: `asolaria-l0-edge` (path `../../model/l0-edge`, for one cross-check) and
`sha2` 0.10.9 (tests and examples).

**Lane.** `src/` is hot lane: integers and bit patterns, in process, no Node, V8, Python, JSON or
HTTP. `tools/referee.py` (stdlib Python, integer arithmetic only) and the vendored upstream files
are cold lane and only verify the port. Where every byte came from and how it was checked is in
[`PROVENANCE.md`](PROVENANCE.md).

## The eight stages

Ids from `vendor/Algorithms-of-Asolaria/ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp` (rows
`n=1` to `n=8`); line numbers are those of the vendored `quant-huge-message-benchmark.mjs`.

| n | Registry id | Upstream | Port |
|---|---|---|---|
| 1 | `Q-JL-COUNT-SKETCH-1024-v1` | :52-56 `h = (i * 2654435761) >>> 0; proj[h & 1023] += (h & 0x80000000) ? -msg[i] : msg[i]` | `count_sketch`, `jl_hash` |
| 2 | `Q-TURBO-MAXABS-INT8-v1` | :57-58 `max` from `1e-12`; :67-69 `v = proj[j] / max`, `turbo[j] = Math.round(v * 127)` (Int8Array) | `Quant8::turbo`, `Quant8::scale` |
| 3 | `Q-POLAR-SIGN-BITSET-v1` | :70 `if (v < 0) signs[j >> 3] \|= 1 << (j & 7)` | `Quant8::signs` |
| 4 | `Q-ZETA-LOGMAG4-v1` | :71-72 `a < 1e-9 ? 15 : Math.min(15, -Math.log2(a) \| 0)` (Uint8Array) | `Quant8::zeta`, `log2::log2` |
| 5 | `Q-TRIPLE-TERNARY-v1` | :62 `new Int8Array(D)`; :73 `v > 0.33 ? 1 : (v < -0.33 ? -1 : 0)` | `Quant8::triple` (`[ternary::Zero; D]`) |
| 6 | `Q-QUADRUPLE-2BIT-v1` | :74 `v > 0.5 ? 3 : v > 0 ? 2 : v > -0.5 ? 1 : 0` | `Quant8::quad` |
| 7 | `Q-JS-HIST256-v1` | :75 `hist[(q + 128) & 255] += 1` (Uint32Array) | `Quant8::hist` |
| 8 | `Q-PRIMEPOWER-ACC-v1` | :35-49 `PPOW`; :76 `if (q !== 0) vmAcc += PPOW[j]` | `PPOW`, `Quant8::vm_acc` |

Also ported from the same file: `D` (:18), `CALIBRATION_ROWS` (:20-33), `tupleBuffer` (:81-86,
`tuple_buffer`), `dotRaw` (:88, `dot_raw`), `dotQ` (:89, `dot_q`), `fill` (:91, `fill`/`Fill`)
and the element count `Math.floor(mb * 1048576 / 8)` (:103, `message_dims`). `quant8(msg)` takes
the `Float64Array` elements as `Number`s (their binary64 bit patterns).

`tuple_buffer` is the upstream 3,200-byte layout: 1,024 turbo bytes, 128 sign bytes, 1,024 zeta
bytes and the 256 histogram counts as little-endian `u32`. As the vendored atlas states, "Triple,
Quadruple, prime-power accumulation and `scale` are computed but are not included in that
3,200-byte byte buffer"; `Quant8` returns all of them, as `quant8` does (:78).

## Trits

Owner, 2026-10-17: "we should be working with trinaries and ternaries". Owner rule relayed from
the ACER seat: "reuse tribit/mod.rs, never reinvent". Stage 5 is the channel the owner's source
carries as a trit: line 62 allocates `triple` as an `Int8Array` and line 73 stores only `1`, `-1`
or `0` in it (the vendored atlas, row 5: "`{-1,0,+1}` threshold code"). `Quant8::triple` holds
it as the owner's `Zero` (`Neg = -1`, `Nil = 0`, `Pos = +1`) from `kernel/tribit`
(asolaria-tribit@1292191), which `ternary` re-exports unchanged; the place is row A7 of
`ternary/MIGRATION.md`.

| Where | What it does |
|---|---|
| `src/lib.rs:107` | `pub triple: [Zero; D]` (was `[i8; D]`) |
| `src/lib.rs:288` | starts as `Zero::Nil`, the `Int8Array`'s initial 0 |
| `src/lib.rs:307-313` | `Zero::Pos` when `v > 0.33`, else `Zero::Neg` when `v < -0.33`, else `Zero::Nil`: the same two comparisons as line 73 |
| `tests/quant8.rs:71`, `examples/quant8_rows.rs:39` | print `Zero::direction() as u8`, the byte `t as u8` gave before (`01`, `ff`, `00`) |

`tupleBuffer` (lines 81-86) does not include `triple`, so the tuple and its SHA-256 are the same
bytes. The other channels keep the types the source gives them (`turbo` an `Int8Array` of
`Math.round(v * 127)`, `signs`, `zeta` and `quad` `Uint8Array`s, `hist` a `Uint32Array`). Before
and after the change every committed fixture, referee result and printed row is byte-identical
(`PROVENANCE.md`, "Trits as the owner's `Zero`").

## How the JavaScript numbers are reproduced

| JavaScript | Port |
|---|---|
| `+ - * /` on numbers | `number::Number`: binary64 on bit patterns, exact result then one rounding to nearest, ties to even; signed zeros, subnormals, infinities and NaN included |
| `Math.abs`, `<`, `>`, `===` | `Number::abs`, `lt`, `gt`, `js_eq` (`-0 === 0`; NaN compares false) |
| `Math.round` | `Number::js_round`: nearest integer, ties toward +Infinity, `-0` for `-0.5 <= x < 0` |
| `x \| 0`, `x >>> 0`, Int8Array / Uint8Array / Uint32Array stores | `to_int32`, `to_uint32`, `to_int8`, `to_uint8`, `wrapping_add` |
| `Math.log2` | `log2::log2`: V8's `base::ieee754::log2` (FreeBSD/fdlibm `e_log2.c` with `k_log1p`), statement by statement through `Number` |
| `Math.min(15, n)` on two integers | `i32::min` |
| `(i * 2654435761) >>> 0` | `jl_hash`: the product of two exact integers rounded once to 53 bits (ties to even) for `i >= 3,393,264`, then the low 32 bits |

`l0_edge::jsnum::Dbl` (model/l0-edge) holds non-negative normal values with `+ * /` and no
subtraction; line 55 adds signed values and V8's `log2` subtracts, so this crate carries its own
signed `Number`. A test checks that the two agree bit for bit on `Dbl`'s domain (20,000 cases).

`count_sketch` keeps each bucket as an integer count of `2^-unit` while every addend and every
partial sum is a whole number of units below `2^53` units: each such sum is a binary64 value, so
each JavaScript `+=` returns it unrounded. The first addend that would leave that range converts
all buckets to their exact `Number`s and every later `+=` rounds through `Number`.
`tests/count_sketch.rs` compares this with line 55 taken literally (every `+=` through `Number`)
over 600 mixed vectors and the transitions (finer units, sums reaching `2^53` units, values
above it, subnormals, zeros, NaN, infinities).

## Measured agreement

| Check | Cases | Result |
|---|---|---|
| Rust `count_sketch` + all channels + `scale` + tuple SHA-256 vs `tools/referee.py`, `tests/quant8.rs` | 14 messages: 8 constructed (empty; signed zeros, subnormals, extremes, NaN, infinities; shared buckets; below the `1e-12` floor; every zeta, triple, quad and rounding edge; 2 × 3,000 random patterns) and the benchmark's `fill` messages of 1, 8 and 64 MB at seeds 12345 and 99999 | all equal, bit for bit |
| `dot_q`, `dot_raw` vs the referee | the 1, 8 and 64 MB message pairs | all equal |
| Vendored upstream `quant8` run under Node v22.22.0 (V8 12.4.254.21) vs the referee fixture | the same 14 messages | all `QUANT8` rows byte-identical |
| Vendored upstream `quant8` under Node vs `examples/quant8_rows` | `fill` messages of 256, 1,024 and 2,048 MB at both seeds | all 6 rows byte-identical |
| `Number` and `log2` vs the referee, `tests/number.rs` | 18,176 fixture rows | all equal |
| `referee.py --grid \| number_grid` | 2,000,000 (`+ - * /`, `<`, `Math.round`, `ToInt32`, `Math.log2` on random operands) | 0 differences |
| `referee.py --log2-grid \| number_grid` | 1,343,524 (every pattern within 4,096 ulps of `2^-k`, k = 0..34, and of `1e-9`, and 2^20 points over `[1e-9, 1]`) | 0 differences |
| The referee's V8 `log2` mirror vs Node's `Math.log2` | the 1,343,524 grid inputs | 0 differences |
| The referee's operators vs Node | the 2,000,000 grid cases and the 18,176 fixture rows | 0 differences |

## Measured behaviour of the upstream code (what the port reproduces)

- **The hash product is rounded for `i >= 3,393,264`.** `i * 2654435761` exceeds `2^53` there, so
  JavaScript rounds the product to 53 bits before `>>> 0` (line 54) and its low bits are zero.
  The rounding leaves a product unchanged when it is already a multiple of the rounding step
  (`i = 3,393,264` gives 9,007,201,308,113,904, which is even). Counted over the benchmark sizes
  with the exact product in `u128`, rounded in integers, which equals the crate's `jl_hash` on
  every element:

  | Message | Elements | Elements with product `>= 2^53` (rounded to 53 bits) | Product changed by the rounding | Buckets the `>= 2^53` elements reach | Elements in the widest rounding class | Buckets that class reaches |
  |---|---|---|---|---|---|---|
  | 1 MB | 131,072 | 0 | 0 | — | — | — |
  | 8 MB | 1,048,576 | 0 | 0 | — | — | — |
  | 64 MB | 8,388,608 | 4,995,344 | 2,898,192 | 512 | 1,602,081 | 256 |
  | 256 MB | 33,554,432 | 30,161,168 | 24,670,752 | 512 | 6,408,326 | 64 |
  | 1,024 MB | 134,217,728 | 130,824,464 | 121,940,784 | 512 | 25,633,304 | 16 |
  | 2,048 MB | 268,435,456 | 265,042,192 | 254,461,880 | 512 | 51,266,609 | 8 |

  Every benchmark message reaches all 1,024 buckets: its first 1,024 elements already do, since
  2654435761 is odd.
- **Zeta truncates the binary64 `Math.log2`.** Over the 1,294,367 log2-grid inputs in
  `[1e-9, 1]`, the zeta value line 72 computes differs from `min(15, floor(-log2 a))` of the real
  number in 18 inputs: `a = 2^-k (1 + 2^-52)` for k = 5 to 15 and `a = 2^-k (1 + 2^-51)` for
  k = 9 to 15, where `Math.log2(a)` returns exactly `-k`, so line 72 gives `k` and the real floor
  is `k - 1`. The port gives the JavaScript value.

## Benchmark receipts and this machine

`examples/quant_bench` is the tool's command line over the port: without `--run` it prints
`CALIBRATION_ROWS`; with `--run [--sizes=a,b] [--disk]` it prints the `runLiveBenchmark` rows
(same fields, same `toFixed` digits), timing this port. Durations depend on the machine and its
load, as the tool's own footer row says.

Owner receipts (vendored): acer, Node v24.13.1, Intel Core i5-8300H
(`docs/ACER-QUANT-HUGE-MESSAGE-BENCH-2026-06-11.hbp`), and liris, Node v24.13.1
(`docs/LIRIS-QUANT-HUGE-MESSAGE-BENCH-READBACK-2026-06-11.hbp`, sizes 1, 64 and 256 MB). This
machine: 4 vCPU Intel Xeon @ 2.10GHz, 15 GB, shared with other jobs. Four runs on 2026-10-17,
each the vendored tool under Node v22.22.0 with `--run --sizes=1,8,64,256,1024,2048 --disk` and
then `quant_bench` with the same arguments, one after the other, at 1-minute load averages of
12.1 to 16.7. Run 4 left out 2,048 MB (under 3 GB of disk was free for its 2 GB `raw.bin`), and
the port half of run 1 overlapped 80 short `quant_bench --run --sizes=1` runs.

| Message | acer head_ms | liris head_ms | Node here, `head_ms` in runs 1, 2, 3, 4 | Port here, `head_ms` in runs 1, 2, 3, 4 |
|---|---|---|---|---|
| 1 MB | 1.3 | 2.2 | 2.9, 4.6, 3.0, 3.1 | 1.3, 1.1, 3.1, 3.1 |
| 8 MB | 14.7 | — | 9.1, 5.4, 10.2, 7.6 | 9.6, 7.7, 8.7, 6.2 |
| 64 MB | 25.2 | 53.3 | 29.3, 28.5, 48.2, 30.2 | 49.1, 42.5, 68.8, 43.4 |
| 256 MB | 123 | 88.2 | 159.7, 133.2, 215.2, 99.4 | 195.8, 256.5, 295.5, 178.9 |
| 1,024 MB | 574 | — | 412.1, 650.7, 833.2, 374.9 | 730.6, 995.4, 953.1, 882.1 |
| 2,048 MB | 1,062 | — | 818.0, 1,254.0, 1,135.4, — | 2,049.2, 1,953.8, 1,809.1, — |

From 64 MB up, the port's `head_ms` is above Node's in every run; at 1 and 8 MB the order
changes from run to run. The pairs move with the machine's load (the same message took Node
374.9 to 833.2 ms at 1,024 MB), so they describe these four runs on this machine, not a fixed
relation between the port and V8.

Deterministic fields reproduce exactly: `D=1024` and `payload_kb=3.1` (3,200 bytes) in all 46
rows, and each message's tuple is the same bytes under Node and under the port. The acer
receipt (rows 3-8) gives gains without their timing pairs, for example 64 MB
`sha_gain=4774x|write_gain=158x|compare_gain=166x` and 2,048 MB
`sha_gain=79303x|write_gain=4662x|compare_gain=1698x`. The liris receipt (rows 4-6) records
the raw and quant times, as the tool prints them:

| Message, step | liris receipt, raw to quant ms | Node here, raw / quant ms in runs 1, 2, 3, 4 |
|---|---|---|
| 1 MB sha | 1.5 to 0.043 | 1.5 / 0.034, 1.4 / 0.028, 1.4 / 0.038, 1.7 / 0.043 |
| 1 MB write | 1.1 to 0.564 | 0.8 / 0.463, 0.5 / 0.119, 0.5 / 0.133, 0.4 / 0.106 |
| 1 MB compare | 1.4 to 0.360 | 1.7 / 0.248, 1.7 / 0.185, 1.7 / 0.189, 2.5 / 0.185 |
| 64 MB sha | 54.6 to 0.032 | 89.7 / 0.052, 61.8 / 0.051, 98.8 / 0.053, 52.4 / 0.071 |
| 64 MB write | 186.4 to 0.634 | 581.6 / 0.588, 74.7 / 0.207, 304.3 / 0.192, 194.4 / 0.135 |
| 64 MB compare | 14.1 to 0.106 | 55.0 / 0.039, 23.8 / 0.036, 43.6 / 0.042, 22.5 / 0.036 |
| 256 MB sha | 218.3 to 0.057 | 350.0 / 0.056, 250.0 / 0.052, 446.3 / 0.052, 209.7 / 0.053 |
| 256 MB write | 842.8 to 0.736 | 1,516.8 / 0.264, 1,315.9 / 0.210, 1,451.6 / 0.281, 859.1 / 0.162 |
| 256 MB compare | 59.2 to 0.470 | 117.0 / 0.038, 201.5 / 0.038, 189.4 / 0.043, 88.6 / 0.037 |
| 2,048 MB sha | — | 1,878.0 / 0.057, 3,122.7 / 0.061, 2,159.6 / 0.066, — |
| 2,048 MB write | — | 5,068.5 / 0.192, 6,324.5 / 1.157, 5,597.4 / 0.152, — |
| 2,048 MB compare | — | 749.1 / 0.136, 956.2 / 1.625, 1,047.7 / 3.258, — |

The port's `cmp_raw_ms` times `dotRaw` through integer binary64 (the exact JavaScript sum):
12,758.6, 15,422.6 and 11,984.2 ms at 2,048 MB in runs 1 to 3, where V8's loop took 749.1,
956.2 and 1,047.7 ms, so the port's raw-compare time is not the receipt's quantity. `e2e_gain`
and `ingest` appear in the receipts and in `CALIBRATION_ROWS`; the vendored tool prints no such
field and contains no formula for them.

`quant_bench --sizes` takes decimal integers, optionally signed, and drops every entry that is
not above 0, as line 134 filters them (`n > 0`: `-5`, `0` and an empty entry, `Number('') = 0`).
Upstream's `Number()` also accepts forms such as `1.5`, `1e3` or ` 64`, which the port refuses
with a message.

## Tests and referees

```
cargo +1.81.0 test --locked                          # all fixtures, the literal line-55 check, upstream rows
python3 -I tools/referee.py --check                  # regenerates both fixtures in memory and diffs them
python3 -I tools/referee.py --grid | cargo +1.81.0 run --locked -q --release --example number_grid
python3 -I tools/referee.py --log2-grid | cargo +1.81.0 run --locked -q --release --example number_grid
cargo +1.81.0 run --locked -q --release --example quant8_rows -- 256:12345
cargo +1.81.0 run --locked -q --release --example quant_bench -- --run --sizes=1,64
```

| File | Written by | Content |
|---|---|---|
| `tests/fixtures/number-vectors.hbp` | `tools/referee.py` | `CASE` rows: operator, operands and result as bit patterns (`nan` for every NaN) |
| `tests/fixtures/quant8-expected.hbp` | `tools/referee.py` | `CONST`, `PPOW`, `INPUT` (bit patterns or `fill_len`/`fill_seed`), `PROJ` (the 1,024 accumulators), `QUANT8` (every channel, `scale`, tuple SHA-256) and `DOT` rows |

Every data file is HBP text. The upstream unit test (vendored) checks determinism and the tuple
size on `Math.sin(i)` and `Math.cos(i)` inputs; `tests/upstream.rs` makes the same checks on
`fill` inputs of the same lengths, since V8's `Math.sin` and `Math.cos` are not ported here.
