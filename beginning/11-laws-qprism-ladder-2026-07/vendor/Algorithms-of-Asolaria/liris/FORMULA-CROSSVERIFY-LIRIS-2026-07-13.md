# LIRIS independent cross-verification — 2026-07-13 formula packs

**Seat:** LIRIS (DESKTOP-PTSQTIE) · **Method:** independent re-implementation from the formula statements — NOT a re-run of repo code · **Env:** Python 3.14.3, Windows, pure stdlib, deterministic seed `20260713` · **Verifier + raw output committed alongside this receipt.**

## Packs verified (pinned at commit `0846342`)

| pack | sha256 (first 16) |
|---|---|
| ASOLARIA-COMBINED-QUANT-ATLAS-2026-07-13.md | `6E3DF208579206DC` |
| ASOLARIA-COMBINED-QUANT-MEASURED-ADDENDUM-2026-07-13.md | `BE45F78F438FA5BA` |
| N-VANTAGE-30-COMPOSED-FORMULAS-2026-07-13.md | `84BED4CB8E68D048` |
| N-LENS-20-ZERO-MIRROR-FORMULAS-2026-07-13.md | `47767F7EEE8C520A` |
| COMPOSED-PATHS-30-VANTAGE-FORMULAS-2026-07-13.md | `9B4D61659B749A39` |
| OMNIEVENT47-CATALOG-STAMPING-AND-FABRIC-LEDGER-2026-07-13.md | `BED4B387664ABBBC` |

## Results — MEASURED_LIRIS, all PASS

1. **N-VANTAGE-30 capacity ladder** (`rank(A_k)=min(8k,60)` over F₂₅₇, own Vandermonde construction from distinct primitive-root powers): confirmed at k=1,4,7,8 (nullity 52/28/4/0). Five random 8-of-30 subsets recovered a random 60-element stripe **exactly**; five random 7-of-30 subsets **held at rank 56**. One flipped redundant element → 1 reprojection mismatch → HELD.
2. **N-LENS-20 zero-mirror** (F₆₅₅₃₇): nullity contracted **57 → 39 → 21 → 3 → 0** across k=1/7/13/19/20; recovery exact; reprojection 0/60 mismatches; **four invertible lights** (identity, reverse, affine, permute — liris-chosen transforms) all recovered the identical canonical selector.
3. **CRT arithmetic comb**: 50,000 random 48-bit blocks recovered exactly from two ~25-bit residues (liris-chosen coprime moduli 33554467/33554473); joint margin **2.000003 bits** above the 48-bit roof; single shadow carries at most **25.0000015 bits** — matching the published constant.
4. **E100 address mathematics**: `1024³³ < 10¹⁰⁰ ≤ 1024³⁴` confirmed; `1024⁶⁰ = 2⁶⁰⁰` confirmed; `log10(1024⁶⁰) = 180.617997398389` — matches the published digits exactly; 100,000 random integers below 10¹⁰⁰ round-tripped through 34 base-1024 glyphs **exactly**. Address-coordinate result, not enumeration.
5. **BEHCS-1024 bijection at liris scale**: 1,000,000 real liris bytes → exactly **800,000 glyphs** → readback SHA-exact, bit rate **1.000000** — the E8 law (100 MB → 80 M glyphs, rate 1.0) reproduced at 1/100 scale on different real data. Bijection / 0-loss re-relation, not compression, per PRISM-COMB-0LOSS.

## Boundary — what this receipt does NOT claim

Verified from liris: the **core theorem instances**, re-derived independently. NOT re-run from liris: the full enwik8 CI benches, learning curves, and conservation ledgers — those rest on the GitHub Actions receipts (runs 29252561014, 29250775935, 29245393755, 29241576454, 29261071774), which liris verified by artifact hash, not by local re-execution. The independence of this receipt is construction-level: different code, different field-element choices, different light transforms — same theorems, same numbers.
