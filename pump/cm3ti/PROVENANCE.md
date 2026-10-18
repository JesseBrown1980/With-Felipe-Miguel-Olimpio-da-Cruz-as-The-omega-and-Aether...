# Provenance — cm3ti integer-deterministic compressor family

Every vendored file is byte-identical to the owner's source. Origin: the owner's honest-compressor
tool tree, delivered from the ACER seat on 2026-10-18 as
`honest-compressor-9ebd6119-export-2026-10-18.zip`
(212 entries, 23,329,562 B, sha256 `0f02b52d4c826fe12a57d1a2308a46d1b3334e9726d886631c39488fcbaa9074`),
owner folder
`C:\asolaria-acer\scratch\algorithms-of-asolaria-publication-20260723\tools\honest-compressor\`
(code and results of cloud session 9ebd6119, July 2026). The vendored subtree is that export's
`rust/` directory: the 31 `.rs` compressors plus the two owner receipts `rust/RUN-ENWIK9.md` and
`rust/variants/RECEIPT-RAINBOW.md`. Nothing in the vendored bytes is edited.

`UPSTREAM.sha256` pins the content sha256 of all 33 files; verify from the crate root with
`sha256sum -c UPSTREAM.sha256`. The `git blob id` column equals `git hash-object` of each file.

| vendored path | upstream path | bytes | git blob id | sha256 |
|---|---|---|---|---|
| `rust/RUN-ENWIK9.md` | `tools/honest-compressor/rust/RUN-ENWIK9.md` | 1869 | `ab1f1a85d171a5fa0d5fa2b3e0ecd0fb0084ac59` | `ec7a2594d8f2eab93202c705e2c42a4637dd41df1bcad7e38386c058fc6e6948` |
| `rust/cm3t.rs` | `tools/honest-compressor/rust/cm3t.rs` | 17951 | `5189680f5df9ecc231397dc58f449eb7ebbe98df` | `2ed7fa7e87bc0f2203c9d90dc0ee7a4ff54dec15f3b65d30cbcad3cefd5ec8ef` |
| `rust/cm3ti.rs` | `tools/honest-compressor/rust/cm3ti.rs` | 17733 | `7d05ef0f9b78de5e44b468d4ca8b314058c9aef6` | `416dd6a2a5403ae36947dfb9af06f7680c1130613db51385a1889c39f0a67af0` |
| `rust/cm3ti_combo.rs` | `tools/honest-compressor/rust/cm3ti_combo.rs` | 19610 | `30930b0f652066cd5639803eb9e247bbfe10cdb8` | `594e8e1160f2851ff6b83440437290d45ecad2139914e901693fa17f4aae0160` |
| `rust/cm3ti_rainbow12.rs` | `tools/honest-compressor/rust/cm3ti_rainbow12.rs` | 19105 | `3eb4faa3e26619c1ea2162b5d44485f806600b87` | `ff2fab7b52c9da533ed2e67e55589c86006c5d8449f98cabbef6137961abf0f0` |
| `rust/cm3ti_rbladder.rs` | `tools/honest-compressor/rust/cm3ti_rbladder.rs` | 23073 | `fe4cad3949b3accf377090ac2de2fcfdaa0e7435` | `595c1445ee4730fe04113826aa26906d3069b73270ea5965c54a35e7d19e34db` |
| `rust/cm3ti_sector.rs` | `tools/honest-compressor/rust/cm3ti_sector.rs` | 18557 | `8e1f6174ca38634d5d9e92e8098e35a72cf2615f` | `09482f0b2791f81b15e79949cc4d9fe1994a6b5c523f6b43a394fd3d2c30b81f` |
| `rust/cm3ti_stack.rs` | `tools/honest-compressor/rust/cm3ti_stack.rs` | 18938 | `67ccab583c9139b72a1022b68c4f3e63b0c3bbb4` | `c807bc91e9aae88dbb63daa06082b179ce1e79d3a71f9d5ee8e2c431f107f0d4` |
| `rust/cm3ti_stack_1g.rs` | `tools/honest-compressor/rust/cm3ti_stack_1g.rs` | 19005 | `f7f50cf61bafacd1e32639b68b60693699ab03ba` | `06266610267ea721ca3ff51a0bebf15b2e773b800fe04d7fd7f3f8ff173f0081` |
| `rust/cm3ti_stackrb.rs` | `tools/honest-compressor/rust/cm3ti_stackrb.rs` | 19002 | `77202c70ad52c80a75a412dd5be2d2c30f194fa4` | `53bf8a4f079acd42c5bbda24cf2a1ac87ce3151b65a05cd6574aa563e96c0898` |
| `rust/variants/RECEIPT-RAINBOW.md` | `tools/honest-compressor/rust/variants/RECEIPT-RAINBOW.md` | 2132 | `a37e2d1f1bba3226929235405426244dce1ac770` | `8867315ba6262823530fbc539b19ad7b3d7273a0b3f2a2ab533ae42edbe1c29d` |
| `rust/variants/tb26.rs` | `tools/honest-compressor/rust/variants/tb26.rs` | 19317 | `33c8d100810664ee9857184d712e6b1aa033c081` | `2322c6cd443123d2b7dbbca892e5c61849c7bff3dd3fd35477d10b14d81cca3a` |
| `rust/variants/tb27.rs` | `tools/honest-compressor/rust/variants/tb27.rs` | 19317 | `cecd23d9bbb4759f7fdbb91baf022ccd1cf59caf` | `dc3424b5e67160da4c8f7e303af929f0ecc6707db41535e89d788d0a0f2ce10e` |
| `rust/variants/tb28.rs` | `tools/honest-compressor/rust/variants/tb28.rs` | 19317 | `8e242cf120ecbfa09306e0c1e7403be466907c24` | `8316473dbf8bfc82689d05c4a6fd2ea91bff61d8a363e76e244b61171a562dbe` |
| `rust/variants/v13_s4096.rs` | `tools/honest-compressor/rust/variants/v13_s4096.rs` | 19148 | `436efa455fb646e0ec6408a3b209dc5daa614b9a` | `38ed0cf841dbefd23aef2a2dce1a172e5100f233e7dea785c11bc2db5230c0b3` |
| `rust/variants/v14_primed.rs` | `tools/honest-compressor/rust/variants/v14_primed.rs` | 19714 | `1ffed94f5a9b2a46430c2ce432c70c9a4e945fd8` | `d9d5e82ba5abb2e2ac71ab8f291cddb39666cbc483e2e0ac0653345839b36281` |
| `rust/variants/v15_absorb.rs` | `tools/honest-compressor/rust/variants/v15_absorb.rs` | 19227 | `3cc5a2b18959cc75ca6dbbd1046279dd9557a98c` | `8b92c6100c38e1e3dbc4127f340af2fa478317862a23fe6b5688dedff4d2fe20` |
| `rust/variants/v16_mirror.rs` | `tools/honest-compressor/rust/variants/v16_mirror.rs` | 19742 | `8cd96505c3b8f3f47eb36e1cac72bd33723dc093` | `57f94ba19817cdb7170bd440d65ab54b34c268ca4e10d59bb87afe64df527a3e` |
| `rust/variants/v17_s1024.rs` | `tools/honest-compressor/rust/variants/v17_s1024.rs` | 19187 | `2acd0f5fd398ca2dc0e7d11ba6eab652914d1433` | `ce3341f96e32584818e8f160ed411145600c5d69b75e4c9e2a09c061234ce306` |
| `rust/variants/v18_s16384.rs` | `tools/honest-compressor/rust/variants/v18_s16384.rs` | 19194 | `724cd27e64e1ecbe82e7ca1048fb4043a7d1cb87` | `e13e7e65e9380f248b0c22aa18bf0d42fdcb95e7fa65c339cf95fd48d6afd3ea` |
| `rust/variants/v19_s65536.rs` | `tools/honest-compressor/rust/variants/v19_s65536.rs` | 19148 | `7ea525401cffb108e05700f4396ffb994972f0c4` | `6bb496dc4b3efda7fe6ebf7f2fbb994a241f84365b60fba7f73552e9331adddd` |
| `rust/variants/v3_rainbow.rs` | `tools/honest-compressor/rust/variants/v3_rainbow.rs` | 18920 | `2b9acf9c839549d7c20fac83c8ea9733afd5fabc` | `2722200bcfbbf1f33135df2bbe6865c791a1b6a1939040a729f2883ba7fbd21a` |
| `rust/variants/v4_rainbow12.rs` | `tools/honest-compressor/rust/variants/v4_rainbow12.rs` | 19095 | `fdc4cc3b8f6209be09dcb597d57bd96d785ad2c3` | `5a24b37cefdbcceb99566ac12d06573188e4ad11861eab547b988fd802979177` |
| `rust/variants/v5_tight.rs` | `tools/honest-compressor/rust/variants/v5_tight.rs` | 19093 | `dc6dd2dd672b7933135bb02a3ae80d52129c5e8f` | `5fcf95ef84be71859d51eba146e845b50d76f0a337bc417845440b42b66bf1d4` |
| `rust/variants/v6_even.rs` | `tools/honest-compressor/rust/variants/v6_even.rs` | 19088 | `7117fd46a030779ae5fb657e1d0b4b0dad00d802` | `8bd37b57d8f411ea45f32874a75edf8d627b7c87a8b157f084f9bf49fe7ffc4b` |
| `rust/variants/v7_nbr.rs` | `tools/honest-compressor/rust/variants/v7_nbr.rs` | 19103 | `277df33162be30c9a691652fe88ae36f93066583` | `bc6cce01084bfae551d5f6b0eb4da5be24d505740b1ef7086e3e7667a67da3c5` |
| `rust/variants/v8_r24.rs` | `tools/honest-compressor/rust/variants/v8_r24.rs` | 19325 | `9c5a854b174d716bf5d2e69569149b2443ad483e` | `9013fa18630e67ffff34e8665c8c66b554b7c1a179085bf1841758c4a196b633` |
| `rust/variants/v9_r48.rs` | `tools/honest-compressor/rust/variants/v9_r48.rs` | 19646 | `04f114a82271e9173bf858e7ae6caace326aa7fa` | `dd805cc49cd2447aa3f639d3f85878d9a7b6e40128874ab1b0570ed199b424bb` |
| `rust/variants/vc26.rs` | `tools/honest-compressor/rust/variants/vc26.rs` | 20393 | `34db6973397bfac1ac2fb58412bcb1cff6f56a5d` | `5f96bf0eb9a1b8ae98a85c4d5450ecb2b9898ea0b6cfd046e31bb5c943b8bc09` |
| `rust/variants/vc27.rs` | `tools/honest-compressor/rust/variants/vc27.rs` | 20394 | `d2e3fcb56d66116313550cfdbacc7d321bfb7a4c` | `9bea440736e8864f22538a806412edc7f74e1f4d5a77b1446e95832d53294a80` |
| `rust/variants/vc28.rs` | `tools/honest-compressor/rust/variants/vc28.rs` | 20394 | `f5d3ff1734eae88132c79860e6fcbfd40b57b6a2` | `136776ae1f55f3749e833e4862014189c98400cd5d3bbc73a2c1261728894a04` |
| `rust/variants/vc28m.rs` | `tools/honest-compressor/rust/variants/vc28m.rs` | 20423 | `af02e1a69fdfb8af1b3dc76f8537a8d46789c931` | `87bdb795b21551e24ef5c0d79e530fd136a937f04b47aae4e21974e0b1f3a016` |
| `rust/variants/vc65.rs` | `tools/honest-compressor/rust/variants/vc65.rs` | 20493 | `308f0aa08d248add9bd8211159fb60c5295c0283` | `30eaf5210f2d9e353d88cca07afe9af039ad5b19ae8871acd1cc6bef798408f3` |

Each blob id equals the one recorded in the honest-compressor gap survey (2026-10-18) for the same
file (e.g. `cm3ti.rs` `7d05ef0f`, `v6_even.rs` `7117fd46`, `vc65.rs` `308f0aa0`).

## What each binary computes

All are standalone `fn main()` context-mixing compressors with the same model shape (orders `0..k`
hashed + order-5 match model + two word models, a logistic mixer, two SSE/APM stages, a binary
range coder) and a built-in SHA-256 restore gate (lossless or the run is invalid). CLI:
`<bin> <file> <k> [--emit out.bin]` (except `cm3ti_rbladder`, which also reads the env var
`RB_MODE`, and `v14_primed`, which takes an optional prior file as a third argument). Output line
ends with `payload=<B> ... restore=OK|FAIL comp_sha=<16 hex>`; `comp_sha` is the first 16 hex of
the SHA-256 of the compressed stream.

- **`cm3ti`** — the integer-deterministic base: lpaq-style integer stretch/squash tables and a
  fixed-point mixer, 16-bit probability. Every other binary is a small delta off this file.
- **Sector family** (adds a second mixer `w2` keyed by a content "sector"): `cm3ti_sector` (6
  classes: letter/digit/space/markup/high/other), `v3_rainbow` (standalone 6-wheel progenitor),
  `cm3ti_combo` (6-sector + a gated URL/path field), `cm3ti_rainbow12` and `v6_even` (12-wheel even
  gradient — the champion; two independent codepaths that print the identical stream),
  `v4_rainbow12`/`v5_tight`/`v7_nbr` (12-wheel blend variants), `v8_r24` (24-wheel), `v9_r48`
  (48-wheel), and the 256×N "s-wheels" `v17_s1024`, `v13_s4096`, `v18_s16384`, `v19_s65536`.
  `v14_primed` = `v6_even` + optional prior-file warming; `v15_absorb` = `v6_even` + absorption
  adaptation; `v16_mirror` = `v6_even` + a third APM/SSE stage.
- **Three-mixer stacks** (6+12+24 sector mixers summed): `cm3ti_stack`, `cm3ti_stackrb` (adds
  run/boundary features), `cm3ti_stack_1g` (`u8` history + bounded 2^24 match table for enwik9 RAM;
  byte-identical to `cm3ti_stack` at 1 MB).
- **Ladder**: `cm3ti_rbladder` — one generalized file; `RB_MODE` selects 12/24/48/48a/48o/4k/4km/
  4ka/4kma/c2/c3 (default `c3`).
- **TBITS raises** (match-table size): `tb26`/`tb27`/`tb28` = `v8_r24` with `TBITS` 26/27/28.
- **Full stacks** (gated URL/path field + 24-wheel even gradient): `vc26`/`vc27`/`vc28` with
  `TBITS` 26/27/28; `vc28m` = `vc28` with `u8` history (byte-identical to `vc28` at 1 MB); `vc65` =
  `vc28` + a 65536-wheel.

Nine variants `fs::metadata` a sibling source at runtime for the `decoder_src`/`total`/`bpc`
display (`v13`/`v15`/`v16`/`v17`/`v18`/`v19` read `v6_even.rs`; `vc28`/`vc28m`/`vc65` read
`vc27.rs`); the call falls back to `0` if the file is absent and never affects `payload` or
`comp_sha`. The vendored layout keeps `rust/` and `rust/variants/` intact so those reads resolve
when a binary is run from its source directory.

## Recorded results reproduced in this build

Container 2026-10-18, `rustc 1.81.0 (eeb90cda1 2024-09-04)`, input = first 1,000,000 B of the
public `enwik8` (slice1m, sha256 `369b688978f649681136198fb96db14c1616756260c55fb4b65e9bc049552cad`),
`k=7`. `scripts/check.sh` re-runs these four and compares byte-exact:

| binary | measured | owner's recorded number (file:line) |
|---|---|---|
| `cm3ti` | `comp_sha=101c86ae05358c32`, two runs identical, `restore=OK` | `RESULTS.md:333` (`comp_sha 101c86ae… ×3, identical`) |
| `cm3ti_sector` | `payload=242020`, `comp_sha=251c0b44a5f6bee0`, `restore=OK` | `payload` `RESULTS-cloud-seat.md:106`; `comp_sha 251c0b44` `RESULTS.md:459` |
| `cm3ti_rainbow12` | `payload=239869`, `comp_sha=53ad10066c34ac66`, `restore=OK` | `RESULTS.md:634` |
| `v6_even` | `payload=239869`, `comp_sha=53ad10066c34ac66`, `restore=OK` | `RESULTS.md:634`; `RESULTS-cloud-seat.md:67-68` |

`cm3ti` run twice gives the identical `comp_sha` (the determinism gate at `RESULTS.md:333`), and
`cm3ti_rainbow12` and `v6_even` are two separate files that print the same stream
(`RESULTS.md:634`: "both print payload=239869 comp_sha=53ad10066c34ac66"). The honest-compressor
cm3ti survey (2026-10-18) separately reproduced the 1 MB k=7 anchors byte-exact for the broader set
(`cm3ti_rbladder` modes 12/24/48/4k; `v8_r24` `aa66be5f`; `v15_absorb` `f49ad8c3`; `v16_mirror`
`bec04aad`; `v17_s1024` `c280622e`; `v18_s16384` `05484092`; `v19_s65536` `c689f2a5`; `v13_s4096`
`f365fdf0`; `v14_primed` empty-prior identity; `cm3ti_stack`/`cm3ti_stack_1g` `b5a25fce`; and
`vc65` `dab7ea1e`); `check.sh` runs the four cheapest, strongest-anchored of them here.

`bpc_total` is **not** compared: the binaries add the on-disk `.rs` size (`decoder_src`) into
`total`, and the owner's source has grown since measurement, so `bpc` differs while `payload` and
`comp_sha` (input-only) match exactly.

## Not reproduced in this build (scope)

- The owner's **10 MB** rows used a distinct/dedup slice (sha `adea6c0b`, `RESULTS.md:191`; `c4e72b59`,
  `RESULTS-cloud-seat.md:110`), not `enwik8`'s first 10 MB; that slice is not on this container, so
  the 10 MB column is not re-run here.
- The **100 MB** (enwik8) and **1 GB** (enwik9) crown rows are not re-run here (time and RAM; the
  `tb*`/`vc*` match tables at `TBITS` 26/27/28 need ≈1.6/3.2/6.4 GB, and a 100 MB single-thread run
  is ~24 min). The 1 MB anchors above are reproduced instead.
- `k_gradient.bin`, `chaos1m.bin`, `code1m.bin`: these are **not** inputs to any `cm3ti` binary
  (the binaries read any file plus `k`). They are referenced only by a different owner tool,
  `trijection/trijection.py:104-107`, under the session-9ebd6119 scratchpad; the ACER seat reports
  they were never exported and live only in cloud session 9ebd6119. No stand-in data is substituted
  (OWNER-RULES.md rule 1).

## The float reference

`rust/cm3t.rs` is the owner's **float** reference compressor (f64 logistic mixer, f64 APM, f64 rate
ramp — ~40 float lines). It is vendored byte-identical but **not built in this crate** (it has no
`[[bin]]` entry), per the build rule that float files are kept vendored but out of the hot lane, and
OWNER-RULES.md rule 4 (the integer lane is what we build; the owner's float code runs unchanged only
in its own lane). Its `main` prints no `comp_sha` because its output is not reproducible across
platforms/languages (the point the owner's header on `cm3ti.rs:1-7` records: "floats drift across
platforms; integers do not"). The owner's own note at `RESULTS.md:188` records a 13-byte
Rust-vs-Python float drift for `cm3t`.

### Float inside the 30 integer binaries

The compressed path of the 30 built binaries is pure integer — proven by the byte-exact `comp_sha`
reproductions above. The only float in them sits in the owner's own lines and never touches the
compressed bytes:

- the mixer-weight init constant `(0.3 * 65536.0) as i32` (= 19660; the stacks also use
  `(0.2 * 65536.0) as i32` = 13107) — a compile-time constant that evaluates to an integer
  (`cm3ti.rs:98`);
- two `as_secs_f64()` wall-clock timers (`cm3ti.rs:323-324`) and the `bpc_total={:.4}` /
  `(total as f64*8.0)/n as f64` figure in the final `println!` (`cm3ti.rs:330-331`) — display only.

Everything this crate **writes** (`Cargo.toml`, `scripts/check.sh`, this file, the CI snippet) is
integer-only, with no float arithmetic (OWNER-RULES.md rule 4).

## clippy

`cargo +1.81.0 clippy --locked --all-targets -- -D warnings` passes (exit 0) with six named allows;
without them it is exit 101. The allows keep the vendored bytes unedited; every other warning
denies. Measured over the 30 bins and their test targets (`--all-targets`):

- `clippy::unnecessary_cast` (118) — e.g. `cm3ti.rs:78`, `:185`.
- `clippy::suspicious_else_formatting` (90) — e.g. `cm3ti.rs:42`, `:247`, `:264`.
- `clippy::manual_clamp` (60) — e.g. `cm3ti.rs:73`.
- `clippy::needless_range_loop` (33) — the `for i in 0..nin` / `for n in 0..256` index loops.
- `clippy::identity_op` (2) — `cm3ti_stackrb.rs:137`, `vc65.rs:210`.
- `unused_variables` (rustc, 2) — `vc65.rs:149` (`run1`), `:150` (`run2`). A plain `cargo build`
  prints these two as warnings; the clippy gate allows them by name.

## Build profile

Upstream built each file with `rustc --edition 2021 -O` (overflow checks off), and the recorded
`comp_sha` values were produced that way. The crate leaves `[profile.release]` at Cargo defaults
(overflow checks off) so the integer codepaths reproduce those bytes; the arithmetic that must wrap
already uses explicit `wrapping_*` in the vendored sources.

## Privacy

All 33 vendored files were scanned here and in the honest-compressor privacy survey (2026-10-18):
0 credentials, 0 e-mail addresses, 0 operator names, 0 container/ACER paths. The only URL is the
public corpus `http://mattmahoney.net/dc/enwik9.zip` (`rust/RUN-ENWIK9.md`). Scope: this vendored
`rust/` subtree and that survey.

## License

`MIT OR Apache-2.0`, `publish = false` until the crates.io pass. The owner's honest-compressor code
carries no license file of its own; the owner's grant of 2026-10-18 releases it: everything here was
made by the owner or by Asolaria in Asolaria's white rooms, and anything listed under any license is
free and public to everyone. Until then this crate was marked `UNLICENSED` (OWNER-RULES.md rule 4h);
that marking is withdrawn.
