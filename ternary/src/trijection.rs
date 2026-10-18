//! The trijection: three points and one explicit centre. Port of the owner's `trijection.py`
//! ("THE TRIJECTION CODEC (balanced-ternary, center-free). Operator: Jesse Daniel Brown. Sealed
//! 2026-07-21."; ACER `C:\asolaria-acer\scratch\algorithms-of-asolaria-publication-20260723\
//! tools\honest-compressor\trijection\trijection.py`, 6,443 bytes, sha256 `c5005b1c…`, git blob
//! `e9cbeb8b…`, vendored byte-identical under
//! `vendor/acer-algorithms-of-asolaria-publication-20260723/tools/honest-compressor/trijection/`).
//!
//! | Rust | `trijection.py` |
//! |---|---|
//! | [`trij`] | `:55-56`, the body of `trijection_forward`'s loop: `s = a + bb + c; c0 = s // 3; rem = s % 3`, `sa = a - c0`, `sb = bb - c0` |
//! | [`Trijection::restore`] | `:62`, the body of `trijection_inverse`'s loop: `a = c0 + sa; bb = c0 + sb; c = c0 + rem - sa - sb` |
//! | [`trijection_forward`] | `:50-57` |
//! | [`trijection_inverse`] | `:59-64` |
//! | [`zero_trits`] | `:83-88`, the zero-trit count of `measure()` (the counts; `:88` divides them in float) |
//!
//! The same formulas are the law `books/operator-laws/TRIJECTION-BALANCED-TERNARY.md:13-18`
//! (universe simulator @3f9f42d) and the file's docstring `:11-17`.
//!
//! `trijection.py` runs the loop body on bytes (`bytearray`). [`trij`] and
//! [`Trijection::restore`] take `i64` with `i128` working values, so every `i64` triple is exact;
//! on bytes they compute the values `:55-56` and `:62` compute. `//` and `%` are Python's floor
//! operators; for the divisor 3 they equal `div_euclid` and `rem_euclid`.
//!
//! Only integer code is ported. `H_bits` (`:38-40`, `math.log2`), `lz` (`:66-67`, `lzma`) and the
//! float prints of `measure()` (`:89-98`), and the `math.sin` signal of `__main__` (`:123`), are
//! the owner's reporting and demo code; `tools/referee.py --measure` runs them unchanged.

use alloc::vec::Vec;

use crate::balanced::to_balanced_ternary;
use asolaria_tribit::Zero;

/// `(c0, sa, sb, rem)` for one triple `(a, b, c)`.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct Trijection {
    /// The centre `s // 3` (`trijection.py:55`).
    pub c0: i128,
    /// The separation `a - c0` (`:56`).
    pub sa: i128,
    /// The separation `bb - c0` (`:56`).
    pub sb: i128,
    /// `s % 3`, in `0..=2` (`:55`).
    pub rem: u8,
}

/// Forward for one triple, `trijection.py:55-56`.
pub fn trij(a: i64, b: i64, c: i64) -> Trijection {
    // :55 `s = a + bb + c; c0 = s // 3; rem = s % 3`
    let s = i128::from(a) + i128::from(b) + i128::from(c);
    let c0 = s.div_euclid(3);
    let rem = s.rem_euclid(3) as u8;
    Trijection {
        c0,
        // :56 `SA.append(a - c0)`
        sa: i128::from(a) - c0,
        // :56 `SB.append(bb - c0)`
        sb: i128::from(b) - c0,
        rem,
    }
}

impl Trijection {
    /// Inverse for one triple, `trijection.py:62`: `a = c0 + sa; bb = c0 + sb;
    /// c = c0 + rem - sa - sb`. `None` when a value is outside `i64`, which happens only for a
    /// tuple that [`trij`] did not produce.
    pub fn restore(&self) -> Option<(i64, i64, i64)> {
        let a = self.c0.checked_add(self.sa)?;
        let b = self.c0.checked_add(self.sb)?;
        let c = self
            .c0
            .checked_add(i128::from(self.rem))?
            .checked_sub(self.sa)?
            .checked_sub(self.sb)?;
        Some((
            i64::try_from(a).ok()?,
            i64::try_from(b).ok()?,
            i64::try_from(c).ok()?,
        ))
    }
}

/// The 2/3 rule of `players/rime_27fischers.py:92` (universe simulator @3f9f42d):
/// `ctr=(a+b+c)//3; rem=(a+b+c)-3*ctr; c_rev=3*ctr+rem-a-b` — two points and the shared centre
/// `(ctr, rem)` give the third. `ctr` and `rem` are [`Trijection::c0`] and [`Trijection::rem`].
/// `None` when the value is outside `i64`.
pub fn third(a: i64, b: i64, ctr: i128, rem: u8) -> Option<i64> {
    let c_rev = ctr
        .checked_mul(3)?
        .checked_add(i128::from(rem))?
        .checked_sub(i128::from(a))?
        .checked_sub(i128::from(b))?;
    i64::try_from(c_rev).ok()
}

