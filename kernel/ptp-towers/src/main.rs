//! Cloud reproduction of ACER's PTP run (prime to prime: towers, cylinders), written
//! independently of ACER's code. Integer only; the balanced round trip uses the tribit kernel.
//! Output is HBP rows (json=0), one per measured fact.

use asolaria_tribit::{TritWord, Zero};

const N: usize = 10_000_000;
const TRITS: usize = 16;

fn sieve(n: usize) -> Vec<bool> {
    let mut is_prime = vec![true; n + 1];
    is_prime[0] = false;
    is_prime[1] = false;
    let mut i = 2;
    while i * i <= n {
        if is_prime[i] {
            let mut j = i * i;
            while j <= n {
                is_prime[j] = false;
                j += i;
            }
        }
        i += 1;
    }
    is_prime
}

/// Spoke trit of a prime above 3: +1 on 6k+1, -1 on 6k-1.
fn spoke(p: usize) -> i8 {
    if p % 6 == 1 {
        1
    } else {
        -1
    }
}

/// Three balanced trits (most significant first) of a residue mod 27, read in -13..=13.
fn cell_trits(r: usize) -> [i8; 3] {
    let centred = if r > 13 { r as i64 - 27 } else { r as i64 };
    let off = u128::try_from(centred + 13).expect("in range");
    let mut z = [Zero::Nil; 3];
    TritWord(off).unpack(&mut z);
    [z[0].direction(), z[1].direction(), z[2].direction()]
}

