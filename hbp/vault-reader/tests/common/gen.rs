//! Fixture generator shared by `examples/gen_fixtures.rs` and `tests/fixtures.rs`.
//!
//! `codec/`: row forms that no public `.hbi` carries, written with the owner's own code only:
//! the BigPickle trinity (`hbp::hbp::write_hbp`, port of `hbp-emitter.mjs:28-111`), hash-chained
//! receipts (`ReceiptChain::append`) and `IDX` byte-offset pointers (`IdxPointer::encode`,
//! `agt`) from the vendored `asolaria-hbi-hbp`. Row text is the upstream README example row.
//!
//! Also in `codec/`: the hex-row `.hbi` of FOLLOW `pais_path3_bridge.rs:674-677` (`hbi_for`),
//! the movable-flashlight pair of asolaria-omega-omnibit-tournament
//! `tools/movable-flashlight/hbp.py:91-135` (`write_hbp_hbi`), and the stone-to-moss index
//! layout of `experiments/seat3/verify_room03_fourstate.py:118-121` (`HBP|bytes=|sha256=`,
//! `JSON|bytes=|sha256=` with no path key).
//!
//! `tamper/`: copies of public fixtures with one stated change each, so the reader's -1 and 0
//! paths are exercised on real files: a flipped byte, a zero-filled range, a truncated `.hbp`,
//! an all-zero `.hbp`, an absent `.hbp`; on the hex rows and `HBIROW` rows, a flipped byte, a
//! zero-filled row and a truncated `.hbp`.

use asolaria_hbi_hbp::{agt, encode_row, sha256_hex, IdxPointer, ReceiptChain};
use std::fs;
use std::path::Path;

/// `hex` of `pais_path3_bridge.rs:97-102`, copied.
fn hex(bytes: &[u8]) -> String {
    const H: &[u8; 16] = b"0123456789abcdef";
    let mut s = String::with_capacity(bytes.len() * 2);
    for &b in bytes {
        s.push(H[(b >> 4) as usize] as char);
        s.push(H[(b & 15) as usize] as char);
    }
    s
}

/// `hbi_for` of `pais_path3_bridge.rs:674-677`, copied (`sha_hex` :104 is the vendored
/// `sha256_hex`).
fn hbi_for(hbp: &str) -> String {
    let mut out = String::new();
    for (i, line) in hbp.lines().enumerate() {
        out.push_str(&format!(
            "HBI|row={}|sha256={}|hex={}|json=0\n",
            i + 1,
            sha256_hex(line.as_bytes()),
            hex(line.as_bytes())
        ));
    }
    out
}

/// `tuple_value` of `hbp.py:29-42` for text values.
fn tuple_value(v: &str) -> String {
    v.replace('%', "%25")
        .replace('|', "%7C")
        .replace('\r', "%0D")
        .replace('\n', "%0A")
}

/// `hbp_row` of `hbp.py:45-50`.
fn hbp_row(kind: &str, fields: &[(&str, String)]) -> String {
    let mut s = kind.to_string();
    for (k, v) in fields {
        s.push('|');
        s.push_str(k);
        s.push('=');
        s.push_str(&tuple_value(v));
    }
    s.push_str("|json=0");
    s
}

