//! Room dispatcher: agent-type map, the deterministic mock free agent, PID-driven room rotation,
//! the hookwall forward gate and prism forwarding (bigpickle room-dispatcher.mjs:29-217).
//!
//! `runFreeAgent` is brought in mock mode only; live mode spawns the opencode CLI per unique room
//! (room-dispatcher.mjs:67-91) and is the lane boundary, not ported. `gnnInfer` (HTTP, :124-134),
//! `reverseGain` and `shannonParts` (`Math.log2`/`toFixed`, :143-159) are not in this crate, and no
//! directory of the tree yet emits `dispatchRoom`'s `room_answer` outbox row (:162-207), which needs
//! them; this module brings its ADDRESS/ROUTE pieces and the mock agent. The `room_answer` row is an
//! open integration item (see README).

use crate::district_fabric::room_pid;
use crate::hbp::{field, parse_pipe_row};
use crate::js::utf16_prefix;
use crate::revolver::{PidChainRevolver, LANE_CYCLE};
use crate::sha::{sha16, sha8};

/// Agent type for a district (room-dispatcher.mjs:29-36).
pub struct AgentType {
    pub type_name: &'static str,
    pub spawns: bool,
    pub role: &'static str,
}

/// Which agent type each district hosts (room-dispatcher.mjs:29-36; unknown -> generic, no spawn).
pub fn agent_type_by_district(district: &str) -> AgentType {
    match district {
        "rotator" => AgentType {
            type_name: "pid-rotator",
            spawns: false,
            role: "rotate PIDs through rooms; assign work, do not answer",
        },
        "prism" => AgentType {
            type_name: "prism-relay",
            spawns: false,
            role: "forward-dispatch + reverse-collect; pure routing",
        },
        "engineering" => AgentType {
            type_name: "opencode-coder",
            spawns: true,
            role: "real free opencode agent — reads question, writes code/answer",
        },
        "white-room" => AgentType {
            type_name: "mint-critic",
            spawns: true,
            role: "clean-room critic — classify genius vs mistake from 0",
        },
        "gnn-feed" => AgentType {
            type_name: "gnn-scorer",
            spawns: false,
            role: "score edges via forward + reverse-gain GNN",
        },
        "council" => AgentType {
            type_name: "vote-agent",
            spawns: true,
            role: "vote/review — supervisor decision",
        },
        _ => AgentType {
            type_name: "generic",
            spawns: false,
            role: "",
        },
    }
}

/// The deterministic mock free agent (room-dispatcher.mjs:58-66). `self_score_milli` is the upstream
/// `parseInt(seed.slice(0,4),16) % 1000` (upstream then divides by 1000); its e4 value is ten times it.
pub struct MockAgent {
    pub ok: bool,
    pub mock: bool,
    pub agent_type: String,
    pub answer: String,
    pub self_score_milli: u32,
}

/// Run the mock free agent: a sha-derived deterministic answer and self score (room-dispatcher.mjs:58-66).
/// The answer quotes `String(question).slice(0, 60)`, 60 UTF-16 code units, as Node writes it to UTF-8.
pub fn run_free_agent_mock(agent_type: &str, question: &str, pid: &str) -> MockAgent {
    let seed = sha16(&format!("{agent_type}|{pid}|{question}"));
    let score = u32::from_str_radix(&seed[0..4], 16).expect("4 hex") % 1000;
    let q = utf16_prefix(question, 60);
    MockAgent {
        ok: true,
        mock: true,
        agent_type: agent_type.to_string(),
        answer: format!("[{agent_type}] {seed}: deterministic response for \"{q}\""),
        self_score_milli: score,
    }
}

/// Live free-agent mode is the lane boundary (room-dispatcher.mjs:67-91 spawns the opencode CLI per
/// unique room). It is not ported into the hot lane; this returns the boundary note.
pub fn run_free_agent_live_boundary() -> &'static str {
    "live mode is the boundary: room-dispatcher.mjs:67-91 spawns opencode per unique room; not ported"
}

/// Forward-gate threshold in e4 units, 1/10000 (room-dispatcher.mjs:138 `score >= 0.72`).
pub const HOOKWALL_PASS_THRESHOLD_E4: u32 = 7200;

