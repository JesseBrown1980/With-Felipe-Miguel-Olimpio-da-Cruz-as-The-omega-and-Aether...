//! The super-gulp tier-3 promoter/consumer decisions: how many oldest files to promote past the archive cap,
//! which lines a consume reads, which envelopes are noise, and the outcome tally. Ports promoter.mjs:12-57 and
//! consumer.mjs:13-85; the file moves, the per-line `JSON.parse`, the bus POST and `convertStageToActual` are
//! boundaries (the consumer here takes each parsed envelope's verb/mode and the converter's outcome as input).

/// The archive cap before promotion (promoter.mjs:12).
pub const ARCHIVE_MAX_FILES: usize = 20;

/// The per-file line cap of one consume (consumer.mjs:13).
pub const MAX_LINES_PER_FILE: usize = 5000;

/// How many of the oldest archive files promote to the super-gulp queue (promoter.mjs:23-29): the overflow.
pub fn promote_count(file_count: usize) -> usize {
    file_count.saturating_sub(ARCHIVE_MAX_FILES)
}

/// How many files a drain moves (promoter.mjs:50): all, or all but the newest `keep_latest_n`.
pub fn drain_count(file_count: usize, keep_latest_n: usize) -> usize {
    if keep_latest_n > 0 {
        file_count.saturating_sub(keep_latest_n)
    } else {
        file_count
    }
}

/// The lines one consume reads (consumer.mjs:29): `raw.split("\n").filter(Boolean).slice(0, 5000)`. Their
/// count is the `lines_scanned` a consume reports (:83).
pub fn scanned_lines(raw: &str) -> Vec<&str> {
    raw.split('\n')
        .filter(|line| !line.is_empty())
        .take(MAX_LINES_PER_FILE)
        .collect()
}

/// True when an envelope is dropped before conversion (consumer.mjs:42-47): empty/shadow/non-ASCII verbs and
/// the heartbeat/milk/fleet-report keep-alive verbs. `verb` is `String(env.verb || "")` (:42).
pub fn is_noise(verb: &str, mode_is_shadow: bool) -> bool {
    if verb.is_empty() {
        return true;
    }
    if mode_is_shadow {
        return true;
    }
    if verb.bytes().any(|b| !(0x20..=0x7e).contains(&b)) {
        return true;
    }
    if verb.contains("HEARTBEAT")
        || verb.contains("fleet-report")
        || verb.contains("behcs.heartbeat")
    {
        return true;
    }
    matches!(
        verb,
        "EVT-ACER-ALIVE-AND-WORKING" | "falcon-milk-status" | "falcon-milk-report"
    )
}

/// The stage-to-actual converter's `final_outcome` for one envelope (consumer.mjs:50-67). `Halt` is also every
/// outcome other than actual/candidate/stage (the `else` of :67).
#[derive(Clone, Copy)]
pub enum Outcome {
    Actual,
    Candidate,
    Stage,
    Halt,
}

/// The outcome tally a tier-3 consume reports (consumer.mjs:85).
#[derive(Default, PartialEq, Eq, Debug)]
pub struct OutcomeCounts {
    pub actual: u64,
    pub candidate: u64,
    pub stage: u64,
    pub halt: u64,
}

/// Tally the converter outcomes of the kept envelopes (consumer.mjs:50-67).
pub fn tally(outcomes: &[Outcome]) -> OutcomeCounts {
    let mut c = OutcomeCounts::default();
    for o in outcomes {
        match o {
            Outcome::Actual => c.actual += 1,
            Outcome::Candidate => c.candidate += 1,
            Outcome::Stage => c.stage += 1,
            Outcome::Halt => c.halt += 1,
        }
    }
    c
}
