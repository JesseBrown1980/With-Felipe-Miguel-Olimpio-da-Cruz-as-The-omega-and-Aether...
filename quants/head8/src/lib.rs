//! Integer port of the owner's eight-stage large-message quant head, `quant8` of
//! ASOLARIA-AS-NEURAL-NETWORK `tools/behcs/quant-huge-message-benchmark.mjs` (vendored under
//! `vendor/`), reproducing every stage's JavaScript output bit for bit.
//!
//! The eight stages and their registry ids (ASOLARIA-COMBINED-QUANT-REGISTRY-2026-07-13.hbp):
//!
//! | n | id | upstream line | field |
//! |---|---|---|---|
//! | 1 | `Q-JL-COUNT-SKETCH-1024-v1` | 52-56 | [`count_sketch`] |
//! | 2 | `Q-TURBO-MAXABS-INT8-v1` | 57-58, 67-69 | [`Quant8::turbo`], [`Quant8::scale`] |
//! | 3 | `Q-POLAR-SIGN-BITSET-v1` | 70 | [`Quant8::signs`] |
//! | 4 | `Q-ZETA-LOGMAG4-v1` | 71-72 | [`Quant8::zeta`] |
//! | 5 | `Q-TRIPLE-TERNARY-v1` | 73 | [`Quant8::triple`] |
//! | 6 | `Q-QUADRUPLE-2BIT-v1` | 74 | [`Quant8::quad`] |
//! | 7 | `Q-JS-HIST256-v1` | 75 | [`Quant8::hist`] |
//! | 8 | `Q-PRIMEPOWER-ACC-v1` | 35-49, 76 | [`Quant8::vm_acc`], [`PPOW`] |

#![forbid(unsafe_code)]

pub mod log2;
pub mod number;

pub use number::Number;

/// `D` (line 18): the count-sketch width.
pub const D: usize = 1024;

/// Bytes of [`tuple_buffer`]: 1024 turbo + 128 sign + 1024 zeta + 1024 histogram.
pub const TUPLE_BYTES: usize = D + D / 8 + D + 256 * 4;

/// `CALIBRATION_ROWS` (lines 20-33), the rows the tool prints without `--run`.
pub const CALIBRATION_ROWS: [&str; 12] = [
    "QUANTBENCHHDR|tool=quant-huge-message-benchmark.mjs|purpose=measure-head-tax-vs-tail-gains-of-8-stage-quant-on-large-messages|default=definition-rows-only-no-allocation-no-disk|json=0",
    "QUANTBENCHSCOPE|stages=JL+Turbo+Polar+Zeta+Triple+Quadruple+JS-histogram+von-Mangoldt|status=FAITHFUL_TO_DOCTRINE_NOT_FABRIC_ENGINE_BINDING|fidelity=UNSWEPT|json=0",
    "QUANTBENCHRESULT|message=1MB|head_ms=1.3|sha_gain=62x|write_gain=2x|compare_gain=8x|payload=3.1KB|host=acer|node=v24.13.1|json=0",
    "QUANTBENCHRESULT|message=64MB|head_ms=25.2|sha_gain=4774x|write_gain=158x|compare_gain=166x|payload=3.1KB|host=acer|node=v24.13.1|json=0",
    "QUANTBENCHRESULT|message=256MB|head_ms=123|sha_gain=10239x|write_gain=637x|compare_gain=210x|e2e_gain=8.1x|host=acer|node=v24.13.1|json=0",
    "QUANTBENCHRESULT|message=1024MB|head_ms=574|sha_gain=66158x|write_gain=2881x|compare_gain=1781x|e2e_gain=6.8x|host=acer|node=v24.13.1|json=0",
    "QUANTBENCHRESULT|message=2048MB|head_ms=1062|sha_gain=79303x|write_gain=4662x|compare_gain=1698x|e2e_gain=7.2x|ingest=1928MBps|host=acer|node=v24.13.1|json=0",
    "QUANTBENCHHEADRATE|encode_flat=1.8-to-2.1GBps-from-256MB-to-2GB|meaning=head-tax-is-exactly-linear-never-degrades|json=0",
    "QUANTBENCHAPILIMIT|finding=raw-2GB-message-breaks-node-single-shot-sha256(ERR_OUT_OF_RANGE-2^31-limit)|quant-tuple=never-hits-API-limits|json=0",
    "QUANTBENCHRETENTION|raw=7-messages-of-2GB-fit-16GB-RAM|quant=~5M-tuples-of-3.1KB-fit-16GB-RAM|meaning=GC-envelope-economics-at-message-layer|json=0",
    "QUANTLAW_DRAFT|head=O(size)-paid-once|tail=O(1)-per-consumer|rule=quant-converts-size-tail-cost-to-constant-tuple-cost|status=DRAFT_UNTIL_LIRIS_RERUN_AND_FIDELITY_SWEEP|json=0",
    "QUANTBENCHFTR|rule=probe-overrules-frame|live_run=pass---run-to-measure-current-machine|json=0",
];

