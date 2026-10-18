# Provenance: deterministic-slice-time-harness

Upstream: `JesseBrown1980/deterministic-slice-time-harness`, commit
`be09be19e6c7db57187c09d7a7d6c6726023f97c` (tree `22df7b560a501edeb0207cb931dd457704d2aa90`,
committed 2026-08-08T18:10:57-03:00, "star port sidecar"). On 2026-10-17 and 2026-10-18, `git ls-remote` gave
`HEAD` and `refs/heads/main` at this commit, and a full clone listed 20 commits from `5f6f6d6`
(2026-07-04) to `be09be1`. `src/lib.rs` has had blob `e4f3f930…` since `cdbc145` (2026-08-06,
"clippy: clear the 1.81 gate, behaviour-preserving"); no commit in that history has a `tests/`
directory.

## Copied files

Each file was taken with `git cat-file blob be09be1:<path>` and compared with `cmp` against the
`raw.githubusercontent.com` bytes at the same commit. `git hash-object` of every copy equals the
upstream blob id, and `UPSTREAM.sha256` pins the sha256 of every copy (`sha256sum -c UPSTREAM.sha256`).

| Path here | Upstream path | Upstream blob SHA-1 | Bytes | Line endings | sha256 |
|---|---|---|---|---|---|
| `src/lib.rs` | `src/lib.rs` | `e4f3f9302b49b4b6bb65b7dfd8c83208b7bd2395` | 26878 | CRLF (688 lines) | `23ea066ffecaa38ddfe38935c640019a3cabf03b9490259e78b2fa06cf73b29b` |
| `Cargo.toml` | `Cargo.toml` | `1615715b7d8744b14bfcf42d85aa44e54449f811` | 789 | LF | `64e7d2943f6b8234bf6462e74de89d5885c725ca4297d64986e6e941eeaa8e22` |
| `README.md` | `README.md` | `cd671b1bb3ad2194f56424363eb2c7c94c6921b3` | 3039 | LF | `7dc8c12b13fa7e6743c90b0b26507340ffbd091a58d217f46940b0bd272484dd` |
| `LICENSE` | `LICENSE` | `a58f45223b42fb475ea14d39abdf2ee3fbb5cc49` | 165 | LF | `cd9d28192fbf0da189ec2a502f950f39800c1fe76557d8c3704d33851588e851` |
| `rust-toolchain.toml` | `rust-toolchain.toml` | `6f9c67b5082cea3bdce5efe3d2f91db969ce1f74` | 400 | LF | `b19266c79d308cd1f288d0d59fd26573964c03ecccdebb8587d1584b03e259b1` |

The upstream `Cargo.toml` is used unchanged: the crate builds in place as package
`deterministic-slice-time-harness` 0.1.0, library `deterministic_slice_time_harness`, with no
dependencies.

The upstream tests are the ten `#[test]` functions in `src/lib.rs:502-688` (`mod tests`), carried in
the copied file unchanged.

`.gitattributes` in this directory marks every file `-text`, so Git stores and checks out these bytes
as they are on every platform (`git hash-object --path` gives the upstream blob ids above, also with
`core.autocrlf=true`). aether's root `.gitattributes` (`* -text`, commit `f36f399`) already does the
same for every path; this directory's copy repeats it so the bytes stay fixed if the directory is
moved. Measured in scratch repos with `core.autocrlf=true`: the root file alone or this file alone
stores `src/lib.rs` as blob `e4f3f930…`; with neither, the blob is `be82b48f…` and an LF checkout of
it fails `sha256sum -c`.

Not copied (not part of the crate): `.github/workflows/rust-1.81-clippy-verification.yml`
(`a4abbc6b…`), `.gitignore` (`96ef6c0b…`; it lists `Cargo.lock`, which aether keeps for `--locked`),
`.nojekyll`, `.nojekyll.sha256`, `index.html` (`a8a4bc6d…`), `index.html.sha256`,
`STARPORT-2026-08-08.hbp` (`d4f39569…`), `STARPORT-2026-08-08.hbp.sha256`.

Privacy scan of the five copied files: no e-mail address, IP address, phone number, key or secret.
The only personal name is the owner's ("Jesse Daniel Brown", `rust-toolchain.toml:1`).

