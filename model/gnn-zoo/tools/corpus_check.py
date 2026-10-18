#!/usr/bin/env python3
"""Writes results/corpora.hbp: record counts and schema of every corpus, read as a stream, checked in integers.

Reads the first training set from vendor/first-training/ and the seven other corpora and the events file
from the two delivery zips in corpora/, decompressing each entry as a stream (no extraction, no whole-file
parse). For each export: its top-level keys, the stats block against the records, the key set and value
types of every node and edge, the edgeIndex against the node order, the node features against the edges
(edgeVolume = edges touching the node, maxRisk = their largest riskScore, avgRisk within 1/200 of their exact
mean), the label rule of gnnDataExport.js:72-76 / convert_graph_events.py:180-186 as far as the edge fields
show it, the values against vendor/contract/gnn-contract-v1.json, and the positives in the windows the
trainers cut (a 70/15/15 split of 50,000 and 200,000 edges). JSON decimals are kept as their text and
compared as exact fractions. --check regenerates in memory and diffs.
"""
import collections
import hashlib
import io
import json
import pathlib
import sys
import zipfile
from fractions import Fraction

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "results" / "corpora.hbp"
FIRST = ROOT / "vendor" / "first-training" / "gnn-training-export-20260315.json"
CONTRACT = ROOT / "vendor" / "contract" / "gnn-contract-v1.json"
ZIP_B = ROOT / "corpora" / "FABLE5-REGEN-ITEM6B-GNN-ZOO-CORPORA-2026-10-18.zip"
ZIP_C = ROOT / "corpora" / "FABLE5-REGEN-ITEM6C-GNN-EXPORT-AND-EVENTS-2026-10-18.zip"
CHUNK = 1 << 20

SOURCES = [
    ("first-training/gnn-training-export-20260315.json", None),
    ("gnn-patterns/gnn-training-sample-10k.json", ZIP_B),
    ("gnn-patterns/gnn-training-sample-50k.json", ZIP_B),
    ("gnn-patterns/gnn-training-archive-50k.json", ZIP_B),
    ("gnn-patterns/gnn-training-fresh-50k.json", ZIP_B),
    ("gnn-patterns/gnn-training-archive-200k.json", ZIP_B),
    ("gnn-patterns/gnn-training-500k.json", ZIP_B),
    ("gnn-patterns/gnn-training-export.json", ZIP_C),
]
EVENTS = "first-training/graph-runtime-events.ndjson"


class Dec(str):
    """A JSON number with a fraction or exponent, kept as its text."""


def reject_constant(name):
    raise ValueError(f"JSON constant {name} is not allowed")


DECODER = json.JSONDecoder(parse_float=Dec, parse_constant=reject_constant)


class Stream:
    """A JSON text read in pieces: structure is walked by hand, small values by raw_decode."""

    def __init__(self, raw):
        self.text = io.TextIOWrapper(raw, encoding="utf-8", newline="")
        self.buf = ""
        self.pos = 0
        self.eof = False
        self.hasher = hashlib.sha256()

    def fill(self, need=CHUNK):
        while not self.eof and len(self.buf) - self.pos < need:
            piece = self.text.read(CHUNK)
            if not piece:
                self.eof = True
                break
            if self.pos > CHUNK:
                self.buf = self.buf[self.pos:]
                self.pos = 0
            self.buf += piece

    def peek(self):
        self.fill(1)
        while self.pos < len(self.buf) and self.buf[self.pos] in " \t\r\n":
            self.pos += 1
            self.fill(1)
        return self.buf[self.pos] if self.pos < len(self.buf) else ""

    def expect(self, ch):
        if self.peek() != ch:
            raise ValueError(f"expected {ch!r} at {self.pos}, got {self.peek()!r}")
        self.pos += 1

    def decode(self):
        """(value, its exact JSON text) of the value that starts here."""
        self.peek()
        while True:
            try:
                value, end = DECODER.raw_decode(self.buf, self.pos)
            except json.JSONDecodeError:
                if self.eof:
                    raise
                self.fill(len(self.buf) - self.pos + CHUNK)
                continue
            if end == len(self.buf) and not self.eof:
                # A number may continue in the next piece.
                self.fill(len(self.buf) - self.pos + CHUNK)
                continue
            text = self.buf[self.pos:end]
            self.pos = end
            return value, text

    def value(self):
        return self.decode()[0]

    def items(self):
        """Elements of the array that starts here, each as a decoded value (or the stream, for nested arrays)."""
        self.expect("[")
        if self.peek() == "]":
            self.pos += 1
            return
        while True:
            yield self
            c = self.peek()
            self.pos += 1
            if c == "]":
                return
            if c != ",":
                raise ValueError(f"expected ',' or ']' at {self.pos}")

    def members(self):
        """(key, stream) for each member of the object that starts here; the caller reads each value."""
        self.expect("{")
        if self.peek() == "}":
            self.pos += 1
            return
        while True:
            key = self.value()
            self.expect(":")
            yield key, self
            c = self.peek()
            self.pos += 1
            if c == "}":
                return
            if c != ",":
                raise ValueError(f"expected ',' or '}}' at {self.pos}")


