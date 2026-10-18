#![forbid(unsafe_code)]

//! Regenerates both object sets from their 3D-tree seeds and compares every emitted
//! file (GGUF, HBP, HBI, SVG and the four .sha256 sidecars) byte-for-byte and by
//! SHA-256 against the FOLLOW stored set vendored under expected/follow/matrix/
//! (FOLLOW-THE-IS-NOT-THE-WILL-AND-WAS@8712368 matrix/), and cross-checks the two
//! GGUFs against the in-repo gguf/follow/matrix/ copies. Integer arithmetic only.
//!
//! Both seeds are vendored under seeds/ (PROVENANCE.md records the owner decision to
//! publish the outward seed PUBLIC-OWNER-3D-MEDIA-TREE.hbp), so both cases run by default.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicU32, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

const SHA256_K: [u32; 64] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

fn sha256(message: &[u8]) -> [u8; 32] {
    let mut state: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
    ];
    let bit_length = (message.len() as u64).wrapping_mul(8);
    let mut padded = message.to_vec();
    padded.push(0x80);
    while padded.len() % 64 != 56 {
        padded.push(0);
    }
    padded.extend_from_slice(&bit_length.to_be_bytes());

    for chunk in padded.chunks_exact(64) {
        let mut w = [0u32; 64];
        for (index, word) in w.iter_mut().take(16).enumerate() {
            let start = index * 4;
            *word = u32::from_be_bytes([
                chunk[start],
                chunk[start + 1],
                chunk[start + 2],
                chunk[start + 3],
            ]);
        }
        for index in 16..64 {
            let s0 = w[index - 15].rotate_right(7)
                ^ w[index - 15].rotate_right(18)
                ^ (w[index - 15] >> 3);
            let s1 = w[index - 2].rotate_right(17)
                ^ w[index - 2].rotate_right(19)
                ^ (w[index - 2] >> 10);
            w[index] = w[index - 16]
                .wrapping_add(s0)
                .wrapping_add(w[index - 7])
                .wrapping_add(s1);
        }

        let [mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut h] = state;
        for (&word, &constant) in w.iter().zip(SHA256_K.iter()) {
            let big_s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let choose = (e & f) ^ ((!e) & g);
            let temp1 = h
                .wrapping_add(big_s1)
                .wrapping_add(choose)
                .wrapping_add(constant)
                .wrapping_add(word);
            let big_s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let majority = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = big_s0.wrapping_add(majority);
            h = g;
            g = f;
            f = e;
            e = d.wrapping_add(temp1);
            d = c;
            c = b;
            b = a;
            a = temp1.wrapping_add(temp2);
        }
        state[0] = state[0].wrapping_add(a);
        state[1] = state[1].wrapping_add(b);
        state[2] = state[2].wrapping_add(c);
        state[3] = state[3].wrapping_add(d);
        state[4] = state[4].wrapping_add(e);
        state[5] = state[5].wrapping_add(f);
        state[6] = state[6].wrapping_add(g);
        state[7] = state[7].wrapping_add(h);
    }

    let mut digest = [0u8; 32];
    for (index, word) in state.iter().enumerate() {
        digest[index * 4..index * 4 + 4].copy_from_slice(&word.to_be_bytes());
    }
    digest
}

fn hex(bytes: &[u8]) -> String {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for &byte in bytes {
        out.push(DIGITS[(byte >> 4) as usize] as char);
        out.push(DIGITS[(byte & 0x0f) as usize] as char);
    }
    out
}

struct Primary {
    name: &'static str,
    sha256: &'static str,
}

struct Case {
    bin_exe: &'static str,
    report_tag: &'static str,
    seed: &'static str,
    /// Count fields of the report line, as recorded in the stored HBI.
    counts: &'static [(&'static str, &'static str)],
    primaries: [Primary; 4],
}

fn manifest_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
}

/// The library refuses symlinked path ancestors (lib.rs:726-742, LINK_PATH), so every
/// directory handed to a binary is canonicalized first.
fn canonical_dir(path: &Path) -> PathBuf {
    fs::canonicalize(path)
        .unwrap_or_else(|error| panic!("canonicalizing {} failed: {error}", path.display()))
}

/// Removes the output directory when dropped, including after a failed assertion.
struct OutputDir(PathBuf);

