# Publish readiness, 2026-11-08 (plan items A6 and A7)

Every claim below is MEASURED, which means a row in one of the two receipts proves it, unless
the claim carries another tag inline. CANON marks what cargo's or crates.io's documentation, or
one of the repo's own files, says. OPERATOR_OBSERVED marks what the session saw but did not
record, and UNVERIFIED marks what nothing here checks. The receipts are
[`HOMES-2026-11-08.hbp`](HOMES-2026-11-08.hbp) and
[`CRATES-PACKAGE-LIST-2026-11-08.hbp`](CRATES-PACKAGE-LIST-2026-11-08.hbp). The first expectations
were frozen in commit `43a5402`, before any measurement. The post-review checks (P4, P5, E8 to
E11) were frozen in commit `100f284`, before they ran. None was edited afterwards.

Nothing was published, pushed, tagged or uploaded. After the last dry run, a second
`git ls-remote` of the three homes found the same heads, no tag and no `publish-prep` ref (P4,
P5). A second `cargo search` found the same 2 of the 102 names taken (E11). All 44 dry runs that
passed printed "aborting upload due to dry run" (the DRYABORT row). The network reads were:
- `git ls-remote`;
- a fetch into a scratch bare repository of the HF head commits, their trees and 12 small blobs
  (10 distinct LFS pointers and 2 `.gitattributes` files), then a scratch checkout of 11 paths;
- `cargo search`;
- `cargo publish --dry-run`.

Input: aether `main` at `7c4711f` (tree `66d4b5df`), toolchain 1.81.0.

## 1. The three homes (A6)

Measured 2026-11-08 17:54 UTC.

| Home | `refs/heads/main` | Tree | Files |
|---|---|---|---|
| GitHub `felipe` | `7c4711fcf133130a7e773d928a0879616fda56ac` | `66d4b5df…` | 15,859 |
| HF `Jessedbrown/asolaria` | `0ef04538736d7116e6f7240eb4d339ffced15d54` | `2e1f55a9…` | 1,245 |
| HF `Jessedbrown/asolaria-aether` | `58ec0d37770e8b3b29e4ffa90f1c932888a1b018` | `2e1f55a9…` | 1,245 |

- The two HF homes hold the same tree at two different commits. Both commits are named "Sync with
  GitHub main f966009 (part 5)" and date from 2026-10-18. `f966009` is an ancestor of `felipe`
  main, 87 commits behind it.
- Even against `f966009` itself, the HF tree is not byte-identical. The paths are the same 1,245,
  but 22 of them differ:
  - `.gitattributes` has two more LFS lines;
  - 8 scripts lost their executable bit (`100755` became `100644`);
  - 13 binaries are stored as LFS pointers. All 13 pointers give the same sha256 and size as the
    GitHub bytes.
- 11 of those 13 pointer paths (8 under `gguf/` and 3 under `pump/kernel-pump/`) have no
  `filter=lfs` attribute in the HF tree (`git check-attr`). A scratch checkout of those 11 paths
  wrote 131- to 132-byte pointer text, not the GGUF bytes. A full `git clone` from either HF home
  would get pointer text at those paths unless the LFS objects are pulled by hand. That follows
  from git's attribute rules, but no full clone was tried (UNVERIFIED).
- `README.md` § Homes says Asolaria is "published, byte-identical, at three public homes". As of
  2026-11-08 that is false.

| Frozen prediction | Result |
|---|---|
| P1: the three homes differ | held |
| P2: `felipe` main is `7c4711f` | held |
| P3: the proxy blocks huggingface.co | **MISS**: both HF repos answered `ls-remote` and `fetch` |
| P4 (19:25 UTC): a second `ls-remote` of `felipe` gives main `7c4711f` and no `publish-prep` ref | held: `felipe` lists 2 refs, `HEAD` and `refs/heads/main` |
| P5 (19:25 UTC): a second `ls-remote` of both HF homes gives the same heads | held |

## 2. crates.io (A7)

### Counts

- 122 tracked `Cargo.toml` files: 119 have a `[package]` table and 3 are workspace-only. Of the
  119, 33 are `publish = false` and **86 are not**.
