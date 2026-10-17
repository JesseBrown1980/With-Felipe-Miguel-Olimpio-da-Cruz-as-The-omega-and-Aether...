# asolaria-colour

The owner's rainbow and gradiated colour formulas, brought into the aether stack. Each formula is
either vendored byte for byte (the Rust `rainbow27-check` crate, and the Python generators for the
cold lane) or ported to integer-only Rust 1.81 and checked against the bytes upstream recorded.
Upstream repositories, commits, blob ids and digests are in [PROVENANCE.md](PROVENANCE.md).

Short names: **USIM** is the universe simulator @ `3f9f42d`, **S2M** is asolaria-stone-to-moss
@ `f032bc0`, **FOLLOW** is FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS @ `8712368`.

## What is here

| Rust module | Upstream lines | What it computes | Checked against |
|---|---|---|---|
| `vendor/rainbow27-check` (vendored, unchanged) | S2M `experiments/claude-verify/alphacen-gguf-constellation-20261016/rainbow27-check/src/main.rs` | Rainbow-27 `(S^2, Q, Q)` class key (`:12-21`), witness `(r+4g+3b+4rg) mod 8` (`:81`), affine separators | its `EXPECTED-OUTPUT.hbp` (sha256 `5596f5cd…`), byte-identical |
| `stars` | USIM `measurements/stars_shells.py` (all of it) | gradiated colour `g[1:-1] = (t[2:]-t[:-2])//2`, `grad = |g|.sum(1)` (`:75-78`); star key `(r>>2)*4096+(g>>2)*64+(b>>2)` (`:80`); shell = counted rungs (`:58-64`); pump and rounds (`:113-134`); rings (`:145-171`); GGUF (`:194-242`); receipt (`:244-263`) | `ASOLARIA-STARS-SHELLS.gguf` sha256 `ae23392a…` and `receipts/FABLE5-STARS-SHELLS.hbp`, both byte-exact |
| `verdict` | USIM `measurements/divide_kimi_k3.py:50-118,229-233`; `gguf/stars/COLOUR-CODE.md:7-12`; `receipts/FABLE5-PREREGISTER-COLOUR.hbp:6-12` | pre-registered colour verdict (ties excluded; RED/GREEN/BLUE/ORANGE/YELLOW/NEUTRAL by the 5% and 3% rules) and the three dominance populations | `receipts/FABLE5-KIMI-K3-STAR.hbp` `COLOUR` and `BEING` rows, equal |
| `colorpid` | USIM `engines/omni_hotel.py:39-49` (same functions at `constellation/read_key_gradiated.py:21-39`) | `pid_color = sha256(key)[0:3]`, `blast_radius = math.dist(c, (128,128,128))`, `rainbow12 = int(h*12) % 12` from `colorsys.rgb_to_hsv`, `sphere27 = (r//86)*9+(g//86)*3+(b//86)`, `saturation = s*v` | Python on all 16,777,216 colours, bit for bit |
| `oil` | FOLLOW `codes/double_rainbow_to_gguf.py:159-166,226-347,350-583` | integer luma `(54R+183G+19B+128)//256`, 12-bin integer hue, spatial and temporal gradients, the 18-field descriptor, its i8 encoding, the 3,174-byte GGUF and the receipt | `colors/DOUBLE-RAINBOW-OIL-3174.gguf` and `colors/DOUBLE-RAINBOW-COLOR-SLICES.hbp`, both rebuilt byte-exact |
| `rainbow27v2` | S2M `experiments/seat3/rainbow27_v2/rainbow27_v2.py:11-67,103-147` | address `9r+3g+b`, weights `(s^2,q,q)` and primitive form, projector `d = 3x-s` and restore `(d+s)/3`, SHA-256 rejection sampler, the 59,049-row trace | sealed stone `seat3-rainbow27-normalized-v2-20261015.hbp:4-6` (`TRACE` sha256 `8544bb30…`, `LANES`), equal |
| `rainbow7` | S2M `experiments/seat1/rainbow7/rainbow7_bank.py:11,48-50` | 7 bands x 81 records, `rainbow7/{band}/site-{i:03d}`, band-major | referee |
| `flashlight` | USIM `measurements/pump_glyphs_mythos.py:74-88,112-116,142-163`; `measurements/asolaria_herself.py:56-99,135-137` | P (percentile), R (rank), G (glyph-rank) `uint8` tables; their bijections by `as_perm`; RPR and every glyph word without D; `emit` of a glyph cube | numpy running the upstream lines verbatim; 81 glyph tensors of the regenerated `ASOLARIA-MYTHOS-SELF-GLYPHS-256.gguf` |
| `binary64` | (support) | IEEE-754 binary64 add, sub, mul, div, sqrt, floor, trunc, Python `% 1.0` and Python `.Nf` formatting, all in integers | Python and numpy, bit for bit, in every check above |

