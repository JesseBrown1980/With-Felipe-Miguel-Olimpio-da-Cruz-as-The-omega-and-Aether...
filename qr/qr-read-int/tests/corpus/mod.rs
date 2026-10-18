//! The page-parity corpus: grey planes made in integers from symbols the `qrcode` crate draws,
//! for the owner's page (jsQR in `index.html`) and this crate to read side by side.
//!
//! `tools/jsqr_page.py` runs the page's jsQR on the planes `examples/corpus.rs` writes and
//! records `tests/fixtures/JSQR-PAGE.hbp`; `tests/page_parity.rs` rebuilds the same planes here
//! (checked by sha256) and compares every field. Every value is an integer; the only
//! randomness is a fixed linear congruential sequence.
#![allow(dead_code)]

pub mod sha256;

use qrcode::bits::Bits;
use qrcode::canvas::{Canvas, MaskPattern};
use qrcode::types::{Color, EcLevel, Version};

/// One grey plane, row-major, one byte per pixel.
pub struct Plane {
    pub name: String,
    pub width: usize,
    pub height: usize,
    pub grey: Vec<u8>,
}

/// A drawn symbol: `width * width` modules, `true` = dark.
#[derive(Clone)]
pub struct Symbol {
    pub width: usize,
    pub dark: Vec<bool>,
}

const MASKS: [MaskPattern; 8] = [
    MaskPattern::Checkerboard,
    MaskPattern::HorizontalLines,
    MaskPattern::VerticalLines,
    MaskPattern::DiagonalLines,
    MaskPattern::LargeCheckerboard,
    MaskPattern::Fields,
    MaskPattern::Diamonds,
    MaskPattern::Meadow,
];

/// A fixed linear congruential sequence (Numerical Recipes constants).
pub struct Lcg(pub u32);

impl Lcg {
    pub fn next(&mut self) -> u32 {
        self.0 = self.0.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
        self.0
    }

    pub fn below(&mut self, n: u32) -> u32 {
        (self.next() >> 8) % n
    }
}

fn level_name(ec: EcLevel) -> &'static str {
    match ec {
        EcLevel::L => "L",
        EcLevel::M => "M",
        EcLevel::Q => "Q",
        EcLevel::H => "H",
    }
}

/// Data codewords (already terminated and padded) into a symbol with the given mask, or the
/// encoder's own penalty choice when `mask` is `None`.
pub fn draw(version: i16, ec: EcLevel, mask: Option<usize>, data: &[u8]) -> Option<Symbol> {
    let v = Version::Normal(version);
    let (encoded, ec_words) = qrcode::ec::construct_codewords(data, v, ec).ok()?;
    let mut canvas = Canvas::new(v, ec);
    canvas.draw_all_functional_patterns();
    canvas.draw_data(&encoded, &ec_words);
    let canvas = match mask {
        Some(m) => {
            let mut c = canvas;
            c.apply_mask(MASKS[m]);
            c
        }
        None => canvas.apply_best_mask(),
    };
    let dark = canvas
        .into_colors()
        .into_iter()
        .map(|c| c == Color::Dark)
        .collect();
    Some(Symbol {
        width: usize::try_from(v.width()).ok()?,
        dark,
    })
}

/// Segments pushed through `Bits`, terminated and padded by the encoder.
pub fn encode(
    version: i16,
    ec: EcLevel,
    mask: Option<usize>,
    push: impl FnOnce(&mut Bits) -> Option<()>,
) -> Option<Symbol> {
    let mut bits = Bits::new(Version::Normal(version));
    push(&mut bits)?;
    bits.push_terminator(ec).ok()?;
    draw(version, ec, mask, &bits.into_bytes())
}

/// Raw data bits (MSB first) padded to the symbol's data capacity with zero bits to a byte
/// boundary and then 0xEC, 0x11 alternately; no terminator is added.
pub fn raw(
    version: i16,
    ec: EcLevel,
    mask: Option<usize>,
    bits: &[(u32, usize)],
) -> Option<Symbol> {
    let capacity = Bits::new(Version::Normal(version)).max_len(ec).ok()? / 8;
    let mut out: Vec<bool> = Vec::new();
    for &(value, n) in bits {
        for i in (0..n).rev() {
            out.push((value >> i) & 1 == 1);
        }
    }
    let mut bytes: Vec<u8> = out
        .chunks(8)
        .map(|c| {
            c.iter()
                .chain(core::iter::repeat(&false))
                .take(8)
                .fold(0u8, |b, &bit| (b << 1) | u8::from(bit))
        })
        .collect();
    if bytes.len() > capacity {
        return None;
    }
    let mut pad = [0xecu8, 0x11].into_iter().cycle();
    while bytes.len() < capacity {
        bytes.push(pad.next().unwrap_or(0));
    }
    draw(version, ec, mask, &bytes)
}

