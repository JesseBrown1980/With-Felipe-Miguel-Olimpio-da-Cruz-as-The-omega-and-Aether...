//! The omni-shannon 12-lens voting decision: each cube-dim lens scores a candidate, the parts collapse to one
//! consensus. Ports omni-shannon-v3-4d12.js:59-134 (`lensVerdict`) and :203-214 (the tally and consensus of
//! `main`).
//!
//! The hard-deny scan is :67-75. Lines :68 (`HD1`) and :74 (`HD-virus`) are ported here. Lines :69-73 are a
//! third-party list that names private people, so they are not vendored or reproduced: they enter as the
//! caller's `operator_deny` predicate, called in their slot, so the hit order stays :68, then :69-73, then :74
//! (see BOUNDARIES.md).

use crate::jstext::{js_lower, or_js};

/// The twelve cube-dim lenses in upstream order (omni-shannon-v3-4d12.js:44-57).
#[derive(Clone, Copy)]
pub enum Dim {
    D2Verb,
    D5Layer,
    D6Gate,
    D8Identity,
    D11Proof,
    D15Device,
    D16Ownership,
    D22Translation,
    D24Intent,
    D7State,
    D14Energy,
    D32NegativeSpace,
}

/// Every lens, in the order `DIMS` lists them.
pub const DIMS: [Dim; 12] = [
    Dim::D2Verb,
    Dim::D5Layer,
    Dim::D6Gate,
    Dim::D8Identity,
    Dim::D11Proof,
    Dim::D15Device,
    Dim::D16Ownership,
    Dim::D22Translation,
    Dim::D24Intent,
    Dim::D7State,
    Dim::D14Energy,
    Dim::D32NegativeSpace,
];

impl Dim {
    /// The upstream dim id (omni-shannon-v3-4d12.js:45-56).
    pub fn id(self) -> &'static str {
        match self {
            Dim::D2Verb => "D2_VERB",
            Dim::D5Layer => "D5_LAYER",
            Dim::D6Gate => "D6_GATE",
            Dim::D8Identity => "D8_IDENTITY",
            Dim::D11Proof => "D11_PROOF",
            Dim::D15Device => "D15_DEVICE",
            Dim::D16Ownership => "D16_OWNERSHIP",
            Dim::D22Translation => "D22_TRANSLATION",
            Dim::D24Intent => "D24_INTENT",
            Dim::D7State => "D7_STATE",
            Dim::D14Energy => "D14_ENERGY",
            Dim::D32NegativeSpace => "D32_NEGATIVE_SPACE",
        }
    }
}

/// A lens or consensus verdict (omni-shannon-v3-4d12.js:75, :132, :204, :210-214).
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Verdict {
    Proceed,
    ProceedWithConditions,
    NeedsChange,
    Halt,
    Refused,
}

/// The fields the lens reads off a candidate (omni-shannon-v3-4d12.js:61-64, :119-120). `json_text` is
/// `JSON.stringify(candidate)` (:61), a boundary input the caller serializes (BOUNDARIES.md); the port applies
/// the `toLowerCase()` of :61 and the `|| 'low'` / `|| ''` defaults and `toLowerCase()` of :62-64.
/// `depends_on_len` is the `depends_on` array's length, `None` when the field is absent.
pub struct Candidate {
    pub json_text: String,
    pub blast_radius: Option<String>,
    pub leverage: Option<String>,
    pub time_to_running: Option<String>,
    pub depends_on_len: Option<usize>,
}

/// One lens result (omni-shannon-v3-4d12.js:75, :133): the verdict, its reason string, and the 0/1/2 score
/// (upstream's HALT result has no score; it adds 0 to the total at :208).
pub struct Lens {
    pub verdict: Verdict,
    pub reason: String,
    pub score: i64,
}

// `/a|b|c/.test(s)` for literal alternatives: true when any alternative occurs in `s`.
fn any(text: &str, needles: &[&str]) -> bool {
    needles.iter().any(|n| text.contains(n))
}

