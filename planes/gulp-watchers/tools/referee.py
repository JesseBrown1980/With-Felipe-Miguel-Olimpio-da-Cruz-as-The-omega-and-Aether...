#!/usr/bin/env python3
"""Independent stdlib referee for the gulp/watcher planes.

Mirrors the upstream JavaScript/TypeScript line by line and writes the HBP fixtures in
tests/fixtures/ that tests/parity.rs checks the Rust port against. Integer arithmetic only:
where upstream compares doubles (gnnConstructionWatcher.js:115, :123), the referee rounds each
ratio to its IEEE-754 binary64 value with integer arithmetic and compares those.

  python3 -I tools/referee.py            # (re)generate the fixtures
  python3 -I tools/referee.py --check    # regenerate in memory, diff against committed fixtures
"""

import os
import sys

FIX = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "tests", "fixtures")


# --- HBP row text (matches src/hbp.rs escape + render) ---------------------

def esc(s):
    out = []
    for ch in s:
        u = ord(ch)
        if u < 0x20 or u == 0x7F or ch in "% |=":
            out.append("%%%02X" % u)
        else:
            out.append(ch)
    return "".join(out)


def row(kind, *fields):
    return kind + "".join("|%s=%s" % (k, v) for k, v in fields)


def opt(v):
    return "-" if v is None else esc(v)


# --- JavaScript string rules -----------------------------------------------

# ECMAScript WhiteSpace + LineTerminator: the /\s/ and String.prototype.trim set (U+FEFF in, U+0085 out).
JS_WS = frozenset([0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x20, 0xA0, 0x1680] + list(range(0x2000, 0x200B))
                  + [0x2028, 0x2029, 0x202F, 0x205F, 0x3000, 0xFEFF])


def is_js_ws(ch):
    return ord(ch) in JS_WS


def js_trim(s):
    a, b = 0, len(s)
    while a < b and is_js_ws(s[a]):
        a += 1
    while b > a and is_js_ws(s[b - 1]):
        b -= 1
    return s[a:b]


def js_words(s):
    """s.split(/\\s+/) with the empty pieces dropped."""
    words, cur = [], []
    for ch in s:
        if is_js_ws(ch):
            if cur:
                words.append("".join(cur))
                cur = []
        else:
            cur.append(ch)
    if cur:
        words.append("".join(cur))
    return words


def u16len(s):
    """str.length: UTF-16 code units."""
    return sum(2 if ord(ch) > 0xFFFF else 1 for ch in s)


def js_or(v, fallback):
    """v || fallback for a string or None."""
    return v if v else fallback


# --- IEEE-754 binary64 values of integer ratios, integer arithmetic only ---

def f64_ratio(num, den):
    """The binary64 nearest num/den (ties to even) as (mant, exp): value = mant * 2**exp, mant in
    [2**52, 2**53), or (0, 0) for zero. num >= 0, den > 0. This is JavaScript's num / den."""
    if num == 0:
        return (0, 0)
    shift = 56 + den.bit_length() - num.bit_length()
    if shift >= 0:
        q, r = divmod(num << shift, den)
    else:
        q, r = divmod(num, den << (-shift))
    exp = -shift
    extra = q.bit_length() - 53
    mant = q >> extra
    rest = q & ((1 << extra) - 1)
    half = 1 << (extra - 1)
    if rest > half or (rest == half and (r != 0 or mant & 1)):
        mant += 1
    exp += extra
    if mant == 1 << 53:
        mant >>= 1
        exp += 1
    return (mant, exp)


def f64_gt(a, b):
    """a > b for two non-negative values from f64_ratio."""
    if a[0] == 0:
        return False
    if b[0] == 0:
        return True
    return (a[1], a[0]) > (b[1], b[0])


F64_POINT_SIX = f64_ratio(3, 5)  # the literal 0.6 (gnnConstructionWatcher.js:123)


# --- cadence: gnn-feedback-cadence-adjuster.mjs:44-90 ----------------------

