//! Path A kernel loop: the five-primitive composition on one room (bigpickle asolaria-kernel.mjs:91-104).
//!
//! `runPrimitiveLoop` exercises ADDRESS (`room_pid`) -> ROUTE (mock dispatch + forward gate) -> SCORE.
//! SCORE is the caller's lane, called here as upstream calls it, on `(pid, answer_sha16)` (:97). The
//! upstream `dispatchRoom` also writes a `room_answer` outbox row carrying `shannon_H`/`shannon_eff`
//! (`Math.log2`, room-dispatcher.mjs:150-159); no directory of the tree emits that row yet, and it is
//! recorded as an open integration item (see README).

use crate::dispatcher::{agent_type_by_district, hookwall_gate, run_free_agent_mock};
use crate::district_fabric::room_pid;
use crate::hookwall::ScoreFields;
use crate::sha::sha16;

/// The Path A primitive-loop result (asolaria-kernel.mjs:98-103).
pub struct PrimitiveLoopResult {
    pub address: String,
    pub district: String,
    pub idx: u64,
    pub agent_type: String,
    pub hookwall_status: String,
    pub score: String,
    pub provenance: String,
    pub l0_real: bool,
    pub mark: String,
}

/// Run the five-primitive loop on one room (asolaria-kernel.mjs:91-104) with `mock` and `skipGnn`, as
/// upstream dispatches it. The probe question is `dispatchRoom`'s no-inbox default
/// (room-dispatcher.mjs:169); `score(pid, content)` is the SCORE lane, given `sha16(answer)`.
pub fn run_primitive_loop(
    district: &str,
    idx: u64,
    score: &mut dyn FnMut(&str, &str) -> ScoreFields,
) -> PrimitiveLoopResult {
    let pid = room_pid(district, idx);
    let meta = agent_type_by_district(district);
    let agent = run_free_agent_mock(
        meta.type_name,
        &format!("[{district}] default lane probe"),
        &pid,
    );
    let gate = hookwall_gate(agent.self_score_milli * 10);
    let answer_sha16 = sha16(&agent.answer);
    let sc = score(&pid, &answer_sha16);
    PrimitiveLoopResult {
        address: pid,
        district: district.to_string(),
        idx,
        agent_type: meta.type_name.to_string(),
        hookwall_status: gate.status.to_string(),
        score: sc.composite,
        provenance: sc.provenance,
        l0_real: sc.l0_real,
        mark: sc.mark,
    }
}
