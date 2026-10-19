# Seat 3 Room 03 preregistration — exact conserved four-state challenge and controller cost
2026-10-15. **THIS COMMIT PRECEDES ANY NEW B2 IMPLEMENTATION OR OUTPUT.** This is a nonblinded software *new* B2 protocol against a frozen previously published B1 result.

## Coordinator and frozen references

- [Core room draft PR #60](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/60), [Issue #58](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/58), parent [#55](https://github.com/JesseBrown1980/asolaria-stone-to-moss/issues/55).
- Old *unchanged* three-state producer [PR #50](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/50), frozen source commit \`19f21a880d16e84902d157a6d3bc4bcd908dc888\`, full 8,748-wave-snapshot SHA256 \`de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b\`. Seat3 independently reproduced this B1 in [PR #53](https://github.com/JesseBrown1980/asolaria-stone-to-moss/pull/53), [CI #38723250470](https://github.com/JesseBrown1980/asolaria-stone-to-moss/actions/runs/38723250470) 4/4 PASS. Do not reclassify 8,748 B1 snapshots as 960 B2 samples.
- Biological *structure only* (not coefficients) motivated by [ChR2 branched four-state cycle](https://pmc.ncbi.nlm.nih.gov/articles/PMC8204341/) and [empirically-derived ChR2 computational model](https://pmc.ncbi.nlm.nih.gov/articles/PMC3772068/). The state diagram includes two closed C1,C2 and two distinct conducting states O1,O2 with different conductances.
- The parameters, pulse duration and arbitrary current units below are **declared synthetic integers** not fitted irradiance, voltage or ionic currents. No real biological response or empirical prediction is claimed.

## Exact conservation and positivity — mathematical gate

Use Q=1_000_000 molecules **per stable symbolic identity**. For B1, C+O+R=Q with instantaneous flows \`a=floor(300000*C/Q)\` if light else zero, \`b=floor(60000*O/Q)\`, \`d=floor(25000*R/Q)\`. Update simultaneously: \`C'=C-a+d\`, \`O'=O+a-b\`, \`R'=R+b-d\`. For 0<=rates<=Q, every outgoing stream is <= its source, and total is conserved exactly in integer arithmetic.

For B2 new 4-state model, tuple order \`(C1,O1,O2,C2)\`, initially \`(Q,0,0,0)\`. At *each tick* from the frozen prior state and light input L in {0,1}:
\`\`\`
a  = floor(C1*(300000 if L else 0)/Q)        # C1 -> O1
b  = floor(C2*( 60000 if L else 0)/Q)        # C2 -> O2
d1 = floor(O1*45000/Q)                       # O1 -> C1
d2 = floor(O2*45000/Q)                       # O2 -> C2
x  = floor(O1*(100000 if L else 20000)/Q)    # O1 -> O2
y  = floor(O2*20000/Q)                       # O2 -> O1
r  = floor(C2*25000/Q)                       # C2 -> C1
C1' = C1-a+d1+r
O1' = O1+a-d1-x+y
O2' = O2+b+x-d2-y
C2' = C2+d2-b-r
\`\`\`
All outbound source rate **sums** <= Q (C1 300000, O1 145000, O2 65000, C2 85000). Therefore no source can go negative; equality \`C1'+O1'+O2'+C2'=Q\` exact, including floor effects. Fixed symbolic conductance weights \`g1=1, g2=1/4\` at fixed **assumed** driving-force 1; \`I_proxy = O1 + floor(O2/4)\`, \`open_total=O1+O2\`. B1 \`I_proxy=O\`. This *is not actual electrical current in amperes*.

**Key algebraic non-identifiability witness:** states \`(C1=750000,O1=250000,O2=0,C2=0)\` and \`(C1=750000,O1=0,O2=250000,C2=0)\` have identical \`open_total=250000\`, yet proxy currents \`250000\` and \`62500\`. A B1-style measurement using only O_total and one fixed open-state conductance cannot distinguish these compositions; this does NOT prove every three-state photocycle is insufficient for every observable.

## Frozen pulse protocols — no observed-data fitting

All source identities are 81 immutable symbolic IDs \`id=0..80\` (not physical molecules), all B2 from the same initial state per independently reset protocol. Run both B1 and B2 for **240 ticks** each on five protocols:
- \`continuous\`: light ON ticks 1..160, OFF 161..240.
- \`pair_gap_5\`, \`pair_gap_20\`, \`pair_gap_60\`: first pulse ON 1..20, gap of g OFF ticks 21..20+g, second ON ticks 21+g..40+g, OFF otherwise.
- \`dark\`: always OFF.
For **every tick** record C/O/R for B1, C1/O1/O2/C2 for B2, both open totals and currents; 5 protocols × 2 models × 240 ticks = **2,400 exact tick records**, one model state per full 81-identity-equivalent cohort (81 identical copies under a uniform pulse; state is not per-host physical sensor). Each model cohort's 81 identities are checked invariant, but the canonical trace records one shared *cohort state* per tick rather than 81 identical redundant rows.

Measure continuous-window \`max(I_proxy(t),1<=t<=80)\`, plateau mean \`sum I_proxy(t=141..160)/20\`, and signed peak-minus-plateau numerator \`20*peak - sum plateau\` (no floating approximations). For pair protocols record first post-on tick (t=1), second post-on tick (t=21+g), immediate pre-second tick and second 20-tick peak. Report comparisons without assuming all three-state responses are unadaptive or that longer gap must improve every metric.

## Honest/corrupt controls and autonomy

For every tick, producer and **independent prior-state watcher** must recompute B2 transitions; compare full tuple, claimed persistent ID, prior-state digest and frozen light bit. Inject and HOLD:
1. mass-conserving shift C1->O1 (+1) on an actual correctly computed report;
2. stable ID replaced with different ID;
3. light command relabeled versus frozen schedule;
4. \`k1\` altered by +1 on the emitted claimed transition (ensure fixture chosen where it actually changes output);
5. stale prior-tick report;
6. current_proxy tampered while full state is unchanged;
7. a report with same \`O1+O2\` but altered O1/O2 conductance mixture.
A coherent fake source fed to *both* reporter and local watcher may be math-green but MUST have \`origin_authenticated=false\`; separately locked light schedule rejects it. No human-per-tick prompts or live external privileges. Cooperative HALT before 73rd continuous tick must hold, an invalid resume must remain blocked, and an authorized synthetic resume must reproduce the uninterrupted final digest. This is a deterministic boolean consent fixture, not an authenticated human or actual preemptive operating-system interrupt.

## Fixed controller-budget challenge (B1 only; don't compare unmatched models)

Use exactly producer's B1 model and 81 IDs; exploit *proved* symmetry of three groups id%3 (27 identical copies each) for search, multiply errors and light commands by 27. The controller must know only wave number and within-wave tick, not any future hidden observation.

- Search class: open-loop periodic schedules using \`period P ∈ {3,4,6,8,10,12,16}\`, \`on_count D in {0..P}\`, and \`phase F in {0..P-1}\`. When a channel belongs to the *predeclared* targeted group in wave w, \`L=1\` iff \`(tick+F)%P < D\`; untargeted always OFF. Exactly **684 candidate policies**. If P=3,D=0 has multiple phases, preserve deterministic lexical tiebreak \`(P,D,F)\`.
- Controller family is frozen before observing optimization outputs; *no search beyond this predefined family*. Choose best **on training waves 0..17** for each lambda in \`{0,100000,221240,300000}\`, minimizing \`J_train=error_train + lambda*commands_train\` with exact integers and tiebreak (P,D,F). Holdout is **waves 18..26**, evaluated continuously from same initial population and chosen policy (no resets at train/test boundary). Label as deterministic wave split, **not an independent measured biological validation**.
- Evaluate the original fixed open-loop \`(P=12,D=4,F=0)\`, original truthful feedback \`O_prior<400000\`, and the training-chosen policies using *the identical train/holdout wave split*. Report per-lambda holdout E,C,J and winner; do not assume feedback beats optimized open-loop. Use 3×27 copies symmetry and cross-check B1 original 27-wave totals = \`openloop E=5878733220, C=11664\`, \`feedback E=4516776378,C=17820\` and original crossover \`8407141/38\`.
- No tuning based on holdout outcomes or mutation case results; no claims of general optimal control outside the finite candidate set.

## Independent code, CI and limits

Independently authored Python tuple-loop and Node22 indexed-array/BigInt-compatible integer algorithms must replay **entire 2,400-tick photocycle HBP** and the **684 candidate policy training/holdout summaries**, emit identical canonical ASCII HBP and JSON metrics, output full SHA256 sidecars plus HBI, reject altered bytes. Four hosted Ubuntu/Windows × Python3.11/3.13 Node22 jobs; preserve full HBP/HBI/JSON as artifacts. Preregistered predictions are conservation, bounds, dark null, witness current inequality, all controls HELD, reference replay, and no operator prompts; **no numerical four-state peak or optimized policy winner was predetermined**. Publish unexpected results as failures rather than rewriting coefficients.

This is a **finite deterministic, source-locked synthetic software model**. NOT optical photon measurement, calcium transport, real membrane voltage/current, living neuron, fitted channelrhodopsin, consciousness, quantum QLED sensing, independently attested physical hosts, HTTP-zero Wasm agents or verified improved human outcomes. No historical stones modified, no physical challenge, no paid Hugging Face Jobs, no merge before peer review. Only new external permissions require separate operator authorization; molecule/tick operations are autonomous.
