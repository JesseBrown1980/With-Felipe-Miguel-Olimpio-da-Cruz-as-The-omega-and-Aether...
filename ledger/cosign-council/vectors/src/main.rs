//! Prints HBP rows from the vendored cosign and council ledger code, for `referee/referee.py`.
//! Cold lane: the inputs are upstream's NDJSON row format, written by the referee to temp files.
//!
//! Modes:
//!   cosign   <payloads> <now> <persisted-out>  compute_append chain from genesis (py_parity/chain.rs:42-91)
//!   replay   <ledger> <shadow>                 per-row canon checks, then the verify/head/tail/health routes
//!   schedule <ledger> <budget> <threshold_q>   the loop-ledger producer and /api/loop/schedule
//!   parity   <vote-dir>                        /api/vote-quorum/parity and the canon per row

#![forbid(unsafe_code)]

use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::exit;
use std::sync::Arc;

use asolaria_server_cosign_ledger::py_parity::{
    canonical_bytes, compute_append, parse_line, persisted_line, sha16, ResumeState,
};
use asolaria_server_cosign_serve::CosignServe;
use asolaria_server_council_serve::{producer, route, Shared};
use asolaria_server_vote_quorum::canon;

fn hex(s: &str) -> String {
    const LUT: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(s.len() * 2);
    for b in s.bytes() {
        out.push(char::from(LUT[usize::from(b >> 4)]));
        out.push(char::from(LUT[usize::from(b & 0x0f)]));
    }
    out
}

fn lines_of(bytes: &[u8]) -> Vec<&[u8]> {
    let mut v: Vec<&[u8]> = bytes.split(|b| *b == b'\n').collect();
    if v.last().is_some_and(|l| l.is_empty()) {
        v.pop();
    }
    v
}

fn cosign(payloads: &str, now: &str, persisted_out: &str) {
    let body = fs::read(payloads).expect("payloads");
    let mut head = ResumeState::default();
    let mut persisted = String::new();
    for (n, seg) in lines_of(&body).iter().enumerate() {
        let i = n + 1;
        match parse_line(seg) {
            Err(_) => println!("COSIGNVEC|i={i}|parse=err|json=0"),
            Ok(row) => {
                let (row, out) = compute_append(&head, row, now);
                let line = persisted_line(&row);
                println!(
                    "COSIGNVEC|i={i}|parse=ok|seq={}|antecedent_prev={}|row_hash={}|canonical_sha16={}|persisted_sha16={}|json=0",
                    out.seq,
                    out.antecedent_prev,
                    out.row_hash,
                    sha16(&canonical_bytes(&row)),
                    sha16(&line)
                );
                persisted.push_str(&line);
                head = ResumeState {
                    head_seq: out.seq,
                    head_hash: out.row_hash,
                };
            }
        }
    }
    fs::write(persisted_out, persisted).expect("persisted-out");
}

/// Queries for `/api/cosign/tail`, whose `n` is `str::parse::<usize>` (cosign-serve routes.rs:156-159).
const TAIL_QUERIES: [&str; 19] = [
    "n=3",
    "n=999",
    "n=+3",
    "n=+0",
    "n=0",
    "n=",
    "n=+",
    "n=++3",
    "n=-1",
    "n= 3",
    "n=3x",
    "n=18446744073709551615",
    "n=18446744073709551616",
    "n=99999999999999999999",
    "n=0050",
    "n=49",
    "n=7&n=2",
    "x=1&n=2",
    "n",
];

