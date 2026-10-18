//! The Rust ports reproduce, row for row, `tests/fixtures/vectors.hbp`, which `tools/referee.py
//! --emit-fixture` writes from the owner's code executed from the vendored files:
//! `trijection.py` (`to_balanced_ternary`, `trijection_forward`, `trijection_inverse`, and the
//! lines `:55-56`, `:62`, `:75-76`, `:84-87`), `bal3`, `base3`, `cube27` and the lines
//! `rime_27fischers.py:39-44,92` / `rime_agents.py:46-51`.

mod common;

use common::rows;

#[test]
fn rust_rows_equal_the_referee_fixture() {
    let want = include_str!("fixtures/vectors.hbp");
    let mut got = String::new();
    rows::emit(&rows::FIXTURE, &mut |row| {
        got.push_str(row);
        got.push('\n');
    });
    let mut n = 0usize;
    for (i, (w, g)) in want.lines().zip(got.lines()).enumerate() {
        assert_eq!(g, w, "row {} differs", i + 1);
        n += 1;
    }
    assert_eq!(got.lines().count(), want.lines().count(), "row counts");
    assert_eq!(n, 2_565, "fixture rows");
}

/// The test-only SHA-256 of the stream rows, on the FIPS 180-4 examples.
#[test]
fn sha256_known_answers() {
    let hex = |d: &[u8]| {
        let mut h = rows::Sha256::new();
        h.update(d);
        h.hex()
    };
    assert_eq!(
        hex(b""),
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    assert_eq!(
        hex(b"abc"),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
    assert_eq!(
        hex(b"abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"),
        "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"
    );
}
