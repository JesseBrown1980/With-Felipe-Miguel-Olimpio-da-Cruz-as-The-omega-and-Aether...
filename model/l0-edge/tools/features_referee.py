#!/usr/bin/env python3
"""Referee for src/features.rs: mirrors extractNodeFeatures (vendor/legacy/gnnDataExport.js:25-64) line by line.

Integer arithmetic only: a JavaScript number is its binary64 bit pattern, and `/`, `*` and Math.round are the integer
operations of tools/jsnum_referee.py (each rounded once to the nearest binary64, ties to even). Reads
tests/fixtures/events.hbp and writes tests/fixtures/expected-features.hbp; --check regenerates it in memory and diffs
it with the committed copy.
"""
import importlib.util
import pathlib
import sys

TOOLS = pathlib.Path(__file__).resolve().parent
FIXTURES = TOOLS.parent / "tests" / "fixtures"
EVENTS = FIXTURES / "events.hbp"
EXPECTED = FIXTURES / "expected-features.hbp"
HEADER = (
    "# expected extractNodeFeatures rows (gnnDataExport.js:25-64) over events.hbp, from tools/features_referee.py; do not edit\n"
    "# avg_risk_centi = Math.round(totalRisk / edgeCount * 100); failure_rate_milli = Math.round(failures / edgeCount * 1000)\n"
)
MAX_RISK_SCORE = 1_000_000
MAX_EVENTS = 1_000_000
HEX = "0123456789ABCDEF"
# HBP key -> (JS event property, sub-property) as gnnDataExport.js reads them.
KEYS = {
    "actor": ("actor", "id"),
    "actor_type": ("actor", "type"),
    "target": ("target", "id"),
    "target_type": ("target", "type"),
    "risk": ("risk", "score"),
    "status": ("status", None),
}


sys.dont_write_bytecode = True  # no __pycache__ beside tools/


