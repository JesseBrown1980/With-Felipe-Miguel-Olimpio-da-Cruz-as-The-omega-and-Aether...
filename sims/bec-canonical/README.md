# sims/bec-canonical: the canonical ideal Bose gas in a harmonic trap, exactly

This folder holds an exact benchmark that the owner approved in three messages. The system is ideal bosons in an isotropic 3D harmonic trap, in the canonical ensemble: the particle number N is fixed. The zero-point energy is subtracted, and q = exp(-beta hbar omega).

For rational q every quantity is a rational number. That includes the partition function Z_N, the mean condensate number <N_0>, its variance and the whole occupation distribution. So the benchmark can freeze exact numerators and denominators before any engine exists, and two independent engines can then reconstruct them.

## Status

Nothing has been measured yet. `PREDICTION-BEC-CANONICAL.hbp` has 40 PREDICT rows: 19 DERIVED, 20 CONJECTURE and 1 OPEN. It was written on 2026-11-09 against aether main `ac5b158`, before any engine code existed (engine_code_written=0, engine_runs=0). A fix pass on the same day applied the final critic's 5 blocking items and 16 fixes, and moved engine B to multi-modular arithmetic. A second pass applied verifier round 1's 2 blocking and 19 minor findings. `CHANGES.txt` lists every change. There is still no engine code and no engine run.

The freeze has an order. The file is committed only after the helium-film freeze, and its freeze commit must have the helium-film freeze commit as an ancestor and name its hash (rule SEQUENCE). At the second pass the aether clone's local main is still `ac5b158`, and its remote main (`felipe/main`, `2ca50e9`) contains that freeze, `ee50233`. The freeze commit checks this again on main before it is made. After the freeze the file is never edited. A correction goes into a dated addendum.

