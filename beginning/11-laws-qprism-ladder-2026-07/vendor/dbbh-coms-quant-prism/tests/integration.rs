//! INTEGRATION tests — sender <-> receiver across the capsule, both crossing modes,
//! all three coms modes, across payload sizes incl. the padding paths.
use dbbh_coms_quant_prism::*;

fn armed(mode: ComsMode) -> (Pid, Pid, SessionCapsule) {
    let s = Pid::from_hex("8467a937cba309f7").unwrap();
    let r = Pid::from_hex("00000000deadbeef").unwrap();
    let mut cap = SessionCapsule::propose(s, r, mode, b"integ");
    cap.arm(s);
    cap.arm(r);
    (s, r, cap)
}

#[test]
fn glyph_riding_lossless_across_all_modes_and_sizes() {
    for mode in [ComsMode::AiToAi, ComsMode::AiToHardware, ComsMode::HardwareToHardware] {
        let (s, _r, mut cap) = armed(mode);
        for n in [0usize, 1, 4, 5, 6, 39, 40, 60, 200, 999] {
            let content: Vec<u8> = (0..n).map(|i| ((i * 31 + 7) & 0xFF) as u8).collect();
            let cube = QPrismCube::new(s, &content);
            let crossing = dbbh_send(&cube, &mut cap).expect("send");
            let got = dbbh_receive(&crossing, &cap).expect("receive");
            assert_eq!(got, content, "mode={} n={} must be byte-identical", mode.name(), n);
        }
    }
}

#[test]
fn address_only_crossing_reconstructs_from_receiver_store() {
    let (s, _r, mut cap) = armed(ComsMode::HardwareToHardware);
    let content = b"the mass stays home; only the shadow-coordinate crosses";
    // both black holes retain the mass (shared content-addressed store)
    let mut receiver_store = ContentStore::new();
    let a = receiver_store.put(content);

    let cube = QPrismCube::new(s, content);
    assert_eq!(cube.addr, a, "sender cube address == stored address");
    let crossing = dbbh_send_addressed(&cube, &mut cap).expect("addressed send");
    // the crossing carries ONLY the 20-char address, no glyph payload
    assert!(crossing.rows.iter().all(|r| !r.starts_with("GLYPHS")));
    assert!(crossing.rows[0].contains(&format!("agt={}", a)));

    let got = dbbh_receive_addressed(&crossing, &cap, &receiver_store).expect("addressed receive");
    assert_eq!(got, content, "reconstructed lossless by content-address");
}

#[test]
fn tampered_glyph_is_held_by_address_mismatch() {
    let (s, _r, mut cap) = armed(ComsMode::AiToAi);
    let cube = QPrismCube::new(s, b"authentic slice");
    let mut crossing = dbbh_send(&cube, &mut cap).expect("send");
    // tamper a glyph in transit -> reconstructed content no longer re-addresses to the AGT
    crossing.rows[1] = crossing.rows[1].replacen("v=", "v=999,", 1);
    assert!(matches!(dbbh_receive(&crossing, &cap), Err(Held::AddressMismatch)));
}

#[test]
fn fixed_size_address_regardless_of_content_size() {
    let (s, _r, mut cap) = armed(ComsMode::AiToAi);
    let big = vec![0xABu8; 10_000];
    let cube = QPrismCube::new(s, &big);
    assert_eq!(cube.addr.len(), 20, "AGT-<sha16> is always 20 chars for any content size");
    let crossing = dbbh_send_addressed(&cube, &mut cap).expect("send");
    // the whole address-only crossing header is tiny regardless of the 10KB mass
    assert!(crossing.rows[0].len() < 140);
}
