#!/usr/bin/env node
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// COMPONENT|3 seed: crypto/hash tokens as FIRST-CLASS references bound to
// cube BH addresses -- deterministic catalog + binder, repo-side DRAFT ONLY.
// No live MCP publish, no fabric call, no mint, no cube mutation, no key
// generation. Tokens are REFERENCES: a row carries a token_id, a kind, a
// 16-hex digest, and a cube address -- never token material, secrets,
// private keys, or bearer strings. Every field is format- or registry-
// validated before it can reach a row, and anything that LOOKS like raw
// material is redacted, not echoed. Every row carries executable=0.
// The contract is time-free: no clock enters any row, so parity is
// deterministic without a fixed-now.

export const BINDER_ID = 'token-cube-catalog-binder.v1';

// Registry membership is a DRAFT_ASSUMPTION (declared per lane rules) --
// kinds/catalogs drawn from fabric canon, bilateral contest welcome.
export const TOKEN_KINDS = Object.freeze([
  'sha256-ref',
  'sha16-row-hash',
  'hex-envelope',
  'ed25519-pubkey-fingerprint',
  'cosign-seal',
  'bh-tuple-digest',
]);

export const CATALOGS = Object.freeze([
  'hilbert-omni-47D',
  'atlas-v55',
  'atlas-v56',
  'verbs-overlay-73',
  'quant-bus-v48',
  'd22-translation',
]);

// mint and write scopes are cosign territory: they cap at DEFER_TO_OPERATOR
// no matter how clean the rest of the input is.
export const SCOPES = Object.freeze({
  read: { escalates: 0 },
  attest: { escalates: 0 },
  'bind-draft': { escalates: 0 },
  mint: { escalates: 1 },
  write: { escalates: 1 },
});

// Hilbert-collision canon: BH addresses MUST be vantage-qualified, and the
// acer/liris overlap band 930-1229 is DISPUTED pending bilateral ack --
// any binding into it defers to the operator regardless of scope/vantage.
export const BH_VANTAGES = Object.freeze(['ACER', 'LIRIS', 'SHARED']);
export const DISPUTED_BANDS = Object.freeze([Object.freeze({ lo: 930, hi: 1229, why: 'acer-liris-overlap-bilateral-ack-pending' })]);

// Operator-derived classifier (OP-JESSE 2026-06-11, bilateral-refined):
// bh_lane = index mod 3 -- the three-phase cylinder fold. Permutation-
// invariant because 10 === 1 (mod 3): digit order never changes the lane,
// which is exactly the 21/12/33 digit-sum observation.
// bh_ppow = prime-power class, von-Mangoldt-aligned: LAMBDA(n) != 0 exactly
// when the class is prime/p2/p3/pk. p3-as-collision-reserve is a PROPOSAL
// pending canon mint -- v1 classification is INFORMATIONAL, never gating.
export function classifyBhIndex(index) {
  if (!Number.isInteger(index) || index < 0 || index > 999999) {
    return { lane: 'none', ppow: 'none' };
  }
  const lane = index % 3;
  if (index < 2) return { lane, ppow: 'unit' };
  let n = index;
  let smallest = 0;
  for (let d = 2; d * d <= n; d += 1) {
    if (n % d === 0) {
      smallest = d;
      break;
    }
  }
  if (smallest === 0) return { lane, ppow: 'prime' };
  let k = 0;
  while (n % smallest === 0) {
    n /= smallest;
    k += 1;
  }
  if (n !== 1) return { lane, ppow: 'composite' };
  return { lane, ppow: k === 2 ? 'p2' : k === 3 ? 'p3' : 'pk' };
}

const TOKEN_ID_RE = /^TOK-[A-Z0-9][A-Z0-9-]{2,38}$/;
const DIGEST_RE = /^[0-9a-f]{16}$/;
const CUBE_BH_RE = /^BH-(ACER|LIRIS|SHARED)-(0|[1-9]\d{0,5})$/;
const DIRTY_RE = /[|\r\n]/;
// Material detectors: long contiguous hex, key-block markers, bearer shapes,
// separator-split long hex, long base64 runs. Anything matching is redacted
// from rows entirely.
const MATERIAL_RES = Object.freeze([
  /[0-9a-fA-F]{32,}/,
  /(?:[0-9a-fA-F][:_-]?){32,}/,
  /BEGIN[ -]?[A-Z -]*PRIVATE[ -]?KEY/i,
  /bearer[ :=-]/i,
  /[A-Za-z0-9+/]{40,}={0,2}/,
]);

function looksLikeMaterial(value) {
  return typeof value === 'string' && MATERIAL_RES.some((re) => re.test(value));
}

