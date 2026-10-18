//! Reads HBP request rows on stdin and prints the library's answers as HBP rows, for
//! `referee/referee.py` (cold lane). Values travel as space-separated prefix tokens:
//! `s<utf-8 hex>` string, `i<decimal>` integer, `l<n>` list of the next n values,
//! `o<n>` object of the next n (string key, value) pairs.
//!
//! Requests: DUMPS|v; CHAIN; HIST|seq|hash; APPEND|secs|payload; ISO|secs; and, with the
//! `vote-quorum` feature, RULES; AUTH|pool|voter; EVAL|class|votes; EXH|max; PAIR|yes|no;
//! IDEM|vote|outcome|existing; FLOWNEW|class|vote; FLOWCAST|voter|vote.

#![forbid(unsafe_code)]

use std::io::{self, BufRead, BufWriter, Write};

use asolaria_hyperbehcs_daemons::cosign_chain::{append_row, sha16, Head};
use asolaria_hyperbehcs_daemons::iso_time::now_iso_at;
use asolaria_hyperbehcs_daemons::pyjson::{dumps_sorted, row_preimage, Obj, Value};

fn hex(bytes: &[u8]) -> String {
    const LUT: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for b in bytes {
        out.push(char::from(LUT[usize::from(b >> 4)]));
        out.push(char::from(LUT[usize::from(b & 0x0f)]));
    }
    out
}

fn unhex(s: &str) -> String {
    let b = s.as_bytes();
    let nib = |c: u8| match c {
        b'0'..=b'9' => c - b'0',
        b'a'..=b'f' => c - b'a' + 10,
        _ => panic!("bad hex"),
    };
    let bytes: Vec<u8> = b.chunks(2).map(|p| (nib(p[0]) << 4) | nib(p[1])).collect();
    String::from_utf8(bytes).expect("utf-8")
}

fn field<'a>(row: &'a str, key: &str) -> &'a str {
    row.split('|')
        .skip(1)
        .find_map(|f| f.strip_prefix(key).and_then(|r| r.strip_prefix('=')))
        .unwrap_or_else(|| panic!("missing field {key}"))
}

fn decode<'a, I: Iterator<Item = &'a str>>(toks: &mut I) -> Value {
    let t = toks.next().expect("token");
    let (tag, body) = t.split_at(1);
    match tag {
        "s" => Value::Str(unhex(body)),
        "i" => Value::Int(body.parse().expect("int")),
        "l" => {
            let n: usize = body.parse().expect("len");
            Value::List((0..n).map(|_| decode(toks)).collect())
        }
        "o" => {
            let n: usize = body.parse().expect("len");
            let pairs = (0..n).map(|_| match decode(toks) {
                Value::Str(k) => (k, decode(toks)),
                _ => panic!("object key must be a string token"),
            });
            Value::Obj(Obj::from_pairs(pairs.collect::<Vec<_>>()))
        }
        _ => panic!("bad token {t}"),
    }
}

fn decode_all(s: &str) -> Value {
    let mut toks = s.split(' ').filter(|t| !t.is_empty());
    let v = decode(&mut toks);
    assert!(toks.next().is_none(), "trailing tokens");
    v
}

fn encode(v: &Value, out: &mut String) {
    if !out.is_empty() {
        out.push(' ');
    }
    match v {
        Value::Str(s) => {
            out.push('s');
            out.push_str(&hex(s.as_bytes()));
        }
        Value::Int(n) => out.push_str(&format!("i{n}")),
        Value::List(items) => {
            out.push_str(&format!("l{}", items.len()));
            for item in items {
                encode(item, out);
            }
        }
        Value::Obj(obj) => encode_obj(obj, out),
    }
}

/// Appends the object's tokens; `out` is empty or already ends with a separator.
fn encode_obj(obj: &Obj, out: &mut String) {
    out.push_str(&format!("o{}", obj.len()));
    for (k, v) in obj.fields() {
        encode(&Value::Str(k.clone()), out);
        encode(v, out);
    }
}

#[cfg(feature = "vote-quorum")]
mod vote {
    use std::io::Write;

    use sha2::{Digest, Sha256};

    use super::{field, hex, unhex};
    use asolaria_hyperbehcs_daemons::cosign_chain::sha16;
    use asolaria_hyperbehcs_daemons::vote_quorum::{
        already_cast, evaluate_quorum, is_authorized, majority_outcome, majority_pass,
        majority_reject, outcome_exists, outcome_row_due, supermajority_outcome,
        supermajority_pass, supermajority_reject, CastVote, Outcome, Pool, Status,
        AUTHORIZED_CLASSES, LAW_WINDOW_END, OP_WINDOW_END, QUINTUPLE, QUORUM_RULES,
    };

