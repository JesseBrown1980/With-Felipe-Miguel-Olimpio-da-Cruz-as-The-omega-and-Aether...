//! Text helpers that reproduce the owner's Python line and field semantics.
//!
//! The owner's verifier (`FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS/tests/verify_public_repo.py`)
//! counts rows with `str.splitlines()` (lines 388, 428) and reads `.sha256` sidecars with
//! `read_text(encoding="utf-8").strip().split()` (lines 3938, 3968). These functions reproduce
//! both.

/// The line boundaries of Python `str.splitlines()`; `\r\n` counts as one boundary.
fn is_line_boundary(c: char) -> bool {
    matches!(
        c,
        '\n' | '\r'
            | '\u{0b}'
            | '\u{0c}'
            | '\u{1c}'
            | '\u{1d}'
            | '\u{1e}'
            | '\u{85}'
            | '\u{2028}'
            | '\u{2029}'
    )
}

/// Python `str.splitlines()` (no `keepends`).
pub fn splitlines(text: &str) -> Vec<&str> {
    let mut out = Vec::new();
    let mut start = 0usize;
    let mut chars = text.char_indices().peekable();
    while let Some((i, c)) = chars.next() {
        if is_line_boundary(c) {
            out.push(&text[start..i]);
            let mut next = i + c.len_utf8();
            if c == '\r' {
                if let Some(&(j, '\n')) = chars.peek() {
                    chars.next();
                    next = j + 1;
                }
            }
            start = next;
        }
    }
    if start < text.len() {
        out.push(&text[start..]);
    }
    out
}

/// Streaming count of `len(bytes.decode("utf-8").splitlines())`; `None` when the bytes are
/// not valid UTF-8 (where Python's strict decode raises).
pub struct RowCounter {
    carry: Vec<u8>,
    rows: u64,
    in_line: bool,
    pending_cr: bool,
    utf8: bool,
}

impl Default for RowCounter {
    fn default() -> Self {
        Self::new()
    }
}

impl RowCounter {
    pub fn new() -> Self {
        Self {
            carry: Vec::new(),
            rows: 0,
            in_line: false,
            pending_cr: false,
            utf8: true,
        }
    }

    fn feed_str(&mut self, s: &str) {
        for c in s.chars() {
            if c == '\n' && self.pending_cr {
                self.pending_cr = false;
                continue;
            }
            self.pending_cr = c == '\r';
            if is_line_boundary(c) {
                self.rows += 1;
                self.in_line = false;
            } else {
                self.in_line = true;
            }
        }
    }

    pub fn update(&mut self, data: &[u8]) {
        if !self.utf8 {
            return;
        }
        let mut buf = std::mem::take(&mut self.carry);
        buf.extend_from_slice(data);
        match std::str::from_utf8(&buf) {
            Ok(s) => self.feed_str(s),
            Err(e) => {
                let good = e.valid_up_to();
                if e.error_len().is_some() {
                    self.utf8 = false;
                    return;
                }
                if let Ok(s) = std::str::from_utf8(&buf[..good]) {
                    self.feed_str(s);
                }
                self.carry = buf[good..].to_vec();
            }
        }
    }

    pub fn finish(self) -> Option<u64> {
        if !self.utf8 || !self.carry.is_empty() {
            return None;
        }
        Some(self.rows + u64::from(self.in_line))
    }
}

/// Python `str.isspace()`, the separator set of `str.split()` with no argument (29 code points
/// in Python 3.13: `\t`..`\r`, `\x1c`..`\x1f`, space, U+0085, U+00A0, U+1680, U+2000..U+200A,
/// U+2028, U+2029, U+202F, U+205F, U+3000).
fn py_is_space(c: char) -> bool {
    matches!(
        c,
        '\t'..='\r'
            | '\u{1c}'..='\u{1f}'
            | ' '
            | '\u{85}'
            | '\u{a0}'
            | '\u{1680}'
            | '\u{2000}'..='\u{200a}'
            | '\u{2028}'
            | '\u{2029}'
            | '\u{202f}'
            | '\u{205f}'
            | '\u{3000}'
    )
}

/// Python `text.strip().split()`, as the sidecar readers apply it (FOLLOW
/// `tests/verify_public_repo.py:3938, 3968`, omnibit `scripts/verify_receipt_privacy.py:35`).
pub fn py_fields(text: &str) -> Vec<&str> {
    text.split(py_is_space).filter(|s| !s.is_empty()).collect()
}

/// The owner's `strict_uint` pattern `0|[1-9][0-9]*` (`verify_public_repo.py:458-461`).
pub fn strict_uint(v: &str) -> Option<u64> {
    let b = v.as_bytes();
    if b.is_empty() || !b.iter().all(|c| c.is_ascii_digit()) || (b.len() > 1 && b[0] == b'0') {
        return None;
    }
    v.parse::<u64>().ok()
}

/// The owner's `require_sha256` pattern `[0-9a-f]{64}` (`verify_public_repo.py:464-466`).
pub fn is_sha256_hex(v: &str) -> bool {
    v.len() == 64
        && v.bytes()
            .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
}

/// `[0-9a-f]{16}`: the sha16 width of `asolaria-hbi-hbp` `agt` (`src/lib.rs:107-111`).
pub fn is_sha16_hex(v: &str) -> bool {
    v.len() == 16
        && v.bytes()
            .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
}