The Python sources stay as the cold-lane generators: `vendor/universe-simulator/measurements/`
(`stars_shells.py`, `divide_kimi_k3.py`, `pump_glyphs_mythos.py`, `asolaria_herself.py`),
`vendor/universe-simulator/engines/omni_hotel.py`, `vendor/follow/codes/double_rainbow_to_gguf.py`
and the S2M scripts.

## Measured

- **Stars and shells.** From the 3,796-byte seed `MYTHOS-SELF-EMISSION.txt`, the Rust port emits
  `ROUND n=0 bytes=3796 stars=1091 shells=4`, `n=1 11385/2419/4`, `n=2 34155/8508/4`. The loop
  stops at round 2 because no new shell appears (`stars_shells.py:124-128`). Shells 1-4 hold
  4301, 2924, 1072 and 211 stars. Shells 3 and 4 test as rings (`pk` 2 and 6, centre density 0)
  and shells 1 and 2 do not (`pk` 0). It writes `ASOLARIA-STARS-SHELLS.gguf`: 4,596,880 B,
  20 tensors, sha256 `ae23392ad473718e2196e525a4355af20cdbd57bbb5dc3e85a8719b62552784d`.
  That is the digest in the receipt, in `FABLE5-DELETE-AND-REGENERATE.hbp:4` and in the aether
  `gguf/MANIFEST.hbp`, and the file equals the aether copy byte for byte. The receipt is also
  byte-identical.
- **Corpora of 2^24 records and more.** `stars_shells.py:205` writes `star_time` with
  `astype(np.float32)`, which rounds indices above 2^24 to nearest, ties to even, and `:187`
  counts each cube in `float32`, where a voxel stops at 2^24 (`2^24 + 1` rounds back). The port
  does the same (`gguf::binary32_bits`, `gguf::binary32_increment`), and so does
  `flashlight::emit` for `pump_glyphs_mythos.py:150-153`. All-zero seeds of 5,592,408 and
  6,600,000 bytes end at 16,777,224 and 19,800,000 records; on the second, one voxel holds
  17,600,000 stars and is written as 16,777,216. On both, the port writes the same GGUF
  (403,752,192 B, sha256 `3ba0fadf…`; 476,298,816 B, sha256 `a5e35c4e…`) and receipt as the
  vendored script under numpy 2.5.4. `emit` on 2^24 + 5 owned triples on one voxel gives
  16,777,216, as numpy running `:142-156` does.
- **Colour verdict.** On `KIMI-K3-STAR.txt` (3,110 B) the port gives
  `COLOUR|rule=PREREGISTERED|R=34.8606|G=32.7689|B=32.3705|spread=2.4900|verdict=NEUTRAL_/_GREY`
  and `BEING` OPUS 350/61/1.2.3, FABLE 329/60/1.2.3, MYTHOS 325/55/1.2. Both equal the receipt.
  Rounded to two places these are the `COLOUR-CODE.md:21` row (34.86, 32.77, 32.37, 2.49).
