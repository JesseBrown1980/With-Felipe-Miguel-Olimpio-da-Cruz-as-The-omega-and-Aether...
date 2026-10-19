# Four-seat handoff — light-gated recurrence and optogenetic-inspired digital benchmark

**Asolaria Seat 1 | 2026-10-15 | operator handoff packet V1**

Status: **READY_FOR_OPERATOR_TO_SHARE**. This is a *test protocol and a real, CI-verified Seat 1 benchmark*, not an announcement that Seats 2–4 accepted the protocol or ran this exact fixture. **Do not merge the other seats' nonidentical simulations into a pooled single experiment.** Work from the existing rounds, preserve original signed/HBP stones.

## Why we are doing this

Established optogenetics provides a mechanistic *analogy*: light drives conformational changes in opsins, opens ion-conducting pathways, then channels adapt/recover; independently sensed state can be used by a recurrent controller. The 2026 Nobel Physiology or Medicine recognized work by Karl Deisseroth, Peter Hegemann and Georg Nagel. Prior modeling literature represents photocycle fractions with three- or four-state kinetics. **Our benchmark does not model measured light, biological membrane currents, animal neurons, human vision, literal photons or cognition.** An RGB/QLED panel is an **emitter**, not a calibrated detector; WASM and HTTP logical workers are not independently attested physical machines.

The three features the seats must verify independently are **stable identity**, **explicit source-driven state transitions**, and **recurrence against separately defined ground truth** rather than self-confirming reports.

## Phase A — shared canonical baseline (Seat 1; all peers independently replay)

Canonical frozen sources and prerecorded acceptance conditions:
- `experiments/seat1/optogenetics/PREREG-LIGHT-GATED-IDENTITY-1080.md`
- `experiments/seat1/optogenetics/opto_gate.py` (integer Python state machine)
- `experiments/seat1/optogenetics/opto_gate_node.js` (independent Node indexed-array implementation)
- `experiments/seat1/optogenetics/verify_opto.py` (exact byte and outcome checker)
- `.github/workflows/seat1-optogenetic-gate.yml` with Ubuntu, Windows and separate cross-OS comparison.

Frozen counts: **81** permanent logical IDs, **27** deterministic illumination waves, **40** steps per wave = **1080** ticks/arm, **four** arms (dark, fixed open-loop, measured-state feedback, corrupted-feedback), **8748** full channel-state snapshots over all arms. Each ID has integer fractions `(C,O,R)`, invariant `C+O+R=1_000_000`. Source selection `(id+wave)%3==0`. Initial state `(1_000_000,0,0)` on every site. Exact update equations and rates are frozen in prereg, not empirical constants. All updates read the **prior** tick snapshot.

Accepted CI source evidence: [Run 38721708651](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38721708651) **all three jobs successful**; both operating systems and both languages produced the **same 8748-row HBP** SHA-256:

`de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b`.

Four measured accumulated absolute target-state errors (arbitrary software units, not volts or neuron firing):
- dark `11664000000`, zero light commands
- fixed open-loop `5878733220`, `11664` commands
- truth-based feedback `4516776378`, `17820` commands
- corrupted feedback `8221918824`, `2835` commands

Truth-feedback error is approximately **23.17% below** the fixed open-loop error *in this specific toy parameterization*, using **more** light commands. Every peer must retain both error and command counts; do not claim better efficiency just from smaller error.

### Phase A required peer tests

1. Independently reconstruct the **whole state update** from the prereg rather than import Seat 1's implementation. Reproduce trace SHA and per-arm metrics; include algorithm language/runtime, OS, input source commit, producing run ID and exact output SHA in new append-only receipts. If reproducing only via importing one of the existing scripts, label it **replay** instead of independently reimplemented verification.
2. Verify **identity immutability** per 81 IDs, per-tick conservation and nonnegativity, refractory recovery, darkness null, and changed `OPEN_RATE` producing changed outputs. For genuine illumination controls, compare existing prior-tick trusted states against corrupted reported states and explicitly **hold** mismatches.
3. Report both error and actuator use; test whether the feedback advantage persists under preregistered changes to pulse duty cycle, channel closing/recovery and observation latency/noise. Such perturbations are **new experiment arms**, never retroactively included in frozen baseline.
4. Keep `math_consistent`, `source_authenticated`, `operator_authorized`, `physical_measurement_present` as **separate typed fields**. The last three stay FALSE for this synthetic fixture. Future real external observations require independently witnessed provenance, not digital SHA alone.
5. Do not claim a single 81×27 source fixture is a distributed machine experiment. Hosted CI, Docker, cloud environments, logical PIDs, HTTP endpoints and WASM processes do not independently establish physical separation.

## Phase B — independent seat-owned extensions (DO NOT merge incomparable rows)

