//! The nine secrets. Each is a question a region asks and an exact computation the kernel runs from
//! scratch. Nothing here reads a stored answer: the expected values in [`crate::sources`] are used
//! only to say, beside the kernel's own number, whether the two agree (`DISAGREE` rows otherwise).
//! The kernel's own number wins.
//!
//! Integer only. Where a cited source carries a float (the Rupture Zone's float column) the value is
//! a string in a `CITED` row marked `run_here=0`; the game never runs a float.

use crate::hbp::Row;
use crate::sha256::{sha16, sha256_hex, Sha256};
use crate::sieve::{self, Sieve};
use crate::sources as src;
use crate::trits::{self, bal3_into, bal3_width, span};
use crate::wide::I256;
use asolaria_tribit::{prism, unprism, K, TRITS_PER_U128};
use std::io::Read;

pub const SECRET_COUNT: usize = 9;

/// A census of the white bytes of some text.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Census {
    pub bytes: u64,
    pub white: u64,
    pub sha256: String,
}

impl Census {
    /// White bytes per 10,000, integer division, with the remainder carried: `(q, r)`.
    pub fn per10000(&self) -> (u64, u64) {
        if self.bytes == 0 {
            return (0, 0);
        }
        let n = self.white * 10_000;
        (n / self.bytes, n % self.bytes)
    }
}

/// White space as the census counts it: space, tab, line feed, carriage return.
pub fn is_white(b: u8) -> bool {
    matches!(b, 0x20 | 0x09 | 0x0A | 0x0D)
}

/// Census of a byte buffer.
pub fn census_bytes(data: &[u8]) -> Census {
    let white = data.iter().filter(|b| is_white(**b)).count() as u64;
    Census {
        bytes: data.len() as u64,
        white,
        sha256: sha256_hex(data),
    }
}

/// Streaming census: one pass, constant memory (enwik8 is 100,000,000 bytes).
pub fn census_reader<R: Read>(r: &mut R) -> std::io::Result<Census> {
    let mut buf = vec![0u8; 1 << 16];
    let mut h = Sha256::new();
    let (mut bytes, mut white) = (0u64, 0u64);
    loop {
        let n = r.read(&mut buf)?;
        if n == 0 {
            break;
        }
        h.update(&buf[..n]);
        bytes += n as u64;
        white += buf[..n].iter().filter(|b| is_white(**b)).count() as u64;
    }
    Ok(Census {
        bytes,
        white,
        sha256: crate::sha256::to_hex(&h.finish()),
    })
}

/// The Mythos file as the console read it: bytes, and the first line of the sidecar if present.
#[derive(Clone, Debug)]
pub struct MythosFile {
    pub bytes: Vec<u8>,
    pub sidecar: Option<String>,
}

/// Everything the kernel may need from outside. The kernel itself does no I/O: the console reads
/// the files and hands the bytes over.
#[derive(Clone, Debug)]
pub struct Inputs {
    /// Census of `data/enwik8` when the file is present and exactly 100,000,000 bytes.
    pub enwik8: Option<Census>,
    /// Why `enwik8` is absent when it is (for the NOT_MEASURED row).
    pub enwik8_note: Option<String>,
    /// The bundled page used when enwik8 is absent and the run is not strict.
    pub page: String,
    /// Strict: without enwik8 secret 8 stays SEALED (DESIGN 5.8 as written).
    pub strict_enwik8: bool,
    pub mythos: Option<MythosFile>,
}

impl Inputs {
    /// No outside files at all.
    pub fn empty(page: &str) -> Inputs {
        Inputs {
            enwik8: None,
            enwik8_note: None,
            page: page.to_string(),
            strict_enwik8: false,
            mythos: None,
        }
    }
}

/// A computed secret.
#[derive(Clone, Debug)]
pub struct SecretOut {
    pub id: u8,
    /// The canonical answer token.
    pub token: String,
    /// Other spellings `solve` accepts.
    pub accepted: Vec<String>,
    /// The proof rows the region offers once solved.
    pub rows: Vec<Row>,
    /// `full`, or `bundled_page` for secret 8 without enwik8.
    pub scope: &'static str,
}

/// What computing a secret produced. Three-valued: a missing input is not a failure and not a pass.
#[derive(Clone, Debug)]
pub enum Outcome {
    Ready(SecretOut),
    NotMeasured {
        reason: &'static str,
        rows: Vec<Row>,
    },
    Failed {
        rows: Vec<Row>,
    },
}

/// Normalise a player's answer: trim, lowercase, drop spaces, and read the unicode minus as `-`.
pub fn normalise(answer: &str) -> String {
    answer
        .trim()
        .to_lowercase()
        .replace('\u{2212}', "-")
        .replace(' ', "")
}

impl SecretOut {
    /// Does the player's token match this secret?
    pub fn matches(&self, answer: &str) -> bool {
        let a = normalise(answer);
        a == normalise(&self.token) || self.accepted.iter().any(|t| normalise(t) == a)
    }

    /// `sha16("secret<id>|" + token)`: the only form of the answer a snapshot stores.
    pub fn answer_sha16(&self) -> String {
        answer_sha16(self.id, &self.token)
    }
}

pub fn answer_sha16(id: u8, token: &str) -> String {
    sha16(format!("secret{id}|{token}").as_bytes())
}

/// Compute one secret. `seed` is the world seed (used only where a secret needs seeded bytes).
pub fn compute(id: u8, seed: u64, inputs: &Inputs) -> Outcome {
    match id {
        1 => secret1(),
        2 => secret2(),
        3 => with_sieve(id, secret3),
        4 => with_sieve(id, secret4),
        5 => with_sieve(id, secret5),
        6 => secret6(seed),
        7 => secret7(),
        8 => secret8(inputs),
        9 => secret9(inputs),
        _ => Outcome::Failed {
            rows: vec![Row::new("MEASURED_FAIL")
                .kv("subject", "secret")
                .kv("id", id)
                .kv("reason", "no_such_secret")],
        },
    }
}

type Memo = std::sync::Mutex<std::collections::HashMap<(u8, u64), Outcome>>;
static MEMO: std::sync::OnceLock<Memo> = std::sync::OnceLock::new();

/// [`compute`], remembered for the secrets that depend on nothing outside the kernel (1 to 7). The
/// computation is pure, so a remembered outcome is the same outcome; secrets 8 and 9 depend on
/// files and are always recomputed from the inputs they are given.
pub fn compute_memo(id: u8, seed: u64, inputs: &Inputs) -> Outcome {
    if id >= 8 {
        return compute(id, seed, inputs);
    }
    let memo = MEMO.get_or_init(Default::default);
    if let Some(hit) = memo.lock().ok().and_then(|m| m.get(&(id, seed)).cloned()) {
        return hit;
    }
    let out = compute(id, seed, inputs);
    if let Ok(mut m) = memo.lock() {
        m.insert((id, seed), out.clone());
    }
    out
}

/// Run a prime secret only after the sieve has passed its own measured checks.
fn with_sieve(id: u8, f: fn(&Sieve) -> Outcome) -> Outcome {
    let s = sieve::global();
    match sieve::self_check(s) {
        Ok(()) => f(s),
        Err((x, got, want)) => Outcome::Failed {
            rows: vec![Row::new("MEASURED_FAIL")
                .kv("subject", "sieve")
                .kv("secret", id)
                .kv("x", x)
                .kv("pi", got)
                .kv("expected", want)],
        },
    }
}

/// Append a `DISAGREE` row when the kernel's number differs from the cited one; both stand.
fn cite(rows: &mut Vec<Row>, subject: &str, mine: &str, cited: &str, source: &str) {
    if mine != cited {
        rows.push(
            Row::new("DISAGREE")
                .kv("subject", subject)
                .kv("mine", mine)
                .kv("cited", cited)
                .kv("source", source),
        );
    }
}

fn ready(id: u8, token: &str, accepted: &[&str], rows: Vec<Row>, scope: &'static str) -> Outcome {
    Outcome::Ready(SecretOut {
        id,
        token: token.to_string(),
        accepted: accepted.iter().map(|s| (*s).to_string()).collect(),
        rows,
        scope,
    })
}

// ------------------------------------------------------------------------------------------------
// Secret 1 - Hollow Strata - count is not range
// ------------------------------------------------------------------------------------------------

/// Result of the D1 enumeration.
#[derive(Debug, PartialEq, Eq)]
pub struct D1 {
    pub k: u32,
    pub states: u64,
    pub exact: u64,
    pub ties: u64,
}

