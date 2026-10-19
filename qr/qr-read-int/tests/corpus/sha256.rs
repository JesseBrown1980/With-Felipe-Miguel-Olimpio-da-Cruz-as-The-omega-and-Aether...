//! SHA-256 for naming corpus planes and results: the owner's shadowcat `src/sha256.rs` (owner
//! decision 2026-10-18; parity in `shadowcat/parity/`), a dev-dependency. The library itself has no
//! dependencies.

/// Lowercase hex sha256 of `data`.
pub fn hex(data: &[u8]) -> String {
    shadowcat::hex(&shadowcat::digest(data))
}

#[cfg(test)]
mod tests {
    #[test]
    fn known_digests() {
        assert_eq!(
            super::hex(b""),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        assert_eq!(
            super::hex(b"abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }
}
