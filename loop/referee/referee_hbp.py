#!/usr/bin/env python3
"""Independent stdlib referee for the aether-loop ADDRESS/ROUTE/LOOP ports.

Mirrors the upstream bigpickle-rebuild@c592599 Node lines (and omni-engine-loop.mjs and
github-pid-register.mjs) one by one with hashlib, never the Rust code, then runs the `emit_rows` example
and checks every row byte-for-byte. JavaScript string semantics are mirrored explicitly: UTF-16 code units
for `slice`/`charCodeAt`, the ECMAScript `trim` set, `JSON.stringify` of a string, template literals
rendering an absent field as `undefined`. SCORE/Fischer outputs are fixtures matching the example, and the
fixture lanes record what the gate hands them. `--check` exits non-zero on any mismatch.
"""
import hashlib
import math
import subprocess
import sys

TS = "2026-06-01T00:00:00.000Z"
LANE_CYCLE = ["nervous", "circulatory", "skeletal", "muscular", "immune", "memory", "lymphatic"]


# ---- ECMAScript string operations ----
JS_TRIM = set([0x9, 0xA, 0xB, 0xC, 0xD, 0x20, 0xA0, 0x1680] + list(range(0x2000, 0x200B))
              + [0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF])


def js_trim(s):
    """String.prototype.trim: ECMAScript WhiteSpace + LineTerminator."""
    a, b = 0, len(s)
    while a < b and ord(s[a]) in JS_TRIM:
        a += 1
    while b > a and ord(s[b - 1]) in JS_TRIM:
        b -= 1
    return s[a:b]


def js_slice_utf8(s, n):
    """String(s).slice(0, n) over UTF-16 code units, as Node writes it to UTF-8 (lone high surrogate -> U+FFFD)."""
    units, out = 0, []
    for ch in s:
        w = 2 if ord(ch) > 0xFFFF else 1
        if units + w > n:
            if units < n:
                out.append("\ufffd")
            break
        out.append(ch)
        units += w
    return "".join(out)


def utf16_units(s):
    b = s.encode("utf-16-le")
    return [b[i] | (b[i + 1] << 8) for i in range(0, len(b), 2)]


def json_quote(s):
    """JSON.stringify of a string value (ECMA-262 QuoteJSONString)."""
    short = {0x22: '\\"', 0x5C: "\\\\", 0x08: "\\b", 0x0C: "\\f", 0x0A: "\\n", 0x0D: "\\r", 0x09: "\\t"}
    out = ['"']
    for ch in s:
        c = ord(ch)
        if c in short:
            out.append(short[c])
        elif c < 0x20:
            out.append("\\u%04x" % c)
        else:
            out.append(ch)
    out.append('"')
    return "".join(out)


def nn(v, d):
    """JavaScript `v ?? d`."""
    return d if v is None else v


# ---- crypto helpers (district-fabric.mjs:28-30) ----
def sha256hex(s):
    return hashlib.sha256(str(s).encode("utf-8")).hexdigest()


def sha16(s):
    return sha256hex(s)[:16]


def sha8(s):
    return sha16(s)[:8]


# ---- primes.mjs:5-29 ----
def sieve_first_n_primes(n):
    limit = max(20, math.ceil(n * (math.log(n) + math.log(math.log(n) or 1)) + n))
    composite = [0] * (limit + 1)
    out = []
    for i in range(2, limit + 1):
        if not composite[i]:
            out.append(i)
            if len(out) == n:
                break
            j = i * i
            while j <= limit:
                composite[j] = 1
                j += i
    return out


PRIMES = sieve_first_n_primes(1000)


def prime_at(i):
    return PRIMES[i]


# ---- behcs.mjs:11 / pid-minter.mjs:50 ----
def glyph_at(index):
    return "cp%04x" % index


# ---- pid-minter.mjs:31-73 ----
def mint_from_tuple(actor, device, lane, prime, alphabet):
    glyph = glyph_at(actor)
    return sha16("%s|%s|%s|%s" % (glyph, device, lane, prime))


def mint_from_index(index, alphabet):
    return sha16("idx:%s:a%s" % (index, alphabet))


# ---- pid-chain-revolver.mjs:32-43 ----
class Revolver:
    def __init__(self, anchor, alphabet=256):
        if not anchor:
            raise TypeError("PIDChainRevolver: opts.anchor (string) required")  # :22-24
        self.anchor = anchor
        self.counter = 0
        self.alphabet = alphabet

    def next_pid(self):
        if self.alphabet not in (256, 1024):
            raise ValueError("mintPID: alphabet must be 256 or 1024")  # pid-minter.mjs:20-24 RangeError
        i = self.counter
        actor = i % self.alphabet
        lane = LANE_CYCLE[i % len(LANE_CYCLE)]
        prime = prime_at(i % 1000)
        pid = mint_from_tuple(actor, self.anchor, lane, prime, self.alphabet)
        self.counter += 1
        return pid