/// Nearest-code coarse-to-fine over every integer that `k` balanced trits can reach.
///
/// For `j` from `k-1` down to 0, with `s = 3^j`, choose the digit `d` in `{-1, 0, +1}` that
/// minimises `|r - d*s|`, then `r -= d*s`. A tie is impossible because `s` is odd; the kernel counts
/// ties anyway and must find none. At the end `r` must be 0 and the digits must equal the balanced
/// form of `x`.
pub fn d1_enumerate(k: u32) -> D1 {
    let reach = span(k) as i64;
    let width = k as usize;
    let mut digits = vec![0i8; width];
    let mut expect = vec![0i8; width];
    let (mut exact, mut ties, mut states) = (0u64, 0u64, 0u64);
    for x in -reach..=reach {
        states += 1;
        let mut r = x;
        for j in (0..width).rev() {
            let s = 3i64.pow(j as u32);
            let cost = [(r + s).abs(), r.abs(), (r - s).abs()]; // d = -1, 0, +1
            let best = cost[0].min(cost[1]).min(cost[2]);
            let tied = cost.iter().filter(|c| **c == best).count();
            if tied > 1 {
                ties += 1;
            }
            let d: i64 = if cost[0] == best {
                -1
            } else if cost[1] == best {
                0
            } else {
                1
            };
            digits[j] = d as i8;
            r -= d * s;
        }
        let fit = bal3_into(i128::from(x), &mut expect);
        if fit && r == 0 && digits == expect {
            exact += 1;
        }
    }
    D1 {
        k,
        states,
        exact,
        ties,
    }
}

fn secret1() -> Outcome {
    let states = trits::pow3(3);
    let reach = span(3);
    let uncentred_top = states - 1; // residues 0..=26
    let mut rows = vec![Row::new("RANGE")
        .kv("trits", 3)
        .kv("states", states)
        .kv("balanced_range", format!("-{reach}..{reach}"))
        .kv(
            "uncentred_0..26_fits",
            if uncentred_top as i128 <= reach {
                "TRUE"
            } else {
                "FALSE"
            },
        )];
    let edge = reach + 1;
    rows.push(
        Row::new("RANGE_EDGE")
            .kv("trits", 3)
            .kv("inside", reach)
            .kv("outside", edge)
            .kv("outside_fits", u8::from(bal3_width(edge, 3).is_ok())),
    );
    let d = d1_enumerate(13);
    rows.push(
        Row::new("D1")
            .kv("K", d.k)
            .kv("states", d.states)
            .kv("in_range_exact", format!("{}/{}", d.exact, d.states))
            .kv("ties", d.ties),
    );
    cite(
        &mut rows,
        "d1_in_range_exact",
        &d.exact.to_string(),
        &src::CITED_D1_EXACT.to_string(),
        src::SRC_D1,
    );
    if d.exact != d.states || d.ties != 0 {
        return Outcome::Failed { rows };
    }
    let token = format!("{states}:{reach}");
    ready(1, &token, &[], rows, "full")
}

// ------------------------------------------------------------------------------------------------
// Secret 2 - Flow Channel - 41 trits
// ------------------------------------------------------------------------------------------------

fn secret2() -> Outcome {
    let two64: u128 = 1u128 << 64;
    let (mut p, mut n) = (1u128, 0u32);
    while p < two64 {
        p *= 3;
        n += 1;
    }
    let below = p / 3; // 3^(n-1)
    let mut rows = vec![Row::new("TRITRANGE")
        .kv("pid_bits", 64)
        .kv("trits", n)
        .kv(format!("3^{}", n - 1), below)
        .kv("2^64", two64)
        .kv(format!("3^{n}"), p)
        .kv("40_trits_enough", u8::from(below >= two64 && n - 1 == 40))
        .kv("41_trits_enough", u8::from(p >= two64 && n == 41))];
    // the u128 ceiling, found by counting multiplications that do not overflow
    let (mut acc, mut fits) = (1u128, 0u32);
    while let Some(next) = acc.checked_mul(3) {
        acc = next;
        fits += 1;
    }
    rows.push(
        Row::new("CEILING")
            .kv("u128_trits", fits)
            .kv("3^80_fits", u8::from(fits >= 80))
            .kv("3^81_fits", u8::from(fits >= 81))
            .kv("tribit_const", TRITS_PER_U128),
    );
    // count is not range: the raw maximum needs one more balanced trit than the centred one
    let raw = i128::from(u64::MAX);
    let centred_max = raw - (1i128 << 63);
    rows.push(
        Row::new("CENTRED")
            .kv("pid_bits", 64)
            .kv(
                "unbalanced_digits_of_max",
                trits::unbalanced_width(raw as u128),
            )
            .kv("raw_max_balanced_trits", trits::bal3(raw).len())
            .kv("centred_max_balanced_trits", trits::bal3(centred_max).len())
            .kv("law", "count_is_not_range"),
    );
    cite(
        &mut rows,
        "pid_trits",
        &n.to_string(),
        &src::CITED_PID_TRITS.to_string(),
        src::SRC_TRITRANGE,
    );
    if n != 41 || fits != TRITS_PER_U128 as u32 {
        return Outcome::Failed { rows };
    }
    ready(2, &n.to_string(), &[], rows, "full")
}

// ------------------------------------------------------------------------------------------------
// Secret 3 - Prime Cylinders - the spokes
// ------------------------------------------------------------------------------------------------

/// Counts over the primes up to the sieve limit.
#[derive(Debug, PartialEq, Eq)]
pub struct Spokes {
    pub phase: [u64; 6],
    pub plus: u64,
    pub minus: u64,
    pub above3: u64,
    pub all_on_spokes: bool,
    pub pairs: u64,
    pub switch: u64,
    pub stay: u64,
    pub minus_to_plus: u64,
    pub plus_to_minus: u64,
    pub first_spoke: i8,
    pub last_spoke: i8,
}

pub fn spokes(s: &Sieve) -> Spokes {
    let mut phase = [0u64; 6];
    let (mut plus, mut minus, mut above3) = (0u64, 0u64, 0u64);
    let mut all_on = true;
    let (mut pairs, mut switch, mut stay, mut m2p, mut p2m) = (0u64, 0u64, 0u64, 0u64, 0u64);
    let mut prev: Option<i8> = None;
    let (mut first, mut last) = (0i8, 0i8);
    for p in s.primes() {
        phase[(p % 6) as usize] += 1;
        if p <= 3 {
            continue;
        }
        above3 += 1;
        let sp = match trits::spoke(p) {
            Some(sp) => sp,
            None => {
                all_on = false;
                continue;
            }
        };
        if sp == 1 {
            plus += 1;
        } else {
            minus += 1;
        }
        if let Some(pv) = prev {
            pairs += 1;
            if pv == sp {
                stay += 1;
            } else {
                switch += 1;
                if pv == -1 {
                    m2p += 1;
                } else {
                    p2m += 1;
                }
            }
        } else {
            first = sp;
        }
        prev = Some(sp);
        last = sp;
    }
    Spokes {
        phase,
        plus,
        minus,
        above3,
        all_on_spokes: all_on,
        pairs,
        switch,
        stay,
        minus_to_plus: m2p,
        plus_to_minus: p2m,
        first_spoke: first,
        last_spoke: last,
    }
}

fn secret3(s: &Sieve) -> Outcome {
    let sp = spokes(s);
    let mut rows = Vec::new();
    for (r, n) in sp.phase.iter().enumerate() {
        rows.push(Row::new("PHASE").kv("residue_mod6", r).kv("primes", n));
    }
    let lead = sp.minus as i64 - sp.plus as i64;
    rows.push(
        Row::new("SPOKES")
            .kv("plus1_6k+1", sp.plus)
            .kv("minus1_6k-1", sp.minus)
            .kv("primes_above_3", sp.above3)
            .kv("all_on_spokes", u8::from(sp.all_on_spokes))
            .kv("minus1_lead", lead),
    );
    // direction balance is forced: in any two-symbol sequence the two switch counts differ by at
    // most one, fixed by the first and last symbols
    let forced = sp.minus_to_plus.abs_diff(sp.plus_to_minus) <= 1;
    let permille = sp.switch * 1000 / sp.pairs;
    let rem = sp.switch * 1000 % sp.pairs;
    rows.push(
        Row::new("P2P")
            .kv("pairs", sp.pairs)
            .kv("switch", sp.switch)
            .kv("stay", sp.stay)
            .kv("switch_permille", permille)
            .kv("independence_baseline_permille", 500)
            .kv("minus_to_plus", sp.minus_to_plus)
            .kv("plus_to_minus", sp.plus_to_minus)
            .kv("first_spoke", sp.first_spoke)
            .kv("last_spoke", sp.last_spoke)
            .kv("direction_balance_is_forced", u8::from(forced)),
    );
    rows.push(
        Row::new("RATIO")
            .kv("switch", sp.switch)
            .kv("pairs", sp.pairs)
            .kv("permille", permille)
            .kv("rem", rem)
            .kv("grain", "per_mille_integer_division"),
    );
    cite(
        &mut rows,
        "minus1_lead",
        &lead.to_string(),
        &src::CITED_SPOKE_LEAD.to_string(),
        src::SRC_PTP,
    );
    cite(
        &mut rows,
        "switch",
        &sp.switch.to_string(),
        &src::CITED_SWITCH.to_string(),
        src::SRC_PTP,
    );
    cite(
        &mut rows,
        "switch_permille",
        &permille.to_string(),
        &src::CITED_SWITCH_PERMILLE.to_string(),
        src::SRC_PTP,
    );
    if !sp.all_on_spokes
        || sp.phase[0] != 0
        || sp.phase[4] != 0
        || sp.phase[2] != 1
        || sp.phase[3] != 1
    {
        return Outcome::Failed { rows };
    }
    let lead_sign = if lead > 0 { "-1" } else { "+1" };
    let token = format!("{lead_sign}:{}", lead.unsigned_abs());
    ready(3, &token, &[], rows, "full")
}