impl Drop for OutputDir {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

fn fresh_empty_dir(label: &str) -> OutputDir {
    static COUNTER: AtomicU32 = AtomicU32::new(0);
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock after epoch")
        .as_nanos();
    let unique = COUNTER.fetch_add(1, Ordering::Relaxed);
    let dir = canonical_dir(&std::env::temp_dir()).join(format!(
        "qprism-rep-bins-{label}-{}-{nanos}-{unique}",
        std::process::id()
    ));
    if dir.exists() {
        fs::remove_dir_all(&dir).expect("stale output directory removes");
    }
    fs::create_dir_all(&dir).expect("output directory creates");
    OutputDir(dir)
}

fn read(path: &Path) -> Vec<u8> {
    fs::read(path).unwrap_or_else(|error| panic!("reading {} failed: {error}", path.display()))
}

fn report_field<'a>(report: &'a str, key: &str) -> &'a str {
    for field in report.trim_end().split('|') {
        if let Some(value) = field.strip_prefix(&format!("{key}=")) {
            return value;
        }
    }
    panic!("report is missing field {key}: {report}");
}

fn run_case(case: &Case, seed_dir: &Path) {
    let seed = seed_dir.join(case.seed);
    let out_guard = fresh_empty_dir(case.report_tag);
    let out_dir = &out_guard.0;

    let output = Command::new(case.bin_exe)
        .arg(&seed)
        .arg(out_dir)
        .arg("--replace")
        .output()
        .unwrap_or_else(|error| panic!("running {} failed: {error}", case.bin_exe));
    let stdout = String::from_utf8(output.stdout).expect("bin stdout is utf-8");
    assert!(
        output.status.success(),
        "{} exited {:?}; stderr={}",
        case.bin_exe,
        output.status.code(),
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(
        stdout.starts_with(&format!("{}|PASS=1|", case.report_tag)),
        "unexpected report line: {stdout}"
    );
    assert_eq!(report_field(&stdout, "json"), "0", "report must be json=0");
    for (key, value) in case.counts {
        assert_eq!(
            report_field(&stdout, key),
            *value,
            "report {key} differs from the stored HBI count"
        );
    }

    // the output directory holds exactly the four primaries and their sidecars
    let mut emitted_names: Vec<String> = fs::read_dir(out_dir)
        .expect("output directory lists")
        .map(|entry| {
            entry
                .expect("output directory entry reads")
                .file_name()
                .into_string()
                .expect("output file name is utf-8")
        })
        .collect();
    emitted_names.sort();
    let mut expected_names: Vec<String> = case
        .primaries
        .iter()
        .flat_map(|p| [p.name.to_string(), format!("{}.sha256", p.name)])
        .collect();
    expected_names.sort();
    assert_eq!(
        emitted_names, expected_names,
        "output directory holds other than the eight expected files"
    );

    let expected_dir = manifest_dir().join("expected/follow/matrix");
    let repo_gguf_dir = manifest_dir().join("../../gguf/follow/matrix");

    for primary in &case.primaries {
        let emitted = out_dir.join(primary.name);
        let emitted_bytes = read(&emitted);

        // by sha256
        let emitted_hex = hex(&sha256(&emitted_bytes));
        assert_eq!(
            emitted_hex, primary.sha256,
            "{} regenerated sha256 differs from the stored sha256",
            primary.name
        );

        // the vendored reference is itself pinned to the same sha256
        let expected_bytes = read(&expected_dir.join(primary.name));
        assert_eq!(
            hex(&sha256(&expected_bytes)),
            primary.sha256,
            "vendored expected {} differs from the stored sha256",
            primary.name
        );

        // byte-for-byte against the FOLLOW stored set
        assert!(
            emitted_bytes == expected_bytes,
            "{} not byte-identical to expected ({} vs {} bytes)",
            primary.name,
            emitted_bytes.len(),
            expected_bytes.len()
        );

        // the emitted .sha256 sidecar is well-formed and byte-identical to the stored one
        let sidecar_name = format!("{}.sha256", primary.name);
        let emitted_sidecar = read(&out_dir.join(&sidecar_name));
        let expected_line = format!("{}  {}\n", primary.sha256, primary.name);
        assert!(
            emitted_sidecar == expected_line.as_bytes(),
            "{} differs from the stored sidecar line",
            sidecar_name
        );
        let expected_sidecar = read(&expected_dir.join(&sidecar_name));
        assert!(
            emitted_sidecar == expected_sidecar,
            "{} sidecar not byte-identical to expected",
            sidecar_name
        );
    }

    // the bin reports each primary's sha256 under hbp/hbi/svg/gguf keys
    for (key, primary) in ["hbp", "hbi", "svg", "gguf"]
        .iter()
        .zip(case.primaries.iter())
    {
        assert_eq!(
            report_field(&stdout, &format!("{key}_sha256")),
            primary.sha256,
            "report {key}_sha256 disagrees with stored sha256"
        );
    }

    // GGUF: also byte-for-byte against the in-repo gguf/follow/matrix/ copy
    let gguf = case
        .primaries
        .iter()
        .find(|p| p.name.ends_with(".gguf"))
        .expect("a gguf primary");
    let emitted_gguf = read(&out_dir.join(gguf.name));
    let repo_gguf = read(&repo_gguf_dir.join(gguf.name));
    assert!(
        emitted_gguf == repo_gguf,
        "{} not byte-identical to gguf/follow/matrix/{}",
        gguf.name,
        gguf.name
    );
    assert_eq!(
        hex(&sha256(&repo_gguf)),
        gguf.sha256,
        "gguf/follow/matrix/{} differs from the stored sha256",
        gguf.name
    );
}

#[test]
fn sha256_self_test() {
    assert_eq!(
        hex(&sha256(b"")),
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    assert_eq!(
        hex(&sha256(b"abc")),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
}

const FOLDER: Case = Case {
    bin_exe: env!("CARGO_BIN_EXE_folder-calming-oils"),
    report_tag: "FOLDEROIL181",
    seed: "PUBLIC-FOLDER-3D-TREE.hbp",
    // PUBLIC-FOLDER-CALMING-OILS.hbi line 1
    counts: &[
        ("repositories", "147"),
        ("folders", "3536"),
        ("leaves", "10608"),
    ],
    primaries: [
        Primary {
            name: "PUBLIC-FOLDER-CALMING-OILS.hbp",
            sha256: "43300780cac2b85e3ed6cfa10398052f530ccbf76c43b404e650c26c9ed8b006",
        },
        Primary {
            name: "PUBLIC-FOLDER-CALMING-OILS.hbi",
            sha256: "9920d5cb2031d6453fba2d410e4b2f6e0136a4537fa6ea2ea9385c163503a28b",
        },
        Primary {
            name: "PUBLIC-FOLDER-CALMING-OILS.svg",
            sha256: "feb18cc1e5034620a0ce78787df22683ccd662409df8b8af0752438c07d6a63b",
        },
        Primary {
            name: "PUBLIC-FOLDER-CALMING-OILS.gguf",
            sha256: "fa266f1bf527d3757b6825d97b65653c547d8f1557a1ba516cee1598facd2bcf",
        },
    ],
};

const OUTWARD: Case = Case {
    bin_exe: env!("CARGO_BIN_EXE_outward-truth-waves"),
    report_tag: "OUTWARD181",
    seed: "PUBLIC-OWNER-3D-MEDIA-TREE.hbp",
    // PUBLIC-OUTWARD-TRUTH-WAVES.hbi line 1
    counts: &[("repositories", "147"), ("waves", "1764")],
    primaries: [
        Primary {
            name: "PUBLIC-OUTWARD-TRUTH-WAVES.hbp",
            sha256: "a0a0d0ab471e337edc7942ca42b4fb5c9e6f05060635e3b1ed6c94c1dad03472",
        },
        Primary {
            name: "PUBLIC-OUTWARD-TRUTH-WAVES.hbi",
            sha256: "81ad88a2e3a64e55accce6a886975eca08c8eff83f65fb25b7c30c07aa765e99",
        },
        Primary {
            name: "PUBLIC-OUTWARD-TRUTH-WAVES.svg",
            sha256: "b6ad987e4a4b503aef4d1a42eeb662e7e803e6195494ea4704e58267796246aa",
        },
        Primary {
            name: "PUBLIC-OUTWARD-TRUTH-WAVES.gguf",
            sha256: "b315be52a4a6870d2eb15f44736dd29e30685bea6b0b16936e16abc9a809e9f6",
        },
    ],
};

#[test]
fn regenerates_folder_object_set_byte_exact() {
    run_case(&FOLDER, &canonical_dir(&manifest_dir().join("seeds")));
}

#[test]
fn regenerates_outward_object_set_byte_exact() {
    run_case(&OUTWARD, &canonical_dir(&manifest_dir().join("seeds")));
}