/// The symbol at `px` pixels per module inside `quiet` light modules.
pub fn render(sym: &Symbol, px: usize, quiet: usize, dark: u8, light: u8) -> (usize, Vec<u8>) {
    let side = (sym.width + 2 * quiet) * px;
    let mut g = vec![light; side * side];
    for y in 0..side {
        for x in 0..side {
            let (mx, my) = (x / px, y / px);
            let inside = |m: usize| m >= quiet && m < quiet + sym.width;
            if inside(mx) && inside(my) && sym.dark[(my - quiet) * sym.width + mx - quiet] {
                g[y * side + x] = dark;
            }
        }
    }
    (side, g)
}

fn plane(name: String, width: usize, height: usize, grey: Vec<u8>) -> Plane {
    Plane {
        name,
        width,
        height,
        grey,
    }
}

/// Each output pixel the exact area-weighted mean of the source pixels it covers, rounded
/// half up (as `qr/colour-qr/tools/resample_check.py` resamples).
pub fn box_resample(w: usize, h: usize, g: &[u8], w2: usize, h2: usize) -> Vec<u8> {
    let overlaps = |src: usize, dst: usize| -> Vec<Vec<(usize, u64)>> {
        (0..dst)
            .map(|x| {
                let (lo, hi) = (x * src, (x + 1) * src);
                let mut row = Vec::new();
                let mut i = (x * src) / dst;
                while i * dst < hi {
                    let ov = hi.min((i + 1) * dst).saturating_sub(lo.max(i * dst));
                    if ov > 0 {
                        row.push((i, ov as u64));
                    }
                    i += 1;
                }
                row
            })
            .collect()
    };
    let (wx, wy) = (overlaps(w, w2), overlaps(h, h2));
    let den = (w * h) as u64;
    let mut out = vec![0u8; w2 * h2];
    for y in 0..h2 {
        for x in 0..w2 {
            let mut acc = 0u64;
            for &(j, vy) in &wy[y] {
                for &(i, vx) in &wx[x] {
                    acc += vx * vy * u64::from(g[j * w + i]);
                }
            }
            out[y * w2 + x] = u8::try_from((2 * acc + den) / (2 * den)).unwrap_or(255);
        }
    }
    out
}

/// Each output pixel the source pixel under its centre.
pub fn nearest(w: usize, h: usize, g: &[u8], w2: usize, h2: usize) -> Vec<u8> {
    let mut out = vec![0u8; w2 * h2];
    for y in 0..h2 {
        let sy = (2 * y + 1) * h / (2 * h2);
        for x in 0..w2 {
            out[y * w2 + x] = g[sy * w + (2 * x + 1) * w / (2 * w2)];
        }
    }
    out
}

pub fn invert(g: &[u8]) -> Vec<u8> {
    g.iter().map(|v| 255 - v).collect()
}

/// Mirror across the top-left to bottom-right diagonal (square images).
pub fn transpose(side: usize, g: &[u8]) -> Vec<u8> {
    let mut out = vec![0u8; side * side];
    for y in 0..side {
        for x in 0..side {
            out[x * side + y] = g[y * side + x];
        }
    }
    out
}

/// Quarter turns clockwise (square images).
pub fn rotate(side: usize, g: &[u8], quarter_turns: usize) -> Vec<u8> {
    let mut cur = g.to_vec();
    for _ in 0..quarter_turns % 4 {
        let mut out = vec![0u8; side * side];
        for y in 0..side {
            for x in 0..side {
                out[x * side + (side - 1 - y)] = cur[y * side + x];
            }
        }
        cur = out;
    }
    cur
}

/// The image placed at `(ox, oy)` on a `w2 x h2` canvas of `fill`.
pub fn place(
    (w, h, g): (usize, usize, &[u8]),
    (w2, h2): (usize, usize),
    (ox, oy): (usize, usize),
    fill: u8,
) -> Vec<u8> {
    let mut out = vec![fill; w2 * h2];
    for y in 0..h {
        for x in 0..w {
            if x + ox < w2 && y + oy < h2 {
                out[(y + oy) * w2 + x + ox] = g[y * w + x];
            }
        }
    }
    out
}

/// Contrast `dark..light` and a left-to-right, top-to-bottom illumination ramp, in integers.
pub fn shade(w: usize, h: usize, g: &[u8], dark: u32, light: u32, ramp: u32) -> Vec<u8> {
    let mut out = vec![0u8; w * h];
    for y in 0..h {
        for x in 0..w {
            let v = u32::from(g[y * w + x]);
            let base = dark + (light - dark) * v / 255;
            let lift = ramp * u32::try_from(x + y).unwrap_or(0) / u32::try_from(w + h).unwrap_or(1);
            out[y * w + x] = u8::try_from((base + lift).min(255)).unwrap_or(255);
        }
    }
    out
}

