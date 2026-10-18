#!/usr/bin/env python3
"""Referee for the Rust port in src/: mirrors edgeRiskEngine.js and the graphRuntimeStore.js
event/manifest builders line by line (behcs-256@818cc235), and writes the HBP EVENT rows the
Rust producer must match (one per buildGraphEvent) and a MANIFEST parity record per
buildActionManifest (test-only; gnnDataExport.js@818cc235 reads only graph-runtime-events.ndjson).

No args: (re)write tests/fixtures/{events-input,expected-events,expected-manifests}.hbp.
--check:  regenerate in memory and diff against those committed fixtures; non-zero on any drift.
"""
import pathlib
import sys

FIXTURES = pathlib.Path(__file__).resolve().parent.parent / "tests" / "fixtures"
INPUT_PATH = FIXTURES / "events-input.hbp"
EXPECTED_PATH = FIXTURES / "expected-events.hbp"
MANIFEST_PATH = FIXTURES / "expected-manifests.hbp"
INPUT_HEADER = "# input cases for the events port; written by tools/events_referee.py; do not edit\n"
EXPECTED_HEADER = "# expected HBP EVENT rows, one per case from buildGraphEvent; do not edit\n"
MANIFEST_HEADER = ("# expected buildActionManifest fields, one per case (test-only parity record, "
                   "not an EVENT row); do not edit\n")
BASE_CASES = 400
EXTRA_CASES = 400

# --- edgeRiskEngine.js / graphRuntimeStore.js string helpers -----------------------------------

JS_WS = {
    "\u0009", "\u000a", "\u000b", "\u000c", "\u000d", " ", " ", " ",
    " ", " ", " ", " ", " ", " ", " ", " ",
    " ", " ", " ", " ", " ", " ", " ", "　", "﻿",
}


def js_trim(value):
    start = 0
    end = len(value)
    while start < end and value[start] in JS_WS:
        start += 1
    while end > start and value[end - 1] in JS_WS:
        end -= 1
    return value[start:end]


def clean_text(value):  # edgeRiskEngine.js:1-3
    return js_trim(str(value if value else "").replace("\r", " "))


def js_lower(value):  # String.prototype.toLowerCase; CPython 3.13 uses Unicode 15.1.0 tables
    return value.lower()


def clean_lower(value):  # edgeRiskEngine.js:5-7
    return js_lower(clean_text(value))


def utf16_len(value):  # str.length
    return len(value.encode("utf-16-le", "surrogatepass")) // 2


def utf16_slice(value, start, end):  # str.slice over UTF-16 code units; may leave a lone surrogate
    units = value.encode("utf-16-le", "surrogatepass")
    return units[2 * start:2 * end].decode("utf-16-le", "surrogatepass")


def utf8_text(value):  # a lone surrogate is written as U+FFFD, as Node's UTF-8 encoder does
    return "".join("�" if 0xD800 <= ord(c) <= 0xDFFF else c for c in value)


def replace_units(value, keep):  # .replace(/[^...]/g, "_") without the u flag: one "_" per UTF-16 unit
    return "".join(c if keep(c) else "_" * (2 if ord(c) > 0xFFFF else 1) for c in value)


def is_slug_char(c):  # [a-z0-9_:-]
    return c in "abcdefghijklmnopqrstuvwxyz0123456789_:-"


def is_key_char(c):  # [a-zA-Z0-9_:-]
    return c.isascii() and (c.isalnum() or c in "_:-")


def clip_text(value, max_chars=240):  # graphRuntimeStore.js:20-24
    text = clean_text(value)
    if utf16_len(text) <= max_chars:
        return text
    head = utf16_slice(text, 0, max(0, max_chars - 3))
    return js_trim(head) + "..."


def slug(value, max_chars, fallback):  # component/category/action (graphRuntimeStore.js:102-104)
    base = value if value else fallback
    lowered = js_lower(clip_text(base, max_chars))
    return replace_units(lowered, is_slug_char)


def escape_hbp(value):  # model/l0-edge/src/event.rs:115-138
    out = []
    for c in value:
        code = ord(c)
        if c in "%|=" or code < 0x20 or code == 0x7F:
            out.append("%%%02X" % code)
        else:
            out.append(c)
    return "".join(out)


