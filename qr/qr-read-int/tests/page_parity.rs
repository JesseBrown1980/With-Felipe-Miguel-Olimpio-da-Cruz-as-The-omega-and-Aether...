//! The integer reader against the owner's page on the page-parity corpus.
//!
//! `tests/fixtures/JSQR-PAGE.hbp` holds what the page's own jsQR returned for every corpus plane
//! (`tools/jsqr_page.py`, headless Chromium, the-colour-qr @ 1938a9b `index.html` unmodified).
//! This test rebuilds every plane (checked by sha256), reads it with `qr_read_int::read` and
//! compares: found or not, version, the sha256 of the text and of the bytes, the chunk kinds, and
//! the three finder points, the alignment point and the four corners, each coordinate as its
//! binary64 bit pattern, which must equal the page's.

mod corpus;

use qr_read_int::{read, Chunk, Point, QrCode};
use std::collections::BTreeMap;

/// Corner coordinates the page reports on the corpus, and those of them whose decimal (JS
/// `String(v)`) lies within 10^-9 of a whole number without being whole (README "Integer forms
/// of jsQR's doubles"), with the corner points holding at least one such coordinate.
const CORNER_COORDINATES: usize = 6208;
const CORNER_COORDINATES_NEAR_WHOLE: usize = 558;
const CORNER_POINTS_NEAR_WHOLE: usize = 361;

fn golden() -> Vec<BTreeMap<String, String>> {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/JSQR-PAGE.hbp");
    let text = std::fs::read_to_string(path).expect("JSQR-PAGE.hbp");
    text.lines()
        .filter(|l| l.starts_with("JSQR|"))
        .map(|l| {
            l.split('|')
                .skip(1)
                .filter_map(|f| f.split_once('='))
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect()
        })
        .collect()
}

fn chunk_kinds(code: &QrCode) -> String {
    code.chunks
        .iter()
        .map(|c| match c {
            Chunk::Numeric { .. } => "numeric".to_string(),
            Chunk::Alphanumeric { .. } => "alphanumeric".to_string(),
            Chunk::Byte { .. } => "byte".to_string(),
            Chunk::Kanji { .. } => "kanji".to_string(),
            Chunk::Eci { assignment_number } => format!("eci{assignment_number}"),
        })
        .collect::<Vec<_>>()
        .join(".")
}

/// A point as the page tool writes its `_bits` field: each coordinate's bit pattern in hex.
fn bits(p: Point) -> String {
    format!("{:016x},{:016x}", p.x.to_bits(), p.y.to_bits())
}

/// A decimal string (as JS `String(v)` writes it, `e` exponent allowed) as `|n| / 10^k`.
fn decimal(s: &str) -> Option<(u128, u32)> {
    let (mantissa, exp) = match s.split_once('e') {
        Some((m, e)) => (m, e.trim_start_matches('+').parse::<i32>().ok()?),
        None => (s, 0),
    };
    let digits = mantissa.trim_start_matches('-');
    let (int, frac) = digits.split_once('.').unwrap_or((digits, ""));
    let mut n: u128 = format!("{int}{frac}").parse().ok()?;
    let mut k = i32::try_from(frac.len()).ok()? - exp;
    while k < 0 {
        n *= 10;
        k += 1;
    }
    Some((n, u32::try_from(k).ok()?))
}

/// The decimal lies within 10^-9 of a whole number and is not whole.
fn near_whole(s: &str) -> bool {
    decimal(s).is_some_and(|(n, k)| {
        let unit = 10u128.pow(k);
        let frac = n % unit;
        frac != 0 && frac.min(unit - frac) * 1_000_000_000 < unit
    })
}

