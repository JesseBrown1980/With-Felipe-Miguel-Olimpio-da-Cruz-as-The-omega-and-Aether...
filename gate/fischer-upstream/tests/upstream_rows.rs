//! Full FISCHERv1 rows pinned two ways for four inputs (clean PROCEED, MISTAKE_FLAGGED, REFUTE,
//! missing_pid): the vendored FED `render_row` bytes, and the bytes the unchanged Node
//! `fischerEval`/`buildRow` (bigpickle-rebuild @c592599 src/fischer-kernel.mjs:250-280,310-398)
//! wrote for the same envelope with its clock fixed at `FIXED_TS`. `node_xyz` is Node's
//! `hilbertDecode(index, { dimensions: 3, bits: 4 })` of the row's voxel index (src/hilbert.mjs).
//! The FED row turns into the Node row through exactly three format points: the axis field names
//! (lib.rs:432-434 vs mjs:262-264), the flag `proof_gain_q` (lib.rs:344 vs mjs:186) and the voxel
//! form (lib.rs:662-668 vs mjs:22-33), with `row_hash` recomputed over the converted bytes.

#![forbid(unsafe_code)]

use asolaria_server_fischer_eval::{evaluate, render_row, sha8, FischerEnvelope, FischerScore};

const FIXED_TS: &str = "2026-06-24T00:00:00Z";
const PREV_HASH: &str = "0000000000000000";

/// The envelope FED main.rs:189-230 builds from a field line with these fields set.
fn envelope(pid: Option<&str>, verb: &str, tuple: Option<&str>) -> FischerEnvelope {
    FischerEnvelope {
        pid: pid.map(str::to_string),
        actor: "fischer-eval-host8".to_string(),
        verb: verb.to_string(),
        target: "fabric".to_string(),
        payload: String::new(),
        payload_json_true: false,
        hbp_path: Some("x".to_string()),
        sidecar_plan: None,
        ledger_path: None,
        tuple: tuple.map(str::to_string),
        cube_47d: None,
        cosign: None,
        halt_path: None,
        authority_jump: false,
        recursive_consent: false,
        operator_witness_required: false,
        operator_witness: false,
    }
}

fn score(composite: &str, l0_real: bool, g4_state: &str) -> FischerScore {
    FischerScore {
        composite: composite.to_string(),
        l0_real,
        shannon_q: 0,
        shannon_above: false,
        g4_state: g4_state.to_string(),
    }
}

fn node_form(fed_row: &str, node_row: &str, node_xyz: &str) -> String {
    let (prefix, fed_hash) = fed_row.rsplit_once("|row_hash=").expect("row_hash field");
    assert_eq!(fed_hash, sha8(prefix), "FED row_hash is sha8 of its prefix");
    let node_voxel = node_row
        .split('|')
        .find(|f| f.starts_with("voxel_coord="))
        .expect("Node voxel_coord field");
    let fields: Vec<String> = prefix
        .split('|')
        .map(|field| match field.split_once('=') {
            Some(("king_safety_q", v)) => format!("king_safety={}", v),
            Some(("center_gain_q", v)) => format!("center_gain={}", v),
            Some(("proof_gain_q", v)) => format!("proof_gain={}", v),
            Some(("flags", v)) => {
                let flags: Vec<&str> = v
                    .split(',')
                    .map(|f| if f == "proof_gain_q" { "proof_gain" } else { f })
                    .collect();
                format!("flags={}", flags.join(","))
            }
            Some(("voxel_coord", v)) => {
                assert_eq!(
                    v,
                    format!("BH3D:{}", node_xyz),
                    "FED x-y-z == hilbertDecode"
                );
                node_voxel.to_string()
            }
            _ => field.to_string(),
        })
        .collect();
    let converted = fields.join("|");
    format!("{}|row_hash={}", converted, sha8(&converted))
}

fn pin(env: &FischerEnvelope, sc: &FischerScore, fed_row: &str, node_row: &str, node_xyz: &str) {
    let row = render_row(&evaluate(env, sc, false), PREV_HASH, FIXED_TS);
    assert_eq!(row, format!("{}\n", fed_row));
    assert_eq!(node_form(fed_row, node_row, node_xyz), node_row);
}

#[test]
fn clean_proceed_row_pinned() {
    let id = "BH.HOOKWALL.TEST000000000001";
    pin(
        &envelope(Some(id), "tick", Some(id)),
        &score("0.85", true, "UNKNOWN"),
        "FISCHERv1|pid=BH.HOOKWALL.TEST000000000001|move=tick|verdict=PROCEED|cpl=0|candidate_count=2|best_alt=hold_for_analysis|king_safety_q=1.000|center_gain_q=1.000|proof_gain_q=1.000|authority_debt=0|g4_state=UNKNOWN|voxel_coord=BH3D:13-10-7|glyph=FP|flags=proof_gain_q,gnn_observable,reproducible,cube_local|l0_real=1|composite=0.85|prev_hash=0000000000000000|ts=2026-06-24T00:00:00Z|json=0|runtime=0|row_hash=5ca9cf2d",
        "FISCHERv1|pid=BH.HOOKWALL.TEST000000000001|move=tick|verdict=PROCEED|cpl=0|candidate_count=2|best_alt=hold_for_analysis|king_safety=1.000|center_gain=1.000|proof_gain=1.000|authority_debt=0|g4_state=UNKNOWN|voxel_coord=BH3D:2436|glyph=FP|flags=proof_gain,gnn_observable,reproducible,cube_local|l0_real=1|composite=0.85|prev_hash=0000000000000000|ts=2026-06-24T00:00:00Z|json=0|runtime=0|row_hash=74253099",
        "13-10-7",
    );
}

