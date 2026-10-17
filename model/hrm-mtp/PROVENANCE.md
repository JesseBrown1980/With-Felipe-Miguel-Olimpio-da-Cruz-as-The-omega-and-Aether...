# Provenance: asolaria-hrm-mtp

This crate brings in two owner components as integer-only Rust 1.81:

1. The prediction triad of `bigpickle-rebuild`: `hilbert.mjs` (Layer 1), `zeta-process.mjs` (Layer 2),
   `hrm-slow-fast.mjs` (Layer 3), `mtp-heads.mjs` (Layer 4) and the MTP pre-warm of
   `PIDChainRevolver` (`pid-chain-revolver.mjs:12,53-87`, with the `mintPID` tuple form and
   `glyphAt` it calls). The layer numbers are upstream's (`mtp-heads.mjs:4-9`).
2. The HRM and MTP slice agents of the universe simulator: `hrm_agent()` (Law 25) and
   `mtp_agent()` (Law 24) of `players/rime_agents.py`, and the sector play of
   `players/rime_windunwind.py` (Fischer wind / unwind, MTP+, MTP-, HRM).

## Lanes

| Lane | What runs there | Here |
|---|---|---|
| Hot (per request, in process) | Rust only, integers, HBP text, SHA-256. No Node, JSON, HTTP or Python. | `src/` |
| Cold (verification) | Stdlib Python referees in integer arithmetic only; floats run only inside the vendored owner code they execute unchanged (`rime_agents.py`, and `rime_windunwind.py` under numpy). | `tools/`, `vendor/` |

The vendored `.mjs` files are pinned bytes. Nothing in this crate or its CI executes them; their
numbers are reproduced by `tools/triad_referee.py`, a stdlib Python mirror of each upstream line in
integer arithmetic: each JavaScript number is held as its binary64 bit pattern, and each `+ - * /`
is the exact integer result rounded to nearest, ties to even, as ECMAScript specifies.
`tools/rime_referee.py` reads the binary64 values the vendored Python returns exactly
(`float.as_integer_ratio()`) and compares them in integers.

## Vendored upstream files

Every file under `vendor/` is byte-identical to its upstream (`git hash-object` gives the blob id;
CI runs `sha256sum -c UPSTREAM.sha256`). Each was read in full and scanned for personal data
(names of private people, phone numbers, e-mail addresses, chats, LAN addresses, keys) before
copying; none was found in these files. The owner's name in the universe simulator headers
("Operator: Jesse Daniel Brown") is the author line of the owner's own files.

