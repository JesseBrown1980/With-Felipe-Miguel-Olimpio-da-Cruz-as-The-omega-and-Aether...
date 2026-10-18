//! HBP rows of the ternary ports over fixed input sets. Shared by `examples/emit.rs` (the stream
//! `tools/referee.py --rust` compares row by row) and `tests/fixture.rs` (the rows the referee
//! wrote into `tests/fixtures/vectors.hbp`). The seeded inputs come from splitmix64, a test-input
//! generator mirrored in the referee; it is not owner code. The stream digests are SHA-256
//! (`sha256.rs`, test-only) of `C0 || SA_b || SB_b || REM`, where `SA_b` / `SB_b` are the
//! separations as signed 16-bit little-endian, as `trijection.py:75-76` serialises them.

#[path = "sha256.rs"]
mod sha256;

pub use sha256::Sha256;

use ternary::balanced::{bal3, base3, low_trits, recon, to_balanced_ternary};
use ternary::cube;
use ternary::trijection::{
    third, trij, trijection_forward, trijection_inverse, zero_trits, Forward,
};
use ternary::Zero;

/// splitmix64 (test inputs only).
pub struct SplitMix64(u64);

impl SplitMix64 {
    pub fn new(seed: u64) -> SplitMix64 {
        SplitMix64(seed)
    }

    pub fn next_u64(&mut self) -> u64 {
        self.0 = self.0.wrapping_add(0x9E37_79B9_7F4A_7C15);
        let mut z = self.0;
        z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
        z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
        z ^ (z >> 31)
    }

    pub fn next_i64(&mut self) -> i64 {
        i64::from_ne_bytes(self.next_u64().to_ne_bytes())
    }
}

/// `n` seeded bytes: splitmix64 draws written little-endian, cut to `n` (test inputs only).
pub fn seeded_bytes(seed: u64, n: usize) -> Vec<u8> {
    let mut g = SplitMix64::new(seed);
    let mut out = Vec::with_capacity(n + 8);
    while out.len() < n {
        out.extend_from_slice(&g.next_u64().to_le_bytes());
    }
    out.truncate(n);
    out
}

/// One input set.
pub struct Set {
    pub name: &'static str,
    pub trij_r: i64,
    pub trij_seeded: usize,
    pub bal_r: i64,
    pub bal_seeded: usize,
    pub base_n: u64,
    pub base_seeded: usize,
    pub low_r: i64,
    pub low_seeded: usize,
    pub third: &'static [i64],
    /// Seeded buffers per length `0..=12`.
    pub stream_per_len: u64,
    /// Every buffer of length 1 and 2.
    pub stream_exhaustive: bool,
    /// `(seed, length)` of the large seeded buffers.
    pub big: &'static [(u64, usize)],
    pub inv_seeded: usize,
    pub tbt_r: i64,
    pub tbt_seeded: usize,
    pub vs_r: i64,
    pub bytes: bool,
}

const GLYPHS: [i64; 27] = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
    26,
];

/// The stream `examples/emit.rs full` writes for `tools/referee.py --rust`.
pub const FULL: Set = Set {
    name: "full",
    trij_r: 27,
    trij_seeded: 4096,
    bal_r: 29_524,
    bal_seeded: 4096,
    base_n: 59_048,
    base_seeded: 4096,
    low_r: 1000,
    low_seeded: 1024,
    third: &GLYPHS,
    stream_per_len: 16,
    stream_exhaustive: true,
    big: &[
        (5, 299_999),
        (6, 300_000),
        (7, 300_001),
        (8, 1_000_000),
        (9, 1_048_577),
    ],
    inv_seeded: 2048,
    tbt_r: 32_768,
    tbt_seeded: 4096,
    vs_r: 29_524,
    bytes: true,
};

