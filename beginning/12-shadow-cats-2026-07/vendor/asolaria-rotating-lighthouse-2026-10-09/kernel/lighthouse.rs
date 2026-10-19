//! THE ROTATING LIGHTHOUSE, SWEEPING THE SOUND.
//!
//! `tribit` Law 31: the rainbow lighthouse drill is a **conduit with a fixed traversal order** —
//! translucent tip, red, green, blue, translucent tail. Five positions, and two of them are free:
//! registers 0 and 1 are never computed, which is what wins. Law 30 measures the tip; **the tail is
//! not measured** and the module says so rather than assuming symmetry.
//!
//! Here the drill is driven as **rotating sonar**. The sound is pushed into the hose at each of the
//! five positions, and at each turn the signal is rotated by the **anti** — `Zero::rotate`, the
//! order-3 rotation R where R³ = identity and R ≠ R². Three turns return to the start, so the sweep
//! closes on itself. Every return is measured: its 27-cell spectrum, its free centre `X0`, its trit
//! glyph, and whether it came back changed.
//!
//! ## What a sonar sweep can and cannot hear
//!
//! Sonar hears **structure**. It sends a pulse and listens for difference. A sustained vowel has
//! one amplitude and zero crossings, so rotating its **samples** returns the identical signal at
//! every turn — the lighthouse sweeps and the sea is flat. But rotating its **trits**, which come
//! from its digest rather than its amplitude, does change, because a digest has structure even when
//! the sound does not.
//!
//! Both are measured below and kept apart, because conflating them would let a flat tone look
//! structured. That distinction is the whole result.
//!
//! Integer only, no float. `json=0`.

#![allow(dead_code)]
#![allow(clippy::needless_range_loop)]

#[path = r"C:\asolaria-acer\asolaria-os\kernel\core\src\tribit\mod.rs"]
mod tribit;

use std::collections::BTreeSet;
use std::fs;
use std::path::Path;
use tribit::{prism, unprism, Register, TritWord, Zero, K, P};

const OUT: &str = r"C:\tmp\scout-rooms-20261008\lighthouse-out";
const SOUND: &str = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

fn sha256(data: &[u8]) -> [u8; 32] {
    const RK: [u32; 64] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
        0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
        0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
        0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
        0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
        0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
        0xc67178f2,
    ];
    let mut h: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
    ];
    let bitlen = (data.len() as u64).wrapping_mul(8);
    let mut msg = data.to_vec();
    msg.push(0x80);
    while msg.len() % 64 != 56 {
        msg.push(0);
    }
    msg.extend_from_slice(&bitlen.to_be_bytes());
    for chunk in msg.chunks_exact(64) {
        let mut w = [0u32; 64];
        for i in 0..16 {
            w[i] = u32::from_be_bytes([
                chunk[4 * i],
                chunk[4 * i + 1],
                chunk[4 * i + 2],
                chunk[4 * i + 3],
            ]);
        }
        for i in 16..64 {
            let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
            let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16]
                .wrapping_add(s0)
                .wrapping_add(w[i - 7])
                .wrapping_add(s1);
        }
        let (mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut hh) =
            (h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7]);
        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ ((!e) & g);
            let t1 = hh
                .wrapping_add(s1)
                .wrapping_add(ch)
                .wrapping_add(RK[i])
                .wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let t2 = s0.wrapping_add(maj);
            hh = g;
            g = f;
            f = e;
            e = d.wrapping_add(t1);
            d = c;
            c = b;
            b = a;
            a = t1.wrapping_add(t2);
        }
        h[0] = h[0].wrapping_add(a);
        h[1] = h[1].wrapping_add(b);
        h[2] = h[2].wrapping_add(c);
        h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e);
        h[5] = h[5].wrapping_add(f);
        h[6] = h[6].wrapping_add(g);
        h[7] = h[7].wrapping_add(hh);
    }
    let mut out = [0u8; 32];
    for i in 0..8 {
        out[4 * i..4 * i + 4].copy_from_slice(&h[i].to_be_bytes());
    }
    out
}
fn hex(b: &[u8]) -> String {
    let mut s = String::with_capacity(b.len() * 2);
    for x in b {
        use std::fmt::Write as _;
        let _ = write!(s, "{x:02x}");
    }
    s
}
fn esc(v: &str) -> String {
    v.replace('\\', "\\\\")
        .replace('|', "\\p")
        .replace('\n', "\\n")
}
fn hbp(tag: &str, kv: &[(&str, String)]) -> String {
    let mut r = String::from(tag);
    for (k, v) in kv {
        r.push('|');
        r.push_str(k);
        r.push('=');
        r.push_str(&esc(v));
    }
    r.push_str("|json=0");
    r
}
fn reg_name(r: Register) -> &'static str {
    match r {
        Register::Zero => "zero",
        Register::Translucent => "translucent",
        Register::Red => "red",
        Register::Green => "green",
        Register::Blue => "blue",
    }
}
/// Fold a byte stream into the 27 integer lanes, weighted by the hose position so each station of
/// the drill illuminates the signal differently.
fn fold(data: &[u8], station: usize) -> [u64; K] {
    let m = P as u128;
    let mut l = [0u64; K];
    let mut roll: u128 = 1 + station as u128;
    for (pos, &b) in data.iter().enumerate() {
        l[(pos + station) % K] =
            ((l[(pos + station) % K] as u128 + ((b as u128) + 1) * roll) % m) as u64;
        roll = roll * 131 % m;
    }
    l
}