def unescape_case(value):
    out = []
    i = 0
    while i < len(value):
        c = value[i]
        if c == "%":
            out.append(chr(int(value[i + 1:i + 3], 16)))
            i += 3
        else:
            out.append(c)
            i += 1
    return "".join(out)


# --- edgeRiskEngine.js: scoreEdgeRisk ----------------------------------------------------------

HIGH_RISK_TERMS = ["secret", "iam", "privilege", "impersonat", "tunnel", "delete", "clear",
                   "shutdown", "restart", "deploy", "external", "browser_task", "computer_use",
                   "pad", "whatsapp", "slack", "telegram"]
MEDIUM_RISK_TERMS = ["approval", "provider", "repo", "write", "voice", "phone", "meeting",
                     "chat", "model", "cursor", "antigravity"]


def includes_any(haystack, terms):
    return any(term in haystack for term in terms)


def normalize_domain(value):  # edgeRiskEngine.js:13-19
    normalized = clean_lower(value)
    if not normalized:
        return ""
    if "company" in normalized or "work" in normalized:
        return "company"
    if "personal" in normalized or "owner" in normalized:
        return "personal"
    return utf16_slice(normalized, 0, 40)


def normalize_criticality(value):  # edgeRiskEngine.js:21-29
    normalized = clean_lower(value)
    if normalized in ("low", "medium", "high", "critical"):
        return normalized
    if not normalized:
        return ""
    if normalized == "normal":
        return "medium"
    return utf16_slice(normalized, 0, 24)


def map_score_to_level(score):  # edgeRiskEngine.js:31-36
    if score >= 9:
        return "critical"
    if score >= 6:
        return "high"
    if score >= 3:
        return "medium"
    return "low"


def score_edge_risk(inp):  # edgeRiskEngine.js:38-144
    ctx = inp.get("context") or {}
    policy = inp.get("policy") or {}
    actor = inp.get("actor") or {}
    target = inp.get("target") or {}
    action = clean_lower(inp.get("action") or inp.get("type") or "")
    category = clean_lower(inp.get("category") or "")
    tool = clean_lower(inp.get("tool") or ctx.get("tool") or "")
    mode = clean_lower(inp.get("mode") or ctx.get("mode") or policy.get("mode") or "")
    approval_state = clean_lower(inp.get("approvalState") or policy.get("approvalState") or "")
    status = clean_lower(inp.get("status") or "")
    actor_domain = normalize_domain(actor.get("domain") or inp.get("domain") or "")
    target_domain = normalize_domain(target.get("domain") or "")
    criticality = normalize_criticality(target.get("criticality") or inp.get("criticality") or "")
    autonomous = inp.get("autonomous") is True or policy.get("autonomous") is True
    source_text = " ".join(s for s in (action, category, tool, mode, status) if s)
    reasons = []
    score = 0

    if includes_any(source_text, HIGH_RISK_TERMS):
        score += 6
        reasons.append("High-impact action or asset class.")
    elif includes_any(source_text, MEDIUM_RISK_TERMS):
        score += 3
        reasons.append("Operationally sensitive action class.")

    if criticality == "critical":
        score += 4
        reasons.append("Target criticality is critical.")
    elif criticality == "high":
        score += 3
        reasons.append("Target criticality is high.")
    elif criticality == "medium":
        score += 1

    if actor_domain and target_domain and actor_domain != target_domain:
        score += 4
        reasons.append("Cross-domain action path detected.")

    if approval_state in ("required", "pending"):
        score += 2
        reasons.append("Approval is required or still pending.")
    elif approval_state == "denied":
        score += 3
        reasons.append("Denied approval state observed.")
    elif approval_state == "approved":
        score = max(0, score - 1)

    if autonomous:
        score += 2
        reasons.append("Autonomous execution path.")

    if mode in ("silent", "headless", "backend-only", "backend"):
        score += 1
        reasons.append("Low-visibility execution mode.")

    if status in ("failed", "error", "blocked"):
        score += 1
        reasons.append("Failed or blocked edge outcome.")

    return {"score": score, "level": map_score_to_level(score), "reasons": reasons[:8]}


# --- graphRuntimeStore.js: normalizers + builders ----------------------------------------------

