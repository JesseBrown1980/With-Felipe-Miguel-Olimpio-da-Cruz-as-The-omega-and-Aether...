//! Runs the vendored `hp_mix` binary (asolaria-cube-cloud@f91bb2c `hutter/variants/mix/hp_mix.rs`)
//! the way its upstream workflow does (`hutter-tournament.yml:75-79`: compress, decompress as a
//! separate invocation, compare the restored bytes) plus its `verify` mode (hp_mix.rs:345-353), on
//! the inputs of `tests/fixtures/hp-mix.hbp`. The fixture is written by `tools/hp_mix_referee.py`.
#![forbid(unsafe_code)]

use sha2::{Digest, Sha256};
use std::fmt::Write;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

const FIXTURE: &str = include_str!("fixtures/hp-mix.hbp");
const ENWIK_FIXTURE: &str = include_str!("fixtures/hp-mix-enwik.hbp");
const RECEIPT: &str =
    include_str!("../vendor/asolaria-cube-cloud/results/FABLE5-HUTTER-PRETEST-ARC-2026-07-17.hbp");

fn field<'a>(row: &'a str, key: &str) -> &'a str {
    row.split('|')
        .find_map(|kv| kv.strip_prefix(key).and_then(|v| v.strip_prefix('=')))
        .unwrap_or_else(|| panic!("no {key} in {row}"))
}

fn num(row: &str, key: &str) -> u128 {
    field(row, key).parse().unwrap()
}

fn hex(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(64);
    for b in Sha256::digest(bytes) {
        write!(s, "{b:02x}").unwrap();
    }
    s
}

/// Test input generator of this crate (mirrored in the referee's `lcg_bytes`).
fn lcg_bytes(n: usize) -> Vec<u8> {
    let mut x: u64 = 0;
    (0..n)
        .map(|_| {
            x = x
                .wrapping_mul(6364136223846793005)
                .wrapping_add(1442695040888963407);
            (x >> 56) as u8
        })
        .collect()
}

fn crate_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn input_for(name: &str) -> Vec<u8> {
    match name {
        "empty" => Vec::new(),
        "one-byte-A" => b"A".to_vec(),
        "AB-x20" => b"AB".repeat(20),
        "lcg-65536" => lcg_bytes(65536),
        "hrm-license" => fs::read(crate_dir().join("vendor/HRM/LICENSE")).unwrap(),
        other => panic!("unknown case {other}"),
    }
}

/// Runs hp_mix from the crate directory, where `file!()` (hp_mix.rs:327) names the vendored file.
fn hp_mix(args: &[&str]) -> String {
    let out = Command::new(env!("CARGO_BIN_EXE_hp_mix"))
        .args(args)
        .current_dir(crate_dir())
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "hp_mix {args:?} exited {:?}",
        out.status
    );
    String::from_utf8(out.stdout).unwrap()
}

struct Case<'a> {
    case: &'a str,
    pilot: &'a str,
    decompress: &'a str,
}

fn cases() -> Vec<Case<'static>> {
    let rows: Vec<&str> = FIXTURE.lines().filter(|l| !l.starts_with('#')).collect();
    let mut out = Vec::new();
    for (i, row) in rows.iter().enumerate() {
        if row.starts_with("CASE|") {
            out.push(Case {
                case: row,
                pilot: rows[i + 1],
                decompress: rows[i + 2],
            });
        }
    }
    assert_eq!(out.len(), 5);
    out
}

#[test]
fn verify_compress_decompress_match_the_referee() {
    let tmp = PathBuf::from(env!("CARGO_TARGET_TMPDIR")).join("hp-mix");
    fs::create_dir_all(&tmp).unwrap();
    for c in cases() {
        let name = field(c.case, "name");
        let data = input_for(name);
        assert_eq!(data.len() as u128, num(c.case, "input_bytes"), "{name}");
        assert_eq!(hex(&data), field(c.case, "input_sha256"), "{name}");
        let input = tmp.join(format!("{name}.in"));
        let archive = tmp.join(format!("{name}.hp"));
        let restored = tmp.join(format!("{name}.rt"));
        fs::write(&input, &data).unwrap();
        let (i, a, r) = (
            input.to_str().unwrap(),
            archive.to_str().unwrap(),
            restored.to_str().unwrap(),
        );

        assert_eq!(
            hp_mix(&["verify", i]),
            format!("{}\nROUNDTRIP_OK\n", c.pilot)
        );

        let compress_row = c
            .pilot
            .replace("|mode=verify|", "|mode=compress|")
            .replace("|roundtrip=1", "|roundtrip=0");
        assert_eq!(hp_mix(&["compress", i, a]), format!("{compress_row}\n"));
        let arc = fs::read(&archive).unwrap();
        assert_eq!(arc.len() as u128, num(c.case, "archive_bytes"), "{name}");
        assert_eq!(hex(&arc), field(c.case, "archive_sha256"), "{name}");
        assert_eq!(&arc[..8], &(data.len() as u64).to_le_bytes(), "{name}");

        assert_eq!(hp_mix(&["decompress", a, r]), format!("{}\n", c.decompress));
        assert_eq!(fs::read(&restored).unwrap(), data, "{name}");
    }
}

