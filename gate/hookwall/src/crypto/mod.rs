//! Crypto substrate · Phase-2 Step 28 · placeholder envelope tags (NOT ed25519)
//!
//! Does NOT use `ed25519-dalek` (not a dependency). `sign`/`verify` are sha256 placeholders whose tag
//! is derived from the PUBLIC key, so anyone holding the public key can forge a passing tag.
//!
//! Key storage: none. No trust roots are embedded and no key is loaded from a TPM or disk;
//! callers pass key bytes directly.
//!
//! v0.1: API surface + canonical-bytes helper. Real `ed25519-dalek` binding lands in v0.2
//! once Cargo.toml workspace builds cleanly.

use alloc::vec::Vec;
use sha2::{Digest, Sha256};

/// Placeholder tag length in bytes (ed25519-sized; not an ed25519 signature).
pub const SIGNATURE_LEN: usize = 64;

/// Public key length in bytes (ed25519-sized; not parsed as an ed25519 key).
pub const PUBLIC_KEY_LEN: usize = 32;

/// Private key seed length in bytes (ed25519-sized; no ed25519 keypair is derived).
pub const PRIVATE_KEY_LEN: usize = 32;

/// Crypto operation errors.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum CryptoErr {
    /// Signature did not verify against the provided public key.
    SignatureInvalid,
    /// Phase-1 sha-derived verify: recomputed expected bytes did not
    /// constant-time-match the provided 64-byte signature.
    /// Phase-2 will collapse this into `SignatureInvalid` once ed25519-dalek lands.
    VerificationFailed,
    /// Reserved: no function in this extract returns it.
    KeyMalformed,
    /// Canonical envelope bytes failed to produce — input not well-formed.
    CanonicalizationFailed,
    /// Stub not yet implemented (v0.2).
    Unimplemented,
}

/// 64-byte placeholder tag wrapped for type safety (not an ed25519 signature).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Signature(pub [u8; SIGNATURE_LEN]);

/// 32-byte public key wrapped for type safety (not an ed25519 point).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PublicKey(pub [u8; PUBLIC_KEY_LEN]);

/// Private key seed bytes. Not zeroized on drop, and the derived `Debug` prints them.
#[derive(Debug, Clone)]
pub struct PrivateKey(pub [u8; PRIVATE_KEY_LEN]);

/// Produces the canonical signing bytes for an envelope.
/// v0.1: simple deterministic byte concatenation. v0.2 will use CBOR canonical form per IX-700.
pub fn canonical_envelope_bytes(
    from_pid: u64,
    to_pid: u64,
    type_tag: &[u8],
    verb: &[u8],
    id: &[u8],
    ts_ns: u64,
    payload: &[u8],
) -> Result<Vec<u8>, CryptoErr> {
    if type_tag.is_empty() || id.is_empty() {
        return Err(CryptoErr::CanonicalizationFailed);
    }
    let mut buf: Vec<u8> = Vec::with_capacity(
        8 + 8 + type_tag.len() + verb.len() + id.len() + 8 + payload.len() + 6 * 1,
    );
    buf.extend_from_slice(&from_pid.to_be_bytes());
    buf.push(b'|');
    buf.extend_from_slice(&to_pid.to_be_bytes());
    buf.push(b'|');
    buf.extend_from_slice(type_tag);
    buf.push(b'|');
    buf.extend_from_slice(verb);
    buf.push(b'|');
    buf.extend_from_slice(id);
    buf.push(b'|');
    buf.extend_from_slice(&ts_ns.to_be_bytes());
    buf.push(b'|');
    buf.extend_from_slice(payload);
    Ok(buf)
}

/// Phase-1 expected-signature recomputation from (public, msg).
///
/// Layout (64 bytes):
///   `expected[0..32]  = sha256(public || ":sign:" || msg)`
///   `expected[32..64] = sha256(expected[0..32])`
///
/// Used by both `sign` (after deriving public) and `verify` to ensure byte-parity.
/// Phase-2 replaces this with ed25519-dalek curve signatures.
fn expected_sig_bytes(public: &PublicKey, msg: &[u8]) -> [u8; SIGNATURE_LEN] {
    let mut h1 = Sha256::new();
    h1.update(public.0.as_slice());
    h1.update(b":sign:");
    h1.update(msg);
    let half_a = h1.finalize();

    let mut h2 = Sha256::new();
    h2.update(half_a.as_slice());
    let half_b = h2.finalize();

    let mut out = [0u8; SIGNATURE_LEN];
    out[..32].copy_from_slice(&half_a);
    out[32..].copy_from_slice(&half_b);
    out
}