/// The rows of `tests/fixtures/vectors.hbp`.
pub const FIXTURE: Set = Set {
    name: "fixture",
    trij_r: 3,
    trij_seeded: 256,
    bal_r: 40,
    bal_seeded: 256,
    base_n: 80,
    base_seeded: 256,
    low_r: 40,
    low_seeded: 64,
    third: &[0, 1, 13, 25, 26],
    stream_per_len: 2,
    stream_exhaustive: false,
    big: &[(5, 1000), (6, 1001), (7, 1002)],
    inv_seeded: 64,
    tbt_r: 40,
    tbt_seeded: 64,
    vs_r: 40,
    bytes: false,
};

/// `i64` edge values; the trijection rows take every triple of them.
pub const I64_EDGES: [i64; 7] = [i64::MIN, i64::MIN + 1, -1, 0, 1, i64::MAX - 1, i64::MAX];

/// Values for the fixed-width rows at several widths.
const TBT_EDGES: [i64; 15] = [
    i64::MIN,
    i64::MIN + 1,
    -1,
    0,
    1,
    i64::MAX - 1,
    i64::MAX,
    121,
    122,
    364,
    365,
    -364,
    -365,
    29_524,
    29_525,
];
const TBT_WIDTHS: [usize; 7] = [0, 1, 2, 6, 40, 41, 42];

fn join_trits(t: &[Zero]) -> String {
    let v: Vec<String> = t.iter().map(|z| z.direction().to_string()).collect();
    v.join(",")
}

fn join<T: ToString>(d: &[T]) -> String {
    let v: Vec<String> = d.iter().map(|x| x.to_string()).collect();
    v.join(",")
}

pub fn trij_row(a: i64, b: i64, c: i64) -> String {
    let t = trij(a, b, c);
    let ok = if t.restore() == Some((a, b, c)) {
        "OK"
    } else {
        "FAIL"
    };
    format!(
        "TRIJ|a={a}|b={b}|c={c}|c0={}|sa={}|sb={}|rem={}|restore={ok}",
        t.c0, t.sa, t.sb, t.rem
    )
}

pub fn bal3_row(n: i64) -> String {
    let t = bal3(n);
    let r = match recon(t.as_slice()) {
        Some(v) => v.to_string(),
        None => "NONE".to_string(),
    };
    format!("BAL3|n={n}|trits={}|recon={r}", join_trits(t.as_slice()))
}

pub fn base3_row(n: u64) -> String {
    format!("BASE3|n={n}|digits={}", join(base3(n).as_slice()))
}

pub fn low3_row(x: i64) -> String {
    let mut t = [Zero::Nil; 3];
    low_trits(x, &mut t);
    format!("LOW3|x={x}|trits={}", join_trits(&t))
}

pub fn third_row(a: i64, b: i64, c: i64) -> String {
    let t = trij(a, b, c);
    let c_rev = third(a, b, t.c0, t.rem);
    let exact = if c_rev == Some(c) { "OK" } else { "FAIL" };
    let shown = match c_rev {
        Some(v) => v.to_string(),
        None => "NONE".to_string(),
    };
    format!(
        "THIRD|a={a}|b={b}|c={c}|ctr={}|rem={}|c_rev={shown}|exact={exact}",
        t.c0, t.rem
    )
}

pub fn cube_row(i: u8) -> String {
    let c = cube::cell(i);
    format!(
        "CUBE|i={i}|cell={}|sep={}|N={}|R={}",
        join_trits(&c),
        cube::separation(c),
        cube::index(cube::negate(c)),
        cube::index(cube::rotate(c))
    )
}

/// SHA-256 of `C0 || SA_b || SB_b || REM` (`trijection.py:75-76` write `SA`, `SB` as `"<h"`).
pub fn streams_sha256(f: &Forward) -> String {
    let mut h = Sha256::new();
    h.update(&f.c0);
    for x in &f.sa {
        h.update(&x.to_le_bytes());
    }
    for x in &f.sb {
        h.update(&x.to_le_bytes());
    }
    h.update(&f.rem);
    h.hex()
}

fn inverse_of(f: &Forward) -> Option<Vec<u8>> {
    trijection_inverse(&f.c0, &f.sa, &f.sb, &f.rem, f.total_len, f.pad)
}

