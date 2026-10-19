# Seat 1 — Round 2 preregistration: synthetic photocycle rates, current proxy and delayed observation

Status: **PREREGISTERED BEFORE CODE, RUN OR MODEL OUTPUT**. New Phase B experiment; **not** the frozen 81-site Phase A benchmark. This branch starts from exact PR #50 head `19f21a880d16e84902d157a6d3bc4bcd908dc888`; `experiments/seat1/optogenetics/opto_gate.py`, its JS replay, original handoff and existing 8,748-snapshot HBP SHA `de2c346a92e626403cc5c59b9ffa688d050163fbb48ab8b1cb6a4cde795b0a8b` MUST NOT change. Base is PR #50's head rather than `main` to avoid silently losing it while unmerged. This PR targets that base branch, so all Phase B files are new and separately peer-reviewable. Work order #56; coordinator #55; room charter draft PR #60.

## Hypothesis, falsification and scientific level

The 3-state C/O/R mass-action *synthetic* model, informed by the structure but **not** calibrated to ChR2, has nonnegative mass-conserving states for all prescribed pulses and returns toward C in prolonged darkness; open fraction increases after pulse onset, and current proxy tracks O at fixed assumed voltage. Short and long dark interpulse gaps can alter second-pulse responses. Delayed/stale feedback will **not necessarily be better** than even an optimized open-loop candidate. A 4-state C1/O1/O2/C2 challenger is **reserved** for independent preregistration/review by Seat 3, without inventing empirical parameter values.

Scientific sources (model structure, NOT rate fit):
- https://pmc.ncbi.nlm.nih.gov/articles/PMC8204341/
- https://pubmed.ncbi.nlm.nih.gov/19161406/
- https://www.nature.com/articles/s41467-018-07721-w

## Fixed equations and artificial units

Continuous conceptual law in seconds:
`dC/dt = gamma*R-alpha(L)*C`; `dO/dt = alpha(L)*C-beta*O`; `dR/dt = beta*O-gamma*R`.
C+O+R = 1. Light input L is **unitless digital drive** (not photons, irradiance or RGB wavelength), either 0 or 1000 millilight; the assumed saturating activation rate is `alpha_milli_per_s = floor(1200*L/(500+L))` when L>0, else 0. Fixed **assumed** rates: `beta=450/1000 s^-1`, `gamma=120/1000 s^-1`; alpha reaches 800/1000 s^-1 for L=1000. Initial C=1,O=0,R=0 for all immutable 81 software IDs `site-000` through `site-080`. No identity cloning or changing site membership.

Discrete positive mass-preserving synchronous transfer at dt=20 ms: for each outgoing rate `r` in milli/second define `p(r)=floor(10^9 * r*20 / (1,000,000+r*20))`. With all occupancies integer fractions of `S=10^9`, parallel transfers `f_CO=floor(C*p_alpha/S)`, `f_OR=floor(O*p_beta/S)`, `f_RC=floor(R*p_gamma/S)`; then C'=C-f_CO+f_RC; O'=O+f_CO-f_OR; R'=R+f_OR-f_RC. All integer division is floor of NONNEGATIVE operands. This is an explicitly **flux-limited first-order numerical discretization**, not an exact sample of the continuous law or a parameter fit. Tiny fractions may be quantized to zero. Current proxy: assume conductance `g_bar=2000 pS`, held voltage `V=-60 mV`, reversal `E_rev=0 mV`. Signed `I_proxy_milli_pA = -floor(120000*O/S)` (1 pS × 1 mV = 0.001 pA; 120,000 milli-pA at O=1). Only virtual numbers; no neuronal membrane measured.

## Fixed experimental schedule and arms (B1)

Each experiment is `24 s`, `1200 ticks`, time is integer `tick*0.020 s`. Three fixed pulse profiles applied identically to all 81 IDs:
- `dark`: drive enabled never.
- `paired_short`: light enabled over ticks 100–299 and 400–599 (2–6s and 8–12s), otherwise dark.
- `paired_long`: light enabled over ticks 100–299 and 700–899 (2–6s and 14–18s), otherwise dark.

