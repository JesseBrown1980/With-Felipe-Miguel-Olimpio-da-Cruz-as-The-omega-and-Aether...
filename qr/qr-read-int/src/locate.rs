//! `locate(matrix)` (index.html:10021-10177) and its helpers (index.html:9817-10020,
//! 10178-10222): finder and alignment patterns by run-length ratios, scored and grouped.
//!
//! - Row-scan ratio tests (index.html:10037-10047): `|s - S/7| < S/7` is `|7s - S| < S`, and
//!   likewise for `3S/7` and `S/3`, on integers. A double can only round across such a bound when
//!   it is exact (7 or 3 divides `S`), so these are the same tests.
//! - Quad ratios (index.html:10063-10064): `s / w < 1.5` is `2s < 3w`, `> 0.5` is `2s > w`.
//! - Every other value jsQR computes here (points, distances, run lengths, errors, scores, module
//!   size, the expected alignment position) is a JS number: [`Dbl`], with the page's operations in
//!   the page's order, so each holds the page's value bit for bit.
//! - `Math.pow(v, 2)` is `v * v`, as V8 computes it (V8 14.1 `src/numbers/ieee754.cc:35-37`
//!   `math::pow`, and fdlibm's `pow` in `src/base/ieee754.cc:2738`).
//! - `Array.prototype.sort` in V8 is stable, as Rust's `sort_by` is, and both see the same order
//!   from the comparator `a.score - b.score` ([`Dbl::sort_order`]).

use crate::binary64::Dbl;
use crate::bit_matrix::BitMatrix;

/// `MAX_FINDERPATTERNS_TO_SEARCH` (index.html:9823).
const MAX_FINDERPATTERNS_TO_SEARCH: usize = 4;

/// A jsQR point `{x, y}` of JS numbers, in pixels: pixel column `i` covers `[i, i + 1)`, as in
/// `matrix.get(Math.floor(x), Math.floor(y))`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Point {
    pub x: Dbl,
    pub y: Dbl,
}

impl Point {
    /// The integer pixel point `(x, y)`.
    pub fn int(x: i64, y: i64) -> Point {
        Point {
            x: Dbl::from_int(x),
            y: Dbl::from_int(y),
        }
    }
}

/// One located position (index.html:10144-10174): the three finder pattern centres, the
/// alignment pattern (or its expected position, which can be `NaN`), and the module count per
/// side.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Location {
    pub top_left: Point,
    pub top_right: Point,
    pub bottom_left: Point,
    pub alignment: Point,
    pub dimension: i64,
}

fn num(n: i64) -> Dbl {
    Dbl::from_int(n)
}

/// `Math.floor(v)` of a point coordinate here. Every such point is an integer or a finite
/// quarter- or half-pixel, so the floor is an integer and the fallback 0 is not reached.
fn floor(v: Dbl) -> i64 {
    v.floor_int().unwrap_or(0)
}

/// `Math.round(v)`, likewise.
fn round(v: Dbl) -> i64 {
    v.round_int().unwrap_or(0)
}

/// `Math.pow(v, 2)`.
fn pow2(v: Dbl) -> Dbl {
    v * v
}

/// `distance(a, b)` (index.html:9826).
fn distance(a: Point, b: Point) -> Dbl {
    (pow2(b.x - a.x) + pow2(b.y - a.y)).sqrt()
}

/// `distance(a, b)` between integer pixel points. The differences, their squares and the sum
/// are integers below 2^53 (sides are at most `MAX_SIDE`), so they are exact as JS numbers and
/// the page's value is the square root of the integer sum.
fn distance_int(a: (i64, i64), b: (i64, i64)) -> Dbl {
    let (dx, dy) = (b.0 - a.0, b.1 - a.1);
    num(dx * dx + dy * dy).sqrt()
}

/// `sum(values)` (index.html:9827-9829): `values.reduce((a, b) => a + b)`, left to right.
fn sum(values: &[Dbl]) -> Dbl {
    values[1..].iter().fold(values[0], |a, &b| a + b)
}

#[derive(Clone, Copy, Debug)]
struct Line {
    start_x: i64,
    end_x: i64,
    y: i64,
}

#[derive(Clone, Copy, Debug)]
struct Quad {
    top: Line,
    bottom: Line,
}

