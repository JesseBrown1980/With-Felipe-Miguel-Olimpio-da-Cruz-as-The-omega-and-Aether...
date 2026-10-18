# Reproduction receipt — rainbow/wheel/table variants (2026-07-19)

All variants are one-file rustc builds: `rustc -O <file>.rs -o <bin>` (any rustc ≥1.56).
Corpus: enwik8 (mattmahoney.net). Slices: first 1,000,000 bytes (sha256 369b6889…),
bytes 10M–20M (sha256 c4e72b59…), full 100 MB. Run: `./<bin> <slice> <k>`.
Every row lossless (SHA restore inside binary). comp_sha = first 8 bytes sha256 of stream.

| variant | file | config | slice/k | payload | comp_sha |
|---|---|---|---|---|---|
| anchor | ../cm3ti_sector.rs | 6-sector | 1M/7 | 242,020 | 251c0b44a5f6bee0 |
| anchor | ../cm3ti_sector.rs | 6-sector | 100M/10 | 22,506,819 | 489205479047d08f |
| V3 | v3_rainbow.rs | 6-sec + 3:1 soft | 1M/7 | 241,152 | 0a3efae8943f0555 |
| V4 | v4_rainbow12.rs | 12-way + 3:1 | 1M/7 | 240,286 | 2db2a871135fbbae |
| V4 | v4_rainbow12.rs | 12-way + 3:1 | 10M/10 | 2,334,849 | abbb47b9c67da9af |
| V5 | v5_tight.rs | 12-way + 7:1 | 1M/7 | 240,700 | 25346283adc49de6 |
| **V6** | **v6_even.rs** | **12-way + 1:1 (CROWN)** | 1M/7 | 239,869 | 53ad10066c34ac66 |
| V6 | v6_even.rs | crown cfg | 10M/10 | 2,330,753 | 4ae7ec1fd7cc1619 |
| **V6** | **v6_even.rs** | **crown cfg** | **100M/10** | **22,379,104** | **f3d45412c9a82568** |
| V7 | v7_nbr.rs | 12-way + 1:3 | 1M/7 | 239,967 | 2bd51b262baf3b09 |
| V8 | v8_r24.rs | 24-way run-depth + 1:1 | 1M/7 | 239,035 | aa66be5faec222cb |
| V8 | v8_r24.rs | 24-way | 10M/10 | 2,321,174 | cae8ad70c807a997 |
| V9 | v9_r48.rs | 48-way | 1M/7 | 238,801 | 12fb3475ce60cb78 |
| tb24/25/26 | tb26.rs (TBITS diff) | v8 + TBITS=24/25/26 | 1M/7 | 237,697/236,892/236,423 | 9e4e94be/5ca0ab50/81939242 |

CROWN CLAIM: v6_even.rs on full enwik8 k=10 → total 22,397,841 B (payload+source),
1.7918 bpc, restore OK, comp_sha f3d45412c9a82568. Reproduce on any seat; byte-match
required. tb variants differ from v8_r24.rs by the single TBITS constant (line 12).
wrt.py (../..) = Phase-1 language-layer v0, reversibility-gated (PASS), verdict
"investigate" — payload −0.012 only; win already captured by model word contexts.
ensemble_screen.py = 8-view ensemble closure probe (max|Δp|=0, CLOSED).
