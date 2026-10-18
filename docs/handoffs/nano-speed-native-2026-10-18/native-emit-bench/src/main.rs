//! Native (hot-path) timing of host8's OWN PID mint functions.
//! canonicalize / fnv1a64 / host_handle8 / sha256hex / sha16 are byte-for-byte copies of
//! federation-remake-1024/servers/host8-serve/src/main.rs:536-589 (sha2 =0.10.9, as host8's Cargo.lock).
//! Gate: host8's own test vector sha16("abc") == "ba7816bf8f01cfea" must hold before any timing counts.
//! Integer only: picoseconds per op and ops/s as u128. Single thread. Output = HBP rows (json=0).
use sha2::{Digest, Sha256};
use std::hint::black_box;
use std::time::Instant;

fn canonicalize(input: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut in_control_run = false;
    for ch in input.chars() {
        if matches!(ch, '\t' | '\r' | '\n') {
            if !in_control_run {
                output.push(' ');
            }
            in_control_run = true;
        } else {
            output.push(ch);
            in_control_run = false;
        }
    }
    output
}

fn fnv1a64(input: &str) -> u64 {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in canonicalize(input).as_bytes() {
        hash ^= *byte as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

fn host_handle8(input: &str) -> String {
    format!("{:016x}", fnv1a64(input))
}

fn sha256hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    let digest = hasher.finalize();
    let mut out = String::with_capacity(64);
    for byte in digest.iter() {
        out.push_str(&format!("{:02x}", byte));
    }
    out
}

fn sha16(input: &str) -> String {
    let mut s = sha256hex(input);
    s.truncate(16);
    s
}

/// PROPOSED (not in host8): same output as sha16, but hex-encode only the 8 bytes it keeps, via a table.
fn sha16_table(input: &str) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let d = Sha256::digest(input.as_bytes());
    let mut out = [0u8; 16];
    for (k, b) in d[..8].iter().enumerate() {
        out[2 * k] = HEX[(b >> 4) as usize];
        out[2 * k + 1] = HEX[(b & 0x0f) as usize];
    }
    String::from_utf8(out.to_vec()).unwrap_or_default()
}

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
    let parity = sha16("abc") == "ba7816bf8f01cfea";
    println!(
        "PARITY|host8_test_vector=sha16(abc)=ba7816bf8f01cfea|holds={}|handle8_sample={}|json=0",
        u8::from(parity),
        host_handle8("ACER-CLAUDE-FABLE5")
    );
    if !parity {
        std::process::exit(1);
    }

    // 1) host8-exact chained PID mint: pid[n] = sha16(pid[n-1] + "|agent") (FABLE5 office chain rule)
    let mut pid = sha16("EMITTER-SEED|8467a937cba309f7");
    bench("host8_sha16_chain(exact,incl_hex)", 1_000_000, |_| {
        pid = sha16(&format!("{pid}|agent"));
        pid.as_bytes()[0] as u64
    });

    // 1b) proposed table-hex sha16: identical output over 100,000 chain steps, then timed on the same chain
    let (mut a, mut b) = (sha16("EMITTER-SEED|8467a937cba309f7"), sha16_table("EMITTER-SEED|8467a937cba309f7"));
    let mut same = u64::from(a == b);
    for _ in 0..100_000 {
        a = sha16(&format!("{a}|agent"));
        b = sha16_table(&format!("{b}|agent"));
        same += u64::from(a == b);
    }
    println!("TABLEPARITY|steps=100001|identical={same}|abc={}|json=0", sha16_table("abc"));
    let mut pid2 = sha16_table("EMITTER-SEED|8467a937cba309f7");
    bench("proposed_sha16_table_chain(same_output)", 2_000_000, |_| {
        pid2 = sha16_table(&format!("{pid2}|agent"));
        pid2.as_bytes()[0] as u64
    });

    // 2) raw SHA-256 compress of a 32-byte block, no hex, no allocation
    let mut block = [0u8; 32];
    bench("raw_sha256_digest(32B,no_hex)", 2_000_000, |i| {
        block[..8].copy_from_slice(&i.to_le_bytes());
        let d = Sha256::digest(black_box(&block));
        d[0] as u64
    });

    // 3) host8-exact 8-byte host handle (fnv1a64 incl canonicalize allocation)
    let key = String::from("rooms/task-manager/bridge/gnn-dispatch-bridge");
    bench("host8_fnv1a64_handle8(exact)", 10_000_000, |i| fnv1a64(black_box(&key)) ^ i);
}
