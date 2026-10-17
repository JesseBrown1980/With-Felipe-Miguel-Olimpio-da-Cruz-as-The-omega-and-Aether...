//! Port of stone-to-moss @f032bc0 `experiments/seat3/rainbow27_v2/rainbow27_v2.py`: the 27
//! ordered RGB addresses over `{0,1,2}^3`, the `(S^2, Q, Q)` weights and their primitive form, the
//! projector and its restore, the SHA-256 rejection sampler, and the 59,049-row HBP trace. The
//! JSON summary and the HBI index that pins it (`:153-180`) are not ported (no JSON in this lane).

use crate::sha256_hex;
use sha2::{Digest, Sha256};

/// `DOMAIN` (`:11`).
pub const DOMAIN: &[u8] = b"ASOLARIA-R27-V2|TICKET|";
/// `SOURCE_SEED` (`:12`).
pub const SOURCE_SEED: &[u8] = b"ASOLARIA-R27-V2-SOURCE-20261015";
/// `ORIGINAL_HEAD` (`:13`).
pub const ORIGINAL_HEAD: &str = "5045b5b2ee1960bc469b5588a1b17601490aef6a";
/// `PEER_HEAD` (`:14`).
pub const PEER_HEAD: &str = "98e62f1e7218c7fbb20e21fd5c3d734304e4ee6a";
/// `TOTAL` (`:15`).
pub const TOTAL: usize = 27 * 81 * 27;

/// `fixture` (`:20-22`): eight SHA-256 blocks of the seed and a little-endian counter.
pub fn fixture() -> Vec<u8> {
    (0u32..8)
        .flat_map(|i| {
            let mut h = Sha256::new();
            h.update(SOURCE_SEED);
            h.update(i.to_le_bytes());
            h.finalize().to_vec()
        })
        .collect()
}

/// `address` (`:24-26`): `9r + 3g + b`.
pub fn address(rgb: [u64; 3]) -> u64 {
    9 * rgb[0] + 3 * rgb[1] + rgb[2]
}

/// `decode` (`:28-30`).
pub fn decode(a: u64) -> [u64; 3] {
    assert!(a < 27, "address outside 0..27");
    [a / 9, (a / 3) % 3, a % 3]
}

/// `weights` (`:32-37`): `(s^2, q, q)` with `s = r+g+b`, `q = r^2+g^2+b^2-rg-rb-gb`.
pub fn weights(rgb: [u64; 3]) -> [u64; 3] {
    let [r, g, b] = rgb;
    let s = r + g + b;
    let q = r * r + g * g + b * b - r * g - r * b - g * b;
    assert_eq!(s * s + 2 * q, 3 * (r * r + g * g + b * b));
    [s * s, q, q]
}

fn gcd(a: u64, b: u64) -> u64 {
    if b == 0 {
        a
    } else {
        gcd(b, a % b)
    }
}

/// `primitive` (`:39-41`): divided by the gcd, or `(0,0,0)`.
pub fn primitive(w: [u64; 3]) -> [u64; 3] {
    let g = gcd(gcd(w[0], w[1]), w[2]);
    if g == 0 {
        [0, 0, 0]
    } else {
        w.map(|x| x / g)
    }
}

/// `projector` (`:43-47`): `s` and `d = 3x - s`.
pub fn projector(rgb: [u64; 3]) -> (i64, [i64; 3]) {
    let s: i64 = rgb.iter().map(|&x| x as i64).sum();
    let d = rgb.map(|x| 3 * x as i64 - s);
    assert_eq!(d.iter().sum::<i64>(), 0);
    (s, d)
}

/// `restore` (`:49-53`): `(d + s) / 3`.
pub fn restore(s: i64, d: [i64; 3]) -> [i64; 3] {
    assert_eq!(d.iter().sum::<i64>(), 0);
    assert!(d.iter().all(|&v| (v + s).rem_euclid(3) == 0));
    d.map(|v| (v + s).div_euclid(3))
}

/// `x mod m` for the 256-bit big-endian integer `x`.
fn mod_small(x: &[u8; 32], m: u64) -> u64 {
    x.iter().fold(0u128, |r, &byte| {
        (r * 256 + u128::from(byte)) % u128::from(m)
    }) as u64
}

/// `x < (2^256 // den) * den`, i.e. `x < 2^256 - (2^256 mod den)`.
fn below_ceiling(x: &[u8; 32], den: u64) -> bool {
    let two_256_mod = (0..256).fold(1u128, |r, _| (r * 2) % u128::from(den)) as u64;
    if two_256_mod == 0 {
        return true;
    }
    // x >= 2^256 - k  <=>  x + k carries out of 256 bits.
    let mut carry = u128::from(two_256_mod);
    for &byte in x.iter().rev() {
        carry = (carry + u128::from(byte)) >> 8;
        if carry == 0 {
            break;
        }
    }
    carry == 0
}