def load_jsnum():
    spec = importlib.util.spec_from_file_location("jsnum_referee", TOOLS / "jsnum_referee.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


JSNUM = load_jsnum()
js_round_ratio_scaled = JSNUM.js_round_ratio_scaled


def chain(obj, key):
    # JS optional chaining `obj?.key`; an absent property is None (JS undefined).
    return None if obj is None else obj.get(key)


def decode_value(raw, line):
    data = raw.encode("utf-8")
    out = bytearray()
    i = 0
    while i < len(data):
        byte = data[i]
        if byte < 0x20 or byte == 0x7F:
            raise ValueError(f"line {line}: control byte in a value must be percent-escaped")
        if byte != 0x25:
            out.append(byte)
            i += 1
            continue
        pair = data[i + 1:i + 3].decode("ascii", errors="replace")
        if len(pair) != 2 or pair[0] not in HEX or pair[1] not in HEX:
            raise ValueError(f"line {line}: '%' must be followed by two uppercase hex digits")
        out.append(int(pair, 16))
        i += 3
    return out.decode("utf-8")


def parse_risk(value, line):
    if not value or not all(c in "0123456789" for c in value):
        raise ValueError(f"line {line}: risk must be decimal digits")
    risk = int(value)
    if risk > MAX_RISK_SCORE:
        raise ValueError(f"line {line}: risk above {MAX_RISK_SCORE}")
    return risk


def parse_events(text):
    """HBP rows to JS-shaped event objects; empty values stay "" (JS falsy), absent keys stay absent."""
    rows = [(n + 1, r) for n, r in enumerate(text.split("\n")) if r and not r.startswith("#")]
    if len(rows) > MAX_EVENTS:
        raise ValueError(f"line {rows[MAX_EVENTS][0]}: more than {MAX_EVENTS} events")
    events = []
    for line, row in rows:
        fields = row.split("|")
        if fields[0] != "EVENT":
            raise ValueError(f"line {line}: row must start with EVENT")
        event, seen = {}, set()
        for field in fields[1:]:
            if "=" not in field:
                raise ValueError(f"line {line}: field without '='")
            key, raw = field.split("=", 1)
            if key not in KEYS:
                raise ValueError(f"line {line}: unknown key {key!r}")
            if key in seen:
                raise ValueError(f"line {line}: duplicate key {key!r}")
            seen.add(key)
            value = decode_value(raw, line)
            if key == "risk":
                value = parse_risk(value, line)
            prop, sub = KEYS[key]
            if sub is None:
                event[prop] = value
            else:
                event.setdefault(prop, {})[sub] = value
        events.append(event)
    return events


def extract_node_features(events):
    # gnnDataExport.js:25 function extractNodeFeatures(events)
    # Its counts and sums are integers below 2^53 here, so Python ints hold the JS numbers exactly; the quotients
    # go through js_round_ratio_scaled, binary64 `/` then `*` then Math.round on bit patterns.
    nodes = {}  # :26 const nodes = new Map(); a dict keeps insertion order like the Map
    for event in events:  # :28 for (const event of events)
        actor_id = chain(event.get("actor"), "id") or "unknown"  # :29 event.actor?.id || "unknown"
        target_id = chain(event.get("target"), "id") or "unknown"  # :30 event.target?.id || "unknown"
        for id_ in [actor_id, target_id]:  # :32 for (const id of [actorId, targetId])
            if id_ not in nodes:  # :33 if (!nodes.has(id))
                nodes[id_] = {  # :34 nodes.set(id, {
                    "id": id_,  # :35 id,
                    # :36 type: event.actor?.id === id ? (event.actor?.type || "unknown") : (event.target?.type || "unknown"),
                    "type": (chain(event.get("actor"), "type") or "unknown")
                    if chain(event.get("actor"), "id") == id_
                    else (chain(event.get("target"), "type") or "unknown"),
                    "edgeCount": 0,  # :37
                    "totalRisk": 0,  # :38
                    "maxRisk": 0,  # :39
                    "failures": 0,  # :40
                    "lastSeen": "",  # :41
                }
            node = nodes[id_]  # :44 const node = nodes.get(id)
            node["edgeCount"] += 1  # :45 node.edgeCount++
            risk = int(chain(event.get("risk"), "score") or 0)  # :46 Number(event.risk?.score || 0)
            node["totalRisk"] += risk  # :47 node.totalRisk += risk
            if risk > node["maxRisk"]:  # :48 if (risk > node.maxRisk) node.maxRisk = risk
                node["maxRisk"] = risk
            if event.get("status") == "failed" or event.get("status") == "error":  # :49
                node["failures"] += 1
            node["lastSeen"] = event.get("at") or node["lastSeen"]  # :50 event.at || node.lastSeen

    return [  # :54 [...nodes.values()].map(n => ({
        {
            "id": n["id"],  # :55
            "type": n["type"],  # :56
            "edgeVolume": n["edgeCount"],  # :57
            # :58 avgRisk: n.edgeCount ? Math.round(n.totalRisk / n.edgeCount * 100) / 100 : 0 (the integer before / 100)
            "avgRiskCenti": js_round_ratio_scaled(n["totalRisk"], n["edgeCount"], 100) if n["edgeCount"] else 0,
            "maxRisk": n["maxRisk"],  # :59
            # :60 failureRate: n.edgeCount ? Math.round(n.failures / n.edgeCount * 1000) / 1000 : 0 (the integer before / 1000)
            "failureRateMilli": js_round_ratio_scaled(n["failures"], n["edgeCount"], 1000) if n["edgeCount"] else 0,
            "online": 1,  # :61
            "trustTier": 3 if n["type"] == "runtime" else 2 if n["type"] == "local_client" else 1,  # :62
        }
        for n in nodes.values()
    ]


def escape(value):
    out = bytearray()
    for byte in value.encode("utf-8"):
        if byte in b"%|=" or byte < 0x20 or byte == 0x7F:
            out += f"%{byte:02X}".encode("ascii")
        else:
            out.append(byte)
    return out.decode("utf-8")


def node_row(n):
    return (
        f"NODE|id={escape(n['id'])}|type={escape(n['type'])}|edge_volume={n['edgeVolume']}"
        f"|avg_risk_centi={n['avgRiskCenti']}|max_risk={n['maxRisk']}"
        f"|failure_rate_milli={n['failureRateMilli']}|online={n['online']}|trust_tier={n['trustTier']}"
    )


def exact_rounding_differences(events):
    # Nodes whose JS Math.round result differs from exact rational rounding (reported, not written).
    tallies = {}
    for event in events:
        actor_id = chain(event.get("actor"), "id") or "unknown"
        target_id = chain(event.get("target"), "id") or "unknown"
        for id_ in [actor_id, target_id]:
            count, total = tallies.get(id_, (0, 0))
            tallies[id_] = (count + 1, total + int(chain(event.get("risk"), "score") or 0))
    return sum(
        1
        for count, total in tallies.values()
        if js_round_ratio_scaled(total, count, 100) != (2 * total * 100 + count) // (2 * count)
    )


def main():
    args = sys.argv[1:]
    if args not in ([], ["--check"]):
        print("usage: features_referee.py [--check]", file=sys.stderr)
        return 2
    events = parse_events(EVENTS.read_bytes().decode("utf-8"))
    nodes = extract_node_features(events)
    text = HEADER + "".join(node_row(n) + "\n" for n in nodes)
    summary = f"events={len(events)}|nodes={len(nodes)}|avg_risk_js_vs_exact={exact_rounding_differences(events)}"
    if args == ["--check"]:
        committed = EXPECTED.read_bytes().decode("utf-8")
        if committed != text:
            want, got = text.split("\n"), committed.split("\n")
            first = next((i for i, (w, g) in enumerate(zip(want, got)) if w != g), min(len(want), len(got)))
            print(f"FEATURES_REFEREE|check=FAIL|first_diff_line={first + 1}|json=0")
            return 1
        print(f"FEATURES_REFEREE|check=PASS|{summary}|json=0")
        return 0
    EXPECTED.write_bytes(text.encode("utf-8"))
    print(f"FEATURES_REFEREE|written={EXPECTED.name}|{summary}|json=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
