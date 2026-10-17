# vendored: asolaria-hbi-hbp

- Upstream: https://github.com/JesseBrown1980/asolaria-hbi-hbp @ commit dca3f45fef49763b5cc93652918af8c56f32cd52
  (`refs/heads/main` pointed at this commit when re-measured, 2026-10-17).
- 7 of the 19 files tracked upstream at that commit are vendored byte-identical (git blob ids
  preserved). `UPSTREAM.sha256` lists the sha256 of every vendored file; `sha256sum -c
  UPSTREAM.sha256` from this directory passes (7/7).
- Content: pure-`std` Rust codec — sha256 (FIPS 180-4), `AGT-<sha16>` content addressing,
  `encode_row`/`parse_row` (`TAG|k=v|...|json=0`), `.hbi` byte-offset pointers, hash-chained
  receipts (`ReceiptChain`, `verify_chain`). Zero external crates. Rust 1.81, clippy-clean.
- Privacy: scanned; no third-party personal data (the owner's name and repo URL only).
- Local verification (rust 1.81.0): `cargo clippy --all-targets -D warnings` clean,
  `cargo test` passes.

## Vendored (upstream git blob ids)

| path | git blob id |
|---|---|
| `.github/workflows/rust-1.81-clippy-verification.yml` | a4abbc6bb03df40c167787d545f25181463c57a7 |
| `Cargo.toml` | abcc6014133e481a097e67d366995ada5234ee61 |
| `LICENSE` (MIT, "Asolaria Federation") | 7f2a4900a5dfc8eb2ce413ce1fa95942623124e7 |
| `README.md` | 4fd82f50ab5f9eee6855461ad3fc9c73a6f72f1f |
| `rust-toolchain.toml` | 6f9c67b5082cea3bdce5efe3d2f91db969ce1f74 |
| `src/lib.rs` | 907bec401f17875a3352f6ce5368ce3389590729 |
| `tests/roundtrip.rs` | 2fac18cf68916de0b9b07fb8bac4fabf7cd002d6 |

## Present upstream at dca3f45, not vendored (the crate does not read them)

| path | git blob id |
|---|---|
| `.gitignore` | 96ef6c0b944e24fc22f51f18136cd62ffd5b0b8f |
| `.nojekyll` | e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 |
| `.nojekyll.sha256` | e35e3d19378227033909bf508f5ec1858b6d96e2 |
| `AGENT-DISCIPLINE.md` | af8d9cf18acdff2fa5b28d9285d12dda5996f9e4 |
| `AGENT-DISCIPLINE.md.sha256` | ce30338e05a79c63744b44f855eae8d0d046867b |
| `AGENT-PRELOAD.md` | 5ff0058b71730ca47c9ab4168cb66020389e4e6c |
| `AGENT-PRELOAD.md.sha256` | 68868d6acacf19070bcf8909c37318ed4c978ec1 |
| `STARPORT-2026-08-08.hbp` | 2cf8fee27a2664ca4de3a3ac66972de485f3026f |
| `STARPORT-2026-08-08.hbp.sha256` | aae9b3d8e1976ef90e3df570628e144a74887908 |
| `TRILATERAL-HOT-PATH-RECEIPT-DOCTRINE-2026-07-11.md` | ec715cda97bded6336c4e36d2f88f7c218fc7004 |
| `index.html` | e46ed0b9284b5f2670a3a2ff1f57a291ac7352d7 |
| `index.html.sha256` | 752d4198b48f53b95939c5871c2e934613a66573 |
