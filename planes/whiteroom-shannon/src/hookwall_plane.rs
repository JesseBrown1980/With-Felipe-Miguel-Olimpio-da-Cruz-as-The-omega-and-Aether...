//! The Shannon-stage hookwall plane of Shannon-and-the-gnns-stage@32f9670 `pipeline/hookwall.mjs`
//! (:9-87): the default-deny live gate with its request, denial and grant counters, and the
//! `HKW` / `HKG` frames it emits.
//!
//! The plane imports `enrichEnvelope` (`../quant-bus.mjs`) and `encodeFrame` (`../bpi-codec.mjs`),
//! which are on no disk and in no repository history (WIRING-MAP section d item 2). Here
//! `enrichEnvelope` is a [`QuantBus`] the operator supplies, and the plane returns the argument
//! list it hands `encodeFrame` ([`FrameArgs`]) instead of an encoded frame. The grant envelope's
//! `authority` object (:45) carries third-party data and is not reproduced: [`EnvelopeIn`] marks
//! where it is attached, and the operator's [`QuantBus`] supplies its content. `wire(bus)`
//! (:94-97) registers on a bus object that has no counterpart here.

use crate::jsvalue::{number_or_zero, DomainError, JsValue};
use crate::sha::sha256hex;

/// `state().plane`.
pub const PLANE: &str = "hookwall";
/// `state().default_policy`.
pub const DEFAULT_POLICY: &str = "descriptor_only_unless_quintuple";
/// The fourth field of a denial frame (:25).
pub const DENY_REASON: &str = "default_deny_quintuple_required";

/// `intentSha16(intent)` (:13-15).
pub fn intent_sha16(intent: &JsValue) -> String {
    sha256hex(&intent.to_js_string())[..16].to_string()
}

/// The envelope the plane hands `enrichEnvelope` (:20, :41-46).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EnvelopeIn {
    /// `room_id: Number(roomId) || 0`.
    pub room_id: i64,
    /// `intent_sha16: intentSha16(intent)`.
    pub intent_sha16: String,
    /// `granted`: 0 on a denial, 1 on a grant.
    pub granted: u8,
    /// True on a grant, where upstream attaches its quintuple `authority` object (:45); the
    /// object's keys and values are the operator's and come from the [`QuantBus`].
    pub quintuple_authority: bool,
}

/// The fields of the enriched envelope the plane reads (:23, :26-27, :49, :52-53).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EnvelopeOut {
    /// `env.intent_sha16`.
    pub intent_sha16: JsValue,
    /// `env.triple_quant`.
    pub triple_quant: JsValue,
    /// `env.authority_quant`.
    pub authority_quant: JsValue,
}

/// `enrichEnvelope` of `../quant-bus.mjs`, supplied by the operator (not on disk).
pub trait QuantBus {
    /// `enrichEnvelope(env)`.
    fn enrich_envelope(&mut self, env: &EnvelopeIn) -> EnvelopeOut;
}

/// The arguments of `encodeFrame(tag, fields)` (:21-28, :47-54).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct FrameArgs {
    /// `'HKW'` (denial) or `'HKG'` (grant).
    pub tag: &'static str,
    /// The six fields, as JavaScript values.
    pub fields: Vec<JsValue>,
}

/// `{ granted, frame }` of `requestLive` / `grantLive`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Live {
    /// `granted`.
    pub granted: bool,
    /// The `encodeFrame` arguments.
    pub frame: FrameArgs,
}

/// `state()` (:58-66) without its two constant fields ([`PLANE`], [`DEFAULT_POLICY`]).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct PlaneState {
    /// `_requests`.
    pub requests: u64,
    /// `_denials`.
    pub denials: u64,
    /// `_grants`.
    pub grants: u64,
}

/// Why `selfTest` throws (:70, :75).
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SelfTestError {
    /// `'default-deny breach'`.
    DefaultDenyBreach,
    /// `'quintuple grant failed'`.
    QuintupleGrantFailed,
}

/// The plane's module state: one per process upstream (the three counters at :9-11).
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct HookwallPlane {
    state: PlaneState,
}

fn or_empty(v: &JsValue) -> JsValue {
    if v.truthy() {
        v.clone()
    } else {
        JsValue::str("")
    }
}

/// `Array.isArray(signers) && signers.length >= 5 && quintupleAuth?.window_ok === true` (:34-35),
/// with `signers.length` when it holds.
fn quintuple_signers(auth: &JsValue) -> Option<usize> {
    match auth.get("signers") {
        JsValue::Array(signers)
            if signers.len() >= 5 && matches!(auth.get("window_ok"), JsValue::Bool(true)) =>
        {
            Some(signers.len())
        }
        _ => None,
    }
}

impl HookwallPlane {
    /// A plane with zero counters (module load).
    pub fn new() -> Self {
        Self::default()
    }

