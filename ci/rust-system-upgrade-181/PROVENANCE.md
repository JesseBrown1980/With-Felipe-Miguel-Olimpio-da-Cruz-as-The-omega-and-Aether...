# ci/rust-system-upgrade-181 — provenance

The owner's std-only Rust 1.81 system-upgrade audit, vendored byte for byte, run here as a cold
referee over this repository. Nothing in this directory changes the audit's code; the only files
not from upstream are this note, `UPSTREAM.sha256`, and the receipts in `measured/`, which the
audit binary itself wrote.

## Source

- Repository: `JesseBrown1980/FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS`
- Commit: `8712368c851abe347ddf97a25bfbd96275d4316c` (the GitHub `main` and `HEAD` when checked with
  `git ls-remote` on 2026-10-17)
- Path: `matrix/rust-system-upgrade-181/` (all 12 tracked files at that commit, no others)

| file | git blob id | sha256 |
|---|---|---|
| Cargo.toml | 91f0cd0667ac136f82162f9b55b1afdddbe20658 | 0261c53d5f5d40d5ff37bdd816830ad394bfa0e2a2f09e97cf0d4136bef454e3 |
| Cargo.toml.sha256 | a0297b0cbdada34969a9e8d23663e9b70d982de9 | d5f8ba9ca7653a6dbe24c94ea6c6cfc91041ced6bd7f360d67c586ae3c0759b1 |
| Cargo.lock | 3d62bd97791bf50aec3334eb08c0c7a36dcc2a79 | 26fa7d725463f76ec6a70eeaecd022607c8caa071520678d5e4439df184702ad |
| Cargo.lock.sha256 | 71b775f65d33a582ed7a3274ea0ff6d62bbc00e0 | f03e9b8a11f693da2315a9e1000f0c6b9b4afbab1faccd5ba469771e319b5fd8 |
| README.md | 515e84f0f38175fc1154be318e313879f3f0306b | 0c301147f3be35bc7577cdd98c978c87f030213f5defcc519e99b21fba9d7004 |
| README.md.sha256 | 492bab4d238202517b55ac41d6888ce197dfa73e | 6e29a645a2c55e36e51515b1eedaabbbfe730f334d83585e857bf2b0c6cb937e |
| rust-toolchain.toml | 70a20e39f98971d296b1910c15dfdba764d840bd | ea834307d6a64eb04a59e3447196da90ae668d22d11f0966dee2a05e1ee10553 |
| rust-toolchain.toml.sha256 | ea7c974ed5cbc41113335a400222f42858e025ac | ade1fb3a9be3635ac580e80cc35bd4896d7427e40537fef7a56edac27d45b15d |
| src/lib.rs | e8fdc8e8a47586a74eb4758679212be4e3cb170c | 7a67da3b3c90ad1c682e2f6b9121ea72114fbdd26b81ff38edf0c35e907fce93 |
| src/lib.rs.sha256 | 5e1ad102b5099f88e3f4ca6977863eb51424a7a7 | 8da40836249372141da861f6181a4c620196efe55fa618daad6afc01f1b011db |
| src/main.rs | 806be75b534a2e3378ebd974d2ee3880cfca32f0 | 31a351be9e7e68288c873c3929aa7ce43cbf297349cc3442a558db08a4c1185d |
| src/main.rs.sha256 | 527df38ff03e3a1d2e8147d44231c79c435ff5db | e2a3b7a81992b2f1100570e6ceb3ec75a3b6f52b117672bdfa3c18bca2b84a10 |

`sha256sum -c UPSTREAM.sha256` checks all 12. The upstream's own sidecars (`*.sha256`) also pass
`sha256sum -c` (src sidecars from inside `src/`). Privacy scan before copying (emails, phone numbers,
LAN addresses, key material, home paths): no hits; all 12 files are vendored.

The crate has no `tests/` directory upstream. Its five unit tests are inline, `src/lib.rs:1088-1157`.
At the repository level, FOLLOW@8712368 `tests/verify_public_repo.py` (4016 lines, stdlib Python,
"Verify the public-slice contract without external packages.") references this crate: it lists the
crate's six files and the baseline in `MATRIX_PRIMARY` (:140-146) and requires FOLLOW's own workflow
lines for it (:2117-2132, :2154-2181: `--manifest-path matrix/rust-system-upgrade-181/Cargo.toml`, the
`verify . FOLLOW-THE-IS-PUBLIC-HARNESS ...` line, and `cargo +1.81.0` `fmt`, `test --all-targets
--locked` and `clippy ...` for that manifest). It is FOLLOW's whole-repository verifier of its own
files and workflows, not a test of this crate's behaviour, and is not vendored for that reason.

