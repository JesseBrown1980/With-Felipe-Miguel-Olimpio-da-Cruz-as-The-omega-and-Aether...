# Seat2 append-only correction — SHA256SUMS transport line endings

2026-10-15. Published **before** changing the first Seat2 rainbow-order code. Source run: [38745133218](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38745133218). Prereg unchanged, commit `c72cce50a71c0b7960b6ca3386830124bec25e4e`.

### Verified first result (do not erase)

Independent actual 11×5=55 RGB image-plane permutations passed on Ubuntu and Windows using ZXing-C++ (the publisher used pyzbar). Every modified image left the byte-exact **65,536-byte original file SHA** unchanged after Fischer-index reassembly. Every one of the 55 swaps failed a **separately pinned lane→index→raw-QR SHA** channel-origin binding. All 27 ordered ternary logical addresses were enumerated; raw Fourier intensity classes **10**, normalized **7 including undefined zero**, with **66 raw-intensity permutation-alias directed substitutions** and **104 normalized-signature collisions** among 702 distinct directed substitutions. Full first-run canonical JSON **2,244 bytes** SHA `1da6f5047965b17f651472058a6cff2c3cb1e5aeb953df174bbb1c6893c6a24c`; first-run 817-row **82,483-byte** HBP SHA `f68df2cb941e5bb3ec913a53ae87dad5ac47a6e493bb36549198f4339ac005cc`. These two scientific files were byte-identical between OS when ZIP artifacts were downloaded and compared in the working container.

**The only observed artifact-byte divergence:** SHA256SUMS.txt was emitted with `\n` on Ubuntu and `\r\n` on Windows. This came from Python `Path.write_text` newline translation; hash VALUES were identical, so the sidecar content was semantically identical but not byte-equal. This is not a source/pixel/quantum mathematical failure. Do not misreport first-run sidecar as byte-identical.

### Frozen fix before rerun

Write SHA256SUMS.txt as explicit `ASCII bytes`, LF `\n`, via `Path.write_bytes`, not OS-default text-newline serialization. Keep mathematical and RGB-pixel challenge source and all 817 HBP rows unchanged. Re-run independent Seat2 hosted Ubuntu/Windows and verify all **three** scientific evidence files (canonical JSON, HBP and hash sidecar) byte-for-byte match; preserve original hosted CI run, its artifact archives and this correction. No physical spectrum, sensor, photons, security signature or real quantum computer claimed.
