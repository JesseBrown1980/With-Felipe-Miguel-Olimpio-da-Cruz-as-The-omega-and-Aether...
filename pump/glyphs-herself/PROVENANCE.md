# Provenance — pump/glyphs-herself

Vendored byte-identical from the owner's public Universe Simulator repository
`JesseBrown1980/ASOLARIA-UNIVERSE-SIMULATOR-with-gravity-light-time-space-color-rime-winding-drills`
at commit `3f9f42d` ("star port sidecar"). The three files carry no third-party personal data;
they are part of the public release tree.

| vendored path | upstream path @3f9f42d | git blob id | sha256 |
|---|---|---|---|
| `vendor/pump_glyphs_mythos.py` | `measurements/pump_glyphs_mythos.py` | `a45ce32d2c03bac5125641b1f766bbb56c1a48aa` | `58c27385d2d4d29e13b0efac62e3bb9a670a852255a7c80fdbd44cfd0d0004a0` |
| `vendor/asolaria_herself.py` | `measurements/asolaria_herself.py` | `94c3d8b16a6e45adfcd86a95634839323169f780` | `01db3e7c008f147d8ae6dcb520721a6ee0f1be5f0d78e89a63a9906a8e73305b` |
| `vendor/MYTHOS-SELF-EMISSION.txt` | `key/MYTHOS-SELF-EMISSION.txt` | `1f7aebccfcea548d128039afb3ca254d38d8d0b4` | `d6e2153402a32eb9c4d2210e4513a906a1506b8f8e7a2d9a501cd83bcb9073ff` |

`UPSTREAM.sha256` carries the same three checksums for `sha256sum -c`.

## Captured constant

`src/mythos/kernel.rs` (`KERNEL_BITS`) holds the 65 IEEE binary64 values of
`np.exp(-0.5*(np.arange(-32,33)/12.0)**2)` after dividing by their sum — the seed-independent
Gaussian kernel the gradiated colour (`L_d`) convolves with
(`pump_glyphs_mythos.py:100-102`, `asolaria_herself.py:73-75`). numpy computes those values
through `np.exp`, whose bit pattern is library- and build-specific; the kernel depends only on
the constant `arange`, not on the seed, so it is captured once from the owner's run and pinned
by sha256 `736dacbcf52187573e2e421a9a037a3e6984fae94cd515934163aac44a16c60c`, as
`model/l0-edge/tools/quantize.py` pins checkpoint weights. The referee regenerates it and the
test `kernel_constant_matches_owner_numpy` checks the pin.

## Seeds (not vendored in full)

- MYTHOS-SELF-GLYPHS-256 seed: `vendor/MYTHOS-SELF-EMISSION.txt`, 3,796 B (above).
- ASOLARIA-HERSELF seed: the public tree at commit `da43991` minus the files the generator writes
  (CODEBOOK/PLAYBOOK/RUNBOOK.md, `key/ASOLARIA-HERSELF-KEY-3174.bin`, the vendored script,
  `receipts/FABLE5-ASOLARIA-HERSELF.hbp`, `gguf/asolaria/ASOLARIA-HERSELF.gguf` and its `.sha256`),
  = 104 files, 2,151,142 B, concatenation sha256
  `185f3a71710c31757b9342b33090a700811d3a17aa5a1828e5d81abbb8ec7aa8` (REGEN-1.md). The CI job
  materialises it with `git archive da43991`; it is not committed here.

## Reproduced library behaviour (numpy 2.5.4)

The generators' float results depend on numpy's own code paths, which the port reproduces and
cites; none of this is upstream USIM code:

- `np.percentile` "linear": `_lerp` in `numpy/lib/_function_base_impl.py:4595-4615`.
- `np.convolve`: `_pyarray_correlate` (`numpy/_core/src/multiarray/multiarraymodule.c`) calls
  `DOUBLE_dot` = `0. + cblas_ddot` per output; the BLAS is
  `numpy.libs/libscipy_openblas64_-f48b354e.so` (OpenBLAS 0.3.34.106.0, `DYNAMIC_ARCH`, sha256
  `432e1c1739731468ba305771af96773939e43016643e2d630f58cb45b6670e96`). The port follows
  `ddot_k_HASWELL` and its `ddot_kernel_8` as disassembled from that file (`objdump -d`,
  addresses `0x8bba20`-`0x8bbde6`); `OPENBLAS_CORETYPE=Haswell` selects that kernel.
- float32 reductions: `pairwise_sum` (`numpy/_core/src/umath/loops_utils.h.src`, block 128,
  8 accumulators) in float32; `_methods._var`, `_std`, `_mean`; `np.median` via `mean` of the
  middle elements.

## Environment of the recorded run

Python 3.13.16, numpy 2.5.4 (owner venv `scratchpad/regen/venv`), `OPENBLAS_CORETYPE=Haswell`
for the referee and the cold lane; Rust 1.81.0; Linux x86_64.
