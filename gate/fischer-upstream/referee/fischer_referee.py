#!/usr/bin/env python3
"""Stdlib referee: the Node Fischer kernel, line by line, driven through FED's host8 field mapping.

Layer 1, FED mapping (FED servers/fischer-eval @dc1da1a9 src/main.rs:189-313): a host8 field line
becomes the envelope/score exactly as the vendored Rust builds them (UTF-8 bytes, ASCII-hex percent
escapes, `u16::from_str`, Rust `trim`). This layer includes the pid -> bh -> BH.FISCHER.HOST8.DEFAULT
substitution of main.rs:193-195. That substitution is FED behaviour with no Node counterpart: the Node
callers pass the envelope through unchanged (asolaria-hookwall.mjs:67,74; fischer-live.mjs:35-42,
77-81; fischer-scorer.mjs:59-61), no bh field is read in any of those files or in fischer-kernel.mjs,
and fischer-kernel.mjs:146 returns missing_pid (BLOCK, cpl 500, :339-350) whenever envelope.pid is
empty. `pid_source="node_envelope"` takes envelope.pid only from a non-empty pid field.

Layer 2, Node kernel (BigPickle bigpickle-rebuild @c592599): src/fischer-kernel.mjs:22-33
pidToVoxelCoord, :36-57 best-alt/candidates, :69-75 GLSM_CPL_MOD, :93-149 refute/illegal, :151-223
computeCPL (floor inside, before the G4 modifier), :226-246 axisScores, :250-280 buildRow, :310-398
fischerEval; src/hilbert.mjs:82-91,112-127,144-155 hilbertEncode (n=3, b=4). JS semantics kept:
`GLSM_CPL_MOD[g4_state]` reaches inherited Object.prototype members (cpl NaN), the Shannon compare
is IEEE-754 binary64, and payload length counts UTF-16 units.

`port` (a set of the PORT_POINTS names) applies the vendored Rust port's documented points to layer
2, so the Rust rows can be pinned byte for byte (prove_upstream.py). Integer arithmetic only
(OWNER-RULES 4): axes are per-mille integers and the binary64 compare is done in integers.
"""

import hashlib
import sys

# The FED port's points that change a Node decision or row byte (prove_upstream.py reports each).
PORT_POINTS = ("g4_inherited_name", "shannon_binary64", "payload_length_unit", "hbp_escape")
PORT_ALL = frozenset(PORT_POINTS)
NODE = frozenset()
FIXED_TS = "2026-06-24T00:00:00Z"
JS_NAN = "NaN"  # `${NaN}` in a template literal


# ── SHA helpers (fischer-kernel.mjs:16-17) ────────────────────────────────────
def _sha256_hex(s):
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def sha8(s):
    return _sha256_hex(s)[:8]


def sha16(s):
    return _sha256_hex(s)[:16]


# ── hilbert.mjs:112-127 axesToTransposeND ─────────────────────────────────────
def _axes_to_transpose_nd(X, n, b):
    M = 1 << (b - 1)
    Q = M
    while Q > 1:
        P = Q - 1
        for i in range(n):
            if X[i] & Q:
                X[0] ^= P
            else:
                t = (X[0] ^ X[i]) & P
                X[0] ^= t
                X[i] ^= t
        Q >>= 1
    for i in range(1, n):
        X[i] ^= X[i - 1]


# ── hilbert.mjs:82-91 transposeToIndexND ──────────────────────────────────────
def _transpose_to_index_nd(X, n, b):
    h = 0
    for d in range(b):
        for j in range(n):
            bit = (X[j] >> (b - 1 - d)) & 1
            h = (h << 1) | bit
    return h


# ── hilbert.mjs:144-155 hilbertEncode (n>=3 branch) ───────────────────────────
def hilbert_encode_3d_b4(coord):
    X = list(coord)
    _axes_to_transpose_nd(X, 3, 4)
    return _transpose_to_index_nd(X, 3, 4)