fn rem_counts(f: &Forward) -> [u64; 3] {
    let mut r = [0u64; 3];
    for &x in &f.rem {
        r[usize::from(x)] += 1;
    }
    r
}

pub fn stream_row(data: &[u8]) -> String {
    let f = trijection_forward(data);
    let z = zero_trits(&f.sa, &f.sb);
    let ok = if inverse_of(&f).as_deref() == Some(data) {
        "OK"
    } else {
        "FAIL"
    };
    format!(
        "STREAM|len={}|data={}|c0={}|sa={}|sb={}|rem={}|total_len={}|pad={}|zeros={}|trits={}|restore={ok}",
        data.len(),
        join(data),
        join(&f.c0),
        join(&f.sa),
        join(&f.sb),
        join(&f.rem),
        f.total_len,
        f.pad,
        z.zeros,
        z.trits
    )
}

pub fn stream_big_row(seed: u64, n: usize) -> String {
    let data = seeded_bytes(seed, n);
    let f = trijection_forward(&data);
    let z = zero_trits(&f.sa, &f.sb);
    let r = rem_counts(&f);
    let ok = if inverse_of(&f).as_deref() == Some(&data[..]) {
        "OK"
    } else {
        "FAIL"
    };
    format!(
        "STREAM_BIG|seed={seed}|len={n}|total_len={}|pad={}|sha256={}|zeros={}|trits={}|rem0={}|rem1={}|rem2={}|restore={ok}",
        f.total_len,
        f.pad,
        streams_sha256(&f),
        z.zeros,
        z.trits,
        r[0],
        r[1],
        r[2]
    )
}

/// One argument set of `trijection_inverse`.
pub struct InvCase {
    pub c0: Vec<u8>,
    pub sa: Vec<i16>,
    pub sb: Vec<i16>,
    pub rem: Vec<u8>,
    pub total_len: usize,
    pub pad: usize,
}

pub fn inv_row(k: &InvCase) -> String {
    let out = match trijection_inverse(&k.c0, &k.sa, &k.sb, &k.rem, k.total_len, k.pad) {
        Some(v) => join(&v),
        None => "ERR".to_string(),
    };
    format!(
        "INV|c0={}|sa={}|sb={}|rem={}|total_len={}|pad={}|out={out}",
        join(&k.c0),
        join(&k.sa),
        join(&k.sb),
        join(&k.rem),
        k.total_len,
        k.pad
    )
}

fn case(c0: &[u8], sa: &[i16], sb: &[i16], rem: &[u8], total_len: usize, pad: usize) -> InvCase {
    InvCase {
        c0: c0.to_vec(),
        sa: sa.to_vec(),
        sb: sb.to_vec(),
        rem: rem.to_vec(),
        total_len,
        pad,
    }
}

/// Argument sets at the edges of `trijection.py:61-64`: `zip` stopping at the shortest stream,
/// values outside a byte (`ValueError` upstream), and the slice end `total_len - pad`.
pub fn inv_edges() -> Vec<InvCase> {
    let mut v = vec![
        case(&[], &[], &[], &[], 0, 0),
        case(&[], &[], &[], &[], 0, 2),
        case(&[], &[], &[], &[], 3, 2),
        case(&[], &[], &[], &[], 5, 0),
    ];
    for (t, p) in [
        (6, 0),
        (6, 1),
        (6, 2),
        (4, 0),
        (9, 0),
        (1, 3),
        (0, 1),
        (2, 5),
        (0, 7),
        (0, 0),
        (5, 5),
        (3, 9),
    ] {
        v.push(case(&[10, 20], &[1, -1], &[0, 2], &[0, 1], t, p));
    }
    v.extend([
        case(&[10, 20], &[1], &[0, 2], &[0, 1], 6, 0),
        case(&[10], &[1, -1], &[0, 2], &[0, 1, 2], 6, 0),
        case(&[255], &[1], &[0], &[0], 3, 0),
        case(&[0], &[-1], &[0], &[0], 3, 0),
        case(&[0], &[0], &[0], &[0], 3, 0),
        case(&[0], &[1], &[0], &[0], 3, 0),
        case(&[5], &[0], &[0], &[200], 3, 0),
        case(&[100], &[-100], &[155], &[0], 3, 0),
        case(&[1, 255], &[0, 1], &[0, 0], &[0, 0], 6, 0),
        case(&[0], &[0], &[0], &[0], usize::MAX, 0),
        case(&[0], &[0], &[0], &[0], 0, usize::MAX),
        case(
            &[7, 8, 9],
            &[0, 0, 0],
            &[0, 0, 0],
            &[0, 0, 0],
            usize::MAX,
            usize::MAX,
        ),
        case(&[7, 8, 9], &[0, 0, 0], &[0, 0, 0], &[0, 0, 0], 3, 5),
        case(&[0], &[i16::MIN], &[i16::MAX], &[0], 3, 0),
    ]);
    v
}

