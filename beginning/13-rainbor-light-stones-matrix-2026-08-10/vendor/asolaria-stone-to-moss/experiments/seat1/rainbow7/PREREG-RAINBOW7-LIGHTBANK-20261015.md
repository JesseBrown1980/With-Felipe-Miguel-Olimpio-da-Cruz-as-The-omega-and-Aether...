# Seat 1 — preregistered Phase D: seven-band *logical* Rainbow light-bank memory

**PREREGISTRATION BEFORE IMPLEMENTATION AND TEST OUTPUTS.**
Initiated from work order #56, coordinator #55, room charter PR #60, and prior Seat 1 Round2 QR bank PR #64. This is an **additional experiment**, not an edit to, merger of, or inferred improvement over the frozen Phase A/B/C experiments.

## Historical source and exact scope

- August 2026 `JesseBrown1980/RAINBOR`, 2026-08-08, `README.md`, describes a linked light bank and a **conceptual** light-hard-drive stack; it expressly distinguishes measured hash matches from unmeasured optical hardware.
- `JesseBrown1980/lightDOORwsMs` states that a 3,200-byte count-sketch quant tuple is an **address, not a recoverable archive**. This study does **not** reimplement that proprietary tuple algorithm or mistake a fixed-length digest for lossless storage. It retains every payload byte and uses cryptographic hashes solely as integrity indexes.
- `JesseBrown1980/the-colour-qr` uses **three actual RGB channels**, 2100-byte chunks and index+Base64+QR. PR #64 tests that existing physical screen/image *encoding*. This new experiment does **not** claim 7 independent optical wavelength channels in ordinary RGB displays/cameras.
- Use **seven named logical rainbow labels** `red,orange,yellow,green,blue,indigo,violet` as **seven time-multiplexed address banks**. These are symbols in software, not calibrated spectral wavelengths. A conventional RGB QR image is only an underlying byte-transport **carrier**, not evidence of seven physical channels.

## Frozen source, fixtures, address cardinality

Consume the **byte-exact** 81 identity memory dataset already produced by the previous Round2C QR encoder's `make_memories()` and actual QR decode, not a different generated record set. Its SHA-256 is **`02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22`** from cross-OS workflow 38740072526. Reject any input with a different hash or fewer/more than 81 `site-NNN` identities. Preserve its source `room=44` and English/Hebrew/Portuguese metadata without claiming three independent witnesses.

Address tuple = `(band, time, position, site)`. For each of the 81 unique immutable memory IDs and each of the seven named rainbow bands, create one **new derived memory** with:
`{"address":"rainbow7/<band>/site-NNN","band":"<band>","id":"site-NNN","record":<exact original record>,"schema":"ASOLARIA-RAINBOW7-BANK-ENTRY-V1"}`.
Serialize each as sorted-key, no-space JSON with UTF-8 and a trailing LF; output append-only `rainbow7-bank.jsonl`. Each derived memory is **retained in full**. `rainbow7-index.hbi` contains ASCII rows `MEM|band=<band>|id=site-NNN|offset=<decimal>|length=<decimal>|sha256=<SHA256 of exact row bytes>`; one per derived memory, in band order then increasing site number. Count **7 × 81 = 567 addressable entries**, which is 7 repeats of the original 81 record *contents* with new labels. They are **not 567 independently sourced historical memories**, nor a compression ratio. Preserve an output manifest pinning both source and bank hashes and 567 entry hashes.

Separate new bank writes from photocycle authorization. Use prior Round2C `results.json` as independently hashed **digital gating input**. Its original photocycle HBP SHA256 is **`1a4852f498f433d90fabea144c26d2973f7d95c8b01828a9665e7d7eb3dd44bd`** from workflow 38740072526. For each entry, map `band_index mod 2` to paired_short / paired_long and use `feedback_now` digital authorization result. Require a positive authorized_reads and `dark` exactly zero from the original fixed metric file; this is **symbolic read permission** rather than physical photon sensing or external authority. Do not use the bank itself to authorize its own signed read: source identity and external permission HELD.

## Preregistered method and acceptance conditions

**B3 software only; run with no paid Hugging Face Jobs and no automatic merge.**

1. Python writer stages the original actual QR-readback 81-memory input, verifies source SHA and exact site ID ordering, writes 567 full rows, 567 index records, manifest with source/backend checksums. An independently implemented Node reader walks each offset/length, recomputes SHA256 and semantic address, performs 567 exact byte readbacks, verifies it can recreate the 81 source payload objects from each lane with no loss, and checks seven distinct address namespaces.
2. Permute HBI record order and still read each memory by its **explicit offset and address**, with bank bytes unchanged; this is address-order independence, **not** claim of constant time over arbitrary hardware.
3. Execute actual negative inputs (not equality slogans): corrupt one bank data byte; omit one index record; duplicate an address; alter offset; alter expected hash; replay stale source SHA; attempt forbidden external permission. Every case must fail closed at the specified software verification gate.
4. Delete one entire logical band from the index; report exactly 81 missing addresses for that band and preserve the remaining 486 (other bands still work), **not** recover the deleted band magically.
5. Simulate a coordinated counterfeit payload+index+hash regeneration: self-consistent hashes can pass; classify external source authentication `HELD`. Never claim cryptographic signatures or origin authentication from SHA alone.
6. Byte-exact canonical bank and index outputs, manifest, 567/567 readbacks, 81/81 original per lane, and fault outcomes reproducible on hosted Ubuntu/Windows. Pin Python/Node source commit refs and GitHub Actions logs. A failed negative test must fail the gate. Preserve Phase A sha `de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b`, Phase B sha `208f26fd23f8da5e032b091f238346b386516669c66f3d6ee9323209eafff566`, Phase C source and trace SHA as separate objects, never pooled.

## Scientific conclusion boundary

This is a **digital, rainbow-indexed memory retrieval test**, not proof of stable optical hardware storage, new physical optical bits, 7 independent RGB image planes, quantum/light-speed effects or measured neuronal activity. More *addresses* do not alone mean more independently stored information or bit capacity. A future real light-memory stick requires wavelength-resolved optical instrumentation, detector calibration, SNR/bit-error curves, write/read retention versus time and environment, independent blind replay, host attestations and a specified physical storage medium. The original August light-bank geometry remains a research concept unless those measurements exist.