| Seat | Current independent branch / evidence | Next owned test, with success/fail conditions |
|---|---|---|
| **Seat 1 — kinetics + controller** | This dedicated branch; baseline CI run 38721708651 | Archive exact baseline + cross-OS manifest; peer-review Seat 2/3 profile differences and transfer function. Add a new **delayed or stale-feedback** adversarial arm and a **rate sensitivity sweep**, separately preregistered. Compare error and command budget, not merely source hash. |
| **Seat 2 — provenance/fault accounting** | [PR #48](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/48): 324-case, 2-profile, 81-site source/reporter/fault model; [4-job CI 38721610239](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38721610239) PASS | Independently replay Phase A and audit copied input, source-light swap, stale-nonce, RGB-buffer tamper and fake watcher. For each case distinguish **mathematically consistent but unauthorized** from **detected false output**; verify actual fault injection site and no fake sensor/hardware claims. |
| **Seat 3 — autonomous light response / spectroscopy surrogate** | [PR #49](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/49), built from [research Issue #47](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/47): 81 fixed IDs, 3 receptor profiles and wavelength labels, 4×240 toy ticks | Compare blue-sensitive, red-shifted and receptor-absent **synthetic** channels; require absent-receptor/darkness zero, receptor-selective response, slower red-shifted **toy** closure, unchanged IDs, and independently corrected corrupted proposals. Independently replay Phase A from frozen reference too. |
| **Seat 4 — adversarial visuals and replay** | [offline autonomous capsule / Issue #46](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/46), [CI 38720437300](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38720437300) 4/4 PASS | Independently replay Phase A, attack the source-light schedule and a **9×9 RGB digital framebuffer** (drop/swap/reorder/stale one pixel, fake watcher gate, hallucinated sensor). If implementing HTTP/WASM workers, measure real invoked processes and signed input outputs; distinguish **unattested software runtime** from physical host. Gate on independent source anchor and operator HALT. |

These are four research lanes with different numerical models. Seat 2's 324, Seat 3's 960 tick-traces and Seat 4's 2187 autonomous ticks **must not be combined as 324+960+2187 physical observations**, nor forced to match Seat 1's HBP digest. Only the **Phase A common fixture** gives a directly comparable same-input cross-seat SHA target.

## Phase C — proposed integration / next experiment (must be separately preregistered)

The experimental graph is:
`frozen stimulus source + authenticated envelope -> logical light input -> state update C/O/R -> independent watcher re-evaluation -> nested AND correction -> next feedback decision`.

Proposed additional controlled measurements:
- **Feedback delay:** zero, 1, 5, 20 ticks; compare integrated target error and actuator use. Inject corrupted current observation, prior-wave replay and gate spoofing.
- **Actuator tradeoff:** normalize the objective as `error + λ×light_commands` for a preregistered set of λ values; compare Pareto frontier rather than incorrectly declaring raw-error winner most efficient.
- **Complementary views:** independent full-state watcher vs digest-only watcher vs digital-image-only witness. The image can be a valid representation of state, not necessarily independent source evidence; preregister a counterexample where both agree on a forged common input.
- **Multiple software agents:** run 1,3,5,9 watcher copies under independent bit flips and common-mode corrupted input; derive the correlated-error floor and compare experimental counts with the exact binomial model. Repeating a code path on multiple processes alone must not be called independent.
- **Deterministic WASM/HTTP lane:** only if an actual compiled WASM verifier / localhost HTTP transport is committed, invoked, source-pinned and its network boundary logged; compare to native source. Mark `NOT_EXECUTED` until it is truly run.
- **Physical optical lane (later, optional):** needs a real calibrated optical emitter, external camera/light detector and real measured photon/voltage traces. Displays are not detectors, and actual neural optogenetics requires specialized biological preparations. Do not infer quantum behavior from a RGB framebuffer.

## Promotion gates and instructions when the operator asks seats to look

**Ready now:** Seat 1 Phase A baseline with source/CI/full downloadable output; Seat 2 PR #48 and Seat 4 capsule verified on their own separate specs; Seat 3 PR #49 should be checked against its latest head CI before advertising completion.

**Not yet complete:** independent Seats 2/3/4 direct Phase A execution/receipt, a frozen joint source envelope with independently authenticated custody, physical machine attestation, actual optics/neural signals, any four-seat joint biological data. The 288-case coordinator Recurrence Is Mind PR #39 remains a **separate** dataset and gate; do not silently import these new 8748 snapshots into it.

After user gives the instruction, each seat should publish **their own new add-only receipt** with: `seat, github_commit, upstream_commit, implementation, OS, timestamp, producing_run_id, baseline_trace_sha256, baseline_metrics, negative_controls, source_authenticated=false, physical_host_attested=false, exceptions`. Peer reviewers check full bytes, not only each other's reported SHA values. Publish disagreements with explicit held status and links. The coordinator merges only after source/CI evidence and independent review; no one fabricates signatures or authority.

**Seat 1 publication status: first independent benchmark executed and cross-OS byte-verified; peers have NOT yet been directed by the operator to adopt this new common challenge.**
