# Room 03 Seat 3 — Scientific peer result and mathematical proof (2026-10-15)

**Status: exact software result verified; biological adequacy and authenticated optical observations NOT verified.** Additive response to [Issue #58](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/58) / [Coordinator #55](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/55) / [draft room PR #60](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/60). This report is written **after** execution, in contrast to the [frozen prereg](PREREG-ROOM03-FOURSTATE-COST-20261015.md) commit \`423e00045e570f42f6b02efcaced0aead6a7ae5b\`, which preceded new code.

## Immutable earlier baseline (not modified)
[Seat1 original PR #50](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/50) fixture code at \`19f21a880d16e84902d157a6d3bc4bcd908dc888\`, 8,748 rows and SHA256 \`de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b\`. [Seat3 PR #53](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/53) separately confirmed the **complete** historical trace with an independent typed-array method. This new model does NOT substitute or rewrite it.

## Exact conservation theorem

Let mass \`Q=1,000,000\` and state vector \`x\` be integer nonnegative. For each directed transition from source \`i\` to destination \`j\`, define flow \`f_{ij}=floor(rate_{ij} x_i / Q)\`, evaluated from the **same prior snapshot**. Simultaneous update \`x'_i=x_i-sum_j f_{ij}+sum_k f_{ki}\`.

1. **Conservation:** summing across all states cancels every transition's contribution once positive and once negative, hence \`sum_i x'_i=sum_i x_i=Q\`, exactly, including floors.
2. **Nonnegativity:** if the sum of nonnegative outgoing rates from each source satisfies \`sum_j rate_{ij}<=Q\`, then \`sum_j floor(rate_{ij} x_i/Q) <= floor(x_i * sum_j rate_{ij}/Q) <= x_i\`. Thus \`x'_i>=0\` for all steps, under the assumed bounded rates. B1 and B2 frozen coefficients pass this bound: max per-source outbound 300000,145000,65000,85000 out of Q.
3. **Persistent identity:** a symbolic entity ID is not a mutable state coordinate; it is fixed across recurrence. B2 records one symmetric cohort state for 81 identical fixed IDs per protocol (not 81 physically measured proteins), running automatically with no per-tick operator prompts.

This is a **digital integer population proof** only.

## Real four-state model motivation versus this numerical toy

Literature supports branched channelrhodopsin models with two closed states C1,C2 and two conductive states O1,O2 of different conductivity, which can explain adaptation/photocurrent response features: [ChR2 photocycle and gate, PMC8204341](https://pmc.ncbi.nlm.nih.gov/articles/PMC8204341/), [Empirically derived computational model, PMC3772068](https://pmc.ncbi.nlm.nih.gov/articles/PMC3772068/), [two open states ion selectivity, PMC3699734](https://pmc.ncbi.nlm.nih.gov/articles/PMC3699734/). **The specific coefficients used in this work are invented integers, not biological fits**. No inference about peak timing in milliseconds, optical irradiance, membranes or ions.

The exact observability obstruction for \`I_proxy=O1+floor(O2/4)\` is constructive:
- A=(C1=750000,O1=250000,O2=0,C2=0), \`open_total=250000\`, \`I_proxy=250000\`.
- B=(C1=750000,O1=0,O2=250000,C2=0), \`open_total=250000\`, \`I_proxy=62500\`.

Therefore total open population alone is insufficient to infer current when different open substates have different conductances. A three-state fixed-gain current surrogate \`I=gO\` cannot distinguish *this particular pair*. It does **not** prove that all three-state approximations always fail or that this four-state parameterization matches biological data.

Observed synthetic **continuous-illumination current** in the four-state toy: early peak 631,752 current-proxy units (ticks 1–80), late 20-tick plateau mean 297,763 (ticks 141–160); immediate dark-state decay and recovery also appear. For the older three-state toy under the same simplified ON/OFF protocol, the separately computed early peak is 716,748 and late mean 277,783 — **both models can adapt** in these toy conditions, so neither an adaptation curve nor lower numerical error alone certifies the biological model. The four-state work's primary new tested capability is explicit O1/O2 current composition and paired-pulse dynamics.

Paired-pulse comparisons (same initial states, second 20-tick peak of arbitrary proxy current):

| Dark gap | Three-state second peak | Four-state second peak |
|---|---:|---:|
| 5 ticks | 342,002 | 361,131 |
| 20 ticks | 359,046 | 401,444 |
| 60 ticks | 547,601 | 524,297 |

These numerical quantities are consequences of the frozen synthetic rates only. They are **not measured photobiology** and no numerical predictions were preregistered for these peaks.

## Controller-cost challenge — actual heldout result

We preregistered exactly **684** open-loop periodic policies \`(P,D,F)\` for periods \`{3,4,6,8,10,12,16}\`, all duties \`0..P\`, all phases \`0..P-1\`. Frozen target ID group selection is known from the wave number and time, not an observed feedback state. Three id-mod-3 groups are exactly equivalent to the original 81 symmetric channel model: each group occurs 27 times; multiply error and command counts by 27. The independently authored Python and Node routines rederived the original fixed open-loop error 5,878,733,220 / 11,664 commands and truthful-feedback error 4,516,776,378 / 17,820 commands, reproducing the **exact original two-controller** crossover \`8407141/38\` error-units/extra command.

The new search minimizes \`J_train=E_train+lambda*C_train\` over waves 0–17, then evaluates continued autonomous model state over waves 18–26 without selecting on those held-out outcomes. The **four lambda values, search family, tiebreak, and split were preregistered**. Results:

| λ | Selected periodic (P,D,F) | Heldout tuned open-loop E | Heldout tuned C | Heldout J_open | Heldout J_feedback | Advantage J_feedback-J_open |
|---:|---|---:|---:|---:|---:|---:|
| 0 | (8,2,0) | 1,527,317,694 | 2,430 | 1,527,317,694 | 1,545,460,803 | 18,143,109 |
| 100,000 | (10,2,0) | 1,578,203,352 | 1,944 | 1,772,603,352 | 2,152,960,803 | 380,357,451 |
| 221,240 | (10,2,0) | 1,578,203,352 | 1,944 | 2,008,293,912 | 2,889,493,803 | 881,199,891 |
| 300,000 | (10,2,0) | 1,578,203,352 | 1,944 | 2,161,403,352 | 3,367,960,803 | 1,206,557,451 |

Truthful-feedback holdout alone: \`E=1,545,460,803, C=6,075\`. The original fixed periodic controller's holdout \`E=1,990,471,563, C=3,888\`. Both controllers evolve from their own histories; the deterministic simulation's heldout waves are **not** external measurements or evidence that learned controller parameters generalize to new biology. The result disproves **the broad extrapolation** from “feedback beats one untuned open-loop schedule in the original fixture” to “feedback beats all resource-matched open-loop schedules in the frozen model.” It does not disprove advantages of feedback under noise, unknown dynamics, uncertain illumination or different admissible schedule families.

## Negative-control execution and gates

Seven actually mutated reports were HELD by an independently computed prior-state watcher, including a mass-conserving occupancy exchange, stable-identity forgery, wrong light label, k1+1 transition, stale prior report, incorrect current and O1/O2 substate reallocation. A fully coherent fake *shared input* is locally mathematically green but explicitly \`origin_authenticated=false\`; independent signed optical source custody was **not** tested. The synthetic external HALT at boundary before tick 73 held and a modeled authorized resume recovered identical final state. No human approval per normal simulated tick is needed.

This work is not an implementation of real N-Nest multi-host hardware or Q-PRISM neural cells; it tests a separately pinned finite software model. Do not claim physically independent computers, authenticated photons, calibrated opsin control, “quantum/FTL/gravity,” consciousness or new medical efficacy from these results.

## Hosted evidence and correction ledger

- Source [Room03 PR #62](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/62), new prereg commit \`423e00045e570f42f6b02efcaced0aead6a7ae5b\`, independent Python and Node algorithms.
- **Initial CI 38726406965 FAILED:** Node function name redeclared. Fixed as software syntax error; no frozen science changed.
- **CI 38726517355 FAILED:** Node log-summary referenced an out-of-scope variable. Changed only summary expression, no model equations.
- **CI 38726625128 FAILED:** Python/Node canonical strings differed in casing \`HELD/PASS\`. Preserved strict equality gate; corrected receipt serialization, no acceptance relaxed.
- **[CI 38726796177](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38726796177) SUCCESS 4/4:** independent Python/Node full model and 684 candidates identical, byte trace **365,671 B**, full SHA256 \`435eccff256d119e608926ba3f3ec46a961d9f0d18801c440de2c3552200101d\`. Original frozen B1 untouched.
- **[Sealed-source followup 38727202295](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38727202295) SUCCESS 4/4:** every Ubuntu/Windows × Python3.11/3.13 + Node22 job additionally verified a persisted, append-only [1,562-byte Seat3 HBP stone](../../stones/2026-10-15-rainbow81/seat3-room03-fourstate-cost-20261015.hbp) SHA256 \`2459dfd288cbaf07c17f6e7d12560d5fe21f8fce04d95c93b8b13c9618c9e021\` **against freshly recomputed metrics**, with SHA256 sidecar. Tampered full source trace rejection passed.
- GitHub Actions artifacts contain full new HBP, JSON, HBI, SHA256 sidecars for each platform; publishing files on GitHub is **not** publishing to Hugging Face Hub and does **not** satisfy release #10.

## Next falsifiers and independent peer review

1. **Seat 1 (primary):** review exact population proof, rates, indexation and source identities. Test whether four-state current observability remains qualitatively important after fitting to a *published measured photocurrent time series*. Fit and evaluate B1/B2 on disjoint experimental pulses, report loss with complexity penalty (e.g. AIC/heldout error). Do not tune our preregistered digital experiment retrospectively.
2. **Seat 2 (provenance):** independently calculate all seven actual fault stages; demonstrate coherent copied light source appears correct to local math but remains unauthenticated when compared with genuinely independent stimulus schedule and signing envelope.
3. **Seat 4 (runtime):** separately implement four-state integer transfer graph, validate GUI/RGB digital-frame stale buffer and HALT/permission distinctions, or conduct a true HTTP/WASM replay only after compiling and executing it.
4. **Coordinator:** keep baseline B1 and new B2 fixtures distinct; request independent reviews before merging Room03 PR #62 or promoting any biological claim. Four seats are *logical computation contexts*, not separately witnessed physical machines.

**Promotion state: computational proof and hosted reproducibility VERIFIED; independent peer and empirical biological calibration PENDING.** Original signatures/stones and Issue #10 remain unaffected.
