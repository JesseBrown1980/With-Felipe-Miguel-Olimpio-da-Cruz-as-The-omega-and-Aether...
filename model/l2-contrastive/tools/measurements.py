#!/usr/bin/env python3
"""Measures the numbers in PROVENANCE.md that no --check produces. Integer arithmetic only; not a check, and it
writes nothing into the crate.

  outputs  (stdlib)        run-1 probs[:, 1] spread and projection direction, from tests/fixtures/expected-model.hbp
  weights  (stdlib)        Q24 rounding of the run-1 weights, projection_head.2.bias's norm, conv1 columns 1 and 2
  run2     (torch)         run 1 against run 2 on the 262 layout edges
  exact    (torch, cargo)  Rust and torch against the exact forward, on the fixture graphs and on a sweep
  ties     (cargo)         the fixed-point sigmoid and F.normalize next to half-unit ties

The exact forward is the vendored class's eval-mode forward in integer arithmetic: each float32 weight is its exact
value (an integer multiple of 2^-149), the layer sums and ReLU are exact, softmax(logits)[1] is the exact sigmoid of
logits[1] - logits[0] and F.normalize the exact division by max(||v||, eps), each rounded once to Q24
(floor(value * 2^24 + 1/2)). Float runs only inside torch, the owner's float32 lane (the vendored class with the
checkpoint, run through tools/model_parity.py): its inputs are float32 bit patterns made with integers and its
outputs are read by bit pattern. Rust runs as a probe crate built with cargo +1.81.0 from verbatim copies of
src/model.rs and src/weights.rs, with two forwarding functions appended to the copy of model.rs.
Run: python3 -I tools/measurements.py outputs|weights|ties [--work DIR]
     <torch venv>/bin/python -I tools/measurements.py run2|exact [--work DIR]
"""
import hashlib
import importlib.util
import io
import math
import pathlib
import subprocess
import sys
import tempfile
import zipfile

sys.dont_write_bytecode = True  # no __pycache__ beside tools/

ROOT = pathlib.Path(__file__).resolve().parent.parent
FIXTURE = ROOT / "tests" / "fixtures" / "expected-model.hbp"
# The run-2 checkpoint as transferred from ACER (cube 9859b576); its sha256 is the pin in PROVENANCE.md.
RUN2 = ROOT.parent.parent / "acer" / "Asolaria" / "services" / "gnn-sidecar" / "contrastive_model_run2.pt"
RUN2_SHA256 = "048764063f6711be5f501f5f65155dc8d017c1106d99aecf2580ded2906ebe72"
FRAC_BITS = 24
ONE_Q24 = 1 << FRAC_BITS
FLOAT32_UNIT_BITS = 149
PROJECTION = 64
FIXED_GRAPHS = ("zeros", "ones", "offline", "high-risk")
# The status test's promotion criterion, "spread std > 0.01" (gnn-l1-l2-status.test.mjs:94-104), as 1/100.
CRITERION = (1, 100)
SWEEP_SEEDS = (7777, 31337)
SWEEP_BITS = (8, 10, 12, 16, 20)
SWEEP_GRAPHS = 1500
SIGMOID_RANDOM_SEED = 20261018
SIGMOID_TIE_SEED = 0x5EED71E5
SIGMOID_TIE_POINTS = 15000
NORMALIZE_TIE_SEED = 0x7135
NORMALIZE_TIE_VECTORS = 1000


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


QUANTIZE = load_module("quantize", ROOT / "tools" / "quantize.py")
MATH = load_module("math_referee", ROOT / "tools" / "math_referee.py")


def trit(left, right):
    """The balanced trit of left - right: -1 below, 0 equal, +1 above."""
    return (left > right) - (left < right)


def ratio(numerator, denominator):
    """n/d in lowest terms, as text."""
    g = math.gcd(numerator, denominator)
    return f"{numerator // g}/{denominator // g}"


def ceil_shift(value, shift):
    """ceil(value / 2^shift) of an integer value >= 0."""
    return -((-value) >> shift)