- By origin, the 86 split into:
  - 48 aether-written;
  - 6 aether-path copies pinned by an upstream or seat pin file;
  - 32 under `vendor/` paths.
- `cargo package --list` was run on all 86 (no build). After every list run and every dry run,
  `git status` showed the worktree unchanged.

### Expectations

| Frozen expectation | Result | Measured |
|---|---|---|
| E1: 55 manifests are not `publish = false` | **MISS** | 86 |
| E2: `cargo package --list` succeeds on each | **MISS** | 74 of 86 succeed. All 12 failures are vendored copies whose workspace root, workspace member or library source was not vendored. |
| E3: the content gate flags 0 files | **MISS** | 23 FLAG, 13 REVIEW (all resolved). No packaged path is under a vault, phone or HOLD path. |
| E4: no `asolaria` or `asolaria-*` name is taken | held | Of the 102 names searched, only `hbp` (0.3.0) and `shadowcat` (0.0.0) are taken. Both are unprefixed. The description that `cargo search` printed for each names a different project (OPERATOR_OBSERVED: the descriptions are not copied into the receipt). |
| E5: every leaf crate passes `cargo publish --dry-run --locked` | **MISS** | 54 leaf crates: 44 PASS, 10 FAIL |
| E6: exactly 3 publishable crates depend on `asolaria-ternary` | held | `agents/levels`, `pump/glyphs-herself`, `quants/head8` |
| E7: the plan's B2 first wave (8 crates) has no manifest blocker | held, under a reading set after the measurement, and with a caveat | 7 pass the dry run as leaf crates. `asolaria-qprism-throat` has one versioned path dependency and no blocker. The reading, written into the RESULT row after the measurement: a manifest blocker is an own blocker in the CRATE row, and a name that other manifests also carry is recorded apart. Caveat: 2 vendored copies carry the name `asolaria-server-fischer-eval` too, so only one of the 3 can be published (CANON: a crates.io name belongs to one crate). |
| E8 (post-review): exactly 13 tracked `Cargo.lock` files pin `zeroize`, all at 1.8.2 | held | 13 of the 87 tracked lock files carry `zeroize`, all 1.8.2 |
| E9 (post-review): the cargo 1.81 index cache gives `zeroize` 1.8.2 `rust_version` 1.60, and only 1.9.0 and 1.9.1 above it, both 1.85 | held | The cache file was last written 2026-10-17. |
| E10 (post-review): the `zeroize-1.9.1/Cargo.toml` the dry runs could not parse declares edition 2024 and `rust-version` 1.85 | held | |
| E11 (post-review): a second `cargo search` of the same 102 names gives exactly `hbp` and `shadowcat` taken | held | 0 verdicts changed, 0 errors |

### Content gate

The 23 FLAGs are binaries that `cargo package` would ship and that sit under a `vendor/` path or
are named in a pin file. The frozen gate rule (CRATESDEF) calls these third-party. That label
comes from the rule, not from a check of each file's provenance.

| Crate | Flagged files |
|---|---|
| `asolaria-l0-edge` | `vendor/gnn-sidecar/baseline_model.pt` |
| `asolaria-l1-prototype` | `vendor/fnns/models/prototype_model.pt` |
| `asolaria-l2-contrastive` | `vendor/fnns/models/contrastive_model.pt` |
| `asolaria-l4-gslgnn` | `vendor/fnns/models/gslgnn_w9_3_seq47_v2.pt` |
| `asolaria-matrix-in-colour` | 10 PNG frames under `vendor/asolaria-matrix-in-colour/frames/` |
| `asolaria-colour` | `vendor/follow/colors/DOUBLE-RAINBOW-OIL-3174.gguf` |
| `asolaria-colour-qr` | 4 `tests/fixtures/payloads/*.bin`, pinned by its `UPSTREAM.sha256` |
| `shadowcat` (the excluded ACER copy) | 4 `out/*.hbi`/`*.hbp`, pinned by its `SHA256SUMS` |

The 13 REVIEWs are resolved:

