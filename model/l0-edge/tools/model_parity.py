#!/usr/bin/env python3
"""Torch parity harness for src/model.rs: runs the vendored inference_server.py MODEL on Q24 inputs.

Imports vendor/gnn-sidecar/inference_server.py, which builds MODEL as the server does (conv*.lin.bias ->
conv*.bias, load_state_dict, eval); serve_forever is never called and no port is bound. Each graph goes
through the server's line 24 call, one request at a time. Cases: every actor -> target pair of
tests/fixtures/events.hbp as the asolaria-score request (nodes [actor, target], edges [[0, 1]]) with
features from expected-features.hbp; fixed-seed random graphs; and REQUEST rows: two fixed request
pairs, and every one of RANDOM_REQUESTS fixed-seed request pairs whose torch score lies within
NEAR_TIE_Q24 of a toFixed(4) rounding midpoint. PAIR and REQUEST rows also hold the score for the
float32 inputs of the vendored train_baseline.build_node_features. Also writes the sigmoid reference
(Python decimal) and LN2_Q62. KERNEL_ENV is set before torch loads, so every x86-64 host runs the
same kernels. Writes tests/fixtures/expected-model.hbp; --check regenerates it in memory and diffs.
Run: <torch venv>/bin/python -I tools/model_parity.py [--check]
"""
import importlib.util
import math
import os
import pathlib
import struct
import sys
from decimal import ROUND_FLOOR, Decimal, localcontext
from fractions import Fraction

ROOT = pathlib.Path(__file__).resolve().parent.parent
SIDECAR = ROOT / "vendor" / "gnn-sidecar"
FIXTURES = ROOT / "tests" / "fixtures"
EVENTS = FIXTURES / "events.hbp"
FEATURES = FIXTURES / "expected-features.hbp"
EXPECTED = FIXTURES / "expected-model.hbp"
FRAC_BITS = 24
LOGIT_BITS = 48
RANDOM_GRAPHS = 240
RANDOM_REQUESTS = 100_000
NEAR_TIE_Q24 = 32
SCREEN_Q24 = 80
SCREEN_BATCH = 2000
# (edge_volume, avg_risk_centi, max_risk, failure_rate_milli, trust_tier) of the actor and the target.
FIXED_REQUESTS = (
    # Rust and torch scores on either side of the toFixed(4) midpoint 0.99975.
    ("e4_midpoint", (88, 803, 9, 989, 3), (53, 383, 4, 943, 3)),
    # From a local search over two-node requests: actor 1000 events, 39 failed; target 96 events,
    # total risk 3685, max 100, 71 failed.
    ("search", (1000, 0, 0, 39, 2), (96, 3839, 100, 740, 2)),
)

# Set before torch loads: ATen's scalar kernels, oneMKL's SSE2-only CNR code path, one thread.
KERNEL_ENV = {"ATEN_CPU_CAPABILITY": "default", "MKL_CBWR": "COMPATIBLE", "OMP_NUM_THREADS": "1", "MKL_NUM_THREADS": "1"}
os.environ.update(KERNEL_ENV)
sys.dont_write_bytecode = True  # no __pycache__ beside the vendored sources or tools/
sys.path.insert(0, str(SIDECAR))
import inference_server  # noqa: E402  (vendor/gnn-sidecar/inference_server.py: builds MODEL at import)
import torch  # noqa: E402
import torch_geometric  # noqa: E402
import train_baseline  # noqa: E402  (vendor/gnn-sidecar/train_baseline.py: build_node_features, lines 26-39)
from torch_geometric.nn import GCNConv  # noqa: E402

MODEL = inference_server.MODEL