    fn pool_named(name: &str) -> Pool {
        match name {
            "quintuple" => Pool::Quintuple,
            "authorized" => Pool::Authorized,
            "any" => Pool::Any,
            _ => panic!("pool {name}"),
        }
    }

    fn outcome_named(name: &str) -> Outcome {
        [
            Outcome::PassAuto,
            Outcome::PassUnanimous,
            Outcome::PassSupermajority,
            Outcome::PassMajority,
            Outcome::Reject,
            Outcome::Pending,
        ]
        .into_iter()
        .find(|o| o.name() == name)
        .unwrap_or_else(|| panic!("outcome {name}"))
    }

    /// The outcome state as a balanced trit: pass +1, pending 0, reject -1.
    fn outcome_trit(o: Outcome) -> i8 {
        match o {
            Outcome::Pending => 0,
            Outcome::Reject => -1,
            _ => 1,
        }
    }

    /// A trit stored as trit + 1 in a 2-bit field (0 reject, 1 pending, 2 pass).
    fn trit_field(o: Outcome) -> u8 {
        u8::try_from(outcome_trit(o) + 1).expect("trit + 1 is 0..=2")
    }

    /// bit0 line 149, bit1 line 151, bit2 line 157, bit3 line 159 comparisons; bits 4-5 the
    /// supermajority branch, bits 6-7 the simple-majority branch, each as `trit_field`.
    fn pair_bits(yes: u64, no: u64) -> u8 {
        let total = u128::from(yes) + u128::from(no);
        u8::from(supermajority_pass(yes, total))
            | (u8::from(supermajority_reject(no, total)) << 1)
            | (u8::from(majority_pass(yes, total)) << 2)
            | (u8::from(majority_reject(no, total)) << 3)
            | (trit_field(supermajority_outcome(yes, no)) << 4)
            | (trit_field(majority_outcome(yes, no)) << 6)
    }

    fn status_fields(s: &Status) -> String {
        format!(
            "rule={}|pool={}|yes={}|no={}|abstain={}|total={}|outcome={}",
            s.rule.name(),
            s.pool.name(),
            s.yes,
            s.no,
            s.abstain,
            s.total_decisive,
            s.outcome.name()
        )
    }

    fn cast_view(rows: &[(String, String)]) -> Vec<CastVote<'_>> {
        rows.iter()
            .map(|(v, w)| CastVote {
                voter_pid: v,
                vote: w,
            })
            .collect()
    }

    #[derive(Default)]
    pub struct Flow {
        class: String,
        vote_id: String,
        cast: Vec<(String, String)>,
        outcome_ids: Vec<String>,
    }

    /// Answers one vote-quorum request; `false` when `kind` is not one.
    pub fn request(kind: &str, line: &str, out: &mut impl Write, flow: &mut Flow) -> bool {
        match kind {
            "RULES" => {
                for (class, r) in QUORUM_RULES {
                    writeln!(
                        out,
                        "RULE|class={class}|rule={}|pool={}|extra={}|json=0",
                        r.rule.name(),
                        r.pool.name(),
                        r.extra.unwrap_or("-")
                    )
                    .unwrap();
                }
                let mut q: Vec<&str> = QUINTUPLE.to_vec();
                q.sort_unstable();
                let mut c: Vec<&str> = AUTHORIZED_CLASSES.to_vec();
                c.sort_unstable();
                writeln!(
                    out,
                    "SETS|quintuple_n={}|quintuple_sha16={}|authorized_classes={}|json=0",
                    q.len(),
                    sha16(&q.join("\n")),
                    c.join(",")
                )
                .unwrap();
                writeln!(
                    out,
                    "WINDOW|law_window_end={LAW_WINDOW_END}|op_window_end={OP_WINDOW_END}|json=0"
                )
                .unwrap();
            }
            "AUTH" => {
                let voter = unhex(field(line, "voter"));
                let ok = is_authorized(&voter, pool_named(field(line, "pool")));
                writeln!(out, "AUTH|ok={}|json=0", u8::from(ok)).unwrap();
            }
            "EVAL" => {
                let class = unhex(field(line, "class"));
                let pairs: Vec<(String, String)> = field(line, "votes")
                    .split(',')
                    .filter(|p| !p.is_empty())
                    .map(|p| {
                        let (v, w) = p.split_once(':').expect("voter:vote");
                        (unhex(v), unhex(w))
                    })
                    .collect();
                let s = evaluate_quorum(&class, &cast_view(&pairs));
                writeln!(out, "EVAL|{}|json=0", status_fields(&s)).unwrap();
            }
            "EXH" => {
                let max: u64 = field(line, "max").parse().expect("max");
                for t in 0..=max {
                    let bytes: Vec<u8> = (0..=t).map(|yes| pair_bits(yes, t - yes)).collect();
                    let digest = hex(&Sha256::digest(&bytes));
                    writeln!(out, "EXH|t={t}|sha256={digest}|json=0").unwrap();
                }
            }
            "PAIR" => {
                let yes: u64 = field(line, "yes").parse().expect("yes");
                let no: u64 = field(line, "no").parse().expect("no");
                writeln!(out, "PAIR|bits={}|json=0", pair_bits(yes, no)).unwrap();
            }
            "IDEM" => {
                let vote_id = unhex(field(line, "vote"));
                let outcome = outcome_named(field(line, "outcome"));
                let existing: Vec<String> = field(line, "existing")
                    .split(',')
                    .filter(|p| !p.is_empty())
                    .map(unhex)
                    .collect();
                let ids = || existing.iter().map(String::as_str);
                writeln!(
                    out,
                    "IDEM|exists={}|due={}|json=0",
                    u8::from(outcome_exists(&vote_id, ids())),
                    u8::from(outcome_row_due(outcome, &vote_id, ids()))
                )
                .unwrap();
            }
            "FLOWNEW" => {
                flow.class = unhex(field(line, "class"));
                flow.vote_id = unhex(field(line, "vote"));
                flow.cast.clear();
            }
            "FLOWCAST" => {
                let voter = unhex(field(line, "voter"));
                let vote = String::from(field(line, "vote"));
                if already_cast(&voter, &cast_view(&flow.cast)) {
                    writeln!(out, "FLOW|code=409|json=0").unwrap();
                    return true;
                }
                flow.cast.push((voter, vote));
                let s = evaluate_quorum(&flow.class, &cast_view(&flow.cast));
                let due = outcome_row_due(
                    s.outcome,
                    &flow.vote_id,
                    flow.outcome_ids.iter().map(String::as_str),
                );
                if due {
                    flow.outcome_ids.push(flow.vote_id.clone());
                }
                writeln!(
                    out,
                    "FLOW|code=200|{}|outcome_row={}|json=0",
                    status_fields(&s),
                    u8::from(due)
                )
                .unwrap();
            }
            _ => return false,
        }
        true
    }
}

