//! Layer-5 hookwall: a standalone extract of seven `kernel-core` modules from
//! asolaria-federation-1024 (see `PROVENANCE.md`). Deterministic policy checks plus a placeholder
//! (non-ed25519) tag scheme and an in-memory cosign counter; nothing persists.

#![no_std]
#![forbid(unsafe_code)]

extern crate alloc;
#[cfg(test)]
extern crate std;

pub mod cosign_chain;
pub mod crypto;
pub mod hookwall;
pub mod sign_gate;
pub mod spawn_gate;
// Only the first 75 upstream lines are kept, so its `use core::result::Result` has no user.
#[allow(unused_imports)]
pub mod syscall;
pub mod tier_gate;

/// Pins known upstream limitations (see `PROVENANCE.md`) so a behaviour change shows up in CI.
#[cfg(test)]
mod known_limitations {
    use crate::crypto::{PublicKey, Signature};
    use crate::sign_gate::gate_envelope;
    use sha2::{Digest, Sha256};

    fn forge(public: &PublicKey, msg: &[u8]) -> Signature {
        let half_a = Sha256::new()
            .chain_update(public.0)
            .chain_update(b":sign:")
            .chain_update(msg)
            .finalize();
        let half_b = Sha256::digest(half_a);
        let mut tag = [0u8; 64];
        tag[..32].copy_from_slice(&half_a);
        tag[32..].copy_from_slice(&half_b);
        Signature(tag)
    }

    #[test]
    fn gate_envelope_admits_a_tag_forged_from_the_public_key() {
        let public = PublicKey([0x5Au8; 32]);
        let msg = b"envelope";
        let v = gate_envelope(msg, &forge(&public, msg), &public, "ed25519", &["safe"], &[]);
        assert!(v.sig_valid && v.admitted, "{v:?}");
    }

    #[test]
    fn any_virus_envvar_rescues_every_deny_term() {
        let public = PublicKey([0x5Au8; 32]);
        let msg = b"envelope";
        let tag = forge(&public, msg);
        for deny in crate::sign_gate::DEFAULT_DENIES {
            let v = gate_envelope(msg, &tag, &public, "ed25519", &[deny], &["XVIRUS"]);
            assert!(v.admitted && v.allow_rescued, "{deny}: {v:?}");
            assert_eq!(v.reason, "deny-tag-matched-but-allow-rescued");
        }
    }
}
