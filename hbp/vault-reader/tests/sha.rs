#![forbid(unsafe_code)]
//! The streaming SHA-256 equals the vendored one-shot `sha256_hex`, and the streaming row
//! counter equals the `splitlines` row count, for every chunking.

use asolaria_hbi_hbp::sha256_hex;
use vault_reader::sha::Sha256;
use vault_reader::text::{splitlines, RowCounter};

fn pattern(n: usize, seed: u32) -> Vec<u8> {
    let mut x = seed;
    (0..n)
        .map(|_| {
            x = x.wrapping_mul(1_103_515_245).wrapping_add(12_345);
            (x >> 16) as u8
        })
        .collect()
}

#[test]
fn streaming_sha256_equals_vendored() {
    for n in 0..=300usize {
        let data = pattern(n, n as u32);
        for chunk in [1usize, 3, 63, 64, 65, 128, 1000] {
            let mut s = Sha256::new();
            for c in data.chunks(chunk) {
                s.update(c);
            }
            assert_eq!(s.finish_hex(), sha256_hex(&data), "n={n} chunk={chunk}");
        }
    }
    let big = pattern(1 << 20, 7);
    let mut s = Sha256::new();
    for c in big.chunks(4099) {
        s.update(c);
    }
    assert_eq!(s.finish_hex(), sha256_hex(&big));
}

#[test]
fn known_answers() {
    assert_eq!(
        Sha256::new().finish_hex(),
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    let mut s = Sha256::new();
    s.update(b"abc");
    assert_eq!(
        s.finish_hex(),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
}

#[test]
fn row_counter_equals_splitlines() {
    let samples = [
        "",
        "a",
        "a\n",
        "a\nb",
        "a\r\nb\r\n",
        "\r\r\n\n",
        "x\u{0b}y\u{0c}z\u{1c}w\u{1d}v\u{1e}u\u{85}t\u{2028}s\u{2029}r",
        "tail\r",
        "\u{2028}",
    ];
    for t in samples {
        let want = splitlines(t).len() as u64;
        let bytes = t.as_bytes();
        for chunk in 1..=bytes.len().max(1) {
            let mut rc = RowCounter::new();
            for c in bytes.chunks(chunk) {
                rc.update(c);
            }
            assert_eq!(rc.finish(), Some(want), "{t:?} chunk={chunk}");
        }
    }
    let mut rc = RowCounter::new();
    rc.update(&[0x61, 0xff, 0x0a]);
    assert_eq!(rc.finish(), None);
    let mut rc = RowCounter::new();
    rc.update(&[0xe2, 0x80]);
    assert_eq!(rc.finish(), None);
}
