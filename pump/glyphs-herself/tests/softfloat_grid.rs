//! Every emulated IEEE operation against the referee's integer-only oracle over a seeded grid
//! (`tests/vectors/softfloat_grid.bin`, 17 operations x 1,024 cases, results as u64 bit
//! patterns). The operands are the splitmix64 draws `referee/dump_vectors.py::grid_case` makes.
mod common;

use common::{vec_path, SplitMix64};
use pump_glyphs_herself::softfloat::{
    absdiff32, add32, div32, fma, int_to_f32_bits, mul32, round_f32_int, sqrt32, Dbl,
};

const OPS: [&str; 17] = [
    "add",
    "sub",
    "mul",
    "div",
    "sqrt",
    "fma",
    "to_f32_bits",
    "round_f32",
    "dec6",
    "ratio",
    "add32",
    "absdiff32",
    "mul32",
    "div32",
    "sqrt32",
    "round_f32_int",
    "int_to_f32_bits",
];
const CASES: usize = 1024;
const M52: u64 = (1 << 52) - 1;
const M23: u64 = (1 << 23) - 1;

fn rand64(r: &mut SplitMix64, lo: i64, hi: i64) -> (u64, i64) {
    let e = lo + (r.next() % (hi - lo) as u64) as i64;
    ((((e + 1023) as u64) << 52) | (r.next() & M52), e)
}

fn rand32(r: &mut SplitMix64, lo: i64, hi: i64) -> (u32, i64) {
    let e = lo + (r.next() % (hi - lo) as u64) as i64;
    (((((e + 127) as u64) << 23) | (r.next() & M23)) as u32, e)
}

fn d(bits: u64) -> Dbl {
    Dbl::from_bits(bits)
}

fn s(bits: u32) -> Dbl {
    Dbl::from_f32_bits(bits)
}

fn case(op: &str, r: &mut SplitMix64) -> u64 {
    match op {
        "add" | "sub" => {
            let (mut a, ea) = rand64(r, -60, 60);
            let eb = ea - (r.next() % 141) as i64;
            let mut b = (((eb + 1023) as u64) << 52) | (r.next() & M52);
            if op == "sub" && b > a {
                std::mem::swap(&mut a, &mut b);
            }
            if op == "add" {
                (d(a) + d(b)).to_bits()
            } else {
                (d(a) - d(b)).to_bits()
            }
        }
        "mul" | "div" => {
            let (a, _) = rand64(r, -200, 200);
            let (b, _) = rand64(r, -200, 200);
            if op == "mul" {
                (d(a) * d(b)).to_bits()
            } else {
                (d(a) / d(b)).to_bits()
            }
        }
        "sqrt" => d(rand64(r, -200, 200).0).sqrt().to_bits(),
        "fma" => {
            let (a, ea) = rand64(r, -60, 60);
            let (b, eb) = rand64(r, -60, 60);
            let ec = ea + eb + (r.next() % 241) as i64 - 120;
            let mut c = (((ec + 1023) as u64) << 52) | (r.next() & M52);
            if r.next() % 8 == 0 {
                c = 0;
            }
            fma(d(a), d(b), d(c)).to_bits()
        }
        "to_f32_bits" => u64::from(d(rand64(r, -120, 120).0).to_f32_bits()),
        "round_f32" => d(rand64(r, -120, 120).0).round_f32().to_bits(),
        "dec6" => d(rand64(r, -30, 30).0).round_decimal_units(6) as u64,
        "ratio" => {
            let num = (r.next() >> (r.next() % 64)).max(1);
            let den = (r.next() >> (r.next() % 64)) | 1;
            Dbl::from_ratio(num, den).to_bits()
        }
        "add32" | "absdiff32" => {
            let (a, ea) = rand32(r, -40, 40);
            let eb = ea - (r.next() % 40) as i64;
            let b = ((((eb + 127) as u64) << 23) | (r.next() & M23)) as u32;
            let v = if op == "add32" {
                add32(s(a), s(b))
            } else {
                absdiff32(s(a), s(b))
            };
            u64::from(v.to_f32_bits())
        }
        "mul32" | "div32" => {
            let (a, _) = rand32(r, -60, 60);
            let (b, _) = rand32(r, -60, 60);
            let v = if op == "mul32" {
                mul32(s(a), s(b))
            } else {
                div32(s(a), s(b))
            };
            u64::from(v.to_f32_bits())
        }
        "sqrt32" => u64::from(sqrt32(s(rand32(r, -120, 120).0)).to_f32_bits()),
        "round_f32_int" => round_f32_int(r.next() >> (r.next() % 64)),
        "int_to_f32_bits" => u64::from(int_to_f32_bits(round_f32_int(r.next() >> (r.next() % 64)))),
        _ => unreachable!(),
    }
}

#[test]
fn every_operation_matches_the_integer_oracle() {
    let want = std::fs::read(vec_path("softfloat_grid.bin")).unwrap();
    assert_eq!(want.len(), OPS.len() * CASES * 8);
    let mut failures = Vec::new();
    for (i, op) in OPS.iter().enumerate() {
        let mut r = SplitMix64(0x5EED_0000 + i as u64);
        let mut bad = 0;
        for c in 0..CASES {
            let o = (i * CASES + c) * 8;
            let w = u64::from_le_bytes(want[o..o + 8].try_into().unwrap());
            if case(op, &mut r) != w {
                bad += 1;
            }
        }
        if bad > 0 {
            failures.push(format!("{op}: {bad} of {CASES}"));
        }
    }
    assert!(failures.is_empty(), "disagreements: {failures:?}");
}
