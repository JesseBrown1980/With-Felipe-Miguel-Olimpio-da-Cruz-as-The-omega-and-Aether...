//! Universe simulator @3f9f42d `measurements/stars_shells.py`, run as the owner's recorded
//! command `stars_shells.py 8` (`MAXR = 8`, also its default at `:52`).
//!
//! The computation is the existing integer port `colour::stars` (every line of the script, cited
//! there by `file:line`, including the binary64 ring test of `:155-166`); this module writes its
//! outputs the way the script does (`:239-263`). The GGUF is 4,596,880 B for the owner's seed and
//! is held in memory once, as the script holds `blob` (`:238`).

use crate::write::{self, HashingWriter};
use colour::stars::Regenerated;
use std::io::{self, Write};

/// `MAXR` (`stars_shells.py:52`).
pub const MAXR: u32 = colour::stars::MAXR;
/// GGUF file name (`:202`).
pub const GGUF_NAME: &str = colour::stars::GGUF_NAME;
/// Receipt file name (`:244`).
pub const RECEIPT_NAME: &str = "FABLE5-STARS-SHELLS.hbp";

/// What `stars_shells.py` writes besides the GGUF bytes.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Written {
    /// `len(blob)`.
    pub gguf_bytes: u64,
    /// `hashlib.sha256(blob).hexdigest()` (`:240`).
    pub gguf_sha256: String,
    /// Receipt text (`:245-261`).
    pub receipt: String,
}

/// Runs `stars_shells.py` with `MAXR` rounds on `seed`: the GGUF and receipt bytes.
pub fn regenerate(seed: &[u8]) -> Regenerated {
    colour::stars::regenerate(seed, MAXR)
}

/// Writes the GGUF of `r` to `gguf_out`.
pub fn emit<W: Write>(r: &Regenerated, gguf_out: W) -> io::Result<(W, Written)> {
    let mut hw = HashingWriter::new(gguf_out);
    hw.write_all(&r.gguf)?;
    let (inner, gguf_bytes, gguf_sha256) = hw.finish()?;
    let receipt = String::from_utf8(r.receipt.clone()).map_err(|_| io::ErrorKind::InvalidData)?;
    Ok((
        inner,
        Written {
            gguf_bytes,
            gguf_sha256,
            receipt,
        },
    ))
}

/// The GGUF sidecar text (`stars_shells.py:241`).
pub fn gguf_sidecar(w: &Written) -> String {
    write::sidecar(&w.gguf_sha256, GGUF_NAME)
}
