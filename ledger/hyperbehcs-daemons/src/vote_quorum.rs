//! `asolaria-vote-quorum-daemon.py` (:4952) decision logic, integer only.
//!
//! Upstream compares vote counts with Python true division (lines 149, 151, 157, 159). The forms
//! here cross-multiply instead; `referee/referee.py` evaluates the upstream expressions and these
//! forms for every (yes, no) with yes + no up to 10,000 and requires equal results.
//!
//! `LAW_WINDOW_END` and `OP_WINDOW_END` (lines 48-49) are carried as upstream defines them. Upstream
//! reports them from `/api/vote-quorum/quorum-rules` (lines 197-200); `is_authorized` (118-123)
//! and `evaluate_quorum` (125-163) do not read them, and neither do the functions here.

/// Line 46 (a Python set; membership only).
pub const QUINTUPLE: [&str; 5] = ["OP-JESSE", "OP-RAYSSA", "OP-AMY", "OP-DAN", "OP-FELIPE"];
/// Line 47 (a Python set; read only as prefixes by `is_authorized`).
pub const AUTHORIZED_CLASSES: [&str; 4] = ["Special-OP", "OP", "Asolaria-PID", "Profile"];
/// Line 48, comment "quintuple 4mo".
pub const LAW_WINDOW_END: &str = "2026-09-23";
/// Line 49, comment "OP class 2mo".
pub const OP_WINDOW_END: &str = "2026-07-23";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Rule {
    Unanimous5,
    Supermajority23,
    SimpleMajority,
    AutoPass,
}

impl Rule {
    /// The `"rule"` string of `QUORUM_RULES`.
    pub const fn name(self) -> &'static str {
        match self {
            Rule::Unanimous5 => "unanimous-5",
            Rule::Supermajority23 => "supermajority-2-3",
            Rule::SimpleMajority => "simple-majority",
            Rule::AutoPass => "auto-pass",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Pool {
    Quintuple,
    Authorized,
    Any,
}

impl Pool {
    /// The `"pool"` string of `QUORUM_RULES`.
    pub const fn name(self) -> &'static str {
        match self {
            Pool::Quintuple => "quintuple",
            Pool::Authorized => "authorized",
            Pool::Any => "any",
        }
    }
}

/// One `QUORUM_RULES` value: `{"rule": ..., "pool": ..., "extra": ...}`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct QuorumRule {
    pub rule: Rule,
    pub pool: Pool,
    /// Present only for `USB_WRITE` (line 54). `evaluate_quorum` reads `rule` and `pool` only (line 127).
    pub extra: Option<&'static str>,
}

const fn spec(rule: Rule, pool: Pool) -> QuorumRule {
    QuorumRule {
        rule,
        pool,
        extra: None,
    }
}

/// Lines 51-61, in upstream order.
pub const QUORUM_RULES: [(&str, QuorumRule); 9] = [
    ("LAW_CHANGE", spec(Rule::Unanimous5, Pool::Quintuple)),
    ("CP_MINT", spec(Rule::Unanimous5, Pool::Quintuple)),
    (
        "USB_WRITE",
        QuorumRule {
            rule: Rule::Supermajority23,
            pool: Pool::Authorized,
            extra: Some("operator-witness-required"),
        },
    ),
    ("DAEMON_OP", spec(Rule::SimpleMajority, Pool::Authorized)),
    ("MEMORY_WRITE", spec(Rule::SimpleMajority, Pool::Authorized)),
    (
        "COSIGN_APPEND",
        spec(Rule::SimpleMajority, Pool::Authorized),
    ),
    ("GHOST_GC", spec(Rule::SimpleMajority, Pool::Authorized)),
    ("HEARTBEAT_ACK", spec(Rule::AutoPass, Pool::Any)),
    ("DEFAULT", spec(Rule::SimpleMajority, Pool::Authorized)),
];

/// Line 126: `QUORUM_RULES.get(decision_class, QUORUM_RULES["DEFAULT"])`; `DEFAULT` is the last
/// entry (line 60).
pub fn rule_for(decision_class: &str) -> QuorumRule {
    let default = &QUORUM_RULES[QUORUM_RULES.len() - 1];
    QUORUM_RULES
        .iter()
        .find(|(class, _)| *class == decision_class)
        .unwrap_or(default)
        .1
}

/// Lines 118-123, including the `AGT-<class>` and `<class>` prefix rule of line 122.
pub fn is_authorized(voter_pid: &str, pool: Pool) -> bool {
    match pool {
        Pool::Quintuple => QUINTUPLE.contains(&voter_pid),
        Pool::Authorized => {
            QUINTUPLE.contains(&voter_pid)
                || AUTHORIZED_CLASSES.iter().any(|c| {
                    voter_pid
                        .strip_prefix("AGT-")
                        .is_some_and(|rest| rest.starts_with(c))
                        || voter_pid.starts_with(c)
                })
        }
        Pool::Any => true,
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Outcome {
    PassAuto,
    PassUnanimous,
    PassSupermajority,
    PassMajority,
    Reject,
    Pending,
}

impl Outcome {
    /// The `status["outcome"]` string.
    pub const fn name(self) -> &'static str {
        match self {
            Outcome::PassAuto => "PASS-AUTO",
            Outcome::PassUnanimous => "PASS-UNANIMOUS",
            Outcome::PassSupermajority => "PASS-SUPERMAJORITY",
            Outcome::PassMajority => "PASS-MAJORITY",
            Outcome::Reject => "REJECT",
            Outcome::Pending => "PENDING",
        }
    }
}

/// One cast-vote row as `votes_for` returns it: its `voter_pid` and `vote` fields.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct CastVote<'a> {
    pub voter_pid: &'a str,
    pub vote: &'a str,
}

