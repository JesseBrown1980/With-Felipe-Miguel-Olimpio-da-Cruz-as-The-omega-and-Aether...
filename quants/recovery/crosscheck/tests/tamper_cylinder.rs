//! The same packet with cylinder 3's first residue changed, read by both owner implementations
//! (scratchpad/codec/runs/measure.hbp rows 58-60).
//!
//! What each call compares:
//! - codec white_hole_emit (codec src/lib.rs:282-297): reconstruct (:150-179) reads subset indices in
//!   order and stops once the product reaches 2^48 (:166); then the AGT of the reconstruction is
//!   compared with the packet's AGT (:293). No residue outside that prefix is read.
//! - path2 MultiCylinder::recover_from (path2 src/lib.rs:461-490): recovers from the sufficient
//!   prefix (:466), then compares every selected residue with the recovered block (:479-483), and
//!   writes the low block_bytes bytes of the CRT value (:484-486). It computes no digest.
//! - path2 WatcherGate::verify_projection (path2 src/lib.rs:1166-1215): recover_current (:1029-1036,
//!   recover_from then PiePixelSlice::from_bytes :845-857), re-projection, then sha256, every
//!   cylinder's shadows and the frequency shells are compared (:1174-1182).
#![forbid(unsafe_code)]

use holographic_wormhole_codec as hwc;
use path2_two_shadow_recovery as p2;

/// The audit harness's `gen_sha_ctr` (scratchpad/codec/measure/src/main.rs:24-35).
fn sha_ctr(n: usize) -> Vec<u8> {
    let mut out = Vec::with_capacity(n + 32);
    let mut i: u64 = 0;
    while out.len() < n {
        let mut seed = b"codec-audit|".to_vec();
        seed.extend_from_slice(&i.to_be_bytes());
        out.extend_from_slice(&hwc::sha256(&seed));
        i += 1;
    }
    out.truncate(n);
    out
}

fn armed_packet(object: &[u8]) -> hwc::WormholePacket {
    // As in the audit harness (measure/src/main.rs:227-229).
    let mut pkt = hwc::black_hole_compress(object, b"a", b"b", b"s");
    pkt.capsule.arm_receiver();
    pkt
}

fn path2_over_codec_cylinders() -> p2::MultiCylinder {
    p2::MultiCylinder {
        primes: hwc::CYLINDERS.to_vec(),
        block_bytes: 6,
    }
}

fn as_path2(pkt: &hwc::WormholePacket) -> p2::MultiShadows {
    p2::MultiShadows {
        residues: pkt.shadows.clone(),
        orig_len: pkt.orig_len,
        block_bytes: 6,
    }
}

#[test]
fn untampered_packet_both_return_the_object() {
    let object = sha_ctr(1024);
    let pkt = armed_packet(&object);
    let mc = path2_over_codec_cylinders();
    for subset in [&[0usize, 1, 2, 3][..], &[2, 3][..], &[0, 1][..]] {
        assert_eq!(
            hwc::white_hole_emit(&pkt, subset),
            hwc::Verdict::VerifiedClone(object.clone())
        );
        assert_eq!(mc.recover_from(&as_path2(&pkt), subset), Ok(object.clone()));
    }
}

