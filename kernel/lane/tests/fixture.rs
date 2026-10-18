//! The vendored code and the stdlib referee (`tools/referee.py`) render the same transcript.

mod common;

#[test]
fn transcript_equals_the_fixture_the_referee_writes() {
    let want = std::fs::read_to_string(common::root().join("tests/fixtures/kernel-lane.hbp"))
        .expect("fixture");
    let got = common::transcript();
    for (i, (w, g)) in want.lines().zip(got.lines()).enumerate() {
        assert_eq!(g, w, "row {}", i + 1);
    }
    assert_eq!(got.lines().count(), want.lines().count());
    assert_eq!(got, want);
}
