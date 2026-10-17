//! The universe simulator's frozen slice agents on enwik bytes: `hrm_agent` (Law 25) and
//! `mtp_agent` (Law 24) of players/rime_agents.py, and the MTP / HRM / Fischer play of
//! players/rime_windunwind.py.
//!
//! Counts are exact integers. A bits-per-character value is the exact sum of
//! `log2(total + 256) - log2(count + 1)` over the scored bytes, held as integer multiplicities of
//! `log2(v)` and summed in Q64 ([`crate::log2fx`]); upstream sums binary64 `math.log2` / `np.log2`
//! values, so the two agree to the printed four decimals while the double's last bits depend on
//! the platform libm and the summation order.

use crate::log2fx::{round_q64_ratio, Log2Tally};
use crate::sf64::Sf64;

/// Bytes `rime_agents.py` reads (lines 68, 104).
pub const AGENT_BYTES: usize = 600_000;
/// Training prefix length (lines 69, 105).
pub const AGENT_TRAIN: usize = 500_000;

/// Contexts of two bytes.
const CTX2: usize = 1 << 16;

/// The frozen order-2 / order-1 / order-0 count tables of `hrm_agent` (rime_agents.py:106-112).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HrmTables {
    /// `c2[(b[i-2], b[i-1])][b[i]]`, indexed `ctx * 256 + byte`.
    pub c2: Vec<u32>,
    /// `sum(c2[ctx].values())`.
    pub t2: Vec<u64>,
    /// `c1[b[i-1]][b[i]]`, indexed `prev * 256 + byte`.
    pub c1: Vec<u64>,
    /// `sum(c1[prev].values())`.
    pub t1: Vec<u64>,
    /// `c0[b[i]]`.
    pub c0: Vec<u64>,
    /// `t0 = sum(c0.values())`.
    pub t0: u64,
}

impl HrmTables {
    /// The tables over `train`, counting positions `2..len` (rime_agents.py:107-112).
    pub fn freeze(train: &[u8]) -> HrmTables {
        let mut t = HrmTables {
            c2: vec![0; CTX2 * 256],
            t2: vec![0; CTX2],
            c1: vec![0; 256 * 256],
            t1: vec![0; 256],
            c0: vec![0; 256],
            t0: 0,
        };
        for i in 2..train.len() {
            let b = usize::from(train[i]);
            let ctx2 = usize::from(train[i - 2]) << 8 | usize::from(train[i - 1]);
            let ctx1 = usize::from(train[i - 1]);
            t.c2[ctx2 << 8 | b] += 1;
            t.t2[ctx2] += 1;
            t.c1[ctx1 << 8 | b] += 1;
            t.t1[ctx1] += 1;
            t.c0[b] += 1;
        }
        t.t0 = t.c0.iter().sum();
        t
    }
}

/// `hrm_agent()` result (rime_agents.py:113-132).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HrmAgent {
    /// `n = len(test) - 2`.
    pub n: u64,
    /// `used[lvl]`: bytes routed deep (order-2), mid (order-1), base (order-0).
    pub used: [u64; 3],
    /// Multiplicities of `log2(v)` in `bits`.
    pub tally: Log2Tally,
}

/// The slow / fast play of `hrm_agent` over `test` (rime_agents.py:114-126).
pub fn hrm_agent(tables: &HrmTables, test: &[u8]) -> HrmAgent {
    let mut tally = Log2Tally::new();
    let mut used = [0u64; 3];
    for i in 2..test.len() {
        let b = usize::from(test[i]);
        let ctx2 = usize::from(test[i - 2]) << 8 | usize::from(test[i - 1]);
        let ctx1 = usize::from(test[i - 1]);
        // Slow module (lines 118-123): deep when the order-2 context has >= 8 counts, else mid
        // when the order-1 context was seen, else the order-0 floor.
        let (count, tot, lvl) = if tables.t2[ctx2] >= 8 {
            (u64::from(tables.c2[ctx2 << 8 | b]), tables.t2[ctx2], 0)
        } else if tables.t1[ctx1] > 0 {
            (tables.c1[ctx1 << 8 | b], tables.t1[ctx1], 1)
        } else {
            (tables.c0[b], tables.t0, 2)
        };
        // Fast module (line 125): -log2((count + 1) / (tot + 256)).
        tally.add(tot + 256, 1);
        tally.add(count + 1, -1);
        used[lvl] += 1;
    }
    HrmAgent {
        n: test.len().saturating_sub(2) as u64,
        used,
        tally,
    }
}

