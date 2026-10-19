# Pre-run Memory→Recurrence Recovery Lock — Round3 (append-only)

This specifies the coupled challenge BEFORE the standalone resume verifier is executed, after the unified reference HBP was already produced and published. This is an **additive confirmatory replay with known targets**, NOT a blind prospective scientific challenge.

## Exact input
- Previously frozen common source from `PRE-RUN-UNIFIED-STATE-SPEC.md` and exact 2,715,718-byte HBP SHA `b4672f15a1003ef1714073eb0664942921f15b6ea8588a39701a42fc9485f8a9`.
- For every **216** (two models × four arms × 27 wave IDs) context, select the byte-exact snapshot at tick 63 (canonical `sites` Base64 contains 1,296 bytes representing 81 integer site populations). Select the corresponding independently archived target snapshot at tick239.
- Three *software memory sticks*: A=first 648 bytes; B=last 648 bytes; P=A XOR B (648B). Each stick labeled by 4-arm, model, wave, tick, immutable canonical source digest and independent full checkpoint SHA. All physical-light predicates false.
- Reconstruct checkpoint with **three separate pairs** AB, AP, BP; 216×3=**648 exact reconstructions**, and for every pair resume from t=64 to t=239 inclusively (176 ticks ×81 sites). Expected **9,237,888 site-tick updates** in 648 recovery continuations. Each resumed state at tick239 must exactly match original separately archived target tuple array and current proxy. No previously recorded full-trace HBP output is modified.
- No physical QR decoder is used in this checkpoint replay: this tests software memory, not QR photo capture. A separate and still incomplete full 11-frame visual QR roundtrip gate remains.
- Faults: corrupt B and attempt pair AB -> checkpoint SHA rejection before any resume; intact AP and BP still reconstruct; tamper payload digest and stale tick metadata -> both fail. A single shard alone cannot uniquely recover arbitrary unknown full checkpoint bytes; two lost => HELD.
- No brightness, photon storage, neuron behavior, physical sensor, matched biological kinetic data, hardware attestation, self-authentication, or human consent inferred. The source and expected outputs are already public; local passing calculation is not independent four-seat approval.

## Acceptance
Program verifies own source/full HBP SHA, all 216 context pair recombinations, all 648 final states, current and mass, aborts corrupted pair, and prints data counts+checksums; run in Python and later independently in Node. Publish all failure attempts append-only.
