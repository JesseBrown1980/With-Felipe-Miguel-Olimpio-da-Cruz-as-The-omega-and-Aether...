//! Shared by the referee tests: SHA-256 (FIPS 180-4), splitmix64, HBP row reading, and the
//! seeded inputs `referee/dump_vectors.py` builds the same way. Integer arithmetic only.
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
const K: [u32; 64] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

pub fn sha256(data: &[u8]) -> String {
    let mut h: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
    ];
    let mut msg = data.to_vec();
    msg.push(0x80);
    while msg.len() % 64 != 56 {
        msg.push(0);
    }
    msg.extend_from_slice(&((data.len() as u64) * 8).to_be_bytes());
    for block in msg.chunks(64) {
        let mut w = [0u32; 64];
        for t in 0..16 {
            w[t] = u32::from_be_bytes(block[4 * t..4 * t + 4].try_into().unwrap());
        }
        for t in 16..64 {
            let s0 = w[t - 15].rotate_right(7) ^ w[t - 15].rotate_right(18) ^ (w[t - 15] >> 3);
            let s1 = w[t - 2].rotate_right(17) ^ w[t - 2].rotate_right(19) ^ (w[t - 2] >> 10);
            w[t] = w[t - 16]
                .wrapping_add(s0)
                .wrapping_add(w[t - 7])
                .wrapping_add(s1);
        }
        let mut v = h;
        for t in 0..64 {
            let s1 = v[4].rotate_right(6) ^ v[4].rotate_right(11) ^ v[4].rotate_right(25);
            let ch = (v[4] & v[5]) ^ (!v[4] & v[6]);
            let t1 = v[7]
                .wrapping_add(s1)
                .wrapping_add(ch)
                .wrapping_add(K[t])
                .wrapping_add(w[t]);
            let s0 = v[0].rotate_right(2) ^ v[0].rotate_right(13) ^ v[0].rotate_right(22);
            let maj = (v[0] & v[1]) ^ (v[0] & v[2]) ^ (v[1] & v[2]);
            let t2 = s0.wrapping_add(maj);
            v = [
                t1.wrapping_add(t2),
                v[0],
                v[1],
                v[2],
                v[3].wrapping_add(t1),
                v[4],
                v[5],
                v[6],
            ];
        }
        for i in 0..8 {
            h[i] = h[i].wrapping_add(v[i]);
        }
    }
    hex(&h.iter().flat_map(|x| x.to_be_bytes()).collect::<Vec<u8>>())
}

/// Lowercase hex of `bytes`.
pub fn hex(bytes: &[u8]) -> String {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";
    let mut s = String::with_capacity(2 * bytes.len());
    for &b in bytes {
        s.push(DIGITS[(b >> 4) as usize] as char);
        s.push(DIGITS[(b & 15) as usize] as char);
    }
    s
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
