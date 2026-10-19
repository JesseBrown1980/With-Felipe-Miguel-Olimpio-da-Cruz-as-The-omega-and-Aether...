//! asolaria github 3D viewer kernel — balanced-ternary (Setun-class), integer only.
//!
//! Reads frozen git bytes from local clones, folds each repo's admitted UTF-8 text
//! into K=27 integer lanes over Z/pZ, runs the canonical rime prism (an exact 27-point
//! Number-Theoretic Transform), and verifies the inverse returns the lanes byte-for-byte.
//! That exact round trip is the integrity proof: a lie cannot reproduce its own hash.
//!
//! No float is used anywhere (Law 34: int closes exactly on the free centre; float drifts
//! and crashes around the free 4th zero / HTTP-0 Omega portal). Output is the sealed
//! traversal HBI -> HBP -> SHA -> SH -> HASH, json=0.
//!
//! The ternary kernel primitives are REUSED from the canonical asolaria-os kernel, not
//! reimplemented, via a path module include.

#![allow(clippy::needless_range_loop)]
// The canonical tribit module is a full library; this bin reuses only part of it.
#![allow(dead_code)]

#[path = r"C:\asolaria-acer\asolaria-os\kernel\core\src\tribit\mod.rs"]
mod tribit;

// ONE shared fold (sketch + identity), never a per-kernel copy. Reads P/K from tribit.
#[path = r"C:\tmp\scout-rooms-20261008\common\fold.rs"]
mod fold;

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use tribit::{prism, unprism, TritWord, Zero, G, K, P, W};

const BINARY_EXT: &[&str] = &[
    "7z", "a", "avi", "bin", "bmp", "class", "dll", "dylib", "eot", "exe", "gif", "gz", "ico",
    "jar", "jpeg", "jpg", "mov", "mp3", "mp4", "o", "obj", "otf", "pdf", "png", "pyc", "so", "tar",
    "ttf", "wasm", "webp", "woff", "woff2", "xz", "zip", "lock",
];
const HELD_PARTS: &[&str] = &[
    ".git",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "__pycache__",
    "build",
    "coverage",
    "dist",
    "node_modules",
    "target",
    "venv",
];
const SECRET_NEEDLES: &[&[u8]] = &[
    b"-----BEGIN RSA PRIVATE KEY-----",
    b"-----BEGIN OPENSSH PRIVATE KEY-----",
    b"-----BEGIN PRIVATE KEY-----",
    b"github_pat_",
    b"AKIA",
];

// -------------------------------------------------------------------- SHA-256 (vendored)

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
        let mut a = h[0];
        let mut b = h[1];
        let mut c = h[2];
        let mut d = h[3];
        let mut e = h[4];
        let mut f = h[5];
        let mut g = h[6];
        let mut hh = h[7];
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

fn hex(bytes: &[u8]) -> String {
    let mut s = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        s.push_str(&format!("{b:02x}"));
    }
    s
}

// ------------------------------------------------------------------- balanced-ternary view

/// First 16 bytes of a digest as 80 balanced-ternary glyphs, reusing the canonical TritWord.
fn trit80(digest: &[u8; 32]) -> String {
    let mut v: u128 = 0;
    for &b in &digest[..16] {
        v = (v << 8) | b as u128;
    }
    let mut cap: u128 = 1;
    for _ in 0..80 {
        cap *= 3;
    }
    let word = TritWord(v % cap);
    let mut zeros = [Zero::Nil; TritWord::CAP];
    word.unpack(&mut zeros);
    zeros
        .iter()
        .map(|z| match z.digit() {
            0 => '-',
            1 => '.',
            _ => '+',
        })
        .collect()
}

// fold_lanes moved to common/fold.rs as `sketch_lanes` (byte-identical, now LABELLED lossy).

// --------------------------------------------------------------------------- file intake

fn is_held(relative: &Path) -> bool {
    for part in relative.components() {
        let name = part.as_os_str().to_string_lossy().to_lowercase();
        if HELD_PARTS.contains(&name.as_str()) {
            return true;
        }
    }
    if let Some(ext) = relative.extension() {
        let ext = ext.to_string_lossy().to_lowercase();
        if BINARY_EXT.contains(&ext.as_str()) {
            return true;
        }
    }
    if let Some(name) = relative.file_name() {
        let lower = name.to_string_lossy().to_lowercase();
        if lower == ".env" || lower.ends_with(".pem") || lower.ends_with(".key") {
            return true;
        }
    }
    false
}

