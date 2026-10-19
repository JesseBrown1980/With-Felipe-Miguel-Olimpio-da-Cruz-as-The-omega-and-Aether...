//! Sealed snapshots and the hash chain.
//!
//! A snapshot is the set of HBP rows of one tick, ending in a `CHAIN` row:
//!
//! ```text
//! CHAIN|prev=<tick[k-1]>|state=<sha256 of every row above>|this=<tick[k]>|json=0
//! ```
//!
//! `state = sha256(bytes of every row above CHAIN, each with its newline)` and
//! `tick[k] = sha16(tick[k-1] + "|" + state_hex)`, where `+` is byte concatenation. The rule is the
//! same for every tick including tick 0: `tick[-1]` is the genesis hash,
//! `genesis = sha16("AETHER-UNIVERSE|seed=<seed>|json=0")`, so `tick[0] = sha16(genesis | state0)`
//! and the CHAIN row of tick 0 carries `prev = genesis`. Tick 0's own state is therefore an input
//! to the chain: a forged tick 0 with recomputed `state`, HBI and sidecars cannot keep its `this`,
//! and a forged tick 0 with a recomputed `this` no longer matches the `prev` of tick 1. (An earlier
//! build set `tick[0] = genesis` whatever tick 0 held; a forged tick 0 loaded clean. Retraction
//! beside, not over: see `forged_tick_zero_is_caught` below.) A lie cannot reproduce its own hash:
//! change one byte of one row of one tick and every later `this` changes.
//!
//! Every tick is written to disk (`snap-NNNNNN.hbp` + `.hbi` + `.sha256`), which is what makes time
//! travel a read and not a recalculation.

use crate::hbp::{self, Row};
use crate::sha256::{sha16, sha256_hex};
use std::path::Path;

/// One sealed tick.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Snapshot {
    pub tick: u64,
    /// All rows, the `CHAIN` row last.
    pub rows: Vec<Row>,
    pub prev: String,
    pub state: String,
    pub this: String,
}

/// The root of the chain for a seed.
pub fn genesis_hash(seed: u64) -> String {
    sha16(format!("AETHER-UNIVERSE|seed={seed}|json=0").as_bytes())
}

/// `tick[k] = sha16(prev | state)`.
pub fn chain_link(prev: &str, state: &str) -> String {
    sha16(format!("{prev}|{state}").as_bytes())
}

/// The standard header row of an `.hbp` file of a kind.
pub fn header(kind: &str) -> Row {
    Row::new("AETHER-UNIVERSE").kv("kind", kind).kv("v", 1)
}

/// File stem of a tick: `snap-000042`.
pub fn stem(tick: u64) -> String {
    format!("snap-{tick:06}")
}

impl Snapshot {
    /// Seal a body of rows: compute `state`, link it to `prev`, and append the `CHAIN` row.
    /// For tick 0 `prev` is the genesis hash of the seed whatever the caller passes, and the link
    /// is `sha16(genesis | state0)`: tick 0's state is bound into the chain like any other tick's.
    pub fn seal(tick: u64, seed: u64, prev: &str, mut body: Vec<Row>) -> Snapshot {
        let state = sha256_hex(&hbp::file_bytes(&body));
        let prev = if tick == 0 {
            genesis_hash(seed)
        } else {
            prev.to_string()
        };
        let this = chain_link(&prev, &state);
        body.push(
            Row::new("CHAIN")
                .kv("prev", &prev)
                .kv("state", &state)
                .kv("this", &this),
        );
        Snapshot {
            tick,
            rows: body,
            prev,
            state,
            this,
        }
    }

