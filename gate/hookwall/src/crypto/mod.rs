//! Crypto substrate · Phase-2 Step 28 · ed25519 envelope signing
//!
//! Wraps `ed25519-dalek` 2.1 no_std. Sign + verify on the BEHCS-1024 envelope wire format
//! (canonical bytes from `canonical_envelope_bytes`; the IX-700 CBOR form is not implemented).
//!
//! Key storage: none. No trust roots are embedded and no key is loaded from a TPM or disk;
//! callers pass key bytes directly.
//!
//! Phase-2: RFC 8032 Ed25519 replaces the Phase-1 sha256 tags. `verify` is strict: it also
//! rejects small-order public keys and non-canonical signatures. Like ed25519-dalek's strict mode,
//! it accepts mixed-order keys (a key plus a torsion component); only their holder can sign.

use alloc::vec::Vec;
use ed25519_dalek::{Signer, SigningKey, VerifyingKey};
use zeroize::{Zeroize, ZeroizeOnDrop};

/// ed25519 signature length in bytes.
pub const SIGNATURE_LEN: usize = 64;

/// ed25519 public key length in bytes.
pub const PUBLIC_KEY_LEN: usize = 32;

/// ed25519 private key length in bytes (32-byte seed; full keypair derived).
pub const PRIVATE_KEY_LEN: usize = 32;

/// Crypto operation errors.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum CryptoErr {
    /// Signature did not verify against the provided public key.
    SignatureInvalid,
    /// Phase-1 sha-derived mismatch. Phase-2 collapses verification failures into
    /// `SignatureInvalid`; nothing returns this any more.
    VerificationFailed,
    /// Provided key bytes do not parse as a valid ed25519 key.
    KeyMalformed,
    /// Canonical envelope bytes failed to produce — input not well-formed.
    CanonicalizationFailed,
    /// Unused since Phase-2; kept because the enum is `#[non_exhaustive]`.
    Unimplemented,
}

/// ed25519 signature wrapped for type safety.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Signature(pub [u8; SIGNATURE_LEN]);

/// ed25519 public key wrapped for type safety.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PublicKey(pub [u8; PUBLIC_KEY_LEN]);

/// ed25519 private key seed, zeroized on drop via the `zeroize` crate. `Debug` is redacted.
/// Copies a caller takes out of `.0` are not covered.
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct PrivateKey(pub [u8; PRIVATE_KEY_LEN]);

impl core::fmt::Debug for PrivateKey {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        f.write_str("PrivateKey(<redacted>)")
    }
}

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

/// Sign canonical envelope bytes with a private key (RFC 8032 Ed25519, deterministic).
pub fn sign(canonical_bytes: &[u8], priv_key: &PrivateKey) -> Result<Signature, CryptoErr> {
    let signing = SigningKey::from_bytes(&priv_key.0);
    Ok(Signature(signing.sign(canonical_bytes).to_bytes()))
}

/// Verify an ed25519 signature over `canonical_bytes` with `verify_strict`.
///
/// `Err(KeyMalformed)` if `pub_key` is not a curve-point encoding; `Err(SignatureInvalid)` if
/// the signature does not verify, the key has small order, or the signature is non-canonical.
pub fn verify(
    canonical_bytes: &[u8],
    sig: &Signature,
    pub_key: &PublicKey,
) -> Result<(), CryptoErr> {
    let key = VerifyingKey::from_bytes(&pub_key.0).map_err(|_| CryptoErr::KeyMalformed)?;
    let sig = ed25519_dalek::Signature::from_bytes(&sig.0);
    key.verify_strict(canonical_bytes, &sig)
        .map_err(|_| CryptoErr::SignatureInvalid)
}