/// Constant-time equality compare over two 64-byte signatures (XOR-fold).
///
/// Branches and indexing pattern are independent of byte values: every byte
/// position contributes to a single `acc` accumulator that is checked exactly
/// once at the end. No early-exit on mismatch.
#[inline]
fn ct_eq(a: &[u8; SIGNATURE_LEN], b: &[u8; SIGNATURE_LEN]) -> bool {
    let mut acc: u8 = 0;
    let mut i = 0;
    while i < SIGNATURE_LEN {
        acc |= a[i] ^ b[i];
        i += 1;
    }
    acc == 0
}

/// Sign canonical envelope bytes with a private key.
///
/// Phase-1 sha-derived placeholder. Phase-2 ed25519-dalek deferred.
/// Internally derives the public key, then emits the Phase-1 expected-sig layout
/// so `verify(public, msg, sig)` is byte-parity exact.
pub fn sign(canonical_bytes: &[u8], priv_key: &PrivateKey) -> Result<Signature, CryptoErr> {
    let public = derive_public(priv_key)?;
    Ok(Signature(expected_sig_bytes(&public, canonical_bytes)))
}

/// Verify a Phase-1 sha-derived signature against `(public, msg)`.
///
/// Recomputes the 64-byte expected signature from `(public, msg)` and
/// constant-time-compares against the provided `sig`.
/// Returns `Ok(())` on match, `Err(CryptoErr::VerificationFailed)` on mismatch.
pub fn verify(
    canonical_bytes: &[u8],
    sig: &Signature,
    pub_key: &PublicKey,
) -> Result<(), CryptoErr> {
    let expected = expected_sig_bytes(pub_key, canonical_bytes);
    if ct_eq(&expected, &sig.0) {
        Ok(())
    } else {
        Err(CryptoErr::VerificationFailed)
    }
}

/// Derives public key from a private-key seed.
///
/// Phase-1 sha-only placeholder: `PublicKey = sha256(secret || ":derive:")`.
/// Phase-2 will replace with ed25519-dalek curve-point derivation.
pub fn derive_public(secret: &PrivateKey) -> Result<PublicKey, CryptoErr> {
    let mut hasher = Sha256::new();
    hasher.update(secret.0.as_slice());
    hasher.update(b":derive:");
    let bytes = hasher.finalize();
    let mut pk = [0u8; PUBLIC_KEY_LEN];
    pk.copy_from_slice(&bytes);
    Ok(PublicKey(pk))
}

/// Compile-time enforcement on key lengths (catches future ed25519-curve substitutions).
const _: () = {
    assert!(SIGNATURE_LEN == 64);
    assert!(PUBLIC_KEY_LEN == 32);
    assert!(PRIVATE_KEY_LEN == 32);
};

#[cfg(test)]
mod tests {
    use super::*;

    /// TEST-ONLY: throwaway seed `[fill; 32]` from a public fill byte. Never a real key.
    fn test_only_key(fill: u8) -> PrivateKey {
        PrivateKey([fill; PRIVATE_KEY_LEN])
    }

    #[test]
    fn lengths_match_ed25519_canon() {
        assert_eq!(SIGNATURE_LEN, 64);
        assert_eq!(PUBLIC_KEY_LEN, 32);
        assert_eq!(PRIVATE_KEY_LEN, 32);
    }

    #[test]
    fn canonical_bytes_deterministic() {
        let a = canonical_envelope_bytes(1, 2, b"TEST_TYPE", b"EVT-TEST", b"id-0", 123, b"payload")
            .unwrap();
        let b = canonical_envelope_bytes(1, 2, b"TEST_TYPE", b"EVT-TEST", b"id-0", 123, b"payload")
            .unwrap();
        assert_eq!(a, b);
        assert!(a.len() > 10);
    }

    #[test]
    fn empty_type_rejected() {
        let r = canonical_envelope_bytes(1, 2, b"", b"EVT", b"id", 0, b"");
        assert_eq!(r, Err(CryptoErr::CanonicalizationFailed));
    }

    #[test]
    fn empty_id_rejected() {
        let r = canonical_envelope_bytes(1, 2, b"T", b"EVT", b"", 0, b"");
        assert_eq!(r, Err(CryptoErr::CanonicalizationFailed));
    }

    #[test]
    fn sign_deterministic_same_inputs() {
        let priv_key = test_only_key(7);
        let msg = b"hello-canonical";
        let a = sign(msg, &priv_key).unwrap();
        let b = sign(msg, &priv_key).unwrap();
        assert_eq!(a, b);
        // halves must differ (sha256 vs sha256(sha256))
        assert_ne!(&a.0[..32], &a.0[32..]);
    }

    #[test]
    fn sign_differs_across_secrets() {
        let k1 = test_only_key(1);
        let k2 = test_only_key(2);
        let msg = b"same-msg";
        let s1 = sign(msg, &k1).unwrap();
        let s2 = sign(msg, &k2).unwrap();
        assert_ne!(s1, s2);
    }

