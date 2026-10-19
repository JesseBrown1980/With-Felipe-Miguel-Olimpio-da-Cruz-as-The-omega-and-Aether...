// hookwall plane — authority_gate for descriptor→live promotion.
// Canon: live_action_allowed is FALSE by default; only quintuple-auth grants.
// Per-carry: hookwall_gate_required_for_live_action: true.

import crypto from 'node:crypto';
import { encodeFrame } from '../bpi-codec.mjs';
import { enrichEnvelope } from '../quant-bus.mjs';

let _requests = 0;
let _denials = 0;
let _grants = 0;

function intentSha16(intent) {
  return crypto.createHash('sha256').update(String(intent)).digest('hex').slice(0, 16);
}

export function requestLive(roomId, intent) {
  _requests++;
  _denials++;
  const env = enrichEnvelope({ room_id: Number(roomId) || 0, intent_sha16: intentSha16(intent), granted: 0 });
  const frame = encodeFrame('HKW', [
    roomId,
    env.intent_sha16,
    0,
    'default_deny_quintuple_required',
    env.triple_quant || '',
    env.authority_quant || '',
  ]);
  return { granted: false, frame };
}

export function grantLive(roomId, intent, quintupleAuth) {
  _requests++;
  const signers = quintupleAuth?.signers;
  const ok = Array.isArray(signers) && signers.length >= 5 && quintupleAuth?.window_ok === true;
  if (!ok) {
    _denials++;
    return requestLive(roomId, intent);
  }
  _grants++;
  const env = enrichEnvelope({
    room_id: Number(roomId) || 0,
    intent_sha16: intentSha16(intent),
    granted: 1,
    authority: { quintuple: true, op_jesse: true, op_rayssa: true, hermes: true, foundation: true },
  });
  const frame = encodeFrame('HKG', [
    roomId,
    env.intent_sha16,
    1,
    signers.length,
    env.triple_quant || '',
    env.authority_quant || '',
  ]);
  return { granted: true, frame };
}

export function state() {
  return {
    plane: 'hookwall',
    requests: _requests,
    denials: _denials,
    grants: _grants,
    default_policy: 'descriptor_only_unless_quintuple',
  };
}

export function selfTest() {
  const r0 = requestLive(0, 'test_intent');
  if (r0.granted) throw new Error('default-deny breach');
  const r1 = grantLive(0, 'test_intent', {
    signers: ['a', 'b', 'c', 'd', 'e'],
    window_ok: true,
  });
  if (!r1.granted) throw new Error('quintuple grant failed');
  return { ok: true, denied: 1, granted: 1 };
}

// fireHookwall: bus-side entrypoint. Every emit traversing the bus crosses
// this gate; default-deny unless quintuple-auth is present.
export function fireHookwall(tuple, _ctx) {
  const roomId = (tuple && tuple.room_id) ?? 0;
  const intent = (tuple && (tuple.intent || tuple.kind)) || 'unspecified';
  const auth = tuple && tuple.quintupleAuth;
  if (auth) return grantLive(roomId, intent, auth);
  return requestLive(roomId, intent);
}

// wire(bus): hookwall is special — the bus IS hookwall-mediated.
// The bus already calls requestLive() inside emit() (see bus.mjs), so the
// gate is structurally present. wire() registers a 'fireHookwall' handler
// so other planes can directly invoke the gate via the bus.
// Defensive no-op if bus missing or lacks register().
export function wire(bus) {
  if (!bus || typeof bus.register !== 'function') return;
  bus.register('hookwall', 'fireHookwall', fireHookwall);
}
