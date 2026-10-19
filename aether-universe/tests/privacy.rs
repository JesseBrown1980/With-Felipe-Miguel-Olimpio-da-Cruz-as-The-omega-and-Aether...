//! Private details stay out. No device serial, no network address, no inbox path, no phone path in
//! the story, the sources, or anything the game prints or writes.
//!
//! The patterns are built from pieces so that this file does not contain what it forbids.

mod common;

use common::*;
use std::fs;
use std::path::Path;

/// Maximal runs of `[0-9A-Z]`: a device serial is one such run of 11 characters starting with `R`.
fn serial_like(text: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut run = String::new();
    for ch in text.chars().chain(std::iter::once(' ')) {
        if ch.is_ascii_digit() || ch.is_ascii_uppercase() {
            run.push(ch);
        } else {
            if run.len() == 11 && run.starts_with('R') && run.chars().any(|c| c.is_ascii_digit()) {
                out.push(run.clone());
            }
            run.clear();
        }
    }
    out
}

/// Four dot-separated groups of one to three digits, bounded by non-numeric characters.
fn ipv4_like(text: &str) -> Vec<String> {
    let b: Vec<char> = text.chars().collect();
    let mut out = Vec::new();
    let mut i = 0;
    while i < b.len() {
        if b[i].is_ascii_digit() && (i == 0 || !(b[i - 1].is_ascii_digit() || b[i - 1] == '.')) {
            let mut j = i;
            let mut groups = 0;
            loop {
                let s = j;
                while j < b.len() && b[j].is_ascii_digit() {
                    j += 1;
                }
                let len = j - s;
                if len == 0 || len > 3 {
                    groups = 0;
                    break;
                }
                groups += 1;
                if groups == 4 {
                    break;
                }
                if j < b.len() && b[j] == '.' && j + 1 < b.len() && b[j + 1].is_ascii_digit() {
                    j += 1;
                } else {
                    groups = 0;
                    break;
                }
            }
            if groups == 4
                && !(j < b.len()
                    && (b[j].is_ascii_digit()
                        || b[j] == '.' && j + 1 < b.len() && b[j + 1].is_ascii_digit()))
            {
                out.push(b[i..j].iter().collect());
                i = j;
                continue;
            }
        }
        i += 1;
    }
    out
}

fn words() -> Vec<String> {
    vec![
        ["in", "box"].concat(),
        ["/sd", "card"].concat(),
        ["/stor", "age/emul", "ated"].concat(),
        ["C:/Users/", "acer"].concat().to_lowercase(),
        ["c", ":/tmp"].concat(),
        ["c", ":/asolaria"].concat(),
    ]
}

fn scan(label: &str, text: &str) {
    assert!(
        serial_like(text).is_empty(),
        "{label}: a serial-shaped token: {:?}",
        serial_like(text)
    );
    assert!(
        ipv4_like(text).is_empty(),
        "{label}: an address: {:?}",
        ipv4_like(text)
    );
    let low = text.to_lowercase();
    for w in words() {
        assert!(!low.contains(&w), "{label}: contains {w}");
    }
}

#[test]
fn the_detectors_can_turn_red() {
    let serial = ["R", "58", "N90", "ABCDE"].concat();
    assert_eq!(serial.len(), 11);
    assert!(!serial_like(&format!("device {serial} here")).is_empty());
    assert!(serial_like("RUPTURE_ZONE and REGIONS and 12345").is_empty());
    assert!(
        serial_like("RRRRRRRRRRR").is_empty(),
        "no digit, so not serial-shaped"
    );
    let ip = ["192", ".168", ".15", ".16"].concat();
    assert!(!ipv4_like(&format!("host {ip} port")).is_empty());
    assert!(!ipv4_like(&["10.0.", "0.1"].concat()).is_empty());
    assert!(ipv4_like("version 1.81.0 and 2026-10-18 and 3.14").is_empty());
    assert!(ipv4_like("1.2.3").is_empty());
    assert!(
        ipv4_like("1.2.3.4.5").is_empty(),
        "five groups is not an address"
    );
}

fn scan_dir(dir: &Path, exts: &[&str]) -> usize {
    let mut n = 0;
    for p in walk(dir) {
        let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("");
        if exts.contains(&ext) {
            let text = fs::read_to_string(&p).unwrap();
            scan(&p.display().to_string(), &text);
            n += 1;
        }
    }
    n
}

#[test]
fn story_and_sources_carry_no_private_details() {
    let root = root();
    assert!(scan_dir(&root.join("story"), &["txt"]) >= 12);
    assert!(scan_dir(&root.join("src"), &["rs"]) >= 18);
    scan(
        "README.md",
        &fs::read_to_string(root.join("README.md")).unwrap_or_default(),
    );
}

#[test]
fn nothing_the_playthrough_prints_or_writes_carries_one() {
    let saves = tmpdir("privacy");
    let (code, out) = run_script_file(cfg(&saves), &playthrough());
    assert_eq!(code, 0);
    scan("stdout", &out);
    let mut n = 0;
    for p in walk(&saves) {
        let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("");
        if ext == "hbp" || ext == "hbi" {
            // the .hbi carries every row twice, once as hex: scan the readable .hbp files only
            if ext == "hbp" {
                scan(&p.display().to_string(), &fs::read_to_string(&p).unwrap());
                n += 1;
            }
        }
    }
    assert!(n > 40);
}

#[test]
fn the_story_names_felipe_and_nothing_else_about_him() {
    let story: String =
        aether_universe::story::CHAPTERS.join("\n") + aether_universe::story::ENDING;
    assert!(story.contains("Felipe"));
    assert!(aether_universe::story::ENDING.contains("Felipe Miguel Olimpio da Cruz"));
    assert!(aether_universe::story::ENDING.contains("the omega and Aether"));
}