- 12 binaries are aether's own outputs: the four `pump/glyphs-herself/tests/vectors/*.bin` and the
  eight `qr/colour-qr/tests/fixtures/png/*.png`. The repo's own sources say so
  (`referee/dump_vectors.py:492-495`, `qr/colour-qr/PROVENANCE.md:79`). That provenance is CANON:
  the files were not regenerated here.
- `asolaria-matrix-in-colour` is 30.2 MiB raw, but its package is 770.3 KiB compressed. That is
  under crates.io's 10 MiB limit on the compressed `.crate` (the limit is CANON: crates.io
  documentation).

### Dry runs (leaf crates only, 54)

The 10 failures:

- **6 fail at the manifest**, with the same errors as `--list`: 3 copies under `beginning/09`,
  `hookwall-session-start`, and 2 under `ledger/cosign-council/vendor/`.
- **3 fail because a dependency needs edition 2024**: `asolaria-hookwall`, aether's
  `asolaria-server-cosign-ledger`, and the vendored `asolaria-kernel-core`.
  - None of the three packages lists a `Cargo.lock` (FILE rows). The verify build therefore
    resolved its registry dependencies afresh and picked `zeroize 1.9.1`. Cargo 1.81 could not
    parse that manifest, because it needs the `edition2024` feature (DRYCAUSE rows). Its
    `Cargo.toml` declares `edition = "2024"` and `rust-version = "1.85"` (E10).
  - The workspace lock file of each of the three pins `zeroize 1.8.2` (WSLOCK rows), like all 13
    tracked lock files that carry it (E8). `--locked` did not keep the verify build on that
    version.
  - Cargo 1.81 packs a `Cargo.lock` only into a package with a binary or example target (CANON:
    cargo 1.81 behaviour). None of the three package lists has a `src/main.rs`, `src/bin/` or
    `examples/` file (FILE rows), and each manifest declares only a `[lib]` target (CANON: the
    three manifests).
  - The local index cache gives 1.8.2 `rust_version` 1.60, and only 1.9.0 and 1.9.1 above it,
    both 1.85 (E9). So 1.8.2 is the newest `zeroize` with `rust-version` 1.81 or lower, as far
    as that cache goes. It was last written 2026-10-17, and whether a later version exists is
    UNVERIFIED.
  - A 1.81 user who adds one of these crates, in a project with no older `zeroize` already
    locked, would likely resolve the same version (UNVERIFIED: inferred from the dry run).
- **1 fails to build**: `asolaria-gate-fischer-upstream` (E0432). Its library and binary sources
  live under `vendor/federation-1024/servers/fischer-eval/`, which holds its own `Cargo.toml`.
  Its package list has no file under that directory (FILE rows), so the library is dropped and
  the `upstream-fixture` binary no longer compiles. Cargo leaves out any subdirectory that holds
  its own `Cargo.toml` (CANON: cargo documentation).

Cargo 1.81's dry run only warns about a missing `description` or `license`: both such dry runs
exited 0 with that warning (DRYWARN rows). crates.io rejects a publish that lacks either (CANON:
cargo and crates.io publishing documentation; nothing was uploaded to test it). The receipt
therefore counts them as blockers even where the dry run passed. That applies to
`new-rime-fixed27-wave` and to the excluded ACER `shadowcat`.