/// `PPOW` (lines 35-49): 1 for a prime, 3/4/5 for its square/cube/higher power, else 0.
pub const PPOW: [u8; D] = ppow_table();

const fn is_prime(n: usize) -> bool {
    if n < 2 {
        return false;
    }
    let mut i = 2;
    while i * i <= n {
        if n % i == 0 {
            return false;
        }
        i += 1;
    }
    true
}

const fn ppow_table() -> [u8; D] {
    let mut t = [0u8; D];
    let mut n = 2;
    while n < D {
        if is_prime(n) {
            t[n] = 1;
            n += 1;
            continue;
        }
        let mut p = 2;
        while p * p <= n {
            if is_prime(p) {
                let mut m = n;
                let mut k = 0;
                while m % p == 0 {
                    m /= p;
                    k += 1;
                }
                if m == 1 {
                    t[n] = if k > 3 { 5 } else { k + 1 };
                    break;
                }
            }
            p += 1;
        }
        n += 1;
    }
    t
}

/// The eight channels `quant8` returns (line 78).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Quant8 {
    /// Turbo int8 codes `Math.round(v * 127)` (line 69).
    pub turbo: [i8; D],
    /// Polar sign bitset, bit `j & 7` of byte `j >> 3` set when `v < 0` (line 70).
    pub signs: [u8; D / 8],
    /// Zeta log-magnitude bucket 0..=15 (line 72).
    pub zeta: [u8; D],
    /// Triple ternary code -1, 0, 1 (line 73).
    pub triple: [i8; D],
    /// Quadruple 2-bit class 0..=3 (line 74).
    pub quad: [u8; D],
    /// Histogram of `(q + 128) & 255` (line 75).
    pub hist: [u32; 256],
    /// Sum of `PPOW[j]` over buckets with `q !== 0` (line 76).
    pub vm_acc: u32,
    /// `max`, the largest `Math.abs(proj[j])`, at least `1e-12` (lines 57-58).
    pub scale: Number,
}

/// `1e-12` (line 57).
pub const MAX_FLOOR: Number = Number::from_bits(0x3D71_9799_812D_EA11);
/// `1e-9` (line 72).
pub const ZETA_FLOOR: Number = Number::from_bits(0x3E11_2E0B_E826_D695);
/// `0.33` (line 73).
pub const TRIPLE_EDGE: Number = Number::from_bits(0x3FD5_1EB8_51EB_851F);
/// `0.5` (line 74).
pub const QUAD_EDGE: Number = Number::from_bits(0x3FE0_0000_0000_0000);
/// `127` (lines 68 and 89).
const N127: Number = Number::from_bits(0x405F_C000_0000_0000);
/// `128` (line 75).
const N128: Number = Number::from_bits(0x4060_0000_0000_0000);
/// `15` (line 72).
const ZETA_TOP: i32 = 15;

/// `(i * 2654435761) >>> 0` (line 54): the binary64 product, then `ToUint32`.
///
/// The product is exact while `i * 2654435761 < 2^53` (`i <= 3_393_263`); above that it is
/// rounded to 53 bits first, as in JavaScript.
#[inline]
pub fn jl_hash(i: u64) -> u32 {
    assert!(i < 1 << 53, "array indices stay below 2^53");
    let exact = u128::from(i) * 2_654_435_761;
    if exact < 1 << 53 {
        return exact as u32;
    }
    // Both factors are exact binary64 integers, so the product's one rounding is to 53
    // significant bits, ties to even: add half a unit less one, plus the unit's own bit, then
    // clear the bits below the unit. ToUint32 keeps the low 32 bits, which modulo-2^64
    // arithmetic on the low word already determines.
    let shift = 75 - exact.leading_zeros();
    let low = exact as u64;
    let unit = 1u64 << shift;
    let rounded = low.wrapping_add((unit >> 1) - 1 + ((low >> shift) & 1)) & !(unit - 1);
    rounded as u32
}