fn draw_below(g: &mut SplitMix64, n: u64) -> u64 {
    g.next_u64() % n
}

/// Seeded argument sets: half arbitrary, half a forward of seeded bytes with another
/// `(total_len, pad)`.
pub fn inv_seeded(count: usize) -> Vec<InvCase> {
    let mut g = SplitMix64::new(20);
    let mut v = Vec::with_capacity(count);
    for i in 0..count {
        if i % 2 == 0 {
            let n_c0 = draw_below(&mut g, 5) as usize;
            let n_sa = draw_below(&mut g, 5) as usize;
            let n_sb = draw_below(&mut g, 5) as usize;
            let n_rem = draw_below(&mut g, 5) as usize;
            let c0: Vec<u8> = (0..n_c0).map(|_| draw_below(&mut g, 256) as u8).collect();
            let sa: Vec<i16> = (0..n_sa)
                .map(|_| draw_below(&mut g, 601) as i16 - 300)
                .collect();
            let sb: Vec<i16> = (0..n_sb)
                .map(|_| draw_below(&mut g, 601) as i16 - 300)
                .collect();
            let rem: Vec<u8> = (0..n_rem).map(|_| draw_below(&mut g, 256) as u8).collect();
            let total_len = draw_below(&mut g, 16) as usize;
            let pad = draw_below(&mut g, 6) as usize;
            v.push(InvCase {
                c0,
                sa,
                sb,
                rem,
                total_len,
                pad,
            });
        } else {
            let n = draw_below(&mut g, 13) as usize;
            let seed = g.next_u64();
            let f = trijection_forward(&seeded_bytes(seed, n));
            let total_len = draw_below(&mut g, 16) as usize;
            let pad = draw_below(&mut g, 6) as usize;
            v.push(InvCase {
                c0: f.c0,
                sa: f.sa,
                sb: f.sb,
                rem: f.rem,
                total_len,
                pad,
            });
        }
    }
    v
}

pub fn tbt_row(n: i64, digits: usize) -> String {
    let mut buf = [Zero::Nil; 42];
    to_balanced_ternary(n, &mut buf[..digits]);
    format!(
        "TBT|n={n}|digits={digits}|trits={}",
        join_trits(&buf[..digits])
    )
}

/// `to_balanced_ternary(n, digits)` against `bal3(n)` on `-r..=r`: equal as lists, equal after
/// zero-padding `bal3` to `digits` trits, and equal to the low `digits` trits of `bal3`.
pub fn tbt_vs_bal3_row(digits: usize, r: i64) -> String {
    let (mut values, mut list_eq, mut padded_eq, mut low_eq) = (0u64, 0u64, 0u64, 0u64);
    let mut buf = [Zero::Nil; 42];
    for n in -r..=r {
        values += 1;
        let t = &mut buf[..digits];
        to_balanced_ternary(n, t);
        let b = bal3(n);
        let b = b.as_slice();
        if t[..] == *b {
            list_eq += 1;
        }
        if b.len() <= digits && t[..b.len()] == *b && t[b.len()..].iter().all(|z| *z == Zero::Nil) {
            padded_eq += 1;
        }
        let low = (0..digits).all(|i| t[i] == b.get(i).copied().unwrap_or(Zero::Nil));
        if low {
            low_eq += 1;
        }
    }
    format!(
        "TBT_VS_BAL3|digits={digits}|from={}|to={r}|values={values}|list_equal={list_eq}|padded_equal={padded_eq}|low_equal={low_eq}",
        -r
    )
}

