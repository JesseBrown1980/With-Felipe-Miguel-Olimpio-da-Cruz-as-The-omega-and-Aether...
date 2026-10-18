//! The repository's rows: `.hbp` lines `KIND|key=value|...|json=0`, the `.hbi` rows beside them
//! (`HBI|row=N|sha256=H|hex=X|json=0`, one per `.hbp` line), and the seal each receipt ends with.

use crate::{sha256_hex, Error};

/// The lines of an LF text file: UTF-8, LF-terminated, no CR anywhere.
pub fn text_lines(bytes: &[u8]) -> Result<Vec<&str>, Error> {
    let text = core::str::from_utf8(bytes).map_err(|e| Error::Format(e.to_string()))?;
    if text.contains('\r') {
        return Err(Error::Format("CR in an LF file".into()));
    }
    let body = text
        .strip_suffix('\n')
        .ok_or_else(|| Error::Format("no final LF".into()))?;
    Ok(body.split('\n').collect())
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Row<'a> {
    pub kind: &'a str,
    pub fields: Vec<(&'a str, &'a str)>,
}

impl<'a> Row<'a> {
    /// The first value under `key` (a header can carry `json=0` twice).
    pub fn get(&self, key: &str) -> Option<&'a str> {
        self.fields.iter().find(|(k, _)| *k == key).map(|(_, v)| *v)
    }
}

/// Split a row at `|`, and each field after the kind at its first `=`.
pub fn row(line: &str) -> Result<Row<'_>, Error> {
    let mut parts = line.split('|');
    let kind = parts.next().unwrap_or_default();
    let fields = parts
        .map(|f| {
            f.split_once('=')
                .ok_or_else(|| Error::Format(format!("field without '=': {f}")))
        })
        .collect::<Result<_, _>>()?;
    Ok(Row { kind, fields })
}

/// sha256 of the lines joined by LF with no final LF. Measured on the vendored files, this is
/// every receipt's `frame_hash` (over its first three rows) and the `merkle` of CORRECTION.hbp
/// and HARNESS-VERDICT.hbp (over every row before the last); the program that wrote them is not
/// in the repository.
pub fn seal(lines: &[&str]) -> String {
    sha256_hex(lines.join("\n").as_bytes())
}

pub fn hex_decode(s: &str) -> Option<Vec<u8>> {
    fn nibble(c: u8) -> Option<u8> {
        match c {
            b'0'..=b'9' => Some(c - b'0'),
            b'a'..=b'f' => Some(c - b'a' + 10),
            _ => None,
        }
    }
    if s.len() % 2 != 0 {
        return None;
    }
    s.as_bytes()
        .chunks_exact(2)
        .map(|p| Some(nibble(p[0])? << 4 | nibble(p[1])?))
        .collect()
}

/// Every `.hbi` row N holds the N-th `.hbp` line as hex, and its `sha256` is that line's
/// sha256. Returns the number of rows; the two files must have the same count.
pub fn check_hbi(hbi: &[u8], hbp: &[u8]) -> Result<usize, Error> {
    let rows = text_lines(hbi)?;
    let lines = text_lines(hbp)?;
    if rows.len() != lines.len() {
        return Err(Error::Format(format!(
            "{} .hbi rows for {} .hbp lines",
            rows.len(),
            lines.len()
        )));
    }
    for (i, (r, line)) in rows.iter().zip(&lines).enumerate() {
        let r = row(r)?;
        let n = (i + 1).to_string();
        let ok = r.kind == "HBI"
            && r.get("row") == Some(n.as_str())
            && r.get("hex").and_then(hex_decode).as_deref() == Some(line.as_bytes())
            && r.get("sha256") == Some(sha256_hex(line.as_bytes()).as_str());
        if !ok {
            return Err(Error::Format(format!("HBI row {n} does not hold")));
        }
    }
    Ok(rows.len())
}

/// The bytes a `core.autocrlf=true` checkout writes for an LF text file that has no
/// `.gitattributes` rule: every LF becomes CRLF.
pub fn lf_to_crlf(bytes: &[u8]) -> Vec<u8> {
    let mut out = Vec::with_capacity(bytes.len() + bytes.len() / 32);
    for &b in bytes {
        if b == b'\n' {
            out.push(b'\r');
        }
        out.push(b);
    }
    out
}
