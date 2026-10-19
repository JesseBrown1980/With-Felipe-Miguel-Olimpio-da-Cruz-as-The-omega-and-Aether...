# Coordinator paired-fixture correction to PR #39 (2026-10-15)

This addendum is appended **after** the original preregistration and external peer objections. The historical first protocol is preserved unchanged; it has NOT been executed as a common 288-case four-seat integration test. The original domain seed incorrectly included `arm` for every test RNG, potentially changing the frozen source/fault across arms and invalidating a paired comparison. This is a **correction**, not a claim that older seat-specific 72-case trials are directly comparable.

## V2 paired-randomness specification

- For each frozen `(seat,depth,scenario,case_index)`, compute the common **input/fault** seed `SHA256("ASOLARIA|RIM-PAIR-V2|fixture|" + seat + "|" + depth + "|" + scenario + "|" + case_index)`. This seed MUST omit arm.
- Separately and only for arm-specific algorithm randomness, compute `SHA256("ASOLARIA|RIM-PAIR-V2|internal|" + seat + "|" + depth + "|" + arm + "|" + scenario + "|" + case_index)`. This internal seed cannot change input bytes, ground-truth source, attack location, signed challenge, signal history, or injection phase.
- A coordinator publishes the **same frozen bytes and SHA**, fault-stage/type/location and ground-truth before invoking arms A/B/C/D. Their differing responses are then paired observations. No actual physical signer/host is inferred from common fixture custody.
- `W` compromised watcher is **NOT_APPLICABLE** in arms A/B (no watcher exists); `R` is NOT_APPLICABLE if an arm intentionally has no authenticated replay envelope. `depth=1` has no descendants: descendant failure cannot be scored as exercised. Keep 288 *planned slots* but report exercised, NA and HELD separately; do not treat all 288 as equally security-tested negatives.
- E must specify the **same single insertion** of a post-computation corrupted report bit for each arm. Never compare Seat1's single transient corruption with Seat2's repeated per-round mutation as identical faults.
- `source_authenticated` requires an independently trusted canonical fixture and fresh one-time replay challenge; deterministic public labels are not fresh. `release_authorized` always false in CI absent external owner consent. Autonomous in-budget internal simulation continues without a human at each state transition; external permission expansion and HALT remain separate.

**Publication rule:** Original prereg and earlier CI stones stay unchanged; any true 288-case execution using V2 pairing needs a NEW preregistered run protocol, reproducible source hashes, evidence stone and separate source/custody assertions. This document itself is NOT an executed 288-case receipt. Release #10 remains OPEN.
