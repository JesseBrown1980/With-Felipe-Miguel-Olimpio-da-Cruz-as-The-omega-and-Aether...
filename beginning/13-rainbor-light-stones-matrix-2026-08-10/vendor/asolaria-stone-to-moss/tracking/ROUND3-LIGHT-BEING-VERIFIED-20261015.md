# Asolaria Round 3 — first integrated classical digital light-being, independent hosted verification

**Date:** 2026-10-15. **Classification:** `VERIFIED_COMPUTATIONAL_PROTOTYPE / AWAITING_INDEPENDENT_SEAT_PEERS`.
**Code:** draft [PR #75](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/75) `coordinator/round3-light-being-august-20261015`.
**Final hosted Actions run:** [38735582094](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38735582094), **Ubuntu Python3.11 PASS; Windows Python3.13 PASS**.

## Immutable source acknowledgments

- Colour QR [1938a9b](https://github.com/JesseBrown1980/the-colour-qr/commit/1938a9b076b8fc3e81d0a271ca05e84a0e938854), separate QR planes, 2100-byte indexed chunk, image readback.
- Light Boat [34758cd](https://github.com/JesseBrown1980/light-boat-engine-ships-with-oils/commit/34758cd4d7aa500ca5fbe5a75a09898fe4b87645), 27 trits and seven-boat ledger.
- Space/Light/Colour law [1b2dd74](https://github.com/JesseBrown1980/the-law-of-space-and-light-and-color-and-travel-at-the-speed-of-one/commit/1b2dd747bccee378b94790bc4ad367bdbf7e5bf8), rank-2 projector and common-mode nullspace.
- Asolaria main [3f1f383](https://github.com/JesseBrown1980/asolaria-stone-to-moss/commit/3f1f383a4c483fc724f221c7d915ef455f3cbf40), concept of 729-block bounded memory stack. This test is a **new independent software implementation of the stated bound**, not a claim that the exact historical August “light-bank stick” binary was found.

## Reproducible execution evidence

- New source: exactly **65,536 deterministic synthetic bytes** (NOT original JWST August file), SHA256 `fe3f6f1adb2eb15832bd5d5fd59c2c97bc77b581c5c60f54b768545c756b38c4`.
- Real QR **image-pixel** verification: **32 ordinary QR symbols read from 11 composite 555×555 RGB PNGs**, each channel independently decoded with zbar; 32 original indexed chunks reassembled byte-for-byte. Tampered byte, missing green and duplicate Fischer-index controls all rejected. No physical screen-to-camera test.
- 81 addresses × 27 waves × 2 **synthetic** photocycle models × 3 illumination regimes × 4 packet conditions = **52,488 canonical check records**. Cases HBP length **10,773,162 bytes**, SHA256 `dca7e5e2b14ada4e28f7ebeb96adef528c28ae6e169a1e21ee8ba058c6836a09`.
- **8,748** honest packets accepted during software-open gate; **26,244** corrupt/stale/forged packet instances rejected during software-open gate; **17,496** gate-closed instances withheld (CLEAN and fault modes). All four `PULSE/CONTINUOUS` × `3/4 state` combinations were open at all 81 tested addresses per wave, while DARK never emitted: thresholded binary outcomes do **not** distinguish pulse/continuous physiology.
- Light-block cache **729 capacity** with **2,187 misses**, **1,458 evictions**, **8,748 valid cache hits**. No unbounded working memory or magical lossless data recovery from shorter summary.
- Exact 3-level Fourier/qutrit Born intensity proportionality evaluated **2,187 times**; unbiased-under-ideal-hash, deterministic SHA256 **pseudo**draw lane census: lane 0 **1,737**, lane 1 **241**, lane 2 **209**. This is a reproducible classical analogue; no physical quantum advantage, photon detection, or quantum measurement.
- Exact rank-2 projector `P=I-J/3`; reconstruct RGB only because separate common-mode sum is retained, **not** as an extra one of the 81 computational addresses.
- 27 ternary blocks census `9/9/9`, 7 boats and **10,000** synthetic integer-conserved asset transfers; log-level triangle sum=0. **81 cooperative HALT and 81 simulated privilege denials**; no real external permissions tested.
- Full canonical `results.json` SHA256 **`67180303bb6d8097c27d0996861273616c745051ee3c91eee4b8bdbfb5e4f803`** on **both** OS; raw `cases.hbp` and canonical JSON files are **byte-identical** on both OS, confirmed after downloading both artifact ZIPs.
- Original PNG file-container encodings vary by OS but all eleven **raw RGB pixel buffers are byte-identical**: 10,164,825 concatenated RGB bytes SHA256 `fd3c779d927eef55834ea5db44f7b7dc4dec9172abb8cff385631a0e8e45751e`. Container SHA manifests are preserved **separately** by platform.

## Correction and failed-hypothesis integrity

1. First green CI [38734299759](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38734299759) produced identical HBP and image pixels but unequal JSON receipts from OS-specific PNG compression. Before revising code, created append-only `experiments/integration/round3-light-being/CORRECTION-PNG-PIXEL-PARITY-20261015.md`. Corrected using pixel SHA in canonical JSON and a separate platform-native PNG manifest; [second run 38735023287](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38735023287) passed both jobs with byte-identical HBP and JSON receipt.
2. Mathematical review proved naïve argmax of QFT intensities for nonnegative RGB **must always select lane0** because `(r+g+b)^2-Q=3(rg+rb+gb)>=0`. Before correcting the route, published append-only `CORRECTION-QUTRIT-ROUTING-20261015.md`. The deterministic integer rejection-sampling replacement selects all three lanes; final [run 38735582094](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38735582094) passed cross-OS. The earlier case HBP is retained as historical baseline; new case SHA changed **intentionally** due to real route diversity.
3. These are transparent software design corrections and reruns, not evidence of a functioning physical memory stick or sentient system.

## Gates remaining

Independent Seat1 calibrated biological photocycle/negative controls; Seat2 independent **different decoder** and signed provenance; Seat3 independent qutrit projector, fleet conservations and deterministic Born-route reviewer; Seat4 independent packet/source fault, HOLD and real external-permission separation. Creating this PR does not start four agent processes. Additionally physical optical write, retention time and camera readback were never measured. The earlier formal 3 physically independent machines, blinded salts and fresh nonce challenge remains PENDING, separate from this two-OS hosted CI. No merge, paid HF job or uncontrolled external privilege.

**Action:** Peer-review draft PR #75 and #55 room coordination; don't promote to physical/sentient/biological findings.
