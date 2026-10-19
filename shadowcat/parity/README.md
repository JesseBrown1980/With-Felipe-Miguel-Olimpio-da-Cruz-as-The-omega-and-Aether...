# shadowcat/parity

The owner decided on 2026-10-18 that shadowcat's `src/sha256.rs` is the one SHA-256 aether's own
code reuses, once the digests are shown identical. This folder holds that showing.

`sha256_parity.rs` compares nine SHA-256 copies written for aether with shadowcat's `src/sha256.rs`,
with coreutils `sha256sum` as an outside witness. It covers:

- the five NIST vectors (empty, `abc`, 448 and 896 bits, a million `a`);
- every length from 0 to 1,100 bytes, fed in nine chunk sizes around the 55/56/63/64-byte padding
  edges;
- every file tracked at the commit the receipt names.

`run.sh` builds it with rustc 1.81.0 and writes the receipt. It runs only at that commit, because
afterwards the copies it compares are the adapters over shadowcat.

`SHA256-PARITY-2026-10-19.hbp`, at aether `fcddaf9`:

- 25 NIST inputs and 9,909 boundary inputs;
- 13,552 tracked files (280,144,661 B), including all 42 GGUFs (33,568,182 B, one `GGUF` row each);
- 23,486 inputs per implementation and 0 mismatches. `verdict=EQUAL`.

Do not run `rustfmt` on `sha256_parity.rs`. It follows the `#[path]` modules and would rewrite
shadowcat's own `src/sha256.rs`, which is kept byte-identical (`../UPSTREAM.sha256`).

## After the switch

The library target of `../Cargo.toml` is `src/sha256.rs` itself, unchanged. Seven of the nine copies are now
adapters over it, each keeping its old API and its own known-answer tests:

| Copy | Now |
|---|---|
| `gguf/verify/src/sha256.rs` | `pub use shadowcat::{digest, hex}` |
| `hbp/vault-reader/src/sha.rs` | streaming wrapper; `tests/sha.rs` still checks it against the vendored `asolaria-hbi-hbp` `sha256_hex` |
| `planes/gnn-trio/src/sha256.rs` | `digest` and `hex` over shadowcat |
| `pump/glyphs-herself/tests/common/mod.rs` | `sha256` and `hex` over shadowcat (dev-dependency) |
| `qr/qr-read-int/tests/corpus/sha256.rs` | `hex` over shadowcat (dev-dependency) |
| `ternary/tests/common/sha256.rs` | streaming wrapper (dev-dependency) |
| `qprism/representation-bins/tests/referee.rs` | `fn sha256` over shadowcat (dev-dependency) |

Two copies stay as they are. Their parity is in the receipt.

- `aether-universe/src/sha256.rs` is ACER's game crate. Its test
  `the_crate_refuses_float_arithmetic_at_compile_time_and_has_one_dependency` asserts that
  `asolaria-tribit` is its only dependency, so that it can also stand as its own repository. Adopting
  shadowcat there is ACER's design change to make.
- `codec/dbbh-dbwh/src/lib.rs` marks its SHA-256 block as vendored, in a crate that states zero
  dependencies.

The owner's other SHA-256 code stays as vendored. That is the cm3ti family, the omega codecs,
qprism, the recovery crates, `ci/rust-system-upgrade-181` and `kernel/behcs1024-60d`, all
byte-identical. It also includes `gate/fischer-eval`, which is upstream `asolaria-federation-1024`
code with the fixes its README lists.
