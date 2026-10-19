# Seat 4 adversarial preregistration — N-Nest × Q-PRISM trust-boundary attack

**Preregistered before creating the adversarial executable and obtaining its CI outcome.**

## Exact frozen software sources
- Seat 1 producer's [PR #32](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/32), source branch commit `4e30f2e2d924dba4c0ad21013e8067c61d9b16c8` and `experiments/integration/seat1/upstream_bridge.py` Git blob SHA1 `f8a841db62d84cc0ad369c7cd336fdbdbf161acd`.
- N-Nest `307903651f56e8a28ef98ca36aef22ee8cda935c`; Q-PRISM `b4a21a25381d6920b7aab92c94c3c3e1420fc9e4`.
- Seat 1 source pin contract `experiments/integration/seat1/UPSTREAM-LOCK.json` and its preregistered `proposal_seed=20261015`, `control_arm=prism`, `coupling=0.9`, budget 8 and reference samples 200.

## Predictions and falsifiers to test

1. **Unmodified source/watcher control** using real pinned Q-PRISM code: a valid proposal and a separate live watcher process produce PASS, and constructed depth-3 and depth-7 N-Nest apex verdicts are green.
2. **Mutate a genuine proposal** (selector and SNR), but invoke the original pinned, uncompromised watcher: it must HOLD. If it passes, fail the test.
3. **Replace the watcher subprocess response** with a separate attacker-controlled OS process that returns a self-consistent but untruthful `reported/recomputed` envelope, correct digest fields, `checks=true`, and `verdict=PASS`. Prediction: the current producer's wrapper verifies only the reported hash and nested parent code trusts the supplied booleans; a forged watcher can therefore make a tampered proposal appear green. If the parent rejects it, record that as a stronger defensive result, not a failure to meet a desired exploit.
4. **Fully self-consistent source substitution**: use the actual pinned Q-PRISM package to compute a new proposal under a forged source label/commit passed to the watcher *as data*. Prediction: both source reporter and watcher will agree, and the constructed apex accepts this data unless it independently compares to the genuine Git-backed source lock. The *full producer `run`* obtains its original lock directly; do **not** claim a spoof of that protected path unless it is actually observed.
5. **Coupling/seed substitution**: both reporter and watcher can honestly agree on an unauthorized alternative control configuration; the separately sealed operator policy should reject it.
6. **External trusted anchor**: a separate source-pin and operator-input policy check must reject altered source, altered proposal, forged watcher, and changed seed/coupling. Do **not** claim even a trusted anchor proves physical identity if attacker compromises the anchor itself.
7. **Original fail-closed diagnostics**: a correct source plus an incorrect report must remain a HOLD; no negative-control step may be swallowed with `|| true`.

## Outputs
- A directly executable adversarial verifier (actual pinned upstream Q-PRISM and exact Seat 1 bridge imported; no replacement source implementation).
- At least two cross-OS CI configurations, including `source_blob_sha`, `trusted_anchor_rejects`, `uncompromised_watcher_rejects`, `compromised_watcher_can_self_agree`, `scope`, `falsifier`, `seat=seat-4`.
- One append-only JSON/HBP software stone with SHA sidecars and correction trail. Any acceptance bypass is a **software trust-boundary demonstration, not external signature forgery or physical system intrusion**.

Related to coordination [Issue #29](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/29), producer PR #32 and upstream N-Nest LAW: independently recompute and require human-apex consent. Do not mutate Seat 1's source branch, N-Nest or Q-PRISM, or publish any credential.
