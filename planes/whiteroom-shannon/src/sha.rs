//! `crypto.createHash('sha256')` as the upstream planes call it: string input is hashed as its
//! UTF-8 bytes, and `.digest('hex')` is lowercase hex.

use sha2::{Digest, Sha256};

/// SHA-256 of `data`.
pub fn sha256(data: &[u8]) -> [u8; 32] {
    Sha256::digest(data).into()
}

/// Lowercase hex of `bytes`.
pub fn hex(bytes: &[u8]) -> String {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(2 * bytes.len());
    for &b in bytes {
        out.push(char::from(DIGITS[usize::from(b >> 4)]));
        out.push(char::from(DIGITS[usize::from(b & 0xf)]));
    }
    out
}

/// `createHash('sha256').update(String(s)).digest('hex')`.
pub fn sha256hex(s: &str) -> String {
    hex(&sha256(s.as_bytes()))
}

/// An incremental SHA-256, for upstream code that calls `.update()` more than once.
#[derive(Clone, Default)]
pub struct Sha256Stream(Sha256);

impl Sha256Stream {
    /// A fresh hash.
    pub fn new() -> Self {
        Self(Sha256::new())
    }

    /// `.update(text)`: appends the UTF-8 bytes of `text`.
    pub fn update(&mut self, text: &str) {
        self.0.update(text.as_bytes());
    }

    /// `.digest('hex')`.
    pub fn hex_digest(self) -> String {
        hex(&self.0.finalize())
    }
}
