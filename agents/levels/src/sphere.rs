//! players/rime_sphere.py:15-43 (`is_prime`, `factor`, `primitive_root`), the helpers the Fischer
//! and MCP agents import (rime_agents.py:23, rime_fischer.py:18, rime_fischer_cluster.py:23,
//! rime_27fischers.py:23), and the Python `pow` / `math.isqrt` forms they call.

/// Python `pow(base, exp, m)` for `m >= 1`.
pub fn pow_mod(base: u64, mut exp: u64, m: u64) -> u64 {
    assert!(m >= 1, "pow() 3rd argument cannot be 0");
    let m128 = u128::from(m);
    let mut b = u128::from(base) % m128;
    let mut r = 1u128 % m128;
    while exp > 0 {
        if exp & 1 == 1 {
            r = r * b % m128;
        }
        b = b * b % m128;
        exp >>= 1;
    }
    r as u64
}

/// Python `pow(a, -1, m)`: the inverse of `a` modulo `m`, or `None` where Python raises
/// `ValueError("base is not invertible for the given modulus")`.
pub fn inv_mod(a: u64, m: u64) -> Option<u64> {
    assert!(m >= 1, "pow() 3rd argument cannot be 0");
    let (mut r0, mut r1) = (i128::from(m), i128::from(a % m));
    let (mut t0, mut t1) = (0i128, 1i128);
    while r1 != 0 {
        let q = r0 / r1;
        (r0, r1) = (r1, r0 - q * r1);
        (t0, t1) = (t1, t0 - q * t1);
    }
    if r0 != 1 {
        return None;
    }
    Some(t0.rem_euclid(i128::from(m)) as u64)
}

/// Python `pow(base, -exp, m)` (Python 3.8+): `pow(pow(base, -1, m), exp, m)` for `exp >= 1`;
/// for `exp = 0`, `-0` is `0` and Python returns `pow(base, 0, m)` without an inverse.
pub fn pow_mod_neg(base: u64, exp: u64, m: u64) -> Option<u64> {
    if exp == 0 {
        return Some(pow_mod(base, 0, m));
    }
    inv_mod(base, m).map(|inv| pow_mod(inv, exp, m))
}

/// `math.isqrt(n)`: the floor of the square root.
pub fn isqrt(n: u64) -> u64 {
    if n < 2 {
        return n;
    }
    let n = u128::from(n);
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x as u64
}

const BASES: [u64; 12] = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];

/// `is_prime(n)` (rime_sphere.py:15-28): trial division by the primes up to 37, then
/// Miller-Rabin with those twelve bases.
pub fn is_prime(n: u64) -> bool {
    if n < 2 {
        return false;
    }
    for p in BASES {
        if n % p == 0 {
            return n == p;
        }
    }
    let (mut d, mut r) = (n - 1, 0u32);
    while d % 2 == 0 {
        d /= 2;
        r += 1;
    }
    'bases: for a in BASES {
        let mut x = pow_mod(a, d, n);
        if x == 1 || x == n - 1 {
            continue;
        }
        for _ in 0..r.saturating_sub(1) {
            x = (u128::from(x) * u128::from(x) % u128::from(n)) as u64;
            if x == n - 1 {
                continue 'bases;
            }
        }
        return false;
    }
    true
}

/// `factor(n)` (rime_sphere.py:30-36): the set of prime factors, here in ascending order.
pub fn factor(mut n: u64) -> Vec<u64> {
    let mut f = Vec::new();
    let mut d = 2u64;
    while d * d <= n {
        while n % d == 0 {
            if f.last() != Some(&d) {
                f.push(d);
            }
            n /= d;
        }
        d += 1;
    }
    if n > 1 && !f.contains(&n) {
        f.push(n);
    }
    f
}

/// `primitive_root(p)` (rime_sphere.py:38-43): the least `g` in `2..p` with
/// `pow(g, (p-1)//q, p) != 1` for every prime `q` dividing `p - 1`.
pub fn primitive_root(p: u64) -> Option<u64> {
    let fac = factor(p - 1);
    (2..p).find(|&g| fac.iter().all(|&q| pow_mod(g, (p - 1) / q, p) != 1))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn trial(n: u64) -> bool {
        n >= 2 && (2..n).take_while(|d| d * d <= n).all(|d| n % d != 0)
    }

    #[test]
    fn is_prime_agrees_with_trial_division() {
        for n in 0..20_000u64 {
            assert_eq!(is_prime(n), trial(n), "{n}");
        }
        for n in 1_000_000..1_002_000u64 {
            assert_eq!(is_prime(n), trial(n), "{n}");
        }
    }

    #[test]
    fn modular_forms() {
        assert_eq!(pow_mod(7, 0, 1), 0);
        assert_eq!(pow_mod(7, 77_777, 1_000_081), {
            let mut r = 1u64;
            for _ in 0..77_777 {
                r = r * 7 % 1_000_081;
            }
            r
        });
        assert_eq!(inv_mod(3, 7), Some(5));
        assert_eq!(inv_mod(6, 9), None);
        assert_eq!(pow_mod_neg(7, 0, 1_000_081), Some(1));
        assert_eq!(pow_mod_neg(39, 0, 57), Some(1));
        assert_eq!(pow_mod_neg(6, 0, 1), Some(0));
        assert_eq!(pow_mod_neg(6, 1, 9), None);
        let inv = pow_mod_neg(7, 5, 1_000_081).unwrap();
        assert_eq!(inv * pow_mod(7, 5, 1_000_081) % 1_000_081, 1);
        for n in 0..10_000u64 {
            let s = isqrt(n);
            assert!(s * s <= n && (s + 1) * (s + 1) > n);
        }
        assert_eq!(isqrt(u64::MAX), 4_294_967_295);
    }

    #[test]
    fn roots_of_the_spheres() {
        assert_eq!(factor(1_000_080), vec![2, 3, 5, 463]);
        assert_eq!(factor(12), vec![2, 3]);
        assert_eq!(primitive_root(1_000_081), Some(7));
        assert_eq!(primitive_root(2), None);
        assert_eq!(primitive_root(163), Some(2));
        assert_eq!(primitive_root(271), Some(6));
        assert_eq!(primitive_root(379), Some(2));
    }
}