/// `write_hbp_hbi` of `hbp.py:91-135` (sidecars as `write_sha_sidecar` :76-79); returns the
/// `.hbi` rows.
fn write_hbp_hbi(base: &Path, rows: &[String], schema: &str) -> Vec<String> {
    let normalized: Vec<String> = rows
        .iter()
        .map(|r| format!("{}\n", r.trim_end_matches(['\r', '\n'])))
        .collect();
    let payload = normalized.concat();
    let name = format!("{}.hbp", base.file_name().expect("name").to_string_lossy());
    let mut index = vec![hbp_row(
        "HBIHDR",
        &[
            ("schema", schema.to_string()),
            ("source_file", name.clone()),
            ("source_bytes", payload.len().to_string()),
            ("source_sha256", sha256_hex(payload.as_bytes())),
            ("row_count", normalized.len().to_string()),
            ("offsets", "UTF8_BYTES".to_string()),
            ("line_endings", "LF".to_string()),
        ],
    )];
    let mut offset = 0usize;
    for (number, line) in normalized.iter().enumerate() {
        index.push(hbp_row(
            "HBIROW",
            &[
                ("row", (number + 1).to_string()),
                ("offset", offset.to_string()),
                ("len", line.len().to_string()),
                ("sha256", sha256_hex(line.as_bytes())),
            ],
        ));
        offset += line.len();
    }
    let complete = if offset == payload.len() { "1" } else { "0" };
    index.push(hbp_row(
        "HBIFTR",
        &[
            ("source_file", name),
            ("indexed_bytes", offset.to_string()),
            ("source_bytes", payload.len().to_string()),
            ("complete", complete.to_string()),
        ],
    ));
    put_with_sidecar(&base.with_extension("hbp"), payload.as_bytes());
    put_with_sidecar(&base.with_extension("hbi"), rows_text(&index).as_bytes());
    index
}

fn put(path: &Path, bytes: &[u8]) {
    fs::create_dir_all(path.parent().expect("parent")).expect("mkdir");
    fs::write(path, bytes).expect("write");
}

/// `<sha>  <name>\n`, the sidecar form of `hbp-emitter.mjs:83` and `verify_public_repo.py:528`.
fn put_with_sidecar(path: &Path, bytes: &[u8]) {
    put(path, bytes);
    let name = path
        .file_name()
        .expect("name")
        .to_string_lossy()
        .into_owned();
    let side = path.with_file_name(format!("{name}.sha256"));
    put(&side, format!("{}  {name}\n", sha256_hex(bytes)).as_bytes());
}

fn rows_text(rows: &[String]) -> String {
    rows.iter().fold(String::new(), |mut s, r| {
        s.push_str(r);
        s.push('\n');
        s
    })
}

fn sample_rows() -> Vec<String> {
    vec![
        // asolaria-hbi-hbp README.md "Use it" example row.
        encode_row(
            "VOICE",
            &[("wake", "hermes"), ("transcript", "open my run logs")],
        ),
        encode_row("VOICE", &[("wake", "hermes"), ("transcript", "close")]),
        encode_row("VOICE", &[("wake", "hermes"), ("transcript", "a|b\\c")]),
    ]
}

