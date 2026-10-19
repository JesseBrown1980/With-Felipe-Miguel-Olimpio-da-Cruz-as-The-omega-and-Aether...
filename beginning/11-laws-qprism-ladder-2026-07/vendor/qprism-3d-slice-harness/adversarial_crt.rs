//! ADVERSARIAL attack tests on the N-cylinder CRT recovery (acer attack-verify).
//! DEFAULT TO REFUTE: each test either demonstrates a concrete breaking input or
//! pins the correctness claim to a measured run.
use path2_two_shadow_recovery::*;

// ---------- ATTACK (b): u128 overflow when many primes multiply ----------

#[test]
fn attack_b_all_seven_cylinders_false_hold() {
    // product of 7 primes ~2^25 each is ~2^175 -> overflows u128.
    // The capacity is OVER-sufficient for an 8-byte block (2^175 >= 2^64),
    // yet the code returns InsufficientJointCapacity -> FALSE HOLD, wrong error semantics.
    let codec = MultiCylinder::default_60d();
    let data = b"an 8-byte-block slice that seven cylinders should trivially recover";
    let shadows = codec.project(data);
    let all7: Vec<usize> = (0..7).collect();
    assert_eq!(
        codec.recover_from(&shadows, &all7),
        Err(Held::InsufficientJointCapacity),
        "EXPECTED-DEFECT: 7 jointly-sufficient cylinders are refused"
    );
    assert_eq!(
        codec.sufficient_subset(&all7),
        Err(Held::InsufficientJointCapacity),
        "EXPECTED-DEFECT: sufficiency query errors instead of Ok(true)"
    );
    // 6 cylinders (~2^150) same story
    let six: Vec<usize> = (0..6).collect();
    assert_eq!(
        codec.recover_from(&shadows, &six),
        Err(Held::InsufficientJointCapacity)
    );
    // 5 cylinders (~2^125, fits u128) still work
    let five: Vec<usize> = (0..5).collect();
    assert_eq!(codec.recover_from(&shadows, &five).unwrap(), data);
}

#[test]
fn attack_b_hbp_ledger_prints_zero_capacity_for_cyl_5_and_6() {
    // hbp_rows uses joint_capacity_bits_floor(..).unwrap_or(0): the overflow Err
    // becomes capacity_bits_floor=0 in the EMITTED ledger row -> the receipt lies.
    let codec = MultiCylinder::default_60d();
    let slice = QPrismSlice3d::project(b"ledger probe", &codec);
    let rows = slice.hbp_rows(&codec, "ATTACK-LEDGER");
    let cyl5 = rows
        .iter()
        .find(|r| r.contains("Q3DCYL|") && r.contains("|idx=5|"))
        .unwrap();
    let cyl6 = rows
        .iter()
        .find(|r| r.contains("Q3DCYL|") && r.contains("|idx=6|"))
        .unwrap();
    assert!(
        cyl5.contains("capacity_bits_floor=0"),
        "EXPECTED-DEFECT row: {cyl5}"
    );
    assert!(
        cyl6.contains("capacity_bits_floor=0"),
        "EXPECTED-DEFECT row: {cyl6}"
    );
    // while 5 cumulative primes report the true floor of 124 bits
    // (4 of the 5 primes are just BELOW 2^25, so the product is just under 2^125)
    let cyl4 = rows
        .iter()
        .find(|r| r.contains("Q3DCYL|") && r.contains("|idx=4|"))
        .unwrap();
    assert!(cyl4.contains("capacity_bits_floor=124"), "row: {cyl4}");
}

#[test]
#[should_panic] // debug build: attempt to multiply/add with overflow at `x += modulus * t`
fn attack_b_crt_many_six_primes_panics_before_checked_mul() {
    // residues p_i - 1 -> unique joint solution M-1 ~ 2^150 -> the unchecked
    // `x += modulus * t` overflows BEFORE the checked_mul can return Held.
    let basis: Vec<(u64, u64)> = DEFAULT_60D_CYLINDERS[..6]
        .iter()
        .map(|&p| (p - 1, p))
        .collect();
    let _ = crt_many(&basis);
}