/// Hookwall forward gate verdict (room-dispatcher.mjs:136-141).
pub struct Gate {
    pub pass: bool,
    pub status: &'static str,
}

/// Forward gate (room-dispatcher.mjs:136-141) on a score in e4 units, the tree's SCORE-lane unit. The
/// mock score `k/1000` enters as `10k` (`10k >= 7200` exactly when `k/1000 >= 0.72`). A binary64 score
/// `s` in [0, 1] from another lane enters as the floor of `s * 10000` after that product is rounded to
/// 53 bits, nearest-even, on the integer mantissa (the value V8's `Math.floor(score * 10000)` gives,
/// float running in that lane). That is `>= 7200` exactly when the bit pattern of `s` is
/// `>= 0x3FE7_0A3D_70A3_D70A` (binary64 `0.72` = 6485183463413514 / 2^53), i.e. when upstream's
/// `score >= 0.72` holds. The floor of the exact, unrounded product is 7199 at that `s`; a `toFixed(4)`
/// conversion maps binary64 `0.71996` to 7200.
pub fn hookwall_gate(score_e4: u32) -> Gate {
    if score_e4 >= HOOKWALL_PASS_THRESHOLD_E4 {
        Gate {
            pass: true,
            status: "FARM_GEM_WITH_GATES",
        }
    } else {
        Gate {
            pass: false,
            status: "BLOCK_AND_PRESERVE",
        }
    }
}

/// The rotor `rotateRoom` uses for a district, anchored `ASOLARIA-DISTRICT-<UPPER>` (room-dispatcher.mjs:99-105).
/// Upstream keeps one per district in a module-level map; the caller holds the returned rotor.
pub fn revolver_for(district: &str) -> PidChainRevolver {
    PidChainRevolver::new(&format!("ASOLARIA-DISTRICT-{}", district.to_uppercase()))
        .expect("the anchor is non-empty")
}

/// One room rotation (room-dispatcher.mjs:106-121).
pub struct Rotation {
    pub district: String,
    pub idx: u64,
    pub agent_pid: String,
    pub room_pid: String,
    pub lane: String,
    pub rotation: u64,
    pub stamp_row: String,
}

/// Rotate the next PID through a room and build the `row=rotation` stamp (room-dispatcher.mjs:106-121),
/// with the timestamp supplied by the caller. The filesystem append (`appendFileSync`, :116-118) is the
/// integrator's lane.
pub fn rotate_row(
    rev: &mut PidChainRevolver,
    district: &str,
    room_count: u64,
    ts: &str,
) -> Rotation {
    let rotation = rev.counter;
    let agent_pid = rev.next_pid();
    let idx = rotation % room_count;
    let room_addr = room_pid(district, idx);
    let lane = LANE_CYCLE[(rotation % LANE_CYCLE.len() as u64) as usize].to_string();
    let stamp_row = format!(
        "HBPv1|row=rotation|agent_pid={agent_pid}|room_pid={room_addr}|district={district}|idx={idx}|lane={lane}|rotation={rotation}|state=assigned|ts={ts}|json=0|row_hash={}",
        sha8(&format!("{agent_pid}{rotation}"))
    );
    Rotation {
        district: district.to_string(),
        idx,
        agent_pid,
        room_pid: room_addr,
        lane,
        rotation,
        stamp_row,
    }
}

/// Build the `row=prism_forward` route row from an answer row (room-dispatcher.mjs:210-217), timestamp
/// supplied by the caller. An absent field renders as `undefined` (template literal, :214); the
/// `row_hash` reads `fields.pid || ''`. The filesystem append (:215) is the integrator's lane.
pub fn prism_forward_row(answer_row: &str, prism_idx: u64, ts: &str) -> String {
    let row = parse_pipe_row(answer_row);
    let shown = |key: &str| field(&row, key).unwrap_or("undefined");
    format!(
        "HBPv1|row=prism_forward|from_pid={}|from_district={}|gnn_status={}|gnn_score={}|shannon_H={}|answer_sha16={}|ts={ts}|json=0|row_hash={}",
        shown("pid"),
        shown("district"),
        shown("gnn_status"),
        shown("gnn_score"),
        shown("shannon_H"),
        shown("answer_sha16"),
        sha8(&format!("{}prism{prism_idx}", field(&row, "pid").unwrap_or("")))
    )
}
