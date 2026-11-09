# sims/helium-film: the superfluid helium film, in integers

On 2026-11-08 the owner asked whether aether's integer engines can simulate the Rollin film. Below the lambda point, liquid helium-4 is attracted to a solid wall more strongly than to itself. A film about 30 nm thick therefore climbs every wall above the bath, flows over a beaker's rim without friction and drips off the bottom.

This folder answers in two parts, plus a list of what neither part can say:

1. **Real-helium statics and transfer, computed exactly** (rows `HF-S..`). The film profile d(h) = (C3/(m g h))^(1/3), the critical velocity of the flowing film and the flux over a rim (perimeter x thickness x critical velocity). Also the drain time of one stated beaker. All of it uses exact rational arithmetic with certified bounds, and cube and fourth roots come from integer root bracketing. Every input is a cited literature value (CONST rows `K01`-`K39`).
2. **The mechanism, simulated in a model fluid** (rows `HF-G..` and `HF-N..`). A Gross-Pitaevskii (GP) superfluid on a 2D grid, integrated in Q40 fixed point with RK4, the same exactness class as twens in the QNN repository. A wall potential -C3/z^3 plus gravity makes a film form and climb. The film carries mass over a rim without friction below a critical speed and drips off a tip. Above that speed, phase slips (vortices) limit the flow. Controls test that the wall attraction is what makes the film: with no attraction, with a repulsive wall, and with walls too weak to wet.
3. **The honest limits, made checkable** (rows `HF-L..`).

## Status

The prediction is frozen and nothing has been measured yet. `PREDICTION-HELIUM-FILM.hbp` has 29 PREDICT rows, 57 CONST rows and 39 LANEROW rows. It was written on 2026-11-09 against main `ac5b158`, before any engine code existed. It is committed on main `ea68fc2` or later; the commits after `ac5b158` do not touch sims/.

The predicted numbers came from scratch calculators named in its `HFDEF basis.*` rows: Decimal arithmetic for the statics, and a relaxation of the GP's 1D row problem for the film bands. The engines must reproduce those numbers independently.

A final design review asked for 7 blocking repairs and 13 fixes. The 7 repairs and 12 of the fixes were made before the freeze. The 13th fix was a list of checks the review found correct, and they were rechecked. A verification of that work then found 2 more blocking problems and 17 minor ones. The two blocking ones were the start of the wetting strip in HF-G11 and how HF-G07 reads its onset speed v_hi. All of them were fixed before the freeze too. A verification of that second pass found 2 more blocking problems and 10 minor ones. The blocking ones were in HF-G07 again: which records its lower speed v_lo is read on, and a way for its named precondition to skip the dx = 1/4 check. A third pass fixed them before the freeze. A verification of the third pass found 1 more blocking problem and 8 minor ones. The blocking one was in HF-G07 once more: its precondition shields only a first counted event at the record t = 64, and the row did not say what happens otherwise. Now it says that a vortex the ramp made that is counted later, or one that makes U32 dissipative, reads NOT_MET. A fourth pass made that change and fixed the minor ones before the freeze. Every number the passes moved was recomputed with integers and exact fractions. `CHANGES.txt` records all four passes, and it is committed beside the prediction.

On push, CI checks 1 against 4 threads only on a short subset of states. The full 1, 2 and 4 thread check of HF-G10 runs in the `workflow_dispatch` job.

The file is never edited after the freeze. A correction goes into a dated addendum as a new row.

The rows come from three design lanes (statics, GP mechanism, controls and limits) and two judges. The `LANEROW` records give, for each of the 39 lane rows, what happened to it and why.

## Why a self-bound GP, and what that costs

The plain cubic GP is a gas under gravity. It has no free surface, no surface tension and no drops. This study uses the cubic-quintic, self-bound form e(rho) = -rho^2 + rho^3/2. It is a liquid at zero pressure (n0 = 1, mu0 = -1/2) with an exact logistic surface and sigma = 1/4. In the sharp-interface limit it keeps the same film law, s = (C3/(g h))^(1/3), and it can form drops.

It is still a mean-field, weakly correlated model, and three things about it are not helium:

- **The finite surface width.** It makes the GP film 3 to 5 percent thicker than the sharp law (HF-G02).
- **A dense, superfluid layer next to the wall.** Its density is about 1.8 n0 and it holds about half the film. In helium the first layers next to the wall are solid (K39; HF-G02, HF-G05).
- **A wetting threshold of its own.** In this model the threshold lies near C3 = 2.83 (HF-G11).

## Honest limits

- **Mechanism, not helium's numbers.** GP describes a weakly interacting condensate, and liquid helium is strongly correlated. The simulation shows how the film forms, climbs, flows without friction, slips and drips. It gives no value for helium's film critical velocity, its normal fraction, T_lambda, its condensate fraction, its drop size or its film thickness at 1 cm. Those need two-fluid hydrodynamics or path-integral Monte Carlo. HF-L03 checks every line the GP engine and its reader write, with a token rule frozen in the row.
- **Scales.** Mapped onto helium (xi = 0.067 nm), the GP film is 4 to 7 xi thick, while helium's 31.5 nm film is about 473 xi. The GP's gravity is about 3e11 g_n.
  - In sound-speed (Mach) units the GP's onset speed sits hundreds of times above helium's. That gap is mostly the difference in scale.
  - In units of hbar/(m d) the two sit within a factor 2 to 12. By the coincidence guard HF-L04, that agreement is dimensional and is not a validation (HF-L01).