/// Deterministic noise of amplitude `amp` added to every pixel, clamped.
pub fn noise(g: &[u8], amp: u32, seed: u32) -> Vec<u8> {
    let mut lcg = Lcg(seed);
    g.iter()
        .map(|&v| {
            let d = i64::from(lcg.below(2 * amp + 1)) - i64::from(amp);
            u8::try_from((i64::from(v) + d).clamp(0, 255)).unwrap_or(0)
        })
        .collect()
}

/// A projective warp: the output's unit square maps onto the source quad `quad` (top-left,
/// top-right, bottom-right, bottom-left, source pixels) by the square-to-quadrilateral map,
/// in exact integers; each output pixel centre reads the source pixel at the floor, `fill`
/// outside.
pub fn warp(
    w: usize,
    h: usize,
    g: &[u8],
    w2: usize,
    h2: usize,
    quad: [(i64, i64); 4],
    fill: u8,
) -> Vec<u8> {
    let [(x1, y1), (x2, y2), (x3, y3), (x4, y4)] =
        quad.map(|(x, y)| (i128::from(x), i128::from(y)));
    let (dx3, dy3) = (x1 - x2 + x3 - x4, y1 - y2 + y3 - y4);
    let (dx1, dx2, dy1, dy2) = (x2 - x3, x4 - x3, y2 - y3, y4 - y3);
    let den = dx1 * dy2 - dx2 * dy1;
    let a13 = dx3 * dy2 - dx2 * dy3;
    let a23 = dx1 * dy3 - dx3 * dy1;
    let m = [
        [(x2 - x1) * den + a13 * x2, (y2 - y1) * den + a13 * y2, a13],
        [(x4 - x1) * den + a23 * x4, (y4 - y1) * den + a23 * y4, a23],
        [x1 * den, y1 * den, den],
    ];
    let (w2i, h2i) = (w2 as i128, h2 as i128);
    let mut out = vec![fill; w2 * h2];
    for y in 0..h2 {
        for x in 0..w2 {
            let u = (2 * x as i128 + 1) * h2i;
            let v = (2 * y as i128 + 1) * w2i;
            let one = 2 * w2i * h2i;
            let sx = m[0][0] * u + m[1][0] * v + m[2][0] * one;
            let sy = m[0][1] * u + m[1][1] * v + m[2][1] * one;
            let sw = m[0][2] * u + m[1][2] * v + m[2][2] * one;
            if sw == 0 {
                continue;
            }
            let (ix, iy) = if sw > 0 {
                (sx.div_euclid(sw), sy.div_euclid(sw))
            } else {
                ((-sx).div_euclid(-sw), (-sy).div_euclid(-sw))
            };
            if ix >= 0 && iy >= 0 && (ix as usize) < w && (iy as usize) < h {
                out[y * w2 + x] = g[iy as usize * w + ix as usize];
            }
        }
    }
    out
}

/// Flip `count` data-area modules chosen by the sequence `seed` (finder corners left alone).
pub fn flip_modules(sym: &Symbol, count: usize, seed: u32) -> Symbol {
    let mut s = sym.clone();
    let w = u32::try_from(sym.width).unwrap_or(0);
    let mut lcg = Lcg(seed);
    let mut done = 0;
    while done < count {
        let (x, y) = (lcg.below(w), lcg.below(w));
        // The three finder corners: top-left, top-right, bottom-left 9 x 9 regions.
        let corner = (y < 9 && (x < 9 || x + 9 > w)) || (x < 9 && y + 9 > w);
        if corner {
            continue;
        }
        let i = usize::try_from(y * w + x).unwrap_or(0);
        s.dark[i] = !s.dark[i];
        done += 1;
    }
    s
}

/// How many planes section 8 draws.
pub const HARD_PLANES: usize = 600;

const TEXT: &[u8] = b"The colour QR carrier: three ordinary QR symbols, one per RGB plane.";

fn filler_text(n: usize, seed: u32) -> Vec<u8> {
    let alphabet = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut lcg = Lcg(seed);
    (0..n).map(|_| alphabet[lcg.below(64) as usize]).collect()
}

fn push_square(out: &mut Vec<Plane>, name: String, side: usize, grey: Vec<u8>) {
    out.push(plane(name, side, side, grey));
}