#[test]
fn mistake_flagged_row_pinned() {
    pin(
        &envelope(Some("BH.PIN.MISTAKE"), "write", None),
        &score("0.40", false, "MISTAKE_FLAGGED"),
        "FISCHERv1|pid=BH.PIN.MISTAKE|move=write|verdict=BLOCK|cpl=999|candidate_count=3|best_alt=analyze_in_white_room|king_safety_q=0.000|center_gain_q=0.000|proof_gain_q=0.000|authority_debt=2|g4_state=MISTAKE_FLAGGED|voxel_coord=BH3D:1-4-4|glyph=FB|flags=glsm_mistake_flagged|l0_real=0|composite=0.40|prev_hash=0000000000000000|ts=2026-06-24T00:00:00Z|json=0|runtime=0|row_hash=91c0411e",
        "FISCHERv1|pid=BH.PIN.MISTAKE|move=write|verdict=BLOCK|cpl=999|candidate_count=3|best_alt=analyze_in_white_room|king_safety=0.000|center_gain=0.000|proof_gain=0.000|authority_debt=2|g4_state=MISTAKE_FLAGGED|voxel_coord=BH3D:419|glyph=FB|flags=glsm_mistake_flagged|l0_real=0|composite=0.40|prev_hash=0000000000000000|ts=2026-06-24T00:00:00Z|json=0|runtime=0|row_hash=7d4a5392",
        "1-4-4",
    );
}

#[test]
fn refute_row_pinned() {
    pin(
        &envelope(Some("BH.PIN.REFUTE"), "self_authorize", None),
        &score("0.97", false, "UNKNOWN"),
        "FISCHERv1|pid=BH.PIN.REFUTE|move=self_authorize|verdict=REFUTE|cpl=999|candidate_count=2|best_alt=halt_and_request_human_apex|king_safety_q=0.000|center_gain_q=0.000|proof_gain_q=0.000|authority_debt=2|g4_state=UNKNOWN|voxel_coord=BH3D:4-6-4|glyph=FR|flags=refuted_pattern|l0_real=0|composite=0.97|prev_hash=0000000000000000|ts=2026-06-24T00:00:00Z|json=0|runtime=0|row_hash=d111a891",
        "FISCHERv1|pid=BH.PIN.REFUTE|move=self_authorize|verdict=REFUTE|cpl=999|candidate_count=2|best_alt=halt_and_request_human_apex|king_safety=0.000|center_gain=0.000|proof_gain=0.000|authority_debt=2|g4_state=UNKNOWN|voxel_coord=BH3D:375|glyph=FR|flags=refuted_pattern|l0_real=0|composite=0.97|prev_hash=0000000000000000|ts=2026-06-24T00:00:00Z|json=0|runtime=0|row_hash=38febcab",
        "4-6-4",
    );
}

/// envelope.pid absent. FED `evaluate` renders pid=UNKNOWN (lib.rs:153-158,188-203); the Node row
/// carries the pid argument, here 'UNKNOWN' (asolaria-hookwall.mjs:67,74 passes its stamped pid).
/// The host8 route never reaches this row: main.rs:193-195 always supplies a pid.
#[test]
fn missing_pid_row_pinned() {
    pin(
        &envelope(None, "tick", None),
        &score("0", false, "UNKNOWN"),
        "FISCHERv1|pid=UNKNOWN|move=tick|verdict=BLOCK|cpl=500|candidate_count=2|best_alt=hold_for_analysis|king_safety_q=0.000|center_gain_q=0.000|proof_gain_q=0.000|authority_debt=2|g4_state=UNKNOWN|voxel_coord=BH3D:5-7-5|glyph=FB|flags=missing_pid|l0_real=0|composite=0|prev_hash=0000000000000000|ts=2026-06-24T00:00:00Z|json=0|runtime=0|row_hash=0e8fbb42",
        "FISCHERv1|pid=UNKNOWN|move=tick|verdict=BLOCK|cpl=500|candidate_count=2|best_alt=hold_for_analysis|king_safety=0.000|center_gain=0.000|proof_gain=0.000|authority_debt=2|g4_state=UNKNOWN|voxel_coord=BH3D:370|glyph=FB|flags=missing_pid|l0_real=0|composite=0|prev_hash=0000000000000000|ts=2026-06-24T00:00:00Z|json=0|runtime=0|row_hash=409c5796",
        "5-7-5",
    );
}
