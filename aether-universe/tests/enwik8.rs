//! `data/enwik8` is accepted only when it IS enwik8. A file of exactly 100,000,000 bytes is not
//! enough: the verifier (2026-10-18) gave the game the first 100,000,000 bytes of the local
//! enwik9.gz (an `export-0.10` dump, sha256 6e8412d4..., 12.19 per cent white) and the old game
//! labelled it `file=enwik8`, `scope=full`, and let it solve secret 8.
//!
//! The genuine file is not on this seat, so the accepting side is covered by the unit test of
//! `enwik8_identity` (small data, a chosen prefix) and the refusing side here, end to end, on a real
//! 100,000,000-byte file. The full 256-bit hash of the genuine file is NOT carried by the game (only
//! the eight hex digits the seat's memory records, tagged NAMED); that is stated, not hidden.

mod common;

use common::*;
use std::fs;
use std::io::Write;
use std::path::Path;

const TO_WHITE: &str = "solve 27:13\ngo flow\nsolve 41\ngo cylinders\nsolve -1:189\ngo hotel\nsolve 5\ngo rupture\nsolve 0\ngo crystal\nsolve 40\ngo cube\nsolve 18:3\ngo white\n";

/// Write exactly `n` bytes of a repeating, non-enwik8 pattern (integer arithmetic only).
fn write_fake(path: &Path, n: u64) {
    let mut block = vec![0u8; 1 << 20];
    for (i, b) in block.iter_mut().enumerate() {
        // a stretch of text-like bytes with plenty of white, and nothing like Wikipedia
        *b = match i % 7 {
            0 | 3 => b' ',
            1 => b'\n',
            _ => b'a' + (i % 26) as u8,
        };
    }
    let mut f = fs::File::create(path).unwrap();
    let mut left = n;
    while left > 0 {
        let take = left.min(block.len() as u64) as usize;
        f.write_all(&block[..take]).unwrap();
        left -= take as u64;
    }
    f.flush().unwrap();
    assert_eq!(fs::metadata(path).unwrap().len(), n);
}

#[test]
fn a_file_of_the_right_size_that_is_not_enwik8_is_refused_end_to_end() {
    let saves = tmpdir("enwik8-fake");
    let data = saves.join("data");
    fs::create_dir_all(&data).unwrap();
    write_fake(&data.join("enwik8"), 100_000_000);

    let mut c = cfg(&saves);
    c.data = data.clone();
    let script = format!("{TO_WHITE}look\nprobe field\nquit\n");
    let (code, out) = run_script_text(c, &saves, &script);
    assert_eq!(code, 0, "{out}");

    // not labelled enwik8, not scoped full, not counted as the file
    assert!(
        !out.contains("CENSUS|file=enwik8"),
        "a non-genuine file must never be labelled enwik8: {out}"
    );
    assert!(out.contains("SCOPE|secret=8|scope=bundled_page|enwik8=NOT_MEASURED"));
    assert!(
        out.contains("data/enwik8 was not used (sha256 "),
        "the look says the file was not used, and why: {out}"
    );
    assert!(out.contains("is not the genuine enwik8"), "{out}");
    assert!(out.contains("NOT_MEASURED|subject=enwik8_white_space|reason=NO_INPUT"));
    // the cited figure is not set against a measurement that never happened
    assert!(
        rows_of(&out, "DISAGREE").is_empty(),
        "no DISAGREE row against 1465 for a file that is not enwik8: {out}"
    );
    // the page census is the answer the game accepts, as without any file
    assert!(rows_of(&out, "CENSUS")
        .iter()
        .any(|l| field(l, "file") == Some("bundled_page")));
}

#[test]
fn a_non_genuine_file_in_strict_mode_leaves_secret_8_sealed() {
    let saves = tmpdir("enwik8-fake-strict");
    let data = saves.join("data");
    fs::create_dir_all(&data).unwrap();
    write_fake(&data.join("enwik8"), 100_000_000);

    let mut c = cfg(&saves);
    c.data = data;
    c.strict_enwik8 = true;
    let script = format!("{TO_WHITE}solve 1893\nsolve 1218\nquit\n");
    let (code, out) = run_script_text(c, &saves, &script);
    assert_eq!(code, 0, "{out}");
    assert!(
        rows_of(&out, "FINALSEAL").is_empty(),
        "a non-genuine file is not an ending: {out}"
    );
    assert!(
        !out.contains("SOLVE|region=white_field|match=1"),
        "secret 8 must not be solved from a file that is not enwik8: {out}"
    );
    assert!(out.contains("SOLVE|region=white_field|match=0|not_measured=1|reason=NO_INPUT"));
}

#[test]
fn a_file_of_the_wrong_size_is_still_refused_by_size() {
    let saves = tmpdir("enwik8-short");
    let data = saves.join("data");
    fs::create_dir_all(&data).unwrap();
    write_fake(&data.join("enwik8"), 99_999_999);
    let mut c = cfg(&saves);
    c.data = data;
    let script = format!("{TO_WHITE}look\nquit\n");
    let (_, out) = run_script_text(c, &saves, &script);
    assert!(out.contains("data/enwik8 was not used (size 99999999 is not 100000000)"));
}