## Files added in aether

- `Cargo.lock`: written by `cargo +1.81.0 generate-lockfile --offline`; one package entry, no dependencies.
- `UPSTREAM.sha256`, `PROVENANCE.md`, `.gitattributes`.

## What it computes

The upstream README states the claim and its tags (README.md:15, 20-22):

> **The capstone of the shadow-resolution arc: 0-loss slice-time extrapolation, or `Held`.**

> - **CANON/DESIGN** — In a deterministic metatagged simulated universe, if multi-cylinder / Q-PRISM / tomography reconstructs the full **state** of a bounded slice **and** the transition rule is known, then past and future slices are **0-loss computable** — they carry no new entropy relative to `(state, rule)`. Return exact bytes or `Held`.
> - **MEASURED** (`cargo test`) — recovery half (enough shadows recover exactly, too few `Held`) + deterministic forward/backward extrapolation byte-identical + **new entropy DETECTED** (a truth that gained entropy ≠ the determined prediction).
> - **UNVERIFIED** — live cross-fabric Hilbra run; real-world quantum prediction; any claim that genuinely-new entropy is predicted losslessly (Shannon/Fano/DPI forbid it).

and (README.md:33) "For a real/stochastic universe only the *determined* component is 0-loss."

What the code computes, integer only (`src/lib.rs`):

- A slice is `SimState::serialize` (`:141-156`): `w`, `h`, particle count, then per particle sorted by
  tag `x, y, vx, vy, tag`, all big-endian (6 + 12·n bytes). The count is written as `u16` (`:147`),
  so the layout round-trips for n ≤ 65535. Measured at n = 65536 (500×500 grid): 786438 bytes,
  header count 0, `deserialize` gives 0 particles, and `run_deterministic(.., 2, &[0, 1])` gives
  `SLICETIME|reconstructed=true|forward_exact=0/2|backward_exact=0/2|all_exact=false|fire=0|json=0`;
  at n = 65535 the same call gives `all_exact=true`.
- `project_shadows` (`:70-80`): the slice is cut into 6-byte (48-bit) blocks (`BLOCK`, `:24`; a short
  last block is left-shifted, `:43-45`) and each block's residue is taken on each of the four
  `CYLINDERS` moduli 33554467, 33554393, 33554213, 33550609 (`:23`).
- `reconstruct` (`:83-116`): CRT over the chosen subset of cylinders. It returns the exact bytes,
  or `Err(Held::InsufficientShadows)` when the subset is empty (`:88-90`), when the running modulus
  is below 2^48 after the whole subset (`:103-109`), or when `mod_inv(m % p, p)` is `None` (`:99`).
  The `:99` case occurs when a cylinder index repeats before the running modulus reaches 2^48:
  measured on `sample_state`, `[0, 0, 1]`, `[1, 1, 2, 3]`, `[0, 0]` and `[3, 3]` give
  `Held::InsufficientShadows` (also through `run_deterministic` and `watcher_gate`), while
  `[0, 1, 0]` reconstructs exactly because the loop stops at `:103-105` before the repeat.
- `SimState::at(dt)` (`:184-201`): `x' = (x + dt·vx) mod w`, `y' = (y + dt·vy) mod h`
  (`rem_euclid`), velocities and tags unchanged, with `dt·v` computed in `i64` (`:189-190`).
  `at(k).at(-k)` is the identity for particles with `x < w` and `y < h` (measured 500 of 500 grid
  states below, k = 1..=64). `deserialize` (`:157-182`) accepts any `x`, `y`: for `x = 15` on a
  10×10 grid, `at(1).at(-1)` gives `x = 5`, `MtpMovementMatrix::measure(s, s.at(1))` gives
  `reversible=true` with `project_reverse(s.at(1))` not equal to `s`, and `run_deterministic` still
  reports `all_exact=true` (both sides go through `at`). With `dt = i64::MAX` the product at `:189`
  overflows: the dev profile panics ("attempt to multiply with overflow"), release wraps.
