//! Port of universe simulator @3f9f42d `engines/omni_hotel.py:39-49` (ColorPID, gradient colour
//! addressing; the same functions are at `constellation/read_key_gradiated.py:21-39`), including
//! Python's `colorsys.rgb_to_hsv` and `math.dist` reproduced bit for bit in integer arithmetic.

use crate::binary64::B64;
use core::ops::{Add, Div, Mul, Sub};
use sha2::{Digest, Sha256};

/// `CENTER` (`omni_hotel.py:40`).
pub const CENTER: [u8; 3] = [128, 128, 128];

/// `pid_color` (`omni_hotel.py:41-42`): the first three bytes of `sha256(key)`.
pub fn pid_color(key: &str) -> [u8; 3] {
    let h = Sha256::digest(key.as_bytes());
    [h[0], h[1], h[2]]
}

/// Squared Euclidean distance of two colours.
pub fn dist_squared(a: [u8; 3], b: [u8; 3]) -> u32 {
    a.iter()
        .zip(&b)
        .map(|(&x, &y)| u32::from(x.abs_diff(y)).pow(2))
        .sum()
}

/// `color_dist` (`omni_hotel.py:44`), `math.dist(a, b)`: CPython takes `|a_i - b_i|` and returns
/// the correctly rounded root here (the referee checks every `|a - b|` triple in `0..=255`).
pub fn color_dist(a: [u8; 3], b: [u8; 3]) -> B64 {
    B64::from_int(i64::from(dist_squared(a, b))).sqrt()
}

/// `blast_radius` (`omni_hotel.py:43`): `math.dist(c, CENTER)`.
pub fn blast_radius(c: [u8; 3]) -> B64 {
    color_dist(c, CENTER)
}

/// `sphere27` (`omni_hotel.py:47`): `(r//86)*9 + (g//86)*3 + (b//86)`.
pub fn sphere27(c: [u8; 3]) -> u8 {
    (c[0] / 86) * 9 + (c[1] / 86) * 3 + (c[2] / 86)
}

/// Python 3.13 `colorsys.rgb_to_hsv(r/255, g/255, b/255)`, returning `(h, s, v)`.
pub fn hsv(c: [u8; 3]) -> (B64, B64, B64) {
    let [r, g, b] = c.map(|x| B64::from_ratio(i128::from(x), 255));
    let maxc = r.max(g).max(b);
    let minc = r.min(g).min(b);
    let rangec = maxc.sub(minc);
    let v = maxc;
    if minc == maxc {
        return (B64::ZERO, B64::ZERO, v);
    }
    let s = rangec.div(maxc);
    let rc = maxc.sub(r).div(rangec);
    let gc = maxc.sub(g).div(rangec);
    let bc = maxc.sub(b).div(rangec);
    let h = if r == maxc {
        bc.sub(gc)
    } else if g == maxc {
        B64::from_int(2).add(rc).sub(bc)
    } else {
        B64::from_int(4).add(gc).sub(rc)
    };
    let h = h.div(B64::from_int(6)).py_mod_one();
    (h, s, v)
}

/// `rainbow12` (`omni_hotel.py:45-46`): `int(h*12) % 12`.
pub fn rainbow12(c: [u8; 3]) -> u8 {
    let (h, _, _) = hsv(c);
    h.mul(B64::from_int(12)).trunc_int().rem_euclid(12) as u8
}

/// `saturation` (`omni_hotel.py:48-49`): `s * v`.
pub fn saturation(c: [u8; 3]) -> B64 {
    let (_, s, v) = hsv(c);
    s.mul(v)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn grey_has_no_hue() {
        assert_eq!(hsv([7, 7, 7]).0, B64::ZERO);
        assert_eq!(rainbow12([200, 200, 200]), 0);
        assert_eq!(saturation([0, 0, 0]), B64::ZERO);
    }

    #[test]
    fn primaries() {
        // colorsys: red h=0, green h=1/3, blue h=2/3; rainbow12 = 0, 4, 8.
        assert_eq!(rainbow12([255, 0, 0]), 0);
        assert_eq!(rainbow12([0, 255, 0]), 4);
        assert_eq!(rainbow12([0, 0, 255]), 8);
        assert_eq!(sphere27([255, 255, 255]), 26);
        assert_eq!(sphere27([85, 86, 172]), 5);
    }

    #[test]
    fn centre_radius() {
        assert_eq!(blast_radius(CENTER), B64::ZERO);
        assert_eq!(blast_radius([131, 132, 128]), B64::from_int(5));
    }
}
