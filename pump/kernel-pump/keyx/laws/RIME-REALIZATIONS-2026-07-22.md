# RIME SPACE — Realizations & Rules (2026-07-22 session)

Operator: Jesse Daniel Brown. This document organizes the *new* realizations from
the 2026-07-21→22 working session, each marked **[measured]**, **[named]** (maps
to established mathematics), or **[boundary]** (the honest limit). Every measured
claim has a reproducible script in this folder. No number enters a headline
without a receipt.

---

## 1. The depth wall is a WAVE, not a fixed ceiling  **[measured]**
The optimal context depth is **not fixed** — it grows with corpus size. The
apparent "level-off" at order-5 in an earlier run was an artifact of a no-backoff
estimator, corrected here.

Measured (`sizesweep.py`, `rime_backoff_test.py`): best byte-order deepens
2 → 3 → 4 → 5 as data grows 1 MB → 6 MB → 24 MB → 980 MB. Operator's claim
("depth never stops for the glyphs according to size") — **confirmed**.

## 2. The trinary tower and its waves  **[measured]** `trit_waves.py`
Building the tower in trits (3^k naries: 27 → 243 → 729 → 3^9 → 3^12 → 3^13)
instead of bytes lets depth climb in finer steps. Held-out bits/byte:

| level | 1 MB | 6 MB | 27 MB |
|---|---|---|---|
| 3^3 (27) | 7.636 | 7.638 | 7.632 |
| 3^6 (729) | 5.499 | 5.530 | 5.516 |
| 3^9 | 4.011 | 4.006 | 3.981 |
| 3^12 | 3.333 | 3.247 | 3.196 |
| 3^13 | 3.215 | 3.103 | **3.042** |

Within a size, bpc falls monotonically per ×3 level (the wave, no wall yet at
3^13). Across sizes, every deep level drops with more data (the wall recedes).
Both measured. **[boundary]** the values approach the language's true entropy
from the scale direction; they do not cross below it.

## 3. n(×3×3) = self-similar ternary multiresolution  **[named]**
The operator's tower `0 = n(×3×3), − = −n(×3×3), + = +n(×3×3)`, recursing so the
center opens into its own {−,0,+} at each finer level, is a **balanced-ternary
multiresolution decomposition**. It maps exactly onto three established structures:
- **radix-3 FFT** (Law 5) — the DC/center recurses and re-splits;
- **3-adic numbers** — distance = depth of shared center in the ternary tree;
- **wavelet / multiresolution analysis** — "going inside the zero" is recursion
  into the low-frequency (center) component, which is *literally* how wavelet
  compression works.
"Negative zero / positive zero" = the two side-cells revealed when the center is
refined by one scale. Compression of zero = folding the center when its detail
is unneeded; expansion of zero = recursing in to reveal the next trime.

## 4. The −1/3 → 2/3 law (recreation is repayment)  **[measured]**
`rime_cascade27.py`, `rime_fanout27.py`: a deleted third is recreated **byte-exact
iff its closure was banked** (27/27 stages exact). Unbanked recovery = **13–14%**
(the order-0 floor, Wikipedia's spaces). Banking two closures recovers 2/3 exactly
— but the two closures ARE 2/3 of the data (net zero). Building more n(×3×3)
levels reveals more real structure per level; it does **not** change the
banked-vs-unbanked law. This is the conservation gate, measured.

## 5. The collision-free re-addressing property  **[named]**
The system never "collides" because every rime transform is a **bijection**
(injective — no two values share an address). It re-addresses losslessly: compute
the new address from the old, and because the map is invertible the old
representation can be dropped — the new address fully determines it. This is
content-addressing / lossless change-of-basis (rate 1.0, Law 6). Verified all
session: wind/unwind byte-exact, anti-anti at 4.4e-16.

## 6. The four axes  **[named + boundary]**
time, color, space, gravity — four orthogonal axes, each a trinary tower,
composing by CRT with no carries (Laws 8, 11). Color = the 27-cube (real).
Time/space = temporal/spatial context depth (real). Gravity **[boundary]**: the
trime {−1,0,+1} equals the three constant curvatures of the Uniformization
Theorem, and curvature *is* gravity in general relativity — a real correspondence,
rendered (`uniformization.png`). The tower *addresses* a curvature field; it does
not compute spacetime. All four axes were exercised on real footage this session
(the RIME VISION investigation).

---

## THE HONEST FRONTIER (compression, this session)  **[measured]**
| method | held-out bpc |
|---|---|
| single order-4 (byte depth) | 2.2457 |
| neural GRU (2.7M params, CPU, overnight) | 2.04 (then overfit) |
| context-mixer (mini-PAQ, orders+match+word+APM) | 1.8091 |
| **vc65 (mature CM, standing best)** | **1.7464** |

**Below 1.0 bpc was NOT reached this session, and no rime transform can reach it
by relabeling** — the wave approaches the true entropy of the data (~1 bit/char
for English) from every direction (depth, mixing, scale, neural) but never crosses
below. Below-1 is the Hutter frontier; it requires a genuinely larger predictive
model on real hardware. This is stated so no downstream reader mistakes the
addressing axis (~0 bpc, generated structure) for sub-entropy compression.

## Overclaim watch (for external sharing)
The framework is a genuine, elegant re-derivation of multiresolution / 3-adic /
FFT structure in a trinary language, with a real curvature correspondence and
byte-exact receipts. It is **not** a unification of physics, does not compute
gravity, and does not recover unseen information. Present the former (checkable,
intriguing); do not present the latter (a serious reader will bounce).
