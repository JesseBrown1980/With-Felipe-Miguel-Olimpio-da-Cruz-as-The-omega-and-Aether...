//! Each port's output equals, byte for byte, what the vendored script printed under
//! `python -I` (receipts/*.stdout; tools/referee.py --check re-runs the scripts against them).

use tribit_referees::{compose, crank, trunk};

#[test]
fn crank_equals_crank_py() {
    assert_eq!(crank::stdout(), include_str!("../receipts/crank.stdout"));
}

#[test]
fn compose_equals_compose_py() {
    assert_eq!(
        compose::stdout(),
        include_str!("../receipts/compose.stdout")
    );
}

#[test]
fn trunk_equals_trunk_py_8() {
    assert_eq!(trunk::stdout(8), include_str!("../receipts/trunk-8.stdout"));
}

#[test]
fn trunk_equals_trunk_py_4000() {
    assert_eq!(
        trunk::stdout(4000),
        include_str!("../receipts/trunk-4000.stdout")
    );
}

#[test]
fn trunk_equals_trunk_py_200000() {
    assert_eq!(
        trunk::stdout(200_000),
        include_str!("../receipts/trunk-200000.stdout")
    );
}
