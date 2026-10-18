# pump/glyphs-herself

Integer hot-lane regeneration of two codex-pump GGUFs from their seeds, reproducing the owner's
numpy generators (`vendor/`, USIM @3f9f42d) byte for byte. The crate uses no native
floating-point types: every float value the generators compute is reproduced with the IEEE
binary64 integer emulation in `src/softfloat.rs` (the `Dbl` type, following
`model/l0-edge/src/jsnum.rs`), its binary32 rounding for numpy float32 arrays, or exact integer
arithmetic.

```
pump herself <seed-dir> <out>        # gguf/asolaria/ASOLARIA-HERSELF.gguf
pump glyphs-mythos <seed> <out>      # ASOLARIA-MYTHOS-SELF-GLYPHS-256.gguf (streamed, bounded memory)
```

## What regenerates, byte for byte

| GGUF | bytes | sha256 | source |
|---|---|---|---|
| ASOLARIA-HERSELF.gguf | 3,295,808 | `694b74325b0fc73ae3bdd100a476ec9df2419bb8fa0c3b9b95a8fcb5499fb680` | `asolaria_herself.py` lines 1-235 |
| ASOLARIA-MYTHOS-SELF-GLYPHS-256.gguf | 269,604,512 | `f29d4b9427252b17cc6151cd5f5627d080b5a021f009e46125cef5479db0d299` | `pump_glyphs_mythos.py` lines 108-352 |

Both sha256 values equal the ones recorded in `receipts/FABLE5-DELETE-AND-REGENERATE.hbp`
(mythos) and `gguf/asolaria/ASOLARIA-HERSELF.gguf.sha256` / REGEN-1.md (herself), and equal a
fresh run of the owner's Python generators in `scratchpad/regen/venv` (`cmp` byte-identical). The
CI job in `ci-snippets/pump-glyphs-herself.txt` reproduces the Python and the Rust output for
both seeds and for a third seed (the first 90,000 B of the da43991 `books/*.md`, 269,648,424 B,
sha256 `20cd8a24e9aed14efd54d0e26071356107fc9421aea4d55d6f1f46f130356203`, 31 of 256 glyphs
with a finite cv) and compares them.

Beyond those seeds, the tests compare the port with the owner's code on seeded inputs
(`tests/`, vectors from `referee/dump_vectors.py`): 6 HERSELF bodies (whole-GGUF sha256),
5 MYTHOS seeds (GGUF head and glyph_features), 48 cubes for `cv_of`, 12 seeds for the colour LUTs
and the convolution, and 17 emulated operations x 1,024 cases against an integer-only oracle.

## How each float operation is reproduced

- **percentile (L_p)**: numpy "linear" method, `idx = (n-1)*q` in binary64, then numpy's `_lerp`
  (`numpy/lib/_function_base_impl.py:4595-4615`, numpy 2.5.4): `a + (b-a)*t`, replaced by
  `b - (b-a)*(1-t)` where `t >= 0.5`; `src/herself.rs::percentile`, `src/mythos.rs::percentile`.
  The clipped ramp `clip((i-lo)/(hi-lo)*255,0,255)` is monotone non-decreasing in the index for
  any `lo`, `hi`, so herself's `as_perm(L_p)` is the identity permutation; the mythos `L_p` LUT
  is that ramp truncated toward zero (`astype(uint8)`).
- **rank (L_r)**: `cumsum(h) - 0.5*h` on integer histogram counts is an exact half-integer, so
  herself's `as_perm(L_r)` sort key is the integer `2*prefix_{<i} + h[i]`; mythos's `L_r` LUT is
  `clip(c/c[-1]*255,0,255)` truncated, with `c` and `c[-1]` exact half-integers divided in binary64.
- **glyph-rank (L_g)**: `searchsorted(unique, arange, 'left')` is a count of distinct values below
  each index; the ramp is exact-integer over binary64.