- `run_deterministic(truth0, horizon, subset)` (`:358-378`): reconstructs slice 0 from the subset's
  shadows, deserializes it (`Err(Held::BadState)` if that fails, `:367`), and for each
  `k = 1..=horizon` records whether `state0.at(±k).serialize()` equals `truth0.at(±k).serialize()`
  byte for byte. Its `to_hbp` rows are `SLICETIME|…` and `SLICETIME-BOUNDARY|…` (`:342-352`).
- `verify_or_detect_entropy(state0, observed_future, dt)` (`:383-393`): `Ok(())` when
  `state0.at(dt)` serializes to the observed bytes, otherwise `Err(Held::PredictionDivergedNewEntropy)`.
- `watcher_gate` (`:418-438`): reconstructs from the `sufficient` cylinders and recomputes every
  `cross` cylinder's residues; returns `Verdict::VerifiedClone(bytes)`, or
  `Verdict::Held(HeldReason::InsufficientShadows | HeldReason::WatcherDisagreement)`.
- `SimState::clamp_step` (`:211-242`): one step in which a particle that would leave the grid keeps
  its position and has that velocity component set to 0. Upstream's doc comment (`:208-210`) reads
  "a particle that would leave the grid is CLAMPED to the edge and its velocity ZEROED - the
  pre-collision velocity is LOST"; the code keeps the particle's current cell on that axis
  (`:218-227`). Measured: `(5, 5, 10, -7)` on 10×10 gives `(5, 5, 0, 0)`; in the upstream fixture
  (`:671-681`, `x = 9`, `w = 10`) the current cell is the edge cell, giving `(9, 5, 0, 0)`.
- `MtpMovementMatrix::measure(a, b)` (`:266-285`): per particle of `a`, the first particle of `b`
  with the same tag (`find`, `:270`) gives `(tag, dx, dy)` with the shortest signed torus delta
  (`:246-255`); `reversible` is false when the counts differ, a tag of `a` is absent from `b`, or the
  first same-tag particle of `b` has a different velocity (`:268-282`). Upstream's comment (`:259`):
  "`reversible` is false the moment the movement lost information (a clamp)". With repeated tags it
  is also false when no count, tag or velocity changed: `a = {(10, 10, 1, 0, tag 7), (20, 20, 2, 0,
  tag 7)}` on 50×50 and `b = a.at(1)` give `reversible=false`, moves `[(7, 1, 0), (7, -9, -10)]`, and
  `project_reverse(b)` not equal to `a`; the grid generator below with tag `k % 4` gives
  `reversible=false` in 442 of 500 states (the 442 with a repeated tag, none with an exact reverse
  projection) and `reversible=true` with an exact reverse projection in the other 58. `project_reverse` /
  `project_forward` (`:313-319`) subtract / add those deltas modulo `w`, `h`. Row
  `MTPMATRIX|moves=…|mtp1=pixel_delta|mtp2=frequency_shell|mtp3=cylinder_residue|reversible=…|…` (`:320-323`).
- `OmnibitPixel::of` (`:473-495`): FNV-1a 64-bit digest of the slice (`:441-447`),
  `roof = min(n_cylinders, 4) * 25`, `residual_bits = 48 - roof` saturating at 0, and
  `capacity_margin_bits = roof - 48`.

So every result is exact bytes (or a byte-for-byte equality flag) or a `Held` value; nothing is
approximated, and the crate has no `f32`/`f64`.

The owner's crate-family matrix lists it as
`PIECE|key=deterministic-slice-time-harness|status=MEASURED-10/10|role=slice-time + MtpMovementMatrix reversible retrodiction + arrow-of-time falsifier|json=0`
(`ASOLARIA-UNIVERSE-SIMULATOR…@3f9f42da:matrices/FABLE5-CRATE-FAMILY-2026-07-04.hbp:6`).

## License

`Cargo.toml` line 6 and the upstream `README.md` declare `MIT OR Apache-2.0`. The upstream `LICENSE`
(165 bytes) is the MIT notice in short form, copied unchanged; its copyright line is
"Copyright (c) 2026 Asolaria Federation", and `Cargo.toml` line 7 is `authors = ["Asolaria Federation"]`.
aether's root `LICENSE` has the full MIT permission text under "Copyright (c) 2026 Jesse Daniel Brown";
aether's root `LICENSE-APACHE` has the Apache-2.0 text. Which full text accompanies this crate is
left to the owner.

