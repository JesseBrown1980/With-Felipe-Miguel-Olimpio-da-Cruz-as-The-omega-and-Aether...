//! Native (hot-path) timing of host8's OWN PID mint functions.
//! canonicalize / fnv1a64 / host_handle8 / sha256hex / sha16 are byte-for-byte copies of
//! federation-remake-1024/servers/host8-serve/src/main.rs:536-589 (sha2 =0.10.9, as host8's Cargo.lock).
//! Gate: host8's own test vector sha16("abc") == "ba7816bf8f01cfea" must hold before any timing counts.
//! Integer only: picoseconds per op and ops/s as u128. Single thread. Output = HBP rows (json=0).
use sha2::{Digest, Sha256};
use std::hint::black_box;
use std::time::Instant;

// The canonical ternary kernel, reused via #[path] (never copied): Zero{Neg,Nil,Pos}, TritWord (80 trits/u128),
// prism/unprism over Z/1_000_081Z with K=27 = 3^3.
#[path = "C:/asolaria-acer/asolaria-os/kernel/core/src/tribit/mod.rs"]
#[allow(dead_code)]
mod tribit;
use tribit::{TritWord, Zero, K};

/// Count is not range: 3^40 < 2^64 <= 3^41, so an 8-byte PID needs 41 trits (40 cannot carry every value).
const PID_TRITS: usize = 41;

fn u64_to_trits(v: u64) -> TritWord {
    let mut t = [Zero::Nil; PID_TRITS];
    let mut acc = v;
    for i in (0..PID_TRITS).rev() {
        t[i] = Zero::from_digit((acc % 3) as u8);
        acc /= 3;
    }
    TritWord::pack(&t)
}

fn trits_to_u64(w: TritWord) -> u64 {
    let mut t = [Zero::Nil; PID_TRITS];
    w.unpack(&mut t);
    let mut acc: u128 = 0;
    for z in t.iter() {
        acc = acc * 3 + z.digit() as u128;
    }
    acc as u64
}

fn hex16(v: u64) -> [u8; 16] {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = [0u8; 16];
    for k in 0..16 {
        out[k] = HEX[((v >> (60 - 4 * k)) & 0xf) as usize];
    }
    out
}

fn sha16_u64(input: &[u8]) -> u64 {
    let d = Sha256::digest(input);
    let mut b = [0u8; 8];
    b.copy_from_slice(&d[..8]);
    u64::from_be_bytes(b)
}

/// One emit on the no-allocation fast path: pid' = sha16(hex16(pid) + "|agent").
fn emit_u64(pid: u64) -> u64 {
    let mut buf = [0u8; 22];
    buf[..16].copy_from_slice(&hex16(pid));
    buf[16..].copy_from_slice(b"|agent");
    sha16_u64(&buf)
}

/// The same emit, carried in TRITS: trits -> u64 -> sha16 -> trits.
fn emit_trits(pid: TritWord) -> TritWord {
    u64_to_trits(emit_u64(trits_to_u64(pid)))
}

/// 27 integer lanes from the 41 PID trits (lane i = t[i] + 3*t[i+27] for i<14, else t[i]); values 0..8.
fn lanes_from_trits(w: TritWord) -> [u64; K] {
    let mut t = [Zero::Nil; PID_TRITS];
    w.unpack(&mut t);
    let mut lanes = [0u64; K];
    for i in 0..K {
        let hi = if i + K < PID_TRITS { t[i + K].digit() as u64 } else { 0 };
        lanes[i] = t[i].digit() as u64 + 3 * hi;
    }
    lanes
}

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
    // 4) host8-exact host_handle8 STRING (fnv1a64 + "{:016x}" formatting) — the row the label above implied but did not time
    bench("host8_host_handle8_string(exact,incl_016x)", 5_000_000, |i| host_handle8(black_box(&key)).as_bytes()[0] as u64 ^ i);

    // ---------------- TERNARY LANE (trits, not bits) ----------------
    let three40 = 3u128.pow(40);
    let three41 = 3u128.pow(41);
    let two64 = 1u128 << 64;
    println!(
        "TRITRANGE|pid_bits=64|trits=41|3^40={three40}|2^64={two64}|3^41={three41}|40_trits_enough={}|41_trits_enough={}|json=0",
        u8::from(three40 >= two64),
        u8::from(three41 >= two64)
    );
    // parity + exactness over 100,001 chained emits: ternary chain == binary sha16 chain, and trits round-trip exactly
    let seed = sha16("EMITTER-SEED|8467a937cba309f7");
    let mut s_bin = seed.clone();
    let mut s_tri = u64_to_trits(u64::from_str_radix(&seed, 16).unwrap_or(0));
    let (mut same_pid, mut exact_rt, mut packed_eq_value) = (0u64, 0u64, 0u64);
    for _ in 0..100_001 {
        let v = trits_to_u64(s_tri);
        same_pid += u64::from(hex16(v) == s_bin.as_bytes()[..16]);
        exact_rt += u64::from(trits_to_u64(u64_to_trits(v)) == v);
        packed_eq_value += u64::from(u64_to_trits(v).0 == v as u128);
        s_bin = sha16(&format!("{s_bin}|agent"));
        s_tri = emit_trits(s_tri);
    }
    println!("TRITPARITY|steps=100001|ternary_pid_equals_binary_pid={same_pid}|trit_roundtrip_exact={exact_rt}|tritword_value_equals_pid={packed_eq_value}|json=0");
    // prism/unprism seal is exact on the PID lanes
    let mut w = s_tri;
    let mut seal_exact = 0u64;
    for _ in 0..10_000 {
        let l = lanes_from_trits(w);
        seal_exact += u64::from(tribit::unprism(&tribit::prism(&l)) == l);
        w = emit_trits(w);
    }
    println!("TRITSEAL|pids=10000|unprism(prism(lanes))==lanes={seal_exact}|K={K}|P={}|json=0", tribit::P);

    let words: Vec<TritWord> = (0..1024u64).map(|i| u64_to_trits(i.wrapping_mul(0x9E37_79B9_7F4A_7C15))).collect();
    bench("trit_encode_u64_to_41_trits(TritWord)", 10_000_000, |i| u64_to_trits(black_box(i.wrapping_mul(0x9E37_79B9_7F4A_7C15))).0 as u64);
    bench("trit_decode_41_trits_to_u64", 10_000_000, |i| trits_to_u64(black_box(words[(i & 1023) as usize])));
    let mut pb = u64::from_str_radix(&seed, 16).unwrap_or(0);
    bench("binary_pid_emit(sha16,no_alloc)", 2_000_000, |_| {
        pb = emit_u64(pb);
        pb
    });
    let mut pt = u64_to_trits(u64::from_str_radix(&seed, 16).unwrap_or(0));
    bench("TERNARY_pid_emit(trits_in_trits_out,sha16,no_alloc)", 2_000_000, |_| {
        pt = emit_trits(pt);
        pt.0 as u64
    });
    let mut ws = pt;
    bench("tribit_prism+unprism_seal(K=27,exact)", 200_000, |_| {
        let l = lanes_from_trits(ws);
        let back = tribit::unprism(&tribit::prism(&l));
        ws = TritWord(ws.0 ^ 1);
        back[0]
    });
}
