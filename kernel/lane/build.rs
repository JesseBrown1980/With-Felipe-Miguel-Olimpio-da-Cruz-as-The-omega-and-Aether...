//! Compiles the vendored upstream `init.rs` (byte-identical on disk, `UPSTREAM.sha256`) into the
//! `init` module. `include!` rejects inner doc comments, so every line that starts with `//!` is
//! written to `OUT_DIR/init.rs` starting with `//` instead; no other byte changes.

use std::{env, fs, path::PathBuf};

const UPSTREAM_INIT: &str = "vendor/federation-1024/kernel/boot/src/init.rs";

fn main() {
    println!("cargo:rerun-if-changed={UPSTREAM_INIT}");
    let source = fs::read_to_string(UPSTREAM_INIT).expect("vendored init.rs is readable");
    let mut out = String::with_capacity(source.len());
    for line in source.split_inclusive('\n') {
        match line.strip_prefix("//!") {
            Some(rest) => {
                out.push_str("//");
                out.push_str(rest);
            }
            None => out.push_str(line),
        }
    }
    let dir = PathBuf::from(env::var_os("OUT_DIR").expect("cargo sets OUT_DIR"));
    fs::write(dir.join("init.rs"), out).expect("OUT_DIR is writable");
}