def kind(v):
    if isinstance(v, bool):
        return "bool"
    if isinstance(v, int):
        return "int"
    if isinstance(v, Dec):
        return "dec"
    if isinstance(v, str):
        return "str"
    if v is None:
        return "null"
    return type(v).__name__


def exact(v):
    return Fraction(v) if isinstance(v, (int, Dec)) and not isinstance(v, bool) else None


def schema(counter):
    """'key:type+type' for every key, in first-seen order, with the count of records holding it."""
    return ",".join(f"{k}:{'+'.join(sorted(t))}:{n}" for k, (n, t) in counter.items())


def note_keys(counter, record):
    for k, v in record.items():
        n, types = counter.get(k, (0, set()))
        types.add(kind(v))
        counter[k] = (n + 1, types)


def check_export(label, raw, contract):
    rows = []
    s = Stream(raw)
    top = []
    stats = {}
    nodes = []
    node_index = {}
    node_schema = collections.OrderedDict()
    edge_schema = collections.OrderedDict()
    edge_ends = []
    touch = collections.Counter()
    risk_sum = collections.Counter()
    risk_max = {}
    labels = collections.Counter()
    risk_scores = collections.Counter()
    risk_levels = collections.Counter()
    categories = set()
    actions = set()
    index_bad = 0
    rule_violations = 0
    label_without_field_reason = 0
    windows = collections.Counter()
    edge_index_rows = None
    edge_index_shape = "absent"
    edge_index_bad = 0
    count = 0
    other = {}
    for key, stream in s.members():
        top.append(key)
        if key == "nodes":
            for item in stream.items():
                node = item.value()
                node_index.setdefault(node["id"], len(nodes))
                nodes.append((node["id"], node.get("type"), node.get("edgeVolume"), node.get("avgRisk"),
                              node.get("maxRisk"), node.get("failureRate"), node.get("online"), node.get("trustTier")))
                note_keys(node_schema, node)
        elif key == "edges":
            for item in stream.items():
                e = item.value()
                note_keys(edge_schema, e)
                index_bad += e.get("index") != count
                src, tgt, risk, lab = e["source"], e["target"], e.get("riskScore", 0), e.get("label")
                edge_ends.append((node_index.get(src, 0), node_index.get(tgt, 0)))
                for nid in (src, tgt):
                    touch[nid] += 1
                    risk_sum[nid] += risk
                    risk_max[nid] = max(risk_max.get(nid, risk), risk)
                labels[lab] += 1
                risk_scores[risk] += 1
                risk_levels[e.get("riskLevel")] += 1
                categories.add(e.get("category"))
                actions.add(e.get("action"))
                action = str(e.get("action", ""))
                field_reason = risk >= 6 or "blocked" in action or "denied" in action
                rule_violations += field_reason and lab != 1
                label_without_field_reason += lab == 1 and not field_reason
                if lab == 1:
                    if count < 50000:
                        windows["50k_all"] += 1
                        windows["50k_train" if count < 35000 else "50k_val" if count < 42500 else "50k_test"] += 1
                    if count < 200000:
                        windows["200k_all"] += 1
                count += 1
        elif key == "edgeIndex":
            first = stream.peek()
            pairs = []
            for outer in stream.items():
                if outer.peek() == "[":
                    pairs.append([inner.value() for inner in outer.items()])
                else:
                    pairs.append(outer.value())
            if len(pairs) == 2 and len(pairs[0]) == len(pairs[1]) != 2:
                edge_index_shape = "2xE"
                edge_index_rows = list(zip(pairs[0], pairs[1]))
            elif all(isinstance(p, list) and len(p) == 2 for p in pairs):
                edge_index_shape = "Ex2"
                edge_index_rows = [tuple(p) for p in pairs]
            else:
                edge_index_shape = f"other(first={first})"
        elif key == "stats":
            stats = stream.value()
        else:
            other[key] = stream.value()
    if edge_index_rows is not None:
        edge_index_bad = sum(a != b for a, b in zip(edge_index_rows, edge_ends)) + abs(len(edge_index_rows) - count)
    # Node features against the edges.
    volume_bad = max_bad = avg_bad = tier_bad = 0
    online = collections.Counter()
    types = collections.Counter()
    volume_sum = 0
    for nid, ntype, vol, avg, mx, fail, onl, tier in nodes:
        volume_sum += vol
        volume_bad += vol != touch[nid]
        max_bad += mx != risk_max.get(nid, 0)
        if touch[nid]:
            avg_bad += abs(exact(avg) - Fraction(risk_sum[nid], touch[nid])) > Fraction(1, 200)
        online[onl] += 1
        types[ntype] += 1
        tier_bad += tier != (3 if ntype == "runtime" else 2 if ntype == "local_client" else 1)
    suspicious, benign = labels.get(1, 0), labels.get(0, 0)
    ratio = stats.get("labelRatio")
    score_range = contract["output"]["score"]
    levels = set(contract["output"]["level"]["enum"])
    numeric_node = [k for k, (_, t) in node_schema.items() if t <= {"int", "dec"}]
    rows.append(f"EXPORT|file={label}|top={','.join(top)}|format={other.get('format')}"
                f"|exportedAt={other.get('exportedAt')}|nodes={len(nodes)}|edges={count}|json=0")
    rows.append(f"STATS|file={label}|totalEvents={stats.get('totalEvents')}|totalNodes={stats.get('totalNodes')}"
                f"|totalEdges={stats.get('totalEdges')}|benign={stats.get('benign')}|suspicious={stats.get('suspicious')}"
                f"|labelRatio={ratio}|actions={stats.get('actions')}|categories={len(stats.get('categories', []))}"
                f"|skippedLines={stats.get('skippedLines', 'absent')}|json=0")
    rows.append(f"COUNTS|file={label}|nodes_equal={int(stats.get('totalNodes') == len(nodes))}"
                f"|edges_equal={int(stats.get('totalEdges') == count)}|events_equal_edges={int(stats.get('totalEvents') == count)}"
                f"|benign_equal={int(stats.get('benign') == benign)}|suspicious_equal={int(stats.get('suspicious') == suspicious)}"
                f"|labels={','.join(f'{k}:{v}' for k, v in sorted(labels.items(), key=str))}"
                f"|categories_equal={int(set(stats.get('categories', [])) == categories)}"
                f"|actions_equal={int(stats.get('actions') == len(actions))}"
                f"|unique_node_ids={len(node_index)}|json=0")
    if count:
        exact_ratio = Fraction(suspicious, count)
        rows.append(f"RATIO|file={label}|labelRatio={ratio}|exact={suspicious}/{count}"
                    f"|within_half_unit_of_3_decimals={int(abs(exact(ratio) - exact_ratio) <= Fraction(1, 2000))}"
                    f"|within_half_unit_of_4_decimals={int(abs(exact(ratio) - exact_ratio) <= Fraction(1, 20000))}|json=0")
    rows.append(f"NODESCHEMA|file={label}|keys={schema(node_schema)}|numeric_keys={len(numeric_node)}|json=0")
    rows.append(f"EDGESCHEMA|file={label}|keys={schema(edge_schema)}|json=0")
    rows.append(f"EDGEINDEX|file={label}|shape={edge_index_shape}|rows={0 if edge_index_rows is None else len(edge_index_rows)}"
                f"|differ_from_node_order={edge_index_bad}|edge_index_field_not_position={index_bad}|json=0")
    rows.append(f"NODEFEATURES|file={label}|edgeVolume_sum={volume_sum}|twice_edges={2 * count}"
                f"|edgeVolume_differs={volume_bad}|maxRisk_differs={max_bad}|avgRisk_off_by_more_than_1/200={avg_bad}"
                f"|trustTier_not_from_type={tier_bad}|online={','.join(f'{k}:{v}' for k, v in sorted(online.items(), key=str))}"
                f"|types={len(types)}|json=0")
    rows.append(f"LABELRULE|file={label}|risk>=6_or_action_blocked/denied_but_label0={rule_violations}"
                f"|label1_from_status_only={label_without_field_reason}|json=0")
    in_range = all(isinstance(k, int) and score_range["min"] <= k <= score_range["max"] for k in risk_scores)
    rows.append(f"CONTRACT|file={label}|riskScore_values={','.join(str(k) for k in sorted(risk_scores, key=str))}"
                f"|within_output.score_{score_range['min']}..{score_range['max']}={int(in_range)}"
                f"|riskLevel_values={','.join(f'{k}:{v}' for k, v in sorted(risk_levels.items(), key=str))}"
                f"|within_output.level_enum={int(set(risk_levels) <= levels)}|json=0")
    if count >= 50000:
        rows.append(f"WINDOW50K|file={label}|positives_first_50000={windows['50k_all']}|train_0..35000={windows['50k_train']}"
                    f"|val_35000..42500={windows['50k_val']}|test_42500..50000={windows['50k_test']}|json=0")
    if count >= 200000:
        rows.append(f"WINDOW200K|file={label}|positives_first_200000={windows['200k_all']}|json=0")
    return rows