Not dry-run, as the task requires: the 30 crates with path dependencies, and 2 whose workspace
root is not vendored. A verify build for those 30 can only resolve once their dependencies are on
crates.io (CANON: a packaged crate's path dependencies resolve from the registry).

### Every crate whose publish is blocked (46 of 86)

A crate can also be blocked through a path dependency that is itself blocked. The table names
every such dependency, also for a crate that has a blocker of its own (the `via` field of the
BLOCKED rows). The BLOCKROOT rows follow each chain down to the crates whose own blocker causes
it.

**aether-written (28)**

| Crate | Manifest | Reason |
|---|---|---|
| `asolaria-l0-edge` | `model/l0-edge` | content gate: vendored `.pt` weights |
| `asolaria-l1-prototype` | `model/l1-prototype` | content gate: vendored `.pt` weights |
| `asolaria-l2-contrastive` | `model/l2-contrastive` | content gate: vendored `.pt` weights |
| `asolaria-l4-gslgnn` | `model/l4-gslgnn` | content gate: vendored `.pt` weights |
| `asolaria-colour` | `colour` | content gate: vendored GGUF |
| `asolaria-matrix-in-colour` | `colour/matrix-in-colour` | content gate: 10 vendored PNGs |
| `asolaria-colour-qr` | `qr/colour-qr` | content gate: 4 pinned upstream payloads |
| `asolaria-hookwall` | `gate/hookwall` | dry run: `zeroize 1.9.1` needs edition 2024 |
| `asolaria-server-cosign-ledger` | `ledger/cosign-council/cosign-ledger` | dry run: `zeroize 1.9.1` needs edition 2024; name also on 2 vendored copies |
| `asolaria-gate-fischer-upstream` | `gate/fischer-upstream` | dry run: vendored sources left out of the package (E0432) |
| `asolaria-levels-agents` | `agents/levels` | depends on `publish = false` `asolaria-ternary`; also via `asolaria-hrm-mtp`, which is blocked via `asolaria-l0-edge` |
| `pump-glyphs-herself` | `pump/glyphs-herself` | depends on `publish = false` `asolaria-ternary` |
| `asolaria-quant-head8` | `quants/head8` | depends on `publish = false` `asolaria-ternary`; also via `asolaria-l0-edge` (versioned dev-dependency) |
| `hbp` | `hbp` | name taken on crates.io |
| `shadowcat` | `shadowcat` | name taken on crates.io; name also on the ACER copy |
| `hbp-relay` | `hbp/relay` | via `hbp` |
| `asolaria` | `cli` | via `asolaria-hookwall`, `asolaria-verdict`, `asolaria-observed` and `asolaria-l0-edge` |
| `asolaria-observed` | `gate/observed` | via `l0-edge`, `l1`, `l2`, `l4`, `shadowcat`, `verdict` and `hookwall` |
| `asolaria-verdict` | `gate/verdict` | via `asolaria-hookwall` |
| `asolaria-server-cosign-serve` | `ledger/cosign-council/cosign-serve` | via `asolaria-server-cosign-ledger` |
| `asolaria-pump-kimi-stars` | `pump/kimi-stars` | via `asolaria-colour` |
| `asolaria-port-address-emitter` | `address/port-emitter` | via `asolaria-l0-edge` |
| `asolaria-events` | `events` | via `asolaria-l0-edge` (versioned dev-dependency) |
| `asolaria-g-planes` | `model/g-planes` | via `asolaria-l0-edge` |
| `asolaria-hrm-mtp` | `model/hrm-mtp` | via `asolaria-l0-edge` |
| `asolaria-whiteroom-shannon` | `planes/whiteroom-shannon` | via `asolaria-l0-edge`, `asolaria-quant-cubes` and `asolaria-hrm-mtp` |
| `asolaria-quant-cubes` | `quants/cubes` | via `asolaria-l0-edge` |
| `asolaria-ste-certificate` | `search/ste-certificate` | via `asolaria-l0-edge` (versioned dev-dependency) |

**Pinned ACER copy (1, excluded from any change)**

`docs/handoffs/acer-post60d-2026-10-18/FABLE5-SHADOWCAT-REMADE-BYTE-EXACT-2026-10-18/Cargo.toml`,
named `shadowcat`. It has no `description` and no `license`, the content gate flags 4 files, and
the name is taken on crates.io. It is pinned by its own `SHA256SUMS`, and nothing here touched it.

**Vendored copies (17)**

The PROVENANCE.md files of these vendored directories describe all of them as copies of the
owner's public upstream repositories (CANON: those files; not re-checked against the sources
here). This summary leaves publishing them to those repositories.

