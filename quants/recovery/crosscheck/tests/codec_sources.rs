//! codec/dbbh-dbwh (holographic-wormhole-codec@4901280) called side by side with dbbh-coms-quant-prism
//! (quant 22) and path2-two-shadow-recovery (quants 23-24) on the same inputs, for the lines that
//! scratchpad/codec/CODEC-AUDIT.md section 3 maps to these crates and for the codec's CRT core :104-179,
//! which the audit maps to deterministic-slice-time-harness src/lib.rs:23-116 (that span at be09be1;
//! added in 5f6f6d6 at :23-79); path2's MultiCylinder is its behavioural counterpart here. Line numbers: codec, dbbh and path2 src/lib.rs.
#![forbid(unsafe_code)]

use dbbh_coms_quant_prism as dbbh;
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

fn inputs() -> Vec<Vec<u8>> {
    vec![
        Vec::new(),
        b"a".to_vec(),
        b"abc".to_vec(),
        (0..=255u8).collect(),
        sha_ctr(1024),
        sha_ctr(4099),
    ]
}

fn path2_over_codec_cylinders() -> p2::MultiCylinder {
    p2::MultiCylinder {
        primes: hwc::CYLINDERS.to_vec(),
        block_bytes: 6,
    }
}

/// codec sha256 :31 / dbbh sha256 :33 / path2 sha256 :602.
#[test]
fn sha256_codec_dbbh_path2() {
    for x in inputs() {
        let a = hwc::sha256(&x);
        assert_eq!(a, dbbh::sha256(&x));
        assert_eq!(a, p2::sha256(&x).0);
    }
}

/// codec agt :99-101 / dbbh agt :112-116.
#[test]
fn agt_codec_dbbh() {
    for x in inputs() {
        assert_eq!(hwc::agt(&x), dbbh::agt(&x));
        assert_eq!(hwc::agt(&x).len(), 20);
    }
}

/// codec nexus_transcode :426 / dbbh to_level :207 / path2 BehcsFrame::encode :526.
#[test]
fn behcs_rungs_codec_dbbh_path2() {
    let rungs = [
        (
            hwc::BehcsRung::B64,
            dbbh::Level::Behcs64,
            p2::BehcsRung::Behcs64,
        ),
        (
            hwc::BehcsRung::B256,
            dbbh::Level::Behcs256,
            p2::BehcsRung::Behcs256,
        ),
        (
            hwc::BehcsRung::B1024,
            dbbh::Level::Behcs1024,
            p2::BehcsRung::Behcs1024,
        ),
    ];
    for x in inputs() {
        for (h, d, p) in rungs {
            let syms = hwc::nexus_transcode(&x, h);
            assert_eq!(syms, dbbh::to_level(&x, d));
            assert_eq!(syms, p2::BehcsFrame::encode(p, &x).symbols);
        }
    }
}

/// codec SessionCapsule::propose nonce :204-212 / dbbh SessionCapsule::propose :452-459.
#[test]
fn capsule_nonce_codec_dbbh() {
    let s8 = [1u8, 2, 3, 4, 5, 6, 7, 8];
    let r8 = [9u8, 10, 11, 12, 13, 14, 15, 16];
    for x in inputs() {
        let h = hwc::SessionCapsule::propose(&s8, &r8, &x);
        let d =
            dbbh::SessionCapsule::propose(dbbh::Pid(s8), dbbh::Pid(r8), dbbh::ComsMode::AiToAi, &x);
        assert_eq!(h.nonce, d.nonce);
    }
}

/// codec project_shadows :139-149 (via NQPrismNexus::absorb :492) and recover_or_hold :511, whose
/// literal source the audit gives as deterministic-slice-time-harness src/lib.rs:23-116 (at be09be1),
/// compared with path2 MultiCylinder::project :447 and recover_from :461 on cylinders [0,1].
#[test]
fn shadows_and_reconstruct_codec_path2() {
    let mc = path2_over_codec_cylinders();
    for x in inputs() {
        let nexus = hwc::NQPrismNexus::absorb(&x);
        let shadows = mc.project(&x);
        assert_eq!(nexus.shadows, shadows.residues);
        assert_eq!(
            nexus.recover_or_hold(&[0, 1]),
            hwc::Verdict::VerifiedClone(x.clone())
        );
        assert_eq!(mc.recover_from(&shadows, &[0, 1]), Ok(x.clone()));
    }
}

/// One cylinder selected, untampered. codec reconstruct (:150-179) checks `m < range` (:170) inside
/// the per-block loop (:157-176), so an object with no blocks gives Some(empty) and the AGT matches.
/// path2 recover_from returns from sufficient_prefix (:466, :404-413) before any block is read.
#[test]
fn single_cylinder_codec_path2() {
    let mc = path2_over_codec_cylinders();
    for x in inputs() {
        let mut pkt = hwc::black_hole_compress(&x, b"a", b"b", b"s");
        pkt.capsule.arm_receiver();
        let nexus = hwc::NQPrismNexus::absorb(&x);
        let shadows = mc.project(&x);
        for i in 0..4usize {
            let codec_verdict = if x.is_empty() {
                hwc::Verdict::VerifiedClone(Vec::new())
            } else {
                hwc::Verdict::Held(hwc::Held::InsufficientRoof)
            };
            assert_eq!(hwc::white_hole_emit(&pkt, &[i]), codec_verdict);
            assert_eq!(nexus.recover_or_hold(&[i]), codec_verdict);
            assert_eq!(
                mc.recover_from(&shadows, &[i]),
                Err(p2::Held::InsufficientJointCapacity)
            );
        }
    }
}

/// codec roof_bits :181-191, residual_selector_bits :518, capacity_margin_bits :521 /
/// path2 joint_capacity_bits_floor :267, residual_selector_bits_for :305,
/// signed_capacity_margin_bits_floor :315, over all 15 non-empty cylinder subsets.
#[test]
fn roof_residual_margin_codec_path2_all_15_subsets() {
    let nexus = hwc::NQPrismNexus::absorb(b"roof");
    let mut roofs = Vec::new();
    for mask in 1u32..16 {
        let subset: Vec<usize> = (0..4).filter(|i| mask & (1 << i) != 0).collect();
        let primes: Vec<u64> = subset.iter().map(|&i| hwc::CYLINDERS[i]).collect();
        let roof = hwc::roof_bits(&subset);
        assert_eq!(roof, p2::joint_capacity_bits_floor(&primes).unwrap());
        assert_eq!(
            u32::from(nexus.residual_selector_bits(&subset)),
            p2::residual_selector_bits_for(6, &primes).unwrap()
        );
        assert_eq!(
            nexus.capacity_margin_bits(&subset),
            p2::signed_capacity_margin_bits_floor(6, &primes).unwrap()
        );
        roofs.push((subset.len(), roof));
    }
    assert_eq!(roofs.len(), 15);
    // CODEC-AUDIT.md: 25 or 24 bits for one cylinder, 49 for any two, 74 for three, 99 for four.
    for (n, roof) in roofs {
        match n {
            1 => assert!(roof == 25 || roof == 24),
            2 => assert_eq!(roof, 49),
            3 => assert_eq!(roof, 74),
            _ => assert_eq!(roof, 99),
        }
    }
}
