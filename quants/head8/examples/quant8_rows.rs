//! Prints the `QUANT8` row (the format of tests/fixtures/quant8-expected.hbp) of
//! `quant8(fill(new Float64Array(Math.floor(mb * 1048576 / 8)), seed))` for each `mb:seed`
//! argument, streaming the message instead of holding it.
//!
//! Usage: `cargo run --release --example quant8_rows -- 256:12345 256:99999`

use quant_head8::{count_sketch, message_dims, quantize, tuple_buffer, Fill};
use sha2::{Digest, Sha256};
use std::fmt::Write;

fn hex(bytes: impl IntoIterator<Item = u8>) -> String {
    bytes.into_iter().fold(String::new(), |mut out, b| {
        let _ = write!(out, "{b:02x}");
        out
    })
}

fn main() {
    let specs: Vec<String> = std::env::args().skip(1).collect();
    if specs.is_empty() {
        eprintln!("usage: quant8_rows <mb>:<seed> ...");
        std::process::exit(2);
    }
    for spec in specs {
        let (mb, seed) = spec.split_once(':').expect("<mb>:<seed>");
        let mb: u64 = mb.parse().expect("mb");
        let seed: u32 = seed.parse().expect("seed");
        let q = quantize(&count_sketch(Fill::new(seed).take(message_dims(mb))));
        let scale = if q.scale.is_nan() {
            "nan".to_string()
        } else {
            format!("{:016x}", q.scale.to_bits())
        };
        println!(
            "QUANT8|name=bench-{mb}mb-seed{seed}|turbo={}|signs={}|zeta={}|triple={}|quad={}|hist={}|vm_acc={}|scale={scale}|tuple_sha256={}",
            hex(q.turbo.iter().map(|&t| t as u8)),
            hex(q.signs),
            hex(q.zeta),
            hex(q.triple.iter().map(|t| t.direction() as u8)),
            hex(q.quad),
            hex(q.hist.iter().flat_map(|h| h.to_le_bytes())),
            q.vm_acc,
            hex(Sha256::digest(tuple_buffer(&q))),
        );
    }
}