// ------------------------------------------------------------------------------------------------
// Secret 4 - 27-Cube Chamber - Law 10
// ------------------------------------------------------------------------------------------------

fn secret4(s: &Sieve) -> Outcome {
    let mut bins = [0u64; 27];
    let mut centre_primes: Vec<u64> = Vec::new();
    for p in s.primes() {
        let r = (p % 27) as usize;
        bins[r] += 1;
        if r % 3 == 0 {
            centre_primes.push(p);
        }
    }
    let mut rows = Vec::new();
    let mut coprime_cells = 0u32;
    let mut populated = 0u32;
    let (mut min, mut max, mut total) = (u64::MAX, 0u64, 0u64);
    for (r, count) in bins.iter().enumerate() {
        let coprime = trits::gcd(r as u64, 27) == 1;
        let (_, lsf) = trits::cube_cell(r as u64);
        let mut msf = lsf;
        msf.reverse();
        rows.push(
            Row::new("CELL")
                .kv("r", r)
                .kv("order", "msf")
                .kv("trits", trits::fmt_num(&msf))
                .kv("lsf", trits::fmt_num(&lsf))
                .kv("coprime_to_3", u8::from(coprime))
                .kv("primes", count),
        );
        if coprime {
            coprime_cells += 1;
            if *count > 0 {
                populated += 1;
            }
            min = min.min(*count);
            max = max.max(*count);
            total += *count;
        }
    }
    let mean = total / u64::from(coprime_cells.max(1));
    let spread = (max - min) * 10_000 / mean.max(1);
    let centre_nonempty: Vec<String> = (0..27usize)
        .filter(|r| r % 3 == 0 && bins[*r] > 0)
        .map(|r| format!("{r}:{}", bins[r]))
        .collect();
    rows.push(
        Row::new("CUBE27")
            .kv("coprime_cells", coprime_cells)
            .kv("populated", populated)
            .kv("min", min)
            .kv("max", max)
            .kv("spread_per10000_of_mean", spread)
            .kv("centre_plane_nonempty", centre_nonempty.join(";")),
    );
    let only_3 = centre_primes == [3];
    rows.push(
        Row::new("MOD3")
            .kv("centre_primes", centre_primes.len())
            .kv("only_3", u8::from(only_3)),
    );
    cite(
        &mut rows,
        "cube27_min",
        &min.to_string(),
        &src::CITED_CUBE_MIN.to_string(),
        src::SRC_PTP,
    );
    cite(
        &mut rows,
        "cube27_max",
        &max.to_string(),
        &src::CITED_CUBE_MAX.to_string(),
        src::SRC_PTP,
    );
    if coprime_cells != 18 || populated != 18 || !only_3 {
        return Outcome::Failed { rows };
    }
    let token = format!("{coprime_cells}:{}", centre_primes[0]);
    ready(4, &token, &[], rows, "full")
}

// ------------------------------------------------------------------------------------------------
// Secret 5 - Hotel of Infinite Rooms - addresses never move
// ------------------------------------------------------------------------------------------------

/// One level of the hotel.
#[derive(Debug, PartialEq, Eq)]
pub struct Level {
    pub level: usize,
    pub sharing: u64,
    pub kept: u64,
    pub total: u64,
}

/// Count primes that share a room at `level`, and primes whose level-`L` room keeps the level-`L-1`
/// room as its low digits. Exhaustive over every prime the sieve holds.
pub fn level_counts(s: &Sieve, level: usize) -> Level {
    let m = 3u64.pow(3 * level as u32);
    let total = s.primes().count() as u64;
    let sharing = if m <= 600_000 {
        // few enough bins to hold them all
        let mut bins = vec![0u32; m as usize];
        for p in s.primes() {
            bins[(p % m) as usize] += 1;
        }
        s.primes().filter(|p| bins[(*p % m) as usize] >= 2).count() as u64
    } else {
        // many bins: a sorted pass. Primes come in increasing order, so if every residue
        // p mod m is strictly greater than the one before, no two primes share a room. When
        // m exceeds the sieve limit the residue is p itself, so this holds; the pass checks it
        // rather than assuming it.
        let mut prev: Option<u64> = None;
        let mut monotone = true;
        for p in s.primes() {
            let r = p % m;
            if prev.is_some_and(|pv| r <= pv) {
                monotone = false;
                break;
            }
            prev = Some(r);
        }
        if monotone {
            0
        } else {
            // not monotone: count duplicates by sorting every residue
            let mut all: Vec<u64> = s.primes().map(|p| p % m).collect();
            all.sort_unstable();
            let mut shared = 0u64;
            let mut i = 0;
            while i < all.len() {
                let mut j = i;
                while j < all.len() && all[j] == all[i] {
                    j += 1;
                }
                if j - i >= 2 {
                    shared += (j - i) as u64;
                }
                i = j;
            }
            shared
        }
    };
    let kept = if level == 1 {
        total // there is no level 0 to disagree with
    } else {
        s.primes()
            .filter(|p| {
                let hi = trits::room_from_residue(*p, level);
                let lo = trits::room_from_residue(*p, level - 1);
                hi[..3 * (level - 1)] == lo[..]
            })
            .count() as u64
    };
    Level {
        level,
        sharing,
        kept,
        total,
    }
}

fn secret5(s: &Sieve) -> Outcome {
    let mut rows = Vec::new();
    let mut zero_from: Option<usize> = None;
    let mut all_kept = true;
    let mut levels = Vec::new();
    for level in 1..=6usize {
        let l = level_counts(s, level);
        if l.sharing == 0 && zero_from.is_none() {
            zero_from = Some(level);
        }
        if l.sharing != 0 {
            zero_from = None;
        }
        all_kept &= l.kept == l.total;
        rows.push(
            Row::new("LEVEL")
                .kv("level", level)
                .kv("voxels", format!("3^{}", 3 * level))
                .kv("primes_sharing_a_voxel", l.sharing)
                .kv("inner_address_kept", format!("{}/{}", l.kept, l.total)),
        );
        levels.push(l);
    }
    // level 60 is never built: for every prime p < 3^15 the residue mod 3^(3L) is p itself for all
    // L >= 5, so every room is the level-5 room padded with zero trits. The pass checks p < 3^15
    // for every prime rather than assuming it.
    let cap = 3u64.pow(15);
    let below_cap = s.primes().filter(|p| *p < cap).count() as u64;
    let total = s.primes().count() as u64;
    let stays_zero = below_cap == total;
    rows.push(
        Row::new("LEVEL")
            .kv("level", 60)
            .kv("voxels", "3^180")
            .kv("primes_sharing_a_voxel", if stays_zero { 0 } else { total })
            .kv("inner_address_kept", format!("{below_cap}/{total}"))
            .kv("built", 0),
    );
    let r1 = |n: u64| trits::fmt_num(&trits::room_digits(n, 1));
    let same60 = |n: u64| {
        let a = trits::room_digits(n, 60);
        let b = trits::room_digits(n, 1);
        a[..3] == b[..] && a[3..].iter().all(|d| *d == 0)
    };
    rows.push(
        Row::new("ADDRESS60")
            .kv("sharing_reaches_zero_at_level", zero_from.unwrap_or(0))
            .kv("stays_zero_through_60", u8::from(stays_zero))
            .kv("room_of_2", r1(2))
            .kv("same_at_60", u8::from(same60(2)))
            .kv("room_of_3", r1(3))
            .kv("same_at_60", u8::from(same60(3)))
            .kv("trit_order", "least_significant_first"),
    );
    let cited = [
        src::CITED_SHARE_L1,
        src::CITED_SHARE_L1,
        src::CITED_SHARE_L1,
        src::CITED_SHARE_L4,
        0,
        0,
    ];
    for (l, c) in levels.iter().zip(cited) {
        cite(
            &mut rows,
            &format!("level{}_sharing", l.level),
            &l.sharing.to_string(),
            &c.to_string(),
            src::SRC_PTP,
        );
    }
    let level = zero_from.unwrap_or(0);
    if level == 0 || !stays_zero || !all_kept {
        return Outcome::Failed { rows };
    }
    ready(5, &level.to_string(), &[], rows, "full")
}