| Vendored path | Upstream repository @ commit | Upstream path | Git blob | sha256 |
|---|---|---|---|---|
| `vendor/bigpickle-rebuild/src/hilbert.mjs` | `JesseBrown1980/bigpickle-rebuild` @ `c592599c8f3d000b07cd5f4218b7d6b24d49d7d5` | `src/hilbert.mjs` | `1a22e1b6b07d80dd9637cc2f50079d1fe471e46e` | `42effd8efaf03d8592b0003dda6ec432ce6d06c55474befe0704caf23f2fc677` |
| `vendor/bigpickle-rebuild/src/primes.mjs` | same | `src/primes.mjs` | `12d767bd80d91f64fe89ee930fc3820434bd22e2` | `ff81e1942c1c2d567890d129437f0edf92a3cdaf38ea3b16796611f6efb6fee4` |
| `vendor/bigpickle-rebuild/src/zeta-process.mjs` | same | `src/zeta-process.mjs` | `7719eb0eceb910783351b48586af0d0f9dc73a10` | `003e7c16e6c5c4d3bd1fd1828a95da2ae2f180d9753d54969c299f56840352b2` |
| `vendor/bigpickle-rebuild/src/hrm-slow-fast.mjs` | same | `src/hrm-slow-fast.mjs` | `0242a39e8babd704239128f88accdf6aff3de287` | `34263085fe1c2dfcf11cc390878b3c69d2801d1abf0034f07d89b15db410513a` |
| `vendor/bigpickle-rebuild/src/mtp-heads.mjs` | same | `src/mtp-heads.mjs` | `b7bbfe62fdf971535e046f422c9d9b657b165339` | `1a346475a619a94a319e54068b9735834dfff0aa87e68325cec550506db4790c` |
| `vendor/bigpickle-rebuild/src/pid-chain-revolver.mjs` | same | `src/pid-chain-revolver.mjs` | `33511654a76966e6631cac94945cc1ed167a5cdf` | `d673f8250e97cd1ee38b63d4a6580dc270c7480c4cf8710a6cfe20d9bc7016ae` |
| `vendor/bigpickle-rebuild/src/pid-minter.mjs` | same | `src/pid-minter.mjs` | `b953e1013b327cc7e5cd90b82e41f818092fb2f1` | `14138b3dd94e27264d0b04701b190d1956c3100230af8f7a7c5381ba06e086c5` |
| `vendor/bigpickle-rebuild/src/behcs.mjs` | same | `src/behcs.mjs` | `c7aead370a2ab4acbc767cd96dbce885ada8209e` | `fbc055c1b0b3b1ebf6900bff46098913b3ab68987beac0e11ddb1b7980790b48` |
| `vendor/bigpickle-rebuild/tests/hrm-slow-fast.test.mjs` | same | `tests/hrm-slow-fast.test.mjs` | `51f07c1150044f520e0e67576b51e1f0120478f7` | `e927c9dd00df93d0bdab8e33f53512192d94ed7fac12aefe4e3eb9037c312bb9` |
| `vendor/bigpickle-rebuild/tests/mtp-heads.test.mjs` | same | `tests/mtp-heads.test.mjs` | `ccc86bfcd51da480d07d05a67118c2933140cfd4` | `0a51a36820ae3fe41cd083c212bacaaf74365d5fadc254e10b7b07a9fdc249a7` |
| `vendor/bigpickle-rebuild/tests/zeta-process.test.mjs` | same | `tests/zeta-process.test.mjs` | `67263d7bc72c4a404308c369f55f973f790d4b39` | `904c71c58f5a3955df6a90f5e9bf3e5354c9dad9c313b5771978e61581542d34` |
| `vendor/universe-simulator/players/rime_agents.py` | `JesseBrown1980/ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills` @ `3f9f42dab6247c40b30921b253e3f73c9e942ca5` | `players/rime_agents.py` | `824b17b0e7207f041732c048c321489b75d76c3f` | `a15f6a5c66f5cb1e33904b43905c9dfdd829f8cebecab4240e0cfd8bd9f62e1c` |
| `vendor/universe-simulator/players/rime_sphere.py` | same | `players/rime_sphere.py` (imported by rime_agents.py:23) | `449ac82b82223349ca8fc41d8e9b005fd3beda06` | `519b39cd1e0ff1879ddbc67b0dcf05c01e99ae4684ae22de63b511755335f7f3` |
| `vendor/universe-simulator/players/rime_windunwind.py` | same | `players/rime_windunwind.py` | `29117c28a5a7f481c29d8cce0c1129f771512419` | `c6328050dd16b54f9d42f207918dfe6977dfb1c12957c39ca06eaac231d04b8f` |
| `vendor/universe-simulator/receipts/operator/rime_agents.txt` | same | `receipts/operator/rime_agents.txt` | `0a9b35e973395126ec8b7612a04d055ad048f5fc` | `82e8af9d0e35e0428eb0a5666a511828efc3eb954fd613366b4a0df889adfe54` |
| `vendor/universe-simulator/receipts/operator/rime_windunwind.txt` | same | `receipts/operator/rime_windunwind.txt` | `cc32ddbb82d59f7d99f937293718a479a71a921e` | `613da496edc71d64170c5968a6c62a6b5d8f149ece554dbd5697662480a6203b` |

Cited but not vendored:

