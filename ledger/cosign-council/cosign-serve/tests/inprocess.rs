//! The in-process library against the vectors upstream ships: `fixtures/daemon-row-hash.ndjson`
//! (two rows, row_hash 101b6e1b41a4038f and ff433399335fe8ad). Appending the two fixture payloads
//! through `POST /api/cosign/append` reproduces both rows' seq, antecedents and row_hash.

use std::fs;
use std::path::{Path, PathBuf};

use asolaria_server_cosign_serve::CosignServe;

const FIXTURE_A: &[u8] =
    br#"{"event":"FIXTURE-A","ts":"2026-06-25T00:00:00.000Z","nested":{"b":2,"a":1}}"#;
const FIXTURE_B: &[u8] =
    br#"{"event":"FIXTURE-B","ts":"2026-06-25T00:00:01.000Z","value":"ol\u00e1"}"#;

fn fixture() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("fixtures/daemon-row-hash.ndjson")
}

fn scratch(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "asolaria-cosign-council-{}-{name}",
        std::process::id()
    ));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();
    dir
}

#[test]
fn shadow_append_reproduces_the_fixture_chain() {
    let dir = scratch("chain");
    let shadow = dir.join("COSIGN_CHAIN.shadow.ndjson");
    let serve = CosignServe::open(fixture(), shadow.clone(), true).unwrap();

    let (code, body) = serve.handle("POST", "/api/cosign/append", "", FIXTURE_A);
    assert_eq!(code, 200);
    assert_eq!(
        body,
        r#"{"ok":true,"seq":1,"row_hash":"101b6e1b41a4038f","antecedent_prev":"0000000000000000"}"#
    );
    let (code, body) = serve.handle("POST", "/api/cosign/append", "", FIXTURE_B);
    assert_eq!(code, 200);
    assert_eq!(
        body,
        r#"{"ok":true,"seq":2,"row_hash":"ff433399335fe8ad","antecedent_prev":"101b6e1b41a4038f"}"#
    );

    // The persisted rows are py_parity::persisted_line (canon.rs:30-37): fields in insertion order,
    // python's ", " / ": " separators, row_hash last.
    let written = fs::read_to_string(&shadow).unwrap();
    let mut lines = written.lines();
    assert_eq!(
        lines.next().unwrap(),
        r#"{"event": "FIXTURE-A", "ts": "2026-06-25T00:00:00.000Z", "nested": {"b": 2, "a": 1}, "seq": 1, "antecedents": ["0000000000000000"], "appended_by_daemon": "ASOLARIA-COSIGN-CHAIN-SINGLE-WRITER-DAEMON-PID-2026-05-23", "row_hash": "101b6e1b41a4038f"}"#
    );
    assert_eq!(
        lines.next().unwrap(),
        r#"{"event": "FIXTURE-B", "ts": "2026-06-25T00:00:01.000Z", "value": "ol\u00e1", "seq": 2, "antecedents": ["101b6e1b41a4038f"], "appended_by_daemon": "ASOLARIA-COSIGN-CHAIN-SINGLE-WRITER-DAEMON-PID-2026-05-23", "row_hash": "ff433399335fe8ad"}"#
    );
    assert!(lines.next().is_none());

    let (code, body) = serve.handle("GET", "/api/cosign/verify", "source=shadow", b"");
    assert_eq!(code, 200);
    assert_eq!(
        body,
        r#"{"ok":true,"checked":2,"matched":2,"mismatches":0,"legacy":0}"#
    );
    let (_, body) = serve.handle("GET", "/health", "", b"");
    assert_eq!(
        body,
        r#"{"ok":true,"service":"cosign-serve","port":5091,"head_seq":2,"head_row_hash":"ff433399335fe8ad","law_anchor":"ASOLARIA-FOUNDATION-V3-LAW-V39-LOAD-DIVISION-PID-2026-05-23","append_shadow":true,"live_write":false}"#
    );
    let _ = fs::remove_dir_all(dir);
}