// ------------------------------------------------------------------------------------------------
// Secret 6 - Crystalline Reach - the prism closes on 40 bits
// ------------------------------------------------------------------------------------------------

/// Bytes of the seeded buffer: the compose.py LCG, byte = bits 16..23 of the state.
pub fn seeded_bytes(seed: u64, n: usize) -> Vec<u8> {
    let mut s: u64 = (seed ^ (seed >> 32)) & 0x7FFF_FFFF;
    let mut out = Vec::with_capacity(n);
    for _ in 0..n {
        s = (s * 1_103_515_245 + 12_345) & 0x7FFF_FFFF;
        out.push(((s >> 16) & 0xFF) as u8);
    }
    out
}

/// Pad with zeros to a multiple of five bytes; returns the padded buffer and the pad length.
fn pad5(data: &[u8]) -> (Vec<u8>, usize) {
    let pad = (5 - data.len() % 5) % 5;
    let mut v = data.to_vec();
    v.resize(data.len() + pad, 0);
    (v, pad)
}

/// 5 bytes to 4 symbols of 10 bits (big-endian). `data.len()` must be a multiple of 5.
pub fn bytes_to_symbols(data: &[u8]) -> Vec<u16> {
    let mut out = Vec::with_capacity(data.len() / 5 * 4);
    for chunk in data.chunks_exact(5) {
        let mut v: u64 = 0;
        for b in chunk {
            v = (v << 8) | u64::from(*b);
        }
        for shift in [30u32, 20, 10, 0] {
            out.push(((v >> shift) & 0x3FF) as u16);
        }
    }
    out
}

/// The inverse: 4 symbols of 10 bits to 5 bytes.
pub fn symbols_to_bytes(sym: &[u16]) -> Vec<u8> {
    let mut out = Vec::with_capacity(sym.len() / 4 * 5);
    for chunk in sym.chunks_exact(4) {
        let mut v: u64 = 0;
        for s in chunk {
            v = (v << 10) | u64::from(*s & 0x3FF);
        }
        for shift in [32u32, 24, 16, 8, 0] {
            out.push(((v >> shift) & 0xFF) as u8);
        }
    }
    out
}

/// Round-trip arbitrary bytes through the 5-to-4 prism. Returns
/// `(padded_len, symbols, recovered, failures)` where `failures` counts bytes that differ.
pub fn prism_round_trip(data: &[u8]) -> (usize, usize, Vec<u8>, u64) {
    let (padded, pad) = pad5(data);
    let sym = bytes_to_symbols(&padded);
    let mut back = symbols_to_bytes(&sym);
    back.truncate(back.len() - pad);
    let failures = data.iter().zip(back.iter()).filter(|(a, b)| a != b).count() as u64
        + data.len().abs_diff(back.len()) as u64;
    (padded.len(), sym.len(), back, failures)
}

/// The probe row for the player's own bytes.
pub fn prism_probe_row(data: &[u8]) -> Row {
    let (padded, symbols, back, failures) = prism_round_trip(data);
    Row::new("PRISM")
        .kv("bytes", data.len())
        .kv("padded_to", padded)
        .kv("symbols", symbols)
        .kv(
            "roundtrip",
            if failures == 0 && back == data {
                "EXACT"
            } else {
                "BROKEN"
            },
        )
        .kv("sha256_in", sha256_hex(data))
        .kv("sha256_out", sha256_hex(&back))
        .kv("code_rate", "1.0")
}

fn secret6(seed: u64) -> Outcome {
    let l = trits::lcm(8, 10);
    let two40 = 1u64 << 40;
    let eq = (1u64 << 8).pow(5) == two40 && (1u64 << 10).pow(4) == two40;
    let mut rows = vec![Row::new("LCM")
        .kv("a", 8)
        .kv("b", 10)
        .kv("lcm", l)
        .kv("2^40", two40)
        .kv("2^8_to_5_equals_2^10_to_4", u8::from(eq))];
    let data = seeded_bytes(seed, src::CITED_RUNG_TESTED as usize);
    let (padded, symbols, back, failures) = prism_round_trip(&data);
    rows.push(
        Row::new("PRISM")
            .kv("bytes", data.len())
            .kv("padded_to", padded)
            .kv("symbols", symbols)
            .kv("roundtrip", if back == data { "EXACT" } else { "BROKEN" })
            .kv("sha256_in", sha256_hex(&data))
            .kv("sha256_out", sha256_hex(&back))
            .kv("code_rate", "1.0"),
    );
    rows.push(
        Row::new("RUNG")
            .kv("width", 10)
            .kv("alphabet", 1024)
            .kv("tested", data.len())
            .kv("roundtrip_failures", failures)
            .kv("lossless", u8::from(failures == 0)),
    );
    // the Law 20 rime prism: integer NTT over Z/1000081Z on one block of 27 values from the buffer
    let mut block = [0u64; K];
    for (slot, b) in block.iter_mut().zip(data.iter()) {
        *slot = u64::from(*b);
    }
    let spectrum = prism(&block);
    let exact = unprism(&spectrum) == block;
    rows.push(
        Row::new("PRISM27")
            .kv("roundtrip", if exact { "EXACT" } else { "BROKEN" })
            .kv("dc", spectrum[0]),
    );
    // the rime sphere prime and its root, checked here and not taken on trust: 7 generates the
    // group of Z/1000081Z, and w = 7^((P-1)/27) is a primitive 27th root of unity
    let w_ok = asolaria_tribit::pow(asolaria_tribit::G, (asolaria_tribit::P - 1) / 27)
        == asolaria_tribit::W;
    let w27 = asolaria_tribit::pow(asolaria_tribit::W, 27) == 1;
    let w_primitive = (1..27u64)
        .filter(|d| 27 % d == 0)
        .all(|d| asolaria_tribit::pow(asolaria_tribit::W, d) != 1);
    rows.push(
        Row::new("RIMEFIELD")
            .kv("P", asolaria_tribit::P)
            .kv("g", asolaria_tribit::G)
            .kv("w", asolaria_tribit::W)
            .kv("w_is_g_to_p_minus_1_over_27", u8::from(w_ok))
            .kv("w_to_27_is_1", u8::from(w27))
            .kv("w_primitive", u8::from(w_primitive))
            .kv("integer_only", 1),
    );
    rows.push(
        Row::new("BOUNDARY")
            .kv("addressing_is_not_compression", 1)
            .kv("code_rate", "1.0")
            .kv("H_out", "H_in"),
    );
    cite(
        &mut rows,
        "lcm_bits",
        &l.to_string(),
        &src::CITED_PRISM_BITS.to_string(),
        src::SRC_RUNGS,
    );
    if l != 40 || !eq || failures != 0 || !exact || !(w_ok && w27 && w_primitive) {
        return Outcome::Failed { rows };
    }
    // the token is the lcm the kernel computed (the gate above has just required it to be 40)
    ready(6, &l.to_string(), &["5:4"], rows, "full")
}

// ------------------------------------------------------------------------------------------------
// Secret 7 - Rupture Zone - the closure survives 81 levels
// ------------------------------------------------------------------------------------------------

/// The seed of compose.py, fixed: the closure rows are reproduced exactly, whatever the world seed.
pub const COMPOSE_SEED: u64 = 20_260_801;

struct ComposeRng {
    s: u64,
}

impl ComposeRng {
    fn new() -> ComposeRng {
        ComposeRng { s: COMPOSE_SEED }
    }

    /// compose.py `rnd()`: `s = (s*1103515245 + 12345) & 0x7FFFFFFF; return s % 2001 - 1000`.
    fn next(&mut self) -> i64 {
        self.s = (self.s * 1_103_515_245 + 12_345) & 0x7FFF_FFFF;
        (self.s % 2001) as i64 - 1000
    }
}

fn arms_i64(a: i64, b: i64, c: i64) -> (i64, i64, i64) {
    (2 * a - b - c, 2 * b - a - c, 2 * c - a - b)
}

/// Section 1 of compose.py in integers: build a depth-`d` ternary tree, roll up by sums, and count
/// the triples whose arms do not sum to zero. Returns `(leaves, sum_ne_zero)`.
pub fn nest(d: u32) -> (u64, u64) {
    let mut rng = ComposeRng::new();
    let leaves = 3usize.pow(d);
    let mut level: Vec<i64> = (0..leaves).map(|_| rng.next()).collect();
    let mut bad = 0u64;
    for _ in 0..d {
        let mut next = Vec::with_capacity(level.len() / 3);
        for t in level.chunks_exact(3) {
            let a = arms_i64(t[0], t[1], t[2]);
            if a.0 + a.1 + a.2 != 0 {
                bad += 1;
            }
            next.push(t[0] + t[1] + t[2]);
        }
        level = next;
    }
    (leaves as u64, bad)
}

