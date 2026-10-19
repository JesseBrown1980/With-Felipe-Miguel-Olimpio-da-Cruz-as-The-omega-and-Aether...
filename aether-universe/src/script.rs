//! `--script <file>`: read commands from a file instead of stdin.
//!
//! Lines starting with `#` are comments and blank lines are ignored. The script's SHA-256 goes into
//! every snapshot's TICK row (as `script=<sha16>`) and into the final seal, so a run is named by its
//! seed and its script, and anyone with both can reproduce it to the digit.

use crate::commands::is_script_command;
use crate::sha256::sha256_hex;
use std::fs;
use std::io;
use std::path::Path;

/// A loaded script: its command lines, and the SHA-256 of the file's exact bytes.
#[derive(Debug, PartialEq, Eq)]
pub struct Script {
    pub lines: Vec<String>,
    pub sha256: String,
}

/// Parse script text: keep command lines, drop comments and blanks.
pub fn parse(text: &str) -> Vec<String> {
    text.lines()
        .filter(|l| is_script_command(l))
        .map(|l| l.trim().to_string())
        .collect()
}

/// Read a script file and hash its bytes as they are on disk.
pub fn load(path: &Path) -> io::Result<Script> {
    let bytes = fs::read(path)?;
    let text = String::from_utf8_lossy(&bytes);
    Ok(Script {
        lines: parse(&text),
        sha256: sha256_hex(&bytes),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn comments_and_blanks_are_dropped_and_commands_are_trimmed() {
        let t = "# a comment\n\nlook\n   go flow  \n  # indented\nsolve 27:13\r\n";
        assert_eq!(parse(t), vec!["look", "go flow", "solve 27:13"]);
        assert!(parse("").is_empty());
        assert!(parse("# only a comment").is_empty());
    }

    #[test]
    fn the_hash_is_of_the_exact_bytes() {
        let dir =
            std::env::temp_dir().join(format!("aether-universe-script-{}", std::process::id()));
        let _ = fs::create_dir_all(&dir);
        let p = dir.join("s.aether");
        fs::write(&p, "look\n").unwrap();
        let a = load(&p).unwrap();
        assert_eq!(a.sha256, sha256_hex(b"look\n"));
        fs::write(&p, "look\n\n").unwrap();
        let b = load(&p).unwrap();
        assert_ne!(
            a.sha256, b.sha256,
            "a trailing blank line is a different script"
        );
        assert_eq!(a.lines, b.lines);
        assert!(load(&dir.join("nope.aether")).is_err());
        let _ = fs::remove_dir_all(&dir);
    }
}
