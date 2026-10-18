# asolaria-qprism-representation-bins

The two Q-PRISM representation binaries and a referee that regenerates their stored
object sets from the 3D-tree seeds and compares every emitted file byte-for-byte.

- `folder-calming-oils` reads a folder 3D-tree seed and calls
  `rust_qprism_181::folders::run_folders` (`folders.rs:1798`).
- `outward-truth-waves` reads an owner 3D-tree seed and calls
  `rust_qprism_181::outward::run_outward` (`outward.rs:1471`).

Each binary takes exactly `<input> <output_dir> --replace`. The output directory
must already exist. Each run writes four primaries into it —
`.hbp`, `.hbi`, `.svg`, `.gguf` — each with a `.sha256` sidecar (eight files), and
prints a single pipe-delimited `PASS=1` line carrying the four SHA-256 values.

The library is the sibling crate `asolaria-qprism-representation` (lib name
`rust_qprism_181`), depended on by path and renamed back to its library name in
`Cargo.toml` so the vendored binaries' `use rust_qprism_181::…` paths resolve
unchanged.

## Layout

```
src/bin/           the two binaries, byte-identical to upstream (see PROVENANCE.md)
seeds/             the folder seed and the outward seed, each with its .sha256/.hbi
                   sidecars (the outward seed is vendored on the owner's 2026-10-18
                   decision to publish it: PROVENANCE.md, Privacy)
expected/follow/matrix/   the stored object sets, used as byte references
tests/referee.rs   integer-only referee (self-contained SHA-256)
UPSTREAM.sha256    pins every vendored file; `sha256sum -c UPSTREAM.sha256`
```

## Referee

`tests/referee.rs` runs each binary on its seed into a fresh empty directory with
`--replace`, then:

- checks the report line: `PASS=1`, `json=0`, the count fields recorded in the
  stored HBI (`repositories=147`, `folders=3536`, `leaves=10608` for folder-calming-oils;
  `repositories=147`, `waves=1764` for outward-truth-waves) and the four `*_sha256` fields;
- checks the output directory holds exactly the eight expected files;
- for every emitted file (GGUF, HBP, HBI, SVG and the four sidecars), recomputes
  SHA-256 with its own integer implementation and checks it against the recorded value,
  compares the bytes against the vendored `expected/follow/matrix/` copy, and checks
  the emitted `.sha256` sidecar is `"<sha256>  <name>\n"` and byte-identical to the
  stored sidecar.

The two GGUFs are additionally compared byte-for-byte against the in-repo
`gguf/follow/matrix/` copies. Seed and output directories are canonicalized first,
because the library refuses symlinked path ancestors (`lib.rs:726-742`, `LINK_PATH`).
The output directory is removed after each case, including when an assertion fails.
All arithmetic in the referee is integer.

Both cases run from the vendored `seeds/`: the folder case reads
`PUBLIC-FOLDER-3D-TREE.hbp` and the outward case reads `PUBLIC-OWNER-3D-MEDIA-TREE.hbp`,
each with its `.hbp.sha256` sidecar.

## Build and test

```bash
cargo +1.81.0 test --release --locked    # folder and outward cases both run
```

## Seeds and outputs

| binary | seed | stored GGUF | GGUF sha256 |
|---|---|---|---|
| `folder-calming-oils` | `PUBLIC-FOLDER-3D-TREE.hbp` | `PUBLIC-FOLDER-CALMING-OILS.gguf` | `fa266f1b…facd2bcf` |
| `outward-truth-waves` | `PUBLIC-OWNER-3D-MEDIA-TREE.hbp` | `PUBLIC-OUTWARD-TRUTH-WAVES.gguf` | `b315be52…a809e9f6` |

The referee mirrors these upstream commands. Each is run in a
FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS checkout at `8712368`, and each writes the eight
files of its row, byte-identical (`cmp`) to upstream `matrix/`:

```bash
cargo +1.81.0 run --manifest-path matrix/rust-qprism-181/Cargo.toml --bin folder-calming-oils \
  --release --locked -- matrix/PUBLIC-FOLDER-3D-TREE.hbp <output_dir> --replace
cargo +1.81.0 run --manifest-path matrix/rust-qprism-181/Cargo.toml --bin outward-truth-waves \
  --release --locked -- matrix/PUBLIC-OWNER-3D-MEDIA-TREE.hbp <output_dir> --replace
```

License: MIT.