def normalize_node_ref(src, fallback_type):  # graphRuntimeStore.js:38-51
    src = src or {}
    type_src = clean_text(src.get("type") or fallback_type)
    slugged = replace_units(js_lower(type_src), is_slug_char)
    node_type = utf16_slice(slugged, 0, 48) or fallback_type
    out = {"type": node_type}
    _id = clip_text(src.get("id") or src.get("name") or "", 120)
    label = clip_text(src.get("label") or src.get("title") or "", 160)
    domain = js_lower(clip_text(src.get("domain") or "", 40))
    criticality = js_lower(clip_text(src.get("criticality") or src.get("priority") or "", 24))
    if _id:
        out["id"] = _id
    if label:
        out["label"] = label
    if domain:
        out["domain"] = domain
    if criticality:
        out["criticality"] = criticality
    return out


def normalize_policy(src):  # graphRuntimeStore.js:81-98
    src = src or {}
    out = {
        "approvalState": clip_text(src.get("approvalState") or "", 24).lower(),
        "mode": clip_text(src.get("mode") or "", 32).lower(),
        "rollbackRequired": bool(src.get("rollbackRequired")),
        "autonomous": bool(src.get("autonomous")),
    }
    if not out["approvalState"]:
        del out["approvalState"]
    if not out["mode"]:
        del out["mode"]
    if not out["rollbackRequired"]:
        del out["rollbackRequired"]
    if not out["autonomous"]:
        del out["autonomous"]
    return out


def is_array_index(key):  # canonical decimal below 2^32 - 1
    return key.isascii() and key.isdigit() and (key == "0" or key[0] != "0") and int(key) < 4294967295


def js_object_entries(assignments):  # Object.entries of an object whose keys were assigned in order
    merged = {}
    for key, value in assignments:
        merged[key] = value  # a re-assigned key keeps its first place, takes the later value
    indexed = sorted((int(key), key) for key in merged if is_array_index(key))
    return ([(key, merged[key]) for _, key in indexed]
            + [(key, value) for key, value in merged.items() if not is_array_index(key)])


def normalize_flat_strings(src, max_keys=20):  # graphRuntimeStore.js:53-79 (string branch)
    out = []  # assignments to `out`, in order
    for key, value in js_object_entries(src)[:max_keys]:
        safe_key = replace_units(clip_text(key, 48), is_key_char)
        if not safe_key:
            continue
        if value is None:
            continue
        out.append((safe_key, clip_text(value, 240)))
    return dict(js_object_entries(out))


def build_graph_event(inp):  # graphRuntimeStore.js:100-144
    component = slug(inp.get("component") or "unknown", 64, "unknown")
    category = slug(inp.get("category") or "runtime", 48, "runtime")
    action = slug(inp.get("action") or "event", 64, "event")
    actor = normalize_node_ref(inp.get("actor"), "system_actor")
    target = normalize_node_ref(inp.get("target"), "target")
    context = normalize_flat_strings(inp.get("context") or [])
    policy = normalize_policy(inp.get("policy"))
    status = clip_text(inp.get("status") or "", 24).lower()
    risk = score_edge_risk({
        "action": action,
        "category": category,
        "tool": context.get("tool") or context.get("routeAction") or "",
        "status": status,
        "actor": actor,
        "target": target,
        "policy": policy,
        "context": context,
    })
    event = {"actor": actor, "target": target, "risk": risk}
    if status:
        event["status"] = status
    return event


def build_action_manifest(inp):  # graphRuntimeStore.js:146-185
    component = slug(inp.get("component") or "unknown", 64, "unknown")
    action = slug(inp.get("action") or "unknown_action", 72, "unknown_action")
    status = clip_text(inp.get("status") or "proposed", 24).lower()
    actor = normalize_node_ref(inp.get("actor"), "system_actor")
    target = normalize_node_ref(inp.get("target"), "target")
    policy = normalize_policy(inp.get("policy"))
    context = normalize_flat_strings(inp.get("context") or [])
    risk = score_edge_risk({
        "action": action,
        "category": "action_manifest",
        "tool": context.get("tool") or action,
        "status": status,
        "actor": actor,
        "target": target,
        "policy": policy,
        "context": context,
    })
    return {"actor": actor, "target": target, "status": status, "risk": risk, "component": component,
            "action": action}


def hbp(value):
    return escape_hbp(utf8_text(value))