/// The whole corpus, in a fixed order.
pub fn corpus() -> Vec<Plane> {
    let mut out: Vec<Plane> = Vec::new();

    // 1. Versions 1-40 at every level, the encoder's mask, 2-4 px per module, a 4-module quiet
    //    zone, byte mode text sized to half the capacity.
    for version in 1..=40i16 {
        for (k, ec) in [EcLevel::L, EcLevel::M, EcLevel::Q, EcLevel::H]
            .into_iter()
            .enumerate()
        {
            if version > 10 && version % 3 != (k as i16) % 3 {
                continue;
            }
            let cap = Bits::new(Version::Normal(version)).max_len(ec).unwrap_or(0) / 8;
            let text = filler_text(cap / 2, u32::try_from(version).unwrap_or(0) * 7 + k as u32);
            let Some(sym) = encode(version, ec, None, |b| b.push_byte_data(&text).ok()) else {
                continue;
            };
            let px = 2 + usize::try_from(version).unwrap_or(0) % 3;
            let (side, g) = render(&sym, px, 4, 0, 255);
            push_square(
                &mut out,
                format!("v{version:02}-{}-px{px}", level_name(ec)),
                side,
                g,
            );
        }
    }

    // 2. Every mask, version 7 level M, 3 px.
    for m in 0..8 {
        let sym = encode(7, EcLevel::M, Some(m), |b| b.push_byte_data(TEXT).ok());
        if let Some(sym) = sym {
            let (side, g) = render(&sym, 3, 4, 0, 255);
            push_square(&mut out, format!("mask{m}-v07-M"), side, g);
        }
    }

    // 2b. Version 23 at levels L and M, near-full: the page's version-23 alignment centres
    //     (index.html:9088) differ from the encoder's at one position.
    for (k, ec) in [(0usize, EcLevel::L), (1, EcLevel::M)] {
        let cap = Bits::new(Version::Normal(23)).max_len(ec).unwrap_or(0) / 8;
        let text = filler_text(cap - 3, 2300 + k as u32);
        if let Some(sym) = encode(23, ec, None, |b| b.push_byte_data(&text).ok()) {
            let (side, g) = render(&sym, 3, 4, 0, 255);
            push_square(&mut out, format!("v23-{}-full", level_name(ec)), side, g);
        }
    }

    // 3. Segment modes the page decodes and the ones it skips.
    let modes: Vec<(&str, Option<Symbol>)> = vec![
        (
            "numeric",
            encode(3, EcLevel::M, None, |b| {
                b.push_numeric_data(b"0123456789012345678901").ok()
            }),
        ),
        (
            "alnum",
            encode(3, EcLevel::M, None, |b| {
                b.push_alphanumeric_data(b"HELLO WORLD $%*+-./:").ok()
            }),
        ),
        (
            "kanji",
            encode(2, EcLevel::M, None, |b| {
                b.push_kanji_data(b"\x93\x5f\xe4\xaa\x88\x9f\x8e\x9a").ok()
            }),
        ),
        (
            "utf8",
            encode(4, EcLevel::Q, None, |b| {
                b.push_byte_data("h\u{e9}llo \u{2603} \u{65e5}\u{672c}".as_bytes())
                    .ok()
            }),
        ),
        (
            "not-utf8",
            encode(2, EcLevel::L, None, |b| {
                b.push_byte_data(b"\xff\xfe\x80abc").ok()
            }),
        ),
        (
            "eci26",
            encode(3, EcLevel::L, None, |b| {
                b.push_eci_designator(26).ok()?;
                b.push_byte_data("\u{f8}re".as_bytes()).ok()
            }),
        ),
        (
            "eci-900",
            encode(3, EcLevel::L, None, |b| {
                b.push_eci_designator(900).ok()?;
                b.push_byte_data(b"abc").ok()
            }),
        ),
        (
            "fnc1-first",
            encode(3, EcLevel::M, None, |b| {
                b.push_fnc1_first_position().ok()?;
                b.push_numeric_data(b"01049123451234591597033130128").ok()
            }),
        ),
        (
            "fnc1-second",
            encode(3, EcLevel::M, None, |b| {
                b.push_fnc1_second_position(37).ok()?;
                b.push_alphanumeric_data(b"AA1234BBB112").ok()
            }),
        ),
        (
            "mixed",
            encode(5, EcLevel::M, None, |b| {
                b.push_numeric_data(b"314159").ok()?;
                b.push_alphanumeric_data(b"PI IS").ok()?;
                b.push_byte_data(b" about 3.14").ok()?;
                b.push_kanji_data(b"\x93\x5f").ok()
            }),
        ),
        (
            "struct-append",
            raw(
                2,
                EcLevel::M,
                None,
                &[
                    (0b0011, 4),
                    (0x0102, 16),
                    (0b0100, 4),
                    (3, 8),
                    (0x61, 8),
                    (0x62, 8),
                    (0x63, 8),
                    (0, 4),
                ],
            ),
        ),
        (
            "struct-append-seq1",
            raw(
                2,
                EcLevel::M,
                None,
                &[
                    (0b0011, 4),
                    (0x1302, 16),
                    (0b0100, 4),
                    (3, 8),
                    (0x61, 8),
                    (0x62, 8),
                    (0x63, 8),
                    (0, 4),
                ],
            ),
        ),
        (
            "mode-6",
            raw(
                1,
                EcLevel::L,
                None,
                &[
                    (0b0110, 4),
                    (0b0100, 4),
                    (2, 8),
                    (0x68, 8),
                    (0x69, 8),
                    (0, 4),
                ],
            ),
        ),
        (
            "trailing-1",
            raw(
                1,
                EcLevel::H,
                None,
                &[
                    (1, 4),
                    (17, 10),
                    (123, 10),
                    (456, 10),
                    (789, 10),
                    (12, 10),
                    (345, 10),
                    (67, 7),
                    (1, 1),
                ],
            ),
        ),
        (
            "trailing-0",
            raw(
                1,
                EcLevel::H,
                None,
                &[
                    (1, 4),
                    (17, 10),
                    (123, 10),
                    (456, 10),
                    (789, 10),
                    (12, 10),
                    (345, 10),
                    (67, 7),
                    (0, 1),
                ],
            ),
        ),
        (
            "alnum-overflow",
            raw(
                1,
                EcLevel::M,
                None,
                &[(0b0010, 4), (2, 9), (45 * 45 + 1, 11), (0, 4)],
            ),
        ),
        (
            "numeric-overflow",
            raw(
                1,
                EcLevel::M,
                None,
                &[(0b0001, 4), (3, 10), (1000, 10), (0, 4)],
            ),
        ),
        (
            "count-past-end",
            raw(1, EcLevel::M, None, &[(0b0100, 4), (200, 8), (0x41, 8)]),
        ),
        (
            "eci-corrupt",
            raw(
                1,
                EcLevel::M,
                None,
                &[
                    (0b0111, 4),
                    (0b111, 3),
                    (0b0100, 4),
                    (1, 8),
                    (0x5a, 8),
                    (0, 4),
                ],
            ),
        ),
        (
            "kanji-unmapped",
            raw(
                1,
                EcLevel::M,
                None,
                &[(0b1000, 4), (2, 8), (0x1fff, 13), (0x0000, 13), (0, 4)],
            ),
        ),
        ("empty", raw(1, EcLevel::M, None, &[(0, 4)])),
    ];
    for (name, sym) in modes {
        if let Some(sym) = sym {
            let (side, g) = render(&sym, 4, 4, 0, 255);
            push_square(&mut out, format!("mode-{name}"), side, g);
        }
    }

    // 4. One version-5 and one version-25 symbol through orientation, inversion, contrast,
    //    illumination, noise, offsets and quiet zones.
    for (version, px) in [(5i16, 4usize), (25, 3)] {
        let sym =
            encode(version, EcLevel::M, None, |b| b.push_byte_data(TEXT).ok()).expect("symbol");
        let (side, g) = render(&sym, px, 4, 0, 255);
        let tag = format!("v{version:02}");
        push_square(&mut out, format!("{tag}-plain"), side, g.clone());
        push_square(&mut out, format!("{tag}-inverted"), side, invert(&g));
        push_square(
            &mut out,
            format!("{tag}-transposed"),
            side,
            transpose(side, &g),
        );
        push_square(
            &mut out,
            format!("{tag}-transposed-inverted"),
            side,
            invert(&transpose(side, &g)),
        );
        for q in 1..4 {
            push_square(
                &mut out,
                format!("{tag}-rot{}", 90 * q),
                side,
                rotate(side, &g, q),
            );
        }
        push_square(
            &mut out,
            format!("{tag}-contrast-90-160"),
            side,
            shade(side, side, &g, 90, 160, 0),
        );
        push_square(
            &mut out,
            format!("{tag}-contrast-120-150"),
            side,
            shade(side, side, &g, 120, 150, 0),
        );
        push_square(
            &mut out,
            format!("{tag}-ramp"),
            side,
            shade(side, side, &g, 20, 170, 85),
        );
        push_square(&mut out, format!("{tag}-noise-40"), side, noise(&g, 40, 11));
        push_square(
            &mut out,
            format!("{tag}-noise-110"),
            side,
            noise(&g, 110, 12),
        );
        for (w2, h2, ox, oy) in [
            (side + 13, side + 5, 7, 3),
            (side + 3, side + 29, 0, 21),
            (side * 2 + 1, side + 1, side / 2, 1),
        ] {
            out.push(plane(
                format!("{tag}-place-{w2}x{h2}"),
                w2,
                h2,
                place((side, side, &g), (w2, h2), (ox, oy), 255),
            ));
        }
        for quiet in [0usize, 1, 2] {
            let (s2, g2) = render(&sym, px, quiet, 0, 255);
            push_square(&mut out, format!("{tag}-quiet{quiet}"), s2, g2);
        }
        for k in [3usize, 12, 40, 400] {
            let (s2, g2) = render(&flip_modules(&sym, k, 99 + k as u32), px, 4, 0, 255);
            push_square(&mut out, format!("{tag}-flip{k}"), s2, g2);
        }
    }

    // 5. Resampled copies of version 1, 2, 7, 15 and 40 symbols at 3 px, box and nearest, to sides
    //    with fractional pixels per module (the README.md:73 screenshot case).
    for (version, ec) in [
        (1i16, EcLevel::M),
        (2, EcLevel::L),
        (7, EcLevel::Q),
        (15, EcLevel::M),
        (40, EcLevel::L),
    ] {
        let cap = Bits::new(Version::Normal(version)).max_len(ec).unwrap_or(0) / 8;
        let text = filler_text(cap - 3, 1000 + u32::try_from(version).unwrap_or(0));
        let sym = encode(version, ec, None, |b| b.push_byte_data(&text).ok()).expect("symbol");
        let (side, g) = render(&sym, 3, 4, 0, 255);
        for num in [94usize, 90, 86, 82, 78, 74, 70, 66] {
            let s2 = side * num / 100;
            push_square(
                &mut out,
                format!("v{version:02}-box{num}"),
                s2,
                box_resample(side, side, &g, s2, s2),
            );
        }
        for num in [91usize, 83, 77] {
            let s2 = side * num / 100;
            push_square(
                &mut out,
                format!("v{version:02}-nearest{num}"),
                s2,
                nearest(side, side, &g, s2, s2),
            );
        }
        let (w2, h2) = (side * 9 / 10, side * 8 / 10);
        out.push(plane(
            format!("v{version:02}-box-aspect"),
            w2,
            h2,
            box_resample(side, side, &g, w2, h2),
        ));
    }

    // 6. Projective warps of version 1, 6 and 20 symbols (3 px).
    for (version, ec) in [(1i16, EcLevel::L), (6, EcLevel::M), (20, EcLevel::L)] {
        let data: &[u8] = if version == 1 { b"jsQR v1" } else { TEXT };
        let sym = encode(version, ec, None, |b| b.push_byte_data(data).ok()).expect("symbol");
        let (side, g) = render(&sym, 3, 4, 0, 255);
        let s = i64::try_from(side).unwrap_or(0);
        let (c, d) = (s / 2, s * 11 / 20);
        let turn = |x: i64, y: i64| (c + (99 * x - 14 * y) / 100, c + (14 * x + 99 * y) / 100);
        let warps: [(&str, [(i64, i64); 4]); 5] = [
            (
                "keystone",
                [
                    (-s / 5, -s / 20),
                    (s + s / 5, -s / 20),
                    (s + s / 20, s + s / 20),
                    (-s / 20, s + s / 20),
                ],
            ),
            (
                "tilt",
                [
                    (-s / 20, -s / 6),
                    (s + s / 20, -s / 20),
                    (s + s / 20, s + s / 20),
                    (-s / 20, s + s / 6),
                ],
            ),
            (
                "turn8",
                [turn(-d, -d), turn(d, -d), turn(d, d), turn(-d, d)],
            ),
            (
                "shear",
                [
                    (-s / 20, -s / 20),
                    (s + s / 20 + s / 10, -s / 20),
                    (s + s / 20, s + s / 20),
                    (-s / 20 - s / 10, s + s / 20),
                ],
            ),
            (
                "perspective",
                [
                    (-s / 4, -s / 8),
                    (s + s / 16, -s / 16),
                    (s + s / 8, s + s / 4),
                    (-s / 16, s + s / 16),
                ],
            ),
        ];
        for (name, quad) in warps {
            out.push(plane(
                format!("v{version:02}-warp-{name}"),
                side,
                side,
                warp(side, side, &g, side, side, quad, 255),
            ));
        }
    }

    // 8. Hard planes from a fixed sequence: versions 1-10, any level, 2-4 px, 1-4 quiet modules,
    //    a projective warp with corners moved up to 1/12 of the side, a box resample to 60-100 %,
    //    contrast, an illumination ramp and noise.
    let mut lcg = Lcg(2026_1017);
    for i in 0..HARD_PLANES {
        let version = 1 + i16::try_from(lcg.below(10)).unwrap_or(0);
        let ec = [EcLevel::L, EcLevel::M, EcLevel::Q, EcLevel::H][lcg.below(4) as usize];
        let px = 2 + lcg.below(3) as usize;
        let quiet = 1 + lcg.below(4) as usize;
        let cap = Bits::new(Version::Normal(version)).max_len(ec).unwrap_or(0) / 8;
        let n = (cap - 3) * (1 + lcg.below(3) as usize) / 3;
        let text = filler_text(n, lcg.next());
        let (dark, light) = (lcg.below(90) as u8, 165 + lcg.below(91) as u8);
        let Some(sym) = encode(version, ec, None, |b| b.push_byte_data(&text).ok()) else {
            continue;
        };
        let (side, g) = render(&sym, px, quiet, dark, light);
        let s = i64::try_from(side).unwrap_or(0);
        let jit = (s / 12).max(1);
        let mut j = || i64::from(lcg.below(u32::try_from(2 * jit + 1).unwrap_or(1))) - jit;
        let quad = [
            (j(), j()),
            (s + j(), j()),
            (s + j(), s + j()),
            (j(), s + j()),
        ];
        let warped = warp(side, side, &g, side, side, quad, light);
        let side2 = side * (60 + lcg.below(41) as usize) / 100;
        let blurred = box_resample(side, side, &warped, side2, side2);
        let ramp = lcg.below(70);
        let lit = shade(side2, side2, &blurred, 0, 255 - ramp, ramp);
        let amp = lcg.below(26);
        let grey = noise(&lit, amp, lcg.next());
        push_square(&mut out, format!("hard-{i:03}-v{version:02}"), side2, grey);
    }

    // 7. Planes with no symbol and edge-case sizes.
    out.push(plane("blank-white".into(), 120, 90, vec![255; 120 * 90]));
    out.push(plane("blank-black".into(), 64, 64, vec![0; 64 * 64]));
    out.push(plane(
        "noise-only".into(),
        200,
        150,
        noise(&vec![128; 200 * 150], 127, 5),
    ));
    let small = encode(1, EcLevel::L, None, |b| b.push_byte_data(b"tiny").ok()).expect("symbol");
    for (px, quiet) in [(1usize, 4usize), (1, 1), (2, 0)] {
        let (s2, g2) = render(&small, px, quiet, 0, 255);
        push_square(&mut out, format!("tiny-px{px}-quiet{quiet}"), s2, g2);
    }
    let (s2, g2) = render(&small, 3, 4, 0, 255);
    out.push(plane("strip-1-row".into(), s2, 1, g2[..s2].to_vec()));
    out.push(plane(
        "strip-1-col".into(),
        1,
        s2,
        (0..s2).map(|y| g2[y * s2]).collect(),
    ));

    // 9. Version 23 at every level, near-full, at 2, 3 and 4 px (the symbols of
    //    `tests/symbols.rs`): the page's version-23 alignment centres (index.html:9088).
    for (k, ec) in LEVELS.into_iter().enumerate() {
        let cap = Bits::new(Version::Normal(23)).max_len(ec).unwrap_or(0) / 8;
        let text: Vec<u8> = (0..cap - 3)
            .map(|i| b"0123456789abcdefghijklmnopqrstuvwxyz+/"[(i * 7 + k) % 38])
            .collect();
        let sym = encode(23, ec, None, |b| b.push_byte_data(&text).ok()).expect("symbol");
        for px in [2usize, 3, 4] {
            let (side, g) = render(&sym, px, 4, 0, 255);
            let name = format!("v23-{}-nearfull-px{px}", level_name(ec));
            push_square(&mut out, name, side, g);
        }
    }

    // 10-12. Even pixels per module, where every module centre falls exactly on a pixel edge
    //        and the page's binary64 transform lands a hair either side of it.
    out.extend(even_pixel_planes());
    out
}