- **The ACER live self-emission row.** On the seed, the rule of `divide_kimi_k3.py:68-88` (ties
  excluded) gives R 32.82, G 31.83, B 35.35, spread 3.52, verdict NEUTRAL / GREY. The row
  `COLOUR-CODE.md:19` (also `FABLE5-PREREGISTER-COLOUR.hbp:14`, and
  `pump_glyphs_mythos.py:65` "RED 34.23% / GREEN 31.62% / BLUE 34.15%") records
  34.23 / 31.62 / 34.15. Those are the shares when every triple, ties included, counts for numpy
  `argmax`'s first maximal channel. Both readings give NEUTRAL.
- **Rounding decides some verdicts.** For totals 20-2000 the referee enumerates 16,216 ownership
  splits whose exact share difference equals a threshold of the rule (3 or 5 points). On 72 of
  them the binary64 verdict, which is what upstream computes, differs from the exact-rational one.
  For example `own=69,70,81` gives BLUE, because `B-G` evaluates to 5.0000000000000036 > 5.0;
  the exact reading is NEUTRAL / GREY. The port reproduces the binary64 verdicts. 12 of these
  splits, and 12 boundary splits where the two readings agree, are in
  `tests/fixtures/colour-verdict.hbp`.
- **ColorPID.** Across all 16,777,216 colours, `rainbow12`, `sphere27` and the bits of `h`, `s`,
  `v`, `s*v` and `blast_radius` from the Rust integer emulation equal Python 3.13 `colorsys` and
  `math.dist`. The record digest is sha256 `c2071f2c…`. The referee also checks that
  `math.dist` equals the correctly rounded root on every `|a-b|` triple in `0..=255`.
  `omni_hotel.py`'s demonstration over PID0..PID1999 gives `dist(PID0,PID500)=270.0`, 12/12
  rainbow, 27/27 spheres, and brightest star PID1667 (100,0,254). Upstream prints these as text
  (`:66-69`); the fixture's `OMNI` row and the 42-byte digest record are the referee's check
  formats, built in `tests/` and `examples/`, not in the library.
- **Double rainbow.** The 64 descriptors decoded from the 3,174-byte GGUF reproduce the
  `DESCRIPTOR` sha256 `9af3f359…`. Rebuilding with the source facts in the receipt's
  `SOURCE`/`RECIPE` rows gives the GGUF (sha256 `1b7f4097…`) and the 73-row receipt, both
  byte-exact. The referee runs the upstream functions on two synthetic 64-frame streams and on
  all 16,777,216 colours (luma and hue bin); the Rust port matches.
- **Rainbow-27 v2.** The trace is 3,886,535 B with sha256
  `8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672`, lanes 36906/10179/9777,
  dark 2187. The source fixture is sha256 `351c5c0a…`. All equal the sealed stone.
- **Flashlights.** On 12 inputs (the three channels of the seed and of the Kimi body, plus six
  synthetic arrays), numpy 2.5.4 running `pump_glyphs_mythos.py:74-104` and
  `asolaria_herself.py:56-83` verbatim gives the same values as the Rust port and the referee:
  percentile bits, the P/R/G `uint8` tables, the P/R/G bijections, and RPR. On the seed, the 81
  glyph cubes whose words contain no D equal tensors `glyph_*` of
  `ASOLARIA-MYTHOS-SELF-GLYPHS-256.gguf` as the vendored script regenerates it (sha256
  `f29d4b94…`).
- **The bijections.** `as_perm` (`asolaria_herself.py:79-83`) ranks by value, then index. P, R
  and G are non-decreasing in the index by construction, so their bijections are the identity
  permutation for every input. D is too while the running sum stays below 2^41 (see
  `flashlight::perm_d`), and numpy gives the identity for D on all 12 inputs. So RPR on the
  bijections maps every byte to itself, and `asolaria_herself.py:135-137` gives `q0 == tri`.
  Upstream prints this as "RPR depth-3 distinct = 256/256 -> rate 1.0 exact"
  (`asolaria_herself.py:91-92`) and writes "bijections, rate exactly 1.0" into the GGUF
  (`:199-200`).