def render_event_row(actor, target, risk_score, status):
    parts = ["EVENT"]
    if actor.get("id"):
        parts.append("actor=" + hbp(actor["id"]))
    if actor.get("type"):
        parts.append("actor_type=" + hbp(actor["type"]))
    if target.get("id"):
        parts.append("target=" + hbp(target["id"]))
    if target.get("type"):
        parts.append("target_type=" + hbp(target["type"]))
    parts.append("risk=" + str(max(0, risk_score)))
    if status:
        parts.append("status=" + hbp(status))
    return "|".join(parts)


def render_manifest_record(mf):  # test-only parity record of buildActionManifest's fields
    return "|".join([
        "MANIFEST",
        "component=" + hbp(mf["component"]),
        "action=" + hbp(mf["action"]),
        "status=" + hbp(mf["status"]),
        "actor=" + hbp(mf["actor"].get("id") or ""),
        "actor_type=" + hbp(mf["actor"]["type"]),
        "target=" + hbp(mf["target"].get("id") or ""),
        "target_type=" + hbp(mf["target"]["type"]),
        "risk=" + str(mf["risk"]["score"]),
        "level=" + mf["risk"]["level"],
    ])


# --- deterministic corpus ----------------------------------------------------------------------

class Lcg:
    def __init__(self, seed):
        self.state = seed & ((1 << 64) - 1)

    def below(self, bound):
        self.state = (self.state * 6364136223846793005 + 1442695040888963407) % (1 << 64)
        return (self.state >> 11) % bound


ACTION_TOKENS = ["tool_invoked", "tool_failed", "instant_agent_process", "deploy_service",
                 "delete_secret", "provider.call", "write_repo", "agent_spawned", "clear cache",
                 "RESTART Node", "browser_task", "noop", "", "shutdown-host", "chat_reply"]
CATEGORY_TOKENS = ["gateway_invoke", "runtime", "provider", "construction_processing",
                   "agent-lifecycle", "energy_transfer", "", "Security Event"]
COMPONENT_TOKENS = ["gateway-tool-authority", "instant-agent-spawner", "brain-orchestrator",
                    "spawn-context-builder", "", "Weird Component!!"]
STATUS_TOKENS = ["ok", "failed", "error", "blocked", "denied", "proposed", "", "OK ", "Failed"]
DOMAIN_TOKENS = ["company", "personal", "work thing", "owner-space", "simulation", "local",
                 "", "ACME", "a" * 60]
CRIT_TOKENS = ["low", "medium", "high", "critical", "normal", "", "HIGH", "unknown-tier"]
TYPE_TOKENS = ["gateway_actor", "gateway_tool", "instant_agent", "orchestrator", "provider",
               "agent", "message", "construction", "", "Odd Type / v2", "runtime"]
TOOL_TOKENS = ["computer_use", "browser_task", "whatsapp", "slack", "model", "cursor",
               "repo.write", "voice", "", "pad", "plain_tool"]
MODE_TOKENS = ["silent", "headless", "backend", "backend-only", "spawn", "", "Loud"]
APPROVAL_TOKENS = ["required", "pending", "denied", "approved", "not_required", "", "Approved"]
WEIRD = ["id|pipe", "a=b=c", "100%done", "line\nbreak", "tab\tsep", "ctrl\x0b\x0c",
         "del\x7fchar", "  padded  ", "café-Ño", " nbsp", "", "x" * 300]


def pick(rng, pool):
    return pool[rng.below(len(pool))]


def node_fields(rng):
    return {
        "type": pick(rng, TYPE_TOKENS),
        "id": pick(rng, WEIRD + [pick(rng, TOOL_TOKENS), "node-" + str(rng.below(1000))]),
        "name": pick(rng, ["", "fallback-name", "n/" + str(rng.below(50))]),
        "label": pick(rng, WEIRD + [""]),
        "title": pick(rng, ["", "a title"]),
        "domain": pick(rng, DOMAIN_TOKENS),
        "criticality": pick(rng, CRIT_TOKENS),
        "priority": pick(rng, ["", "high", "p1"]),
    }


CASE_KEYS = ["action", "category", "component", "status",
             "a_type", "a_id", "a_name", "a_label", "a_title", "a_domain", "a_crit", "a_prio",
             "t_type", "t_id", "t_name", "t_label", "t_title", "t_domain", "t_crit", "t_prio",
             "pol_approval", "pol_mode", "pol_rollback", "pol_auton"]


