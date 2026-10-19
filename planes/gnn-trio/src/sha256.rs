//! One-shot SHA-256 (FIPS 180-4), integer-only, for the `bpi-codec` frame integrity tail: the
//! owner's shadowcat `src/sha256.rs`, the one SHA-256 aether's own code reuses (owner decision
//! 2026-10-18; parity in `shadowcat/parity/`).

/// SHA-256 of `message`, as the 32 raw digest bytes.
pub fn digest(message: &[u8]) -> [u8; 32] {
    shadowcat::digest(message)
}

/// SHA-256 of `message` as a lowercase hex string.
pub fn hex(message: &[u8]) -> String {
    shadowcat::hex(&digest(message))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_answer_vectors() {
        assert_eq!(
            hex(b""),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        assert_eq!(
            hex(b"abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
        assert_eq!(
            hex(b"abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"),
            "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"
        );
    }
}