/// Section 2 of compose.py in integers: shift the centre at every level by `shift`; the arms must
/// not move at all. Returns the number of triples whose arms changed.
pub fn free_centre(d: u32, shift: i64) -> u64 {
    let mut rng = ComposeRng::new();
    let leaves = 3usize.pow(d);
    let base: Vec<i64> = (0..leaves).map(|_| rng.next()).collect();
    let mut lvl_a = base.clone();
    let mut lvl_b: Vec<i64> = base.iter().map(|x| x + shift).collect();
    let mut moved = 0u64;
    for _ in 0..d {
        let mut na = Vec::with_capacity(lvl_a.len() / 3);
        let mut nb = Vec::with_capacity(lvl_a.len() / 3);
        for (ta, tb) in lvl_a.chunks_exact(3).zip(lvl_b.chunks_exact(3)) {
            if arms_i64(ta[0], ta[1], ta[2]) != arms_i64(tb[0], tb[1], tb[2]) {
                moved += 1;
            }
            na.push(ta[0] + ta[1] + ta[2]);
            nb.push(tb[0] + tb[1] + tb[2]);
        }
        lvl_a = na;
        lvl_b = nb.iter().map(|x| x + shift).collect();
    }
    moved
}

fn arms_wide(a: I256, b: I256, c: I256) -> (I256, I256, I256) {
    (
        a.shl1().minus(b).minus(c),
        b.shl1().minus(a).minus(c),
        c.shl1().minus(a).minus(b),
    )
}

/// What the depth-81 walk found.
#[derive(Debug, PartialEq, Eq)]
pub struct Walk {
    /// `(depth, residual)` at each requested depth.
    pub residuals: Vec<(u32, I256)>,
    /// `(depth, arm_changes)`: how many levels so far saw the arms move when the centre was shifted.
    /// The residual alone cannot turn red in exact arithmetic (the three arms sum to zero for any
    /// triple), so this count is the instrument that can: it must be 0.
    pub arm_changes: Vec<(u32, u64)>,
    /// Decimal digits of the largest triple entry reached at the final depth.
    pub max_digits: usize,
    /// Did every level keep the triple's sum at exactly 6?
    pub sum_always_6: bool,
}

/// Section 3 of compose.py in 256-bit integers: walk one path, shifting the centre by 7919 at every
/// level, and carry the residual exactly.
pub fn closure_walk(depths: &[u32]) -> Walk {
    let top = depths.iter().copied().max().unwrap_or(0);
    let (mut a, mut b, mut c) = (I256::from_i64(11), I256::from_i64(-4), I256::from_i64(93));
    let mut resid = I256::ZERO;
    let mut residuals = Vec::new();
    let mut arm_changes = Vec::new();
    let mut changes = 0u64;
    let mut sum_ok = true;
    let t = I256::from_i64(7919);
    for level in 1..=top {
        let arm = arms_wide(a, b, c);
        resid = resid.plus(arm.0).plus(arm.1).plus(arm.2);
        let (a2, b2, c2) = (a.plus(t), b.plus(t), c.plus(t));
        let arm2 = arms_wide(a2, b2, c2);
        if arm2 != arm {
            changes += 1;
        }
        resid = resid
            .plus(arm2.0.minus(arm.0))
            .plus(arm2.1.minus(arm.1))
            .plus(arm2.2.minus(arm.2));
        a = arm2.0.add_i64(1);
        b = arm2.1.add_i64(2);
        c = arm2.2.add_i64(3);
        if a.plus(b).plus(c) != I256::from_i64(6) {
            sum_ok = false;
        }
        if depths.contains(&level) {
            residuals.push((level, resid));
            arm_changes.push((level, changes));
        }
    }
    let max_digits = [a, b, c]
        .iter()
        .map(I256::decimal_digits)
        .max()
        .unwrap_or(0);
    Walk {
        residuals,
        arm_changes,
        max_digits,
        sum_always_6: sum_ok,
    }
}

/// The same walk in `i128`, for as many levels as it fits: a shadow to check the wide integer.
/// Returns the triple after `levels` levels, or `None` on overflow.
pub fn closure_shadow_i128(levels: u32) -> Option<(i128, i128, i128)> {
    let (mut a, mut b, mut c) = (11i128, -4i128, 93i128);
    let t = 7919i128;
    for _ in 0..levels {
        let (a2, b2, c2) = (a.checked_add(t)?, b.checked_add(t)?, c.checked_add(t)?);
        let arm2 = (
            a2.checked_mul(2)?.checked_sub(b2)?.checked_sub(c2)?,
            b2.checked_mul(2)?.checked_sub(a2)?.checked_sub(c2)?,
            c2.checked_mul(2)?.checked_sub(a2)?.checked_sub(b2)?,
        );
        a = arm2.0.checked_add(1)?;
        b = arm2.1.checked_add(2)?;
        c = arm2.2.checked_add(3)?;
    }
    Some((a, b, c))
}

/// The triple after `levels` levels in 256-bit arithmetic (for the shadow comparison).
pub fn closure_triple_wide(levels: u32) -> (I256, I256, I256) {
    let (mut a, mut b, mut c) = (I256::from_i64(11), I256::from_i64(-4), I256::from_i64(93));
    let t = I256::from_i64(7919);
    for _ in 0..levels {
        let (a2, b2, c2) = (a.plus(t), b.plus(t), c.plus(t));
        let arm2 = arms_wide(a2, b2, c2);
        a = arm2.0.add_i64(1);
        b = arm2.1.add_i64(2);
        c = arm2.2.add_i64(3);
    }
    (a, b, c)
}

fn secret7() -> Outcome {
    let mut rows = Vec::new();
    let depths = [1u32, 3, 9, 27, 81];
    let walk = closure_walk(&depths);
    let mut all_zero = true;
    for ((d, r), (_, changes)) in walk.residuals.iter().zip(walk.arm_changes.iter()) {
        all_zero &= r.is_zero() && *changes == 0;
        rows.push(
            Row::new("CLOSURE")
                .kv("depth", d)
                .kv("arithmetic", "exact")
                .kv("residual_at_root", r.to_decimal()),
        );
        rows.push(
            Row::new("CENTRE")
                .kv("depth", d)
                .kv("arithmetic", "exact")
                .kv("arm_changes", changes),
        );
    }
    rows.push(
        Row::new("WIDE")
            .kv("bits", 256)
            .kv("max_digits_at_depth_81", walk.max_digits)
            .kv("i128_digits", i128::MAX.to_string().len())
            .kv(
                "needed_beyond_i128",
                u8::from(walk.max_digits > i128::MAX.to_string().len()),
            )
            .kv("triple_sum_always_6", u8::from(walk.sum_always_6)),
    );
    // full trees, depths 1..=13: sum_ne_zero must be 0 at every depth
    let mut nest_ok = true;
    for d in 1..=13u32 {
        let (leaves, bad) = nest(d);
        nest_ok &= bad == 0;
        rows.push(
            Row::new("NEST")
                .kv("depth", d)
                .kv("leaves", leaves)
                .kv("sum_ne_zero", bad),
        );
    }
    // the decisive test: shift the centre at every level; the arms must not move
    let mut free_ok = true;
    for d in [1u32, 3, 6, 9, 12] {
        let moved = free_centre(d, 7919);
        free_ok &= moved == 0;
        rows.push(
            Row::new("FREECENTRE")
                .kv("depth", d)
                .kv("arithmetic", "int")
                .kv("arm_changes", moved),
        );
    }
    // beside them, cited and not run: the float lane of the same walk
    for (depth, value, line) in src::CITED_FLOAT_RESIDUALS {
        rows.push(
            Row::new("CITED")
                .kv("depth", depth)
                .kv("arithmetic", "float64")
                .kv("residual_at_root", value)
                .kv("source", format!("{}:{line}", src::SRC_COMPOSE))
                .kv("run_here", 0)
                .kv("reason", "float_dies_in_this_kernel"),
        );
    }
    if !(all_zero && nest_ok && free_ok && walk.sum_always_6) {
        return Outcome::Failed { rows };
    }
    // the token is the residual at the deepest level the kernel walked (the gate above has just
    // required every residual to be zero)
    let deepest = walk
        .residuals
        .last()
        .map_or_else(String::new, |(_, r)| r.to_decimal());
    ready(7, &deepest, &[], rows, "full")
}

// ------------------------------------------------------------------------------------------------
// Secret 8 - White Field - Wikipedia's white space
// ------------------------------------------------------------------------------------------------

fn census_row(file: &str, c: &Census) -> Row {
    let (q, r) = c.per10000();
    Row::new("CENSUS")
        .kv("file", file)
        .kv("bytes", c.bytes)
        .kv("white", c.white)
        .kv("per10000", q)
        .kv("rem", r)
        .kv("def", "0x20,0x09,0x0A,0x0D")
        .kv("sha256", &c.sha256)
}