/// `to_balanced_ternary(n, 3)` against the 3-trit loop (`low_trits`, the port of
/// `rime_27fischers.py:39-44` / `rime_agents.py:46-51`) on `-r..=r`.
pub fn tbt_vs_low3_row(r: i64) -> String {
    let (mut values, mut eq) = (0u64, 0u64);
    for n in -r..=r {
        values += 1;
        let mut a = [Zero::Nil; 3];
        let mut b = [Zero::Nil; 3];
        to_balanced_ternary(n, &mut a);
        low_trits(n, &mut b);
        if a == b {
            eq += 1;
        }
    }
    format!("TBT_VS_LOW3|from={}|to={r}|values={values}|equal={eq}", -r)
}

/// `(a, b, c)` for every `b`, `c` in `0..=255`, interleaved: 65,536 triples, 196,608 bytes.
pub fn byte_triples_of(a: u8) -> Vec<u8> {
    let mut v = Vec::with_capacity(3 * 65_536);
    for b in 0..=255u8 {
        for c in 0..=255u8 {
            v.extend_from_slice(&[a, b, c]);
        }
    }
    v
}

/// One chunk of every byte triple through the stream functions, and its triples restored.
pub fn bytes_chunk(a: u8) -> (String, u64, [u64; 3]) {
    let data = byte_triples_of(a);
    let f = trijection_forward(&data);
    let r = rem_counts(&f);
    let back = inverse_of(&f).unwrap_or_default();
    let ok = data
        .chunks_exact(3)
        .enumerate()
        .filter(|(i, t)| back.get(3 * i..3 * i + 3) == Some(*t))
        .count() as u64;
    let row = format!(
        "BYTES|a={a}|n={}|total_len={}|pad={}|sha256={}|rem0={}|rem1={}|rem2={}|restore_ok={ok}",
        data.len(),
        f.total_len,
        f.pad,
        streams_sha256(&f),
        r[0],
        r[1],
        r[2]
    );
    (row, ok, r)
}

fn bal3_edges() -> Vec<i64> {
    let mut v: Vec<i64> = I64_EDGES.to_vec();
    let mut h: i64 = 0;
    for _ in 1..=39 {
        // h = (3^k - 1) / 2, the largest value k balanced trits hold
        h = 3 * h + 1;
        v.extend([h, h + 1, -h, -h - 1]);
    }
    v
}

fn base3_edges() -> Vec<u64> {
    let mut v = vec![0, 1, 2, 3, u64::MAX - 1, u64::MAX];
    let mut p: u64 = 1;
    for _ in 1..=40 {
        p *= 3;
        v.extend([p - 1, p]);
    }
    v
}