/// `freeze(byts)` of `mtp_agent` (rime_agents.py:70-76): per order-2 context the next byte with
/// the highest count, ties to the byte first seen in that context (Python `max` over a dict).
pub fn mtp_freeze(byts: &[u8]) -> Vec<Option<u8>> {
    let mut seen: Vec<Vec<(u8, u32)>> = vec![Vec::new(); CTX2];
    for i in 2..byts.len() {
        let ctx = usize::from(byts[i - 2]) << 8 | usize::from(byts[i - 1]);
        let row = &mut seen[ctx];
        match row.iter_mut().find(|(b, _)| *b == byts[i]) {
            Some((_, c)) => *c += 1,
            None => row.push((byts[i], 1)),
        }
    }
    seen.iter()
        .map(|row| {
            let mut best: Option<(u8, u32)> = None;
            for &(b, c) in row {
                if best.map_or(true, |(_, bc)| c > bc) {
                    best = Some((b, c));
                }
            }
            best.map(|(b, _)| b)
        })
        .collect()
}

/// `rollout(model, byts, depth, anchors)` (rime_agents.py:79-90) as `(hits, tot)`.
pub fn mtp_rollout(model: &[Option<u8>], byts: &[u8], depth: usize, anchors: usize) -> (u64, u64) {
    let (mut hits, mut tot) = (0u64, 0u64);
    let step = (byts.len() - depth - 2) / anchors;
    for a in 0..anchors {
        let i = 2 + a * step;
        let mut c = (byts[i - 2], byts[i - 1]);
        let mut ok = true;
        for d in 0..depth {
            match model[usize::from(c.0) << 8 | usize::from(c.1)] {
                Some(pr) if pr == byts[i + d] => c = (c.1, pr),
                _ => {
                    ok = false;
                    break;
                }
            }
        }
        hits += u64::from(ok);
        tot += 1;
    }
    (hits, tot)
}

/// `mtp_agent()` result (rime_agents.py:77-92) as `(hits, tot)` pairs.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct MtpAgent {
    /// Forward x1.
    pub f1: (u64, u64),
    /// Forward x3.
    pub f3: (u64, u64),
    /// Forward x27.
    pub f27: (u64, u64),
    /// Backward x1 (table frozen on reversed training bytes, scored on reversed test bytes).
    pub b1: (u64, u64),
}

/// `mtp_agent()` over the 600,000-byte read (rime_agents.py:68-92).
pub fn mtp_agent(data: &[u8]) -> MtpAgent {
    let (train, test) = data.split_at(AGENT_TRAIN.min(data.len()));
    let fwd = mtp_freeze(train);
    let train_rev: Vec<u8> = train.iter().rev().copied().collect();
    let test_rev: Vec<u8> = test.iter().rev().copied().collect();
    let bwd = mtp_freeze(&train_rev);
    MtpAgent {
        f1: mtp_rollout(&fwd, test, 1, 1200),
        f3: mtp_rollout(&fwd, test, 3, 1200),
        f27: mtp_rollout(&fwd, test, 27, 1200),
        b1: mtp_rollout(&bwd, &test_rev, 1, 1200),
    }
}

/// The three result lines `mtp_agent()` prints (rime_agents.py:93-95).
pub fn mtp_agent_lines(m: &MtpAgent) -> [String; 3] {
    let r = |p: (u64, u64)| format_ratio(p.0, p.1, 4);
    [
        "  direction 0 (hold)     : accuracy 1.0000  \u{2014} the free center, costs nothing, says nothing".to_string(),
        format!(
            "  direction + (forward)  : x1 {}   x3 {}   x27 {}",
            r(m.f1),
            r(m.f3),
            r(m.f27)
        ),
        format!(
            "  direction - (backward) : x1 {}   (frozen on reversed time \u{2014} real, ~symmetric)",
            r(m.b1)
        ),
    ]
}

