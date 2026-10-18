# ternary — the stack's shared ternary layer

Rust 1.81, `no_std` (with `alloc` for the byte streams), `#![forbid(unsafe_code)]`, integer
arithmetic and trits only (no `f32`/`f64`). Crate `asolaria-ternary`, library `ternary`.

Owner, 2026-10-17: "we should be working with trinaries and ternaries." Owner rule relayed from
the ACER seat: "reuse tribit/mod.rs, never reinvent".

## What is in it

| Item | What it is | Owner source it ports |
|---|---|---|
| `ternary::Zero`, `Register`, `Carrier`, `TritWord`, `prism`/`unprism`, `pow`/`inv`, `pump_shell`/`pump_step`, `P`/`G`/`K`/`W`/`TRITS_PER_U128`, and `ternary::tribit` | The owner's tribit unit, **re-exported** from `../kernel/tribit` by path dependency. Nothing copied. The trit of this layer is `Zero` (`Neg = -1`, `Nil = 0`, `Pos = +1`). | asolaria-tribit@1292191 `src/lib.rs` (blob f83acb31) |
| `trijection::trijection_forward` → `Forward {c0, sa, sb, rem, total_len, pad}` | Pads to a multiple of 3 with zero bytes; one `(c0, sa, sb, rem)` per triple; returns the padded length and the pad. | `trijection.py:50-57` `trijection_forward` |
| `trijection::trijection_inverse` | `a = c0 + sa`, `bb = c0 + sb`, `c = c0 + rem - sa - sb` per tuple; `zip` stops at the shortest stream; `None` where upstream's `bytes()` raises `ValueError`; trims to `out[:total_len - pad]` with Python's slice end. Takes the ranges `trijection_forward` produces (`u8`, `i16`, `i16`, `u8`, `usize`, `usize`); upstream also accepts other ints there (e.g. `trijection_inverse([-1],[1],[1],[6],3,0)` returns `b'\x00\x00\x03'`), which the Rust signature cannot express (`PROVENANCE.md` section 3). | `trijection.py:59-64` `trijection_inverse` |
| `trijection::{trij, Trijection::restore}` | The per-triple body of the two, over `i64` (`i128` working values). On bytes they compute what the original computes. | `trijection.py:55-56` and `:62` (= law `TRIJECTION-BALANCED-TERNARY.md:13-18`) |
| `trijection::zero_trits` → `ZeroTrits {zeros, trits}` | The zero-trit count of `measure()` as two integers; read as `zeros/trits`. | `trijection.py:83-88` (`:88` divides in float; the port returns the counts) |
| `trijection::third` | The 2/3 rule `c_rev = 3*ctr + rem - a - b`. | `rime_27fischers.py:92` |
| `balanced::to_balanced_ternary` | Fixed width: exactly `digits` trits, least significant first, `r == 2 → -1` with the carry. | `trijection.py:42-48` `to_balanced_ternary` |
| `balanced::{bal3, recon, base3}` | Variable width: as many trits as the value needs; zero is the one trit `[0]`; the reconstruction `sum(x * 3**i)`; base-3 digits of a `u64`. | `reframe_check.py:12-34,44` |
| `balanced::low_trits` | The fixed-width loop of the 27-cube scripts. | `rime_27fischers.py:39-44`; `rime_agents.py:46-51` |
| `cube::{cell, index, separation, negate, rotate}` | The 27-cube of three trits numbered as the owner's `cube27()`; separation = count of nonzero trits; N negation and R rotation (R² = `rotate∘rotate`). | `trianti.py:31-33` (N, R, R2); law `:23-25`, `:126-129`; `trijection.py:23-25`; `rime_27fischers.py:51-52` |

## The owner's `trijection.py`

Delivered by the owner on 2026-10-18 from the ACER seat
(`C:\asolaria-acer\scratch\algorithms-of-asolaria-publication-20260723\tools\honest-compressor\trijection\trijection.py`;
docstring: "Operator: Jesse Daniel Brown. Sealed 2026-07-21."), 6,443 bytes, sha256
`c5005b1c9acd6a6cb6d6e3fbd25a283c1455109f0408ee9810b0d5a8151baac6`, git blob
`e9cbeb8b73c594557a1be68d8282c29a093fb182`. Vendored byte-identical under
`vendor/acer-algorithms-of-asolaria-publication-20260723/tools/honest-compressor/trijection/`.
Origin and searches: `PROVENANCE.md`.

The file states its own boundary, `trijection.py:27-33`:

```text
HONEST BOUNDARY (kept, so the claim stays true)
-----------------------------------------------
The transform is a lossless bijection on triples — restore=OK ALWAYS. It only SAVES
bits when the three share a center (correlated data): then sa,sb ~ 0 (mostly zero
trits, the free center) and compress away. On independent/random data the separations
are full-entropy and it saves nothing. It NEVER beats the joint entropy; it reaches
the joint entropy by not paying for the shared center three times.
```