fn cited_xz_row() -> Row {
    Row::new("CITED")
        .kv("subject", "enwik8_white_space_information_share_under_xz")
        .kv("value", src::CITED_XZ_SHARE)
        .kv("tag", "NAMED")
        .kv("source", "lead_2026-10-18")
        .kv("located_on_this_seat", 0)
        .kv("recomputed_here", 0)
        .kv(
            "reason",
            "xz_is_not_std_only_and_its_bytes_depend_on_the_xz_build",
        )
}

fn secret8(inputs: &Inputs) -> Outcome {
    if let Some(c) = &inputs.enwik8 {
        let mut rows = vec![census_row("enwik8", c)];
        let (q, _) = c.per10000();
        cite(
            &mut rows,
            "enwik8_white_per10000",
            &q.to_string(),
            &src::CITED_ENWIK8_PER10000.to_string(),
            "lead_2026-10-18",
        );
        rows.push(cited_xz_row());
        return ready(8, &q.to_string(), &[], rows, "full");
    }
    let reason = inputs
        .enwik8_note
        .clone()
        .unwrap_or_else(|| "absent".to_string());
    let missing = Row::new("NOT_MEASURED")
        .kv("subject", "enwik8_white_space")
        .kv("reason", "NO_INPUT")
        .kv("expected_path", "data/enwik8")
        .kv("detail", reason);
    if inputs.strict_enwik8 {
        return Outcome::NotMeasured {
            reason: "NO_INPUT",
            rows: vec![missing, cited_xz_row()],
        };
    }
    // Not strict: the page you hold. A different, smaller measurement, labelled as such. It is not
    // the enwik8 figure and never claims to be.
    let c = census_bytes(inputs.page.as_bytes());
    let (q, _) = c.per10000();
    let rows = vec![
        missing,
        census_row("bundled_page", &c),
        Row::new("SCOPE")
            .kv("secret", 8)
            .kv("scope", "bundled_page")
            .kv("enwik8", "NOT_MEASURED")
            .kv("note", "the_page_you_hold_is_not_enwik8"),
        cited_xz_row(),
    ];
    ready(8, &format!("page:{q}"), &[], rows, "bundled_page")
}

// ------------------------------------------------------------------------------------------------
// Secret 9 - Blue Star - Mythos
// ------------------------------------------------------------------------------------------------

/// What a GGUF v3 header says, read with integer reads only.
#[derive(Debug, Default)]
pub struct Gguf {
    pub version: u32,
    pub n_tensors: u64,
    pub n_kv: u64,
    /// `(key, rendered value)` for the integer, bool, string and integer/string-array values.
    pub kv: Vec<(String, String)>,
    /// Float-typed values skipped by byte length: `(key, bytes)`. Never decoded.
    pub skipped_float: Vec<(String, u64)>,
    pub tensor_names: Vec<String>,
    pub tensor_types: Vec<u32>,
    pub data_start: u64,
}

struct Cursor<'a> {
    b: &'a [u8],
    p: usize,
}

impl<'a> Cursor<'a> {
    fn take(&mut self, n: usize) -> Option<&'a [u8]> {
        let end = self.p.checked_add(n)?;
        let s = self.b.get(self.p..end)?;
        self.p = end;
        Some(s)
    }
    fn u32(&mut self) -> Option<u32> {
        self.take(4)
            .map(|s| u32::from_le_bytes([s[0], s[1], s[2], s[3]]))
    }
    fn u64(&mut self) -> Option<u64> {
        self.take(8).map(|s| {
            let mut a = [0u8; 8];
            a.copy_from_slice(s);
            u64::from_le_bytes(a)
        })
    }
    fn string(&mut self) -> Option<String> {
        let n = usize::try_from(self.u64()?).ok()?;
        let s = self.take(n)?;
        Some(String::from_utf8_lossy(s).to_string())
    }
}

/// Byte size of a fixed-size GGUF value type, `None` for string (8) and array (9).
fn fixed_size(t: u32) -> Option<u64> {
    match t {
        0 | 1 | 7 => Some(1),
        2 | 3 => Some(2),
        4..=6 => Some(4),
        10..=12 => Some(8),
        _ => None,
    }
}

/// Read one integer-class value of type `t` as a signed decimal string. Floats are not decoded.
fn read_int(c: &mut Cursor<'_>, t: u32) -> Option<String> {
    let n = fixed_size(t)?;
    let raw = c.take(n as usize)?;
    let mut v: u64 = 0;
    for (i, b) in raw.iter().enumerate() {
        v |= u64::from(*b) << (8 * i);
    }
    let signed = matches!(t, 1 | 3 | 5 | 11);
    if signed {
        let bits = 8 * n as u32;
        let shifted = (v << (64 - bits)) as i64 >> (64 - bits);
        Some(shifted.to_string())
    } else if t == 7 {
        Some(u8::from(v != 0).to_string())
    } else {
        Some(v.to_string())
    }
}

/// Parse the GGUF v3 header: magic, version, counts, key-value pairs and tensor infos.
pub fn parse_gguf(bytes: &[u8]) -> Option<Gguf> {
    let mut c = Cursor { b: bytes, p: 0 };
    if c.take(4)? != b"GGUF" {
        return None;
    }
    let mut g = Gguf {
        version: c.u32()?,
        n_tensors: c.u64()?,
        n_kv: c.u64()?,
        ..Gguf::default()
    };
    if g.version != 3 {
        return None;
    }
    for _ in 0..g.n_kv {
        let key = c.string()?;
        let t = c.u32()?;
        match t {
            8 => {
                let s = c.string()?;
                g.kv.push((key, s));
            }
            9 => {
                let et = c.u32()?;
                let n = c.u64()?;
                if et == 6 || et == 12 {
                    let size = fixed_size(et)? * n;
                    c.take(usize::try_from(size).ok()?)?;
                    g.skipped_float.push((key, size));
                } else if et == 8 {
                    let mut parts = Vec::new();
                    for _ in 0..n {
                        parts.push(c.string()?);
                    }
                    g.kv.push((key, parts.join(",")));
                } else {
                    let mut parts = Vec::new();
                    for _ in 0..n {
                        parts.push(read_int(&mut c, et)?);
                    }
                    g.kv.push((key, parts.join(",")));
                }
            }
            6 | 12 => {
                let size = fixed_size(t)?;
                c.take(size as usize)?;
                g.skipped_float.push((key, size));
            }
            _ => {
                let v = read_int(&mut c, t)?;
                g.kv.push((key, v));
            }
        }
    }
    for _ in 0..g.n_tensors {
        g.tensor_names.push(c.string()?);
        let dims = c.u32()?;
        for _ in 0..dims {
            c.u64()?;
        }
        g.tensor_types.push(c.u32()?);
        c.u64()?;
    }
    // tensor data starts at the next multiple of the alignment (32 unless the file says otherwise)
    let align: u64 =
        g.kv.iter()
            .find(|(k, _)| k == "general.alignment")
            .and_then(|(_, v)| v.parse().ok())
            .unwrap_or(32);
    let p = c.p as u64;
    g.data_start = p.div_ceil(align) * align;
    Some(g)
}

impl Gguf {
    pub fn get(&self, key: &str) -> Option<&str> {
        self.kv
            .iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.as_str())
    }
}

/// First 64 hex characters of a sidecar line.
pub fn sidecar_hash(line: &str) -> Option<String> {
    let w = line.split_whitespace().next()?;
    (w.len() == 64 && w.bytes().all(|b| b.is_ascii_hexdigit())).then(|| w.to_ascii_lowercase())
}