function cleanString(value) {
  return typeof value === 'string' && !DIRTY_RE.test(value) ? value : null;
}

// Row echo policy: format/registry-valid value, or 'invalid', or 'redacted'
// when the rejected value looks like raw material. Raw input never passes.
function echoField(value, validator) {
  const clean = cleanString(value);
  if (clean == null) return 'invalid';
  if (looksLikeMaterial(clean)) return 'redacted';
  return validator(clean) ? clean : 'invalid';
}

function buildResult(inp, verdict, gates) {
  const bhClean = cleanString(inp.cube_bh);
  const bhMatch = bhClean ? CUBE_BH_RE.exec(bhClean) : null;
  const canClassify = verdict !== 'DRAFT_BINDING_BLOCKED';
  const bhClass = canClassify && bhMatch ? classifyBhIndex(Number(bhMatch[2])) : { lane: 'none', ppow: 'none' };
  const fields = {
    token_id: echoField(inp.token_id, (v) => TOKEN_ID_RE.test(v)),
    token_kind: echoField(inp.token_kind, (v) => TOKEN_KINDS.includes(v)),
    digest_sha16: echoField(inp.digest_sha16, (v) => DIGEST_RE.test(v)),
    cube_bh: echoField(inp.cube_bh, (v) => CUBE_BH_RE.test(v)),
    bh_lane: bhClass.lane,
    bh_ppow: bhClass.ppow,
    scope: echoField(inp.scope, (v) => Object.hasOwn(SCOPES, v)),
    source_catalog: echoField(inp.source_catalog, (v) => CATALOGS.includes(v)),
    mode: echoField(inp.mode ?? 'draft', (v) => v === 'draft' || v === 'live'),
    verdict,
    gate: gates.length ? gates.join('+') : 'none',
  };
  const row = [
    'TOKCUBEBIND',
    `token_id=${fields.token_id}`,
    `token_kind=${fields.token_kind}`,
    `digest_sha16=${fields.digest_sha16}`,
    `cube_bh=${fields.cube_bh}`,
    `bh_lane=${fields.bh_lane}`,
    `bh_ppow=${fields.bh_ppow}`,
    `scope=${fields.scope}`,
    `source_catalog=${fields.source_catalog}`,
    `mode=${fields.mode}`,
    `verdict=${fields.verdict}`,
    `gate=${fields.gate}`,
    'executable=0',
    'json=0',
  ].join('|');
  return { ...fields, ok: verdict !== 'DRAFT_BINDING_BLOCKED', executable: 0, row };
}

export function bindToken(input) {
  const inp = input ?? {};
  const blocked = (...gates) => buildResult(inp, 'DRAFT_BINDING_BLOCKED', gates);

  // Rung 1: dirty input never reaches a row.
  for (const field of ['token_id', 'token_kind', 'digest_sha16', 'cube_bh', 'scope', 'source_catalog', 'mode']) {
    const value = inp[field];
    if (value != null && (typeof value !== 'string' || DIRTY_RE.test(value))) {
      return blocked(`dirty-${field}`);
    }
  }

  // Rung 2: token_id is a bounded reference id -- material cannot hide in it.
  const tokenId = inp.token_id ?? '';
  if (looksLikeMaterial(tokenId)) {
    return blocked('malformed-token-id', 'material-not-reference-suspected');
  }
  if (!TOKEN_ID_RE.test(tokenId)) {
    return looksLikeMaterial(tokenId)
      ? blocked('malformed-token-id', 'material-not-reference-suspected')
      : blocked('malformed-token-id');
  }

  // Rung 3: kind must be registered.
  if (!TOKEN_KINDS.includes(inp.token_kind ?? '')) return blocked('unknown-token-kind');

  // Rung 4: digest is EXACTLY 16 lowercase hex (sha16 row-hash convention).
  // Longer hex is a length-spoof AND looks like material -> redact + flag.
  const digest = inp.digest_sha16 ?? '';
  if (!DIGEST_RE.test(digest)) {
    return looksLikeMaterial(digest)
      ? blocked('malformed-digest', 'material-not-reference-suspected')
      : blocked('malformed-digest');
  }

  // Rung 5: cube address must be vantage-qualified per hilbert-collision canon.
  const bhMatch = CUBE_BH_RE.exec(inp.cube_bh ?? '');
  if (!bhMatch) return blocked('missing-or-unqualified-cube-address');

  // Rungs 6-7: catalog and scope must be registered.
  if (!CATALOGS.includes(inp.source_catalog ?? '')) return blocked('unknown-source-catalog');
  if (!Object.hasOwn(SCOPES, inp.scope ?? '')) return blocked('unknown-scope');

  // Rung 8: mode must be draft or live.
  const mode = inp.mode ?? 'draft';
  if (mode !== 'draft' && mode !== 'live') return blocked('unknown-mode');

  // Rungs 9-11: all deferral reasons are preserved. A live or mint/write
  // request in the disputed band must still carry the disputed-band gate.
  const deferGates = [];
  if (mode === 'live') deferGates.push('live-binding-requires-operator');
  if (SCOPES[inp.scope].escalates) deferGates.push('scope-escalation-requires-operator');
  const index = Number(bhMatch[2]);
  const disputed = DISPUTED_BANDS.find((band) => index >= band.lo && index <= band.hi);
  if (disputed) {
    deferGates.push(`disputed-hilbert-band-${disputed.lo}-${disputed.hi}-bilateral-ack-pending`);
  }
  if (deferGates.length) return buildResult(inp, 'DEFER_TO_OPERATOR', deferGates);

  // Rung 12: clean draft binding, still executable=0 by contract.
  return buildResult(inp, 'DRAFT_BINDING_READY', []);
}

