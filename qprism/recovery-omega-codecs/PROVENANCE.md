# Provenance

Every vendored file is byte-identical to its upstream source. Upstream repository:
`JesseBrown1980/asolaria-omega-omnibit-tournament` at commit `dad4647`
(`dad4647ad19a1b08ee90990c34aab1255f9a6046`, "Merge pull request #10 from
JesseBrown1980/integration/omnibit-tournament-2026-10-09").

`git hash-object` blob ids and SHA-256 are listed for each file; each local blob id equals the
upstream blob id at `dad4647`. The SHA-256 column is also the pinning in `UPSTREAM.sha256`;
verify with `sha256sum -c UPSTREAM.sha256`.

| vendored path | upstream path | bytes | git blob id | sha256 |
|---|---|---|---|---|
| `omega-floor-codec-v0/omega_floor_codec_v0.rs` | `reference/omega-floor-codec-v0/omega_floor_codec_v0.rs` | 52686 | `3de220c4e9125400c32229f2a827b4aa096bd853` | `47dcf2f9f617f46fd8181257123f878b1fbf6cf8d7ec41119d27ea523bc64b08` |
| `omega-hyper-codec-integration-v0/omega_hyper_codec_v0.rs` | `reference/omega-hyper-codec-integration-v0/omega_hyper_codec_v0.rs` | 59613 | `de50c5c6157104c30ff06348218c912e972c4f07` | `3784fc1730ee962e2733d36a2d7443056e8c4c2768d2b3336fc61b2eeceb3080` |
| `omega-operator-catalog-v0/omega_operator_catalog.rs` | `reference/omega-operator-catalog-v0/omega_operator_catalog.rs` | 26012 | `1535e158b21b1c2b9ece4dce84e0e9779498ec19` | `883ca7ec964e609933c3cb9ac71d1f9fb02ade9f314f7902d0c0547dd3da6e1b` |
| `omega-floor-codec-contract-v0/INTEGRATED-OMEGA-FLOOR-CODEC-CONTRACT.hbp` | `reference/omega-floor-codec-contract-v0/INTEGRATED-OMEGA-FLOOR-CODEC-CONTRACT.hbp` | 6753 | `a494d4f87cb027e458a5f326dfa10a68fac5c2d1` | `b2cb1a7e17eccf279021a22ca570a39bc18d2498f3babefb91343568121733bc` |
| `vectors/OMEGA-FLOOR-CODEC-V0-VERIFY.hbp` | `provenance/receipts/omega-floor/OMEGA-FLOOR-CODEC-V0-VERIFY.hbp` | 5588 | `51d2e7c473f67816d660f2bfb7750f59ba42030e` | `ebd5d1b8716ca63ba7023198d94e6e8110ef35e3a4cca6e734eb8c1245a1191e` |
| `vectors/OMEGA-FLOOR-CODEC-V0-VERIFY.hbi` | `provenance/receipts/omega-floor/OMEGA-FLOOR-CODEC-V0-VERIFY.hbi` | 13163 | `cf0de4d6bcaa513599929aab6e1a129d049ced49` | `6654a2f943ddb7e9ef6edec40f4628c8d199d5ff4aeef57e94c5d71ed84d8c6a` |

## The operator catalog copy

`omega-operator-catalog-v0/omega_operator_catalog.rs` is a regular file holding the upstream
bytes, not a link. The same bytes (blob `1535e158…`) are already vendored twice in this repo, at
`qprism/recovery/catalog/omega_operator_catalog.rs` and
`qprism/recovery/omega/omega-operator-catalog-v0/omega_operator_catalog.rs`; CI compares this
copy with the first of those using `cmp`. The hyper source reads the catalog at a fixed relative
path (`omega_hyper_codec_v0.rs:18` `#[path]`, `:51` `include_bytes!`), so the copy sits at that
path.

## Census pinned upstream

Upstream `.github/workflows/verify.yml:84-95` pins the test census per source (floor `tests: 11`,
hyper-codec `tests: 34`) and enforces it at `:112-113`. `provenance/SOURCE-LEDGER.hbp:19` records
`TEST|id=omega_hyper_codec_v0_tests|...|passed=34|failed=0` and `:26` records
`floor=11of11|...|hyper_integration=34of34` on `rustc_1.81.0_eeb90cda1_2024_09_04`. CI here
asserts the same two counts.

## Privacy

All six files were scanned before vendoring for e-mail addresses, private LAN addresses, phone
numbers, private keys, SSH keys and home-directory paths: 0 hits in each. They are the public
reference sources and public receipts of the upstream repository; no private data is copied.
