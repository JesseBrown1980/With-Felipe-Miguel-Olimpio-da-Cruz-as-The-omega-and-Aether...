//! Prints what `node <script>.mjs` prints for one vendored script, for `cmp` against
//! `python3 -I tools/ste_referee.py --stdout <script>`.

use std::process::ExitCode;

use ste_certificate::{cross_fix, distance_probe, sidon_probe};

fn main() -> ExitCode {
    let script = std::env::args().nth(1).unwrap_or_default();
    let lines = match script.as_str() {
        "sidon-cross-fix" => cross_fix::stdout_lines(&cross_fix::certificate()),
        "distance-probe" => distance_probe::stdout_lines(),
        "sidon-probe" => sidon_probe::stdout_lines(),
        _ => {
            eprintln!("usage: ste_stdout sidon-cross-fix|distance-probe|sidon-probe");
            return ExitCode::from(2);
        }
    };
    for line in lines {
        println!("{line}");
    }
    ExitCode::SUCCESS
}
