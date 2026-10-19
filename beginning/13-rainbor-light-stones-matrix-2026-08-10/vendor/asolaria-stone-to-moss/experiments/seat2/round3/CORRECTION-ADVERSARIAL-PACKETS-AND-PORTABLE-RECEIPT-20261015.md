# Seat 2 — append-only independent packet construction and portable-receipt correction

**2026-10-15; recorded before implementation changes.** Follow original [Seat2 prereg](PREREG-RGB-PROVENANCE-20261015.md) commit `f1c8c4353cf7689bdbc71fcb96baae374cd164a9`.

## First independent result — preserved, not rewritten

[First independent run 38740708431](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38740708431) **both Ubuntu and Windows hosted jobs PASS**. ZXing-C++ 32/32 actual QR pixel reads per run, 65,536 synthetic bytes exact, HBP 52,488/52,488 rows exact with independent reconstructed fixture and gate truth, OpenCV4.13 only 15/32 exact at 555px on both jobs, real reencoded counterfeit PNG QR rejected against frozen source SHA. Both jobs demonstrated the vulnerability `attacker_payload + attacker_selected_sha256` passing a hash-only integrity check. Original entire independent Seat2 results SHA: Ubuntu `9920698cbe0361003f3c46a0a0958d507100a0e8d5c1de7b276595cfa4038595`, Windows `c7bdfdb42c1ca35d94d20c636493b8254cee32ba04009da65efa0b4e89144a56`. **After actually downloading both outputs and recursive JSON diff, ONLY two SHA256 values over locally *repacked* ZIP containers differed.** Published producer's canonical results/hbp/raw RGB pixel fields matched.

## Identified fault-evidence boundary

The producer's `cases.hbp` only carries wave/address/PID/gate/illumination/fault/emit/verdict/lane/**honest source block SHA**. It does **not** include the actual altered attacker packet body, attacker-supplied digest, altered sequence, altered origin or forged lane. Independent Seat2 row validation confirms all **printed verdicts** and recomputed ground truth, but **cannot independently prove those attack bytes were actually constructed** using this ledger alone.

## Extended preregistered falsifier

Using the published independently reconstructed 65,536-byte fixture and the already independently recomputed toy photocycle gates, construct and evaluate new actual digital packet dictionaries for every gated wave/address/model/mode:
- **CLEAN:** honest body, source-bound digest, sequence, immutable PID, boat origin and mathematically seeded 0/1/2 lane. Accept iff gate open.
- **CORRUPT:** mutate body first byte, calculate a *new matching claimed packet digest*, demand source anchored digest still rejects when gate open. This tests *coherent copy/compromised reporter*, not only unintentional transmission noise.
- **STALE:** alter the sequence to a prior step, require reject.
- **FORGED:** alter the origin boat ID and preserve other fields, require reject.
- **FALSE_ROUTE:** alter the lane to the next of 3 alternatives, then co-alter boat origin if necessary, require reject anchored to a recomputed Born pseudo-lane. Run one extra false-route packet per **open** gate case; 8,748 expected held.
- Check the new injected negative controls independently in its own packet verifier; record **separate counts**. This is not an independent process/device security sandbox and cannot prove the coordinator itself injected all the reported historical faults.
- Demonstrate that if the **external source anchor is attacker-controlled** and attacker mutates BOTH payload and trusted reference SHA, a hash-only verifier will pass; record as intrinsic lack of third-party signed source authentication.

## Portable receipts

The original first Seat2 run output included `zip_sha256` for artifacts **repacked by the Seat2 CI runner**; ZIP ZIP metadata can differ across hosts while the underlying artifact files are byte-identical. Keep runner-specific repacked ZIP SHA256 in `seat2-transport-manifest.json`, **not the canonical `seat2-independent-result.json`**, so the canonical receipt is bit-identical if scientific results match. Do not claim the repacked ZIP's SHA256 was the publisher's original cryptographic checksum. Preserve first run and first differing JSON receipts in this correction document and link them alongside final results.

Acceptance: new Ubuntu & Windows hosted CI must run all generated packets and **all 52,488 previous validations**; the new cross-platform canonical result JSON must match byte exact. Any open fraudulent packet accepted => FAIL; any loss of existing 32 QR, source SHA, HBP SHA, pixel parity, independent routed lane/counterfactual tests => FAIL. No claim of true biological photocycles, clinical intervention, physical photons, independent hardware or cryptographically signed provenance.
