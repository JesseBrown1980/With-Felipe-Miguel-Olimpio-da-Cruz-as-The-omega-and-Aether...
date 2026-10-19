# Seat 1 Round 4 — Peer V2 × ordered Rainbow27 × seven-band digital bank: verified report

**Date:** October 15, 2026 · **Status:** EXECUTED, COMPUTATIONALLY REPRODUCIBLE, DRAFT / PEER REVIEW PENDING

- Draft child PR: https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/83
- Preregistration: `experiments/seat1/round4/PREREG-V2-CROSSLANE-20261015.md` (committed *before* new executables)
- Exact independent pinned source: Seat3 V2 at commit `c32d472dfe84f352450eb50469e0e9a987c33d78`, [PR #81](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/81).
- Prior Seat1 source: ordered27 [draft PR #80](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/80) head `7b5faf1103a7b42b603b44b08a5a5bfa994d0f76`.
- **First complete cross-platform CI**: https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38748694660 — **Ubuntu PASS, Windows PASS, cross-platform exact-byte comparison PASS (3/3).**

## Actual operations and exact hashes

| Scope | Count | SHA-256 |
| --- | ---: | --- |
| Original QR-recovered 81-memory JSON bytes | 81 original digital records | `02ff42a93d934074ae9c83e1b989f097944c8c7cd2ed80197c2cfd8795391e22` |
| Pinned retained full-byte Rainbow7 JSONL | 567 actual stored records | `52b4e6b9fc10f641e677c87382b137ec21a15e322ef19c20eb03735254b36345` |
| Original Rainbow7 source index | 567 storage offset entries | `6b105769bf236c156cafa4dd4e3647fe45778c191a7e32ac7df63e84d287d0ee` |
| Previously frozen ordered Rainbow27 × Rainbow7 index | 15,309 alias references | `2480163f9bab77fb4e3730719fce8ef162ba97eac6eceee14bc9c4dfb77ec35e` |
| Pinned, peer-produced normalized V2 full trace | 59,049 route rows | `8544bb305943d7423f6993cffec4a8232d291811e974c78e7d8ec91a53719672` |
| NEW crosswalk HBP output | 59,049 route rows; **413,343 actual offset/length per-band bank reads** | `a4322728a348d1227c1a8af7f214d668150e60a0a40f399ba9aa9708d4684d18` |
| NEW canonical JSON scientific summary | 7 actively exercised negative tests | `57882d86286007ee6c4b745d8820976b886a4d4e8dabd09e56a773665d73f821` |
| NEW separate Node independent verify JSON | 7 separately executed fault checks | `080b86e3b83315e2a1e5b01a887d1a018efa95d7da6b46009fe403783404e218` |

The crosswalk HBP has **7,440,556 bytes** and is byte-identical on Ubuntu and Windows. The workflow independently regenerates all earlier synthetic QR raster data and original retained 567-bank bytes, source-pinned Seat3 V2 Python and Node traces, then independently computes every crosswalk result and negative control.

## Mathematical result

Each ordered address `id=9r+3g+b` identifies exactly one of the 27 trit triples. For the same address, calculate `S=r+g+b`, `Q=r²+g²+b²-rg-rb-gb`. The optical-probability **analogue** uses the primitive (gcd-normalized) integer proportions `(S²,Q,Q)` and a SHA256 ticket with rejection before modulo. These three real-channel intensity weights are symmetric under red/green/blue permutation and cannot uniquely recover channel order. Hence:

- 27 ordered digital identities, 10 raw intensity equivalence classes, 7 primitive-normalized classes including undefined dark zero; exact normalized conditional ambiguity about **2.149596296937 bits** per uniformly distributed identity;
- All 59,049 V2 peer cases matched the independent Python/Node frozen SHA256; lane choices: `0=36,906`, `1=10,179`, `2=9,777`, `H=2,187` all-zero dark cases;
- The **ordered ID is retained separately** from the intensity-derived pseudo-lane. Even when normalized channel intensities collide, the source-memory address and exact seven-band digital record references remain differentiable.
- All 413,343 reads validate the actual stored entry's indexed byte slice, SHA256 and source ID and payload. Those are repeated *logical lookups* of 567 retained bank rows, **not** 413,343 independent sources or optical readings.

## Actual falsification tests

Python producer and independent Node verifier each exercise 7 mutations or forbidden cases, with rejection before a trusted output can be accepted: color permutation with unchanged ID, amplitude change with unchanged ordered ID, stale location, modified retained-bank byte, wrong semantic band/destination, missing violet record, and corrupted source+local expected digest against an unchanged pinned bank digest. The isolated zero-normalization case is explicitly held from routing while leaving its memory reference intact.

**Precision about negative controls:** a missing violet band is actively caught by reading a removed entry. The one-wave `2,187` unavailable / `13,122` six-band-remaining counts are **deduced by cardinality**, not yet a distinct full attempted-read tally for each missing alias. The replacement-hash negative checks the independent bank anchor. It does **not** independently demonstrate an attacker with full control over the supposedly external anchor can be detected.

## Unresolved trust and experimental limits

- No real-photon write/read or physically persistent light storage; source data originates in deterministic rendered QR pixels, not an optoelectronic memory stick.
- The seven rainbow names are **symbolic address labels**, not seven measured spectral channels. The three Fourier lanes are normalized classical probabilities followed by deterministic SHA-ticket pseudo-selection, not a physical quantum detector.
- Neither historical Seat 1 source nor current Seat 3 synthetic V2 source is authenticated by an independent trusted optical device/cryptographic origin signer. Coherent attack against both content and external anchor remains **HELD**.
- Seat3's synthetic V2 256-byte fixture and Seat1's original QR memory bytes remain explicitly **different sources**, never claimed byte-equivalent.
- Attested independent physical host separation, biological photocurrent calibration, actual seven-band optics and release/HF remote readback remain outstanding in [Issue #10](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/10).

**Requested next review:** Seat 3 independently audit mathematical primitive lane rule and crosswalk; Seat 2 audit source custody and QR ancestry; Seat 4 exercise actual erasure and coherent-anchor-forgery threat models on this separate test. Keep the draft unmerged until findings are discussed under Coordinator [#55](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/55).