| Crate | Manifest | Reason |
|---|---|---|
| `asolaria-kernel-boot` | `beginning/09-…/kernel/boot` | path dependency without a version (`asolaria-kernel-core`), which is itself blocked |
| `asolaria-kernel-core` | `beginning/09-…/kernel/core` | dry run: `zeroize 1.9.1` needs edition 2024 |
| `asolaria-server-agent-runtime` | `beginning/09-…/servers/agent-runtime` | list fails: workspace member `servers/gnn-oracle` not vendored |
| `asolaria-server-cosign-ledger` | `beginning/09-…/servers/cosign-ledger` | list fails, for the same reason |
| `asolaria-server-tier-policy` | `beginning/09-…/servers/tier-policy` | list fails, for the same reason |
| `asolaria-server-highway` | `beginning/09-…/servers/highway` | list fails, for the same reason; 2 path dependencies without a version, both to blocked crates |
| `asolaria-host8-serve` | `beginning/10-…/servers/host8-serve` | list fails: workspace root not vendored; 6 path dependencies without a version |
| `asolaria-host8-serve` | `host8/vendor/…/host8-serve` | list fails: workspace root not vendored; 7 path dependencies without a version |
| `asolaria-kernel-boot` | `beginning/11-…/kernel/boot` | list fails: workspace root not vendored; path dependency without a version |
| `hookwall-session-start` | `beginning/11-…/tools/hookwall-session-start` | list fails: workspace root not vendored; no `description` |
| `hookwall-edge` | `beginning/13-…/tools/hookwall-edge` | list fails: workspace root not vendored; no `description` |
| `recall-serve` | `hbp/vendor/recall-serve-readonly` | list fails: workspace root not vendored; no `description` |
| `new-rime-fixed27-wave` | `beginning/11-…/rime/fixed27-wave-v2` | no `description` (the dry run passed) |
| `asolaria-server-cosign-ledger` | `ledger/cosign-council/vendor/…/cosign-ledger` | list fails: `src/lib.rs` not vendored |
| `asolaria-server-vote-quorum` | `ledger/cosign-council/vendor/…/vote-quorum` | list fails: `src/lib.rs` not vendored |
| `asolaria-server-cosign-serve` | `ledger/cosign-council/vendor/…/cosign-serve` | path dependency without a version, to the vendored `asolaria-server-cosign-ledger`, which is itself blocked |
| `asolaria-server-council-serve` | `ledger/cosign-council/vendor/…/council-serve` | path dependency without a version, to the vendored `asolaria-server-vote-quorum`, which is itself blocked |

### Not blocked: the 20 aether-written crates

None of these has a blocker in the receipt. The CRATE rows give the full state, including the
pinned and vendored copies.

- **Wave 1: dry run passed (15).**
  - kernels: `asolaria-tribit`, `asolaria-behcs1024-60d`, `asolaria-kernel-lane-core`;
  - models and planes: `asolaria-gnn-int`, `asolaria-hrm-fork`, `asolaria-gulp-watchers`;
  - Q-PRISM: `asolaria-qprism-recovery`, `asolaria-omega-operator-catalog`,
    `asolaria-recovery-omega-codecs`, `asolaria-qprism-representation`;
  - the rest: `asolaria-verify-schedule`, `asolaria-quant-hyperbehcs`, `asolaria-host8`,
    `aether-loop`, `asolaria-server-vote-quorum`.
- **Wave 1: not dry-run (1).** `asolaria-qr-read-int` has only a versionless dev-dependency path,
  which cargo strips on publish (CANON: cargo documentation).
- **Wave 2: after their path dependencies, not dry-run (4).**
  - `asolaria-qprism-throat`, after `asolaria-qprism-recovery`;
  - `asolaria-kernel-lane`, after `asolaria-kernel-lane-core` and `asolaria-behcs1024-60d`;
  - `asolaria-server-council-serve`, after `asolaria-server-vote-quorum` and
    `asolaria-verify-schedule`;
  - `asolaria-quant-exact`, after `asolaria-behcs1024-60d` and two vendored owner crates
    (`qprism-3d-slice-harness`, `dbbh-coms-quant-prism`). The names of those two vendored crates
    are carried by 2 and 3 manifests here.

## 3. For the owner

1. **Homes.** The HF homes are 87 commits behind and differ from GitHub even at their sync point.
   Before B3, decide what a sync carries:
   - the executable bits;
   - LFS attributes for the 11 GGUF paths, which HF stores as pointers but does not mark as LFS.

   Until then, the README line about byte-identical homes needs a tag or a correction (plan A4).
