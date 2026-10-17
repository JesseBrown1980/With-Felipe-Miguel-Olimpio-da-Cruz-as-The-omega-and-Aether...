//! Independent integer-only re-derivation of PR #90 / Issue #84 Rainbow-27 claims.

fn gcd(a: u64, b: u64) -> u64 {
    if b == 0 {
        a
    } else {
        gcd(b, a % b)
    }
}

/// Normalized class key: GCD-primitive (S^2, Q, Q), or DARK as (0,0,0).
fn class_key(r: u64, g: u64, b: u64) -> (u64, u64, u64) {
    let s = r + g + b;
    let q = r * r + g * g + b * b - r * g - r * b - g * b;
    let i = (s * s, q, q);
    if i == (0, 0, 0) {
        return i;
    }
    let d = gcd(gcd(i.0, i.1), i.2);
    (i.0 / d, i.1 / d, i.2 / d)
}

fn raw_key(r: u64, g: u64, b: u64) -> (u64, u64) {
    let s = r + g + b;
    (s * s, r * r + g * g + b * b - r * g - r * b - g * b)
}

fn tuples() -> Vec<(u64, u64, u64)> {
    let mut v = Vec::with_capacity(27);
    for r in 0..3 {
        for g in 0..3 {
            for b in 0..3 {
                v.push((r, g, b));
            }
        }
    }
    v
}

fn histogram<K: Ord + Copy>(keys: &[K]) -> Vec<usize> {
    let mut sorted = keys.to_vec();
    sorted.sort();
    let mut h = Vec::new();
    let mut i = 0;
    while i < sorted.len() {
        let mut j = i;
        while j < sorted.len() && sorted[j] == sorted[i] {
            j += 1;
        }
        h.push(j - i);
        i = j;
    }
    h.sort();
    h
}

/// True when (class, witness) is injective over all 27 tuples.
fn separates<W: Ord + Copy>(t: &[(u64, u64, u64)], w: impl Fn(u64, u64, u64) -> W) -> bool {
    let mut pairs: Vec<((u64, u64, u64), W)> = t
        .iter()
        .map(|&(r, g, b)| (class_key(r, g, b), w(r, g, b)))
        .collect();
    pairs.sort();
    pairs.windows(2).all(|p| p[0] != p[1])
}

fn main() {
    let t = tuples();
    let raw: Vec<_> = t.iter().map(|&(r, g, b)| raw_key(r, g, b)).collect();
    let norm: Vec<_> = t.iter().map(|&(r, g, b)| class_key(r, g, b)).collect();
    let hr = histogram(&raw);
    let hn = histogram(&norm);
    println!("RAW|classes={}|hist={:?}|json=0", hr.len(), hr);
    println!(
        "NORM|classes={}|hist={:?}|max_class={}|json=0",
        hn.len(),
        hn,
        hn.iter().max().copied().unwrap_or(0)
    );

    let w_ok = separates(&t, |r, g, b| (r + 4 * g + 3 * b + 4 * r * g) % 8);
    println!(
        "WITNESS|W=(r+4g+3b+4rg)mod8|separates_all_27={}|json=0",
        u8::from(w_ok)
    );

    let mut first_m11 = None;
    for m in 2..=11u64 {
        let mut count = 0u64;
        for a in 0..m {
            for bb in 0..m {
                for c in 0..m {
                    if separates(&t, |r, g, b| (a * r + bb * g + c * b) % m) {
                        count += 1;
                        if m == 11 && first_m11.is_none() {
                            first_m11 = Some((a, bb, c));
                        }
                    }
                }
            }
        }
        println!("AFFINE|m={m}|separating_triples={count}|json=0");
    }
    println!("AFFINE_FIRST_M11|coeffs={:?}|json=0", first_m11);

    // Two bits cannot suffice: pigeonhole on the largest class.
    let two_bit =
        (0u64..256).any(|code| separates(&t, |r, g, b| (code >> ((9 * r + 3 * g + b) % 8)) & 3));
    println!(
        "PIGEONHOLE|largest_class_gt_4={}|sample_2bit_family_separates={}|json=0",
        u8::from(hn.iter().max().copied().unwrap_or(0) > 4),
        u8::from(two_bit)
    );
}