def cadence_step(in_score, in_ms, verdict, intent, is_reply, min_ms=5000, max_ms=60000, decay_pm=850):
    score_pm, current_ms = in_score, in_ms
    if verdict == "promote":                                  # :48-51
        delta = 2000 if is_reply else 1000
    elif verdict == "demote":
        delta = -500
    elif verdict == "halt":
        delta = -5000
    else:  # neutral and unknown both contribute 0
        delta = 0
    if intent == "leak":                                      # :54-55
        delta += 100
    elif intent == "mask":
        delta -= 300
    sgn = -1 if score_pm < 0 else 1                           # :59-61, Math.floor = //
    decayed = sgn * ((abs(score_pm) * decay_pm + 500) // 1000)
    score_pm = decayed + delta
    if abs(score_pm) < 500:                                   # :72-76
        current_ms = max(min_ms, min(max_ms, current_ms))
        damped = True
    else:
        if score_pm > 2000:                                   # :80-82
            current_ms = max(min_ms, (current_ms * 4 + 4) // 5)
        elif score_pm < -2000:                                # :83-85
            current_ms = min(max_ms, (current_ms * 5 + 3) // 4)
        current_ms = max(min_ms, min(max_ms, current_ms))     # :88
        damped = False
    return score_pm, current_ms, damped


def cadence_fixture():
    lines = ["# cadence.hbp from tools/referee.py; do not edit",
             "# Mirrors gnn-feedback-cadence-adjuster.mjs:44-90. CAD rows: default config (5000, 60000, 850),",
             "# in-state + outcome -> out-state. CADC rows add the config (min_ms, max_ms, decay_pm), including",
             "# min > max, negative bounds and a negative decay."]
    verdicts = ["promote", "demote", "halt", "neutral", "unknown"]
    intents = ["leak", "mask", "none"]
    for v in verdicts:
        for it in intents:
            for rep in (0, 1):
                for sc in (0, 400, -400, 3000, -3000, 25000):
                    for ms in (5000, 10000, 48000, 60000):
                        out_s, out_ms, damp = cadence_step(sc, ms, v, it, rep == 1)
                        lines.append(row("CAD",
                                         ("in_score", sc), ("in_ms", ms),
                                         ("verdict", v), ("intent", it), ("is_reply", rep),
                                         ("out_score", out_s), ("out_ms", out_ms),
                                         ("damped", 1 if damp else 0)))
    configs = [(5000, 3000, 850), (70000, 60000, 850), (-60000, 60000, 850),
               (5000, 60000, -850), (-60000, -5000, 850)]
    for (mn, mx, dec) in configs:
        for v in ("promote", "demote", "halt", "neutral"):
            for it in ("leak", "mask"):
                for rep in (0, 1):
                    for sc in (0, 2600, -3000):
                        for ms in (-10002, 10000, 65000):
                            out_s, out_ms, damp = cadence_step(sc, ms, v, it, rep == 1, mn, mx, dec)
                            lines.append(row("CADC",
                                             ("min_ms", mn), ("max_ms", mx), ("decay_pm", dec),
                                             ("in_score", sc), ("in_ms", ms),
                                             ("verdict", v), ("intent", it), ("is_reply", rep),
                                             ("out_score", out_s), ("out_ms", out_ms),
                                             ("damped", 1 if damp else 0)))
    return lines


# --- gc: gc.ts:96, :120-156 ------------------------------------------------

def gc_decide(basename, size, line_count, max_bytes, max_lines, sanity):
    if size > sanity:                                                         # :120-126
        return (False, None, "file exceeds sanityBytes=%d, refusing" % sanity, None, None)
    eff = None if size > max_bytes else line_count                            # :128
    rotate_bytes = size >= max_bytes                                          # :129
    rotate_lines = eff is not None and eff >= max_lines                       # :130
    if not rotate_bytes and not rotate_lines:                                 # :132-138
        return (False, "none", None, None, eff)
    lr = str(eff) if eff is not None else "~"
    sentence = "EVT-GC-ROTATED { %s } · %d BYTES · %s LINES @ M-EYEWITNESS ." % (basename, size, lr)  # :146
    return (True, "bytes" if rotate_bytes else "lines", None, sentence, eff)


def gc_archive_name(basename, iso):
    return "%s-%s.ndjson" % (basename, iso.replace(":", "-").replace(".", "-"))  # :96, :141


def gc_fixture():
    lines = ["# gc.hbp from tools/referee.py; do not edit",
             "# Mirrors gc.ts:96, :120-156. GC rows carry inputs + the rotation decision + the EVT-GC-ROTATED",
             "# sentence + the archive name; a rotated case is followed by its golden EVT-GC-ROTATED summary row."]
    MB = 1024 * 1024
    cases = [
        ("router-events.ndjson", 10, 5, 100, 10, 1000),
        ("router-events.ndjson", 100, 5, 100, 10, 1000),
        ("router-events.ndjson", 50, 10, 100, 10, 1000),
        ("router-events.ndjson", 50, 9, 100, 10, 1000),
        ("router-events.ndjson", 101, 0, 100, 10, 1000),
        ("router-events.ndjson", 1001, 0, 100, 10, 1000),
        ("hermes-events.ndjson", 49 * MB, 99999, 50 * MB, 100000, 500 * MB),
        ("hermes-events.ndjson", 50 * MB, 100000, 50 * MB, 100000, 500 * MB),
        ("hermes-events.ndjson", 49 * MB, 100000, 50 * MB, 100000, 500 * MB),
        ("hermes-events.ndjson", 60 * MB, 0, 50 * MB, 100000, 500 * MB),
        ("hermes-events.ndjson", 501 * MB, 0, 50 * MB, 100000, 500 * MB),
    ]
    root = "/home/op/.asolaria-workers"
    for i, (bn, size, lc, mb, ml, sn) in enumerate(cases):
        rotated, reason, err, sentence, eff = gc_decide(bn, size, lc, mb, ml, sn)
        ts = "2026-10-17T00:00:%02d.000Z" % i
        stamp_iso = "2026-10-17T00:00:%02d.001Z" % i
        archive_name = gc_archive_name(bn, stamp_iso)
        lines.append(row("GC",
                         ("basename", esc(bn)), ("size", size), ("lines", lc),
                         ("maxBytes", mb), ("maxLines", ml), ("sanity", sn),
                         ("rotated", 1 if rotated else 0),
                         ("reason", reason if reason is not None else "-"),
                         ("err", esc(err) if err is not None else "-"),
                         ("sentence", esc(sentence) if sentence is not None else "-"),
                         ("ts", esc(ts)), ("root", esc(root)), ("iso", esc(stamp_iso)),
                         ("archive_name", esc(archive_name))))
        if rotated:
            lines.append(row("EVT-GC-ROTATED",                               # :147-156
                             ("ts", esc(ts)), ("event", "EVT-GC-ROTATED"),
                             ("source", esc(root + "/" + bn)),
                             ("archive", esc(root + "/archive/" + archive_name)),
                             ("bytes", size), ("lines", "" if eff is None else eff),
                             ("reason", reason), ("glyph_sentence", esc(sentence))))
    return lines


# --- gulp: gulp.ts:103-142 -------------------------------------------------

def gulp_run(records, since_ms, emit):
    ev_order, ev = [], {}
    gl_order, gl = [], {}
    scanned = skipped = 0
    for (event, kind, glyph, glyph_id, ts) in records:
        if ts is not None and ts < since_ms:
            skipped += 1
            continue
        scanned += 1
        k = event if event is not None else (kind if kind is not None else "unknown")
        g = glyph if glyph is not None else (glyph_id if glyph_id is not None else "-")
        if k not in ev:
            ev_order.append(k); ev[k] = 0
        ev[k] += 1
        if g not in gl:
            gl_order.append(g); gl[g] = 0
        gl[g] += 1
    ev_ranked = sorted([(k, ev[k]) for k in ev_order], key=lambda p: -p[1])
    gl_ranked = sorted([(k, gl[k]) for k in gl_order], key=lambda p: -p[1])
    top10 = ev_ranked[:10]
    sentences = []
    if emit:
        sentences = ["OP-GULP-SUMMARY { %s · %d } @ M-EYEWITNESS ." % (k, c) for (k, c) in top10]
    return scanned, skipped, ev_ranked, gl_ranked, sentences


def gulp_fixture():
    since = 1000
    recs = [
        ("EVT-A", None, "g1", None, 2000),
        ("EVT-A", None, "g1", None, 3000),
        ("EVT-A", None, "g2", None, None),
        ("EVT-B", None, "g1", None, 2500),
        ("EVT-B", None, "g2", None, 5000),
        (None, "EVT-C", None, "gid7", 4000),
        (None, None, None, None, 4000),               # unknown kind, "-" glyph
        ("EVT-OLD", None, "g9", None, 500),           # below since -> skipped
        ("EVT-D", None, "g3", None, 6000),
        ("EVT-E", None, "g3", None, 6000),
        ("EVT-F", None, "g3", None, 6000),
        ("EVT-G", None, "g4", None, 6000),
        ("EVT-H", None, "g4", None, 6000),
        ("EVT-I", None, "g4", None, 6000),
        ("EVT-J", None, "g5", None, 6000),
        ("EVT-K", None, "g6", None, 6000),
        ("EVT-L", None, "g6", None, 6000),            # 13 ranked kinds (12 named + "unknown") -> top-10 cut
    ]
    scanned, skipped, evr, glr, sents = gulp_run(recs, since, True)
    lines = ["# gulp.hbp from tools/referee.py; do not edit",
             "# Mirrors gulp.ts:103-142. CFG + REC inputs, then SCANNED/EV/GL/SUM outputs (ranked, ties first-seen)."]
    lines.append(row("CFG", ("sinceMs", since), ("emit", 1)))
    for (event, kind, glyph, glyph_id, ts) in recs:
        lines.append(row("REC",
                         ("event", opt(event)), ("kind", opt(kind)),
                         ("glyph", opt(glyph)), ("glyph_id", opt(glyph_id)),
                         ("ts", "-" if ts is None else ts)))
    lines.append(row("SCANNED", ("scanned", scanned), ("skipped", skipped)))
    for i, (k, c) in enumerate(evr):
        lines.append(row("EV", ("rank", i), ("key", esc(k)), ("count", c)))
    for i, (k, c) in enumerate(glr):
        lines.append(row("GL", ("rank", i), ("key", esc(k)), ("count", c)))
    for i, s in enumerate(sents):
        lines.append(row("SUM", ("rank", i), ("sentence", esc(s))))
    return lines


# --- construction routing: gnnConstructionWatcher.js:49-140 ----------------

class Watcher:
    def __init__(self):
        self.routing = {}   # from -> dict to -> [count, conf_num, conf_den]; dicts keep Map insertion order
        self.pattern = {}   # keyword -> [cid, hits]

    def record_edge(self, frm, to):                          # :49-73
        if frm not in self.routing:                          # :50-52
            self.routing[frm] = {}
        edges = self.routing[frm]
        existing = edges.get(to)                             # :54 (the same object when present)
        if existing is None:
            existing = [0, 0, 1]
        existing[0] += 1                                     # :55
        total_out = 0                                        # :59-60: edges already in the map
        for e in edges.values():
            total_out += e[0]
        for e in edges.values():                             # :61-63
            if total_out > 0:
                e[1], e[2] = e[0], total_out
            else:
                e[1], e[2] = 0, 1
        edges[to] = existing                                 # :65 (an existing key keeps its slot)

    def record_pattern(self, kw, cid):                       # :78-88
        n = js_trim(kw.lower())
        if not n or u16len(n) < 3:
            return
        e = self.pattern.get(n)
        if e is None:
            e = [cid, 0]
        e[0] = cid
        e[1] += 1
        self.pattern[n] = e

    def predict(self, message, current):                     # :94-140
        words = [w for w in js_words(message.lower()) if u16len(w) >= 3]
        best_pat = None
        best_pat_score = 0
        for w in words:                                      # :101-107
            h = self.pattern.get(w)
            if h is not None and h[1] > best_pat_score:
                best_pat = h
                best_pat_score = h[1]
        best_route = None
        if current and current in self.routing:              # :111
            max_f64 = (0, 0)
            max_exact = (0, 1)
            pick_f64 = pick_exact = None
            for to, (count, num, den) in self.routing[current].items():
                conf = f64_ratio(num, den)                   # edge.confidence as JS stores it
                if f64_gt(conf, max_f64):                    # :115 on doubles
                    max_f64 = conf
                    pick_f64 = (to, num, den)
                if num * max_exact[1] > max_exact[0] * den:  # the port's exact-ratio compare
                    max_exact = (num, den)
                    pick_exact = (to, num, den)
            assert pick_f64 == pick_exact, (pick_f64, pick_exact)
            best_route = pick_exact
        if best_route is not None:
            to, num, den = best_route
            gate_f64 = f64_gt(f64_ratio(num, den), F64_POINT_SIX)   # :123 on doubles
            gate_exact = 5 * num > 3 * den
            assert gate_f64 == gate_exact, (num, den)
            if gate_exact:
                return (to, "routing", num, den)
        if best_pat is not None and best_pat_score >= 2:     # :131-137
            return (best_pat[0], "pattern", min(best_pat_score, 10), 10)
        return None


def construction_fixture():
    w = Watcher()
    script = [
        ("EDGE", "build", "review"),
        ("EDGE", "build", "review"),
        ("EDGE", "build", "review"),
        ("EDGE", "build", "ship"),
        ("PAT", "deploy", "ship-construction"),
        ("PAT", "deploy", "ship-construction"),
        ("PAT", "rollback", "recover-construction"),
        ("PAT", "no", "too-short"),
        ("PRED", "push the deploy now", None),     # pattern win (deploy hits=2)
        ("PRED", "rollback please", None),         # pattern score 1 -> none
        ("PRED", "anything", "build"),             # review 3/3 (ship added after the sum, stays 0)
        ("PRED", "anything", "unknown-node"),      # no routing, no pattern -> none
        ("PRED", "deploy rollback", "build"),      # routing wins over pattern
        ("EDGE", "solo", "b"),
        ("PRED", "anything", "solo"),              # a single first-seen edge keeps confidence 0 -> none
        ("EDGE", "pair", "b"),
        ("EDGE", "pair", "c"),
        ("PRED", "anything", "pair"),              # b 1/1, c 0 -> routing b
        ("EDGE", "pair", "c"),
        ("PRED", "anything", "pair"),              # c keeps its slot; b 1/3, c 2/3 -> routing c
        ("EDGE", "tie", "x"),
        ("EDGE", "tie", "y"),
        ("EDGE", "tie", "x"),
        ("EDGE", "tie", "y"),
        ("PRED", "deploy", "tie"),                 # x 2/4 first on the tie, below the gate -> pattern
        ("EDGE", "", "z"),
        ("EDGE", "", "z"),
        ("PRED", "anything", ""),                  # "" is falsy at :111 -> none
        ("PAT", "﻿key", "c-bom"),
        ("PAT", "﻿key", "c-bom"),
        ("PRED", "key", None),                     # JS trim removes U+FEFF -> pattern
        ("PAT", "\u0085nel", "c-nel"),
        ("PAT", "\u0085nel", "c-nel"),
        ("PRED", "nel", None),                     # JS trim keeps U+0085 -> none
        ("PRED", "deploy\u0085now", None),         # U+0085 is not \s -> one word -> none
        ("PRED", "go﻿deploy", None),          # U+FEFF is \s -> "deploy" -> pattern
        ("PAT", "\U0001F600a", "c-astral"),
        ("PAT", "\U0001F600a", "c-astral"),
        ("PRED", "\U0001F600a", None),             # UTF-16 length 3 -> kept -> pattern
    ]
    lines = ["# construction.hbp from tools/referee.py; do not edit",
             "# Mirrors gnnConstructionWatcher.js:49-140. EDGE/PAT build state; PRED checks the pick + source,",
             "# in file order. Each edge keeps the confidence :61-63 stored on it; the referee asserts the",
             "# upstream double compares (:115, :123) and the port's exact-ratio compares pick alike."]
    for op in script:
        if op[0] == "EDGE":
            w.record_edge(op[1], op[2])
            lines.append(row("EDGE", ("from", esc(op[1])), ("to", esc(op[2]))))
        elif op[0] == "PAT":
            w.record_pattern(op[1], op[2])
            lines.append(row("PAT", ("kw", esc(op[1])), ("cid", esc(op[2]))))
        else:
            msg, cur = op[1], op[2]
            p = w.predict(msg, cur)
            if p is None:
                lines.append(row("PRED", ("msg", esc(msg)), ("cur", opt(cur)),
                                 ("pick", "-"), ("source", "-"), ("conf_num", 0), ("conf_den", 0)))
            else:
                cid, src, num, den = p
                lines.append(row("PRED", ("msg", esc(msg)), ("cur", opt(cur)),
                                 ("pick", esc(cid)), ("source", src), ("conf_num", num), ("conf_den", den)))
    return lines


# --- shannon lens: omni-shannon-v3-4d12.js:59-134, :203-214 ----------------

DIMS = ["D2_VERB", "D5_LAYER", "D6_GATE", "D8_IDENTITY", "D11_PROOF", "D15_DEVICE",
        "D16_OWNERSHIP", "D22_TRANSLATION", "D24_INTENT", "D7_STATE", "D14_ENERGY", "D32_NEGATIVE_SPACE"]


def any_in(text, needles):
    return any(n in text for n in needles)


def test_deny(text):
    # synthetic operator predicate for the :69-73 slot (no third-party data); trips on a benign sentinel token
    return ["HD-TEST"] if "deny-sentinel" in text else []


def lens(dim, json_text, blast_raw, lev_raw, ttr_raw, dep_len, deny):
    text = json_text.lower()                                  # :61
    blast = js_or(blast_raw, "low").lower()                   # :62
    lev = js_or(lev_raw, "").lower()                          # :63
    ttr = js_or(ttr_raw, "").lower()                          # :64
    hits = []                                                 # :67
    if "novalum" in text and "external" in text:              # :68
        hits.append("HD1")
    hits.extend(deny(text))                                   # :69-73 (operator-supplied)
    if "virus" in text:                                       # :74
        hits.append("HD-virus")
    if hits:                                                  # :75
        return ("halt", "hard_deny:" + ",".join(hits), 0)
    if dim == "D2_VERB":
        s = 2 if any_in(lev, ["high"]) else 1
        reason = "capability_score=%d" % s
    elif dim == "D5_LAYER":
        s = 2 if any_in(blast, ["low", "none"]) else 0
        reason = "constraint_safe_blast=%s" % blast
    elif dim == "D6_GATE":
        s = 2 if any_in(ttr, ["minute", "second", "hour"]) else 1
        reason = "gate_advanceable_in=%s" % ttr
    elif dim == "D8_IDENTITY":
        s = 2 if any_in(text, ["identity", "register", "name"]) else 1
        reason = "identity_fits"
    elif dim == "D11_PROOF":
        s = 2 if any_in(text, ["caveat"]) else 1
        reason = "proof_caveat_present=true"
    elif dim == "D15_DEVICE":
        s = 2 if any_in(text, ["tool", "device", "hardware", "firmware"]) else 1
        reason = "device_axis_match"
    elif dim == "D16_OWNERSHIP":
        s = 2 if any_in(text, ["project", "owned", "lifecycle"]) else 1
        reason = "ownership_axis_match"
    elif dim == "D22_TRANSLATION":
        s = 2 if any_in(text, ["reference", "pointer", "bridge", "adapter", "mapping"]) else 1
        reason = "translation_axis_match"
    elif dim == "D24_INTENT":
        s = 2 if any_in(text, ["plan", "future", "next"]) else 1
        reason = "intent_axis_match"
    elif dim == "D7_STATE":
        unblocked = dep_len == 0
        s = 2 if unblocked else 1
        flag = "true" if (dep_len is None or dep_len == 0) else "false"
        reason = "state_unblocked=%s" % flag
    elif dim == "D14_ENERGY":
        s = 2 if any_in(ttr, ["minute", "second"]) else 1
        reason = "energy_cost_low"
    else:  # D32_NEGATIVE_SPACE
        s = 2 if not any_in(text, ["cosign", "approval", "gate"]) else 1
        reason = "negative_space_clearance"
    verdict = "proceed" if s >= 2 else ("pwc" if s == 1 else "needs")   # :132
    return (verdict, reason, s)


def vote(json_text, blast, lev, ttr, dep_len, deny):
    counts = {"proceed": 0, "pwc": 0, "needs": 0, "halt": 0, "refused": 0}
    total = 0
    parts = []
    for d in DIMS:
        v, reason, s = lens(d, json_text, blast, lev, ttr, dep_len, deny)
        counts[v] += 1
        total += s
        parts.append((d, v, reason, s))
    if counts["halt"] > 0 or counts["refused"] > 0:           # :210-214
        consensus = "halt"
    elif counts["needs"] > 0:
        consensus = "pwc"
    else:
        consensus = "proceed"
    return parts, total, consensus, counts


def candidate_json(fields):
    """JSON.stringify of a flat candidate (string, integer and string-list values, insertion order).
    The fixture values are printable ASCII without a quote or backslash, which JSON.stringify writes as is."""
    def value(v):
        if isinstance(v, str):
            assert all(0x20 <= ord(c) <= 0x7E and c not in '"\\' for c in v), v
            return '"%s"' % v
        if isinstance(v, int):
            return "%d" % v
        return "[" + ",".join(value(x) for x in v) + "]"
    return "{" + ",".join('"%s":%s' % (k, value(v)) for k, v in fields) + "}"


def shannon_fixture():
    cands = [
        # candidate fields (JSON.stringify order), operator predicate on
        ([("id", "c1"), ("label", "plan a tool bridge with honest_caveat for the project identity"),
          ("blast_radius", "low"), ("leverage", "high"), ("time_to_running", "minutes"), ("depends_on", [])], False),
        ([("id", "c2"), ("label", "register the device firmware mapping"),
          ("blast_radius", "high"), ("leverage", "medium"), ("time_to_running", "days"),
          ("depends_on", ["c1", "c3"])], False),
        ([("id", "c3"), ("label", "cosign approval gate requires owned lifecycle"),
          ("blast_radius", "medium"), ("leverage", "low"), ("time_to_running", "hours")], False),
        ([("id", "c4"), ("label", "deny-sentinel present in text"),
          ("blast_radius", "low"), ("leverage", "high"), ("time_to_running", "seconds"), ("depends_on", [])], True),
        ([("id", "c5"), ("label", "Next Step"), ("blast_radius", ""), ("leverage", "Very High"),
          ("time_to_running", "Minutes"), ("depends_on", [])], False),
        ([("id", "c6"), ("label", "Scan for a VIRUS"), ("leverage", "high"), ("depends_on", [])], False),
        ([("id", "c7"), ("label", "novalum external sync"), ("blast_radius", "low")], False),
        ([("id", "c8"), ("label", "novalum external virus deny-sentinel")], True),
        ([("id", "c9"), ("label", "novalum internal"), ("time_to_running", "Hours")], True),
    ]
    lines = ["# shannon.hbp from tools/referee.py; do not edit",
             "# Mirrors omni-shannon-v3-4d12.js:59-134, :203-214. CAND inputs (json = JSON.stringify(candidate),",
             "# the :61 pre-image; blast/lev/ttr = the raw fields, - when absent), then LENS per dim and the VOTE.",
             "# deny=1 puts a synthetic sentinel predicate in the :69-73 slot; that list (private names) is never used."]
    for (fields, deny_on) in cands:
        f = dict(fields)
        json_text = candidate_json(fields)
        blast, lev, ttr = f.get("blast_radius"), f.get("leverage"), f.get("time_to_running")
        dep = len(f["depends_on"]) if "depends_on" in f else None
        deny = test_deny if deny_on else (lambda t: [])
        lines.append(row("CAND",
                         ("json", esc(json_text)), ("blast", opt(blast)), ("lev", opt(lev)),
                         ("ttr", opt(ttr)), ("dep", "-" if dep is None else dep),
                         ("deny", 1 if deny_on else 0)))
        parts, total, consensus, counts = vote(json_text, blast, lev, ttr, dep, deny)
        for (d, v, reason, s) in parts:
            lines.append(row("LENS", ("dim", d), ("verdict", v), ("reason", esc(reason)), ("score", s)))
        lines.append(row("VOTE", ("total", total), ("max", 24), ("consensus", consensus),
                         ("proceed", counts["proceed"]), ("pwc", counts["pwc"]),
                         ("needs", counts["needs"]), ("halt", counts["halt"]), ("refused", counts["refused"])))
    return lines


# --- cosign durableNotify: cosign-bridge.mjs:153-189 -----------------------

def cosign_fixture():
    cases = [
        ("42", "rowhash-aa", "prev-zz", "omni-asolaria/acer/heartbeat/tick", "tick", "acer", 0, None),
        ("43", "rowhash-bb", "prev-aa", "omni/liris/edge", "edge", None, 3, False),
        ("44", "rowhash-cc", "prev-bb", "a b|c=d", None, None, 1, True),
        ("45 x", "row|hash=dd", "prev%ee", "c", "", "", 0, None),
        ("46", "rowhash-ff", "prev-dd", "", None, None, 2, None),
    ]
    lines = ["# cosign.hbp from tools/referee.py; do not edit",
             "# Mirrors cosign-bridge.mjs:153-189 (durableNotify row + decisions). HTTP/redis transport is boundary.",
             "# Each NIN input is followed by its golden DURABLE-NOTIFY row and the NDEC decision row."]
    for (seq, rh, prev, channel, event, vantage, subs, uroute) in cases:
        ur = -1 if uroute is None else (1 if uroute else 0)
        lines.append(row("NIN", ("seq", esc(seq)), ("row", esc(rh)), ("prev", esc(prev)),
                         ("channel", esc(channel)), ("event", opt(event)), ("vantage", opt(vantage)),
                         ("subs", subs), ("uroute", ur)))
        lines.append(row("DURABLE-NOTIFY",                                  # :164-172
                         ("cosign_seq", esc(seq)), ("cosign_row", esc(rh)), ("cosign_prev", esc(prev)),
                         ("channel", esc(channel)),
                         ("event", esc(event) if event is not None else ""),
                         ("vantage", esc(vantage) if vantage is not None else "")))
        gap = "logged-but-no-live-subscriber" if subs == 0 else "live-and-logged"   # :187
        ur_eff = 0 if uroute is False else 1                                       # :178
        lines.append(row("NDEC", ("gap", gap), ("uroute", ur_eff), ("channel_ok", 1 if channel else 0)))  # :154
    return lines


# --- universal-route dualEmit: universal-route.mjs:105-178 -----------------

def ur_resolve(val, default, field, valid):
    v = js_or(val, default)
    if v not in valid:
        return (None, 'universal-route: opts.%s must be one of %s; got "%s"' % (field, ", ".join(valid), v))
    return (v, None)


def channel_slug(channel):
    """channel.replace(/[^a-z0-9_]/gi, '_') (:172): no u flag, so one '_' per UTF-16 code unit."""
    out = []
    for c in channel:
        if c.isascii() and (c.isalnum() or c == "_"):
            out.append(c)
        else:
            out.append("_" * (2 if ord(c) > 0xFFFF else 1))
    return "".join(out)


def route_fixture():
    EDGE = ["proof_edge", "prediction_edge", "action_edge"]
    SRC = ["backend_row", "pixel_screenshot", "legacy_image"]
    AUTH = ["pre-dev", "dev", "staging", "prod"]
    IMG = ["runtime_proof", "historical_evidence", "none"]
    # each: edge, src, auth, img, backend_pid, ts, passed_at, subnet, channel, event, vantage, from, to, verb, weight
    cases = [
        (None, None, None, None, None, "2026-10-17T00:00:00.000Z", "1700000000000", None,
         "omni-asolaria/acer/tick", "tick", "acer", None, None, None, None),
        ("action_edge", "pixel_screenshot", "prod", "runtime_proof", "pid-7",
         "2026-10-17T00:00:01.000Z", "1700000001000", "H200", "chan x!y", "shot", "liris",
         "n1", "n2", "do", 5),
        ("bogus_edge", None, None, None, None, "t", "p", None, "c", None, None, None, None, None, None),
        (None, "pixel_screenshot", None, None, None, "t", "p", None, "c", None, None, None, None, None, None),
        (None, "pixel_screenshot", None, None, "", "t", "p", None, "c", None, None, None, None, None, None),
        ("", "", "", "", "", "t2", "p2", "", "", "tick", "", "", "", "", None),
        (None, None, None, None, None, "t3", "p3", None, "c", "", None, None, None, None, None),
        (None, None, None, None, None, "t4", "p4", None, "a\U0001F600b", None, None, None, None, "", 0),
    ]
    lines = ["# route.hbp from tools/referee.py; do not edit",
             "# Mirrors universal-route.mjs:105-178 (dualEmitObservation). Upstream appends these rows to NDJSON;",
             "# here each REMIT input yields two golden rows (HOOKWALL-OBSERVATION + GNN-LIVE-EDGE) or an RERR.",
             "# '-' marks an absent option; an empty value is the string \"\" (falsy for every `||` fallback)."]
    for c in cases:
        (edge, src, auth, img, bpid, ts, passed, subnet, channel, event, vantage, gfrom, gto, gverb, gweight) = c
        lines.append(row("REMIT",
                         ("edge", opt(edge)), ("src", opt(src)), ("auth", opt(auth)), ("img", opt(img)),
                         ("bpid", opt(bpid)), ("ts", esc(ts)), ("passed", esc(passed)),
                         ("subnet", opt(subnet)), ("channel", opt(channel)),
                         ("event", opt(event)), ("vantage", opt(vantage)),
                         ("gfrom", opt(gfrom)), ("gto", opt(gto)), ("gverb", opt(gverb)),
                         ("gweight", "-" if gweight is None else gweight)))
        e_edge, err = ur_resolve(edge, "proof_edge", "edgeClass", EDGE)                 # :112-117
        if err:
            lines.append(row("RERR", ("msg", esc(err)))); continue
        e_src, err = ur_resolve(src, "backend_row", "sourceClass", SRC)                 # :119-124
        if err:
            lines.append(row("RERR", ("msg", esc(err)))); continue
        if e_src == "pixel_screenshot" and not bpid:                                    # :125-129
            lines.append(row("RERR", ("msg", esc("universal-route: sourceClass=pixel_screenshot requires opts.backendRowPid (Dan-fix #1 backend_rows_before_pixels)")))); continue
        e_auth, err = ur_resolve(auth, "dev", "authorityLevel", AUTH)                   # :131-136
        if err:
            lines.append(row("RERR", ("msg", esc(err)))); continue
        e_img, err = ur_resolve(img, "none", "imageClass", IMG)                         # :138-143
        if err:
            lines.append(row("RERR", ("msg", esc(err)))); continue
        sub = js_or(subnet, "H9100")                                                    # :107
        ch = js_or(channel, "unspecified")                                              # :108
        lines.append(row("HOOKWALL-OBSERVATION",                                        # :145-161
                         ("schema", "hookwall-observation.v1"), ("ts", esc(ts)), ("subnet_h", esc(sub)),
                         ("channel", esc(ch)), ("event", esc(event) if event is not None else ""),
                         ("vantage", esc(vantage) if vantage is not None else ""),
                         ("cosign_seq", ""), ("cosign_row", ""), ("cosign_prev", ""),
                         ("sourceClass", esc(e_src)), ("backendRowPid", esc(bpid) if bpid is not None else ""),
                         ("authorityLevel", esc(e_auth)), ("imageClass", esc(e_img)),
                         ("gate", "universal-route-default"), ("passed_at", esc(passed))))
        frm = js_or(gfrom, "cosign_seq_unknown")                                        # :171 (cosign null)
        to = js_or(gto, "channel_" + channel_slug(ch))                                  # :172
        verb = js_or(gverb, js_or(event, "universal_route_emit"))                       # :173
        weight = gweight if gweight is not None else 1                                  # :174
        lines.append(row("GNN-LIVE-EDGE",                                               # :163-178
                         ("schema", "gnn-live-edge.v1"), ("ts", esc(ts)), ("subnet_h", esc(sub)),
                         ("edgeClass", esc(e_edge)), ("sourceClass", esc(e_src)),
                         ("authorityLevel", esc(e_auth)), ("imageClass", esc(e_img)),
                         ("from", esc(frm)), ("to", esc(to)), ("verb", esc(verb)),
                         ("weight", weight), ("vantage", esc(vantage) if vantage is not None else ""),
                         ("cosign_seq", ""), ("cosign_row", "")))
    return lines


# --- super-gulp tier 3: promoter.mjs:12-57, consumer.mjs:13-85 -------------

def promote_count(n):
    overflow = n - 20                                     # promoter.mjs:23
    return overflow if overflow > 0 else 0                # :24-29


def drain_count(n, keep):
    if keep > 0:                                          # :50
        k = n - keep
        return k if k > 0 else 0
    return n


def scanned_lines(raw):
    return [ln for ln in raw.split("\n") if ln][:5000]    # consumer.mjs:13, :29


def is_noise(verb, shadow):                               # consumer.mjs:42-47
    if not verb:
        return True
    if shadow:
        return True
    if any(not (0x20 <= ord(c) <= 0x7E) for c in verb):   # /[^\x20-\x7E]/ on UTF-16 units
        return True
    if "HEARTBEAT" in verb or "fleet-report" in verb or "behcs.heartbeat" in verb:
        return True
    return verb in ("EVT-ACER-ALIVE-AND-WORKING", "falcon-milk-status", "falcon-milk-report")


def tally(outcomes):                                      # consumer.mjs:50-67
    c = {"actual": 0, "candidate": 0, "stage": 0, "halt": 0}
    for o in outcomes:
        if o == "actual":
            c["actual"] += 1
        elif o == "candidate":
            c["candidate"] += 1
        elif o == "stage":
            c["stage"] += 1
        else:
            c["halt"] += 1
    return c


def generated_raw(n, blanks):
    """n non-empty lines L0..L{n-1}, with a blank line after each of the first `blanks` of them."""
    parts = []
    for i in range(n):
        parts.append("L%d" % i)
        if i < blanks:
            parts.append("")
    return "\n".join(parts) + "\n"


def tier3_fixture():
    lines = ["# tier3.hbp from tools/referee.py; do not edit",
             "# Mirrors promoter.mjs:12-57 and consumer.mjs:13-85. PROMO: promote/drain counts around the 20-file cap.",
             "# LINES/LGEN: the 5000-line slice of :29 (LGEN raw text = L0..L{n-1}, blank after the first `blanks`).",
             "# NOISE: the :42-47 predicate. TALLY: the :50-67 outcome counts (any other outcome counts as halt)."]
    for n in (0, 1, 19, 20, 21, 25, 40):
        for keep in (0, 1, 5, 30):
            lines.append(row("PROMO", ("files", n), ("keep", keep),
                             ("promote", promote_count(n)), ("drain", drain_count(n, keep))))
    for raw in ("", "\n\n", "a\n\nb\n", "x\r\ny", "only", "\n lead\ntrail \n"):
        got = scanned_lines(raw)
        lines.append(row("LINES", ("raw", esc(raw)), ("scanned", len(got)),
                         ("first", opt(got[0] if got else None)), ("last", opt(got[-1] if got else None))))
    for (n, blanks) in ((4999, 0), (5000, 0), (5001, 0), (5003, 7), (6000, 6000)):
        got = scanned_lines(generated_raw(n, blanks))
        lines.append(row("LGEN", ("n", n), ("blanks", blanks), ("scanned", len(got)),
                         ("first", esc(got[0])), ("last", esc(got[-1]))))
    verbs = ["", "EVT-X", "x-HEARTBEAT", "behcs.heartbeat.ping", "fleet-report-1", "café", "a\tb", "ok~",
             "\x7f", "EVT-ACER-ALIVE-AND-WORKING", "falcon-milk-status", "falcon-milk-report",
             "falcon-milk-statusX", "heartbeat", "\U0001F600"]
    for v in verbs:
        for sh in (0, 1):
            lines.append(row("NOISE", ("verb", esc(v)), ("shadow", sh), ("noise", 1 if is_noise(v, sh) else 0)))
    for seq in (["actual", "stage", "halt", "candidate", "other", "actual"], [], ["candidate", "candidate"]):
        c = tally(seq)
        lines.append(row("TALLY", ("outcomes", ",".join(seq) if seq else "-"),
                         ("actual", c["actual"]), ("candidate", c["candidate"]),
                         ("stage", c["stage"]), ("halt", c["halt"])))
    return lines


FIXTURES = {
    "cadence.hbp": cadence_fixture,
    "gc.hbp": gc_fixture,
    "gulp.hbp": gulp_fixture,
    "construction.hbp": construction_fixture,
    "shannon.hbp": shannon_fixture,
    "cosign.hbp": cosign_fixture,
    "route.hbp": route_fixture,
    "tier3.hbp": tier3_fixture,
}


def main():
    check = "--check" in sys.argv[1:]
    os.makedirs(FIX, exist_ok=True)
    bad = 0
    for name, fn in FIXTURES.items():
        text = "\n".join(fn()) + "\n"
        path = os.path.join(FIX, name)
        if check:
            try:
                with open(path, "r", encoding="utf-8", newline="") as f:
                    have = f.read()
            except FileNotFoundError:
                have = None
            if have != text:
                bad += 1
                sys.stderr.write("MISMATCH %s\n" % name)
            else:
                sys.stdout.write("ok %s\n" % name)
        else:
            with open(path, "w", encoding="utf-8", newline="") as f:
                f.write(text)
            sys.stdout.write("wrote %s (%d rows)\n" % (name, text.count("\n")))
    if check and bad:
        sys.exit(1)


if __name__ == "__main__":
    main()
