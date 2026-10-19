//! Shared by the referee tests: SHA-256 (the owner's shadowcat), splitmix64, HBP row reading, and
//! the seeded inputs `referee/dump_vectors.py` builds the same way. Integer arithmetic only.
#![allow(dead_code)]

use std::collections::BTreeMap;
use std::path::PathBuf;

pub fn vec_path(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/vectors")
        .join(name)
}

pub fn crate_path(rel: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(rel)
}

/// A scratch directory for files a test writes (under the target directory).
pub fn scratch(name: &str) -> PathBuf {
    let d = PathBuf::from(env!("CARGO_TARGET_TMPDIR"))
        .join("pump-glyphs-herself")
        .join(name);
    let _ = std::fs::remove_dir_all(&d);
    std::fs::create_dir_all(&d).unwrap();
    d
}

// ---------------------------------------------------------------- SHA-256
// The owner's shadowcat `src/sha256.rs` (owner decision 2026-10-18; parity in `shadowcat/parity/`).

/// Lowercase hex SHA-256 of `data`.
pub fn sha256(data: &[u8]) -> String {
    shadowcat::hex(&shadowcat::digest(data))
}

/// Lowercase hex of `bytes`.
pub fn hex(bytes: &[u8]) -> String {
    shadowcat::hex(bytes)
}

// ---------------------------------------------------------------- splitmix64 and seeds
pub struct SplitMix64(pub u64);

impl SplitMix64 {
    pub fn next(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }
}

const ALPHA: &[u8] = b"etaoin shrdlucmfwypvbgkqjxz.,\nETAOIN0123456789";

pub fn text(seed: u64, len: usize) -> Vec<u8> {
    let mut r = SplitMix64(seed);
    (0..len)
        .map(|_| ALPHA[(r.next() % ALPHA.len() as u64) as usize])
        .collect()
}

pub fn tri2(seed: u64, len: usize) -> Vec<u8> {
    let mut r = SplitMix64(seed);
    (0..len)
        .map(|_| {
            let a = r.next() % 128;
            let b = r.next() % 128;
            (a + b) as u8
        })
        .collect()
}

pub fn tri4(seed: u64, len: usize) -> Vec<u8> {
    let mut r = SplitMix64(seed);
    (0..len)
        .map(|_| (0..4).map(|_| r.next() % 64).sum::<u64>() as u8)
        .collect()
}

pub fn body_bin(seed: u64, size: usize, mode: u32) -> Vec<u8> {
    let mut r = SplitMix64(seed);
    match mode {
        0 => (0..size).map(|_| (r.next() & 255) as u8).collect(),
        1 => (0..size)
            .map(|_| {
                let a = r.next() & 255;
                let b = r.next() & 255;
                a.min(b) as u8
            })
            .collect(),
        2 => (0..size)
            .map(|_| {
                let a = r.next() & 255;
                let b = r.next() & 255;
                a.max(b) as u8
            })
            .collect(),
        _ => {
            let al: Vec<u8> = (0..40).map(|_| (r.next() & 255) as u8).collect();
            (0..size).map(|_| al[(r.next() % 40) as usize]).collect()
        }
    }
}

// ---------------------------------------------------------------- HBP rows
/// The `TAG|key=value|...` rows of an HBP vector file whose first field is `tag`.
pub fn hbp_rows(name: &str, tag: &str) -> Vec<BTreeMap<String, String>> {
    let text = std::fs::read_to_string(vec_path(name)).unwrap();
    text.lines()
        .filter(|l| l.split('|').next() == Some(tag))
        .map(|l| {
            l.split('|')
                .skip(1)
                .map(|kv| {
                    let (k, v) = kv.split_once('=').unwrap();
                    (k.to_string(), v.to_string())
                })
                .collect()
        })
        .collect()
}

#[test]
fn sha256_known_answers() {
    assert_eq!(
        sha256(b"abc"),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
    assert_eq!(
        sha256(b""),
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
}
