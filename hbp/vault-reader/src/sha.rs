//! Streaming SHA-256 over the owner's shadowcat `src/sha256.rs`, the one SHA-256 aether's own code
//! reuses (owner decision 2026-10-18; parity in `shadowcat/parity/`). Vault objects can be larger
//! than memory, so they are fed in parts. `tests/sha.rs` checks this module against the vendored
//! `asolaria-hbi-hbp` `sha256_hex` byte for byte.

/// Incremental SHA-256 over a byte stream.
pub struct Sha256(shadowcat::Sha256);

impl Default for Sha256 {
    fn default() -> Self {
        Self::new()
    }
}

impl Sha256 {
    pub fn new() -> Self {
        Self(shadowcat::Sha256::new())
    }

    pub fn update(&mut self, data: &[u8]) {
        self.0.update(data);
    }

    /// Lowercase hex digest (64 chars).
    pub fn finish_hex(self) -> String {
        shadowcat::hex(&self.0.finish())
    }
}
