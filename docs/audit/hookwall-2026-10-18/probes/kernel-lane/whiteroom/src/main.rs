//! whiteroom-shannon hookwall_plane: forged quintuple authority probes.

use whiteroom_shannon::hookwall_plane::{EnvelopeIn, EnvelopeOut, HookwallPlane, QuantBus};
use whiteroom_shannon::jsvalue::JsValue;

/// Records every envelope the plane hands `enrichEnvelope`, so the probe shows what the bus sees.
#[derive(Default)]
struct Recorder {
    seen: Vec<EnvelopeIn>,
}

impl QuantBus for Recorder {
    fn enrich_envelope(&mut self, env: &EnvelopeIn) -> EnvelopeOut {
        self.seen.push(env.clone());
        EnvelopeOut {
            intent_sha16: JsValue::String(env.intent_sha16.clone()),
            triple_quant: JsValue::str("T"),
            authority_quant: JsValue::str("A"),
        }
    }
}

fn arr(v: Vec<JsValue>) -> JsValue {
    JsValue::Array(v)
}

fn auth(signers: JsValue, window_ok: JsValue) -> JsValue {
    JsValue::object(vec![("signers", signers), ("window_ok", window_ok)])
}

fn strs(xs: &[&str]) -> JsValue {
    arr(xs.iter().map(|s| JsValue::str(s)).collect())
}

fn main() {
    let t = JsValue::Bool(true);
    let cases: Vec<(&str, JsValue)> = vec![
        ("five fake strings a..e", auth(strs(&["a", "b", "c", "d", "e"]), t.clone())),
        ("same signer x5", auth(strs(&["OP-anything"; 5]), t.clone())),
        ("five empty strings", auth(strs(&["", "", "", "", ""]), t.clone())),
        ("five nulls", auth(arr(vec![JsValue::Null; 5]), t.clone())),
        ("five undefined", auth(arr(vec![JsValue::Undefined; 5]), t.clone())),
        ("five zeros", auth(arr(vec![JsValue::int(0); 5]), t.clone())),
        ("five empty arrays", auth(arr(vec![arr(vec![]); 5]), t.clone())),
        ("five forged sig objs", auth(arr(vec![JsValue::object(vec![("sig", JsValue::str("forged"))]); 5]), t.clone())),
        ("1000 signers", auth(arr(vec![JsValue::str("z"); 1000]), t.clone())),
        // controls: these should be denied by the plane's own predicate
        ("CTRL four signers", auth(strs(&["a", "b", "c", "d"]), t.clone())),
        ("CTRL window_ok \"true\"", auth(strs(&["a", "b", "c", "d", "e"]), JsValue::str("true"))),
        ("CTRL window_ok 1", auth(strs(&["a", "b", "c", "d", "e"]), JsValue::int(1))),
        ("CTRL window_ok false", auth(strs(&["a", "b", "c", "d", "e"]), JsValue::Bool(false))),
        ("CTRL signers string", auth(JsValue::str("abcde"), t.clone())),
    ];
    let room = JsValue::int(7);
    let intent = JsValue::str("exfiltrate_sovereignty_drive");
    for (label, a) in &cases {
        let mut plane = HookwallPlane::new();
        let mut bus = Recorder::default();
        let live = plane.grant_live(&room, &intent, a, &mut bus).unwrap();
        let sent = bus.seen.last().unwrap();
        println!(
            "W grant_live {label:24} granted={} tag={} signer_field={:?} state={:?} bus_saw(granted={},quintuple_authority={})",
            live.granted,
            live.frame.tag,
            live.frame.fields.get(3).map(|v| v.to_js_string()),
            plane.state(),
            sent.granted,
            sent.quintuple_authority
        );
    }
    // fire_hookwall path: a tuple carrying a forged quintupleAuth.
    let tuple = JsValue::object(vec![
        ("room_id", JsValue::int(3)),
        ("intent", JsValue::str("rm -rf /")),
        ("quintupleAuth", auth(strs(&["OP-JESSE", "OP-JESSE", "x", "y", "z"]), t.clone())),
    ]);
    let mut plane = HookwallPlane::new();
    let mut bus = Recorder::default();
    let live = plane.fire_hookwall(&tuple, &mut bus).unwrap();
    println!(
        "W fire_hookwall forged tuple granted={} tag={} fields={:?} state={:?}",
        live.granted,
        live.frame.tag,
        live.frame.fields.iter().map(|v| v.to_js_string()).collect::<Vec<_>>(),
        plane.state()
    );
    // self_test exactly as shipped.
    let mut plane = HookwallPlane::new();
    println!("W self_test={:?} state={:?}", plane.self_test(&mut Recorder::default()), plane.state());
    // EnvelopeIn has no field for signer identities: what the bus can see on a grant.
    println!("W EnvelopeIn on grant = {:?}", bus.seen.last().unwrap());
}