/// The `status` dict of lines 134-135 plus its `outcome`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Status {
    pub rule: Rule,
    pub pool: Pool,
    pub yes: u64,
    pub no: u64,
    pub abstain: u64,
    pub total_decisive: u64,
    pub outcome: Outcome,
}

/// Line 149 `yes >= (2 * total) / 3`, as `3 * yes >= 2 * total`.
/// Equal to upstream for every total up to 10,000 (exhaustive) and in every sample up to 2^52.
pub fn supermajority_pass(yes: u64, total: u128) -> bool {
    total
        .checked_mul(2)
        .is_some_and(|two_total| 3 * u128::from(yes) >= two_total)
}

/// Line 151 `no > total / 3`, as `3 * no > total`.
/// Equal to upstream for every total up to 10,000 (exhaustive) and in every sample up to 2^52.
pub fn supermajority_reject(no: u64, total: u128) -> bool {
    3 * u128::from(no) > total
}

/// Line 157 `yes > total / 2`, as `2 * yes > total`.
/// Equal to upstream for every total up to 10,000 (exhaustive) and in every sample up to 2^52.
pub fn majority_pass(yes: u64, total: u128) -> bool {
    2 * u128::from(yes) > total
}

/// Line 159 `no >= total / 2`, as `2 * no >= total`.
/// Equal to upstream for every total up to 10,000 (exhaustive) and in every sample up to 2^52.
pub fn majority_reject(no: u64, total: u128) -> bool {
    2 * u128::from(no) >= total
}

/// Lines 148-155: the supermajority branch for decisive counts (`total` taken in `u128`).
/// Equal to upstream for every yes + no up to 10,000 (exhaustive) and in every sample up to 2^52.
pub fn supermajority_outcome(yes: u64, no: u64) -> Outcome {
    let total = u128::from(yes) + u128::from(no);
    if total >= 3 && supermajority_pass(yes, total) {
        Outcome::PassSupermajority
    } else if total >= 3 && supermajority_reject(no, total) {
        Outcome::Reject
    } else {
        Outcome::Pending
    }
}

/// Lines 156-163: the simple-majority branch for decisive counts (`total` taken in `u128`).
/// Equal to upstream for every yes + no up to 10,000 (exhaustive) and in every sample up to 2^52.
pub fn majority_outcome(yes: u64, no: u64) -> Outcome {
    let total = u128::from(yes) + u128::from(no);
    if total >= 3 && majority_pass(yes, total) {
        Outcome::PassMajority
    } else if total >= 3 && majority_reject(no, total) {
        Outcome::Reject
    } else {
        Outcome::Pending
    }
}

/// Lines 125-163 over the cast-vote rows of one vote, in ledger order.
pub fn evaluate_quorum(decision_class: &str, cast: &[CastVote<'_>]) -> Status {
    let QuorumRule { rule, pool, .. } = rule_for(decision_class);
    let counted = || cast.iter().filter(|v| is_authorized(v.voter_pid, pool));
    let count = |vote: &str| counted().filter(|v| v.vote == vote).count() as u64;
    let yes = count("YES");
    let no = count("NO");
    let abstain = count("ABSTAIN");
    let total = yes + no;
    let outcome = match rule {
        Rule::AutoPass => Outcome::PassAuto,
        Rule::Unanimous5 => {
            let all_yes = QUINTUPLE
                .iter()
                .all(|q| counted().any(|v| v.vote == "YES" && v.voter_pid == *q));
            if all_yes && no == 0 {
                Outcome::PassUnanimous
            } else if no > 0 {
                Outcome::Reject
            } else {
                Outcome::Pending
            }
        }
        Rule::Supermajority23 => supermajority_outcome(yes, no),
        Rule::SimpleMajority => majority_outcome(yes, no),
    };
    Status {
        rule,
        pool,
        yes,
        no,
        abstain,
        total_decisive: total,
        outcome,
    }
}

/// Lines 237-238: a voter has already cast when any cast row of this vote carries its `voter_pid`
/// (authorized or not). Upstream then answers 409 and appends nothing (line 239).
pub fn already_cast(voter_pid: &str, cast: &[CastVote<'_>]) -> bool {
    cast.iter().any(|v| v.voter_pid == voter_pid)
}

/// Line 247: the outcomes for which an outcome row is appended.
pub const fn is_resolving(outcome: Outcome) -> bool {
    matches!(
        outcome,
        Outcome::PassUnanimous
            | Outcome::PassMajority
            | Outcome::PassSupermajority
            | Outcome::PassAuto
            | Outcome::Reject
    )
}

/// Lines 108-116 over the `vote_id` fields of the outcome rows already on the ledger.
pub fn outcome_exists<'a, I>(vote_id: &str, outcome_vote_ids: I) -> bool
where
    I: IntoIterator<Item = &'a str>,
{
    outcome_vote_ids.into_iter().any(|id| id == vote_id)
}

/// Line 247: append an outcome row only for a resolving outcome and only when no outcome row for
/// this `vote_id` exists yet (the idempotence guard of lines 108-116).
pub fn outcome_row_due<'a, I>(outcome: Outcome, vote_id: &str, outcome_vote_ids: I) -> bool
where
    I: IntoIterator<Item = &'a str>,
{
    is_resolving(outcome) && !outcome_exists(vote_id, outcome_vote_ids)
}
