//! The port against the script: the bytes verify-frames.py printed (the unmodified vendored
//! script under Python 3.13.16 and Pillow 12.3.0, over copies of the ten frames), the figures
//! CORRECTION.hbp records from that script, and a second read of every frame.

use matrix_in_colour::hbp::{row, text_lines};
use matrix_in_colour::{decode_png, read_stored_png, sha256_hex, verify_frames, VENDOR};
use std::path::PathBuf;

fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn vendor() -> PathBuf {
    root().join(VENDOR)
}

fn frame(n: usize) -> Vec<u8> {
    std::fs::read(vendor().join(format!("frames/matrix-min-{n:02}.png"))).unwrap()
}

#[test]
fn rust_prints_what_python_printed() {
    let report = verify_frames(&vendor()).unwrap();
    assert_eq!(report.rows.len(), 10);
    let (text, code) = report.render();
    assert_eq!(code, 0);
    let python = std::fs::read(root().join("tests/fixtures/verify-frames.python.out")).unwrap();
    assert_eq!(text.as_bytes(), python.as_slice());
}

/// CORRECTION.hbp rows DEFECT id=2, MEASURED_IS (the photographs) and NAMED quote the script.
#[test]
fn correction_records_what_the_script_measures() {
    let report = verify_frames(&vendor()).unwrap();
    let bytes = std::fs::read(vendor().join("CORRECTION.hbp")).unwrap();
    let rows: Vec<_> = text_lines(&bytes)
        .unwrap()
        .into_iter()
        .map(|l| row(l).unwrap())
        .collect();
    let find = |kind: &str, key: &str, value: &str| {
        rows.iter()
            .find(|r| r.kind == kind && r.get(key) == Some(value))
            .unwrap()
    };

    let (r06, r07) = (&report.rows[5], &report.rows[6]);
    assert_eq!(r06.grid_sha256, r07.grid_sha256);
    let evidence = format!(
        "photo_sha256 {} on both, and an independent PIL cell-grid fold gave {} on both",
        &sha256_hex(&frame(6))[..16],
        &r06.grid_sha256[..16]
    );
    assert_eq!(
        find("DEFECT", "id", "2").get("evidence"),
        Some(evidence.as_str())
    );

    let mut folds: Vec<&str> = report.rows.iter().map(|r| r.grid_sha256.as_str()).collect();
    folds.sort_unstable();
    folds.dedup();
    let means = report.means();
    assert!(report.monotonic());
    let obtained = format!(
        "independent PIL decode of all {n} frames: {} of {n} cell-grid folds distinct, mean cell \
         brightness monotonic non-decreasing {}->{}",
        folds.len(),
        means[0],
        means[9],
        n = report.rows.len()
    );
    let photographs = find(
        "MEASURED_IS",
        "claim",
        "the PHOTOGRAPHS were not blind even though the receipt field was",
    );
    assert_eq!(photographs.get("obtained"), Some(obtained.as_str()));

    let lit = report.rows[9].nonzero;
    assert_eq!(10_000 - lit, 2);
    let why = find("NAMED", "claim", "2 rooms went unlit")
        .get("why")
        .unwrap();
    assert!(why.starts_with(&format!(
        "the verifier counted {lit} lit cells using a brightness threshold of 30;"
    )));
}

/// The receipts' format (`PNG RGB8 truecolour`, `DEFLATE stored`), read without the `png`
/// crate, gives the same pixels as the `png` crate.
#[test]
fn the_stored_read_equals_the_png_crate() {
    for n in 1..=10 {
        let bytes = frame(n);
        let stored = read_stored_png(&bytes).unwrap();
        let decoded = decode_png(&bytes).unwrap();
        assert_eq!((stored.width, stored.height), (1024, 1024));
        assert_eq!(stored.chunks, ["IHDR", "IDAT", "IEND"]);
        assert_eq!(stored.blocks.len(), 49);
        assert!(stored.blocks[..48].iter().all(|&len| len == 65_535));
        assert_eq!(stored.blocks[48], 1_072);
        assert_eq!(stored.rgb, decoded.data, "frame {n}");
    }
}

/// Measured: a 12-px margin of (8, 8, 8) round 100 x 100 cells of 10 px, each cell a 9 x 9 block
/// of one colour with a 1-px (8, 8, 8) gutter on its right and bottom. The script's sample
/// (offset 4, 4) is inside the block.
#[test]
fn every_frame_is_a_lattice_of_rooms() {
    const GUTTER: [u8; 3] = [8, 8, 8];
    for n in 1..=10 {
        let img = decode_png(&frame(n)).unwrap();
        for y in 0..1024 {
            for x in 0..1024 {
                let px = img.pixel(x, y).unwrap();
                let inside = (12..1012).contains(&x) && (12..1012).contains(&y);
                if !inside || (x - 12) % 10 == 9 || (y - 12) % 10 == 9 {
                    assert_eq!(px, GUTTER, "frame {n} ({x}, {y})");
                } else {
                    let sample = img.pixel(x - (x - 12) % 10 + 4, y - (y - 12) % 10 + 4);
                    assert_eq!(Some(px), sample, "frame {n} ({x}, {y})");
                }
            }
        }
    }
}