fn codec(out: &Path) {
    // BigPickle trinity: X.hbp, X.sha256, X.hex, X.hbi (!HBI-v0).
    let mut env = hbp::hbp::Envelope::new();
    env.payload = Some(hbp::hbp::Value::Str(sample_rows()[0].clone()));
    let dest = out.join("codec/trinity/VOICE");
    fs::create_dir_all(dest.parent().expect("parent")).expect("mkdir");
    hbp::hbp::write_hbp(dest.to_str().expect("utf8 path"), &env).expect("write_hbp");
    let flip = out.join("codec/trinity-hex-flip/VOICE");
    fs::create_dir_all(flip.parent().expect("parent")).expect("mkdir");
    hbp::hbp::write_hbp(flip.to_str().expect("utf8 path"), &env).expect("write_hbp");
    let hex_path = out.join("codec/trinity-hex-flip/VOICE.hex");
    let mut hex = fs::read(&hex_path).expect("hex");
    hex[0] = if hex[0] == b'0' { b'1' } else { b'0' };
    fs::write(&hex_path, hex).expect("write hex");

    // Receipt chain over the sample rows; the .hbp holds the unsealed rows.
    let rows = sample_rows();
    let mut chain = ReceiptChain::new();
    let receipts: Vec<String> = rows.iter().map(|r| chain.append(r)).collect();
    put_with_sidecar(
        &out.join("codec/receipts/RECEIPTS.hbp"),
        rows_text(&rows).as_bytes(),
    );
    put_with_sidecar(
        &out.join("codec/receipts/RECEIPTS.hbi"),
        rows_text(&receipts).as_bytes(),
    );
    let mut edited = receipts.clone();
    edited[1] = edited[1].replacen("transcript=close", "transcript=closed", 1);
    put_with_sidecar(
        &out.join("codec/receipts-edited/RECEIPTS.hbp"),
        rows_text(&rows).as_bytes(),
    );
    put_with_sidecar(
        &out.join("codec/receipts-edited/RECEIPTS.hbi"),
        rows_text(&edited).as_bytes(),
    );

    // IDX byte-offset pointers into the .hbp blob, addressed AGT-<sha16>.
    let blob = rows_text(&rows);
    let mut idx = Vec::new();
    let mut off = 0u64;
    for r in &rows {
        let len = r.len() as u64;
        idx.push(
            IdxPointer {
                pid: agt(r.as_bytes()),
                off,
                len,
            }
            .encode(),
        );
        off += len + 1;
    }
    put_with_sidecar(&out.join("codec/idx/BLOB.hbp"), blob.as_bytes());
    put_with_sidecar(&out.join("codec/idx/BLOB.hbi"), rows_text(&idx).as_bytes());
    let mut wrong = idx.clone();
    wrong[1] = IdxPointer {
        pid: agt(rows[0].as_bytes()),
        off: rows[0].len() as u64 + 1,
        len: rows[1].len() as u64,
    }
    .encode();
    put_with_sidecar(&out.join("codec/idx-wrong-pid/BLOB.hbp"), blob.as_bytes());
    put_with_sidecar(
        &out.join("codec/idx-wrong-pid/BLOB.hbi"),
        rows_text(&wrong).as_bytes(),
    );

    // hex rows: X.hbp and its hbi_for X.hbi.
    put_with_sidecar(&out.join("codec/hexrows/PAIS.hbp"), blob.as_bytes());
    put_with_sidecar(
        &out.join("codec/hexrows/PAIS.hbi"),
        hbi_for(&blob).as_bytes(),
    );

    // movable-flashlight pair; then the same with its last HBIROW row left out.
    let schema = "HBP-VAULT-READER-FIXTURE-V1";
    let index = write_hbp_hbi(&out.join("codec/flashlight/FLASH"), &rows, schema);
    write_hbp_hbi(&out.join("codec/flashlight-gap/FLASH"), &rows, schema);
    let mut gap = index.clone();
    gap.remove(gap.len() - 2);
    put_with_sidecar(
        &out.join("codec/flashlight-gap/FLASH.hbi"),
        rows_text(&gap).as_bytes(),
    );

    // X.hbi rows naming X.hbp and X.json by tag only; X.json is not written (no JSON files in
    // this crate), so its row reads as absent.
    put_with_sidecar(&out.join("codec/pairrows/ROOM.hbp"), blob.as_bytes());
    let room = [
        format!("HBI|schema={schema}|json=0"),
        format!(
            "HBP|bytes={}|sha256={}|json=0",
            blob.len(),
            sha256_hex(blob.as_bytes())
        ),
        format!("JSON|bytes=0|sha256={}|json=0", sha256_hex(b"")),
        "END|json=0".to_string(),
    ];
    put_with_sidecar(
        &out.join("codec/pairrows/ROOM.hbi"),
        rows_text(&room).as_bytes(),
    );
}

fn copy_case(public: &Path, out: &Path, case: &str, stem: &str, exts: &[&str]) {
    for e in exts {
        let rel = format!("{stem}{e}");
        let bytes = fs::read(public.join(&rel)).expect("public fixture");
        put(&out.join("tamper").join(case).join(&rel), &bytes);
    }
}

