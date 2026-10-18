//! No floating-point literal in any Rust file of this crate (`src/`, `tests/`, `examples/`).
//!
//! `check.sh main` greps every text file for the floating-point type names and casts. A literal
//! such as `0.5` or `1e3` names no type, so this test reads every token outside comments, string
//! and character literals and fails on a number with a fractional part, an exponent or a float
//! suffix.

use std::path::{Path, PathBuf};

fn rust_files(dir: &Path, out: &mut Vec<PathBuf>) {
    let mut entries: Vec<PathBuf> = std::fs::read_dir(dir)
        .expect("readable directory")
        .map(|e| e.expect("directory entry").path())
        .collect();
    entries.sort();
    for path in entries {
        if path.is_dir() {
            rust_files(&path, out);
        } else if path.extension().is_some_and(|e| e == "rs") {
            out.push(path);
        }
    }
}

fn is_ident(b: u8) -> bool {
    b.is_ascii_alphanumeric() || b == b'_'
}

/// `b"`, `br"`, `br#"`, `r"` or `r#"` (a raw identifier such as `r#type` is not a string).
fn string_prefix(rest: &[u8]) -> bool {
    let rest = rest.strip_prefix(b"b").unwrap_or(rest);
    match rest.strip_prefix(b"r") {
        Some(raw) => raw.iter().find(|&&c| c != b'#') == Some(&b'"'),
        None => rest.starts_with(b"\""),
    }
}

/// The index just past a string literal whose opening quote is at `i` (`"` or a raw string's
/// `r`, after any `b` prefix).
fn skip_string(s: &[u8], mut i: usize) -> usize {
    if s[i] == b'r' {
        i += 1;
        let mut hashes = 0;
        while s[i] == b'#' {
            hashes += 1;
            i += 1;
        }
        i += 1; // opening quote
        loop {
            if s[i] == b'"' && s[i + 1..].iter().take(hashes).all(|&c| c == b'#') {
                return i + 1 + hashes;
            }
            i += 1;
        }
    }
    i += 1;
    while s[i] != b'"' {
        i += if s[i] == b'\\' { 2 } else { 1 };
    }
    i + 1
}

/// Every floating-point literal in Rust source `text`, with its line number.
fn float_literals(text: &str) -> Vec<(usize, String)> {
    let s = text.as_bytes();
    let mut found = Vec::new();
    let mut i = 0;
    let line = |i: usize| s[..i].iter().filter(|&&c| c == b'\n').count() + 1;
    while i < s.len() {
        let c = s[i];
        let prev = if i > 0 { s[i - 1] } else { b' ' };
        if c == b'/' && s.get(i + 1) == Some(&b'/') {
            while i < s.len() && s[i] != b'\n' {
                i += 1;
            }
        } else if c == b'/' && s.get(i + 1) == Some(&b'*') {
            let mut depth = 0;
            loop {
                if s[i] == b'/' && s[i + 1] == b'*' {
                    depth += 1;
                    i += 2;
                } else if s[i] == b'*' && s[i + 1] == b'/' {
                    depth -= 1;
                    i += 2;
                    if depth == 0 {
                        break;
                    }
                } else {
                    i += 1;
                }
            }
        } else if c == b'"' {
            i = skip_string(s, i);
        } else if (c == b'r' || c == b'b') && !is_ident(prev) && string_prefix(&s[i..]) {
            i = skip_string(s, if c == b'b' { i + 1 } else { i });
        } else if c == b'\'' {
            // A character literal ('x', '\n', '\u{..}') or a lifetime or label ('a).
            if s[i + 1] == b'\\' {
                // Past the quote, the backslash and the escaped character.
                i += 3;
                while s[i] != b'\'' {
                    i += 1;
                }
                i += 1;
            } else {
                let width = std::str::from_utf8(&s[i + 1..])
                    .ok()
                    .and_then(|t| t.chars().next())
                    .map_or(1, char::len_utf8);
                i += if s.get(i + 1 + width) == Some(&b'\'') {
                    width + 2
                } else {
                    1
                };
            }
        } else if c.is_ascii_digit() && !is_ident(prev) {
            let start = i;
            if prev == b'.' {
                // A tuple index such as `t.0`.
                while i < s.len() && s[i].is_ascii_digit() {
                    i += 1;
                }
                continue;
            }
            if c == b'0' && matches!(s.get(i + 1), Some(b'x' | b'o' | b'b')) {
                while i < s.len() && is_ident(s[i]) {
                    i += 1;
                }
                continue;
            }
            while i < s.len() && (s[i].is_ascii_digit() || s[i] == b'_') {
                i += 1;
            }
            let mut float = false;
            if s.get(i) == Some(&b'.') && s.get(i + 1).is_some_and(u8::is_ascii_digit) {
                float = true;
                i += 1;
                while i < s.len() && (s[i].is_ascii_digit() || s[i] == b'_') {
                    i += 1;
                }
            } else if s.get(i) == Some(&b'.')
                && !s.get(i + 1).is_some_and(|&n| n == b'.' || is_ident(n))
            {
                // `2.` is a literal too.
                float = true;
                i += 1;
            }
            if matches!(s.get(i), Some(b'e' | b'E'))
                && s[i + 1..]
                    .iter()
                    .find(|&&n| n != b'+' && n != b'-' && n != b'_')
                    .is_some_and(u8::is_ascii_digit)
            {
                float = true;
                i += 1;
                if matches!(s.get(i), Some(b'+' | b'-')) {
                    i += 1;
                }
            }
            // Integer suffixes start with `i` or `u`; a float suffix starts with `f`.
            if s.get(i) == Some(&b'f') {
                float = true;
            }
            while i < s.len() && is_ident(s[i]) {
                i += 1;
            }
            if float {
                let token = String::from_utf8_lossy(&s[start..i]).into_owned();
                found.push((line(start), token));
            }
        } else {
            i += 1;
        }
    }
    found
}

#[test]
fn the_scanner_finds_float_literals_and_nothing_else() {
    let sample = concat!(
        "let a = 0.5; let b = 1e3; let c = 2.; let d = 7",
        "f",
        "32; let e = 1_0.2_5;\n",
        "let f = 1E-9; // 3.5 in a comment\n",
        "/* 4.5 /* nested 5.5 */ */ let g = \"6.5\"; let h = r#\"7.5\"#; let i = b\"8.5\";\n",
        "let j = 'x'; let k = '\\''; fn l<'a>(m: &'a u8) {} let n = t.0.1; let o = 0..9;\n",
        "let p = 0x1e5; let q = 3.max(4); let r = [1u8, 2i64, 9_000usize];\n",
    );
    let got: Vec<String> = float_literals(sample).into_iter().map(|(_, t)| t).collect();
    let want = [
        "0.5",
        "1e3",
        "2.",
        concat!("7", "f", "32"),
        "1_0.2_5",
        "1E-9",
    ];
    assert_eq!(got, want);
}

#[test]
fn no_rust_file_of_this_crate_holds_a_float_literal() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let mut files = Vec::new();
    for dir in ["src", "tests", "examples"] {
        rust_files(&root.join(dir), &mut files);
    }
    assert!(files.len() >= 10, "found {} Rust files", files.len());
    let mut report = Vec::new();
    for path in &files {
        let text = std::fs::read_to_string(path).expect("UTF-8 source");
        for (line, token) in float_literals(&text) {
            report.push(format!("{}:{line}: {token}", path.display()));
        }
    }
    println!(
        "NO_FLOAT_LITERAL|files={}|found={}|json=0",
        files.len(),
        report.len()
    );
    assert!(report.is_empty(), "{}", report.join("\n"));
}
