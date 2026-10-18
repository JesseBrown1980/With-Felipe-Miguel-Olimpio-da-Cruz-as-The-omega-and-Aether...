//! Reads `python3 -I tools/referee.py --grid N` lines on stdin and recomputes every lane with every
//! vendored implementation, then decodes each one back. Prints one HBP summary row.
//! Exits 1 on any difference.

use quant_exact::dbbh::{self, Level};
use quant_exact::slice_harness as harness;
use quant_exact::{qprism_dbbh_ladder, qprism_transcode};
use std::io::BufRead;

fn stream_sha(symbols: &[u16]) -> String {
    let bytes: Vec<u8> = symbols.iter().flat_map(|s| s.to_be_bytes()).collect();
    dbbh::sha256_hex(&bytes)
}

fn field<'a>(row: &'a str, key: &str) -> &'a str {
    row.split('|')
        .find_map(|p| p.strip_prefix(key).and_then(|v| v.strip_prefix('=')))
        .unwrap_or_else(|| panic!("row has no {key}"))
}

/// Symbols from all implementations of one width, or None if any two differ or any decoder fails.
fn lane(data: &[u8], width: u8, level: Level) -> Option<Vec<u16>> {
    let a = dbbh::to_level(data, level);
    let mut same = a == harness::to_symbols(data, u32::from(width))
        && a == qprism_dbbh_ladder::pack(data, width)
        && dbbh::from_level(&a, level, data.len()) == data
        && harness::from_symbols(&a, u32::from(width), data.len()) == data
        && qprism_dbbh_ladder::unpack(&a, width, data.len()) == data;
    if width == 10 {
        same = same
            && a == qprism_transcode::transcode_256_to_1024(data)
            && qprism_transcode::transcode_1024_to_256(&a, data.len()) == data;
    }
    same.then_some(a)
}

fn main() {
    let (mut lines, mut differences) = (0usize, 0usize);
    for row in std::io::stdin().lock().lines() {
        let row = row.expect("stdin line");
        if !row.starts_with("GRID|") {
            continue;
        }
        lines += 1;
        let data = harness::unhex(field(&row, "hex"));
        let mut ok = true;
        for (key, width, level) in [
            ("b64", 6, Level::Behcs64),
            ("b256", 8, Level::Behcs256),
            ("b1024", 10, Level::Behcs1024),
        ] {
            ok &= lane(&data, width, level).is_some_and(|s| stream_sha(&s) == field(&row, key));
        }
        let mut framed = dbbh::to_level(&data, Level::Behcs1024);
        framed.resize(data.len().div_ceil(5) * 4, 0);
        ok &= stream_sha(&framed) == field(&row, "framed40");
        let tuples = dbbh::to_hyperbehcs(&data);
        let flat: Vec<u16> = tuples.iter().flat_map(|t| t.iter().copied()).collect();
        let glyphs = data.len() * 8;
        ok &= stream_sha(&flat) == field(&row, "hyper60")
            && dbbh::from_hyperbehcs(&tuples, glyphs.div_ceil(10), data.len()) == data;
        if !ok {
            differences += 1;
            eprintln!("GRIDDIFF|i={}|json=0", field(&row, "i"));
        }
    }
    println!("GRIDRESULT|lines={lines}|differences={differences}|json=0");
    if lines == 0 || differences > 0 {
        std::process::exit(1);
    }
}
