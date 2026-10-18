#![forbid(unsafe_code)]
//! Every fixture root reads to its committed expected rows, and the generated fixtures
//! (`codec/`, `tamper/`) regenerate byte for byte from the owner's code and the public files.

#[path = "common/gen.rs"]
mod gen;

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

fn crate_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

fn files_under(root: &Path) -> BTreeMap<String, Vec<u8>> {
    let mut out = BTreeMap::new();
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        for e in fs::read_dir(&dir).expect("read_dir") {
            let p = e.expect("entry").path();
            if p.is_dir() {
                stack.push(p);
            } else {
                let rel = p.strip_prefix(root).expect("prefix");
                out.insert(
                    rel.to_string_lossy().into_owned(),
                    fs::read(&p).expect("read"),
                );
            }
        }
    }
    out
}

#[test]
fn every_fixture_root_matches_its_expected_rows() {
    let fixtures = crate_dir().join("tests/fixtures");
    let mut names: Vec<String> = fs::read_dir(&fixtures)
        .expect("fixtures")
        .map(|e| e.expect("entry").file_name().to_string_lossy().into_owned())
        .collect();
    names.sort();
    assert_eq!(
        names,
        [
            "codec",
            "public-annn",
            "public-colour",
            "public-follow",
            "public-omnibit",
            "public-simulator",
            "public-stone",
            "tamper"
        ]
    );
    for n in names {
        let rows = vault_reader::read_vault(&fixtures.join(&n)).expect("read_vault");
        let got = rows.iter().fold(String::new(), |mut s, r| {
            s.push_str(r);
            s.push('\n');
            s
        });
        let want = fs::read(crate_dir().join(format!("tests/expected/{n}.hbp"))).expect("expected");
        assert!(got.as_bytes() == want.as_slice(), "fixture {n} differs");
    }
}

#[test]
fn generated_fixtures_regenerate_byte_for_byte() {
    let out = PathBuf::from(env!("CARGO_TARGET_TMPDIR")).join("vault-reader-regen");
    let _ = fs::remove_dir_all(&out);
    let fixtures = crate_dir().join("tests/fixtures");
    gen::generate(&fixtures, &out);
    for part in ["codec", "tamper"] {
        let a = files_under(&fixtures.join(part));
        let b = files_under(&out.join(part));
        assert_eq!(
            a.keys().collect::<Vec<_>>(),
            b.keys().collect::<Vec<_>>(),
            "{part} file list"
        );
        for (k, v) in &a {
            assert!(b[k] == *v, "{part}/{k} differs");
        }
    }
}

#[test]
fn case_rows_regenerate_byte_for_byte() {
    let want = fs::read_to_string(crate_dir().join("tests/cases/CASES.hbp")).expect("cases");
    assert!(gen::cases_spec() == want, "tests/cases/CASES.hbp differs");
}

/// Bytes of an even-length hex string (the `path_hex`/`data_hex` values of `CASES.hbp`).
#[cfg(target_os = "linux")]
fn unhex(s: &str) -> Vec<u8> {
    (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&s[i..i + 2], 16).expect("hex"))
        .collect()
}

/// Build every case tree of `tests/cases/CASES.hbp` (names that are not UTF-8 and symbolic
/// links, which do not survive every checkout) and compare the rows with `expected/cases.hbp`.
#[cfg(target_os = "linux")]
#[test]
fn every_case_matches_its_expected_rows() {
    use std::ffi::OsStr;
    use std::os::unix::ffi::OsStrExt;

    let base = PathBuf::from(env!("CARGO_TARGET_TMPDIR")).join("vault-reader-cases");
    let _ = fs::remove_dir_all(&base);
    let spec = fs::read_to_string(crate_dir().join("tests/cases/CASES.hbp")).expect("cases");
    let mut names: Vec<String> = Vec::new();
    for line in spec.lines() {
        let (tag, fields) = asolaria_hbi_hbp::parse_row(line);
        let get = |k: &str| {
            fields
                .iter()
                .find(|(a, _)| a == k)
                .map(|(_, v)| v.clone())
                .expect("field")
        };
        let case = get("case");
        if !names.contains(&case) {
            fs::create_dir_all(base.join(&case).join("root")).expect("mkdir");
            names.push(case.clone());
        }
        let path = base
            .join(&case)
            .join(OsStr::from_bytes(&unhex(&get("path_hex"))));
        fs::create_dir_all(path.parent().expect("parent")).expect("mkdir");
        match tag.as_str() {
            "CASEFILE" => fs::write(&path, unhex(&get("data_hex"))).expect("write"),
            "CASELINK" => {
                std::os::unix::fs::symlink(OsStr::from_bytes(&unhex(&get("target_hex"))), &path)
                    .expect("symlink")
            }
            _ => panic!("unknown case row {tag}"),
        }
    }
    let mut got = String::new();
    for n in &names {
        got.push_str(&asolaria_hbi_hbp::encode_row("CASE", &[("name", n)]));
        got.push('\n');
        for r in vault_reader::read_vault(&base.join(n).join("root")).expect("read_vault") {
            got.push_str(&r);
            got.push('\n');
        }
    }
    let want = fs::read(crate_dir().join("tests/expected/cases.hbp")).expect("expected");
    if got.as_bytes() != want.as_slice() {
        fs::write(base.join("cases.got.hbp"), &got).expect("write got");
        panic!("cases differ; rows written to {}", base.display());
    }
}

/// The aether `hbp` crate source whose `verify_hbp` the trinity check calls is pinned
/// (`DEPENDS.sha256`), so a change there is seen before it changes any result.
#[test]
fn dependency_pins_hold() {
    let pins = fs::read_to_string(crate_dir().join("DEPENDS.sha256")).expect("pins");
    let mut n = 0;
    for line in pins.lines() {
        let (sha, path) = line.split_once("  ").expect("sha256sum line");
        let bytes = fs::read(crate_dir().join(path)).expect("pinned file");
        assert_eq!(asolaria_hbi_hbp::sha256_hex(&bytes), sha, "{path} changed");
        n += 1;
    }
    assert!(n > 0);
}

#[test]
fn reading_writes_nothing_inside_the_root() {
    let root = crate_dir().join("tests/fixtures/public-simulator");
    let before = files_under(&root);
    vault_reader::read_vault(&root).expect("read_vault");
    assert!(files_under(&root) == before);
}
