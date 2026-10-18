//! Compares the port with `python3 -I tools/referee.py --grid N` read on stdin: random byte
//! inputs through the ingest rows, random sector PIDs through `geniusScore` + `toFixed(6)`, and
//! random Hilbert indices. Prints one `GRID|...` row; exits 1 on any difference.

use quant_cubes::ingest::ingest;
use quant_cubes::whiteroom::{genius_score, hilbert_d2xy, to_fixed6};
use std::io::BufRead;

fn field<'a>(row: &'a str, key: &str) -> &'a str {
    row.split('|')
        .find_map(|p| p.strip_prefix(key).and_then(|r| r.strip_prefix('=')))
        .unwrap_or_else(|| panic!("no {key} in {row}"))
}

fn unhex(s: &str) -> Vec<u8> {
    (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&s[i..i + 2], 16).expect("hex"))
        .collect()
}

fn main() {
    let lines: Vec<String> = std::io::stdin()
        .lock()
        .lines()
        .map(|l| l.expect("stdin"))
        .collect();
    let (mut ingests, mut scores, mut hilberts, mut diff) = (0, 0, 0, 0);
    let mut i = 0;
    while i < lines.len() {
        let row = &lines[i];
        if row.starts_with("ICASE|") {
            let got = ingest(&unhex(field(row, "hex"))).rows();
            for (k, g) in got.iter().enumerate() {
                let g = g.replace('\r', "\\r").replace('\n', "\\n");
                if g != lines[i + 1 + k] {
                    diff += 1;
                    eprintln!("DIFF|case={row}|row={k}|json=0");
                }
            }
            ingests += 1;
            i += 7;
            continue;
        }
        if row.starts_with("SCASE|") {
            if to_fixed6(genius_score(field(row, "pid"))) != field(row, "score") {
                diff += 1;
                eprintln!("DIFF|case={row}|json=0");
            }
            scores += 1;
        } else if row.starts_with("HCASE|") {
            let n = field(row, "n").parse().expect("n");
            let d = field(row, "d").parse().expect("d");
            let (x, y) = hilbert_d2xy(n, d);
            if format!("{x},{y}") != field(row, "xy") {
                diff += 1;
                eprintln!("DIFF|case={row}|json=0");
            }
            hilberts += 1;
        }
        i += 1;
    }
    println!("GRID|ingest={ingests}|score={scores}|hilbert={hilberts}|diff={diff}|json=0");
    if diff != 0 || ingests == 0 {
        std::process::exit(1);
    }
}
