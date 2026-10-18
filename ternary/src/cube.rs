//! The 27-cube of three trits. Law `TRIJECTION-BALANCED-TERNARY.md:23-25` (universe simulator
//! @3f9f42d): "Balanced ternary `{−1, 0, +1}` is the native code: the `0` digit *is* the free
//! center. **3 trits = 3³ = 27 = the cube:** `1 center + 6 faces + 12 edges + 8 corners`, where
//! separation-from-center = count of nonzero trits = information paid." The same statement is
//! the docstring of the owner's `trijection.py:23-25` (ACER, sealed 2026-07-21): "3 balanced
//! trits {-1,0,+1} = 3^3 = 27 = the cube (1 center + 6 faces + 12 edges + 8 corners). The
//! all-zero word (0,0,0) is the center and costs nothing; separation = count of nonzero trits =
//! information paid."
//!
//! Cell numbering is the owner's `cube27()` (`players/rime_27fischers.py:51-52`):
//! `L=[-1,0,1]; return [(L[i//9],L[(i//3)%3],L[i%3]) for i in range(27)]`. `L[d]` is
//! `Zero::from_digit(d)` (`kernel/tribit/src/lib.rs:121-128`), so cell `i` is the three base-3
//! digits of `i` as trits, most significant first, and [`index`] is `colors.index(cell)`
//! (`rime_27fischers.py:88`).
//!
//! The two inversions are the owner's `trianti.py:31-33` (ACER, sealed 2026-07-21, vendored
//! beside `trijection.py`), the law's table (`:126-129`): **N** negation `t→−t` (`trianti.py:31`,
//! order 2), **R** rotation `(a,b,c)→(c,a,b)` (`:32`, order 3) and the anti-inversion
//! **R² = R∘R** (`:33`). [`negate`] / [`rotate`] match the owner's `N` / `R` on every one of the
//! 27 cells; `rotate∘rotate` is the owner's `R2` (`tests/law.rs`, the referee's `CUBE` rows).
//! Per-trit rotation is the owner's [`Zero::rotate`] / [`Zero::anti_rotate`] in `kernel/tribit`,
//! re-exported unchanged.

use asolaria_tribit::Zero;

/// Three trits: one cell of the 27-cube.
pub type Cell = [Zero; 3];

/// Number of cells.
pub const CELLS: u8 = 27;

/// `cube27()[i]` for `i < 27`, `rime_27fischers.py:52`.
pub const fn cell(i: u8) -> Cell {
    [
        Zero::from_digit(i / 9),
        Zero::from_digit((i / 3) % 3),
        Zero::from_digit(i % 3),
    ]
}

/// `cube27().index(c)`, `rime_27fischers.py:88`: the inverse of [`cell`].
pub const fn index(c: Cell) -> u8 {
    c[0].digit() * 9 + c[1].digit() * 3 + c[2].digit()
}

/// Separation from the centre: the count of nonzero trits (law `:25`; the `shells` count of
/// `measurements/build_between.py:106-107`, which counts the digits `x != 1`).
pub fn separation(c: Cell) -> u8 {
    c.iter().filter(|t| **t != Zero::Nil).count() as u8
}

/// **N**, negation `t→−t` on each trit (`trianti.py:31`; law `:128`).
pub const fn negate(c: Cell) -> Cell {
    [
        Zero::from_digit(2 - c[0].digit()),
        Zero::from_digit(2 - c[1].digit()),
        Zero::from_digit(2 - c[2].digit()),
    ]
}

/// **R**, rotation `(a,b,c)→(c,a,b)` (`trianti.py:32`; law `:129`). The anti-inversion
/// **R² = R⁻¹** (`trianti.py:33`) is `rotate(rotate(c))`.
pub const fn rotate(c: Cell) -> Cell {
    [c[2], c[0], c[1]]
}
