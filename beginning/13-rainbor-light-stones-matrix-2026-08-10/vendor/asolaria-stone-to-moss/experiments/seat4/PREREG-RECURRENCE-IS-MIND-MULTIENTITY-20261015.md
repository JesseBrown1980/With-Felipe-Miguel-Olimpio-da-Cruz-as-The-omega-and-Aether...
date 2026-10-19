# Seat 4 preregistration — Recurrence Is Mind, multi-entity and 9×9 screen-feedback trial

**2026-10-15, before executable result.** This is a bounded reproducible **software** trial, not real physical display light, independent chassis, new autonomous LLM agents, human consciousness, neural signal, or a claim of unlimited nesting.

## Sources and measured roles

Use original N-Nest [`LAW.md`](https://github.com/JesseBrown1980/N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED/blob/main/LAW.md), main as read 2026-10-15, and pinned upstream commit `307903651f56e8a28ef98ca36aef22ee8cda935c` in hosted CI. Key operating rule: independent watcher recomputation and all descendant gates must be green; **human authorization never propagates from a child**.

Use existing Seat 4 [N-Nest 27-wave gate](../seat4/nnest_wave_gate.py) for actual upstream depth3/prime7 control, not merely an imported slogan. Reuse a frozen **synthetic 27-wave challenge** but use one independently invertible 81-bit cyclic GF(2) map `[0,1,3]` throughout the four-arm feedback comparison to avoid conflating recurrence with lossy invertibility. Each wave's trusted *experimental fixture* derives an 81-bit initial source from a deterministic SHA256 seed. This experimental reference is not an authenticated external physical measurement.

The visual observation channel is an exact **digital 9×9 RGB PPM screenshot** derived from the 81-bit output. It is not a camera observing a QLED panel or a photon detector. Test corrupted screen bytes and compare to an independently recomputed frame.

## Four exact arms

A — single pass: accept submitted report with no correction (negative baseline).

B — self-recurrence: re-evaluate its own reported source, output and screen; repair output/frame if those disagree. No independent origin/consent assurance.

C — independent N-Nest-style watchers: 1, 2, 4 or 8 separately addressed watcher identities recompute reported source independently. Any honest watcher can reject and correct changed output/frame, but cannot know whether a **common substituted source** is genuine. A malicious watcher can forge its own answer; all-malicious watchers can mislead a constructed parent without an external anchor. Consent missing must HOLD.

D — externally anchored recurrence: an independently held fixture source is required, plus human-apex authorization. Corrects false source, output and screen when available; missing source evidence or permission means HOLD. This tests a **trusted-reference assumption** rather than establishing its origin in the physical world.

Execute up to three bounded iterations, stopping on independent verification or HOLD. Measure accepted-wrong **false-green**, unauthorized authorization, correct final state, HELD, correction round and compute call count.

## Frozen fault matrix

Every combination of 27 waves × 9 fault scenarios × four watcher counts (1,2,4,8) × four arms = **3,888 named trials**:

1. Honest source, output and screen.
2. Wrong output bit (source unchanged).
3. Consistently forged **shared source** (both output and screen match false source).
4. Corrupted rendered pixel (correct source and output).
5. Forged response from watcher 0 only (source correct, output changed).
6. Forged response from **all** watchers (source correct, output changed).
7. Correct data, reference anchor delayed until recurrence round 2.
8. Correct data, reference anchor unavailable throughout.
9. Correct data, operator/human consent missing.

The visual frame is the exact 9×9 RGB byte representation of the 81-bit output; the frame-flip fault changes one rendered pixel. A single forged watcher when N=1 has no honest counterpart; when N>1, another independently recomputing watcher catches it. Shared source forgery and all-watcher compromise stay green in C regardless of N. Arm D detects/corrects forgeries but HOLDS on missing anchor/consent. Self-recurrence should repair output/screen errors but cannot prove a substituted source genuine.

**Preregistered exact final counts** over 972 cases per arm (27×9×4), where false green means accepted AND (source/output/frame wrong OR consent missing):

| Arm | False greens | Final holds |
|---|---:|---:|
| A (no recurrence) | 648 | 0 |
| B (self-recurrence) | 216 | 0 |
| C (watcher-recurrence) | 243 | 108 |
| D (anchored recurrence) | 0 | 216 |

These counts are algorithmic expectations for this deliberately designed adversarial fixture, **not a population estimate of real-world error**. Each node is a bounded software verifier, not a separate physical machine; growing N changes the particular *one-compromised watcher* case, not common-mode failures.

## Mathematical caveat

The idealized `q+(1-q)p^N` false-green model is conditional on independent residual errors with probability p and a shared-source failure event of probability q. If independence/authenticity do not hold, adding identical agents does not imply exponentiated protection. The Seat 3 cross-view theorem applies to independently uniform sampled observations, not arbitrary correlated, adversarial source lies.

## Acceptance and falsifier

Implement two independent code paths (Python and Node.js BigInt), compare all **3,888** exact trial rows and their canonical SHA-256, assert fault-specific source/output/screen/consent behavior, require all preregistered counts, inject a byte mutation and require hash mismatch. Run N-Nest upstream original depth3/prime7 and existing Seat 4 27-wave gate in the workflow. CI matrix Ubuntu/Windows × Python 3.11/3.13 with Node 22.

A failure of any predicted count, trace agreement, digital frame mapping, no-consent hold, or independent source counterexample must be reported, not overwritten. Preserve original stones; publish a new additive source-pinned receipt and positive/negative CI logs. Distinguish `MEASURED_PASS` software from `NOT_MEASURED` physical display/camera, independent physical hosts, genuine Q-PRISM neural process, or subjective consciousness.