fn tamper(public_sim: &Path, out: &Path) {
    let all = [".hbi", ".hbi.sha256", ".hbp", ".hbp.sha256"];
    let rime = "receipts/LIRIS-RIME-LIGHT-MATRIX-VIEWER-2026-07-28";
    let laws = "receipts/LIRIS-LAWS-45-53-SUCCESSOR-BILATERAL-2026-07-28";
    let merged = "matrices/FABLE5-TRILATERAL-MERGED-TO-MAIN-2026-07-10";
    let cern = "matrices/FABLE5-ABSORB-CERN-OPENDATA-2026-07-26";
    let path3 = "matrices/FABLE5-PATH3-LEVEL2-2026-07-16";

    // one byte at offset 500 (inside RANGE section=features, offset 448 length 840) xor 0x01
    copy_case(public_sim, out, "flip-byte", rime, &all);
    let p = out.join("tamper/flip-byte").join(format!("{rime}.hbp"));
    let mut b = fs::read(&p).expect("read");
    b[500] ^= 0x01;
    fs::write(&p, b).expect("write");

    // bytes [351, 444) set to zero (the INDEX n=2 row, tag MAP)
    copy_case(public_sim, out, "zero-range", laws, &all);
    let p = out.join("tamper/zero-range").join(format!("{laws}.hbp"));
    let mut b = fs::read(&p).expect("read");
    for x in &mut b[351..444] {
        *x = 0;
    }
    fs::write(&p, b).expect("write");

    // .hbp truncated to its first 1500 bytes
    copy_case(public_sim, out, "truncated", merged, &all);
    let p = out.join("tamper/truncated").join(format!("{merged}.hbp"));
    let b = fs::read(&p).expect("read");
    fs::write(&p, &b[..1500]).expect("write");

    // .hbp replaced by the same number of zero bytes
    copy_case(public_sim, out, "zero-file", cern, &all);
    let p = out.join("tamper/zero-file").join(format!("{cern}.hbp"));
    let n = fs::read(&p).expect("read").len();
    fs::write(&p, vec![0u8; n]).expect("write");

    // .hbp absent
    copy_case(public_sim, out, "absent", path3, &[".hbi", ".hbi.sha256"]);
}

/// Start and end (without `\n`) of 1-based row `n`.
fn row_span(b: &[u8], n: usize) -> (usize, usize) {
    let mut start = 0;
    for _ in 1..n {
        start += b[start..].iter().position(|&x| x == b'\n').expect("row") + 1;
    }
    let end = start
        + b[start..]
            .iter()
            .position(|&x| x == b'\n')
            .expect("row end");
    (start, end)
}

fn tamper_rows(public_colour: &Path, public_omnibit: &Path, out: &Path) {
    let all = [".hbi", ".hbi.sha256", ".hbp", ".hbp.sha256"];
    let colour = "receipts/matrix-min-01";
    let path123 = "provenance/receipts/path123/OMEGA-PATH123-COMPONENT";

    // hex rows: one byte of .hbp row 2 (10 bytes in) xor 0x01
    copy_case(public_colour, out, "hex-flip", colour, &all);
    let p = out.join("tamper/hex-flip").join(format!("{colour}.hbp"));
    let mut b = fs::read(&p).expect("read");
    let (s, _) = row_span(&b, 2);
    b[s + 10] ^= 0x01;
    fs::write(&p, b).expect("write");

    // hex rows: the bytes of .hbp row 3 set to zero (its \n kept)
    copy_case(public_colour, out, "hex-zero", colour, &all);
    let p = out.join("tamper/hex-zero").join(format!("{colour}.hbp"));
    let mut b = fs::read(&p).expect("read");
    let (s, e) = row_span(&b, 3);
    for x in &mut b[s..e] {
        *x = 0;
    }
    fs::write(&p, b).expect("write");

    // HBIROW rows: one byte at offset 300 (inside row 2, bytes 239..460) xor 0x01
    copy_case(
        public_omnibit,
        out,
        "rowidx-flip",
        path123,
        &[".hbi", ".hbp"],
    );
    let p = out
        .join("tamper/rowidx-flip")
        .join(format!("{path123}.hbp"));
    let mut b = fs::read(&p).expect("read");
    b[300] ^= 0x01;
    fs::write(&p, b).expect("write");

    // HBIROW rows: .hbp truncated to its first 1000 bytes
    copy_case(
        public_omnibit,
        out,
        "rowidx-truncated",
        path123,
        &[".hbi", ".hbp"],
    );
    let p = out
        .join("tamper/rowidx-truncated")
        .join(format!("{path123}.hbp"));
    let b = fs::read(&p).expect("read");
    fs::write(&p, &b[..1000]).expect("write");
}