fn replay(ledger: &str, shadow: &str) {
    let body = fs::read(ledger).expect("ledger");
    for (n, seg) in lines_of(&body).iter().enumerate() {
        let i = n + 1;
        let line = String::from_utf8_lossy(seg);
        let cosign = match parse_line(seg) {
            Err(_) => String::from("parse=err"),
            Ok(row) => match row.row_hash() {
                None => format!(
                    "parse=ok|stored=none|recompute={}",
                    sha16(&canonical_bytes(&row))
                ),
                Some(st) => format!(
                    "parse=ok|stored_hex={}|recompute={}",
                    hex(&st),
                    sha16(&canonical_bytes(&row))
                ),
            },
        };
        let vq = match canon::recompute(&line) {
            Ok(h) => format!("vq_recompute={h}"),
            Err(e) => format!("vq_recompute=err_{e:?}"),
        };
        let vq_stored = match canon::stored_row_hash(&line) {
            Some(s) => format!("vq_stored_hex={}", hex(&s)),
            None => String::from("vq_stored=none"),
        };
        println!("REPLAYVEC|i={i}|{cosign}|{vq}|{vq_stored}|json=0");
    }
    let serve = CosignServe::open(PathBuf::from(ledger), PathBuf::from(shadow), false)
        .expect("open shadow");
    let routes = [("/api/cosign/verify", ""), ("/api/cosign/head", "")]
        .into_iter()
        .chain(TAIL_QUERIES.iter().map(|q| ("/api/cosign/tail", *q)))
        .chain([("/health", "")]);
    for (path, query) in routes {
        let (code, out) = serve.handle("GET", path, query, b"");
        println!(
            "ROUTEVEC|path={path}|query={query}|status={code}|body_hex={}|json=0",
            hex(&out)
        );
    }
    let (code, out) = serve.handle("POST", "/api/cosign/append", "", b"{}");
    println!(
        "ROUTEVEC|path=/api/cosign/append|query=|status={code}|body_hex={}|json=0",
        hex(&out)
    );
}

fn schedule(ledger: &str, budget: &str, threshold: &str) {
    let body = fs::read_to_string(ledger).expect("ledger utf-8");
    let budget_n: usize = budget.parse().expect("budget");
    let threshold_q: u16 = threshold.parse().expect("threshold_q");
    for (n, line) in body.lines().enumerate() {
        let i = n + 1;
        let t = line.trim();
        if t.is_empty() {
            println!("PROPOSALVEC|i={i}|blank=1|json=0");
            continue;
        }
        match producer::proposal(t) {
            Some(p) => println!(
                "PROPOSALVEC|i={i}|some=1|id_hex={}|score_q={}|genius_q={}|risk_q={}|json=0",
                hex(&p.id),
                p.score_q,
                p.genius_q,
                p.risk_q
            ),
            None => println!("PROPOSALVEC|i={i}|some=0|json=0"),
        }
    }
    let (code, rows) = producer::schedule_rows(&body, budget_n, threshold_q);
    println!("SCHEDSTATUS|code={code}|json=0");
    print!("{rows}");
    env::set_var("ASOLARIA_LOOP_LEDGER", ledger);
    env::set_var("ASOLARIA_VERIFY_BUDGET", budget);
    env::set_var("ASOLARIA_ACCEPT_THRESHOLD", threshold);
    let shared = Arc::new(Shared {
        vote_dir: PathBuf::from("."),
    });
    let (rcode, rrows) = route(&shared, "GET", "/api/loop/schedule", "");
    let same = u8::from(rcode == code && rrows == rows);
    println!("SCHEDROUTE|same={same}|json=0");
}

fn parity(dir: &str) {
    let shared = Arc::new(Shared {
        vote_dir: PathBuf::from(dir),
    });
    let (code, rows) = route(&shared, "GET", "/api/vote-quorum/parity", "");
    println!("PARITYSTATUS|code={code}|json=0");
    print!("{rows}");
    for name in ["queue", "votes", "outcomes"] {
        let Ok(body) = fs::read_to_string(PathBuf::from(dir).join(format!("{name}.ndjson"))) else {
            println!("VQVEC|ledger={name}|missing=1|json=0");
            continue;
        };
        for (n, line) in body.lines().enumerate() {
            let t = line.trim();
            if t.is_empty() {
                continue;
            }
            let stored = match canon::stored_row_hash(t) {
                Some(s) => format!("stored_hex={}", hex(&s)),
                None => String::from("stored=none"),
            };
            let rc = match canon::recompute(t) {
                Ok(h) => format!("recompute={h}"),
                Err(e) => format!("recompute=err_{e:?}"),
            };
            println!("VQVEC|ledger={name}|i={}|{stored}|{rc}|json=0", n + 1);
        }
    }
}

fn main() {
    let a: Vec<String> = env::args().collect();
    match (a.get(1).map(String::as_str), a.len()) {
        (Some("cosign"), 5) => cosign(&a[2], &a[3], &a[4]),
        (Some("replay"), 4) => replay(&a[2], &a[3]),
        (Some("schedule"), 5) => schedule(&a[2], &a[3], &a[4]),
        (Some("parity"), 3) => parity(&a[2]),
        _ => {
            eprintln!("usage: cosign-council-vectors cosign|replay|schedule|parity ...");
            exit(2);
        }
    }
}