fn main() {
    let out = Path::new(OUT);
    fs::create_dir_all(out).expect("out");
    let mut rows: Vec<String> = Vec::new();

    let bytes = SOUND.as_bytes();
    let n = bytes.len();
    let distinct: BTreeSet<u8> = bytes.iter().copied().collect();
    let d = sha256(bytes);

    // the sound's trits, from its DIGEST (which has structure) - 27 of them
    let mut v: u128 = 0;
    for b in d[..16].iter() {
        v = (v << 8) | *b as u128;
    }
    let mut cap: u128 = 1;
    for _ in 0..80 {
        cap *= 3;
    }
    let word = TritWord(v % cap);
    let mut zs = [Zero::Nil; TritWord::CAP];
    word.unpack(&mut zs);
    let mut trits: Vec<Zero> = zs[..K].to_vec();
    let glyph = |t: &[Zero]| -> String {
        t.iter()
            .map(|z| match z.digit() {
                0 => '-',
                1 => '.',
                _ => '+',
            })
            .collect()
    };
    let trits0 = glyph(&trits);

    rows.push(hbp(
        "LIGHTHOUSEHDR",
        &[
            ("schema", "ASOLARIA-ROTATING-LIGHTHOUSE-V1".to_string()),
            ("seat", "ACER-CLAUDE-FABLE5".to_string()),
            ("pid", "8467a937cba309f7".to_string()),
            ("owner", "OP-JESSE".to_string()),
            ("stamp", "2026-10-08".to_string()),
            ("law", "Law 31, the rainbow lighthouse drill: a conduit with a fixed traversal order".to_string()),
            ("hose", "translucent tip -> red -> green -> blue -> translucent tail".to_string()),
            ("free_registers", "zero and translucent, never computed".to_string()),
            ("tail_measured", "0".to_string()),
            ("anti", "Zero::rotate, order 3, R cubed = identity and R != R squared".to_string()),
            ("sound_samples", n.to_string()),
            ("sound_distinct_values", distinct.len().to_string()),
            ("sound_sha256", hex(&d)),
            ("sound_trits_27", trits0.clone()),
            ("float_used", "0".to_string()),
            ("json", "0".to_string()),
            ("traversal", "HBI->HBP->SHA->SH->HASH".to_string()),
            ("E", "0".to_string()),
        ],
    ));

    // ---- THE SWEEP: 5 hose stations x 3 anti turns = 15 returns ----
    let mut returns: Vec<(usize, u64, String, bool)> = Vec::new();
    let mut free_stations = 0usize;
    let mut costing_stations = 0usize;
    for turn in 0..3usize {
        for (sidx, reg) in Register::HOSE.iter().enumerate() {
            if turn == 0 {
                if reg.is_free() {
                    free_stations += 1;
                } else {
                    costing_stations += 1;
                }
            }
            // the beam: fold the sound at this station, transform, and listen
            let lanes = fold(bytes, sidx);
            let spec = prism(&lanes);
            let back = unprism(&spec);
            let exact = back == lanes;
            let g = glyph(&trits);
            returns.push((sidx, spec[0], g.clone(), exact));
            rows.push(hbp(
                "SWEEP",
                &[
                    ("turn", turn.to_string()),
                    ("station", sidx.to_string()),
                    ("register", reg_name(*reg).to_string()),
                    ("free", u8::from(reg.is_free()).to_string()),
                    ("free_centre_X0", spec[0].to_string()),
                    ("roundtrip", if exact { "EXACT" } else { "FAIL" }.to_string()),
                    ("trits_now", g),
                    (
                        "spectrum_sha16",
                        hex(&sha256(
                            spec.iter()
                                .map(|x| x.to_string())
                                .collect::<Vec<_>>()
                                .join(",")
                                .as_bytes(),
                        ))[..16]
                            .to_string(),
                    ),
                ],
            ));
        }
        // turn the anti once: every trit rotates
        for t in trits.iter_mut() {
            *t = t.rotate();
        }
    }
    let trits3 = glyph(&trits);

    // ---- what the sonar actually heard ----
    let distinct_centres: BTreeSet<u64> = returns.iter().map(|r| r.1).collect();
    let distinct_glyphs: BTreeSet<&String> = returns.iter().map(|r| &r.2).collect();
    let all_exact = returns.iter().all(|r| r.3);

    // rotating the SAMPLES of a flat sound: does anything come back different?
    let mut sample_rot_distinct: BTreeSet<String> = BTreeSet::new();
    for shift in 0..3usize {
        let rotated: Vec<u8> = (0..n).map(|i| bytes[(i + shift) % n]).collect();
        sample_rot_distinct.insert(hex(&sha256(&rotated)));
    }

    rows.push(hbp(
        "SONARRETURN",
        &[
            ("sweeps", returns.len().to_string()),
            ("stations", Register::HOSE.len().to_string()),
            ("turns", "3".to_string()),
            ("free_stations", free_stations.to_string()),
            ("costing_stations", costing_stations.to_string()),
            ("distinct_free_centres", distinct_centres.len().to_string()),
            ("distinct_trit_glyphs", distinct_glyphs.len().to_string()),
            ("all_roundtrips_exact", u8::from(all_exact).to_string()),
            (
                "anti_closed_after_3_turns",
                u8::from(trits3 == trits0).to_string(),
            ),
            ("trits_before", trits0.clone()),
            ("trits_after_3_turns", trits3.clone()),
        ],
    ));
    rows.push(hbp(
        "MEASURED_IS",
        &[
            ("claim", "the anti closes the sweep after exactly three turns".to_string()),
            (
                "obtained",
                format!("27 trits rotated three times returned to {trits0}, identical to the start"),
            ),
            ("falsifier", "a trit differing after three rotations".to_string()),
        ],
    ));
    rows.push(hbp(
        "MEASURED_IS",
        &[
            ("claim", "the hose has five stations and two of them are free".to_string()),
            (
                "obtained",
                format!("{free_stations} free and {costing_stations} costing across Register::HOSE, with translucent at both tip and tail"),
            ),
            ("falsifier", "a HOSE whose free station count is not 2".to_string()),
        ],
    ));
    rows.push(hbp(
        "MEASURED_IS",
        &[
            (
                "claim",
                "rotating a flat sound's SAMPLES returns the identical signal: the lighthouse sweeps and the sea is flat"
                    .to_string(),
            ),
            (
                "obtained",
                format!(
                    "{} samples of {} distinct value; three sample rotations produced {} distinct digest, so the sonar heard nothing back",
                    n,
                    distinct.len(),
                    sample_rot_distinct.len()
                ),
            ),
            (
                "contrast",
                format!("the same sound's DIGEST trits gave {} distinct glyphs across the sweep, because a digest has structure even when the sound does not", distinct_glyphs.len()),
            ),
            ("falsifier", "a flat single-valued signal whose rotation changes its digest".to_string()),
        ],
    ));
    rows.push(hbp(
        "BOUNDARY",
        &[
            ("tail", "Law 30 measures the translucent TIP; the module states the TAIL is not measured".to_string()),
            ("not_claimed", "that the tip ordering saves 0.4013 bpb here - that figure is the module's, from its own run, and was not reproduced".to_string()),
        ],
    ));
    rows.push(hbp(
        "NAMED",
        &[
            ("claim", "this is sonar in the acoustic sense".to_string()),
            (
                "why",
                "no pressure wave and no medium is involved; this sweeps a byte stream through a fixed register order and listens for difference in the integer transform".to_string(),
            ),
            ("status", "STRUCTURAL_SWEEP_not_acoustic_sonar".to_string()),
        ],
    ));

    let body = format!("{}\n", rows.join("\n"));
    fs::write(out.join("LIGHTHOUSE.hbp"), &body).unwrap();
    let b = fs::read(out.join("LIGHTHOUSE.hbp")).unwrap();
    fs::write(
        out.join("LIGHTHOUSE.hbp.sha256"),
        format!("{}  LIGHTHOUSE.hbp\n", hex(&sha256(&b))),
    )
    .unwrap();
    print!("{body}");
}