impl Quad {
    /// `{x: (q.top.startX + q.top.endX + q.bottom.startX + q.bottom.endX) / 4,
    /// y: (q.top.y + q.bottom.y + 1) / 2}` (index.html:10111-10112, 10204-10205).
    fn centre(&self) -> Point {
        let x4 = self.top.start_x + self.top.end_x + self.bottom.start_x + self.bottom.end_x;
        Point {
            x: num(x4) / num(4),
            y: num(self.top.y + self.bottom.y + 1) / num(2),
        }
    }

    /// `sum(lengths) / lengths.length` of `[top width, bottom width, height]`
    /// (index.html:10116-10117).
    fn size(&self) -> Dbl {
        let lengths = [
            num(self.top.end_x - self.top.start_x),
            num(self.bottom.end_x - self.bottom.start_x),
            num(self.bottom.y - self.top.y + 1),
        ];
        sum(&lengths) / num(3)
    }
}

/// A finder pattern candidate (index.html:10110-10120).
#[derive(Clone, Copy, Debug)]
struct Candidate {
    score: Dbl,
    point: Point,
    size: Dbl,
}

/// `countBlackWhiteRunTowardsPoint(origin, end, matrix, length)` (index.html:9883-9944): the
/// Bresenham walk from `floor(origin)` towards `floor(end)`, recording where the colour
/// switches, and the distances between successive switch points (0 where one is missing).
fn count_run_towards(origin: Point, end: Point, matrix: &BitMatrix, length: usize) -> Vec<Dbl> {
    let (ox, oy) = (floor(origin.x), floor(origin.y));
    let (ex, ey) = (floor(end.x), floor(end.y));
    let mut switch_points = vec![(ox, oy)];
    let steep = (end.y - origin.y).abs().gt((end.x - origin.x).abs());
    let (from_x, from_y, to_x, to_y) = if steep {
        (oy, ox, ey, ex)
    } else {
        (ox, oy, ex, ey)
    };
    let dx = (to_x - from_x).abs();
    let dy = (to_y - from_y).abs();
    let mut error = (-dx).div_euclid(2);
    let x_step = if from_x < to_x { 1 } else { -1 };
    let y_step = if from_y < to_y { 1 } else { -1 };
    let mut current = true;
    let mut x = from_x;
    let mut y = from_y;
    while x != to_x + x_step {
        let (real_x, real_y) = if steep { (y, x) } else { (x, y) };
        if matrix.get(real_x, real_y) != current {
            current = !current;
            switch_points.push((real_x, real_y));
            if switch_points.len() == length + 1 {
                break;
            }
        }
        error += dy;
        if error > 0 {
            if y == to_y {
                break;
            }
            y += y_step;
            error -= dx;
        }
        x += x_step;
    }
    (0..length)
        .map(|i| match (switch_points.get(i), switch_points.get(i + 1)) {
            (Some(&a), Some(&b)) => distance_int(a, b),
            _ => Dbl::ZERO,
        })
        .collect()
}

/// `countBlackWhiteRun(origin, end, matrix, length)` (index.html:9945-9953): the runs away
/// from `end` (inner first), the middle run counted from both sides less one pixel, then the
/// runs towards `end`.
fn count_run(origin: Point, end: Point, matrix: &BitMatrix, length: usize) -> Vec<Dbl> {
    let rise = end.y - origin.y;
    let run = end.x - origin.x;
    let half = length.div_ceil(2);
    let towards = count_run_towards(origin, end, matrix, half);
    let away_end = Point {
        x: origin.x - run,
        y: origin.y - rise,
    };
    let away = count_run_towards(origin, away_end, matrix, half);
    let middle = towards[0] + away[0] - num(1);
    let mut out: Vec<Dbl> = away[1..].to_vec();
    out.push(middle);
    out.extend_from_slice(&towards[1..]);
    out
}

/// `scoreBlackWhiteRun(sequence, ratios)` (index.html:9956-9963): `(averageSize, error)`.
fn score_run(sequence: &[Dbl], ratios: &[i64]) -> (Dbl, Dbl) {
    let ratio_sum: i64 = ratios.iter().sum();
    let average = sum(sequence) / num(ratio_sum);
    let mut error = Dbl::ZERO;
    for (&s, &r) in sequence.iter().zip(ratios) {
        error = error + pow2(s - num(r) * average);
    }
    (average, error)
}