/// Every row of `set`, in order, to `sink`.
pub fn emit(set: &Set, sink: &mut dyn FnMut(&str)) {
    sink(&format!("TERNARY_ROWS|set={}", set.name));
    let r = set.trij_r;
    for a in -r..=r {
        for b in -r..=r {
            for c in -r..=r {
                sink(&trij_row(a, b, c));
            }
        }
    }
    for a in I64_EDGES {
        for b in I64_EDGES {
            for c in I64_EDGES {
                sink(&trij_row(a, b, c));
            }
        }
    }
    let mut rng = SplitMix64::new(1);
    for _ in 0..set.trij_seeded {
        let a = rng.next_i64();
        let b = rng.next_i64();
        let c = rng.next_i64();
        sink(&trij_row(a, b, c));
    }
    for n in -set.bal_r..=set.bal_r {
        sink(&bal3_row(n));
    }
    for n in bal3_edges() {
        sink(&bal3_row(n));
    }
    let mut rng = SplitMix64::new(2);
    for _ in 0..set.bal_seeded {
        sink(&bal3_row(rng.next_i64()));
    }
    for n in 0..=set.base_n {
        sink(&base3_row(n));
    }
    for n in base3_edges() {
        sink(&base3_row(n));
    }
    let mut rng = SplitMix64::new(3);
    for _ in 0..set.base_seeded {
        sink(&base3_row(rng.next_u64()));
    }
    for x in -set.low_r..=set.low_r {
        sink(&low3_row(x));
    }
    let mut rng = SplitMix64::new(4);
    for _ in 0..set.low_seeded {
        sink(&low3_row(rng.next_i64()));
    }
    for &a in set.third {
        for &b in set.third {
            for &c in set.third {
                sink(&third_row(a, b, c));
            }
        }
    }
    for i in 0..cube::CELLS {
        sink(&cube_row(i));
    }
    // trijection.py: byte streams of every length 0..=12
    for len in 0..=12usize {
        sink(&stream_row(&vec![0u8; len]));
        sink(&stream_row(&vec![255u8; len]));
        for k in 0..set.stream_per_len {
            sink(&stream_row(&seeded_bytes(1000 + 100 * len as u64 + k, len)));
        }
    }
    if set.stream_exhaustive {
        for a in 0..=255u8 {
            sink(&stream_row(&[a]));
        }
        for a in 0..=255u8 {
            for b in 0..=255u8 {
                sink(&stream_row(&[a, b]));
            }
        }
    }
    for &(seed, n) in set.big {
        sink(&stream_big_row(seed, n));
    }
    for k in inv_edges() {
        sink(&inv_row(&k));
    }
    for k in inv_seeded(set.inv_seeded) {
        sink(&inv_row(&k));
    }
    for n in -set.tbt_r..=set.tbt_r {
        sink(&tbt_row(n, 6));
    }
    for n in TBT_EDGES {
        for d in TBT_WIDTHS {
            sink(&tbt_row(n, d));
        }
    }
    let mut rng = SplitMix64::new(30);
    for _ in 0..set.tbt_seeded {
        sink(&tbt_row(rng.next_i64(), 41));
    }
    sink(&tbt_vs_bal3_row(3, set.vs_r));
    sink(&tbt_vs_bal3_row(6, set.vs_r));
    sink(&tbt_vs_low3_row(set.vs_r));
    if set.bytes {
        let (mut cases, mut ok, mut rems) = (0u64, 0u64, [0u64; 3]);
        for a in 0..=255u8 {
            let (row, k, r) = bytes_chunk(a);
            sink(&row);
            cases += 65_536;
            ok += k;
            for (x, y) in rems.iter_mut().zip(r) {
                *x += y;
            }
        }
        sink(&format!(
            "TRIJ_BYTES|cases={cases}|restore_ok={ok}|rem0={}|rem1={}|rem2={}",
            rems[0], rems[1], rems[2]
        ));
    }
}

/// `MEASURE_RUST` row for one input file (`emit measure FILE...`): the port's streams, the
/// zero-trit counts of `trijection.py:84-87`, and restore.
pub fn measure_row(name: &str, data: &[u8]) -> String {
    let f = trijection_forward(data);
    let z = zero_trits(&f.sa, &f.sb);
    let ok = if inverse_of(&f).as_deref() == Some(data) {
        "OK"
    } else {
        "FAIL"
    };
    format!(
        "MEASURE_RUST|file={name}|n={}|total_len={}|pad={}|streams_sha256={}|zeros={}|trits={}|restore={ok}",
        data.len(),
        f.total_len,
        f.pad,
        streams_sha256(&f),
        z.zeros,
        z.trits
    )
}