def case_to_fields(rng):
    actor = node_fields(rng)
    target = node_fields(rng)
    return {
        "action": pick(rng, ACTION_TOKENS),
        "category": pick(rng, CATEGORY_TOKENS),
        "component": pick(rng, COMPONENT_TOKENS),
        "status": pick(rng, STATUS_TOKENS),
        "a_type": actor["type"], "a_id": actor["id"], "a_name": actor["name"],
        "a_label": actor["label"], "a_title": actor["title"], "a_domain": actor["domain"],
        "a_crit": actor["criticality"], "a_prio": actor["priority"],
        "t_type": target["type"], "t_id": target["id"], "t_name": target["name"],
        "t_label": target["label"], "t_title": target["title"], "t_domain": target["domain"],
        "t_crit": target["criticality"], "t_prio": target["priority"],
        "tool": pick(rng, TOOL_TOKENS), "route": pick(rng, TOOL_TOKENS + [""]),
        "ctx_mode": pick(rng, MODE_TOKENS),
        "pol_approval": pick(rng, APPROVAL_TOKENS), "pol_mode": pick(rng, MODE_TOKENS),
        "pol_rollback": str(rng.below(2)), "pol_auton": str(rng.below(2)),
    }


def base_case(rng):  # fields and context assignments of one base case
    fields = case_to_fields(rng)
    context = [("tool", fields.pop("tool")), ("routeAction", fields.pop("route")),
               ("mode", fields.pop("ctx_mode"))]
    return fields, context


# Extra cases: non-BMP chars, clips that cut a surrogate pair, context keys that collide after
# normalization, array-index keys, and contexts past the 20-key window.
ASTRAL = ["\U0001F600", "\U0001D400", "\U00010400", "\U0001E900", "\U0001F680"]
SAME_HIGH = ["\U0001F600", "\U0001F680"]  # both start with the high surrogate U+D83D
ASTRAL_ACTIONS = ["browser_task", "computer_use", "delete_secret", "deploy", "slack", "repo_write",
                  "tool_invoked", "provider.call"]
INDEX_KEYS = ["0", "9", "17", "4294967294", "4294967295", "01", "00", "-1", "1.5", " 9", "+1"]
KEY_VARIANTS = {"tool": [" tool", "tool ", "tool\r", "\ttool", "tool "],
                "mode": [" mode", "mode ", "mode\r"],
                "routeAction": [" routeAction", "routeAction\t"]}
SPLIT_FIELDS = [("a_id", 120), ("t_id", 120), ("status", 24), ("component", 64), ("action", 64),
                ("action", 72), ("category", 48), ("t_crit", 24), ("a_domain", 40)]


def shuffled(rng, items):
    items = list(items)
    for i in range(len(items) - 1, 0, -1):
        j = rng.below(i + 1)
        items[i], items[j] = items[j], items[i]
    return items


def with_astral(rng, token):
    char = pick(rng, ASTRAL)
    if "_" in token and rng.below(2):
        return token.replace("_", char, 1)
    at = rng.below(len(token) + 1)
    return token[:at] + char + token[at:]


def cut_pair(rng, max_chars, char):  # clipText(value, max_chars) keeps the pair's high surrogate
    filler = pick(rng, ["a", "x", "Q", "z"])
    head = filler * (max_chars - 4)
    if rng.below(2):
        head = head[:-1] + " "
    return head + char + filler * (3 + rng.below(10))


def extra_case(rng, kind):
    fields, context = base_case(rng)
    if kind == 0:  # non-BMP chars in slugs, types, status and ids
        fields["action"] = with_astral(rng, pick(rng, ASTRAL_ACTIONS))
        for key in ("category", "component", "status", "a_type", "t_type", "a_id"):
            if rng.below(2):
                fields[key] = with_astral(rng, fields[key] or pick(rng, TYPE_TOKENS[:8]))
        if rng.below(3) == 0:
            fields["a_type"] = "x" * 46 + pick(rng, ASTRAL) + "y"
    elif kind == 1:  # a clip that cuts a surrogate pair
        for _ in range(1 + rng.below(2)):
            key, max_chars = pick(rng, SPLIT_FIELDS)
            fields[key] = cut_pair(rng, max_chars, pick(rng, ASTRAL))
        if rng.below(2):  # both domains cut at the same high surrogate
            fields["a_domain"] = cut_pair(rng, 40, SAME_HIGH[0])
            fields["t_domain"] = fields["a_domain"][:36] + SAME_HIGH[rng.below(2)] + "tail"
    elif kind == 2:  # raw keys that collide after clipText and the key rule
        for key in shuffled(rng, KEY_VARIANTS)[:1 + rng.below(3)]:
            value = pick(rng, TOOL_TOKENS + MODE_TOKENS + [""])
            context.append((pick(rng, KEY_VARIANTS[key]), value))
        context = shuffled(rng, context)
    elif kind == 3:  # array-index keys, listed first by Object.entries
        context = [("k%d" % i, "v") for i in range(19)] + [("tool", pick(rng, TOOL_TOKENS[:6]))]
        context.insert(rng.below(len(context) + 1), (pick(rng, INDEX_KEYS), "x"))
    else:  # more than 20 keys, with tool/routeAction/mode late
        context = [("k%d" % i, "v") for i in range(19 + rng.below(5))]
        for key, value in (("tool", pick(rng, TOOL_TOKENS)), ("routeAction", pick(rng, TOOL_TOKENS)),
                           ("mode", pick(rng, MODE_TOKENS))):
            context.insert(15 + rng.below(len(context) - 14), (key, value))
    return fields, context


