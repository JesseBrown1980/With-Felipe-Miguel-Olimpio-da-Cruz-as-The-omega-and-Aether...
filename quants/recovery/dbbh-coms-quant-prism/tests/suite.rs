//! SUITE tests — the double-black-hole session capsule lifecycle end to end.
use dbbh_coms_quant_prism::*;

#[test]
fn full_capsule_lifecycle_propose_arm_send_receive_collapse() {
    let s = Pid::from_hex("8467a937cba309f7").unwrap();
    let r = Pid::from_hex("00000000deadbeef").unwrap();
    let content = b"the shadow crossing the double black hole";
    let cube = QPrismCube::new(s, content);
    let mut cap = SessionCapsule::propose(s, r, ComsMode::AiToAi, b"session-salt");

    // before both arm: send is HELD (no consent -> no tunnel)
    assert!(matches!(dbbh_send(&cube, &mut cap), Err(Held::NoConsent)));

    cap.arm(s);
    assert!(!cap.is_open(), "one side armed is not consent");
    cap.arm(r);
    assert!(cap.is_open(), "both sides armed opens the tunnel");

    let crossing = dbbh_send(&cube, &mut cap).expect("armed send succeeds");
    let got = dbbh_receive(&crossing, &cap).expect("armed receive succeeds");
    assert_eq!(got, content, "lossless across the capsule");

    // collapse: any further crossing is HELD
    cap.collapse();
    assert_eq!(cap.state(), CapsuleState::Collapsed);
    assert!(matches!(dbbh_send(&cube, &mut cap), Err(Held::Collapsed)));

    // the audit chain is complete, ordered, hash-matched (N-Nest gate)
    assert!(verify_chain(cap.audit.rows()));
    assert!(
        cap.audit.rows().len() >= 5,
        "propose/arm/arm/open/shadow/collapse recorded"
    );
}

#[test]
fn either_side_revokes_immediately() {
    let s = Pid::from_hex("1111111111111111").unwrap();
    let r = Pid::from_hex("2222222222222222").unwrap();
    let mut cap = SessionCapsule::propose(s, r, ComsMode::AiToHardware, b"x");
    cap.arm(s);
    cap.arm(r);
    assert!(cap.is_open());
    cap.revoke();
    assert_eq!(cap.state(), CapsuleState::Revoked);
    let cube = QPrismCube::new(s, b"blocked after revoke");
    assert!(matches!(dbbh_send(&cube, &mut cap), Err(Held::Collapsed)));
}

#[test]
fn a_stranger_pid_cannot_arm() {
    let s = Pid::from_hex("1111111111111111").unwrap();
    let r = Pid::from_hex("2222222222222222").unwrap();
    let intruder = Pid::from_hex("9999999999999999").unwrap();
    let mut cap = SessionCapsule::propose(s, r, ComsMode::AiToAi, b"x");
    cap.arm(s);
    cap.arm(intruder); // ignored — not a party to the capsule
    assert!(
        !cap.is_open(),
        "an outside PID cannot supply the second consent"
    );
    cap.arm(r);
    assert!(cap.is_open());
}