- `bigpickle-rebuild` `tests/integration/triad-chain.test.mjs` (blob `f5d9e222452301a133e43306eacad65a850da997`,
  sha256 `6427ee3ec5b90ac58421294ad88303615fdafa364570c339da2908160d0d07bb`): line 198 holds a LAN
  address as the default Redis host, so the file is not copied. Its chain links 1-3 (lines 17-69) are
  ported as tests in `tests/upstream_mtp_heads.rs`; links 4-5 and the LIVE test (lines 71-232) exercise
  `cosign-bridge.mjs` and `redis-bridge.mjs` over HTTP / Redis / JSON, which this hot-lane crate does not
  carry.
- `bigpickle-rebuild` `tests/mtp-benchmark.test.mjs` (blob `976c631e97549076e222051f2426e3b476779c38`): wall-clock
  timings; the deterministic heads it prints are inside the `mtp_heads` sweep of `tests/fixtures/triad.hbp`.
  Its stated purpose (lines 5-7): "decide whether the "x3 speedup like Gemma-4 MTP drafters" claim is
  empirically justified for this codebase BEFORE the operator builds the drafter+verifier shim or markets
  the number". MEASURED (wall clock, this container, Node v22.22.0, `node --test` on a scratch copy of
  the file and `src/`, 3 runs): every run printed its verdict line (lines 134-142) "VERDICT: parallel
  SLOWER than sequential — x3 claim NOT JUSTIFIED (overhead dominates)", as recorded in
  `scratchpad/universe/mtp.md`. Its own note (line 10): `"Parallel" K=4 heads in mtp-heads.mjs is a
  synchronous for-loop in JS.`
