#!/usr/bin/env python3
"""Torch parity harness for src/model.rs: runs the vendored inference_server.py MODEL on Q24 inputs.

Imports vendor/gnn-sidecar/inference_server.py, which builds MODEL as the server does (conv*.lin.bias ->
conv*.bias, load_state_dict, eval); serve_forever is never called and no port is bound. Each graph goes
through the server's line 24 call, one request at a time. Cases: every actor -> target pair of
tests/fixtures/events.hbp as the asolaria-score request (nodes [actor, target], edges [[0, 1]]) with
features from expected-features.hbp; fixed-seed random graphs; and REQUEST rows: two fixed request
pairs, and every one of RANDOM_REQUESTS fixed-seed request pairs whose torch score lies within
NEAR_TIE_Q24 of a toFixed(4) rounding midpoint. PAIR and REQUEST rows also hold the score for the
float32 inputs of the vendored train_baseline.build_node_features. Also writes the exact sigmoid reference
and LN2_Q62 (tools/sigmoid_referee.py, integers). KERNEL_ENV is set before torch loads, so every x86-64
host runs the same kernels. Writes tests/fixtures/expected-model.hbp; --check regenerates it in memory
and diffs.
Float runs only in the owner's float lane: torch with the trained float32 checkpoint (inference_server.py
MODEL) and numpy in the vendored build_node_features. This tool's own arithmetic is integer: each input
tensor is built from float32 bit patterns computed in integers (q / 2^24 rounded to nearest, ties to
even, as torch.tensor(..., dtype=float32) rounds the server's doubles); the binary64 avgRisk and
failureRate handed to build_node_features are made from bit patterns computed in integers
(tools/jsnum_referee.py); every output is read by its float32 bit pattern and converted with integer
arithmetic (exact rationals as integer pairs).
Run: <torch venv>/bin/python -I tools/model_parity.py [--check]
"""
import importlib.util
import os
import pathlib
import struct
import sys
from fractions import Fraction

ROOT = pathlib.Path(__file__).resolve().parent.parent
SIDECAR = ROOT / "vendor" / "gnn-sidecar"
FIXTURES = ROOT / "tests" / "fixtures"
EVENTS = FIXTURES / "events.hbp"
FEATURES = FIXTURES / "expected-features.hbp"
EXPECTED = FIXTURES / "expected-model.hbp"
FRAC_BITS = 24
# Every finite float32 is an integer multiple of 2^-149; a Q24 unit is 2^125 such units.
FLOAT32_UNIT_BITS = 149
UNITS_PER_Q24_BITS = FLOAT32_UNIT_BITS - FRAC_BITS
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