## What it computes (upstream file:line)

- `scan_repository` (`src/lib.rs:223`): lists `git ls-files -z --cached --others --exclude-standard`
  (:569-604), so tracked files plus untracked, non-ignored files, and reads `git rev-parse HEAD`.
  Per path it counts:
  - `.hbp` / `.hbi` artifacts; each needs a listed `<name>.sha256` whose bytes are exactly
    `<sha256 hex>  <basename>\n` (:339-357);
  - `.rs` files whose code, with comments, strings, raw strings and char literals blanked
    (:832-886), contains an `f32`/`f64` identifier or a float literal (:725-821);
  - `Cargo.toml` with `[package]`, with `rust-version = "1.81"` (:269-279), with
    `[profile.release]` and `overflow-checks = true` (:280-283);
  - `rust-toolchain(.toml)` containing `channel = "1.81.0"` (:285-292);
  - `.github/workflows/*.yml|yaml`; a workflow is a hard clippy gate when it contains `1.81.0`,
    `clippy`, `-D warnings` and `clippy::float_arithmetic` (:293-308); a package manifest counts as
    gated only when one workflow line holds `cargo +1.81.0 clippy`, `--manifest-path <that path>`,
    `-D warnings` and `clippy::float_arithmetic` (:359-366, :671-682);
  - crate roots `src/lib.rs` / `src/main.rs` containing `#![forbid(unsafe_code)]` (:309-315);
  - source files (17 suffixes, :691-713) that mention `.hbp`, `.hbi` or `hbi,hbp,sha,sh,hash`
    (:715-723); a non-Rust one, or a Rust one with float code, is `migration_required=1` (:316-337).
  - Debt coordinates (:369-402); the receipt's state is `COMPLIANT` only when their total is 0.
- `verify_baseline` (`src/lib.rs:412`): the baseline's own sidecar must match (:551-567), the scope
  hash must match, any path counted in `sidecars_mismatch` fails the run with `SIDECAR_MISMATCH_PRESENT`
  (:419-421), no debt coordinate may exceed the baseline's, and no new `migration_required=1`
  source id may appear (:431-439).
- Reads refuse symlinks, non-files and files over the bounds (8 MiB sources, 64 MiB artifacts),
  with `READ_TYPE_OR_BOUND` (:643-649); one such path ends the whole scan.
