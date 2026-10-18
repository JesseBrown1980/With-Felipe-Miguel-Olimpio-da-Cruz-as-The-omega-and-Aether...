//! First 1000 primes via a sieve; `prime_at` indexes them (bigpickle primes.mjs:5-29).
//!
//! The upstream sieve sizes its upper bound with a float Rosser estimate (primes.mjs:10); this port
//! uses a fixed integer bound above the 1000th prime (7919), so the produced first-1000 primes are
//! identical while no float appears. The referee mirrors this sieve with the same integer bound and
//! checks `prime_at` at indices 0, 1, 2, 10 and 999 through the emitted rows. The full 1000-prime list
//! equals upstream primes.mjs's own `PRIMES`, run unchanged in Node (float runs there, at line 10):
//! comma-joined sha256 `1b2a2bb15bc74f8503c255f50885cf72e8feb6cf05208714cc6ccc2adafbdc76`, a
//! cold-lane check outside this directory.

use std::sync::OnceLock;

const FIRST_N: usize = 1000;

fn sieve_first_n_primes(n: usize) -> Vec<u32> {
    let limit: usize = 10_000; // > p_1000 = 7919
    let mut composite = vec![false; limit + 1];
    let mut out = Vec::with_capacity(n);
    let mut i = 2usize;
    while i <= limit {
        if !composite[i] {
            out.push(i as u32);
            if out.len() == n {
                break;
            }
            let mut j = i * i;
            while j <= limit {
                composite[j] = true;
                j += i;
            }
        }
        i += 1;
    }
    out
}

/// The first 1000 primes, computed once.
pub fn primes() -> &'static [u32] {
    static PRIMES: OnceLock<Vec<u32>> = OnceLock::new();
    PRIMES
        .get_or_init(|| sieve_first_n_primes(FIRST_N))
        .as_slice()
}

/// The `i`-th prime (0-indexed), for `i` in `[0, 1000)`.
pub fn prime_at(i: usize) -> u32 {
    let table = primes();
    assert!(i < table.len(), "primeAt: index out of range");
    table[i]
}
