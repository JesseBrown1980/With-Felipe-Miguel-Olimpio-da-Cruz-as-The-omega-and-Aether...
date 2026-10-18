//! Runs the four owner binaries and checks what they print and write against the owner's run
//! records and the rows of tests/fixtures/REPRODUCE.hbp. Hashes use the owner's src/sha256.rs.

#[rustfmt::skip]
#[path = "../src/sha256.rs"]
mod sha256;

use std::path::{Path, PathBuf};
use std::process::Command;

type Row = Vec<(String, String)>;
type Record<'a> = (u8, usize, &'a [u8]);

fn crate_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn read(path: &Path) -> Vec<u8> {
    std::fs::read(path).unwrap_or_else(|e| panic!("{}: {e}", path.display()))
}

fn get<'a>(row: &'a Row, key: &str) -> Option<&'a str> {
    row.iter().find(|(k, _)| k == key).map(|(_, v)| v.as_str())
}

/// The REPRODUCE.hbp rows of one kind (`SCREP`, `SCOPT0`) for one binary.
fn rows(kind: &str, bin: &str) -> Vec<Row> {
    let text = String::from_utf8(read(&crate_dir().join("tests/fixtures/REPRODUCE.hbp"))).unwrap();
    let rows: Vec<Row> = text
        .lines()
        .filter(|l| l.split('|').next() == Some(kind))
        .map(|l| {
            l.split('|')
                .skip(1)
                .filter_map(|f| f.split_once('='))
                .map(|(k, v)| (k.to_string(), v.to_string()))
                .collect()
        })
        .filter(|r: &Row| get(r, "bin") == Some(bin))
        .collect();
    assert!(!rows.is_empty(), "no {kind} row for {bin}");
    rows
}

/// Checks one output against its row: size, sha256, line count, the record it must equal,
/// and for an HBP file the trailer, which must be the sha256 of everything before it.
fn check(row: &Row, out: &[u8]) {
    let path = get(row, "path").unwrap();
    assert_eq!(
        out.len().to_string(),
        get(row, "bytes").unwrap(),
        "{path}: bytes"
    );
    let digest = sha256::hex(&sha256::digest(out));
    assert_eq!(digest, get(row, "sha256").unwrap(), "{path}: sha256");
    if let Some(lines) = get(row, "lines") {
        let n = out.iter().filter(|&&b| b == b'\n').count();
        assert_eq!(n.to_string(), lines, "{path}: lines");
    }
    if let Some(record) = get(row, "equals") {
        assert!(
            out == read(&crate_dir().join(record)),
            "{path} differs from {record}"
        );
    }
    if let Some(trailer) = get(row, "trailer") {
        let (body, tail) = out.split_at(out.len() - 32);
        assert_eq!(sha256::hex(tail), trailer, "{path}: trailer");
        let body_digest = sha256::hex(&sha256::digest(body));
        assert_eq!(
            body_digest, trailer,
            "{path}: trailer is not the body's sha256"
        );
    }
}

fn check_all(bin: &str, output: impl Fn(&str) -> Vec<u8>) {
    for row in rows("SCREP", bin) {
        check(&row, &output(get(&row, "path").unwrap()));
    }
}

fn run(cmd: &mut Command) -> Vec<u8> {
    let out = cmd.output().expect("spawn");
    assert!(
        out.status.success(),
        "{:?}: {}",
        cmd,
        String::from_utf8_lossy(&out.stderr)
    );
    out.stdout
}

