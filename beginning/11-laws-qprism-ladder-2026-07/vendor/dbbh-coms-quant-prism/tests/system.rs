//! SYSTEM tests — simulates the ASOLARIA ASI OS backend: stubbed 8-byte-host "rooms"
//! exchanging shadows across double-black-hole capsules in ALL three coms modes
//! (AI<->AI, AI<->HW, HW<->HW), PID-specific full-60D Q-PRISM cubes, HBP hot-path
//! (json=0) on the wire. No JSON, no Node.
use dbbh_coms_quant_prism::*;

fn armed(mode: ComsMode, s: Pid, r: Pid) -> SessionCapsule {
    let mut c = SessionCapsule::propose(s, r, mode, b"metal-backend");
    c.arm(s);
    c.arm(r);
    c
}

#[test]
fn asi_os_backend_all_modes_addressed_lossless_and_hotpath() {
    // stubbed rooms on the 8-byte host
    let ai = Pid::from_hex("8467a937cba309f7").unwrap(); // ACER-CLAUDE-FABLE5 seat
    let ai2 = Pid::from_hex("00000000feed0001").unwrap(); // peer AI seat
    let hw_a = Pid::from_hex("00000000cafe0001").unwrap(); // hardware node A
    let hw_b = Pid::from_hex("00000000cafe0002").unwrap(); // hardware node B

    for (mode, s, r) in [
        (ComsMode::AiToAi, ai, ai2),
        (ComsMode::AiToHardware, ai, hw_a),
        (ComsMode::HardwareToHardware, hw_a, hw_b),
    ] {
        let content = format!("shadow via {} on the metal backend, room {}", mode.name(), s.hex());
        let content = content.as_bytes();

        // both black holes retain the mass in their content-addressed store
        let mut sender_store = ContentStore::new();
        let mut receiver_store = ContentStore::new();
        let a1 = sender_store.put(content);
        let a2 = receiver_store.put(content);
        assert_eq!(a1, a2, "content address is deterministic across rooms (shared codebook)");

        // PID-specific full-60D Q-PRISM cube
        let cube = QPrismCube::new(s, content);
        assert_eq!(cube.selector.len(), 60, "full 60D Q-PRISM cube");
        assert_eq!(cube.pid, s, "cube is PID-specific to the sending room");

        let mut cap = armed(mode, s, r);
        let crossing = dbbh_send_addressed(&cube, &mut cap).expect("addressed send");

        // HOT-PATH assertions: every wire row is json=0 and carries NO JSON
        for row in &crossing.rows {
            assert!(row.ends_with("|json=0"), "hot-path row must end json=0: {row}");
            assert!(!row.contains('{') && !row.contains('}'), "no JSON braces on the wire: {row}");
            assert!(!row.contains("\":\""), "no JSON on the wire: {row}");
        }
        // only the 20-char shadow-coordinate crosses, not the mass
        assert!(crossing.rows[0].contains(&format!("agt={}", a1)));

        // the receiving room reconstructs LOSSLESS from its own store by the address
        let got = dbbh_receive_addressed(&crossing, &cap, &receiver_store).expect("addressed receive");
        assert_eq!(got, content, "{} must reconstruct byte-identical on the far pole", mode.name());
    }
}

#[test]
fn no_consent_holds_the_tunnel() {
    let s = Pid::from_hex("8467a937cba309f7").unwrap();
    let r = Pid::from_hex("00000000cafe0001").unwrap();
    let mut cap = SessionCapsule::propose(s, r, ComsMode::AiToHardware, b"x");
    cap.arm(s); // only one side arms
    let cube = QPrismCube::new(s, b"denied without both consents");
    assert!(matches!(dbbh_send_addressed(&cube, &mut cap), Err(Held::NoConsent)));
}

#[test]
fn far_pole_without_retention_is_held_not_invented() {
    let s = Pid::from_hex("8467a937cba309f7").unwrap();
    let r = Pid::from_hex("00000000cafe0001").unwrap();
    let mut cap = armed(ComsMode::HardwareToHardware, s, r);
    let cube = QPrismCube::new(s, b"only in the sender store");
    let crossing = dbbh_send_addressed(&cube, &mut cap).expect("send");
    let empty_store = ContentStore::new(); // receiving room did NOT retain the mass
    assert!(matches!(
        dbbh_receive_addressed(&crossing, &cap, &empty_store),
        Err(Held::AddressMismatch)
    ));
}

#[test]
fn full_ladder_round_trips_on_the_same_backend_slice() {
    // the same slice re-related across all four sets: 64 / 256 / 1024 / HyperBEHCS(60D)
    let slice = b"a backend room slice, re-related across the whole BEHCS ladder losslessly";
    for lvl in [Level::Behcs64, Level::Behcs256, Level::Behcs1024] {
        let syms = to_level(slice, lvl);
        assert_eq!(from_level(&syms, lvl, slice.len()), slice, "{} rung lossless", lvl.name());
    }
    let glyph_count = to_level(slice, Level::Behcs1024).len();
    let cube = to_hyperbehcs(slice);
    assert_eq!(cube[0].len(), 60);
    assert_eq!(from_hyperbehcs(&cube, glyph_count, slice.len()), slice, "HyperBEHCS 60D rung lossless");
}