/// `sample` (`:55-67`): `"H"` for weight zero, otherwise the lane `"0"`, `"1"` or `"2"`.
pub fn sample(wave: u16, loc: u16, p: [u64; 3]) -> &'static str {
    let den: u64 = p.iter().sum();
    if den == 0 {
        return "H";
    }
    for retry in 0u32..10000 {
        let mut h = Sha256::new();
        h.update(DOMAIN);
        h.update(wave.to_le_bytes());
        h.update(loc.to_le_bytes());
        h.update(retry.to_le_bytes());
        let ticket: [u8; 32] = h.finalize().into();
        if below_ceiling(&ticket, den) {
            let residue = mod_small(&ticket, den);
            return if residue < p[0] {
                "0"
            } else if residue < p[0] + p[1] {
                "1"
            } else {
                "2"
            };
        }
    }
    panic!("REJECTION_LIMIT");
}

/// Orbit sizes of the 27 addresses under raw and primitive weights (`census`, `:103-119`).
pub fn orbit_sizes() -> (Vec<usize>, Vec<usize>) {
    let sizes = |key: &dyn Fn([u64; 3]) -> [u64; 3]| {
        let mut keys: Vec<[u64; 3]> = (0..27).map(|i| key(weights(decode(i)))).collect();
        keys.sort_unstable();
        let mut out = Vec::new();
        let mut i = 0;
        while i < keys.len() {
            let j = (i..keys.len())
                .find(|&j| keys[j] != keys[i])
                .unwrap_or(keys.len());
            out.push(j - i);
            i = j;
        }
        out.sort_unstable();
        out
    };
    (sizes(&|w| w), sizes(&primitive))
}

/// The trace `rainbow27-v2.hbp` (`:134-147`) and its lane counts and dark count.
pub fn trace() -> (Vec<u8>, [u64; 3], u64) {
    let source_sha = sha256_hex(&fixture());
    let mut out = format!(
        "R27V2|schema=LOSSLESS-ORDER-PRIMITIVE-PROB-V1|source_sha256={source_sha}\
         |producer_sha={ORIGINAL_HEAD}|peer_sha={PEER_HEAD}|json=0\n"
    );
    let mut counts = [0u64; 3];
    let mut held = 0u64;
    for wave in 0u16..27 {
        for loc in 0u16..81 {
            for idx in 0u64..27 {
                let rgb = decode(idx);
                let w = weights(rgb);
                let p = primitive(w);
                let lane = sample(wave, loc, p);
                match lane {
                    "H" => held += 1,
                    other => counts[other.parse::<usize>().unwrap_or(0)] += 1,
                }
                out.push_str(&format!(
                    "CASE|w={wave:02}|loc={loc:02}|id={idx:02}|rgb={}{}{}|raw={},{},{}\
                     |prim={},{},{}|den={}|lane={lane}\n",
                    rgb[0],
                    rgb[1],
                    rgb[2],
                    w[0],
                    w[1],
                    w[2],
                    p[0],
                    p[1],
                    p[2],
                    p.iter().sum::<u64>()
                ));
            }
        }
    }
    (out.into_bytes(), counts, held)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn addresses_round_trip_and_orbits() {
        for a in 0..27 {
            assert_eq!(address(decode(a)), a);
            let (s, d) = projector(decode(a));
            assert_eq!(restore(s, d), decode(a).map(|x| x as i64));
        }
        let (raw, norm) = orbit_sizes();
        assert_eq!(raw, vec![1, 1, 1, 3, 3, 3, 3, 3, 3, 6]);
        assert_eq!(norm, vec![1, 2, 3, 3, 6, 6, 6]);
    }

    #[test]
    fn ceiling_arithmetic() {
        // den = 3: 2^256 mod 3 = 1, so only x = 2^256 - 1 is rejected.
        assert!(!below_ceiling(&[0xff; 32], 3));
        let mut x = [0xff; 32];
        x[31] = 0xfe;
        assert!(below_ceiling(&x, 3));
        assert!(below_ceiling(&[0xff; 32], 4));
        assert_eq!(mod_small(&[0xff; 32], 3), 0);
    }

    #[test]
    fn negatives_on_sampling() {
        // :90-96: zero weight is held; positive scale leaves the lane unchanged.
        assert_eq!(sample(0, 0, [0, 0, 0]), "H");
        for w in 0..27 {
            for loc in 0..81 {
                let a = sample(w, loc, primitive(weights([1, 0, 0])));
                assert_eq!(a, sample(w, loc, primitive(weights([2, 0, 0]))));
            }
        }
    }
}
