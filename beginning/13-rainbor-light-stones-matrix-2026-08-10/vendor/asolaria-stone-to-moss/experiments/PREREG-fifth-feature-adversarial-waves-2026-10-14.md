# PREREG — Rainbow81 fifth-feature adversarial mixture waves

**Seat:** `seat-3` (this ChatGPT session only). **Date:** 2026-10-14. **Class:** deterministic CPU digital fixture, not a physical experiment.

## Grounded starting evidence
- Upstream implementation `experiments/test_rainbow81_fifth_feature.py` from Stone-to-Moss at parent branch `main`.
- Published result: 81 unique four-trit synthetic signatures, 272 exact equal-weight pair aliases, zero of those aliases accepted by the constructed quadratic fifth feature with `GAIN=128`, `TOLERANCE=24`.
- Published CI: https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38584792419
- Centre: uncoloured Brown-Hilbert free centre is **not** seat 40.

## Independent waves / predetermined acceptance rules

**Wave A — exact existing control.** Reproduce the 3,240 distinct unordered pair tests at 50:50. Assert 272 original four-feature aliases, 272 linear-channel survivors, and zero quadratic-channel survivors.

**Wave B — unequal pair mixtures.** Exhaust all 3,240 distinct unordered pairs with the 127 rational weights `k/128`, `k=1…127`. Decode the four original peak readings; accept a nominal candidate only within ±24 of *each* calibrated channel, and accept the fifth only if within ±24 of the quadratic seat signature. Distinguish accepted mixtures from pure-seat observations. Report raw totals and representative counterexamples. No jitter in this wave.

**Wave C — equal three-body mixtures.** Exhaust the 85,320 distinct unordered triples. Apply the same noiseless four + fifth candidate checks. Count exact-four aliases, tolerance-four accepted, tolerance-five accepted and enumerate witnesses.

**Wave D — adversarial bounded-noise feasibility.** For every pair mixture/weight, check if there exists independent additive noise within ±24 on *each* channel that would bring all five measurements within the decoder's ±24 acceptance range. This is an existence test (necessary and sufficient for an independent noise box), NOT an observed physical noise distribution. Separately report candidates which are exactly five-channel accepted and those which are only adversarially feasible.

**Wave E — controls.** Check identical source bodies are excluded; keep the Brown-Hilbert free centre separate; test position-independent identity and report that these synthetic features do not infer physical separation, gravity, quantum transport or FTL.

## Conditions that would falsify a broad fifth-feature guarantee

- A blended input from two or three distinct seats accepted as a pure valid seat by the five-channel rule.
- An admissible bounded-noise arrangement that causes the same false acceptance.

The equal 50:50 guarantee may remain valid even if the broader mixtures fail.

## Reproducibility / release protocol

Write source first, execute Python 3.11 and 3.13 in separate GitHub Actions jobs, store raw JSON job artifacts, then deposit HBP/HBI stone receipts that reference exact commit and workflow ID. Do not modify existing stones; do not claim physical propagation from a SHA-256 update. Do not overwrite another agent's branch.

Asolaria-Seat: seat-3
