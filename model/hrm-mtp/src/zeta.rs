//! `zeta-process.mjs` (Layer 2): the von Mangoldt chain over code points.
//!
//! Numbers follow JavaScript: `Math.log` through [`crate::fdlibm`], the weights, their sums and
//! the sampled threshold through `l0_edge::jsnum::Dbl`, the Mulberry32 unit on `u32`.

use crate::fdlibm::log_int;
use crate::primes::{is_listed_prime, primes};
use crate::sf64::Sf64;
use crate::JsError;
use l0_edge::jsnum::Dbl;

/// `HONEST_GAPS` (zeta-process.mjs:157-163), quoted.
pub const HONEST_GAPS: [&str; 5] = [
    "Tao bound is for integers \u{2264} x with fixed alphabet; BEHCS-1024 small-N edge cases need numerical verification",
    "Prediction accuracy unproven empirically \u{2014} need fixture of 50-100 real PID transitions to measure hit rate",
    "von Mangoldt chain has O(1/log x) error term; at x\u{2248}1024 \u{2192} ~14% prediction noise expected",
    "Tao 2026-05 Erd\u{151}s #1196 is post-cutoff for L2 agent; operator-asserted only",
    "cp=2 is an absorbing sink: vonMangoldtNext(2) \u{2192} next=2 (only divisor>1 is 2, cp/2=1\u{2192}max(2,1)=2). Empirical 2026-05-25 via revolver-MTP wire: cp0=2 collapses all K heads; cp0=500 depth=1 diverges cleanly (4/4 unique); cp0=500 depth=4 also collapses to cp=2. Stay in middle band cp\u{2208}[~50,~900] with depth\u{2264}2 for healthy K-head divergence.",
];

/// `algorithm` of [`predict_k_positions`] (zeta-process.mjs:128).
pub const CHAIN_ALGORITHM: &str = "zeta-process-von-mangoldt-chain.v1";

/// Steps below this bound keep `(step >>> 0) * 0x6d2b79f5` exact in binary64 (zeta-process.mjs:80).
pub const MAX_STEP: u32 = 1 << 22;

/// Integers below this bound make `Math.floor(Math.sqrt(n))` equal the integer square root.
pub const MAX_CP: i64 = 1 << 52;

/// `vonMangoldt(n)` (zeta-process.mjs:25-37) for integer `n`: `Math.log(p)` when `n = p^a` with
/// `p` among the first 1000 primes, otherwise 0.
pub fn von_mangoldt(n: i64) -> Sf64 {
    if n < 2 {
        return Sf64::ZERO;
    }
    let n = n as u64;
    if is_listed_prime(n) {
        return log_int(n);
    }
    for &p in primes() {
        if p > n {
            break;
        }
        if n % p != 0 {
            continue;
        }
        let mut m = n;
        while m % p == 0 {
            m /= p;
        }
        return if m == 1 { log_int(p) } else { Sf64::ZERO };
    }
    Sf64::ZERO
}

fn isqrt(n: u64) -> u64 {
    let mut r = 0u64;
    let mut bit = 1u64 << 31;
    while bit > 0 {
        let candidate = r | bit;
        if candidate * candidate <= n {
            r = candidate;
        }
        bit >>= 1;
    }
    r
}

/// `divisors(n)` (zeta-process.mjs:41-52), ascending; panics for `n >= 2^52`.
pub fn divisors(n: i64) -> Vec<i64> {
    if n < 1 {
        return Vec::new();
    }
    assert!(n < MAX_CP, "n below 2^52");
    let mut out = Vec::new();
    let root = isqrt(n as u64) as i64;
    for d in 1..=root {
        if n % d == 0 {
            out.push(d);
            if d != n / d {
                out.push(n / d);
            }
        }
    }
    out.sort_unstable();
    out
}

/// `nuLambda(cp)` (zeta-process.mjs:56-60) for integer `cp`.
pub fn nu_lambda(cp: i64) -> Dbl {
    if cp < 2 {
        return Dbl::ZERO;
    }
    let x = Dbl::from_u64(cp as u64);
    Dbl::from_u64(1) / (x * log_int(cp as u64).to_dbl())
}

/// `nuLambdaTable(maxCp)` (zeta-process.mjs:62-66).
pub fn nu_lambda_table(max_cp: usize) -> Vec<Dbl> {
    let mut table = vec![Dbl::ZERO; max_cp + 1];
    for (cp, slot) in table.iter_mut().enumerate().skip(2) {
        *slot = nu_lambda(cp as i64);
    }
    table
}

/// `bandWeight(cpStart, cpEnd)` (zeta-process.mjs:68-72).
pub fn band_weight(cp_start: i64, cp_end: i64) -> Dbl {
    let mut sum = Dbl::ZERO;
    let mut cp = cp_start;
    while cp <= cp_end {
        sum = sum + nu_lambda(cp);
        cp += 1;
    }
    sum
}

/// `deterministicUnit(seed, step)` (zeta-process.mjs:78-84) as the numerator `a` of `a / 2^32`;
/// panics for `step >= 2^22`.
pub fn deterministic_unit(seed: u32, step: u32) -> u32 {
    assert!(step < MAX_STEP, "step below 2^22");
    let mut a = ((u64::from(seed) + u64::from(step) * 0x6d2b_79f5) & 0xffff_ffff) as u32;
    a = (a ^ (a >> 15)).wrapping_mul(a | 1);
    a ^= a.wrapping_add((a ^ (a >> 7)).wrapping_mul(a | 61));
    a ^ (a >> 14)
}