Only the integer code is ported: `trijection_forward`, `trijection_inverse`,
`to_balanced_ternary`, and the zero-trit count of `measure()`. `H_bits` (`math.log2`), `lz`
(`lzma`), the float prints of `measure()` and the `math.sin` signal of `__main__` are the owner's
reporting and demo code; `tools/referee.py --measure` runs them unchanged (the owner's float lane).

The `__main__` input paths (`:101`) name an earlier cloud scratchpad
(`/tmp/claude-0/-home-user/9ebd6119-d7ee-5c30-a062-d04210f7bc39/scratchpad/`). The file is not
edited; the referee executes `:102-135` with `SC` bound to a directory it is given, and with
`measure` bound to a wrapper that records each input (for the integer counts and
`--write-inputs`) and then calls the owner's `measure()` unchanged. The as-written run, with no
wrapper, prints the same lines.

## The owner's `trianti.py` (the 27-cube symmetry group)

Delivered by the owner in the same ACER export as `trijection.py` (2026-10-18;
`…\honest-compressor\trijection\trianti.py`; docstring: "trianti.py — THE SYMMETRY GROUP OF THE
27-CUBE … Operator: Jesse Daniel Brown. Sealed 2026-07-21. Companion to trijection.py /
njection.py."), 3,816 bytes, sha256
`e7c1a01fd5be6d67a34eb6fc966a0742cca730eaed10899dff72379346229b6c`, git blob
`353f84325c9a4e557ca314680afb0caaddef238c`. Vendored byte-identical beside `trijection.py` and
pinned in `UPSTREAM.sha256`. Origin: `PROVENANCE.md` section 2b.

It defines the symmetry group of the 27-cube as three functions on cells `(t1,t2,t3)` in
`{−1,0,+1}³`: `N(c)` negation `t→−t` (`:31`, order 2, self-inverse), `R(c)` rotation
`(a,b,c)→(c,a,b)` (`:32`, order 3) and `R2(c) = R(R(c))` the anti-inversion `R⁻¹` (`:33`). The
referee compiles those three defs from the vendored bytes and binds `law_negate` = `N`,
`law_rotate` = `R`, `law_rotate2` = `R2`; the Rust `cube::{negate, rotate}` (and `rotate∘rotate`)
equal `N`, `R`, `R2` on every one of the 27 cells (the `CUBE` rows carry all three; `tests/law.rs`
and the referee's row-by-row compare). `--check` also runs the owner's `report()` from the
imported module (its `__main__` guard is not hit) and quotes its printed counts.

## Two balanced-ternary conventions in the owner's code

`to_balanced_ternary(n, digits)` (`trijection.py:42-48`) is fixed width: zero is `digits` zero
trits, and a value beyond `±(3^digits - 1)/2` keeps only its low `digits` trits (the carry out of
the last slot is not written). `bal3(n)` (`reframe_check.py:22-34`) is variable width: zero is
`[0]`, no truncation, no leading zero trit. `to_balanced_ternary` divides before the carry
(`n //= 3`, then `n += 1`), `bal3` and the `rime_*` loop carry before dividing; for `n % 3 == 2`
both give `n // 3 + 1`. Measured on every `n` in `[-29524, 29524]` (59,049 values), with the
owner's functions in the referee and the ports in `tests/stream.rs`:

| digits | equal as lists | equal after zero-padding `bal3` | equal to the low `digits` trits of `bal3` | equal to the `rime_*` 3-trit loop |
|---|---|---|---|---|
| 3 | 18 | 27 | 59,049 | 59,049 |
| 6 (what `measure()` uses) | 486 | 729 | 59,049 | — |
| 10 (Rust test) | 39,366 | 59,049 | 59,049 | — |

## Checks

```sh
export CARGO_TARGET_DIR=<scratch>/targets/ternary
sha256sum -c UPSTREAM.sha256                          # 7 OK (6 vendored files + the re-exported tribit source)
cargo +1.81.0 fmt --check
cargo +1.81.0 clippy --locked --all-targets -- -D warnings
cargo +1.81.0 test --locked                           # 16 tests: 8 law + 6 stream + 2 fixture
python3 -I -B tools/referee.py --check                # sha256 (trijection + trianti) + 41 lines verbatim, fixture, law counts, the trianti report, every byte triple
cargo +1.81.0 run --quiet --release --locked --example emit -- full > /tmp/emit.hbp
python3 -I -B tools/referee.py --check --rust /tmp/emit.hbp   # 458,196 rows, row for row
mkdir -p /tmp/sc && ln -s <path>/enwik8 /tmp/sc/enwik8         # optional: the owner's english input
python3 -I -B tools/referee.py --measure --sc /tmp/sc --write-inputs /tmp/in
cargo +1.81.0 run --quiet --release --locked --example emit -- measure /tmp/in/*.bin > /tmp/m.hbp
python3 -I -B tools/referee.py --measure --sc /tmp/sc --rust-measure /tmp/m.hbp
python3 -I -B tools/integer_only.py                   # 0 hits: no float in tools/*.py (AST) or src|tests|examples
```

`tools/referee.py` is the cold lane (stdlib Python). It checks `trijection.py`'s and `trianti.py`'s
sha256, then executes the owner's code from the vendored files: the defs `to_balanced_ternary`,
`trijection_forward`, `trijection_inverse` (`trijection.py`), `N`, `R`, `R2` (`trianti.py:31-33`),
`bal3`, `base3` (`reframe_check.py`), `cube27` (`rime_27fischers.py`), and the line blocks
`trijection.py:55-56, 62, 75-76, 84-87`, `reframe_check.py:44`, `rime_27fischers.py:39-44, 92`,
`rime_agents.py:46-51`. N, R and R² (the cube's negation, rotation and anti-inversion) are the
owner's `trianti.py`, compiled from the vendored bytes; `--check` also runs its `report()` from the
imported module and quotes the counts it prints. Every number the referee computes itself is an
integer; in `--measure` the owner's float code prints its own lines.

`tools/integer_only.py` (stdlib, run in CI) checks that the code written here stays integer. In
`tools/*.py`, by AST, it fails on true division, a float or complex literal, a `float()` /
`round()` / `complex()` call, a float `%`-format or format spec, `**` with a negative literal
exponent, and an import of `math`, `cmath`, `fractions`, `decimal`, `statistics`, `random` or
`numpy`. In `src/`, `tests/` and `examples/`, with comments, strings and char literals blanked,
it fails on an `f32`/`f64` token and on any float literal (`0.5`, `2.`, `1e3`, `1f64`). It does
not read the owner's vendored code (the referee compiles that from `vendor/`, and its float lane
runs unchanged) and cannot see `**` with a computed exponent (the referee's two are
`10 ** places` and `10 ** len(part)`, both non-negative).

## Measured (2026-10-18, rustc 1.81.0, Python 3.13.16)

- `cargo test --locked`: 16 passed. Through `trijection_forward` / `trijection_inverse`:
  16,777,216 of 16,777,216 byte triples restore (separations span `-170..=170`); every buffer of
  length 0, 1, 2 (65,793 buffers); 20,000 seeded buffers of lengths 3..=12; seeded buffers of
  299,999 / 300,000 / 300,001 / 1,000,000 / 1,048,577 bytes.
- `referee.py --check --rust`: 458,196 of 458,196 rows equal, among them 66,026 stream rows of
  lengths 0..=12 (with every buffer of length 1 and 2), 5 large seeded buffers, 2,078 inverse
  argument sets (`zip`, `ValueError`, slice end), 69,738 `to_balanced_ternary` rows, and 256 rows
  covering every byte triple; `TRIJ_BYTES|cases=16777216|restore_ok=16777216` through the
  original `trijection_inverse`; 41 of 41 executed or cited upstream lines verbatim; fixture 2,565
  rows; law counts `centre=1 faces=6 edges=12 corners=8`, `N·N=id 27/27`, `R·R·R=id 27/27`,
  `R²=R∘R 27/27`, `R=R² on 3/27`, orbits `1:3, 3:8`, the group fixes `(0,0,0)` only, centre glyph
  13; the owner's `trianti.py` `report()` quoted: `order(N)=2`, `order(R)=3`, `R≠R⁻¹`, the pie
  closes, the group fixes `(0,0,0)`, orbit sizes `{1:3, 3:8}`.
- Mutation test: 19 of 19 mutations reported as failures (Rust stream rows changed, dropped or
  added; the owner's file mutated in a throwaway copy, with and without re-pinning its sha256;
  the Rust port mutated; the measure rows, the law text and an input byte changed). The two new
  guards bite the same way (2026-10-18): appending a byte to the vendored `trianti.py` makes
  `--check` exit at the sha256 gate (`want e7c1a01f…`); flipping one `R2` value in the Rust emit
  makes `--check --rust` report `RUST_STREAM|…|equal=FAIL` at the `CUBE|i=1` row.
- `tools/integer_only.py`: 0 hits on 2 Python and 11 Rust files. It fails on each of 18 float
  mutations (7 Rust: `0.5`, `1e3`, `2.`, `1f64`, `as f64`, `1.5e-3`, `2e-1`; 11 Python: `/`, `/=`,
  `0.5`, `float()`, `round()`, `import math`, `from fractions import`, `"%.3f" %`, `f"{x:.2f}"`,
  `2 ** -1`, and a float literal in the check itself) and passes a control line that compiles under
  Rust 1.81 and holds floats only in comments and strings, plus `t.0.1`, `1usize.max(2)`, `0x1f32`,
  `0x1E5`, `0..=3`, a lifetime and char literals.

### The law's measurement rows (`--measure`)

The owner's `__main__` was also run as written, with `enwik8` placed at the path `:101,106` name
(a directory created for the run and removed after); its output is identical to the referee's run
of `:102-135` apart from the input directory in the three `skipped` lines. Owner's output (owner float lane,
printed by `trijection.py` itself), runnable cases:

```text
[english(text)]  N=300,000  restore=OK
   order-0 bpc  raw=5.0404  trijection=6.6006  delta=+1.5602  (no save)
   lzma  bpc    raw=2.4301  trijection=6.1211  delta=+3.6910  (no save)
   balanced-ternary zero-trit fraction of separations = 0.602  (higher = more free center; 0.333 = random)

[aligned-vantages(shared center)]  N=300,000  restore=OK
   order-0 bpc  raw=7.4752  trijection=3.8966  delta=-3.5786  <-- SAVES
   lzma  bpc    raw=0.1780  trijection=0.1188  delta=-0.0592  <-- SAVES
   balanced-ternary zero-trit fraction of separations = 0.900  (higher = more free center; 0.333 = random)

[same bytes, alignment DESTROYED (control)]  N=300,000  restore=OK
   order-0 bpc  raw=7.4752  trijection=4.5288  delta=-2.9464  <-- SAVES
   lzma  bpc    raw=0.3466  trijection=0.5883  delta=+0.2417  (no save)
   balanced-ternary zero-trit fraction of separations = 0.830  (higher = more free center; 0.333 = random)
```

`gradient(correlated)` (`k_gradient.bin`), `chaos(random)` (`chaos1m.bin`) and `rustcode`
(`code1m.bin`) print `skipped: [Errno 2] No such file or directory`: those three inputs are not on
this machine (searched by name in the scratchpad, `/home/user`, `/`, and on every ref of 240 git
directories including the private mirror). No other data is put in their place.

Integer counts computed here (lzma sizes are `lz()` byte counts; bpc as exact `n/d`; `e3`/`e4` =
fixed point at scale 10^3 / 10^4, rounded half away from zero):

| case (300,000 B) | zero trits / trits | `e3` | lzma bytes raw → C0+SA+SB+REM | lzma bpc raw, trijection, delta | `e4` |
|---|---|---|---|---|---|
| english (`enwik8[:300000]`) | 722,674 / 1,200,000 = 361337/600000 | 602 | 91,128 → 61,892 + 73,504 + 72,752 + 21,392 = 229,540 | 7594/3125, 11477/1875, 34603/9375 | 24301, 61211, 36910 |
| aligned vantages | 1,080,000 / 1,200,000 = 9/10 | 900 | 6,676 → 3,956 + 172 + 172 + 156 = 4,456 | 1669/9375, 1114/9375, −37/625 | 1780, 1188, −592 |
| control | 995,470 / 1,200,000 = 99547/120000 | 830 | 12,996 → 5,036 + 4,572 + 5,644 + 6,808 = 22,060 | 1083/3125, 1103/1875, 2266/9375 | 3466, 5883, 2417 |

The Rust port gives the same zero-trit counts and the same streams (sha256 of `C0||SA_b||SB_b||REM`)
on all three inputs (`RUST_MEASURE|rows=3|equal=OK`).

| Law line | Row | Result |
|---|---|---|
| `:35` | english order-0 raw 5.0404, trijection 6.6006, no save | reproduced (owner prints the same) |
| `:40` | english zero-trit 0.602 | reproduced; integer 361337/600000 |
| `:46` | aligned order-0 7.4752 → 3.8966 (−3.5786) SAVES | reproduced |
| `:47` | aligned lzma 0.1780 → 0.1188 (−0.0592) SAVES | reproduced; integer 1669/9375 → 1114/9375 (−37/625) |
| `:48` | aligned zero-trit 0.900 | reproduced; integer 9/10 |
| `:49` | restore = OK | reproduced (original inverse and the Rust port) |
| `:33`, `:34`, `:36` | gradient, chaos (random), rustcode order-0 rows | not runnable: input files not present |
| `:40` | rustcode 0.609, random 0.460 | not runnable: input files not present |

25 law values checked: 14 reproduced, 0 not reproduced, 11 not runnable. The law states no
values for the control case.

`MIGRATION.md` lists, for the integrator, every place in the stack's crates where a three-way
direction or state is carried as something other than a trit, and which of them the owner's
source carries as a trit.
