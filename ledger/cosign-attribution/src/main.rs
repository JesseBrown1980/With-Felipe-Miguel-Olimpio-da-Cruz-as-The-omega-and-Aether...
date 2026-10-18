//! `cosign-attribution <chain.ndjson>` (Claude's addition; not the default verifier).
//!
//! Prints the default cosign verify counts (routes.rs:99-152, computed the same way), then the
//! labelled attribution section. HBP text rows on stdout.

#![forbid(unsafe_code)]

use std::path::PathBuf;
use std::process::ExitCode;

use asolaria_cosign_attribution::{render, verify_and_attribute_path};

fn main() -> ExitCode {
    let mut args = std::env::args_os().skip(1);
    let (Some(path), None) = (args.next(), args.next()) else {
        eprintln!("usage: cosign-attribution <chain.ndjson>");
        return ExitCode::from(2);
    };
    print!(
        "{}",
        render(&verify_and_attribute_path(&PathBuf::from(path)))
    );
    ExitCode::SUCCESS
}