/// Stage 1, the JL count-sketch (lines 52-56): `proj[h & (D - 1)] += (h & 0x80000000) ? -msg[i]
/// : msg[i]` over the message's Numbers in order.
pub fn count_sketch<I: IntoIterator<Item = Number>>(msg: I) -> [Number; D] {
    let mut sketch = Sketch::new();
    for (i, x) in msg.into_iter().enumerate() {
        let h = jl_hash(i as u64);
        sketch.add(
            h as usize & (D - 1),
            if h & 0x8000_0000 != 0 { -x } else { x },
        );
    }
    sketch.finish()
}

/// The `proj` accumulators of [`count_sketch`].
///
/// While every addend and every bucket sum is an integer multiple of `2^-unit` below `2^53`
/// units (`unit <= 1074`), each exact sum is a binary64 value, so each JavaScript `+=` returns
/// it unrounded and the buckets are held as integers `acc[j]` (a bucket is never `-0`: it starts
/// at `+0` and `x + -x` is `+0`). The first addend that would break this converts every bucket
/// to its exact Number and the remaining additions round through [`Number`] one by one.
struct Sketch {
    acc: [i64; D],
    unit: u32,
    exact: bool,
    proj: [Number; D],
}

impl Sketch {
    fn new() -> Sketch {
        Sketch {
            acc: [0; D],
            unit: 0,
            exact: true,
            proj: [Number::ZERO; D],
        }
    }

    #[inline]
    fn add(&mut self, j: usize, y: Number) {
        if self.exact {
            if let Some(k) = self.units(y) {
                let sum = self.acc[j] + k;
                if sum.unsigned_abs() < 1 << 53 {
                    self.acc[j] = sum;
                    return;
                }
            }
            self.leave_exact();
        }
        self.proj[j] = self.proj[j] + y;
    }

    /// `y` as a count of `2^-unit`, raising `unit` when `y` is finer and the buckets allow it.
    #[inline]
    fn units(&mut self, y: Number) -> Option<i64> {
        let bits = y.to_bits();
        let biased = ((bits >> 52) & 0x7FF) as i32;
        let down = 1075 - biased - self.unit as i32;
        if biased != 0 && (0..53).contains(&down) {
            // A normal y = mant * 2^-(unit + down): a whole number of units when the bits shifted
            // out are zero.
            let mant = (bits & ((1 << 52) - 1)) | (1 << 52);
            if mant.trailing_zeros() >= down as u32 {
                let k = (mant >> down) as i64;
                let sign = (bits as i64) >> 63;
                return Some((k ^ sign) - sign);
            }
        }
        let (negative, mant, exp) = y.decompose()?;
        if mant == 0 {
            return Some(0);
        }
        let lsb = exp + mant.trailing_zeros() as i32;
        if lsb < -(self.unit as i32) && !self.refine((-lsb) as u32) {
            return None;
        }
        let shift = exp + self.unit as i32;
        let k = if shift >= 0 {
            if shift > mant.leading_zeros() as i32 - 11 {
                return None;
            }
            mant << shift
        } else {
            mant >> shift.unsigned_abs()
        };
        Some(if negative { -(k as i64) } else { k as i64 })
    }

    /// Re-expresses every bucket in units of `2^-unit` when all stay below `2^53` units.
    fn refine(&mut self, unit: u32) -> bool {
        let lift = unit - self.unit;
        let widest = self.acc.iter().map(|a| a.unsigned_abs()).max().unwrap_or(0);
        if widest != 0 {
            if 64 - widest.leading_zeros() + lift > 53 {
                return false;
            }
            for a in &mut self.acc {
                *a <<= lift;
            }
        }
        self.unit = unit;
        true
    }

    fn leave_exact(&mut self) {
        for (p, &a) in self.proj.iter_mut().zip(&self.acc) {
            *p = Number::from_scaled(a, self.unit);
        }
        self.exact = false;
    }

    fn finish(mut self) -> [Number; D] {
        if self.exact {
            self.leave_exact();
        }
        self.proj
    }
}

