//! Probe: [FABRIC/action] CosignChain sig replaced / final row altered / module-level append,
//! through asolaria_hookwall's public API only (gate/hookwall/src/cosign_chain/mod.rs).

use asolaria_hookwall::cosign_chain::{append, CosignChain, CosignChainErr, CosignRow, GENESIS_PREV_SHA16};
use asolaria_hookwall::crypto::{derive_public, sign, verify, PrivateKey, Signature};
use sha2::{Digest, Sha256};

/// Re-implementation of the module's private canonical_bytes_of_row + sha16_of (mod.rs:29-49).
fn canon(r: &CosignRow) -> String {
    format!(
        "row={}|ts={}|prev={}|kind={}|payload={}",
        r.row, r.ts_ns, r.prev_sha16, r.kind, r.payload_sha16
    )
}
fn sha16(b: &[u8]) -> String {
    Sha256::digest(b).iter().take(8).map(|x| format!("{x:02x}")).collect()
}

fn row(n: u64, prev: &str, kind: &str, sig: Signature) -> CosignRow {
    CosignRow {
        row: n,
        ts_ns: 1_000 + n,
        prev_sha16: prev.to_string(),
        kind: kind.to_string(),
        payload_sha16: format!("{:016x}", n),
        sig,
    }
}

/// Build a 3-row chain through `append`, signing each row with `sig_for(row)`.
fn build(kinds: [&str; 3], sig_for: &dyn Fn(&CosignRow) -> Signature) -> (CosignChain, Vec<CosignRow>) {
    let mut c = CosignChain::new();
    let mut rows = Vec::new();
    for (i, k) in kinds.iter().enumerate() {
        let mut r = row(i as u64 + 1, c.head(), k, Signature([0u8; 64]));
        r.sig = sig_for(&r);
        let res = c.append(&r);
        assert_eq!(res, Ok(()), "append row {}", i + 1);
        rows.push(r);
    }
    (c, rows)
}

#[test]
fn cosign_chain_public_api_probe() {
    let key = PrivateKey([0x11u8; 32]); // probe-only seed, not a real key
    let public = derive_public(&key).unwrap();
    let kinds = ["HOOKWALL_VERDICT_HALT", "HOOKWALL_VERDICT_HALT", "HOOKWALL_VERDICT_HALT"];

    // Genuine: each row signed over its canonical bytes.
    let (g, grows) = build(kinds, &|r| sign(canon(r).as_bytes(), &key).unwrap());
    for r in &grows {
        println!(
            "[genuine] row{} canon={} sig_verifies={:?}",
            r.row,
            canon(r),
            verify(canon(r).as_bytes(), &r.sig, &public)
        );
    }
    println!("[genuine] head={} depth={} validate={:?}", g.head(), g.depth(), g.validate_end_to_end());

    // INJ sig replaced: zero sig, 0xAB garbage, and a genuine signature over other bytes.
    let (z, _) = build(kinds, &|_| Signature([0u8; 64]));
    let (a, _) = build(kinds, &|_| Signature([0xABu8; 64]));
    let (o, orows) = build(kinds, &|_| sign(b"some other message", &key).unwrap());
    println!(
        "[sig=zero]   head={} validate={:?} sig_verifies={:?}",
        z.head(),
        z.validate_end_to_end(),
        verify(canon(&grows[0]).as_bytes(), &Signature([0u8; 64]), &public)
    );
    println!(
        "[sig=0xAB]   head={} validate={:?} sig_verifies={:?}",
        a.head(),
        a.validate_end_to_end(),
        verify(canon(&grows[0]).as_bytes(), &Signature([0xABu8; 64]), &public)
    );
    println!(
        "[sig=other]  head={} validate={:?} sig_verifies={:?}",
        o.head(),
        o.validate_end_to_end(),
        verify(canon(&orows[0]).as_bytes(), &orows[0].sig, &public)
    );
    assert_eq!(z.head(), g.head());
    assert_eq!(a.head(), g.head());
    assert_eq!(o.head(), g.head());
    assert_eq!(z.validate_end_to_end(), Ok(()));
    assert_eq!(a.validate_end_to_end(), Ok(()));
    assert_eq!(o.validate_end_to_end(), Ok(()));
    assert!(verify(canon(&grows[0]).as_bytes(), &Signature([0xABu8; 64]), &public).is_err());

    // INJ final row altered (HALT -> PROCEED, other payload): chain still appends and validates;
    // only the head value differs, and nothing compares the head with anything external.
    let mut c = CosignChain::new();
    c.append(&grows[0]).unwrap();
    c.append(&grows[1]).unwrap();
    let mut forged3 = grows[2].clone();
    forged3.kind = "HOOKWALL_VERDICT_PROCEED".into();
    forged3.payload_sha16 = "ffffffffffffffff".into();
    forged3.ts_ns = 9_999;
    println!("[final-altered] append={:?}", c.append(&forged3));
    println!(
        "[final-altered] head={} (genuine head={}) depth={} validate={:?}",
        c.head(),
        g.head(),
        c.depth(),
        c.validate_end_to_end()
    );
    assert_eq!(c.validate_end_to_end(), Ok(()));
    assert_ne!(c.head(), g.head());
    assert_eq!(c.head(), sha16(canon(&forged3).as_bytes()));

    // Control: a middle-row alteration IS refused at append (ChainLinkBroken on the next row).
    let mut m = CosignChain::new();
    m.append(&grows[0]).unwrap();
    let mut forged2 = grows[1].clone();
    forged2.kind = "HOOKWALL_VERDICT_PROCEED".into();
    println!("[middle-altered] append(row2')={:?}", m.append(&forged2));
    let r3 = m.append(&grows[2]);
    println!("[middle-altered] append(row3 genuine)={:?}", r3);
    assert_eq!(r3, Err(CosignChainErr::ChainLinkBroken));

    // INJ module-level append: 1-byte row (below the 16-byte floor) accepted; return value is a
    // process-wide counter that depends only on call count, not on content.
    let s1 = append(b"x");
    let s2 = append(b"x");
    let s3 = append(b"COMPLETELY DIFFERENT ROW CONTENT 0123456789");
    let s4 = append(&[0u8; 13]);
    let s5 = append(b"");
    println!("[module-append] b\"x\"->{s1:?} b\"x\"->{s2:?} other->{s3:?} 13B->{s4:?} empty->{s5:?}");
    let (s1, s2, s3, s4) = (s1.unwrap(), s2.unwrap(), s3.unwrap(), s4.unwrap());
    assert_eq!((s2 - s1, s3 - s2, s4 - s3), (1, 1, 1));
    assert_eq!(s5, Err(CosignChainErr::KindMalformed));
    let _ = GENESIS_PREV_SHA16;
}
