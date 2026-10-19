//! HBP rows, HBI index rows, and `.sha256` sidecars.
//!
//! A row is one ASCII line `TAG|k=v|k=v|...|json=0`. The last field is always `json=0`.
//! The hot path of this game is rows, never JSON: nothing here reads or writes a brace.
//!
//! * HBP  — the rows themselves.
//! * HBI  — row-exact index: `HBI|row=i|sha256=<sha256 of row i>|hex=<row i as hex>|json=0`.
//! * SHA  — a `sha256sum -c` compatible sidecar (`<hex>  <name>`, two spaces).

use crate::sha256::{from_hex, sha256_hex, to_hex};
use std::fs;
use std::io;
use std::path::Path;

/// One HBP row. Values are stored raw; escaping happens only when the row is written.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Row {
    pub tag: String,
    pub kv: Vec<(String, String)>,
}

/// Escape a value: `|`, newline and carriage return become `%7C`, `%0A`, `%0D`. An `=` inside a
/// value is left alone: a field is split at its first `=`, so the rest may contain more.
/// A `%` is escaped (`%25`) only when it is followed by two hex digits, so a bare percent sign
/// in prose stays readable and the encoding stays unambiguous.
pub fn escape(v: &str) -> String {
    let bytes = v.as_bytes();
    let mut out = String::with_capacity(v.len());
    for (i, ch) in v.char_indices() {
        match ch {
            '|' => out.push_str("%7C"),
            '\n' => out.push_str("%0A"),
            '\r' => out.push_str("%0D"),
            '%' => {
                let h1 = bytes.get(i + 1).is_some_and(|c| c.is_ascii_hexdigit());
                let h2 = bytes.get(i + 2).is_some_and(|c| c.is_ascii_hexdigit());
                if h1 && h2 {
                    out.push_str("%25");
                } else {
                    out.push('%');
                }
            }
            c => out.push(c),
        }
    }
    out
}

/// Inverse of [`escape`].
pub fn unescape(v: &str) -> String {
    let b = v.as_bytes();
    let mut out = String::with_capacity(v.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' {
            let rep = match v.get(i + 1..i + 3) {
                Some("7C") => Some('|'),
                Some("3D") => Some('='),
                Some("0A") => Some('\n'),
                Some("0D") => Some('\r'),
                Some("25") => Some('%'),
                _ => None,
            };
            if let Some(c) = rep {
                out.push(c);
                i += 3;
                continue;
            }
        }
        // copy one UTF-8 scalar
        let ch_len = utf8_len(b[i]);
        out.push_str(&v[i..i + ch_len]);
        i += ch_len;
    }
    out
}

fn utf8_len(first: u8) -> usize {
    if first < 0x80 {
        1
    } else if first >= 0xF0 {
        4
    } else if first >= 0xE0 {
        3
    } else {
        2
    }
}

impl Row {
    pub fn new(tag: &str) -> Row {
        Row {
            tag: tag.to_string(),
            kv: Vec::new(),
        }
    }

    /// Append a field. The value is anything printable.
    pub fn kv(mut self, k: impl AsRef<str>, v: impl ToString) -> Row {
        self.kv.push((k.as_ref().to_string(), v.to_string()));
        self
    }

    /// First value for a key.
    pub fn get(&self, k: &str) -> Option<&str> {
        self.kv
            .iter()
            .find(|(key, _)| key == k)
            .map(|(_, v)| v.as_str())
    }

    /// First value for a key as `u64`.
    pub fn get_u64(&self, k: &str) -> Option<u64> {
        self.get(k).and_then(|v| v.parse().ok())
    }

    /// First value for a key as `i64`.
    pub fn get_i64(&self, k: &str) -> Option<i64> {
        self.get(k).and_then(|v| v.parse().ok())
    }

    /// The row as one line, no trailing newline, ending in `json=0`.
    pub fn line(&self) -> String {
        let mut s = String::with_capacity(64 + self.kv.len() * 16);
        s.push_str(&self.tag);
        for (k, v) in &self.kv {
            s.push('|');
            s.push_str(k);
            s.push('=');
            s.push_str(&escape(v));
        }
        s.push_str("|json=0");
        s
    }
}

/// Parse one HBP line back into a row. The line must end in `json=0` and every field must carry `=`.
pub fn parse_line(line: &str) -> Result<Row, String> {
    let line = line.trim_end_matches(['\n', '\r']);
    let mut parts = line.split('|');
    let tag = parts.next().unwrap_or("");
    if tag.is_empty()
        || !tag
            .bytes()
            .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit() || c == b'-')
    {
        return Err(format!("bad tag in row: {}", clip(line)));
    }
    let mut kv = Vec::new();
    let mut saw_json = false;
    for p in parts {
        if saw_json {
            return Err(format!("field after json=0: {}", clip(line)));
        }
        let (k, v) = p
            .split_once('=')
            .ok_or_else(|| format!("field without '=': {}", clip(line)))?;
        if k == "json" {
            if v != "0" {
                return Err(format!("json field is not 0: {}", clip(line)));
            }
            saw_json = true;
            continue;
        }
        kv.push((k.to_string(), unescape(v)));
    }
    if !saw_json {
        return Err(format!("row does not end in json=0: {}", clip(line)));
    }
    Ok(Row {
        tag: tag.to_string(),
        kv,
    })
}

