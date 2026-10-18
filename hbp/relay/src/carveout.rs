//! Port of relay-carveout.mjs:1-74 — the EMIT carve-out guard.
//!
//! `assert_read_allowed` is the STRUCTURAL guard (relay-carveout.mjs:55-74): it canonicalizes the
//! path (realpath of the nearest existing ancestor collapses symlinks, 8.3 short names and trailing
//! dot/space), rejects NTFS alternate-data-stream / `$`-stream / 8.3-alias syntax, matches the
//! carve-out denylist of directory names on the canonical forward-slashed path, and, with an
//! allow-root, requires the canonical path to be that root or a descendant of it.
//!
//! `scan` is the content layer (relay-carveout.mjs:31-36) over the detection table at
//! relay-carveout.mjs:14-26 ("The patterns below are DETECTION patterns, not secrets.", :8). Each
//! rule is matched by hand over the Latin-1 text `scan` builds, with the JS non-unicode regex
//! meaning of `\b`, `\s` and the `i` flag on that text (ASCII word characters; TAB..CR, SPACE and
//! NBSP; ASCII case folding).
//!
//! Paths follow node `path.posix` (`resolve`, `dirname`, `sep` = `/`). Upstream imports `node:path`,
//! which is `path.win32` on Windows; that variant is not ported, so this crate is POSIX-only.

use std::path::Path;

use hbp::relay::RelayError;

/// relay-carveout.mjs:31-36 `scan` — best-effort content layer. Returns the matched reason tags.
pub struct ScanResult {
    pub hit: bool,
    pub reasons: Vec<String>,
}

/// JS `\w` without the `u` flag: `[A-Za-z0-9_]`.
fn is_word(b: u8) -> bool {
    b.is_ascii_alphanumeric() || b == b'_'
}

/// JS `\s` on Latin-1 text: TAB, LF, VT, FF, CR, SPACE and NBSP (U+00A0).
fn is_space(b: u8) -> bool {
    matches!(b, 0x09..=0x0D | 0x20 | 0xA0)
}

/// JS `\b` at position `i`.
fn boundary(t: &[u8], i: usize) -> bool {
    let before = i > 0 && is_word(t[i - 1]);
    let after = i < t.len() && is_word(t[i]);
    before != after
}

fn at(t: &[u8], i: usize, lit: &[u8]) -> bool {
    t.len() >= i + lit.len() && &t[i..i + lit.len()] == lit
}

/// `at` under the `i` flag: ASCII case folding (Latin-1 text has no other letters that fold to ASCII).
fn at_ci(t: &[u8], i: usize, lit: &[u8]) -> bool {
    t.len() >= i + lit.len() && t[i..i + lit.len()].eq_ignore_ascii_case(lit)
}

fn run(t: &[u8], i: usize, class: fn(u8) -> bool) -> usize {
    t[i.min(t.len())..]
        .iter()
        .take_while(|&&b| class(b))
        .count()
}

/// `X{min,}` followed by `\b`, for a run of `X` starting at `r0`: some end in `r0+min ..= run end`
/// must be a word boundary.
fn run_then_boundary(t: &[u8], r0: usize, min: usize, class: fn(u8) -> bool) -> bool {
    let k = r0 + run(t, r0, class);
    k >= r0 + min && (r0 + min..=k).any(|e| boundary(t, e))
}

/// relay-carveout.mjs:15 `/-----BEGIN [A-Z2 ]*PRIVATE KEY-----/`.
fn pem_private_key_header(t: &[u8], i: usize) -> bool {
    if !at(t, i, b"-----BEGIN ") {
        return false;
    }
    let r0 = i + 11;
    let k = r0 + run(t, r0, |b| b.is_ascii_uppercase() || b == b'2' || b == b' ');
    k >= r0 + 11 && &t[k - 11..k] == b"PRIVATE KEY" && at(t, k, b"-----")
}

/// relay-carveout.mjs:16 `/-----BEGIN OPENSSH PRIVATE KEY-----/`.
fn openssh_private_key(t: &[u8], i: usize) -> bool {
    at(
        t,
        i,
        concat!("-----BEGIN OPENSSH ", "PRIVATE KEY-----").as_bytes(),
    )
}

/// relay-carveout.mjs:17 `/\bAKIA[0-9A-Z]{16}\b/`.
fn aws_access_key_id(t: &[u8], i: usize) -> bool {
    at(t, i, b"AKIA")
        && boundary(t, i)
        && t.len() >= i + 20
        && t[i + 4..i + 20]
            .iter()
            .all(|b| b.is_ascii_digit() || b.is_ascii_uppercase())
        && boundary(t, i + 20)
}