const LEVELS: [EcLevel; 4] = [EcLevel::L, EcLevel::M, EcLevel::Q, EcLevel::H];

/// A byte-mode symbol of filler text from `lcg`, `(capacity - 3) * thirds / 3` bytes (at least 1).
fn filler_symbol(version: i16, ec: EcLevel, thirds: usize, lcg: &mut Lcg) -> Option<Symbol> {
    let cap = Bits::new(Version::Normal(version)).max_len(ec).ok()? / 8;
    let n = (cap.saturating_sub(3) * thirds / 3).max(1);
    let alphabet = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let text: Vec<u8> = (0..n).map(|_| alphabet[lcg.below(64) as usize]).collect();
    encode(version, ec, None, |b| b.push_byte_data(&text).ok())
}

/// Alignment pattern centres of a version (ISO/IEC 18004 Annex E, by its spacing rule).
fn alignment_centres(version: usize) -> Vec<usize> {
    if version == 1 {
        return vec![];
    }
    let count = version / 7 + 2;
    let size = 4 * version + 17;
    let step = if version == 32 {
        26
    } else {
        (version * 4 + count * 2 + 1) / (count * 2 - 2) * 2
    };
    let mut rest: Vec<usize> = (0..count - 1).map(|i| size - 7 - i * step).collect();
    rest.reverse();
    let mut out = vec![6];
    out.extend(rest);
    out
}