/// Stages 2-8 over a count-sketch (lines 57-78).
pub fn quantize(proj: &[Number; D]) -> Quant8 {
    let mut max = MAX_FLOOR;
    for p in proj {
        let a = p.abs();
        if a.gt(max) {
            max = a;
        }
    }
    let mut out = Quant8 {
        turbo: [0; D],
        signs: [0; D / 8],
        zeta: [0; D],
        triple: [0; D],
        quad: [0; D],
        hist: [0; 256],
        vm_acc: 0,
        scale: max,
    };
    for (j, p) in proj.iter().enumerate() {
        let v = *p / max;
        let q = (v * N127).js_round();
        out.turbo[j] = q.to_int8();
        if v.lt(Number::ZERO) {
            out.signs[j >> 3] |= 1 << (j & 7);
        }
        let a = v.abs();
        out.zeta[j] = if a.lt(ZETA_FLOOR) {
            ZETA_TOP as u8
        } else {
            ZETA_TOP.min((-log2::log2(a)).to_int32()) as u8
        };
        out.triple[j] = if v.gt(TRIPLE_EDGE) {
            1
        } else if v.lt(-TRIPLE_EDGE) {
            -1
        } else {
            0
        };
        out.quad[j] = if v.gt(QUAD_EDGE) {
            3
        } else if v.gt(Number::ZERO) {
            2
        } else if v.gt(-QUAD_EDGE) {
            1
        } else {
            0
        };
        let bin = ((q + N128).to_int32() & 255) as usize;
        out.hist[bin] = out.hist[bin].wrapping_add(1);
        if !q.js_eq(Number::ZERO) {
            out.vm_acc += u32::from(PPOW[j]);
        }
    }
    out
}

/// `quant8(msg)` (lines 51-79) over a `Float64Array`'s elements.
pub fn quant8(msg: &[Number]) -> Quant8 {
    quantize(&count_sketch(msg.iter().copied()))
}

/// `tupleBuffer(q)` (lines 81-86): turbo, signs, zeta and the histogram's little-endian bytes.
pub fn tuple_buffer(q: &Quant8) -> Vec<u8> {
    let mut out = Vec::with_capacity(TUPLE_BYTES);
    out.extend(q.turbo.iter().map(|&t| t as u8));
    out.extend_from_slice(&q.signs);
    out.extend_from_slice(&q.zeta);
    for h in q.hist {
        out.extend_from_slice(&h.to_le_bytes());
    }
    out
}

/// `dotQ(qa, qb)` (line 89): `s * qa.scale * qb.scale / 16129` with `s` the integer turbo dot.
pub fn dot_q(qa: &Quant8, qb: &Quant8) -> Number {
    let s: i64 = qa
        .turbo
        .iter()
        .zip(qb.turbo.iter())
        .map(|(&a, &b)| i64::from(a) * i64::from(b))
        .sum();
    Number::from_i64(s) * qa.scale * qb.scale / Number::from_u64(16129)
}

/// `dotRaw(a, b)` (line 88): `s += a[i] * b[i]` from `s = 0` for `i < a.length`. Past the end
/// of `b`, `b[i]` is `undefined` and `a[i] * undefined` is NaN, so the result is NaN.
pub fn dot_raw<A, B>(a: A, b: B) -> Number
where
    A: IntoIterator<Item = Number>,
    B: IntoIterator<Item = Number>,
{
    let mut b = b.into_iter();
    let mut s = Number::ZERO;
    for x in a {
        match b.next() {
            Some(y) => s = s + x * y,
            None => return Number::NAN,
        }
    }
    s
}

/// The 32-bit state sequence of `fill(arr, seed)` (line 91), `s = (s * 1664525 + 1013904223) >>> 0`
/// from `s = seed >>> 0` (exact in binary64: the sum stays below 2^53).
#[derive(Clone, Debug)]
pub struct Fill {
    state: u32,
}

impl Fill {
    /// The generator `fill` starts from `seed >>> 0`.
    pub fn new(seed: u32) -> Fill {
        Fill { state: seed }
    }
}

impl Iterator for Fill {
    type Item = Number;

    /// The next element, `(s / 2147483648) - 1`: both operations are exact in binary64
    /// (`s < 2^32`), so the element is exactly `(s - 2^31) * 2^-31`.
    fn next(&mut self) -> Option<Number> {
        self.state = (u64::from(self.state) * 1_664_525 + 1_013_904_223) as u32;
        Some(Number::from_scaled(i64::from(self.state) - (1 << 31), 31))
    }
}