/// Derives the ed25519 public key from a private-key seed.
pub fn derive_public(secret: &PrivateKey) -> Result<PublicKey, CryptoErr> {
    Ok(PublicKey(
        SigningKey::from_bytes(&secret.0).verifying_key().to_bytes(),
    ))
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

    fn hex<const N: usize>(s: &str) -> [u8; N] {
        let mut out = [0u8; N];
        for (i, byte) in out.iter_mut().enumerate() {
            *byte = u8::from_str_radix(&s[2 * i..2 * i + 2], 16).unwrap();
        }
        out
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
    fn rfc8032_test_1_vector() {
        // RFC 8032 §7.1 TEST 1: public test vector, empty message.
        let sk = PrivateKey(hex("9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60"));
        let pk = PublicKey(hex("d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a"));
        let sig = Signature(hex(
            "e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e065224901555fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b",
        ));
        assert_eq!(derive_public(&sk), Ok(pk));
        assert_eq!(sign(b"", &sk), Ok(sig));
        assert_eq!(verify(b"", &sig, &pk), Ok(()));
    }

    #[test]
    fn sign_deterministic_same_inputs() {
        let priv_key = test_only_key(7);
        let msg = b"hello-canonical";
        let a = sign(msg, &priv_key).unwrap();
        let b = sign(msg, &priv_key).unwrap();
        assert_eq!(a, b);
        // R (nonce point) and S (scalar) halves differ.
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
    }

    #[test]
    fn derive_sign_verify_loop_structural() {
        // End-to-end loop: secret → derive_public → sign → verify.
        let sk = test_only_key(0x42);
        let msg = b"loop-closure-msg";
        let pk = derive_public(&sk).expect("derive_public");
        let sig = sign(msg, &sk).expect("sign");
        verify(msg, &sig, &pk).expect("verify must accept genuine sign output");
        assert_eq!(derive_public(&sk).unwrap(), pk);
    }

    #[test]
    fn verify_roundtrip_succeeds() {
        let sk = test_only_key(0xA7);
        let msg = b"sign-verify-roundtrip-canonical-bytes";
        let pk = derive_public(&sk).unwrap();
        let sig = sign(msg, &sk).unwrap();
        assert_eq!(verify(msg, &sig, &pk), Ok(()));
    }

    #[test]
    fn verify_tampered_signature_fails() {
        // Flip bits in R, in S, and in the last byte of S: SignatureInvalid.
        let sk = test_only_key(0x5C);
        let msg = b"tamper-detection-msg";
        let pk = derive_public(&sk).unwrap();
        let good = sign(msg, &sk).unwrap();
        for (index, mask) in [(0, 0x01), (33, 0x80), (SIGNATURE_LEN - 1, 0xFF)] {
            let mut bad = good.0;
            bad[index] ^= mask;
            assert_eq!(
                verify(msg, &Signature(bad), &pk),
                Err(CryptoErr::SignatureInvalid),
                "byte {index}"
            );
        }
    }

    #[test]
    fn verify_tampered_message_fails() {
        let sk = test_only_key(0x5D);
        let pk = derive_public(&sk).unwrap();
        let sig = sign(b"pay 10", &sk).unwrap();
        assert_eq!(verify(b"pay 99", &sig, &pk), Err(CryptoErr::SignatureInvalid));
    }

    #[test]
    fn verify_wrong_public_key_fails() {
        let sk_a = test_only_key(0x11);
        let sk_b = test_only_key(0x22);
        let pk_a = derive_public(&sk_a).unwrap();
        let pk_b = derive_public(&sk_b).unwrap();
        let msg = b"wrong-public-key-msg";
        assert_eq!(
            verify(msg, &sign(msg, &sk_a).unwrap(), &pk_b),
            Err(CryptoErr::SignatureInvalid)
        );
        assert_eq!(
            verify(msg, &sign(msg, &sk_b).unwrap(), &pk_a),
            Err(CryptoErr::SignatureInvalid)
        );
    }

    #[test]
    fn phase1_tag_forged_from_the_public_key_is_rejected() {
        // The Phase-1 tag was sha256(public || ":sign:" || msg) || sha256(that): computable by
        // anyone holding the public key. Under ed25519 it must not verify.
        use sha2::{Digest, Sha256};
        let pk = derive_public(&test_only_key(0x5A)).unwrap();
        let msg = b"envelope";
        let half_a = Sha256::new()
            .chain_update(pk.0)
            .chain_update(b":sign:")
            .chain_update(msg)
            .finalize();
        let half_b = Sha256::digest(half_a);
        let mut tag = [0u8; SIGNATURE_LEN];
        tag[..32].copy_from_slice(&half_a);
        tag[32..].copy_from_slice(&half_b);
        assert_eq!(verify(msg, &Signature(tag), &pk), Err(CryptoErr::SignatureInvalid));
    }

    #[test]
    fn small_order_key_forgery_rejected_by_strict_verify() {
        // With the identity point as public key, R = [S]B satisfies the plain equation for any
        // message: S = 1, R = B. Lenient verification accepts it; verify_strict must not.
        use ed25519_dalek::Verifier;
        let mut identity = [0u8; PUBLIC_KEY_LEN];
        identity[0] = 1;
        let mut forged = [0u8; SIGNATURE_LEN];
        forged[..32].copy_from_slice(&hex::<32>(
            "5866666666666666666666666666666666666666666666666666666666666666",
        ));
        forged[32] = 1;
        let msg = b"any message at all";
        let lenient = VerifyingKey::from_bytes(&identity)
            .unwrap()
            .verify(msg, &ed25519_dalek::Signature::from_bytes(&forged));
        assert!(lenient.is_ok(), "forgery premise: lenient verify accepts");
        assert_eq!(
            verify(msg, &Signature(forged), &PublicKey(identity)),
            Err(CryptoErr::SignatureInvalid)
        );
    }

    #[test]
    fn non_point_public_key_is_malformed() {
        let not_a_point = (0u8..=255)
            .map(|b| {
                let mut k = [0u8; PUBLIC_KEY_LEN];
                k[0] = b;
                k
            })
            .find(|k| VerifyingKey::from_bytes(k).is_err())
            .expect("some y in 0..=255 has no curve point");
        let sig = sign(b"m", &test_only_key(3)).unwrap();
        assert_eq!(
            verify(b"m", &sig, &PublicKey(not_a_point)),
            Err(CryptoErr::KeyMalformed)
        );
    }

    #[test]
    fn private_key_debug_is_redacted_and_zeroize_clears() {
        let mut sk = test_only_key(0xAB);
        let shown = alloc::format!("{sk:?}");
        assert_eq!(shown, "PrivateKey(<redacted>)");
        assert!(!shown.to_ascii_lowercase().contains("ab"));
        sk.zeroize();
        assert_eq!(sk.0, [0u8; PRIVATE_KEY_LEN]);
    }
}