2. **Rust 1.81 users and `zeroize`.** `asolaria-hookwall` and aether's
   `asolaria-server-cosign-ledger` resolve to `zeroize 1.9.x` (rust-version 1.85) when built from
   a package. An upper bound such as `zeroize = ">=1.7, <1.9"` in those aether manifests is the
   likely fix (UNVERIFIED: not tried here). `gate/hookwall/Cargo.toml:18` declares `zeroize`
   directly. `ledger/cosign-council/cosign-ledger` gets it only through `ed25519-dalek`, so there
   the bound means adding a direct `zeroize` dependency (CANON: the two manifests). Vendored
   manifests stay untouched. The bound would also clear the cause these crates inherit
   (BLOCKROOT rows):
   - `asolaria-verdict`, for which it is the only blocker;
   - `asolaria-server-cosign-serve`, for which it is also the only blocker;
   - `asolaria` and `asolaria-observed`, which stay blocked by other dependencies.
3. **Model weights in crates.** The L0, L1, L2 and L4 crates would ship vendored `.pt` weights.
   An `exclude` in those aether manifests would remove them from the package (CANON: cargo
   documentation), unless their tests need the bytes (UNVERIFIED). 11 more crates are blocked
   through `asolaria-l0-edge`, directly or through a chain of blocked dependencies (its BLOCKROOT
   row). For 7 of them it is the only cause. The other 4 are `asolaria`, `asolaria-observed`,
   `asolaria-levels-agents` and `asolaria-quant-head8`.
4. **Names.** `hbp` and `shadowcat` are taken on crates.io (plan B2: rename, or claim
   `asolaria-*`). Inside the repo, 13 names are carried by more than one of the 86 manifests, so
   only one copy of each can be published (CANON: a crates.io name belongs to one crate).
5. **`asolaria-ternary`.** It still blocks exactly the 3 crates the plan named (B2). Publishing
   it alone would leave only `pump-glyphs-herself` with no recorded blocker (the UNBLOCKIF row):
   - `asolaria-levels-agents` stays blocked via `asolaria-hrm-mtp`, which is blocked via
     `asolaria-l0-edge`;
   - `asolaria-quant-head8` stays blocked via its versioned dev-dependency on `asolaria-l0-edge`.

   `asolaria-ternary` was `publish = false` when this was written, so its own package was not listed
   or dry-run here. The owner's decision of 2026-11-08 dropped that line; its package (29 files, no
   binaries) and dry run are measured in the addendum (`PUBLISH-READINESS-ADDENDUM-2026-11-08.hbp`).
6. **`asolaria-gate-fischer-upstream`** cannot be packaged as it stands, because cargo leaves out
   its vendored sources.
7. **Corrections to the plan.**
   - A7's "55 publishable crates": 86 are not `publish = false`, and 40 have no blocker found
     (20 aether-written, 5 pinned, 15 vendored).
   - B2's "the path dependencies are not the blockers" holds for the aether-written crates.
     Every normal path dependency of an aether-written crate has a version; the only versionless
     ones are two `shadowcat` dev-dependencies, which cargo strips on publish (CANON: cargo
     documentation). It does not hold
     for the vendored copies: 7 have a versionless path dependency, and 12 fail to list because
     a workspace root, a workspace member or a library source was not vendored.

## Addendum: the B2 blockers, fixed and re-measured (2026-11-08)

The owner's decision B2: fix the blockers of section 3, re-measure, then ask before any upload.
Nothing was uploaded, pushed or tagged. The rows are in
[`PUBLISH-READINESS-ADDENDUM-2026-11-08.hbp`](PUBLISH-READINESS-ADDENDUM-2026-11-08.hbp): MEASURED
rows come from a command run for the addendum, DERIVED rows are computed from those rows and from
the base receipt. The expectations X1 to X15 were frozen in `f9a578b`, before any manifest changed
and before any measurement. Branch `cloud/crates-blockers-20261108`, from `main` `5a67cc6`.

### What changed

