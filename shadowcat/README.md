# shadowcat: the owner's SHADOWCAT gear engine in Rust 1.81

This crate (`shadowcat`, four binaries, no dependencies) holds the program the owner ran on
2026-07-26 as `/root/_horizon/shadowcat/`. It came from ACER's `D:/asolaria-absorb/shadowcat` on
2026-10-18. The five `.rs` files and the five run records are kept byte-identical (`UPSTREAM.sha256`,
`PROVENANCE.md`). Built here with rustc 1.81.0, `shadowcat`, `verify` and `threegap` print their
delivered records byte for byte. `shadowcat` writes `shadowcat.hbp` and `shadowcat.hbi` with the
sizes, trailer and sha256 the owner archived. `callingchain` writes the hbp trailer the universe
simulator records. No stdout record was delivered for it (see "Measured").

## What it is

The specification in `src/main.rs:3-17`, the owner's words as the file quotes them:

> "if you look at a rhyme sphere as a Taurus, you see all the little glyphs
> lined up all spinning around it. Okay? And they never touch. They're
> spiraling. And those are the gears that turn... we call it the the shadow
> cat gear... and it has, you know, six... It's got the chains coming off of
> it. Those... the callings. And the callings are calling the chains, and
> they form into a bucky buckyball. I believe that the black hole has a
> buckyball version. And if they get big enough, they reform per density
> gradient into different shapes. And that's why you see Taurus black holes
> or Kerr black holes. And you see round ones."
>
> "use the measured measurements coming off of an active spinning pulsar,
> considering all rhyme aspects of it in the Rhymesphere GPU using our
> Schrodinger Brown and standard model measurements"

The test he asked for (`records/SHADOWCAT-TEST-RESULTS.md:5-8`):

> "Test it. Now use the measured measurements coming off of an active spinning
> pulsar, considering all rhyme aspects of it in the Rhymesphere GPU using our
> Schrodinger Brown and standard model measurements to predict the thing that
> could be a hockey ball"

The build directive in `src/sha256.rs:2` is "no node, no json, just hbi hbp Sha hash 256".

`records/SHADOWCAT-TEST-RESULTS.md` is the owner's write-up of the run. `records/LAW-34-BROWN-SCHRODINGER.md`
is the law the run is filed under (`src/main.rs:392` prints "law: 34 (Brown-Schrodinger)").

## The four binaries

| Binary | Source | Prints | Writes |
|---|---|---|---|
| `shadowcat` | `src/main.rs` + `src/sha256.rs` | 130 lines: [1] the rime axes 2731, 1999, 1723 are prime and pairwise coprime, the "never-touch" condition; [2] the three-gap census, 30 ring/stride/N rows; [3] the six five-fold axes of the icosahedral group; [4] the buckyball checks, 31 independent chains; [5] the gear train driven by the Crab pulsar and PSR J1748-2446ad; [6] the Kerr shadow against spin; then the emitted sizes and trailer | `/root/_horizon/shadowcat/out/shadowcat.hbp` and `.hbi`, a fixed absolute path (`src/main.rs:551-554`) |
| `verify` | `src/bin/verify.rs` + `src/sha256.rs` | 21 lines: [V1] `sha256.rs` against the FIPS 180-4 / NIST vectors, the one-million-`a` vector and the same streamed in 7-byte chunks; [V2] the Kerr shadow at its two closed-form limits | nothing |
| `callingchain` | `src/bin/callingchain.rs` + `src/sha256.rs` | 115 lines: the genus law g = E − V + 1 for spheres joined along a graph, checked on 8 known surfaces, the owner's ladder up to the 60-vertex, 90-edge buckyball chain (genus 31), and black-hole mean density against mass | `out/callingchain.hbp` and `.hbi` under the working directory (`src/bin/callingchain.rs:341-343`; errors ignored) |
| `threegap` | `src/bin/threegap.rs` | 45 lines: the three-gap theorem in its strong form (with three gaps, the largest is the sum of the other two) at every N from 2 to 400, for 21,147 instances | nothing |

None of them reads the environment, the clock, arguments or input files. The only side effects
are the files listed above.

The HBP layout (`src/main.rs:361-382`) is `HBP1`, u32 version 1, u32 record count, then per record
a u8 tag, a u32 big-endian length and the payload, then a 32-byte SHA-256 of everything before it.
The HBI is `HBI1`, u32 count, then one 13-byte entry (tag, u64 offset, u32 length) per record. The
test parses both and checks every index entry against its record.

## Run