export function statusRows() {
  const rows = [
    `TOKCUBEHDR|ok=1|id=${BINDER_ID}|component=3|kinds=${TOKEN_KINDS.length}|catalogs=${CATALOGS.length}|scopes=${Object.keys(SCOPES).length}|vantages=${BH_VANTAGES.length}|invariant=every-row-executable-0|state=DRAFT_CONTRACT_NO_LIVE_BINDING|json=0`,
    'TOKCUBELAW|rule=tokens-are-REFERENCES-never-material|redaction=material-shaped-rejects-show-redacted-not-echoed|address_rule=BH-vantage-qualified-per-hilbert-collision-canon|json=0',
  ];
  for (const kind of TOKEN_KINDS) rows.push(`TOKCUBEKIND|id=${kind}|json=0`);
  for (const catalog of CATALOGS) rows.push(`TOKCUBECATALOG|id=${catalog}|membership=DRAFT_ASSUMPTION|json=0`);
  for (const [id, meta] of Object.entries(SCOPES)) {
    rows.push(`TOKCUBESCOPE|id=${id}|escalates=${meta.escalates}|max_verdict=${meta.escalates ? 'DEFER_TO_OPERATOR' : 'DRAFT_BINDING_READY'}|json=0`);
  }
  for (const band of DISPUTED_BANDS) {
    rows.push(`TOKCUBEDISPUTED|lo=${band.lo}|hi=${band.hi}|why=${band.why}|verdict=DEFER_TO_OPERATOR|json=0`);
  }
  rows.push('TOKCUBELANE|bh_lane=index-mod-3(permutation-invariant-10-eq-1-mod-3)|bh_ppow=unit+prime+p2+p3+pk+composite(von-mangoldt-aligned)|status=INFORMATIONAL_V1_NOT_GATING|blocked_rows=none+none|p3_collision_reserve=PROPOSAL-pending-canon-mint|source=OP-JESSE-2026-06-11-bilateral-refined|json=0');
  rows.push('TOKCUBESAFETY|mutates=0|pure_function=1|no_live_publish=1|no_fabric_call=1|no_mint=1|no_cube_mutation=1|no_key_generation=1|no_secret_material=1|json=0');
  rows.push('TOKCUBEEND|state=COMPONENT_3_SEED_DRAFT_CONTRACT|json=0');
  return rows;
}

