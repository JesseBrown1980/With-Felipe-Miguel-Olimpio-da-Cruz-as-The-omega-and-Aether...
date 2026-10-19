# Seat 2 interoperable Colour QR × N-Nest × Q-PRISM × GitRAM

This is **a runnable digital integration**, not a redefinition of the original projects.

**Input:** pinned `the-colour-qr/README.md`. Each R/G/B GitRAM worker reads it independently and emits the channel's indexed binary `.hbi` chunk(s), canonical base64 `.qr.txt` text for ordinary per-channel QR symbols, and `.hbp` receipts + SHA-256 sidecars. The *QR graphics* are **not rendered or scanned** here; use the original Colour QR browser decoder with separately generated conventional QR symbols.

**Q-PRISM:** real git-pinned upstream `dbbh-coms-quant-prism` Rust crate (not an invented substitute); each frame exercises `QPrismCube::new`, inverse `reconstruct`, `SessionCapsule` denied before both arms, then `dbbh_send`, `dbbh_receive`, `verify_chain`, collapse. Store-backed/no-store paths are separate upstream options; this integration uses the full glyph Path 1 transfer, not an entropy-violating scheme or a live neural-control apparatus.

**N-Nest:** every frame is independently recalculated from the frozen original in the final reviewer. A differing source bit, missing frame, forged index, altered HBP or faulty receipt prevents the apex seal. The original depth-3 and depth-7 node verifier scripts also run as a separate GitHub Actions regression. The actual production gate is a source-pinned Rust recomputation, not a human-independent signer or AI consciousness experiment. The recurring corrective loop here is finite; it does not authorize its own scale-up.

**GitRAM:** three stateless workers (R, G and B), all-or-nothing fan-in which downloads artifacts and verifies only, no training or shared RAM. As implemented, each Actions invocation is a finite batch, not a continuously running data stream. The live user-controlled camera/file QR decoder remains in the original Colour QR repository. No action ever changes the RELIC/LIRIS/ACER lane.

## Commands
```sh
cargo +1.81.0 test --manifest-path experiments/seat2/colourqr-nnest-qprism-gitram/Cargo.toml
cargo +1.81.0 clippy --manifest-path experiments/seat2/colourqr-nnest-qprism-gitram/Cargo.toml --all-targets -- -D warnings
cargo +1.81.0 run --manifest-path experiments/seat2/colourqr-nnest-qprism-gitram/Cargo.toml -- shard R ORIGINAL_README out
cargo +1.81.0 run --manifest-path experiments/seat2/colourqr-nnest-qprism-gitram/Cargo.toml -- shard G ORIGINAL_README out
cargo +1.81.0 run --manifest-path experiments/seat2/colourqr-nnest-qprism-gitram/Cargo.toml -- shard B ORIGINAL_README out
cargo +1.81.0 run --manifest-path experiments/seat2/colourqr-nnest-qprism-gitram/Cargo.toml -- seal ORIGINAL_README out sealed
```

For actual multi-image payloads, the colour QR scheme maps chunk i to image floor(i/3) and lane i mod 3. The 2,100-byte original body size is intentionally unchanged. The four-byte index and base64 are transport overhead, not magic compression.

**Scientific boundary:** no optical QR camera decoding, real neural stream, photon persistence, planetary motion, independent external provenance signature, separate hardware custody, or HF publication is demonstrated. Preserve reported August optical-memory experiments without presenting digital GitRAM receipts as those experiments' calibrated instrument traces.

See `PRE-RUN-SOURCE-AND-GATES.md` for immutable upstream commits and claim gates.