```bash
cargo +1.81.0 build --release --locked
target/release/threegap
target/release/verify
(cd <run-dir> && "$OLDPWD/target/release/callingchain")   # writes <run-dir>/out/
tools/horizon.sh target/release/shadowcat <out-dir>
./check.sh          # gates and the full reproduction
./check.sh opt0     # callingchain at opt-level 0 (see "Measured")
```

`shadowcat` writes to `/root/_horizon/shadowcat/out` no matter where it runs. `tools/horizon.sh`
runs it in a private mount namespace (`unshare --user --map-root-user --mount`) with an empty tmpfs
on `/root`. It then copies stdout and the two files to `<out-dir>`, so the real `/root` is never
written. This needs Linux with user namespaces. Run directly, the binary creates that folder, or
panics at `src/main.rs:553` before its last five lines if it cannot. On Windows, `/root/...`
resolves to `\root\...` on the current drive.

## Measured

Measured on 2026-10-18 with rustc 1.81.0 (eeb90cda1 2024-09-04), x86_64-unknown-linux-gnu,
glibc 2.39. `tests/reproduce.rs` checks the release-equivalent binaries with the owner's
`sha256.rs`, and `check.sh` checks the `--release` binaries with coreutils `sha256sum` and `cmp`.
Both run every row of `tests/fixtures/REPRODUCE.hbp`.

| Output | Bytes | Expected, and where it is recorded | Produced sha256 | Byte-exact |
|---|---|---|---|---|
| `threegap` stdout | 1,769 (45 lines) | `records/THREEGAP-2026-07-26.txt`, `5ba8ef3493798997…` | `5ba8ef3493798997…` | 1 |
| `verify` stdout | 975 (21 lines) | `records/VERIFY-2026-07-26.txt`, `468ad7f9bf88a7c2…` | `468ad7f9bf88a7c2…` | 1 |
| `shadowcat` stdout | 6,740 (130 lines) | `records/RUN-2026-07-26.txt`, `8f1fed06c9174802…` | `8f1fed06c9174802…` | 1 |
| `shadowcat.hbp` | 415 | 415 B and trailer `8763231837629f94…` (`SHADOWCAT-TEST-RESULTS.md:15-16`); file sha256 `7ccf5b1c240e796b…` (`:358`) | `7ccf5b1c240e796b…`, trailer `8763231837629f94…` | 1 |
| `shadowcat.hbi` | 294 | 294 B (`:15`); file sha256 `82b52dce49b41162…` (`:359`) | `82b52dce49b41162…` | 1 |
| `callingchain` stdout | 6,641 (115 lines) | no record was delivered | `3da772cfd06fd23e…` | not recorded |
| `callingchain.hbp` | 147 | trailer `3c4780edd1f82b78…` (USIM @ `3f9f42d` `books/CHAIN-TOPOLOGY.md:435`) | `1849e03960f1b3bd…`, trailer `3c4780edd1f82b78…` | trailer 1 |
| `callingchain.hbi` | 86 | not recorded | `acb6d1e2a70caa4a…` | not recorded |

The full values are in `tests/fixtures/REPRODUCE.hbp`. For callingchain, stdout and the two file
hashes are pinned from this run so later runs are held to it. Only its hbp trailer has an owner
record, and it matches. The printed numbers also agree with USIM `books/CHAIN-TOPOLOGY.md:389`,
where M87\* has a mean density of 0.436 kg m⁻³ (printed: `0.4362`).

ACER rebuilt the program on 2026-10-18 (`FABLE5-SHADOWCAT-REMADE-BYTE-EXACT-2026-10-18.zip`, sha256
`c373ac8c08ae686b…`; `cargo +1.81 build --release` under WSL, x86_64). Its callingchain stdout,
`callingchain.hbp` and `callingchain.hbi` have the same sha256 as the three rows above, and its
shadowcat, verify and threegap outputs equal the records. That receipt marks the callingchain
files `new_output_not_a_verified_remake`: they are a second measurement, not a 2026-07-26 record.