def damage_report(label, raw, error):
    """For an export that does not decode: where its bytes stop being the compact JSON convert_graph_events writes.

    json.dump(..., separators=(",", ":")) writes no raw byte below 0x20 and no 0x7F, so a 4 KiB block holding one,
    or bytes that are not UTF-8, is not the writer's output. Record starts '{"index":N,' are counted to find
    which edge records are intact.
    """
    import re

    record = re.compile(rb'\{"index":(\d+),"source":')
    flagged = []
    present = set()
    head = b""
    offset = 0
    carry = b""
    block = 4096
    pending = b""
    while True:
        piece = raw.read(CHUNK)
        if not piece:
            break
        if len(head) < 65536:
            head += piece[: 65536 - len(head)]
        data = carry + piece
        for m in record.finditer(data):
            present.add(int(m.group(1)))
        carry = data[-64:]
        pending += piece
        while len(pending) >= block:
            chunk, pending = pending[:block], pending[block:]
            bad = any(b < 0x20 or b == 0x7F for b in chunk)
            if not bad:
                try:
                    chunk.decode("utf-8")
                except UnicodeDecodeError as e:
                    bad = e.reason != "unexpected end of data" or e.start < block - 3
            if bad:
                flagged.append(offset)
            offset += block
    size = offset + len(pending)
    spans = []
    for start in flagged:
        if spans and spans[-1][1] == start:
            spans[-1][1] = start + block
        else:
            spans.append([start, start + block])
    stats_at = head.find(b'"stats":')
    stats, _ = DECODER.raw_decode(head.decode("utf-8"), stats_at + len('"stats":'))
    total = stats.get("totalEdges", 0)
    missing = [i for i in range(total) if i not in present]
    runs = []
    for i in missing:
        if runs and runs[-1][1] == i - 1:
            runs[-1][1] = i
        else:
            runs.append([i, i])
    return [
        f"EXPORT|file={label}|decodes=0|error={type(error).__name__}|bytes={size}|json=0",
        f"STATS|file={label}|totalEvents={stats.get('totalEvents')}|totalNodes={stats.get('totalNodes')}"
        f"|totalEdges={stats.get('totalEdges')}|benign={stats.get('benign')}|suspicious={stats.get('suspicious')}"
        f"|labelRatio={stats.get('labelRatio')}|actions={stats.get('actions')}"
        f"|categories={len(stats.get('categories', []))}|skippedLines={stats.get('skippedLines', 'absent')}|json=0",
        f"DAMAGE|file={label}|foreign_4KiB_blocks={len(flagged)}"
        f"|byte_spans={','.join(f'{a}..{b - 1}' for a, b in spans)}|json=0",
        f"RECORDS|file={label}|edge_record_starts_found={len(present)}|of={total}"
        f"|missing_indices={','.join(f'{a}..{b}' for a, b in runs) if runs else 'none'}|json=0",
    ]