fn main() {
    let is_prime = sieve(N);
    let pi = |x: usize| is_prime[..=x].iter().filter(|&&b| b).count() as u64;
    let pi6 = pi(1_000_000);
    let pi7 = pi(N);
    println!("PTPRUN|n_max={N}|lane=cloud-x86_64-linux-gnu|toolchain=1.81.0|float=0|json=0");
    println!(
        "PI|x=1000000|pi={pi6}|expected=78498|ok={}|json=0",
        u8::from(pi6 == 78_498)
    );
    println!(
        "PI|x=10000000|pi={pi7}|expected=664579|ok={}|json=0",
        u8::from(pi7 == 664_579)
    );

    // The six phases of the mod-6 wheel.
    let mut phase = [0u64; 6];
    for (k, &p) in is_prime.iter().enumerate() {
        if p {
            phase[k % 6] += 1;
        }
    }
    for (r, c) in phase.iter().enumerate() {
        println!("PHASE|residue_mod6={r}|primes={c}|json=0");
    }
    let plus = phase[1];
    let minus = phase[5];
    let above3 = pi7 - 2;
    println!(
        "SPOKES|plus1_6k+1={plus}|minus1_6k-1={minus}|primes_above_3={above3}|all_on_spokes={}|minus1_lead={}|json=0",
        u8::from(plus + minus == above3),
        minus as i64 - plus as i64
    );

    // Control: how many spoke numbers are prime at all.
    let coprime6 = (1..=N).filter(|k| k % 6 == 1 || k % 6 == 5).count() as u64;
    let non_prime = coprime6 - above3;
    println!(
        "CONTROL|coprime_to_6={coprime6}|prime={above3}|not_prime={non_prime}|of_which_unit_1=1|composite={}|prime_share_per10000={}|json=0",
        non_prime - 1,
        above3 * 10_000 / coprime6
    );

    // Mod 3: the centre trit 0 holds only the prime 3.
    let centre: Vec<usize> = (0..=N).filter(|&k| is_prime[k] && k % 3 == 0).collect();
    println!(
        "MOD3|centre_primes={}|only_3={}|json=0",
        centre.len(),
        u8::from(centre == [3])
    );

    // The 27-cube: residues mod 27 as three balanced trits.
    let mut cell = [0u64; 27];
    for (k, &p) in is_prime.iter().enumerate() {
        if p {
            cell[k % 27] += 1;
        }
    }
    for (r, &c) in cell.iter().enumerate() {
        let t = cell_trits(r);
        println!(
            "CELL|r={r}|trits={},{},{}|coprime_to_3={}|primes={c}|json=0",
            t[0],
            t[1],
            t[2],
            u8::from(r % 3 != 0)
        );
    }
    let coprime_cells: Vec<u64> = (0..27).filter(|r| r % 3 != 0).map(|r| cell[r]).collect();
    let min = *coprime_cells.iter().min().expect("18 cells");
    let max = *coprime_cells.iter().max().expect("18 cells");
    let sum: u64 = coprime_cells.iter().sum();
    let centre_nonempty: Vec<String> = (0..27)
        .filter(|r| r % 3 == 0 && cell[*r] > 0)
        .map(|r| format!("{r}:{}", cell[r]))
        .collect();
    println!(
        "CUBE27|coprime_cells={}|populated={}|min={min}|max={max}|spread_per10000_of_mean={}|centre_plane_nonempty={}|json=0",
        coprime_cells.len(),
        coprime_cells.iter().filter(|&&c| c > 0).count(),
        (max - min) * 10_000 * coprime_cells.len() as u64 / sum,
        centre_nonempty.join(";")
    );

    // Prime to prime: does each prime above 3 stay on its spoke or switch?
    let (mut first, mut prev) = (0i8, 0i8);
    let (mut stay, mut minus_to_plus, mut plus_to_minus) = (0u64, 0u64, 0u64);
    for (k, &p) in is_prime.iter().enumerate().skip(5) {
        if !p {
            continue;
        }
        let s = spoke(k);
        if prev == 0 {
            first = s;
        } else if prev == s {
            stay += 1;
        } else if prev == -1 {
            minus_to_plus += 1;
        } else {
            plus_to_minus += 1;
        }
        prev = s;
    }
    let last = prev;
    let pairs = stay + minus_to_plus + plus_to_minus;
    let switches = minus_to_plus + plus_to_minus;
    // In any +/- sequence, (-→+) − (+→-) = [last is +] − [first is +]: forced, not prime-specific.
    let forced = minus_to_plus as i64 - plus_to_minus as i64
        == i64::from(u8::from(last == 1)) - i64::from(u8::from(first == 1));
    println!(
        "P2P|pairs={pairs}|switch={switches}|stay={stay}|switch_permille={}|independence_baseline_permille=500|minus_to_plus={minus_to_plus}|plus_to_minus={plus_to_minus}|first_spoke={first}|last_spoke={last}|direction_balance_is_forced={}|json=0",
        switches * 1000 / pairs,
        u8::from(forced)
    );

    // Towers: p = 6k±1 rebuilt, and a 16-trit balanced round trip through tribit.
    let h: i64 = (3i64.pow(TRITS as u32) - 1) / 2;
    let (mut total, mut rebuilt, mut round) = (0u64, 0u64, 0u64);
    let mut z = [Zero::Nil; TRITS];
    for (k, &p) in is_prime.iter().enumerate().skip(5) {
        if !p {
            continue;
        }
        total += 1;
        let pv = k as i64;
        let ok = if spoke(k) == 1 {
            6 * ((pv - 1) / 6) + 1 == pv
        } else {
            6 * ((pv + 1) / 6) - 1 == pv
        };
        rebuilt += u64::from(ok);
        let off = u128::try_from(pv + h).expect("non-negative");
        TritWord(off).unpack(&mut z);
        let mut v: i64 = 0;
        for t in z.iter() {
            v = v * 3 + i64::from(t.direction());
        }
        round += u64::from(TritWord::pack(&z).0 == off && v == pv);
    }
    println!(
        "TOWERS|primes_above_3={total}|rebuilt_6k_pm_1={rebuilt}|roundtrip_{TRITS}trit_tribit={round}|all={}|json=0",
        u8::from(rebuilt == total && round == total)
    );

    // Addressing on demand to level 60. Level L has 3^(3L) voxels (3^180 at L = 60); none is
    // built. A prime's level-L address is its residue mod 3^(3L), computed from the prime alone.
    let primes: Vec<u128> = is_prime
        .iter()
        .enumerate()
        .filter(|&(_, &p)| p)
        .map(|(k, _)| k as u128)
        .collect();
    let mut zero_from = 0u32;
    let mut zero_stays = true;
    for level in 1u32..=60 {
        let mut addr: Vec<u128> = primes.iter().map(|&p| level_address(p, level)).collect();
        // The level-L address is the inner part of the level-(L+1) address.
        let nested = primes
            .iter()
            .filter(|&&p| {
                level_address(level_address(p, level + 1), level) == level_address(p, level)
            })
            .count();
        addr.sort_unstable();
        let mut shared = 0u64;
        let mut i = 0;
        while i < addr.len() {
            let mut j = i + 1;
            while j < addr.len() && addr[j] == addr[i] {
                j += 1;
            }
            if j - i >= 2 {
                shared += (j - i) as u64;
            }
            i = j;
        }
        if shared == 0 && zero_from == 0 {
            zero_from = level;
        }
        if zero_from != 0 && shared != 0 {
            zero_stays = false;
        }
        if level <= 6 || level == 60 {
            println!(
                "LEVEL|level={level}|voxels=3^{}|primes_sharing_a_voxel={shared}|inner_address_kept={nested}/{}|json=0",
                3 * level,
                primes.len()
            );
        }
    }
    let rooms = |p: u128| -> String {
        let (a, b) = (
            low_trits(level_address(p, 1)),
            low_trits(level_address(p, 60)),
        );
        format!("{},{},{}|same_at_60={}", a[0], a[1], a[2], u8::from(a == b))
    };
    println!(
        "ADDRESS60|sharing_reaches_zero_at_level={zero_from}|stays_zero_through_60={}|room_of_2={}|room_of_3={}|trit_order=least_significant_first|json=0",
        u8::from(zero_stays),
        rooms(2),
        rooms(3)
    );
}

/// Residue of `p` mod 3^(3*level). Past u128 the modulus exceeds every prime, so the residue is `p`.
fn level_address(p: u128, level: u32) -> u128 {
    match (0..3 * level).try_fold(1u128, |m, _| m.checked_mul(3)) {
        Some(m) => p % m,
        None => p,
    }
}

/// The three lowest balanced trits of `x`, least significant first.
fn low_trits(x: u128) -> [i8; 3] {
    let mut v = x;
    let mut out = [0i8; 3];
    for t in out.iter_mut() {
        let d = v % 3;
        if d == 2 {
            *t = -1;
            v = v / 3 + 1;
        } else {
            *t = d as i8;
            v /= 3;
        }
    }
    out
}
