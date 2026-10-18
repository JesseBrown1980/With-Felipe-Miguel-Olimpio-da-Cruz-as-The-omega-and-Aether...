//! Balanced ternary of integers: trits `{-1, 0, +1}` carried as the owner's [`Zero`], least
//! significant first.
//!
//! Line-by-line ports of the owner's code:
//! - `to_balanced_ternary(n, digits)` of `trijection.py:42-48` (ACER, sealed 2026-07-21, sha256
//!   `c5005b1c…`), the conversion `measure()` uses for its zero-trit count (`:86`);
//! - `base3(n)`, `bal3(n)` and the reconstruction `sum(x * 3 ** i for i, x in enumerate(bt))` of
//!   `reframe_check.py` (the-browns-solution-to-erods-o0O-nx3-6-for-1-with--1-3@5bdc268, blob
//!   ba82afd1), lines 12-19, 22-34 and 44;
//! - the fixed-width loop that `players/rime_27fischers.py:39-44` and `players/rime_agents.py:46-51`
//!   (universe simulator @3f9f42d) run for three trits.
//!
//! Two conventions, as that code computes them:
//! - fixed width (`to_balanced_ternary`, and the `rime_*` loop in [`low_trits`]): exactly
//!   `digits` trits; zero is `digits` zero trits; a value outside `±(3^digits - 1) / 2` keeps
//!   only its low `digits` trits (the balanced form of `n mod 3^digits`), the carry out of the
//!   last slot is not written. `trijection.py:45-46` divides before the carry (`n //= 3`, then
//!   `n += 1`); `bal3` and the `rime_*` loop carry before dividing. For `n % 3 == 2` both give
//!   `n // 3 + 1`, so the trits are the same.
//! - variable width (`bal3`): as many trits as the value needs, no truncation, no leading zero
//!   trit except for zero itself.
//!
//! Further conventions:
//! - zero: `bal3(0)` is the single trit `[0]` (`reframe_check.py:24-25`); `base3(0)` is `[0]`
//!   (`:13-14`); `to_balanced_ternary(0, d)` is `d` zero trits.
//! - sign: there is no sign trit. Python's `%` and `//` floor, so `n % 3` is in `0..=2` for every
//!   `n`, and a negative `n` runs through the same loop; its most significant trit is `-1`. For the
//!   divisor 3, Rust's `rem_euclid` / `div_euclid` equal Python's `%` / `//`.
//! - the trit: digit `r` in `{-1, 0, +1}` is `Zero::from_digit(r + 1)`, the packing digit of
//!   `kernel/tribit/src/lib.rs:115-128`, so `Zero::direction()` returns `r`.

use asolaria_tribit::Zero;

/// Trits `bal3` writes for an `i64`: `(3^40 - 1) / 2 < 2^63 <= (3^41 - 1) / 2`.
pub const I64_TRITS: usize = 41;
/// Digits `base3` writes for a `u64`: `3^40 < 2^64 <= 3^41`.
pub const U64_DIGITS: usize = 41;

/// The balanced trits of one integer, least significant first.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct Trits {
    buf: [Zero; I64_TRITS],
    len: usize,
}

impl Trits {
    /// The trits, least significant first. Zero is the one trit `[Nil]`.
    pub fn as_slice(&self) -> &[Zero] {
        &self.buf[..self.len]
    }
}

/// The base-3 digits `0..=2` of one integer, least significant first.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct Digits {
    buf: [u8; U64_DIGITS],
    len: usize,
}

impl Digits {
    /// The digits, least significant first. Zero is the one digit `[0]`.
    pub fn as_slice(&self) -> &[u8] {
        &self.buf[..self.len]
    }
}

/// Digit `r` in `{-1, 0, +1}` as the owner's trit.
fn trit(r: i128) -> Zero {
    Zero::from_digit((r + 1) as u8)
}

