//! Hookwall pass library: the uniform entry gate pieces (bigpickle asolaria-hookwall.mjs:27-132).
//!
//! Brought in as a library the integrator calls: `stamp_pid` (ADDRESS), `observation_row` (the
//! tamper-evident CONTENT+INTEGRITY row with its `sha8` `row_hash` chained on `prev_hash`), the
//! three-outcome `decide_verdict` incl. `OBSERVE_ONLY`, `pass` (dual-emit: observation always, with the
//! honest `observed` flag) and `pass_chain` (rolling hash). The SCORE lane (asolaria-score `score`) and
//! the Fischer lane (fischer-kernel `fischerEval`) are other builders' lanes: `pass` calls them through
//! [`GateLanes`] at the points upstream does (:71, :74), and they return their already rendered values
//! so the row is byte-identical regardless of how those lanes format their numbers.

use std::io::Write;
use std::path::Path;

use crate::js::json_quote;
use crate::sha::{sha16, sha8};

/// The only three gate outcomes (asolaria-hookwall.mjs:27-31).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Verdict {
    FarmGem,
    BlockPreserve,
    ObserveOnly,
}

impl Verdict {
    /// Upstream string form.
    pub fn as_str(self) -> &'static str {
        match self {
            Verdict::FarmGem => "FARM_GEM_WITH_GATES",
            Verdict::BlockPreserve => "BLOCK_AND_PRESERVE",
            Verdict::ObserveOnly => "OBSERVE_ONLY",
        }
    }
}

/// Fischer-lane verdict (fischer-kernel.mjs `VERDICT`): the gate reads PROCEED vs BLOCK/REFUTE.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FischerVerdict {
    Proceed,
    Block,
    Refute,
    Other,
}

/// The Fischer lane's result as the gate uses it: the verdict and the rendered ledger `row`
/// (asolaria-hookwall.mjs:74-80 reads `fischer.verdict` and `fischer.row`).
pub struct FischerOutcome {
    pub verdict: FischerVerdict,
    pub row: String,
}

/// SCORE-lane outputs, pre-rendered to strings for a byte-identical row (asolaria-hookwall.mjs:46-51
/// reads `sc.composite`, `sc.l0_real`, `sc.mark`, `sc.reverseRisk`, and `sc.promoted` at :88;
/// asolaria-kernel.mjs:101 reads `sc.provenance`).
pub struct ScoreFields {
    pub composite: String,
    pub l0_real: bool,
    pub mark: String,
    pub reverse_risk: String,
    pub promoted: bool,
    pub provenance: String,
}

/// The SCORE and Fischer lanes the gate calls, supplied by the integrator.
pub trait GateLanes {
    /// `score(pid, content, opts)` (asolaria-hookwall.mjs:71); `content` per [`score_content`].
    fn score(&mut self, pid: &str, content: &str) -> ScoreFields;
    /// `fischerEval(pid, envelope, sc, { prevHash })` (asolaria-hookwall.mjs:74); `prev_hash` is the
    /// gate's `opts.prevHash` as given (`""` when absent).
    fn fischer(
        &mut self,
        pid: &str,
        env: &Envelope,
        sc: &ScoreFields,
        prev_hash: &str,
    ) -> FischerOutcome;
}

fn or_default<'a>(value: &'a str, fallback: &'a str) -> &'a str {
    if value.is_empty() {
        fallback
    } else {
        value
    }
}

/// An envelope entering the gate (asolaria-hookwall.mjs:62-70). `pid` `None` or `""` is stamped by
/// [`stamp_pid`]. The hot lane carries string payloads only; `payload_sha16` `""` counts as absent.
pub struct Envelope<'a> {
    pub pid: Option<&'a str>,
    pub actor: &'a str,
    pub verb: &'a str,
    pub target: &'a str,
    pub payload: Option<&'a str>,
    pub payload_sha16: &'a str,
}

/// PID-stamp an anonymous envelope on entry (asolaria-hookwall.mjs:34-37). The digest is
/// `payload_sha16` when non-empty, otherwise `sha16(JSON.stringify(payload ?? ''))`, which for a string
/// payload is the sha16 of its quoted JSON string literal ([`json_quote`]).
pub fn stamp_pid(env: &Envelope) -> String {
    let digest = if env.payload_sha16.is_empty() {
        sha16(&json_quote(env.payload.unwrap_or("")))
    } else {
        env.payload_sha16.to_string()
    };
    let basis = format!(
        "{}|{}|{}|{}",
        or_default(env.actor, "anon"),
        or_default(env.verb, "event"),
        or_default(env.target, "fabric"),
        digest
    );
    format!("BH.HOOKWALL.{}", sha16(&basis).to_uppercase())
}

/// The content the SCORE lane scores (asolaria-hookwall.mjs:70): the string payload, or
/// `JSON.stringify(verb)` when the envelope has no payload.
pub fn score_content(env: &Envelope) -> String {
    match env.payload {
        Some(payload) => payload.to_string(),
        None => json_quote(env.verb),
    }
}

/// Decide the verdict from observe-only, the Fischer verdict and the score promotion
/// (asolaria-hookwall.mjs:83-92).
pub fn decide_verdict(observe_only: bool, fischer: FischerVerdict, promoted: bool) -> Verdict {
    if observe_only {
        Verdict::ObserveOnly
    } else if matches!(fischer, FischerVerdict::Block | FischerVerdict::Refute) {
        Verdict::BlockPreserve
    } else if promoted && matches!(fischer, FischerVerdict::Proceed) {
        Verdict::FarmGem
    } else {
        Verdict::BlockPreserve
    }
}