def floor_and_nearest_sqrt(numerator, denominator):
    """floor(sqrt(n / d)) and the integer nearest sqrt(n / d) (half up), n >= 0, d > 0."""
    k = math.isqrt(numerator // denominator)
    return k, k + 1 if (2 * k + 1) ** 2 * denominator <= 4 * numerator else k


# ---- the committed fixture ----


def fields(line):
    return dict(part.split("=", 1) for part in line.split("|")[1:])


def fixture_graphs():
    """(case, x_q24, edges, p_bits, p_q24, projections) per GRAPH row of the committed fixture, in order."""
    graphs = []
    for line in FIXTURE.read_text(encoding="utf-8").splitlines():
        if line.startswith("GRAPH|"):
            f = fields(line)
            x = [[int(q) for q in row.split(",")] for row in f["x"].split(";")]
            edges = [tuple(int(v) for v in edge.split(">")) for edge in f["edges"].split(",")]
            p_bits = [int(b, 16) for b in f["p_bits"].split(",")]
            p_q24 = [int(q) for q in f["p_q24"].split(",")]
            graphs.append((f["case"], x, edges, p_bits, p_q24, []))
        elif line.startswith("PROJ|"):
            f = fields(line)
            if f["case"] != graphs[-1][0] or int(f["edge"]) != len(graphs[-1][5]):
                raise SystemExit(f"MEASURE|refused=fixture|line={line[:60]}")
            graphs[-1][5].append([int(q) for q in f["q24"].split(",")])
    return graphs


def group_of(case):
    if case in FIXED_GRAPHS:
        return "fixed"
    if case.startswith("mag"):
        return case.split("-")[0]
    return "raw" if int(case) % 5 == 4 else "training"


LAYOUT_GROUPS = ("training", "raw", "fixed")


# ---- spread of probs[:, 1] ----


def spread_rows(label, p_bits):
    """min/max/range/distinct in Q24, exact-1.0 count, and the population standard deviation of the float32 values
    (exact variance from the bits, integer square root floored, Q24) against the 0.01 criterion."""
    units = [QUANTIZE.float32_units(b) for b in p_bits]
    q24 = [QUANTIZE.q24_of_float32_bits(b) for b in p_bits]
    n = len(units)
    s1, s2 = sum(units), sum(u * u for u in units)
    variance_num, variance_den = n * s2 - s1 * s1, (n * n) << (2 * FLOAT32_UNIT_BITS)
    std_floor, std_nearest = floor_and_nearest_sqrt(variance_num << (2 * FRAC_BITS), variance_den)
    q24_s1, q24_s2 = sum(q24), sum(q * q for q in q24)
    q24_variance = ratio(n * q24_s2 - q24_s1 * q24_s1, n * n)
    # std > 1/100 exactly when variance > 1/100^2.
    criterion = trit(variance_num * CRITERION[1] ** 2, CRITERION[0] ** 2 * variance_den)
    print(
        f"SPREAD|set={label}|edges={n}|min_q24={min(q24)}|max_q24={max(q24)}|range_q24={max(q24) - min(q24)}"
        f"|distinct_q24={len(set(q24))}|exact_one={sum(b == 0x3F800000 for b in p_bits)}"
        f"|pstdev_q24_floor={std_floor}|pstdev_q24_nearest={std_nearest}|variance_of_q24_values_q48={q24_variance}"
        f"|criterion_0.01_q24={ratio(CRITERION[0] << FRAC_BITS, CRITERION[1])}|std_vs_criterion_trit={criterion}"
    )


def outputs():
    graphs = fixture_graphs()
    by_group = {}
    for case, _, edges, p_bits, _, projections in graphs:
        entry = by_group.setdefault(group_of(case), {"graphs": 0, "bits": [], "proj": []})
        entry["graphs"] += 1
        entry["bits"] += p_bits
        entry["proj"] += projections
    for group, entry in by_group.items():
        print(f"GROUP|group={group}|graphs={entry['graphs']}|edges={len(entry['bits'])}")
    layout_bits = [b for g in LAYOUT_GROUPS for b in by_group[g]["bits"]]
    spread_rows("layout", layout_bits)
    spread_rows("training", by_group["training"]["bits"])
    spread_rows("training+fixed", by_group["training"]["bits"] + by_group["fixed"]["bits"])

    projections = [p for g in LAYOUT_GROUPS for p in by_group[g]["proj"]]
    total = [sum(p[i] for p in projections) for i in range(PROJECTION)]
    square = sum(m * m for m in total)
    order = sorted(range(PROJECTION), key=lambda i: -abs(total[i]))
    top, second = order[0], order[1]
    q30_floor, q30_nearest = floor_and_nearest_sqrt(total[top] ** 2 << 60, square)
    print(
        f"DIRECTION|edges={len(projections)}|top_component={top}|top_sum_q24={total[top]}|second_component={second}"
        f"|second_sum_q24={total[second]}|top_over_second={abs(total[top])}/{abs(total[second])}"
        f"|top_over_second_floor={abs(total[top]) // abs(total[second])}|norm_squared_q48={square}"
        f"|unit_top_q30_floor={q30_floor}|unit_top_q30_nearest={q30_nearest}|sign={trit(total[top], 0)}"
    )
    cosines = []
    for p in projections:
        dot = sum(a * b for a, b in zip(p, total))
        length = sum(a * a for a in p)
        floor_value = math.isqrt((dot * dot << 60) // (length * square))
        cosines.append((floor_value if dot > 0 else -floor_value - 1, dot, length))
    low, dot, length = min(cosines)
    _, nearest = floor_and_nearest_sqrt(dot * dot << 60, length * square)
    column = [p[top] for p in projections]
    print(
        f"COSINE|edges={len(cosines)}|min_cosine_q30_floor={low}|its_nearest_q30={nearest}"
        f"|component_{top}_min_q24={min(column)}|component_{top}_max_q24={max(column)}"
    )


# ---- weights ----


def load_state(path, sha256):
    """quantize.load_state_dict for a checkpoint with another pinned sha256 (the same restricted unpickler)."""
    blob = path.read_bytes()
    digest = hashlib.sha256(blob).hexdigest()
    if digest != sha256:
        raise SystemExit(f"MEASURE|refused=sha256|path={path}|got={digest}")
    with zipfile.ZipFile(io.BytesIO(blob)) as archive:
        pickles = [n for n in archive.namelist() if n.endswith("/data.pkl")]
        prefix = pickles[0][: -len("/data.pkl")]
        state = QUANTIZE.CheckpointUnpickler(archive.read(pickles[0]), archive, prefix).load()
    QUANTIZE.check_layout(state)
    return state


def weights():
    shift = FLOAT32_UNIT_BITS - FRAC_BITS
    run1 = QUANTIZE.load_state_dict(QUANTIZE.CHECKPOINT)
    worst = (0, "", 0)
    ties = 0
    for key, _, _ in QUANTIZE.TENSORS:
        for index, bits in enumerate(run1[key].values):
            units = QUANTIZE.float32_units(bits)
            moved = abs(units - (QUANTIZE.q24_of_float32_bits(bits) << shift))
            ties += moved == 1 << (shift - 1)
            if moved > worst[0]:
                worst = (moved, key, index)
    print(
        f"ROUNDING|weights={sum(len(run1[k].values) for k, _, _ in QUANTIZE.TENSORS)}"
        f"|max_shift_q24_units={ratio(worst[0], 1 << shift)}|at={worst[1]}[{worst[2]}]|exact_half_unit_ties={ties}"
    )
    bias_bits = run1["projection_head.2.bias"].values
    bias_q24 = [QUANTIZE.q24_of_float32_bits(b) for b in bias_bits]
    moved = [abs(QUANTIZE.float32_units(b) - (q << shift)) for b, q in zip(bias_bits, bias_q24)]
    at = max(range(len(moved)), key=lambda i: moved[i])
    square_q48 = sum(q * q for q in bias_q24)
    norm_floor, norm_nearest = floor_and_nearest_sqrt(square_q48, 1)
    exact_square = sum(QUANTIZE.float32_units(b) ** 2 for b in bias_bits)
    exact_floor, exact_nearest = floor_and_nearest_sqrt(exact_square, 1 << (2 * shift))
    nonzero = [(i, q) for i, q in enumerate(bias_q24) if q]
    print(
        f"BIAS|key=projection_head.2.bias|nonzero_q24={';'.join(f'{i}:{q}' for i, q in nonzero)}"
        f"|max_shift_q24_units={ratio(moved[at], 1 << shift)}|at={at}|q24_at={bias_q24[at]}"
        f"|q24_bias_norm_squared_q48={square_q48}|q24_bias_norm_floor={norm_floor}|nearest={norm_nearest}"
        f"|float32_bias_norm_squared_q48_floor={exact_square >> (2 * shift)}|float32_norm_floor={exact_floor}"
        f"|nearest={exact_nearest}"
    )
    # A shift d (Q24 units) of a component orthogonal to the bias moves F.normalize's output by d / ||bias||.
    print(
        f"SCALED|measured_max_q24_units={ratio(moved[at] << FRAC_BITS, norm_floor << shift)}"
        f"|half_unit_bound_q24_units={ratio(1 << (FRAC_BITS - 1), norm_floor)}"
    )
    run2 = load_state(RUN2, RUN2_SHA256)
    for name, state in (("run1", run1), ("run2", run2)):
        conv1 = state["conv1.lin.weight"].values
        equal = sum(conv1[6 * r + 1] == conv1[6 * r + 2] for r in range(64))
        print(f"CONV1_COLUMNS|checkpoint={name}|rows=64|column1_equals_column2_bits={equal}")


# ---- torch (the owner's float32 lane) ----


def model_parity():
    """tools/model_parity.py, imported: it pins the kernels, loads the vendored class with run 1 and checks it."""
    return load_module("model_parity", ROOT / "tools" / "model_parity.py")


def torch_outputs(parity, model, x_q24, edges):
    """probs[:, 1] float32 bits and projection float32 bits per edge, as model_parity.graph_rows runs them."""
    torch = parity.torch
    x = parity.float32_tensor(x_q24)
    edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
    with torch.no_grad():
        probs = model(x, edge_index)
        _, projections = model(x, edge_index, return_projections=True)
    return parity.float32_bits(probs.reshape(-1)), parity.float32_bits(projections)


def run2():
    parity = model_parity()
    torch = parity.torch
    load_state(RUN2, RUN2_SHA256)
    second = parity.contrastive_gnn.ContrastiveGNN(6, 64)
    second.load_state_dict(torch.load(RUN2, map_location="cpu", weights_only=True))
    second.eval()
    shift = FLOAT32_UNIT_BITS - FRAC_BITS
    p1_all, p2_all, reproduced = [], [], 0
    worst = {"probs": [0, 0], "projections": [0, 0]}
    for case, x, edges, p_bits, _, projections in fixture_graphs():
        if group_of(case) not in LAYOUT_GROUPS:
            continue
        b1, j1 = torch_outputs(parity, parity.MODEL, x, edges)
        b2, j2 = torch_outputs(parity, second, x, edges)
        reproduced += b1 == p_bits and [[QUANTIZE.q24_of_float32_bits(v) for v in r] for r in j1] == projections
        p1_all += b1
        p2_all += b2
        flat1, flat2 = [v for row in j1 for v in row], [v for row in j2 for v in row]
        pairs = {"probs": zip(b1, b2), "projections": zip(flat1, flat2)}
        for name, pair in pairs.items():
            for a, b in pair:
                exact = abs(QUANTIZE.float32_units(a) - QUANTIZE.float32_units(b))
                rounded = abs(QUANTIZE.q24_of_float32_bits(a) - QUANTIZE.q24_of_float32_bits(b))
                worst[name] = [max(worst[name][0], exact), max(worst[name][1], rounded)]
    ones = [{i for i, b in enumerate(bits) if b == 0x3F800000} for bits in (p1_all, p2_all)]
    print(
        f"RUN2|graphs_reproducing_the_fixture_with_run1={reproduced}|edges={len(p1_all)}"
        f"|exact_one_run1={len(ones[0])}|exact_one_run2={len(ones[1])}|exact_one_both={len(ones[0] & ones[1])}"
    )
    spread_rows("run2-layout", p2_all)
    for name, (exact, rounded) in worst.items():
        print(
            f"RUN1_VS_RUN2|output={name}|max_exact_difference={ratio(exact, 1 << FLOAT32_UNIT_BITS)}"
            f"|its_ceiling_q24={ceil_shift(exact, shift)}|max_difference_of_q24_rounded={rounded}"
        )


# ---- the exact forward ----


def lowest_terms(units, scale):
    """Integers at 2^-scale with their common power of two taken out: (integers, scale)."""
    common = min(((u & -u).bit_length() - 1 for u in units if u), default=0)
    common = min(common, scale)
    return [u >> common for u in units], scale - common


# (weight key, bias key, input width) of each nn.Linear in the forward.
LAYERS = {
    "conv1": ("conv1.lin.weight", "conv1.lin.bias", 6),
    "conv2": ("conv2.lin.weight", "conv2.lin.bias", 64),
    "edge": ("edge_mlp.0.weight", "edge_mlp.0.bias", 128),
    "proj1": ("projection_head.0.weight", "projection_head.0.bias", 64),
    "proj2": ("projection_head.2.weight", "projection_head.2.bias", 64),
    "cls1": ("classifier.0.weight", "classifier.0.bias", 64),
    "cls2": ("classifier.3.weight", "classifier.3.bias", 32),
}


class ExactForward:
    """ContrastiveGNN.forward (fallback GCNConv, eval) in exact integer arithmetic for the given weights."""

    def __init__(self, integers_of, scale):
        """integers_of(key) gives a tensor's values as integers at 2^-scale."""
        self.layers = {}
        for name, (weight_key, bias_key, width) in LAYERS.items():
            w, w_scale = lowest_terms(integers_of(weight_key), scale)
            b, b_scale = lowest_terms(integers_of(bias_key), scale)
            rows = [w[r * width:(r + 1) * width] for r in range(len(b))]
            self.layers[name] = (rows, w_scale, b, b_scale)

    def linear(self, name, values, scale):
        rows, w_scale, bias, b_scale = self.layers[name]
        product_scale = scale + w_scale
        out_scale = max(product_scale, b_scale)
        up, bias_up = out_scale - product_scale, out_scale - b_scale
        out = [(sum(map(int.__mul__, row, values)) << up) + (b << bias_up) for row, b in zip(rows, bias)]
        return out, out_scale

    def node(self, features, scale):
        hidden, scale = self.linear("conv1", features, scale)
        return self.linear("conv2", [max(v, 0) for v in hidden], scale)

    def edge(self, source, target):
        (s, scale), (t, _) = source, target
        hidden, scale = self.linear("edge", s + t, scale)
        hidden = [max(v, 0) for v in hidden]
        cls, cls_scale = self.linear("cls1", hidden, scale)
        logits, logit_scale = self.linear("cls2", [max(v, 0) for v in cls], cls_scale)
        proj, proj_scale = self.linear("proj1", hidden, scale)
        projection, projection_scale = self.linear("proj2", [max(v, 0) for v in proj], proj_scale)
        return exact_sigmoid_q24(logits[1] - logits[0], logit_scale), exact_normalize_q24(projection, projection_scale)

    def graph(self, x, scale, edges):
        nodes = {i: self.node(x[i], scale) for i in sorted({i for edge in edges for i in edge})}
        return [self.edge(nodes[s], nodes[t]) for s, t in edges]


def exact_sigmoid_q24(numerator, shift):
    """floor(2^24 / (1 + e^-t) + 1/2) for t = numerator / 2^shift, as math_referee.exact_sigmoid_q24 computes it.
    For |t| >= 18 it is 2^24 or 0: the referee gives those at t = +-18, and the rounded sigmoid is monotone."""
    if abs(numerator) >= 18 << shift:
        return ONE_Q24 if numerator > 0 else 0
    precision = MATH.FIRST_PRECISION
    while True:
        lo, hi = MATH.exp_bounds(abs(numerator), shift, precision)
        one = 1 << precision
        e_bounds = ((one * one) // hi, -(-(one * one) // lo))
        if numerator >= 0:
            rounded = [((one << (FRAC_BITS + 1)) + one + e) // (2 * (one + e)) for e in e_bounds]
        else:
            rounded = [((e << (FRAC_BITS + 1)) + one + e) // (2 * (one + e)) for e in e_bounds]
        if rounded[0] == rounded[1]:
            return rounded[0]
        precision *= 2


def exact_normalize_q24(v, scale):
    """floor(2^24 * v_i / max(||v||, eps) + 1/2) for v_i / 2^scale; eps = 9223372 * 2^-63 (math_referee)."""
    square = sum(c * c for c in v)
    eps_shift = 63
    if square << (2 * eps_shift) < (MATH.EPS_SIGNIFICAND ** 2) << (2 * scale):
        denominator = MATH.EPS_SIGNIFICAND << scale
        return [((c << (FRAC_BITS + eps_shift + 1)) + denominator) // (2 * denominator) for c in v]
    return [MATH.round_over_sqrt(c << FRAC_BITS, square) for c in v]


def float32_forward():
    state = QUANTIZE.load_state_dict(QUANTIZE.CHECKPOINT)
    return ExactForward(lambda key: [QUANTIZE.float32_units(b) for b in state[key].values], FLOAT32_UNIT_BITS)


def q24_forward():
    state = QUANTIZE.load_state_dict(QUANTIZE.CHECKPOINT)
    return ExactForward(lambda key: [QUANTIZE.q24_of_float32_bits(b) for b in state[key].values], FRAC_BITS)


# ---- the Rust probe ----

PROBE_APPEND = """
pub fn probe_sigmoid_q24(logit_q48: i128) -> i64 {
    sigmoid_q24(logit_q48)
}

pub fn probe_normalize_q24(v_q48: &[i128; PROJECTION]) -> [i64; PROJECTION] {
    normalize_q24(v_q48)
}
"""

PROBE_MAIN = """#![allow(dead_code)]
mod model;
mod weights;

use std::io::{self, BufRead, Write};

fn join(values: &[i64]) -> String {
    values.iter().map(i64::to_string).collect::<Vec<_>>().join(",")
}

fn main() {
    let stdin = io::stdin();
    let mut out = io::BufWriter::new(io::stdout().lock());
    for line in stdin.lock().lines() {
        let line = line.expect("line");
        let (kind, rest) = line.split_once(' ').expect("kind");
        let text = match kind {
            "S" => model::probe_sigmoid_q24(rest.parse().expect("logit")).to_string(),
            "N" => {
                let v: Vec<i128> = rest.split(',').map(|c| c.parse().expect("component")).collect();
                join(&model::probe_normalize_q24(&v.try_into().expect("64 components")))
            }
            "G" => {
                let (x, edges) = rest.split_once('|').expect("x|edges");
                let x: Vec<[i64; 6]> = x
                    .split(';')
                    .map(|row| {
                        let row: Vec<i64> = row.split(',').map(|q| q.parse().expect("q24")).collect();
                        row.try_into().expect("6 features")
                    })
                    .collect();
                let edges: Vec<(usize, usize)> = edges
                    .split(',')
                    .map(|e| {
                        let (s, t) = e.split_once('>').expect("s>t");
                        (s.parse().expect("s"), t.parse().expect("t"))
                    })
                    .collect();
                let outputs = model::edge_outputs(&x, &edges).expect("valid graph");
                let parts: Vec<String> = outputs
                    .iter()
                    .map(|o| format!("{}:{}", o.anomaly_q24, join(&o.projection_q24)))
                    .collect();
                parts.join(" ")
            }
            _ => panic!("unknown request {kind}"),
        };
        writeln!(out, "{text}").expect("write");
    }
}
"""


class Probe:
    """src/model.rs and src/weights.rs, copied verbatim into a scratch crate and built with cargo +1.81.0."""

    def __init__(self, work):
        crate = pathlib.Path(work) / "l2-probe"
        (crate / "src").mkdir(parents=True, exist_ok=True)
        manifest = '[package]\nname = "l2-probe"\nversion = "0.0.0"\nedition = "2021"\n\n[dependencies]\n\n[workspace]\n'
        (crate / "Cargo.toml").write_text(manifest, encoding="utf-8")
        (crate / "src" / "main.rs").write_text(PROBE_MAIN, encoding="utf-8")
        (crate / "src" / "weights.rs").write_bytes((ROOT / "src" / "weights.rs").read_bytes())
        (crate / "src" / "model.rs").write_bytes((ROOT / "src" / "model.rs").read_bytes() + PROBE_APPEND.encode())
        target = pathlib.Path(work) / "l2-probe-target"
        subprocess.run(
            ["cargo", "+1.81.0", "build", "--release", "--quiet", "--manifest-path", str(crate / "Cargo.toml"),
             "--target-dir", str(target)],
            check=True,
        )
        self.binary = target / "release" / "l2-probe"

    def ask(self, requests):
        text = "\n".join(requests) + "\n"
        result = subprocess.run([str(self.binary)], input=text, capture_output=True, text=True, check=True)
        return result.stdout.splitlines()

    def sigmoid(self, logits):
        return [int(v) for v in self.ask([f"S {v}" for v in logits])]

    def normalize(self, vectors):
        return [[int(c) for c in line.split(",")] for line in self.ask([f"N {','.join(map(str, v))}" for v in vectors])]

    def graphs(self, graphs):
        requests = []
        for x, edges in graphs:
            requests.append("G " + ";".join(",".join(map(str, row)) for row in x) + "|"
                            + ",".join(f"{s}>{t}" for s, t in edges))
        result = []
        for line in self.ask(requests):
            outputs = []
            for part in line.split(" "):
                anomaly, projection = part.split(":")
                outputs.append((int(anomaly), [int(c) for c in projection.split(",")]))
            result.append(outputs)
        return result


def work_dir(args):
    if "--work" in args:
        return args[args.index("--work") + 1]
    return tempfile.mkdtemp(prefix="l2-measure-")


def max_difference(left, right):
    """Largest |a - b| of probs[:, 1] and of the projection components, over edges given as (anomaly, projection)."""
    anomaly = max((abs(a[0] - b[0]) for a, b in zip(left, right)), default=0)
    projection = max((abs(p - q) for a, b in zip(left, right) for p, q in zip(a[1], b[1])), default=0)
    return anomaly, projection


COMPARISONS = (
    ("rust_vs_torch", "rust", "torch"),
    ("rust_vs_exact", "rust", "exact"),
    ("torch_vs_exact_at_torch_input", "torch", "exact_torch_input"),
    ("q24_weights_exact_vs_exact", "q24_weights", "exact"),
    ("rust_vs_q24_weights_exact", "rust", "q24_weights"),
    ("exact_at_torch_input_vs_exact", "exact_torch_input", "exact"),
)


def comparison_row(label, outputs):
    """outputs: name -> list of (anomaly, projection) over the same edges."""
    parts = [f"COMPARE|set={label}|edges={len(outputs['rust'])}"]
    for name, left, right in COMPARISONS:
        if left in outputs and right in outputs:
            anomaly, projection = max_difference(outputs[left], outputs[right])
            parts.append(f"{name}={anomaly}/{projection}")
    print("|".join(parts))


def exact():
    work = work_dir(sys.argv[2:])
    parity = model_parity()
    probe = Probe(work)
    reference, rounded_weights = float32_forward(), q24_forward()
    groups, inexact_values = {}, 0
    graphs = fixture_graphs()
    rust = probe.graphs([(x, edges) for _, x, edges, _, _, _ in graphs])
    for (case, x, edges, _, p_q24, projections), rust_out in zip(graphs, rust):
        torch_units = [[QUANTIZE.float32_units(parity.float32_bits_of_q24(q)) for q in row] for row in x]
        rust_units = [[q << (FLOAT32_UNIT_BITS - FRAC_BITS) for q in row] for row in x]
        inexact = sum(a != b for ra, rb in zip(torch_units, rust_units) for a, b in zip(ra, rb))
        inexact_values += inexact
        exact_out = reference.graph(x, FRAC_BITS, edges)
        outputs = {
            "rust": rust_out,
            "torch": list(zip(p_q24, projections)),
            "exact": exact_out,
            "exact_torch_input": reference.graph(torch_units, FLOAT32_UNIT_BITS, edges) if inexact else exact_out,
            "q24_weights": rounded_weights.graph(x, FRAC_BITS, edges),
        }
        for group in (group_of(case), "layout" if group_of(case) in LAYOUT_GROUPS else "mag"):
            entry = groups.setdefault(group, {})
            for name, values in outputs.items():
                entry.setdefault(name, []).extend(values)
    print(f"INPUTS|fixture_input_values_not_float32_exact={inexact_values}")
    for group in ("layout", *LAYOUT_GROUPS, *(f"mag{k}" for k in parity.MAGNITUDE_BITS)):
        comparison_row(f"fixture-{group}", groups[group])

    for seed in SWEEP_SEEDS:
        rng = parity.Lcg(seed)
        for bits in SWEEP_BITS:
            graphs = [parity.magnitude_graph(rng, bits) for _ in range(SWEEP_GRAPHS)]
            rust = probe.graphs(graphs)
            outputs = {"rust": [], "torch": [], "exact": [], "q24_weights": []}
            for (x, edges), rust_out in zip(graphs, rust):
                for row in x:
                    for q in row:
                        units = QUANTIZE.float32_units(parity.float32_bits_of_q24(q))
                        if units != q << (FLOAT32_UNIT_BITS - FRAC_BITS):
                            raise SystemExit(f"MEASURE|refused=sweep_input|q24={q}")
                p_bits, projection_bits = torch_outputs(parity, parity.MODEL, x, edges)
                outputs["rust"] += rust_out
                outputs["torch"] += [
                    (QUANTIZE.q24_of_float32_bits(p), [QUANTIZE.q24_of_float32_bits(v) for v in row])
                    for p, row in zip(p_bits, projection_bits)
                ]
                outputs["exact"] += reference.graph(x, FRAC_BITS, edges)
                outputs["q24_weights"] += rounded_weights.graph(x, FRAC_BITS, edges)
            # Every sweep input is float32-exact (checked above), so torch's input is Rust's.
            outputs["exact_torch_input"] = outputs["exact"]
            comparison_row(f"sweep-seed{seed}-bits{bits}-graphs{SWEEP_GRAPHS}", outputs)


# ---- ties ----


def ln_q48_guess(numerator, denominator):
    """About 2^48 * ln(n / d), integers n, d > 0, from ln(a / b) = 2 atanh((a - b) / (a + b)) at 2^-100. A starting
    point only: sigmoid_boundary then finds the boundary with the exact reference."""
    bits = 100
    m = numerator.bit_length() - denominator.bit_length()
    a, b = (numerator, denominator << m) if m >= 0 else (numerator << -m, denominator)
    z = ((abs(a - b)) << bits) // (a + b)
    z2 = (z * z) >> bits
    term, total, j = z, 0, 0
    while term:
        total += term // (2 * j + 1)
        term = (term * z2) >> bits
        j += 1
    ln2 = sum((1 << bits) // (k << k) for k in range(1, bits + 8))
    series = 2 * total if a >= b else -2 * total
    return (m * ln2 + series) >> (bits - 48)


def sigmoid_boundary(k):
    """The smallest Q48 logit L with exact_sigmoid_q24(L) >= k + 1; the exact half-unit point lies in (L - 1, L]."""
    target = k + 1
    guess = ln_q48_guess(2 * k + 1, (1 << 25) - 2 * k - 1)
    step = 1
    if MATH.exact_sigmoid_q24(guess) >= target:
        lo, hi = guess - step, guess
        while MATH.exact_sigmoid_q24(lo) >= target:
            step *= 2
            lo, hi = lo - step, lo
    else:
        lo, hi = guess, guess + step
        while MATH.exact_sigmoid_q24(hi) < target:
            step *= 2
            lo, hi = hi, hi + step
    while hi - lo > 1:
        middle = (lo + hi) // 2
        if MATH.exact_sigmoid_q24(middle) >= target:
            hi = middle
        else:
            lo = middle
    return hi


def sigmoid_bounds(logit, precision):
    """Integers (lo, hi) with lo <= 2^precision * 2^24 / (1 + e^-t) <= hi, t = logit / 2^48."""
    lo, hi = MATH.exp_bounds(abs(logit), MATH.LOGIT_BITS, precision)
    one = 1 << precision
    e_lo, e_hi = (one * one) // hi, -(-(one * one) // lo)
    top = one << (FRAC_BITS + precision)
    if logit >= 0:
        return top // (one + e_hi), -(-top // (one + e_lo))
    return (e_lo << (FRAC_BITS + precision)) // (one + e_lo), -(-(e_hi << (FRAC_BITS + precision)) // (one + e_hi))


def tie_vector(rng):
    """A Q48 vector of exact norm 2^25 * s: its odd components c give 2^24 * c / 2^25 = c / 2, half-unit ties."""
    odd = 2 * rng.below(1 << 24) + 1
    rest = (1 << 50) - odd * odd
    components = [odd]
    while rest:
        root = math.isqrt(rest)
        components.append(root)
        rest -= root * root
    scale = 1 + rng.below(1 << rng.below(91))
    v = [0] * PROJECTION
    positions = list(range(PROJECTION))
    for i in range(PROJECTION - 1, 0, -1):
        j = rng.below(i + 1)
        positions[i], positions[j] = positions[j], positions[i]
    for position, c in zip(positions, components):
        v[position] = -c * scale if rng.below(2) else c * scale
    return v


def ties():
    work = work_dir(sys.argv[2:])
    probe = Probe(work)
    one = 1 << MATH.LOGIT_BITS
    if MATH.exact_sigmoid_q24(18 * one) != ONE_Q24 or MATH.exact_sigmoid_q24(-18 * one) != 0:
        raise SystemExit("MEASURE|refused=saturation")
    rng = MATH.Lcg(SIGMOID_RANDOM_SEED)
    logits = [rng.below(40 * one) - 20 * one for _ in range(20000)]
    got, want = probe.sigmoid(logits), [MATH.exact_sigmoid_q24(v) for v in logits]
    print(f"SIGMOID_RANDOM|seed={SIGMOID_RANDOM_SEED}|logits={len(logits)}|equal={sum(map(int.__eq__, got, want))}")

    rng = MATH.Lcg(SIGMOID_TIE_SEED)
    points = [rng.below(1 << 24) for _ in range(SIGMOID_TIE_POINTS)]
    near = []
    for k in points:
        boundary = sigmoid_boundary(k)
        near += [(boundary + d, k) for d in (-2, -1, 0, 1)]
    got = probe.sigmoid([v for v, _ in near])
    want = [MATH.exact_sigmoid_q24(v) for v, _ in near]
    differ = [(v, k, g - w) for (v, k), g, w in zip(near, got, want) if g != w]
    precision, farthest = 512, 0
    for v, k, _ in differ:
        lo, hi = sigmoid_bounds(v, precision)
        half = (2 * k + 1) << (precision - 1)
        farthest = max(farthest, abs(lo - half), abs(hi - half))
    print(
        f"SIGMOID_NEAR_TIE|seed={SIGMOID_TIE_SEED:#x}|tie_points={len(points)}|logits={len(near)}"
        f"|differ={len(differ)}|max_abs_diff={max((abs(d) for _, _, d in differ), default=0)}"
        f"|differing_exact_values_within_2^-{precision - farthest.bit_length()}_units_of_the_half_unit_point"
    )

    rng = MATH.Lcg(NORMALIZE_TIE_SEED)
    vectors = [tie_vector(rng) for _ in range(NORMALIZE_TIE_VECTORS)]
    got = probe.normalize(vectors)
    tally = {}
    for v, g in zip(vectors, got):
        w = MATH.exact_normalize_q24(v)
        norm = math.isqrt(sum(c * c for c in v))
        # 2^24 * c / norm is a half-unit tie exactly when 2^25 * c / norm is an odd integer.
        tie = [(c << 25) % norm == 0 and ((c << 25) // norm) % 2 == 1 for c in v]
        key = "largest_at_least_2^51" if max(abs(c) for c in v) >= 1 << 51 else "largest_below_2^51"
        entry = tally.setdefault(key, {"vectors": 0, "differ": 0, "ties": 0, "tie_components_differ": 0,
                                       "other_components_differ": 0, "max_abs_diff": 0})
        entry["vectors"] += 1
        entry["differ"] += g != w
        entry["ties"] += sum(tie)
        entry["tie_components_differ"] += sum(a != b and t for a, b, t in zip(g, w, tie))
        entry["other_components_differ"] += sum(a != b and not t for a, b, t in zip(g, w, tie))
        entry["max_abs_diff"] = max([entry["max_abs_diff"]] + [abs(a - b) for a, b in zip(g, w)])
    for key, entry in tally.items():
        counts = "|".join(f"{name}={value}" for name, value in entry.items())
        print(f"NORMALIZE_TIE|seed={NORMALIZE_TIE_SEED:#x}|class={key}|{counts}")


COMMANDS = {"outputs": outputs, "weights": weights, "run2": run2, "exact": exact, "ties": ties}


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(f"usage: measurements.py {'|'.join(COMMANDS)} [--work DIR]", file=sys.stderr)
        return 2
    COMMANDS[sys.argv[1]]()
    return 0


if __name__ == "__main__":
    sys.exit(main())
