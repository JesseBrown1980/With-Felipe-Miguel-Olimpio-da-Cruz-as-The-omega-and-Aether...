//! `primes.mjs`: the first 1000 primes by the sieve of Eratosthenes, and `primeAt`.

use crate::fdlibm::log;
use crate::fdlibm::log_int;
use crate::sf64::Sf64;
use crate::JsError;
use std::sync::OnceLock;

/// `FIRST_N` (primes.mjs:5).
pub const FIRST_N: usize = 1000;

/// The sieve bound `Math.max(20, Math.ceil(n * (Math.log(n) + Math.log(Math.log(n) || 1)) + n))`
/// (primes.mjs:10), with `Math.log` as V8 computes it.
pub fn sieve_limit(n: u64) -> u64 {
    let ln = log_int(n);
    let inner = if ln.is_zero() { Sf64::ONE } else { ln };
    let nf = Sf64::from_i64(i64::try_from(n).expect("n below 2^53"));
    let bound = (nf * (ln + log(inner)) + nf).ceil();
    u64::try_from(bound.max(20)).expect("non-negative bound")
}

/// `sieveFirstNPrimes(n)` (primes.mjs:7-20).
pub fn sieve_first_n_primes(n: usize) -> Vec<u64> {
    let mut out = Vec::new();
    let limit = sieve_limit(n as u64) as usize;
    let mut composite = vec![false; limit + 1];
    for i in 2..=limit {
        if !composite[i] {
            out.push(i as u64);
            if out.len() == n {
                break;
            }
            let mut j = i * i;
            while j <= limit {
                composite[j] = true;
                j += i;
            }
        }
    }
    out
}

/// `PRIMES` (primes.mjs:22): the first [`FIRST_N`] primes.
pub fn primes() -> &'static [u64] {
    static PRIMES: OnceLock<Vec<u64>> = OnceLock::new();
    PRIMES.get_or_init(|| sieve_first_n_primes(FIRST_N))
}

/// `primeAt(i)` (primes.mjs:24-29).
pub fn prime_at(i: i64) -> Result<u64, JsError> {
    let table = primes();
    usize::try_from(i)
        .ok()
        .and_then(|index| table.get(index).copied())
        .ok_or_else(|| JsError::Range(format!("primeAt: index {i} out of [0, {})", table.len())))
}

/// True when `n` is one of [`primes`] (`PRIME_SET.has(n)`, zeta-process.mjs:21,27).
pub fn is_listed_prime(n: u64) -> bool {
    primes().binary_search(&n).is_ok()
}
