//! Op-script runner for `tools/referee.py --cross`: runs each line of an op script through the
//! port and prints one result block per op, in the format the referee prints for the same script.
//! An op line is a verb and space-separated hex fields (`-` = absent):
//!   VERIFY dir seat | WALK dir seat | HEAD hbi | SCAN bytes | ARA path root | READBLOB path off len
//!   EMIT dir seat from to verb n payload payload_file token allow_root ts   (n is decimal)
use std::io::Write;

use hbp_relay::carveout::{assert_read_allowed, scan};
use hbp_relay::driver::{emit, lane_head, lane_paths, reverse_walk, verify_lane, EmitArgs};
use hbp_relay::indexer::read_blob;
use hbp_relay::relay::sha256hex;

fn unhex(h: &str) -> Vec<u8> {
    (0..h.len() / 2)
        .map(|i| u8::from_str_radix(&h[2 * i..2 * i + 2], 16).unwrap_or(0))
        .collect()
}

fn text(h: &str) -> Option<String> {
    (h != "-").then(|| String::from_utf8_lossy(&unhex(h)).into_owned())
}

fn run(a: &[&str], out: &mut Vec<String>) -> Result<(), String> {
    let f = |i: usize| text(a.get(i).copied().unwrap_or("-"));
    let req = |i: usize| f(i).unwrap_or_default();
    match a[0] {
        "VERIFY" => {
            let v = verify_lane(&lane_paths(&req(1), &req(2))).map_err(|e| e.0)?;
            out.push(format!("VERIFY {} {}", v.pass, v.checked));
            out.extend(
                v.failures
                    .iter()
                    .map(|x| format!("  F {} {}", x.row, x.why)),
            );
        }
        "WALK" => {
            let w = reverse_walk(&lane_paths(&req(1), &req(2))).map_err(|e| e.0)?;
            out.push(format!("WALK {} {}", w.pass, w.walked));
            out.extend(w.issues.iter().map(|x| format!("  I {} {}", x.i, x.why)));
        }
        "HEAD" => {
            let h = lane_head(&req(1)).map_err(|e| e.0)?;
            let rh = h.row_hash.as_deref().unwrap_or("undefined");
            out.push(format!("HEAD {rh} {}", h.seq));
        }
        "EMIT" => {
            let payload = (a[7] != "-").then(|| unhex(a[7]));
            let (from, to, verb, ts) = (req(3), req(4), req(5), req(11));
            let (pf, root) = (f(8), f(10));
            let token = f(9).unwrap_or_else(|| "-".to_string());
            let args = EmitArgs {
                from: &from,
                to: &to,
                verb: &verb,
                n: a[6].parse().unwrap_or(0),
                payload: payload.as_deref(),
                payload_file: pf.as_deref(),
                ts: &ts,
                token: &token,
                allow_root: root.as_deref(),
            };
            let row = emit(&lane_paths(&req(1), &req(2)), &args).map_err(|e| e.0)?;
            out.push(format!("EMIT OK {row}"));
        }
        "SCAN" => {
            let s = scan(&unhex(a[1]));
            out.push(format!("SCAN {} {}", s.hit, s.reasons.join(",")));
        }
        "ARA" => {
            let p = assert_read_allowed(&req(1), f(2).as_deref()).map_err(|e| e.0)?;
            out.push(format!("ARA OK {p}"));
        }
        "READBLOB" => {
            let b = read_blob(&req(1), &req(2), &req(3)).map_err(|e| e.0)?;
            out.push(format!("READBLOB OK {} {}", b.len(), sha256hex(&b)));
        }
        op => out.push(format!("BADOP {op}")),
    }
    Ok(())
}

fn main() {
    let path = std::env::args()
        .nth(1)
        .expect("usage: relay_ops <op script>");
    let script = std::fs::read_to_string(path).expect("read op script");
    let mut out: Vec<String> = Vec::new();
    for line in script.split('\n').filter(|l| !l.is_empty()) {
        let a: Vec<&str> = line.split(' ').collect();
        let mut block = Vec::new();
        let r = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| run(&a, &mut block)));
        match r {
            Ok(Ok(())) => out.extend(block),
            Ok(Err(m)) => {
                out.extend(block);
                out.push(format!("{} ERR {m}", a[0]));
            }
            Err(_) => out.push(format!("{} PANIC", a[0])),
        }
    }
    let mut s = out.join("\n");
    s.push('\n');
    std::io::stdout().write_all(s.as_bytes()).expect("write");
}
