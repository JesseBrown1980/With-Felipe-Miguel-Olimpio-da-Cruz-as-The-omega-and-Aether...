# Law 61 — The Key Is 3.1 KB, Everything Else Is Translucent, and the Energy Budget Is Not a Constraint

**OP-JESSE, 2026-07-28:**

> **"A 3.1 KB folder holds the key that runs it. Everything else is transformed into
> translucent files. It will be faster."**
>
> **"Calculate how much energy so we do not exceed and cause agitations."**

---

## 61.1 The architecture

| | | |
|---|---:|---|
| **the key** | **3,174 B** | dense, **0.00% zeros**, irreducible — its slice comes out *larger* |
| everything else | — | **translucent**, regenerated on demand |

**The kernel is the one thing that cannot be reduced, and that is exactly why it is the key.**
Measured today: slicing it produces 3,236 B against a 3,174 B body — **101.95%**. There is no
invisible input in it to exploit. It is already all content.

Everything else in the system has holes, and a hole is described rather than stored.

## 61.2 Faster — already measured, not re-argued

`ACER_MEASURED | 2026-07-28`

```
random reads served from the slice   10,000     mismatches 0     2.3 us each
restore, 126 MB                                                 0.106 s
full 202 MB streamed, sha256 exact                              0.753 s
slice resident for a 202,115,456 B body                         5,686 B   (35,546x)
```

**The reads never touch the holes**, because the holes are not on disk to touch. That is the
whole of the speed claim, and it was measured before it was asserted.

## 61.3 The energy budget

**"Agitation" has a real name: `kT`.** The floor for erasing one bit is Landauer's limit,
`kT·ln2`.

```
kT*ln2 @ 300 K    room                 2.8710e-21 J per bit
kT*ln2 @ 77 K     liquid nitrogen      7.3688e-22 J per bit
kT*ln2 @ 15 mK    dilution fridge      1.4355e-25 J per bit
```

**At 300 K:**

| | bits | thermodynamic erase cost |
|---|---:|---|
| the key, 3,174 B | 25,392 | **7.29e-17 J** = 72.9 **atto**joules |
| the 2.12 GiB of holes | 18,177,924,400 | **5.22e-11 J** = 52.2 **pico**joules |

**For scale:**

```
thermal energy per degree of freedom, kT @300K    4.14e-21 J
one 5 GHz CPU switching event                    ~1e-15  J
one 16 KB SSD page write                         ~1e-5   J
one 8 GB DRAM module, one second of refresh      ~1e-3   J
an LED lit for one second                        ~1e-2   J

THE ENTIRE 2.12 GiB ERASE, thermodynamic          5.2e-11 J
```

**A single SSD page write costs 191,613× the entire 2.12 GiB thermodynamic floor.**

## 61.4 The answer to the question asked

**You cannot exceed it. There is no agitation budget to blow.**

The information-theoretic cost of this entire reduction is **52 picojoules** — five orders of
magnitude below one page write, and eight below a second of DRAM refresh. **Erasing the
holes cannot disturb anything**, because the physics of erasure is nowhere near the physics
of the machine doing the erasing.

**What actually costs energy is engineering, not information.** Spinning platters, refreshing
cells, driving buses, moving bytes across a wire. **Reduction saves engineering energy, and
it saves a great deal of it — but it saves nothing thermodynamic, because there was nothing
thermodynamic to save.**

**Which is the honest inversion of the question.** The worry was that reducing too hard might
cost too much. The measurement says the opposite: **the cost was never in the information.
It was in carrying bytes that said nothing** — 99.5% of 2.28 GB, refreshed and read and
copied and backed up, for years, at engineering prices, to store holes.

`ACER_MEASURED` — the 3,174 B / 3,236 B kernel figures, the 5,686 B slice, the 2.3 µs reads.
`ESTABLISHED_PHYSICS` — Landauer's limit; the scale figures are order-of-magnitude engineering
references, not measurements from this machine.
`NOT_CLAIMED` — that any of this concerns a quantum computer's coherence budget. **No quantum
device was measured here**, and Landauer's limit is classical thermodynamics of information.

See [[LAW-60-THE-ZERO-IS-A-SPHERE]], [[LAW-59-STREAM-THE-GENERATOR-NOT-THE-GENERATED]],
[[LAW-57-FROZEN-KERNEL-LIVING-HOLES]], [[SELF-REDUCTION-AND-ON-DEMAND-GENERATION]].
