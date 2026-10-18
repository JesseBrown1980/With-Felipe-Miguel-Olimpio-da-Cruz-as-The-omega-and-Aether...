//! Rust port of relay-driver.test.mjs:1-131 — the PHASE-1 regression suite (E=0), all 23
//! assertions, plus byte-identity checks against the upstream JS lane output, plus the port's
//! edge cases with the results the upstream JS (node 22.22.0, reductions@29307bf) gives on them.
//!
//! The t5 fixture (relay-driver.test.mjs:67) and the per-rule scan fixtures are assembled at run
//! time from parts, so no key-header or token-shaped literal sits in this source.

use std::collections::BTreeMap;
use std::sync::atomic::{AtomicU64, Ordering};

use hbp::relay::{build_row, clean, parse_row, sha16, sha256hex, Fields, GENESIS};
use hbp_relay::carveout::{assert_read_allowed, scan};
use hbp_relay::driver::{
    emit, lane_head, lane_paths, reverse_walk, verify_lane, EmitArgs, LanePaths,
};
use hbp_relay::indexer::read_blob;

const TS: &str = "2026-06-21T00:00:00Z";

static COUNTER: AtomicU64 = AtomicU64::new(0);

/// One temp directory per test; removed (with everything under it) when the test ends.
struct TempBase(std::path::PathBuf);

