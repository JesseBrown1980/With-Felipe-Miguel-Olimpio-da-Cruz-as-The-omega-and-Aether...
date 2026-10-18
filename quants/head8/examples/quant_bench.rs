//! The command line of quant-huge-message-benchmark.mjs (lines 97-139) over the Rust port:
//! without `--run` it prints `CALIBRATION_ROWS`; with `--run [--sizes=a,b] [--disk]` it prints
//! the `runLiveBenchmark` rows, timing this port instead of V8.
//!
//! Messages are `fill()`ed `Float64Array` bytes (seed 12345, reference seed 99999) and every
//! timed step is the upstream step: `quant8` of both messages halved (head), SHA-256 of the raw
//! bytes in 2^28-byte chunks and of the 3,200-byte tuple, optional writes of both, and
//! `dotRaw` against `dotQ`. Durations are `performance.now()`-style milliseconds formatted with
//! `toFixed` as upstream. `--sizes` takes decimal integers, optionally signed; entries that are
//! not above 0 are dropped as line 134 filters them (`n > 0`; an empty entry is `Number('') = 0`),
//! and any other non-integer text is refused.

use quant_head8::{
    count_sketch, dot_q, dot_raw, message_dims, quantize, tuple_buffer, Fill, Number, Quant8,
    CALIBRATION_ROWS, D,
};
use sha2::{Digest, Sha256};
use std::io::Write;
use std::time::{Duration, Instant};

const CHUNK: usize = 1 << 28;

fn elements(bytes: &[u8]) -> impl Iterator<Item = Number> + '_ {
    bytes
        .chunks_exact(8)
        .map(|c| Number::from_bits(u64::from_le_bytes(c.try_into().expect("8 bytes"))))
}

fn filled(len: usize, seed: u32) -> Vec<u8> {
    let mut out = Vec::with_capacity(len * 8);
    for x in Fill::new(seed).take(len) {
        out.extend_from_slice(&x.to_bits().to_le_bytes());
    }
    out
}

fn timed<T>(f: impl FnOnce() -> T) -> (T, Duration) {
    let start = Instant::now();
    let out = f();
    (out, start.elapsed())
}

/// `ms(f)` as a Number of milliseconds (`performance.now()` differences).
fn ms(d: Duration) -> Number {
    Number::from_u64(d.as_nanos() as u64) / Number::from_u64(1_000_000)
}

fn sha_chunked(buf: &[u8]) -> Vec<u8> {
    let mut h = Sha256::new();
    for chunk in buf.chunks(CHUNK) {
        h.update(chunk);
    }
    h.finalize().to_vec()
}

fn write_chunked(path: &std::path::Path, buf: &[u8]) {
    let mut f = std::fs::File::create(path).expect("create raw.bin");
    for chunk in buf.chunks(CHUNK) {
        f.write_all(chunk).expect("write raw.bin");
    }
}

fn quant8_bytes(bytes: &[u8]) -> Quant8 {
    quantize(&count_sketch(elements(bytes)))
}

fn run_live_benchmark(sizes_mb: &[u64], disk: bool) -> Vec<String> {
    let joined: Vec<String> = sizes_mb.iter().map(u64::to_string).collect();
    let mut rows = vec![format!(
        "QUANTBENCHLIVEHDR|sizes_mb={}|disk={}|D={D}|json=0",
        joined.join("+"),
        u8::from(disk)
    )];
    let tmp = disk.then(|| {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let dir = std::env::temp_dir().join(format!("quant-bench-{}-{nanos}", std::process::id()));
        std::fs::create_dir(&dir).expect("temp dir");
        dir
    });
    for &mb in sizes_mb {
        let dims = message_dims(mb);
        let msg = filled(dims, 12345);
        let reference = filled(dims, 99999);
        let ((q, qr), head) = timed(|| (quant8_bytes(&msg), quant8_bytes(&reference)));
        let head = ms(head) / Number::from_u64(2);
        let q_buf = tuple_buffer(&q);
        let (_, hash_raw) = timed(|| sha_chunked(&msg));
        let (_, hash_q) = timed(|| Sha256::digest(&q_buf));
        let (mut w_raw, mut w_q) = (Number::ZERO, Number::ZERO);
        if let Some(dir) = &tmp {
            let (f1, f2) = (dir.join("raw.bin"), dir.join("q.bin"));
            w_raw = ms(timed(|| write_chunked(&f1, &msg)).1);
            w_q = ms(timed(|| std::fs::write(&f2, &q_buf).expect("write q.bin")).1);
            let _ = std::fs::remove_file(&f1);
            let _ = std::fs::remove_file(&f2);
        }
        let (_, cmp_raw) = timed(|| dot_raw(elements(&msg), elements(&reference)));
        let (_, cmp_q) = timed(|| dot_q(&q, &qr));
        let payload_kb = Number::from_u64(q_buf.len() as u64) / Number::from_u64(1024);
        rows.push(format!(
            "QUANTBENCHLIVE|message_mb={mb}|head_ms={}|sha_raw_ms={}|sha_q_ms={}|write_raw_ms={}|write_q_ms={}|cmp_raw_ms={}|cmp_q_ms={}|payload_kb={}|json=0",
            head.to_fixed(1),
            ms(hash_raw).to_fixed(1),
            ms(hash_q).to_fixed(3),
            w_raw.to_fixed(1),
            w_q.to_fixed(3),
            ms(cmp_raw).to_fixed(1),
            ms(cmp_q).to_fixed(3),
            payload_kb.to_fixed(1),
        ));
    }
    if let Some(dir) = tmp {
        let _ = std::fs::remove_dir_all(dir);
    }
    rows.push("QUANTBENCHLIVEFTR|note=live-rates-are-machine-and-load-dependent-seal-output-in-a-receipt-before-claim-upgrade|json=0".to_string());
    rows
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let rows: Vec<String> = if args.iter().any(|a| a == "--run") {
        let sizes = match args.iter().find_map(|a| a.strip_prefix("--sizes=")) {
            None => vec![64],
            Some(list) => list
                .split(',')
                .filter(|s| !s.is_empty())
                .map(|s| match s.parse::<i64>() {
                    Ok(n) => n,
                    Err(_) => {
                        eprintln!("quant_bench: --sizes takes decimal integers, got {s:?}");
                        std::process::exit(2);
                    }
                })
                .filter(|&n| n > 0)
                .map(|n| n as u64)
                .collect(),
        };
        run_live_benchmark(&sizes, args.iter().any(|a| a == "--disk"))
    } else {
        CALIBRATION_ROWS.iter().map(|r| r.to_string()).collect()
    };
    println!("{}", rows.join("\n"));
}