/// One `vonMangoldtNext` result (zeta-process.mjs:88-115).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ChainStep {
    /// `next`.
    pub next: i64,
    /// `divisor`.
    pub divisor: i64,
    /// `weight`, a binary64 value.
    pub weight: Dbl,
    /// `reason`.
    pub reason: String,
}

/// `vonMangoldtNext(cp, { seed, step })` (zeta-process.mjs:88-115) for an integer `cp`; panics for
/// `cp >= 2^52` or `step >= 2^22`.
pub fn von_mangoldt_next(cp: i64, seed: u32, step: u32) -> ChainStep {
    if cp < 2 {
        return ChainStep {
            next: 2,
            divisor: 1,
            weight: Dbl::ZERO,
            reason: "cp < 2 \u{2192} reset to 2".to_string(),
        };
    }
    let divs: Vec<i64> = divisors(cp).into_iter().filter(|&q| q > 1).collect();
    if divs.is_empty() {
        return ChainStep {
            next: cp,
            divisor: 1,
            weight: Dbl::ZERO,
            reason: "no proper divisor".to_string(),
        };
    }
    let log_cp = log_int(cp as u64).to_dbl();
    let weights: Vec<Dbl> = divs
        .iter()
        .map(|&q| von_mangoldt(q).to_dbl() / log_cp)
        .collect();
    let total = weights.iter().fold(Dbl::ZERO, |s, &w| s + w);
    if total.is_zero() {
        return ChainStep {
            next: cp,
            divisor: 1,
            weight: Dbl::ZERO,
            reason: "all weights zero (cp not prime-power-rich)".to_string(),
        };
    }
    let unit = deterministic_unit(seed ^ (cp as u64 as u32), step);
    let u = Dbl::from_ratio(u64::from(unit), 1 << 32) * total;
    let mut acc = Dbl::ZERO;
    for (i, &w) in weights.iter().enumerate() {
        acc = acc + w;
        if u <= acc {
            let q = divs[i];
            return ChainStep {
                next: (cp / q).max(2),
                divisor: q,
                weight: w,
                reason: format!("\u{39b}({q})/log({cp})"),
            };
        }
    }
    let last = divs.len() - 1;
    let q = divs[last];
    ChainStep {
        next: (cp / q).max(2),
        divisor: q,
        weight: weights[last],
        reason: "tail-pick".to_string(),
    }
}

/// One row of a [`predict_k_positions`] trajectory.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TrajectoryStep {
    /// `step`.
    pub step: u32,
    /// `from`.
    pub from: i64,
    /// The `vonMangoldtNext` fields.
    pub sample: ChainStep,
}

/// `predictKPositions` output (zeta-process.mjs:127-134).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Trajectory {
    /// `cp_start`.
    pub cp_start: i64,
    /// `k`.
    pub k: u32,
    /// `trajectory`.
    pub trajectory: Vec<TrajectoryStep>,
    /// `final_cp`.
    pub final_cp: i64,
    /// `seed`.
    pub seed: u32,
}

/// `predictKPositions(cp0, k, { seed })` (zeta-process.mjs:117-135).
pub fn predict_k_positions(cp0: i64, k: i64, seed: u32) -> Result<Trajectory, JsError> {
    if k < 1 {
        return Err(JsError::Range(
            "predictKPositions: k must be >= 1".to_string(),
        ));
    }
    let k = u32::try_from(k)
        .ok()
        .filter(|&k| k <= MAX_STEP)
        .ok_or_else(|| {
            JsError::Domain(format!("predictKPositions: k {k} above the ported 2^22"))
        })?;
    if cp0 >= MAX_CP {
        return Err(JsError::Domain(format!(
            "predictKPositions: cp0 {cp0} not below the ported 2^52"
        )));
    }
    let mut trajectory = Vec::with_capacity(k as usize);
    let mut current = cp0;
    for step in 0..k {
        let sample = von_mangoldt_next(current, seed, step);
        let next = sample.next;
        trajectory.push(TrajectoryStep {
            step,
            from: current,
            sample,
        });
        current = next;
    }
    Ok(Trajectory {
        cp_start: cp0,
        k,
        trajectory,
        final_cp: current,
        seed,
    })
}

/// `chainAntichainBound(nConcurrent)` (zeta-process.mjs:142-153).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ChainAntichainBound {
    /// `theorem`.
    pub theorem: &'static str,
    /// `n_concurrent`.
    pub n_concurrent: u64,
    /// `required_mass_per_pid` = `1 / nConcurrent`.
    pub required_mass_per_pid: Dbl,
    /// `constructive_answer`.
    pub constructive_answer: &'static str,
    /// `citation`.
    pub citation: &'static str,
}

/// `chainAntichainBound(nConcurrent)` (zeta-process.mjs:142-153) for an integer argument.
pub fn chain_antichain_bound(n_concurrent: i64) -> Result<ChainAntichainBound, JsError> {
    if n_concurrent < 1 {
        return Err(JsError::Range(
            "chainAntichainBound: nConcurrent must be >= 1".to_string(),
        ));
    }
    let n = n_concurrent as u64;
    Ok(ChainAntichainBound {
        theorem: "tao-proposition-7-chain-antichain-duality",
        n_concurrent: n,
        required_mass_per_pid: Dbl::from_ratio(1, n),
        constructive_answer: "revolver-chambers (pid-chain-revolver.mjs)",
        citation: "arxiv 2605.00301 (operator-asserted, L2-unverified post-cutoff)",
    })
}