    /// Rebuild a snapshot from parsed rows, recomputing `state` and `this` and comparing them with
    /// the `CHAIN` row. A snapshot that does not verify is an error, never a guess.
    pub fn from_rows(rows: Vec<Row>) -> Result<Snapshot, String> {
        let chain = rows
            .last()
            .filter(|r| r.tag == "CHAIN")
            .ok_or("last row is not CHAIN")?
            .clone();
        let tick_row = rows.iter().find(|r| r.tag == "TICK").ok_or("no TICK row")?;
        let tick = tick_row.get_u64("t").ok_or("TICK row has no t")?;
        let seed = tick_row.get_u64("seed").ok_or("TICK row has no seed")?;
        let body = &rows[..rows.len() - 1];
        let state = sha256_hex(&hbp::file_bytes(body));
        let prev = chain
            .get("prev")
            .ok_or("CHAIN row has no prev")?
            .to_string();
        let this = chain
            .get("this")
            .ok_or("CHAIN row has no this")?
            .to_string();
        if chain.get("state") != Some(state.as_str()) {
            return Err(format!(
                "tick {tick}: CHAIN state {} does not match the rows ({state})",
                chain.get("state").unwrap_or("none")
            ));
        }
        if tick == 0 && prev != genesis_hash(seed) {
            return Err(format!(
                "tick 0: CHAIN prev {prev} is not the genesis hash {}",
                genesis_hash(seed)
            ));
        }
        let want = chain_link(&prev, &state);
        if this != want {
            return Err(format!("tick {tick}: CHAIN this {this} should be {want}"));
        }
        Ok(Snapshot {
            tick,
            rows,
            prev,
            state,
            this,
        })
    }

    /// Rows of one tag.
    pub fn rows_of<'a>(&'a self, tag: &'a str) -> impl Iterator<Item = &'a Row> + 'a {
        self.rows.iter().filter(move |r| r.tag == tag)
    }
}

/// Seal a free-standing row set (a final seal, not a tick): append `CHAIN|prev|state|this` with
/// `this = sha16(prev | state)`. Returns the rows and `this`.
pub fn seal_rows(prev: &str, mut body: Vec<Row>) -> (Vec<Row>, String) {
    let state = sha256_hex(&hbp::file_bytes(&body));
    let this = chain_link(prev, &state);
    body.push(
        Row::new("CHAIN")
            .kv("prev", prev)
            .kv("state", &state)
            .kv("this", &this),
    );
    (body, this)
}

/// Check the `CHAIN` row of a free-standing row set. Returns `this` on success.
pub fn check_sealed_rows(rows: &[Row]) -> Result<String, String> {
    let chain = rows
        .last()
        .filter(|r| r.tag == "CHAIN")
        .ok_or("last row is not CHAIN")?;
    let state = sha256_hex(&hbp::file_bytes(&rows[..rows.len() - 1]));
    let prev = chain.get("prev").ok_or("CHAIN has no prev")?;
    let this = chain.get("this").ok_or("CHAIN has no this")?;
    if chain.get("state") != Some(state.as_str()) {
        return Err("CHAIN state does not match the rows".to_string());
    }
    if this != chain_link(prev, &state) {
        return Err("CHAIN this does not follow from prev and state".to_string());
    }
    Ok(this.to_string())
}

/// Write a snapshot's file set into `dir`.
pub fn write(dir: &Path, s: &Snapshot) -> std::io::Result<()> {
    hbp::write_set(dir, &stem(s.tick), &s.rows)
}

/// Read one tick from `dir`, verifying both sidecars, the HBI and the chain row.
pub fn read(dir: &Path, tick: u64) -> Result<Snapshot, String> {
    let rows = hbp::read_set(dir, &stem(tick)).map_err(|e| e.to_string())?;
    let s = Snapshot::from_rows(rows)?;
    if s.tick != tick {
        return Err(format!("file for tick {tick} carries tick {}", s.tick));
    }
    Ok(s)
}

/// What a full chain walk found.
#[derive(Debug, PartialEq, Eq)]
pub struct ChainReport {
    pub from: u64,
    pub to: u64,
    pub head: String,
}