/// `scorePattern(point, ratios, matrix)` (index.html:9967-9999) at an integer pixel:
/// `ratioError + sizeError`. No line inside its `try` throws for these inputs, so its
/// `catch { return Infinity; }` is not reached.
fn score_pattern(point: (i64, i64), ratios: &[i64], matrix: &BitMatrix) -> Dbl {
    let (px, py) = point;
    let w = i64::try_from(matrix.width).unwrap_or(i64::MAX);
    let h = i64::try_from(matrix.height).unwrap_or(i64::MAX);
    let p = Point::int(px, py);
    let n = ratios.len();
    let runs = [
        count_run(p, Point::int(-1, py), matrix, n),
        count_run(p, Point::int(px, -1), matrix, n),
        count_run(
            p,
            Point::int((px - py).max(0) - 1, (py - px).max(0) - 1),
            matrix,
            n,
        ),
        count_run(
            p,
            Point::int(w.min(px + py) + 1, h.min(py + px) + 1),
            matrix,
            n,
        ),
    ];
    let [horz, vert, diag_down, diag_up] = runs.map(|r| score_run(&r, ratios));
    let ratio_error =
        (horz.1 * horz.1 + vert.1 * vert.1 + diag_down.1 * diag_down.1 + diag_up.1 * diag_up.1)
            .sqrt();
    let avg_size = (horz.0 + vert.0 + diag_down.0 + diag_up.0) / num(4);
    let size_error = (pow2(horz.0 - avg_size)
        + pow2(vert.0 - avg_size)
        + pow2(diag_down.0 - avg_size)
        + pow2(diag_up.0 - avg_size))
        / avg_size;
    ratio_error + size_error
}

/// `recenterLocation(matrix, p)` (index.html:10000-10020): the middle of the dark run through
/// the rounded point, first along the row, then along the column at the new x.
fn recenter(matrix: &BitMatrix, p: Point) -> Point {
    let (rx, ry) = (round(p.x), round(p.y));
    let mut left_x = rx;
    while matrix.get(left_x, ry) {
        left_x -= 1;
    }
    let mut right_x = rx;
    while matrix.get(right_x, ry) {
        right_x += 1;
    }
    let x = num(left_x + right_x) / num(2);
    let mut top_y = ry;
    while matrix.get(round(x), top_y) {
        top_y -= 1;
    }
    let mut bottom_y = ry;
    while matrix.get(round(x), bottom_y) {
        bottom_y += 1;
    }
    Point {
        x,
        y: num(top_y + bottom_y) / num(2),
    }
}

/// `reorderFinderPatterns(pattern1, pattern2, pattern3)` (index.html:9831-9857), returning
/// `(topRight, topLeft, bottomLeft)`.
fn reorder(p1: Point, p2: Point, p3: Point) -> (Point, Point, Point) {
    let one_two = distance(p1, p2);
    let two_three = distance(p2, p3);
    let one_three = distance(p1, p3);
    let (mut bottom_left, top_left, mut top_right) =
        if two_three.ge(one_two) && two_three.ge(one_three) {
            (p2, p1, p3)
        } else if one_three.ge(two_three) && one_three.ge(one_two) {
            (p1, p2, p3)
        } else {
            (p1, p3, p2)
        };
    let cross = (top_right.x - top_left.x) * (bottom_left.y - top_left.y)
        - (top_right.y - top_left.y) * (bottom_left.x - top_left.x);
    if cross.lt(Dbl::ZERO) {
        core::mem::swap(&mut bottom_left, &mut top_right);
    }
    (top_right, top_left, bottom_left)
}

/// `computeDimension(topLeft, topRight, bottomLeft, matrix)` (index.html:9859-9879), returning
/// `(dimension, moduleSize)`; `moduleSize < 1` (a throw in jsQR) is `None`.
fn compute_dimension(
    top_left: Point,
    top_right: Point,
    bottom_left: Point,
    matrix: &BitMatrix,
) -> Option<(i64, Dbl)> {
    let seven = num(7);
    let module_size = (sum(&count_run(top_left, bottom_left, matrix, 5)) / seven
        + sum(&count_run(top_left, top_right, matrix, 5)) / seven
        + sum(&count_run(bottom_left, top_left, matrix, 5)) / seven
        + sum(&count_run(top_right, top_left, matrix, 5)) / seven)
        / num(4);
    if module_size.lt(num(1)) {
        return None;
    }
    let top = (distance(top_left, top_right) / module_size).round_int()?;
    let side = (distance(top_left, bottom_left) / module_size).round_int()?;
    let mut dimension = (top + side).div_euclid(2) + 7;
    match dimension.rem_euclid(4) {
        0 => dimension += 1,
        2 => dimension -= 1,
        _ => {}
    }
    Some((dimension, module_size))
}

