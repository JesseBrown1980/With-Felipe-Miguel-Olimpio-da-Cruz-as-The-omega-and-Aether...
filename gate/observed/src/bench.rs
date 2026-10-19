//! The benched GNNs L1, L2 and L4, read on every request and reported, never weighted, and the
//! hashed, chained OBSERVE rows that a separate watcher process recomputes.

use l0_edge::event::Event;
use l0_edge::features::{extract_node_features, model_input_q24};
use l0_edge::model::q24_to_e4;

use crate::Observed;

/// A GNN level with a row in the observation chain.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Level {
    /// EdgeLevelGNN, the one voting level (composite weight 30/85).
    L0,
    /// PrototypeGNN, run 1.
    L1,
    /// ContrastiveGNN, run 1.
    L2,
    /// GSLGNN, the served v2 checkpoint.
    L4,
}

impl Level {
    /// The levels in row order.
    pub const ROWS: [Level; 4] = [Level::L0, Level::L1, Level::L2, Level::L4];
    /// The benched levels.
    pub const BENCHED: [Level; 3] = [Level::L1, Level::L2, Level::L4];

    pub fn name(self) -> &'static str {
        match self {
            Level::L0 => "L0",
            Level::L1 => "L1",
            Level::L2 => "L2",
            Level::L4 => "L4",
        }
    }

    /// The crate that runs the level in process.
    pub fn model(self) -> &'static str {
        match self {
            Level::L0 => "asolaria-l0-edge",
            Level::L1 => "asolaria-l1-prototype",
            Level::L2 => "asolaria-l2-contrastive",
            Level::L4 => "asolaria-l4-gslgnn",
        }
    }

    /// sha256 of the trained checkpoint whose Q24 weights the crate carries (its `src/weights.rs`
    /// header; the files are in `acer/Asolaria/services/gnn-sidecar/`).
    pub fn checkpoint_sha256(self) -> &'static str {
        match self {
            Level::L0 => "a09993369d31ca73345914812e5226b513f5fb9092f43e487a2eafc8c3b621f5",
            Level::L1 => "b4df990138ae215bbdda7c1fcf4902bc0a8cb72d9b7d8944eb965d0fc737dd22",
            Level::L2 => "d371dbbf97ecee87846a87a1a57492e3c03d97168a9b5f5cfcc1fee411488eef",
            Level::L4 => "9e50723b10c9de5c27baa5bc9386340bf72f76bcae2877064a47e4627a86602c",
        }
    }

    /// What the level reads: the request edge `actor -> target` over the observed events, or the
    /// request's pid and payload (asolaria-score.mjs:112-113, 127).
    pub fn input(self) -> &'static str {
        match self {
            Level::L0 | Level::L1 | Level::L2 => "edge",
            Level::L4 => "request",
        }
    }

    /// Whether the composite weights the level. Only L0 votes; promoting a benched level to a weight
    /// is an owner decision, not a code path.
    pub fn voting(self) -> bool {
        self == Level::L0
    }
}

/// Where a reading came from.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Provenance {
    /// Computed in process from this request.
    Real,
    /// No reading: the actor or the target was never observed.
    Absent,
}

impl Provenance {
    pub fn as_str(self) -> &'static str {
        match self {
            Provenance::Real => "real",
            Provenance::Absent => "absent",
        }
    }
}

/// One benched level's reading of one request.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BenchReading {
    pub level: Level,
    pub provenance: Provenance,
    /// Probability of class 1, Q24 in 0..=2^24; `None` when absent.
    pub score_q24: Option<i64>,
}

impl BenchReading {
    /// The score in e4 units, `+p.toFixed(4)` as the served levels render it.
    pub fn score_e4(&self) -> Option<u32> {
        self.score_q24.map(q24_to_e4)
    }
}

/// L1 and L2 on the request edge's two nodes, the six features L0 reads (train_prototype.py:24-35 and
/// train_contrastive.py:25-36 build them in train_baseline.py:31-38's order), and L4 on the request.
pub fn read_benched(
    events: &[Event],
    actor: &str,
    target: &str,
    pid: &str,
    content: &str,
) -> [BenchReading; 3] {
    let nodes = extract_node_features(events);
    let input = |id: &str| nodes.iter().find(|node| node.id == id).map(model_input_q24);
    let edge = input(actor).zip(input(target));
    let on_edge = |level: Level, score: fn(&[i64; 6], &[i64; 6]) -> i64| BenchReading {
        level,
        provenance: if edge.is_some() {
            Provenance::Real
        } else {
            Provenance::Absent
        },
        score_q24: edge.as_ref().map(|(source, target)| score(source, target)),
    };
    [
        on_edge(Level::L1, |s, t| {
            l1_prototype::model::pair_output(s, t).probability_q24
        }),
        on_edge(Level::L2, |s, t| {
            l2_contrastive::edge_output(s, t).anomaly_q24
        }),
        BenchReading {
            level: Level::L4,
            provenance: Provenance::Real,
            score_q24: Some(l4_gslgnn::score_request(pid, content).score_q24),
        },
    ]
}

/// Digests of the two inputs a row is recomputed from.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RowInputs {
    /// sha256 of the events file bytes.
    pub events_sha256: String,
    /// sha256 of the envelope file bytes.
    pub envelope_sha256: String,
}

