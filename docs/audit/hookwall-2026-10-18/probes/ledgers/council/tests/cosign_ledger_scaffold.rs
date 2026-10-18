//! Probe (extra, same area): ledger/cosign-council/cosign-ledger's own CosignChain + module append
//! (cosign-ledger/src/lib.rs:127-173).

use asolaria_server_cosign_ledger::{append, CosignChain, CosignChainErr, CosignRow, Signature, GENESIS_PREV_SHA16};

#[test]
fn cosign_ledger_scaffold() {
    let mut c = CosignChain::new();
    let r = CosignRow {
        row: 1,
        ts_ns: 1,
        prev_sha16: GENESIS_PREV_SHA16.into(),
        kind: "HOOKWALL_VERDICT_PROCEED".into(),
        payload_sha16: "0000000000000001".into(),
        sig: Signature([0u8; 64]),
    };
    let a = c.append(&r);
    let v = c.validate_end_to_end();
    println!("[cosign-ledger CosignChain] append={a:?} validate={v:?} depth={} head={}", c.depth(), c.head());
    assert_eq!(a, Err(CosignChainErr::Unimplemented));
    assert_eq!(v, Err(CosignChainErr::Unimplemented));
    let s1 = append(b"x");
    let s2 = append(b"x");
    let s3 = append(b"different");
    println!("[cosign-ledger module append] {s1:?} {s2:?} {s3:?} empty={:?}", append(b""));
    assert_eq!((s1, s2, s3), (Ok(1), Ok(2), Ok(3)));
}
