//! Output plumbing shared by both pumps: a writer that hashes what it writes, zero runs written
//! from a fixed buffer, and the `.sha256` sidecar lines upstream writes next to each output.

use sha2::{Digest, Sha256};
use std::io::{self, Write};

/// Writes through to `inner` while hashing (SHA-256) and counting every byte written, as
/// `divide_kimi_k3.py:197-211` hashes the GGUF while writing it.
pub struct HashingWriter<W> {
    inner: W,
    hasher: Sha256,
    written: u64,
}

impl<W: Write> HashingWriter<W> {
    /// Wraps `inner`.
    pub fn new(inner: W) -> HashingWriter<W> {
        HashingWriter {
            inner,
            hasher: Sha256::new(),
            written: 0,
        }
    }

    /// Flushes `inner` and returns it with the byte count and the lower-case hex SHA-256.
    pub fn finish(mut self) -> io::Result<(W, u64, String)> {
        self.inner.flush()?;
        let digest = colour::hex(&self.hasher.finalize());
        Ok((self.inner, self.written, digest))
    }
}

impl<W: Write> Write for HashingWriter<W> {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        let n = self.inner.write(buf)?;
        self.hasher.update(&buf[..n]);
        self.written += n as u64;
        Ok(n)
    }

    fn flush(&mut self) -> io::Result<()> {
        self.inner.flush()
    }
}

const ZEROS: [u8; 1 << 16] = [0; 1 << 16];

/// Writes `count` zero bytes.
pub fn zeros<W: Write>(out: &mut W, mut count: u64) -> io::Result<()> {
    while count > 0 {
        let take = count.min(ZEROS.len() as u64) as usize;
        out.write_all(&ZEROS[..take])?;
        count -= take as u64;
    }
    Ok(())
}

/// The sidecar line `f"{digest}  {name}\n"` (`divide_kimi_k3.py:214,242-243`,
/// `stars_shells.py:241,262-263`).
pub fn sidecar(digest: &str, name: &str) -> String {
    format!("{digest}  {name}\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hashes_what_it_writes() {
        let mut w = HashingWriter::new(Vec::new());
        w.write_all(b"abc").unwrap();
        zeros(&mut w, 70_000).unwrap();
        let (inner, n, digest) = w.finish().unwrap();
        assert_eq!(n, 70_003);
        assert_eq!(inner.len(), 70_003);
        assert_eq!(digest, colour::sha256_hex(&inner));
    }

    #[test]
    fn sidecar_line() {
        assert_eq!(sidecar("ab", "x.gguf"), "ab  x.gguf\n");
    }
}