- **zeroize.** `gate/hookwall` now asks `zeroize` `>=1.7, <1.9`. `ledger/cosign-council/cosign-ledger`
  gains a direct `zeroize` `>=1.5, <1.9` with default features off, so no feature is added. With
  only that bound, the hookwall dry run still failed (X2, at `72b0c1f`): the `derive` feature asks
  `zeroize_derive` `1.3`, and the fresh resolve picked `zeroize_derive` 1.5.0, which declares
  edition 2024 and rust-version 1.85. `gate/hookwall` therefore also declares
  `zeroize_derive = ">=1.3, <1.5"`. Neither line is upstream, and both `PROVENANCE.md` files now
  say so.
- **Locks.** No version moved. 11 lock files each gained one line, the new dependency edge: 3 gained
  `zeroize` and 8 gained `zeroize_derive` (X1). `cargo +1.81.0 metadata` wrote them, and no
  `cargo update --precise` was needed. `cargo +1.81.0 metadata --locked` passes in all 11
  workspaces.
- **Weights.** The four model manifests `exclude` their vendored `.pt` checkpoint. Two kinds of
  code read the checkpoints: each crate's `tools/quantize.py` and `tools/model_parity.py`, and the
  vendored inference servers those tools import (ADDPRE row). No `build.rs`, `src/`, `tests/` or
  `examples/` file reads one: `src/weights.rs` already holds the Q24 integers. The files stay in
  the repository under their `UPSTREAM.sha256` pins.

### Frozen expectations

| Expectation | Result |
|---|---|
| X1: no lock version moves; 11 locks gain exactly one edge line | held |
| X2: zeroize bound alone, hookwall dry run fails on `zeroize_derive` 1.5.0 | held |
| X3, X4: hookwall (14 files) and cosign-ledger (8 files) dry runs pass | held |
| X5: L0/L1/L2/L4 list 33/17/18/21 files, no `.pt`, gate clean, dry runs pass | held |
| X6: tests in the unpacked packages pass with the repo's counts (44, 13, 15, 18) | held. A first l1 and l2 run was given `--locked`, which X6 does not ask for when the package has no lock. Cargo exited 101 on both, and both rows are kept. |
| X7: plain dry runs of the 9 path-dependency crates fail at the verify resolve, before any compile | **MISS** on the stage, 5 of 9. All 9 exit 101, each names a dependency that is not on crates.io, and none compiles anything. The 5 whose package carries a `Cargo.lock` fail earlier, while cargo prepares that lock. |
| X8: patched dry runs of the same 9 pass | held |
| X9: the 13 crates blocked through the 6 list with the base file counts, gate clean | held |
| X10: remaining blockers as below | held (DERIVED) |
| X11: clippy, `test --locked`, no-float grep and fmt (where the crate has it) pass for the 6 changed crates; `metadata --locked` passes in 11 workspaces | held |
| X12: hookwall's plain `-D warnings` clippy fails only on the two lints its CI job allows | held |
| X13: the worktree stays clean after every run | held |
| X14: the index still has no zeroize 1.8.x above 1.8.2 and no zeroize_derive 1.4.x above 1.4.3 | held. The live index, read afterwards, agrees. |
| X15: the pin check passes before the first commit and after the last | held |

`cargo +1.81.0 fmt --check` reports 5 hunks in `gate/hookwall` (`src/crypto/mod.rs`, `src/lib.rs`).
Its CI job has no fmt step and its toolchain file lists no rustfmt. This branch changes no `.rs`
file.

### New state of the 19 crates

A plain dry run of a crate with versioned path dependencies fails until those dependencies are on
crates.io (CANON). A patched dry run adds one `--config patch.crates-io.NAME.path=DIR` for each path
dependency in the closure, so the verify build uses the repo's sources. It predicts the post-upload
result only if the dependencies are uploaded from the same commit (DERIVED).

