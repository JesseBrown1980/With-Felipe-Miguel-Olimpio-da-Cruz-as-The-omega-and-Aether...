//! Integer only. A float dies: no float type, no float suffix, no float literal anywhere in `src/`, `tests/` or
//! `examples/`, and the crate-level lints that refuse float arithmetic are present.
//!
//! The detector is a small lexer: it drops comments, string literals and character literals (the
//! game CITES one float result as text, and that text is not code) and then looks for float types,
//! suffixes and literals in what is left. A detector that cannot fail is decoration, so the first
//! test feeds it code that must be caught.

use std::fs;
use std::path::{Path, PathBuf};

fn rust_files(dir: &Path, out: &mut Vec<PathBuf>) {
    let Ok(rd) = fs::read_dir(dir) else { return };
    for e in rd.flatten() {
        let p = e.path();
        if p.is_dir() {
            rust_files(&p, out);
        } else if p.extension().is_some_and(|x| x == "rs") {
            out.push(p);
        }
    }
}

/// Replace comments, string literals and character literals with spaces, keeping line structure.
fn code_only(src: &str) -> String {
    let c: Vec<char> = src.chars().collect();
    let mut out = String::with_capacity(src.len());
    let mut i = 0;
    let blank = |ch: char| if ch == '\n' { '\n' } else { ' ' };
    while i < c.len() {
        let ch = c[i];
        let next = c.get(i + 1).copied().unwrap_or('\0');
        if ch == '/' && next == '/' {
            while i < c.len() && c[i] != '\n' {
                out.push(' ');
                i += 1;
            }
        } else if ch == '/' && next == '*' {
            let mut depth = 0;
            while i < c.len() {
                if c[i] == '/' && c.get(i + 1) == Some(&'*') {
                    depth += 1;
                    out.push_str("  ");
                    i += 2;
                } else if c[i] == '*' && c.get(i + 1) == Some(&'/') {
                    depth -= 1;
                    out.push_str("  ");
                    i += 2;
                    if depth == 0 {
                        break;
                    }
                } else {
                    out.push(blank(c[i]));
                    i += 1;
                }
            }
        } else if ch == 'r' && (next == '"' || next == '#') && is_raw_start(&c, i) {
            let mut j = i + 1;
            let mut hashes = 0;
            while c.get(j) == Some(&'#') {
                hashes += 1;
                j += 1;
            }
            j += 1; // the opening quote
            loop {
                if j >= c.len() {
                    break;
                }
                if c[j] == '"' && (0..hashes).all(|k| c.get(j + 1 + k) == Some(&'#')) {
                    j += 1 + hashes;
                    break;
                }
                j += 1;
            }
            while i < j.min(c.len()) {
                out.push(blank(c[i]));
                i += 1;
            }
        } else if ch == '"' {
            out.push(' ');
            i += 1;
            while i < c.len() && c[i] != '"' {
                if c[i] == '\\' {
                    out.push(' ');
                    i += 1;
                }
                if i < c.len() {
                    out.push(blank(c[i]));
                    i += 1;
                }
            }
            out.push(' ');
            i += 1;
        } else if ch == '\'' {
            // a character literal ('x', '\n', '\u{..}') or a lifetime ('a)
            let is_char = next == '\\' || (c.get(i + 2) == Some(&'\'') && next != '\'');
            if is_char {
                out.push(' ');
                i += 1;
                while i < c.len() && c[i] != '\'' {
                    if c[i] == '\\' {
                        out.push(' ');
                        i += 1;
                    }
                    if i < c.len() {
                        out.push(' ');
                        i += 1;
                    }
                }
                out.push(' ');
                i += 1;
            } else {
                out.push(ch);
                i += 1;
            }
        } else {
            out.push(ch);
            i += 1;
        }
    }
    out
}

fn is_raw_start(c: &[char], i: usize) -> bool {
    // `r"`, `r#"`, `r##"` ... and not the tail of an identifier such as `for"`
    if i > 0 && (c[i - 1].is_alphanumeric() || c[i - 1] == '_') {
        return false;
    }
    let mut j = i + 1;
    while c.get(j) == Some(&'#') {
        j += 1;
    }
    c.get(j) == Some(&'"')
}

fn is_ident(ch: char) -> bool {
    ch.is_alphanumeric() || ch == '_'
}

/// Offending tokens in already-stripped code: float types, float suffixes, float literals.
fn float_tokens(code: &str) -> Vec<(usize, String)> {
    let float_a = ["f", "32"].concat();
    let float_b = ["f", "64"].concat();
    let mut bad = Vec::new();
    for (ln, line) in code.lines().enumerate() {
        let c: Vec<char> = line.chars().collect();
        let mut i = 0;
        while i < c.len() {
            if c[i].is_ascii_digit() && (i == 0 || !(is_ident(c[i - 1]) || c[i - 1] == '.')) {
                // a numeric literal
                let start = i;
                let hex = c[i] == '0' && matches!(c.get(i + 1), Some('x' | 'X' | 'b' | 'o'));
                if hex {
                    i += 2;
                    while i < c.len() && (c[i].is_ascii_hexdigit() || c[i] == '_') {
                        i += 1;
                    }
                    // an integer suffix like u64 stays attached; nothing to flag here
                    while i < c.len() && is_ident(c[i]) {
                        i += 1;
                    }
                    continue;
                }
                while i < c.len() && (c[i].is_ascii_digit() || c[i] == '_') {
                    i += 1;
                }
                let mut float = false;
                if c.get(i) == Some(&'.') && c.get(i + 1).is_some_and(char::is_ascii_digit) {
                    float = true;
                    i += 1;
                    while i < c.len() && (c[i].is_ascii_digit() || c[i] == '_') {
                        i += 1;
                    }
                }
                if matches!(c.get(i), Some('e' | 'E'))
                    && (c.get(i + 1).is_some_and(char::is_ascii_digit)
                        || (matches!(c.get(i + 1), Some('+' | '-'))
                            && c.get(i + 2).is_some_and(char::is_ascii_digit)))
                {
                    float = true;
                    i += 2;
                    while i < c.len() && c[i].is_ascii_digit() {
                        i += 1;
                    }
                }
                let suffix_start = i;
                while i < c.len() && is_ident(c[i]) {
                    i += 1;
                }
                let suffix: String = c[suffix_start..i].iter().collect();
                if suffix == float_a || suffix == float_b {
                    float = true;
                }
                if float {
                    bad.push((ln + 1, c[start..i].iter().collect()));
                }
            } else if is_ident(c[i]) {
                let start = i;
                while i < c.len() && is_ident(c[i]) {
                    i += 1;
                }
                let word: String = c[start..i].iter().collect();
                if word == float_a || word == float_b {
                    bad.push((ln + 1, word));
                }
            } else {
                i += 1;
            }
        }
    }
    bad
}

