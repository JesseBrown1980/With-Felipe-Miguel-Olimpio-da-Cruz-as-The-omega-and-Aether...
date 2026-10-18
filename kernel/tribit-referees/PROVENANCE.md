# Provenance: asolaria-tribit-referees

Cold lane only. The three scripts below have no consumer in the stack. They sit beside
`kernel/tribit` as integer/Fraction referees, and nothing on the request path reaches them.

## 1. Vendored byte-identical

Every file was taken with `git show <commit>:<path>`. `UPSTREAM.sha256` pins each file's sha256.
`git hash-object` of each copy equals `git rev-parse <commit>:<path>`, also under this
directory's `.gitattributes`, where `vendor/** -text` keeps the CRLF lines of the
the-browns-solution README.

| Copy | Upstream (JesseBrown1980/…) | Commit | Blob | Lines |
|---|---|---|---|---|
| `vendor/The-Brown-Light-erdos-Engine-block-powered-by-light/crank.py` | `The-Brown-Light-erdos-Engine-block-powered-by-light` `crank.py` | `a2a6c447c8374fff441ac2a29614f525af2b2537` | `12b034336e81c4df82611006dfdc2dc7dcc112a6` | 71 |
| `vendor/The-Brown-Light-erdos-Engine-block-powered-by-light/README.md` | same repo, `README.md` | `a2a6c447…` | `85b48578c86f8fdeaac4fc6ab2743748be51c465` | 175 |
| `vendor/the-browns-solution-to-erods-o0O-nx3-6-for-1-with--1-3/README.md` | `the-browns-solution-to-erods-o0O-nx3-6-for-1-with--1-3` `README.md` | `5bdc268091caab1df2c43de40a50fbc456642960` | `395ba5bccd7dda61bac6bf85f0d9a4acac68a355` | 315 |
| `vendor/does-the-closure-survive-81-levels/compose.py` | `does-the-closure-survive-81-levels` `compose.py` | `00dc393f10e346762f10842fcd2d02d08df508df` | `f3574ed13bd4c18ca1fe4d42c2fb5d46f635807a` | 156 |
| `vendor/does-the-closure-survive-81-levels/README.md` | same repo, `README.md` | `00dc393f…` | `69eb40fd9c1561a0e598ded0877a172815ace39b` | 183 |
| `vendor/does-2-to-the-n-always-contain-a-digit-2-in-base-3/trunk.py` | `does-2-to-the-n-always-contain-a-digit-2-in-base-3` `trunk.py` | `02299b45e9f66684ac19cb0cf40aa603fcbfb3cc` | `5cefbf01a659b5f8bb23a0dd8fef8ba2bba793b0` | 92 |
| `vendor/does-2-to-the-n-always-contain-a-digit-2-in-base-3/README.md` | same repo, `README.md` | `02299b45…` | `5f3a0ee52191e01baca58bcc6072160b42abb3ef` | 187 |

The READMEs are vendored because they hold the receipts that `tools/referee.py` checks against the
scripts' output.

**Privacy scan.** All seven files were scanned before copying, for e-mail addresses, phone
numbers, LAN addresses, keys, tokens, chats and names. The only personal name is the owner's,
"Jesse Daniel Brown (OP-JESSE)". There is no third-party personal data.

## 2. One script, several homes: the diff record

All of these were compared as git trees and file by file:

- `crank.py` is the same blob, `12b03433…`, in four places:
  - GitHub `The-Brown-Light-erdos-Engine-block-powered-by-light@a2a6c44`.
  - GitHub `the-browns-solution-to-erods-o0O-nx3-6-for-1-with--1-3@5bdc268`.
  - Hugging Face `Jessedbrown/The-Brown-Light-erdos-Engine-block-powered-by-light`.
  - Hugging Face `Jessedbrown/the-browns-solution-to-erods-o0O-nx3-6-for-1-with-1-3-4bfb2942fa`.
  
  The copy here is the canonical one, from The-Brown-Light-erdos-Engine.
- **Hugging Face mirrors.** Each HF repo has the same commit ids and tree ids as its GitHub
  repo, and the working trees are identical (`diff -r` is empty):
  - Brown Light: commit `a2a6c447…`, tree `fb93b6d3…`.
  - browns-solution: commit `5bdc2680…`, tree `797a989c…`.
  
  The HF name of the second repo is `…-with-1-3-4bfb2942fa`, where GitHub has `…-with--1-3`.