fn walk(dir: &Path, base: &Path, out: &mut Vec<PathBuf>) {
    let mut entries: Vec<PathBuf> = match fs::read_dir(dir) {
        Ok(rd) => rd.filter_map(|e| e.ok().map(|e| e.path())).collect(),
        Err(_) => return,
    };
    entries.sort();
    for path in entries {
        if path.is_dir() {
            let rel = path.strip_prefix(base).unwrap_or(&path);
            if is_held(rel) {
                continue;
            }
            walk(&path, base, out);
        } else if path.is_file() {
            out.push(path);
        }
    }
}

struct RepoView {
    slug: String,
    commit: String,
    admitted: usize,
    held: usize,
    corpus_bytes: usize,
    sha: String,
    sh: String,
    roundtrip_exact: bool,
    spectrum: [u64; K],
    trit80: String,
    /// identity lanes (sha-derived) pushed through the same prism
    id_spectrum: [u64; K],
    id_roundtrip_exact: bool,
    /// sha over path|NUL|len_be64|bytes framing: boundaries and renames are visible
    framed_sha: String,
}

fn git_head(dir: &Path) -> String {
    Command::new("git")
        .arg("-C")
        .arg(dir)
        .args(["rev-parse", "HEAD"])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|| "UNKNOWN".to_string())
}

/// One entry of the HEAD tree: repo-relative path ('/'-separated) and its committed bytes.
/// `None` = not a regular blob (symlink 120000, submodule 160000) — held, never read.
struct TreeEntry {
    path: String,
    bytes: Option<Vec<u8>>,
}

/// V3 intake: the FROZEN git bytes of HEAD's tree, via `git ls-tree -r -z` + `git cat-file
/// --batch`. V1/V2 read the Windows working tree, which `core.autocrlf=true` had converted
/// LF->CRLF (7 of 12 clones, 4,037 files in shannon alone) — the checkout was an instrument.
/// Order = component-wise path sort, identical to the old `walk` so LF-only repos reproduce V2.
fn head_tree(root: &Path) -> Vec<TreeEntry> {
    let ls = Command::new("git")
        .arg("-C")
        .arg(root)
        .args(["ls-tree", "-r", "-z", "--full-tree", "HEAD"])
        .output()
        .expect("git ls-tree");
    assert!(
        ls.status.success(),
        "git ls-tree failed in {}",
        root.display()
    );
    // "<mode> <type> <oid>\t<path>\0"
    let mut items: Vec<(String, String, String)> = Vec::new();
    for rec in ls.stdout.split(|&b| b == 0).filter(|r| !r.is_empty()) {
        let tab = rec.iter().position(|&b| b == b'\t').expect("ls-tree tab");
        let meta = String::from_utf8_lossy(&rec[..tab]).to_string();
        let path = String::from_utf8_lossy(&rec[tab + 1..]).to_string();
        let mut it = meta.split(' ');
        let mode = it.next().unwrap_or("").to_string();
        let _kind = it.next();
        let oid = it.next().unwrap_or("").to_string();
        items.push((path, mode, oid));
    }
    items.sort_by(|a, b| a.0.split('/').cmp(b.0.split('/')));

    let blob_oids: Vec<String> = items
        .iter()
        .filter(|(_, m, _)| m == "100644" || m == "100755")
        .map(|(_, _, o)| o.clone())
        .collect();
    let mut child = Command::new("git")
        .arg("-C")
        .arg(root)
        .args(["cat-file", "--batch"])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .spawn()
        .expect("git cat-file --batch");
    let mut stdin = child.stdin.take().expect("stdin");
    let feed = std::thread::spawn(move || {
        use std::io::Write as _;
        for o in &blob_oids {
            writeln!(stdin, "{o}").expect("feed cat-file");
        }
    });
    let out = child.wait_with_output().expect("cat-file output");
    feed.join().expect("feeder");
    assert!(out.status.success(), "git cat-file failed");

    // "<oid> blob <size>\n<bytes>\n" repeated, in request order
    let mut blobs: Vec<Vec<u8>> = Vec::new();
    let s = &out.stdout;
    let mut i = 0usize;
    while i < s.len() {
        let nl = i + s[i..].iter().position(|&b| b == b'\n').expect("header nl");
        let header = String::from_utf8_lossy(&s[i..nl]).to_string();
        let size: usize = header
            .rsplit(' ')
            .next()
            .and_then(|x| x.parse().ok())
            .unwrap_or_else(|| panic!("bad cat-file header {header}"));
        blobs.push(s[nl + 1..nl + 1 + size].to_vec());
        i = nl + 1 + size + 1;
    }
    let mut blobs = blobs.into_iter();
    items
        .into_iter()
        .map(|(path, mode, _)| TreeEntry {
            bytes: if mode == "100644" || mode == "100755" {
                Some(blobs.next().expect("blob count matches request count"))
            } else {
                None
            },
            path,
        })
        .collect()
}

