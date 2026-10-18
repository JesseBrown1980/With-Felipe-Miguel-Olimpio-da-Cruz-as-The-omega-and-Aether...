# The Brown Light erdos Engine block powered by light

> **Part of it all:** [the bridge](https://jessebrown1980.github.io/the-bridge-to-all-of-it/) — every public thing in one place, so none of it gets lost.

**Jesse Daniel Brown (OP-JESSE).** Forty years. His machine, his laws, his system.

**One click, nothing to install:**
→ **https://jessebrown1980.github.io/The-Brown-Light-erdos-Engine-block-powered-by-light/**

Or download `index.html` and double-click it. No server, no network, no GPU, no
account, no package manager, no key. It runs offline, forever.

---

## What this engine is

It is not a picture of a proof. **It is the proof, running.**

Erdős asked: *does 2ⁿ always contain a digit 2 in base 3?* Open since he asked it.
In balanced ternary the digit `2` **does not exist** — converting replaces every
`2` with `−1` and carries. So the question becomes: **does the conversion always
carry?**

That carry is the combustion. This engine burns it.

---

## The cylinders are the light

Every surviving residue at stroke `k` lifts to **exactly three** residues at
stroke `k+1`:

```
n            →  R
n + 2·3ᵏ     →  G
n + 4·3ᵏ     →  B
```

Because `2^(2·3ᵏ) ≡ 1 + c·3^(k+1)  (mod 3^(k+2))` with **`c` coprime to 3**,
stepping between the three lifts adds `c` to digit `k+1`, mod 3. The digit walks
`0 → 1 → 2` across them.

**Exactly one of the three lands on 2. One burns. Two carry.**

That is one throw of a three-cylinder bank at 120°. Stack the throws and you have
the block.

```
fuel      light  ·  the R G B lifts
exhaust   the −1 digit
```

---

## The engine has a real compression ratio

**MEASURED** — twelve strokes, exact over complete residue systems, nothing
sampled and nothing simulated:

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

**R G B R G B R G B R G B.** The firing channel rotates every single stroke —
never skips, never doubles. It stays timed because `c` is coprime to 3. That is
the timing chain, and it is arithmetic, not engineering.

```
period    × 3 per stroke
charge    × 2 per stroke
          ───────────────
compression ratio  =  3 : 2
```

**And that ratio is not a coincidence of the animation — it is the `2/3` of the
distribution.**

```
P(lowest −1 at position 0)  =  1/2                  parity
P(lowest −1 at position k)  =  (1/6)·(2/3)^(k−1)    one throw of three

check:  1/2 + (1/6)·Σ(2/3)ʲ  =  1/2 + 1/2  =  1     closes exactly
```

The engine's compression and the distribution's decay are **one number seen from
two sides.** You cannot tune one without breaking the other.

---

## Why the block idles instead of stalling

Survivor density is `(1/2)(2/3)^(k−1) → 0`, so the never-firing set has **density
zero**. But the survivors at stroke `k` are `3·2^(k−1)` residue classes mod
`2·3ᵏ`, and the intersection over all strokes is a **Cantor set in the 3-adic
integers** — measure zero, **nonempty**, cardinality continuum.

> **There exist 3-adic exponents for which 2ⁿ never contains a digit 2.
> The conjecture says none of them is a natural number.**

No density argument can ever close that. The bad set is not empty — it is
invisible to measure. **Any proof must show that Cantor set misses ℕ entirely,
which is arithmetic, not measure theory.**

That is the engine's one unburnt drop, and it is stated here rather than hidden.

---

## Controls

```
START THE ENGINE   run continuously, one stroke per beat
SINGLE STROKE      fire one stroke — watch one proof step burn
RESET              back to stroke 0
```

The crank turns live at 120° phasing, the firing journal goes white-hot, and the
block below shows one cell per residue — **bright means it burned this stroke**,
dim RGB means it carried.

---

## Status, honestly tagged

```
MEASURED   the 1/3 : 2/3 split     13 strokes, exact over full periods
MEASURED   the firing order        R G B R G B, no deviation
PROVED     P(0) = 1/2              parity: 2ⁿ ≡ 2 (mod 3) ⟺ n odd
PROVED     P(1) = 1/6              2⁴ ≡ 7 (mod 9), base3 "21"
SKETCHED   the general 1/3         three lifts, c coprime to 3, digit cycles
OPEN       the conjecture itself   the Cantor set must miss ℕ
```

The general `1/3` is a proof **sketch**, not a written proof, and is marked as one.

---

## Why it takes this form

A technology that needs permission to reach people does not reach them.
Wardenclyffe needed capital, land, a tower and a patron — four gates — and it
never reached anybody.

**This file has no dependencies, so there is no gate.** Copy it to a USB stick,
email it, print the source, retype it by hand. It runs.

---

## Companion repositories

```
the-browns-solution-to-erods-o0O-nx3-6-for-1-with--1-3   the full result
one-click                                                the whole system, one file
how-and-why-the-system-works                             the technical account
the-leaves-are-not-the-message                           the generator/leaf result
raw-data                                                 unedited output + scripts
```

---

**Jesse Daniel Brown (OP-JESSE)** — the system, the laws, the architecture.

*Three throws around a free centre. One fires per phase. The fuel is light and
the exhaust is −1/3.*
