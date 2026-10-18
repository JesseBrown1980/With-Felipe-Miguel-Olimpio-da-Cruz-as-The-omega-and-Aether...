//! Emits what the CI compares against the referee and the upstream bytes.
//!
//! `emit colorpid-domain` prints the whole-domain ColorPID digest row;
//! `emit stars <dir>` writes `ASOLARIA-STARS-SHELLS.gguf` and `FABLE5-STARS-SHELLS.hbp`;
//! `emit rainbow27-v2 <file>` writes the 59,049-row trace.

use colour::{colorpid, rainbow27v2, stars};
use sha2::{Digest, Sha256};
use std::{env, fs, path::Path, process::ExitCode};

/// The referee's 42-byte digest record of one colour (`referee/colour_referee.py:615-619`,
/// `<BBddddd` as bit patterns: rainbow12, sphere27, h, s, v, s*v, blast_radius). A check
/// format, not upstream output.
fn colorpid_record(c: [u8; 3]) -> [u8; 42] {
    let (h, s, v) = colorpid::hsv(c);
    let mut out = [0u8; 42];
    out[0] = colorpid::rainbow12(c);
    out[1] = colorpid::sphere27(c);
    for (i, x) in [h, s, v, s * v, colorpid::blast_radius(c)]
        .iter()
        .enumerate()
    {
        out[2 + 8 * i..10 + 8 * i].copy_from_slice(&x.to_bits().to_le_bytes());
    }
    out
}

fn colorpid_domain() -> String {
    let mut h = Sha256::new();
    for r in 0..=255u8 {
        for g in 0..=255u8 {
            for b in 0..=255u8 {
                h.update(colorpid_record([r, g, b]));
            }
        }
    }
    format!(
        "COLORPID_DOMAIN|colours=16777216|record=rainbow12,sphere27,h,s,v,saturation,blast_radius\
         |sha256={}|json=0",
        colour::hex(&h.finalize())
    )
}

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();
    match args
        .iter()
        .map(String::as_str)
        .collect::<Vec<_>>()
        .as_slice()
    {
        ["colorpid-domain"] => println!("{}", colorpid_domain()),
        ["stars", dir] => {
            let seed = fs::read("vendor/universe-simulator/gguf/stars/MYTHOS-SELF-EMISSION.txt")
                .expect("seed");
            let out = stars::regenerate(&seed, stars::MAXR);
            let dir = Path::new(dir);
            fs::create_dir_all(dir).expect("output directory");
            fs::write(dir.join(stars::GGUF_NAME), &out.gguf).expect("gguf");
            fs::write(dir.join("FABLE5-STARS-SHELLS.hbp"), &out.receipt).expect("receipt");
        }
        ["rainbow27-v2", file] => {
            let (trace, _, _) = rainbow27v2::trace();
            fs::write(file, trace).expect("trace");
        }
        _ => {
            eprintln!("usage: emit colorpid-domain | stars <dir> | rainbow27-v2 <file>");
            return ExitCode::from(2);
        }
    }
    ExitCode::SUCCESS
}
