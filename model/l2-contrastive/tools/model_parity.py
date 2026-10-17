#!/usr/bin/env python3
"""Torch parity harness for src/model.rs: runs the vendored ContrastiveGNN with its run-1 checkpoint.

The checkpoint's keys (conv1.lin.weight, conv1.lin.bias, ...) and the module paths in its _metadata (conv1,
conv1.lin, no aggr_module) are those of ContrastiveGNN built with the fallback GCNConv of
contrastive_gnn.py:17-23. This harness records that layout in a LAYOUT row: it first imports the vendored file
with torch_geometric present and loads the checkpoint non-strictly, to list the keys torch_geometric's GCNConv
expects; then it makes torch_geometric unimportable (None in sys.modules), so the vendored file's
`except ImportError` branch defines GCNConv, imports it again, and builds MODEL = ContrastiveGNN(6, 64) with the
checkpoint loaded strictly and eval() called. Cases are fixed-seed graphs; every edge's probs[:, 1] (float32
bits and Q24) and return_projections=True projections (Q24) are written. The mag<K>-<i> graphs hold
float32-exact features of both signs up to 2^K, for K in MAGNITUDE_BITS.
Writes tests/fixtures/expected-model.hbp; --check regenerates it in memory and diffs.
Run: <torch venv>/bin/python -I tools/model_parity.py [--check]
"""
import hashlib
import importlib.util
import math
import os
import pathlib
import struct
import sys
from fractions import Fraction

ROOT = pathlib.Path(__file__).resolve().parent.parent
MODEL_FILE = ROOT / "vendor" / "gnn-sidecar" / "models" / "contrastive_gnn.py"
CHECKPOINT = ROOT / "vendor" / "fnns" / "models" / "contrastive_model.pt"
CHECKPOINT_SHA256 = "d371dbbf97ecee87846a87a1a57492e3c03d97168a9b5f5cfcc1fee411488eef"
EXPECTED = ROOT / "tests" / "fixtures" / "expected-model.hbp"
FRAC_BITS = 24
RANDOM_GRAPHS = 100
MAGNITUDE_BITS = (4, 8, 12, 16, 20)
MAGNITUDE_GRAPHS = 40

# Set before torch loads, as model/l0-edge/tools/model_parity.py does: ATen's scalar kernels, oneMKL's SSE2-only
# CNR code path, one thread.
KERNEL_ENV = {"ATEN_CPU_CAPABILITY": "default", "MKL_CBWR": "COMPATIBLE", "OMP_NUM_THREADS": "1", "MKL_NUM_THREADS": "1"}
os.environ.update(KERNEL_ENV)
sys.dont_write_bytecode = True  # no __pycache__ beside the vendored sources or tools/
import torch  # noqa: E402
import torch_geometric  # noqa: E402


def import_vendored(name):
    spec = importlib.util.spec_from_file_location(name, MODEL_FILE)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def load_checkpoint():
    blob = CHECKPOINT.read_bytes()
    digest = hashlib.sha256(blob).hexdigest()
    if digest != CHECKPOINT_SHA256:
        raise SystemExit(f"MODEL_PARITY|refused=sha256|got={digest}")
    return torch.load(CHECKPOINT, map_location="cpu", weights_only=True)


def torch_geometric_layout():
    with_pyg = import_vendored("contrastive_gnn_with_torch_geometric")
    model = with_pyg.ContrastiveGNN(6, 64)
    result = model.load_state_dict(load_checkpoint(), strict=False)
    return (
        type(model.conv1).__module__,
        ",".join(sorted(result.missing_keys)),
        ",".join(sorted(result.unexpected_keys)),
    )


PYG_CONV_MODULE, PYG_MISSING, PYG_UNEXPECTED = torch_geometric_layout()
TORCH_GEOMETRIC_VERSION = torch_geometric.__version__
for loaded in [name for name in sys.modules if name == "torch_geometric" or name.startswith("torch_geometric.")]:
    sys.modules[loaded] = None
contrastive_gnn = import_vendored("contrastive_gnn")
STATE = load_checkpoint()
MODEL = contrastive_gnn.ContrastiveGNN(6, 64)
MODEL.load_state_dict(STATE)
MODEL.eval()


class Lcg:
    # The generator of model/l0-edge/tools/jsnum_referee.py.
    def __init__(self, seed):
        self.state = seed

    def below(self, bound):
        self.state = (self.state * 6364136223846793005 + 1442695040888963407) % (1 << 64)
        return (self.state >> 11) % bound


def q24_ratio(num, den):
    return ((num << (FRAC_BITS + 1)) + den) // (2 * den)


def random_node(rng, risk_limit):
    # The 6-feature layout of train_baseline.py:31-38 and train_gslgnn_w9_3.py:224-231
    # [min(edgeVolume/100, 1), avgRisk/9, maxRisk/9, failureRate, online, trustTier/3], in Q24.
    max_risk = rng.below(risk_limit + 1)
    return [
        q24_ratio(min(1 + rng.below(150), 100), 100),
        q24_ratio(rng.below(max_risk * 100 + 1), 900),
        q24_ratio(max_risk, 9),
        q24_ratio(rng.below(1001), 1000),
        q24_ratio(rng.below(2), 1),
        q24_ratio(1 + rng.below(3), 3),
    ]


def random_edges(rng, node_count):
    edges = [[rng.below(node_count), rng.below(node_count)] for _ in range(1 + rng.below(3))]
    if rng.below(2):
        edges.append(list(edges[rng.below(len(edges))]))
    return edges


