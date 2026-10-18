//! Reads `python3 -I tools/referee.py --grid N` on stdin and checks every line against this crate:
//! binary64 `+ - * /`, `Math.sqrt`, `Math.round`, `Number::toString`, and V8's fdlibm
//! `Math.atan2`, `Math.acos`, `Math.sin`, `Math.cos`. Exits 1 on any difference.

use quant_hyperbehcs::{fdlibm, number_to_string, Number};
use std::collections::BTreeMap;
use std::io::{self, BufRead};
use std::process::ExitCode;

fn parse(field: &str) -> Number {
    if field == "nan" {
        Number::NAN
    } else {
        Number::from_bits(u64::from_str_radix(field, 16).expect("hex bit pattern"))
    }
}

fn show(x: Number) -> String {
    if x.is_nan() {
        "nan".to_string()
    } else {
        format!("{:016x}", x.to_bits())
    }
}

fn main() -> ExitCode {
    let mut counts: BTreeMap<String, (u64, u64)> = BTreeMap::new();
    let mut failed = 0u64;
    let mut lines = 0u64;
    for line in io::stdin().lock().lines() {
        let line = line.expect("stdin");
        if line.is_empty() {
            continue;
        }
        let f: Vec<&str> = line.split('|').collect();
        let (got, want) = match f[0] {
            "add" => (show(parse(f[1]) + parse(f[2])), f[3]),
            "sub" => (show(parse(f[1]) - parse(f[2])), f[3]),
            "mul" => (show(parse(f[1]) * parse(f[2])), f[3]),
            "div" => (show(parse(f[1]) / parse(f[2])), f[3]),
            "sqrt" => (show(parse(f[1]).sqrt()), f[2]),
            "round" => (show(parse(f[1]).js_round()), f[2]),
            "str" => (number_to_string(parse(f[1])), f[2]),
            "atan2" => (show(fdlibm::atan2(parse(f[1]), parse(f[2]))), f[3]),
            "acos" => (show(fdlibm::acos(parse(f[1]))), f[2]),
            "sin" => (show(fdlibm::sin(parse(f[1]))), f[2]),
            "cos" => (show(fdlibm::cos(parse(f[1]))), f[2]),
            op => panic!("unknown operation {op}"),
        };
        lines += 1;
        let entry = counts.entry(f[0].to_string()).or_insert((0, 0));
        entry.1 += 1;
        if got == want {
            entry.0 += 1;
        } else {
            failed += 1;
            if failed <= 20 {
                eprintln!("GRID_DIFF|line={line}|rust={got}");
            }
        }
    }
    let summary: Vec<String> = counts
        .iter()
        .map(|(op, (pass, total))| format!("{op}={pass}/{total}"))
        .collect();
    println!(
        "GRID|lines={lines}|failed={failed}|{}|json=0",
        summary.join("|")
    );
    if failed == 0 && lines > 0 {
        ExitCode::SUCCESS
    } else {
        ExitCode::FAILURE
    }
}
