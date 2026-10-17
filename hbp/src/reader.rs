//! Port of hbp-reader.mjs: detectFormat (20-27), parsePipeRow (30-40) and verifyHBP (118-156).
//! JSON stays a cold lane; the `tryParseValue`/`parseEnvelope` JSON-decode path is not ported here.
//!
//! The upstream runs on JS strings, so this module reproduces the JS string rules it relies on:
//! UTF-16 code-unit slicing, the ECMAScript whitespace set used by `\s` and `trim()`, regex
//! search, plain-object key assignment and enumeration, and Node's lossy UTF-8 file decode.

use std::path::Path;

use crate::sha256_hex;

const MAGIC: &str = "!HBP-v0";
const MAGIC_HBI: &str = "!HBI-v0";

/// ECMAScript WhiteSpace + LineTerminator: the set `\s` and `String.prototype.trim` use.
fn js_is_space(c: char) -> bool {
    matches!(
        c as u32,
        0x09..=0x0d
            | 0x20
            | 0xa0
            | 0x1680
            | 0x2000..=0x200a
            | 0x2028
            | 0x2029
            | 0x202f
            | 0x205f
            | 0x3000
            | 0xfeff
    )
}

/// ECMAScript LineTerminator: where `^` matches under the `m` flag.
fn js_is_line_terminator(c: char) -> bool {
    matches!(c, '\n' | '\r' | '\u{2028}' | '\u{2029}')
}

/// `s.slice(0, n)`: the first `n` UTF-16 code units. A surrogate pair cut in half leaves a lone
/// surrogate in JS; it is decoded here as U+FFFD, the character `Buffer.from(s, 'utf8')` writes for it.
fn js_slice_units(s: &str, n: usize) -> String {
    let units: Vec<u16> = s.encode_utf16().take(n).collect();
    String::from_utf16_lossy(&units)
}

/// hbp-reader.mjs:20-27 `detectFormat`.
pub fn detect_format(text: &str) -> &'static str {
    let head = js_slice_units(text, 64);
    if head.starts_with(MAGIC) {
        return "hbp-v0-envelope";
    }
    if head.starts_with(MAGIC_HBI) {
        return "hbi-v0-index";
    }
    // /^HBPv1\|/m : at the start of the head or right after a LineTerminator.
    let pipe = "HBPv1|";
    if head.starts_with(pipe)
        || head
            .char_indices()
            .any(|(i, c)| js_is_line_terminator(c) && head[i + c.len_utf8()..].starts_with(pipe))
    {
        return "hbpv1-pipe";
    }
    if head.starts_with("HBI1|") {
        return "hbi1-pipe";
    }
    "unknown"
}

/// One parsed pipe row: the leading tag and its `k=v` / positional fields.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PipeRow {
    pub tag: String,
    /// The entries of the upstream `fields` object, in `Object.entries` order.
    pub fields: Vec<(String, String)>,
}

/// A canonical array-index key ("0".."4294967294"); such keys enumerate first, ascending.
fn js_array_index(k: &str) -> Option<u32> {
    if k.is_empty() || !k.bytes().all(|b| b.is_ascii_digit()) || (k.len() > 1 && k.starts_with('0'))
    {
        return None;
    }
    k.parse::<u32>().ok().filter(|n| *n != u32::MAX)
}

/// `fields[k] = v` on a plain object: an existing key keeps its position and takes the new value;
/// `__proto__` goes to the prototype setter, which ignores a string value, so nothing is stored.
fn js_set(fields: &mut Vec<(String, String)>, k: String, v: String) {
    if k == "__proto__" {
        return;
    }
    match fields.iter_mut().find(|(ek, _)| *ek == k) {
        Some(entry) => entry.1 = v,
        None => fields.push((k, v)),
    }
}

/// hbp-reader.mjs:30-40 `parsePipeRow`.
pub fn parse_pipe_row(line: &str) -> PipeRow {
    let parts: Vec<&str> = line.trim_matches(js_is_space).split('|').collect();
    let tag = parts[0].to_string();
    let mut fields: Vec<(String, String)> = Vec::new();
    for (i, part) in parts.iter().enumerate().skip(1) {
        match part.find('=') {
            Some(eq) if eq > 0 => {
                js_set(
                    &mut fields,
                    part[..eq].to_string(),
                    part[eq + 1..].to_string(),
                );
            }
            _ => {
                if !part.is_empty() {
                    js_set(&mut fields, format!("_{i}"), (*part).to_string());
                }
            }
        }
    }
    let (mut ordered, named): (Vec<_>, Vec<_>) = fields
        .into_iter()
        .partition(|(k, _)| js_array_index(k).is_some());
    ordered.sort_by_key(|(k, _)| js_array_index(k));
    ordered.extend(named);
    PipeRow {
        tag,
        fields: ordered,
    }
}

/// Outcome of [`verify_hbp`]. A field is `None` when its sidecar is absent (JS `null`).
#[derive(Clone, Debug, Default)]
pub struct VerifyResult {
    pub hbp_path: String,
    pub sha256: Option<String>,
    pub bytes: Option<usize>,
    pub sha_ok: Option<bool>,
    pub hex_ok: Option<bool>,
    pub hbi_ok: Option<bool>,
    pub errors: Vec<String>,
    pub ok: bool,
}