struct Chain {
    head: Head,
}

fn main() {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut out = BufWriter::new(stdout.lock());
    #[cfg(feature = "vote-quorum")]
    let mut flow = vote::Flow::default();
    let mut chain = Chain {
        head: Head::genesis(),
    };
    for line in stdin.lock().lines() {
        let line = line.expect("stdin");
        let kind = line.split('|').next().unwrap_or("");
        match kind {
            "DUMPS" => {
                let v = decode_all(field(&line, "v"));
                let text = dumps_sorted(&v);
                writeln!(
                    out,
                    "DUMPS|hex={}|sha16={}|json=0",
                    hex(text.as_bytes()),
                    sha16(&text)
                )
                .unwrap();
            }
            "CHAIN" => chain.head = Head::genesis(),
            "HIST" => {
                let seq = match field(&line, "seq") {
                    "-" => None,
                    n => Some(n.parse::<i128>().expect("seq")),
                };
                let hash = match field(&line, "hash") {
                    "-" => None,
                    toks => Some(decode_all(toks)),
                };
                chain.head.fold(seq, hash.as_ref());
            }
            "APPEND" => {
                let secs: u64 = field(&line, "secs").parse().expect("secs");
                let payload = match decode_all(field(&line, "payload")) {
                    Value::Obj(o) => o,
                    _ => panic!("payload must be an object"),
                };
                let Some(a) = append_row(&chain.head, &payload, &now_iso_at(secs)) else {
                    writeln!(out, "APPEND_COLD|head_seq={}|json=0", chain.head.seq).unwrap();
                    continue;
                };
                let mut prev = String::new();
                encode(&a.prev_hash, &mut prev);
                let mut row = String::new();
                encode_obj(&a.row, &mut row);
                writeln!(
                    out,
                    "APPENDED|seq={}|prev={prev}|row_hash={}|pre_hex={}|row={row}|json=0",
                    a.seq,
                    a.row_hash,
                    hex(row_preimage(&a.row).as_bytes())
                )
                .unwrap();
                chain
                    .head
                    .fold(Some(a.seq), Some(&Value::Str(a.row_hash.clone())));
            }
            "ISO" => {
                let secs: u64 = field(&line, "secs").parse().expect("secs");
                writeln!(out, "ISO|ts={}|json=0", now_iso_at(secs)).unwrap();
            }
            "" => {}
            #[cfg(feature = "vote-quorum")]
            other if vote::request(other, &line, &mut out, &mut flow) => {}
            other => panic!("unknown request {other}"),
        }
    }
    out.flush().unwrap();
}