def fields_to_inputs(f, context):
    actor = {"type": f["a_type"], "id": f["a_id"], "name": f["a_name"], "label": f["a_label"],
             "title": f["a_title"], "domain": f["a_domain"], "criticality": f["a_crit"],
             "priority": f["a_prio"]}
    target = {"type": f["t_type"], "id": f["t_id"], "name": f["t_name"], "label": f["t_label"],
              "title": f["t_title"], "domain": f["t_domain"], "criticality": f["t_crit"],
              "priority": f["t_prio"]}
    policy = {"approvalState": f["pol_approval"], "mode": f["pol_mode"],
              "rollbackRequired": f["pol_rollback"] == "1", "autonomous": f["pol_auton"] == "1"}
    graph_input = {"component": f["component"], "category": f["category"], "action": f["action"],
                   "status": f["status"], "actor": actor, "target": target, "context": context,
                   "policy": policy}
    manifest_input = {"component": f["component"], "action": f["action"], "status": f["status"],
                      "actor": actor, "target": target, "context": context, "policy": policy}
    return graph_input, manifest_input


def generate():
    rng = Lcg(0x5345564E54)  # "EVNT"
    extra_rng = Lcg(0x4556454E5432)  # "EVENT2"
    cases = [base_case(rng) for _ in range(BASE_CASES)]
    cases += [extra_case(extra_rng, index % 5) for index in range(EXTRA_CASES)]
    input_lines = [INPUT_HEADER]
    expected_lines = [EXPECTED_HEADER]
    manifest_lines = [MANIFEST_HEADER]
    for fields, context in cases:
        row = "CASE|" + "|".join(k + "=" + escape_hbp(fields[k]) for k in CASE_KEYS)
        row += "".join("|ck=%s|cv=%s" % (escape_hbp(k), escape_hbp(v)) for k, v in context)
        input_lines.append(row + "\n")
        graph_input, manifest_input = fields_to_inputs(fields, context)
        ev = build_graph_event(graph_input)
        mf = build_action_manifest(manifest_input)
        expected_lines.append(render_event_row(ev["actor"], ev["target"], ev["risk"]["score"], ev.get("status")) + "\n")
        manifest_lines.append(render_manifest_record(mf) + "\n")
    return "".join(input_lines), "".join(expected_lines), "".join(manifest_lines)


def main():
    check = "--check" in sys.argv[1:]
    texts = generate()
    paths = (INPUT_PATH, EXPECTED_PATH, MANIFEST_PATH)
    cases = BASE_CASES + EXTRA_CASES
    if check:
        drift = 0
        for path, text in zip(paths, texts):
            on_disk = path.read_text(encoding="utf-8") if path.exists() else ""
            if on_disk != text:
                drift += 1
                print("DRIFT|%s" % path.name)
        print("EVENTS_REFEREE|cases=%d|event_rows=%d|manifest_rows=%d|drift=%d" % (cases, cases, cases, drift))
        sys.exit(1 if drift else 0)
    FIXTURES.mkdir(parents=True, exist_ok=True)
    for path, text in zip(paths, texts):
        path.write_text(text, encoding="utf-8")
    print("EVENTS_REFEREE|wrote=%s|cases=%d" % (",".join(path.name for path in paths), cases))


if __name__ == "__main__":
    main()