// Parity baseline: fixed cases, time-free contract -- rows byte-identical
// on every machine with no clock input at all.
const BASE = Object.freeze({
  token_id: 'TOK-GNN-EDGE-0001',
  token_kind: 'sha16-row-hash',
  digest_sha16: '794b8c68ec512f9e',
  cube_bh: 'BH-ACER-754',
  scope: 'read',
  source_catalog: 'atlas-v55',
});
const PARITY_CASES = Object.freeze([
  { id: '01', input: { ...BASE } },
  { id: '02', input: { ...BASE, scope: 'attest' } },
  { id: '03', input: { ...BASE, scope: 'bind-draft' } },
  { id: '04', input: { ...BASE, scope: 'mint' } },
  { id: '05', input: { ...BASE, scope: 'write' } },
  { id: '06', input: { ...BASE, mode: 'live' } },
  { id: '07', input: { ...BASE, cube_bh: 'BH-ACER-942' } },
  { id: '08', input: { ...BASE, cube_bh: 'BH-ACER-929' } },
  { id: '09', input: { ...BASE, cube_bh: 'BH-ACER-930' } },
  { id: '10', input: { ...BASE, cube_bh: 'BH-LIRIS-1229' } },
  { id: '11', input: { ...BASE, cube_bh: 'BH-LIRIS-1230' } },
  { id: '12', input: { ...BASE, cube_bh: 'BH-942' } },
  { id: '13', input: { ...BASE, token_kind: 'jwt-bearer' } },
  { id: '14', input: { ...BASE, digest_sha16: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' } },
  { id: '15', input: { ...BASE, digest_sha16: '794B8C68EC512F9E' } },
  { id: '16', input: { ...BASE, digest_sha16: '794b8c68ec512f9' } },
  { id: '17', input: { ...BASE, token_id: 'TOK-EVIL|json=1' } },
  { id: '18', input: { ...BASE, source_catalog: 'catalog-of-doom' } },
  { id: '19', input: { ...BASE, scope: 'root' } },
  { id: '20', input: { ...BASE, cube_bh: null } },
  { id: '21', input: { ...BASE, token_id: 'BEGIN-PRIVATE-KEY-MATERIAL-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' } },
  { id: '22', input: { ...BASE, cube_bh: 'BH-SHARED-1', token_kind: 'cosign-seal', source_catalog: 'd22-translation' } },
  { id: '23', input: { ...BASE, token_id: 'TOK-DEADBEEF-DEADBEEF-DEADBEEF-DEADBEEF' } },
  { id: '24', input: { ...BASE, cube_bh: 'BH-ACER-000930' } },
  { id: '25', input: { ...BASE, cube_bh: 'BH-ACER-942', mode: 'live' } },
  { id: '26', input: { ...BASE, cube_bh: 'BH-ACER-942', scope: 'mint' } },
  { id: '27', input: { ...BASE, cube_bh: 'BH-ACER-7' } },
  { id: '28', input: { ...BASE, cube_bh: 'BH-ACER-49' } },
  { id: '29', input: { ...BASE, cube_bh: 'BH-LIRIS-27' } },
  { id: '30', input: { ...BASE, cube_bh: 'BH-ACER-16' } },
  { id: '31', input: { ...BASE, cube_bh: 'BH-ACER-21' } },
  { id: '32', input: { ...BASE, cube_bh: 'BH-ACER-12' } },
]);

export function emitParityRows() {
  const rows = [
    `TOKCUBEPARITYHDR|component=3|cases=${PARITY_CASES.length}|clock=none-time-free-contract|rule=rows-byte-identical-on-every-machine|json=0`,
  ];
  for (const probe of PARITY_CASES) {
    const out = bindToken(probe.input);
    rows.push(`TOKCUBEPARITY|case=${probe.id}|${out.row.slice('TOKCUBEBIND|'.length)}`);
  }
  rows.push(
    `TOKCUBEPARITYFTR|cases=${PARITY_CASES.length}|exit=byte-match-when-regenerated-file-equals-sealed-baseline|json=0`,
  );
  return rows;
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok });

  add('clean-draft-ready', bindToken({ ...BASE }).verdict === 'DRAFT_BINDING_READY');
  add('mint-scope-defers', bindToken({ ...BASE, scope: 'mint' }).verdict === 'DEFER_TO_OPERATOR');
  add('live-mode-defers', bindToken({ ...BASE, mode: 'live' }).verdict === 'DEFER_TO_OPERATOR');
  add('disputed-band-defers', bindToken({ ...BASE, cube_bh: 'BH-ACER-942' }).gate.startsWith('disputed-hilbert-band'));
  add('unqualified-bh-blocked', bindToken({ ...BASE, cube_bh: 'BH-942' }).verdict === 'DRAFT_BINDING_BLOCKED');
  add('full-sha256-redacted', bindToken({ ...BASE, digest_sha16: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }).digest_sha16 === 'redacted');
  add('material-token-id-redacted', bindToken({ ...BASE, token_id: 'BEGIN-PRIVATE-KEY-MATERIAL-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }).token_id === 'redacted');
  add('every-row-executable-0', emitParityRows().slice(1, -1).every((row) => row.includes('|executable=0|')));
  add('rows-hbp-only', [...statusRows(), ...emitParityRows()].every((row) => row.endsWith('json=0') && !row.includes('{"')));

  return { ok: checks.every((check) => check.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const cmd = process.argv[2] || '--status';
  if (cmd === '--status') {
    console.log(statusRows().join('\n'));
  } else if (cmd === '--self-test') {
    const result = selfTest();
    for (const check of result.checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
    process.exit(result.ok ? 0 : 1);
  } else if (cmd === '--parity') {
    process.stdout.write(emitParityRows().join('\n') + '\n');
  } else {
    console.error('usage: token-cube-catalog-binder.mjs --status | --self-test | --parity');
    process.exit(1);
  }
}
