//! SHA-256 hex helpers: `sha256hex` / `sha16` / `sha8` (bigpickle district-fabric.mjs:28-30).

use sha2::{Digest, Sha256};

const HEX: &[u8; 16] = b"0123456789abcdef";

/// Full 64-char lowercase SHA-256 hex of `input`.
pub fn sha256_hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    let digest = hasher.finalize();
    let mut out = String::with_capacity(64);
    for byte in digest {
        out.push(HEX[(byte >> 4) as usize] as char);
        out.push(HEX[(byte & 0x0f) as usize] as char);
    }
    out
}

/// First 16 hex chars of the SHA-256 of `input`.
pub fn sha16(input: &str) -> String {
    let mut s = sha256_hex(input);
    s.truncate(16);
    s
}

/// First 8 hex chars of the SHA-256 of `input`.
pub fn sha8(input: &str) -> String {
    let mut s = sha256_hex(input);
    s.truncate(8);
    s
}