def load_tool(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "tools" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


REFEREE = load_tool("features_referee")
JSNUM = REFEREE.JSNUM
SIGMOID = load_tool("sigmoid_referee")


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


def float32_bits_of_q24(q):
    """Bits of the float32 nearest q / 2^24, ties to even: the value torch.tensor(..., dtype=float32) stores for
    the double q / 2^24 (exact for |q| < 2^53), which is what inference_server.py:24 builds from the request."""
    if abs(q) >= 1 << 53:
        raise SystemExit(f"MODEL_PARITY|refused=input|q24={q}|reason=q / 2^24 is not an exact double|json=0")
    sign = 0x8000_0000 if q < 0 else 0
    magnitude = abs(q)
    if magnitude == 0:
        return sign
    shift = magnitude.bit_length() - 24  # magnitude = significand * 2^shift, significand in [2^23, 2^24)
    if shift > 0:
        significand, rest = magnitude >> shift, magnitude & ((1 << shift) - 1)
        half = 1 << (shift - 1)
        if rest > half or (rest == half and significand & 1):
            significand += 1
        if significand == 1 << 24:
            significand, shift = significand >> 1, shift + 1
    else:
        significand = magnitude << -shift
    # q / 2^24 = significand * 2^(shift - 24) = (significand / 2^23) * 2^(shift - 1): biased exponent shift + 126.
    return sign | (shift + 126) << 23 | (significand - (1 << 23))


def float32_tensor(bit_rows):
    """The float32 tensor whose elements have these bit patterns (rows of unsigned 32-bit integers)."""
    signed = [[b - (1 << 32) if b >> 31 else b for b in row] for row in bit_rows]
    return torch.tensor(signed, dtype=torch.int32).view(torch.float32)


def tensor_bits(tensor):
    """The float32 bit patterns of a float32 tensor, flattened, as unsigned integers."""
    if tensor.dtype != torch.float32:
        raise SystemExit(f"MODEL_PARITY|refused=dtype|got={tensor.dtype}|json=0")
    return [b & 0xFFFF_FFFF for b in tensor.contiguous().reshape(-1).view(torch.int32).tolist()]


def q24_bits(x_q24):
    # The Q24 inputs as the float32 tensor the server builds from the doubles q / 2^24. model_input_q24 rounds the
    # train_baseline.py:31-38 ratios to Q24; build_node_features (line 39) rounds them to float32.
    return [[float32_bits_of_q24(q) for q in row] for row in x_q24]


def binary64_value(num, den):
    # The JS number num / den (gnnDataExport.js:58, :60 `/ 100`, `/ 1000`) as a Python float object built from its
    # binary64 bit pattern, which tools/jsnum_referee.py computes in integers; it is handed to the owner's float code.
    return struct.unpack("<d", JSNUM.to_binary64(num, den).to_bytes(8, "little"))[0]


def upstream_bits(nodes):
    # gnnDataExport.js:55-63 node objects (avgRisk = round / 100, failureRate = round / 1000), then the owner's
    # train_baseline.build_node_features (numpy float32 rows), read by bit pattern.
    objects = [
        {
            "edgeVolume": node["edge_volume"],
            "avgRisk": binary64_value(node["avg_risk_centi"], 100),
            "maxRisk": node["max_risk"],
            "failureRate": binary64_value(node["failure_rate_milli"], 1000),
            "online": node["online"],
            "trustTier": node["trust_tier"],
        }
        for node in nodes
    ]
    features = torch.from_numpy(train_baseline.build_node_features(objects))
    bits = tensor_bits(features)
    return [bits[i : i + 6] for i in range(0, len(bits), 6)]


def server_scores(bit_rows, edges):
    # inference_server.py:24 on these node rows; the float32 scores' bit patterns.
    with torch.no_grad():
        scores = MODEL(float32_tensor(bit_rows), torch.tensor(edges, dtype=torch.long).t().contiguous())
    return tensor_bits(scores)


def float32_units(bits):
    """The finite float32 with these bits times 2^149, an exact integer."""
    exponent = (bits >> 23) & 0xFF
    if exponent == 0xFF:
        raise SystemExit(f"MODEL_PARITY|refused=not_finite|bits={bits:08x}|json=0")
    fraction = bits & 0x7F_FFFF
    magnitude = fraction if exponent == 0 else (fraction | 1 << 23) << (exponent - 1)
    return -magnitude if bits >> 31 else magnitude


def q24_of(bits):
    # floor(score * 2^24 + 1/2) of the float32 score with these bits.
    return (float32_units(bits) + (1 << (UNITS_PER_Q24_BITS - 1))) >> UNITS_PER_Q24_BITS


def midpoint_distance_q24(bits):
    # Distance from the score to the nearest toFixed(4) rounding midpoint (k + 1/2) / 10^4, in Q24 units, as an
    # exact rational: with e4 = units * 10^4 / 2^149, it is |2 (units * 10^4 mod 2^149) - 2^149| * 2^24 / (2^150 10^4).
    fraction_part = float32_units(bits) * 10_000 % (1 << FLOAT32_UNIT_BITS)
    return Fraction(abs(2 * fraction_part - (1 << FLOAT32_UNIT_BITS)) << FRAC_BITS, 10_000 << (FLOAT32_UNIT_BITS + 1))


def graph_row(prefix, x_q24, edges):
    scores = server_scores(q24_bits(x_q24), edges)
    x_field = ";".join(",".join(str(q) for q in row) for row in x_q24)
    edge_field = ",".join(f"{s}>{t}" for s, t in edges)
    bits = ",".join(f"{b:08x}" for b in scores)
    q24 = ",".join(str(q24_of(b)) for b in scores)
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
        JSNUM.js_round_ratio_scaled(total_risk, edge_volume, 100),  # gnnDataExport.js:58
        max_risk,
        JSNUM.js_round_ratio_scaled(failures, edge_volume, 1000),  # gnnDataExport.js:60
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
            nodes += q24_bits([model_input_q24(feature_node(actor)), model_input_q24(feature_node(target))])
        edges = [[2 * k, 2 * k + 1] for k in range(len(chunk))]
        for k, bits in enumerate(server_scores(nodes, edges)):
            if midpoint_distance_q24(bits) <= SCREEN_Q24:
                kept.append((start + k, bits))
    return kept


def request_rows(summary):
    rng = Lcg(0x4E4541522D544945)
    pairs = [(request_features(rng), request_features(rng)) for _ in range(RANDOM_REQUESTS)]
    cases = [(name, actor, target, None) for name, actor, target in FIXED_REQUESTS]
    cases += [(str(index), *pairs[index], batched) for index, batched in screened_requests(pairs)]
    rows = []
    batch_shift_units = 0  # largest |single - batched| score difference, in units of 2^-149
    for name, actor, target, batched in cases:
        nodes = [feature_node(actor), feature_node(target)]
        x_q24 = [model_input_q24(node) for node in nodes]
        [score] = server_scores(q24_bits(x_q24), [[0, 1]])
        [upstream] = server_scores(upstream_bits(nodes), [[0, 1]])
        if batched is not None:
            shift = max(abs(float32_units(b) - float32_units(batched)) for b in (score, upstream))
            batch_shift_units = max(batch_shift_units, shift)
            if min(midpoint_distance_q24(score), midpoint_distance_q24(upstream)) > NEAR_TIE_Q24:
                continue
        features = ";".join(",".join(str(v) for v in f) for f in (actor, target))
        rows.append(f"REQUEST|case={name}|features={features}|out_bits={score:08x}|upstream_bits={upstream:08x}")
    # ceil(shift * 2^24) of the largest shift, in Q24 units.
    batch_shift_q24 = -(-batch_shift_units >> UNITS_PER_Q24_BITS)
    # The screen holds while a batched score is within (SCREEN_Q24 - NEAR_TIE_Q24) / 2 of both single scores.
    if 2 * batch_shift_units > (SCREEN_Q24 - NEAR_TIE_Q24) << UNITS_PER_Q24_BITS:
        raise SystemExit(f"MODEL_PARITY|refused=screen|batch_shift_q24_ceil={batch_shift_q24}|json=0")
    summary.update(requests=len(rows), random_requests=RANDOM_REQUESTS, request_batch_shift_q24=batch_shift_q24)
    return rows


def render():
    if not (type(MODEL.conv1) is GCNConv and type(MODEL.conv2) is GCNConv and not MODEL.training):
        raise SystemExit("MODEL_PARITY|refused=model|reason=MODEL is not the eval-mode torch_geometric GCNConv model|json=0")
    summary = {}
    sigmoid_rows, sigmoid_header, sigmoid_summary = SIGMOID.rows()
    rows = sigmoid_rows[:1]  # CONST|name=LN2_Q62
    scores = 0
    features = feature_rows()
    pairs = fixture_pairs()
    for actor_id, target_id in pairs:
        nodes = [features[actor_id], features[target_id]]
        x_q24 = [model_input_q24(node) for node in nodes]
        prefix = f"PAIR|actor={REFEREE.escape(actor_id)}|target={REFEREE.escape(target_id)}"
        row, count = graph_row(prefix, x_q24, [[0, 1]])
        [upstream] = server_scores(upstream_bits(nodes), [[0, 1]])
        rows.append(f"{row}|upstream_bits={upstream:08x}")
        scores += count
    rng = Lcg(0x5DEECE66D)
    for case in range(RANDOM_GRAPHS):
        x_q24, edges = random_graph(rng, case)
        row, count = graph_row(f"GRAPH|case={case}", x_q24, edges)
        rows.append(row)
        scores += count
    summary.update(pairs=len(pairs), graphs=RANDOM_GRAPHS, scores=scores)
    rows += request_rows(summary)
    rows += sigmoid_rows[1:]
    summary.update(sigmoid_summary)
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
        + sigmoid_header
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