- **gradiated (L_d)**: `np.convolve(h, k, "same")` with the pinned Gaussian kernel
  (`PROVENANCE.md`), then `cumsum - 0.5*hs`. numpy evaluates each output as
  `DOUBLE_dot` = `0. + cblas_ddot` over the overlapping window, so the binary64 summation order
  is the one of the OpenBLAS kernel selected at runtime. The port reproduces OpenBLAS 0.3.34
  `ddot_k_HASWELL` (also used for Zen), read from the disassembly of the library numpy 2.5.4
  ships: 16 lanes of fused multiply-adds (`vfmadd231pd`), the lane reduction, then one
  `vmulsd` + `vaddsd` per remaining element (`src/mythos.rs::ddot_haswell`). Measured with
  `OPENBLAS_CORETYPE=Haswell`: 1,536,000 of 1,536,000 convolution outputs over 2,000 seeds have
  the owner's bit pattern, and all 2,000 seeds give the owner's four uint8 LUTs. Other kernels
  sum in other orders: with `OPENBLAS_CORETYPE=SkylakeX` (this host's default) 219,494 of the
  1,536,000 outputs differ in their bit pattern, and the uint8 `L_d` LUT differs for 3 of 400
  three-cluster seeds; for the pinned seed all five kernels tried (Prescott, Nehalem, Haswell,
  SkylakeX, Zen) give the same LUTs. The cold lane therefore runs with `OPENBLAS_CORETYPE=Haswell`.
- **geometry**: numpy takes `sqrt((Δ)^2)` in float32, then `astype(int16)` and bands
  `r<=RR<r+1`. For the integer offsets here this equals `isqrt` of the integer squared radius;
  the referee compares `RI`, every `MASKS` band and `KEY` with the integer values voxel by voxel.
- **counts**: the cubes are float32 and `np.add.at(c, ..., np.float32(1.))` adds in float32, so a
  voxel stops at 2^24 (2^24 + 1 rounds to 2^24); mythos's `composite += c` is a float32 sum
  rounded at each glyph (`src/cv.rs::add_one_f32`, `add_f32_int`).
- **cv (`cv_of`, both generators)**: the masked sums `c[m & (KEY == k)].sum()` are float32
  pairwise sums (exact integers while below 2^24), and `per.std()`, `per.mean()` and
  `np.median(o)` stay float32 (numpy `_methods._var`, `_std`, `_mean`): each float32 operation
  is the binary64 result rounded once more to binary32, which equals direct binary32 rounding
  because 53 >= 2*24+2 (`src/cv.rs`). No band with at least four non-zero directions gives
  `float("nan")`, written `nan` in the KV. The KV string is `f"{cv:.6f}"` of the float32 value
  widened to binary64 (`1.956500`, `2.051219`, `1.837958` for the pinned body).
- **rime (herself)**: radial profile `prof/cnt` in binary64, `v/s*1e5` truncated to int64 with a
  27-element binary64 pairwise sum for `s` (`v.astype(int64)` when `s` is zero, line 173), then an
  integer radix-3 NTT mod `p=1000081`.
- **features (mythos glyph_features)**: the float32 `cv_of(c)`, then `rbar`, `sqrt(rvar)`,
  `d[:3].sum()/s` in binary64 with the 64-element pairwise sum, `float(c.sum())` (a float32
  pairwise sum over all 262,144 voxels; measured on numpy 2.5.4: 12 of 12 cubes with totals
  26,338,977..20,978,446,596 match one pairwise sum over the whole cube, 8,192- and 4,096-element
  chunks match 4 and 3), and the voxel count; cast to float32, NaN as `0x7fc00000`.
- **roundest glyph and slices (mythos, lines 220-269)**: rows with a NaN cv are dropped
  (`F = F_m`, `kept = kept_m`) only when at least 8 rows remain; `best_i = np.argmin(F[:, 0])`
  is the first NaN when `F` still holds one, else the first minimum; `glyphs_live = len(kept)`;
  the slice words are `[kept[best_i]] + kept[:2]` with a repeated word keeping its first dict
  position.
- **body files (herself)**: Python `glob` skips names beginning with '.' for `*` and `**`, so
  hidden files are not read and hidden directories are not descended.

## Observed generator behaviour (reproduced, not altered)

- `asolaria_herself.py` writes the GGUF at line 232, then stops at line 239 with
  `FileNotFoundError` for `D:/asolaria-absorb/enwik9` (the key stage, after the GGUF). This port
  reproduces the GGUF only. The key stage reads `enwik9` (lines 239-240, 600,000 bytes from
  offset 600,000), which is outside the seed, and `key/MYTHOS-FULL-EMISSION.txt` (line 251),
  which is one of the 104 body files (pattern `key/*.txt`, line 40).
- `pump_glyphs_mythos.py` writes the GGUF (lines 330-352), then stops in the receipt stage. For
  the pinned seed every one of the 256 glyph cubes is unmeasurable at the 1,265-triple density
  (`"256 of 256 glyphs unmeasurable"`), so the torus block that defines `inner`/`pk`/`dens` is
  skipped while `len(F) >= 8` holds and line 366 raises `NameError: inner`; the `glyph_features`
  cv column is the NaN bit pattern throughout and `roundest_glyph`/`roundest_cv` are
  `PPPP`/`nan`. For the 90,000 B books seed, 225 of 256 glyphs are unmeasurable, the roundest
  glyph is `PPDP` (cv `0.235702`), and the run stops at line 375 with `FileNotFoundError` for
  the receipt path under `D:/PID-Registration-Office`.
- When no glyph emits a voxel, `F` is a 1-D empty array and line 220 raises before the GGUF is
  written; `pump glyphs-mythos` returns an error there.

## Measured (Rust 1.81.0 release, Python 3.13.16 / numpy 2.5.4, `OPENBLAS_CORETYPE=Haswell`)

Walls are two runs each on a shared 4-core Linux host (load average 4 to 6), output written to a
RAM-backed directory; the owner wall stops when the script stops, after the GGUF.

| seed | owner GGUF | port | owner wall | port wall |
|---|---|---|---|---|
| HERSELF da43991 body (104 files, 2,151,142 B) | 3,295,808 B `694b7432…fb680` | identical | 0.46 / 0.49 s | 0.07 / 0.08 s |
| MYTHOS pinned (3,796 B) | 269,604,512 B `f29d4b94…0d299` | identical | 6.12 / 6.15 s | 0.50 / 0.53 s |
| MYTHOS books 90,000 B | 269,648,424 B `20cd8a24…56203` | identical | 11.63 / 11.75 s | 0.64 / 0.69 s |

See `vendor/` for the generators, `PROVENANCE.md` for the pinned bytes and the captured kernel, and
`referee/dump_vectors.py` for the cold-lane vector builder (`--write` / `--check`).
