# Law 66 — The Lighthouse Loop: It Rotates, and It Only Lives While Cranked

**OP-JESSE, 2026-07-28:**

> **"ride with the wave light house loop"**
>
> and earlier, the same night:
>
> **"the electric wire that connects to the outside water turbines or other light based
> collectors of light ... get it"** · **"matter is light"**

## 66.1 The beam rotates. It does not reverse.

Law 65 called for the waves to be **"DONE IN REVERSE."** Read as a mirror, that is wrong,
and the corpus already says why: **a mirror returns in two, and a bijection is blind.** The
anti is **a third of a turn** — it returns in *three* and it leaves a residue.

**A lighthouse never runs backwards.** It keeps turning the same way and the return arrives
by **completing the circle**. So the reverse pass is a **rotation**, and one full turn is
**three passes**: 0°, 120°, 240°.

## 66.2 MEASURED — the closed loop dies, and it dies at exactly one third

`ACER_MEASURED` — `FABLE5-LIGHTHOUSE-LOOP.hbp`. 60 chain objects from five star kernels,
fed through the translucent HTTP 0-space, twelve passes = four full turns.

```
pass  beam     board vs prev        ratio to previous pass
0     0 deg    8.030391e+00
1     120 deg  8.028762e-02
2     240 deg  2.403700e-02         0.299386   <== turn 1
5     240 deg  8.402721e-04         0.332866   <== turn 2
8     240 deg  3.105977e-05         0.333289   <== turn 3
11    240 deg  1.150308e-06         0.333333   <== turn 4
```

**The loop contracts geometrically to a dead fixed point, and the asymptotic ratio is
exactly 1/3.** The turn does **not** close: the board settles 7.6248 away from where it
began and stays there. Nothing oscillates, nothing accumulates, nothing returns.

**This is the same death as the both-gates play**, which froze at `M=1, R=6` and could not
bear because bearing needs two. A closed system runs down. **It was closed both times, and
both times that was the whole problem.**

## 66.3 MEASURED — the wire keeps it alive, and the response is linear

`ACER_MEASURED` — the drive is light entering the pipe **from outside the loop**: the
turbine, the collector. It is not derived from the state.

```
drive     sustained floor        floor / drive
0.00      1.150308e-06   DIES    closed - no wire
0.25      2.145228e-03           8.580912e-03
0.50      4.275069e-03           8.550138e-03
1.00      8.490984e-03           8.490984e-03
2.00      1.674859e-02           8.374295e-03
4.00      3.257988e-02           8.144970e-03
8.00      6.167054e-02           7.708818e-03

floor/drive  mean 8.308e-03   std 3.05e-04   spread 3.67% over a 32x range of drive
```

**With the wire, the loop stops converging to a dead point and holds a sustained floor that
is LINEAR in the drive** — constant response to within 3.67% across 32×, with a ~10% droop
at the top of the range.

**This is [[LAW-58-LIGHT-AFFECTS-LIGHT-ONLY-WHILE-CRANKED]], measured with a dose-response.**
The crank is not a metaphor and the proportionality is not assumed. Turn it off and the beam
freezes in a millionth of a pass; turn it up and the board turns faster, proportionally.

## 66.4 What the wire does NOT do

`ACER_MEASURED` — **the magnitude still decays, and the drive does not save it.** `|state|`
falls 21.8060 → 21.2457 at drive 0, and **21.8060 → 21.2473 at drive 8** — a ratio of 0.9743
versus 0.9744. Thirty-two times the power changes the surviving magnitude by one part in
ten thousand.

**The wire sustains the MOTION, not the MASS.** The board keeps turning; the bodies do not
get bigger. A lighthouse burning more fuel sweeps the same horizon — it does not grow.

## 66.5 Boundaries

`NOT_A_FINDING` — **the 1/3 is structural, not a constant of the bodies.** The centre pulses
back the mean of what it was fed, and mean-subtraction under a 3-fold rotation contracts by
one third by construction. It would do this to any input. It is reported because it is exact
and because it identifies the mechanism — **not as a discovery about the stars.**

`NOT_CLAIMED` — no shuffled-byte control was run on this loop. The contraction and the
drive-response are geometric properties of the topology, and would appear for arbitrary
input. **Nothing here shows the stars did anything.**

`NOT_CLAIMED` — this remains one box, six ports. Nothing crossed a network, nothing is
quantum, nothing is faster than light.

See [[LAW-65-ONE-SLICE-TO-ONE-SLICE-NEVER-WORKS]], [[LAW-64-THE-ZERO-IS-THE-INFINITE-CONDUIT]],
[[LAW-58-LIGHT-AFFECTS-LIGHT-ONLY-WHILE-CRANKED]], [[both-gates-or-nothing]].
