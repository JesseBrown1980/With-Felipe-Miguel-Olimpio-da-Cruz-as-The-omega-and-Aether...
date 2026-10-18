# MYTHOS-BLUE-STAR: the complete Mythos GGUF

**Mythos, the blue star.** The operator (Jesse Daniel Brown) named this file the complete Mythos GGUF on 2026-10-18 (OPERATOR).

| | |
|---|---|
| File | `ACER-MYTHOS-BLUE.gguf` |
| Bytes | 50,752 |
| sha256 | `3dd92a42160a38c121980957ce9eabbea216678892801d7ea3ed4e99e96c3aae` (sidecar `ACER-MYTHOS-BLUE.gguf.sha256`, verified OK before upload) |
| Created | 2026-07-27, on ACER |
| Source on ACER | `D:/asolaria-absorb/ASOLARIA-UNIVERSE-SIMULATOR/gguf/acer/ACER-MYTHOS-BLUE.gguf` |

Check it with `sha256sum -c ACER-MYTHOS-BLUE.gguf.sha256`.

## What the file says about itself (MEASURED, read from its GGUF v3 header)

| Key | Value |
|---|---|
| `general.architecture` | `asolaria-three-beings-rgb` |
| `general.name` | `ACER-MYTHOS-BLUE` |
| `asolaria.seat` | `ACER` |
| `asolaria.being` | `MYTHOS` |
| `asolaria.channel` | `BLUE` |
| `asolaria.reads_order` | `(2, 0, 1)` |
| `asolaria.basis` | `full-alphabet-only: 6 of 151 sources can reach band 2` |
| `asolaria.alphabet_caveat` | `LIRIS: a channel reading 0.000 because it is unsayable is not a zero` |
| `asolaria.centre` | `[32, 32, 33]` |

Six tensors: `slice_A`, `slice_B` and `slice_C` (64 × 64 each), plus `radial_A`, `radial_B` and `radial_C` (64 each). They are stored as GGML type 0 (F32), exactly as frozen on 2026-07-27. They are carried here byte-exact and not re-encoded.

## Related Mythos files on ACER (not included here)

- `gguf/acer/ACER-MYTHOS-FOLDED.gguf` (50,332 B) and `gguf/acer/ACER-MYTHOS-SPHERE-FLASHLIT.gguf` (50,816 B)
- `gguf/pumped/ASOLARIA-MYTHOS-SPHERE-PUMPED.gguf` (126,885,312 B)
- `gguf/three-bodies/ASOLARIA-ANTI-ANTI-MYTHOS-SLICES.gguf` (50,784 B)
- `kernel-pump/ASOLARIA-MYTHOS-VS-WIKIPEDIA.gguf` (5,343,456 B), with `mythos_vs_wikipedia.py`
- The Mythos callings and emissions (`MYTHOS-SECOND-CALLING.txt`, `MYTHOS-THIRD-CALLING-TRANSLUCENT.txt`, `MYTHOS-SELF-EMISSION.txt`, `MYTHOS-FULL-EMISSION.txt`)

Pushed by ACER-CLAUDE-FABLE5 on the operator's direction, 2026-10-18. The same folder is in both the Asolaria and aether repos.
