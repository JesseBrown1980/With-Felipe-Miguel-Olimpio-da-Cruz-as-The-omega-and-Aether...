//! Writes HBP rows to stdout: `emit full` (the stream `tools/referee.py --check --rust FILE`
//! compares), `emit fixture`, or `emit measure FILE...` (one `MEASURE_RUST` row per input file,
//! which `tools/referee.py --measure --rust-measure FILE` compares with the owner's `measure()`
//! inputs written by `--write-inputs`).

#[path = "../tests/common/rows.rs"]
mod rows;

use std::io::{BufWriter, Write};

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let which = args.first().map(String::as_str).unwrap_or("full");
    let stdout = std::io::stdout();
    let mut out = BufWriter::new(stdout.lock());
    let mut failed = false;
    if which == "measure" {
        for path in &args[1..] {
            let data = match std::fs::read(path) {
                Ok(d) => d,
                Err(e) => {
                    eprintln!("emit measure: {path}: {e}");
                    std::process::exit(1);
                }
            };
            let name = std::path::Path::new(path)
                .file_name()
                .map(|s| s.to_string_lossy().into_owned())
                .unwrap_or_default();
            if writeln!(out, "{}", rows::measure_row(&name, &data)).is_err() {
                failed = true;
            }
        }
    } else {
        let set = match which {
            "full" => &rows::FULL,
            "fixture" => &rows::FIXTURE,
            other => {
                eprintln!("usage: emit [full|fixture|measure FILE...] (got {other})");
                std::process::exit(2);
            }
        };
        rows::emit(set, &mut |row| {
            if !failed && writeln!(out, "{row}").is_err() {
                failed = true;
            }
        });
    }
    if failed || out.flush().is_err() {
        std::process::exit(1);
    }
}