# ── fischer-kernel.mjs:22-33 pidToVoxelCoord ──────────────────────────────────
def pid_to_voxel_xyz(pid):
    h = sha16(pid)
    return int(h[0:4], 16) % 16, int(h[4:8], 16) % 16, int(h[8:12], 16) % 16


def pid_to_voxel_coord(pid):
    # hilbertEncode does not throw for x,y,z in 0..15 with dims=3,bits=4, so the Node code
    # always returns the index form (never the x-y-z catch form at :31).
    return "BH3D:%d" % hilbert_encode_3d_b4(pid_to_voxel_xyz(pid))


# ── fischer-kernel.mjs:60-66 VERDICT_GLYPH ────────────────────────────────────
VERDICT_GLYPH = {"PROCEED": "FP", "HOLD": "FH", "BLOCK": "FB", "REFUTE": "FR", "ANALYZE": "FA"}

# ── fischer-kernel.mjs:69-75 GLSM_CPL_MOD (a frozen plain object) ─────────────
GLSM_CPL_MOD = {"DESCRIBED": 0, "EDGE_MINED": -40, "PATH_FOUND": -80, "CONVERGED": -200, "MISTAKE_FLAGGED": 999}

# Object.getOwnPropertyNames(Object.prototype) under Node 22: the members `GLSM_CPL_MOD[name]` inherits.
OBJECT_PROTOTYPE_NAMES = (
    "constructor", "__defineGetter__", "__defineSetter__", "hasOwnProperty", "__lookupGetter__",
    "__lookupSetter__", "isPrototypeOf", "propertyIsEnumerable", "toString", "valueOf", "__proto__",
    "toLocaleString",
)


def glsm_cpl_mod(g4_state, port):
    """mjs:368 `GLSM_CPL_MOD[g4_state] ?? 0`; None stands for an inherited function/object value.
    port: FED lib.rs:726-733 returns 0 for every name outside the five."""
    if g4_state in GLSM_CPL_MOD:
        return GLSM_CPL_MOD[g4_state]
    if g4_state in OBJECT_PROTOTYPE_NAMES and "g4_inherited_name" not in port:
        return None
    return 0


# ── fischer-kernel.mjs:87-91 / 100-102 / 138-141 verb sets ────────────────────
REFUTED_VERBS = {
    "self_authorize", "bypass_hookwall", "recursive_consent", "force_promote",
    "skip_cosign", "delete_evidence", "disable_halt", "grant_authority",
}
WRITE_VERBS = {"write", "delete", "compact", "seal", "upsert", "drop", "migrate"}
SPAWN_VERBS = {"spawn", "scale", "mint", "fork", "launch", "bootstrap"}
COMPACT_VERBS = {"compact", "gc", "drain", "prune", "archive"}
COSIGN_REQUIRED = {"promote", "mint", "seal", "authorize", "cosign", "scale"}
PROMOTION_VERBS = {"promote", "mint", "seal", "authorize", "cosign"}
PAYLOAD_BLOAT_BYTES = 65536


# ── binary64 compare `shannonScore > 0.92` (mjs:204) in integers ──────────────
def nearest_int_half_even(n, d):
    q, r = divmod(n, d)
    if 2 * r > d or (2 * r == d and q % 2 == 1):
        q += 1
    return q


# The binary64 nearest 0.92 is F64_092_M / 2**53 (Node: 8286623314361713 / 2**53 === 0.92).
F64_092_M = nearest_int_half_even(92 << 53, 100)


def js_number_gt_092(num, den):
    """Number(num/den) > 0.92 under round-to-nearest-even: the nearest double exceeds M/2^53 iff
    num/den is above the midpoint (2M+1)/2^54, or equals it and M+1 is even."""
    lhs = num << 54
    rhs = (2 * F64_092_M + 1) * den
    if lhs != rhs:
        return lhs > rhs
    return (F64_092_M + 1) % 2 == 0


def shannon_over_920(score):  # FED lib.rs:496-498 shannon_over(score, 920)
    return score["shannon_q"] > 920 or (score["shannon_q"] == 920 and score["shannon_above"])