/// The two result lines `hrm_agent()` prints (rime_agents.py:128-129), the bpc rounded from the
/// exact sum; with it the distance of that sum from a rounding boundary (units of 10^-12).
pub fn hrm_agent_lines(h: &HrmAgent) -> ([String; 2], u128) {
    let n = h.n;
    let (bits_q64, _) = h.tally.sum_q64();
    let (bpc4, margin) = round_q64_ratio(bits_q64, n, 4);
    (
        [
            format!(
                "  levels used: deep(27-ish ctx) {}%  mid(3-ish) {}%  base(rime floor) {}%",
                h.used[0] * 100 / n,
                h.used[1] * 100 / n,
                h.used[2] * 100 / n
            ),
            format!("  frozen hierarchical bpc on held-out enwik8 = {bpc4}"),
        ],
        margin,
    )
}

/// Python `f"{x:.{digits}f}"` of the binary64 `x`: the exact value rounded half to even.
pub fn format_fixed(x: Sf64, digits: u32) -> String {
    let (neg, mant, exp) = x.to_parts();
    assert!(!neg || x.is_zero(), "non-negative value");
    let scale = 10u128.pow(digits);
    let (q, rem, half_unit) = if exp >= 0 {
        ((u128::from(mant) << exp) * scale, 0u128, 1u128)
    } else {
        let k = exp.unsigned_abs();
        assert!(k < 100, "value in the formatted range");
        let n = u128::from(mant) * scale;
        (n >> k, n & ((1u128 << k) - 1), 1u128 << (k - 1))
    };
    let up = rem > half_unit || (rem == half_unit && q & 1 == 1);
    let v = q + u128::from(up);
    if digits == 0 {
        return format!("{v}");
    }
    format!(
        "{}.{:0width$}",
        v / scale,
        v % scale,
        width = digits as usize
    )
}

/// Python `f"{hits / tot:.4f}"`.
pub fn format_ratio(hits: u64, tot: u64, digits: u32) -> String {
    format_fixed(Sf64::from_ratio(hits, tot), digits)
}

/// `windunwind`: the frozen bank of rime_windunwind.py:43-55.
pub mod windunwind {
    use super::CTX2;
    use crate::log2fx::Log2Tally;

    /// `P, N` (rime_windunwind.py:24).
    pub const P: u64 = 103_681;
    /// `N`.
    pub const N: u64 = 20_736;
    /// `SECTORS` (rime_windunwind.py:25).
    pub const SECTORS: usize = 27;
    /// `SEC = 1_000_000_000 // SECTORS`.
    pub const SEC: usize = 1_000_000_000 / SECTORS;

    /// `freeze2(b)` (rime_windunwind.py:46-49): trigram counts `[c1 c2] -> next`, and row sums.
    pub fn freeze2(b: &[u8]) -> (Vec<u32>, Vec<u64>) {
        let mut c = vec![0u32; CTX2 * 256];
        for w in b.windows(3) {
            c[usize::from(w[0]) << 16 | usize::from(w[1]) << 8 | usize::from(w[2])] += 1;
        }
        let t = c
            .chunks(256)
            .map(|row| row.iter().map(|&x| u64::from(x)).sum())
            .collect();
        (c, t)
    }

    /// The bank frozen on enwik8 (rime_windunwind.py:45-54).
    #[derive(Clone, Debug, PartialEq, Eq)]
    pub struct Bank {
        /// `C2f`.
        pub c2f: Vec<u32>,
        /// `T2f`.
        pub t2f: Vec<u64>,
        /// `C2b` (frozen on the reversed bank).
        pub c2b: Vec<u32>,
        /// `T2b`.
        pub t2b: Vec<u64>,
        /// `C1` (bigrams over the whole bank).
        pub c1: Vec<u64>,
        /// `T1`.
        pub t1: Vec<u64>,
        /// `C0`.
        pub c0: Vec<u64>,
        /// `T0`.
        pub t0: u64,
    }

