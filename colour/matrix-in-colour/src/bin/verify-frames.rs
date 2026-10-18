//! `verify-frames [REPO]`: the vendored verify-frames.py in integers. REPO defaults to the
//! vendored repository (verify-frames.py:20 names the owner's Windows checkout instead).

use matrix_in_colour::{verify_frames, VENDOR};
use std::io::Write;
use std::path::PathBuf;
use std::process::ExitCode;

fn main() -> ExitCode {
    let args: Vec<_> = std::env::args_os().skip(1).collect();
    let repo = match args.as_slice() {
        [] => PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(VENDOR),
        [p] => PathBuf::from(p),
        _ => {
            eprintln!("usage: verify-frames [REPO]");
            return ExitCode::from(2);
        }
    };
    match verify_frames(&repo) {
        Ok(report) => {
            let (text, code) = report.render();
            if std::io::stdout().write_all(text.as_bytes()).is_err() {
                return ExitCode::FAILURE;
            }
            ExitCode::from(code)
        }
        Err(e) => {
            eprintln!("verify-frames: {e}");
            ExitCode::FAILURE
        }
    }
}