# ---- district-fabric.mjs:61-74 ----
def hilbert_xy(n, d):
    t, x, y = d, 0, 0
    s = 1
    while s < n:
        rx = 1 & (t // 2)
        ry = 1 & (t ^ rx)
        if ry == 0:
            if rx == 1:
                x = s - 1 - x
                y = s - 1 - y
            x, y = y, x
        x += s * rx
        y += s * ry
        t //= 4
        s *= 2
    return x, y


TUPLE_WAVE = ["scout", "evidence", "executor", "fabric", "voice", "planner"]
TUPLE_PROTOCOL = ["bus", "usb", "adb", "direct-wire", "tailnet", "fabric"]
TUPLE_SURFACE = ["dashboard", "canon", "viz", "agent", "device", "operator"]
TUPLE_DIMENSION = ["G", "I", "O", "B", "S", "C"]
TUPLE_BODY = ["operator", "organ", "citizen", "free-agent", "supervisor", "prof"]


# ---- district-fabric.mjs:43-58 ----
def room_coords(pid):
    h = sha256hex(pid)
    byte = lambda i: int(h[i * 2:i * 2 + 2], 16)
    cp = int(h[0:3], 16) % 1024
    glyph = "cp%04x" % cp
    tuple_ = "wave=%s:protocol=%s:surface=%s:dim=%s:body=%s:shannon=%s" % (
        TUPLE_WAVE[byte(0) % 6],
        TUPLE_PROTOCOL[byte(1) % 6],
        TUPLE_SURFACE[byte(2) % 6],
        TUPLE_DIMENSION[byte(3) % 6],
        TUPLE_BODY[byte(4) % 6],
        byte(5) % 12,
    )
    return {"coord64": h, "dims": 64, "cp": cp, "glyph": glyph, "tuple": tuple_}


# ---- district-fabric.mjs:77-81 ----
def room_pid(district, idx, grid_n=128):
    x, y = hilbert_xy(grid_n, idx)
    h = sha16("room|%s|%s|hilbert|%s|%s" % (district, idx, x, y))
    return "BH.DISTRICT.%s.R%05d.%s" % (district.upper(), idx, h.upper())


# ---- district-fabric.mjs:95-118 ----
def room_descriptor_row(district, idx, pid, band_cp, created_ts):
    x, y = hilbert_xy(256, idx % 65536)
    c = room_coords(pid)
    base = [
        "HBPv1",
        "row=room_descriptor",
        "pid=%s" % pid,
        "district=%s" % district,
        "idx=%s" % idx,
        "kind=micro-kernel",
        "bh3d=%s,%s" % (x, y),
        "band_cp=%s" % band_cp,
        "cp=%s" % c["cp"],
        "glyph=%s" % c["glyph"],
        "dims=%s" % c["dims"],
        "coord64=%s" % c["coord64"],
        "tuple=%s" % c["tuple"],
        "state=empty",
        "inbox=inbox.hbp",
        "outbox=outbox.hbp",
        "created=%s" % created_ts,
        "json=0",
        "runtime=0",
        "row_hash=%s" % sha8("%s%s%s" % (pid, district, idx)),
    ]
    return "|".join(base)


# ---- district-fabric.mjs:123 ----
def supervisor_pid(name):
    return "BH.SUPERVISOR.DISTRICT.%s.%s" % (name.upper(), sha16("sup|%s" % name).upper())


# ---- project-room-router.mjs:24-44 ----
def room_id_from_pid(pid_hex):
    if len(pid_hex) == 0:
        return None  # :25-27 throws TypeError
    acc = 0
    for unit in utf16_units(pid_hex):  # charCodeAt
        acc = (acc * 31 + unit) & 0xFFFFFFFF
    return acc % 10000


def room_folder_name(room_id, stem, alphabet):
    return "%s-%s-%04d" % (stem, alphabet, room_id)


# ---- project-room-router.mjs:48-62, 82-103 ----
class Router:
    def __init__(self):
        self.active_room_id = 0
        self.swap_count = 0

    def plan_swap_to(self, next_room):
        noop = self.active_room_id == next_room
        if not noop:
            self.active_room_id = next_room
            self.swap_count += 1
        return noop


# ---- room-dispatcher.mjs:58-66 ----
def run_free_agent_mock(agent_type, question, pid):
    seed = sha16("%s|%s|%s" % (agent_type, pid, question))
    score = int(seed[0:4], 16) % 1000
    answer = '[%s] %s: deterministic response for "%s"' % (agent_type, seed, js_slice_utf8(question, 60))
    return {"answer": answer, "self_score_milli": score}


# ---- room-dispatcher.mjs:29-36 ----
AGENT_TYPE = {"rotator": "pid-rotator", "prism": "prism-relay", "engineering": "opencode-coder",
              "white-room": "mint-critic", "gnn-feed": "gnn-scorer", "council": "vote-agent"}


# ---- room-dispatcher.mjs:136-141 on e4 units: score >= 0.72 <=> e4 * 100 >= 72 * 10000 ----
def hookwall_gate_e4(e4):
    return "FARM_GEM_WITH_GATES" if e4 * 100 >= 72 * 10000 else "BLOCK_AND_PRESERVE"


# ---- room-dispatcher.mjs:99-105 ----
def revolver_for(district):
    return Revolver("ASOLARIA-DISTRICT-%s" % district.upper())


# ---- room-dispatcher.mjs:106-121 ----
def rotate_row(rev, district, room_count, ts):
    rotation = rev.counter
    agent_pid = rev.next_pid()
    idx = rotation % room_count
    room_addr = room_pid(district, idx)
    lane = LANE_CYCLE[rotation % len(LANE_CYCLE)]
    return (
        "HBPv1|row=rotation|agent_pid=%s|room_pid=%s|district=%s|idx=%s|lane=%s|rotation=%s|state=assigned|ts=%s|json=0|row_hash=%s"
        % (agent_pid, room_addr, district, idx, lane, rotation, ts, sha8("%s%s" % (agent_pid, rotation)))
    )


# ---- hbp-reader.mjs:30-39 ----
def parse_pipe_row(line):
    parts = js_trim(str(line)).split("|")
    fields = {}
    for i in range(1, len(parts)):
        eq = parts[i].find("=")
        if eq > 0:
            fields[parts[i][:eq]] = parts[i][eq + 1:]
        elif parts[i]:
            fields["_%d" % i] = parts[i]
    return fields


# ---- room-dispatcher.mjs:210-217 ----
def prism_forward_row(answer_row, prism_idx, ts):
    f = parse_pipe_row(answer_row)
    shown = lambda k: f.get(k, "undefined")  # template literal of an absent field
    return (
        "HBPv1|row=prism_forward|from_pid=%s|from_district=%s|gnn_status=%s|gnn_score=%s|shannon_H=%s|answer_sha16=%s|ts=%s|json=0|row_hash=%s"
        % (
            shown("pid"),
            shown("district"),
            shown("gnn_status"),
            shown("gnn_score"),
            shown("shannon_H"),
            shown("answer_sha16"),
            ts,
            sha8("%sprism%s" % (f.get("pid") or "", prism_idx)),
        )
    )


# ---- asolaria-hookwall.mjs:34-59 ----
def or_default(v, fb):
    return fb if v == "" else v


def stamp_pid(env):
    digest = env.get("payload_sha16") or sha16(json_quote(nn(env.get("payload"), "")))
    basis = "%s|%s|%s|%s" % (env.get("actor") or "anon", env.get("verb") or "event", env.get("target") or "fabric", digest)
    return "BH.HOOKWALL.%s" % sha16(basis).upper()


def observation_row(pid, actor, verb, target, verdict, sc, prev_hash, ts):
    base = [
        "HBPv1",
        "row=hookwall_observation",
        "pid=%s" % pid,
        "actor=%s" % or_default(actor, "anon"),
        "verb=%s" % or_default(verb, "event"),
        "target=%s" % or_default(target, "fabric"),
        "verdict=%s" % verdict,
        "score=%s" % sc["composite"],
        "l0_real=%s" % ("true" if sc["l0_real"] else "false"),
        "mark=%s" % sc["mark"],
        "reverse_risk=%s" % sc["reverse_risk"],
        "prev_hash=%s" % or_default(prev_hash, "0000000000000000"),
        "ts=%s" % ts,
        "json=0",
        "runtime=0",
    ]
    joined = "|".join(base)
    return joined + "|row_hash=%s" % sha8(joined)


# ---- asolaria-hookwall.mjs:62-132 with fixture SCORE/Fischer lanes ----
class FixtureLanes:
    def __init__(self, verdicts):
        self.verdicts = verdicts
        self.calls = []

    def score(self, pid, content):
        self.calls.append("score:%s:%s" % (pid, sha16(content)))
        return SC

    def fischer(self, pid, env, sc, prev_hash):
        n = len(self.calls)
        self.calls.append("fischer:%s:%s:%s:%s" % (pid, nn(env.get("verb"), ""), prev_hash, sc["composite"]))
        return self.verdicts[n % len(self.verdicts)]

    def take(self):
        s = ";".join(self.calls)
        self.calls = []
        return s


def hw_pass(env, lanes, observe_only=False, prev_hash=""):
    pid = env.get("pid") or stamp_pid(env)
    payload = env.get("payload")
    content = payload if isinstance(payload, str) else json_quote(nn(env.get("verb"), ""))
    sc = lanes.score(pid, content)
    fv = lanes.fischer(pid, env, sc, prev_hash)
    if observe_only:
        verdict = "OBSERVE_ONLY"
    elif fv in ("BLOCK", "REFUTE"):
        verdict = "BLOCK_AND_PRESERVE"
    elif sc["promoted"] and fv == "PROCEED":
        verdict = "FARM_GEM_WITH_GATES"
    else:
        verdict = "BLOCK_AND_PRESERVE"
    obs = observation_row(pid, env.get("actor") or "", env.get("verb") or "", env.get("target") or "", verdict, sc, prev_hash, TS)
    return {"pid": pid, "verdict": verdict, "pass": verdict != "BLOCK_AND_PRESERVE",
            "preserved": verdict == "BLOCK_AND_PRESERVE", "observation": obs, "row_hash": obs.rsplit("row_hash=", 1)[1],
            "mark": sc["mark"], "score": sc["composite"]}


def hw_pass_chain(envs, lanes, prev_hash=""):
    prev = prev_hash or "0000000000000000"
    out = []
    for env in envs:
        r = hw_pass(env, lanes, False, prev)
        prev = r["row_hash"]
        out.append(r)
    return out


def pass_line(r):
    return "%s|%s|%s|%s|%s" % (r["pid"], r["verdict"], js_bool(r["pass"]), js_bool(r["preserved"]), r["observation"])


def js_bool(b):
    return "true" if b else "false"


# ---- gc-runtime.mjs:14-57 ----
class Gc:
    def __init__(self, every):
        self.every, self.total, self.since, self.runs, self.files, self.reason = every, 0, 0, 0, 0, None

    def emit(self):
        self.total += 1
        self.since += 1
        self.files += 1
        if self.since >= self.every:
            self.gulp("auto_threshold")
        return self.status()

    def gulp(self, reason):
        self.since = 0
        self.runs += 1
        self.reason = reason
        self.files = max(0, self.files - self.every)

    def cap(self):
        return "fail" if self.files >= 2000 else ("warn" if self.files >= 1800 else "pass")

    def status(self):
        return "%d/%d/%d/%d/%s/%s" % (self.total, self.since, self.runs, self.files, self.cap(), self.reason or "null")


# ---- asolaria-loop.mjs:26-103 ----
DISTRICT_ROOMS = {"rotator": 2000, "prism": 2000, "engineering": 2000, "white-room": 1500, "gnn-feed": 1500, "council": 1000}


def district_room_count(name, scale):
    return DISTRICT_ROOMS.get(name, 2000) * scale


class LoopCtx:
    def __init__(self, district, anchor=None, scale=1, gc_every=None):
        self.district = district
        self.room_count = district_room_count(district, scale)
        self.rev = Revolver(anchor or "ASOLARIA-LOOP-%s" % district.upper())
        self.router = Router()
        self.gc = Gc(nn(gc_every, 2000))
        self.prev_hash = "0000000000000000"
        self.prism_rev = Revolver("ASOLARIA-PRISM-ROTATOR-%s" % district.upper())
        self.prism_room_count = district_room_count("prism", scale)


def loop_cycle(ctx, lanes, question=None, observe_only=False):
    agent_pid = ctx.rev.next_pid()
    rotation = ctx.rev.counter - 1
    room_id = room_id_from_pid(agent_pid) % ctx.room_count
    noop = ctx.router.plan_swap_to(room_id)
    swap_row = (
        "HBPv1|row=project_swap|agent_pid=%s|room=%s|rotation=%s|invariant=rename-before-load|ts=%s|json=0"
        % (agent_pid, room_id, rotation, TS)
    )
    q = question or "[%s] cycle %s: produce one genius/mistake mark for this lane" % (ctx.district, rotation)
    agent = run_free_agent_mock("opencode-coder", q, agent_pid)
    env = {"pid": agent_pid, "actor": ctx.district, "verb": "answer", "target": "prism", "payload": agent["answer"]}
    gate = hw_pass(env, lanes, observe_only, ctx.prev_hash)
    ctx.prev_hash = gate["row_hash"]
    seg = ""
    if ctx.prism_rev and ctx.prism_room_count:
        prism_rotation = ctx.prism_rev.counter
        prism_pid = ctx.prism_rev.next_pid()
        seg = "|prism_room=%s|prism_pid=%s|prism_rotation=%s" % (
            room_id_from_pid(prism_pid) % ctx.prism_room_count, prism_pid, prism_rotation)
    prism_in = (
        "HBPv1|row=prism_in|from_pid=%s|from_room=%s%s|mark=%s|score=%s|gnn_lane=reverse_gain_gnn|answer_sha16=%s|ts=%s|json=0"
        % (agent_pid, room_id, seg, gate["mark"], gate["score"], sha8(agent["answer"]), TS)
    )
    ctx.gc.emit()
    outcome = "%s|%s|%s|%s|%s|%s|%s" % (agent_pid, room_id, rotation, js_bool(not noop), gate["verdict"], ctx.gc.runs, ctx.gc.cap())
    return {"swap": swap_row, "prism_in": prism_in, "observation": gate["observation"], "outcome": outcome}


# ---- asolaria-kernel.mjs:91-104 with room-dispatcher.mjs:162-190 (mock, skipGnn, no inbox) ----
def primitive_loop(district, idx):
    pid = room_pid(district, idx)
    agent_type = AGENT_TYPE.get(district, "generic")
    agent = run_free_agent_mock(agent_type, "[%s] default lane probe" % district, pid)
    hook = hookwall_gate_e4(agent["self_score_milli"] * 10)  # gnnScore = self_score = k/1000
    content = sha16(agent["answer"])  # score(pid, dispatched.answer_sha16)
    return "%s|%s|%s|%s|%s|%s|%s|%s:%s" % (pid, agent_type, hook, SC["composite"], SC["provenance"], SC["mark"],
                                           js_bool(SC["l0_real"]), pid, content)


# ---- github-pid-register.mjs:14-68 ----
ROLE_SUFFIX = {"AGT": "C", "SUP": "A", "PROF": "B"}


def dash_runs(s, keep):
    out, in_run = [], False
    for ch in s:
        if keep(ch):
            out.append(ch)
            in_run = False
        elif not in_run:
            out.append("-")
            in_run = True
    return "".join(out)


def mint_pid(role, name, tier=4, nest=1, kind="logical", prime=0):
    up = lambda ch: ("A" <= ch <= "Z") or ("0" <= ch <= "9")
    safe = dash_runs(str(name).upper(), up)
    if safe.startswith("-"):
        safe = safe[1:]
    if safe.endswith("-"):
        safe = safe[:-1]
    h = sha256hex(safe)
    hexs = h[0:3].upper() + ROLE_SUFFIX[role]
    seed = int(h[0:8], 16)
    a = "%02d" % max(0, min(15, tier))
    p = "%02d" % prime
    n = "%05d" % nest
    pid = "%s-%s-PID-H%s-A%s-W1024-P%s-N%s" % (role, safe, hexs, a, p, n)
    return [pid, safe, "H" + hexs, a, "1024", p, n, kind, str(1 if kind == "real" else 0), str(seed % 3),
            str(seed % 4), str(seed % 5), str(seed % 1024), str(seed % 113), str(int(h[8:16], 16)),
            "BH.%d.%d.%d" % (seed % 113, seed % 3, seed % 1024), h[0:16]]


# ---- omni-engine-loop.mjs:44-78 ----
def extract_register_place(name, room_index, tier=4):
    sup = mint_pid("SUP", name, tier, 1, "logical", 0)
    slot = ((room_index % 10000) + 10000) % 10000
    return "%s|%s|room-%06d|fabric-agent-preload-catalog.v1|0" % (sup[0], sup[13], slot)


def omni_engine_loop_cycle(rows, max_resident):
    resident, released, _ = gulp_cycle(len(rows), max_resident)
    extracted = held = gced = 0
    placements = []
    for i, key in enumerate(rows[:resident]):
        v = omni_flywheel_verdict(omni_quant_score(key))
        if v == "EXTRACT":
            alnum = lambda ch: ("A" <= ch <= "Z") or ("a" <= ch <= "z") or ("0" <= ch <= "9")
            placements.append(extract_register_place(("SUP-FROM-%s" % dash_runs(key, alnum))[:40], i, 4))
            extracted += 1
        elif v == "HOLD":
            held += 1
        else:
            gced += 1
    return resident, released, max_resident, extracted, held, gced, len(placements), placements[:3]


# ---- omni-engine-loop.mjs:27-41 ----
def omni_quant_score(key):
    return int(sha256hex(key)[:4], 16) % 1001


def omni_flywheel_verdict(score):
    return "EXTRACT" if score >= 700 else ("HOLD" if score >= 300 else "GC")


def gulp_cycle(n, cap):
    resident = min(n, cap)
    return resident, max(0, n - cap), resident <= cap


SC = {"composite": "0.667", "l0_real": False, "mark": "GENIUS", "reverse_risk": "0.333", "promoted": True,
      "provenance": "shannon:always+baseline:always"}


def expected():
    out = {}
    out["mint.tuple.a"] = mint_from_tuple(0, "dev-anchor", "nervous", 2, 256)
    out["mint.tuple.b"] = mint_from_tuple(42, "ASOLARIA-DISTRICT-ENGINEERING", "memory", 7919, 1024)
    out["mint.tuple.c"] = mint_from_tuple(255, "x", "lymphatic", 31, 256)
    out["mint.index.a"] = mint_from_index(0, 256)
    out["mint.index.b"] = mint_from_index(12345, 256)
    out["mint.index.c"] = mint_from_index(99999999999, 1024)
    out["prime.0"] = str(prime_at(0))
    out["prime.10"] = str(prime_at(10))
    out["prime.999"] = str(prime_at(999))
    out["glyph.0"] = glyph_at(0)
    out["glyph.255"] = glyph_at(255)
    out["glyph.1023"] = glyph_at(1023)
    out["hilbert.128.0"] = "%s,%s" % hilbert_xy(128, 0)
    out["hilbert.128.1000"] = "%s,%s" % hilbert_xy(128, 1000)
    out["hilbert.256.65535"] = "%s,%s" % hilbert_xy(256, 65535)
    pid0 = room_pid("engineering", 0)
    out["roompid.eng.0"] = pid0
    out["roompid.eng.1999"] = room_pid("engineering", 1999)
    out["roompid.prism.42"] = room_pid("prism", 42)
    for idx in (1, 255, 256, 1999, 65537):
        out["roomdesc.eng.%d" % idx] = room_descriptor_row("engineering", idx, room_pid("engineering", idx), 704, TS)
    c = room_coords(pid0)
    out["roomcoords.eng.0"] = "%s|%s|%s|%s|%s" % (c["coord64"], c["dims"], c["cp"], c["glyph"], c["tuple"])
    out["roomdesc.eng.0"] = room_descriptor_row("engineering", 0, pid0, 704, TS)
    out["supervisor.eng"] = supervisor_pid("engineering")
    out["districts.total_rooms"] = "10000"
    out["districts.count"] = "6"

    rid = lambda p: nn(room_id_from_pid(p), "none")
    out["roomid.pid0"] = str(rid(pid0))
    out["roomid.sample"] = str(rid("BH.DISTRICT.PRISM.R00042.DEADBEEFDEADBEEF"))
    out["roomid.nonbmp"] = str(rid("\U0001F600abc"))
    out["roomid.empty"] = str(rid(""))
    out["folder.42"] = room_folder_name(42, "omni-room", "behcs-256")
    router = Router()
    kinds = ["noop" if router.plan_swap_to(n) else "swap" for n in (0, 5, 5, 7)]
    out["router.swaps"] = "%s|swap_count=%d|active=%d" % (",".join(kinds), router.swap_count, router.active_room_id)

    rev = revolver_for("engineering")
    out["revolver_for.anchor"] = rev.anchor
    for n in range(3):
        out["rotation.%d" % n] = rotate_row(rev, "engineering", 2000, TS)
    try:
        Revolver("")
        out["revolver.empty_anchor"] = "ok"
    except TypeError:
        out["revolver.empty_anchor"] = "BadDevice"
    try:
        Revolver("a", 512).next_pid()
        out["revolver.alphabet512"] = "ok"
    except ValueError:
        out["revolver.alphabet512"] = "BadAlphabet"
    r1024 = Revolver("ANCHOR-1024", 1024)
    out["revolver.1024"] = ",".join(r1024.next_pid() for _ in range(3))

    answer_row = "HBPv1|row=room_answer|pid=BH.DISTRICT.ENGINEERING.R00000.ABC123ABC123ABC1|district=engineering|gnn_score=0.8100|gnn_status=FORWARD_GNN_MARK_GENIUS|shannon_H=3.1200|answer_sha16=0123456789abcdef"
    out["prism_forward.7"] = prism_forward_row(answer_row, 7, TS)
    out["prism_forward.missing"] = prism_forward_row("HBPv1|row=room_answer|district=x", 3, TS)
    out["prism_forward.emptypid"] = prism_forward_row("HBPv1|row=room_answer|pid=|district=x", 3, TS)
    out["prism_forward.trim_feff"] = prism_forward_row(
        "\ufeff HBPv1|row=room_answer|pid=P1|district=d|answer_sha16=ab\ufeff\u3000", 4, TS)
    out["prism_forward.trim_nel"] = prism_forward_row("HBPv1|row=room_answer|pid=P2\x85|district=d\x1c", 5, TS)

    out["gate.7199"] = hookwall_gate_e4(7199)
    out["gate.7200"] = hookwall_gate_e4(7200)
    m = run_free_agent_mock("opencode-coder", "a" + "\U0001F600" * 30, "PID-1")
    out["mock.cut_pair"] = "%s|%s" % (m["answer"], sha8(m["answer"]))
    m = run_free_agent_mock("mint-critic", "\u00e9" * 70, "PID-2")
    out["mock.bmp70"] = "%s|%s|%s" % (m["answer"], sha8(m["answer"]), m["self_score_milli"])

    out["stamp_pid.a"] = stamp_pid({"actor": "engineering", "verb": "answer", "target": "prism",
                                    "payload_sha16": sha16("deterministic-answer-payload")})
    out["stamp_pid.unit_test"] = stamp_pid({"actor": "helm", "verb": "review", "target": "fabric", "payload": "x"})
    out["stamp_pid.defaults"] = stamp_pid({})
    out["stamp_pid.escapes"] = stamp_pid({"actor": "a", "verb": "b", "target": "c", "payload_sha16": "",
                                          "payload": 'q"b\\s\nn\r\t\b\f\x01\x1f\x7f\u2028\U0001F600'})
    out["observation.a"] = observation_row("BH.HOOKWALL.ABCDEF0123456789", "engineering", "answer", "prism", "FARM_GEM_WITH_GATES", SC, "0000000000000000", TS)
    out["observation.defaults"] = observation_row("P", "", "", "", "OBSERVE_ONLY", SC, "", TS)

    envs = [
        {"actor": "helm", "verb": "review", "target": "fabric", "payload": "x"},
        {"pid": "PID-B", "actor": "", "verb": "", "target": ""},
        {"pid": "", "actor": "a", "verb": "tick", "target": "t"},
    ]
    lanes = FixtureLanes(["PROCEED", "BLOCK", "REFUTE"])
    for n, r in enumerate(hw_pass_chain(envs, lanes, "")):
        out["pass_chain.%d" % n] = pass_line(r)
    out["pass_chain.lanes"] = lanes.take()
    lanes = FixtureLanes(["HOLD"])
    out["pass.direct"] = pass_line(hw_pass(envs[0], lanes, False, ""))
    out["pass.direct.lanes"] = lanes.take()

    # loop cycles (asolaria-loop.mjs:32-103)
    lanes = FixtureLanes(["PROCEED"])
    ctx = LoopCtx("engineering")
    for n in range(2):
        o = loop_cycle(ctx, lanes)
        out["loop.%d.project_swap" % n] = o["swap"]
        out["loop.%d.prism_in" % n] = o["prism_in"]
        out["loop.%d.observation" % n] = o["observation"]
        out["loop.%d.outcome" % n] = o["outcome"]
        out["loop.%d.lanes" % n] = lanes.take()
    ctx = LoopCtx("engineering", "ANCHOR-OBS")
    for n in range(2):
        o = loop_cycle(ctx, lanes, None, True)
        out["loop_obs.%d.observation" % n] = o["observation"]
        out["loop_obs.%d.outcome" % n] = o["outcome"]
    lanes.take()
    out["loop_emptyq.prism_in"] = loop_cycle(LoopCtx("engineering"), lanes, "")["prism_in"]
    out["loop_astral.prism_in"] = loop_cycle(LoopCtx("engineering"), lanes, "\U0001F600" * 40)["prism_in"]
    out["loop_astral.lanes"] = lanes.take()
    ctx = LoopCtx("council", "", 1, 1)
    ctx.prism_room_count = 1
    for n in range(2):
        o = loop_cycle(ctx, lanes, "q")
        out["loop_prism1.%d.prism_in" % n] = o["prism_in"]
        out["loop_prism1.%d.outcome" % n] = o["outcome"]
    lanes.take()
    ctx = LoopCtx("white-room", None, 3, 7)
    out["loop_ctx.white-room"] = "%s|%s|%s|%s|%s" % (ctx.rev.anchor, ctx.prism_rev.anchor, ctx.room_count,
                                                     ctx.prism_room_count, ctx.gc.every)
    for name, scale in (("prism", 1), ("white-room", 1), ("council", 3), ("unknown", 1)):
        out["district_room_count.%s.%d" % (name, scale)] = str(district_room_count(name, scale))
    out["kernel.engineering.0"] = primitive_loop("engineering", 0)
    out["kernel.zzz.7"] = primitive_loop("zzz", 7)

    # gc: window 4, 10 emits
    gc = Gc(4)
    for _ in range(10):
        gc.emit()
    out["gc.after10"] = "total=%d|runs=%d|file_count=%d|since=%d|cap=%s" % (gc.total, gc.runs, gc.files, gc.since, gc.cap())
    gc = Gc(5000)
    marks = []
    for n in range(1, 2001):
        st = gc.emit()
        if n in (1799, 1800, 1999, 2000):
            marks.append(st)
    gc.gulp("cli_manual")
    marks.append(gc.status())
    out["gc.caps"] = ",".join(marks)

    out["omniquant.row-0"] = str(omni_quant_score("row-0"))
    out["omniquant.x"] = str(omni_quant_score("x"))
    r, g, b = gulp_cycle(1000000, 2000)
    out["gulp.1M"] = "%s|%s|%s" % (r, g, "true" if b else "false")
    for score in (800, 500, 100, 299, 300, 699, 700):
        out["flywheel.%d" % score] = omni_flywheel_verdict(score)

    out["mintpid.sup.shannon"] = "|".join(mint_pid("SUP", "shannon", 4, 1, "logical", 0))
    out["mintpid.agt.shannon"] = "|".join(mint_pid("AGT", "shannon", 4, 1, "logical", 1))
    out["mintpid.prof.mixed"] = "|".join(mint_pid("PROF", "  h\u00e9llo w\u00f6rld--\u00df ", 20, 12, "real", 3))
    out["mintpid.sup.tier_neg"] = "|".join(mint_pid("SUP", "-", -3, 0, "logical", 0))
    out["extract.10003"] = extract_register_place("SUP-FROM-row-1", 10003, 4)
    out["extract.neg1"] = extract_register_place("x", -1, 4)
    cy = omni_engine_loop_cycle(["row-%d" % i for i in range(5000)], 2000)
    out["omni_cycle.5000"] = "%d|%d|%d|%d|%d|%d|%d|0|RUN_HERMES_SPINDLE-operator-gated|%s" % (cy[:7] + (";".join(cy[7]),))
    cy = omni_engine_loop_cycle(["\U0001F600 key!! with\tspace and a long tails that runs past forty #3", "", "-lead-1-"], 2000)
    out["omni_cycle.odd"] = "%d|%d|%d|%d|%s" % (cy[3], cy[4], cy[5], cy[6], ";".join(cy[7]))
    out["sha8.sample"] = sha8("asolaria-loop")
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    check = "--check" in sys.argv[1:]
    if not args:
        sys.stderr.write("usage: referee_hbp.py [--check] <emit_rows-binary>\n")
        return 2
    binary = args[0]
    proc = subprocess.run([binary], check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
    if proc.returncode != 0:
        sys.stderr.write("emit_rows failed: %s\n" % proc.stderr.decode("utf-8", "replace"))
        return 1
    actual = {}
    # split on LF only: rows may carry U+0085 / U+001C, which str.splitlines would also split on
    for line in proc.stdout.decode("utf-8").split("\n"):
        if "\t" not in line:
            continue
        k, v = line.split("\t", 1)
        actual[k] = v
    exp = expected()
    mismatches = []
    for k in sorted(exp):
        if k not in actual:
            mismatches.append((k, exp[k], "<MISSING>"))
        elif actual[k] != exp[k]:
            mismatches.append((k, exp[k], actual[k]))
    extra = sorted(set(actual) - set(exp))
    ok = not mismatches and not extra
    print("referee: %d rows checked, %d mismatches, %d unexpected" % (len(exp), len(mismatches), len(extra)))
    for k, e, a in mismatches:
        print("  MISMATCH %s\n    expected: %s\n    actual:   %s" % (k, e, a))
    for k in extra:
        print("  UNEXPECTED %s = %s" % (k, actual[k]))
    if check:
        return 0 if ok else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