/// `findAlignmentPattern(matrix, alignmentPatternQuads, topRight, topLeft, bottomLeft)`
/// (index.html:10179-10222), returning `(alignmentPattern, dimension)`.
fn find_alignment_pattern(
    matrix: &BitMatrix,
    quads: &[Quad],
    top_right: Point,
    top_left: Point,
    bottom_left: Point,
) -> Option<(Point, i64)> {
    let (dimension, module_size) = compute_dimension(top_left, top_right, bottom_left, matrix)?;
    let bottom_right = Point {
        x: top_right.x - top_left.x + bottom_left.x,
        y: top_right.y - top_left.y + bottom_left.y,
    };
    let modules_between =
        (distance(top_left, bottom_left) + distance(top_left, top_right)) / num(2) / module_size;
    let correction = num(1) - num(3) / modules_between;
    let expected = Point {
        x: top_left.x + correction * (bottom_right.x - top_left.x),
        y: top_left.y + correction * (bottom_right.y - top_left.y),
    };
    let mut patterns: Vec<(Dbl, Point)> = Vec::new();
    for q in quads {
        let centre = q.centre();
        let (fx, fy) = (floor(centre.x), floor(centre.y));
        if !matrix.get(fx, fy) {
            continue;
        }
        let size_score = score_pattern((fx, fy), &[1, 1, 1], matrix);
        patterns.push((size_score + distance(centre, expected), centre));
    }
    patterns.sort_by(|a, b| Dbl::sort_order(a.0, b.0));
    let alignment = match patterns.first() {
        Some(&(_, best)) if modules_between.ge(num(15)) => best,
        _ => expected,
    };
    Some((alignment, dimension))
}