#[test]
fn cylinder_3_changed_read_by_codec_and_path2() {
    let object = sha_ctr(1024);
    let pkt = armed_packet(&object);
    let mut tampered = pkt.clone();
    // As in the audit harness (measure/src/main.rs:238-239).
    tampered.shadows[3][0] = tampered.shadows[3][0].wrapping_add(1);
    assert!(tampered.shadows[3][0] < hwc::CYLINDERS[3]);
    assert_ne!(tampered.shadows, pkt.shadows);
    let mc = path2_over_codec_cylinders();

    // codec, subset [0,1,2,3]: cylinders 0 and 1 reach 2^48, cylinder 3 is not read, the AGT matches.
    assert_eq!(
        hwc::white_hole_emit(&tampered, &[0, 1, 2, 3]),
        hwc::Verdict::VerifiedClone(object.clone())
    );
    // path2, subset [0,1,2,3]: cylinder 3's residue is compared with the recovered block.
    assert_eq!(
        mc.recover_from(&as_path2(&tampered), &[0, 1, 2, 3]),
        Err(p2::Held::InconsistentResidue)
    );
    // Subset [2,3] and the five other two-cylinder subsets that include cylinder 3: cylinder 3 is in
    // the prefix of both. codec: the reconstruction does not re-address to the AGT. path2: the
    // selected residues are the CRT basis, so each one agrees with the recovered block, and the
    // returned bytes differ from the object in block 0 (bytes 0-5).
    for subset in [[2usize, 3], [0, 3], [1, 3], [3, 0], [3, 1], [3, 2]] {
        assert_eq!(
            hwc::white_hole_emit(&tampered, &subset),
            hwc::Verdict::Held(hwc::Held::AddressMismatch)
        );
        let bytes = mc
            .recover_from(&as_path2(&tampered), &subset)
            .expect("path2 returns Ok on a two-cylinder subset that includes cylinder 3");
        assert_eq!(bytes.len(), object.len());
        let differing: Vec<usize> = (0..object.len())
            .filter(|&i| bytes[i] != object[i])
            .collect();
        assert_eq!(differing, vec![0, 1, 2, 3, 4, 5]);
    }
    // Subset [0,1]: cylinder 3 is not selected, so neither reads it.
    assert_eq!(
        hwc::white_hole_emit(&tampered, &[0, 1]),
        hwc::Verdict::VerifiedClone(object.clone())
    );
    assert_eq!(mc.recover_from(&as_path2(&tampered), &[0, 1]), Ok(object));
}

/// path2's own watcher-gate sample slice (path2 tests/watcher_gate.rs:5-33), projected over the
/// codec's four cylinders, with cylinder 3's first residue changed the same way.
#[test]
fn cylinder_3_changed_path2_watcher_gate() {
    let particles = [
        p2::TaggedParticle {
            x: 1,
            y: 0,
            z: 2,
            tag: 0x1101,
            frequency: 233,
            intensity: 17,
        },
        p2::TaggedParticle {
            x: 4,
            y: 2,
            z: 5,
            tag: 0x2202,
            frequency: 377,
            intensity: 51,
        },
        p2::TaggedParticle {
            x: 6,
            y: 5,
            z: 8,
            tag: 0x3303,
            frequency: 610,
            intensity: 99,
        },
    ];
    let slice = p2::PiePixelSlice::from_particles(8, 8, 7, 233, &particles).unwrap();
    let mc = path2_over_codec_cylinders();
    let projection = p2::PieWorldProjection::project(&slice, &mc);
    let mut tampered = projection.clone();
    tampered.qprism.shadows.residues[3][0] = tampered.qprism.shadows.residues[3][0].wrapping_add(1);
    assert!(tampered.qprism.shadows.residues[3][0] < hwc::CYLINDERS[3]);

    let gate = |p: &p2::PieWorldProjection, subset: &[usize]| {
        p2::WatcherGate::verify_projection("CROSSCHECK", p, &mc, subset)
            .map(|receipt| receipt.verified_clone)
    };
    for subset in [&[0usize, 1, 2, 3][..], &[2, 3][..], &[0, 1][..]] {
        assert_eq!(gate(&projection, subset), Ok(slice.clone()));
    }
    // [0,1,2,3]: recover_from compares cylinder 3's residue (:479-483).
    assert_eq!(
        gate(&tampered, &[0, 1, 2, 3]),
        Err(p2::Held::InconsistentResidue)
    );
    // [2,3]: recover_from returns other bytes for block 0; they do not start with `PIE1`
    // (PiePixelSlice::from_bytes :846-847).
    assert_eq!(
        gate(&tampered, &[2, 3]),
        Err(p2::Held::InvalidSliceEncoding)
    );
    // [0,1]: the slice is recovered; its re-projected cylinder-3 shadows differ from the
    // projection's (:1177-1178).
    assert_eq!(gate(&tampered, &[0, 1]), Err(p2::Held::WatcherDisagreement));
}
