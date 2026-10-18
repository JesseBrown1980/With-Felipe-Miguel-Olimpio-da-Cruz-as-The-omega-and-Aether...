//! Probe (white-box): the unmodified upstream file gate/hookwall/src/cosign_chain/mod.rs compiled
//! into this probe crate via #[path] (read only, not copied), so its cfg(test)
//! `push_unchecked_for_tests` hatch is available to place tampered rows IN the stored chain.
//! `crate::crypto::Signature` resolves to asolaria_hookwall's own Signature type.

extern crate alloc;

mod crypto {
    pub use asolaria_hookwall::crypto::Signature;
}

#[path = "../../../../../../../gate/hookwall/src/cosign_chain/mod.rs"]
#[allow(dead_code)]
mod cosign_chain;

use cosign_chain::{CosignChain, CosignChainErr, CosignRow, GENESIS_PREV_SHA16};
use crypto::Signature;

fn row(n: u64, prev: &str, kind: &str) -> CosignRow {
    CosignRow {
        row: n,
        ts_ns: 1_000 + n,
        prev_sha16: prev.to_string(),
        kind: kind.to_string(),
        payload_sha16: format!("{:016x}", n),
        sig: Signature([0x5Au8; 64]),
    }
}

#[test]
fn whitebox_stored_chain_tamper() {
    // Genuine chain through append.
    let mut g = CosignChain::new();
    let r1 = row(1, GENESIS_PREV_SHA16, "HOOKWALL_VERDICT_HALT");
    g.append(&r1).unwrap();
    let r2 = row(2, g.head(), "HOOKWALL_VERDICT_HALT");
    g.append(&r2).unwrap();
    let r3 = row(3, g.head(), "HOOKWALL_VERDICT_HALT");
    g.append(&r3).unwrap();
    println!("[genuine] head={} depth={} validate={:?}", g.head(), g.depth(), g.validate_end_to_end());

    // Stored chain with the FINAL row altered in place (kind, payload, ts, sig).
    let mut t = CosignChain::new();
    t.push_unchecked_for_tests(r1.clone());
    t.push_unchecked_for_tests(r2.clone());
    let mut r3x = r3.clone();
    r3x.kind = "HOOKWALL_VERDICT_PROCEED".into();
    r3x.payload_sha16 = "ffffffffffffffff".into();
    r3x.ts_ns = 0;
    r3x.sig = Signature([0u8; 64]);
    t.push_unchecked_for_tests(r3x);
    let v = t.validate_end_to_end();
    println!(
        "[final-row-altered] validate={:?} head()={} depth={} next_row={}",
        v,
        t.head(),
        t.depth(),
        t.next_row()
    );
    assert_eq!(v, Ok(()));
    // head() still says GENESIS with 3 stored rows: validate never reads head_sha16.
    assert_eq!(t.head(), GENESIS_PREV_SHA16);

    // Stored chain with a MIDDLE row's sig replaced only.
    let mut s = CosignChain::new();
    s.push_unchecked_for_tests(r1.clone());
    let mut r2s = r2.clone();
    r2s.sig = Signature([0xFFu8; 64]);
    s.push_unchecked_for_tests(r2s);
    s.push_unchecked_for_tests(r3.clone());
    let v = s.validate_end_to_end();
    println!("[middle-sig-replaced] validate={:?}", v);
    assert_eq!(v, Ok(()));

    // Control: middle row kind altered -> detected at row 3.
    let mut m = CosignChain::new();
    m.push_unchecked_for_tests(r1.clone());
    let mut r2k = r2.clone();
    r2k.kind = "HOOKWALL_VERDICT_PROCEED".into();
    m.push_unchecked_for_tests(r2k);
    m.push_unchecked_for_tests(r3.clone());
    let v = m.validate_end_to_end();
    println!("[middle-kind-altered] validate={:?}", v);
    assert_eq!(v, Err(CosignChainErr::ChainLinkBroken));

    // Final row deleted (truncation): 2 genuine rows validate.
    let mut d = CosignChain::new();
    d.push_unchecked_for_tests(r1);
    d.push_unchecked_for_tests(r2);
    let v = d.validate_end_to_end();
    println!("[final-row-deleted] validate={:?}", v);
    assert_eq!(v, Ok(()));
}