fn view_repo(slug: &str, root: &Path) -> RepoView {
    let entries = head_tree(root);

    let mut corpus: Vec<u8> = Vec::new();
    let mut framed: Vec<u8> = Vec::new();
    let mut admitted = 0usize;
    let mut held = 0usize;
    for entry in entries {
        let rel = Path::new(&entry.path);
        if is_held(rel) {
            held += 1;
            continue;
        }
        let raw = match entry.bytes {
            Some(r) => r,
            None => {
                held += 1;
                continue;
            }
        };
        if raw.contains(&0) || std::str::from_utf8(&raw).is_err() {
            held += 1;
            continue;
        }
        if SECRET_NEEDLES
            .iter()
            .any(|needle| raw.windows(needle.len()).any(|w| w == *needle))
        {
            held += 1;
            continue;
        }
        corpus.extend_from_slice(&raw);
        let rel_s = rel.to_string_lossy().replace('\\', "/");
        framed.extend_from_slice(rel_s.as_bytes());
        framed.push(0);
        framed.extend_from_slice(&(raw.len() as u64).to_be_bytes());
        framed.extend_from_slice(&raw);
        admitted += 1;
    }

    let digest = sha256(&corpus);
    let sha = hex(&digest);
    let lanes = fold::sketch_lanes(&corpus);
    let spectrum = prism(&lanes);
    let back = unprism(&spectrum);
    let id_lanes = fold::identity_lanes(&corpus, sha256);
    let id_spectrum = prism(&id_lanes);
    let id_back = unprism(&id_spectrum);
    RepoView {
        slug: slug.to_string(),
        commit: git_head(root),
        admitted,
        held,
        corpus_bytes: corpus.len(),
        sh: sha[..16].to_string(),
        sha,
        roundtrip_exact: back == lanes,
        spectrum,
        trit80: trit80(&digest),
        id_spectrum,
        id_roundtrip_exact: id_back == id_lanes,
        framed_sha: hex(&sha256(&framed)),
    }
}

// --------------------------------------------------------------------------- HBP / HBI

fn hbp_row(tag: &str, fields: &[(&str, String)]) -> String {
    let mut row = String::from(tag);
    for (k, v) in fields {
        row.push('|');
        row.push_str(k);
        row.push('=');
        row.push_str(v);
    }
    row.push_str("|json=0");
    row
}

fn write_bundle(out_dir: &Path, stem: &str, rows: &[String]) -> std::io::Result<()> {
    let hbp_path = out_dir.join(format!("{stem}.hbp"));
    let hbp_body = format!("{}\n", rows.join("\n"));
    fs::write(&hbp_path, hbp_body.as_bytes())?;

    let hbi_rows: Vec<String> = rows
        .iter()
        .enumerate()
        .map(|(i, r)| {
            hbp_row(
                "HBI",
                &[
                    ("row", (i + 1).to_string()),
                    ("sha256", hex(&sha256(r.as_bytes()))),
                    ("hex", hex(r.as_bytes())),
                ],
            )
        })
        .collect();
    let hbi_path = out_dir.join(format!("{stem}.hbi"));
    let hbi_body = format!("{}\n", hbi_rows.join("\n"));
    fs::write(&hbi_path, hbi_body.as_bytes())?;

    for p in [&hbp_path, &hbi_path] {
        let bytes = fs::read(p)?;
        let name = p.file_name().unwrap().to_string_lossy();
        fs::write(
            out_dir.join(format!("{name}.sha256")),
            format!("{}  {}\n", hex(&sha256(&bytes)), name),
        )?;
    }
    Ok(())
}

