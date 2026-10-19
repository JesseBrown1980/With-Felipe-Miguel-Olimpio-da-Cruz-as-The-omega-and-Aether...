# Round 3 append-only cross-OS PNG encoding correction — 2026-10-15

Source of truth: **the first successful hosted GitHub Actions run** [38734299759](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38734299759) on draft PR #75. Both initial matrix jobs `SUCCESS`: Ubuntu Python 3.11 and Windows Python 3.13. Preserve this run, generated images, raw traces and reports; do not rewrite the prior August repos or Round 3 preregistration (`0a727e62a654e41c0194fdc5fd7113ee3aead5cd`).

## What passed on the first run (independently measured)

- Full **52,488-line, 10,773,162-byte HBP** is byte-identical in the Ubuntu and Windows downloaded artifacts; SHA256 `cc4a637064021cb7fb9fd61afef579f43d10b01f85cb07fd66ab8e710fe2c3c8`.
- Both jobs separately encoded and decoded **32 standard QR symbols in 11 three-plane RGB images**, reconstructing all 65,536 synthetic source bytes, SHA256 `fe3f6f1adb2eb15832bd5d5fd59c2c97bc77b581c5c60f54b768545c756b38c4`.
- Exactly **8,748 clean open-gate packets accepted; 26,244 open-gate corrupt/stale/forged packets rejected**, with remaining closed-gate conditions HELD. 1,458 bounded cache evictions and 10,000 integer-conserved fleet transfers. Two jobs returned `SOFTWARE_PASS`.
- I downloaded both complete GitHub CI artifact ZIPs, decoded the 11 PNG files using Pillow and compared raw RGB bytes: **11/11 pixel buffers byte-identical across operating systems** (555x555 RGB each).

## Revealed limitation

The original results embed `image_artifacts[*].sha256`, a digest over the **PNG *file container* bytes**. All 11 PNG files have different SHA256 checksums between Ubuntu and Windows even though their decompressed RGB pixels are identical. Therefore the **full canonical JSON receipts differed**:

- Ubuntu receipt SHA256 `96401ca0abc9136617d130f5f1fd2e90a06c16bd2630c344532ff0ac11b509c1`.
- Windows receipt SHA256 `db0af90a070fe50fd7c819f1d8d845fb582ad50a8e10a90dbb10be90cd568627`.

This is an *image file serialization artifact*, not a measured computation or RGB pixel disagreement. Do not call the initial full receipt `byte-identical`; only the HBP and raw RGB pixels matched.

## Corrective test, frozen before rerun

1. Canonical receipt will record each decoded raw `RGB` pixel buffer SHA256, dimensions and image filename, NOT cross-platform PNG compression/file container SHA.
2. A **separate per-platform PNG-container manifest** will continue to record each original PNG file SHA256, so the distinct original containers are fully traceable and never silently erased.
3. Verify each decoded channel QR, decoded payload, case HBP, canonical RGB pixel SHA and all independent scientific counters on Ubuntu and Windows. Download and compare their results before declaring full cross-OS JSON byte parity.
4. Strengthen bounded digital-memory evidence: access each verified CLEAN packet from the LRU as an actual **cache hit**, rather than only writing first accesses. Distinguish this small added local access test from the frozen 52,488 canonical case matrix.
5. No modifications to the underlying QR chunk law, seven-boat equation, projector/QFT identity, 3-/4-state toy rates or Brown-Hilbert address separation.

**Classification:** First run `VERIFIED_FULL_DIGITAL_PIXEL_AND_HBP_PASS`, `FULL_RECEIPT_CROSS_OS_DIFFERENCE_DISCLOSED`; correction awaiting a separately measurable repeat. No physical optical storage, photon transmission, quantum hardware, neural tissue or conscious agent claim.
