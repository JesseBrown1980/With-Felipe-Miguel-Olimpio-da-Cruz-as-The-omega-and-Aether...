//! tests/fixtures/rime-synthetic.hbp (the vendored rime_agents.py agents run by
//! tools/rime_referee.py on 600,000 LCG bytes) and tests/fixtures/rime-windunwind-synthetic.hbp
//! (rime_windunwind.py:28-92 mirrored in integers by tools/rime_referee.py windsynth) recomputed by
//! the port, plus the Fischer sphere of rime_windunwind.py.

use hrm_mtp::log2fx::{log2_q64, render_q64_ratio, round_q64_ratio};
use hrm_mtp::rime::windunwind::{play_sector, primitive_root, Bank, Scratch, Sphere, N, P};
use hrm_mtp::rime::{
    format_fixed, hrm_agent, hrm_agent_lines, mtp_agent, mtp_agent_lines, HrmTables, AGENT_TRAIN,
};
use hrm_mtp::sf64::Sf64;
use sha2::{Digest, Sha256};
use std::fmt::Write;

const FIXTURE: &str = include_str!("fixtures/rime-synthetic.hbp");
const WIND_FIXTURE: &str = include_str!("fixtures/rime-windunwind-synthetic.hbp");

/// `synthetic_bytes(n, seed, every, start, mask)` of tools/rime_referee.py: a 19-letter alphabet
/// from a 64-bit LCG; from `start` on every `every`-th byte is any byte (any byte & `mask`).
fn lcg_bytes(n: usize, seed: u64, every: usize, start: usize, mask: u8) -> Vec<u8> {
    let mut x = seed;
    let alpha = b"etaoin shrdlucmfwyp";
    (0..n)
        .map(|i| {
            x = x
                .wrapping_mul(6_364_136_223_846_793_005)
                .wrapping_add(1_442_695_040_888_963_407);
            if i >= start && i % every == 0 {
                (x >> 40) as u8 & mask
            } else {
                alpha[((x >> 33) % alpha.len() as u64) as usize]
            }
        })
        .collect()
}

/// `synthetic_bytes()` of tools/rime_referee.py.
fn synthetic_bytes() -> Vec<u8> {
    lcg_bytes(600_000, 0x2545_f491_4f6c_dd1d, 997, 500_000, 0xff)
}

fn sha256_hex(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .fold(String::new(), |mut out, b| {
            let _ = write!(out, "{b:02x}");
            out
        })
}

fn field<'a>(row: &'a str, key: &str) -> &'a str {
    row.split('|')
        .find_map(|p| p.strip_prefix(&format!("{key}=")))
        .expect("field")
}

fn row(kind: &str) -> &'static str {
    FIXTURE
        .lines()
        .find(|l| l.starts_with(&format!("{kind}|")))
        .expect("row")
}

#[test]
fn agents_reproduce_the_vendored_python_on_synthetic_bytes() {
    let data = synthetic_bytes();
    assert_eq!(sha256_hex(&data), field(row("SYNTH"), "sha256"));

    let mtp = mtp_agent(&data);
    let (train, test) = data.split_at(AGENT_TRAIN);
    let hrm = hrm_agent(&HrmTables::freeze(train), test);
    let (hrm_lines, _) = hrm_agent_lines(&hrm);
    let mine: Vec<String> = mtp_agent_lines(&mtp).into_iter().chain(hrm_lines).collect();
    let want: Vec<&str> = FIXTURE
        .lines()
        .filter_map(|l| l.strip_prefix("LINE|text="))
        .collect();
    assert_eq!(mine, want);

    let m = row("MTPAGENT");
    for (key, got) in [
        ("x1", mtp.f1),
        ("x3", mtp.f3),
        ("x27", mtp.f27),
        ("back1", mtp.b1),
    ] {
        assert_eq!(format!("{}/{}", got.0, got.1), field(m, key), "{key}");
    }
    let h = row("HRMAGENT");
    assert_eq!(hrm.n.to_string(), field(h, "n"));
    assert_eq!(hrm.used[0].to_string(), field(h, "deep"));
    assert_eq!(hrm.used[1].to_string(), field(h, "mid"));
    assert_eq!(hrm.used[2].to_string(), field(h, "base"));
    // The Q64 sum agrees with the referee's exact value (192-bit fixed point) to 15 decimals.
    let (bits, _) = hrm.tally.sum_q64();
    let mine15 = render_q64_ratio(bits, hrm.n, 15);
    let exact = field(h, "bpc_exact");
    let digits = |s: &str| -> i128 { s.replace('.', "")[..16].parse().expect("digits") };
    assert!(
        (digits(&mine15) - digits(exact)).abs() <= 1,
        "{mine15} vs {exact}"
    );
}

#[test]
fn log2_q64_matches_known_values() {
    assert_eq!(log2_q64(1), 0);
    assert_eq!(log2_q64(2), 1 << 64);
    assert_eq!(log2_q64(1 << 40), 40 << 64);
    // floor((log2(3) - 1) * 2^64), from the referee's 192-bit fixed-point log2_fixed(3).
    let frac = log2_q64(3) - (1 << 64);
    let want: u128 = 10_790_653_543_520_307_103;
    assert!(want.abs_diff(frac) <= 4, "{frac}");
}

