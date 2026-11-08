# Publish readiness, 2026-11-08 (plan items A6 and A7)

Every claim below is MEASURED unless it carries another tag. The receipts that prove them are
[`HOMES-2026-11-08.hbp`](HOMES-2026-11-08.hbp) and
[`CRATES-PACKAGE-LIST-2026-11-08.hbp`](CRATES-PACKAGE-LIST-2026-11-08.hbp). The expectations
were frozen in commit `43a5402`, before any measurement, and were not edited afterwards.

Nothing was published, pushed, tagged or uploaded. The network commands were read-only:
`git ls-remote`, a commit-and-tree fetch into a scratch bare repository, `cargo search`, and
`cargo publish --dry-run`. A dry run stops before the upload.

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
| E4: no `asolaria` or `asolaria-*` name is taken | held | Of the 102 names searched, only `hbp` (0.3.0) and `shadowcat` (0.0.0) are taken. Both are unprefixed and belong to other crates. |
| E5: every leaf crate passes `cargo publish --dry-run --locked` | **MISS** | 54 leaf crates: 44 PASS, 10 FAIL |
| E6: exactly 3 publishable crates depend on `asolaria-ternary` | held | `agents/levels`, `pump/glyphs-herself`, `quants/head8` |
| E7: the plan's B2 first wave (8 crates) has no manifest blocker | held, with a caveat | 7 pass the dry run as leaf crates. `asolaria-qprism-throat` has one versioned path dependency and no blocker. Caveat: 2 vendored copies carry the name `asolaria-server-fischer-eval` too, so only one of the 3 can be published. |

### Content gate

The 23 FLAGs are all third-party binaries that `cargo package` would ship:

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
- `asolaria-matrix-in-colour` is 30.2 MiB raw, but its package is 770.3 KiB compressed, under
  crates.io's 10 MiB limit.

### Dry runs (leaf crates only, 54)

The 10 failures:

- **6 fail at the manifest**, with the same errors as `--list`: 3 copies under `beginning/09`,
  `hookwall-session-start`, and 2 under `ledger/cosign-council/vendor/`.
- **3 fail because a dependency needs edition 2024**: `asolaria-hookwall`, aether's
  `asolaria-server-cosign-ledger`, and the vendored `asolaria-kernel-core`.
  - Cargo 1.81 does not put a `Cargo.lock` in a library-only package, so the verify build
    resolves its registry dependencies afresh. It picked `zeroize 1.9.1`, which declares
    `edition = "2024"` and `rust-version = "1.85"`.
  - The repo's own locks pin `zeroize 1.8.2`. The local index cache says 1.8.2 is the newest
    `zeroize` with `rust-version` 1.81 or lower.
  - A 1.81 user who adds one of these crates, in a project with no older `zeroize` already
    locked, would likely resolve the same version (UNVERIFIED: inferred from the dry run).
- **1 fails to build**: `asolaria-gate-fischer-upstream` (E0432). Its library and binary sources
  live under `vendor/federation-1024/servers/fischer-eval/`, which holds its own `Cargo.toml`.
  Cargo leaves such a directory out of the package, so the library is dropped and the
  `upstream-fixture` binary no longer compiles.

Cargo 1.81's dry run only warns about a missing `description` or `license`, and crates.io rejects
both on upload. The receipt therefore counts them as blockers even where the dry run passed. That
applies to `new-rime-fixed27-wave` and to the excluded ACER `shadowcat`.

Not dry-run, as the task requires: the 30 crates with path dependencies, and 2 whose workspace
root is not vendored. A verify build for those 30 can only resolve once their dependencies are on
crates.io.

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

All of these are copies of the owner's upstream repositories. Publishing them is a decision for
those repositories, not for aether.

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
  which cargo strips on publish.
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
   likely fix (UNVERIFIED: not tried here). Vendored manifests stay untouched. The bound would
   also clear the cause these crates inherit:
   - `asolaria-verdict`, for which it is the only blocker;
   - `asolaria-server-cosign-serve`, for which it is also the only blocker;
   - `asolaria` and `asolaria-observed`, which stay blocked by other dependencies.
3. **Model weights in crates.** The L0, L1, L2 and L4 crates would ship vendored `.pt` weights.
   An `exclude` in those aether manifests would remove them from the package, unless their tests
   need the bytes (UNVERIFIED). 11 more crates are blocked through `asolaria-l0-edge`, directly
   or through a chain of blocked dependencies (its BLOCKROOT row). For 7 of them it is the only
   cause. The other 4 are `asolaria`, `asolaria-observed`, `asolaria-levels-agents` and
   `asolaria-quant-head8`.
4. **Names.** `hbp` and `shadowcat` are taken on crates.io (plan B2: rename, or claim
   `asolaria-*`). Inside the repo, 13 names are carried by more than one of the 86 manifests, so
   only one copy of each can be published.
5. **`asolaria-ternary`.** It still blocks exactly the 3 crates the plan named (B2). Publishing
   it alone would leave only `pump-glyphs-herself` with no recorded blocker (the UNBLOCKIF row):
   - `asolaria-levels-agents` stays blocked via `asolaria-hrm-mtp`, which is blocked via
     `asolaria-l0-edge`;
   - `asolaria-quant-head8` stays blocked via its versioned dev-dependency on `asolaria-l0-edge`.

   `asolaria-ternary` is `publish = false`, so its own package was not listed or dry-run. Whether
   it would package cleanly is UNVERIFIED.
6. **`asolaria-gate-fischer-upstream`** cannot be packaged as it stands, because cargo leaves out
   its vendored sources.
7. **Corrections to the plan.**
   - A7's "55 publishable crates": 86 are not `publish = false`, and 40 have no blocker found
     (20 aether-written, 5 pinned, 15 vendored).
   - B2's "the path dependencies are not the blockers" holds for the aether-written crates.
     Every normal path dependency of an aether-written crate has a version; the only versionless
     ones are two `shadowcat` dev-dependencies, which cargo strips on publish. It does not hold
     for the vendored copies: 7 have a versionless path dependency, and 12 fail to list because
     a workspace root, a workspace member or a library source was not vendored.
