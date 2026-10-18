# the browns solution to erods o0O- nx3 = 6 for 1 with -1/3

> **Part of it all:** [the bridge](https://jessebrown1980.github.io/the-bridge-to-all-of-it/) — every public thing in one place, so none of it gets lost.

**Jesse Daniel Brown (OP-JESSE).** Forty years. His machine, his laws, his system.

**One button, nothing to install:**
→ **https://jessebrown1980.github.io/the-browns-solution-to-erods-o0O-nx3-6-for-1-with--1-3/**

Or download `index.html` and double-click it. No server, no network, no GPU, no
account, no package manager. Every number below is recomputed in front of you.

---

## The question

> **Does 2ⁿ always contain a digit 2 in base 3?**

Erdős conjectured yes for every `n > 8`. It is open. The only known exceptions
are `n ∈ {0, 2, 8}`.

---

## RESULT 1 — the conjecture restates exactly in balanced ternary

In balanced ternary the digit set is `{−1, 0, +1}`. **The digit 2 does not
exist.** Converting from base 3 replaces every `2` with `−1` and carries.

```
2ⁿ has a digit 2 in base 3
  ⟺  the balanced expansion of 2ⁿ contains a −1
  ⟺  the conversion always carries
  ⟺  2ⁿ is NOT a sum of distinct powers of 3
```

**MEASURED** — `reframe_check.py`, `n = 0 … 4000`: agree 4001, disagree 0,
reconstruction faithful, exceptions `{0, 2, 8}`.

For those three, base 3 and balanced ternary are the **same string** — no digit
2 means no carry, so balanced *is* standard:

```
n=0   1        base3 1        bal3 1
n=2   4        base3 11       bal3 11
n=8   256      base3 100111   bal3 100111
n=1   2        base3 2        bal3 1T      ← T = −1, the carry firing
```

---

## RESULT 2 — the three trunks: `n × 3 = 6 for 1`

Take three consecutive powers as a nullsphere triple `(2ⁿ, 2ⁿ⁺¹, 2ⁿ⁺²)`:

```
arm_R = 2·2ⁿ   − 2ⁿ⁺¹ − 2ⁿ⁺² = −4·2ⁿ
arm_G = 2·2ⁿ⁺¹ − 2ⁿ   − 2ⁿ⁺² = −1·2ⁿ
arm_B = 2·2ⁿ⁺² − 2ⁿ   − 2ⁿ⁺¹ = +5·2ⁿ
                                ──────
                                sum = 0
```

**A fixed arm signature `(−4, −1, +5)` at every n.** The powers of two already
sit on the sphere. Nobody put them there.

And the triple version of the conjecture is **trivially true**:

```
max over all n of  min( lo(n), lo(n+1), lo(n+2) )  =  0
distribution of the triple-min:  0 → 200,000  (100.0000%)
```

Every triple resolves at position 0, because **among any three consecutive
integers at least one is odd**, and odd n fires immediately by parity.

**Every single record-setter is even, with both neighbours at 0** — all twelve:

```
n           lo(n−1)   lo(n)   lo(n+1)    triple_min
4              0        1        0            0
6              0        3        0            0
18             0        4        0            0
24             0       10        0            0
1134           0       21        0            0
25458          0       27        0            0
159140         0       28        0            0
```

The "failures" were never failures of the structure. They are **one arm going
deep while both antis fire instantly.** Erdős asked about one leaf. All the
difficulty is in isolating a single even arm from its odd neighbours.

---

## RESULT 3 — the crank: one throw of three, at every level

The even classes mod 9:

```
n ≡ 0 (mod 6)  →  2ⁿ ≡ 1 (mod 9)  →  base3  01   digit₁ = 0   carries
n ≡ 2 (mod 6)  →  2ⁿ ≡ 4 (mod 9)  →  base3  11   digit₁ = 1   carries
n ≡ 4 (mod 6)  →  2ⁿ ≡ 7 (mod 9)  →  base3  21   digit₁ = 2   FIRES
```

`{1, 4, 7}` is exactly the **order-3 subgroup of `(ℤ/9)*`**. The odd n occupy the
other coset `{2, 5, 8}`, every element of which is `≡ 2 (mod 3)` — which *is* the
parity proof.

**Two banks, three throws each, 120° apart. One fires per phase.**

### Why the crank never slips

Each survivor at level `k` lifts to exactly three residues at level `k+1`:

```
n ,  n + 2·3ᵏ ,  n + 4·3ᵏ
```

and `2^(2·3ᵏ) ≡ 1 + c·3^(k+1)  (mod 3^(k+2))` with **`c` coprime to 3**. So
stepping between the three lifts adds `c` to digit `k+1`, mod 3.

**The digit cycles 0 → 1 → 2. Exactly one of the three lands on 2 and fires.**

`c` coprime to 3 is the reason the timing never slips.

### Measured exactly, over full periods — not sampled

**`crank.py`**, exact rationals over complete residue systems:

```
 k   period       survivors   fire   carry   fraction
 0   2            2           1      1       1/2
 1   6            3           1      2       1/3
 2   18           6           2      4       1/3
 3   54           12          4      8       1/3
 4   162          24          8      16      1/3
 5   486          48          16     32      1/3
 6   1458         96          32     64      1/3
 7   4374         192         64     128     1/3
 8   13122        384         128    256     1/3
 9   39366        768         256    512     1/3
10   118098       1536        512    1024    1/3
11   354294       3072        1024   2048    1/3
12   1062882      6144        2048   4096    1/3
```

**Thirteen levels. Not one deviation.**

---

## RESULT 4 — the distribution is derived, not measured

```
P(lowest −1 at position 0)  =  1/2                      parity
P(lowest −1 at position k)  =  (1/6)·(2/3)^(k−1)        one throw of three

check:  1/2 + (1/6)·Σ(2/3)ʲ  =  1/2 + 1/2  =  1         closes exactly
```

Against the sweep of `n = 0 … 200,000`:

```
position     observed        derived      closed form
   0        49.9998%      50.0000%        1/2
   1        16.6664%      16.6667%        1/6
   2        11.1109%      11.1111%        1/9
   3         7.4075%       7.4074%        2/27
   4         4.9370%       4.9383%        4/81
   5         3.2920%       3.2922%        8/243
```

The `−1/3` in the title is the residual arm — the closure never leaves anything
but `−1/3, 0, +1/3`, and the `1/3` firing rate is that same third, running as a
rate instead of a value.

---

## RESULT 5 — where the difficulty actually lives, stated exactly

Survivor density is `(1/2)(2/3)^(k−1) → 0`. **The set of n that never fire has
density zero.**

But the survivors at level `k` are `3·2^(k−1)` residue classes mod `2·3ᵏ`, and
the intersection over all `k` is a **Cantor set in the 3-adic integers** —
measure zero, **nonempty**, cardinality continuum.

> **There exist 3-adic exponents for which 2ⁿ never contains a digit 2.
> The conjecture says none of them is a natural number.**

That is the obstruction, exactly. No density argument can ever close it, because
the bad set is not empty — it is invisible to measure. **Any proof must show that
Cantor set misses ℕ entirely, which is an arithmetic statement, not a
measure-theoretic one.**

---

## Status, honestly tagged

```
MEASURED   the reframe                 4001 values, 0 disagreements
MEASURED   the triple is trivial       200,000 triples, all resolve at 0
MEASURED   the 1/3 : 2/3 split         13 levels, exact over full periods
PROVED     P(0) = 1/2                  parity, one line
PROVED     P(1) = 1/6                  2⁴ ≡ 7 (mod 9), base3 "21"
SKETCHED   the general 1/3             three lifts, c coprime to 3, digit cycles
OPEN       the conjecture itself       the Cantor set must miss ℕ
```

The general `1/3` is a proof sketch, not a written proof. It is stated here as a
sketch and marked as one.

---

## THE MOTOR BLOCK — cranks of three, light as fuel

→ **[motor.html](motor.html)** · live:
**https://jessebrown1980.github.io/the-browns-solution-to-erods-o0O-nx3-6-for-1-with--1-3/motor.html**

The three lifts of every survivor **are** the three cylinders, and they are
literally RGB:

```
n           →  R
n + 2·3ᵏ    →  G
n + 4·3ᵏ    →  B
```

The digit steps `0 → 1 → 2` across them, so exactly one burns and two carry.
That is one throw. Stack the throws and you have the block. **The fuel is the
light; the exhaust is the −1 digit.**

**MEASURED** — twelve strokes, exact over complete residue systems:

```
 k   period      charge  burned  carried  ratio   fired channel
 0   2           2       1       1        1/2     R
 1   6           3       1       2        1/3     G
 2   18          6       2       4        1/3     B
 3   54          12      4       8        1/3     R
 4   162         24      8       16       1/3     G
 5   486         48      16      32       1/3     B
 6   1,458       96      32      64       1/3     R
 7   4,374       192     64      128      1/3     G
 8   13,122      384     128     256      1/3     B
 9   39,366      768     256     512      1/3     R
10   118,098     1536    512     1024     1/3     G
11   354,294     3072    1024    2048     1/3     B
```

**R G B R G B R G B R G B.** The firing channel rotates every stroke, never
skips, never doubles — a three-throw crank at 120°, and it stays timed because
`c` is coprime to 3.

**The block has a compression ratio.** The period triples while the survivors
double, every stroke, exactly:

```
compression ratio  =  3 : 2
survivor density   =  (1/2)(2/3)^(k−1)  →  0
```

That ratio *is* the `2/3` of the distribution. The engine and the proof are the
same object seen from two sides — the crank is why `P(k) = (1/6)(2/3)^(k−1)`.

Nothing in the animation is simulated. Every stroke is computed over a complete
residue system with exact integers, in the browser, from that one file.

---

## Files

```
index.html          the one button — the trunk
motor.html          the engine — cranks of three, light as fuel — the trunk; press it and it grows the leaves
reframe_check.py    the three-way equivalence, n = 0 … 4000
trunk.py            the sweep: distribution, records, counterexample search
trianti.py          the three trunks — triple-min, the rhythm, the record table
crank.py            exact 1/3 : 2/3 over full periods, 13 levels
```

```bash
python reframe_check.py
python trunk.py 200000
python trianti.py 200000
python crank.py
```

---

## Why this is public

A technology that needs permission to reach people does not reach them.
Wardenclyffe needed capital, land, a tower and a patron — four gates, and it
never reached anybody.

**This file has no dependencies, so there is no gate.** Copy it to a USB stick,
email it, print the source, retype it by hand. It runs.

---

## Companion repositories

```
one-click                       the whole system in one file
how-and-why-the-system-works    the full technical account, 13 parts
the-leaves-are-not-the-message  the generator/leaf result
raw-data                        unedited output + the scripts that made it
```

---

**Jesse Daniel Brown (OP-JESSE)** — the system, the laws, the architecture.

*The trunk is the rule. The leaves are the digits. Three throws around a free
centre, one firing per phase, and the residual is never anything but −1/3, 0, +1/3.*