    #[test]
    fn derive_public_deterministic() {
        let sk = test_only_key(0x11);
        let p1 = derive_public(&sk).unwrap();
        let p2 = derive_public(&sk).unwrap();
        assert_eq!(p1, p2);
        assert_eq!(p1.0.len(), PUBLIC_KEY_LEN);
    }

    #[test]
    fn derive_public_distinct_across_secrets() {
        let p1 = derive_public(&test_only_key(0x01)).unwrap();
        let p2 = derive_public(&test_only_key(0x02)).unwrap();
        assert_ne!(p1, p2);
        // Distinct seed → distinct public (sha-collision-resistance proxy).
        assert_ne!(p1.0, p2.0);
    }

    #[test]
    fn derive_sign_verify_loop_structural() {
        // End-to-end loop: secret → derive_public → sign → verify pair.
        // Phase-1 verify now implemented (sha-recompute + ct_eq). Roundtrip MUST be Ok.
        let sk = test_only_key(0x42);
        let msg = b"loop-closure-msg";
        let pk = derive_public(&sk).expect("derive_public must succeed Phase-1");
        let sig = sign(msg, &sk).expect("sign must succeed Phase-1");
        assert_eq!(sig.0.len(), SIGNATURE_LEN);
        assert_eq!(pk.0.len(), PUBLIC_KEY_LEN);
        verify(msg, &sig, &pk).expect("Phase-1 verify must accept genuine sign output");
        // Re-derive must collide (loop stable across calls).
        let pk2 = derive_public(&sk).unwrap();
        assert_eq!(pk, pk2);
    }

    // ---- W5-A3 close-out: verify Phase-1 explicit tests ----

    #[test]
    fn verify_roundtrip_succeeds() {
        // sign+verify roundtrip on a single (secret, msg) pair: Ok(()).
        let sk = test_only_key(0xA7);
        let msg = b"sign-verify-roundtrip-canonical-bytes";
        let pk = derive_public(&sk).unwrap();
        let sig = sign(msg, &sk).unwrap();
        assert_eq!(verify(msg, &sig, &pk), Ok(()));
    }

    #[test]
    fn verify_tampered_signature_fails() {
        // Flip a single bit anywhere in the 64-byte sig: VerificationFailed.
        let sk = test_only_key(0x5C);
        let msg = b"tamper-detection-msg";
        let pk = derive_public(&sk).unwrap();
        let good = sign(msg, &sk).unwrap();

        // Tamper at byte 0 (first half — sha256 region).
        let mut bad_a = good.0;
        bad_a[0] ^= 0x01;
        assert_eq!(
            verify(msg, &Signature(bad_a), &pk),
            Err(CryptoErr::VerificationFailed)
        );

        // Tamper at byte 33 (second half — sha256(sha256) region).
        let mut bad_b = good.0;
        bad_b[33] ^= 0x80;
        assert_eq!(
            verify(msg, &Signature(bad_b), &pk),
            Err(CryptoErr::VerificationFailed)
        );

        // Tamper at last byte.
        let mut bad_c = good.0;
        bad_c[SIGNATURE_LEN - 1] ^= 0xFF;
        assert_eq!(
            verify(msg, &Signature(bad_c), &pk),
            Err(CryptoErr::VerificationFailed)
        );
    }

    #[test]
    fn verify_wrong_public_key_fails() {
        // Sign with sk_a, verify with public key from sk_b: VerificationFailed.
        let sk_a = test_only_key(0x11);
        let sk_b = test_only_key(0x22);
        let pk_b = derive_public(&sk_b).unwrap();
        let msg = b"wrong-public-key-msg";
        let sig_a = sign(msg, &sk_a).unwrap();
        assert_eq!(
            verify(msg, &sig_a, &pk_b),
            Err(CryptoErr::VerificationFailed)
        );

        // Symmetric: sign with sk_b, verify with pk_a → also VerificationFailed.
        let pk_a = derive_public(&sk_a).unwrap();
        let sig_b = sign(msg, &sk_b).unwrap();
        assert_eq!(
            verify(msg, &sig_b, &pk_a),
            Err(CryptoErr::VerificationFailed)
        );
    }

    #[test]
    fn ct_eq_xor_fold_basics() {
        // Sanity-check the constant-time helper directly.
        let a = [0u8; SIGNATURE_LEN];
        let b = [0u8; SIGNATURE_LEN];
        assert!(ct_eq(&a, &b));

        let mut c = [0u8; SIGNATURE_LEN];
        c[17] = 1;
        assert!(!ct_eq(&a, &c));

        let mut d = [0u8; SIGNATURE_LEN];
        d[SIGNATURE_LEN - 1] = 0xFF;
        assert!(!ct_eq(&a, &d));
    }
}
