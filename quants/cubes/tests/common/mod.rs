//! Shared readers for the referee-written HBP fixtures and the vendored upstream files.
#![allow(dead_code)]

use std::path::PathBuf;

/// The crate directory.
pub fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

/// The lines of `tests/fixtures/<name>` (each fixture ends with one newline).
pub fn fixture(name: &str) -> Vec<String> {
    let text = std::fs::read_to_string(root().join("tests/fixtures").join(name)).expect(name);
    let mut lines: Vec<String> = text.split('\n').map(str::to_string).collect();
    assert_eq!(
        lines.pop().as_deref(),
        Some(""),
        "{name} ends with a newline"
    );
    lines
}

/// The bytes of a vendored upstream file (path relative to `vendor/`).
pub fn vendor(path: &str) -> Vec<u8> {
    std::fs::read(root().join("vendor").join(path)).expect(path)
}

/// The text lines of a vendored upstream file (path relative to `vendor/`).
pub fn vendor_lines(path: &str) -> Vec<String> {
    let text = String::from_utf8(vendor(path)).expect("utf-8");
    text.split('\n').map(str::to_string).collect()
}

/// The value of `|key=value|` in an HBP row (`None` when absent).
pub fn field<'a>(row: &'a str, key: &str) -> Option<&'a str> {
    row.split('|').find_map(|part| {
        part.strip_prefix(key)
            .and_then(|rest| rest.strip_prefix('='))
    })
}

/// `field`, required.
pub fn get<'a>(row: &'a str, key: &str) -> &'a str {
    field(row, key).unwrap_or_else(|| panic!("no {key} in {row}"))
}

/// Lowercase hex to bytes.
pub fn unhex(s: &str) -> Vec<u8> {
    (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&s[i..i + 2], 16).expect("hex"))
        .collect()
}
