# Seat 1 — Rainbow7 Phase D reproducibility results (computational only)

Date 2026-10-15. Work order [#56](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/56), coordinator [#55](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/55), scientific draft PR [#78](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/78).

**Status: EXECUTED_COMPUTATIONAL / CROSS_OS_BYTE_IDENTICAL / PEER_REVIEW_PENDING / PHYSICAL_EVIDENCE_UNAVAILABLE.**

This phase was preregistered at commit `83629415d338fa8713c1ca01faaa591fbb14ba04` **before executable code**. The tested implementation/source commit was `c0fd5bc96c472d9cb8ffe55dd0b0cf87451eff65`. Raw output files are downloadable as workflow artifacts from [Run 38741109203](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38741109203), with successful Linux, Windows and cross-OS jobs **3/3 PASS**.

## Measured *software* outcomes

| Gate | Result |
|---|---|
| Source | Same **81** previous QR-decoded synthetic memories, SHA256 `02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22` |
| Photocycle read authority | Previous **synthetic**, SHA256 `1a4852f498f433d90fabea144c26d2973f7d95c8b01828a9665e7d7eb3dd44bd` |
| Rainbow bands | 7 named logical address lanes, `red, orange, yellow, green, blue, indigo, violet` |
| Exact full-data memory readbacks | **567/567** (7 repeats × 81 pre-existing independent IDs; no information compression claimed) |
| Actively injected faults rejected | **7/7**: byte corruption, missing entry, duplicate address, shifted offset, changed expected digest, stale source digest, unauthorized external action |
| Entire one-band logical erasure | 81 unavailable + **486** remaining exact reads |
| Input index order reversal | **567/567 exact** |
| Cross-operating-system | Exact bytes for six critical source, bank, index, manifest and verification files |
| Bank size | 184,815 bytes, retained full source bytes in each derived address |
| HBI index size | 70,043 bytes |
| Physical storage or wavelength sensor | **NOT TESTED**; zero optical/biological measurements |

Reproducible SHA-256:
- full `rainbow7-bank.jsonl`: `52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345`
- `rainbow7-index.hbi`: `6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee`
- manifest: `511b38b155261915c908c4e793c27c48b697f9def53c1f2a083db7ee207318db`
- Node verification report: `86fa28430e9e8b3f29f4ccd285172ccc01a3bb921983bb16ac7e03b9780ccd07`

## Scientific/engineering boundaries

- [RAINBOR Aug 8 concept](https://github.com/JesseBrown1980/RAINBOR/blob/master/README.md) calls light-bank hardware a design/conjecture. The [LightDOOR memory address](https://github.com/JesseBrown1980/lightDOORwsMs) explicitly describes the 3,200-byte tuple as an **address, not an archive**. This study retains every byte and does **not** represent SHA as a reversible memory-compression code or physically optical storage.
- The original Brown [Colour QR](https://github.com/JesseBrown1980/the-colour-qr) encodes three **real RGB pixel planes**. This new seven-band bank is a layer of **logical names and repeated time slots over the same carrier**, not a measured seven-wavelength optical transmitter. More logical addresses do not alone create more physical storage capacity.
- The previous photocycle is an integer mass-conserving **software proxy**; it authorizes simulated reads, not permission to real hardware or external repositories. Shared-origin or coherent source/manifest forgery is `HELD_EXTERNAL_SOURCE_AUTHENTICATION_NOT_VERIFIED`. GitHub Actions workers are not authenticated distinct physical hosts.

## Four-seat scientific handoff

**Seat 2:** source and watcher trust audit; show coherent counterfeit source+manifest is still unverifiable. **Seat 3:** audit actual memory capacity, duplication and the difference between logical labels and physically independent wavelengths; propose physical optical calibration/read-retention targets before claims. **Seat 4:** independently reimplement indexed lookup and targeted fault injection; test recovery after one band is deleted without recreating unavailable entries. **Coordinator:** keep draft PR #78 open; no automatic merge, Hugging Face publication or scientific promotion before independent review.

Next *real physics* milestone, requiring instruments and separate preregistration: specify a 7-wavelength write/read material and optical path, measure per-wavelength channel cross-talk, SNR, BER before/after storage time, thermal and ambient-light degradation, and independently blinded source/readback. Digital CI alone cannot discharge those gates.