#[test]
fn python_fixed_format_rounds_the_binary_value_half_to_even() {
    // Python: f"{0.125:.2f}" == '0.12', f"{0.375:.2f}" == '0.38', f"{422/1200:.4f}" == '0.3517'
    assert_eq!(format_fixed(Sf64::from_ratio(1, 8), 2), "0.12");
    assert_eq!(format_fixed(Sf64::from_ratio(3, 8), 2), "0.38");
    assert_eq!(format_fixed(Sf64::from_ratio(422, 1200), 4), "0.3517");
    assert_eq!(format_fixed(Sf64::from_ratio(1, 2), 0), "0");
    assert_eq!(format_fixed(Sf64::from_ratio(3, 2), 0), "2");
    assert_eq!(format_fixed(Sf64::from_i64(100), 0), "100");
}

#[test]
fn windunwind_sphere_round_trips_every_address() {
    assert_eq!(primitive_root(P), 11);
    let sphere = Sphere::build();
    assert_eq!(sphere.g, 11);
    assert_eq!(sphere.w, 57_370);
    for (e, &p) in sphere.pts.iter().enumerate() {
        assert_eq!(sphere.inv[p as usize], e as u64);
    }
    let distinct: std::collections::BTreeSet<u64> = sphere.pts.iter().copied().collect();
    assert_eq!(distinct.len() as u64, N);
    let sector: Vec<u8> = (0..3000u32).map(|i| (i * 7 % 256) as u8).collect();
    assert!(sphere.wind_unwind_exact(&sector, 26));
}

#[test]
fn windunwind_sector_play_reproduces_the_integer_mirror() {
    let wind_row = |kind: &str| -> Vec<&str> {
        WIND_FIXTURE
            .lines()
            .filter(|l| l.starts_with(&format!("{kind}|")))
            .collect()
    };
    let num = |row: &str, key: &str| -> u64 { field(row, key).parse().expect("integer") };
    let bank_row = wind_row("BANK")[0];
    let bank_bytes = lcg_bytes(200_000, 0x9e37_79b9_7f4a_7c15, 7, 0, 0x7f);
    assert_eq!(sha256_hex(&bank_bytes), field(bank_row, "sha256"));
    let bank = Bank::freeze(&bank_bytes);
    let sphere = Sphere::build();
    assert_eq!(bank.t0, num(bank_row, "t0"));
    assert_eq!(sphere.g, num(bank_row, "g"));
    assert_eq!(sphere.w, num(bank_row, "W"));
    let contexts2 = bank.t2f.iter().filter(|&&t| t > 0).count() as u64;
    assert_eq!(contexts2, num(bank_row, "contexts2"));
    let sectors = wind_row("SECTOR");
    assert_eq!(sectors.len(), 2);
    let mut scratch = Scratch::default();
    for (row, seed) in sectors
        .into_iter()
        .zip([0x51ed_270b_27c1_a4e3u64, 0x0123_4567_89ab_cdef])
    {
        let d = num(row, "d") as usize;
        let sec = lcg_bytes(num(row, "bytes") as usize, seed, 97, 0, 0xff);
        assert_eq!(sha256_hex(&sec), field(row, "sha256"), "{row}");
        let play = play_sector(&bank, &sphere, &sec, d, &mut scratch);
        assert_eq!(u64::from(play.exact), num(row, "exact"), "{row}");
        assert_eq!(play.n, num(row, "n"), "{row}");
        assert_eq!(play.deep, num(row, "deep"), "{row}");
        // The mid and floor routes of hrm_bits (rime_windunwind.py:69-70) from the bank tables.
        let (mut mid, mut floor) = (0u64, 0u64);
        for w in sec.windows(3) {
            let c2 = usize::from(w[0]) << 8 | usize::from(w[1]);
            if bank.t2f[c2] < 8 {
                if bank.t1[usize::from(w[1])] > 0 {
                    mid += 1;
                } else {
                    floor += 1;
                }
            }
        }
        assert_eq!((mid, floor), (num(row, "mid"), num(row, "floor")), "{row}");
        for (name, (q64, weight)) in [
            ("mtp_fwd", play.mtp_fwd),
            ("mtp_bwd", play.mtp_bwd),
            ("hrm", play.hrm),
        ] {
            let exact: i128 = field(row, &format!("{name}_q64")).parse().expect("integer");
            let want_weight: u128 = field(row, &format!("{name}_weight"))
                .parse()
                .expect("integer");
            assert_eq!(weight, want_weight, "{name} {row}");
            // Each log2_q64 term lies below the exact value by less than 2^-58 (64 units).
            assert!(
                q64.abs_diff(exact) <= 64 * weight + 1,
                "{name}: {q64} vs {exact}"
            );
            assert_eq!(
                round_q64_ratio(q64, play.n, 4).0,
                field(row, &format!("{name}_bpc4")),
                "{name} {row}"
            );
            assert_eq!(
                render_q64_ratio(q64, play.n, 15),
                field(row, &format!("{name}_bpc")),
                "{name} {row}"
            );
        }
    }
}