/// Finder, separator, format, timing, version and alignment modules.
fn is_function_module(version: usize, width: usize, x: usize, y: usize) -> bool {
    if (y < 9 && (x < 9 || x + 9 > width)) || (x < 9 && y + 9 > width) {
        return true;
    }
    if x == 6 || y == 6 {
        return true;
    }
    if version >= 7 && ((x + 11 >= width && y < 6) || (y + 11 >= width && x < 6)) {
        return true;
    }
    let centres = alignment_centres(version);
    centres.iter().any(|&ay| {
        centres.iter().any(|&ax| {
            let finder = (ax == 6 && (ay == 6 || ay == width - 7)) || (ax == width - 7 && ay == 6);
            !finder && x + 2 >= ax && x <= ax + 2 && y + 2 >= ay && y <= ay + 2
        })
    })
}

/// The symbol at an even `px` inside a 4-module quiet zone, function modules as drawn; in a data
/// module the pixels at offsets of at least `px / 2` (along x, y, or both, by `axes` 1, 2, 0)
/// take the module's colour when `upper_true`, and the other pixels the opposite colour, or
/// the other way round. The module centre is the pixel edge between the two halves.
fn render_split(
    sym: &Symbol,
    version: usize,
    px: usize,
    upper_true: bool,
    axes: u8,
) -> (usize, Vec<u8>) {
    let quiet = 4;
    let side = (sym.width + 2 * quiet) * px;
    let c = px / 2;
    let mut g = vec![255u8; side * side];
    for y in 0..side {
        for x in 0..side {
            let (mx, my) = (x / px, y / px);
            let inside = |m: usize| m >= quiet && m < quiet + sym.width;
            if !(inside(mx) && inside(my)) {
                continue;
            }
            let (sx, sy) = (mx - quiet, my - quiet);
            let dark = sym.dark[sy * sym.width + sx];
            let colour = if is_function_module(version, sym.width, sx, sy) {
                dark
            } else {
                let (ox, oy) = (x % px, y % px);
                let upper = match axes {
                    1 => ox >= c,
                    2 => oy >= c,
                    _ => ox >= c && oy >= c,
                };
                if upper == upper_true {
                    dark
                } else {
                    !dark
                }
            };
            g[y * side + x] = if colour { 0 } else { 255 };
        }
    }
    (side, g)
}

