# Provenance: holographic-wormhole-codec (DBBH -> DBWH)

Upstream: `JesseBrown1980/holographic-wormhole-codec`, commit
`49012803778ef89b5b7c3915f582d027d4f1e096` (tree `70a1120addee79920d319f6d44347ec136b59a7a`,
committed 2026-08-08T18:11:09-03:00, "star port sidecar"). On 2026-10-17, `git ls-remote` gave
`HEAD` and `refs/heads/main` at this commit.

## Copied files

Each file was taken with `git cat-file blob 4901280:<path>`. `git hash-object` of every copy equals
the upstream blob id, and `UPSTREAM.sha256` pins the sha256 of every copy (`sha256sum -c UPSTREAM.sha256`).

| Path here | Upstream path | Upstream blob SHA-1 | Bytes | Line endings | sha256 |
|---|---|---|---|---|---|
| `src/lib.rs` | `src/lib.rs` | `237c82a2b3a1d38452406f3eaffe86d351ccf8b0` | 27020 | CRLF (711 lines) | `310a1c14743fdc65df42f741d19263e881f16da58094978deba20c1cbb62682c` |
| `Cargo.toml` | `Cargo.toml` | `fb22f84ddb47f7bf78616d31534fb48431e26413` | 791 | LF | `b5f32735315cd852763e2c8d977164addee1a7744bd67a7f7586b1d528c0fa36` |
| `README.md` | `README.md` | `749f30d95a115f3c83fce649385f8276f20d8350` | 2481 | LF | `63ffcef3e4d3b0710903016f34c0d604909cd1a29fecb40ca89a616ae6a5a057` |
| `LICENSE` | `LICENSE` | `a58f45223b42fb475ea14d39abdf2ee3fbb5cc49` | 165 | LF | `cd9d28192fbf0da189ec2a502f950f39800c1fe76557d8c3704d33851588e851` |
| `rust-toolchain.toml` | `rust-toolchain.toml` | `6f9c67b5082cea3bdce5efe3d2f91db969ce1f74` | 400 | LF | `b19266c79d308cd1f288d0d59fd26573964c03ecccdebb8587d1584b03e259b1` |

The upstream `Cargo.toml` is used unchanged: the crate builds in place as package
`holographic-wormhole-codec`, library `holographic_wormhole_codec`, with no dependencies.

`.gitattributes` in this directory marks every file `-text`, so Git stores and checks out these bytes
as they are on every platform (`git hash-object --path` gives the upstream blob ids above, also with
`core.autocrlf=true`).

Not copied (not part of the crate): `.github/workflows/rust-1.81-clippy-verification.yml`,
`.gitignore` (it lists `Cargo.lock`, which aether keeps for `--locked`), `.nojekyll`,
`.nojekyll.sha256`, `index.html`, `index.html.sha256`, `STARPORT-2026-08-08.hbp`,
`STARPORT-2026-08-08.hbp.sha256`.

## Files added in aether

- `Cargo.lock`: written by `cargo +1.81.0 generate-lockfile`; one package entry, no dependencies.
- `UPSTREAM.sha256`, `PROVENANCE.md`, `.gitattributes`.

## License

`Cargo.toml` line 6 and the upstream `README.md` declare `MIT OR Apache-2.0`. The upstream `LICENSE`
(165 bytes) is the MIT notice in short form, copied unchanged; its copyright line is
"Copyright (c) 2026 Asolaria Federation", and `Cargo.toml` line 7 is `authors = ["Asolaria Federation"]`.
aether's root `LICENSE` has the full MIT permission text under "Copyright (c) 2026 Jesse Daniel Brown";
aether's root `LICENSE-APACHE` has the Apache-2.0 text. Which full text accompanies this crate is
left to the owner.

## Checks on Rust 1.81.0 (rustc 1.81.0 eeb90cda1, clippy 0.1.81)

The upstream workflow (`.github/workflows/rust-1.81-clippy-verification.yml`) runs
`cargo clippy --manifest-path … --all-targets -- -D warnings` with no lint allowed, a float check
(`grep -cE '\bf(32|64)\b'` over every `.rs`, whole-line `//` comments stripped, exemption markers
honoured) and `cargo test --manifest-path … --all-targets -- --nocapture`, under
`RUSTUP_TOOLCHAIN=1.81.0`. Equivalent checks here, plus the pinned sha256 and `--locked`:

| Command (in this directory) | Result |
|---|---|
| `sha256sum -c UPSTREAM.sha256` | 5 files OK |
| `cargo +1.81.0 clippy --locked --all-targets -- -D warnings` | exit 0, no lint allowed |
| `grep -rnE '\bf(32\|64)\b' src/` (the workflow's pattern, without comment stripping) | no match; the workflow's own logic gives scanned=1, unexempt=0 |
| `grep -rnE '\bf32\b\|\bf64\b\|as f[0-9]' src/` (aether's gate pattern) | no match |
| `cargo +1.81.0 test --locked --all-targets` | 9 passed, 0 failed |
| `cargo +1.81.0 test --locked --all-targets --release` | 9 passed, 0 failed |
| `cargo +1.81.0 fmt --check` | exit 0 |