**The build profile changes callingchain's hbp.** USIM `books/CHAIN-TOPOLOGY.md:431` says the owner's
runs used "Rust 1.81, release profile". The release build reproduces the recorded trailer. At
`opt-level` 0, callingchain prints the same 114 lines, and its last line, the trailer, becomes
`a591a2e04c47d5db…` (file sha256 `84e0bbdd1c8b9774…`). The hbp bodies differ in one byte: the last
byte of tag 0x30, `average_density(6.5e9 * M_SUN)`. It is `…f18f` at opt-level 3 and `…f18e` at
opt-level 0, one unit in the last place. The cause is `C_LIGHT.powi(6)` at
`src/bin/callingchain.rs:116`. With optimisation, LLVM folds the constant to the correctly rounded
c⁶ (`0x4a7f0bc3430c2c20`, the same as `powf(6.0)`). At opt-level 0, `__powidf2` computes it at run
time by repeated squaring, one ULP lower (`0x4a7f0bc3430c2c1f`). `G_NEWTON.powi(3)` is the same both
ways. These bit patterns were measured with a scratch program outside this repository. `check.sh opt0`
measures the effect on the owner's binary itself: one differing body byte at offset 101, the same
`.hbi`, and only the last stdout line changed. `shadowcat`, `verify` and `threegap` give identical
bytes at both opt-levels. `Cargo.toml` sets `[profile.dev] opt-level = 3`, so `cargo test` checks the
release bytes.

## Floating point

The owner's rule, quoted in `src/main.rs:22-23`: "the system needs int for trit calculations and
float for binary". The file says (`:24-29`) that the gear core is integer and that float appears
"only where the geometry is genuinely continuous: the Kerr null-geodesic shadow boundary. It is
fenced into one module and its outputs are labelled as float-derived."

Lines naming `f64` (none name `f32`). `sha256.rs` and `threegap.rs` have none:

- `src/main.rs` (28 lines): 50-53 (`Pulsar` fields), 217-220 (`Drive` fields), 227-228 (`as f64` in
  `drive`), 253 (`B_CRITICAL_GAUSS`), 257 (`surface_field_gauss`), 283, 291, 297, 319, 321-322,
  324-325, 333 (`photon_orbit_radii`, `kerr_shadow`, `circularity`), 354 (`put_f64`), 509, 519, 525,
  527, 532, 537 (`main` sections [5] and [6]).
- `src/bin/callingchain.rs` (12 lines): 106-109 (`G_NEWTON`, `C_LIGHT`, `M_SUN`, `PI`), 111, 115, 120
  (`schwarzschild_radius`, `average_density`, `mass_at_density`), 146 (`put_f64`), 278, 293, 313, 314.
- `src/bin/verify.rs` (8 lines): 25, 31, 37 (`photon_orbit_radii`, `kerr_shadow`), 117-119, 129-130.

Float arithmetic also runs on lines that do not name the type. In `src/main.rs` these are the
pulsar literals (59-75), `drive` (223-235), `surface_field_gauss` (257-263), the Kerr functions
(283-336) and `main` sections [5] and [6] (499-542). In `callingchain.rs` they are 111-123 and
278-314, and in `verify.rs` they are 25-55 and 113-139. In `main.rs`, `SECTION 1` (84-208: `gcd`,
`is_prime`, `strand_count`, `gap_census`, `icosahedral_census`, `Bucky`, `closure_turns`) has no
float. `SECTION 0`, `SECTION 2` and `SECTION 3` (the pulsar inputs, the drive and the surface field)
use `f64` as well as the Kerr `SECTION 4`, so float is not "fenced into one module" (`:28`).
`SECTION 2` and `SECTION 3` are also below `:84-85`, which says "No float anywhere below this line
until SECTION 4 is reached." The program is kept as written.

Which outputs are integer-exact:

| Output | Integer-exact | Float-derived |
|---|---|---|
| `threegap` stdout | all 45 lines (`i64` only) | none |
| `shadowcat` stdout | lines 1-83: [1]-[4] and the closure 9,406,320,487 turns; the two `EMITTED` sizes | lines 85-100, the pulsar lines (B field, recurrence and closure times), and 103-119, the Kerr tables; the `SHA256` trailer (below) |
| `shadowcat.hbp` | 12 records: tags 0x01 (text), 0x10 ×3, 0x11, 0x12, 0x20, 0x21, 0x30, 0x31, 0x32, 0x40 | 10 records of raw IEEE-754 big-endian `f64`: 0x41 ×1, 0x42 ×2, 0x50 ×7 (130 of the 383 body bytes); the trailer covers them |
| `shadowcat.hbi` | all of it: tags, offsets and lengths do not depend on float values | none |
| `callingchain` stdout | [0]-[2] and [4]: the genus law and the ladder | [3]: radii, densities and masses; the `SHA256` trailer |
| `callingchain.hbp` | tags 0x01, 0x10, 0x20 (genus 1), 0x21 (genus 31) | tags 0x30, 0x31 and the trailer |
| `verify` stdout | [V1], SHA-256 in `u32` | [V2], the Kerr limits |