fn clip(s: &str) -> String {
    let mut t: String = s.chars().take(80).collect();
    if s.chars().count() > 80 {
        t.push_str("...");
    }
    t
}

/// The bytes of a row set: each row line followed by `\n`.
pub fn file_bytes(rows: &[Row]) -> Vec<u8> {
    let mut out = Vec::with_capacity(rows.len() * 96);
    for r in rows {
        out.extend_from_slice(r.line().as_bytes());
        out.push(b'\n');
    }
    out
}

/// Parse a whole `.hbp` byte buffer into rows (every non-empty line must be a valid row).
pub fn parse_bytes(bytes: &[u8]) -> Result<Vec<Row>, String> {
    let text = std::str::from_utf8(bytes).map_err(|_| "not utf-8".to_string())?;
    let mut rows = Vec::new();
    for line in text.split('\n') {
        if line.is_empty() {
            continue;
        }
        rows.push(parse_line(line)?);
    }
    Ok(rows)
}

/// The `.hbi` for a set of rows: one `HBI` row per row, numbered from 1.
pub fn hbi_bytes(rows: &[Row]) -> Vec<u8> {
    let mut out = Vec::new();
    for (i, r) in rows.iter().enumerate() {
        let line = r.line();
        let h = Row::new("HBI")
            .kv("row", i + 1)
            .kv("sha256", sha256_hex(line.as_bytes()))
            .kv("hex", to_hex(line.as_bytes()));
        out.extend_from_slice(h.line().as_bytes());
        out.push(b'\n');
    }
    out
}

/// Check an `.hbi` against the `.hbp` bytes it indexes: same row count, and for every row the
/// stored hash and hex both equal the recomputed ones. A one-byte change in either file fails.
pub fn hbi_verify(hbp: &[u8], hbi: &[u8]) -> Result<usize, String> {
    let hbp_text = std::str::from_utf8(hbp).map_err(|_| "hbp is not utf-8".to_string())?;
    let hbi_text = std::str::from_utf8(hbi).map_err(|_| "hbi is not utf-8".to_string())?;
    let hbp_lines: Vec<&str> = hbp_text.split('\n').filter(|l| !l.is_empty()).collect();
    let hbi_lines: Vec<&str> = hbi_text.split('\n').filter(|l| !l.is_empty()).collect();
    if hbp_lines.len() != hbi_lines.len() {
        return Err(format!(
            "row count differs: hbp={} hbi={}",
            hbp_lines.len(),
            hbi_lines.len()
        ));
    }
    for (i, (p, x)) in hbp_lines.iter().zip(hbi_lines.iter()).enumerate() {
        let row = parse_line(x)?;
        if row.tag != "HBI" {
            return Err(format!("row {}: not an HBI row", i + 1));
        }
        if row.get_u64("row") != Some(i as u64 + 1) {
            return Err(format!("row {}: wrong row number", i + 1));
        }
        if row.get("sha256") != Some(sha256_hex(p.as_bytes()).as_str()) {
            return Err(format!("row {}: sha256 does not match the hbp row", i + 1));
        }
        match row.get("hex").and_then(from_hex) {
            Some(bytes) if bytes == p.as_bytes() => {}
            _ => return Err(format!("row {}: hex does not match the hbp row", i + 1)),
        }
    }
    Ok(hbp_lines.len())
}

/// A `sha256sum -c` sidecar line: `<64 hex>  <name>\n`.
pub fn sidecar_line(bytes: &[u8], name: &str) -> String {
    format!("{}  {}\n", sha256_hex(bytes), name)
}

/// Check a sidecar against the bytes it certifies. Returns the hash on success.
pub fn sidecar_verify(bytes: &[u8], sidecar: &str) -> Result<String, String> {
    let want = sidecar
        .split_whitespace()
        .next()
        .ok_or_else(|| "empty sidecar".to_string())?;
    if want.len() != 64 || from_hex(want).is_none() {
        return Err("sidecar does not start with 64 hex characters".to_string());
    }
    let got = sha256_hex(bytes);
    if got == want.to_ascii_lowercase() {
        Ok(got)
    } else {
        Err(format!("sidecar says {want} but the bytes hash to {got}"))
    }
}

/// Why a file set failed to verify. `Missing` means a file could not be read (a missing file is
/// not a clean zero); the other two mean the bytes disagree with their witness.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SetError {
    Missing(String),
    Sidecar(String),
    Hbi(String),
    Parse(String),
}

impl std::fmt::Display for SetError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SetError::Missing(m) => write!(f, "MISSING {m}"),
            SetError::Sidecar(m) => write!(f, "SIDECAR_MISMATCH {m}"),
            SetError::Hbi(m) => write!(f, "HBI_MISMATCH {m}"),
            SetError::Parse(m) => write!(f, "PARSE {m}"),
        }
    }
}

