//! PIE world-slice harness: pixels-first simulated universe over N-prime cylinders.
//! No JSON, no Node: deterministic slices, HBP rows, and byte-identical-or-Held gates.
use path2_two_shadow_recovery::*;

fn sample_slice() -> PiePixelSlice {
    let particles = [
        TaggedParticle {
            x: 0,
            y: 0,
            z: 0,
            tag: 0xA501,
            frequency: 144,
            intensity: 9,
        },
        TaggedParticle {
            x: 3,
            y: 1,
            z: 2,
            tag: 0xB602,
            frequency: 144,
            intensity: 41,
        },
        TaggedParticle {
            x: 5,
            y: 4,
            z: 1,
            tag: 0xC703,
            frequency: 377,
            intensity: 88,
        },
        TaggedParticle {
            x: 2,
            y: 5,
            z: 8,
            tag: 0xD804,
            frequency: 610,
            intensity: 123,
        },
    ];
    PiePixelSlice::from_particles(6, 6, 42, 144, &particles).unwrap()
}

#[test]
fn pie_slice_projects_to_n_prime_cylinders_and_recovers_pixels() {
    let codec = MultiCylinder::default_60d();
    let slice = sample_slice();
    let projection = PieWorldProjection::project(&slice, &codec);

    assert_eq!(
        projection.recover_current(&codec, &[0, 1, 2]).unwrap(),
        slice
    );
    assert_eq!(
        projection.recover_current(&codec, &[2, 4, 6]).unwrap(),
        slice
    );
    assert_eq!(projection.qprism.behcs64.decode(), slice.to_bytes());
    assert_eq!(projection.qprism.behcs256.decode(), slice.to_bytes());
    assert_eq!(projection.qprism.behcs1024.decode(), slice.to_bytes());
}

#[test]
fn insufficient_prime_cylinder_roof_holds_instead_of_predicting() {
    let codec = MultiCylinder::default_60d();
    let slice = sample_slice();
    let projection = PieWorldProjection::project(&slice, &codec);
    let rule = LeWorldRule {
        dx: 1,
        dy: -1,
        phase_delta: 13,
        xor_key: 0x5a,
    };

    assert_eq!(
        projection.recover_current(&codec, &[0, 1]),
        Err(Held::InsufficientJointCapacity)
    );
    assert_eq!(
        projection.predict_next(&rule, &codec, &[0, 1]),
        Err(Held::InsufficientJointCapacity)
    );
}

#[test]
fn leworld_rule_computes_future_and_past_slices_byte_identically() {
    let codec = MultiCylinder::default_60d();
    let current = sample_slice();
    let rule = LeWorldRule {
        dx: 2,
        dy: -1,
        phase_delta: 21,
        xor_key: 0xA7,
    };
    let expected_next = rule.step(&current).unwrap();
    let projection = PieWorldProjection::project(&current, &codec);

    let predicted_next = projection.predict_next(&rule, &codec, &[0, 1, 2]).unwrap();
    assert_eq!(predicted_next, expected_next);

    let next_projection = PieWorldProjection::project(&predicted_next, &codec);
    let predicted_previous = next_projection
        .predict_previous(&rule, &codec, &[0, 1, 2])
        .unwrap();
    assert_eq!(predicted_previous, current);
}

#[test]
fn frequency_spheres_are_pixel_shadows_inside_the_bounded_slice() {
    let slice = sample_slice();
    let shells = slice.frequency_shells();
    let pixel_total: usize = shells.iter().map(|s| s.pixels).sum();
    let energy_total: u64 = shells.iter().map(|s| s.energy).sum();

    assert_eq!(pixel_total, slice.pixels.len());
    assert_eq!(
        energy_total,
        slice.pixels.iter().map(|&b| b as u64).sum::<u64>()
    );
    assert!(shells
        .windows(2)
        .all(|pair| pair[0].radius2 <= pair[1].radius2));
}

#[test]
fn pie_hbp_rows_are_pixels_first_and_explicitly_classical() {
    let codec = MultiCylinder::default_60d();
    let projection = PieWorldProjection::project(&sample_slice(), &codec);
    let rows = projection.hbp_rows(&codec, "LIRIS-PIE-WORLD-001");
    let joined = rows.join("\n");

    assert!(joined.contains("PIEWORLD|id=LIRIS-PIE-WORLD-001"));
    assert!(joined.contains("PIESHELL|id=LIRIS-PIE-WORLD-001"));
    assert!(joined.contains("PIEWATCH|id=LIRIS-PIE-WORLD-001|watcher=LEWORLD"));
    assert!(joined.contains("PIEWATCH|id=LIRIS-PIE-WORLD-001|watcher=PIE_SHADOW_ROOF"));
    assert!(joined.contains("shadow_clone=classical"));
    assert!(joined.contains("body_in_row=0"));
    assert!(rows.iter().all(|r| r.ends_with("json=0")));
    assert!(!joined.contains("{"));
    assert!(!joined.to_lowercase().contains("node"));
}