#[test]
fn decoder_src_bytes_is_the_vendored_file_size() {
    let len =
        fs::metadata(crate_dir().join("vendor/asolaria-cube-cloud/hutter/variants/mix/hp_mix.rs"))
            .unwrap()
            .len() as u128;
    let header = FIXTURE
        .lines()
        .find(|l| l.starts_with("HPMIXFIX|"))
        .unwrap();
    assert_eq!(num(header, "decoder_src_bytes"), len);
    assert_eq!(len, 13074);
}

#[test]
fn unknown_mode_and_short_args_exit_2() {
    for args in [&["verify"][..], &["nope", "x"][..]] {
        let st = Command::new(env!("CARGO_BIN_EXE_hp_mix"))
            .args(args)
            .current_dir(crate_dir())
            .output()
            .unwrap()
            .status;
        assert_eq!(st.code(), Some(2), "{args:?}");
    }
}

/// The receipt's footer (row 15) carries the sha256 of rows 1-14.
#[test]
fn receipt_footer_seals_rows_1_to_14() {
    let rows: Vec<&str> = RECEIPT.lines().collect();
    assert_eq!(rows.len(), 15);
    let body = rows[..14].join("\n") + "\n";
    assert_eq!(hex(body.as_bytes()), field(rows[14], "receipt_sha256"));
    assert_eq!(num(rows[14], "rows"), 14);
}

/// The measured enwik runs (tests/fixtures/hp-mix-enwik.hbp) against the mix rows of the receipt.
/// The receipt's bpc comes from the workflow's `python3 f'{arch*8/1e8:.4f}'` (hutter-tournament.yml:83,
/// enwik9-two-system.yml:72), a rounded value; hp_mix.rs:334 at f91bb2c prints the truncated value.
#[test]
fn measured_enwik_archives_match_the_receipt_mix_rows() {
    let receipt_e8 = RECEIPT
        .lines()
        .find(|l| l.starts_with("E8|variant=mix|"))
        .unwrap();
    let receipt_e9 = RECEIPT
        .lines()
        .find(|l| l.starts_with("E9|system=mix|"))
        .unwrap();
    for (corpus, receipt_row) in [("enwik8", receipt_e8), ("enwik9", receipt_e9)] {
        let run = ENWIK_FIXTURE
            .lines()
            .find(|l| l.starts_with("RUN|") && field(l, "corpus") == corpus)
            .unwrap();
        let pilot = ENWIK_FIXTURE
            .lines()
            .find(|l| {
                l.starts_with("PILOT|") && field(l, "input_bytes") == field(run, "input_bytes")
            })
            .unwrap();
        let n = num(run, "input_bytes");
        let a = num(run, "archive_bytes");
        assert_eq!(a, num(receipt_row, "archive_bytes"), "{corpus}");
        assert_eq!(num(pilot, "archive_bytes"), a, "{corpus}");
        assert_eq!(
            field(run, "input_sha256"),
            field(run, "restored_sha256"),
            "{corpus}"
        );
        assert_eq!(field(receipt_row, "roundtrip_exact"), "1");

        let e4_floor = a * 8 * 10_000 / n;
        let e4_half_up = (a * 8 * 10_000 * 2 + n) / (2 * n);
        let fmt = |e4: u128| format!("{}.{:04}", e4 / 10_000, e4 % 10_000);
        assert_eq!(field(pilot, "bpc"), fmt(e4_floor), "{corpus}");
        assert_eq!(field(receipt_row, "bpc"), fmt(e4_half_up), "{corpus}");
    }
    assert_eq!(field(receipt_e9, "sha"), "159b85351e5f76e6...");
}
