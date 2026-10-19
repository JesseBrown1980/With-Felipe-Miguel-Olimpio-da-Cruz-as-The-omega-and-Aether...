# Round 3 local software pilot — execution and corrections
Date: 2026-10-15. Parent prereg commit `99fe20e3188faf60d391ec9b076eb4bf6aedd4e7` occurred BEFORE this pilot execution.

## Source interpretation corrected from new operator URLs
- **the-colour-qr** (2026-08-06) encodes 2,100-byte indexed chunks (4-byte LE chunk number then Base64) into 3 ordinary independent QR symbols, one in each RGB channel of a composite image. Whole-payload SHA on recovery. An 11-up **contact sheet was not decodable**; enlarged direct crops were, per original README. Three RGB planes are not the same thing as physical transmit/absorb/reflect probabilities.
- **light-boat-engine-ships-with-oils** separately demonstrates T+A+R=1, one-hot 9/9/9 trit census and cycle-closure algebra, NOT storage in photons or a persistent physical stick. Algebraic zero-delay constraint does not carry signals.
- The original RAINBOR 3-path fibre-optic hard-drive is still a **design** without a separately authenticated device.
- The new A/B/P XOR shards are a *proposed software redundancy experiment*, not a claim that the August physical sticks had XOR parity. RGB QR transfer and parity shards are separate independent layers.

## Measured LOCAL pilot
Python 3.13 + `qrcode`, Pillow, OpenCV 4.13, NumPy 2.3.
Result JSON SHA256: `9568593a99494243da9afdf0646aecd94ef464e9ac6afeced932d8e719d4f422`
Pilot source SHA256: `7df5825f2055469f5284b75bfde9c3395ed10919daca30f775d630247962147f`
RGB rendered test PNG SHA256: `008a8b04aa72fd9d2f7e5686422653d1d76f0a2d97d6f960669131e4035e47fe`
Synthetic payload 65,536 bytes SHA256 `6a6b291953336c22632691a22561f19d40fb5c782385803b398381174275f9bc`.
32 logical 2100-byte chunks, 11 RGB frame groups; **logical packet integrity passed**, not all 11 frames visually encoded/decoded.
One actual composited RGB QR image with three distinct *ordinary* QR symbols was generated; **96 bytes** (three 32-byte indexed data chunks) were decoded from the R/G/B image planes with OpenCV and reconstructed in index order. Erasure of green plane left red and blue independently decodable; original missing green was not reconstructable from that visual frame alone.
A separate software three-shard A(32768), B(32768), P=A XOR B experiment reconstructed original 65,536 bytes from all valid pairs (A+B, A+P, B+P). This models erasure recovery, not source authentication or privacy. A single surviving shard alone cannot recover arbitrary unknown full payload.
Modified payload was rejected by whole-payload SHA; one-hot optical census checked 27/27, net trit sum 0, classical level-cycle algebra sum 0.
No biology, light-quantum memory, real photodiode/QR-camera physical readback, hardware stick, or 4-seat reproduction was tested.

## Failure history and correction (append only)
Attempt 1 failed: test mistakenly sorted 32 indexed chunks in *descending* order; corrected expected ascending reconstruction. No original external source modified.
Attempt 2 failed: Pillow `Image.putchannel` API nonexistent; replaced with `Image.merge('RGB', ...)`.
Attempt 3 timed out with 128-byte QR payloads on the local OpenCV QR detector, not a mathematical failure. Reduced **pilot only** to three 32-byte QR payloads, still exercising independent RGB render+decode. This is NOT verification of 2100-byte capacity across all three QR planes on this scanner. Future test must establish full 11-frame physical / optical capture before promotion; mark this as NOT_EXECUTED.

## Promotion labels
`SOFTWARE_PILOT_PASS`, `OPTICAL_HARDWARE_UNVERIFIED`, `FULL_11_FRAME_QR_NOT_EXECUTED`, `SEAT2_PEER_PENDING`, `FOUR_SEAT_EXECUTION_NOT_STARTED`, `NO_RELEASE_AUTHORIZATION`.