impl RowInputs {
    pub fn of(events: &[u8], envelope: &[u8]) -> RowInputs {
        RowInputs {
            events_sha256: sha256_hex(events),
            envelope_sha256: sha256_hex(envelope),
        }
    }
}

/// The chain's starting `prev` when no earlier head is given.
pub const GENESIS: &str = "0000000000000000000000000000000000000000000000000000000000000000";

/// The observation chain: one `OBSERVE` row per level in [`Level::ROWS`] order, then one `OBSERVEGATE` row
/// with the sha256 of the printed GATE row. Each row ends `|prev=<64 hex>|row_sha256=<64 hex>|json=0`, where
/// `row_sha256` is the sha256 of the row's text before `|row_sha256=` and `prev` is the previous row's
/// `row_sha256` (`prev` for the first).
pub fn observation_rows(
    observed: &Observed,
    inputs: &RowInputs,
    gate_row: &str,
    prev: &str,
) -> Vec<String> {
    let l0 = BenchReading {
        level: Level::L0,
        provenance: if observed.l0.is_some() {
            Provenance::Real
        } else {
            Provenance::Absent
        },
        score_q24: observed.l0.map(|reading| reading.score_q24),
    };
    let digests = format!(
        "events_sha256={}|envelope_sha256={}",
        inputs.events_sha256, inputs.envelope_sha256
    );
    let mut bodies: Vec<String> = std::iter::once(&l0)
        .chain(observed.benched.iter())
        .map(|reading| {
            let level = reading.level;
            let number = |value: Option<String>| value.unwrap_or_else(|| "-".to_string());
            format!(
                "OBSERVE|level={}|model={}|checkpoint={}|input={}|provenance={}|score_q24={}|score_e4={}|voting={}|{digests}",
                level.name(),
                level.model(),
                level.checkpoint_sha256(),
                level.input(),
                reading.provenance.as_str(),
                number(reading.score_q24.map(|v| v.to_string())),
                number(reading.score_e4().map(|v| v.to_string())),
                u8::from(level.voting()),
            )
        })
        .collect();
    bodies.push(format!(
        "OBSERVEGATE|gate_sha256={}|{digests}",
        sha256_hex(gate_row.as_bytes())
    ));
    let mut prev = prev.to_string();
    bodies
        .into_iter()
        .map(|body| {
            let body = format!("{body}|prev={prev}");
            prev = sha256_hex(body.as_bytes());
            format!("{body}|row_sha256={prev}|json=0")
        })
        .collect()
}

/// What the watcher found.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Watch {
    /// Every row recomputes byte for byte; `head` is the last `row_sha256`.
    Agree { rows: usize, head: String },
    /// The first disagreement: the 1-based row number (0 for the row count) and why.
    Disagree { row: usize, reason: &'static str },
}

/// The watcher: recomputes the rows from `observed`, `inputs` and `gate_row`, chained from the first row's
/// own `prev`, and compares them with `rows_text` line by line.
pub fn watch(observed: &Observed, inputs: &RowInputs, gate_row: &str, rows_text: &str) -> Watch {
    let given: Vec<&str> = rows_text.lines().collect();
    let Some(prev) = given
        .first()
        .and_then(|row| field(row, "prev"))
        .filter(|prev| is_hex64(prev))
    else {
        return Watch::Disagree {
            row: 1,
            reason: "no_prev",
        };
    };
    let expected = observation_rows(observed, inputs, gate_row, prev);
    for (index, (want, got)) in expected.iter().zip(&given).enumerate() {
        if want != got {
            let reason = if !self_hash_holds(got) {
                "row_sha256_differs"
            } else if field(got, "events_sha256") != field(want, "events_sha256") {
                "events_differ"
            } else if field(got, "envelope_sha256") != field(want, "envelope_sha256") {
                "envelope_differs"
            } else if field(got, "prev") != field(want, "prev") {
                "chain_broken"
            } else if field(got, "gate_sha256") != field(want, "gate_sha256") {
                "gate_row_differs"
            } else {
                "reading_differs"
            };
            return Watch::Disagree {
                row: index + 1,
                reason,
            };
        }
    }
    if given.len() != expected.len() {
        return Watch::Disagree {
            row: 0,
            reason: "row_count_differs",
        };
    }
    let head = expected
        .last()
        .and_then(|row| field(row, "row_sha256"))
        .unwrap_or_default()
        .to_string();
    Watch::Agree {
        rows: expected.len(),
        head,
    }
}

fn self_hash_holds(row: &str) -> bool {
    match row.split_once("|row_sha256=") {
        Some((body, rest)) => rest.strip_suffix("|json=0") == Some(&sha256_hex(body.as_bytes())),
        None => false,
    }
}

fn field<'a>(row: &'a str, key: &str) -> Option<&'a str> {
    row.split('|')
        .find_map(|part| part.strip_prefix(key)?.strip_prefix('='))
}

fn is_hex64(text: &str) -> bool {
    text.len() == 64
        && text
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

fn sha256_hex(bytes: &[u8]) -> String {
    shadowcat::hex(&shadowcat::digest(bytes))
}