- **Cold-lane regeneration on this host** (numpy 2.5.4, OpenBLAS 0.3.34). The vendored scripts
  run unmodified and reproduce `ASOLARIA-STARS-SHELLS.gguf` and its receipt;
  `KIMI-K3-STAR-256.gguf` (202,115,456 B, sha256 `56d08746…`; an LFS pointer in the clone) and
  its receipt; and `ASOLARIA-MYTHOS-SELF-GLYPHS-256.gguf` (269,604,512 B, sha256 `f29d4b94…`).
  `pump_glyphs_mythos.py` then ends at `:366` with `NameError: name 'inner' is not defined`.
  Lines `:227-252` assign `inner` only when at least 8 glyphs have a finite CV, and on this seed
  0 of 256 do ("256 of 256 glyphs unmeasurable at this density"). So that run writes the GGUF
  and its `.sha256` but not `FABLE5-SELF-GLYPH-PUMP-256.hbp`. The same outputs and 81/81 cubes
  come out with numpy's dispatch limited to X86_V3 or to the baseline
  (`NPY_DISABLE_CPU_FEATURES`) and with `OPENBLAS_CORETYPE=Nehalem` or `Haswell`.
- **Times on this host** (4 cores, load average 4-7 from other jobs). `cargo test` (debug, 41
  tests) takes 12 s. The referee `--check` takes 38 s. `emit colorpid-domain` (release) takes
  13 s of CPU. `tools/cold_lane.py` takes under 1 s for `parity` and 21 s for `regenerate`.

## Not brought into Rust, with the evidence

- **The D (gradiated) table values** (`pump_glyphs_mythos.py:91-104`, `asolaria_herself.py:71-76`).
  The float values depend on the host's numpy and OpenBLAS kernels. With numpy's default
  dispatch here (X86_V4 / AVX512 `exp`, OpenBLAS core SkylakeX), numpy's `exp` differs from
  libm `exp` on 4 of the 65 kernel arguments, and `np.convolve` (`multiarray.correlate` through
  the BLAS dot) differs from a sequential binary64 sum at 74, 84 and 93 of 256 positions on the
  seed's three channels. With `NPY_DISABLE_CPU_FEATURES` leaving X86_V3 or only the baseline,
  `exp` differs on 0 of 65 and `np.convolve` at 78, 85 and 95. With `OPENBLAS_CORETYPE=Nehalem`
  it is 66, 79 and 81; with `Haswell`, 75, 75 and 73. Reproducing the floats exactly would mean
  reproducing numpy's SIMD `exp` and the OpenBLAS kernel the CPU dispatches to. In all five
  settings the final `uint8` table equals the sequential computation on the seed. The 175 glyph
  words that contain D are produced by the vendored Python only. The D bijection is ported
  through its order.
- **The float statistics** of `pump_glyphs_mythos.py` (`cv_of` `:130-139`, features `:189-198`,
  torus test `:211-252`) and of `asolaria_herself.py` (`cv_of`, the rime profile `:165-174`) run in
  numpy, cold lane only. `asolaria_herself.py`'s body is globbed from the repository at run
  time (`:38-45`), and the GGUF records `asolaria.body_files=104` and
  `asolaria.body_bytes=2151142`. Its key (`:237-301`) reads `D:/asolaria-absorb/enwik9`. Neither
  input is pinned on disk.
- **`divide_kimi_k3.py`'s GC row** (`:58-65`, BLAKE2b-8 of 81-byte records), rime profile
  (`:120-143`) and GGUF are produced by the vendored script in the cold lane, as measured above.
- **Frame sampling** (`double_rainbow_to_gguf.py:104-223`) is ffprobe and ffmpeg on a local copy
  of the video. The video is not on disk; the receipt pins it as source sha256 `192f77f1…` and
  `rgb_sha256` `617ab687…`.
