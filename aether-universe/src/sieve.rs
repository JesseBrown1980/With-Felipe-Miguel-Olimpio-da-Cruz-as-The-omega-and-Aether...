//! An odd-only bitset sieve of Eratosthenes, and a deterministic Miller-Rabin for the rest of `u64`.
//!
//! The sieve to 10^7 is 625,000 bytes. It is computed once, on the first command that needs it, and
//! kept. Checks that must hold or the three prime secrets refuse to run:
//! `pi(10^6) = 78,498` and `pi(10^7) = 664,579` (the PTP receipt's `PI` rows).

use std::sync::OnceLock;

/// The largest number the shared sieve covers.
pub const LIMIT: u64 = 10_000_000;

/// Expected prime counts, measured and quoted in `RECEIPT-PTP-CLOUD-2026-10-18.hbp` rows `PI`.
pub const PI_1E6: u64 = 78_498;
pub const PI_1E7: u64 = 664_579;

/// Prime flags for the odd numbers `1, 3, 5, ...`: bit `i` stands for `2i + 1`.
pub struct Sieve {
    n_max: u64,
    bits: Vec<u64>,
    slots: u64,
}

impl Sieve {
    /// Sieve every number `<= n_max`.
    pub fn up_to(n_max: u64) -> Sieve {
        let slots = n_max.div_ceil(2); // odd numbers 1..=n_max
        let words = slots.div_ceil(64) as usize;
        let mut bits = vec![u64::MAX; words];
        // clear the tail beyond `slots`
        let tail = (slots % 64) as u32;
        if tail != 0 {
            if let Some(last) = bits.last_mut() {
                *last = (1u64 << tail) - 1;
            }
        }
        let mut s = Sieve { n_max, bits, slots };
        s.clear(0); // 1 is not prime
        let mut i: u64 = 1;
        while (2 * i + 1) * (2 * i + 1) <= n_max {
            if s.get(i) {
                let p = 2 * i + 1;
                let mut j = (p * p - 1) / 2;
                while j < slots {
                    s.clear(j);
                    j += p;
                }
            }
            i += 1;
        }
        s
    }

    fn get(&self, i: u64) -> bool {
        (self.bits[(i / 64) as usize] >> (i % 64)) & 1 == 1
    }

    fn clear(&mut self, i: u64) {
        self.bits[(i / 64) as usize] &= !(1u64 << (i % 64));
    }

    /// The largest number covered.
    pub fn n_max(&self) -> u64 {
        self.n_max
    }

    /// Size of the bitset in bytes.
    pub fn bytes(&self) -> usize {
        self.bits.len() * 8
    }

    /// Is `n` prime? Only valid for `n <= n_max`; asking beyond is a programming error.
    pub fn is_prime(&self, n: u64) -> bool {
        assert!(n <= self.n_max, "sieve covers only up to {}", self.n_max);
        match n {
            0 | 1 => false,
            2 => true,
            _ if n % 2 == 0 => false,
            _ => self.get((n - 1) / 2),
        }
    }

    /// Number of primes `<= x` (for `x <= n_max`).
    pub fn pi(&self, x: u64) -> u64 {
        if x < 2 {
            return 0;
        }
        let mut count = 1; // the prime 2
        let mut n = 3;
        while n <= x {
            if self.get((n - 1) / 2) {
                count += 1;
            }
            n += 2;
        }
        count
    }

    /// All primes in increasing order.
    pub fn primes(&self) -> Primes<'_> {
        Primes {
            s: self,
            state: PrimesState::Two,
            idx: 1,
        }
    }
}

enum PrimesState {
    Two,
    Odd,
}

/// Iterator over the primes of a [`Sieve`], increasing.
pub struct Primes<'a> {
    s: &'a Sieve,
    state: PrimesState,
    idx: u64,
}

impl Iterator for Primes<'_> {
    type Item = u64;

    fn next(&mut self) -> Option<u64> {
        if let PrimesState::Two = self.state {
            self.state = PrimesState::Odd;
            return (self.s.n_max >= 2).then_some(2);
        }
        while self.idx < self.s.slots {
            let i = self.idx;
            self.idx += 1;
            if self.s.get(i) {
                return Some(2 * i + 1);
            }
        }
        None
    }
}

static GLOBAL: OnceLock<Sieve> = OnceLock::new();

/// The shared sieve to 10^7, built on first use.
pub fn global() -> &'static Sieve {
    GLOBAL.get_or_init(|| Sieve::up_to(LIMIT))
}

/// The sieve's own self-check: `pi(10^6)` and `pi(10^7)` equal the measured values.
/// `Ok(())` or the first disagreement as `(x, got, expected)`.
pub fn self_check(s: &Sieve) -> Result<(), (u64, u64, u64)> {
    let a = s.pi(1_000_000);
    if a != PI_1E6 {
        return Err((1_000_000, a, PI_1E6));
    }
    let b = s.pi(LIMIT);
    if b != PI_1E7 {
        return Err((LIMIT, b, PI_1E7));
    }
    Ok(())
}

fn mulmod(a: u64, b: u64, m: u64) -> u64 {
    ((u128::from(a) * u128::from(b)) % u128::from(m)) as u64
}

fn powmod(mut b: u64, mut e: u64, m: u64) -> u64 {
    let mut acc = 1u64;
    b %= m;
    while e > 0 {
        if e & 1 == 1 {
            acc = mulmod(acc, b, m);
        }
        b = mulmod(b, b, m);
        e >>= 1;
    }
    acc
}

/// Deterministic Miller-Rabin: exact for every `u64` with these twelve bases.
pub fn is_prime_u64(n: u64) -> bool {
    if n < 2 {
        return false;
    }
    const BASES: [u64; 12] = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];
    for p in BASES {
        if n == p {
            return true;
        }
        if n % p == 0 {
            return false;
        }
    }
    let mut d = n - 1;
    let mut r = 0;
    while d % 2 == 0 {
        d /= 2;
        r += 1;
    }
    'bases: for a in BASES {
        let mut x = powmod(a, d, n);
        if x == 1 || x == n - 1 {
            continue;
        }
        for _ in 0..r - 1 {
            x = mulmod(x, x, n);
            if x == n - 1 {
                continue 'bases;
            }
        }
        return false;
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pi_matches_the_measured_receipt_values() {
        let s = global();
        assert_eq!(s.n_max(), LIMIT);
        assert_eq!(s.bytes(), 625_000);
        assert_eq!(s.pi(1_000_000), 78_498);
        assert_eq!(s.pi(LIMIT), 664_579);
        assert_eq!(self_check(s), Ok(()));
    }

    #[test]
    fn iterator_agrees_with_the_count_and_the_first_primes() {
        let s = global();
        let first: Vec<u64> = s.primes().take(10).collect();
        assert_eq!(first, vec![2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
        assert_eq!(s.primes().count() as u64, PI_1E7);
        assert_eq!(s.primes().last(), Some(9_999_991));
    }

    #[test]
    fn sieve_and_miller_rabin_agree_on_every_number_to_200_000() {
        let s = Sieve::up_to(200_000);
        for n in 0..=200_000u64 {
            assert_eq!(s.is_prime(n), is_prime_u64(n), "n={n}");
        }
    }

    #[test]
    fn miller_rabin_handles_large_values() {
        assert!(is_prime_u64(18_446_744_073_709_551_557)); // largest prime below 2^64
        assert!(!is_prime_u64(18_446_744_073_709_551_615));
        assert!(is_prime_u64(1_000_081)); // the rime sphere prime P
        assert!(!is_prime_u64(3_215_031_751)); // strong pseudoprime to bases 2,3,5,7
    }
}
