//! Digest parity between shadowcat's `src/sha256.rs` and the nine SHA-256 copies written for aether,
//! over boundary vectors and every tracked file. Build and run as `parity/run.sh` does.
#![allow(dead_code)]

#[path = "../src/sha256.rs"]
mod shadowcat;

#[path = "../../aether-universe/src/sha256.rs"]
mod aether_universe;
#[path = "../../gguf/verify/src/sha256.rs"]
mod gguf_verify;
#[path = "../../pump/glyphs-herself/tests/common/mod.rs"]
mod glyphs_herself;
#[path = "../../planes/gnn-trio/src/sha256.rs"]
mod gnn_trio;
#[path = "../../qr/qr-read-int/tests/corpus/sha256.rs"]
mod qr_read_int;
#[path = "../../ternary/tests/common/sha256.rs"]
mod ternary;
#[path = "../../hbp/vault-reader/src/sha.rs"]
mod vault_reader;
/// `codec/dbbh-dbwh/src/lib.rs` from `const K` through `fn sha256`, cut out by `run.sh`.
mod dbbh_dbwh {
    include!(concat!(env!("PARITY_WORK"), "/dbbh_dbwh_sha256.rs"));
}
/// `qprism/representation-bins/tests/referee.rs` from `const SHA256_K` through `fn sha256`, cut out by `run.sh`.
mod referee {
    include!(concat!(env!("PARITY_WORK"), "/referee_sha256.rs"));
    pub fn digest(message: &[u8]) -> [u8; 32] {
        sha256(message)
    }
}

use std::io::Write;

const N: usize = 9;
const NAMES: [&str; N] = [
    "gguf/verify/src/sha256.rs",
    "hbp/vault-reader/src/sha.rs",
    "pump/glyphs-herself/tests/common/mod.rs",
    "qr/qr-read-int/tests/corpus/sha256.rs",
    "ternary/tests/common/sha256.rs",
    "planes/gnn-trio/src/sha256.rs",
    "aether-universe/src/sha256.rs",
    "codec/dbbh-dbwh/src/lib.rs:sha256",
    "qprism/representation-bins/tests/referee.rs:sha256",
];

fn shadowcat_chunked(data: &[u8], chunk: usize) -> String {
    let mut s = shadowcat::Sha256::new();
    for part in data.chunks(chunk.max(1)) {
        s.update(part);
    }
    shadowcat::hex(&s.finish())
}

fn vault_reader_chunked(data: &[u8], chunk: usize) -> String {
    let mut s = vault_reader::Sha256::new();
    for part in data.chunks(chunk.max(1)) {
        s.update(part);
    }
    s.finish_hex()
}

fn aether_universe_chunked(data: &[u8], chunk: usize) -> String {
    let mut s = aether_universe::Sha256::new();
    for part in data.chunks(chunk.max(1)) {
        s.update(part);
    }
    shadowcat::hex(&s.finish())
}

fn ternary_chunked(data: &[u8], chunk: usize) -> String {
    let mut s = ternary::Sha256::new();
    for part in data.chunks(chunk.max(1)) {
        s.update(part);
    }
    s.hex()
}

/// The aether digests of `data`, in `NAMES` order; the streaming ones fed in `chunk`-byte parts.
fn aether_all(data: &[u8], chunk: usize) -> [String; N] {
    [
        gguf_verify::hex(&gguf_verify::digest(data)),
        vault_reader_chunked(data, chunk),
        glyphs_herself::sha256(data),
        qr_read_int::hex(data),
        ternary_chunked(data, chunk),
        gnn_trio::hex(data),
        aether_universe_chunked(data, chunk),
        shadowcat::hex(&dbbh_dbwh::sha256(data)),
        shadowcat::hex(&referee::digest(data)),
    ]
}

struct Tally {
    inputs: u64,
    bytes: u64,
    mismatch: [u64; N],
    shadowcat_stream_mismatch: u64,
    reference_mismatch: u64,
}

impl Tally {
    fn new() -> Tally {
        Tally {
            inputs: 0,
            bytes: 0,
            mismatch: [0; N],
            shadowcat_stream_mismatch: 0,
            reference_mismatch: 0,
        }
    }

    /// Compares every implementation with shadowcat's one-shot digest, and that with `reference` if given.
    fn check(&mut self, label: &str, data: &[u8], chunk: usize, reference: Option<&str>) -> String {
        let want = shadowcat::hex(&shadowcat::digest(data));
        self.inputs += 1;
        self.bytes += data.len() as u64;
        if shadowcat_chunked(data, chunk) != want {
            self.shadowcat_stream_mismatch += 1;
            eprintln!("MISMATCH|impl=shadowcat-stream|input={label}|chunk={chunk}");
        }
        for (i, got) in aether_all(data, chunk).iter().enumerate() {
            if *got != want {
                self.mismatch[i] += 1;
                eprintln!("MISMATCH|impl={}|input={label}|chunk={chunk}", NAMES[i]);
            }
        }
        if let Some(r) = reference {
            if r != want {
                self.reference_mismatch += 1;
                eprintln!("MISMATCH|impl=coreutils|input={label}");
            }
        }
        want
    }

