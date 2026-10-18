//! `pump herself <seed-dir> <out>`  — regenerate ASOLARIA-HERSELF.gguf (lines 1-235).
//! `pump glyphs-mythos <seed> <out>` — regenerate ASOLARIA-MYTHOS-SELF-GLYPHS-256.gguf.
#![forbid(unsafe_code)]
use pump_glyphs_herself::{herself, mythos};
use std::fs::File;
use std::io::{BufWriter, Write};
use std::path::Path;
use std::process::ExitCode;

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 4 {
        eprintln!("usage: pump <herself|glyphs-mythos> <seed> <out>");
        return ExitCode::FAILURE;
    }
    let (cmd, seed, out) = (&args[1], Path::new(&args[2]), Path::new(&args[3]));
    match cmd.as_str() {
        "herself" => match herself::generate(seed) {
            Ok(bytes) => {
                if let Err(e) = std::fs::write(out, &bytes) {
                    eprintln!("write: {e}");
                    return ExitCode::FAILURE;
                }
                println!("{} bytes {}", out.display(), bytes.len());
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("herself: {e}");
                ExitCode::FAILURE
            }
        },
        "glyphs-mythos" => {
            let f = match File::create(out) {
                Ok(f) => f,
                Err(e) => {
                    eprintln!("create: {e}");
                    return ExitCode::FAILURE;
                }
            };
            let mut w = BufWriter::new(f);
            match mythos::generate_to(seed, &mut w) {
                Ok(_) => {
                    let _ = w.flush();
                    ExitCode::SUCCESS
                }
                Err(e) => {
                    eprintln!("glyphs-mythos: {e}");
                    ExitCode::FAILURE
                }
            }
        }
        _ => {
            eprintln!("unknown command {cmd}");
            ExitCode::FAILURE
        }
    }
}