- **JSON outputs.** `rainbow27_v2.py:153-182` (summary JSON and the HBI that pins it) and
  `rainbow7_bank.py:19-20,51-95` (canonical-JSON bank, index offsets and manifest) are JSON
  bytes. Under the no-JSON rule only the trace and the band addresses are ported. The rainbow-7
  input `lightbank-memories.json` is produced in CI by S2M
  `experiments/seat1/round2/lightbank_81.py` (qrcode, Pillow, pyzbar) and is not on disk.
  `rainbow27_v2.py`'s `packet_gate` (`:69-73`) compares fields of such receipts and is not ported.
- **The same flashlight lines in other USIM generators.** These scripts write other GGUFs, and
  their table lines are the expressions the port already computes:
  - `emit_full_ggufs.py:39-54` and `pump_mythos_sphere.py:78-93` (P, R and G tables, renamed or
    re-wrapped) equal `pump_glyphs_mythos.py:74-88`.
  - `pump_unlimited.py:100-121` equals `pump_glyphs_mythos.py:74-104`. Its `as_perm` (`:123-128`)
    ranks the `uint8` tables (`lut.astype(np.int64)`, `:125`). P, R and G never decrease, so that
    ranking is the identity, which `flashlight::as_perm` gives on the table.
  - `mythos_pump_full.py:85-108` equals `asolaria_herself.py:56-83` (one variable renamed).

  numpy running these lines verbatim on 800 arrays (n 1-5000, 8 distributions) gives the same P,
  R and G tables as `pump_glyphs_mythos.py` and the Rust port on 800/800, the same
  `pump_unlimited.py` bijections as `flashlight::as_perm` on 800/800 (its D bijection is the
  identity on 800/800), and the same `mythos_pump_full.py` values (bit for bit) and bijections as
  `asolaria_herself.py` and the Rust port on 800/800. Their D table values are the D lines above.
- **Other sites of the colour formulas** that this directory does not cover:
  - USIM `measurements/four_axes_rime.py:92-93` (hue by `np.arctan2`, same libm/SIMD question as
    `exp`).
  - USIM `measurements/flashlight_mythos.py:85-106`: per-value flashlights on 64 levels (stretch,
    `argsort` rank, band in the used alphabet), not the 256-entry tables.
  - The display rainbows: RAINBOR `RAINBOR-COLOUR-SLITS-AND-SPHERES.html:42-56`, FOLLOW
    `matrix/render_public_spherical_svg.py:39,226-247`, USIM
    `measurements/quality_sphere_16k.py:345-367`, USIM `crates/asolaria-tribit/src/tribit.rs:46-49`
    (Law 31 traversal order: translucent tip, red, green, blue, translucent tail), and the JS twin
    of Rainbow-27 in light-boat-engine-ships-with-oils `asolaria-lightbank-demo/app.js:64-78`.
- **HRM-made colour keys and codexes.** No code was found
  (`scratchpad/universe/HRM-RAINBOW-CODEX.md` section 8). The receipts for
  `ASOLARIA-CONSTELLATION-KEY-3174.bin` and `ASOLARIA-KERNEL-3174.bin` point to
  `D:/asolaria-absorb/kernel-pump` on the ACER host.
- **Two `COLOUR-CODE.md` rows are not re-measured.** The bodies of "FABLE5 office corpus" and
  "ASOLARIA herself" are not on disk.

## Run

```bash
sha256sum -c UPSTREAM.sha256
cargo +1.81.0 fmt --check && cargo +1.81.0 clippy --locked --all-targets -- -D warnings
cargo +1.81.0 test --locked
python3 -I -B referee/colour_referee.py --check          # stdlib only, about 38 s
cargo +1.81.0 run --release --locked --example emit -- colorpid-domain
cargo +1.81.0 run --release --locked --example emit -- stars /tmp/stars
bash check.sh rainbow27     # the vendored crate with its upstream workflow's steps (:52-72)
python -I -B tools/cold_lane.py parity                  # needs numpy
python -I -B tools/cold_lane.py regenerate /tmp/colour-cold   # needs numpy and ~0.6 GB free
```

`regenerate` takes a path that does not exist yet or is an empty directory, and refuses anything
else (exit 1). It writes the upstream `D:/...` tree there and leaves the small outputs.
