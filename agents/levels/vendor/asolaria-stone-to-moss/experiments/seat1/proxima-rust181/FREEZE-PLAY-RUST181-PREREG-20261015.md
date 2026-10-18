# Asolaria R4 preregistration — Freeze / picture / 2D stacks / rainbow QR / three-leaf growth / time-jump

**Date:** 2026-10-15. **Source contract frozen before implementation.** Independent per-particle event histories and previously passing Rust1.81 receipts remain unchanged; no merge.

## Original exact source contracts

- [Asolaria July learning pipeline](https://github.com/JesseBrown1980/Metatagging-data-for-a-Quantum-universe/blob/main/docs/THE-LEARNING-PIPELINE-slices-are-time-2026-07-03.md): `slice(time) → HRM → MTP1/2/3 → Fischer → Shannon → GNN/gulp → NOTE → catalog reference code`. The raw input can be discarded **only if the scientific source and provenance retention requirements permit**.
- [the-colour-qr](https://github.com/JesseBrown1980/the-colour-qr): actual existing RGB 3-plane QR format, 2100 source bytes per chunk, uint32-le ordinal, base64 transport, actual standards-based QR decoder; new Rainbow7 grouping is an *extension*, not a claim existing off-the-shelf QR decoders read a seven-spectral-channel symbol. Preserve 3-plane legacy compatibility.
- [Proxima real camera FITS prereg](./CAMERA-FITS-PREREG-20261015.md): original WCS/filter/exposure data needed before any real telescope claim. Test fixture is synthetic and not an observation.
- [Asolaria independent particle memory](./PARTICLE-MEMORY-PREREG-20261015.md) and the [public 10Gyr computational stone](https://github.com/JesseBrown1980/asolaria-stone-to-moss/tree/main/stones/2026-10-15-asolaria-trit-recurrence).

## Falsifiers before seeing outcomes

1. **Freeze/2D:** make two valid 7×9 synthetic FITS BITPIX=16 primary frames with 2880-byte-aligned headers, distinct sample arrays and timestamps. Strict parser reconstructs every original source sample exactly, plus round-trip balanced ternary of each (11 trits/16-bit source sample). Accept only genuine FITS metadata when received; no fabricated photons or new planet.
2. **Stack memories:** source tag+filter+each (x,y) pixel gets its own time-ordered observations; a second frozen exposure adds an event to the **same pixel address**, not a new global summary. Duplicated/nonmonotone exposure held. Reload/replay individual source addresses.
3. **Rainbow QR:** use original 2100-byte chunk framing / LE uint32 source ordinal; distribute across 7 **logical colored labels** (violet/indigo/blue/green/yellow/orange/red), and ensure chunk reassembly is exact and unordered tolerant, duplicate/corrupt held. These seven labels do not create seven calibrated wavelength measurements nor seven simultaneous light-spectrometer measurements. Image-level QR symbol generation is a separate standard QR library step.
4. **Hash/time:** SHA256 frozen source bytes and an append-only `previous_digest || physical_observation_time || source_sha || state_digest` event list; independently tamper source/time/reordering; exact source mutation must break the chain. A new hash at a later time records that timestamp; it cannot prove an unexecuted sequence. Time jumps must also independently reproduce actual `T^N` under declared recurrence, compare to short direct stepping.
5. **Three leaves/branch:** three child signals `-1/0/+1` indicate reject/unavailable/pass, respectively. Grow only when at least 2/3 are pass; no growth with 2 rejected/unavailable. Scientific promotion additionally requires source-custody pass, regardless of the other 2 votes. No implication of biological consciousness.
6. **Every level:** test the seven levels 3,9,27,81,243,729,2187 with HRM, MTP1/2/3, Fischer, Shannon, GNN/GULP, chariot order and per-particle memories already established.
7. **Independent** Python source FITS pixel/QR payload/time-link oracle; Rust 1.81 Clippy warnings as errors, all 4 Ubuntu/Windows × debug/release outputs identical with fifth byte referee. No real camera data claimed until actual bytes are ingested and pinned.

**Release status:** R4 is a software codec and sensor-ready integration exercise, not a new astronomical planet detection, photon-memory retention proof, externally attested host or completed physical acquisition.