fn main() {
    // integrity self-test: a broken hash refuses to run (lie cannot reproduce its own hash)
    assert_eq!(
        hex(&sha256(b"")),
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "vendored SHA-256 failed its known-answer test"
    );

    let args: Vec<String> = std::env::args().collect();
    if args.len() != 3 {
        eprintln!("usage: github3d <clones-dir> <out-dir>");
        std::process::exit(2);
    }
    let clones = PathBuf::from(&args[1]);
    let out_dir = PathBuf::from(&args[2]);
    fs::create_dir_all(&out_dir).expect("create out dir");

    let mut repo_dirs: Vec<PathBuf> = fs::read_dir(&clones)
        .expect("read clones dir")
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.is_dir() && p.join(".git").exists())
        .collect();
    repo_dirs.sort();

    let views: Vec<RepoView> = repo_dirs
        .iter()
        .map(|dir| {
            let slug = dir.file_name().unwrap().to_string_lossy().to_string();
            view_repo(&slug, dir)
        })
        .collect();

    let mut rows: Vec<String> = Vec::new();
    rows.push(hbp_row(
        "GITHUB3DHDR",
        &[
            ("schema", "ASOLARIA-GITHUB-3D-VIEW-V3".to_string()),
            (
                "bytes_source",
                "git_cat_file_HEAD_tree_not_working_tree".to_string(),
            ),
            (
                "corrects",
                "V2 hashed autocrlf-converted CRLF working-tree bytes".to_string(),
            ),
            ("supersedes_scope_of", "2147b583a4db0f3f".to_string()),
            (
                "fold",
                "common/fold.rs:sketch_lanes=LOSSY_LINEAR+identity_lanes=SHA256".to_string(),
            ),
            ("roundtrip_scope", "KERNEL_BIJECTION_NOT_DATA".to_string()),
            ("kernel", "rust-1.81-clippy-int-only".to_string()),
            ("carrier", "AC_balanced_ternary_setun".to_string()),
            ("P", P.to_string()),
            ("G", G.to_string()),
            ("K", K.to_string()),
            ("W", W.to_string()),
            ("float_used", "0".to_string()),
            ("free_fourth_zero", "HTTP-0_OMEGA_PORTAL_NAMED".to_string()),
            ("traversal", "HBI->HBP->SHA->SH->HASH".to_string()),
            ("repos", views.len().to_string()),
            ("reuse", "asolaria-os/kernel/core/tribit".to_string()),
            ("E", "0".to_string()),
        ],
    ));

    for v in &views {
        rows.push(hbp_row(
            "GITHUB3DREPO",
            &[
                ("repo", v.slug.clone()),
                ("commit", v.commit.clone()),
                ("admitted", v.admitted.to_string()),
                ("held", v.held.to_string()),
                ("corpus_bytes", v.corpus_bytes.to_string()),
                ("sha", v.sha.clone()),
                ("sh", v.sh.clone()),
                (
                    "roundtrip",
                    if v.roundtrip_exact { "EXACT" } else { "FAIL" }.to_string(),
                ),
                ("dc_free_zero", v.spectrum[0].to_string()),
                ("cube", "3x3x3".to_string()),
                ("spectrum_sha", {
                    let joined = v
                        .spectrum
                        .iter()
                        .map(|x| x.to_string())
                        .collect::<Vec<_>>()
                        .join(",");
                    hex(&sha256(joined.as_bytes()))
                }),
                ("trit80", v.trit80.clone()),
                ("trit80_kind", "LOSSY_HASH_PREFIX_RENDER".to_string()),
                ("sketch_kind", "LOSSY_LINEAR_PERIOD_100008".to_string()),
                ("id_spectrum_sha", {
                    let joined = v
                        .id_spectrum
                        .iter()
                        .map(|x| x.to_string())
                        .collect::<Vec<_>>()
                        .join(",");
                    hex(&sha256(joined.as_bytes()))
                }),
                (
                    "id_roundtrip",
                    if v.id_roundtrip_exact {
                        "EXACT"
                    } else {
                        "FAIL"
                    }
                    .to_string(),
                ),
                ("framed_sha", v.framed_sha.clone()),
            ],
        ));
        for j in 0..K {
            let d0 = (j % 3) as i8 - 1;
            let d1 = ((j / 3) % 3) as i8 - 1;
            let d2 = (j / 9) as i8 - 1;
            rows.push(hbp_row(
                "CUBECELL",
                &[
                    ("repo", v.slug.clone()),
                    ("j", j.to_string()),
                    ("a", d0.to_string()),
                    ("b", d1.to_string()),
                    ("c", d2.to_string()),
                    ("v", v.spectrum[j].to_string()),
                    ("free", if j == 0 { "1" } else { "0" }.to_string()),
                ],
            ));
        }
    }

    // HASH: merkle over sorted repo:sha lines
    let mut leaves: BTreeMap<String, String> = BTreeMap::new();
    for v in &views {
        leaves.insert(v.slug.clone(), v.sha.clone());
    }
    let merkle_src: String = leaves
        .iter()
        .map(|(k, s)| format!("{k}={s}"))
        .collect::<Vec<_>>()
        .join("\n");
    let all_exact = views
        .iter()
        .all(|v| v.roundtrip_exact && v.id_roundtrip_exact);

    // V2 merkle: binds commit oid + path/length framing (V1 bound neither).
    let mut leaves2: BTreeMap<String, String> = BTreeMap::new();
    for v in &views {
        leaves2.insert(v.slug.clone(), format!("{}={}", v.commit, v.framed_sha));
    }
    let merkle2_src: String = leaves2
        .iter()
        .map(|(k, s)| format!("{k}={s}"))
        .collect::<Vec<_>>()
        .join("\n");

    // LIVE falsifier of the sketch, run every time, not quoted. Each must hold or no seal.
    let (ca, cb) = fold::sketch_collision_pair();
    let c55_sketch_equal = ca != cb && fold::sketch_lanes(&ca) == fold::sketch_lanes(&cb);
    let c55_id_differ = fold::identity_lanes(&ca, sha256) != fold::identity_lanes(&cb, sha256);
    let mut pa = vec![b'x'; fold::SKETCH_PERIOD + 1];
    pa[0] = b'a';
    pa[fold::SKETCH_PERIOD] = b'b';
    let mut pb = pa.clone();
    pb.swap(0, fold::SKETCH_PERIOD);
    let period_sketch_equal = fold::sketch_lanes(&pa) == fold::sketch_lanes(&pb);
    let period_id_differ = fold::identity_lanes(&pa, sha256) != fold::identity_lanes(&pb, sha256);
    let period_order = fold::sketch_period_holds();
    let falsifier_ok = c55_sketch_equal
        && c55_id_differ
        && period_sketch_equal
        && period_id_differ
        && period_order;
    rows.push(hbp_row(
        "SKETCHFALSIFIER",
        &[
            (
                "claim",
                "sketch_lanes is not an identity; identity_lanes separates what it merges"
                    .to_string(),
            ),
            (
                "collision55_sketch_equal",
                (c55_sketch_equal as u8).to_string(),
            ),
            (
                "collision55_identity_differ",
                (c55_id_differ as u8).to_string(),
            ),
            (
                "collision55_deltas",
                "pos0+183,pos27+241,pos54-252".to_string(),
            ),
            ("period", fold::SKETCH_PERIOD.to_string()),
            (
                "period_is_exact_order_of_131",
                (period_order as u8).to_string(),
            ),
            (
                "period_swap_sketch_equal",
                (period_sketch_equal as u8).to_string(),
            ),
            (
                "period_swap_identity_differ",
                (period_id_differ as u8).to_string(),
            ),
            (
                "prior_collision_length",
                "1000082_found_by_opus55_10x_longer_than_needed".to_string(),
            ),
            (
                "status",
                if falsifier_ok { "PASS" } else { "FAIL" }.to_string(),
            ),
        ],
    ));
    assert!(
        falsifier_ok,
        "sketch falsifier did not reproduce; refuse to seal"
    );
    rows.push(hbp_row(
        "GITHUB3DHASH",
        &[
            ("method", "sha256_over_sorted_repo=sha_lines_LF".to_string()),
            ("repos", views.len().to_string()),
            ("hash", hex(&sha256(merkle_src.as_bytes()))),
            (
                "method2",
                "sha256_over_sorted_repo=commit=framed_sha_lines_LF".to_string(),
            ),
            ("hash2", hex(&sha256(merkle2_src.as_bytes()))),
            ("float_used", "0".to_string()),
            (
                "all_roundtrip_exact",
                if all_exact { "1" } else { "0" }.to_string(),
            ),
            (
                "status",
                if all_exact { "PASS" } else { "FAIL" }.to_string(),
            ),
        ],
    ));

    write_bundle(&out_dir, "GITHUB-3D-VIEW", &rows).expect("write bundle");
    println!("{}", rows.join("\n"));
}
