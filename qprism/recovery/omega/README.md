# asolaria-qprism-recovery

The Q-PRISM **recovery** paths (Layer 3 of the Asolaria stack). Integer-only,
zero dependencies, Rust 1.81.

- **Path 1** — greedy LZ over a *retained* 4096-byte output window
  (`encode_path1` / `decode_path1`): it recovers only bytes it actually kept.
- **Path 2** — checked **CRT** over coprime moduli per floor (6b 7×11,
  8b 17×19, 10b 31×37, 12b 61×71; each product exceeds the floor), rebuilding a
  symbol from **two** residues (`encode_path2_crt` / `decode_path2_crt`). The
  two shadows are larger than the source: CRT expands, it never compresses.
- **Path 3** — a strictly causal integer arithmetic coder with a 40-operator
  online mixer, using the bundled Omega operator catalog.
- `encode_p123` / `decode_p123` compose the paths under an authenticated
  header; SHA-256 is an integrity check, never a reconstruction source.

```toml
[dependencies]
asolaria-qprism-recovery = "0.1"
```

The library keeps its original import name: `use omega_path123::...;`

## Provenance

`omega-path123-v0/omega_path123.rs` and
`omega-operator-catalog-v0/omega_operator_catalog.rs` are byte-identical to
`JesseBrown1980/asolaria-omega-omnibit-tournament@dad4647` `reference/`
(`sha256sum -c UPSTREAM.sha256`). The package root sits above both folders so
the source's unchanged `#[path = "../omega-operator-catalog-v0/…"]` resolves
inside the package. Three upstream style lints are allowed at CI rather than
editing the source: `unusual_byte_groupings`, `derivable_impls`,
`needless_range_loop`. No compression record is claimed.

`vectors/` holds the upstream component receipt, byte-identical to
`provenance/receipts/path123/OMEGA-PATH123-COMPONENT.hbp` and `.hbi` at the same commit
(blobs `1c52db8c…` and `b0c74792…`). Its header row pins `source_sha256=d475f067…` and its
dependency row `sha256=883ca7ec…`; CI checks both against the vendored sources, and checks that
the library lists 35 tests (17 path123 + 18 catalog), the receipt's `tests=35of35_PASS`. The 9
`HBIROW` rows of the `.hbi` decode to the `.hbp` at their offsets with matching sha256 (1,841 of
1,841 bytes; measured 2026-10-18).

License: MIT.