/// An observation row and its `row_hash` (asolaria-hookwall.mjs:40-59).
pub struct Observation {
    pub row: String,
    pub row_hash: String,
}

/// The identity fields of an observation row (asolaria-hookwall.mjs:43-46).
pub struct ObsHeader<'a> {
    pub pid: &'a str,
    pub actor: &'a str,
    pub verb: &'a str,
    pub target: &'a str,
}

/// Build the tamper-evident observation row (asolaria-hookwall.mjs:40-59): `row_hash` is `sha8` of the
/// joined base, then appended; `prev_hash` chains the stream. Timestamp supplied by the caller.
pub fn observation_row(
    header: &ObsHeader,
    verdict: Verdict,
    sc: &ScoreFields,
    prev_hash: &str,
    ts: &str,
) -> Observation {
    let base = [
        "HBPv1".to_string(),
        "row=hookwall_observation".to_string(),
        format!("pid={}", header.pid),
        format!("actor={}", or_default(header.actor, "anon")),
        format!("verb={}", or_default(header.verb, "event")),
        format!("target={}", or_default(header.target, "fabric")),
        format!("verdict={}", verdict.as_str()),
        format!("score={}", sc.composite),
        format!("l0_real={}", sc.l0_real),
        format!("mark={}", sc.mark),
        format!("reverse_risk={}", sc.reverse_risk),
        format!("prev_hash={}", or_default(prev_hash, "0000000000000000")),
        format!("ts={ts}"),
        "json=0".to_string(),
        "runtime=0".to_string(),
    ];
    let joined = base.join("|");
    let row_hash = sha8(&joined);
    Observation {
        row: format!("{joined}|row_hash={row_hash}"),
        row_hash,
    }
}

/// The gate options (asolaria-hookwall.mjs:62 `opts`). Under upstream `dryRun` both ledger paths are `None`.
pub struct PassOpts<'a> {
    /// `opts.observeOnly` (:84).
    pub observe_only: bool,
    /// `opts.prevHash` (:74, :95); `""` when absent.
    pub prev_hash: &'a str,
    /// Row timestamp (upstream `new Date().toISOString()`).
    pub ts: &'a str,
    /// `opts.ledgerPath`, the observation append (:98-105).
    pub ledger_path: Option<&'a Path>,
    /// `opts.fischerLedgerPath`, the Fischer row append (:75-80).
    pub fischer_ledger_path: Option<&'a Path>,
}

/// The gate result (asolaria-hookwall.mjs:107-119).
pub struct PassResult {
    pub pid: String,
    pub verdict: Verdict,
    pub pass: bool,
    pub preserved: bool,
    pub score: String,
    pub mark: String,
    pub l0_real: bool,
    pub observation: String,
    pub row_hash: String,
    pub observed: bool,
    pub dual_emit: bool,
}

/// Append `row` and a newline, creating the parent directory first; `true` when the write succeeded
/// (asolaria-hookwall.mjs:76-78, :100-103).
fn append_row(path: &Path, row: &str) -> bool {
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    match std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
    {
        Ok(mut f) => writeln!(f, "{row}").is_ok(),
        Err(_) => false,
    }
}

/// Pass one envelope through the gate (asolaria-hookwall.mjs:62-120): stamp, SCORE, Fischer (its row
/// appended to `fischer_ledger_path`, a write failure leaving the gate unaffected, :75-80), verdict,
/// observation row, and the observation append whose outcome `observed` reports (:98-105).
pub fn pass(env: &Envelope, lanes: &mut dyn GateLanes, opts: &PassOpts) -> PassResult {
    let pid = match env.pid {
        Some(p) if !p.is_empty() => p.to_string(),
        _ => stamp_pid(env),
    };
    let sc = lanes.score(&pid, &score_content(env));
    let fischer = lanes.fischer(&pid, env, &sc, opts.prev_hash);
    if let Some(path) = opts.fischer_ledger_path {
        append_row(path, &fischer.row);
    }
    let verdict = decide_verdict(opts.observe_only, fischer.verdict, sc.promoted);
    let header = ObsHeader {
        pid: &pid,
        actor: env.actor,
        verb: env.verb,
        target: env.target,
    };
    let obs = observation_row(&header, verdict, &sc, opts.prev_hash, opts.ts);
    let observed = match opts.ledger_path {
        Some(path) => append_row(path, &obs.row),
        None => false,
    };

    PassResult {
        pid,
        verdict,
        pass: verdict != Verdict::BlockPreserve,
        preserved: verdict == Verdict::BlockPreserve,
        score: sc.composite,
        mark: sc.mark,
        l0_real: sc.l0_real,
        observation: obs.row,
        row_hash: obs.row_hash,
        observed,
        dual_emit: true,
    }
}

/// Pass a stream, linking each observation's `row_hash` into the next `prev_hash`, starting from
/// `opts.prev_hash` or sixteen zeros (asolaria-hookwall.mjs:123-132).
pub fn pass_chain(
    envs: &[Envelope],
    lanes: &mut dyn GateLanes,
    opts: &PassOpts,
) -> Vec<PassResult> {
    let mut results = Vec::with_capacity(envs.len());
    let mut prev = or_default(opts.prev_hash, "0000000000000000").to_string();
    for env in envs {
        let step = PassOpts {
            prev_hash: &prev,
            ..*opts
        };
        let r = pass(env, lanes, &step);
        prev = r.row_hash.clone();
        results.push(r);
    }
    results
}