/// `locate(matrix)` (index.html:10021-10177).
pub fn locate(matrix: &BitMatrix) -> Option<Vec<Location>> {
    let width = i64::try_from(matrix.width).ok()?;
    let height = i64::try_from(matrix.height).ok()?;
    let mut finder_quads: Vec<Quad> = Vec::new();
    let mut active_finder: Vec<Quad> = Vec::new();
    let mut alignment_quads: Vec<Quad> = Vec::new();
    let mut active_alignment: Vec<Quad> = Vec::new();

    for y in 0..=height {
        let mut length = 0i64;
        let mut last_bit = false;
        let mut scans = [0i64; 5];
        for x in -1..=width {
            let v = matrix.get(x, y);
            if v == last_bit {
                length += 1;
                continue;
            }
            scans = [scans[1], scans[2], scans[3], scans[4], length];
            length = 1;
            last_bit = v;
            // index.html:10037-10043: 1:1:3:1:1 of b:w:b:w:b, ending on a light pixel.
            let s: i64 = scans.iter().sum();
            let valid_finder = (7 * scans[0] - s).abs() < s
                && (7 * scans[1] - s).abs() < s
                && (7 * scans[2] - 3 * s).abs() < 3 * s
                && (7 * scans[3] - s).abs() < s
                && (7 * scans[4] - s).abs() < s
                && !v;
            // index.html:10045-10049: 1:1:1 of w:b:w, ending on a dark pixel.
            let s3 = scans[2] + scans[3] + scans[4];
            let valid_alignment = (3 * scans[2] - s3).abs() < s3
                && (3 * scans[3] - s3).abs() < s3
                && (3 * scans[4] - s3).abs() < s3
                && v;
            if valid_finder {
                let end_x = x - scans[3] - scans[4];
                let start_x = end_x - scans[2];
                let line = Line { start_x, end_x, y };
                extend_or_start(&mut active_finder, line, scans[2]);
            }
            if valid_alignment {
                let end_x = x - scans[4];
                let start_x = end_x - scans[3];
                let line = Line { start_x, end_x, y };
                extend_or_start(&mut active_alignment, line, scans[2]);
            }
        }
        // index.html:10098-10101.
        finder_quads.extend(
            active_finder
                .iter()
                .filter(|q| q.bottom.y != y && q.bottom.y - q.top.y >= 2),
        );
        active_finder.retain(|q| q.bottom.y == y);
        alignment_quads.extend(active_alignment.iter().filter(|q| q.bottom.y != y));
        active_alignment.retain(|q| q.bottom.y == y);
    }
    finder_quads.extend(active_finder.iter().filter(|q| q.bottom.y - q.top.y >= 2));
    alignment_quads.extend(active_alignment.iter());

    // index.html:10107-10122: candidates whose rounded centre is dark, scored, sorted.
    let mut candidates: Vec<Candidate> = Vec::new();
    for q in finder_quads.iter().filter(|q| q.bottom.y - q.top.y >= 2) {
        let point = q.centre();
        let (rx, ry) = (round(point.x), round(point.y));
        if !matrix.get(rx, ry) {
            continue;
        }
        candidates.push(Candidate {
            score: score_pattern((rx, ry), &[1, 1, 3, 1, 1], matrix),
            point,
            size: q.size(),
        });
    }
    candidates.sort_by(|a, b| Dbl::sort_order(a.score, b.score));

    // index.html:10123-10139: for the best five, the two others closest in score and size.
    let mut groups: Vec<(Dbl, [Point; 3])> = Vec::new();
    for (i, point) in candidates.iter().enumerate() {
        if i > MAX_FINDERPATTERNS_TO_SEARCH {
            continue;
        }
        let mut others: Vec<(Dbl, Point)> = candidates
            .iter()
            .enumerate()
            .filter(|&(ii, _)| ii != i)
            .map(|(_, p)| (p.score + pow2(p.size - point.size) / point.size, p.point))
            .collect();
        others.sort_by(|a, b| Dbl::sort_order(a.0, b.0));
        if others.len() < 2 {
            continue;
        }
        let score = point.score + others[0].0 + others[1].0;
        groups.push((score, [point.point, others[0].1, others[1].1]));
    }
    groups.sort_by(|a, b| Dbl::sort_order(a.0, b.0));
    let best = groups.first()?.1;

    let (top_right, top_left, bottom_left) = reorder(best[0], best[1], best[2]);
    let mut result = Vec::new();
    if let Some((alignment, dimension)) =
        find_alignment_pattern(matrix, &alignment_quads, top_right, top_left, bottom_left)
    {
        result.push(Location {
            top_left,
            top_right,
            bottom_left,
            alignment,
            dimension,
        });
    }
    let mid_top_right = recenter(matrix, top_right);
    let mid_top_left = recenter(matrix, top_left);
    let mid_bottom_left = recenter(matrix, bottom_left);
    if let Some((alignment, dimension)) = find_alignment_pattern(
        matrix,
        &alignment_quads,
        mid_top_right,
        mid_top_left,
        mid_bottom_left,
    ) {
        result.push(Location {
            top_left: mid_top_left,
            top_right: mid_top_right,
            bottom_left: mid_bottom_left,
            alignment,
            dimension,
        });
    }
    (!result.is_empty()).then_some(result)
}

/// index.html:10058-10072 and 10078-10092: extend the first active quad whose bottom line this
/// line overlaps, or start a new quad. Both tests use `scans[2]` for the width ratio, as the
/// page does.
fn extend_or_start(active: &mut Vec<Quad>, line: Line, scan2: i64) {
    let (start_x, end_x) = (line.start_x, line.end_x);
    let matching = active.iter_mut().find(|q| {
        let b = q.bottom;
        let w = b.end_x - b.start_x;
        // The page's first two tests, `(startX >= b.startX && startX <= b.endX) ||
        // (endX >= b.startX && startX <= b.endX)`, with the common factor taken out.
        ((start_x >= b.start_x || end_x >= b.start_x) && start_x <= b.end_x)
            || (start_x <= b.start_x && end_x >= b.end_x && 2 * scan2 < 3 * w && 2 * scan2 > w)
    });
    match matching {
        Some(q) => q.bottom = line,
        None => active.push(Quad {
            top: line,
            bottom: line,
        }),
    }
}
