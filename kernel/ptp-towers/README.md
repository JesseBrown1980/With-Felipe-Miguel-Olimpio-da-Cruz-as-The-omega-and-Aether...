# kernel/ptp-towers

PTP is the operator's **prime to prime**: one prime to another prime. The towers make the
cylinders, and the cylinders are divided: `coordinate(slot, dim)` in Asolaria
`tools/brown-hilbert-human-pid-mint.js` (blob `f246762b`) splits each slot into
`residue = slot % prime` and `turn = floor(slot / prime)`.

This crate is the cloud's independent reproduction of ACER's PTP measurement (2026-10-18). It was
written without ACER's code, runs to n = 10^7, is integer only (clippy denies float arithmetic), and
does the balanced round trip through the owner's `kernel/tribit`. `cargo +1.81.0 run --release`
prints the rows in `RECEIPT-PTP-CLOUD-2026-10-18.hbp`; two runs gave identical output.

## Two-machine result

Every count equals ACER's (ACER: Windows, Rust 1.81 GNU lane; cloud: Linux x86_64, 1.81.0):

| Check | Count |
|---|---|
| π(10^6), π(10^7) | 78,498 and 664,579 |
| Primes on the +1 spoke (6k+1) and the −1 spoke (6k−1) | 332,194 and 332,383 (−1 leads by 189) |
| Mod-6 phases 0, 2, 3, 4 | 0, only 2, only 3, 0 |
| Numbers coprime to 6 that are prime | 664,577 of 3,333,333 (19.93%) |
| Mod 27: the 18 cells coprime to 3 | 36,826 to 37,023 primes each (spread 0.53% of the mean) |
| Mod 27: the plane where the last balanced trit is 0 | empty except voxel (0,1,0) = residue 3, holding the prime 3 |
| Consecutive primes switching spoke, staying | 378,567 and 286,009 of 664,576 pairs (56.96%) |
| Switches −→+ and +→− | 189,284 and 189,283 |
| Towers p = 6k ± 1, 16-trit tribit round trip | 664,577 of 664,577, both |

ACER's stream hash (`03475052…`) and this crate's (`2cdc2bbf…`) differ because the two programs
print different rows; the comparison is count by count.

## What is about primes, and what the structure forces

About primes, measured here:
- **the −1 spoke leads by 189** (Chebyshev's bias);
- **consecutive primes switch spokes 56.96% of the time**, against 50% if each prime's spoke were
  independent of the last (the Lemke Oliver–Soundararajan bias);
- **the 18 coprime cells are filled almost equally** (Dirichlet's theorem on primes in progressions).

Forced by the structure, true for any numbers of the same shape:
- every prime above 3 is on a ±1 spoke, and the plane where the last trit is 0 is empty except 3:
  both follow from primes above 3 not being divisible by 2 or 3. Only 19.93% of spoke numbers are
  prime, so the wheel is a sieve of 2 and 3, not a prime detector;
- the switch counts −→+ and +→− can differ by at most one in **any** sequence of two symbols. The
  difference is fixed by the first and last symbols (here −1 first, +1 last, so exactly +1). The
  near-equality is therefore not a property of primes (`direction_balance_is_forced=1`);
- the tower rebuild and the 16-trit round trip hold by construction (balanced ternary is a bijection,
  measured as D1 in `model/ncm/rq`).

Wording: the 2,668,756 spoke numbers that are not prime are 2,668,755 composites and the number 1.

## Voxel rows

The `CELL` rows give each residue mod 27 as three balanced trits (a, b, c) with its prime count:
the integer data a ternary voxel map can be drawn from. The map itself is not built here.