/// One file (`CASEFILE`) or symbolic link (`CASELINK`) of a case tree; paths relative to the
/// case directory, whose `root/` is the root read.
enum Entry {
    File(&'static str, Vec<u8>, Vec<u8>),
    Link(&'static str, Vec<u8>, Vec<u8>),
}

fn file(case: &'static str, path: &[u8], data: &[u8]) -> Entry {
    let mut p = b"root/".to_vec();
    p.extend_from_slice(path);
    Entry::File(case, p, data.to_vec())
}

/// `tests/cases/CASES.hbp`: edge cases of this reader's own rules (Claude's; no owner data),
/// written as rows because names that are not UTF-8 and symbolic links do not survive every
/// checkout. Both readers build the trees from these rows at test time.
pub fn cases_spec() -> String {
    let hbp: &[u8] = b"ROW|a=1|json=0\nROW|b=2|json=0\n";
    let h = sha256_hex(hbp);
    let n = hbp.len();
    let max = u64::MAX;
    let bigpickle_hbi = format!("!HBI-v0\nB|sha256={h}|bytes={n}|json=0\n");
    let hex_rows = |d: &[u8]| hbi_for(std::str::from_utf8(d).expect("utf8"));
    let mut e: Vec<Entry> = Vec::new();

    // trinity: verify_hbp rules (hbp/src/reader.rs) on sidecar text
    let c = "trinity-second-sha";
    e.push(file(c, b"X.hbp", hbp));
    e.push(file(c, b"X.sha256", format!("{h}  X.hbp\n").as_bytes()));
    let second = format!("!HBI-v0\nA|sha256=|json=0\nB|sha256={h}|bytes={n}|json=0\n");
    e.push(file(c, b"X.hbi", second.as_bytes()));
    let c = "trinity-hex-odd";
    e.push(file(c, b"X.hbp", hbp));
    e.push(file(c, b"X.hex", format!("{}0\n", hex(hbp)).as_bytes()));
    e.push(file(c, b"X.hbi", bigpickle_hbi.as_bytes()));
    let c = "trinity-hex-tail";
    e.push(file(c, b"X.hbp", hbp));
    e.push(file(c, b"X.hex", format!("{}zz\n", hex(hbp)).as_bytes()));
    e.push(file(c, b"X.hbi", bigpickle_hbi.as_bytes()));
    let c = "trinity-sha-bom";
    e.push(file(c, b"X.hbp", hbp));
    let mut bom = b"\xef\xbb\xbf".to_vec();
    bom.extend_from_slice(format!("{h}  X.hbp\n").as_bytes());
    e.push(file(c, b"X.sha256", &bom));
    e.push(file(c, b"X.hbi", bigpickle_hbi.as_bytes()));
    let c = "trinity-sha-nonutf8";
    e.push(file(c, b"X.hbp", hbp));
    let mut ff = format!("{h}  X.hbp").into_bytes();
    ff.extend_from_slice(b"\xff\n");
    e.push(file(c, b"X.sha256", &ff));
    e.push(file(c, b"X.hbi", bigpickle_hbi.as_bytes()));
    // trinity: a sums list for both files and an `.hbi` of another format
    let c = "trinity-sums-list";
    let other = b"HBI_INDEX|packet=X.hbp|json=0\nIDX|key=a|val=1\n";
    e.push(file(c, b"X.hbp", hbp));
    e.push(file(c, b"X.hbi", other));
    let sums = format!("{h} *X.hbp\n{} *X.hbi\n", sha256_hex(other));
    e.push(file(c, b"X.sha256", sums.as_bytes()));
    // trinity: only walked files are read
    let c = "trinity-hbp-link";
    e.push(Entry::File(
        c,
        b"outside.bin".to_vec(),
        b"OUTSIDE-ROOT-BYTES\n".to_vec(),
    ));
    e.push(Entry::Link(
        c,
        b"root/X.hbp".to_vec(),
        b"../outside.bin".to_vec(),
    ));
    e.push(file(c, b"X.hbi", b"!HBI-v0\nB|bytes=19|json=0\n"));
    let c = "trinity-sidecar-link";
    e.push(Entry::File(
        c,
        b"outside.sha256".to_vec(),
        format!("{h}  X.hbp\n").into_bytes(),
    ));
    e.push(file(c, b"X.hbp", hbp));
    e.push(Entry::Link(
        c,
        b"root/X.sha256".to_vec(),
        b"../outside.sha256".to_vec(),
    ));
    e.push(file(c, b"X.hbi", bigpickle_hbi.as_bytes()));

    // names that are not UTF-8, and a UTF-8 name that spells the same escape
    let c = "nonutf8-names";
    let a1: &[u8] = b"ROW|a=1|json=0\n";
    let b2: &[u8] = b"ROW|b=2|json=0\n";
    let c3: &[u8] = b"ROW|c=3|json=0\n";
    e.push(file(c, b"r\xe9sum\xe9.hbp", a1));
    e.push(file(c, b"r\xe9sum\xe9.hbi", hex_rows(a1).as_bytes()));
    let lossy = format!("{}  r\u{fffd}sum\u{fffd}.hbp\n", sha256_hex(a1));
    e.push(file(c, b"r\xe9sum\xe9.hbp.sha256", lossy.as_bytes()));
    e.push(file(c, b"r\xe8sum\xe8.hbp", b2));
    e.push(file(c, b"r\xe8sum\xe8.hbi", hex_rows(b2).as_bytes()));
    e.push(file(c, b"r\\xe9sum\\xe9.hbp", c3));
    e.push(file(c, b"r\\xe9sum\\xe9.hbi", hex_rows(c3).as_bytes()));

    // zero bytes: wholly and partly zero-filled targets
    let tgt: Vec<u8> = b"ABCDEFGH".repeat(64);
    let art = format!(
        "ART|file=T.bin|bytes={}|sha256={}|json=0\n",
        tgt.len(),
        sha256_hex(&tgt)
    );
    let mut part = tgt[..256].to_vec();
    part.extend_from_slice(&[0u8; 256]);
    e.push(file("partly-zero", b"T.bin", &part));
    e.push(file("partly-zero", b"X.hbi", art.as_bytes()));
    e.push(file("wholly-zero", b"T.bin", &[0u8; 512]));
    e.push(file("wholly-zero", b"X.hbi", art.as_bytes()));

    // span sums past u64::MAX
    let root_row = format!("ROOT|path=X.hbp|bytes={n}|json=0\n");
    let zeros = "0".repeat(64);
    let c = "range-u64-edge";
    e.push(file(c, b"X.hbp", hbp));
    let rows = format!("{root_row}RANGE|offset={max}|length=2|sha256={zeros}|json=0\n");
    e.push(file(c, b"X.hbi", rows.as_bytes()));
    let c = "fable5row-u64-edge";
    e.push(file(c, b"X.hbp", hbp));
    let rows = format!("{root_row}FABLE5HBIROW|offset=5|len={max}|row_sha256={zeros}|json=0\n");
    e.push(file(c, b"X.hbi", rows.as_bytes()));
    let c = "idxftr-u64-edge";
    e.push(file(c, b"X.hbp", hbp));
    let rows = format!(
        "{root_row}RANGE|offset=0|length={max}|json=0\nRANGE|offset={max}|length=2|json=0\n\
         ZINDEXFTR|range_count=2|coverage_exact=0|json=0\n"
    );
    e.push(file(c, b"X.hbi", rows.as_bytes()));
    let c = "coverage-wrap";
    e.push(file(c, b"T.bin", b"A"));
    let rows = format!(
        "ROOT|path=T.bin|bytes=1|json=0\nRANGE|offset=0|length={max}|json=0\n\
         RANGE|offset={max}|length=2|json=0\nZINDEXFTR|range_count=2|coverage_exact=1|json=0\n"
    );
    e.push(file(c, b"X.hbi", rows.as_bytes()));

    // the paired file is found by its own name, whatever the directory is called
    for (c, dir) in [
        ("pair-colon-dir", "a:b"),
        ("pair-tilde-dir", "~old"),
        ("pair-plain-dir", "ab"),
    ] {
        e.push(file(c, format!("{dir}/X.hbp").as_bytes(), hbp));
        e.push(file(
            c,
            format!("{dir}/X.hbi").as_bytes(),
            hex_rows(hbp).as_bytes(),
        ));
    }

    // a range that runs past the end of its target and declares only `tag=`
    let c = "range-short-tag-only";
    e.push(file(c, b"X.hbp", hbp));
    let rows = format!("{root_row}RANGE|offset=0|length=4000|tag=ROW|json=0\n");
    e.push(file(c, b"X.hbi", rows.as_bytes()));

    // sidecars separated by Python `str.split()` whitespace outside ASCII space/tab/newline
    for (c, sep) in [("sidecar-x1c", "\u{1c}"), ("sidecar-nbsp", "\u{a0}")] {
        e.push(file(c, b"X.hbp", hbp));
        e.push(file(
            c,
            b"X.hbp.sha256",
            format!("{h}{sep}X.hbp\n").as_bytes(),
        ));
        e.push(file(c, b"X.hbi", b"Z|k=v|json=0\n"));
    }

    // path resolution: the .hbi directory, then the root, then the directories between
    let c = "resolve-parent";
    let rt: &[u8] = b"ROOT-TARGET\n";
    e.push(file(c, b"T.bin", rt));
    e.push(file(c, b"sub/T.bin", b"OTHER\n"));
    let art = format!(
        "ART|file=T.bin|bytes={}|sha256={}|json=0\n",
        rt.len(),
        sha256_hex(rt)
    );
    e.push(file(c, b"sub/a/X.hbi", art.as_bytes()));
    let c = "resolve-nested";
    e.push(file(c, b"repo/receipts/T.bin", rt));
    let art = format!(
        "ART|file=receipts/T.bin|bytes={}|sha256={}|json=0\n",
        rt.len(),
        sha256_hex(rt)
    );
    e.push(file(c, b"repo/receipts/X.hbi", art.as_bytes()));

    let mut out = String::new();
    for x in &e {
        let row = match x {
            Entry::File(c, p, d) => encode_row(
                "CASEFILE",
                &[("case", c), ("path_hex", &hex(p)), ("data_hex", &hex(d))],
            ),
            Entry::Link(c, p, t) => encode_row(
                "CASELINK",
                &[("case", c), ("path_hex", &hex(p)), ("target_hex", &hex(t))],
            ),
        };
        out.push_str(&row);
        out.push('\n');
    }
    out
}

/// Write `codec/` and `tamper/` under `out`, reading the public fixtures from `fixtures`
/// (`public-simulator`, `public-colour`, `public-omnibit`).
pub fn generate(fixtures: &Path, out: &Path) {
    codec(out);
    tamper(&fixtures.join("public-simulator"), out);
    tamper_rows(
        &fixtures.join("public-colour"),
        &fixtures.join("public-omnibit"),
        out,
    );
}
