//! Single-thread timing of the per-seat instance-PID mint the :5088 routes run (`tuple60d` then
//! `resolve_instance_pid`, main.rs:1025-1027 and :1200-1202), and of the same mint with table hex
//! over the 8 kept bytes. Integer picoseconds. Usage: `instance_pid_bench <verbs.hbp>`.

use std::hint::black_box;
use std::time::Instant;

use asolaria_host8::identity::{resolve_instance_pid, tuple60d, verb_catalog_from_hbp};
use sha2::{Digest, Sha256};

const HEX: &[u8; 16] = b"0123456789abcdef";
const NAME: &str = "FORMULA-CHIEF";
const HANDLE8: &str = "0155964ffc8ef1f8";
const CUBE_BH: &str = "BH.51.0.591";
const DEVICE: &str = "acer";
const TS0: u64 = 1_750_000_000;
const N: u64 = 1_000_000;

fn mint(catalog: &[String], ts: &str) -> String {
    let (verb, noun, glyph, sha) = tuple60d(NAME, HANDLE8, CUBE_BH, catalog);
    resolve_instance_pid(HANDLE8, DEVICE, ts, &verb, &noun, &glyph, &sha)
}

fn sha16_table(input: &str) -> String {
    let d = Sha256::digest(input.as_bytes());
    let mut out = String::with_capacity(16);
    for b in &d[..8] {
        out.push(HEX[usize::from(b >> 4)] as char);
        out.push(HEX[usize::from(b & 0x0f)] as char);
    }
    out
}

/// main.rs:624-661 step for step, with `sha16_table` in place of `sha16`.
fn mint_table(catalog: &[String], ts: &str) -> String {
    let verb = if catalog.is_empty() {
        String::from("report")
    } else {
        let sel = sha16_table(&format!("{HANDLE8}|verb"));
        let idx = u64::from_str_radix(&sel[..8], 16).unwrap_or(0) % catalog.len() as u64;
        catalog[idx as usize].clone()
    };
    let glyph = sha16_table(&format!("glyph|{NAME}|{CUBE_BH}"));
    sha16_table(&format!(
        "{HANDLE8}|{DEVICE}|{ts}|{verb}.{NAME}.{glyph}.{HANDLE8}"
    ))
}

// docs/handoffs/nano-speed-native-2026-10-18/native-emit-bench/src/main.rs:69-92, verbatim.
fn bench<F: FnMut(u64) -> u64>(label: &str, n: u64, mut f: F) {
    for i in 0..n / 10 {
        black_box(f(i));
    }
    let mut runs: Vec<u128> = Vec::with_capacity(3);
    for _ in 0..3 {
        let t = Instant::now();
        let mut acc = 0u64;
        for i in 0..n {
            acc = acc.wrapping_add(f(i));
        }
        black_box(acc);
        runs.push(t.elapsed().as_nanos());
    }
    runs.sort_unstable();
    let med = runs[1];
    let n128 = n as u128;
    println!(
        "NATIVEBENCH|unit={label}|n={n}|runs=3|ps_per_op_min={}|ps_per_op_median={}|ops_per_s_median={}|threads=1|json=0",
        runs[0] * 1000 / n128,
        med * 1000 / n128,
        n128 * 1_000_000_000 / med.max(1)
    );
}

fn main() {
    let path = std::env::args()
        .nth(1)
        .expect("usage: instance_pid_bench <verbs.hbp>");
    let body = std::fs::read_to_string(&path).expect("read verbs.hbp");
    let catalog = verb_catalog_from_hbp(&body);

    // Upstream's node vector (main.rs:1669-1676, pid_sources.rs:106-138) gates every timing.
    let golden = mint(&[String::from("format")], "1750000000");
    let holds = golden == "d125579d9644c37a";
    println!(
        "PARITY|golden=d125579d9644c37a|got={golden}|holds={}|catalog_verbs={}|json=0",
        u8::from(holds),
        catalog.len()
    );
    if !holds {
        std::process::exit(1);
    }

    let mut all = Sha256::new();
    let mut same = 0u64;
    for i in 0..=N {
        let ts = (TS0 + i).to_string();
        let a = mint(&catalog, &ts);
        same += u64::from(a == mint_table(&catalog, &ts));
        if i < N {
            all.update(a.as_bytes());
            all.update(b"\n");
        }
    }
    let mut digest = String::with_capacity(64);
    for b in all.finalize() {
        digest.push(HEX[usize::from(b >> 4)] as char);
        digest.push(HEX[usize::from(b & 0x0f)] as char);
    }
    println!(
        "MINTPARITY|ts={TS0}..{}|table_identical={same}/{}|first={}|pids_sha256={digest}|json=0",
        TS0 + N,
        N + 1,
        mint(&catalog, &TS0.to_string())
    );

    bench("host8_instance_pid_mint(as_written)", N, |i| {
        let pid = mint(&catalog, &(TS0 + i).to_string());
        u64::from(pid.as_bytes()[0])
    });
    bench("host8_instance_pid_mint(table_hex)", N, |i| {
        let pid = mint_table(&catalog, &(TS0 + i).to_string());
        u64::from(pid.as_bytes()[0])
    });
}