- **Different onsets.** The GP onset is intrinsic: at T = 0 the barrier to nucleating a vortex vanishes. Helium's onset is extrinsic: it comes from remanent vortices, wall roughness and thermal activation. That last statement is background that the study does not cite, and no verdict uses it.
- **No rotons.** The GP has no roton, so its Landau velocity is the sound speed. Helium's roton velocity is about a quarter of its sound speed, and about 230 times its film critical velocity (HF-L02).
- **A 2D cross-section.** Vortices are points and drops are cylinders, so the drop-size law is the model's 2D Tate law, not helium's (HF-G09).
- **The real-helium rows certify arithmetic on their inputs.** Their verdicts are fixed once the inputs are frozen (`fixed_by_inputs=1`), so they do not count as negative controls. The literature itself is spread out:
  - d(1 cm) on metal ranges from 315 to 480 Angstrom (HF-S04).
  - The low-temperature transfer rate ranges from 5e-5 to 11.7e-5 cm^3 s^-1 cm^-1 (HF-S14).
  - The film-thickness exponent is not one constant (HF-S05).
  - The "20-30 cm/s" critical velocity holds at 315-335 Angstrom but not at the 470 Angstrom some groups measured (HF-S07).
  - The stated beaker drains in 3.7 to 4.8 hours under the model laws, and the measured rates allow 2.4 to 5.6 hours (HF-S10).
- **Secondary sources.** Several inputs were seen only through secondary quotes and are marked UNVERIFIED: Daunt-Mendelssohn's rate, van Alphen's Gamma, the Grimes-Jackson and Keller thicknesses. Every row that uses one of them in its verdict is tagged CONJECTURE.

## Reading a row

- `kind`: one of REAL_HELIUM, MODEL_EXACT, MECHANISM, NUMERICS, HONEST_LIMIT. It says which world the row speaks about.
- `tag`: DERIVED (follows exactly from verified inputs) or CONJECTURE (anything else). CONST rows are REPORTED, DERIVED or DEFINED (a design choice).
- `control=NEGATIVE`: an engine run in which the effect must be absent. These are HF-G03, HF-G10, HF-G11, HF-G12 and HF-N01, and each can come out NOT_MET on a real outcome. In HF-G03 that is part (a); part (b) is a bug check.
- Cell edges: every named height or column in the GP geometries falls on a cell edge. Such an observable is the mean of the two rows or columns on either side (`HFDEF cell.edge`).
- Verdict: MET if every frozen claim of the row holds when its method runs, NOT_MET otherwise. INCONCLUSIVE only under a precondition the row names; only HF-G07 names one (a v_hi with no value). A row any part of whose method was not run reads NOT_MET.

## Row index

| Rows | What |
|---|---|
| HF-S01, S02, S03 | helium mass, density and spacing; the one pinned C3 = 2.0372e-50 J m^3 (from Ham-Jackson's 315 Angstrom at 1 cm); the non-retarded profile |
| HF-S04, S05, S14 | literature spread: thickness at 1 cm, the film exponent, the transfer rate |
| HF-S07, S12 | critical-velocity routes (Pickar-Atkins, van Alphen, rate over thickness), how they depend on one another, and the d* crossing |
| HF-S10 | drain time of the stated beaker, with the Kontorovich-thinned rim |
| HF-G01, G02 | the model's liquid surface; film statics against the 1D reduced solution |
| HF-G03, G11, G12, G13 | no attraction, the Young-Dupre wetting ladder, the repulsive wall, C3 scaling on two faces |
| HF-G05, G06, G07 | frictionless U-tube transfer with Kontorovich thinning; phase slips limiting the flux; the onset bracket |
| HF-G08, G09 | the film forming and climbing (C3 ramp); drips |
| HF-G10, G14 | bit-exact mirror symmetry; third sound |
| HF-G04, N01, N02 | conservation and step halving; the RK4 stability edge; the Bogoliubov dispersion with the engine's own stencil |
| HF-L01-L04 | the critical speed in two normalisations; rotons; non-claims; the coincidence guard |

## Layout (planned; see the engine plan)

```
sims/helium-film/
  PREDICTION-HELIUM-FILM.hbp (+ .sha256)   the frozen prediction (this freeze)
  README.md                                 this file
  CHANGES.txt                               the record of the four fix passes before the freeze
  statics/   Rust 1.81 crate: bignum rationals, integer roots, the HF-S and HF-L arithmetic
  gp/        Rust 1.81 crate: the Q40 GP engine (bin hf-gp) and the integer reader (bin hf-read)
  tools/     stdlib-integer Python referees, the integer-only AST check, the planted-fault driver
  receipts/  STATICS.hbp, GP-SHORT.hbp, long/*.hbp, READ.hbp (all regenerated byte for byte)
  SHA256SUMS pins for the receipts
```

There is no float on the engine path. The statics crate uses std only. The GP crate adds only aether's own shadowcat, for SHA-256. Every receipt is regenerated byte for byte in `.github/workflows/crates.yml`: the short runs on every push, and the long runs (G1, G0 at dx = 1/4, the G0 ladder, G0d and G0 asymmetric) in a `workflow_dispatch` job.