def utf16_len(s):  # JS String.prototype.length
    return sum(2 if ord(c) > 0xFFFF else 1 for c in s)


def _is_promotion_verb(v):  # fischer-kernel.mjs:100-102
    return v in PROMOTION_VERBS


# ── fischer-kernel.mjs:93-109 checkRefuted ────────────────────────────────────
def check_refuted(env):
    if env["verb"] in REFUTED_VERBS:
        return True
    if env.get("actor") and env["actor"] == env.get("target") and _is_promotion_verb(env["verb"]):
        return True
    if env.get("payload_json_true"):  # :96 payload.json === true
        return True
    if env.get("authority_jump") and not env.get("cosign"):
        return True
    return False


# ── fischer-kernel.mjs:145-149 checkIllegal ───────────────────────────────────
def check_illegal(env):
    if not env.get("pid"):
        return "missing_pid"
    if not env.get("verb"):
        return "missing_verb"
    return None


# ── fischer-kernel.mjs:52-57 deriveCandidateCount ─────────────────────────────
def derive_candidate_count(verb):
    if verb in SPAWN_VERBS:
        return 4
    if verb in WRITE_VERBS:
        return 3
    if verb in COSIGN_REQUIRED:
        return 3
    return 2


# ── fischer-kernel.mjs:36-49 deriveBestAlt ────────────────────────────────────
def derive_best_alt(flags, verb, glsm_state):
    if glsm_state == "MISTAKE_FLAGGED":
        return "analyze_in_white_room"
    for flag, alt in (
        ("authority_jump", "escalate_via_cosign_ring"),
        ("recursive_consent", "halt_and_request_human_apex"),
        ("missing_cosign", "hold_for_cosign"),
        ("missing_halt_path", "declare_halt_path_first"),
        ("unsealed_write", "seal_with_hbp_before_write"),
        ("no_replay_path", "declare_ledger_path_first"),
        ("missing_operator_witness", "request_operator_witness"),
        ("bloat_delta", "compact_payload_to_tuple"),
    ):
        if flag in flags:
            return alt
    if verb in SPAWN_VERBS:
        return "send_to_white_room_first"
    if verb in WRITE_VERBS:
        return "compact_then_seal"
    return "hold_for_analysis"


# ── fischer-kernel.mjs:151-223 computeCPL (floor applied at :221) ──────────────
def compute_cpl(env, score, port):
    cpl = 0
    hard_floor = 0
    flags = []
    verb = env.get("verb") or ""
    payload_str = env.get("payload") or ""

    if verb in COSIGN_REQUIRED and not env.get("cosign"):
        cpl += 250
        hard_floor = max(hard_floor, 150)
        flags.append("missing_cosign")
    if env.get("authority_jump"):
        cpl += 400
        hard_floor = max(hard_floor, 400)
        flags.append("authority_jump")

    if verb in SPAWN_VERBS and not env.get("halt_path"):
        cpl += 350
        hard_floor = max(hard_floor, 200)
        flags.append("missing_halt_path")
    if env.get("recursive_consent"):
        cpl += 400
        hard_floor = max(hard_floor, 400)
        flags.append("recursive_consent")
    if env.get("operator_witness_required") and not env.get("operator_witness"):
        cpl += 300
        hard_floor = max(hard_floor, 150)
        flags.append("missing_operator_witness")

    has_proof_path = bool(env.get("hbp_path") or env.get("sidecar_plan") or env.get("ledger_path"))
    if not has_proof_path:
        cpl += 180
        hard_floor = max(hard_floor, 100)
        flags.append("no_replay_path")
    else:
        cpl -= 160
        flags.append("proof_gain")  # mjs:186 spelling (FED lib.rs:344 spells it proof_gain_q)
    if not env.get("target"):
        cpl += 80
        flags.append("route_ambiguity")
    if score.get("l0_real"):
        cpl -= 100
        flags.append("gnn_observable")

    if verb in WRITE_VERBS and verb not in COMPACT_VERBS and not has_proof_path:
        cpl += 220
        flags.append("unsealed_write")
    if "payload_length_unit" in port:
        payload_len = len(payload_str.encode("utf-8"))  # FED lib.rs:359 String::len
    else:
        payload_len = utf16_len(payload_str)  # mjs:157-159,199 payloadStr.length
    if payload_len > PAYLOAD_BLOAT_BYTES:
        cpl += 100
        flags.append("bloat_delta")
    if "shannon_binary64" in port:
        over = shannon_over_920(score)  # FED lib.rs:363,496-498 on the exact text
    else:
        over = js_number_gt_092(score["shannon_num"], score["shannon_den"])  # mjs:203-204
    if over and verb not in ("write", "export", "generate"):
        cpl += 120
        flags.append("entropy_delta")

    pid = env.get("pid") or ""
    if pid.startswith("BH."):
        cpl -= 140
        flags.append("reproducible")
    if env.get("cube_47d") or env.get("tuple"):
        cpl -= 80
        flags.append("cube_local")
    if verb in COMPACT_VERBS:
        cpl -= 120
        flags.append("compaction_gain")

    return max(0, max(cpl, hard_floor)), flags  # mjs:221