- `Asolaria-ASI-On-Metal-Fabric-and-matrix` @ `a1a707835c087c2215c50a805bdad0c0f5e06a2a` (public, cloned
  for this crate): see [The Falcon copies](#the-falcon-copies-asi-on-metal).

## What is ported

| Upstream | Port | Number handling |
|---|---|---|
| `hilbertDecode`, `hilbertEncode` and helpers (hilbert.mjs:13-155) | `src/hilbert.rs` | int32 operations on `i32`; domain `dimensions * bits <= 31`, decode index below 2^53, encode coordinates in the int32 range |
| `sieveFirstNPrimes`, `PRIMES`, `primeAt` (primes.mjs:5-29) | `src/primes.rs` | the sieve bound uses `Math.log` as V8 computes it (9841 for n = 1000) |
| `vonMangoldt`, `divisors`, `nuLambda`, `nuLambdaTable`, `bandWeight`, `deterministicUnit`, `vonMangoldtNext`, `predictKPositions`, `chainAntichainBound`, `HONEST_GAPS` (zeta-process.mjs:25-163) | `src/zeta.rs` | weights, sums, the sampled threshold and `u <= acc` through `l0_edge::jsnum::Dbl`; Mulberry32 on `u32` |
| JavaScript `Math.log` | `src/fdlibm.rs` | V8 12.4.254.21 (Node 22) `src/base/ieee754.cc:1638-1717` (blob `e71b63fd7c17711e5dc04d9acc040be0aa0b7c40`), line for line on `src/sf64.rs` |
| `cpToBhCoord`, `mtpHeads`, `preWarmCandidates`, `measureHitRate` (mtp-heads.mjs:24-107) | `src/mtp.rs` | `hit_rate` as `Dbl` |
| `SHAPES`, `slowLoopPredictShape`, `shapeRecord`, `fastLoopRefinePosition`, `applyShapePull`, `hrmShapedPrediction` (hrm-slow-fast.mjs:23-149) | `src/hrm.rs`, `src/trig.rs` | branch / cascade / star / fractal pulls exact on `Sf64`; spiral / fold / ring see below |
| `PIDChainRevolver` constructor, `next`, `reset`, `preWarm` (pid-chain-revolver.mjs:18-88); `mintPID` tuple form, `sha16` (pid-minter.mjs:15-53,75-84); `glyphAt` (behcs.mjs:10-12,26-35) | `src/revolver.rs` | SHA-256 via `sha2` 0.10.9 |
| `hrm_agent()` (rime_agents.py:101-132), `mtp_agent()` (rime_agents.py:65-98) | `src/rime.rs` | exact integer counts; bpc as a Q64 sum of integer multiplicities of `log2(v)` |
| `freeze2`, the bank, `primitive_root`, the sphere, `mtp_bits`, `hrm_bits`, the sector loop (rime_windunwind.py:24-99) | `src/rime.rs` `windunwind` | as above; the wall-clock timings and the JSON dump (lines 80-107) are not reproduced |

### JavaScript number semantics

- **`Math.log`.** V8 computes it with its fdlibm port; the platform `math.log` of Python is a
  different routine. MEASURED (Node v22.22.0, V8 12.4.254.21-node.33, this container): the
  integer referee's `v8_log` and the port's `fdlibm::log_int` each equal Node's `Math.log` bit for
  bit on every integer 1..2^20 (1,048,576 values); glibc's `math.log` differs from Node's on 9,332
  of them. The port and the Python referee both use the fdlibm algorithm.
- **`Math.sin`, `Math.cos`.** ECMAScript leaves them implementation-approximated and V8 builds either
  fdlibm or glibc's routine (`ieee754.cc:1351,2447`). MEASURED: glibc's `math.sin` / `math.cos`
  differ from Node's in the last bits on 461 of 12,288 arguments `i * 0.7`, `i * 0.4`, `i * Math.PI / 4`
  (i < 4096). Upstream only passes them through `Math.round` (hrm-slow-fast.mjs:109,110,112), so the
  port evaluates sine and cosine of the exact double argument in Q112 and returns the rounded integer
  when the exact value lies at least 2^-40 from a rounding tie, with `|scale| <= 48` and, for a
  nonzero sine, `|offset| < 2^10` (`JsError::Domain` otherwise; never reached in the sweeps). Under
  those bounds every engine whose sine and cosine lie within 2^-46 of the true values rounds to the
  same integer: 48 * 2^-46 for the engine error, plus at most 2^-48 for the binary64 product and
  2^-43 for the binary64 sum, stays below 2^-40 (`src/trig.rs:1-12`). The ring pull adds
  `candidateCp` inside its `Math.round` (line 112); `candidateCp` exceeds 1023 only at iteration 0,
  where the argument is `0 * Math.PI / 4` and `Math.sin(+0)` is exactly +0, so the pull returns
  `candidateCp` itself for any `currentCp` below 2^52 (the `fast_loop_large_cp` sweep, `currentCp`
  32,767 to 4,294,967,311). MEASURED smallest exact distance from a tie, in units of 2^-112, by the
  integer referee: 58152569954780123262115429654208 over the `fast_loop` sweep (294,336 roundings;
  above 2^-7) and 167908183764915442954809090018 over `fast_loop_long` (12,000 roundings, 400
  iterations; above 2^-15); the port's own Q112 values are 58152569954780123262115429654176 and
  167908183764915442954809090240. The referee asserts at least 2^-40 on every one of its 308,420
  trig roundings (`TIES` rows of `tests/fixtures/triad.hbp`).
- **Everything else** (`+ - * /`, `Math.round`, `Math.ceil`, int32 and uint32 operations) is exact:
  `l0_edge::jsnum::Dbl` (a path dependency on `model/l0-edge`, not a copy) for the non-negative
  zeta arithmetic, and `src/sf64.rs` where upstream subtracts, carries a sign or reads the high word
  of a double, which `Dbl` does not provide. `tests/sf64.rs` checks both agree on a grid of ratios,
  sums, products and quotients.

### Ported domain

Inside it every result equals upstream's. Outside it every entry point that returns
`Result<_, JsError>` returns `JsError::Domain`; the functions that return a plain value
(`divisors`, `deterministic_unit`, `von_mangoldt_next`, `head_seed`, `round_sin`, `round_cos`,
`log`, `log_int`) panic with the reason (README, "Errors"):

- Hilbert: `dimensions * bits <= 31` (upstream's int32 arithmetic is exact there); decode
  `index < 2^53`; encode coordinates in the int32 range `-2^31..2^31`. Upstream applies no range
  check to the coordinates: `hilbertEncode([-1,0,0], {dimensions:3, bits:4})` is 3584,
  `hilbertEncode([0,-5], {dimensions:2, bits:4})` 79 and `hilbertEncode([3,-2,7,1],
  {dimensions:4, bits:4})` 30110 (the `HENC` rows and the `hilbert_signed` sweep).
- zeta: `step < 2^22` (`(step >>> 0) * 0x6d2b79f5` exact in binary64), so `predictKPositions` `k`
  and `mtpHeads` `depth` at most 2^22; `cp < 2^52` (`predictKPositions`, `mtpHeads` and `preWarm`
  `cp0`, fast-loop `currentCp`); head counts `k < 2^21` (`mtpHeads`, `hrmShapedPrediction`).
- fast-loop `iterations <= 16,384` (trig arguments below 2^14).
- Integers only: upstream also accepts non-integer or non-number arguments (`2.5`, `'x'`, `NaN`,
  `undefined`); the typed API has no way to pass them. The upstream tests that pass such values are
  ported with the representable arguments, noted per test.

Errors upstream throws come back with upstream's text, in upstream's order: a `PIDChainRevolver`
built with an alphabet other than 256 or 1024 gives `mintPID`'s RangeError (pid-minter.mjs:27)
from `next()` and, after `mtpHeads`' own checks, from `preWarm()`, and a lane outside the cycle is
quoted as `JSON.stringify` quotes it (pid-minter.mjs:40); the `ERR` rows of the triad fixture.

## Referees and measurements

| Check | Command | Result (this container) |
|---|---|---|
| Python mirror vs the real upstream JavaScript | the vendored `.mjs` copied to a scratch directory and run under Node v22.22.0 by a probe printing the referee's rows (measurement only; not part of this crate or its CI) | all 258 rows the probe prints, including every sweep hash, appear verbatim in `tests/fixtures/triad.hbp`; the 9 fixture rows it does not print are the 3 comments, `HALF_PI_Q112` (Machin's formula), the `deterministic_unit` sweep (not exported upstream; it feeds every `von_mangoldt_next` row) and the 4 `TIES` rows |
| Fast loop vs the real upstream JavaScript on random arguments | 6,012 `fastLoopRefinePosition` runs from a fixed LCG (all 8 shapes, `currentCp` below 2^45 plus 12 runs near 2^52, iterations 1 to 400, any seed) under Node v22.22.0 and through the port in release and debug builds (measurement only) | 6,012 of 6,012 equal in both builds (final cp and the path's sha256); 727 are ring runs, 374 of them with an iteration-0 candidate of at least 2^15 |
| Integer Python mirror writes the triad fixture | `python3 -I tools/triad_referee.py --check` | OK, 267 rows, 25 s CPU; every row the previous binary64-float mirror wrote is unchanged |
| Rust reproduces every fixture row and sweep | `cargo +1.81.0 test --locked` | `tests/referee.rs` 18 passed |
| The ported domain | same | `tests/domain.rs` 4 passed |
| Upstream unit tests | same | `upstream_hrm_slow_fast` 16, `upstream_zeta_process` 19, `upstream_mtp_heads` 18 (14 + triad links 1-3) passed |
| Agents on synthetic bytes | `python3 -I tools/rime_referee.py synthetic --check`; `tests/rime.rs` | fixture unchanged |
| Sector play on synthetic bytes | `python3 -I tools/rime_referee.py windsynth --check` (rime_windunwind.py:28-92 mirrored in integers on a 200,000-byte bank and two sectors of 30,000 and 20,000 bytes); `tests/rime.rs` | fixture unchanged; `tests/rime.rs` 5 passed. The vendored `freeze2`, `mtp_bits` and `hrm_bits` run unchanged under numpy 2.5.4 on the same bank and sectors (measurement only) print the same four-decimal MTP+ / MTP- / HRM values and the same deep counts (29,664 and 19,757) |
| Agents on enwik8 | `cargo run --release --example rime_agents -- enwik8`, then `python3 -I tools/rime_referee.py agents --enwik8 enwik8 --rust <output>` | 18 checks, 0 failures |
| Wind / unwind on enwik9 | `cargo run --release --example rime_windunwind -- enwik8 enwik9`, then `python -I tools/rime_referee.py windunwind ...` (numpy 2.5.4) | see `tests/fixtures/rime-windunwind-enwik9.hbp` and the section below |

Sweep sizes in `tests/fixtures/triad.hbp`: `math_log` 65,536 integers; `von_mangoldt` 8,193;
`nu_lambda` 2,049; `deterministic_unit` 1,536; `von_mangoldt_next` 165,150 (cp 0..1100 x 10 seeds x
steps 0..14); `predict_k_positions` 19,818; `hilbert` 26,380 decodes (3-D x 4 bits all 4,096 cells,
and ten other shapes with encode round trips); `mtp_heads` 8,808 calls; `fast_loop` 130,816 runs;
`fast_loop_long` 30 runs of 400 iterations; `hilbert_signed` 2,304 encodes of int32 coordinates;
`fast_loop_large_cp` 864 runs (`currentCp` 32,767 to 4,294,967,311).

### Measured values (owner receipts reproduced)

`mtpHeads(500, {k:4, depth:1, seed:0})`: cp 20, 4, 125, 250; cells [2,1,3], [1,1,0], [1,5,1], [5,2,3];
`PIDChainRevolver({anchor:'TEST-ACER'}).preWarm({cp0:500})`: `9fd3da223f4cc3b5`, `763aff286097360d`,
`12361534f342da2b`, `5c18135180caa58f` (the values in the estate notes from Node runs).

`rime_agents.py` on the first 600,000 bytes of enwik8 (= of enwik9, which upstream reads):

```
  direction 0 (hold)     : accuracy 1.0000  — the free center, costs nothing, says nothing
  direction + (forward)  : x1 0.3517   x3 0.0667   x27 0.0000
  direction - (backward) : x1 0.3317   (frozen on reversed time — real, ~symmetric)
  levels used: deep(27-ish ctx) 99%  mid(3-ish) 0%  base(rime floor) 0%
  frozen hierarchical bpc on held-out enwik8 = 3.5328
```

These five lines equal lines 12-14 and 19-20 of the owner's `receipts/operator/rime_agents.txt` and
the vendored Python's own output. Exact counts: MTP hits x1 422/1200, x3 80/1200, x27 0/1200,
back1 398/1200; HRM n = 99,998 bytes, routed deep 99,012, mid 986, base 0; 973 distinct `log2`
terms. HRM bits / n, as decimal renderings of integers: exact 3.53283438286149332310 (20 decimals,
from the referee's 192-bit fixed-point base-2 logarithms); the port's Q64 sum, printed truncated to
15 decimals, 3.532834382861493 (floor of the difference: -32,311 x 10^-20, the truncated digits);
the upstream binary64 sum, as Python prints it, 3.5328343828613167 (floor of the difference from
the exact value: -17,664,317 x 10^-20). The printed four decimals are 3.5328 for all three; the
exact value lies 15,617,139 x 10^-12 from the nearest rounding boundary (`tie_margin_1e-12` of the
`HRMAGENT` row).

The float boundary: upstream adds 99,998 binary64 values `-math.log2(q)` in sequence, with `q` the
rounded quotient and `math.log2` the platform's routine, so its last digits depend on the libm and
the order of additions. The port keeps every count exact and evaluates the same sum once, in Q64.

`rime_windunwind.py` (bank = enwik8, 27 sectors of 37,037,037 bytes of enwik9). MEASURED, the port
(`rime_windunwind` example, 23 s wall clock, release) against the vendored script run unchanged by
`tools/rime_referee.py windunwind` under numpy 2.5.4 (the script printed "WIND/UNWIND COMPLETE in
431.0 s"; the referee run took 458 s wall clock), 139 checks, 0 failures:

- Bank: T0 = 100,000,000; sphere generator g = 11, W = 57,370 (P = 103,681, N = 20,736).
- Every sector: 0-check `True`; the MTP+, MTP- and HRM values printed to four decimals and the
  `(deep N%)` share equal upstream's print (`deep 100%` in all 27) and the owner's
  `receipts/operator/rime_windunwind.txt`. Routed deep per sector: 37,023,930 to 37,035,677 of
  37,037,035 bytes.
- Totals over 999,999,945 scored bytes: MTP+ 3.1154 (port 3.115436289889061, the Q64 sum truncated
  to 15 decimals; upstream's binary64 value as Python prints it 3.1154362898890606), MTP- 3.1154
  (3.115436293641071; upstream 3.115436293641071), HRM 3.1151 (3.115141681101061; upstream
  3.1151416811010617), equal to the receipt's closing line "MTP+ 3.1154 = MTP- 3.1154 bpc ... |
  HRM 3.1151 (100% deep)". Exact binary64 value minus the 15-decimal port value, floor in units of
  10^-20: MTP+ -37,185, MTP- -11,381, HRM 71,027.
- Per-sector upstream binary64 values (numpy `np.log2` and pairwise `sum`), read exactly, minus the
  port's Q64 values (within 7 x 10^-18 of the exact sums): -47,240 to +39,353 in units of 10^-20
  (floor), over the 81 values.
- Upstream's own flag (rime_windunwind.py:17-18): sectors 0-2 lie inside enwik8, the bank they are
  scored against.
- The receipt's sector lines carry no `(deep N%)` suffix and its closing lines are worded
  differently from the print statements at rime_windunwind.py:97-99,108-113; every number in it
  equals the port's and the script's.

## enwik data

| File | Source | sha256 | md5 |
|---|---|---|---|
| `enwik8.zip` | `https://mattmahoney.net/dc/enwik8.zip` (fetched 2026-10-17) | `547994d9980ebed1288380d652999f38a14fe291a6247c157c3d33d4932534bc` | |
| `enwik8` (100,000,000 bytes) | in the zip | `2b49720ec4d78c3c9fabaee6e4179a5e997302b3a70029f30f2d582218c024a8` | `a1fa5ffddb56f4953e226637dabbb36a` |
| `enwik9.zip` | `https://mattmahoney.net/dc/enwik9.zip` (fetched 2026-10-17) | `99cdb5ac84392252d3f0912ccedd195bc95bd80cbef3b0cdf2eee4ad9a3b7a51` | |
| `enwik9` (1,000,000,000 bytes) | in the zip | `159b85351e5f76e60cbe32e04c677847a9ecba3adc79addab6f4c6c7aa3744bc` | `e206c3450ac99950df65bf70ef61a12d` |

The first 100,000,000 bytes of enwik9 hash to the enwik8 sha256 above (MEASURED). Neither file is
committed; CI downloads and checks them.

## The Falcon copies (ASI-On-Metal)

`Asolaria-ASI-On-Metal-Fabric-and-matrix` @ `a1a707835c087c2215c50a805bdad0c0f5e06a2a`, cloned
`--filter=blob:none` from GitHub on 2026-10-17. MEASURED:

| Falcon file (`tools/falcon/omni-acer/lib/`) | blob | sha256 (CRLF bytes) | CR count | after removing CR |
|---|---|---|---|---|
| `hrm-slow-fast.mjs` | `3b76f1ea71e073388656f041a5716b650fd0204a` | `a5ec3b7b9176aadcd6d213d474128642a76cba3b799594b697b0bdcc609141ba` | 149 | identical to bigpickle `src/hrm-slow-fast.mjs` (sha256 `34263085…`) |
| `mtp-heads.mjs` | `16b8ec18cc9781fe0936b997a5b0819da46228fa` | `63559e1c605e626ffce08ca7456eca54653b12ce5641b2618355b89461e79490` | 107 | identical to bigpickle `src/mtp-heads.mjs` |
| `zeta-process.mjs` | `7736b9f1654e5554dbba480ddf70b877922660bc` | `77d6a53aa27bf21945bed6f8254f69e3e8e480fd57498a4701c60109eeaf3a26` | 163 | identical to bigpickle `src/zeta-process.mjs` |
| `hilbert.mjs` | `a6bc466ed09b98d9bb0d72525fc0fcc8e8f624d8` | `61a4c4ae6bed569576bd7edf2ef15f7e804490f5a40f8f9b56d6e8bad839ec0a` | 155 | identical to bigpickle `src/hilbert.mjs` |
| `primes.mjs` | `5fd9b5177e15d9cf6b60c9f8e5fc67c62738fd57` | `1284ce7aff8844321d462c0e9975ae1598779b95419f74295fd3e85c0dce6291` | 29 | identical to bigpickle `src/primes.mjs` |

Each CRLF sha256 equals the pin in `omnicoder-server-v2.mjs:38-45` (`CANON_BUNDLE`), so the Falcon
server ran the same code this crate ports. Its `/api/hrm` handler (`omnicoder-server-v2.mjs:244-255,
456-461`) calls `hrmShapedPrediction` with `envelopeType "default"`, `currentCp 2`, `k 4`,
`fastIters 15`, `seed 0` unless the request gives others; that default call is the
`HRM|envelope=default|cp=2|...` row of the triad fixture. `currentCp` and `k` come from the request
body (`Number(input.currentCp || 2)`, `Number(input.k || 4)`), so a code point above 1023 reaches
the ring pull at iteration 0; the `HRM|envelope=revolver|cp=100003|...` and `cp=65537` rows and the
`fast_loop_large_cp` sweep cover it. `/api/mtp` (lines 257-260, 462-467) calls
`mtpHeads(Number(input.cp0 || 2), input.options || {})`. The HTTP, JSON and the hookwall / GNN
`.ndjson` rows those handlers write (lines 147-197) are not part of this hot-lane crate.

`tools/atlas/fire-mtp-hrm-geospatial.mjs` (blob `b20854c5280e7a5987ecbde7cadbbb78d4c98023`, 208 lines)
has no counterpart in bigpickle-rebuild. It imports the Falcon lib (lines 36-38), calls
`slowLoopPredictShape` once per node (line 85) and `mtpHeads(glyph, {k:4, depth:2, seed: bh >>> 0})`
per sampled node (line 97). Its inputs are the feed `D:/PID-Registration-Office/fabric-feed/
supervisors-fabric-feed-2026-06-10.hbp` (line 33; the script exits 2 without it, line 43) and
`preExistenceNode` from the ASOLARIA-AS-NEURAL-NETWORK repository (lines 25-29, 39). The feed is not
in any repository on disk, so the script's run cannot be reproduced here; it is not vendored (line 27
holds a Windows user-profile path). The two functions it calls are ported here.

## HRM trained weights

`hrm-slow-fast.mjs:14-18` names a trained model at `D:/Asolaria-HRM/` ("This file is the
DETERMINISTIC stub. Full HRM (trained model) lives at D:/Asolaria-HRM/"). That drive is not
available. The HRM fork `JesseBrown1980/HRM` @ `74ecc8b5b53b145f83580690217a9009d175b8b4`
descends from `sapientinc/HRM` @ `ac15626f` (the HEAD named at hrm-slow-fast.mjs:5) by 6 commits
(`faedfe6`..`74ecc8b`, "star port ...") that add only `.nojekyll`, `STARPORT-2026-08-08.hbp`,
`index.html` and their `.sha256` files (MEASURED: `git rev-list --count ac15626f..HEAD` = 6,
`git diff --stat` 6 files, +49 lines). No `.pt`, `.pth`, `.ckpt`, `.safetensors` or `.bin` file
appears anywhere in its history, and the Hugging Face mirror `Jessedbrown/HRM` lists 32 files, none
of them a weight file (MEASURED 2026-10-17 from `huggingface.co/api/models/Jessedbrown/HRM`; see also
`scratchpad/universe/hrm.md` section 5). No trained HRM network is ported here; the HRM in this crate
is the deterministic slow/fast code upstream serves, and the universe simulator's HRM agent, whose
"frozen" tables are counted from enwik8 at run time.