/// `to_balanced_ternary(n, digits)`, `trijection.py:42-48`, with `digits = out.len()`: one trit
/// per slot, least significant first. The working value is `i128`, so `n += 1` cannot overflow.
pub fn to_balanced_ternary(n: i64, out: &mut [Zero]) {
    // :43 `out = []`
    let mut n = i128::from(n);
    // :44 `for _ in range(digits):`
    for slot in out.iter_mut() {
        // :45 `r = n % 3; n //= 3`
        let mut r = n.rem_euclid(3);
        n = n.div_euclid(3);
        // :46 `if r == 2: r = -1; n += 1`
        if r == 2 {
            r = -1;
            n += 1;
        }
        // :47 `out.append(r)`
        *slot = trit(r);
    }
}

/// `bal3(n)`, `reframe_check.py:22-34`: "Balanced ternary, digits in {-1,0,1}, LSB first. Exact
/// integers only." The working value is `i128`, so `n += 1` cannot overflow at `i64::MAX`.
pub fn bal3(n: i64) -> Trits {
    let mut out = Trits {
        buf: [Zero::Nil; I64_TRITS],
        len: 0,
    };
    // :24-25 `if n == 0: return [0]`
    if n == 0 {
        out.len = 1;
        return out;
    }
    let mut n = i128::from(n);
    // :27 `while n:`
    while n != 0 {
        // :28 `r = n % 3`
        let mut r = n.rem_euclid(3);
        // :29-31 `if r == 2: r = -1; n += 1  # the carry`
        if r == 2 {
            r = -1;
            n += 1;
        }
        // :32 `d.append(r)`
        out.buf[out.len] = trit(r);
        out.len += 1;
        // :33 `n //= 3`
        n = n.div_euclid(3);
    }
    out
}

/// `recon = sum(x * 3 ** i for i, x in enumerate(bt))`, `reframe_check.py:44`, for any trit
/// slice (least significant first), summed from the most significant end. `None` when the value
/// is outside `i64`.
pub fn recon(trits: &[Zero]) -> Option<i64> {
    let mut acc: i128 = 0;
    for t in trits.iter().rev() {
        acc = acc.checked_mul(3)?.checked_add(i128::from(t.direction()))?;
    }
    i64::try_from(acc).ok()
}

/// `base3(n)`, `reframe_check.py:12-19`, over `u64` (the script calls it with `2 ** n`, `:38-39`).
pub fn base3(n: u64) -> Digits {
    let mut out = Digits {
        buf: [0; U64_DIGITS],
        len: 0,
    };
    // :13-14 `if n == 0: return [0]`
    if n == 0 {
        out.len = 1;
        return out;
    }
    let mut n = n;
    // :16-18 `while n: d.append(n % 3); n //= 3`
    while n != 0 {
        out.buf[out.len] = (n % 3) as u8;
        out.len += 1;
        n /= 3;
    }
    out
}

/// The fixed-width loop of `rime_27fischers.py:39-44` (and `rime_agents.py:46-51`), with
/// `out.len()` in place of their `range(3)`: the same carry as [`bal3`], one trit per slot, least
/// significant first. What remains of the value after the last slot is not written, as in the
/// scripts; for `out.len() == 3` the trits are the balanced form of `v` mod 27 in `-13..=13`.
/// It writes the same trits as [`to_balanced_ternary`] (which divides before the carry), measured
/// in `tests/stream.rs` and by the referee.
pub fn low_trits(v: i64, out: &mut [Zero]) {
    // :40 `xx=x`
    let mut xx = i128::from(v);
    // :41 `for _ in range(3):`
    for slot in out.iter_mut() {
        // :42 `r=xx%3`
        let mut r = xx.rem_euclid(3);
        // :43 `if r==2: r=-1; xx+=1`
        if r == 2 {
            r = -1;
            xx += 1;
        }
        // :44 `bal.append(r); xx//=3`
        *slot = trit(r);
        xx = xx.div_euclid(3);
    }
}