fn swap_suffix(hbp_path: &str, new_ext: &str) -> String {
    // JS: hbpPath.replace(/\.hbp$/, new_ext)
    if let Some(stem) = hbp_path.strip_suffix(".hbp") {
        format!("{stem}{new_ext}")
    } else {
        hbp_path.to_string()
    }
}

/// `existsSync(p)` then `readFileSync(p, 'utf8')`: present files decode lossily (invalid UTF-8
/// becomes U+FFFD, as Node's decoder does). A present path that cannot be read makes the
/// upstream throw; this port has no exception channel and returns `None` for it.
fn read_sidecar(p: &str) -> Option<String> {
    if !Path::new(p).exists() {
        return None;
    }
    let bytes = std::fs::read(p).ok()?;
    Some(String::from_utf8_lossy(&bytes).into_owned())
}

fn unhex(b: u8) -> Option<u8> {
    match b {
        b'0'..=b'9' => Some(b - b'0'),
        b'a'..=b'f' => Some(b - b'a' + 10),
        b'A'..=b'F' => Some(b - b'A' + 10),
        _ => None,
    }
}

/// `Buffer.from(s, 'hex')`: walks UTF-16 code units in pairs, reads each unit's low byte, stops at
/// the first pair that is not two hex digits, and drops an odd trailing unit.
fn node_hex_decode(s: &str) -> Vec<u8> {
    let units: Vec<u16> = s.encode_utf16().collect();
    let lo_byte = |u: u16| (u & 0xff) as u8;
    let mut out = Vec::with_capacity(units.len() / 2);
    for pair in units.chunks_exact(2) {
        match (unhex(lo_byte(pair[0])), unhex(lo_byte(pair[1]))) {
            (Some(hi), Some(lo)) => out.push((hi << 4) | lo),
            _ => break,
        }
    }
    out
}

/// `hay.match(/<needle>(<class>+)/)[1]`: the leftmost occurrence of `needle` followed by at least
/// one class character, with the greedy run of class characters after it.
fn regex_capture_after(hay: &str, needle: &str, class: impl Fn(u8) -> bool) -> Option<String> {
    let bytes = hay.as_bytes();
    let mut from = 0;
    while let Some(at) = hay[from..].find(needle) {
        let start = from + at + needle.len();
        let run = bytes[start..].iter().take_while(|b| class(**b)).count();
        if run > 0 {
            return Some(hay[start..start + run].to_string());
        }
        // needle starts with an ASCII byte, so one byte past `at` is a char boundary.
        from += at + 1;
    }
    None
}

/// hbp-reader.mjs:118-156 `verifyHBP`: recompute sha256 over the `.hbp` bytes and
/// check the `.sha256`, `.hex` and `.hbi` sidecars against it.
pub fn verify_hbp(hbp_path: &str) -> VerifyResult {
    let mut r = VerifyResult {
        hbp_path: hbp_path.to_string(),
        ..Default::default()
    };

    let bytes = match std::fs::read(hbp_path) {
        Ok(b) => b,
        Err(_) => {
            r.errors.push("hbp missing".to_string());
            return r;
        }
    };
    let sha = sha256_hex(&bytes);
    r.sha256 = Some(sha.clone());
    r.bytes = Some(bytes.len());

    // .sha256 sidecar: "<sha>  <basename>.hbp\n" -> .trim().split(/\s+/)[0]
    if let Some(txt) = read_sidecar(&swap_suffix(hbp_path, ".sha256")) {
        let declared = txt
            .trim_matches(js_is_space)
            .split(js_is_space)
            .next()
            .unwrap_or("");
        let okv = declared == sha;
        r.sha_ok = Some(okv);
        if !okv {
            let d = js_slice_units(declared, 16);
            let a = js_slice_units(&sha, 16);
            r.errors
                .push(format!("sha mismatch: declared {d} vs actual {a}"));
        }
    }

    // .hex sidecar: .replace(/\s+/g, '') then Buffer.from(hex, 'hex') must equal the bytes.
    if let Some(txt) = read_sidecar(&swap_suffix(hbp_path, ".hex")) {
        let hex: String = txt.chars().filter(|c| !js_is_space(*c)).collect();
        let okv = node_hex_decode(&hex) == bytes;
        r.hex_ok = Some(okv);
        if !okv {
            r.errors.push("hex round-trip mismatch".to_string());
        }
    }

    // .hbi index: /sha256=([0-9a-f]+)/ and /bytes=(\d+)/ must agree.
    if let Some(txt) = read_sidecar(&swap_suffix(hbp_path, ".hbi")) {
        let declared_sha = regex_capture_after(&txt, "sha256=", |b| {
            b.is_ascii_digit() || (b'a'..=b'f').contains(&b)
        });
        let declared_bytes = regex_capture_after(&txt, "bytes=", |b| b.is_ascii_digit());
        let sha_match = declared_sha.as_deref() == Some(sha.as_str());
        // Number(<digits>) === bytes.length holds exactly when the digits' value is bytes.length.
        let bytes_match = declared_bytes
            .as_deref()
            .and_then(|s| s.parse::<usize>().ok())
            == Some(bytes.len());
        let okv = sha_match && bytes_match;
        r.hbi_ok = Some(okv);
        if !okv {
            r.errors.push("hbi sha/bytes mismatch".to_string());
        }
    }

    r.ok = r.errors.is_empty();
    r
}
