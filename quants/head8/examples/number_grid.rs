//! Reads `op a b want` rows from `tools/referee.py --grid` or `--log2-grid` and checks each
//! against `Number` and `log2`; `a`, `b` and `want` are bit patterns (`nan` for every NaN).

use quant_head8::log2::log2;
use quant_head8::Number;
use std::io::BufRead;

fn hex(field: &str) -> Number {
    Number::from_bits(u64::from_str_radix(field, 16).expect("hex bits"))
}

fn shown(x: Number) -> String {
    if x.is_nan() {
        "nan".to_string()
    } else {
        format!("{:016x}", x.to_bits())
    }
}

fn main() {
    let (mut cases, mut differences) = (0u64, 0u64);
    for line in std::io::stdin().lock().lines() {
        let line = line.expect("stdin");
        let field: Vec<&str> = line.split(' ').collect();
        let (a, b) = (hex(field[1]), hex(field[2]));
        let got = match field[0] {
            "add" => shown(a + b),
            "sub" => shown(a - b),
            "mul" => shown(a * b),
            "div" => shown(a / b),
            "lt" => u8::from(a.lt(b)).to_string(),
            "eq" => u8::from(a.js_eq(b)).to_string(),
            "round" => shown(a.js_round()),
            "int32" => a.to_int32().to_string(),
            "log2" => shown(log2(a)),
            op => panic!("unknown op {op}"),
        };
        cases += 1;
        if got != field[3] {
            differences += 1;
            eprintln!("DIFFERENT|row={line}|got={got}|json=0");
        }
    }
    println!("NUMBER_GRID|cases={cases}|differences={differences}|json=0");
    if differences > 0 || cases == 0 {
        std::process::exit(1);
    }
}