    /// `state()` (:58-66).
    pub fn state(&self) -> PlaneState {
        self.state
    }

    /// `requestLive(roomId, intent)` (:17-30).
    pub fn request_live(
        &mut self,
        room_id: &JsValue,
        intent: &JsValue,
        bus: &mut impl QuantBus,
    ) -> Result<Live, DomainError> {
        let number = number_or_zero(room_id)?;
        self.state.requests += 1;
        self.state.denials += 1;
        Ok(self.deny_frame(room_id, number, intent, bus))
    }

    fn deny_frame(
        &mut self,
        room_id: &JsValue,
        number: i64,
        intent: &JsValue,
        bus: &mut impl QuantBus,
    ) -> Live {
        let env = bus.enrich_envelope(&EnvelopeIn {
            room_id: number,
            intent_sha16: intent_sha16(intent),
            granted: 0,
            quintuple_authority: false,
        });
        Live {
            granted: false,
            frame: FrameArgs {
                tag: "HKW",
                fields: vec![
                    room_id.clone(),
                    env.intent_sha16,
                    JsValue::int(0),
                    JsValue::str(DENY_REASON),
                    or_empty(&env.triple_quant),
                    or_empty(&env.authority_quant),
                ],
            },
        }
    }

    /// `grantLive(roomId, intent, quintupleAuth)` (:32-56). A refused grant counts one request
    /// and one denial here and another of each in the `requestLive` it returns (:33, :37-38).
    pub fn grant_live(
        &mut self,
        room_id: &JsValue,
        intent: &JsValue,
        quintuple_auth: &JsValue,
        bus: &mut impl QuantBus,
    ) -> Result<Live, DomainError> {
        let number = number_or_zero(room_id)?;
        self.state.requests += 1;
        let Some(signer_count) = quintuple_signers(quintuple_auth) else {
            self.state.denials += 1;
            self.state.requests += 1;
            self.state.denials += 1;
            return Ok(self.deny_frame(room_id, number, intent, bus));
        };
        self.state.grants += 1;
        let env = bus.enrich_envelope(&EnvelopeIn {
            room_id: number,
            intent_sha16: intent_sha16(intent),
            granted: 1,
            quintuple_authority: true,
        });
        Ok(Live {
            granted: true,
            frame: FrameArgs {
                tag: "HKG",
                fields: vec![
                    room_id.clone(),
                    env.intent_sha16,
                    JsValue::int(1),
                    JsValue::int(signer_count as i64),
                    or_empty(&env.triple_quant),
                    or_empty(&env.authority_quant),
                ],
            },
        })
    }

    /// `fireHookwall(tuple, _ctx)` (:81-87).
    pub fn fire_hookwall(
        &mut self,
        tuple: &JsValue,
        bus: &mut impl QuantBus,
    ) -> Result<Live, DomainError> {
        let zero = JsValue::int(0);
        let unspecified = JsValue::str("unspecified");
        // (tuple && tuple.room_id) ?? 0
        let room_id = if tuple.truthy() {
            tuple.get("room_id")
        } else {
            tuple
        }
        .nullish_or(&zero);
        // (tuple && (tuple.intent || tuple.kind)) || 'unspecified'
        let intent = if tuple.truthy() {
            tuple.get("intent").or(tuple.get("kind"))
        } else {
            tuple
        }
        .or(&unspecified);
        // tuple && tuple.quintupleAuth
        let auth = if tuple.truthy() {
            tuple.get("quintupleAuth")
        } else {
            tuple
        };
        let (room_id, intent, auth) = (room_id.clone(), intent.clone(), auth.clone());
        if auth.truthy() {
            self.grant_live(&room_id, &intent, &auth, bus)
        } else {
            self.request_live(&room_id, &intent, bus)
        }
    }

    /// `selfTest()` (:68-77): `{ ok: true, denied: 1, granted: 1 }` on success.
    pub fn self_test(&mut self, bus: &mut impl QuantBus) -> Result<(), SelfTestError> {
        let room = JsValue::int(0);
        let intent = JsValue::str("test_intent");
        let r0 = self
            .request_live(&room, &intent, bus)
            .expect("room id 0 is an integer");
        if r0.granted {
            return Err(SelfTestError::DefaultDenyBreach);
        }
        let auth = JsValue::object(vec![
            (
                "signers",
                JsValue::Array(["a", "b", "c", "d", "e"].map(JsValue::str).to_vec()),
            ),
            ("window_ok", JsValue::Bool(true)),
        ]);
        let r1 = self
            .grant_live(&room, &intent, &auth, bus)
            .expect("room id 0 is an integer");
        if !r1.granted {
            return Err(SelfTestError::QuintupleGrantFailed);
        }
        Ok(())
    }
}