| Crate | Files | Dry run | Remaining blocker |
|---|---|---|---|
| `asolaria-hookwall` | 14 | PASS | none |
| `asolaria-server-cosign-ledger` | 8 | PASS | none. The name is also on 2 vendored manifests. |
| `asolaria-l0-edge`, `-l1-prototype`, `-l2-contrastive`, `-l4-gslgnn` | 33, 17, 18, 21 | PASS | none |
| `asolaria-verdict` | 6 | patched PASS | none, after `asolaria-hookwall` and the pinned `asolaria-server-fischer-eval` |
| `asolaria-server-cosign-serve` | 14 | patched PASS | none, after `asolaria-server-cosign-ledger` |
| `asolaria-port-address-emitter`, `-events`, `-g-planes`, `-hrm-mtp`, `-quant-cubes`, `-ste-certificate` | 13, 20, 8, 52, 68, 31 | patched PASS | none, after `asolaria-l0-edge` (and `aether-loop`, `asolaria-quant-hyperbehcs`) |
| `asolaria-whiteroom-shannon` | 50 | patched PASS | none, after `l0-edge`, `quant-cubes` and `hrm-mtp` |
| `asolaria-levels-agents`, `asolaria-quant-head8` | 36, 27 | not run | their own `publish = false` dependency `asolaria-ternary` |
| `asolaria-observed` | 20 | not run | via `shadowcat` (name taken) |
| `asolaria` (cli) | 11 | not run | via `asolaria-observed` |

### Aether-written crates a publish would accept: 35 of 48, in dependency order (DERIVED)

1. **Wave 1 (22).** The 15 of section 2's wave 1 (base dry run PASS, no file changed in their
   directories since `7c4711f`), `asolaria-qr-read-int` (its dry run passed here), and the 6 of
   this branch: `asolaria-hookwall`, `asolaria-server-cosign-ledger` and `asolaria-l0-edge`, `-l1-prototype`,
   `-l2-contrastive`, `-l4-gslgnn`.
2. **Before wave 2, 3 crates of other origin.**
   - For `asolaria-verdict`: `asolaria-server-fischer-eval` (the pinned `gate/fischer-eval`).
   - For `asolaria-quant-exact`: `qprism-3d-slice-harness` and `dbbh-coms-quant-prism` (the
     copies under `quants/exact/vendor/`).
3. **Wave 2 (12).** These patched dry runs passed here (4 of them in supplementary rows that were
   not frozen):
   - from section 2: `asolaria-qprism-throat`, `asolaria-kernel-lane`,
     `asolaria-server-council-serve`, `asolaria-quant-exact`;
   - newly unblocked: `asolaria-verdict`, `asolaria-server-cosign-serve`,
     `asolaria-port-address-emitter`, `asolaria-events`, `asolaria-g-planes`, `asolaria-hrm-mtp`,
     `asolaria-quant-cubes`, `asolaria-ste-certificate`.
4. **Wave 3 (1).** `asolaria-whiteroom-shannon`.

This order assumes the owner lets the aether copies take 4 names that vendored manifests also
carry: `asolaria-server-cosign-ledger`, `-cosign-serve`, `-council-serve` and `-vote-quorum`. In
each case the aether copy is the only one that packages.

### Still for the owner (not decided here)

- **`asolaria-ternary`**: decided 2026-11-08, publish. `publish = false` is dropped, and the package
  and the 3 crates it unblocks (`asolaria-levels-agents`, `asolaria-quant-head8`,
  `pump-glyphs-herself`) are measured in the addendum.
- **`hbp`** (name taken). A rename, or claiming an `asolaria-*` name, would unblock `hbp` and
  `hbp-relay`.
- **`shadowcat`** (name taken). A rename, or claiming an `asolaria-*` name, for the aether
  `shadowcat/Cargo.toml` would unblock `shadowcat`, then `asolaria-observed`, then `asolaria`.
- **The 13 names on more than one manifest.**
  - 4 have an aether copy that is the only one that packages: the cosign-ledger, cosign-serve,
    council-serve and vote-quorum names above.
  - `asolaria-server-fischer-eval` has 3 copies, and `asolaria-verdict`, `asolaria-observed` and
    `asolaria` build against `gate/fischer-eval`, whose `src/` differs from the `host8/vendor` copy.
  - `dbbh-coms-quant-prism` and `qprism-3d-slice-harness` matter for `asolaria-quant-exact`.
  - 5 names have no aether-written copy and no aether dependent: `asolaria-host8-serve`,
    `asolaria-kernel-boot`, `asolaria-server-agent-runtime`, `asolaria-server-gnn-oracle` and
    `path2-two-shadow-recovery`.
  - `shadowcat` also has a pinned ACER copy.
- **Upload.** Ask before any `cargo publish` without `--dry-run`.