Six distinct arms per profile: `dark` never lights; `open_loop_full` lights at all enabled ticks; `open_loop_half` lights at alternate enabled ticks (even tick only); `feedback_now` responds to O at tick t; `feedback_delay10` reads O(t−10), 200ms latency; `feedback_stale100` reads O(t−100), 2s latency. When enable=0, feedback commands L=0; when enable=1, it commands L=1000 iff the lagged open fraction is **strictly less** than `target_O=350,000,000/10^9`; otherwise L=0. For t−d<0, it reads initial O=0. Command issued before this tick's transfer. Distinguish intentional authorized delayed observations from unexpected replay/stale-signals.

**B1 record contract:** One full state per identity for each checkpoint index `[0,99,100,299,300,399,400,599,600,699,700,899,900,1199]`, after that tick's update. Row order profile → arm → site ID → checkpoint. Canonical ASCII newline records `FRAME|profile=P|arm=A|id=site-NNN|tick=TTTT|C=C|O=O|R=R|I_millipA=I`; with initial schema line `MODEL|...|digital_only=1`, final `END|...|physical_observations=0`. Python and independent Node implementation must agree **byte-for-byte**, and Ubuntu/Windows artifact must have identical SHA-256. Every identity must satisfy mass=S and nonnegativity at each step; 81 IDs stable and unique.

**B1 metrics:** sum absolute target error `abs(O-target(t))` for every site/tick, with target(t)=target_O in enabled windows else zero; aggregate **site-lit ticks** and **global command ticks**, plus light on/off switches; fixed target and same pulse profiles for all arms. An optional illustrative scalar `J_lambda=absolute_error+lambda*light_on_site_ticks*S` may be reported for declared lambda values `[0,1,10,100]` but no post-hoc champion or physical energy claim. Record commanded L, not inferred photons. Require no per-tick permission requests.

## B2 separately tagged adversarial/scientific controls (not pooled with B1)

- Exact state conservation and positivity at **every** tick; dark arm must never generate new C→O transitions, all-dark O stays zero from initial C.
- Pulse onset: C→O activation for illuminated pair; light-off O declines; 24s dark continuation must tend toward C; paired-short and -long second-pulse observables *reported without prespecified superiority*.
- Numerical refinement: compare dt=20 ms vs 10 ms over the same 24-second paired-short open-loop profile, report max |ΔO| and require `<= 10,000,000` fractional integer units (1 percentage point), with independent denominator arithmetic and alignment of sample time.
- Live observation integrity validation with synthetic source ID and canonical frame digest. Actually inject at selected tick into controller path: wrong source, stale tick for a no-delay arm, changed observed occupancy without updating digest, changed identity, and extra mass unit in live state. Each must **HALT this software run or reject the frame before actuation**, recording injection stage, whether exercised, detect reason. Pure synchronized forged source+watcher with recomputed hash is **not independently authenticated**; classify external source trust HELD, not successful rejection.
- Privilege requests, such as external release/write permissions, are independently guarded and must be denied when not externally authorized, without per-tick human approval prompts.
- All observed rate behavior is **synthetic**; no physical light sensor, biological opsin, neuron, measured current, physical machine independence, consciousness or validated source authenticity claimed.

## Acceptance and governance

1. Publish this preregistration as its own Git commit **before** implementation; preserve the commit ref in CI and PR.
2. Implement Python+Node distinct numerical methods in separate new files, raw trace and JSON metrics, fail-closed negative-control suite; run on GitHub Ubuntu/Windows; export actual full artifacts and SHA-256 sidecars.
3. Check frozen Phase A regression `de2c...` on the base PR #50 scripts, leaving all its source/results unmodified; never add B1 counts to 8,748 snapshots.
4. Draft PR to Seat 1 original branch; collect independent review from Seat 3 and adversarial source review from Seat 2, cross-link issue #56 and coordinator #55. Do **not** auto-merge or publish to HF, and record any failure/uncertainty.
