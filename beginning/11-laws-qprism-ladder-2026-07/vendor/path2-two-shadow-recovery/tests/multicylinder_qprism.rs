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
fn calculable_slice_roof_rises_with_each_prime_cylinder() {
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