- `trunk.py` (`5cefbf01…`) and `reframe_check.py` (`ba82afd1…`) are the same blobs in
  `the-browns-solution-to-erods…@5bdc268` and `does-2-to-the-n-always-contain-a-digit-2-in-base-3@02299b4`.
- **Files that differ between the two GitHub repos.** These pages differ, and none is vendored
  here:
  - `README.md` against `README.md`: 318 differing lines, ignoring CR.
  - Brown Light `index.html` against browns-solution `motor.html`: 44 differing lines.
  - Brown Light `index.html` against browns-solution `index.html`: 416 differing lines.

## 3. Runs as written (`python -I`, Python 3.13.16, glibc 2.39)

| Command | stdout | sha256 | Elapsed, 4 cores (build run; re-run 2026-10-18) |
|---|---|---|---|
| `python -I crank.py` | `receipts/crank.stdout`, 36 lines | `42322482…0be6` | 368 ms; 181 ms |
| `python -I compose.py` | `receipts/compose.stdout`, 48 lines | `d92d1e97…44dc` | 3,223 ms; 1,944 ms |
| `python -I trunk.py 8` | `receipts/trunk-8.stdout`, 29 lines | `8d54fb91…65b9` | — |
| `python -I trunk.py 4000` | `receipts/trunk-4000.stdout`, 51 lines | `3f70b2dc…a859` | — |
| `python -I trunk.py 200000` | `receipts/trunk-200000.stdout`, 55 lines | `972a5a16…f2c2` | 30,976 ms; 16,405 ms |

`receipts/RUNS.hbp` pins the full sha256 of each output. `tools/referee.py --check` re-runs the
scripts and compares each output byte for byte.

### Receipts the runs reproduce

`tools/referee.py --check` runs 82 README checks, and all 82 pass:

- **Brown Light `README.md:61-73`.** The 12 strokes k = 0..11: `period`, `charge`, `burned`,
  `carried`, `ratio`. These equal crank.py's `period`, `survivors_in`, `fire_at_k`, `carry` and
  `fire_fraction`.
- **browns-solution `README.md:131-144`.** The 13 levels k = 0..12.
- **browns-solution `README.md:235-247`.** The motor-block table, 12 strokes.
- **Distribution tables, positions 0..5.** These are browns-solution `README.md:163-169` and
  does-2 `README.md:59-65`. Three columns are checked:
  - `observed` equals trunk.py's `DISTRIBUTION` percentages.
  - `closed form` equals crank.py's `CHECK` fractions.
  - `derived`/`exact` equals that fraction × 100, rounded half-even to 4 decimals in integers.
- **does-2 `README.md:103-115`.** The 12 record setters (`n`, lowest −1), in order.
- **browns-solution `README.md:79-86`.** The pairs (`n`, `lo(n)`) are among trunk.py's record
  setters.
- **does-2 `README.md:136-139`.** These rows are checked:
  - the range 200,000;
  - no −1 anywhere at `{0, 2, 8}`;
  - 0 counterexamples;
  - a minimum count of 2 at n = 9.
- **closure `README.md:35-41`.** Section 1 at depths 1, 3, 6, 9, 12 and 13.
- **closure `README.md:55-66`.** Section 2. The README's 4-digit `worst |Δ|` equals the script's
  `%.6e` text rounded to 4 significant digits.
- **closure `README.md:81-86`.** Section 3: exact `0` at every depth, and float64 `0.000e+00`,
  `0.000e+00`, `−4.002e−11`, `−9.689e−02` and `−1.325e+24`.

### Receipt columns these three scripts do not print

These columns are recorded here and were not checked:

- **Brown Light `README.md:61-73` and browns-solution `:235-247`, `fired channel` (R G B).** The
  page computes this column (`index.html` line 189, `const ch=["R","G","B"][f.k%3];`). crank.py
  prints no channel.
- **browns-solution `README.md:69-70` and `:79-86`.** These columns come from `trianti.py`, which
  is not vendored here:
  - `lo(n−1)`, `lo(n+1)`, `triple_min`;
  - the triple-min distribution `0 → 200,000 (100.0000%)`.
