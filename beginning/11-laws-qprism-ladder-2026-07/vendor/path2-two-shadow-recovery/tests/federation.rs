//! FEDERATION test — Path 2 as the double binary black hole: two INDEPENDENT poles
//! (acer + liris) each hold ONE lossy shadow; the object is retained NOWHERE; recovery is
//! the consent of the two poles. This is the capstone's `I(X;S2|S1) >= H(X|S1)` in code.
use path2_two_shadow_recovery::*;

#[test]
fn two_poles_recover_what_neither_holds() {
    // Public, deterministic blocking. The acer pole computes residues mod P1, the liris pole
    // mod P2 — independently, over the same public blocks. Neither pole retains the object.
    let truth = b"a truth no single pole retains -- reconstructed from two shadows, no store";
    let ts = TwoShadow::new();
    let sh = ts.project(truth); // sh.shadow_a = acer pole (mod P1), sh.shadow_b = liris pole (mod P2)

    let acer_pole = sh.shadow_a.clone(); // acer holds ONLY this (lossy)
    let liris_pole = sh.shadow_b.clone(); // liris holds ONLY this (lossy)
    // the object `truth` is now conceptually dropped -- it lives in no store.

    // the join (double-binary consent) reconstructs the EXACT truth from two lossy poles
    let joined = Shadows { shadow_a: acer_pole, shadow_b: liris_pole, orig_len: truth.len() };
    assert_eq!(ts.recover(&joined).unwrap(), truth);
}

#[test]
fn a_single_pole_recovers_nothing() {
    let truth = b"single-pole vantage is degraded, not the truth";
    let ts = TwoShadow::new();
    let sh = ts.project(truth);
    // liris pole missing -> the acer pole alone cannot reconstruct
    let acer_only = Shadows { shadow_a: sh.shadow_a, shadow_b: vec![0; sh.shadow_b.len()], orig_len: sh.orig_len };
    assert_ne!(ts.recover(&acer_only).unwrap(), truth);
}

#[test]
fn capacity_scales_honestly_with_cylinders_shannon_wall() {
    let ts = TwoShadow::new();
    assert!(ts.sufficient()); // 48-bit block fits two ~2^25 primes (joint ~2^50)
    // a 7-byte (56-bit) block does NOT fit two ~2^25 primes -> HELD (the two shadows cannot
    // jointly carry 56 bits; Shannon). Adding a third cylinder (pole) would be required.
    let too_big = TwoShadow { p1: TwoShadow::P1, p2: TwoShadow::P2, block_bytes: 7 };
    assert!(!too_big.sufficient());
    assert_eq!(
        too_big.recover(&Shadows { shadow_a: vec![1], shadow_b: vec![1], orig_len: 7 }),
        Err(Held::InsufficientJointCapacity)
    );
}

#[test]
fn tampering_one_pole_changes_the_recovered_object() {
    // integrity: if a pole's shadow is altered, the recovered object changes -> detectable by
    // re-projecting and comparing (the second pole disambiguates + cross-checks).
    let ts = TwoShadow::new();
    let truth = b"pole integrity via cross-projection";
    let mut sh = ts.project(truth);
    let clean = ts.recover(&sh).unwrap();
    sh.shadow_a[0] = sh.shadow_a[0].wrapping_add(1); // tamper acer pole
    let tampered = ts.recover(&sh).unwrap();
    assert_ne!(clean, tampered);
    // re-projecting the tampered recovery does NOT reproduce the tampered shadows -> caught
    assert_ne!(ts.project(&tampered).shadow_a, sh.shadow_a);
}
