#!/usr/bin/env python3
"""Stdlib referee for src/model.rs: the Q24 integer forward of PrototypeGNN, recomputed with Python integers.

Weights come from tools/quantize.py (the pinned checkpoint, read without torch). Each step mirrors one upstream
line of prototype_gnn.py with the fallback GCNConv (lines 17-24, `self.lin(x)`), in eval mode:
  conv1 -> ReLU -> conv2 (65-71); cat(h[row], h[col]) -> Linear -> ReLU -> Linear (73-78);
  squared distance to each prototype, min per class, -d / 0.1 (80-105); softmax, column 1 (128-131).
Linear outputs round half up to Q24 once; distances and logits are exact Q48; the probability is
floor(2^24 * softmax(logits)[1] + 1/2) with the exact exponential (Python decimal, 60 digits).
Writes tests/fixtures/expected-int.hbp; --check regenerates it in memory and diffs.
Run: python3 -I tools/int_referee.py [--check]
"""
import importlib.util
import pathlib
import sys
from decimal import ROUND_FLOOR, Decimal, localcontext

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXPECTED = ROOT / "tests" / "fixtures" / "expected-int.hbp"
FRAC_BITS = 24
LOGIT_BITS = 2 * FRAC_BITS
INVERSE_TEMPERATURE = 10  # temperature: float = 0.1 (prototype_gnn.py:39)
PAIR_CASES = 48
GRAPH_CASES = 96

sys.dont_write_bytecode = True  # no __pycache__ beside tools/