fn scratch(name: &str) -> PathBuf {
    let dir = Path::new(env!("CARGO_TARGET_TMPDIR")).join(name);
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

fn be32(b: &[u8]) -> usize {
    u32::from_be_bytes(b.try_into().unwrap()) as usize
}

/// `HBP1`, u32 version 1, u32 count, then count x (u8 tag, u32 length, payload), then the
/// 32-byte trailer (src/main.rs:361-382). Returns (tag, offset, payload) per record.
fn records(hbp: &[u8]) -> Vec<Record> {
    assert_eq!(&hbp[..4], b"HBP1");
    assert_eq!(be32(&hbp[4..8]), 1);
    let mut at = 12;
    let mut recs = Vec::new();
    for _ in 0..be32(&hbp[8..12]) {
        let len = be32(&hbp[at + 1..at + 5]);
        recs.push((hbp[at], at, &hbp[at + 5..at + 5 + len]));
        at += 5 + len;
    }
    assert_eq!(at + 32, hbp.len());
    recs
}

/// `HBI1`, u32 count, then one 13-byte entry (u8 tag, u64 offset, u32 length) per HBP record.
fn index_matches(hbi: &[u8], recs: &[Record]) {
    assert_eq!(&hbi[..4], b"HBI1");
    assert_eq!(be32(&hbi[4..8]), recs.len());
    assert_eq!(hbi.len(), 8 + 13 * recs.len());
    for (entry, (tag, off, payload)) in hbi[8..].chunks(13).zip(recs) {
        assert_eq!(entry[0], *tag);
        assert_eq!(
            u64::from_be_bytes(entry[1..9].try_into().unwrap()),
            *off as u64
        );
        assert_eq!(be32(&entry[9..13]), payload.len());
    }
}

fn last_line(out: &[u8]) -> &str {
    std::str::from_utf8(out).unwrap().lines().last().unwrap()
}

#[test]
fn threegap_prints_its_record() {
    let stdout = run(&mut Command::new(env!("CARGO_BIN_EXE_threegap")));
    check_all("threegap", |_| stdout.clone());
}

#[test]
fn verify_prints_its_record() {
    let stdout = run(&mut Command::new(env!("CARGO_BIN_EXE_verify")));
    check_all("verify", |_| stdout.clone());
}

/// callingchain writes `out/` under its working directory (src/bin/callingchain.rs:341-343).
#[test]
fn callingchain_prints_and_writes_what_was_measured() {
    let dir = scratch("callingchain");
    let stdout = run(Command::new(env!("CARGO_BIN_EXE_callingchain")).current_dir(&dir));
    let output = |path: &str| match path {
        "stdout" => stdout.clone(),
        _ => read(&dir.join(path)),
    };
    check_all("callingchain", output);

    let hbp = read(&dir.join("out/callingchain.hbp"));
    let recs = records(&hbp);
    index_matches(&read(&dir.join("out/callingchain.hbi")), &recs);
    let tags: Vec<u8> = recs.iter().map(|r| r.0).collect();
    assert_eq!(tags, [0x01, 0x10, 0x20, 0x21, 0x30, 0x31]);
    assert_eq!(recs[0].2, b"CALLINGCHAIN/1 STACKED-BH CHAIN TOPOLOGY");
    assert_eq!(recs[1].2, [1]);
    let genus = |r: &Record| i64::from_be_bytes(r.2.try_into().unwrap());
    let cycle_rank = |v: i64, e: i64| e - v + 1;
    assert_eq!(genus(&recs[2]), cycle_rank(2, 2));
    assert_eq!(genus(&recs[3]), cycle_rank(60, 90));
    // Tag 0x30 is float-derived; its bits are pinned because they are what opt-level changes.
    let opt0 = &rows("SCOPT0", "callingchain")[0];
    let bits = u64::from_str_radix(get(opt0, "tag30_bits_opt3").unwrap(), 16).unwrap();
    assert_eq!(u64::from_be_bytes(recs[4].2.try_into().unwrap()), bits);
    assert_eq!(recs[5].2.len(), 8);
    let trailer = sha256::hex(&hbp[hbp.len() - 32..]);
    assert_eq!(last_line(&stdout), format!("SHA256   {trailer}"));
}

/// shadowcat writes to the fixed path /root/_horizon/shadowcat/out (src/main.rs:551), so it
/// runs through tools/horizon.sh with a private /root.
#[cfg(target_os = "linux")]
#[test]
fn shadowcat_prints_its_record_and_writes_the_archived_files() {
    let dir = scratch("horizon");
    let horizon = Command::new("sh")
        .arg(crate_dir().join("tools/horizon.sh"))
        .arg(env!("CARGO_BIN_EXE_shadowcat"))
        .arg(&dir)
        .output()
        .expect("spawn sh");
    assert!(
        horizon.status.success(),
        "tools/horizon.sh (needs unshare and user namespaces): {}",
        String::from_utf8_lossy(&horizon.stderr)
    );
    let output = |path: &str| read(&dir.join(path.rsplit('/').next().unwrap()));
    check_all("shadowcat", output);

    let hbp = read(&dir.join("shadowcat.hbp"));
    let recs = records(&hbp);
    index_matches(&read(&dir.join("shadowcat.hbi")), &recs);
    let tags: Vec<u8> = recs.iter().map(|r| r.0).collect();
    let float_tags = [0x41, 0x42, 0x42, 0x50, 0x50, 0x50, 0x50, 0x50, 0x50, 0x50];
    let int_tags = [
        0x01, 0x10, 0x10, 0x10, 0x11, 0x12, 0x20, 0x21, 0x30, 0x31, 0x32, 0x40,
    ];
    assert_eq!(tags, [&int_tags[..], &float_tags[..]].concat());
    assert_eq!(recs[0].2, b"SHADOWCAT/1 LAW34 BROWN-SCHRODINGER");
    assert_eq!((recs[4].2, recs[5].2), (&[1u8][..], &[1u8][..]));
    let ints: Vec<i128> = recs
        .iter()
        .filter(|r| r.2.len() == 16)
        .map(|r| i128::from_be_bytes(r.2.try_into().unwrap()))
        .collect();
    let closure = 2731 * 1999 * 1723;
    assert_eq!(
        ints,
        [2731, 1999, 1723, 6, 60, 60, 90, 90 - 60 + 1, closure]
    );
    assert_eq!(closure, 9_406_320_487);
    assert!(recs[int_tags.len()..].iter().all(|r| r.2.len() == 8));
}
