# Seat 3 preregistration — August Light-Bank / Colour QR / exact projector cold-recall test

Date 2026-10-15. **Freeze before implementing or running this new experiment**. No frozen B1/B2 source receipts are modified.

## Recovered primary source contracts

- [The Colour QR](https://github.com/JesseBrown1980/the-colour-qr/blob/main/README.md), README Git blob dec43dd370de557f2511e69227b1e234e001ddfc: 2,100-byte chunks, prepend four-byte little-endian Fischer chunk index, chunk 3k to red, 3k+1 to green, 3k+2 to blue, three complete independent ordinary QR symbols per RGB image. **This particular test implements the byte-level packet framing only, not actual QR raster encoding or optical camera readback**.
- [The Law of Space/Light/Colour/Speed of One](https://github.com/JesseBrown1980/the-law-of-space-and-light-and-color-and-travel-at-the-speed-of-one/blob/main/README.md), Git blob 6412cb3b82ec084b03b68c9c4d074a58920ac1ee: mathematical projector P=I-J/3, rank 2, P²=P. The shared-component null space **cannot be recovered from the projected channels alone**. This is not instantaneous photon communication.
- [Stone-to-Moss](https://github.com/JesseBrown1980/asolaria-stone-to-moss/blob/main/README.md): 729 light-blocks bounded per smelter; track eviction and recall. This trial creates three bounded RGB lane banks.
- [Light Boat](https://github.com/JesseBrown1980/light-boat-engine-ships-with-oils/blob/main/README.md), README Git blob ba1c1a36ec1d4201297ccad325f848c6040dc95e: T+A+R=1 optical-category closure, not a physically demonstrated memory material.
- [lightDOORwsMs](https://github.com/JesseBrown1980/lightDOORwsMs/blob/main/README.md), README Git blob 07aa9b4433a6cccbc3e0a52d90686ab8d4484e50: 3,200-byte quantized count-sketch is an **address, not a recoverable archive**.
- [RAINBOR](https://github.com/JesseBrown1980/RAINBOR/blob/master/README.md), README Git blob fd326cd52a71cf55c3948e131011b57825ec6412: optical light-bank/slit hardware language explicitly marked DESIGN/CONJECTURE. No demonstration that photons were persistently stored.

## Frozen composite scientific input

Source A: independent Seat3 reimplementation of original three-state photocycle, PR #53 pinned commit c1fc2c85e5684d2c1190662ba57e889d996b792b. Run experiments/seat3/seat3_peer_seat1_photocycle.js (Node22) to obtain exactly 611,999 bytes with SHA256 de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b, 8,748 states.

Source B: conserved four-state + controller-cost experiment, PR #62 pinned commit f6df567f9d36697f2fc895167c04ac3c46152409. Run experiments/seat3/room03_fourstate_cost.py (Python) to obtain exactly 365,671 bytes, SHA256 435eccff256d119e608926ba3f3ec46a961d9f0d18801c440de2c3552200101d, 2,400 tick states + 684 controller candidates.

Concatenate A||B = exactly **977,670 bytes**. Expected **466 indexed chunks**, **156 RGB frames**, 156 R + 155 G + 155 B. Final chunk has 1,170 payload bytes. Source SHA hashes must be independently checked BEFORE encoding and again AFTER cold reconstruction, with original source lengths kept immutable. This is distinct from the original 32,805-row release challenge.

## Projector and nullspace theorem

Each triple of indexed bytes x=(r,g,b) yields S=r+g+b, dr=3r-S, dg=3g-S, db=-dr-dg. Store (dr,dg,S) as signed-16 signed-16 unsigned-16 little endian (six stored bytes per three input bytes). Reconstruct r=(dr+S)/3, g=(dg+S)/3, b=(S-dr-dg)/3. Check divisibility by 3, byte range, and reencoding equality. A final incomplete triple is internally zero padded but its original length must be retained in its packet header.

Proof: (dr,dg,db) = 3Px where P=I-J/3; reconstruction adds the missing common component (S/3)*(1,1,1). Omitting S destroys invertibility: (10,20,30) and (11,21,31) have exactly equal dr,dg but different S and source bytes. The six-byte triple can **expand** storage; no compression or unbounded capacity claim.

## Deterministic binary simulated light stick

Header: ASCII LBK1 4B; epoch uint32-LE 20261015; lengths A and B uint32-LE each; chunk_count uint32-LE; SHA256(A), SHA256(B), SHA256(A||B) raw 32-byte digests. Total header: **116 bytes**.

Per indexed chunk i (0..465): lane uint8 i%3; frame uint16-LE i//3; length uint16-LE of indexed packet (4-byte LE i concatenated with up to 2100 bytes); SHA256(indexed packet) raw 32B; followed by ceil(indexed_length/3) projected (dr,dg,S) six-byte triples. Canonical serialized file extension .lbk. Packet order is increasing Fischer index; reject missing packet, wrong lane/frame, double index, altered epoch, invalid triple, mismatched SHA, trailing bytes, or swapped source lengths. Source/manifest digests alone are checksums, NOT authenticated source origin.

Three independent **729-slot** software caches keyed by R/G/B lane. Input size is below capacity in each cache. Separately churn one cache through 729+27 synthetic packets: 27 deterministic oldest evictions, and eviction-only recall must return HELD unless independently retained encoded bytes exist in an actual archive.

## Preregistered negative and safety gates

- Full independent cold read of the **serialized** light stick, no access to retained source buffers during decoding, exact reconstruct A and B SHA and byte lengths, and 466 packet receipts.
- Projected-only ambiguity, corrupted encoded tuple, removed packet, wrong lane, corrupted or replaced indexed header, wrong epoch, coherent local S mutation that still meets algebraic constraints but breaks packet/source hash, over-budget cache eviction, full forged payload with consistently rewritten local hashes but mismatched anchored original source SHAs.
- Every failed gate returns HELD, never a purported decoded payload. Simulation operates autonomously with zero human prompts per packet/tick; external release remains separate.
- Explicit flags: real optical QR rendered=false, camera readback=false, physical photon memory=false, real quantum optical medium=false, cryptographic authenticated source=false, separately attested physical hosts=false, biological opsin fitted=false.
- Two separately written Python struct and Node Buffer implementations must generate byte-identical full .lbk, independently cross-decode the other's file, and agree on canonical HBP rows and JSON metrics. Exact full SHA256 sidecars, corruption test and CI artifacts required.
- Four jobs Ubuntu/Windows × Python3.11/3.13 + Node22. Preserve any failure, preregistered fixtures remain unchanged, independent Seats 1/2/4 peer review before merge. Do not issue physical three-host challenges automatically or imply Hugging Face release.

Subsequent **separate** experiment: render each 2100-byte indexed lane into an ordinary QR symbol, compose three QR symbols into physical RGB image at sufficient pixels/module, capture with external camera (not source PNG), independently decode each plane, verify full source hashes and measure bit/frame error rates. That is NOT proven by this byte-framing study.