/// `fill(new Float64Array(len), seed)` (line 91).
pub fn fill(len: usize, seed: u32) -> Vec<Number> {
    Fill::new(seed).take(len).collect()
}

/// `Math.floor(mb * 1048576 / 8)` (line 103): the element count of an `mb`-megabyte message.
pub fn message_dims(mb: u64) -> usize {
    (mb * 1_048_576 / 8) as usize
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ppow_marks_primes_and_prime_powers() {
        assert_eq!(&PPOW[..10], &[0, 0, 1, 1, 3, 1, 0, 1, 4, 3]);
        assert_eq!(PPOW[16], 5);
        assert_eq!(PPOW[512], 5);
        assert_eq!(PPOW[961], 3);
        assert_eq!(PPOW[1021], 1);
        assert_eq!(PPOW[1022], 0);
    }

    #[test]
    fn jl_hash_rounds_the_product_above_2_pow_53() {
        assert_eq!(jl_hash(1), 2_654_435_761);
        // 3_393_263 * 2654435761 = 9007198653678143, below 2^53: exact.
        assert_eq!(jl_hash(3_393_263), (3_393_263u64 * 2_654_435_761) as u32);
        // 3_393_265 * 2654435761 = 9007203962549665, above 2^53 and odd: binary64 keeps it even.
        let rounded = jl_hash(3_393_265);
        assert_eq!(rounded % 2, 0);
        assert_ne!(rounded, (3_393_265u64 * 2_654_435_761) as u32);
        let c = Number::from_u64(2_654_435_761);
        let mut i = 3_393_230u64;
        while i < 1 << 53 {
            for j in i..i + 64 {
                assert_eq!(jl_hash(j), (Number::from_u64(j) * c).to_uint32(), "{j}");
            }
            i = i * 3 / 2 + 7;
        }
    }

    #[test]
    fn fill_elements_equal_the_two_rounded_operations() {
        let mut state = 7u32;
        for x in Fill::new(7).take(200_000) {
            state = (u64::from(state) * 1_664_525 + 1_013_904_223) as u32;
            let literal =
                Number::from_u64(u64::from(state)) / Number::from_u64(1 << 31) - Number::ONE;
            assert_eq!(x, literal);
        }
        for s in [0u32, 1, 1 << 31, (1 << 31) - 1, (1 << 31) + 1, u32::MAX] {
            let literal = Number::from_u64(u64::from(s)) / Number::from_u64(1 << 31) - Number::ONE;
            assert_eq!(
                Number::from_scaled(i64::from(s) - (1 << 31), 31),
                literal,
                "{s}"
            );
        }
    }

    #[test]
    fn fill_matches_the_lcg() {
        let x = fill(2, 12345);
        let s1 = (12345u64 * 1_664_525 + 1_013_904_223) as u32;
        assert_eq!(
            x[0],
            Number::from_i64(i64::from(s1) - (1 << 31)) / Number::from_u64(1 << 31)
        );
    }

    #[test]
    fn dot_raw_runs_over_a() {
        // Line 88 under Node v22.22.0: dotRaw([1,2,3], [1,2]) is NaN, dotRaw([1,2], [1,2,3]) is 5.
        let n = |v: &[u64]| v.iter().map(|&k| Number::from_u64(k)).collect::<Vec<_>>();
        assert!(dot_raw(n(&[1, 2, 3]), n(&[1, 2])).is_nan());
        assert!(dot_raw(n(&[1]), n(&[])).is_nan());
        assert_eq!(dot_raw(n(&[1, 2]), n(&[1, 2, 3])), Number::from_u64(5));
        assert_eq!(dot_raw(n(&[]), n(&[1])), Number::ZERO);
    }

    #[test]
    fn empty_message_gives_the_floor_scale() {
        let q = quant8(&[]);
        assert_eq!(q.scale, MAX_FLOOR);
        assert!(q.zeta.iter().all(|&z| z == 15));
        assert!(q.quad.iter().all(|&c| c == 1));
        assert_eq!(q.hist[128], 1024);
        assert_eq!(q.vm_acc, 0);
        assert_eq!(tuple_buffer(&q).len(), TUPLE_BYTES);
    }
}