    impl Bank {
        /// `C2f, T2f, C2b, T2b, C1, T1, C0, T0` over `bank`.
        pub fn freeze(bank: &[u8]) -> Bank {
            let (c2f, t2f) = freeze2(bank);
            let reversed: Vec<u8> = bank.iter().rev().copied().collect();
            let (c2b, t2b) = freeze2(&reversed);
            drop(reversed);
            let mut c1 = vec![0u64; 256 * 256];
            for w in bank.windows(2) {
                c1[usize::from(w[0]) << 8 | usize::from(w[1])] += 1;
            }
            let t1 = c1.chunks(256).map(|row| row.iter().sum()).collect();
            let mut c0 = vec![0u64; 256];
            for &b in bank {
                c0[usize::from(b)] += 1;
            }
            let t0 = c0.iter().sum();
            Bank {
                c2f,
                t2f,
                c2b,
                t2b,
                c1,
                t1,
                c0,
                t0,
            }
        }
    }

    /// `primitive_root(p)` (rime_windunwind.py:28-37).
    pub fn primitive_root(p: u64) -> u64 {
        let mut fac = Vec::new();
        let (mut n, mut d) = (p - 1, 2u64);
        while d * d <= n {
            if n % d == 0 {
                fac.push(d);
                while n % d == 0 {
                    n /= d;
                }
            }
            d += 1;
        }
        if n > 1 {
            fac.push(n);
        }
        (2..p)
            .find(|&g| fac.iter().all(|&q| pow_mod(g, (p - 1) / q, p) != 1))
            .expect("a primitive root exists")
    }

    fn pow_mod(mut b: u64, mut e: u64, m: u64) -> u64 {
        let mut r = 1u64;
        b %= m;
        while e > 0 {
            if e & 1 == 1 {
                r = r * b % m;
            }
            b = b * b % m;
            e >>= 1;
        }
        r
    }

    /// The Fischer sphere tables `pts`, `inv` (rime_windunwind.py:38-41).
    #[derive(Clone, Debug, PartialEq, Eq)]
    pub struct Sphere {
        /// `pts[e] = W^e mod P`.
        pub pts: Vec<u64>,
        /// `inv[pts[e]] = e`.
        pub inv: Vec<u64>,
        /// `g`.
        pub g: u64,
        /// `W = g^((P-1)/N) mod P`.
        pub w: u64,
    }

    impl Sphere {
        /// `g = primitive_root(P); W = pow(g, (P-1)//N, P)`, `pts`, `inv`.
        pub fn build() -> Sphere {
            let g = primitive_root(P);
            let w = pow_mod(g, (P - 1) / N, P);
            let mut pts = vec![0u64; N as usize];
            let mut inv = vec![0u64; P as usize + 1];
            let mut v = 1u64;
            for slot in pts.iter_mut() {
                *slot = v;
                v = v * w % P;
            }
            for (e, &p) in pts.iter().enumerate() {
                inv[p as usize] = e as u64;
            }
            Sphere { pts, inv, g, w }
        }

        /// Wind, unwind and compare (rime_windunwind.py:81-85): `k = sec + 256*(i % 3) + 768*d`,
        /// `inv[pts[k]] == k` for every byte.
        pub fn wind_unwind_exact(&self, sector: &[u8], d: usize) -> bool {
            sector.iter().enumerate().all(|(i, &b)| {
                let k = u64::from(b) + 256 * (i as u64 % 3) + 768 * d as u64;
                self.inv[self.pts[k as usize] as usize] == k
            })
        }
    }

    /// One sector's play (rime_windunwind.py:78-96).
    #[derive(Clone, Debug, PartialEq, Eq)]
    pub struct SectorPlay {
        /// `exact` (the 0-check of the wind / unwind).
        pub exact: bool,
        /// `len(n)` for MTP+, MTP- and HRM (`len(sec) - 2`).
        pub n: u64,
        /// MTP+ bits as `(Q64 sum, error weight)`.
        pub mtp_fwd: (i128, u128),
        /// MTP- bits.
        pub mtp_bwd: (i128, u128),
        /// HRM bits.
        pub hrm: (i128, u128),
        /// Bytes routed deep by the HRM slow module.
        pub deep: u64,
    }