# ── fischer-kernel.mjs:226-246 axisScores, as per-mille integers ──────────────
# `+(sum).toFixed(3)` then `.toFixed(3)` (mjs:236-241,262-264): measured with the unchanged Node,
# the 16 possible center_gain sums render exactly as the integer per-mille sum below.
def axis_scores(env, score):
    verb = env.get("verb") or ""
    has_halt = bool(env.get("halt_path")) if verb in SPAWN_VERBS else True
    has_proof = bool(env.get("hbp_path") or env.get("sidecar_plan") or env.get("ledger_path"))
    has_cosign = (verb not in COSIGN_REQUIRED) or bool(env.get("cosign"))
    has_cube = bool(env.get("cube_47d") or env.get("tuple"))
    king = has_halt and not env.get("authority_jump") and not env.get("recursive_consent")
    center = (400 if has_proof else 0) + (300 if env.get("target") else 0)
    center += (200 if score.get("l0_real") else 0) + (100 if has_cube else 0)
    return {
        "king_safety": 1000 if king else 0,
        "center_gain": center,
        "proof_gain": 1000 if has_proof else 0,
        "authority_debt": (1 if env.get("authority_jump") else 0) + (0 if has_cosign else 1),
    }


HARD_AXES = {"king_safety": 0, "center_gain": 0, "proof_gain": 0, "authority_debt": 2}


