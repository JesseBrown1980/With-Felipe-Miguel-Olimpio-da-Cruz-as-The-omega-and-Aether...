//! SHA-256, test-only: the digest the stream rows carry for buffers too large to print, compared
//! with Python's `hashlib.sha256` in `tools/referee.py`. It is the owner's shadowcat `sha256.rs`
//! (owner decision 2026-10-18; parity in `shadowcat/parity/`); a dev-dependency only.

/// Incremental SHA-256.
pub struct Sha256(shadowcat::Sha256);

impl Sha256 {
    pub fn new() -> Sha256 {
        Sha256(shadowcat::Sha256::new())
    }

    pub fn update(&mut self, data: &[u8]) {
        self.0.update(data);
    }

    pub fn hex(self) -> String {
        shadowcat::hex(&self.0.finish())
    }
}