    fn total_mismatch(&self) -> u64 {
        self.mismatch.iter().sum::<u64>() + self.shadowcat_stream_mismatch + self.reference_mismatch
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() != 5 {
        eprintln!("usage: sha256_parity <repo-root> <coreutils-sums> <commit> <out.hbp>");
        std::process::exit(2);
    }
    let root = std::path::Path::new(&args[1]);
    let sums = std::fs::read_to_string(&args[2]).expect("read sums");
    let mut out = Vec::new();
    writeln!(out, "PARITYHDR|schema=SHADOWCAT-SHA256-PARITY-V1|commit={}|reference=shadowcat/src/sha256.rs|compared=9|json=0", args[3]).unwrap();

    // FIPS 180-4 / NIST CAVS vectors.
    let nist: [(&str, Vec<u8>, &str); 5] = [
        ("empty", Vec::new(), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"),
        ("abc", b"abc".to_vec(), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"),
        (
            "448bit",
            b"abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq".to_vec(),
            "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
        ),
        (
            "896bit",
            b"abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu".to_vec(),
            "cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1",
        ),
        ("million_a", vec![b'a'; 1_000_000], "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0"),
    ];
    let mut t = Tally::new();
    for (label, data, want) in nist.iter() {
        for chunk in [1usize, 63, 64, 65, 4096] {
            t.check(label, data, chunk, Some(want));
        }
    }
    writeln!(
        out,
        "NIST|vectors=5|chunkings=5|inputs={}|mismatch={}|json=0",
        t.inputs,
        t.total_mismatch()
    )
    .unwrap();

    // Every length 0..=1100 (each padding boundary 55/56/63/64 many times), fed in nine chunk sizes.
    let mut b = Tally::new();
    let pattern: Vec<u8> = (0..1100u32)
        .map(|i| (i.wrapping_mul(31).wrapping_add(7) & 0xff) as u8)
        .collect();
    for len in 0..=1100usize {
        for chunk in [1usize, 3, 55, 56, 63, 64, 65, 127, 128] {
            b.check(&format!("len{len}"), &pattern[..len], chunk, None);
        }
    }
    writeln!(
        out,
        "BOUNDARY|lengths=0..1100|chunkings=9|inputs={}|bytes={}|mismatch={}|json=0",
        b.inputs,
        b.bytes,
        b.total_mismatch()
    )
    .unwrap();

    // Every tracked file, against coreutils sha256sum of the same path.
    let mut f = Tally::new();
    let (mut gguf_n, mut gguf_bytes) = (0u64, 0u64);
    let mut gguf_rows = Vec::new();
    let mut listing = shadowcat::Sha256::new();
    for line in sums.lines() {
        let (want, path) = line.split_once("  ").expect("sha256sum line");
        let data = std::fs::read(root.join(path)).expect("read tracked file");
        let got = f.check(path, &data, 65536, Some(want));
        listing.update(format!("{got}  {path}\n").as_bytes());
        if path.ends_with(".gguf") {
            gguf_n += 1;
            gguf_bytes += data.len() as u64;
            gguf_rows.push(format!(
                "GGUF|path={path}|bytes={}|sha256={got}|json=0",
                data.len()
            ));
        }
    }
    writeln!(
        out,
        "FILES|inputs={}|bytes={}|gguf={gguf_n}|gguf_bytes={gguf_bytes}|mismatch={}|listing_sha256={}|json=0",
        f.inputs,
        f.bytes,
        f.total_mismatch(),
        shadowcat::hex(&listing.finish())
    )
    .unwrap();
    for row in gguf_rows {
        writeln!(out, "{row}").unwrap();
    }
    for (i, name) in NAMES.iter().enumerate() {
        let m = t.mismatch[i] + b.mismatch[i] + f.mismatch[i];
        writeln!(
            out,
            "IMPL|path={name}|inputs={}|mismatch={m}|json=0",
            t.inputs + b.inputs + f.inputs
        )
        .unwrap();
    }
    let all = t.total_mismatch() + b.total_mismatch() + f.total_mismatch();
    writeln!(out, "PARITY|reference=shadowcat/src/sha256.rs|witness=coreutils_sha256sum|mismatch={all}|verdict={}|json=0", if all == 0 { "EQUAL" } else { "DIFFERS" }).unwrap();
    std::fs::write(&args[4], &out).expect("write receipt");
    print!("{}", String::from_utf8(out).unwrap());
    std::process::exit(if all == 0 { 0 } else { 1 });
}