fn differences(row: &BTreeMap<String, String>, code: Option<&QrCode>) -> Vec<String> {
    let mut diffs = Vec::new();
    let found = row.get("found").map(String::as_str) == Some("1");
    let Some(code) = code else {
        if found {
            diffs.push("page found, integer reader did not".into());
        }
        return diffs;
    };
    if !found {
        diffs.push(format!(
            "integer reader found v{}, page did not",
            code.version
        ));
        return diffs;
    }
    let mut check = |key: &str, ours: String| {
        if row.get(key) != Some(&ours) {
            diffs.push(format!("{key}: page {:?}, integer {ours:?}", row.get(key)));
        }
    };
    check("version", code.version.to_string());
    check("text_sha256", corpus::sha256::hex(code.text.as_bytes()));
    check("bytes_sha256", corpus::sha256::hex(&code.bytes));
    check("chunks", chunk_kinds(code));
    let loc = &code.location;
    let points = [
        ("tl", loc.top_left),
        ("tr", loc.top_right),
        ("bl", loc.bottom_left),
        ("al", loc.alignment),
        ("corner_tr", code.corners[0]),
        ("corner_tl", code.corners[1]),
        ("corner_br", code.corners[2]),
        ("corner_bl", code.corners[3]),
    ];
    for (key, p) in points {
        check(&format!("{key}_bits"), bits(p));
    }
    diffs
}

#[test]
fn every_corpus_plane_reads_as_the_page_reads_it() {
    let rows = golden();
    let planes = corpus::corpus();
    assert_eq!(
        rows.len(),
        planes.len(),
        "corpus size differs from JSQR-PAGE.hbp"
    );
    let mut equal = 0;
    let mut found = (0, 0);
    let mut report = Vec::new();
    for (plane, row) in planes.iter().zip(&rows) {
        assert_eq!(row.get("name"), Some(&plane.name));
        assert_eq!(
            row.get("grey_sha256"),
            Some(&corpus::sha256::hex(&plane.grey)),
            "{}: plane bytes differ from the recorded corpus",
            plane.name
        );
        let code = read(plane.width, plane.height, &plane.grey);
        found.0 += usize::from(row.get("found").map(String::as_str) == Some("1"));
        found.1 += usize::from(code.is_some());
        let diffs = differences(row, code.as_ref());
        if diffs.is_empty() {
            equal += 1;
        } else {
            report.push(format!("{}: {}", plane.name, diffs.join("; ")));
        }
    }
    println!(
        "PAGE_PARITY|planes={}|page_found={}|int_found={}|equal={equal}|json=0",
        planes.len(),
        found.0,
        found.1
    );
    assert!(report.is_empty(), "{}", report.join("\n"));
}

/// README "Integer forms of jsQR's doubles": how often the page's corners print a hair off a
/// whole number, counted on the recorded rows.
#[test]
fn corner_coordinates_near_whole_numbers() {
    let (mut coordinates, mut near, mut points) = (0, 0, 0);
    for row in golden() {
        for key in ["corner_tr", "corner_tl", "corner_br", "corner_bl"] {
            let Some((x, y)) = row.get(key).and_then(|p| p.split_once(',')) else {
                continue;
            };
            coordinates += 2;
            let n = usize::from(near_whole(x)) + usize::from(near_whole(y));
            near += n;
            points += usize::from(n > 0);
        }
    }
    println!(
        "PAGE_CORNERS|coordinates={coordinates}|near_whole={near}|points_with_one={points}|json=0"
    );
    assert_eq!(
        (coordinates, near, points),
        (
            CORNER_COORDINATES,
            CORNER_COORDINATES_NEAR_WHOLE,
            CORNER_POINTS_NEAR_WHOLE
        )
    );
}

#[test]
fn decimal_and_near_whole() {
    assert_eq!(decimal("523.5"), Some((5235, 1)));
    assert_eq!(decimal("-1.25e-3"), Some((125, 5)));
    assert_eq!(decimal("2e+2"), Some((200, 0)));
    assert!(near_whole("362.99999999999994"));
    assert!(near_whole("2.0000000000000013"));
    assert!(!near_whole("363"));
    assert!(!near_whole("362.9999999"));
    assert!(!near_whole("523.5"));
}