- **does-2 `README.md:118-123`, `predicted 28.4`.** This is `log(N/2) / log(3/2)` written in the
  README. No script line computes it.
- **does-2 `README.md:32-50` and browns-solution `:36-47`.** These are the results of
  `reframe_check.py`, which is not vendored here.

## 4. Integer and float sites

`receipts/FLOAT-SITES.hbp` lists every syntactic float site that an `ast` scan finds:

- `float(...)` calls;
- float literals;
- true division `/`;
- `%`-formats with `e`/`f`/`g` conversions.

`tools/referee.py --check` re-scans and compares with that file. It also scans itself and finds
0 sites.

- **crank.py: 3 sites.** The computation, lines 23-56, uses `int` and `Fraction` only. The sites
  print the exact Fractions as binary64:
  - line 53, `float(f)`, printed through `%s`, so as `repr`;
  - line 71, `float(p)` with `%.6f`.
  
  The docstring at lines 3-4 reads: "Computed over a FULL PERIOD at each level, so the fractions
  are exact rationals, not statistics".
- **compose.py: 11 syntactic sites.** These are the script's float64 lane, which its docstring
  states at line 19, quoted with its spacing after the two leading spaces:
  `float64         -> measure the depth at which it stops being 0, and by how much`.
  The syntactic sites are:
  - line 85: `float(s % 2001 - 1000)` and `0.1`;
  - line 87: `0.0`;
  - line 122: `7919.0`;
  - line 123: `%.6e`;
  - line 146: `11.1`, `4.1` and `93.1`;
  - line 147: `0.0`;
  - line 151: `7919.0`;
  - line 156: `%.6e`.
  
  Float values also reach the following lines through these values:
  - `arms` (line 31), when called from lines 92-93, 149 and 153;
  - `abs` and `max` (lines 95-98);
  - `sum` (lines 99-100, 150 and 154);
  - `x + shift` (lines 88 and 101);
  - `a + t` (line 152);
  - `A2[i] + 1..3` (line 155).
  
  The integer lanes use `int` and `Fraction` only: `nest_int` (lines 35-53), `free_centre_int`
  (lines 57-77) and the Fraction path (lines 131-143).
- **trunk.py: 8 sites.** The sweep, lines 24-69, uses `int` only. The sites are all in the
  printout:
  - line 84: `100 * hist[k] / (N + 1)` with `%.4f`;
  - line 86: `100 * tail / (N + 1)` with `%.4f`;
  - line 91: two `%.4f` conversions;
  - line 92: `2 / 3`, `1 / 3` and `100 * hist.get(k, 0) / (N + 1)`.
  
  Line 92 also applies `** k` to the float `2 / 3`. The docstring at line 6 reads: "We use
  pow(2, n, 3**K) and walk K digits. Exact integers throughout." does-2 `README.md:149-150` reads:
  "Exact integers throughout, no floating point anywhere." Measured: the sweep is integer, and the
  percentage lines divide with `/`, which yields binary64 values that `%.4f` prints.

## 5. The Rust ports (written here)

Each port reproduces its script's printed output byte for byte. The integration tests compare
each port with `receipts/*.stdout`. `tools/referee.py --check --rust target/release/examples`
compares the example binaries with the same receipts. Locally, crank, compose and trunk 8, 4000
and 200000 were all equal (5 of 5).

Fifteen further `trunk.py N` values were compared directly, script against port, and all 15 were
equal: 0, 1, 2, 7, 8, 9, 10, 30, 100, 333, 1000, 1134, 4000, 25458 and 30000.

**Argument domain of `trunk`.** These claims hold for N given as a non-negative ASCII decimal
integer. `examples/trunk.rs` reads N with `str::trim` and `u64::from_str`. The arguments `+8`,
` 8 ` and `008`, and `8 extra` as two arguments, print what trunk.py prints. trunk.py:45 reads N
with `int(sys.argv[1])`, which also accepts arguments the example does not. For those the example
panics (exit 101) and prints nothing. trunk.py prints the following (Python 3.13.16):

