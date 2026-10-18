# Does the closure survive 81 levels?

> **Part of it all:** [the bridge](https://jessebrown1980.github.io/the-bridge-to-all-of-it/) — every public thing in one place, so none of it gets lost.

**Jesse Daniel Brown (OP-JESSE).** Forty years. His machine, his laws, his system.

**One click, nothing to install:**
→ **https://jessebrown1980.github.io/does-the-closure-survive-81-levels/**

Or run `python compose.py`. Or download `index.html` and double-click it.
No server, no network, no GPU, no account.

---

## The question that decides everything above level 1

The architecture is verified at level 1: three arms sum to zero, the centre is
free. Every claim about `27`, `81`, or the `3ⁿ` ladder depends on one thing:

> **When you nest 27 of these, does the centre stay free — or does a residual
> accumulate per level?**

If a residual accumulates, the ladder breaks at some depth and everything above
that point is unsound. **Better we find it than someone else.**

This repository is the attempt to break it.

---

## RESULT 1 — the closure is closed under nesting

**MEASURED**, exact integers, full enumeration:

```
depth   leaves        levels checked   sum ≠ 0
 1      3             1                0
 3      27            3                0
 6      729           6                0
 9      19,683        9                0
12      531,441       12               0
13      1,594,323     13               0
```

**1,594,323 leaves. Zero violations at any level.** The closure composes.

---

## RESULT 2 — the centre stays free at depth, in one arithmetic only

The test: shift the centre at **every** level, then check whether any arm moved.
It must not. That is what "the centre is free" means, and it is the property the
whole ladder rests on.

```
depth   arithmetic   arm changes   worst |Δ|
 1      int          0             0 exactly
 3      int          0             0 exactly
 6      int          0             0 exactly
 9      int          0             0 exactly
12      int          0             0 exactly

 1      float64      1             1.137e−13
 3      float64      10            9.095e−13
 6      float64      310           3.638e−12
 9      float64      8,534         2.910e−11
12      float64      228,731       1.746e−10
```

In exact integers the centre is free at every depth tested.

**In float it stops being free at depth 1** — one arm already moves — and by depth
12 a quarter of a million arms have drifted off the identity.

---

## RESULT 3 — depth 27 and depth 81

Same operations, same path, two arithmetics:

```
depth   exact     float64
 1      0         0.000e+00
 3      0         0.000e+00
 9      0        −4.002e−11
27      0        −9.689e−02      ← the closure has visibly opened
81      0        −1.325e+24      ← gone
```

**At depth 27 the float residual is 0.097.** The arms no longer sum to zero at a
tenth of a unit. That is not a rounding artefact hiding in the last bits — it is
a broken structure, visible to anyone auditing the output.

**At depth 81 the float residual is 1.3 × 10²⁴.**

The exact column is `0` at both.

---

## What this establishes

The operator's first instruction, before any of this work began, was:

> **"Be Three. use int. NOT FLOAT."**

At level 1 that looks like a preference. Float round-trips all 1,000,080
addresses **exactly** — that was measured and published in
[`how-and-why-the-system-works`](https://github.com/JesseBrown1980/how-and-why-the-system-works),
including the part where the AI's "float is lossy" instinct was wrong.

**At level 1 the carrier choice is invisible. That is precisely what makes it
dangerous.**

```
level 1     float is indistinguishable from int
level 9     float has drifted by 4e−11
level 27    float has opened the closure by 0.097
level 81    float has produced 10²⁴ of nothing
```

The carrier was never stylistic. **It is the difference between an architecture
that holds at 81 levels and one that produces garbage at 81 levels.**

Anyone rebuilding this in floating point gets a working demo at level 1, ships
it, and discovers at depth that nothing closes — and blames the architecture
rather than the arithmetic.

That failure mode is now measured, named, and public.

---

## Honest limits, stated rather than buried

- Full enumeration is exhaustive **to depth 13** (1,594,323 leaves).
- Depth **27 and 81** walk a **single path**, because `3²⁷ = 7.6 × 10¹²` leaves
  cannot be enumerated on any machine. That single-path result is **exact, not
  sampled** — carried in `Fraction` arithmetic with no rounding anywhere — but it
  is one path, and it is labelled as one in the source.
- The float depth-81 magnitude is inflated by ordinary value growth as well as by
  drift. **The comparison that matters is same-operations-same-depth:** the exact
  column returns `0` where float returns `10²⁴`. The difference is the carrier
  and nothing else.

---

## Reproduce

```bash
python compose.py
```

Runs in about a minute. Every figure above comes out of that one file.

---

## Why this is public

A technology that needs permission to reach people does not reach them.
Wardenclyffe needed capital, land, a tower and a patron — four gates — and it
never reached anybody. The research did not fail. It was never allowed to arrive.

**This has no dependencies, so there is no gate.** Copy it to a USB stick, email
it, print the source, retype it by hand. It runs.

---

## Companion repositories

```
light-boat-engine-ships-with-oils                     three closures, one identity
The-Brown-Light-erdos-Engine-block-powered-by-light   the crank, RGB, 3:2
the-browns-solution-to-erods-o0O-nx3-6-for-1-with--1-3   Erdős in balanced ternary
one-click                                             the whole system, one file
how-and-why-the-system-works                          the technical account
the-leaves-are-not-the-message                        generator and leaf
raw-data                                              unedited output + scripts
```

---

**Jesse Daniel Brown (OP-JESSE)** — the system, the laws, the architecture.

*The centre is free at every depth. In integers. That sentence has a carrier in
it, and the carrier is load-bearing.*