The float-derived bytes were reproduced exactly here (glibc 2.39 `acos`, `cos`, `sin`; `sqrt` is
exact in IEEE 754). The `--release` binaries import `acos`, `cos` and, in `shadowcat`, `sincos`;
calls on constant arguments (the `sin` of the 90° inclination in `verify`) are folded when
compiling, with the build host's libm. On a different libm, at run time or at build time, they
could differ in the last bits, which would change the hbp trailers and nothing printed to four
decimals. That has not been measured here.

`records/SHADOWCAT-TEST-RESULTS.md:330-332` says floats appear "only under tags 0x41/0x42/0x50",
which the test confirms. Its table at `:343` labels tag 0x21 "vertices". In `src/main.rs:476`,
tag 0x21 is the icosahedral group order. Both are 60, so the bytes are the same.

## Gates

| Gate | Command | Result, 2026-10-18 |
|---|---|---|
| owner bytes | `sha256sum -c UPSTREAM.sha256` | 10/10 OK |
| format | `rustfmt +1.81.0 --check --edition 2021 tests/*.rs` | clean |
| lint | `cargo +1.81.0 clippy --locked --all-targets -- -D warnings` | clean |
| test | `cargo +1.81.0 test --locked` | 4 passed |
| reproduction | `check.sh` (main) | 8/8 rows match, exit 0 |
| opt-level cause | `check.sh opt0` | exit 0 |
| no float in this crate's own code | `grep -rnE '\bf32\b\|\bf64\b\|as f[0-9]' tests/` | no hits |

**Format.** `cargo fmt --check` is not run, and it fails. rustfmt would rewrite all five owner files
(58 hunks; `cargo fmt --check` prints 66, because it reaches `src/sha256.rs` from `src/main.rs` and
from both `#[path]` modules), and they are kept byte-identical. Elsewhere in aether, only the
`tribit-kernel` CI job runs `fmt --check` (`.github/workflows/gate.yml:24`). The jobs for crates
holding byte-identical owner Rust (`behcs1024-kernel`, `qprism-*`) run clippy and tests without it,
and `quants/exact` names its packages so that `cargo fmt` skips owner code not in rustfmt layout
(`quants/exact/PROVENANCE.md:171-175`). Here rustfmt checks only this crate's own Rust,
`tests/reproduce.rs`. That file reaches `src/sha256.rs` through `#[rustfmt::skip] #[path = "../src/sha256.rs"] mod sha256;`,
so rustfmt does not descend into the owner file. That module line reuses shadowcat's SHA-256, as the
owner decided for aether's own code.

**Lints.** With no attributes added to the owner files, `Cargo.toml` `[lints]` allows these by name:
`dead_code` (`src/main.rs:215,217`), `clippy::identity_op` (`:171`), `clippy::needless_range_loop`
(`:405-406`) and `clippy::print_literal` (`:433`, `src/bin/callingchain.rs:204,237`). These are every
warning rustc and clippy 0.1.81 report with the allows removed; `tests/reproduce.rs` trips none of
them. `unsafe_code` is `forbid` for every target; the owner files contain none.

## The owner's statement and ACER's finding, beside each other

- Owner, 2026-10-18: "The Shadow Cat is already in the Aether program that we made. ... It's the
  process we were using to run the QR codes."
- ACER, 2026-10-18: `D:/asolaria-absorb/shadowcat` contains no QR code. Measured here on the 10 files:
  no line matches `\bqr\b` (case-insensitive). The only `qr` substrings are in `sqrt` and the NIST
  test message.
- Aether's QR round trip, `qr/colour-qr`, is checked byte-exact with shadowcat's `sha256.rs` in
  `docs/handoffs/acer-shadowcat-sha256-2026-10-18/cloud/`: 9 payloads, 9 byte-exact, shadowcat's
  digest equal to coreutils' on each (`cloud/CLOUD-ROWS.hbp`).

Both are kept as stated, beside each other. Neither replaces the other.

## Files

| Path | What |
|---|---|
| `src/main.rs`, `src/sha256.rs`, `src/bin/{verify,callingchain,threegap}.rs` | the owner's program, unchanged |
| `records/` | the owner's run records and the law, unchanged (`PROVENANCE.md`, "Layout") |
| `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml` | written here; the lock has this package only |
| `tests/reproduce.rs`, `tests/fixtures/REPRODUCE.hbp` | the reproduction test and its measured rows |
| `tools/horizon.sh` | runs `shadowcat` with a private `/root` |
| `check.sh`, `UPSTREAM.sha256`, `PROVENANCE.md`, `.gitattributes` | checks, pins, provenance, byte-safe checkout |
