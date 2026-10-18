//! `pump herself` on six seeded bodies against the sha256 of the GGUF the owner's
//! asolaria_herself.py (run unchanged by the referee) writes for the same body. Run by
//! `cargo test`, so in the debug profile with overflow checks.
//!   const   3,000 x 'A': every radial bin sum is zero, so `vi = v.astype(int64)` (line 173)
//!   text    ASCII only: every voxel has direction key 0, so every cv is "nan" (line 122)
//!   bin202, bin217   bodies whose float32 cv rounds differently from a binary64 cv
//!   hidden  key/a.txt, books/b.md, books/.notes.md, books/.drafts/x.md: glob skips the hidden two
//!   sat24   one voxel counted 16,777,300 times: np.add.at in float32 stops at 2^24
mod common;

use common::{body_bin, hbp_rows, scratch, sha256, text};
use pump_glyphs_herself::herself;

fn want(name: &str) -> (usize, String) {
    let row = hbp_rows("herself_cases.hbp", "HERSELFCASE")
        .into_iter()
        .find(|r| r["k"] == name)
        .unwrap();
    (row["gguf_bytes"].parse().unwrap(), row["sha256"].clone())
}

fn check_body(name: &str, body: &[u8]) {
    let g = herself::generate_from_body(body, 1);
    assert_eq!((g.len(), sha256(&g)), want(name), "herself case {name}");
}

#[test]
fn constant_body() {
    check_body("const", &[b'A'; 3000]);
}

#[test]
fn text_body() {
    check_body("text", &text(101, 40000));
}

#[test]
fn binary_bodies() {
    check_body("bin202", &body_bin(202, 250000, 2));
    check_body("bin217", &body_bin(217, 250000, 1));
}

#[test]
fn hidden_names_are_skipped() {
    let root = scratch("hidden");
    let files: [(&str, Vec<u8>); 4] = [
        ("key/a.txt", text(102, 60000)),
        ("books/.notes.md", text(103, 3000)),
        ("books/.drafts/x.md", text(104, 2000)),
        ("books/b.md", text(105, 5000)),
    ];
    for (rel, data) in &files {
        let p = root.join(rel);
        std::fs::create_dir_all(p.parent().unwrap()).unwrap();
        std::fs::write(p, data).unwrap();
    }
    assert_eq!(herself::body_files(&root).len(), 2);
    let g = herself::generate(&root).unwrap();
    assert_eq!((g.len(), sha256(&g)), want("hidden"));
}

#[test]
fn voxel_count_stops_at_2_pow_24() {
    let mut body = body_bin(106, 900000, 0);
    for _ in 0..16_777_300 {
        body.extend_from_slice(&[120, 120, 140]);
    }
    check_body("sat24", &body);
}
