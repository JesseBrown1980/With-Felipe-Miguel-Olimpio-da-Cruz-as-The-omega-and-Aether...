//! Watcher gate for DBBH -> DBWH throat: black/white round-trip plus Shannon/GNN/MTP rows.
//! This is a classical deterministic analogue, not a physical-universe or quantum-cloning claim.
use path2_two_shadow_recovery::*;

fn sample_slice() -> PiePixelSlice {
    let particles = [
        TaggedParticle {
            x: 1,
            y: 0,
            z: 2,
            tag: 0x1101,
            frequency: 233,
            intensity: 17,
        },
        TaggedParticle {
            x: 4,
            y: 2,
            z: 5,
            tag: 0x2202,
            frequency: 377,
            intensity: 51,
        },
        TaggedParticle {
            x: 6,
            y: 5,
            z: 8,
            tag: 0x3303,
            frequency: 610,
            intensity: 99,
        },
    ];
    PiePixelSlice::from_particles(8, 8, 7, 233, &particles).unwrap()
}

#[test]
fn watcher_gate_verifies_black_white_roundtrip_clone() {
    let codec = MultiCylinder::default_60d();
    let selected = codec.select_for_residual_bits(0).unwrap();
    let slice = sample_slice();
    let receipt = WatcherGate::verify_slice("LIRIS-WATCH-001", &slice, &codec, &selected).unwrap();

    assert_eq!(receipt.verified_clone, slice);
    assert_eq!(receipt.black_host8_hex, receipt.white_host8_hex);
    assert_eq!(receipt.residual_selector_bits, 0);
    assert!(receipt.capacity_margin_bits_floor >= 0);
    assert_eq!(receipt.hallucinations_caught, 0);
    assert!(receipt.watcher_verdicts.iter().all(|v| v.passed));
    assert!(receipt
        .watcher_verdicts
        .iter()
        .any(|v| v.watcher == WatcherKind::OmniShannon));
    assert!(receipt
        .watcher_verdicts
        .iter()
        .any(|v| v.watcher == WatcherKind::GnnForward));
    assert!(receipt
        .watcher_verdicts
        .iter()
        .any(|v| v.watcher == WatcherKind::ReverseGnn));
}

#[test]
fn watcher_gate_holds_when_cylinders_do_not_cover_the_slice_roof() {
    let codec = MultiCylinder::default_60d();
    let slice = sample_slice();

    assert_eq!(
        WatcherGate::verify_slice("LIRIS-WATCH-HOLD", &slice, &codec, &[0, 1]),
        Err(Held::InsufficientJointCapacity)
    );
}

#[test]
fn watcher_gate_catches_tampered_extra_cylinder_shadow() {
    let codec = MultiCylinder::default_60d();
    let projection = PieWorldProjection::project(&sample_slice(), &codec);
    let mut tampered = projection.clone();
    tampered.qprism.shadows.residues[6][0] =
        tampered.qprism.shadows.residues[6][0].wrapping_add(1) % codec.primes[6];

    let receipt = WatcherGate::detect_tampered_projection(
        "LIRIS-WATCH-TAMPER",
        &tampered,
        &codec,
        &[0, 1, 2, 6],
    )
    .unwrap();

    assert_eq!(receipt.hallucinations_caught, 1);
    assert_eq!(receipt.white_host8_hex, "HELD");
    assert_eq!(receipt.watcher_verdicts[0].watcher, WatcherKind::ReverseGnn);
    assert!(!receipt.watcher_verdicts[0].passed);
}

#[test]
fn watcher_gate_hbp_rows_are_hot_path_no_json_or_node() {
    let codec = MultiCylinder::default_60d();
    let selected = codec.select_for_residual_bits(0).unwrap();
    let receipt =
        WatcherGate::verify_slice("LIRIS-WATCH-HBP", &sample_slice(), &codec, &selected).unwrap();
    let rows = receipt.hbp_rows();
    let joined = rows.join("\n");

    assert!(joined.contains("WATCHGATE|id=LIRIS-WATCH-HBP"));
    assert!(joined.contains("WATCHVERDICT|id=LIRIS-WATCH-HBP|watcher=OMNISHANNON"));
    assert!(joined.contains("WATCHVERDICT|id=LIRIS-WATCH-HBP|watcher=GNN_FORWARD"));
    assert!(joined.contains("WATCHVERDICT|id=LIRIS-WATCH-HBP|watcher=REVERSE_GNN"));
    assert!(joined.contains("WATCHVERDICT|id=LIRIS-WATCH-HBP|watcher=MTP1"));
    assert!(joined.contains("verified_clone=1"));
    assert!(joined.contains("body_in_row=0"));
    assert!(rows.iter().all(|r| r.ends_with("json=0")));
    assert!(!joined.contains("{"));
    assert!(!joined.to_lowercase().contains("node"));
}

#[test]
fn omnibit_pixel_is_a_checked_selector_unit_not_payload_magic() {
    let codec = MultiCylinder::default_60d();
    let selected = codec.select_for_residual_bits(0).unwrap();
    let slice = sample_slice();
    let projection = PieWorldProjection::project(&slice, &codec);
    let pixel = OmnibitPixel::from_slice(&slice, 4, 2, &projection, &codec, &selected).unwrap();
    let row = pixel.hbp_row("LIRIS-OMNIBIT-PIXEL-001");

    assert_eq!(pixel.value, slice.pixels[2 * slice.width as usize + 4]);
    assert_eq!(pixel.residual_selector_bits, 0);
    assert!(pixel.capacity_margin_bits_floor >= 0);
    assert!(row.starts_with("OMNIBITPIXEL|"));
    assert!(row.contains("role=pixel_selector_check_unit"));
    assert!(row.contains("body_in_row=0"));
    assert!(row.ends_with("json=0"));
    assert!(!row.contains("{"));
}