def fixed3(q):  # Number.prototype.toFixed(3) of q/1000
    return "%d.%03d" % (q // 1000, q % 1000)


def hbp_escape(s):  # FED lib.rs:551-553
    return s.replace("|", "_").replace("\r", "_").replace("\n", "_").replace("\t", "_")


# ── fischer-kernel.mjs:250-280 buildRow ───────────────────────────────────────
def build_row(pid, move, verdict, cpl, axes, flags, score, prev_hash, extras, ts, port):
    esc = hbp_escape if "hbp_escape" in port else (lambda s: s)  # port: FED lib.rs:426-443
    base = [
        "FISCHERv1",
        "pid=%s" % esc(pid),
        "move=%s" % esc(move),
        "verdict=%s" % verdict,
        "cpl=%s" % cpl,
        "candidate_count=%s" % extras["candidate_count"],
        "best_alt=%s" % extras["best_alt"],
        "king_safety=%s" % fixed3(axes["king_safety"]),
        "center_gain=%s" % fixed3(axes["center_gain"]),
        "proof_gain=%s" % fixed3(axes["proof_gain"]),
        "authority_debt=%s" % axes["authority_debt"],
        "g4_state=%s" % esc(score.get("g4_state") or "UNKNOWN"),
        "voxel_coord=%s" % esc(extras["voxel_coord"]),
        "glyph=%s" % extras["glyph"],
        "flags=%s" % esc(",".join(flags)),
        "l0_real=%d" % (1 if score.get("l0_real") else 0),
        "composite=%s" % esc(score.get("composite", "0")),
        "prev_hash=%s" % esc(prev_hash or "0000000000000000"),
        "ts=%s" % esc(ts),
        "json=0",
        "runtime=0",
    ]
    row_hash = sha8("|".join(base))
    base.append("row_hash=%s" % row_hash)
    return "|".join(base)


# ── fischer-kernel.mjs:310-398 fischerEval ────────────────────────────────────
def fischer_eval(pid, env, score, strict=False, prev_hash="0000000000000000", ts=FIXED_TS, port=NODE):
    move = env.get("verb") or "unknown"
    voxel_coord = pid_to_voxel_coord(pid or "UNKNOWN")
    g4_state = score.get("g4_state") or "UNKNOWN"

    def done(verdict, cpl, flags, axes, alt, glyph, pass_, promoted):
        cand = derive_candidate_count(move)
        extras = {"candidate_count": cand, "best_alt": alt, "voxel_coord": voxel_coord, "glyph": glyph}
        row = build_row(pid, move, verdict, cpl, axes, flags, score, prev_hash, extras, ts, port)
        return {
            "row": row, "verdict": verdict, "cpl": cpl, "flags": flags, "axes": axes, "best_alt": alt,
            "candidate_count": cand, "glyph": glyph, "voxel_coord": voxel_coord, "g4_state": g4_state,
            "pid": pid, "move": move, "pass": pass_, "promoted": promoted,
            "l0_real": bool(score.get("l0_real")), "composite": score.get("composite", "0"),
        }

    if g4_state == "MISTAKE_FLAGGED":  # Tier 0 (:328-337)
        return done("BLOCK", 999, ["glsm_mistake_flagged"], HARD_AXES, "analyze_in_white_room", "FB", False, False)
    illegal = check_illegal(env)  # Tier 1 (:340-350)
    if illegal:
        return done("BLOCK", 500, [illegal], HARD_AXES, derive_best_alt([illegal], move, g4_state), "FB", False, False)
    if check_refuted(env):  # Tier 2 (:353-362)
        return done("REFUTE", 999, ["refuted_pattern"], HARD_AXES, "halt_and_request_human_apex", "FR", False, False)

    raw_cpl, flags = compute_cpl(env, score, port)  # Tier 3 (:365-397)
    glsm_mod = glsm_cpl_mod(g4_state, port)
    if glsm_mod is None:
        cpl = JS_NAN  # :368-369 number + function/object is a string; Math.max gives NaN
        verdict = "PROCEED"  # :373-382 NaN >= 500 and NaN >= 150 are both false
    else:
        cpl = max(0, raw_cpl + glsm_mod)
        if cpl >= 500:
            verdict = "BLOCK"
        elif cpl >= 150:
            needs_analyze = (not strict) and (move in WRITE_VERBS or move in SPAWN_VERBS) and ("no_replay_path" in flags)
            verdict = "ANALYZE" if needs_analyze else "HOLD"
        else:
            verdict = "PROCEED"
    promoted = verdict == "PROCEED" and cpl != JS_NAN and cpl < 50  # :396 (NaN < 50 is false)
    alt = derive_best_alt(flags, move, g4_state)
    return done(verdict, cpl, flags, axis_scores(env, score), alt, VERDICT_GLYPH[verdict],
                verdict in ("PROCEED", "ANALYZE"), promoted)


# ── FED main.rs:189-313 field -> envelope/score mapping (mirrors the Rust) ─────
RUST_WHITESPACE = frozenset(
    chr(c) for c in (0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20, 0x85, 0xA0, 0x1680, *range(0x2000, 0x200B),
                     0x2028, 0x2029, 0x202F, 0x205F, 0x3000)
)  # char::is_whitespace (Unicode White_Space), used by str::trim


def rust_trim(s):
    i, j = 0, len(s)
    while i < j and s[i] in RUST_WHITESPACE:
        i += 1
    while j > i and s[j - 1] in RUST_WHITESPACE:
        j -= 1
    return s[i:j]


def is_skipped(line):  # upstream_fixture.rs:35
    return rust_trim(line) == "" or line.startswith("#")


def _ascii_digits(s):
    return all("0" <= c <= "9" for c in s)


_HEX = {c: v for v, c in enumerate(b"0123456789abcdef")}
_HEX.update({c: 10 + v for v, c in enumerate(b"ABCDEF")})


def percent_decode(s):  # main.rs:284-313: over the UTF-8 bytes, each byte becomes one char
    b = s.encode("utf-8")
    out = []
    i = 0
    while i < len(b):
        if b[i] == 0x25 and i + 2 < len(b) and b[i + 1] in _HEX and b[i + 2] in _HEX:
            out.append(chr(_HEX[b[i + 1]] * 16 + _HEX[b[i + 2]]))
            i += 3
            continue
        out.append(" " if b[i] == 0x2B else chr(b[i]))
        i += 1
    return "".join(out)


def parse_input_fields(line):  # main.rs:232-248
    fields = {}
    cleaned = rust_trim(line)
    sep = "|" if "|" in cleaned else "&"
    for idx, part in enumerate(cleaned.split(sep)):
        if idx == 0 and sep == "|" and "=" not in part:
            fields["kind"] = part
            continue
        key, _, value = part.partition("=")
        if key:
            fields[key] = percent_decode(value)
    return fields


def opt_nonempty(fields, key):
    return fields.get(key) or None


def _val(fields, keys, default):
    for k in keys:
        if fields.get(k):
            return fields[k]
    return default


def parse_bool(v):  # FED lib.rs:477-479
    return v in ("1", "true", "TRUE", "yes", "YES")


def parse_q_strict(v):  # FED lib.rs:488-492: trim, u16::from_str (optional '+', ASCII digits), <= 1000
    if v is None:
        return None
    t = rust_trim(v)
    d = t[1:] if t.startswith("+") else t
    if not d or not _ascii_digits(d) or int(d) > 0xFFFF:
        return None
    return int(d) if int(d) <= 1000 else None


def parse_decimal_q_exact(v):
    """FED lib.rs:510-543 -> (num, den, q, above): num/den is the exact value of the text (what
    Number(text) rounds), (q, above) is the Rust per-mille result."""
    if v is None:
        return None
    t = rust_trim(v)
    if t.startswith("+"):
        t = t[1:]
    int_part, _, frac_part = t.partition(".")
    if not _ascii_digits(int_part) or not _ascii_digits(frac_part) or (not int_part and not frac_part):
        return None
    num, den = int(int_part + frac_part), 10 ** len(frac_part)
    int_digits = int_part.lstrip("0")
    if int_digits and int_digits != "1":
        return num, den, 1000, True
    if int_digits == "1":
        return num, den, 1000, any(c != "0" for c in frac_part)
    milli = int((frac_part + "000")[:3])
    tail = frac_part[3:]
    if tail and tail[0] >= "5":
        return num, den, milli + 1, False
    return num, den, milli, any(c != "0" for c in tail)


def fields_to_eval(fields, pid_source="fed"):  # main.rs:189-230
    pid = opt_nonempty(fields, "pid")
    if pid_source == "fed":  # main.rs:193-195 (FED only; see the module docstring)
        pid = pid or opt_nonempty(fields, "bh") or "BH.FISCHER.HOST8.DEFAULT"
    json_key = "payload_json" if "payload_json" in fields else "json"
    env = {
        "pid": pid,
        "actor": _val(fields, ["actor"], "fischer-eval-host8"),
        "verb": _val(fields, ["verb", "move"], "evaluate"),
        "target": _val(fields, ["target"], "fischer-kernel"),
        "payload": _val(fields, ["payload", "content"], ""),
        "payload_json_true": parse_bool(fields.get(json_key)),
        "authority_jump": parse_bool(fields.get("authority_jump")),
        "recursive_consent": parse_bool(fields.get("recursive_consent")),
        "operator_witness_required": parse_bool(fields.get("operator_witness_required")),
        "operator_witness": parse_bool(fields.get("operator_witness")),
    }
    for key in ("hbp_path", "sidecar_plan", "ledger_path", "tuple", "cube_47d", "cosign", "halt_path"):
        env[key] = opt_nonempty(fields, key)
    sq = parse_q_strict(fields.get("shannon_q"))
    if sq is not None:
        shannon = (sq, 1000, sq, False)  # Node receives sq/1000
    else:
        shannon = parse_decimal_q_exact(fields.get("shannon")) or (0, 1, 0, False)
    score = {
        "composite": _val(fields, ["composite"], "0"),
        "l0_real": parse_bool(fields.get("l0_real")),
        "shannon_num": shannon[0],
        "shannon_den": shannon[1],
        "shannon_q": shannon[2],
        "shannon_above": shannon[3],
        "g4_state": _val(fields, ["g4_state"], "UNKNOWN"),
    }
    return env, score, parse_bool(fields.get("strict")), _val(fields, ["prev_hash"], "0000000000000000")


def evaluate_line(line, port=NODE, pid_source="fed", pid_arg=None):
    """pid_arg defaults to the FED-mapped pid; fischerEval reads its pid argument only for the
    voxel and the row (mjs:312,333-389), never for a decision field."""
    fields = parse_input_fields(line)
    env, score, strict, prev_hash = fields_to_eval(fields, pid_source)
    if pid_arg is None:
        pid_arg = fields_to_eval(fields)[0]["pid"]
    return fischer_eval(pid_arg, env, score, strict, prev_hash, FIXED_TS, port)


def read_lines(data):
    """BufRead::lines as upstream_fixture.rs:30-34 reads stdin: split on LF, drop the CR of a CRLF,
    stop at the first line that is not UTF-8."""
    parts = data.split(b"\n")
    last = parts.pop()
    raws = [p[:-1] if p.endswith(b"\r") else p for p in parts] + ([last] if last else [])
    for raw in raws:
        try:
            yield raw.decode("utf-8")
        except UnicodeDecodeError:
            return


def frame(s):  # stream framing only; prove_upstream.py reverses it
    return s.replace("%", "%25").replace("\t", "%09").replace("\n", "%0A").replace("\r", "%0D")


EVAL_KEYS = ("verdict", "cpl", "flags", "king_safety_q", "center_gain_q", "proof_gain_q", "authority_debt",
             "best_alt", "candidate_count", "glyph", "voxel_coord", "g4_state", "pid", "move", "pass",
             "promoted", "l0_real", "composite")


def eval_body(ev):
    ax = ev["axes"]
    vals = (ev["verdict"], ev["cpl"], ",".join(ev["flags"]), ax["king_safety"], ax["center_gain"],
            ax["proof_gain"], ax["authority_debt"], ev["best_alt"], ev["candidate_count"], ev["glyph"],
            ev["voxel_coord"], ev["g4_state"], ev["pid"], ev["move"], str(ev["pass"]).lower(),
            str(ev["promoted"]).lower(), str(ev["l0_real"]).lower(), ev["composite"])
    return "\t".join("%s=%s" % (k, frame(str(v))) for k, v in zip(EVAL_KEYS, vals))


def port_classes(line, node_ev):
    """The PORT_POINTS that, applied alone, change this case's Node row or result."""
    return [p for p in PORT_POINTS if evaluate_line(line, frozenset([p])) != node_ev]


# Rows from the unchanged fischer-kernel.mjs fischerEval/buildRow (bigpickle-rebuild @c592599), clock
# fixed at FIXED_TS, for the envelopes FED main.rs builds from these lines (missing_pid: envelope.pid
# absent, pid argument 'UNKNOWN'). tests/upstream_rows.rs pins the same Node rows against the Rust.
NODE_PINS = (
    ("clean_proceed",
     "pid=BH.HOOKWALL.TEST000000000001|verb=tick|target=fabric|hbp_path=x|l0_real=1|tuple=BH.HOOKWALL.TEST000000000001|composite=0.85",
     "FISCHERv1|pid=BH.HOOKWALL.TEST000000000001|move=tick|verdict=PROCEED|cpl=0|candidate_count=2|best_alt=hold_for_analysis|king_safety=1.000|center_gain=1.000|proof_gain=1.000|authority_debt=0|g4_state=UNKNOWN|voxel_coord=BH3D:2436|glyph=FP|flags=proof_gain,gnn_observable,reproducible,cube_local|l0_real=1|composite=0.85|prev_hash=0000000000000000|ts=2026-06-24T00:00:00Z|json=0|runtime=0|row_hash=74253099"),
    ("mistake_flagged",
     "pid=BH.PIN.MISTAKE|verb=write|target=fabric|hbp_path=x|g4_state=MISTAKE_FLAGGED|composite=0.40",
     "FISCHERv1|pid=BH.PIN.MISTAKE|move=write|verdict=BLOCK|cpl=999|candidate_count=3|best_alt=analyze_in_white_room|king_safety=0.000|center_gain=0.000|proof_gain=0.000|authority_debt=2|g4_state=MISTAKE_FLAGGED|voxel_coord=BH3D:419|glyph=FB|flags=glsm_mistake_flagged|l0_real=0|composite=0.40|prev_hash=0000000000000000|ts=2026-06-24T00:00:00Z|json=0|runtime=0|row_hash=7d4a5392"),
    ("refute",
     "pid=BH.PIN.REFUTE|verb=self_authorize|target=fabric|hbp_path=x|composite=0.97",
     "FISCHERv1|pid=BH.PIN.REFUTE|move=self_authorize|verdict=REFUTE|cpl=999|candidate_count=2|best_alt=halt_and_request_human_apex|king_safety=0.000|center_gain=0.000|proof_gain=0.000|authority_debt=2|g4_state=UNKNOWN|voxel_coord=BH3D:375|glyph=FR|flags=refuted_pattern|l0_real=0|composite=0.97|prev_hash=0000000000000000|ts=2026-06-24T00:00:00Z|json=0|runtime=0|row_hash=38febcab"),
    ("missing_pid",
     "verb=tick|target=fabric|hbp_path=x",
     "FISCHERv1|pid=UNKNOWN|move=tick|verdict=BLOCK|cpl=500|candidate_count=2|best_alt=hold_for_analysis|king_safety=0.000|center_gain=0.000|proof_gain=0.000|authority_debt=2|g4_state=UNKNOWN|voxel_coord=BH3D:370|glyph=FB|flags=missing_pid|l0_real=0|composite=0|prev_hash=0000000000000000|ts=2026-06-24T00:00:00Z|json=0|runtime=0|row_hash=409c5796"),
)


def check_pins():
    bad = 0
    for name, line, node_row in NODE_PINS:
        if name == "missing_pid":
            got = evaluate_line(line, pid_source="node_envelope", pid_arg="UNKNOWN")["row"]
        else:
            got = evaluate_line(line)["row"]
        ok = got == node_row
        bad += not ok
        print("pin %-16s referee row == Node row bytes: %s" % (name, "yes" if ok else "NO\n  got  %s\n  node %s" % (got, node_row)))
    return bad


def main():
    if "--pins" in sys.argv[1:]:
        sys.exit(1 if check_pins() else 0)
    out = sys.stdout.buffer
    for idx, line in enumerate(read_lines(sys.stdin.buffer.read())):
        if is_skipped(line):
            continue
        node_ev = evaluate_line(line)
        port_ev = evaluate_line(line, PORT_ALL)
        lines = [("NODE_ROW", frame(node_ev["row"])), ("NODE_EVAL", eval_body(node_ev)),
                 ("PORT_ROW", frame(port_ev["row"])), ("PORT_EVAL", eval_body(port_ev)),
                 ("CLASS", ",".join(port_classes(line, node_ev)))]
        out.write("".join("%d\t%s\t%s\n" % (idx, k, v) for k, v in lines).encode("utf-8"))


if __name__ == "__main__":
    main()
