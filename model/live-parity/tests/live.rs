use asolaria_live_parity::{decimal_to_q24, q24_to_e4, rust_q24, CAPTURES};

#[test]
fn l4_equals_the_live_server_exactly() {
    for c in &CAPTURES {
        let (_, l4) = rust_q24(c.content);
        assert_eq!(i128::from(l4), decimal_to_q24(c.l4_live), "{}", c.content);
    }
}

#[test]
fn l0_is_within_one_q24_unit_and_equal_at_four_decimals() {
    let mut diffs = Vec::new();
    for c in &CAPTURES {
        let (l0, _) = rust_q24(c.content);
        let live = decimal_to_q24(c.l0_live);
        let diff = i128::from(l0) - live;
        assert!(diff.abs() <= 1, "{}: {diff}", c.content);
        assert_eq!(q24_to_e4(i128::from(l0)), q24_to_e4(live), "{}", c.content);
        diffs.push(diff);
    }
    // Measured 2026-10-17: 0, +1, +1 (the server's float32 forward rounds each operation; the port rounds once per layer).
    assert_eq!(diffs, [0, 1, 1]);
}