// ---------- ATTACK (a): non-coprime moduli ----------

#[test]
fn attack_a_noncoprime_pairs_rejected_everywhere() {
    // shared factor 2: gcd(6,10)=2
    assert_eq!(joint_modulus(&[6, 10]), Err(Held::NonCoprimeModuli));
    assert_eq!(crt_many(&[(1, 6), (3, 10)]), Err(Held::NonCoprimeModuli));
    // duplicate prime at two indices
    let codec = MultiCylinder {
        primes: vec![101, 101, 103],
        block_bytes: 1,
    };
    let sh = codec.project(b"z");
    assert_eq!(codec.recover_from(&sh, &[0, 1]), Err(Held::NonCoprimeModuli));
    // duplicate INDEX
    assert_eq!(
        codec.recover_from(&sh, &[0, 0]),
        Err(Held::InvalidCylinderSelection)
    );
    // p < 2 rejected by joint_modulus
    assert_eq!(joint_modulus(&[1, 7]), Err(Held::NonCoprimeModuli));
    assert_eq!(joint_modulus(&[0]), Err(Held::NonCoprimeModuli));
}

#[test]
#[should_panic] // divide by zero: gcd(1,0)=1 lets prime=0 through to `x % prime`
fn attack_a_crt_many_prime_zero_divide_by_zero() {
    let _ = crt_many(&[(0, 0)]);
}

// ---------- ATTACK (c): final-chunk / padding ----------

#[test]
fn attack_c_padding_edges_roundtrip_bytewise() {
    let codec = MultiCylinder::default_60d();
    let idx = [0usize, 1, 2];
    // every length 0..=33 incl. non-multiples of 8, with trailing zeros and 0xFF
    for len in 0..=33usize {
        let mut data: Vec<u8> = (0..len).map(|i| (i * 37) as u8).collect();
        let sh = codec.project(&data);
        assert_eq!(codec.recover_from(&sh, &idx).unwrap(), data, "len={len}");
        // trailing zeros must survive the truncate
        if len >= 2 {
            data[len - 1] = 0;
            data[len - 2] = 0;
            let sh0 = codec.project(&data);
            assert_eq!(
                codec.recover_from(&sh0, &idx).unwrap(),
                data,
                "zeros len={len}"
            );
        }
    }
    // all-0xFF exact-multiple block (max block value 2^64-1)
    let ff = vec![0xFFu8; 24];
    let shf = codec.project(&ff);
    assert_eq!(codec.recover_from(&shf, &idx).unwrap(), ff);
}

// ---------- ATTACK (d): sufficient_subset true but wrong bytes ----------

#[test]
fn attack_d_every_accepted_subset_recovers_byte_identical() {
    // enumerate ALL subsets of the 7 cylinders; whenever sufficient_subset()==Ok(true),
    // recover_from MUST be byte-identical. Any counterexample refutes the PR.
    let codec = MultiCylinder::default_60d();
    let data: Vec<u8> = (0..123u32)
        .map(|i| (i.wrapping_mul(2654435761) >> 13) as u8)
        .collect();
    let sh = codec.project(&data);
    let mut accepted = 0;
    for mask in 1u32..(1 << 7) {
        let idx: Vec<usize> = (0..7).filter(|i| mask & (1 << i) != 0).collect();
        match codec.sufficient_subset(&idx) {
            Ok(true) => {
                accepted += 1;
                assert_eq!(
                    codec.recover_from(&sh, &idx).unwrap(),
                    data,
                    "WRONG BYTES from accepted subset {idx:?}"
                );
            }
            Ok(false) => {
                assert_eq!(
                    codec.recover_from(&sh, &idx),
                    Err(Held::InsufficientJointCapacity),
                    "undersized subset {idx:?} must HOLD"
                );
            }
            Err(e) => {
                // only the u128-overflow subsets (>=6 cylinders) may land here
                assert!(idx.len() >= 6, "unexpected Err({e:?}) for {idx:?}");
            }
        }
    }
    // all 3-,4-,5-cylinder subsets are accepted: C(7,3)+C(7,4)+C(7,5)=35+35+21=91
    assert_eq!(accepted, 91);
}

