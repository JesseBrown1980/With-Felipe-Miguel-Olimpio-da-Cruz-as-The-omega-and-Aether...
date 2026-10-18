//! `extract(image, location)` (index.html:9788-9815): the perspective transform from module
//! space to the image, and one sample per module.
//!
//! jsQR builds `sToQ` for the image quad (top-left, top-right, alignment, bottom-left) and the
//! adjoint of `sToQ` for the module quad (3.5, 3.5), (d - 3.5, 3.5), (d - 6.5, d - 6.5),
//! (3.5, d - 3.5) (`squareToQuadrilateral`, `quadrilateralToSquare`, `times`,
//! index.html:9723-9787), then maps each module centre `(x + 0.5, y + 0.5)` and reads the pixel
//! at `Math.floor` of the result.
//!
//! Here every entry and every mapped coordinate is the page's JS number ([`Dbl`]), computed by
//! the same operations in the same order, so a module centre the page maps a hair either side of
//! a pixel edge reads the same pixel here. Where jsQR divides by zero or meets `NaN` the values
//! follow IEEE-754 as the page's do, and `image.get` of a non-finite position is `false`.

use crate::binary64::Dbl;
use crate::bit_matrix::BitMatrix;
use crate::locate::{Location, Point};

/// A jsQR transform `{a11 .. a33}` as `a[i - 1][j - 1]`.
type M3 = [[Dbl; 3]; 3];

fn num(n: i64) -> Dbl {
    Dbl::from_int(n)
}

/// `squareToQuadrilateral(p1, p2, p3, p4)` (index.html:9723-9759).
fn square_to_quadrilateral(p1: Point, p2: Point, p3: Point, p4: Point) -> M3 {
    let dx3 = p1.x - p2.x + p3.x - p4.x;
    let dy3 = p1.y - p2.y + p3.y - p4.y;
    if dx3.js_eq(Dbl::ZERO) && dy3.js_eq(Dbl::ZERO) {
        // Affine.
        return [
            [p2.x - p1.x, p2.y - p1.y, Dbl::ZERO],
            [p3.x - p2.x, p3.y - p2.y, Dbl::ZERO],
            [p1.x, p1.y, num(1)],
        ];
    }
    let dx1 = p2.x - p3.x;
    let dx2 = p4.x - p3.x;
    let dy1 = p2.y - p3.y;
    let dy2 = p4.y - p3.y;
    let denominator = dx1 * dy2 - dx2 * dy1;
    let a13 = (dx3 * dy2 - dx2 * dy3) / denominator;
    let a23 = (dx1 * dy3 - dx3 * dy1) / denominator;
    [
        [p2.x - p1.x + a13 * p2.x, p2.y - p1.y + a13 * p2.y, a13],
        [p4.x - p1.x + a23 * p4.x, p4.y - p1.y + a23 * p4.y, a23],
        [p1.x, p1.y, num(1)],
    ]
}

/// `quadrilateralToSquare(p1, p2, p3, p4)` (index.html:9760-9774): the adjoint of `sToQ`.
fn quadrilateral_to_square(p1: Point, p2: Point, p3: Point, p4: Point) -> M3 {
    let s = square_to_quadrilateral(p1, p2, p3, p4);
    let a = |i: usize, j: usize| s[i - 1][j - 1];
    [
        [
            a(2, 2) * a(3, 3) - a(2, 3) * a(3, 2),
            a(1, 3) * a(3, 2) - a(1, 2) * a(3, 3),
            a(1, 2) * a(2, 3) - a(1, 3) * a(2, 2),
        ],
        [
            a(2, 3) * a(3, 1) - a(2, 1) * a(3, 3),
            a(1, 1) * a(3, 3) - a(1, 3) * a(3, 1),
            a(1, 3) * a(2, 1) - a(1, 1) * a(2, 3),
        ],
        [
            a(2, 1) * a(3, 2) - a(2, 2) * a(3, 1),
            a(1, 2) * a(3, 1) - a(1, 1) * a(3, 2),
            a(1, 1) * a(2, 2) - a(1, 2) * a(2, 1),
        ],
    ]
}

/// `times(a, b)` (index.html:9775-9787): `c_ij = a_1j b_i1 + a_2j b_i2 + a_3j b_i3`.
fn times(a: &M3, b: &M3) -> M3 {
    let mut c = [[Dbl::ZERO; 3]; 3];
    for (i, row) in c.iter_mut().enumerate() {
        for (j, cell) in row.iter_mut().enumerate() {
            *cell = a[0][j] * b[i][0] + a[1][j] * b[i][1] + a[2][j] * b[i][2];
        }
    }
    c
}

/// `transform` in `extract` (index.html:9789-9791).
fn transform(location: &Location) -> M3 {
    let half = num(1) / num(2);
    let d = num(location.dimension);
    let (m35, m65) = (num(7) * half, num(13) * half);
    let q_to_s = quadrilateral_to_square(
        Point { x: m35, y: m35 },
        Point { x: d - m35, y: m35 },
        Point {
            x: d - m65,
            y: d - m65,
        },
        Point { x: m35, y: d - m35 },
    );
    let s_to_q = square_to_quadrilateral(
        location.top_left,
        location.top_right,
        location.alignment,
        location.bottom_left,
    );
    times(&s_to_q, &q_to_s)
}

/// `mappingFunction(x, y)` (index.html:9793-9799).
fn map(t: &M3, x: Dbl, y: Dbl) -> Point {
    let denominator = t[0][2] * x + t[1][2] * y + t[2][2];
    Point {
        x: (t[0][0] * x + t[1][0] * y + t[2][0]) / denominator,
        y: (t[0][1] * x + t[1][1] * y + t[2][1]) / denominator,
    }
}

/// `extract(image, location).matrix`: `dimension x dimension` modules.
pub fn extract(image: &BitMatrix, location: &Location) -> BitMatrix {
    let dimension = usize::try_from(location.dimension).unwrap_or(0);
    let mut matrix = BitMatrix::create_empty(dimension, dimension);
    let t = transform(location);
    let half = num(1) / num(2);
    for y in 0..location.dimension {
        for x in 0..location.dimension {
            let source = map(&t, num(x) + half, num(y) + half);
            let dark = match (source.x.floor_int(), source.y.floor_int()) {
                (Some(px), Some(py)) => image.get(px, py),
                _ => false,
            };
            matrix.set(x, y, dark);
        }
    }
    matrix
}

/// The four corners jsQR reports in `location` (index.html:470-473): `mappingFunction` at
/// module coordinates (d, 0), (0, 0), (d, d), (0, d), returned as top-right, top-left,
/// bottom-right, bottom-left.
pub fn corners(location: &Location) -> [Point; 4] {
    let t = transform(location);
    let (zero, d) = (Dbl::ZERO, num(location.dimension));
    [
        map(&t, d, zero),
        map(&t, zero, zero),
        map(&t, d, d),
        map(&t, zero, d),
    ]
}
