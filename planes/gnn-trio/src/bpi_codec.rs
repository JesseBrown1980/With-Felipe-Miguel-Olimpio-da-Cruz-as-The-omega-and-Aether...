//! The engine- and alphabet-free part of `bpi-codec`: the pipe-delimited `encodeFrame`/`decodeFrame`
//! with an 8-hex SHA-256 integrity tail (bpi-codec.mjs:80-119).
//!
//! `hilbertAddress`, `encodeGlyph`, `decodeGlyph` and `pidChamber` need the BEHCS-1024 alphabet file
//! at runtime and are not reproduced (PROVENANCE.md). Numeric fields are passed as their decimal
//! string, matching the upstream `String(number)`; this port does not reimplement that coercion.

use crate::sha256;

/// A decoded frame (`decodeFrame`'s `{ tag, fields, sha }`).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Frame {
    pub tag: String,
    pub fields: Vec<String>,
    pub sha: String,
}

/// Why a frame could not be built or decoded.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum FrameError {
    /// Tag empty or longer than 8 characters (`encodeFrame` throws `'bad tag'`).
    BadTag,
    /// Fewer than two pipe-separated parts (`decodeFrame` throws `'frame too short'`).
    TooShort,
    /// The recomputed tail did not match (`decodeFrame` throws `'frame sha mismatch'`).
    ShaMismatch { got: String, want: String },
}

impl std::fmt::Display for FrameError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FrameError::BadTag => write!(f, "bad tag"),
            FrameError::TooShort => write!(f, "frame too short"),
            FrameError::ShaMismatch { got, want } => {
                write!(f, "frame sha mismatch: {got} vs {want}")
            }
        }
    }
}

impl std::error::Error for FrameError {}

/// `escape` (bpi-codec.mjs:89): `\` becomes `\\`, then `|` becomes `\|`.
fn escape(s: &str) -> String {
    s.replace('\\', "\\\\").replace('|', "\\|")
}

/// `encodeFrame(tag, fields)` (bpi-codec.mjs:92-98): `tag|esc(f1)|...|esc(fN)|sha8`, where `sha8` is
/// the first 8 hex characters of SHA-256 of the escaped body (tag plus escaped fields joined by `|`).
pub fn encode_frame(tag: &str, fields: &[&str]) -> Result<String, FrameError> {
    let tag_len = tag.chars().count();
    if tag_len == 0 || tag_len > 8 {
        return Err(FrameError::BadTag);
    }
    let mut parts = Vec::with_capacity(fields.len() + 1);
    parts.push(tag.to_string());
    for field in fields {
        parts.push(escape(field));
    }
    let body = parts.join("|");
    let sha = &sha256::hex(body.as_bytes())[..8];
    Ok(format!("{body}|{sha}"))
}

/// `decodeFrame(str)` (bpi-codec.mjs:100-119): split on unescaped `|`, decoding `\|` and `\\` as it
/// scans; the last part is the tail, recompute SHA-256 over the decoded body and compare. This
/// matches upstream exactly, including that a field carrying `|` or `\` changes the recomputed body
/// and so does not round-trip; the upstream `selfTest` round-trips only escape-free fields.
pub fn decode_frame(s: &str) -> Result<Frame, FrameError> {
    let chars: Vec<char> = s.chars().collect();
    let mut parts: Vec<String> = Vec::new();
    let mut cur = String::new();
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        let next = chars.get(i + 1).copied();
        if c == '\\' && next == Some('|') {
            cur.push('|');
            i += 2;
        } else if c == '\\' && next == Some('\\') {
            cur.push('\\');
            i += 2;
        } else if c == '|' {
            parts.push(std::mem::take(&mut cur));
            i += 1;
        } else {
            cur.push(c);
            i += 1;
        }
    }
    parts.push(cur);
    if parts.len() < 2 {
        return Err(FrameError::TooShort);
    }
    let sha = parts.pop().expect("len >= 2 guarantees a tail");
    let body = parts.join("|");
    let check = sha256::hex(body.as_bytes())[..8].to_string();
    if check != sha {
        return Err(FrameError::ShaMismatch {
            got: check,
            want: sha,
        });
    }
    let tag = parts[0].clone();
    let fields = parts[1..].to_vec();
    Ok(Frame { tag, fields, sha })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encode_matches_known_body_and_tail() {
        // Body "RVGN|g|+1|2.5" → first 8 hex of its SHA-256.
        let body = "RVGN|g|+1|2.5";
        let expected_tail = &sha256::hex(body.as_bytes())[..8];
        let frame = encode_frame("RVGN", &["g", "+1", "2.5"]).unwrap();
        assert_eq!(frame, format!("{body}|{expected_tail}"));
    }

    #[test]
    fn round_trips_escape_free_fields() {
        let frame = encode_frame("FAOR", &["opencode-bp", "42", "rev-abc"]).unwrap();
        let decoded = decode_frame(&frame).unwrap();
        assert_eq!(decoded.tag, "FAOR");
        assert_eq!(decoded.fields, vec!["opencode-bp", "42", "rev-abc"]);
    }

    #[test]
    fn bad_tag_rejected() {
        assert_eq!(encode_frame("", &["x"]), Err(FrameError::BadTag));
        assert_eq!(encode_frame("TOOLONGTAG", &["x"]), Err(FrameError::BadTag));
    }

    #[test]
    fn pipe_field_escapes_but_does_not_round_trip() {
        // Upstream behavior: encode escapes the pipe, but decode recomputes the tail over the decoded
        // body, so a field with a pipe fails the integrity check rather than round-tripping.
        let frame = encode_frame("T", &["a|b"]).unwrap();
        assert!(frame.contains("a\\|b"));
        assert!(matches!(
            decode_frame(&frame),
            Err(FrameError::ShaMismatch { .. })
        ));
    }
}
