//! Layer-5 hookwall: a standalone extract of seven `kernel-core` modules from
//! asolaria-federation-1024 (see `PROVENANCE.md`). Deterministic policy checks, RFC 8032 Ed25519
//! envelope signatures (Phase-2), and an in-memory cosign counter; nothing persists.

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

/// Phase-2: the sign gate runs real Ed25519, so a tag computed from the public key no longer passes.
#[cfg(test)]
mod phase2 {
    use crate::crypto::{derive_public, sign, PrivateKey, PublicKey, Signature};
    use crate::sign_gate::gate_envelope;
    use sha2::{Digest, Sha256};

    /// TEST-ONLY seed from a public fill byte. Never a real key.
    pub(crate) fn test_only_key() -> PrivateKey {
        PrivateKey([0x5Au8; 32])
    }

    /// The Phase-1 tag construction, which needed only the public key.
    fn phase1_forge(public: &PublicKey, msg: &[u8]) -> Signature {
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
    fn gate_envelope_rejects_a_tag_forged_from_the_public_key() {
        let public = derive_public(&test_only_key()).unwrap();
        let msg = b"envelope";
        let v = gate_envelope(msg, &phase1_forge(&public, msg), &public, "ed25519", &["safe"], &[]);
        assert!(!v.sig_valid && !v.admitted, "{v:?}");
        assert_eq!(v.reason, "signature-invalid");
    }

    #[test]
    fn gate_envelope_admits_a_genuine_signature() {
        let key = test_only_key();
        let public = derive_public(&key).unwrap();
        let msg = b"envelope";
        let v = gate_envelope(msg, &sign(msg, &key).unwrap(), &public, "ed25519", &["safe"], &[]);
        assert!(v.sig_valid && v.admitted, "{v:?}");
        assert_eq!(v.reason, "admitted-clean");
    }

    #[test]
    fn a_genuine_signature_for_another_envelope_is_rejected() {
        let key = test_only_key();
        let public = derive_public(&key).unwrap();
        let other = sign(b"envelope-A", &key).unwrap();
        let v = gate_envelope(b"envelope-B", &other, &public, "ed25519", &["safe"], &[]);
        assert!(!v.sig_valid && !v.admitted, "{v:?}");
    }
}

/// Pins known upstream limitations (see `PROVENANCE.md`) so a behaviour change shows up in CI.
#[cfg(test)]
mod known_limitations {
    use crate::crypto::{derive_public, sign};
    use crate::sign_gate::gate_envelope;

    #[test]
    fn any_virus_envvar_rescues_every_deny_term() {
        let key = super::phase2::test_only_key();
        let public = derive_public(&key).unwrap();
        let msg = b"envelope";
        let sig = sign(msg, &key).unwrap();
        for deny in crate::sign_gate::DEFAULT_DENIES {
            let v = gate_envelope(msg, &sig, &public, "ed25519", &[deny], &["XVIRUS"]);
            assert!(v.admitted && v.allow_rescued, "{deny}: {v:?}");
            assert_eq!(v.reason, "deny-tag-matched-but-allow-rescued");
        }
    }
}
