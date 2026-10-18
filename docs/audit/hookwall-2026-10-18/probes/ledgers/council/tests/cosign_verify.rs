//! Probe: [FABRIC/action] cosign ledger row altered + row_hash recomputed / row deleted / ledger
//! removed, driven through the public in-process route `CosignServe::handle("GET",
//! "/api/cosign/verify", ...)` (cosign-serve/src/routes.rs:99-153).
//!
//! The genuine chain is produced by upstream's own append route (POST /api/cosign/append), then
//! copied and tampered in a scratch dir under this probe crate (work/).

use std::fs;
use std::path::{Path, PathBuf};

use asolaria_server_cosign_ledger::py_parity::{
    canonical_bytes, parse_line, persisted_line, sha16, RawJson,
};
use asolaria_server_cosign_serve::CosignServe;

const PAYLOADS: [&[u8]; 3] = [
    br#"{"event":"GRANT-A","ts":"2026-10-18T00:00:00.000Z","actor":"op"}"#,
    br#"{"event":"GRANT-B","ts":"2026-10-18T00:00:01.000Z","actor":"op"}"#,
    br#"{"event":"GRANT-C","ts":"2026-10-18T00:00:02.000Z","actor":"op"}"#,
];

fn work() -> PathBuf {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("work/cosign");
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();
    dir
}

fn verify_live(dir: &Path, live: &Path, tag: &str) -> (u16, String) {
    let serve = CosignServe::open(
        live.to_path_buf(),
        dir.join(format!("shadow-{tag}.ndjson")),
        false,
    )
    .unwrap();
    let out = serve.handle("GET", "/api/cosign/verify", "", b"");
    let head = serve.handle("GET", "/api/cosign/head", "", b"");
    println!("[{tag}] verify -> {:?}", out);
    println!("[{tag}] head   -> {:?}", head);
    out
}

/// Re-hash a row exactly as upstream does: sha16 of canonical_bytes (which drops row_hash).
fn rehash(mut row: asolaria_server_cosign_ledger::py_parity::PyRow) -> String {
    let h = sha16(&canonical_bytes(&row));
    row.set("row_hash", RawJson::Scalar(format!("\"{h}\"")));
    persisted_line(&row)
}

fn antecedents_raw(line: &str) -> String {
    let row = parse_line(line.as_bytes()).unwrap();
    format!("{:?}", row.get("antecedents"))
}

