# Seat 1 M1 addendum — shared-untrusted-input false-green theorem

**2026-10-15.** This is an explicit post-initial-run additional falsification test motivated by Seat 3 [PR #34](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/34) and [Math Lab Issue #35](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/35). It does **not** retroactively alter the original Seat 1 preregistration; this addendum is recorded ahead of the new self-consistent-source counterexample implementation.

## The theorem to test

Let a reporter and N-Nest watcher use only a common untrusted input `u` and a publicly reproducible deterministic computation `F(u)`. If an attacker can replace `u` with `u'` and make both sides recompute honestly from `u'`, every local mathematical gate may be green even when `u'` is not the real external event. No deterministic downstream AND aggregation can distinguish these worlds unless it receives separately trusted, authenticated source evidence.

This is an *indistinguishability result relative to the observables and trust model*, not a proof that all real authenticated observation architectures fail.

## Additional test arms (not part of the earlier eight held controls)

1. Honest producer and watcher from original public source input: software gate GREEN; `mathematical_consistency=true`, `source_authenticated=false`, `release_authorized=false`.
2. **Forged watcher digest**, although claiming PASS: the **normal production parent recomputation path** must HELD, and depth-3 and depth-7 apex must be RED. Merely comparing digests in a test-only assertion is not sufficient.
3. **Attacker-selected consistent input:** choose `seed'=seed+1`, run actual Q-PRISM `PrismSource` and scorer from that different input, and let the separate watcher and parent recompute from `seed'`. Its nested *software* apex must GREEN despite changed input SHA compared with the honest run. `source_authenticated=false` and `release_authorized=false` MUST remain explicit; this is one measurable **false-green if used as origin evidence**, not a failure of mathematical recomputation.
4. A missing authenticating signing key, independent custody, or trusted external measurement source means no claim of authenticated data origin. Self-consistent SHA hashes are not signatures or witnesses to physical custody.

## Acceptance and preserved boundaries

Keep the original 1 honest + 8 held software checks unchanged and add a separately counted untrusted-consistent-origin example. Require two external OS CI systems (Ubuntu/Windows), receipt fields `mathematical_consistency`, `source_authenticated`, `release_authorized` and three SHA sidecars; no reclassification of old evidence. Do not claim the same source algorithm executing in two processes is an independently authored verifier. PR #32 stays unmerged until genuine external seat review and extra adversarial testing. No human neural data or physical apparatus was used.