def load_features_referee():
    spec = importlib.util.spec_from_file_location("features_referee", ROOT / "tools" / "features_referee.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


REFEREE = load_features_referee()


class Lcg:
    # The generator of tools/jsnum_referee.py.
    def __init__(self, seed):
        self.state = seed

    def below(self, bound):
        self.state = (self.state * 6364136223846793005 + 1442695040888963407) % (1 << 64)
        return (self.state >> 11) % bound


def q24_ratio(num, den):
    # src/features.rs model_input_q24: num / den in Q24, round half up.
    return ((num << (FRAC_BITS + 1)) + den) // (2 * den)


def model_input_q24(node):
    # train_baseline.py:31-38 [min(vol/100,1), avgRisk/9, maxRisk/9, failureRate, online, trustTier/3]
    return [
        q24_ratio(min(node["edge_volume"], 100), 100),
        q24_ratio(node["avg_risk_centi"], 900),
        q24_ratio(node["max_risk"], 9),
        q24_ratio(node["failure_rate_milli"], 1000),
        q24_ratio(node["online"], 1),
        q24_ratio(node["trust_tier"], 3),
    ]


def q24_doubles(x_q24):
    # The doubles q / 2^24 of the Q24 inputs. model_input_q24 rounds the train_baseline.py:31-38
    # ratios to Q24; build_node_features (line 39) rounds them to float32.
    return [[q / (1 << FRAC_BITS) for q in row] for row in x_q24]


def upstream_inputs(nodes):
    # gnnDataExport.js:55-63 node objects (avgRisk = round / 100, failureRate = round / 1000), then
    # train_baseline.build_node_features: float32 rows, as the server's float32 tensor holds them.
    objects = [
        {
            "edgeVolume": node["edge_volume"],
            "avgRisk": node["avg_risk_centi"] / 100,
            "maxRisk": node["max_risk"],
            "failureRate": node["failure_rate_milli"] / 1000,
            "online": node["online"],
            "trustTier": node["trust_tier"],
        }
        for node in nodes
    ]
    return [[float(v) for v in row] for row in train_baseline.build_node_features(objects).tolist()]


def server_scores(nodes, edges):
    # inference_server.py:24 on these node rows.
    with torch.no_grad():
        scores = MODEL(
            torch.tensor(nodes, dtype=torch.float32), torch.tensor(edges, dtype=torch.long).t().contiguous()
        ).reshape(-1).tolist()
    return [float(v) for v in scores]


def float32_bits(value):
    return struct.unpack("<I", struct.pack("<f", value))[0]


def q24_of(value):
    return math.floor(Fraction(value) * (1 << FRAC_BITS) + Fraction(1, 2))


def midpoint_distance_q24(value):
    # Distance from the score to the nearest toFixed(4) rounding midpoint (k + 1/2) / 10^4, in Q24 units.
    e4 = Fraction(value) * 10000
    return abs(e4 - math.floor(e4) - Fraction(1, 2)) * (1 << FRAC_BITS) / 10000


def graph_row(prefix, x_q24, edges):
    scores = server_scores(q24_doubles(x_q24), edges)
    x_field = ";".join(",".join(str(q) for q in row) for row in x_q24)
    edge_field = ",".join(f"{s}>{t}" for s, t in edges)
    bits = ",".join(f"{float32_bits(v):08x}" for v in scores)
    q24 = ",".join(str(q24_of(v)) for v in scores)
    return f"{prefix}|x={x_field}|edges={edge_field}|out_bits={bits}|q24={q24}", len(scores)


def feature_rows():
    nodes = {}
    for line in FEATURES.read_bytes().decode("utf-8").split("\n"):
        if not line or line.startswith("#"):
            continue
        fields = dict(field.split("=", 1) for field in line.split("|")[1:])
        node_id = REFEREE.decode_value(fields.pop("id"), 0)
        fields.pop("type")
        nodes[node_id] = {key: int(value) for key, value in fields.items()}
    return nodes


def fixture_pairs():
    # gnnDataExport.js:81-82 source / target ids, in first-sight order.
    pairs = {}
    for event in REFEREE.parse_events(EVENTS.read_bytes().decode("utf-8")):
        actor_id = REFEREE.chain(event.get("actor"), "id") or "unknown"
        target_id = REFEREE.chain(event.get("target"), "id") or "unknown"
        pairs.setdefault((actor_id, target_id), None)
    return list(pairs)


def random_node(rng, risk_limit):
    max_risk = rng.below(risk_limit + 1)
    return {
        "edge_volume": 1 + rng.below(150),
        "avg_risk_centi": rng.below(max_risk * 100 + 1),
        "max_risk": max_risk,
        "failure_rate_milli": rng.below(1001),
        "online": 1,
        "trust_tier": 1 + rng.below(3),
    }


def random_graph(rng, case):
    risk_limit = (21, 21, 100, 1_000_000)[case % 4]
    node_count = 2 + rng.below(11)
    x_q24 = [model_input_q24(random_node(rng, risk_limit)) for _ in range(node_count)]
    edges = [[rng.below(node_count), rng.below(node_count)] for _ in range(1 + rng.below(3 * node_count))]
    loop = rng.below(node_count)
    edges.append([loop, loop])
    edges.append(list(edges[rng.below(len(edges))]))
    for i in range(len(edges) - 1, 0, -1):
        j = rng.below(i + 1)
        edges[i], edges[j] = edges[j], edges[i]
    return x_q24, edges


def request_features(rng):
    # A node events can give: edgeCount, max risk 0..21, a total risk with that max, failures, a tier.
    edge_volume = 1 + rng.below(150)
    max_risk = rng.below(22)
    total_risk = max_risk + rng.below(max_risk * (edge_volume - 1) + 1) if max_risk else 0
    failures = rng.below(edge_volume + 1)
    return (
        edge_volume,
        REFEREE.js_math_round(total_risk / edge_volume * 100),  # gnnDataExport.js:58
        max_risk,
        REFEREE.js_math_round(failures / edge_volume * 1000),  # gnnDataExport.js:60
        1 + rng.below(3),
    )


def feature_node(features):
    edge_volume, avg_risk_centi, max_risk, failure_rate_milli, trust_tier = features
    return {
        "edge_volume": edge_volume,
        "avg_risk_centi": avg_risk_centi,
        "max_risk": max_risk,
        "failure_rate_milli": failure_rate_milli,
        "online": 1,
        "trust_tier": trust_tier,
    }


def screened_requests(pairs):
    # Batched disjoint two-node requests; keeps those within SCREEN_Q24 of a midpoint.
    kept = []
    for start in range(0, len(pairs), SCREEN_BATCH):
        chunk = pairs[start : start + SCREEN_BATCH]
        nodes = []
        for actor, target in chunk:
            nodes += q24_doubles([model_input_q24(feature_node(actor)), model_input_q24(feature_node(target))])
        edges = [[2 * k, 2 * k + 1] for k in range(len(chunk))]
        for k, value in enumerate(server_scores(nodes, edges)):
            if midpoint_distance_q24(value) <= SCREEN_Q24:
                kept.append((start + k, value))
    return kept


def request_rows(summary):
    rng = Lcg(0x4E4541522D544945)
    pairs = [(request_features(rng), request_features(rng)) for _ in range(RANDOM_REQUESTS)]
    cases = [(name, actor, target, None) for name, actor, target in FIXED_REQUESTS]
    cases += [(str(index), *pairs[index], batched) for index, batched in screened_requests(pairs)]
    rows = []
    batch_shift = 0
    for name, actor, target, batched in cases:
        nodes = [feature_node(actor), feature_node(target)]
        x_q24 = [model_input_q24(node) for node in nodes]
        [score] = server_scores(q24_doubles(x_q24), [[0, 1]])
        [upstream] = server_scores(upstream_inputs(nodes), [[0, 1]])
        if batched is not None:
            shift = max(abs(Fraction(v) - Fraction(batched)) for v in (score, upstream)) * (1 << FRAC_BITS)
            batch_shift = max(batch_shift, shift)
            if min(midpoint_distance_q24(score), midpoint_distance_q24(upstream)) > NEAR_TIE_Q24:
                continue
        features = ";".join(",".join(str(v) for v in f) for f in (actor, target))
        rows.append(
            f"REQUEST|case={name}|features={features}"
            f"|out_bits={float32_bits(score):08x}|upstream_bits={float32_bits(upstream):08x}"
        )
    # The screen holds while a batched score is within (SCREEN_Q24 - NEAR_TIE_Q24) / 2 of both single scores.
    if 2 * batch_shift > SCREEN_Q24 - NEAR_TIE_Q24:
        raise SystemExit(f"MODEL_PARITY|refused=screen|batch_shift_q24={float(batch_shift)}|json=0")
    summary.update(requests=len(rows), random_requests=RANDOM_REQUESTS, request_batch_shift_q24=math.ceil(batch_shift))
    return rows


def exact_sigmoid_q24(logit_q48):
    with localcontext() as ctx:
        ctx.prec = 60
        t = Decimal(logit_q48) / Decimal(1 << LOGIT_BITS)
        p = Decimal(1) / (Decimal(1) + (-t).exp())
        return int((p * (1 << FRAC_BITS) + Decimal("0.5")).to_integral_value(rounding=ROUND_FLOOR))


def sigmoid_logits(rng):
    one = 1 << LOGIT_BITS
    logits = [0, 1, -1, one, -one, 18 * one, 18 * one + 1, 18 * one - 1]
    logits += [-v for v in logits[5:]]
    logits += [rng.below(40 * one + 1) - 20 * one for _ in range(800)]
    logits += [rng.below(2 * one + 1) - one for _ in range(400)]
    for _ in range(300):
        v = 17 * one + rng.below(3 * one // 2)
        logits.append(v if rng.below(2) else -v)
    return logits


def ln2_q62():
    with localcontext() as ctx:
        ctx.prec = 60
        return int((Decimal(2).ln() * (1 << 62) + Decimal("0.5")).to_integral_value(rounding=ROUND_FLOOR))


def render():
    if not (type(MODEL.conv1) is GCNConv and type(MODEL.conv2) is GCNConv and not MODEL.training):
        raise SystemExit("MODEL_PARITY|refused=model|reason=MODEL is not the eval-mode torch_geometric GCNConv model|json=0")
    summary = {}
    rows = [f"CONST|name=LN2_Q62|value={ln2_q62()}"]
    scores = 0
    features = feature_rows()
    pairs = fixture_pairs()
    for actor_id, target_id in pairs:
        nodes = [features[actor_id], features[target_id]]
        x_q24 = [model_input_q24(node) for node in nodes]
        prefix = f"PAIR|actor={REFEREE.escape(actor_id)}|target={REFEREE.escape(target_id)}"
        row, count = graph_row(prefix, x_q24, [[0, 1]])
        [upstream] = server_scores(upstream_inputs(nodes), [[0, 1]])
        rows.append(f"{row}|upstream_bits={float32_bits(upstream):08x}")
        scores += count
    rng = Lcg(0x5DEECE66D)
    for case in range(RANDOM_GRAPHS):
        x_q24, edges = random_graph(rng, case)
        row, count = graph_row(f"GRAPH|case={case}", x_q24, edges)
        rows.append(row)
        scores += count
    summary.update(pairs=len(pairs), graphs=RANDOM_GRAPHS, scores=scores)
    rows += request_rows(summary)
    sigmoid_rng = Lcg(0x9E3779B97F4A7C15)
    logits = sigmoid_logits(sigmoid_rng)
    rows += [f"SIGMOID|logit_q48={v}|q24={exact_sigmoid_q24(v)}" for v in logits]
    summary.update(sigmoid=len(logits))
    kernels = " ".join(f"{key}={value}" for key, value in KERNEL_ENV.items())
    header = (
        "# expected EdgeLevelGNN scores from tools/model_parity.py: the vendored inference_server.py MODEL under "
        f"torch {torch.__version__}, torch_geometric {torch_geometric.__version__}, {kernels}; do not edit\n"
        "# x = Q24 inputs, sent as the doubles q / 2^24 (float32 in the server's tensor); out_bits = float32 scores (hex); "
        "q24 = floor(score * 2^24 + 1/2)\n"
        "# upstream_bits = the float32 score for the inputs of train_baseline.build_node_features\n"
        "# REQUEST: nodes [actor, target], edges 0>1, x = model_input_q24 of features = edge_volume,avg_risk_centi,"
        f"max_risk,failure_rate_milli,trust_tier of each; the fixed cases, then each of {RANDOM_REQUESTS} fixed-seed "
        f"pairs (case = its index) with a score within {NEAR_TIE_Q24} Q24 units of a toFixed(4) rounding midpoint\n"
        "# SIGMOID q24 = floor(2^24 / (1 + e^-t) + 1/2), t = logit_q48 / 2^48, Python decimal at 60 digits\n"
    )
    return header + "\n".join(rows) + "\n", "|".join(f"{key}={value}" for key, value in summary.items())


def main():
    args = sys.argv[1:]
    if args not in ([], ["--check"]):
        print("usage: model_parity.py [--check]", file=sys.stderr)
        return 2
    text, summary = render()
    if args == ["--check"]:
        committed = EXPECTED.read_bytes().decode("utf-8")
        if committed != text:
            want, got = text.split("\n"), committed.split("\n")
            first = next((i for i, (w, g) in enumerate(zip(want, got)) if w != g), min(len(want), len(got)))
            print(f"MODEL_PARITY|check=FAIL|first_diff_line={first + 1}|json=0")
            return 1
        print(f"MODEL_PARITY|check=PASS|{summary}|json=0")
        return 0
    EXPECTED.write_bytes(text.encode("utf-8"))
    print(f"MODEL_PARITY|written={EXPECTED.name}|{summary}|json=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
