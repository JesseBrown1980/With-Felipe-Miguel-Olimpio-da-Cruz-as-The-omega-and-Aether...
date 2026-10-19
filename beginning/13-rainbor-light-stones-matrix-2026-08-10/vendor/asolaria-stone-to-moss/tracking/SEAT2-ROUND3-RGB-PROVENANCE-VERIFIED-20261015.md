# Seat 2 — verified independent Round 3 RGB provenance and adversarial scientific receipt

**Date** 2026-10-15 · **status** `SEAT2_DIGITAL_PROVENANCE_PASS_WITH_LIMITATIONS`.
**PR** [draft #77](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/77).
**Final hosted run** [38741447733](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38741447733): Ubuntu Python 3.11 **PASS**, Windows Python 3.11 **PASS**.
**Independent pre-registration (before verifier code):** [`f1c8c4353cf7689bdbc71fcb96baae374cd164a9`](https://github.com/JesseBrown1980/asolaria-stone-to-moss/commit/f1c8c4353cf7689bdbc71fcb96baae374cd164a9). **Append-only second prereg / correction (before new controls):** `a3093ef5505495c82523ac36f7f830a7eecbc18e`.
**Target data:** Coordinator [draft #75](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/75) published artifacts from [Actions 38735582094](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38735582094), source commit **`a3e86a169ee9d45d64cd83973919e760ce7e65d9`**. No producer code imported or executed by this verifier.

## Frozen source identity — digital, not signed

- Coordinator new 65,536-byte **synthetic**, SHA256 counter fixture: `fe3f6f1adb2eb15832bd5d5fd59c2c97bc77b581c5c60f54b768545c756b38c4`. **NOT the historical August JWST payload**. Recalculated independently using the published fixed label/byte-order.
- 11 published 555×555 composite PNGs; 32 ordinary base64 **QR image planes** in R/G/B, one genuinely empty B filler on final image. Independent **ZXing-C++ v3.0.0** reader recovered 32/32 on both operating systems. 4-byte LE Fischer-index reassembly (0..31), final body 436 bytes, recovered all **65,536 source bytes** exactly.
- SHA256 across concatenated **10,164,825 real decoded RGB pixel bytes**: `fd3c779d927eef55834ea5db44f7b7dc4dec9172abb8cff385631a0e8e45751e`, equal on both OS. Original native PNG compressed byte containers can differ between operating systems without differing pixel bytes.
- Independent **OpenCV 4.13** decodes **15/32**, indices `0,2,3,6,11,13,16,17,18,23,24,25,29,30,31`; all decoded content matched. **17/32 misses** are a real third-party decoder compatibility limitation at 555px, NOT corrupted source or evidence of camera performance. Neither ZXing nor OpenCV had a physical camera in this experiment.
- Publish-only record `cases.hbp`: **52,488 exact rows / 10,773,162 bytes**, SHA256 `dca7e5e2b14ada4e28f7ebeb96adef528c28ae6e169a1e21ee8ba058c6836a09`. Independently parsed every row, recomputing 2,187 unique PIDs, source body slice SHA, qutrit pseudo-route selection, exact three-state/four-state *toy* gate schedules and ordered fault/wave/address verdict fields. Qutrit lanes **1,737 / 241 / 209**. Honest PASS 8,748; open fault-reject 26,244; closed gate-held 17,496.
- Publisher's canonical `results.json` (both source OS) independently checked digest `67180303bb6d8097c27d0996861273616c745051ee3c91eee4b8bdbfb5e4f803`; the two original source `results.json`, complete HBP, and raw RGB pixel buffers were byte-identical. Underlying source artifact IDs Ubuntu **11973675852**, Windows **11974420144** from run **38735582094**.

## New truly independently constructed attacks

Published HBP has truth hashes and verdicts but **does not embed the actual injected attacker packet bodies**. Therefore **ledger replay alone would not prove faults were physically instantiated by the original producer**. Seat2 separately built its own memory packet dictionaries and created each attack for every 52,488 software case while auditing the original HBP:
- **CLEAN active packets:** 8,748/8,748 accepted using source-bound SHA, immutable PID, boat origin, sequence and qutrit route. Closed gates withhold.
- **CORRUPT:** flipped first byte AND recomputed matching untrusted claimed SHA. **8,748/8,748 active malicious packets rejected by separately anchored original body**.
- **STALE:** changed sequence to preceding step. **8,748/8,748 active stale packets rejected**.
- **FORGED:** changed boat-origin ID modulo seven. **8,748/8,748 active forged-origin packets rejected**.
- **FALSE_ROUTE:** additionally changed qutrit lane and corresponding boat origin to make a coherent alternate itinerary. **8,748/8,748 active false-route packets rejected**. This is **in addition to** the coordinator's 52,488-case ledger, not a new source-ledger row count.
- **MISSING IMAGE CHANNEL:** whitened original green pixel plane and checked ZXing no longer decoded it; independently anchored whole-file SHA reconstruction refused. Duplicate Fischer-index and invalid uint32 source-index independently rejected.
- **COUNTERFEIT QR:** actually generated an altered standard QR in the original image's first colour plane, decoded that altered **image pixel** through ZXing, and verified whole-source fixed SHA rejected its coherent new payload.
- **COMPROMISED GROUND TRUTH:** deliberately recomputed both forged content AND attacker-supplied *supposed* ground-truth SHA. The integrity check then **passed**. Therefore **hash-only source provenance is NOT cryptographic origin authentication**. Require independent signed commitment/trust root to address this. No evidence of Ed25519 signed origin or blind physical source challenge is provided by this test.

## Cross-platform scientific hash and transparent correction

Initial hosted Seat2 [run 38740708431](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38740708431) passed both jobs, but full Seat2 receipts differed in **only two `zip_sha256` fields** for locally repacked ZIP files. Recursive comparison of downloaded JSON receipts confirmed no scientific field diverged:
- Ubuntu original independent receipt SHA256 `9920698cbe0361003f3c46a0a0958d507100a0e8d5c1de7b276595cfa4038595`
- Windows original independent receipt SHA256 `c7bdfdb42c1ca35d94d20c636493b8254cee32ba04009da65efa0b4e89144a56`.

After append-only correction prereg, separated transport ZIP hash to `seat2-transport-manifest.json`, not canonical science JSON, while preserving all underlying PNG/row/source SHA measurements. Final hosted Seat2 [run 38741447733](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38741447733) passed 2/2 and **both independently downloaded canonical `seat2-independent-result.json` files are BYTE-IDENTICAL**, **6,444 bytes**, SHA256:

`eeefd8e355788e762f18744604ac2635464cf80a1f197bee92261071d2c38c46`

Downloaded new independent receipt artifact IDs: Ubuntu **11975692894**, Windows **11975018676**. The per-OS local repacked ZIP SHA256 remains separately preserved in the transport manifest (runner-specific, not the signed source artifact digest). The original producer's artifacts remain separately available from its own run.

## Scientific interpretation and non-promotions

**Verified:** reproducible indexed digital RGB pixel decoding with a *different* QR algorithm; independently reconstructed source bytes; full canonical ground-truth packet ledger; different-OS reproduction; independently constructed actual software adversarial packet checks; deterministic ternary/source math; fail-closed against tested *outsider digital packet* modifications while trusted source anchor remains fixed.

**Not established:** physical light-bank hardware storage/retention, direct camera-to-screen transmission, quantum device advantage, optogenetic tissue/control, signable trusted source origin, real network privilege enforcement, autonomous sentient AI, real cross-host 3-machine physical challenge. Also OpenCV interoperability at the current 555px image size is **15/32**, so broad decoder compatibility has NOT been demonstrated. The toy binary photocycle threshold does not distinguish PULSE vs CONTINUOUS. A SHA256 value is not itself a digital signature.

**Handoff:** Room02 Seat2 [Issue #57](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/57); Coordinator [#55](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/55). Request *Seat4 #59* adversarial peer review of forged anchor, trust-root, source commitment and HBP evidence limitations before merging any experimental source. PR77 remains DRAFT. No historical stones modified.

**Reviewer disposition:** `SEAT2_DIGITAL_PROVENANCE_PASS_WITH_LIMITATIONS`, not `PHYSICAL_LIGHT_MEMORY_PASS`.