- `-2` and `-5`: exit 0, 23 lines. `range(N + 1)` (line 58) is empty. `100 * 0 / (N + 1)` with
  a negative divisor is `-0.0`, so line 86 prints `pos>=20         0   (-0.0000%)` (after three
  leading spaces). All six `observed` columns of lines 91-92 print `-0.0000%`.
- `-1`: 13 lines, then exit 1 with `ZeroDivisionError: division by zero` at line 86, which
  divides by `N + 1 = 0`.
- `1_000`: `int()` accepts the underscore; exit 0, 48 lines, `N=1000`.
- `٨` (U+0668, Arabic-Indic digit eight): `int()` reads 8; exit 0, the same 29 lines as
  `trunk.py 8`.

The port does not reproduce these runs.

| Port | Follows | Notes |
|---|---|---|
| `src/crank.rs` | crank.py:23-71 | `u64` residues; `pow_mod` for `pow(2, n, mod)` (line 40); the digit walk of lines 41-47 as written; `Frac` prints `str(Fraction)`. |
| `src/trunk.rs` | trunk.py:20-92 | See the trunk notes below. |
| `src/compose.rs` | compose.py:26-156 | See the compose notes below. |

**trunk.rs**

- `2^n mod 3^320` is held as ten base-`3^32` limbs, and each `n` is the previous value doubled
  mod `3^320`. That equals `pow(2, n, MOD)` (line 26).
- `low_digits` reads the standard trits with the `+1` of line 32 carried explicitly. That is
  lines 28-35, restated over trits.
- `sorted(hist)[:20]` (line 83) is kept as "the first 20 positions that occur".

**compose.rs**

- The `int` lanes are `i64`.
- The Fraction lane holds only integers, and is `Wide`, a 256-bit two's-complement integer. Its
  values pass `i128` near depth 77.
- The float64 lanes are `Binary64`.

**`src/binary64.rs` is Claude's integer model of IEEE-754 binary64, not upstream code.** Each
value is exactly `mant * 2^exp`. Each operation rounds once to 53 bits, ties to even. It covers
what the scripts use:

- correctly rounded `int / int`, `float(Fraction)` and decimal literals;
- `+`, `-`, `*`, `abs` and `max`;
- CPython ≥ 3.12 builtin `sum` over floats. This is the compensated loop in
  `Python/bltinmodule.c`: `0 + first`, then `t = f + x`, then `c += (f - t) + x` or
  `(x - t) + f` by `fabs` order, then `f += c` when `c != 0`. On Python < 3.12, `sum` adds left
  to right, so the referee requires ≥ 3.12 for compose.py;
- `%.Nf` and `%.Ne`, correctly rounded, half-even;
- `repr`, the shortest string that reads back, in CPython's `'r'` layout.

**Two points are taken from measurement, not from a specification:**

1. trunk.py:92 `(2 / 3) ** k`. CPython's `float_pow` returns `1.0` for `k = 0` and calls C
   `pow` otherwise. The port uses the correctly rounded power. On this host (glibc 2.39), C `pow`
   returned exactly that value for k = 1..5 (`as_integer_ratio` compared). The printed `%.4f`
   values equal the script's.
2. Python's `sum` above. It is checked only through compose.py's output, which the port
   reproduces exactly:
   - 228,731 moved arms at depth 12;
   - `worst |delta|` from `1.136868e-13` to `1.746230e-10`;
   - the float residual `-1.324979e+24` at depth 81.

Timings, release build, one run: crank 11 ms, compose 396 ms, trunk 200000 807 ms. Re-run
2026-10-18, two runs: crank 10-11 ms, compose 243-254 ms, trunk 200000 432-444 ms. Elapsed
times vary with host load.

## 6. Not brought in

`reframe_check.py` and `trianti.py` are outside this task's named list. They are the
browns-solution scripts that produce the `RESULT 1` receipts and the triple-min receipts:

- `reframe_check.py`: blob `ba82afd127cafa0566894752367b88804203d704`, 91 lines.
- `trianti.py`: blob `3cb39d96050f6eae5c0f95929ef18a54329518fe`, 77 lines. Its float sites are
  `mean = sum(vals) / len(vals)` at line 46, `%.4f` at lines 48-49, and `100 * v / N` with
  `%.4f` at line 62.

The pages `index.html` and `motor.html` are browser JavaScript and are not vendored here.
