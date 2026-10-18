//! tests/fixtures/hookwall.hbp: the Shannon-stage hookwall plane (pipeline/hookwall.mjs:9-87),
//! step by step on one plane's counters, with the referee's TEST STAND-IN for `enrichEnvelope`
//! (quant-bus.mjs is on no disk; the stand-in is not upstream behaviour).

mod common;

use common::{rows, token};
use whiteroom_shannon::hookwall_plane::{
    EnvelopeIn, EnvelopeOut, HookwallPlane, PlaneState, QuantBus, SelfTestError,
};
use whiteroom_shannon::jsvalue::JsValue;

/// The referee's `standin_enrich`: intent_sha16 passed through, triple_quant `''` when
/// `room_id % 3 == 0` (Python's floored modulo) else `T<room_id>:<granted>`, authority_quant
/// `'A' + intent_sha16[0..4]` on a grant else `undefined`.
struct StandIn;

impl QuantBus for StandIn {
    fn enrich_envelope(&mut self, env: &EnvelopeIn) -> EnvelopeOut {
        let triple = if env.room_id.rem_euclid(3) == 0 {
            String::new()
        } else {
            format!("T{}:{}", env.room_id, env.granted)
        };
        let authority = if env.quintuple_authority {
            JsValue::String(format!("A{}", &env.intent_sha16[..4]))
        } else {
            JsValue::Undefined
        };
        EnvelopeOut {
            intent_sha16: JsValue::String(env.intent_sha16.clone()),
            triple_quant: JsValue::String(triple),
            authority_quant: authority,
        }
    }
}

#[test]
fn every_step_matches_the_referee() {
    let mut plane = HookwallPlane::new();
    let mut bus = StandIn;
    let mut n = 0;
    for row in rows("hookwall.hbp").iter().filter(|r| r.kind == "HW") {
        let got = match row.raw("call") {
            "request" => plane.request_live(&row.value("room"), &row.value("intent"), &mut bus),
            "grant" => plane.grant_live(
                &row.value("room"),
                &row.value("intent"),
                &row.value("auth"),
                &mut bus,
            ),
            _ => plane.fire_hookwall(&row.value("tuple"), &mut bus),
        };
        match row.opt("result") {
            Some("refused") => assert!(got.is_err(), "{}", row.line),
            _ => {
                let live = got.unwrap_or_else(|e| panic!("{}: {e:?}", row.line));
                assert_eq!(live.granted, row.raw("granted") == "1", "{}", row.line);
                assert_eq!(live.frame.tag, row.raw("tag"));
                assert_eq!(
                    token(&JsValue::Array(live.frame.fields)),
                    row.raw("fields"),
                    "{}",
                    row.line
                );
            }
        }
        let want = PlaneState {
            requests: row.int("requests"),
            denials: row.int("denials"),
            grants: row.int("grants"),
        };
        assert_eq!(plane.state(), want, "{}", row.line);
        n += 1;
    }
    assert_eq!(n, 400);
}

#[test]
fn self_test_passes_and_counts_like_upstream() {
    // selfTest (:68-77): one denial, then one quintuple grant.
    let mut plane = HookwallPlane::new();
    assert_eq!(plane.self_test(&mut StandIn), Ok(()));
    assert_eq!(
        plane.state(),
        PlaneState {
            requests: 2,
            denials: 1,
            grants: 1
        }
    );
    let _ = SelfTestError::DefaultDenyBreach;
}
