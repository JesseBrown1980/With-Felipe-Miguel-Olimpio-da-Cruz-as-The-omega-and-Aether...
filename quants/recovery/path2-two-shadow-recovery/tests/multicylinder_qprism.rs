//! LIRIS extension: multi-cylinder 60D+ Q-PRISM slice harness.
//! No JSON, no Node: BEHCS wavelength frames + HBI/HBP-style rows + Host8/SHA.
use path2_two_shadow_recovery::*;

#[test]
fn three_cylinders_recover_eight_byte_slice_while_two_hold() {
    let codec = MultiCylinder::default_60d();
    let data = b"frozen-slice:mtp1/mtp2/mtp3:geospatial-shadow";
    let shadows = codec.project(data);

    assert!(!codec.sufficient_subset(&[0, 1]).unwrap());
    assert_eq!(
        codec.recover_from(&shadows, &[0, 1]),
        Err(Held::InsufficientJointCapacity)
    );

    assert!(codec.sufficient_subset(&[0, 1, 2]).unwrap());
    assert_eq!(codec.recover_from(&shadows, &[0, 1, 2]).unwrap(), data);
    assert_eq!(codec.recover_from(&shadows, &[2, 4, 6]).unwrap(), data);
}

#[test]
fn calculable_slice_roof_rises_with_each_coprime_cylinder() {
    let codec = MultiCylinder::default_60d();
    assert!(codec.joint_capacity_bits_floor(&[0]).unwrap() < 64);
    assert!(codec.joint_capacity_bits_floor(&[0, 1]).unwrap() < 64);
    assert!(codec.joint_capacity_bits_floor(&[0, 1, 2]).unwrap() >= 64);
    assert!(
        codec.joint_capacity_bits_floor(&[0, 1, 2, 3]).unwrap()
            > codec.joint_capacity_bits_floor(&[0, 1, 2]).unwrap()
    );
}

#[test]
fn behcs_64_256_1024_wavelengths_roundtrip() {
    let data = b"binary/hex/sha/hbi/hbp -> behcs64/256/1024 -> exact";
    for rung in [
        BehcsRung::Behcs64,
        BehcsRung::Behcs256,
        BehcsRung::Behcs1024,
    ] {
        let frame = BehcsFrame::encode(rung, data);
        assert_eq!(frame.decode(), data);
    }
}

#[test]
fn qprism_3d_slice_emits_hbp_rows_no_payload_json_or_node() {
    let codec = MultiCylinder::default_60d();
    let data = b"3d q-prism fluctuating slice, watched at every edge";
    let slice = QPrismSlice3d::project(data, &codec);
    let rows = slice.hbp_rows(&codec, "LIRIS-Q3D-SLICE-001");
    let joined = rows.join("\n");

    assert!(joined.contains("Q3DSLICE|"));
    assert!(joined.contains("Q3DWAVE|id=LIRIS-Q3D-SLICE-001|rung=BEHCS-64"));
    assert!(joined.contains("Q3DWAVE|id=LIRIS-Q3D-SLICE-001|rung=BEHCS-256"));
    assert!(joined.contains("Q3DWAVE|id=LIRIS-Q3D-SLICE-001|rung=BEHCS-1024"));
    assert!(joined.contains("Q3DWATCH|id=LIRIS-Q3D-SLICE-001|watcher=OMNISHANNON"));
    assert!(joined.contains("Q3DWATCH|id=LIRIS-Q3D-SLICE-001|watcher=REVERSE_GNN"));
    assert!(joined.contains("body_in_row=0"));
    assert!(rows.iter().all(|r| r.ends_with("json=0")));
    assert!(!joined.contains("{"));
    assert!(!joined.to_lowercase().contains("node"));
}

#[test]
fn sha256_and_host8_are_stable_tokens_for_the_slice() {
    let a = sha256(b"abc");
    assert_eq!(
        a.hex(),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
    assert_eq!(hex_lower(&a.host8()), "ba7816bf8f01cfea");
}

#[test]
fn all_seven_cylinders_recover_without_u128_false_hold() {
    let codec = MultiCylinder::default_60d();
    let data = b"all seven cylinders should add redundancy, not overflow into Held";
    let shadows = codec.project(data);
    let all = [0, 1, 2, 3, 4, 5, 6];

    assert!(codec.sufficient_subset(&all).unwrap());
    assert_eq!(codec.recover_from(&shadows, &all).unwrap(), data);
    assert!(codec.joint_capacity_bits_floor(&all).unwrap() > 128);
    assert!(codec.signed_capacity_margin_bits_floor(&all).unwrap() > 64);
    assert_eq!(codec.residual_selector_bits(&all).unwrap(), 0);
}

#[test]
fn receipt_capacity_never_zeroes_overflow_sized_cylinders() {
    let codec = MultiCylinder::default_60d();
    let slice = QPrismSlice3d::project(b"receipt capacity must not silently lose bits", &codec);
    let rows = slice.hbp_rows(&codec, "LIRIS-CAPACITY-OVERFLOW-GUARD");
    let joined = rows.join("\n");

    assert!(joined.contains("coprime_modulus="));
    assert!(!joined.contains("|prime="));
    assert!(!joined.contains("capacity_bits_floor=0"));
    assert!(joined.contains("capacity_margin_bits_floor="));
}

#[test]
fn extra_cylinder_residues_are_consistency_checked_after_sufficient_prefix() {
    let codec = MultiCylinder::default_60d();
    let data = b"tamper with an extra cylinder after the first three recover";
    let mut shadows = codec.project(data);
    shadows.residues[6][0] = shadows.residues[6][0].wrapping_add(1) % codec.primes[6];

    assert_eq!(
        codec.recover_from(&shadows, &[0, 1, 2, 6]),
        Err(Held::InconsistentResidue)
    );
}

#[test]
fn adaptive_n_q_prism_selects_until_target_residual_bits() {
    let codec = MultiCylinder::default_60d();

    assert_eq!(codec.select_for_residual_bits(16).unwrap(), vec![0, 1]);
    assert_eq!(codec.residual_selector_bits(&[0, 1]).unwrap(), 15);
    assert_eq!(codec.select_for_residual_bits(2).unwrap(), vec![0, 1, 2]);
    assert_eq!(codec.residual_selector_bits(&[0, 1, 2]).unwrap(), 0);
}
