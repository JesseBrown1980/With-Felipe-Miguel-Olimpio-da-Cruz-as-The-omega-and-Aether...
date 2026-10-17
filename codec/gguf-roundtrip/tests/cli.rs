//! The binary over a two-row manifest (a file row and an LFS row, the same 2,200-byte GGUF): the LFS
//! row with and without `--lfs-dir`, a row whose sha256 differs from the bytes, a missing file, a
//! manifest with nothing measured, and an unknown argument.
use std::path::{Path, PathBuf};
use std::process::Command;

const BIN: &str = env!("CARGO_BIN_EXE_asolaria-gguf-roundtrip");
const SMALL: &[u8] =
    include_bytes!("../../../gguf/follow/matrix/TIMED-CHIRAL-PUBLIC-COLOR-ORBITS.gguf");
const SMALL_SHA256: &str = "77174fb892a1c8152de362730d2864ef2b7f929b496af7758a5c42a88798bb6e";

fn scratch(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "asolaria-gguf-roundtrip-{}-{}",
        name,
        std::process::id()
    ));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(dir.join("lfs/x")).unwrap();
    std::fs::write(dir.join("small.gguf"), SMALL).unwrap();
    std::fs::write(dir.join("lfs/x/big.gguf"), SMALL).unwrap();
    dir
}

fn run(dir: &Path, manifest: &str, lfs: bool) -> (i32, String) {
    std::fs::write(dir.join("MANIFEST.hbp"), manifest).unwrap();
    let mut cmd = Command::new(BIN);
    cmd.arg("--manifest").arg(dir.join("MANIFEST.hbp"));
    if lfs {
        cmd.arg("--lfs-dir").arg(dir.join("lfs"));
    }
    let o = cmd.output().unwrap();
    (
        o.status.code().unwrap(),
        String::from_utf8(o.stdout).unwrap(),
    )
}

fn manifest(sha: &str) -> String {
    format!(
        "HBP1|schema=ASOLARIA-AETHER-GGUF-MANIFEST-V1|json=0\n\
         GGUF|local=small.gguf|storage=file|bytes=2200|sha256={sha}|json=0\n\
         GGUF|local=x/big.gguf|storage=lfs_pointer|bytes=2200|sha256={SMALL_SHA256}|json=0\n"
    )
}

#[test]
fn file_row_round_trips_and_lfs_row_needs_lfs_dir() {
    let dir = scratch("ok");
    let (code, out) = run(&dir, &manifest(SMALL_SHA256), false);
    assert_eq!(code, 0, "{}", out);
    let row = out
        .lines()
        .find(|l| l.starts_with("GGUF_ROUNDTRIP|local=small.gguf|"))
        .unwrap();
    for f in [
        "|status=MEASURED|",
        "|object_bytes=2200|",
        "|matches_manifest=1|",
        "|packet_bytes=11756|",
        "|packet_over_object=5.343636|",
        "|verdict=VerifiedClone|byte_identical=1|",
        "|traverse_verdict=VerifiedClone|traverse_byte_identical=1|",
    ] {
        assert!(row.contains(f), "{} not in {}", f, row);
    }
    assert!(out.contains("GGUF_ROUNDTRIP|local=x/big.gguf|storage=lfs_pointer|status=NOT_MEASURED|reason=lfs_pointer_without_lfs_dir|json=0"));
    assert!(out.lines().any(|l| l.starts_with("WORMHOLE|agt=AGT-")));
    assert!(out.contains("SUMMARY|rows=2|measured=1|not_measured=1|not_read=0|"));

    let (code, out) = run(&dir, &manifest(SMALL_SHA256), true);
    assert_eq!(code, 0, "{}", out);
    assert!(out.contains("|lfs_dir_given=1|"));
    assert!(out.contains("SUMMARY|rows=2|measured=2|not_measured=0|not_read=0|matches_manifest=2|verified_clone=2|byte_identical=2|"));
    assert!(out.lines().all(|l| l.ends_with("json=0")) && !out.contains('{'));
    std::fs::remove_dir_all(&dir).unwrap();
}

#[test]
fn sha256_differing_from_manifest_exits_1() {
    let dir = scratch("sha");
    let (code, out) = run(&dir, &manifest(&"0".repeat(64)), false);
    assert_eq!(code, 1, "{}", out);
    assert!(out.contains("|matches_manifest=0|"));
    std::fs::remove_dir_all(&dir).unwrap();
}

#[test]
fn missing_file_is_not_read_and_exits_1() {
    let dir = scratch("missing");
    std::fs::remove_file(dir.join("small.gguf")).unwrap();
    let (code, out) = run(&dir, &manifest(SMALL_SHA256), false);
    assert_eq!(code, 1, "{}", out);
    assert!(out.contains(
        "GGUF_ROUNDTRIP|local=small.gguf|storage=file|status=NOT_READ|reason=NotFound|json=0"
    ));
    std::fs::remove_dir_all(&dir).unwrap();
}

#[test]
fn nothing_measured_is_reported_not_measured() {
    let dir = scratch("none");
    let header = "HBP1|schema=ASOLARIA-AETHER-GGUF-MANIFEST-V1|json=0\n";
    let (code, out) = run(&dir, header, false);
    assert_eq!(code, 0, "{}", out);
    assert!(out.contains("SUMMARY|rows=0|measured=0|not_measured=0|not_read=0|matches_manifest=0|verified_clone=0|byte_identical=0|traverse_verified_clone=0|traverse_byte_identical=0|held=0|object_bytes=0|packet_bytes=0|packet_over_object=undefined|status=NOT_MEASURED|reason=no_gguf_measured|json=0"), "{}", out);

    let lfs_only = format!(
        "{header}GGUF|local=x/big.gguf|storage=lfs_pointer|bytes=2200|sha256={SMALL_SHA256}|json=0\n"
    );
    let (code, out) = run(&dir, &lfs_only, false);
    assert_eq!(code, 0, "{}", out);
    assert!(out.contains("SUMMARY|rows=1|measured=0|not_measured=1|"));
    assert!(out.contains("|status=NOT_MEASURED|reason=no_gguf_measured|json=0"));

    let (code, out) = run(&dir, &lfs_only, true);
    assert_eq!(code, 0, "{}", out);
    assert!(out.contains("SUMMARY|rows=1|measured=1|not_measured=0|"));
    assert!(!out.contains("status=NOT_MEASURED|reason=no_gguf_measured"));
    std::fs::remove_dir_all(&dir).unwrap();
}

#[test]
fn unknown_argument_is_a_usage_error() {
    let o = Command::new(BIN).arg("--subset").output().unwrap();
    assert_eq!(o.status.code(), Some(2));
}
