# Seat 1 Round 2 — executed computational evidence and unresolved gates

**2026-10-15 · Seat 1 producer, software-only, draft review**  
**Work order:** #56 · **Coordinator:** #55 · **Room charter:** PR #60 · **Draft PR:** #64  
**Prerequisite prereg:** commit `6cb3139d84f380b28d8c12387e84e08548fb69ce` committed **before** implementations or observed outputs. Rates and protocol frozen there. This is Phase B; **do not add B counts to Phase A**. All 81 identity trajectories start from the same synthetic C=1,O=R=0 state, so 81 entities are **not 81 independent biological observations**.

## GitHub-hosted evidence

- Hosted workflow **38726804684**: https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38726804684 — **3/3 PASS**, Ubuntu and Windows + exact cross-OS HBP, metrics, sidecars; artifact IDs **11968548403** (Ubuntu), **11968163499** (Windows), **11968038853** (cross-OS manifest).
- Both Python integer transfer and separate Node BigInt recurrences yielded **1,749,600 digital site-tick updates** over 81 fixed IDs × three illumination profiles × six arms × 1200 ticks; **20,412 HBP checkpoint records**. Raw bytes match exactly on Ubuntu, Windows, Python and Node.
- Phase B **HBP SHA-256** `208f26fd23f8da5e032b091f238346b386516669c66f3d6ee9323209eafff566`.
- Frozen PR #50 Phase A **HBP SHA-256** regenerated from original source, unchanged `de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b`; original **8,748** snapshots are NOT mixed with the new snapshot count.
- All 20,412 new checkpoint frames independently validated for positivity, exact `C+O+R=10^9`, identity set and current expression. Python and Node every-tick transition functions validate mass. No per-tick permission prompts; no external privilege granting was tested beyond local simulated guards.
- **Eight actual injected negative cases per runtime**, exercised during pre-actuation or pre-commit checks: wrong source identifier, stale observation, altered occupancy without checksum update, identity substitution, overfull state, duplicate identity, unauthorized publish, and invalid light drive. Rejection stage and reason are saved as `round2-faults.json` in CI. **Coherent forged observation with recomputed checksum is accepted by the test-only verifier and explicitly HELD_UNAUTHENTICATED**, not secure source authentication.
- 10ms vs 20ms synthetic-refinement comparison yielded difference `13,526 / 10^9` in final open-population at 24s, below prereg threshold `10,000,000/10^9`. This is a one-fixture convergence check, **not an established numerical error bound or biological validation**.

## Synthetic feedback comparison (not physical results)

Fixed target O=0.35 during enabled windows, O=0 otherwise. Error is the average absolute open-population fraction across 81 identical synthetic sites and 1,200 ticks. Light cost counts **global ticks with digital light command on**, not energy or physical photons.

| Profile | Command arm | Average | Light-on ticks |
|---|---|---:|---:|
| paired_short (2-second gap) | full open-loop | 0.075728 | 400 |
| paired_short | half-duty open-loop | 0.071865 | 200 |
| paired_short | immediate feedback | 0.063145 | 330 |
| paired_short | 200ms delayed | 0.063874 | 322 |
| paired_short | 2s delayed | 0.069577 | 333 |
| paired_long (8-second gap) | full open-loop | 0.080923 | 400 |
| paired_long | half-duty open-loop | 0.082650 | 200 |
| paired_long | immediate feedback | 0.070072 | 330 |
| paired_long | 200ms delayed | 0.069848 | 322 |
| paired_long | 2s delayed | 0.069185 | 319 |

The ranking **changes with profile**: latency does not uniformly degrade results, so *do not* generalize that immediate feedback always wins. Half-duty open-loop uses fewer commands; no globally optimal controller is established. Source-authentication hold remains. All observed conductance, voltage and light-rate coefficients are invented **synthetic assumptions**, not ChR2 kinetic fits.

## Four-seat next scientific gates

1. **Seat 3 review:** independently rederive discrete flux conservation, inspect the refinement and control-cost frontier; preregister a physically motivated **four-state** C1/O1/O2/C2 challenger with two conducting fractions, compare using explicit held-out observables. Published literature motivates this challenger, but coefficient calibration to actual ChR2 data is a separate requirement. Relevant papers: https://pubmed.ncbi.nlm.nih.gov/19161406/ and https://pmc.ncbi.nlm.nih.gov/articles/PMC8204341/.
2. **Seat 2 provenance:** independently attack the `SOURCE` pin and checksum. A shared-source/watch pair can construct coherent counterfeit frames; this software digest does **not** prove external sensor truth. Specify real trust anchor before any stronger authentication claim.
3. **Seat 4 runtime:** run independent watcher replay with delayed signal and cooperative HALT under bounded autonomy; no external permissions via simulated identity.
4. **Coordinator #55:** verify uploaded artifacts, original/source Git hashes, and nonpooled Phase A vs Phase B; request reviews. Release remains **HELD for peer scientific review, biological calibration, independent source authentication and any real physical/consent gate**. No automatic PR merge, HF upload or claim of photons, actual opsins, neural currents, physics or consciousness.

**Current status: EXECUTED_COMPUTATIONAL / SOURCE_AUTHENTICATION_HELD / PEER_REVIEW_PENDING.**