def load_quantize():
    spec = importlib.util.spec_from_file_location("quantize", ROOT / "tools" / "quantize.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Weights:
    def __init__(self):
        tensors = load_quantize().q24_tensors()

        def matrix(name):
            (rows, cols), values = tensors[name]
            return [values[r * cols:(r + 1) * cols] for r in range(rows)]

        self.conv1_w, self.conv1_b = matrix("CONV1_W"), tensors["CONV1_B"][1]
        self.conv2_w, self.conv2_b = matrix("CONV2_W"), tensors["CONV2_B"][1]
        self.proj0_w, self.proj0_b = matrix("PROJ0_W"), tensors["PROJ0_B"][1]
        self.proj2_w, self.proj2_b = matrix("PROJ2_W"), tensors["PROJ2_B"][1]
        (classes, per_class, dim), values = tensors["PROTOTYPES"]
        self.prototypes = [
            [values[(c * per_class + k) * dim:(c * per_class + k + 1) * dim] for k in range(per_class)]
            for c in range(classes)
        ]


class Lcg:
    # The generator of model/l0-edge/tools/jsnum_referee.py.
    def __init__(self, seed):
        self.state = seed

    def below(self, bound):
        self.state = (self.state * 6364136223846793005 + 1442695040888963407) % (1 << 64)
        return (self.state >> 11) % bound


def round_shift(value, bits):
    return (value + (1 << (bits - 1))) >> bits


def linear_q24(row, weight, bias):
    # nn.Linear: one Q24 rounding per output of sum(x * w) + b.
    return [round_shift(sum(x * w for x, w in zip(row, w_row)) + (b << FRAC_BITS), FRAC_BITS)
            for w_row, b in zip(weight, bias)]


def relu(row):
    return [max(v, 0) for v in row]


def encode_nodes(weights, x_q24):
    # prototype_gnn.py:67-71; the fallback GCNConv ignores edge_index (line 24) and dropout is off in eval.
    return [linear_q24(relu(linear_q24(row, weights.conv1_w, weights.conv1_b)), weights.conv2_w, weights.conv2_b)
            for row in x_q24]


def edge_embedding(weights, h, source, target):
    # prototype_gnn.py:76-78
    hidden = relu(linear_q24(h[source] + h[target], weights.proj0_w, weights.proj0_b))
    return linear_q24(hidden, weights.proj2_w, weights.proj2_b)


def prototype_logits_q48(weights, e):
    # prototype_gnn.py:96-103: min over each class's prototypes of sum((e - p)^2), then -d / 0.1.
    return [-INVERSE_TEMPERATURE * min(sum((a - b) ** 2 for a, b in zip(e, proto)) for proto in protos)
            for protos in weights.prototypes]


def exact_sigmoid(logit_q48):
    """(floor(2^24 * sigmoid + 1/2), distance of 2^24 * sigmoid from the nearest half) at 60 digits."""
    with localcontext() as ctx:
        ctx.prec = 60
        t = Decimal(logit_q48) / Decimal(1 << LOGIT_BITS)
        p = Decimal(1) / (Decimal(1) + (-t).exp())
        v = p * (1 << FRAC_BITS) + Decimal("0.5")
        q = int(v.to_integral_value(rounding=ROUND_FLOOR))
        return q, min(v - q, q + 1 - v)


def exact_sigmoid_q24(logit_q48):
    q, gap = exact_sigmoid(logit_q48)
    if gap < Decimal(10) ** -40:  # the 60-digit value could fall on either side of the half
        raise SystemExit(f"INT_REFEREE|refused=sigmoid_not_certified|logit_q48={logit_q48}")
    return q


def probability_q24(logits):
    # prototype_gnn.py:128-131: softmax(logits)[1] = 1 / (1 + e^(l0 - l1)).
    return exact_sigmoid_q24(logits[1] - logits[0])


def float32_exact(q):
    # Keeps at most 24 significant bits, so q / 2^24 is exact in the float32 tensor torch builds.
    shift = max(abs(q).bit_length() - 24, 0)
    magnitude = (abs(q) >> shift) << shift
    return magnitude if q >= 0 else -magnitude


def q24_ratio(num, den):
    return ((num << (FRAC_BITS + 1)) + den) // (2 * den)


def training_range_node(rng, risk_limit):
    # Q24 rows in the ranges of the six-feature scaling of train_baseline.py:31-38 (the L1 trainer is not on disk).
    max_risk = rng.below(risk_limit + 1)
    row = [
        q24_ratio(min(1 + rng.below(150), 100), 100),
        q24_ratio(rng.below(max_risk * 100 + 1), 900),
        q24_ratio(max_risk, 9),
        q24_ratio(rng.below(1001), 1000),
        q24_ratio(1, 1),
        q24_ratio(1 + rng.below(3), 3),
    ]
    return [float32_exact(q) for q in row]


def wide_node(rng):
    return [float32_exact(rng.below(1 << 41) - (1 << 40)) for _ in range(6)]


def node_row(rng, case):
    kind = case % 4
    if kind == 3:
        return wide_node(rng)
    return training_range_node(rng, (9, 21, 1000)[kind])


def cases():
    """[(kind, case, x_q24, edges)], fixed seed; PAIR cases are the graph [source, target] with edge (0, 1)."""
    rng = Lcg(0x5DEECE66D)
    out = []
    for case in range(PAIR_CASES):
        out.append(("PAIR", case, [node_row(rng, case), node_row(rng, case)], [[0, 1]]))
    for case in range(GRAPH_CASES):
        node_count = 2 + rng.below(8)
        x_q24 = [node_row(rng, case) for _ in range(node_count)]
        edges = [[rng.below(node_count), rng.below(node_count)] for _ in range(1 + rng.below(2 * node_count))]
        loop = rng.below(node_count)
        edges.append([loop, loop])
        edges.append(list(edges[rng.below(len(edges))]))
        for i in range(len(edges) - 1, 0, -1):
            j = rng.below(i + 1)
            edges[i], edges[j] = edges[j], edges[i]
        out.append(("GRAPH", case, x_q24, edges))
    return out


def join_rows(rows):
    return ";".join(",".join(str(v) for v in row) for row in rows)


def sigmoid_logits(rng):
    one = 1 << LOGIT_BITS
    logits = [0, 1, -1, one, -one, 18 * one, 18 * one + 1, 18 * one - 1]
    logits += [-v for v in logits[5:]]
    logits += [rng.below(40 * one + 1) - 20 * one for _ in range(800)]
    logits += [rng.below(2 * one + 1) - one for _ in range(400)]
    logits += [10 * one + rng.below(one) for _ in range(200)]
    for _ in range(300):
        v = 17 * one + rng.below(3 * one // 2)
        logits.append(v if rng.below(2) else -v)
    return logits


def boundary_logits(rng):
    # Q48 logits next to ln((k + 1/2) / (2^24 - k - 1/2)) * 2^48, where 2^24 * sigmoid crosses k + 1/2, on the integer
    # lattice and on multiples of 10 (l1 - l0 = 10 * (d0 - d1), prototype_gnn.py:103), with both signs; kept when the
    # exact value lies within 2^-32 of the half (the window src/model.rs decides with interval sums).
    ks = [rng.below(16000) for _ in range(50)] + [(1 << FRAC_BITS) - 1 - rng.below(16000) for _ in range(50)]
    ks += [rng.below(1 << FRAC_BITS) for _ in range(300)]
    window = Decimal(1) / Decimal(1 << 32)
    # Four logits from the L1 review's boundary hunt (integer lattice, then multiples of 10).
    kept = [-2903085619798773, 4568357769096465, 2979298638208620, -3016837914596280]
    for k in ks:
        with localcontext() as ctx:
            ctx.prec = 60
            half = Decimal(k) + Decimal("0.5")
            crossing = (half / (Decimal(1 << FRAC_BITS) - half)).ln() * (1 << LOGIT_BITS)
            crossing = int(crossing.to_integral_value(rounding=ROUND_FLOOR))
        for step in (1, 10):
            base = crossing // step * step
            kept += [v for v in (base, base + step) if exact_sigmoid(v)[1] < window]
    kept = list(dict.fromkeys(kept))
    return kept + [-v for v in kept]


def ln2_q62():
    with localcontext() as ctx:
        ctx.prec = 60
        return int((Decimal(2).ln() * (1 << 62) + Decimal("0.5")).to_integral_value(rounding=ROUND_FLOOR))


def render():
    weights = Weights()
    rows = [f"CONST|name=LN2_Q62|value={ln2_q62()}"]
    edges_total = 0
    for kind, case, x_q24, edges in cases():
        h = encode_nodes(weights, x_q24)
        embeddings = [edge_embedding(weights, h, s, t) for s, t in edges]
        logits = [prototype_logits_q48(weights, e) for e in embeddings]
        probabilities = [probability_q24(l) for l in logits]
        edges_total += len(edges)
        head = f"{kind}|case={case}|x={join_rows(x_q24)}|edges={','.join(f'{s}>{t}' for s, t in edges)}"
        if kind == "PAIR":
            rows.append(f"{head}|h={join_rows(h)}|e={join_rows(embeddings)}|logits_q48={join_rows(logits)}"
                        f"|p_q24={','.join(map(str, probabilities))}")
        else:
            rows.append(f"{head}|logits_q48={join_rows(logits)}|p_q24={','.join(map(str, probabilities))}")
    boundary = boundary_logits(Lcg(0x2545F4914F6CDD1D))
    logits = sigmoid_logits(Lcg(0x9E3779B97F4A7C15)) + boundary
    rows += [f"SIGMOID|logit_q48={v}|q24={exact_sigmoid_q24(v)}" for v in logits]
    header = (
        "# expected integer forward of PrototypeGNN (prototype_gnn.py, fallback GCNConv) from tools/int_referee.py; do not edit\n"
        "# x, h, e = Q24 (round half up per Linear output); logits_q48 = -10 * min squared distance per class, exact;\n"
        "# p_q24 and SIGMOID q24 = floor(2^24 / (1 + e^-t) + 1/2), t = (l1 - l0) or logit_q48 over 2^48, decimal at 60 digits\n"
        f"# the last {len(boundary)} SIGMOID rows are logits whose exact 2^24 / (1 + e^-t) lies within 2^-32 of a half\n"
    )
    summary = (f"pairs={PAIR_CASES}|graphs={GRAPH_CASES}|edges={edges_total}|sigmoid={len(logits)}"
               f"|boundary={len(boundary)}")
    return header + "\n".join(rows) + "\n", summary


def main():
    args = sys.argv[1:]
    if args not in ([], ["--check"]):
        print("usage: int_referee.py [--check]", file=sys.stderr)
        return 2
    text, summary = render()
    if args == ["--check"]:
        committed = EXPECTED.read_bytes().decode("utf-8")
        if committed != text:
            want, got = text.split("\n"), committed.split("\n")
            first = next((i for i, (w, g) in enumerate(zip(want, got)) if w != g), min(len(want), len(got)))
            print(f"INT_REFEREE|check=FAIL|first_diff_line={first + 1}")
            return 1
        print(f"INT_REFEREE|check=PASS|{summary}")
        return 0
    EXPECTED.write_bytes(text.encode("utf-8"))
    print(f"INT_REFEREE|written={EXPECTED.name}|{summary}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