def check_events(raw, first_exported_at):
    rows = []
    lines = parsed = graph = markers = 0
    kinds = collections.Counter()
    first_at = last_at = None
    not_sorted = 0
    before_first_export = 0
    bad = 0
    previous = ""
    text = io.TextIOWrapper(raw, encoding="utf-8", newline="")
    for line in text:
        if not line.strip():
            continue
        lines += 1
        try:
            evt = json.loads(line, parse_float=Dec, parse_constant=reject_constant)
        except ValueError:
            bad += 1
            continue
        parsed += 1
        kinds[evt.get("kind")] += 1
        if evt.get("kind") == "graph_event" and not str(evt.get("id", "")).startswith("rotation_marker"):
            graph += 1
        if str(evt.get("id", "")).startswith("rotation_marker"):
            markers += 1
        at = evt.get("at")
        if isinstance(at, str):
            first_at = at if first_at is None else min(first_at, at)
            last_at = at if last_at is None else max(last_at, at)
            not_sorted += at < previous
            previous = at
            before_first_export += at <= first_exported_at
    rows.append(f"EVENTS|file={EVENTS}|lines={lines}|parsed={parsed}|unparseable={bad}"
                f"|kinds={','.join(f'{k}:{v}' for k, v in sorted(kinds.items(), key=str))}"
                f"|converter_accepts={graph}|rotation_markers={markers}|json=0")
    rows.append(f"EVENTSAT|file={EVENTS}|first={first_at}|last={last_at}|out_of_order={not_sorted}"
                f"|at_or_before_{first_exported_at}={before_first_export}|json=0")
    return rows