## Checks on Rust 1.81.0 (rustc 1.81.0 eeb90cda1, clippy 0.1.81)

The upstream workflow (`.github/workflows/rust-1.81-clippy-verification.yml`, blob `a4abbc6b…`) runs
`cargo clippy --manifest-path … --all-targets -- -D warnings` with no lint allowed, a float check
(`grep -cE '\bf(32|64)\b'` over every `.rs`, whole-line `//` comments stripped, exemption markers
honoured) and `cargo test --manifest-path … --all-targets -- --nocapture`, under
`RUSTUP_TOOLCHAIN=1.81.0`. Equivalent checks here, plus the pinned sha256 and `--locked`:

| Command (in this directory) | Result |
|---|---|
| `sha256sum -c UPSTREAM.sha256` | 5 files OK |
| `cargo +1.81.0 clippy --locked --all-targets -- -D warnings` | exit 0, no lint allowed |
| `cargo +1.81.0 clippy --locked --all-targets -- -D warnings -F unsafe_code` | exit 0 |
| the workflow's float step, same logic | scanned=1, exempt=0, unexempt=0 |
| `grep -rnE '\bf32\b\|\bf64\b\|as f[0-9]' src/` (aether's gate pattern) | no match |
| `cargo +1.81.0 test --locked` | 10 passed, 0 failed (doc-tests: 0) |
| `cargo +1.81.0 test --locked --all-targets --release` | 10 passed, 0 failed |
| `cargo +1.81.0 fmt --check` | exit 0 |

`src/lib.rs` has no `#![forbid(unsafe_code)]` attribute and no `unsafe` token; adding the attribute
would change the upstream bytes, so the gate passes `-F unsafe_code` to clippy instead. A scratch copy
with one `unsafe` block added fails that command ("usage of an `unsafe` block") and passes without
`-F unsafe_code`.

## Rows measured through the public API (2026-10-17, re-run 2026-10-18)

A scratch driver outside this directory called the public functions on the upstream test fixtures
(`sample_state`, `src/lib.rs:507-542`; the test slices at `:620` and `:643`):

- `sample_state` serializes to 54 bytes, 9 blocks. Over all 15 non-empty cylinder subsets with
  horizon 25: the 4 single-cylinder subsets give `Held::InsufficientShadows`; the 11 subsets of two
  or more give `SLICETIME|reconstructed=true|forward_exact=25/25|backward_exact=25/25|all_exact=true|fire=0|json=0`.
- `MtpMovementMatrix::measure(s, s.at(1))`: moves `[(1, 2, -1), (2, -3, 4), (3, 1, 1), (4, 5, -2)]`,
  `reversible=true`; `project_reverse(s1)` equals `s` and `project_forward(s1)` equals `s.at(2)` byte
  for byte. The clamp fixture (`:671-681`) gives `reversible=false`, and `project_reverse` of the
  clamped slice does not equal the slice before the clamp.
- `verify_or_detect_entropy`: `Ok(())` for `s.at(7)`, `Err(PredictionDivergedNewEntropy)` with the
  injected particle of `:596-603`.
- `watcher_gate`: clean `[0,1]`+`[2,3]` gives `VerifiedClone` of the input bytes; one tampered residue
  gives `Held(WatcherDisagreement)`; `[0]` alone gives `Held(InsufficientShadows)`.
- `OmnibitPixel::of` on the `:643` slice, digest8 `32352694354fcd39`: n_cylinders 1/2/3/4 give
  residual_bits 23/0/0/0 and capacity_margin_bits -23/2/27/52.
- 500 seeded integer-LCG states (w, h in 1..=500, 0-39 particles, velocities -20..=20, unique tags
  `7k + 1`, every particle with `x < w`, `y < h`), each over the six two-cylinder subsets with
  horizon 64: 3000 of 3000 runs `all_exact`, 0 `Held`; the MTP reverse projection of `at(1)` equals
  the state in 500 of 500; `at(k).at(-k)` equals the state for every k = 1..=64 in 500 of 500.
