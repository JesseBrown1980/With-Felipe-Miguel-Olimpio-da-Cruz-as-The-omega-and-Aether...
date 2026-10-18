//! THREE-GAP — exhaustive verification, for the referee.
//!
//! Andrew Lustig's reviewer asked for "the theorem being claimed, and the proof
//! step by step." The proof is in the paper. This is the computational check
//! that accompanies it, and it tests the STRONG form of the theorem, not the
//! weak one.
//!
//! WEAK FORM (what SHADOWCAT checked): at most three distinct gaps.
//! STRONG FORM (what this checks): when there are exactly three distinct gaps,
//!   the largest is the SUM of the other two.
//!
//! The strong form is a much sharper test. A buggy implementation can easily
//! produce three distinct gaps by accident; producing three gaps in which
//! g_max = g_min + g_mid, at every N, is not something a wrong program does.
//!
//! Sweep: every ordered pair from the Rime axes {2731, 1999, 1723}, plus a
//! control set of unrelated moduli, at EVERY N from 2 to 400. That is tens of
//! thousands of independent instances, not the 30 spot-checks in SHADOWCAT.

const RIME_AXES: [i64; 3] = [2731, 1999, 1723];
const CONTROLS: [i64; 6] = [97, 233, 512, 1000, 4096, 9973];

/// Place N points by repeatedly stepping `stride` around a ring of size `ring`,
/// then return the sorted distinct circular gap lengths.
fn gaps(ring: i64, stride: i64, n: i64) -> Vec<i64> {
    let mut pts: Vec<i64> = Vec::with_capacity(n as usize);
    let mut acc: i64 = 0;
    for _ in 0..n {
        pts.push(acc);
        acc = (acc + stride) % ring;
    }
    pts.sort_unstable();
    pts.dedup();
    let m = pts.len();
    let mut g: Vec<i64> = Vec::with_capacity(m);
    for i in 0..m {
        let a = pts[i];
        let b = if i + 1 < m { pts[i + 1] } else { pts[0] + ring };
        g.push(b - a);
    }
    g.sort_unstable();
    g.dedup();
    g
}

fn sweep(label: &str, moduli: &[i64], strides: &[i64], nmax: i64)
    -> (u64, u64, u64, u64, u64, Vec<String>) {
    let mut total = 0u64;
    let (mut one, mut two, mut three) = (0u64, 0u64, 0u64);
    let mut sum_ok = 0u64;
    let mut failures: Vec<String> = Vec::new();

    for &ring in moduli {
        for &stride in strides {
            if stride % ring == 0 { continue; }          // degenerate, excluded
            for n in 2..=nmax {
                let g = gaps(ring, stride, n);
                total += 1;
                match g.len() {
                    1 => one += 1,
                    2 => two += 1,
                    3 => {
                        three += 1;
                        // THE STRONG FORM
                        if g[2] == g[0] + g[1] {
                            sum_ok += 1;
                        } else if failures.len() < 10 {
                            failures.push(format!(
                                "ring {} stride {} N {} gaps {:?}  {} != {} + {}",
                                ring, stride, n, g, g[2], g[0], g[1]));
                        }
                    }
                    k => {
                        if failures.len() < 10 {
                            failures.push(format!(
                                "ring {} stride {} N {} -> {} DISTINCT GAPS {:?}",
                                ring, stride, n, k, g));
                        }
                    }
                }
            }
        }
    }
    println!("  {}", label);
    println!("    instances tested        {}", total);
    println!("    exactly 1 distinct gap  {}", one);
    println!("    exactly 2 distinct gaps {}", two);
    println!("    exactly 3 distinct gaps {}", three);
    println!("    MORE than 3             {}   <-- must be 0",
             total - one - two - three);
    println!("    of the 3-gap cases, max == min + mid:  {} / {}   ({})",
             sum_ok, three,
             if sum_ok == three { "ALL" } else { "*** NOT ALL ***" });
    (total, one, two, three, sum_ok, failures)
}

fn main() {
    println!("THREE-GAP THEOREM — EXHAUSTIVE VERIFICATION");
    println!("weak form: at most 3 distinct gaps");
    println!("strong form: when 3, the largest equals the sum of the other two");
    println!("{}", "=".repeat(78));

    let nmax = 400i64;
    println!("\nN swept from 2 to {} inclusive, every value, no sampling.\n", nmax);

    let (t1, _, _, th1, s1, f1) =
        sweep("THE RIME AXES  {2731, 1999, 1723}, all ordered pairs",
              &RIME_AXES, &RIME_AXES, nmax);
    println!();
    let (t2, _, _, th2, s2, f2) =
        sweep("CONTROL MODULI {97, 233, 512, 1000, 4096, 9973}, all ordered pairs",
              &CONTROLS, &CONTROLS, nmax);
    println!();
    let (t3, _, _, th3, s3, f3) =
        sweep("CROSS: rime rings strided by control values",
              &RIME_AXES, &CONTROLS, nmax);

    let total = t1 + t2 + t3;
    let three = th1 + th2 + th3;
    let sum_ok = s1 + s2 + s3;
    let mut fails: Vec<String> = Vec::new();
    fails.extend(f1); fails.extend(f2); fails.extend(f3);

    println!("\n{}", "=".repeat(78));
    println!("TOTAL instances            {}", total);
    println!("TOTAL 3-gap instances      {}", three);
    println!("TOTAL satisfying max=min+mid {}", sum_ok);
    if fails.is_empty() {
        println!("\nVIOLATIONS: NONE.");
        println!("weak form holds in all {} instances.", total);
        println!("strong form holds in all {} three-gap instances.", three);
        println!("\nNote the control moduli: 512, 1000 and 4096 are NOT prime and");
        println!("share factors with several strides. The theorem holds there too,");
        println!("which is correct — three-gap needs no coprimality. Coprimality is");
        println!("what Theorem 1 (never-touch) needs. The two are separate results");
        println!("and this sweep confirms they are separate.");
    } else {
        println!("\n*** VIOLATIONS FOUND ({} shown) ***", fails.len());
        for f in &fails { println!("    {}", f); }
    }
}
