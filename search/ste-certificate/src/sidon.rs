//! `isPrime` and `erdosTuran`, whose text is identical in `sidon-cross-fix.mjs:1-2` and
//! `sidon-probe.mjs:6-7`, and the anchor prime list the three scripts share.

use alloc::vec::Vec;

/// The behcs-256 anchor primes (`sidon-cross-fix.mjs:10`, `sidon-probe.mjs:24`,
/// `distance-probe.mjs:12`).
pub const ANCHOR_PRIMES: [u64; 11] = [13, 17, 23, 31, 41, 47, 73, 79, 83, 89, 131];

/// `isPrime(n)`: trial division by `f = 2, 3, ...` while `f * f <= n`.
pub fn is_prime(n: u64) -> bool {
    if n < 2 {
        return false;
    }
    let mut f = 2;
    while f * f <= n {
        if n % f == 0 {
            return false;
        }
        f += 1;
    }
    true
}

/// `erdosTuran(p)`: `a_k = 2*p*k + ((k*k) % p)` for `k = 0 .. p-1`.
///
/// Equal to the JavaScript Number function for `p < 2^26`, where every `k*k` and `a_k` is below
/// 2^53; at `p = 67108879` Node gives 15 of the entries rounded (PROVENANCE.md).
pub fn erdos_turan(p: u64) -> Vec<u64> {
    let mut a = Vec::with_capacity(p as usize);
    for k in 0..p {
        a.push(2 * p * k + ((k * k) % p));
    }
    a
}

/// `ANCHOR_PRIMES.filter(isPrime)` (`sidon-cross-fix.mjs:10`, `sidon-probe.mjs:24`).
pub fn filtered_primes() -> Vec<u64> {
    ANCHOR_PRIMES
        .iter()
        .copied()
        .filter(|&p| is_prime(p))
        .collect()
}
