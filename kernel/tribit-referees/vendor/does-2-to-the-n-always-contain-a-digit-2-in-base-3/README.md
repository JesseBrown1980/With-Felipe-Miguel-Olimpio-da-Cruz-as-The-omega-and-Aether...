# The Results

> **Part of it all:** [the bridge](https://jessebrown1980.github.io/the-bridge-to-all-of-it/) — every public thing in one place, so none of it gets lost.

## The question

> **Does 2ⁿ always contain a digit 2 in base 3?**

Erdős conjectured yes for every `n > 8`. It is open.

**One button, no install:** → **https://jessebrown1980.github.io/does-2-to-the-n-always-contain-a-digit-2-in-base-3/**

Or download `index.html` and double-click it. No server, no network, no GPU,
no account. Everything below is recomputed in front of you when you press RUN.

---

## RESULT 1 — the conjecture restates exactly in balanced ternary

In balanced ternary the digit set is `{−1, 0, +1}`. **The digit 2 does not
exist.** Converting from base 3 replaces every `2` with `−1` and carries.

So the conjecture becomes three equivalent statements:

```
2ⁿ has a digit 2 in base 3
  ⟺  the balanced-ternary expansion of 2ⁿ contains a −1
  ⟺  the conversion always carries
  ⟺  2ⁿ is NOT a sum of distinct powers of 3
```

**MEASURED** — `reframe_check.py`, n = 0 … 4000:

```
reconstruction faithful                                    failures 0
has digit 2  ⟺  has −1                        agree 4001, disagree 0
no digit 2  ⟺  sum of distinct powers of 3           violations 0
exceptions                                          n ∈ {0, 2, 8}
```

The three exceptions render identically in both bases — no digit 2 means no
carry, so balanced *is* standard:

```
n=0   1        base3 1        bal3 1
n=2   4        base3 11       bal3 11
n=8   256      base3 100111   bal3 100111
n=1   2        base3 2        bal3 1T      ← T = −1, the carry firing
n=9   512      base3 200222   bal3 1T0100T
```

---

## RESULT 2 — the distribution of the lowest −1 is exact, not approximate

**MEASURED** — `trunk.py`, n = 0 … 200,000:

```
position     observed        exact        closed form
   0        49.9998%      50.0000%        1/2
   1        16.6664%      16.6667%        1/6
   2        11.1109%      11.1111%        1/9
   3         7.4075%       7.4074%        2/27
   4         4.9370%       4.9383%        4/81
   5         3.2920%       3.2922%        8/243
```

Agreement to five significant figures. The law:

```
P(lowest −1 at position 0)  =  1/2
P(lowest −1 at position k)  =  (1/6)·(2/3)^(k−1)      for k ≥ 1

check:  1/2 + (1/6)·Σ(2/3)ʲ  =  1/2 + 1/2  =  1        closes exactly
```

### The ½ is proved

`2ⁿ mod 3` cycles with period 2 — it is `2` when **n is odd** and `1` when n is
even. The lowest balanced digit is `−1` exactly when that residue is `2`.

**Position 0 fires on precisely half of all n, by parity. No computation needed.**

This also explains why the observed 49.9998% beats the iid prediction of 33.3%:
the first digit is not random, it is parity.

### The ⅔ is measured, not derived — this is the open piece

If the `2/3` falls out of the carry recursion the way the `1/2` falls out of
parity, the distribution becomes **exact rather than heuristic**, and an exact
distribution can be reasoned about instead of sampled.

**That is where the attack is.**

---

## RESULT 3 — why it is hard, quantified

**MEASURED** — record setters, n where the lowest `−1` is deeper than for any
smaller n:

```
n              lowest −1 at
1                 0
4                 1
6                 3
18                4
20                7
24               10
72               11
186              13
332              15
1134             21
25458            27
159140           28
```

Twelve records in 200,000 values. Under the law, the expected maximum over N
samples is `log(N/2) / log(3/2)`:

```
N = 200,000    predicted 28.4      observed 28
```

**The deepest position grows logarithmically in N.** Verifying up to N costs
roughly `2.47·ln N` digits — cheap. But it never terminates, because the tail
never reaches zero.

That is the obstruction, now with a number on it.

---

## RESULT 4 — no counterexample

```
range swept                    n = 0 … 200,000
n with no −1 anywhere          {0, 2, 8}
counterexamples (n > 8)        0
minimum −1 count for n > 8     2, at n = 9
```

---

## Why this is computable at all

Carries in the balanced conversion propagate **low → high only**. Therefore the
first `K` balanced digits of `v` depend **only on `v mod 3^K`**.

We never build `2ⁿ`. We use `pow(2, n, 3^K)` and walk `K` digits. Exact integers
throughout, no floating point anywhere.

And `2ⁿ mod 3^K` is periodic in `n` with period `2·3^(K−1)` — which is why a
**bounded** lowest position would settle the conjecture by finite check. It is
unbounded. Result 3 measures how fast.

---

## Files

```
index.html          the one-button tool — the trunk; run it, it grows the leaves
trunk.py            the sweep: distribution, records, counterexample search
reframe_check.py    proves the three-way equivalence over n = 0 … 4000
```

```bash
python reframe_check.py
python trunk.py 200000
```

---

## Companion repositories

```
one-click                       the whole system in one file
how-and-why-the-system-works    the full technical account
the-leaves-are-not-the-message  the generator/leaf result
raw-data                        unedited output + scripts
```

---

**Jesse Daniel Brown (OP-JESSE)** — the system, the laws, the architecture.
Forty years. His machine, his laws, his system.

*The trunk is the rule. The leaves are the digits.*
