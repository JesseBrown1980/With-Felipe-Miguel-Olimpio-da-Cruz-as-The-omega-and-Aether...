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

## Layers in this tree

| Layer | Directory | What it is | Verified |
|---|---|---|---|
| 2 — representation | [`rust-qprism-181/`](rust-qprism-181/) | 2D → 3D orb (`exact_orb`) → signed-2D projection color-leaf renderer; checked-`i128` stereographic transform with an inverse cross-check (`recovered_u == u`), own SHA-256, static no-script SVG. `#![forbid(unsafe_code)]`, zero-dep, integer-only. | `clippy -D warnings` clean, 12 tests |
| 3 — recovery, Path 1 | [`recovery/omega-path123-v0/`](recovery/omega-path123-v0/) | Greedy LZ over a **retained** 4096-byte output window — recovers bytes it genuinely kept, with strict bounds checks. | 35 tests (shared file) |
| 3 — recovery, Path 2 | [`recovery/omega-path123-v0/`](recovery/omega-path123-v0/) | Checked **CRT** over coprime moduli per floor (6b 7×11, 8b 17×19, 10b 31×37, 12b 61×71 — each product strictly exceeds the floor), reconstructing a symbol from **two** residues. | exhaustive roundtrip + adversarial rejection |
| 3 — combined throat | [`recovery/throat/`](recovery/throat/) | The coordinator that **selects** Path 1 vs Path 2 from the evidence actually held, cross-validates both when present, and returns recovered bytes **only** on a passed post-recovery SHA check. Every other outcome is `HELD{reason}` — consent withheld, insufficient evidence, decode failure, cross-path disagreement, or integrity mismatch — never a fabricated byte. Bound to the real `decode_path1`/`decode_path2_crt`. | `clippy -D warnings` clean, 9 tests |

The time-evolution layer lives one level up in [`../time/`](../time/) (a
deterministic GF(2) fast-forward with a Python↔Node byte-identity cross-check),
and the staged neural eval/watcher layer in [`../eval/`](../eval/).

## Provenance

The sources are copied **byte-identical** from their owner repositories (verify
with `cmp`), so the HBI/HBP/SHA identities are preserved:

- `rust-qprism-181/` and the embedded `PUBLIC-OWNER-2D.hbp` test fixture —
  `JesseBrown1980/FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS@8712368`,
  `matrix/rust-qprism-181/` + `matrix/PUBLIC-OWNER-2D.hbp`.
- `recovery/omega-path123-v0/omega_path123.rs` and
  `recovery/omega-operator-catalog-v0/omega_operator_catalog.rs` —
  `JesseBrown1980/asolaria-omega-omnibit-tournament@dad4647`, `reference/`.

The owner repositories' runtime capture files and operating contracts carry
third-party names and so were **not** copied; only the clean crate sources and
the clean embedded test fixture came across. The `throat/` coordinator is new,
written for this stack.

## Build

Each crate pins `rust-toolchain.toml` to `1.81.0`. From any crate directory:

```sh
cargo test
cargo clippy --all-targets -- -D warnings
```

The recovery crate preserves three upstream pedantic style lints verbatim rather
than editing verified source; the CI gate allows exactly those three
(`unusual_byte_groupings`, `derivable_impls`, `needless_range_loop`) and denies
everything else.