/// What `trijection_forward` returns (`trijection.py:57`): `C0, SA, SB, REM, len(b), pad`.
#[derive(Clone, PartialEq, Eq, Debug, Default)]
pub struct Forward {
    /// `C0`, a `bytearray` upstream: one centre per triple, `0..=255`.
    pub c0: Vec<u8>,
    /// `SA`, a list of ints upstream. For bytes `a - c0` is in `-170..=170`; `measure()` writes
    /// it as signed 16-bit (`struct.pack("<h", x)`, `:75`), which is the width used here.
    pub sa: Vec<i16>,
    /// `SB` (`:76` writes it as `"<h"`).
    pub sb: Vec<i16>,
    /// `REM`, a `bytearray` upstream: `s % 3` per triple, `0..=2`.
    pub rem: Vec<u8>,
    /// `len(b)`: the length after padding, a multiple of 3.
    pub total_len: usize,
    /// `pad = (-len(b)) % 3`, the zero bytes appended (`0..=2`).
    pub pad: usize,
}

/// `trijection_forward(data)`, `trijection.py:50-57`.
pub fn trijection_forward(data: &[u8]) -> Forward {
    // :51 `b = bytearray(data); pad = (-len(b)) % 3; b += bytes(pad)`
    let pad = (3 - data.len() % 3) % 3;
    let mut b = Vec::with_capacity(data.len() + pad);
    b.extend_from_slice(data);
    b.resize(data.len() + pad, 0);
    // :52 `C0 = bytearray(); SA = []; SB = []; REM = bytearray()`
    let n = b.len() / 3;
    let mut out = Forward {
        c0: Vec::with_capacity(n),
        sa: Vec::with_capacity(n),
        sb: Vec::with_capacity(n),
        rem: Vec::with_capacity(n),
        total_len: 0,
        pad,
    };
    // :53 `for i in range(0, len(b), 3):`
    for t in b.chunks_exact(3) {
        // :54 `a, bb, c = b[i], b[i+1], b[i+2]`; :55-56 in `trij`
        let t = trij(i64::from(t[0]), i64::from(t[1]), i64::from(t[2]));
        // Three bytes sum to 0..=765, so c0 is in 0..=255 and a - c0, bb - c0 in -170..=170.
        out.c0
            .push(u8::try_from(t.c0).expect("c0 of three bytes is a byte"));
        out.sa
            .push(i16::try_from(t.sa).expect("a - c0 of three bytes fits i16"));
        out.sb
            .push(i16::try_from(t.sb).expect("bb - c0 of three bytes fits i16"));
        out.rem.push(t.rem);
    }
    // :57 `return C0, SA, SB, REM, len(b), pad`
    out.total_len = b.len();
    out
}

/// `trijection_inverse(C0, SA, SB, REM, total_len, pad)`, `trijection.py:59-64`.
///
/// As upstream: `zip` stops at the shortest of the four streams (`:61`); `bytes([a, bb, c])`
/// (`:63`) raises `ValueError` when a value is outside `0..=255`, which is `None` here; the result
/// is `out[:total_len - pad]` (`:64`) with Python's slice end (a negative end counts from the end
/// of `out`, and the end is clamped to `0..=len(out)`).
///
/// The argument types are the ranges [`trijection_forward`] produces. Upstream's function also
/// accepts other Python ints there (`trijection_inverse([-1],[1],[1],[6],3,0)` returns
/// `b'\x00\x00\x03'`); such inputs cannot be written against this signature.
pub fn trijection_inverse(
    c0: &[u8],
    sa: &[i16],
    sb: &[i16],
    rem: &[u8],
    total_len: usize,
    pad: usize,
) -> Option<Vec<u8>> {
    // :60 `out = bytearray()`
    let mut out = Vec::with_capacity(3 * c0.len());
    // :61 `for c0, sa, sb, rem in zip(C0, SA, SB, REM):`
    for (((&c0, &sa), &sb), &rem) in c0.iter().zip(sa).zip(sb).zip(rem) {
        // :62 in `Trijection::restore`
        let t = Trijection {
            c0: i128::from(c0),
            sa: i128::from(sa),
            sb: i128::from(sb),
            rem,
        };
        let (a, bb, c) = t.restore()?;
        // :63 `out += bytes([a, bb, c])`
        out.extend_from_slice(&[
            u8::try_from(a).ok()?,
            u8::try_from(bb).ok()?,
            u8::try_from(c).ok()?,
        ]);
    }
    // :64 `return bytes(out[:total_len - pad])`
    let end = if total_len >= pad {
        (total_len - pad).min(out.len())
    } else {
        out.len().saturating_sub(pad - total_len)
    };
    out.truncate(end);
    Some(out)
}

/// The zero-trit count of `measure()`, `trijection.py:83-88`, as two integers.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Default)]
pub struct ZeroTrits {
    /// `zeros`: trits equal to 0.
    pub zeros: u64,
    /// `tot_tr`: trits counted, 6 per separation.
    pub trits: u64,
}

/// `:84-87`: over `SA + SB`, the six balanced trits `to_balanced_ternary(abs(x), 6)` of each
/// separation, counting all trits and the zero trits. `:88` prints `zeros / tot_tr` (or `0.0`
/// when nothing was counted) as a float; this port returns the two counts, read as `zeros/trits`.
pub fn zero_trits(sa: &[i16], sb: &[i16]) -> ZeroTrits {
    // :84 `zeros = tot_tr = 0`
    let mut z = ZeroTrits::default();
    let mut six = [Zero::Nil; 6];
    // :85 `for x in SA + SB:`
    for &x in sa.iter().chain(sb) {
        // :86 `for t in to_balanced_ternary(abs(x), 6):`
        to_balanced_ternary(i64::from(x).abs(), &mut six);
        for t in six {
            // :87 `tot_tr += 1; zeros += (t == 0)`
            z.trits += 1;
            if t == Zero::Nil {
                z.zeros += 1;
            }
        }
    }
    z
}