#[test]
fn live_ledger_routes_read_the_fixture() {
    let dir = scratch("live");
    let serve = CosignServe::open(fixture(), dir.join("shadow.ndjson"), false).unwrap();
    assert_eq!(
        serve.handle("GET", "/api/cosign/verify", "", b""),
        (
            200,
            String::from(r#"{"ok":true,"checked":2,"matched":2,"mismatches":0,"legacy":0}"#)
        )
    );
    assert_eq!(
        serve.handle("GET", "/api/cosign/head", "", b""),
        (
            200,
            String::from(r#"{"ok":true,"seq":2,"row_hash":"ff433399335fe8ad"}"#)
        )
    );
    let (code, body) = serve.handle("GET", "/api/cosign/tail", "n=1", b"");
    assert_eq!(code, 200);
    assert!(body.starts_with(r#"{"ok":true,"count":1,"rows":["{\"seq\":2,"#));
    let _ = fs::remove_dir_all(dir);
}

#[test]
fn reopen_resumes_the_head_and_continues_the_chain() {
    let dir = scratch("resume");
    let shadow = dir.join("shadow.ndjson");
    {
        let serve = CosignServe::open(fixture(), shadow.clone(), true).unwrap();
        assert_eq!(
            serve.handle("POST", "/api/cosign/append", "", FIXTURE_A).0,
            200
        );
        assert_eq!(
            serve.handle("POST", "/api/cosign/append", "", FIXTURE_B).0,
            200
        );
    }
    let serve = CosignServe::open(fixture(), shadow, true).unwrap();
    let (_, health) = serve.handle("GET", "/health", "", b"");
    assert!(health.contains(r#""head_seq":2,"head_row_hash":"ff433399335fe8ad""#));
    let (code, body) = serve.handle(
        "POST",
        "/api/cosign/append",
        "",
        br#"{"event":"NEXT","ts":"2026-06-25T00:00:02.000Z"}"#,
    );
    assert_eq!(code, 200);
    assert!(body.starts_with(r#"{"ok":true,"seq":3,"#));
    assert!(body.ends_with(r#""antecedent_prev":"ff433399335fe8ad"}"#));
    let _ = fs::remove_dir_all(dir);
}

#[test]
fn upstream_refusals_hold_in_process() {
    let dir = scratch("refuse");
    let off = CosignServe::open(fixture(), dir.join("off.ndjson"), false).unwrap();
    assert_eq!(
        off.handle("POST", "/api/cosign/append", "", FIXTURE_A),
        (
            403,
            String::from(r#"{"ok":false,"error":"append-disabled-shadow-only"}"#)
        )
    );
    let on = CosignServe::open(fixture(), dir.join("on.ndjson"), true).unwrap();
    assert_eq!(
        on.handle("POST", "/api/cosign/append", "", b"{not json"),
        (400, String::from(r#"{"ok":false,"error":"parse"}"#))
    );
    assert_eq!(
        on.handle("GET", "/nope", "", b""),
        (
            404,
            String::from(r#"{"ok":false,"error":"unknown route","path":"/nope"}"#)
        )
    );
    // store.rs:17-42: a shadow ledger whose last byte is not a newline is refused at open.
    let torn = dir.join("torn.ndjson");
    fs::write(&torn, b"{\"seq\":1}").unwrap();
    let err = CosignServe::open(fixture(), torn, true).err().unwrap();
    assert_eq!(err.kind(), std::io::ErrorKind::InvalidData);
    let _ = fs::remove_dir_all(dir);
}

#[test]
fn from_env_reads_the_upstream_variables() {
    let dir = scratch("env");
    std::env::set_var("ASOLARIA_COSIGN_BIND", "127.0.0.1:5999");
    std::env::set_var("ASOLARIA_COSIGN_LIVE", fixture());
    std::env::set_var("ASOLARIA_COSIGN_SHADOW", dir.join("env.ndjson"));
    std::env::set_var("ASOLARIA_COSIGN_APPEND_SHADOW", "1");
    let (bind, serve) = CosignServe::from_env().unwrap();
    assert_eq!(bind, "127.0.0.1:5999");
    let (_, health) = serve.handle("GET", "/health", "", b"");
    assert!(health.contains(r#""append_shadow":true"#));
    let _ = fs::remove_dir_all(dir);
}
