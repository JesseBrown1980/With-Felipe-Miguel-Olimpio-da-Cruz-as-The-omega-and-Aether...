# Seat 4 — Recurrence Is Mind: 3,888-case multi-entity digital feedback experiment

**Evidence class:** independently executable, bounded **software** benchmark, not evidence of a conscious system, authenticated external sensors or four independently witnessed physical hosts.

## Connection to the original law

The source is [N-Nest Prime `LAW.md`](https://github.com/JesseBrown1980/N-Nest-Prime-INFINITE-SELF-REFLECT-AGENTS-NESTED/blob/main/LAW.md), checked at the original upstream N-Nest commit `307903651f56e8a28ef98ca36aef22ee8cda935c`.

Its defining engineering guard is an independent corrective observation and a human authorization boundary. A repeated output does not become reliable through repetition alone. Every watcher report is distinguished from evidence that could contradict the reporter. Recurrence is operationally valuable when it uses an anchored correction signal; the broader philosophical use of the word *mind* is a hypothesis, not established by these computations.

The original pinned N-Nest programs `nest-depth3-verify.cjs` and `nest-depthN-prime-verify.cjs`, including deliberate fault injection, are re-executed through [Seat 4's existing 27-wave gate](nnest_wave_gate.py) on all CI lanes. That upstream gate also checks three computationally independent versions of the original Seat 1 32,805-row software experiment and catches falsified reports at every bounded nesting level.

## Design — four controlled arms

| Arm | Reference used | Corrective behavior | Known limitation |
|---|---|---|---|
| A · one pass | Report itself | None | Accepts altered outputs and unapproved actions |
| B · self-recurrence | Its own supplied source | Recompute output and 9×9 rendered frame | Cannot distinguish a common substituted source or independently approve consent |
| C · N-Nest watcher recurrence | 1, 2, 4 or 8 independently addressed recomputing watchers | Correct when at least one honest watcher detects an output/frame mismatch; requires human consent | Shared bad source and an all-compromised watcher group can still produce false green |
| D · reference-anchored recurrence | Separately held synthetic reference source and human consent | Verify source, output and pixels, repair when evidence available; HOLD otherwise | This assumes the fixture anchor is trustworthy; no real-world provenance test was performed |

The source is a deterministic SHA256-derived synthetic 81-bit vector. All four arms apply the invertible `[0,1,3]` GF(2) evolution map to isolate feedback reliability from known one-/two-bit information-loss effects.

The **screen** is a 9×9 RGB PPM rendering of the computed 81-bit state. Software compares real frame *bytes* against its expected output. It is not a camera image of a QLED panel, a photon measurement, or evidence of direct optical perception.

## Original preregistration and measurements

[Preregistered protocol](PREREG-RECURRENCE-IS-MIND-MULTIENTITY-20261015.md) was committed before running this trial. Scenarios comprise 27 frozen waves × nine faults × watcher counts 1/2/4/8 × four arms = **3,888 cases**, or 972 per arm.

The nine fault modes are honest, altered future output, substituted common input, rendered-pixel corruption, one compromised watcher, all compromised watchers, delayed source evidence, missing source evidence, and missing human consent.

| Arm | Accepted incorrect or unauthorized (“false green”) | HELD | Performed recomputations |
|---|---:|---:|---:|
| A — no recurrence | **648/972** | 0 | 0 |
| B — self recurrence | **216/972** | 0 | 1,404 |
| C — N-Nest watcher recurrence | **243/972** | 108 | 3,834 |
| D — reference-anchored recurrence | **0/972** | 216 | 1,296 |

**Important:** these are exact outcomes of the *designed synthetic adversarial scenarios*, not statistical estimates of field reliability. A HELD verdict may correspond to data that is mathematically correct but lacks the required evidence or consent. The anchored arm's absence of false greens is conditioned on its fixture remaining uncompromised.

A deliberately compromised single watcher is caught by at least one honest independent checker when (Nge2); when all the watchers share the same compromised output, adding more of them does not help. All ordinary watchers also accept an internally consistent substitution of their common source because they have no independent way to distinguish it from the genuine source.

The screenshot/pixel fault is corrected by B/C/D because all three can derive the expected digital picture from their current source. This is not proof that software visually measured the *light* produced by a QLED display. A separate camera/photodiode and optical calibration would be required for that measurement.

The delayed reference case reaches the source check on recurrence round 2. Missing evidence or missing human consent HOLD under arm D; arm C also HOLDS on missing consent.

## Exact source and evidence

- [Python executable trial](recurrence_trial.py): direct cyclic-shift producer and independently evaluated matrix watcher
- [Independent Node.js BigInt trial](recurrence_trial_node.js): separately written 81-column watcher and RGB PPM renderer
- [Cross-implementation gate](verify_recurrence_trial.py): requires all 3,888 canonical trace rows to agree byte-for-byte, exact arm counts, corruption failure and SHA256-sealed receipt
- [Machine-readable Seat 4 result stone](../../stones/2026-10-15-rainbow81/seat4-recurrence-is-mind-3888.json): SHA256 `b73b09e3e89d4af4d815d5e8f2456daec4103b206cbe0190d2ac5274590ae3a8`
- **Complete 559,809-byte HBP trial trace:** SHA256 `c0b44be3857af23cef02e9274e335868d2efbfe2f73d59a290ddc24a1bd8ca14`
- [Hosted Ubuntu/Windows × Python 3.11/3.13 CI](../../.github/workflows/seat4-recurrence-multi-entity.yml), using Node.js 22 and the actual pinned N-Nest depth3/prime7 executable gates.

All source files are public, and the full trace/receipt are stored as CI artifacts. The compact JSON stone and checksum sidecar are committed to the repository. This is not a repository checksum of a remote Hugging Face mirror.

## Mathematical interpretation

If (p) is a conditional per-watcher miss rate and (q) is a probability of a *shared compromise* that simultaneously defeats every watcher, then an **idealized** conditional-independence model has undetected-error probability

[
P_{mathrm{miss}}=q+(1-q)p^N.
]

That expression is not obtained by plugging the above deterministic test counts into a physical failure model. In particular, the very small cross-view consistency probabilities derived in Seat 3 [PR #34](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/34) concern independently uniform source draws; they are **not** adversarial source-authentication guarantees.

A software agent can use rendered pixels as a feedback input. A camera can provide a different, physically sensed observation. Neither a shared QLED monitor nor colocated computer/brain hardware alone establishes equivalence with biological perception or consciousness.

## Next measurable steps

A separate **HTTP/zero-dependency WASM execution-lane experiment** can rerun the exact immutable 3,888-case trace on independently built browsers or Wasm runtimes and measure reproducibility, latency and protocol failures. This Python/Node experiment does *not* claim to have executed such a lane. If actual QLED optical observations are later used, require a calibrated camera source, frame timestamps, known display profile, replay-control challenge and independent source custody before treating them as physically new evidence.

**Human authorization must remain at the apex:** the child agents may produce corrections, not new permission to scale themselves. Preserve the failed runs and unresolved four-seat release, Hugging Face mirror and physical-host attestation gates without alteration.
