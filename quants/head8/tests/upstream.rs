//! The port against the vendored upstream bytes: the calibration rows are the strings of
//! quant-huge-message-benchmark.mjs:21-32, and the checks of the upstream unit test
//! (tests/quant-huge-message-benchmark.unit.test.mjs:12-30) hold.

use quant_head8::{fill, quant8, tuple_buffer, CALIBRATION_ROWS, D, TUPLE_BYTES};

const UPSTREAM: &str = include_str!(
    "../vendor/ASOLARIA-AS-NEURAL-NETWORK/tools/behcs/quant-huge-message-benchmark.mjs"
);

#[test]
fn calibration_rows_are_the_upstream_strings() {
    let lines: Vec<&str> = UPSTREAM.lines().collect();
    let upstream: Vec<&str> = lines[20..32]
        .iter()
        .map(|l| {
            let l = l.trim();
            l.strip_prefix('\'')
                .and_then(|l| l.strip_suffix("',"))
                .expect("quoted row")
        })
        .collect();
    assert_eq!(upstream, CALIBRATION_ROWS);
    assert_eq!(lines[32].trim(), "]);");
}

#[test]
fn definition_rows_are_hbp_only_and_tagged() {
    // unit.test.mjs:12-19
    assert!(CALIBRATION_ROWS.len() >= 10);
    assert!(CALIBRATION_ROWS.iter().all(|r| r.ends_with("json=0")));
    assert!(CALIBRATION_ROWS.iter().all(|r| !r.contains("{\"")));
    let any = |s: &str| CALIBRATION_ROWS.iter().any(|r| r.contains(s));
    assert!(any("FAITHFUL_TO_DOCTRINE_NOT_FABRIC_ENGINE_BINDING"));
    assert!(any("fidelity=UNSWEPT"));
    assert!(any("DRAFT_UNTIL_LIRIS_RERUN_AND_FIDELITY_SWEEP"));
}

#[test]
fn deterministic_with_a_constant_size_tuple() {
    // unit.test.mjs:21-30 checks this on Math.sin(i) and Math.cos(i) inputs; these are the
    // benchmark's fill() inputs of the same lengths.
    let small = fill(1024, 12345);
    let large = fill(65536, 99999);
    let (q1, q2) = (quant8(&small), quant8(&small));
    assert_eq!(q1.turbo, q2.turbo);
    assert_eq!(q1.scale, q2.scale);
    assert_eq!(
        tuple_buffer(&quant8(&small)).len(),
        tuple_buffer(&quant8(&large)).len()
    );
    assert_eq!(q1.turbo.len(), D);
    assert_eq!(TUPLE_BYTES, 3200);
}