/// Score one candidate on one lens (omni-shannon-v3-4d12.js:59-134). `operator_deny` receives the lowercased
/// candidate text and returns the tags :69-73 push, in order; any hit is the HALT short-circuit of :75.
pub fn lens_verdict(dim: Dim, c: &Candidate, operator_deny: &dyn Fn(&str) -> Vec<String>) -> Lens {
    let text = js_lower(&c.json_text);
    let blast_radius = js_lower(or_js(c.blast_radius.as_deref(), "low"));
    let leverage = js_lower(or_js(c.leverage.as_deref(), ""));
    let tt = js_lower(or_js(c.time_to_running.as_deref(), ""));

    let mut hits: Vec<String> = Vec::new();
    if text.contains("novalum") && text.contains("external") {
        hits.push("HD1".to_string());
    }
    hits.extend(operator_deny(&text));
    if text.contains("virus") {
        hits.push("HD-virus".to_string());
    }
    if !hits.is_empty() {
        return Lens {
            verdict: Verdict::Halt,
            reason: format!("hard_deny:{}", hits.join(",")),
            score: 0,
        };
    }

    let (score, reason): (i64, String) = match dim {
        Dim::D2Verb => {
            let s = if any(&leverage, &["high"]) { 2 } else { 1 };
            (s, format!("capability_score={s}"))
        }
        Dim::D5Layer => {
            let s = if any(&blast_radius, &["low", "none"]) {
                2
            } else {
                0
            };
            (s, format!("constraint_safe_blast={blast_radius}"))
        }
        Dim::D6Gate => {
            let s = if any(&tt, &["minute", "second", "hour"]) {
                2
            } else {
                1
            };
            (s, format!("gate_advanceable_in={tt}"))
        }
        Dim::D8Identity => {
            let s = if any(&text, &["identity", "register", "name"]) {
                2
            } else {
                1
            };
            (s, "identity_fits".to_string())
        }
        Dim::D11Proof => {
            let s = if any(&text, &["caveat"]) { 2 } else { 1 };
            (s, "proof_caveat_present=true".to_string())
        }
        Dim::D15Device => {
            let s = if any(&text, &["tool", "device", "hardware", "firmware"]) {
                2
            } else {
                1
            };
            (s, "device_axis_match".to_string())
        }
        Dim::D16Ownership => {
            let s = if any(&text, &["project", "owned", "lifecycle"]) {
                2
            } else {
                1
            };
            (s, "ownership_axis_match".to_string())
        }
        Dim::D22Translation => {
            let s = if any(
                &text,
                &["reference", "pointer", "bridge", "adapter", "mapping"],
            ) {
                2
            } else {
                1
            };
            (s, "translation_axis_match".to_string())
        }
        Dim::D24Intent => {
            let s = if any(&text, &["plan", "future", "next"]) {
                2
            } else {
                1
            };
            (s, "intent_axis_match".to_string())
        }
        Dim::D7State => {
            let unblocked = c.depends_on_len == Some(0);
            let s = if unblocked { 2 } else { 1 };
            let flag = c.depends_on_len.is_none() || c.depends_on_len == Some(0);
            (s, format!("state_unblocked={flag}"))
        }
        Dim::D14Energy => {
            let s = if any(&tt, &["minute", "second"]) {
                2
            } else {
                1
            };
            (s, "energy_cost_low".to_string())
        }
        Dim::D32NegativeSpace => {
            let s = if !any(&text, &["cosign", "approval", "gate"]) {
                2
            } else {
                1
            };
            (s, "negative_space_clearance".to_string())
        }
    };

    let verdict = if score >= 2 {
        Verdict::Proceed
    } else if score == 1 {
        Verdict::ProceedWithConditions
    } else {
        Verdict::NeedsChange
    };
    Lens {
        verdict,
        reason,
        score,
    }
}

/// The per-verdict tallies across the twelve lenses (omni-shannon-v3-4d12.js:204-209).
#[derive(Default, PartialEq, Eq, Debug)]
pub struct Totals {
    pub proceed: u64,
    pub proceed_with_conditions: u64,
    pub needs_change: u64,
    pub halt: u64,
    pub refused: u64,
}

/// The collapsed vote for one candidate (omni-shannon-v3-4d12.js:204-218).
pub struct VoteResult {
    pub total_score: i64,
    pub max_score: i64,
    pub consensus: Verdict,
    pub totals: Totals,
}

/// Vote one candidate across all twelve lenses and collapse to a consensus (omni-shannon-v3-4d12.js:194-214).
pub fn vote(c: &Candidate, operator_deny: &dyn Fn(&str) -> Vec<String>) -> VoteResult {
    let mut totals = Totals::default();
    let mut total_score = 0i64;
    for dim in DIMS {
        let lens = lens_verdict(dim, c, operator_deny);
        match lens.verdict {
            Verdict::Proceed => totals.proceed += 1,
            Verdict::ProceedWithConditions => totals.proceed_with_conditions += 1,
            Verdict::NeedsChange => totals.needs_change += 1,
            Verdict::Halt => totals.halt += 1,
            Verdict::Refused => totals.refused += 1,
        }
        total_score += lens.score;
    }

    let consensus = if totals.halt > 0 || totals.refused > 0 {
        Verdict::Halt
    } else if totals.needs_change > 0 {
        Verdict::ProceedWithConditions
    } else {
        Verdict::Proceed
    };

    VoteResult {
        total_score,
        max_score: 24,
        consensus,
        totals,
    }
}
