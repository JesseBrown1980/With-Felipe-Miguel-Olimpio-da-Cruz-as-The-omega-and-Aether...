//! Shared helpers for the integration tests. Not a test itself.
#![allow(dead_code)]

use aether_universe::game::{self, Config};
use std::io::Cursor;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};

static COUNTER: AtomicU32 = AtomicU32::new(0);

/// The game folder (the package root), whatever the current directory is.
pub fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

/// Is the game running inside its repository checkout (so the cited files are reachable)?
pub fn in_repo() -> bool {
    root().join("../README.md").is_file()
}

/// A temporary directory that removes itself when the test is done (these are this test run's own
/// scratch, never a record: a failing test keeps nothing it needs here, the assertion carries it).
pub struct Tmp(PathBuf);

impl std::ops::Deref for Tmp {
    type Target = Path;
    fn deref(&self) -> &Path {
        &self.0
    }
}

impl AsRef<Path> for Tmp {
    fn as_ref(&self) -> &Path {
        &self.0
    }
}

impl Drop for Tmp {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

/// A fresh, empty temporary directory, unique to this process and call.
pub fn tmpdir(name: &str) -> Tmp {
    let n = COUNTER.fetch_add(1, Ordering::SeqCst);
    let d = std::env::temp_dir().join(format!(
        "aether-universe-it-{name}-{}-{n}",
        std::process::id()
    ));
    let _ = std::fs::remove_dir_all(&d);
    std::fs::create_dir_all(&d).expect("temp dir");
    Tmp(d)
}

/// A config that never touches the working directory: saves go to `saves`, `data/enwik8` is looked
/// for in an empty folder (so the White Field uses the bundled page, whatever this machine holds),
/// and the Mythos file is read from the repository by absolute path.
pub fn cfg(saves: &Path) -> Config {
    Config {
        saves: saves.to_path_buf(),
        data: saves.join("no-data-here"),
        mythos: root().join("../MYTHOS-BLUE-STAR/ACER-MYTHOS-BLUE.gguf"),
        seat: "TEST-SEAT".to_string(),
        ..Config::default()
    }
}

/// Run a config on piped input; returns `(exit code, stdout)`.
pub fn run_with_input(cfg: Config, input: &str) -> (i32, String) {
    let mut out: Vec<u8> = Vec::new();
    let mut stdin = Cursor::new(input.as_bytes().to_vec());
    let code = game::run(cfg, &mut stdin, &mut out);
    (code, String::from_utf8(out).expect("the game prints utf-8"))
}

/// Run a script file; returns `(exit code, stdout)`.
pub fn run_script_file(mut cfg: Config, script: &Path) -> (i32, String) {
    cfg.script = Some(script.to_path_buf());
    run_with_input(cfg, "")
}

/// Write script text to a file in `dir` and run it.
pub fn run_script_text(cfg: Config, dir: &Path, text: &str) -> (i32, String) {
    let p = dir.join("script.aether");
    std::fs::write(&p, text).expect("write script");
    run_script_file(cfg, &p)
}

pub fn playthrough() -> PathBuf {
    root().join("tests/playthrough.txt")
}

/// The lines of the output that start with a tag (`TAG|`).
pub fn rows_of<'a>(out: &'a str, tag: &str) -> Vec<&'a str> {
    let pre = format!("{tag}|");
    out.lines().filter(|l| l.starts_with(&pre)).collect()
}

/// The value of `key` in one row line.
pub fn field<'a>(row: &'a str, key: &str) -> Option<&'a str> {
    let pre = format!("{key}=");
    row.split('|').find_map(|f| f.strip_prefix(pre.as_str()))
}

/// Every file under `dir`, recursively, as paths.
pub fn walk(dir: &Path) -> Vec<PathBuf> {
    let mut out = Vec::new();
    let mut stack = vec![dir.to_path_buf()];
    while let Some(d) = stack.pop() {
        let Ok(rd) = std::fs::read_dir(&d) else {
            continue;
        };
        for e in rd.flatten() {
            let p = e.path();
            if p.is_dir() {
                stack.push(p);
            } else {
                out.push(p);
            }
        }
    }
    out.sort();
    out
}