#[test]
fn attack_d_order_of_indices_does_not_matter() {
    let codec = MultiCylinder::default_60d();
    let data = b"order independence of the CRT join";
    let sh = codec.project(data);
    for idx in [[0usize, 1, 2], [2, 1, 0], [6, 2, 4], [4, 6, 2], [5, 0, 3]] {
        assert_eq!(codec.recover_from(&sh, &idx).unwrap(), data, "{idx:?}");
    }
}

// ---------- ATTACK (e)+(f): off-by-one at the roof / product < range ----------

#[test]
fn attack_ef_exact_boundary_m_equals_range_recovers() {
    // M == R exactly: modulus 65536, block 2 bytes (range 2^16). >= must accept and be exact.
    let codec = MultiCylinder {
        primes: vec![65536],
        block_bytes: 2,
    };
    assert_eq!(codec.sufficient_subset(&[0]), Ok(true));
    let data = [0xFFu8, 0xFF, 0x00, 0x01, 0xAB]; // includes max block + padded tail
    let sh = codec.project(&data);
    assert_eq!(codec.recover_from(&sh, &[0]).unwrap(), data);
}

#[test]
fn attack_ef_one_below_range_holds() {
    // M == R-1: x = 65535 would collide with 0 -> must HOLD, never wrong bytes.
    let codec = MultiCylinder {
        primes: vec![65535],
        block_bytes: 2,
    };
    assert_eq!(codec.sufficient_subset(&[0]), Ok(false));
    let sh = codec.project(&[0xFF, 0xFF]);
    assert_eq!(
        codec.recover_from(&sh, &[0]),
        Err(Held::InsufficientJointCapacity)
    );
}

#[test]
fn attack_ef_capacity_floor_is_true_floor() {
    // floor(log2) exactness at powers of two
    assert_eq!(joint_capacity_bits_floor(&[2]), Ok(1));
    assert_eq!(joint_capacity_bits_floor(&[3]), Ok(1));
    assert_eq!(joint_capacity_bits_floor(&[4]), Ok(2));
    assert_eq!(joint_capacity_bits_floor(&[65536]), Ok(16));
    // 5 default cylinders: floor = 124 (4 of the 5 primes are just below 2^25,
    // so the product is just under 2^125 — the code computes the floor honestly)
    assert_eq!(
        joint_capacity_bits_floor(&DEFAULT_60D_CYLINDERS[..5]),
        Ok(124)
    );
    // 6 default cylinders: TRUE floor is ~150, but the code errors (overflow) -> defect pinned
    assert_eq!(
        joint_capacity_bits_floor(&DEFAULT_60D_CYLINDERS[..6]),
        Err(Held::InsufficientJointCapacity)
    );
}

// ---------- corrupt-metadata edges ----------

#[test]
fn corrupt_shadows_are_rejected_or_bounded() {
    let codec = MultiCylinder::default_60d();
    let sh = codec.project(b"honest");
    // wrong lane count
    let mut bad = sh.clone();
    bad.residues.pop();
    assert_eq!(
        codec.recover_from(&bad, &[0, 1, 2]),
        Err(Held::MismatchedShadowCount)
    );
    // wrong block_bytes tag
    let mut bad2 = sh.clone();
    bad2.block_bytes = 4;
    assert_eq!(
        codec.recover_from(&bad2, &[0, 1, 2]),
        Err(Held::MismatchedShadowCount)
    );
    // ragged lane lengths
    let mut bad3 = sh.clone();
    bad3.residues[3].push(1);
    assert_eq!(
        codec.recover_from(&bad3, &[0, 1, 2]),
        Err(Held::MismatchedShadowCount)
    );
}