def build():
    contract = json.loads(CONTRACT.read_text(encoding="utf-8"))
    out = [
        "# results/corpora.hbp: written by tools/corpus_check.py (stdlib, integers and exact fractions); --check diffs.",
        "# Every corpus is read as a stream (vendor/ file, or a zip entry decompressed in pieces); nothing is extracted.",
        f"# CONTRACT|file=contract/gnn-contract-v1.json|contractId={contract['contractId']}|version={contract['version']}"
        f"|input={','.join(contract['input'])}|output={','.join(contract['output'])}"
        f"|output.score={contract['output']['score']['type']}:{contract['output']['score']['min']}..{contract['output']['score']['max']}"
        f"|output.level={','.join(contract['output']['level']['enum'])}|node_or_edge_feature_dims=none_defined",
    ]
    first_at = None
    for name, archive in SOURCES:
        if archive is None:
            with FIRST.open("rb") as raw:
                rows = check_export(name, raw, contract)
            first_at = next(r for r in rows if r.startswith("EXPORT|")).split("|exportedAt=")[1].split("|")[0]
        else:
            with zipfile.ZipFile(archive) as z:
                try:
                    with z.open(name) as raw:
                        rows = check_export(name, raw, contract)
                except (UnicodeDecodeError, ValueError) as error:
                    with z.open(name) as raw:
                        rows = damage_report(name, raw, error)
        out.extend(rows)
    with zipfile.ZipFile(ZIP_C) as z, z.open(EVENTS) as raw:
        out.extend(check_events(raw, first_at))
    return "\n".join(out) + "\n"


def main():
    args = sys.argv[1:]
    if args not in ([], ["--check"]):
        print("usage: corpus_check.py [--check]", file=sys.stderr)
        return 2
    text = build()
    digest = hashlib.sha256(text.encode()).hexdigest()
    if args == ["--check"]:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
            print(f"CORPORA|check=FAIL|file={OUT.name}|json=0")
            return 1
        print(f"CORPORA|check=PASS|file={OUT.name}|sha256={digest}|json=0")
        return 0
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(text, encoding="utf-8")
    print(f"CORPORA|written={OUT.name}|sha256={digest}|json=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
