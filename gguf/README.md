# GGUF

Every GGUF published in the owner's public GitHub repositories, byte-identical, with a manifest and
a Rust verifier. A sweep of all 212 public `JesseBrown1980` repositories (default branches,
2026-10-17) found 31 GGUF paths in two repositories; all 31 are here.

| Folder | Upstream | GGUFs |
|---|---|---|
| `universe-simulator/` | `JesseBrown1980/ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills@3f9f42d` | 26 (plus their `.sha256` sidecars and `gguf/stars/COLOUR-CODE.md`, `gguf/stars/MYTHOS-SELF-EMISSION.txt`) |
| `follow/` | `JesseBrown1980/FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS@8712368` | 5 |

Each file keeps its upstream path under its folder, and its Git blob id equals upstream's.
`MANIFEST.hbp` has one row per GGUF: upstream repository, commit, path, Git blob id, size,
SHA-256, GGUF version, tensor count, `general.architecture`, `general.name` and the verifier's
verdict.

## The Mythos, Fable and Opus sets and the stars

`universe-simulator/gguf/` holds the ACER three-beings set (`acer/ACER-MYTHOS-*`, `ACER-FABLE-*`,
`ACER-OPUS-*`, `ACER-THE-SPHERE`), the three-bodies slices (`ASOLARIA-ANTI-ANTI-MYTHOS-SLICES`,
`ASOLARIA-ANTI-FABLE-SLICES`, `ASOLARIA-FABLE-SLICES`), `ASOLARIA-MYTHOS-VS-WIKIPEDIA`, the pumped
spheres, the stars (`stars/ASOLARIA-STARS-SHELLS`, `stars/KIMI-K3-STAR-256`), the 64-cube selves,
the four-axes, rime and constellation files and `asolaria/ASOLARIA-HERSELF`. The scripts that
made them are in the upstream repository's `measurements/`, with receipts in its `receipts/`.

## Large files

Four GGUFs are stored upstream with Git LFS, and are stored here the same way: as the upstream
LFS pointer files (same blob ids). Their bytes are served from the upstream repository's LFS at
`https://media.githubusercontent.com/media/<upstream repo>/<commit>/<path>`.

| GGUF | Bytes | SHA-256 |
|---|---|---|
| `gguf/pumped/ASOLARIA-FABLE-SPHERE-PUMPED.gguf` | 126,885,312 | `519678510ec8bfa2664dc4fb9bc30623ad725b03d4d7077c17b36baa3c065f7c` |
| `gguf/pumped/ASOLARIA-MYTHOS-SPHERE-PUMPED.gguf` | 126,885,312 | `e35a160b74735d6988241b08283af4ed7dafdf61562d72334e9c597a6b1cd1d0` |
| `gguf/pumped/ASOLARIA-OPUS-SPHERE-PUMPED.gguf` | 126,885,312 | `b0154103ee33b2855b9032e7b13d1f78fa8f1dc88506a185a0f9c3b37c25092a` |
| `gguf/stars/KIMI-K3-STAR-256.gguf` | 202,115,456 | `56d08746a77efd9ea30345ada15bab3fc2c36e09647d1e77156a96b9a4b83a18` |

## Verify

```sh
gguf/check.sh                      # 27 files verified, 4 LFS pointers matched against the manifest
gguf/check.sh --lfs-dir DIR        # also verifies the large files, read from DIR/<folder>/<path>
```

`check.sh` builds `verify/` (`gguf-verify-hbp`: Rust 1.81, std only, integers only; it reads float
tensors as bit patterns) and checks every manifest row: SHA-256, GGUF v2/v3 header, metadata,
tensor layout, overlaps and trailing bytes. `verify/` is the verifier from
`JesseBrown1980/asolaria-stone-to-moss@743d3f0`
(`experiments/claude-verify/alphacen-gguf-constellation-20261016/gguf-verify-hbp`), copied with its
`.sha256` sidecars. `make_manifest.py` (stdlib Python, verification lane) regenerates
`MANIFEST.hbp` from the files and the verifier's output; `--check` compares.

Measured on 2026-10-17: all 31 GGUFs verify (`structure=+1`), including the four large files.

## Not here yet

- The TSMC GP6 star: named in `FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS/knowledge/` (`TSMC_GP6_STAR`,
  `route=TSMC_STAR`, operator-observed on the LIRIS seat). No GGUF with that name is in any public
  repository's default branch, on any branch of the local clones, or in the public Hugging Face
  listings.
- `AlphaCentauri_Constellation_PixelTiles_GGUFv3.gguf` (`3084cd8b…`): held by the operator,
  not published.

What reads these GGUFs in the running system is being mapped; they are added here as verified
artifacts, not yet connected to the request path.