/// Walk ticks `0..=upto` from disk: every snapshot must verify, each `prev` must equal the one
/// before it, and no tick may be missing (a missing tick is a failure, not a clean zero).
pub fn verify_chain(dir: &Path, upto: u64) -> Result<ChainReport, String> {
    let mut prev_this: Option<String> = None;
    for k in 0..=upto {
        let s = read(dir, k).map_err(|e| format!("tick {k}: {e}"))?;
        if let Some(p) = &prev_this {
            if &s.prev != p {
                return Err(format!(
                    "tick {k}: prev {} does not link to tick {} head {p}",
                    s.prev,
                    k - 1
                ));
            }
        }
        prev_this = Some(s.this);
    }
    Ok(ChainReport {
        from: 0,
        to: upto,
        head: prev_this.unwrap_or_default(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn body(t: u64, seed: u64) -> Vec<Row> {
        vec![
            header("snapshot"),
            Row::new("TICK").kv("t", t).kv("seed", seed),
            Row::new("NOTE").kv("x", t * 7),
        ]
    }

    fn tmp(name: &str) -> std::path::PathBuf {
        let d = std::env::temp_dir().join(format!(
            "aether-universe-test-{name}-{}",
            std::process::id()
        ));
        let _ = std::fs::remove_dir_all(&d);
        d
    }

    fn make_chain(dir: &Path, n: u64, seed: u64) -> Vec<Snapshot> {
        let mut out: Vec<Snapshot> = Vec::new();
        for t in 0..=n {
            let prev = out.last().map_or("none".to_string(), |s| s.this.clone());
            let s = Snapshot::seal(t, seed, &prev, body(t, seed));
            write(dir, &s).unwrap();
            out.push(s);
        }
        out
    }

    #[test]
    fn chain_rule_holds() {
        let seed = 5;
        let s0 = Snapshot::seal(0, seed, "none", body(0, seed));
        // tick 0 is a link like every other: prev is the genesis hash and its own state is an input
        assert_eq!(s0.prev, genesis_hash(seed));
        assert_eq!(
            s0.this,
            sha16(format!("{}|{}", genesis_hash(seed), s0.state).as_bytes())
        );
        assert_ne!(
            s0.this,
            genesis_hash(seed),
            "tick 0 is not the bare genesis"
        );
        let other0 = Snapshot::seal(0, seed, "none", body(1, seed));
        assert_ne!(
            s0.this, other0.this,
            "a different tick 0 state is a different tick 0 hash"
        );
        let s1 = Snapshot::seal(1, seed, &s0.this, body(1, seed));
        assert_eq!(s1.prev, s0.this);
        assert_eq!(
            s1.this,
            sha16(format!("{}|{}", s0.this, s1.state).as_bytes())
        );
        assert_eq!(s1.rows.last().unwrap().tag, "CHAIN");
        assert_eq!(
            s1.state,
            sha256_hex(&hbp::file_bytes(&s1.rows[..s1.rows.len() - 1]))
        );
    }

    #[test]
    fn from_rows_accepts_a_sealed_snapshot_and_rejects_an_edited_row() {
        let seed = 9;
        let s0 = Snapshot::seal(0, seed, "none", body(0, seed));
        let s1 = Snapshot::seal(1, seed, &s0.this, body(1, seed));
        assert_eq!(Snapshot::from_rows(s1.rows.clone()).unwrap(), s1);
        let mut forged = s1.rows.clone();
        forged[2] = Row::new("NOTE").kv("x", 8);
        assert!(Snapshot::from_rows(forged).is_err());
        // changing the CHAIN row's own `this` is caught too
        let mut forged2 = s1.rows.clone();
        let n = forged2.len() - 1;
        forged2[n] = Row::new("CHAIN")
            .kv("prev", &s1.prev)
            .kv("state", &s1.state)
            .kv("this", "0000000000000000");
        assert!(Snapshot::from_rows(forged2).is_err());
    }

    #[test]
    fn a_stored_chain_verifies_and_a_tampered_byte_is_detected() {
        let dir = tmp("chain");
        let seed = 11;
        let snaps = make_chain(&dir, 12, seed);
        let report = verify_chain(&dir, 12).unwrap();
        assert_eq!(report.head, snaps[12].this);
        assert_eq!(report.to, 12);

        // flip one byte of tick 7's rows
        let f = dir.join(format!("{}.hbp", stem(7)));
        let mut bytes = std::fs::read(&f).unwrap();
        let at = bytes.iter().position(|b| *b == b'x').unwrap();
        bytes[at] = b'y';
        std::fs::write(&f, &bytes).unwrap();
        let err = verify_chain(&dir, 12).unwrap_err();
        assert!(err.contains("tick 7"), "{err}");

        // restore it, then rewrite the sidecar and HBI to agree with the lie: the chain still breaks,
        // because the lie cannot reproduce its own hash
        let forged_rows = {
            let mut rows = hbp::parse_bytes(&bytes).unwrap();
            let last = rows.len() - 1;
            rows[last] = snaps[7].rows[last].clone();
            rows
        };
        hbp::write_set(&dir, &stem(7), &forged_rows).unwrap();
        let err2 = verify_chain(&dir, 12).unwrap_err();
        assert!(err2.contains("tick 7"), "{err2}");
        let _ = std::fs::remove_dir_all(&dir);
    }

    /// The forgery the verifier found (2026-10-18): edit tick 0, recompute CHAIN.state, the HBI and
    /// both sidecars, and keep `this` as it was. With `this[0] = genesis` it loaded clean; with the
    /// state bound into tick 0 it cannot.
    #[test]
    fn forged_tick_zero_is_caught() {
        let dir = tmp("forge0");
        let seed = 31;
        let snaps = make_chain(&dir, 6, seed);
        verify_chain(&dir, 6).unwrap();

        // (a) edited state, CHAIN.state recomputed, HBI and sidecars recomputed, `this` kept
        let mut forged = snaps[0].rows.clone();
        forged[2] = Row::new("NOTE").kv("x", 99);
        let n = forged.len() - 1;
        let state = sha256_hex(&hbp::file_bytes(&forged[..n]));
        forged[n] = Row::new("CHAIN")
            .kv("prev", &snaps[0].prev)
            .kv("state", &state)
            .kv("this", &snaps[0].this);
        hbp::write_set(&dir, &stem(0), &forged).unwrap();
        let err = verify_chain(&dir, 6).unwrap_err();
        assert!(err.contains("tick 0") && err.contains("should be"), "{err}");
        assert!(Snapshot::from_rows(forged).is_err());

        // (b) the same forgery with `this` recomputed as well: tick 0 is now self-consistent, but
        // tick 1 still names the old tick 0 as its prev, so the chain breaks at the link
        let mut forged2 = snaps[0].rows.clone();
        forged2[2] = Row::new("NOTE").kv("x", 99);
        let body_state = sha256_hex(&hbp::file_bytes(&forged2[..n]));
        forged2[n] = Row::new("CHAIN")
            .kv("prev", &snaps[0].prev)
            .kv("state", &body_state)
            .kv("this", chain_link(&snaps[0].prev, &body_state));
        Snapshot::from_rows(forged2.clone()).expect("tick 0 alone is self-consistent");
        hbp::write_set(&dir, &stem(0), &forged2).unwrap();
        let err2 = verify_chain(&dir, 6).unwrap_err();
        assert!(
            err2.contains("tick 1") && err2.contains("does not link"),
            "{err2}"
        );

        // (c) a tick 0 that claims some other prev than the genesis of its seed is refused outright
        let mut forged3 = snaps[0].rows.clone();
        let state3 = sha256_hex(&hbp::file_bytes(&forged3[..n]));
        forged3[n] = Row::new("CHAIN")
            .kv("prev", "none")
            .kv("state", &state3)
            .kv("this", chain_link("none", &state3));
        let err3 = Snapshot::from_rows(forged3).unwrap_err();
        assert!(err3.contains("genesis"), "{err3}");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn a_missing_tick_is_a_failure_not_a_clean_zero() {
        let dir = tmp("missing");
        make_chain(&dir, 5, 1);
        std::fs::remove_file(dir.join(format!("{}.hbp", stem(3)))).unwrap();
        let err = verify_chain(&dir, 5).unwrap_err();
        assert!(err.contains("tick 3") && err.contains("MISSING"), "{err}");
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn a_swapped_pair_of_ticks_breaks_the_links() {
        let dir = tmp("swap");
        let seed = 2;
        let snaps = make_chain(&dir, 4, seed);
        // write tick 2's rows under tick 3's name and vice versa
        std::fs::copy(dir.join(format!("{}.hbp", stem(2))), dir.join("keep.hbp")).unwrap();
        hbp::write_set(&dir, &stem(2), &snaps[3].rows).unwrap();
        hbp::write_set(&dir, &stem(3), &snaps[2].rows).unwrap();
        assert!(verify_chain(&dir, 4).is_err());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
