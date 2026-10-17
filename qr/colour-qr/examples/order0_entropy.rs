//! Order-0 entropy of each file in integers, for the README table of the laws codexes:
//! H = log2(N) - sum(c * log2 c) / N over the byte counts c, log2 in Q62 fixed point by
//! repeated squaring, printed as `h_x10000` (H in bits per byte times 10^4, rounded half up).
#![forbid(unsafe_code)]

const FRAC: u32 = 62;

/// log2(x) in Q62 for x >= 1, each squaring step truncated.
fn log2_q62(x: u64) -> u128 {
    let n = 63 - x.leading_zeros();
    let one = 1u128 << FRAC;
    let mut y = (u128::from(x) << FRAC) >> n;
    let mut res = u128::from(n) << FRAC;
    let mut bit = one >> 1;
    while bit > 0 {
        y = (y * y) >> FRAC;
        if y >= 2 * one {
            y >>= 1;
            res += bit;
        }
        bit >>= 1;
    }
    res
}

fn main() {
    for path in std::env::args().skip(1) {
        let bytes = std::fs::read(&path).expect("read file");
        let mut counts = [0u64; 256];
        for &b in &bytes {
            counts[usize::from(b)] += 1;
        }
        let n = u64::try_from(bytes.len()).expect("length fits u64");
        let sum: u128 = counts
            .iter()
            .filter(|&&c| c > 0)
            .map(|&c| u128::from(c) * log2_q62(c))
            .sum();
        let h = match n {
            0 => 0,
            _ => log2_q62(n).saturating_sub(sum / u128::from(n)),
        };
        let h_x10000 = (h * 20_000 + (1u128 << FRAC)) >> (FRAC + 1);
        let distinct = counts.iter().filter(|&&c| c > 0).count();
        let first4: String = bytes
            .iter()
            .take(4)
            .flat_map(|b| [b >> 4, b & 15])
            .map(|d| char::from(b"0123456789abcdef"[usize::from(d)]))
            .collect();
        let name = path.rsplit('/').next().unwrap_or(&path);
        println!(
            "ENTROPY|file={name}|bytes={n}|distinct={distinct}|h_x10000={h_x10000}|first4={first4}|json=0"
        );
    }
}