- The receipt publishes counts and domain-separated source ids
  (`sha256("ASOLARIA.SYSTEM.UPGRADE.SOURCE.V1" 0 scope 0 path)`, :968-976), never raw paths
  (`path_published=0`, :184; README: "It keeps raw paths and private repository identities outside
  the public receipt").

## Build (Rust 1.81.0, as upstream's own CI runs it)

Upstream CI (`.github/workflows/tournament.yml:79-83`, `rust-1.81-clippy-verification.yml:73,109,145,168`)
runs `fmt -- --check`, `test --locked`, `clippy --all-targets --locked -- -D warnings -D
clippy::float_arithmetic` (no lints allowed) and `verify`. Measured here with cargo/rustc 1.81.0:
fmt clean; 5/5 tests pass; clippy clean with the same flags; release binary sha256
`c30a017797ec37fb505dc7267e24b1b5276fd641b7153e37368bc277c162c321` (same from the staging copy and
from this directory).

No-float grep (`\bf32\b|\bf64\b|as f[0-9]` over `src/`) has 5 hits, all inside byte-string literals:
the detector's comparison constants (`src/lib.rs:737`, `:810`, `:811`) and two test inputs
(`:1106`, `:1110`). The grep output's sha256 is pinned in the CI lines
(`2fe5cafc5426aaf252c5cbef2c71750201b4488cb80cdb2e142e9fba6106bda0`). The audit's own scanner, run on
a repository holding only `src/lib.rs` and `src/main.rs`, reports `rust_float_code_files=0`.

## Home-repository reproduction

On a clean checkout of FOLLOW@8712368 (local clone, and again fetched from GitHub by commit id), the
binary's `verify . FOLLOW-THE-IS-PUBLIC-HARNESS matrix/SYSTEM-UPGRADE-RUST-181-BASELINE.hbp` prints
`SYSTEMUPGRADEVERIFY|state=RATCHET_PASS|remaining_debt=22|target_debt=0|json=0`, and a fresh `scan`
emits the same 29 `SOURCE` rows and the same `DEBT` row as the committed upstream baseline (written
at 26aea1b over 249 files; 252 files at 8712368).

## Measured over this repository (scope argument `asolaria-aether`)

The scope is the label hashed into source ids (`scope_sha256=a206dd3f…69e56`); upstream uses
`FOLLOW-THE-IS-PUBLIC-HARNESS` for its own repository. All scans read copies made outside the
repository; no file of this repository was changed by them.

Three receipts, each written by the binary (`scan`, which also writes the `.sha256`):

| receipt | tree | paths | sha256 |
|---|---|---|---|
| `measured/AETHER-HEAD-93c6b69.hbp` | clean clone at `93c6b696fc567170ed9b56ce3ed82798a50ed8bb` (HEAD when this work started) | 422 | `8259e1e05014583e851f6821c34583a0c42a032f858deae1f42390c25a378f5b` |
| `measured/AETHER-HEAD-85faeb1.hbp` | clean clone at `85faeb1e5be75872059fb47c4353e9237e7197c9` (HEAD at 22:34:23Z; the CI `verify` baseline) | 626 | `7cdbc328eea3d55a30770707219bbceaa14950058f9d25d85cd99d8928b9808f` |
| `measured/AETHER-WORKTREE-20261017T224922Z.hbp` | working tree copied at 2026-10-17T22:49:22Z over HEAD 85faeb1 (1018 untracked paths of in-progress directories, this one included; 6 tracked files under `qr/colour-qr/` modified), one refused path removed | 1643 of 1644 | `1e8ac29e16463ef35d36ce4f5c94670128c08548a5a0175f7ee5dcba0c329086` |

The two HEAD receipts re-measure byte for byte: a fresh scan of a clean clone at each commit is
`cmp`-equal to the committed receipt (re-checked 2026-10-18). The working-tree receipt is a one-time
snapshot: the tree it was scanned from (HEAD 85faeb1 plus the untracked in-progress directories as
they stood at 22:49:22Z) is held by no commit, and HEAD has since moved (1d6d3d6, 50db484, 1dc9b0c,
f36f399, fefa7e2, f966009, e8424a7), so that scan cannot be repeated. What can be checked is its own
`.sha256` sidecar (pinned in CI) and that its rows equal the third column below.

| row / field | HEAD 93c6b69 | HEAD 85faeb1 | working tree 22:49:22Z |
|---|---|---|---|
| ARTIFACTS hbp / hbi | 18 / 0 | 39 / 0 | 174 / 47 |
| sha_files / shell_sh_files / hash_files | 63 / 5 / 0 | 82 / 6 / 0 | 225 / 9 / 0 |
| sidecars_valid / sidecars_missing / sidecars_mismatch | 3 / 13 / 2 | 10 / 27 / 2 | 72 / 123 / 26 |
| RUSTGATE source_candidates | 55 | 97 | 228 |
| rust_artifact_sources / non_rust_artifact_sources | 21 / 34 | 48 / 49 | 132 / 96 |
| rust_sources / rust_float_code_files | 64 / 0 | 150 / 0 | 458 / 0 |
| cargo_manifests / package_manifests | 18 / 18 | 32 / 32 | 78 / 77 |
| rust_version_181_manifests / overflow_profiles | 17 / 3 | 29 / 3 | 74 / 6 |
| toolchain_files / exact_toolchain_181_files | 18 / 18 | 24 / 24 | 55 / 55 |
| workflow_files / clippy_workflows / clippy_hard_gate_workflows | 1 / 1 / 0 | 1 / 1 / 0 | 1 / 1 / 0 |
| clippy_gated_manifests | 0 | 0 | 0 |
| crate_roots / forbid_unsafe_roots | 19 / 15 | 33 / 24 | 76 / 59 |
| DEBT non_rust_artifact_sources | 34 | 49 | 96 |
| rust_float_code_files | 0 | 0 | 0 |
| sidecars_missing | 13 | 27 | 123 |
| toolchain_gap | 0 | 8 | 22 |
| rust_version_gap | 1 | 3 | 3 |
| overflow_profile_gap | 15 | 29 | 72 |
| clippy_hard_gate_gap | 18 | 32 | 77 |
| forbid_unsafe_gap | 4 | 9 | 17 |
| total | 85 | 157 | 410 |
| SOURCE migration_required=1 (PYTHON / JAVASCRIPT / SHELL) | 26 / 5 / 3 | 40 / 5 / 4 | 84 / 5 / 7 |

Every receipt has `state=MIGRATION_REQUIRED`. Migration source ids: HEAD 85faeb1 holds all 34 of
HEAD 93c6b69 plus 15; the working tree holds all 49 of HEAD 85faeb1 plus 47.

The working-tree scan of the copy as it stands ends with `READ_TYPE_OR_BOUND`: one untracked path,
`qprism/recovery-omega-codecs/omega-operator-catalog-v0/omega_operator_catalog.rs`, is a symlink to
`../../recovery/catalog/omega_operator_catalog.rs` (refused by `src/lib.rs:643-647`). The receipt
above is the scan of the same copy with that one path removed. No path is a symlink at HEAD 85faeb1.
Committing that symlink is planned: the `qprism/recovery-omega-codecs` CI lines
(`ci-snippets/recovery-omega-codecs.txt:5-9`, `:20-26`) name it a symlink to the catalog and hash it
in CI. Measured on a scratch clone of e8424a7 with both directories committed (git stores that path
with mode 120000) and this job in `gate.yml`: every run step exits 0, but the report step prints only
`READ_TYPE_OR_BOUND` and the scan and verify exit codes (1 and 1), no receipt is written, and the
upload step has no file. Without the symlink the same job prints the full rows (DEBT total=308). The
audit's code stays as upstream wrote it; whether `recovery-omega-codecs` carries a regular file with
the same bytes (git blob `1535e158…`) in place of the symlink, or this referee reports only
`READ_TYPE_OR_BOUND` after integration, is the integrator's or the owner's choice.

`verify` against `measured/AETHER-HEAD-85faeb1.hbp` (and against 93c6b69): both HEAD trees and the
working-tree copy end with `SIDECAR_MISMATCH_PRESENT` (`src/lib.rs:419-421`, reached before the debt
comparison); the working-tree copy with the symlink present ends with `READ_TYPE_OR_BOUND`.

The two HEAD paths counted in `sidecars_mismatch` (the same two files at 93c6b69 and 85faeb1) have the exact
`<hex>  <basename>\n` shape; the recorded hash differs from the sha256 of the current bytes. Of the 26
in the working tree: 13 record the bytes' hash with a CRLF line end (3 of them under
`tests/fixtures/tamper/`), 3 record it as `<hex> *<basename>`, and 10 record a different hash (6 of
them under `tests/fixtures/tamper/`).