/// relay-carveout.mjs:18 `/\bgh[pousr]_[A-Za-z0-9]{36,}\b/`.
fn github_token(t: &[u8], i: usize) -> bool {
    at(t, i, b"gh")
        && boundary(t, i)
        && t.len() > i + 3
        && b"pousr".contains(&t[i + 2])
        && t[i + 3] == b'_'
        && run_then_boundary(t, i + 4, 36, |b| b.is_ascii_alphanumeric())
}

/// relay-carveout.mjs:19 `/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/`.
fn slack_token(t: &[u8], i: usize) -> bool {
    at(t, i, b"xox")
        && boundary(t, i)
        && t.len() > i + 4
        && b"baprs".contains(&t[i + 3])
        && t[i + 4] == b'-'
        && run_then_boundary(t, i + 5, 10, |b| b.is_ascii_alphanumeric() || b == b'-')
}

/// relay-carveout.mjs:20 `/ssh-(rsa|ed25519) AAAA[0-9A-Za-z+/]{40,}/`.
fn ssh_pubkey_material(t: &[u8], i: usize) -> bool {
    [&b"ssh-rsa AAAA"[..], &b"ssh-ed25519 AAAA"[..]]
        .iter()
        .any(|p| {
            at(t, i, p)
                && run(t, i + p.len(), |b| {
                    b.is_ascii_alphanumeric() || b == b'+' || b == b'/'
                }) >= 40
        })
}

/// relay-carveout.mjs:21 `/\bCHARM_[A-Z0-9_]{4,}\b/`.
fn charm_secret_marker(t: &[u8], i: usize) -> bool {
    at(t, i, b"CHARM_")
        && boundary(t, i)
        && run_then_boundary(t, i + 6, 4, |b| {
            b.is_ascii_uppercase() || b.is_ascii_digit() || b == b'_'
        })
}

/// relay-carveout.mjs:22 `/\bbeast-keys?\b/i`.
fn beast_keys_marker(t: &[u8], i: usize) -> bool {
    if !(at_ci(t, i, b"beast-key") && boundary(t, i)) {
        return false;
    }
    let j = i + 9;
    (at_ci(t, j, b"s") && boundary(t, j + 1)) || boundary(t, j)
}

/// relay-carveout.mjs:23 `/decrypted[-_]?vault/i`.
fn decrypted_vault_marker(t: &[u8], i: usize) -> bool {
    if !at_ci(t, i, b"decrypted") {
        return false;
    }
    let j = i + 9;
    ((at(t, j, b"-") || at(t, j, b"_")) && at_ci(t, j + 1, b"vault")) || at_ci(t, j, b"vault")
}

/// relay-carveout.mjs:24 `/"?private_key"?\s*[:=]/i`.
fn private_key_field(t: &[u8], i: usize) -> bool {
    if !at_ci(t, i, b"private_key") {
        return false;
    }
    let mut j = i + 11;
    if at(t, j, b"\"") {
        j += 1;
    }
    j += run(t, j, is_space);
    at(t, j, b":") || at(t, j, b"=")
}

/// relay-carveout.mjs:25 `/\b(api[_-]?key|secret|password|passwd|bearer)\b\s*[:=]\s*\S{8,}/i`.
fn secret_assignment(t: &[u8], i: usize) -> bool {
    if !boundary(t, i) {
        return false;
    }
    let mut ends: Vec<usize> = Vec::new();
    if at_ci(t, i, b"api") {
        let j = i + 3;
        if (at(t, j, b"_") || at(t, j, b"-")) && at_ci(t, j + 1, b"key") {
            ends.push(j + 4);
        }
        if at_ci(t, j, b"key") {
            ends.push(j + 3);
        }
    }
    for w in [&b"secret"[..], b"password", b"passwd", b"bearer"] {
        if at_ci(t, i, w) {
            ends.push(i + w.len());
        }
    }
    ends.into_iter().any(|e| {
        if !boundary(t, e) {
            return false;
        }
        let j = e + run(t, e, is_space);
        if !(at(t, j, b":") || at(t, j, b"=")) {
            return false;
        }
        let p = j + 1 + run(t, j + 1, is_space);
        run(t, p, |b| !is_space(b)) >= 8
    })
}