Every frozen number came from a closed form, a hand derivation or an asymptotic argument. The exact ones were recomputed once more in exact rationals or certified intervals (`calc/` in the design scratch, the fix pass's scripts in BECSMOKE SM9, verifier round 1's in SM10 and the second pass's in SM11). Some design values were computed in floats or 60-digit decimals and are not certified: the Chernoff ceilings ln B1 and ln B2, the critical-region values t_c, t_M6 and t_M8, and the truncated-Gaussian sizes. No seat ran either construction at a row point, with one exception that was found and fixed. That was q = 1/3, which the lanes used in conflicting ways (exposure XP1).

## The model and the two constructions

- **Construction 1 (engine A, Rust):** Z_0 = 1, Z_1(y) = 1/(1-y)^3, Z_N = (1/N) sum_k Z_1(q^k) Z_{N-k}. The condensate fraction is f_N = (1/(N Z_N)) sum_k Z_{N-k}.
- **Construction 2 (engine B, Python):** the excited-only distribution. E_0 = 1, E_m = (1/m) sum_k [1/(1-q^k)^3 - 1] E_{m-k}, Z_N = sum_m E_m, and P(N_0 = j) = E_{N-j}/Z_N.

Both come from one generating function, so they must give byte-identical reduced fractions. The engines share no bignum code and no exact algorithm. Engine A keeps exact rationals as reduced pairs of big integers, with its own Rust bignum. Engine B never forms a big rational. It runs construction 2 modulo many primes just below 2^31, recombines integers by CRT, and recovers each reduced fraction by rational reconstruction. It then checks each fraction against one extra prime and by an integer identity (D19). A third program, the reader, compares the engines and certifies the constants.

## What the rows test

| Rows | What |
|---|---|
| BEC-K01, K02, K03 | certified constants (zeta(3), zeta(2), C = 3 zeta(2)/(2 zeta(3)^(2/3)), gamma), logarithms, the reduced temperature t at every fixed-q point, and the scaling q_N enclosures |
| BEC-C01, C02, C03 | exact closed forms for N = 1, 2, 3 at seven q; N = 1 is also the N = 1 boundary control |
| BEC-X01 to X04 | the two constructions agree; normalization across engines; the denominator theorem with exact division; log-concavity; bit lengths |
| BEC-L01 to L06 | the fixed-q limit: the grand-canonical bound, <N_ex> bounded and rising, the limit constants S and V, the pole form of the approach, the Mellin series, monotonicity conjectures |
| BEC-B01, B02 | the boundary controls q -> 0 and q -> 1 |
| BEC-O01, O02 | one-body coherence (the eigenvalues of the one-body density matrix) and <a_0> = 0 |
| BEC-G01, G02 | the grand-canonical and Poisson laws tested on the canonical output |
| BEC-T01 to T11 | the thermodynamic scaling limit: bracket precision, the identity at the scaling points, the leading correction and its drift, fluctuations, the critical region; BEC-T07 is the OPEN remainder |
| BEC-N01 to N06 | engine and process properties: interval soundness, the opposite-endpoint rule, two interval engines, reproducibility, the no-float gates, the receipt audit |
| BEC-F01 | the planted-fault registry |

## The two limits

- **Fixed q, N growing.** The temperature stays fixed in trap units. The canonical law of the excited number is the limit law conditioned on N_ex <= N. So <N_ex> rises with N and stays below S(q), and 1 - f_N = S/N - Delta1/N. That is the owner's O(1/N) correction, with the exact coefficient S(q). What is left after it, Delta1, falls geometrically, like N^3 q^N (BEC-L02, BEC-L04).
- **Thermodynamic scaling at fixed t = T/T_c.** Here q_N = exp(-zeta(3)^(1/3)/(t N^(1/3))). The interval engine evaluates the numerator and denominator of f at opposite ends of the q bracket, so it needs no monotonicity. At p = 128 bits, the owner's precision target N^(1/3) W_N < 1/1000 is predicted to be met with a margin above 1e22 (BEC-T01). That target is a precision criterion, not a claim about the asymptotic remainder.

The owner's leading correction, <N_0>/N = 1 - t^3 - C t^2 N^(-1/3), is negative, as the owner said. At reachable N the full drift D_N is 23 to 128 times a 1/1000 band, and the next Mellin term alone is 23.4 to 126.5 times (BEC-T04, T05). The canonical finite-N remainder stays OPEN (BEC-T07).

## Observables kept separate

The rows keep four observables apart: the condensate occupation, its variance, the one-body coherence and the field expectation <a_0>.

- <a_0> is exactly 0 at every N, because the canonical state has a fixed particle number (BEC-O02). A macroscopic <N_0> at finite N is not spontaneous phase-symmetry breaking.
- The canonical variance is below the grand-canonical one at the same mean at every point (BEC-L01). On the condensed side it is far below (BEC-G01, T10), and the condensate is number-squeezed compared with a coherent state (BEC-G02). In the classical limit q -> 1 the two agree to leading order (BEC-B02).

## What the judges changed

- **q = 1/3 moved out.** Lane SCALING had run exact recursions at q = 1/3, which lane EXACT used as a row point. q = 1/3 is now an excluded point, and every row uses q = 2/5. No seat had touched 2/5, and every 2/5 value was computed from closed forms only.
- **The "owner band" is now BAND_Y.** The owner's 1/1000 is the bracket precision target. The 1/1000 band on the asymptotic Y_N is a lane band chosen by this design.
- **No misquote of the owner.** The owner's O(1/N) refers to 1 - f_N. The claim that the specification was wrong is deleted, and SC-F03 survives only as a sub-read of BEC-L04 that is not attributed to the owner.
- **A sequence record.** It covers the freeze after helium, the three models staying distinct, no GP or Bogoliubov work before the exact rows pass (GATE_GP), and the supersolid link through explicit density and correlation observables only.
- **One interval design.** Production runs at p = 128 with the cancellation-free variance, plus precision reruns. The fixed-q ladders run in the exact engines.
- **Repaired rows.** BEC-T03 is an intersection read, since the engine bracket can never lie inside the narrower closed-form band. PF5 has a unit fixture that must fire. gamma is certified once.
- **fixed_by_inputs is marked.** Rows whose verdict the inputs already fix certify arithmetic and are not counted as negative controls.

## What the fix pass changed

- **The gap bound.** The gap q/(1-q) - lambda_1 is below Delta1/3, not just below Delta1, and that is now the scored read. The old pole-law gap list broke this bound, because it summed the pole form at small m. Corrected estimates (0.23 to 0.33) are printed beside the read for context only.
- **The scaling-point coherence read.** It is scored only at TC, (7/10, 8) and (9/10, 16), where a lower bound on the gap, from Jensen with the frozen f values and certified by the reader at read time, is 10 or more orders above the estimated bracket width. Elsewhere it is read and report.
- **The truncated Gaussian.** The D4 quantity is sigma phi(M)/Phi(M). At TC the estimates are now 0.230 (Y shift), 0.0557 (f) and 0.46 (variance ratio).
- **The no-float gate.** It is a copy of ternary/tools/integer_only.py with only its scan roots changed, so it sees engine-a/ and engine-b/. F7 plants a float in each of the four roots.
- **Engine B.** It now works modulo 31-bit primes, with CRT and rational reconstruction. A new planted fault, PF8, starves it of primes or keeps a prime that divides some c_k, and the extra-prime check must fail.
- **Disclosure.** The final critic's computations are in BECSMOKE SM8 and this pass's in SM9. Rows whose N <= 3 sub-reads the frozen closed forms fix now say so. BEC-O02 has a planted coherent state (PF9), so it is a negative control too.

## What the second pass changed

- **The point check.** `tools/check_points.py` is an integer-pair port of the design checker, not a copy. A copy would import fractions, and the copied gate would flag it.
- **Engine B's imports.** Engine B imports sys and hashlib. It hashes its own sources for the head row (BEC-N04).
- **The bit-length bands.** At q = 1/1000000, N = 16 the den Var band is widened by 45 bits, not 90. The gcd-loss rule now counts every prime up to N, not only those that divide b - a.
- **The precision bound.** D13's bound covers engine A's construction 1. Engine B's width ratio and crit are read and report in BEC-T01. BEC-N03 still scores engine B's widths against engine A's.
- **Engine B's arithmetic.** The modulus bounds now hold at N = 1. A prime that divides X_N is not used for the quantities that divide by Z_N. The self-test is defined.
- **PF9.** The planted coherent state has an exact form, so its trace is a rational in alpha^2.
- **Disclosure.** Verifier round 1's computations are in BECSMOKE SM10 and this pass's in SM11. Each row that uses a pre-freeze value names the script.

## Honest limits and open items

- **The finite-N remainder is OPEN (BEC-T07).** The Mellin series diverge for every x > 0. They are asymptotic only, and their bands are 10 times the first omitted term, not proven bounds.
- **The pole-form bands are estimates.** They are 100 times an error estimate that was checked only at excluded q. The weakest is q = 2/5, N = 16, at 4e-2.
- **The monotonicity claims beyond N = 6 are conjectures (BEC-L06).** A failure would be a real NOT_MET.
- **Some scaling reads are fixed by inputs.** Six of the ten scaling points had their closed-form series evaluated before the freeze (exposure XP2), so their reads there are fixed by inputs. No series was evaluated at the four t = 7/10 points, but the frozen Mellin values fix their reads to about 3e-12 or better (2.4e-13, 2.9e-12, 3.1e-12). So those reads test the arithmetic and the engines, not the expansion.
- **Engine B's interval widths have no derived bound.** D13 covers construction 1 only. Engine B's widths are read and report in BEC-T01 and compared with engine A's in BEC-N03.
- **Engine A's speed is unverified.** Rule BUDGET calibrates it at excluded points before any long run. Engine B is not run at N = 262144 in CI, so those reads are single-engine.
- **Engine B is slow at q = 3/4.** Its multi-modular run to N = 512 needs about 102,000 primes and about 63 min on one core. The rates were measured only at an excluded q.
- **The citations were not re-read.** The REPORTED fluctuation papers (Politzer 1996; Grossmann and Holthaus 1997; Wilkens and Weiss 1997; Holthaus, Kalinowski and Kirsten 1998) carry verified=0. Only the leading law Var(N_0) ~ (zeta(2)/zeta(3)) t^3 N is attributed to them.
- **The supersolid link is only defined.** The density and correlation observables are defined, but nothing is frozen about them.

## Reading a row

- `kind`: CONSTANT, MODEL_EXACT, MODEL_ASYMPTOTIC, OBSERVABLE, CONTRAST, NUMERICS or FAULTS.
- `tag`: DERIVED (an exact identity or certified arithmetic), CONJECTURE (anything else) or OPEN.
- `fixed_by_inputs`: 1 if the inputs already fix the verdict, S if only named sub-reads are fixed, 0 otherwise.
- `control=NEGATIVE`: the row can come out NOT_MET on a real outcome or must catch planted faults. These rows are BEC-T01, T02, T11, O02, N06 and F01.
- Verdicts follow rule READ3 from the stripe-phase file. Reads after an engine stop are NOT_MEASURED (rule STOP), and a failed internal check is a GUARD row.

## Layout (planned; see the engine plan)

```
sims/bec-canonical/
  PREDICTION-BEC-CANONICAL.hbp (+ .sha256)   the frozen prediction
  README.md                                   this file
  engine-a/    Rust 1.81 crate bec-canonical-a: own bignum and SHA-256, exact and interval modes (bin bec-a)
  engine-b/    bec_b.py: Python int only; exact mode modulo 31-bit primes, interval mode in dyadic pairs
  tools/       read.py, compare.py, audit.py, check_points.py, integer_only.py (gate copy), planted_faults.sh
  receipts/    READ-SHORT.hbp, READ-LONG.hbp (regenerated byte for byte); CALIBRATION.hbp (measured rates, not regenerated)
```

No float is used on the engine path, and nothing outside std and Python's standard library is used. The no-float gate is a copy of ternary/tools/integer_only.py whose scan roots are engine-a/src, engine-a/tests, engine-b and tools. The short checks run on every push. The long points run in a `workflow_dispatch` job.