Committed state (re-measured 2026-10-18 on clean clones): from 50db484, where `hbp/vault-reader` was
committed, 26 tracked paths are counted in `sidecars_mismatch`, the same 26 at 50db484, 1dc9b0c,
f36f399, fefa7e2, f966009 and e8424a7 (HEAD on 2026-10-18; 1271 paths, DEBT total=308; 1d6d3d6 has 2).
They are the same 26 paths as in the working tree above (path lists compared): 24 under
`hbp/vault-reader/`, 9 of those under `hbp/vault-reader/tests/fixtures/tamper/` (`hbp/vault-reader/README.md:244-247`: "written by
`tests/common/gen.rs` ... and from the public fixtures with one stated change each"); 13 CRLF, 3
`<hex> *<basename>`, 10 a different hash. Because `verify` checks `sidecars_mismatch` before any debt
coordinate (`src/lib.rs:419-421`), it reports `SIDECAR_MISMATCH_PRESENT` whatever baseline is pinned
(measured at each of these commits against all three receipts) for as long as those paths are
committed. Re-pinning the baseline is the owner's call.

This directory's own files, scanned one by one: every check passes except that `Cargo.toml` is not
yet bound by a workflow line (`clippy_hard_gate_gap` +1). With the CI job merged into `gate.yml`
(simulated on a scratch clone), the audit counts `clippy_hard_gate_workflows=1` and
`clippy_gated_manifests=1`, and HEAD plus this directory has the same DEBT total as HEAD alone
(85 over 93c6b69, 157 over 85faeb1, 308 over e8424a7).

Per-path lists for every count above were produced outside this repository by running the same
binary once per path, each path alone in a one-commit repository at its own relative path (with its
`.sha256` when listed, and with the workflows for a `Cargo.toml`). The per-path counts summed field
by field equal each receipt on 21 of the 25 count fields (`sha_files` and the three workflow
aggregates are not additive per path), and the per-path source ids equal the receipts' `SOURCE` ids
(22/22 equal for each tree). The lists are not committed here, matching the receipt's
`raw_paths=0` boundary.

## CI

Report-only cold referee job; lines in the orchestrator's `ci-snippets/ci-rust-system-upgrade-181.txt`.
The audit's findings over this repository do not fail CI; whether they become a gate is the owner's
decision.