/// Write `<stem>.hbp`, `<stem>.hbi`, `<stem>.hbp.sha256` and `<stem>.hbi.sha256`.
pub fn write_set(dir: &Path, stem: &str, rows: &[Row]) -> io::Result<()> {
    fs::create_dir_all(dir)?;
    let hbp = file_bytes(rows);
    let hbi = hbi_bytes(rows);
    let hbp_name = format!("{stem}.hbp");
    let hbi_name = format!("{stem}.hbi");
    fs::write(dir.join(&hbp_name), &hbp)?;
    fs::write(dir.join(&hbi_name), &hbi)?;
    fs::write(
        dir.join(format!("{hbp_name}.sha256")),
        sidecar_line(&hbp, &hbp_name),
    )?;
    fs::write(
        dir.join(format!("{hbi_name}.sha256")),
        sidecar_line(&hbi, &hbi_name),
    )?;
    Ok(())
}

/// Read and verify a file set: both sidecars, the HBI against the HBP, and the rows parse.
pub fn read_set(dir: &Path, stem: &str) -> Result<Vec<Row>, SetError> {
    let hbp_name = format!("{stem}.hbp");
    let hbi_name = format!("{stem}.hbi");
    let read = |name: &str| -> Result<Vec<u8>, SetError> {
        fs::read(dir.join(name)).map_err(|e| SetError::Missing(format!("{name}: {e}")))
    };
    let hbp = read(&hbp_name)?;
    let hbi = read(&hbi_name)?;
    let side_hbp = read(&format!("{hbp_name}.sha256"))?;
    let side_hbi = read(&format!("{hbi_name}.sha256"))?;
    let side_hbp = String::from_utf8_lossy(&side_hbp).to_string();
    let side_hbi = String::from_utf8_lossy(&side_hbi).to_string();
    sidecar_verify(&hbp, &side_hbp).map_err(|m| SetError::Sidecar(format!("{hbp_name}: {m}")))?;
    sidecar_verify(&hbi, &side_hbi).map_err(|m| SetError::Sidecar(format!("{hbi_name}: {m}")))?;
    hbi_verify(&hbp, &hbi).map_err(|m| SetError::Hbi(format!("{stem}: {m}")))?;
    parse_bytes(&hbp).map_err(|m| SetError::Parse(format!("{stem}: {m}")))
}

/// Three-valued verdict (discipline section 12): a check that obtained no measurement is neither a
/// pass nor a fail.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Verdict {
    Pass,
    Fail(String),
    NotMeasured(&'static str),
}

impl Verdict {
    pub fn word(&self) -> &'static str {
        match self {
            Verdict::Pass => "MEASURED_PASS",
            Verdict::Fail(_) => "MEASURED_FAIL",
            Verdict::NotMeasured(_) => "NOT_MEASURED",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> Vec<Row> {
        vec![
            Row::new("AETHER-UNIVERSE").kv("kind", "test").kv("v", 1),
            Row::new("NOTE")
                .kv("text", "a|b=c\nd 100% sure %7C")
                .kv("n", -5),
        ]
    }

    #[test]
    fn rows_end_in_json_zero_and_round_trip() {
        for r in sample() {
            let line = r.line();
            assert!(line.ends_with("|json=0"));
            assert!(!line.contains('\n'));
            assert_eq!(parse_line(&line).unwrap(), r);
        }
    }

    #[test]
    fn escape_is_unambiguous_for_awkward_values() {
        for v in ["", "%", "%7", "%7C", "100%", "a%25b", "|=\n\r", "é%41"] {
            assert_eq!(unescape(&escape(v)), v, "value {v:?}");
        }
    }

    #[test]
    fn parser_rejects_rows_that_do_not_end_in_json_zero() {
        assert!(parse_line("TAG|a=1").is_err());
        assert!(parse_line("TAG|a=1|json=1").is_err());
        assert!(parse_line("TAG|a=1|json=0|b=2").is_err());
        assert!(parse_line("tag|a=1|json=0").is_err());
        assert!(parse_line("TAG|novalue|json=0").is_err());
        assert!(parse_line("TAG|json=0").is_ok());
    }

    #[test]
    fn hbi_recomputes_and_detects_one_changed_byte() {
        let rows = sample();
        let hbp = file_bytes(&rows);
        let hbi = hbi_bytes(&rows);
        assert_eq!(hbi_verify(&hbp, &hbi), Ok(2));
        let mut bad = hbp.clone();
        let at = bad.iter().position(|&b| b == b'k').unwrap();
        bad[at] = b'K';
        assert!(hbi_verify(&bad, &hbi).is_err());
        let mut bad_hbi = hbi.clone();
        let n = bad_hbi.len() - 12;
        bad_hbi[n] ^= 1;
        assert!(hbi_verify(&hbp, &bad_hbi).is_err());
    }

    #[test]
    fn sidecar_is_sha256sum_format_and_detects_change() {
        let bytes = b"hello";
        let line = sidecar_line(bytes, "x.hbp");
        assert!(line.ends_with("  x.hbp\n"));
        assert!(sidecar_verify(bytes, &line).is_ok());
        assert!(sidecar_verify(b"hellp", &line).is_err());
        assert!(sidecar_verify(bytes, "nothex  x").is_err());
    }
}