impl TempBase {
    fn new(tag: &str) -> TempBase {
        let c = COUNTER.fetch_add(1, Ordering::SeqCst);
        let dir = std::env::temp_dir().join(format!("relay-rs-{tag}-{}-{c}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("mkdir");
        TempBase(dir)
    }
    fn dir(&self, tag: &str) -> String {
        let d = self.0.join(tag);
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).expect("mkdir");
        d.to_string_lossy().replace('\\', "/")
    }
    fn lane(&self, tag: &str) -> LanePaths {
        lane_paths(&self.dir(tag), "acer")
    }
}

impl Drop for TempBase {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

fn seed(p: &LanePaths, n: u64) {
    let verbs = ["NOTE", "STATUS", "ANSWER"];
    for i in 1..=n {
        let payload = format!("row {i} payload");
        let args = EmitArgs::note(
            "acer",
            "liris",
            verbs[((i - 1) % 3) as usize],
            i,
            payload.as_bytes(),
            TS,
        );
        emit(p, &args).expect("seed emit");
    }
}

fn exists(path: &str) -> bool {
    std::path::Path::new(path).exists()
}

fn read_text(path: &str) -> String {
    std::fs::read_to_string(path).unwrap_or_default()
}

fn mk_fields(pairs: &[(&str, &str)]) -> Fields {
    let mut f: Fields = BTreeMap::new();
    for (k, v) in pairs {
        f.insert((*k).to_string(), (*v).to_string());
    }
    f
}

struct Tally {
    pass: u32,
    fail: u32,
}
impl Tally {
    fn ok(&mut self, name: &str, cond: bool) {
        if cond {
            self.pass += 1;
            println!("  PASS  {name}");
        } else {
            self.fail += 1;
            println!("  FAIL  {name}");
        }
    }
}

fn denies(p: &str, root: Option<&str>) -> bool {
    match assert_read_allowed(p, root) {
        Err(e) => e.0.contains("DENY"),
        Ok(_) => false,
    }
}

#[test]
fn phase1_relay_suite_23_assertions() {
    let tmp = TempBase::new("suite");
    let fresh_lane = |tag: &str| tmp.lane(tag);
    let unique_dir = |tag: &str| tmp.dir(tag);
    let mut t = Tally { pass: 0, fail: 0 };
    println!("PHASE-1 RELAY-DRIVER TEST SUITE (E=0) — Rust port\n");

    // t0 — happy path
    {
        let p = fresh_lane("t0-happy");
        seed(&p, 3);
        let v = verify_lane(&p).unwrap();
        let rw = reverse_walk(&p).unwrap();
        t.ok("t0 clean lane VERIFY pass", v.pass);
        t.ok("t0 clean lane reverse-walk pass", rw.pass);
    }

    // t1 — flipped payload byte REJECTED (payload_sha256 mismatch)
    {
        let p = fresh_lane("t1-payload");
        seed(&p, 3);
        let mut buf = std::fs::read(&p.payloads).unwrap();
        buf[0] ^= 0xff;
        std::fs::write(&p.payloads, &buf).unwrap();
        let v = verify_lane(&p).unwrap();
        t.ok(
            "t1 flipped payload byte REJECTED",
            !v.pass && v.failures.iter().any(|x| x.why.contains("PAYLOAD_SHA256")),
        );
    }

    // t2 — tampered verb without recomputing row_hash REJECTED (row_hash mismatch)
    {
        let p = fresh_lane("t2-field");
        seed(&p, 3);
        let mut lines: Vec<String> = read_text(&p.hbp)
            .split('\n')
            .filter(|l| !l.is_empty())
            .map(String::from)
            .collect();
        lines[1] = lines[1].replace("verb=STATUS", "verb=EXEC");
        std::fs::write(&p.hbp, lines.join("\n") + "\n").unwrap();
        let v = verify_lane(&p).unwrap();
        t.ok(
            "t2 tampered verb (READ->EXEC) REJECTED",
            !v.pass && v.failures.iter().any(|x| x.why.contains("ROW_HASH")),
        );
    }

    // t3 — broken antecedent REJECTED
    {
        let p = fresh_lane("t3-antecedent");
        let r1 = build_row(&mk_fields(&[
            ("v", "1"),
            ("from", "acer"),
            ("to", "liris"),
            ("verb", "NOTE"),
            ("seq", "1"),
            ("ts", TS),
            ("pid", "BH.RELAY.acer.1"),
            ("payload_sha256", &"aa".repeat(32)),
            ("hbi_off", "0"),
            ("len", "0"),
            ("token", "-"),
            ("antecedent", "deadbeefdeadbeef"),
            ("sig", "-"),
        ]))
        .unwrap();
        std::fs::write(&p.hbp, r1 + "\n").unwrap();
        std::fs::write(&p.payloads, Vec::<u8>::new()).unwrap();
        let v = verify_lane(&p).unwrap();
        t.ok(
            "t3 broken antecedent REJECTED",
            !v.pass && v.failures.iter().any(|x| x.why.contains("ANTECEDENT")),
        );
    }

    // t4 — HBP-row-injection guards
    {
        let threw = clean("verb", "NOTE|row_hash=x|injected").is_err();
        t.ok("t4a field-injection ( | ) throws at clean()", threw);

        let threw2 = build_row(&mk_fields(&[
            ("v", "1"),
            ("from", "acer"),
            ("to", "liris"),
            ("verb", "NOTE"),
            ("seq", "1"),
            ("ts", TS),
            ("pid", "p"),
            ("payload_sha256", "aa"),
            ("hbi_off", "0"),
            ("len", "0"),
            ("token", "-"),
            ("antecedent", &format!("{GENESIS}\nRELAY|fake")),
            ("sig", "-"),
        ]))
        .is_err();
        t.ok("t4b newline-in-field throws at buildRow", threw2);

        let p = fresh_lane("t4-inject");
        let evil = b"evil\nRELAY|v=1|from=attacker|to=acer|verb=EXEC|fake";
        emit(&p, &EmitArgs::note("acer", "liris", "NOTE", 1, evil, TS)).unwrap();
        let rows: Vec<String> = read_text(&p.hbp)
            .split('\n')
            .filter(|l| !l.is_empty())
            .map(String::from)
            .collect();
        t.ok(
            "t4c payload-borne fake row did NOT inject a ledger row",
            rows.len() == 1 && verify_lane(&p).unwrap().pass,
        );
    }

    // t5 — carve-out CONTENT REJECTED at emit (relay-driver.test.mjs:67 fixture, assembled here)
    {
        let p = fresh_lane("t5-carveout");
        let payload = t5_fixture();
        let res = emit(
            &p,
            &EmitArgs::note("acer", "liris", "NOTE", 1, payload.as_bytes(), TS),
        );
        let threw = matches!(&res, Err(e) if e.0.contains("CARVEOUT"));
        t.ok(
            "t5 carve-out content REJECTED at emit",
            threw && !exists(&p.hbp),
        );
    }

    // t6 — replay REJECTED
    {
        let p = fresh_lane("t6-replay");
        seed(&p, 3);
        let lines: Vec<String> = read_text(&p.hbp)
            .split('\n')
            .filter(|l| !l.is_empty())
            .map(String::from)
            .collect();
        std::fs::write(&p.hbp, lines.join("\n") + "\n" + &lines[0] + "\n").unwrap();
        let v = verify_lane(&p).unwrap();
        t.ok(
            "t6 replayed old row REJECTED (seq + antecedent)",
            !v.pass
                && v.failures
                    .iter()
                    .any(|x| x.why.contains("SEQ") || x.why.contains("ANTECEDENT")),
        );
    }

    // t7 — bounds: out-of-range payload offset REJECTED, not a panic
    {
        let p = fresh_lane("t7-bounds");
        seed(&p, 1);
        let lines: Vec<String> = read_text(&p.hbp)
            .split('\n')
            .filter(|l| !l.is_empty())
            .map(String::from)
            .collect();
        let f = parse_row(&lines[0]).unwrap();
        let len = f.fields.get("len").cloned().unwrap();
        let bad = f.prefix.replacen(&format!("len={len}"), "len=999999999", 1);
        let bad_row = format!("{bad}|row_hash={}", sha16(&bad));
        std::fs::write(&p.hbp, bad_row + "\n").unwrap();
        let v = verify_lane(&p).unwrap();
        t.ok(
            "t7 out-of-bounds payload len REJECTED (no crash)",
            !v.pass && v.failures.iter().any(|x| x.why.contains("BOUNDS")),
        );
    }

    // t8 — non-numeric seq on an otherwise-intact chain REJECTED
    {
        let p = fresh_lane("t8-nanseq");
        let pays: [&[u8]; 3] = [b"r1", b"r2", b"r3"];
        let mut store = Vec::new();
        for s in &pays {
            store.extend_from_slice(s);
        }
        std::fs::write(&p.payloads, &store).unwrap();
        let mut off = 0usize;
        let mut prev = GENESIS.to_string();
        let seqs = ["1", "NaN", "3"];
        let mut rows: Vec<String> = Vec::new();
        for i in 0..3 {
            let r = build_row(&mk_fields(&[
                ("v", "1"),
                ("from", "acer"),
                ("to", "liris"),
                ("verb", "NOTE"),
                ("seq", seqs[i]),
                ("ts", TS),
                ("pid", &format!("BH.RELAY.acer.{}", i + 1)),
                ("payload_sha256", &sha256hex(pays[i])),
                ("hbi_off", &off.to_string()),
                ("len", &pays[i].len().to_string()),
                ("token", "-"),
                ("antecedent", &prev),
                ("sig", "-"),
            ]))
            .unwrap();
            prev = parse_row(&r).unwrap().row_hash;
            off += pays[i].len();
            rows.push(r);
        }
        std::fs::write(&p.hbp, rows.join("\n") + "\n").unwrap();
        let v = verify_lane(&p).unwrap();
        t.ok(
            "t8 NaN seq on intact chain REJECTED (canonical-integer gate)",
            !v.pass
                && v.failures
                    .iter()
                    .any(|x| x.why.contains("SEQ not a canonical")),
        );
    }

    // t9 — assertReadAllowed denies carve-out paths and NTFS aliases; allows a plain file under root
    {
        t.ok(
            "t9a .ssh DENY",
            denies("C:/Users/acer/.ssh/id_ed25519", None),
        );
        t.ok("t9b vault DENY", denies("C:/x/vault/secret.txt", None));
        t.ok(
            "t9c NTFS ADS (::$INDEX_ALLOCATION) DENY",
            denies("C:/x/vault::$INDEX_ALLOCATION/secret", None),
        );
        t.ok(
            "t9d trailing-dot (vault.) DENY",
            denies("C:/x/vault./secret", None),
        );
        t.ok(
            "t9e trailing-space (vault ) DENY",
            denies("C:/x/vault /secret", None),
        );
        t.ok(
            "t9f 8.3 short-name (SOVERE~1) DENY",
            denies("C:/x/SOVERE~1/secret", None),
        );
        t.ok("t9g keys. DENY", denies("C:/x/keys./k", None));
        let root = unique_dir("t9-root");
        std::fs::write(format!("{root}/payload.txt"), "ok payload").unwrap();
        let allowed = assert_read_allowed(&format!("{root}/payload.txt"), Some(&root)).is_ok();
        t.ok("t9h plain file under allow-root ALLOWED", allowed);
        t.ok(
            "t9i path outside allow-root DENY",
            denies("C:/some/other/place/file.txt", Some(&root)),
        );
    }

    // t10 — emit(payloadFile) runs the structural guard
    {
        let p = fresh_lane("t10-fileguard");
        let res = emit(
            &p,
            &EmitArgs {
                from: "acer",
                to: "liris",
                verb: "NOTE",
                n: 1,
                payload: None,
                payload_file: Some("C:/Users/acer/.ssh/id_ed25519"),
                ts: TS,
                token: "-",
                allow_root: None,
            },
        );
        let threw = matches!(&res, Err(e) if e.0.contains("DENY"));
        t.ok(
            "t10a emit(payloadFile in carve-out) REJECTED before read",
            threw && !exists(&p.hbp),
        );

        let root = unique_dir("t10-root");
        std::fs::write(
            format!("{root}/note.txt"),
            "a legitimate file-sourced payload",
        )
        .unwrap();
        let note_path = format!("{root}/note.txt");
        let ok_emit = emit(
            &p,
            &EmitArgs {
                from: "acer",
                to: "liris",
                verb: "NOTE",
                n: 1,
                payload: None,
                payload_file: Some(&note_path),
                ts: TS,
                token: "-",
                allow_root: Some(&root),
            },
        )
        .map(|_| verify_lane(&p).unwrap().pass)
        .unwrap_or(false);
        t.ok(
            "t10b emit(legit payloadFile under allow-root) succeeds + verifies",
            ok_emit,
        );
    }

    println!("\n{} PASS / {} FAIL", t.pass, t.fail);
    assert_eq!(t.fail, 0, "some assertions failed");
    assert_eq!(t.pass, 23, "expected exactly 23 assertions");
}

const SEED3_HBP_GOLD: &str = "RELAY|v=1|from=acer|to=liris|verb=NOTE|seq=1|ts=2026-06-21T00:00:00Z|pid=BH.RELAY.acer.1|payload_sha256=5e7bc15bf057e43ec7008bd0f42607e27792f0e90430346859c55973dd57dee7|hbi_off=0|len=13|token=-|antecedent=0000000000000000|sig=-|row_hash=7e3120b7b1099d43
RELAY|v=1|from=acer|to=liris|verb=STATUS|seq=2|ts=2026-06-21T00:00:00Z|pid=BH.RELAY.acer.2|payload_sha256=7fc97f3174badf470f90e24fde0cfcf1e338ccb15cd2ca6b3263c628d85014ce|hbi_off=13|len=13|token=-|antecedent=7e3120b7b1099d43|sig=-|row_hash=850ef5dfbd121ca2
RELAY|v=1|from=acer|to=liris|verb=ANSWER|seq=3|ts=2026-06-21T00:00:00Z|pid=BH.RELAY.acer.3|payload_sha256=086fcb55fa03903372cadbab69714e885274d5cb95b95ededf4440df63474dd5|hbi_off=26|len=13|token=-|antecedent=850ef5dfbd121ca2|sig=-|row_hash=9086b15982e7499e\n";

const SEED3_HBI_GOLD: &str = "IDX|row_hash=7e3120b7b1099d43|row_off=0|row_len=254|pid=BH.RELAY.acer.1|verb=NOTE|cls=READ|from=acer|to=liris|ts=2026-06-21T00:00:00Z|seq=1|payload_off=0|payload_len=13
IDX|row_hash=850ef5dfbd121ca2|row_off=254|row_len=257|pid=BH.RELAY.acer.2|verb=STATUS|cls=READ|from=acer|to=liris|ts=2026-06-21T00:00:00Z|seq=2|payload_off=13|payload_len=13
IDX|row_hash=9086b15982e7499e|row_off=511|row_len=257|pid=BH.RELAY.acer.3|verb=ANSWER|cls=READ|from=acer|to=liris|ts=2026-06-21T00:00:00Z|seq=3|payload_off=26|payload_len=13\n";

const ONE_HBP_GOLD: &str = "RELAY|v=1|from=acer|to=liris|verb=NOTE|seq=1|ts=2026-06-21T00:00:00Z|pid=BH.RELAY.acer.1|payload_sha256=fbed828eae16b6a506217d698f5c935467298add9b3611c91015a8db51a6afb1|hbi_off=0|len=33|token=-|antecedent=0000000000000000|sig=-|row_hash=969c37ba34d8ba1e\n";

#[test]
fn byte_identical_to_upstream_js() {
    // Three NOTE/STATUS/ANSWER rows with the test seed payloads (relay-driver.test.mjs `seed`,
    // "row N payload"): lane bytes must match the JS lane exactly.
    let tmp = TempBase::new("gold");
    let fresh_lane = |tag: &str| tmp.lane(tag);
    let unique_dir = |tag: &str| tmp.dir(tag);
    let p = fresh_lane("gold3");
    seed(&p, 3);
    assert_eq!(
        read_text(&p.hbp),
        SEED3_HBP_GOLD,
        "hbp ledger bytes differ from upstream JS"
    );
    assert_eq!(
        read_text(&p.hbi),
        SEED3_HBI_GOLD,
        "hbi sidecar bytes differ from upstream JS"
    );

    // A single file-sourced legit payload (the t10b note) must match the JS emit byte for byte.
    let root = unique_dir("gold1-root");
    std::fs::write(
        format!("{root}/note.txt"),
        "a legitimate file-sourced payload",
    )
    .unwrap();
    let note_path = format!("{root}/note.txt");
    let q = fresh_lane("gold1");
    emit(
        &q,
        &EmitArgs {
            from: "acer",
            to: "liris",
            verb: "NOTE",
            n: 1,
            payload: None,
            payload_file: Some(&note_path),
            ts: TS,
            token: "-",
            allow_root: Some(&root),
        },
    )
    .unwrap();
    assert_eq!(
        read_text(&q.hbp),
        ONE_HBP_GOLD,
        "file-sourced row bytes differ from upstream JS"
    );
}

/// relay-driver.test.mjs:67 t5 payload: a key-header line and "AAAA....".
fn t5_fixture() -> String {
    format!("-----BEGIN {} KEY-----\nAAAA....", "OPENSSH PRIVATE")
}

fn write_lane(p: &LanePaths, hbp: &[u8], hbi: &[u8], payloads: &[u8]) {
    std::fs::write(&p.hbp, hbp).unwrap();
    std::fs::write(&p.hbi, hbi).unwrap();
    std::fs::write(&p.payloads, payloads).unwrap();
}

const SEED3_PAYLOADS: &[u8] = b"row 1 payloadrow 2 payloadrow 3 payload";

fn why(v: &hbp_relay::driver::VerifyResult) -> Vec<(usize, String)> {
    v.failures.iter().map(|f| (f.row, f.why.clone())).collect()
}

fn walk_why(w: &hbp_relay::driver::WalkResult) -> Vec<(usize, String)> {
    w.issues.iter().map(|f| (f.i, f.why.clone())).collect()
}

#[test]
fn lane_files_decode_like_buffer_to_string_utf8() {
    let tmp = TempBase::new("utf8");
    // Byte 288 (the S of verb=STATUS in row 2) set to 0xFF, row_hash left as written.
    let p = tmp.lane("ff");
    let mut hbp = SEED3_HBP_GOLD.as_bytes().to_vec();
    hbp[288] = 0xFF;
    write_lane(&p, &hbp, SEED3_HBI_GOLD.as_bytes(), SEED3_PAYLOADS);
    let v = verify_lane(&p).unwrap();
    assert_eq!((v.pass, v.checked), (false, 3));
    assert_eq!(why(&v), vec![(1, "ROW_HASH mismatch".to_string())]);
    let w = reverse_walk(&p).unwrap();
    assert_eq!((w.pass, w.walked), (false, 3));
    assert_eq!(walk_why(&w), vec![(1, "row_hash".to_string())]);

    // A ledger ending in a lone 0xC3 byte: the last line decodes to U+FFFD.
    let p = tmp.lane("c3");
    let mut hbp = SEED3_HBP_GOLD.as_bytes().to_vec();
    hbp.push(0xC3);
    write_lane(&p, &hbp, SEED3_HBI_GOLD.as_bytes(), SEED3_PAYLOADS);
    let v = verify_lane(&p).unwrap();
    assert_eq!((v.pass, v.checked), (false, 4));
    assert_eq!(
        why(&v),
        vec![(3, "PARSE: PARSE_REJECT: not a RELAY row".to_string())]
    );
    let w = reverse_walk(&p).unwrap();
    assert_eq!((w.pass, w.walked), (false, 3));

    // A directory at the ledger path: the JS throws from readFileSync; the port returns it.
    let p = tmp.lane("dir");
    std::fs::create_dir(&p.hbp).unwrap();
    let want = "EISDIR: illegal operation on a directory, read".to_string();
    assert_eq!(verify_lane(&p).err().map(|e| e.0), Some(want.clone()));
    assert_eq!(reverse_walk(&p).err().map(|e| e.0), Some(want));

    // An absent ledger is an empty lane.
    let p = lane_paths(&tmp.dir("absent"), "acer");
    let v = verify_lane(&p).unwrap();
    assert_eq!((v.pass, v.checked), (true, 0));

    // 0xFF inside `to=liris` of the last sidecar line: the head is still row 3.
    let p = tmp.lane("hbi-ff");
    let hbi = SEED3_HBI_GOLD.replacen(
        "to=liris|ts=2026-06-21T00:00:00Z|seq=3",
        "to=li\u{1}ris|ts=2026-06-21T00:00:00Z|seq=3",
        1,
    );
    let hbi: Vec<u8> = hbi.bytes().map(|b| if b == 1 { 0xFF } else { b }).collect();
    write_lane(&p, SEED3_HBP_GOLD.as_bytes(), &hbi, SEED3_PAYLOADS);
    let h = lane_head(&p.hbi).unwrap();
    assert_eq!(
        (h.row_hash.as_deref(), h.seq),
        (Some("9086b15982e7499e"), 3)
    );
    let row = emit(&p, &EmitArgs::note("acer", "liris", "NOTE", 1, b"x", TS)).unwrap();
    assert!(row.contains("|seq=4|") && row.contains("|antecedent=9086b15982e7499e|"));
}

#[test]
fn lane_head_reads_sidecar_tokens_as_load_index_does() {
    let tmp = TempBase::new("head");
    let last3 = SEED3_HBI_GOLD.lines().nth(2).unwrap();
    let base2: String = SEED3_HBI_GOLD
        .lines()
        .take(2)
        .flat_map(|l| [l, "\n"])
        .collect();
    let lane_with_last = |tag: &str, last: String| {
        let p = tmp.lane(tag);
        write_lane(
            &p,
            SEED3_HBP_GOLD.as_bytes(),
            format!("{base2}{last}\n").as_bytes(),
            SEED3_PAYLOADS,
        );
        p
    };
    // No row_hash key: the head row_hash is undefined and buildRow throws MISSING_FIELD.
    let p = lane_with_last("norowhash", last3.replace("row_hash=9086b15982e7499e|", ""));
    assert_eq!(lane_head(&p.hbi).unwrap().row_hash, None);
    let r = emit(&p, &EmitArgs::note("acer", "liris", "NOTE", 1, b"x", TS));
    assert_eq!(
        r.err().map(|e| e.0),
        Some("MISSING_FIELD: antecedent".to_string())
    );
    // A token without '=' stores key t.slice(0, -1) with value t.
    let p = lane_with_last("noeqtok", format!("{last3}|row_hashZ"));
    assert_eq!(
        lane_head(&p.hbi).unwrap().row_hash.as_deref(),
        Some("row_hashZ")
    );
    let p = lane_with_last("noeqseq", format!("{last3}|seqq"));
    assert_eq!(
        lane_head(&p.hbi).err().map(|e| e.0),
        Some("LANE_HEAD_CORRUPT: non-canonical seq at lane head: seqq".to_string())
    );
    // No seq key: undefined fails the gate and prints as "undefined".
    let p = lane_with_last("noseq", last3.replace("|seq=3", ""));
    assert_eq!(
        lane_head(&p.hbi).err().map(|e| e.0),
        Some("LANE_HEAD_CORRUPT: non-canonical seq at lane head: undefined".to_string())
    );
}

#[test]
fn emit_without_payload_stores_string_undefined() {
    let tmp = TempBase::new("nopayload");
    let p = tmp.lane("np");
    let args = EmitArgs {
        payload: None,
        ..EmitArgs::note("acer", "liris", "NOTE", 1, b"", TS)
    };
    let row = emit(&p, &args).unwrap();
    assert!(row.contains("|payload_sha256=eb045d78d273107348b0300c01d29b7552d622abbc6faf81b3ec55359aa9950c|hbi_off=0|len=9|"));
    assert!(row.ends_with("|row_hash=ec9bdcd3dccf35f8"));
    assert_eq!(std::fs::read(&p.payloads).unwrap(), b"undefined");
}

#[test]
fn scan_runs_the_upstream_detection_table() {
    let t5 = scan(t5_fixture().as_bytes());
    assert_eq!(
        t5.reasons,
        ["pem-private-key-header", "openssh-private-key"]
    );
    let up = "ABCDEFGHIJKLMNOP";
    let cases: [(String, &str); 11] = [
        (
            format!("-----BEGIN RSA {}-----", "PRIVATE KEY"),
            "pem-private-key-header",
        ),
        (
            format!("x -----BEGIN OPENSSH {}----- y", "PRIVATE KEY"),
            "pem-private-key-header,openssh-private-key",
        ),
        (format!("id AKIA{up} ."), "aws-access-key-id"),
        (format!("gh{}_{}", "p", "a".repeat(36)), "github-token"),
        (format!("xox{}-{}", "b", "1234567890"), "slack-token"),
        (
            format!("ssh-ed25519 AAAA{}", "A".repeat(40)),
            "ssh-pubkey-material",
        ),
        (format!("CHARM_{}", "ABCD"), "charm-secret-marker"),
        ("Beast-Keys".to_string(), "beast-keys-marker"),
        ("Decrypted_Vault".to_string(), "decrypted-vault-marker"),
        ("\"private_key\" : x".to_string(), "private_key-field"),
        (format!("password = {}", "hunter22"), "secret-assignment"),
    ];
    for (payload, want) in &cases {
        assert_eq!(
            scan(payload.as_bytes()).reasons.join(","),
            *want,
            "{payload}"
        );
    }
    // Boundaries and lengths, with the JS results.
    for (payload, hit) in [
        (format!("gh{}_{}_", "p", "a".repeat(36)), false),
        (format!("xAKIA{up}"), false),
        (format!("CHARM_{}x", "ABCD"), false),
        (format!("password=\u{a0}{}", "12345678"), true),
        (format!("password=\u{a0}{}", "1234567"), false),
        (format!("password=\u{85}{}", "1234567"), true),
        ("beast-keyss".to_string(), false),
        ("plain text".to_string(), false),
        ("ASOLARIA-CARVEOUT-SYNTHETIC-SENTINEL".to_string(), false),
    ] {
        let bytes: Vec<u8> = payload.chars().map(|c| c as u32 as u8).collect();
        assert_eq!(scan(&bytes).hit, hit, "{payload:?}");
    }
    // A payload the JS emits (no table rule matches): row bytes as the JS writes them.
    let tmp = TempBase::new("scan");
    let p = tmp.lane("emit");
    let row = emit(
        &p,
        &EmitArgs::note(
            "acer",
            "liris",
            "NOTE",
            1,
            b"x ASOLARIA-CARVEOUT-SYNTHETIC-SENTINEL y",
            TS,
        ),
    )
    .unwrap();
    assert!(row.ends_with("|row_hash=9b71f506a0977fab"));
}

#[test]
fn read_blob_applies_js_number_to_off_and_len() {
    let tmp = TempBase::new("blob");
    let store = format!("{}/s.payloads", tmp.dir("s"));
    std::fs::write(&store, b"0123456789").unwrap();
    let ok = |off: &str, len: &str| {
        read_blob(&store, off, len)
            .map(|b| b.len())
            .map_err(|e| e.0)
    };
    for (off, len, n) in [
        ("0x1", "2", 2),
        ("1e0", "2", 2),
        (" 1", "2", 2),
        ("1.", "2", 2),
        ("0b1", "2", 2),
        ("0o2", "2", 2),
        ("-0", "2", 2),
        ("\u{a0}1", "2", 2),
        ("\u{feff}2", "2", 2),
        ("", "2", 2),
        ("0.99999999999999999999", "2", 2),
        ("1e-400", "2", 2),
        ("0", "0.2e1", 2),
        ("0", "20e-1", 2),
        ("0", "08", 8),
        ("0", "3.9999999999999999999999", 4),
    ] {
        assert_eq!(ok(off, len), Ok(n), "{off:?} {len:?}");
    }
    let bad = Err("BOUNDS_REJECT: bad off/len".to_string());
    for (off, len) in [
        ("Infinity", "2"),
        ("0x", "2"),
        ("1_0", "2"),
        ("-0x1", "2"),
        ("\u{180e}1", "2"),
        ("1.5", "2"),
        ("-1", "2"),
        ("1e400", "2"),
        ("0", "4.9e-324"),
    ] {
        assert_eq!(ok(off, len), bad, "{off:?} {len:?}");
    }
    for (off, len, msg) in [
        (
            "0",
            "99999999999999999999",
            "len 100000000000000000000 exceeds cap 8388608",
        ),
        (
            "0",
            "1000000000000000000000000000000000000000",
            "len 1e+39 exceeds cap 8388608",
        ),
        ("0", "1e21", "len 1e+21 exceeds cap 8388608"),
        (
            "0",
            "9007199254740993",
            "len 9007199254740992 exceeds cap 8388608",
        ),
        (
            "0",
            "123456789012345678901",
            "len 123456789012345680000 exceeds cap 8388608",
        ),
        (
            "0",
            "1.7976931348623157e308",
            "len 1.7976931348623157e+308 exceeds cap 8388608",
        ),
        (
            "0",
            "8388608.0000000000000001",
            "off+len 8388608 exceeds store size 10",
        ),
        (
            "9007199254740992",
            "1",
            "off+len 9007199254740992 exceeds store size 10",
        ),
        ("1e300", "1", "off+len 1e+300 exceeds store size 10"),
    ] {
        assert_eq!(
            ok(off, len),
            Err(format!("BOUNDS_REJECT: {msg}")),
            "{off:?} {len:?}"
        );
    }
}

#[test]
fn carveout_paths_follow_node_path_posix() {
    // A component directly under '/' is cut at UTF-16 index parent.length + 1 (relay-carveout.mjs:45).
    for p in [
        "/\u{e9}",
        "/\u{e9}/x",
        "/\u{1F600}keys/x",
        "/\u{17f}ecret/x",
        "/Keys",
    ] {
        assert_eq!(
            assert_read_allowed(p, None).map_err(|e| e.0),
            Ok(p.to_string())
        );
    }
    let tmp = TempBase::new("paths");
    let p = tmp.lane("emit-e");
    let args = EmitArgs {
        payload: None,
        payload_file: Some("/\u{e9}/x"),
        ..EmitArgs::note("acer", "liris", "NOTE", 1, b"", TS)
    };
    assert_eq!(
        emit(&p, &args).err().map(|e| e.0),
        Some("ENOENT: no such file or directory, open '/\u{e9}/x'".to_string())
    );
    // `if (allowRoot)`: an empty allow-root applies no allowlist.
    assert!(assert_read_allowed("/etc/hostname", Some("")).is_ok());
    // Leading '//' collapses as path.posix.resolve collapses it.
    assert_eq!(
        assert_read_allowed("//root/a", None).map_err(|e| e.0),
        Ok("/root/a".to_string())
    );

    // Fixtures on the native filesystem.
    let n = tmp.dir("n");
    for d in ["vault", "vault.", "home/.ssh", "root/sub", "rootX"] {
        std::fs::create_dir_all(format!("{n}/{d}")).unwrap();
    }
    std::fs::write(format!("{n}/root/sub/f"), b"x").unwrap();
    std::fs::write(format!("{n}/rootX/f"), b"x").unwrap();
    #[cfg(unix)]
    std::os::unix::fs::symlink(format!("{n}/home/.ssh"), format!("{n}/link")).unwrap();
    let denied = |p: &str, root: Option<&str>| match assert_read_allowed(p, root) {
        Ok(_) => "OK".to_string(),
        Err(e) => e.0.split(':').next().unwrap_or("").to_string(),
    };
    for (rel, want) in [
        ("vault/f", "CARVEOUT_PATH_DENY"),
        ("vault./f", "OK"),
        ("vault ./f", "CARVEOUT_PATH_DENY"),
        ("keys../f", "CARVEOUT_PATH_DENY"),
        ("x~1/f", "CARVEOUT_PATH_DENY"),
        ("$X/f", "CARVEOUT_PATH_DENY"),
        ("a$/f", "OK"),
        ("keyz/f", "OK"),
        ("\u{212a}eys/x", "OK"),
    ] {
        assert_eq!(denied(&format!("{n}/{rel}"), None), want, "{rel}");
    }
    #[cfg(unix)]
    assert_eq!(
        assert_read_allowed(&format!("{n}/link/id_x"), None).err().map(|e| e.0),
        Some(format!(
            "CARVEOUT_PATH_DENY: EMIT may not read carve-out dir: {n}/link/id_x (canonical: {}/home/.ssh/id_x)",
            std::fs::canonicalize(&n).unwrap().to_string_lossy()
        ))
    );
    let root = format!("{n}/root");
    assert_eq!(
        denied(&format!("{n}/rootX/f"), Some(&root)),
        "ALLOWLIST_DENY"
    );
    assert_eq!(
        denied(&format!("{n}/root/../rootX/f"), Some(&root)),
        "ALLOWLIST_DENY"
    );
    assert_eq!(denied(&format!("{n}/root/sub/f"), Some(&root)), "OK");
    assert_eq!(denied(&root, Some(&root)), "OK");
}
