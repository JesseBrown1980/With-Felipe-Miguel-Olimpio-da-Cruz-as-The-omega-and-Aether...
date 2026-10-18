//! The bench's ternary emit (trits -> u64 -> sha16 -> trits) against the same emit kept in TritWord
//! form: `TritWord::pack` stores the base-3 value, so a PID's TritWord is the PID's integer and needs
//! no per-trit conversion until a consumer reads the trits.
use asolaria_tribit::{TritWord, Zero};
use sha2::{Digest, Sha256};
use std::hint::black_box;
use std::time::Instant;

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
    for (k, o) in out.iter_mut().enumerate() {
        *o = HEX[((v >> (60 - 4 * k)) & 0xf) as usize];
    }
    out
}

fn emit_u64(pid: u64) -> u64 {
    let mut buf = [0u8; 22];
    buf[..16].copy_from_slice(&hex16(pid));
    buf[16..].copy_from_slice(b"|agent");
    let d = Sha256::digest(buf);
    let mut b = [0u8; 8];
    b.copy_from_slice(&d[..8]);
    u64::from_be_bytes(b)
}

fn emit_trits(pid: TritWord) -> TritWord {
    u64_to_trits(emit_u64(trits_to_u64(pid)))
}

fn emit_tritword_direct(pid: TritWord) -> TritWord {
    TritWord(u128::from(emit_u64(pid.0 as u64)))
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
    let seed = 0x1a2b_3c4d_5e6f_7081_u64;
    let (mut a, mut b) = (u64_to_trits(seed), TritWord(u128::from(seed)));
    let mut same = u64::from(a == b);
    let mut digits_same = 0u64;
    for _ in 0..100_000 {
        a = emit_trits(a);
        b = emit_tritword_direct(b);
        same += u64::from(a == b);
        let (mut ta, mut tb) = ([Zero::Nil; PID_TRITS], [Zero::Nil; PID_TRITS]);
        a.unpack(&mut ta);
        b.unpack(&mut tb);
        digits_same += u64::from(ta == tb);
    }
    println!("DIRECTPARITY|steps=100001|tritword_equal={same}|all_41_trits_equal={digits_same}/100000|json=0");
    let mut pt = u64_to_trits(seed);
    bench("TERNARY_pid_emit(bench_form,unpack+repack)", 2_000_000, |_| {
        pt = emit_trits(pt);
        pt.0 as u64
    });
    let mut pd = TritWord(u128::from(seed));
    bench("TERNARY_pid_emit(TritWord_direct,same_trits)", 2_000_000, |_| {
        pd = emit_tritword_direct(pd);
        pd.0 as u64
    });
}
