# recovery-omega-codecs

Vendored, byte-identical copies of two isolated std-only v0 assemblies from
`asolaria-omega-omnibit-tournament@dad4647`, built as one crate with two
binaries. Integer-only, zero float, zero third-party dependencies, Rust 1.81.0.
Upstream paths, blob ids and sha256 for every vendored file are in `PROVENANCE.md`.

## Binaries

- `omega_floor_codec_v0` — `omega-floor-codec-v0/omega_floor_codec_v0.rs`
  (upstream `reference/omega-floor-codec-v0/`). Standalone; nested four-floor
  (64/256/1024/4096) container with reverse replay and fail-closed header gates.
- `omega_hyper_codec_v0` — `omega-hyper-codec-integration-v0/omega_hyper_codec_v0.rs`
  (upstream `reference/omega-hyper-codec-integration-v0/`). The AOCWM001 + STG1
  four-floor container. Upstream `omega_hyper_codec_v0.rs:7-9`: "MODE_PATH123 is
  deliberately rejected until the separately reviewed Path 1/2/3 module is wired;
  therefore this source does not claim the integrated Whole-Monty gate has passed."

## Why one crate with two binaries

The hyper codec source is unedited and pulls three sibling files by fixed
relative path (`omega_hyper_codec_v0.rs:18`, `:51-55`):

- `#[path = "../omega-operator-catalog-v0/omega_operator_catalog.rs"] mod operator_catalog;`
- `include_bytes!("../omega-operator-catalog-v0/omega_operator_catalog.rs")`
- `include_bytes!("../omega-floor-codec-v0/omega_floor_codec_v0.rs")`
- `include_bytes!("../omega-floor-codec-contract-v0/INTEGRATED-OMEGA-FLOOR-CODEC-CONTRACT.hbp")`

Keeping the files byte-identical means keeping those paths, so both binaries and
the three sibling inputs share one crate root laid out exactly as upstream.
`Cargo.toml` sets `[lints.rust] unsafe_code = "forbid"`, the level the floor
source declares at its line 1, so it also covers the hyper source and the catalog
module compiled into it.

## The operator catalog copy

`omega-operator-catalog-v0/omega_operator_catalog.rs` is a regular file with the
upstream bytes (content sha256 `883ca7ec…`, git blob `1535e158…`). The same bytes
are already vendored at `qprism/recovery/catalog/omega_operator_catalog.rs` and
`qprism/recovery/omega/omega-operator-catalog-v0/omega_operator_catalog.rs`; CI
checks this copy against the first with `cmp`.

## Relation to the already-vendored omega path123 (`qprism/recovery/omega`)

The sibling `qprism/recovery/omega` crate vendors `omega_path123.rs` (Path 1 LZ /
Path 2 CRT / Path 3 arithmetic coder) and its own copy of the operator catalog.
This crate vendors the floor and hyper codecs, and the two crates carry the same
catalog bytes. Upstream records the Path 1/2/3 connection as not made: the hyper
source returns "Path123 mode is held until the reviewed module is wired"
(`omega_hyper_codec_v0.rs:890`, `:997`), and `provenance/SOURCE-LEDGER.hbp:21`
records `BOUNDARY|path123_integrated=PENDING`. Nothing in this repo connects
`qprism/recovery/omega` to this codec; the hyper self-test prints
`path123=PENDING` (`omega_hyper_codec_v0.rs:1272`).

## Pins, census and vectors

`UPSTREAM.sha256` pins the content sha256 of every vendored file (6 files) to
`asolaria-omega-omnibit-tournament@dad4647`.

Test census: upstream `.github/workflows/verify.yml:84-95,112-113` pins 11 tests
for the floor source and 34 for the hyper source; `SOURCE-LEDGER.hbp:19` records
`passed=34|failed=0` for the hyper tests and `:26` records `floor=11of11` and
`hyper_integration=34of34` on `rustc_1.81.0_eeb90cda1_2024_09_04`. Here the floor binary lists 11 tests and
the hyper binary 34 (16 `integration_tests` + 18 `operator_catalog::tests`); CI
asserts both counts.

`vectors/` holds the upstream floor receipt (`OMEGA-FLOOR-CODEC-V0-VERIFY.hbp` /
`.hbi`). Its `SELFTEST` row is replayed: `omega_floor_codec_v0 self-test` builds
its 8192-byte input in place (`omega_floor_codec_v0.rs:1110-1145`) and its output
equals that row byte for byte, checked in CI with `diff`. The `FIXTURELOCAL` and
`OMEGAFLOOR` rows describe a 32768-byte fixture the receipt marks
`FIXTURELOCAL|published=0`; those bytes are not present, so those rows are pinned
by sha256 only. The 14 `HBIROW` rows of the `.hbi` decode to the `.hbp` bytes at
their offsets with matching sha256 (5588 of 5588 bytes). The hyper codec's own
`provenance_sources_match_pins` test checks the catalog, floor-source and
contract bytes against the pins it embeds.

## Build and test

Run with `CARGO_TARGET_DIR` outside the tree if preferred; CI uses
`"${CARGO_TARGET_DIR:-target}"`.

```
sha256sum -c UPSTREAM.sha256
cargo +1.81.0 clippy --locked --all-targets -- -D warnings \
  -A dead_code -A clippy::unusual_byte_groupings \
  -A clippy::needless_range_loop -A clippy::unnecessary_to_owned
cargo +1.81.0 test --locked
cargo +1.81.0 build --locked --release
./target/release/omega_hyper_codec_v0 self-test
diff <(./target/release/omega_floor_codec_v0 self-test) \
     <(grep '^SELFTEST|' vectors/OMEGA-FLOOR-CODEC-V0-VERIFY.hbp)
```

Upstream does not run clippy on these sources (`verify.yml:111` builds each with
`rustc --edition=2021 --test -O`), so it lists no allowed lints. The four named
allows keep the vendored bytes unedited: `dead_code` (items the hyper binary's
non-test build does not use: hyper `:50`, `:52`, `:53`, `:168`, `:180`, `:300`,
`:717`; catalog `:18-20`, `:176`, `:191`, `:199`, `:271`, `:354`), `clippy::unusual_byte_groupings`
(catalog `:600`, `:638`), `clippy::needless_range_loop` (hyper `:452`) and
`clippy::unnecessary_to_owned` (hyper `:1428`). Every other warning denies.
