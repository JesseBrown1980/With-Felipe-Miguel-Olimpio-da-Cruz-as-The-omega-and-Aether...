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
- `RECEIPT-LADDER-RUNGS.hbp` (2026-10-18, commits `231a050` and `1e20fa5`; MEASURED: `git log`): the
  metatag ladder receipt. Its tests are in [`../ladder-rungs/`](../ladder-rungs/). It stays here
  because `aether-universe` (committed from ACER: `65aa4d4` and `012c84c`, author `acer`) cites this
  path at `src/sources.rs:21` and `:191` and `tests/secrets.rs:257`, and `src/sources.rs:310-320`
  asserts that the path exists (MEASURED 2026-11-08: `git grep RECEIPT-LADDER-RUNGS -- aether-universe`,
  `git log`). `UPSTREAM.sha256` does not list it.

## The ladder tests, 2026-10-18 to 2026-11-08

Commits `231a050` and `1e20fa5` added two ladder tests to `src/lib.rs` and a section to `README.md`
(MEASURED: `git show --stat`). From then on `sha256sum -c UPSTREAM.sha256` failed on those two files
(MEASURED at `7c4711f`: 3 OK, 2 FAILED). On 2026-11-08 both were restored with
`git checkout 88796e6 -- src/lib.rs README.md`, the commit that brought them in (MEASURED:
`git log --diff-filter=A`). `git hash-object` gives `237c82a2…` and `749f30d9…` again, the upstream
blob ids, and `sha256sum -c UPSTREAM.sha256` gives 5 OK (MEASURED 2026-11-08). The tests moved to
`../ladder-rungs/`, and its `README.md` restates the README section. That crate reads the codec's
private `to_symbols`/`from_symbols`/`hex` through byte-identical extracts of these lines (MEASURED
2026-11-08: `../ladder-rungs/check.sh` compares them with `cmp`, and its test
`upstream_extracts_are_the_vendored_lines` passes).

The receipt's line 6 still names the old command, `cargo +1.81.0 test metatag_ladder` in this
directory. Run here now, it runs 0 tests (9 filtered out) (MEASURED 2026-11-08). The rows now come
from `../ladder-rungs/check.sh`. The receipt is not edited.

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

MEASURED again on 2026-11-08 after the restore (cloud seat, rustc 1.81.0): `sha256sum -c` 5 OK,
clippy exit 0, both float patterns no match, `test --all-targets` 9 passed (also with `--release`),
`fmt --check` exit 0.