/// Sections 10-12 (the even-pixel planes of the review of this crate, same sequences and names):
/// 10. versions 2-10 at every level, 2 and 4 px, data module pixels split at the module centre
///     (432 planes); 11. versions 1-12 at 2, 4 and 6 px with flipped modules, contrast and noise
///     (300 planes); 12. the one plane of a 2,500-plane natural sequence (versions 1-14, 2-6 px,
///     flipped modules, noise) on which the page's binary64 transform and an exact rational one
///     read differently (`nat-px2-1036-v04`).
fn even_pixel_planes() -> Vec<Plane> {
    let mut out = Vec::new();
    let mut lcg = Lcg(31337);
    for version in 2..=10usize {
        for (k, ec) in LEVELS.into_iter().enumerate() {
            let v = i16::try_from(version).unwrap_or(0);
            let Some(sym) = filler_symbol(v, ec, 1 + (version + k) % 3, &mut lcg) else {
                continue;
            };
            for px in [2usize, 4] {
                for upper_true in [true, false] {
                    for axes in [0u8, 1, 2] {
                        let (side, g) = render_split(&sym, version, px, upper_true, axes);
                        let name = format!(
                            "edge-v{version:02}-{k}-px{px}-{}-a{axes}",
                            u8::from(upper_true)
                        );
                        push_square(&mut out, name, side, g);
                    }
                }
            }
        }
    }
    for i in 0..300 {
        let version = 1 + i16::try_from(lcg.below(12)).unwrap_or(0);
        let ec = LEVELS[lcg.below(4) as usize];
        let thirds = 1 + lcg.below(3) as usize;
        let Some(sym) = filler_symbol(version, ec, thirds, &mut lcg) else {
            continue;
        };
        let flips = sym.width * sym.width / (12 + lcg.below(30) as usize);
        let sym = flip_modules(&sym, flips, lcg.next());
        let px = [2usize, 4, 2, 6][lcg.below(4) as usize];
        let quiet = 1 + lcg.below(4) as usize;
        let dark = lcg.below(60) as u8;
        let light = 190 + lcg.below(66) as u8;
        let (side, g) = render(&sym, px, quiet, dark, light);
        let amp = 20 + lcg.below(80);
        let g = noise(&g, amp, lcg.next());
        push_square(&mut out, format!("evennoise-{i:03}-v{version:02}"), side, g);
    }
    let mut lcg = Lcg(777_001);
    for i in 0..=1036usize {
        let version = 1 + i16::try_from(lcg.below(14)).unwrap_or(0);
        let ec = LEVELS[lcg.below(4) as usize];
        let thirds = 1 + lcg.below(3) as usize;
        let Some(sym) = filler_symbol(version, ec, thirds, &mut lcg) else {
            continue;
        };
        let flips = if lcg.below(2) == 0 {
            0
        } else {
            sym.width * sym.width / (10 + lcg.below(40) as usize)
        };
        let flip_seed = lcg.next();
        let px = [2usize, 3, 4, 5, 6, 2, 4][lcg.below(7) as usize];
        let quiet = 1 + lcg.below(4) as usize;
        let dark = lcg.below(80) as u8;
        let light = 170 + lcg.below(86) as u8;
        let amp = 10 + lcg.below(110);
        let noise_seed = lcg.next();
        if i == 1036 {
            let (side, g) = render(
                &flip_modules(&sym, flips, flip_seed),
                px,
                quiet,
                dark,
                light,
            );
            let g = noise(&g, amp, noise_seed);
            push_square(
                &mut out,
                format!("nat-px{px}-{i:04}-v{version:02}"),
                side,
                g,
            );
        }
    }
    out
}