#[test]
fn the_detector_can_turn_red() {
    // If the detector were broken it would let these through and the game's float check would be
    // decoration. Build the offending text from pieces so this file stays clean under a plain grep.
    let ty = ["f", "64"].concat();
    let ty32 = ["f", "32"].concat();
    let samples = [
        format!("fn x() {{ let a: {ty} = 1; }}"),
        format!("let b = 3 as {ty32};"),
        "let c = 1.5;".to_string(),
        "let d = 2e3;".to_string(),
        "let e = 7.0e-3;".to_string(),
        format!("let g = 1{ty};"),
        format!("let h = 0.25_{ty32};"),
    ];
    for s in &samples {
        assert!(
            !float_tokens(&code_only(s)).is_empty(),
            "the detector missed: {s}"
        );
    }
    // and it must leave integer code, tuple fields, ranges, hex and cited text alone
    let clean = [
        "let a = 0..5; let b = t.0.1; let c = x.0.max(3); let d = 0xe5; let e = 1_000u64;",
        "let s = \"-1.324979e+24 and 1.5 are only text\";",
        "// 1.5 in a comment\nlet z = 3; /* 2.5 */ let r = r#\"4.5\"#;",
        "let ch = '.'; let q = '\\''; fn lt<'a>(x: &'a str) -> &'a str { x }",
        "let ver = \"1.81.0\"; let big = 18446744073709551615u64;",
    ];
    for s in clean {
        let bad = float_tokens(&code_only(s));
        assert!(bad.is_empty(), "false alarm on {s:?}: {bad:?}");
    }
}

#[test]
fn no_float_type_suffix_or_literal_anywhere_in_the_game() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let mut files = Vec::new();
    for d in ["src", "tests", "examples"] {
        rust_files(&root.join(d), &mut files);
    }
    assert!(files.len() >= 20, "found only {} source files", files.len());
    let mut offences = Vec::new();
    for f in &files {
        let text = fs::read_to_string(f).expect("read source");
        for (line, tok) in float_tokens(&code_only(&text)) {
            offences.push(format!("{}:{line}: {tok}", f.display()));
        }
    }
    assert!(
        offences.is_empty(),
        "float_used=1:\n{}",
        offences.join("\n")
    );
}

#[test]
fn the_plain_grep_of_the_gate_finds_nothing_in_src_or_tests() {
    // The design's gate: a plain grep for the two float type names over src and tests must print nothing. Even a string may not
    // carry the names, so a hash that happened to spell one would have been caught here too.
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let a = ["f", "32"].concat();
    let b = ["f", "64"].concat();
    let mut files = Vec::new();
    for d in ["src", "tests"] {
        rust_files(&root.join(d), &mut files);
    }
    for f in files {
        let text = fs::read_to_string(&f).unwrap();
        for (n, l) in text.lines().enumerate() {
            assert!(
                !l.contains(&a) && !l.contains(&b),
                "{}:{}: {l}",
                f.display(),
                n + 1
            );
        }
    }
}

#[test]
fn the_crate_refuses_float_arithmetic_at_compile_time_and_has_one_dependency() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let lints =
        "#![deny(clippy::float_arithmetic, clippy::cast_precision_loss, clippy::float_cmp)]";
    let squash = |s: &str| s.split_whitespace().collect::<String>();
    for f in ["src/lib.rs", "src/main.rs"] {
        let t = fs::read_to_string(root.join(f)).unwrap();
        // rustfmt may wrap the attribute over several lines: compare without whitespace
        assert!(
            squash(&t).contains(&squash(lints)),
            "{f} lacks the crate-level float lints"
        );
        assert!(
            t.contains("#![forbid(unsafe_code)]"),
            "{f} lacks forbid(unsafe_code)"
        );
    }
    let manifest = fs::read_to_string(root.join("Cargo.toml")).unwrap();
    let deps: Vec<&str> = manifest
        .split("[dependencies]")
        .nth(1)
        .unwrap()
        .lines()
        .skip(1)
        .take_while(|l| !l.starts_with('['))
        .filter(|l| !l.trim().is_empty() && !l.trim_start().starts_with('#'))
        .collect();
    assert_eq!(deps.len(), 1, "{deps:?}");
    assert!(
        deps[0].starts_with("asolaria-tribit") && deps[0].contains("path = \"../kernel/tribit\"")
    );
    let tc = fs::read_to_string(root.join("rust-toolchain.toml")).unwrap();
    assert!(tc.contains("channel = \"1.81.0\""));
    assert!(manifest.contains("rust-version = \"1.81\""));
}