#[test]
fn cosign_verify_tamper_matrix() {
    let dir = work();

    // 1. Genuine chain, written by upstream's own append route.
    let genuine = dir.join("genuine.ndjson");
    {
        let serve = CosignServe::open(dir.join("no-live.ndjson"), genuine.clone(), true).unwrap();
        for p in PAYLOADS {
            let r = serve.handle("POST", "/api/cosign/append", "", p);
            println!("[append] {:?}", r);
            assert_eq!(r.0, 200);
        }
        let v = serve.handle("GET", "/api/cosign/verify", "source=shadow", b"");
        println!("[genuine/shadow] verify -> {:?}", v);
    }
    let body = fs::read_to_string(&genuine).unwrap();
    let lines: Vec<String> = body.lines().map(|l| format!("{l}\n")).collect();
    assert_eq!(lines.len(), 3);
    for (i, l) in lines.iter().enumerate() {
        println!("[genuine] row{} = {}", i + 1, l.trim_end());
    }
    let g = verify_live(&dir, &genuine, "genuine");
    assert_eq!(
        g,
        (200, String::from(r#"{"ok":true,"checked":3,"matched":3,"mismatches":0,"legacy":0}"#))
    );

    // 2. Control: alter row 2 WITHOUT recomputing row_hash -> verify does count a mismatch.
    let naive = dir.join("naive.ndjson");
    fs::write(
        &naive,
        format!("{}{}{}", lines[0], lines[1].replace("GRANT-B", "FORGED-B"), lines[2]),
    )
    .unwrap();
    let n = verify_live(&dir, &naive, "naive-alter-no-rehash");
    assert_eq!(
        n,
        (200, String::from(r#"{"ok":true,"checked":3,"matched":2,"mismatches":1,"legacy":0}"#))
    );

    // 3. INJ: alter row 2 (event + actor) and recompute its own row_hash.
    let mut row2 = parse_line(lines[1].trim_end().as_bytes()).unwrap();
    row2.set("event", RawJson::Scalar(String::from("\"FORGED-B\"")));
    row2.set("actor", RawJson::Scalar(String::from("\"attacker\"")));
    let row2_forged = rehash(row2);
    let rehashed = dir.join("rehashed-middle.ndjson");
    fs::write(&rehashed, format!("{}{}{}", lines[0], row2_forged, lines[2])).unwrap();
    println!("[rehashed-middle] forged row2 = {}", row2_forged.trim_end());
    println!(
        "[rehashed-middle] row3 antecedents still = {} (forged row2 hash = {:?})",
        antecedents_raw(&lines[2]),
        parse_line(row2_forged.trim_end().as_bytes()).unwrap().row_hash()
    );
    let r = verify_live(&dir, &rehashed, "rehashed-middle");
    assert_eq!(
        r,
        (200, String::from(r#"{"ok":true,"checked":3,"matched":3,"mismatches":0,"legacy":0}"#))
    );

    // 3b. INJ: alter the FINAL row and recompute its row_hash (head moves to the forged hash).
    let mut row3 = parse_line(lines[2].trim_end().as_bytes()).unwrap();
    row3.set("event", RawJson::Scalar(String::from("\"FORGED-C\"")));
    let row3_forged = rehash(row3);
    let rehashed_tail = dir.join("rehashed-final.ndjson");
    fs::write(&rehashed_tail, format!("{}{}{}", lines[0], lines[1], row3_forged)).unwrap();
    let r = verify_live(&dir, &rehashed_tail, "rehashed-final");
    assert_eq!(
        r,
        (200, String::from(r#"{"ok":true,"checked":3,"matched":3,"mismatches":0,"legacy":0}"#))
    );

    // 4. INJ: delete row 2 (row 3 still names row 2's hash as its antecedent).
    let deleted = dir.join("deleted-middle.ndjson");
    fs::write(&deleted, format!("{}{}", lines[0], lines[2])).unwrap();
    let d = verify_live(&dir, &deleted, "deleted-middle");
    assert_eq!(
        d,
        (200, String::from(r#"{"ok":true,"checked":2,"matched":2,"mismatches":0,"legacy":0}"#))
    );

    // 4b. INJ: truncate the final row.
    let truncated = dir.join("deleted-final.ndjson");
    fs::write(&truncated, format!("{}{}", lines[0], lines[1])).unwrap();
    let t = verify_live(&dir, &truncated, "deleted-final");
    assert_eq!(
        t,
        (200, String::from(r#"{"ok":true,"checked":2,"matched":2,"mismatches":0,"legacy":0}"#))
    );

    // 5. INJ: ledger file removed (live path does not exist).
    let absent = dir.join("absent.ndjson");
    assert!(!absent.exists());
    let a = verify_live(&dir, &absent, "missing-live");
    assert_eq!(
        a,
        (200, String::from(r#"{"ok":true,"checked":0,"matched":0,"mismatches":0,"legacy":0}"#))
    );

    // 5b. INJ: shadow ledger removed after open, verify source=shadow.
    let shadow = dir.join("shadow-removed.ndjson");
    fs::copy(&genuine, &shadow).unwrap();
    let serve = CosignServe::open(absent.clone(), shadow.clone(), false).unwrap();
    println!(
        "[shadow-before-remove] verify -> {:?}",
        serve.handle("GET", "/api/cosign/verify", "source=shadow", b"")
    );
    fs::remove_file(&shadow).unwrap();
    let s = serve.handle("GET", "/api/cosign/verify", "source=shadow", b"");
    println!("[shadow-after-remove] verify -> {:?}", s);
    assert_eq!(
        s,
        (200, String::from(r#"{"ok":true,"checked":0,"matched":0,"mismatches":0,"legacy":0}"#))
    );
    let h = serve.handle("GET", "/health", "", b"");
    println!("[shadow-after-remove] health -> {:?}", h);
}