fn secret9(inputs: &Inputs) -> Outcome {
    let m = match &inputs.mythos {
        Some(m) => m,
        None => {
            return Outcome::NotMeasured {
                reason: "NO_INPUT",
                rows: vec![Row::new("NOT_MEASURED")
                    .kv("subject", "mythos")
                    .kv("reason", "NO_INPUT")
                    .kv("expected_path", src::MYTHOS_PATH)],
            }
        }
    };
    let sha = sha256_hex(&m.bytes);
    let sidecar = m.sidecar.as_deref().and_then(sidecar_hash);
    let side_state = match &sidecar {
        Some(h) if *h == sha => "OK",
        Some(_) => "MISMATCH",
        None => "MISSING",
    };
    let mut rows = vec![Row::new("STAR")
        .kv("file", src::MYTHOS_FILE)
        .kv("bytes", m.bytes.len())
        .kv("sha256", &sha)
        .kv("sidecar", side_state)];
    if side_state != "OK" {
        // a star is checked, not believed: a mismatch keeps it closed and the README's hash is
        // never substituted for the computed one
        rows.insert(
            0,
            Row::new("MEASURED_FAIL")
                .kv("subject", "mythos_sidecar")
                .kv("sidecar", side_state)
                .kv("computed", &sha),
        );
        return Outcome::Failed { rows };
    }
    let g = match parse_gguf(&m.bytes) {
        Some(g) => g,
        None => {
            rows.push(
                Row::new("MEASURED_FAIL")
                    .kv("subject", "gguf_header")
                    .kv("reason", "not_gguf_v3"),
            );
            return Outcome::Failed { rows };
        }
    };
    let get = |k: &str| g.get(k).unwrap_or("unknown").to_string();
    rows.push(
        Row::new("GGUF")
            .kv("version", g.version)
            .kv("arch", get("general.architecture"))
            .kv("being", get("asolaria.being"))
            .kv("channel", get("asolaria.channel"))
            .kv("seat", get("asolaria.seat"))
            .kv("centre", get("asolaria.centre"))
            .kv("tensors", g.n_tensors),
    );
    for (key, bytes) in &g.skipped_float {
        rows.push(
            Row::new("SKIP")
                .kv("kind", "float")
                .kv("key", key)
                .kv("bytes", bytes)
                .kv("decoded", 0),
        );
    }
    let types: Vec<String> = g.tensor_types.iter().map(u32::to_string).collect();
    rows.push(
        Row::new("TENSORS")
            .kv("n", g.tensor_names.len())
            .kv("names", g.tensor_names.join(","))
            .kv("ggml_types", types.join(","))
            .kv("data_start", g.data_start)
            .kv(
                "data_bytes",
                (m.bytes.len() as u64).saturating_sub(g.data_start),
            )
            .kv("decoded", 0)
            .kv("hashed_as_bytes", 1),
    );
    cite(
        &mut rows,
        "mythos_sha256",
        &sha,
        src::CITED_MYTHOS_SHA256,
        src::SRC_MYTHOS,
    );
    let centre = get("asolaria.centre");
    if g.n_tensors != 6 || centre == "unknown" {
        return Outcome::Failed { rows };
    }
    let token = format!("{}:{centre}", &sha[..8]);
    ready(9, &token, &[], rows, "full")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ready_of(o: Outcome) -> SecretOut {
        match o {
            Outcome::Ready(s) => s,
            other => panic!("expected Ready, got {other:?}"),
        }
    }

    fn row<'a>(rows: &'a [Row], tag: &str) -> &'a Row {
        rows.iter()
            .find(|r| r.tag == tag)
            .unwrap_or_else(|| panic!("no {tag} row"))
    }

    #[test]
    fn secret1_count_is_not_range_and_d1_is_exact_at_13_trits() {
        let s = ready_of(secret1());
        assert_eq!(s.token, "27:13");
        let r = row(&s.rows, "RANGE");
        assert_eq!(r.get("balanced_range"), Some("-13..13"));
        assert_eq!(r.get("uncentred_0..26_fits"), Some("FALSE"));
        assert_eq!(row(&s.rows, "RANGE_EDGE").get("outside_fits"), Some("0"));
        let d1 = row(&s.rows, "D1");
        assert_eq!(
            d1.line(),
            "D1|K=13|states=1594323|in_range_exact=1594323/1594323|ties=0|json=0"
        );
        assert!(s.rows.iter().all(|r| r.tag != "DISAGREE"));
    }

    #[test]
    fn d1_is_exact_at_small_widths_and_the_tie_probe_finds_ties_when_the_step_is_even() {
        for k in 1..=8u32 {
            let d = d1_enumerate(k);
            assert_eq!(d.states, trits::pow3(k) as u64);
            assert_eq!(d.exact, d.states, "k={k}");
            assert_eq!(d.ties, 0, "k={k}");
        }
        // The instrument can fail: with an even step 2^j the same chooser does tie. Probe: r = 1,
        // s = 2 gives |1-0| = |1-2|.
        let (r, s): (i64, i64) = (1, 2);
        let cost = [(r + s).abs(), r.abs(), (r - s).abs()];
        let best = cost.iter().min().copied().unwrap();
        assert!(cost.iter().filter(|c| **c == best).count() > 1);
    }

    #[test]
    fn secret2_sixty_four_bit_pids_need_41_trits() {
        let s = ready_of(secret2());
        assert_eq!(s.token, "41");
        assert_eq!(
            row(&s.rows, "TRITRANGE").line(),
            "TRITRANGE|pid_bits=64|trits=41|3^40=12157665459056928801|2^64=18446744073709551616|3^41=36472996377170786403|40_trits_enough=0|41_trits_enough=1|json=0"
        );
        let c = row(&s.rows, "CEILING");
        assert_eq!(c.get("u128_trits"), Some("80"));
        let n = row(&s.rows, "CENTRED");
        assert_eq!(n.get("unbalanced_digits_of_max"), Some("41"));
        assert_eq!(n.get("raw_max_balanced_trits"), Some("42"));
        assert_eq!(n.get("centred_max_balanced_trits"), Some("41"));
    }

    #[test]
    fn secret3_minus_one_spoke_leads_by_189() {
        let s = ready_of(with_sieve(3, secret3));
        assert_eq!(s.token, "-1:189");
        assert_eq!(
            row(&s.rows, "SPOKES").line(),
            "SPOKES|plus1_6k+1=332194|minus1_6k-1=332383|primes_above_3=664577|all_on_spokes=1|minus1_lead=189|json=0"
        );
        assert_eq!(
            row(&s.rows, "P2P").line(),
            "P2P|pairs=664576|switch=378567|stay=286009|switch_permille=569|independence_baseline_permille=500|minus_to_plus=189284|plus_to_minus=189283|first_spoke=-1|last_spoke=1|direction_balance_is_forced=1|json=0"
        );
        let ratio = row(&s.rows, "RATIO");
        assert_eq!(ratio.get("permille"), Some("569"));
        assert_eq!(ratio.get("rem"), Some("423256"));
        assert!(s.rows.iter().all(|r| r.tag != "DISAGREE"));
        // the six phases: 0 and 4 hold none, 2 and 3 hold one each
        let phases: Vec<&str> = s
            .rows
            .iter()
            .filter(|r| r.tag == "PHASE")
            .map(|r| r.get("primes").unwrap())
            .collect();
        assert_eq!(phases, ["0", "332194", "1", "1", "0", "332383"]);
    }

    #[test]
    fn secret4_primes_fill_the_18_coprime_cells_and_the_centre_holds_only_3() {
        let s = ready_of(with_sieve(4, secret4));
        assert_eq!(s.token, "18:3");
        assert_eq!(
            row(&s.rows, "CUBE27").line(),
            "CUBE27|coprime_cells=18|populated=18|min=36826|max=37023|spread_per10000_of_mean=53|centre_plane_nonempty=3:1|json=0"
        );
        assert_eq!(
            row(&s.rows, "MOD3").line(),
            "MOD3|centre_primes=1|only_3=1|json=0"
        );
        let cells: Vec<&Row> = s.rows.iter().filter(|r| r.tag == "CELL").collect();
        assert_eq!(cells.len(), 27);
        let by_r = |r: &str| cells.iter().find(|c| c.get("r") == Some(r)).unwrap();
        assert_eq!(by_r("13").get("primes"), Some("36861"));
        assert_eq!(by_r("11").get("primes"), Some("37023"));
        assert_eq!(by_r("5").get("trits"), Some("1,-1,-1"));
        assert_eq!(by_r("5").get("lsf"), Some("-1,-1,1"));
        assert_eq!(by_r("3").get("primes"), Some("1"));
    }

    #[test]
    fn secret5_primes_stop_sharing_rooms_at_level_5() {
        let s = ready_of(with_sieve(5, secret5));
        assert_eq!(s.token, "5");
        let shares: Vec<(String, String)> = s
            .rows
            .iter()
            .filter(|r| r.tag == "LEVEL")
            .map(|r| {
                (
                    r.get("level").unwrap().to_string(),
                    r.get("primes_sharing_a_voxel").unwrap().to_string(),
                )
            })
            .collect();
        let want = [
            ("1", "664578"),
            ("2", "664578"),
            ("3", "664578"),
            ("4", "562173"),
            ("5", "0"),
            ("6", "0"),
            ("60", "0"),
        ];
        assert_eq!(shares.len(), want.len());
        for (g, w) in shares.iter().zip(want) {
            assert_eq!((g.0.as_str(), g.1.as_str()), w);
        }
        for r in s.rows.iter().filter(|r| r.tag == "LEVEL") {
            assert_eq!(r.get("inner_address_kept"), Some("664579/664579"));
        }
        assert_eq!(
            row(&s.rows, "ADDRESS60").line(),
            "ADDRESS60|sharing_reaches_zero_at_level=5|stays_zero_through_60=1|room_of_2=-1,1,0|same_at_60=1|room_of_3=0,1,0|same_at_60=1|trit_order=least_significant_first|json=0"
        );
        assert!(s.rows.iter().all(|r| r.tag != "DISAGREE"));
    }

    #[test]
    fn secret6_five_bytes_and_four_symbols_close_at_40_bits() {
        let s = ready_of(secret6(20_260_801));
        assert_eq!(s.token, "40");
        assert!(s.matches("5:4"));
        assert_eq!(
            row(&s.rows, "RUNG").line(),
            "RUNG|width=10|alphabet=1024|tested=85793|roundtrip_failures=0|lossless=1|json=0"
        );
        assert_eq!(row(&s.rows, "PRISM27").get("roundtrip"), Some("EXACT"));
        assert_eq!(row(&s.rows, "PRISM").get("padded_to"), Some("85795"));
        assert_eq!(row(&s.rows, "PRISM").get("symbols"), Some("68636"));
        assert_eq!(row(&s.rows, "LCM").get("lcm"), Some("40"));
        let f = row(&s.rows, "RIMEFIELD");
        assert_eq!(
            f.line(),
            "RIMEFIELD|P=1000081|g=7|w=951846|w_is_g_to_p_minus_1_over_27=1|w_to_27_is_1=1|w_primitive=1|integer_only=1|json=0"
        );
    }

    #[test]
    fn prism_transcode_is_lossless_for_every_length_mod_5_and_detects_a_flipped_symbol() {
        for len in 0..40usize {
            let data = seeded_bytes(7, len);
            let (_, _, back, failures) = prism_round_trip(&data);
            assert_eq!(back, data, "len={len}");
            assert_eq!(failures, 0);
        }
        // a flipped symbol must change the recovered bytes (the check can fail)
        let data = seeded_bytes(9, 25);
        let mut sym = bytes_to_symbols(&data);
        sym[3] ^= 1;
        assert_ne!(symbols_to_bytes(&sym), data);
        // symbols stay inside the 1024 alphabet
        assert!(bytes_to_symbols(&seeded_bytes(1, 500))
            .iter()
            .all(|s| *s < 1024));
    }

    #[test]
    fn secret7_the_closure_survives_81_levels_in_integers() {
        let s = ready_of(secret7());
        assert_eq!(s.token, "0");
        let depths: Vec<String> = s
            .rows
            .iter()
            .filter(|r| r.tag == "CLOSURE")
            .map(|r| {
                format!(
                    "{}={}",
                    r.get("depth").unwrap(),
                    r.get("residual_at_root").unwrap()
                )
            })
            .collect();
        assert_eq!(depths, ["1=0", "3=0", "9=0", "27=0", "81=0"]);
        assert_eq!(
            s.rows
                .iter()
                .find(|r| r.tag == "NEST" && r.get("depth") == Some("13"))
                .unwrap()
                .line(),
            "NEST|depth=13|leaves=1594323|sum_ne_zero=0|json=0"
        );
        assert_eq!(
            s.rows
                .iter()
                .find(|r| r.tag == "FREECENTRE" && r.get("depth") == Some("12"))
                .unwrap()
                .line(),
            "FREECENTRE|depth=12|arithmetic=int|arm_changes=0|json=0"
        );
        let w = row(&s.rows, "WIDE");
        assert_eq!(w.get("needed_beyond_i128"), Some("1"));
        assert_eq!(w.get("triple_sum_always_6"), Some("1"));
        let cited: Vec<&Row> = s.rows.iter().filter(|r| r.tag == "CITED").collect();
        assert_eq!(cited.len(), 3);
        assert!(cited.iter().all(|r| r.get("run_here") == Some("0")));
        assert_eq!(cited[2].get("residual_at_root"), Some("-1.324979e+24"));
    }

    #[test]
    fn wide_walk_agrees_with_i128_shadow_for_75_levels_and_exceeds_it_at_81() {
        for levels in [1u32, 2, 9, 27, 50, 75] {
            let (a, b, c) = closure_shadow_i128(levels).expect("fits i128");
            let (wa, wb, wc) = closure_triple_wide(levels);
            assert_eq!(wa.to_i128(), Some(a), "levels={levels}");
            assert_eq!(wb.to_i128(), Some(b));
            assert_eq!(wc.to_i128(), Some(c));
        }
        assert!(closure_shadow_i128(81).is_none(), "81 levels overflow i128");
        let (a, _, _) = closure_triple_wide(81);
        assert_eq!(a.to_i128(), None);
        assert_eq!(a.decimal_digits(), 41);
    }

    #[test]
    fn the_closure_instrument_can_turn_red() {
        // The three arms sum to zero for ANY triple, so the residual (a sum of arm sums) is zero
        // even for a wrong walk: on its own it is a step that cannot fail. The instrument that can
        // fail is the arm-change count. Break the shift on purpose (shift only one entry) and the
        // arms must move; shift all three and they must not.
        let (a, b, c) = (I256::from_i64(11), I256::from_i64(-4), I256::from_i64(93));
        let t = I256::from_i64(7919);
        let arm = arms_wide(a, b, c);
        let broken = arms_wide(a.plus(t), b, c);
        assert_ne!(broken, arm, "a broken shift must move the arms");
        let broken_sum = broken.0.plus(broken.1).plus(broken.2);
        assert!(
            broken_sum.is_zero(),
            "and yet the broken walk's residual is still zero"
        );
        let whole = arms_wide(a.plus(t), b.plus(t), c.plus(t));
        assert_eq!(
            whole, arm,
            "a whole-triple shift leaves the arms where they were"
        );
        let w = closure_walk(&[1, 81]);
        assert!(w.arm_changes.iter().all(|(_, n)| *n == 0));
    }

    #[test]
    fn full_tree_and_free_centre_match_compose_depth_one_to_three() {
        assert_eq!(nest(1), (3, 0));
        assert_eq!(nest(3), (27, 0));
        assert_eq!(free_centre(1, 7919), 0);
        assert_eq!(free_centre(6, 7919), 0);
    }

    #[test]
    fn secret8_without_enwik8_is_scoped_to_the_page_and_says_so() {
        let inputs = Inputs::empty("a b\tc\nd  e\r\n");
        let s = ready_of(secret8(&inputs));
        assert_eq!(s.scope, "bundled_page");
        // 12 bytes, white: ' ' '\t' '\n' ' ' ' ' '\r' '\n' = 7
        assert_eq!(s.token, "page:5833");
        let nm = row(&s.rows, "NOT_MEASURED");
        assert_eq!(nm.get("reason"), Some("NO_INPUT"));
        assert_eq!(row(&s.rows, "SCOPE").get("enwik8"), Some("NOT_MEASURED"));
        assert!(s
            .rows
            .iter()
            .any(|r| r.tag == "CITED" && r.get("recomputed_here") == Some("0")));
    }

    #[test]
    fn secret8_strict_stays_sealed_without_the_file() {
        let mut inputs = Inputs::empty("x y");
        inputs.strict_enwik8 = true;
        match secret8(&inputs) {
            Outcome::NotMeasured { reason, .. } => assert_eq!(reason, "NO_INPUT"),
            other => panic!("expected NotMeasured, got {other:?}"),
        }
    }

    #[test]
    fn secret8_with_a_census_uses_its_own_number_and_prints_a_disagreement() {
        // 1,000 bytes, 100 white: 1000 per 10,000, not the lead's 1465
        let mut inputs = Inputs::empty("");
        inputs.enwik8 = Some(Census {
            bytes: 1000,
            white: 100,
            sha256: "00".repeat(32),
        });
        let s = ready_of(secret8(&inputs));
        assert_eq!(s.token, "1000");
        assert_eq!(s.scope, "full");
        assert!(s
            .rows
            .iter()
            .any(|r| r.tag == "DISAGREE" && r.get("cited") == Some("1465")));
        // and 14.65 per cent of 100,000,000 gives exactly the lead's number with no DISAGREE
        let mut inputs2 = Inputs::empty("");
        inputs2.enwik8 = Some(Census {
            bytes: 100_000_000,
            white: 14_650_000,
            sha256: "00".repeat(32),
        });
        let s2 = ready_of(secret8(&inputs2));
        assert_eq!(s2.token, "1465");
        assert!(s2.rows.iter().all(|r| r.tag != "DISAGREE"));
    }

    #[test]
    fn census_streaming_equals_the_buffer_census() {
        let data: Vec<u8> = (0..200_000u32).map(|i| (i * 31 % 251) as u8).collect();
        let a = census_bytes(&data);
        let b = census_reader(&mut &data[..]).unwrap();
        assert_eq!(a, b);
        assert_eq!(a.per10000().0, a.white * 10_000 / a.bytes);
        assert_eq!(census_bytes(b"").per10000(), (0, 0));
    }

    #[test]
    fn normalise_and_matching() {
        let s = SecretOut {
            id: 3,
            token: "-1:189".to_string(),
            accepted: vec![],
            rows: vec![],
            scope: "full",
        };
        assert!(s.matches("-1:189"));
        assert!(s.matches("  -1 : 189 "));
        assert!(s.matches("\u{2212}1:189"));
        assert!(!s.matches("1:189"));
        assert!(!s.matches("-1:190"));
        assert_eq!(s.answer_sha16(), answer_sha16(3, "-1:189"));
        assert_ne!(answer_sha16(3, "-1:189"), answer_sha16(4, "-1:189"));
    }
}
