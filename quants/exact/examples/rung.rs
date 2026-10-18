//! Runs a whole file through every vendored rung implementation and back, and prints HBP rows:
//! symbol counts, whether all encoders agree, whether every decoder returns the input, the
//! decoded sha256, and wall time per implementation in milliseconds.
//!
//!   cargo +1.81.0 run --locked --release --example rung -- <file>

use quant_exact::dbbh::{self, Level};
use quant_exact::slice_harness as harness;
use quant_exact::{qprism_dbbh_ladder, qprism_transcode};
use std::time::Instant;

type Encode<'a> = Box<dyn Fn(&[u8]) -> Vec<u16> + 'a>;
type Decode<'a> = Box<dyn Fn(&[u16], usize) -> Vec<u8> + 'a>;

fn main() {
    let path = std::env::args().nth(1).expect("usage: rung <file>");
    let data = std::fs::read(&path).expect("read input file");
    let sha_in = dbbh::sha256_hex(&data);
    println!("RUNGIN|bytes={}|sha256={sha_in}|json=0", data.len());
    for (name, width, level) in [
        ("behcs64", 6u8, Level::Behcs64),
        ("behcs256", 8, Level::Behcs256),
        ("behcs1024", 10, Level::Behcs1024),
    ] {
        let mut impls: Vec<(&str, Encode, Decode)> = vec![
            (
                "dbbh",
                Box::new(move |d| dbbh::to_level(d, level)),
                Box::new(move |s, n| dbbh::from_level(s, level, n)),
            ),
            (
                "harness",
                Box::new(move |d| harness::to_symbols(d, u32::from(width))),
                Box::new(move |s, n| harness::from_symbols(s, u32::from(width), n)),
            ),
            (
                "qprism-ladder",
                Box::new(move |d| qprism_dbbh_ladder::pack(d, width)),
                Box::new(move |s, n| qprism_dbbh_ladder::unpack(s, width, n)),
            ),
        ];
        if width == 10 {
            impls.push((
                "qprism-transcode",
                Box::new(qprism_transcode::transcode_256_to_1024),
                Box::new(qprism_transcode::transcode_1024_to_256),
            ));
        }
        let mut reference: Option<Vec<u16>> = None;
        let (mut agree, mut equal) = (0usize, 0usize);
        let mut decoded_sha = String::new();
        for (who, encode, decode) in &impls {
            let t = Instant::now();
            let symbols = encode(&data);
            let encode_ms = t.elapsed().as_millis();
            let t = Instant::now();
            let back = decode(&symbols, data.len());
            let decode_ms = t.elapsed().as_millis();
            if back == data {
                equal += 1;
            }
            if decoded_sha.is_empty() {
                decoded_sha = dbbh::sha256_hex(&back);
            }
            match &reference {
                None => {
                    agree += 1;
                    reference = Some(symbols);
                }
                Some(r) if *r == symbols => agree += 1,
                Some(_) => {}
            }
            println!("RUNGTIME|lane={name}|impl={who}|encode_ms={encode_ms}|decode_ms={decode_ms}|json=0");
        }
        let symbols = reference.map_or(0, |r| r.len());
        let bits_in = data.len() * 8;
        let bits_out = symbols * usize::from(width);
        println!(
            "RUNG|lane={name}|bits_per_symbol={width}|symbols={symbols}|bits_in={bits_in}|bits_out={bits_out}|pad_bits={}|implementations={}|encoders_agree={agree}|decoded_equal={equal}|decoded_sha256={decoded_sha}|json=0",
            bits_out - bits_in,
            impls.len()
        );
    }
    let t = Instant::now();
    let tuples = dbbh::to_hyperbehcs(&data);
    let glyphs = (data.len() * 8).div_ceil(10);
    let back = dbbh::from_hyperbehcs(&tuples, glyphs, data.len());
    println!(
        "RUNG|lane=hyper60|tuples={}|glyphs={glyphs}|decoded_equal={}|ms={}|json=0",
        tuples.len(),
        u8::from(back == data),
        t.elapsed().as_millis()
    );
}