/// relay-carveout.mjs:14-26 PATTERNS, in table order: (matcher at a start position, reason tag).
type Rule = (fn(&[u8], usize) -> bool, &'static str);
const PATTERNS: [Rule; 11] = [
    (pem_private_key_header, "pem-private-key-header"),
    (openssh_private_key, "openssh-private-key"),
    (aws_access_key_id, "aws-access-key-id"),
    (github_token, "github-token"),
    (slack_token, "slack-token"),
    (ssh_pubkey_material, "ssh-pubkey-material"),
    (charm_secret_marker, "charm-secret-marker"),
    (beast_keys_marker, "beast-keys-marker"),
    (decrypted_vault_marker, "decrypted-vault-marker"),
    (private_key_field, "private_key-field"),
    (secret_assignment, "secret-assignment"),
];

/// relay-carveout.mjs:31-36 `scan`. The payload bytes are the Latin-1 text (one char per byte,
/// :32); each rule that matches anywhere adds its tag (`re.test`, :34).
pub fn scan(buf: &[u8]) -> ScanResult {
    let reasons: Vec<String> = PATTERNS
        .iter()
        .filter(|(m, _)| (0..=buf.len()).any(|i| m(buf, i)))
        .map(|(_, tag)| tag.to_string())
        .collect();
    ScanResult {
        hit: !reasons.is_empty(),
        reasons,
    }
}

fn posix_dirname(p: &str) -> String {
    if p.is_empty() {
        return ".".to_string();
    }
    let has_root = p.starts_with('/');
    let trimmed = p.trim_end_matches('/');
    let trimmed = if trimmed.is_empty() { "/" } else { trimmed };
    match trimmed.rfind('/') {
        None => {
            if has_root {
                "/".to_string()
            } else {
                ".".to_string()
            }
        }
        Some(0) => "/".to_string(),
        Some(i) => trimmed[..i].to_string(),
    }
}

/// `path.posix.normalize`: collapse `.`, `..`, and duplicate separators; keep a trailing slash off.
fn posix_normalize(p: &str) -> String {
    let is_abs = p.starts_with('/');
    let mut out: Vec<&str> = Vec::new();
    for seg in p.split('/') {
        match seg {
            "" | "." => {}
            ".." => {
                if let Some(&last) = out.last() {
                    if last != ".." {
                        out.pop();
                        continue;
                    }
                }
                if !is_abs {
                    out.push("..");
                }
            }
            s => out.push(s),
        }
    }
    let joined = out.join("/");
    if is_abs {
        format!("/{joined}")
    } else if joined.is_empty() {
        ".".to_string()
    } else {
        joined
    }
}

/// relay-carveout.mjs implicit `resolve` (node `path.resolve`, posix): a relative path is joined to
/// the current working directory, then normalized to an absolute path.
fn resolve(p: &str) -> String {
    if p.starts_with('/') {
        posix_normalize(p)
    } else {
        let cwd = std::env::current_dir()
            .map(|c| c.to_string_lossy().to_string())
            .unwrap_or_else(|_| "/".to_string());
        posix_normalize(&format!("{cwd}/{p}"))
    }
}

/// relay-carveout.mjs:50 `c.replace(/[. ]+$/, '')` on UTF-16 units.
fn strip_trailing_dot_space(c: &[u16]) -> &[u16] {
    let mut n = c.len();
    while n > 0 && (c[n - 1] == u16::from(b'.') || c[n - 1] == u16::from(b' ')) {
        n -= 1;
    }
    &c[..n]
}

/// relay-carveout.mjs:40-52 `canonicalize` — realpath the nearest existing ancestor, then re-append
/// the non-existent tail with each component's trailing dots/spaces stripped. The result is the JS
/// string as UTF-16 units: `cur.slice(parent.length + 1)` (:45) cuts at a UTF-16 index, which
/// directly under `/` drops the component's first unit (half of a surrogate pair for an astral
/// first character).
fn canonicalize(abs: &str) -> Vec<u16> {
    let mut cur = abs.to_string();
    let mut tail: Vec<Vec<u16>> = Vec::new();
    while !cur.is_empty() && !Path::new(&cur).exists() {
        let parent = posix_dirname(&cur);
        if parent == cur {
            break;
        }
        let units: Vec<u16> = cur.encode_utf16().collect();
        let cut = (parent.encode_utf16().count() + 1).min(units.len());
        tail.insert(0, units[cut..].to_vec());
        cur = parent;
    }
    let mut base = cur.clone();
    if Path::new(&cur).exists() {
        if let Ok(rp) = std::fs::canonicalize(&cur) {
            base = rp.to_string_lossy().to_string();
        }
    }
    let mut out: Vec<u16> = base.encode_utf16().collect();
    for c in &tail {
        out.push(u16::from(b'/'));
        out.extend_from_slice(strip_trailing_dot_space(c));
    }
    out
}

fn strip_leading_drive(abs: &str) -> &str {
    let b = abs.as_bytes();
    if b.len() >= 2 && b[0].is_ascii_alphabetic() && b[1] == b':' {
        &abs[2..]
    } else {
        abs
    }
}

/// relay-carveout.mjs:60-61 — a `$`-stream component matches `/\$[A-Za-z_]/`.
fn has_dollar_stream(comp: &str) -> bool {
    let b = comp.as_bytes();
    for i in 0..b.len() {
        if b[i] == b'$' {
            if let Some(&n) = b.get(i + 1) {
                if n.is_ascii_alphabetic() || n == b'_' {
                    return true;
                }
            }
        }
    }
    false
}

/// relay-carveout.mjs:62 — an 8.3 short-name alias component matches `/~\d+$/`.
fn is_short_name_alias(comp: &str) -> bool {
    let stripped = comp.trim_end_matches(|c: char| c.is_ascii_digit());
    stripped.len() < comp.len() && stripped.ends_with('~')
}

/// relay-carveout.mjs:29 DENY_DIR_RE — the carve-out directory denylist, matched as a complete
/// `/`-delimited segment on the canonical forward-slashed path (case-insensitive).
fn is_deny_segment(seg_lower: &str) -> bool {
    matches!(
        seg_lower,
        ".ssh"
            | ".gnupg"
            | "vault"
            | "sovereignty-vault"
            | "decryptedvault"
            | "decrypted-vault"
            | "decrypted_vault"
            | "beast-keys"
            | "key"
            | "keys"
            | "secret"
            | "secrets"
            | "credential"
            | "credentials"
    )
}

/// DENY_DIR_RE.test on UTF-16 units; the `i` flag folds ASCII only, so a segment holding any
/// non-ASCII unit never matches.
fn deny_dir_match(canon: &[u16]) -> bool {
    canon.split(|&u| u == u16::from(b'/')).any(|seg| {
        !seg.is_empty()
            && seg.iter().all(|&u| u < 0x80)
            && is_deny_segment(
                &seg.iter()
                    .map(|&u| (u as u8).to_ascii_lowercase() as char)
                    .collect::<String>(),
            )
    })
}

/// relay-carveout.mjs:55-74 `assertReadAllowed` — the structural guard. Returns the resolved absolute
/// path on success, or a `..._DENY` error if the path is a carve-out path, an NTFS alias, or outside
/// the allow-root.
pub fn assert_read_allowed(src_path: &str, allow_root: Option<&str>) -> Result<String, RelayError> {
    let abs = resolve(src_path);

    // 1) reject NTFS alternate-data-stream / `$`-stream / 8.3-alias syntax.
    let after_drive = strip_leading_drive(&abs);
    if after_drive.contains(':') {
        return Err(RelayError(format!(
            "CARVEOUT_PATH_DENY: NTFS stream/ADS syntax not allowed: {abs}"
        )));
    }
    for comp in after_drive.split(['\\', '/']) {
        if has_dollar_stream(comp) {
            return Err(RelayError(format!(
                "CARVEOUT_PATH_DENY: NTFS $-stream component not allowed: {abs}"
            )));
        }
        if is_short_name_alias(comp) {
            return Err(RelayError(format!(
                "CARVEOUT_PATH_DENY: 8.3 short-name alias not allowed: {abs}"
            )));
        }
    }

    // 2) canonicalize, then match the carve-out denylist on the canonical forward-slashed path.
    let canon: Vec<u16> = canonicalize(&abs)
        .into_iter()
        .map(|u| {
            if u == u16::from(b'\\') {
                u16::from(b'/')
            } else {
                u
            }
        })
        .collect();
    if deny_dir_match(&canon) {
        let canon = String::from_utf16_lossy(&canon);
        return Err(RelayError(format!(
            "CARVEOUT_PATH_DENY: EMIT may not read carve-out dir: {abs} (canonical: {canon})"
        )));
    }

    // 3) allowlist: require the canonical path to be the allow-root or a descendant of it.
    // `if (allowRoot)` (:68): an empty string is falsy, so it applies no allowlist.
    if let Some(root) = allow_root.filter(|r| !r.is_empty()) {
        let root_c = canonicalize(&resolve(root));
        let a = canonicalize(&abs);
        let mut root_sep = root_c.clone();
        root_sep.push(u16::from(b'/'));
        if a != root_c && !a.starts_with(&root_sep) {
            return Err(RelayError(format!(
                "ALLOWLIST_DENY: EMIT path outside allow-root: {abs}"
            )));
        }
    }

    Ok(abs)
}
