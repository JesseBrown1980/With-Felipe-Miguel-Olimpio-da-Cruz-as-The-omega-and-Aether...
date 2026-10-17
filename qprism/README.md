# Q-PRISM stack

Q-PRISM is a **family** of connected implementations, not one kernel. This tree
carries the pieces that are clean, verified, and build/run on Rust 1.81.0 (and
stdlib Python/Node for the time layer). Every file here was copied from an
owner repository only after it scanned free of third-party private data, and the
math of each layer was checked against the one rule the whole fabric obeys:

> No layer here manufactures information. Content addressing returns bytes that
> were **retained**; CRT reconstruction needs **jointly-sufficient** shadows
> (which are *larger* than the original — CRT expands, it never compresses); a
> SHA-256 is an **integrity coordinate**, never a source. A hash cannot
> regenerate discarded bytes, and nothing in this stack pretends it can.

## Crates in this tree

| Layer | Crate | Directory | What it is | Verified |
|---|---|---|---|---|
| 2 — representation | `asolaria-qprism-representation` | [`representation/`](representation/) | 2D → 3D orb (`exact_orb`) → signed-2D projection color-leaf renderer; checked-`i128` stereographic transform with an inverse cross-check (`recovered_u == u`), own SHA-256, static no-script SVG. | 12 tests |
| 3 — recovery, Paths 1–3 | `asolaria-qprism-recovery` | [`recovery/omega/`](recovery/omega/) | **Path 1**: greedy LZ over a *retained* 4096-byte output window. **Path 2**: checked **CRT** over coprime moduli per floor (6b 7×11, 8b 17×19, 10b 31×37, 12b 61×71 — each product exceeds the floor), rebuilding a symbol from **two** residues. **Path 3**: causal integer arithmetic coder over the operator catalog. | 35 tests |
| 3 — operator catalog | `asolaria-omega-operator-catalog` | [`recovery/catalog/`](recovery/catalog/) | The 40 length-preserving byte permutations Path 3 mixes over, each with an exact computed inverse. | 18 tests |
| 3 — combined throat | `asolaria-qprism-throat` | [`recovery/throat/`](recovery/throat/) | Selects Path 1 vs Path 2 from the evidence actually held, cross-validates both when present, and returns bytes **only** on a passed post-recovery SHA check; every other outcome is `Held(reason)`, never a fabricated byte. | 9 tests |

All four are integer-only, zero-dependency apart from the throat's dependency on
the recovery crate, `#![forbid(unsafe_code)]` where the source declares it, and
gated in CI on Rust 1.81. The time-evolution layer lives in [`../time/`](../time/)
and the vendored control + watcher layer in [`../eval/`](../eval/).

## Provenance

Every upstream source file is **byte-identical** to its owner repository, and
each crate pins those files' sha256 in `UPSTREAM.sha256` (checked in CI):

- `representation/rust-qprism-181/**` and `representation/PUBLIC-OWNER-2D.hbp` —
  `JesseBrown1980/FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS@8712368`,
  `matrix/rust-qprism-181/` + `matrix/PUBLIC-OWNER-2D.hbp`. The upstream
  `Cargo.toml` / `Cargo.lock` are kept, unchanged, as `UPSTREAM-Cargo.toml` /
  `UPSTREAM-Cargo.lock`.
- `recovery/omega/omega-path123-v0/omega_path123.rs` and
  `recovery/omega/omega-operator-catalog-v0/omega_operator_catalog.rs` —
  `JesseBrown1980/asolaria-omega-omnibit-tournament@dad4647`, `reference/`.
- `recovery/catalog/omega_operator_catalog.rs` — the same file again, so the
  catalog can be published on its own; CI asserts the two copies are identical.

The `Cargo.toml` manifests are new publishing manifests. Each package root sits
where the unchanged source expects its neighbours: the representation tests'
`include_bytes!("../../PUBLIC-OWNER-2D.hbp")` and the recovery source's
`#[path = "../omega-operator-catalog-v0/…"]` both resolve inside their package.
The library import names are unchanged (`rust_qprism_181`, `omega_path123`,
`omega_operator_catalog`).

The owner repositories' runtime capture files and operating contracts carry
third-party names and so were **not** copied. The throat is new, written for
this stack.

## Build

Each crate pins `rust-toolchain.toml` to `1.81.0`. From any crate directory:

```sh
cargo test --locked
cargo clippy --locked --all-targets -- -D warnings
```

The recovery crate keeps three upstream pedantic style lints rather than
editing verified source; CI allows exactly those three
(`unusual_byte_groupings`, `derivable_impls`, `needless_range_loop`), and only
the first for the catalog, and denies everything else.