def random_graph(rng, case):
    node_count = 2 + rng.below(6)
    if case % 5 == 4:
        x_q24 = [[rng.below(1 << 27) - (1 << 26) for _ in range(6)] for _ in range(node_count)]
    else:
        risk_limit = (21, 21, 100, 1_000_000)[case % 5]
        x_q24 = [random_node(rng, risk_limit) for _ in range(node_count)]
    return x_q24, random_edges(rng, node_count)


def magnitude_graph(rng, bits):
    # Every feature is m * 2^(bits - 24) with |m| <= 2^24: |feature| <= 2^bits, held exactly by the float32 tensor.
    node_count = 2 + rng.below(6)
    x_q24 = [[(rng.below((1 << 25) + 1) - (1 << 24)) << bits for _ in range(6)] for _ in range(node_count)]
    return x_q24, random_edges(rng, node_count)


def fixed_graphs():
    one = 1 << FRAC_BITS
    return [
        ("zeros", [[0] * 6, [0] * 6], [[0, 1], [1, 1]]),
        ("ones", [[one] * 6, [one] * 6, [0] * 6], [[0, 1], [2, 0], [1, 2]]),
        ("offline", [[one, 0, 0, 0, 0, one // 3], [one // 2, one, one, one, 0, one]], [[0, 1], [1, 0]]),
        ("high-risk", [[one, one * 2, one * 3, one, one, one], [one, 0, 0, 0, one, one // 3]], [[0, 1], [1, 0]]),
    ]


def float32_bits(value):
    return struct.unpack("<I", struct.pack("<f", value))[0]


def q24_of(value):
    return math.floor(Fraction(value) * (1 << FRAC_BITS) + Fraction(1, 2))


def graph_rows(name, x_q24, edges):
    nodes = [[q / (1 << FRAC_BITS) for q in row] for row in x_q24]
    x = torch.tensor(nodes, dtype=torch.float32)
    edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
    with torch.no_grad():
        probs = MODEL(x, edge_index)
        probs_again, projections = MODEL(x, edge_index, return_projections=True)
    if not torch.equal(probs, probs_again):
        raise SystemExit(f"MODEL_PARITY|refused=nondeterministic|case={name}")
    probs = [float(v) for v in probs.reshape(-1).tolist()]
    projections = projections.tolist()
    x_field = ";".join(",".join(str(q) for q in row) for row in x_q24)
    edge_field = ",".join(f"{s}>{t}" for s, t in edges)
    bits = ",".join(f"{float32_bits(v):08x}" for v in probs)
    q24 = ",".join(str(q24_of(v)) for v in probs)
    rows = [f"GRAPH|case={name}|x={x_field}|edges={edge_field}|p_bits={bits}|p_q24={q24}"]
    for index, projection in enumerate(projections):
        rows.append(f"PROJ|case={name}|edge={index}|q24={','.join(str(q24_of(float(v))) for v in projection)}")
    return rows, len(probs)


def render():
    if not (type(MODEL.conv1).__module__ == "contrastive_gnn" and type(MODEL.conv2).__module__ == "contrastive_gnn"):
        raise SystemExit("MODEL_PARITY|refused=model|reason=conv1/conv2 are not the fallback GCNConv")
    if MODEL.training:
        raise SystemExit("MODEL_PARITY|refused=model|reason=MODEL is in training mode")
    model_modules = list(MODEL.state_dict()._metadata.keys())
    checkpoint_modules = list(STATE._metadata.keys())
    if model_modules != checkpoint_modules or list(MODEL.state_dict().keys()) != list(STATE.keys()):
        raise SystemExit("MODEL_PARITY|refused=layout|reason=fallback class layout differs from the checkpoint")
    rows = [
        f"LAYOUT|fallback_conv={type(MODEL.conv1).__module__}.GCNConv|checkpoint_keys={len(STATE)}"
        f"|checkpoint_modules={len(checkpoint_modules)}|fallback_modules_equal=1"
        f"|torch_geometric_conv={PYG_CONV_MODULE}.GCNConv|torch_geometric_missing={PYG_MISSING}"
        f"|torch_geometric_unexpected={PYG_UNEXPECTED}"
    ]
    edges_total = 0
    graphs = fixed_graphs()
    rng = Lcg(0x5DEECE66D)
    graphs += [(str(case), *random_graph(rng, case)) for case in range(RANDOM_GRAPHS)]
    rng = Lcg(0x2545F4914F6CDD1D)
    graphs += [
        (f"mag{bits}-{index}", *magnitude_graph(rng, bits))
        for bits in MAGNITUDE_BITS
        for index in range(MAGNITUDE_GRAPHS)
    ]
    for name, x_q24, edges in graphs:
        graph, count = graph_rows(name, x_q24, edges)
        rows += graph
        edges_total += count
    header = (
        "# expected ContrastiveGNN outputs from tools/model_parity.py: the vendored contrastive_gnn.py with the "
        f"fallback GCNConv, contrastive_model.pt run 1, torch {torch.__version__}, layout checked against "
        f"torch_geometric {TORCH_GEOMETRIC_VERSION}, kernels "
        f"{','.join(f'{k}={v}' for k, v in KERNEL_ENV.items())}; do not edit\n"
        "# x = Q24 inputs, sent as the doubles q / 2^24 (float32 in the tensor); p_bits = float32 probs[:, 1] (hex); "
        "p_q24 and PROJ q24 = floor(value * 2^24 + 1/2)\n"
    )
    summary = f"graphs={len(graphs)}|edges={edges_total}|projections={edges_total * 64}"
    return header + "\n".join(rows) + "\n", summary


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
            print(f"MODEL_PARITY|check=FAIL|first_diff_line={first + 1}")
            return 1
        print(f"MODEL_PARITY|check=PASS|{summary}")
        return 0
    EXPECTED.write_bytes(text.encode("utf-8"))
    print(f"MODEL_PARITY|written={EXPECTED.name}|{summary}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