    /// Scratch tallies reused across sectors.
    pub struct Scratch {
        fwd: Log2Tally,
        bwd: Log2Tally,
        hrm: Log2Tally,
    }

    impl Default for Scratch {
        fn default() -> Scratch {
            Scratch {
                fwd: Log2Tally::new(),
                bwd: Log2Tally::new(),
                hrm: Log2Tally::new(),
            }
        }
    }

    /// `mtp_bits(sec, C2, T2)` (rime_windunwind.py:57-61) into `tally`, per-context totals
    /// grouped first.
    fn mtp_bits(sec: &[u8], c2: &[u32], t2: &[u64], tally: &mut Log2Tally) -> u64 {
        let mut per_ctx = vec![0i64; CTX2];
        for w in sec.windows(3) {
            let ctx = usize::from(w[0]) << 8 | usize::from(w[1]);
            per_ctx[ctx] += 1;
            tally.add(u64::from(c2[ctx << 8 | usize::from(w[2])]) + 1, -1);
        }
        for (ctx, &k) in per_ctx.iter().enumerate() {
            if k != 0 {
                tally.add(t2[ctx] + 256, k);
            }
        }
        sec.len().saturating_sub(2) as u64
    }

    /// `hrm_bits(sec)` (rime_windunwind.py:63-71) into `tally`; returns `(len(n), deep count)`.
    fn hrm_bits(bank: &Bank, sec: &[u8], tally: &mut Log2Tally) -> (u64, u64) {
        let mut per_ctx2 = vec![0i64; CTX2];
        let mut per_ctx1 = [0i64; 256];
        let mut floor = 0i64;
        let mut deep = 0u64;
        for w in sec.windows(3) {
            let c2 = usize::from(w[0]) << 8 | usize::from(w[1]);
            let c1 = usize::from(w[1]);
            let n = usize::from(w[2]);
            if bank.t2f[c2] >= 8 {
                deep += 1;
                per_ctx2[c2] += 1;
                tally.add(u64::from(bank.c2f[c2 << 8 | n]) + 1, -1);
            } else if bank.t1[c1] > 0 {
                per_ctx1[c1] += 1;
                tally.add(bank.c1[c1 << 8 | n] + 1, -1);
            } else {
                floor += 1;
                tally.add(bank.c0[n] + 1, -1);
            }
        }
        for (ctx, &k) in per_ctx2.iter().enumerate() {
            if k != 0 {
                tally.add(bank.t2f[ctx] + 256, k);
            }
        }
        for (ctx, &k) in per_ctx1.iter().enumerate() {
            if k != 0 {
                tally.add(bank.t1[ctx] + 256, k);
            }
        }
        if floor != 0 {
            tally.add(bank.t0 + 256, floor);
        }
        (sec.len().saturating_sub(2) as u64, deep)
    }

    /// The play of sector `d` (rime_windunwind.py:78-92).
    pub fn play_sector(
        bank: &Bank,
        sphere: &Sphere,
        sec: &[u8],
        d: usize,
        scratch: &mut Scratch,
    ) -> SectorPlay {
        scratch.fwd.clear();
        scratch.bwd.clear();
        scratch.hrm.clear();
        let exact = sphere.wind_unwind_exact(sec, d);
        let nf = mtp_bits(sec, &bank.c2f, &bank.t2f, &mut scratch.fwd);
        let reversed: Vec<u8> = sec.iter().rev().copied().collect();
        let nb = mtp_bits(&reversed, &bank.c2b, &bank.t2b, &mut scratch.bwd);
        let (nh, deep) = hrm_bits(bank, sec, &mut scratch.hrm);
        assert!(nf == nb && nb == nh, "the three counts agree");
        SectorPlay {
            exact,
            n: nf,
            mtp_fwd: scratch.fwd.sum_q64(),
            mtp_bwd: scratch.bwd.sum_q64(),
            hrm: scratch.hrm.sum_q64(),
            deep,
        }
    }
}
