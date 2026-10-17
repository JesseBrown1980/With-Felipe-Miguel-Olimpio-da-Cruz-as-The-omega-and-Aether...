#!/usr/bin/env python3
"""Torch parity harness for src/model.rs and src/lib.rs: the vendored :4793 server module's own MODEL.

Staging (cold lane only): at c4b2458 gslgnn_inference_server.py sits in src/ beside gsl_gnn.py, but its line 16
imports `models.gsl_gnn` and its line 18 loads the checkpoint from its own directory, and neither path exists
there. Its manifest names the layout it ran in (checkpoint_path ...\\services\\gnn-sidecar\\gslgnn_w9_3_seq47_v2.pt,
model_class services/gnn-sidecar/models/gsl_gnn.py). This harness copies the vendored server, models/__init__.py,
models/gsl_gnn.py and the v2 checkpoint into one temporary directory in that layout and imports the server
there, so its lines 13-36 run unchanged: model build, key remap, strict load_state_dict, eval(). It asserts that
torch_geometric imported (all four convs are torch_geometric's GCNConv, gsl_gnn.py:17-19) and that the key remap
renamed nothing. The HTTP handler is not run: for each graph, lines 51-54 are mirrored (float32 nodes,
long edges transposed, MODEL under no_grad, scores[0] for requests); the server reads only `nodes` and `edges`
(line 46), so no edge features are sent.

Rows: GRAPH (fixed and seeded graphs: Q24 inputs exactly representable in float32, torch's attention mask
from gsl_gnn.py:66-77 mirrored on MODEL.gsl, and probs[:, 1] per edge), REQUEST (asolaria-score.mjs:112-113 and
127-128 mirrored: nodes [node(sha16(pid)), node(sha16(content))] as doubles byte / 255, edge [[0, 1]],
scores[0] and +toFixed(4)), and BOUNDARY (inputs on both sides of the float32 attention threshold for one
entry, found by bisection, with torch's mask and probs[:, 1]).
Writes tests/fixtures/expected-model.hbp; --check regenerates it in memory and diffs.
--seed N --out FILE writes the same rows from another seed to FILE (for examples/parity.rs).
Run: <torch venv>/bin/python -I tools/model_parity.py [--check | --seed N --out FILE]
"""
import hashlib
import importlib.util
import math
import os
import pathlib
import shutil
import struct
import sys
import tempfile
from fractions import Fraction

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXPECTED = ROOT / "tests" / "fixtures" / "expected-model.hbp"
SHA_FILE = ROOT / "UPSTREAM.sha256"
SERVER = ROOT / "vendor" / "fnns" / "src" / "gslgnn_inference_server.py"
MODELS_INIT = ROOT / "vendor" / "gnn-sidecar" / "models" / "__init__.py"
MODELS_GSL = ROOT / "vendor" / "gnn-sidecar" / "models" / "gsl_gnn.py"
CHECKPOINT = ROOT / "vendor" / "fnns" / "models" / "gslgnn_w9_3_seq47_v2.pt"
FRAC_BITS = 24
DEFAULT_SEED = 0x5DEECE66D
RANDOM_GRAPHS = 120
REQUESTS = 64
BOUNDARY_SEARCHES = 24
BOUNDARY_HALF_WIDTH = 8
PYG_CONV = "torch_geometric.nn.conv.gcn_conv"

sys.dont_write_bytecode = True  # no __pycache__ beside the staged or vendored sources
# The float32 rounding of torch's matmuls depends on the CPU kernels, and with it where the mask crosses in
# BOUNDARY rows; pinned here, the file reproduces on any x86-64 host with AVX2.
CPU_KERNELS = {"ATEN_CPU_CAPABILITY": "avx2", "MKL_ENABLE_INSTRUCTIONS": "AVX2"}
os.environ.update(CPU_KERNELS)
import torch  # noqa: E402
import torch_geometric  # noqa: E402


def pinned_sha256():
    pins = {}
    for line in SHA_FILE.read_text(encoding="utf-8").splitlines():
        digest, path = line.split(None, 1)
        pins[ROOT / path.strip()] = digest
    return pins


def stage(directory):
    pins = pinned_sha256()
    for source in (SERVER, MODELS_INIT, MODELS_GSL, CHECKPOINT):
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        if pins.get(source) != digest:
            raise SystemExit(f"MODEL_PARITY|refused=sha256|file={source.relative_to(ROOT)}|got={digest}")
    (directory / "models").mkdir()
    shutil.copyfile(SERVER, directory / SERVER.name)
    shutil.copyfile(MODELS_INIT, directory / "models" / "__init__.py")
    shutil.copyfile(MODELS_GSL, directory / "models" / "gsl_gnn.py")
    shutil.copyfile(CHECKPOINT, directory / CHECKPOINT.name)


def import_server(directory):
    spec = importlib.util.spec_from_file_location("gslgnn_inference_server", directory / SERVER.name)
    server = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(server)
    gsl_module = sys.modules.get("models.gsl_gnn")
    if gsl_module is None or pathlib.Path(gsl_module.__file__).parent.parent != directory:
        raise SystemExit("MODEL_PARITY|refused=import|reason=models.gsl_gnn is not the staged copy")
    model = server.MODEL
    convs = [model.conv1, model.conv2, model.conv1_orig, model.conv2_orig]
    if any(type(conv).__module__ != PYG_CONV for conv in convs):
        raise SystemExit("MODEL_PARITY|refused=model|reason=torch_geometric did not import; fallback GCNConv")
    if model.training:
        raise SystemExit("MODEL_PARITY|refused=model|reason=MODEL is in training mode")
    renamed = [k for k in server.state_dict if k not in server.fixed]
    if renamed or list(server.fixed) != list(model.state_dict()):
        raise SystemExit("MODEL_PARITY|refused=layout|reason=key remap renamed keys")
    return server


class Lcg:
    # The generator of model/l0-edge/tools/jsnum_referee.py.
    def __init__(self, seed):
        self.state = seed

    def below(self, bound):
        self.state = (self.state * 6364136223846793005 + 1442695040888963407) % (1 << 64)
        return (self.state >> 11) % bound


def float32(value):
    return struct.unpack("<f", struct.pack("<f", value))[0]


def float32_bits(value):
    return struct.unpack("<I", struct.pack("<f", value))[0]


def from_bits(bits):
    return struct.unpack("<f", struct.pack("<I", bits))[0]


def q24_of(value):
    return math.floor(Fraction(value) * (1 << FRAC_BITS) + Fraction(1, 2))


def snap(q24):
    # The Q24 value of float32(q24 / 2^24): an input torch and this crate both hold exactly.
    exact = Fraction(float32(q24 / (1 << FRAC_BITS))) * (1 << FRAC_BITS)
    if exact.denominator != 1:
        raise SystemExit(f"MODEL_PARITY|refused=snap|q24={q24}")
    return int(exact)


def q24_ratio(num, den):
    return ((num << (FRAC_BITS + 1)) + den) // (2 * den)


def random_node(rng, kind):
    if kind == 0:
        # Request domain: byte / 255 per feature, as Q24 integers (each exactly a float32).
        return [q24_ratio(rng.below(256), 255) for _ in range(6)]
    if kind == 1:
        # The 6-feature layout of train_gslgnn_w9_3.py:224-231 with risk up to 21.
        max_risk = rng.below(22)
        return [
            q24_ratio(min(1 + rng.below(150), 100), 100),
            q24_ratio(rng.below(max_risk * 100 + 1), 900),
            q24_ratio(max_risk, 9),
            q24_ratio(rng.below(1001), 1000),
            q24_ratio(rng.below(2), 1),
            q24_ratio(1 + rng.below(3), 3),
        ]
    bits = 26 if kind == 2 else 29
    return [snap(rng.below(1 << (bits + 1)) - (1 << bits)) for _ in range(6)]


def random_graph(rng, case):
    node_count = 2 + rng.below(8)
    x_q24 = [random_node(rng, case % 4) for _ in range(node_count)]
    edges = [[rng.below(node_count), rng.below(node_count)] for _ in range(1 + rng.below(4))]
    if rng.below(2):
        edges.append(list(edges[rng.below(len(edges))]))
    return x_q24, edges


def fixed_graphs():
    one = 1 << FRAC_BITS
    return [
        ("zeros", [[0] * 6, [0] * 6], [[0, 1]]),
        ("ones", [[one] * 6, [one] * 6, [0] * 6], [[0, 1], [2, 0], [1, 2]]),
        ("loops-and-duplicates", [[one // 2] * 6, [one // 4] * 6, [one] * 6], [[0, 0], [0, 1], [0, 1], [1, 0], [2, 2]]),
        ("isolated-node", [[one, 0, 0, 0, one, one // 3], [0, one, one, one, 0, one], [one] * 6], [[0, 1]]),
        ("wide", [[(4 << FRAC_BITS) * (1 if i % 2 else -1)] * 6 for i in range(4)], [[0, 1], [1, 2], [2, 3], [3, 0]]),
    ]


def attention_mask(model, x):
    # gsl_gnn.py:66-77, mirrored on the served module's own layers.
    gsl = model.gsl
    with torch.no_grad():
        keys = gsl.key_transform(x)
        queries = gsl.query_transform(x)
        attention = torch.matmul(queries, keys.T) / (keys.shape[1] ** 0.5)
        attention = torch.sigmoid(attention)
        mask = attention > torch.sigmoid(gsl.threshold)
    return "".join("1" if v else "0" for v in mask.reshape(-1).tolist())


def forward(model, nodes, edges):
    # gslgnn_inference_server.py:51-54.
    x = torch.tensor(nodes, dtype=torch.float32)
    edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
    with torch.no_grad():
        scores = model(x, edge_index).reshape(-1).tolist()
        again = model(x, edge_index).reshape(-1).tolist()
    if scores != again:
        raise SystemExit("MODEL_PARITY|refused=nondeterministic")
    return x, [float(v) for v in scores]


def x_field(x_q24):
    return ";".join(",".join(str(q) for q in row) for row in x_q24)


def score_fields(scores):
    bits = ",".join(f"{float32_bits(v):08x}" for v in scores)
    return f"p_bits={bits}|p_q24={','.join(str(q24_of(v)) for v in scores)}"


def graph_row(model, name, x_q24, edges, label="GRAPH"):
    nodes = [[q / (1 << FRAC_BITS) for q in row] for row in x_q24]
    x, scores = forward(model, nodes, edges)
    edge_field = ",".join(f"{s}>{t}" for s, t in edges)
    row = f"{label}|case={name}|x={x_field(x_q24)}|edges={edge_field}|mask={attention_mask(model, x)}"
    return f"{row}|{score_fields(scores)}", len(scores)


def sha16(text):
    return hashlib.sha256(str(text).encode("utf-8")).hexdigest()[:16]


def node(h):
    # asolaria-score.mjs:113.
    return [int(h[i * 2:i * 2 + 2], 16) / 255 for i in range(6)]


def to_fixed4_e4(value):
    # Number.prototype.toFixed(4) of a non-negative double: n with n / 10^4 - value closest to 0, larger n on a tie.
    return math.floor(Fraction(value) * 10000 + Fraction(1, 2))


def request_texts(rng):
    texts = [("", ""), ("BH.HOOKWALL.0000000000000000", "")]
    for i in range(REQUESTS - len(texts)):
        if i % 2:
            pid = "BH.HOOKWALL.%016X" % (rng.below(1 << 32) << 32 | rng.below(1 << 32))
        else:
            pid = "%016x" % (rng.below(1 << 32) << 32 | rng.below(1 << 32))
        chars = []
        for _ in range(1 + rng.below(120)):
            chars.append(chr(0xA0 + rng.below(0x2F00)) if rng.below(8) == 0 else chr(32 + rng.below(95)))
        texts.append((pid, "".join(chars)))
    return texts


def request_row(model, index, pid, content):
    # asolaria-score.mjs:112-113, 127: nodes [node(ph), node(ch)], edges [[0, 1]]; line 128 keeps scores[0].
    ph, ch = sha16(pid), sha16(content)
    nodes = [node(ph), node(ch)]
    x, scores = forward(model, nodes, [[0, 1]])
    score = scores[0]
    x_q24 = [[q24_of(float32(v)) for v in row] for row in nodes]
    return (
        f"REQUEST|case={index}|pid_hex={pid.encode('utf-8').hex()}|content_hex={content.encode('utf-8').hex()}"
        f"|x={x_field(x_q24)}|mask={attention_mask(model, x)}|{score_fields([score])}|e4={to_fixed4_e4(score)}"
    ), score


def entry_mask(model, x_q24, row, col):
    x = torch.tensor([[q / (1 << FRAC_BITS) for q in r] for r in x_q24], dtype=torch.float32)
    return attention_mask(model, x)[row * len(x_q24) + col] == "1"


def boundary_rows(model, rng):
    # Bisection over float32 values of one feature of node 1 in [0.5, 8], where every float32 is a Q24 value,
    # for the float32 crossing of torch's mask entry (0, 1); then the float32 values around it.
    rows, found = [], 0
    one = 1 << FRAC_BITS
    for search in range(BOUNDARY_SEARCHES):
        x_q24 = [[snap(rng.below(4 * one) - 2 * one) for _ in range(6)] for _ in range(2)]
        start = rng.below(12)
        for turn in range(12):
            feature, sign = (start + turn) % 6, 1 if (start + turn) // 6 % 2 == 0 else -1

            def at(bits, feature=feature, sign=sign):
                x = [list(r) for r in x_q24]
                x[1][feature] = sign * q24_of(from_bits(bits))
                return x

            low, high = float32_bits(0.5), float32_bits(8.0)
            if entry_mask(model, at(low), 0, 1) != entry_mask(model, at(high), 0, 1):
                break
        else:
            continue
        low_mask = entry_mask(model, at(low), 0, 1)
        while high - low > 1:
            middle = (low + high) // 2
            if entry_mask(model, at(middle), 0, 1) == low_mask:
                low = middle
            else:
                high = middle
        for bits in range(high - BOUNDARY_HALF_WIDTH, high + BOUNDARY_HALF_WIDTH):
            row, _ = graph_row(model, f"{search}:{bits - high:+d}", at(bits), [[0, 1]], label="BOUNDARY")
            rows.append(row)
        found += 1
    return rows, found


def render(model, seed):
    rows = [
        f"LAYOUT|conv={PYG_CONV}.GCNConv|gsl_gnn=models.gsl_gnn|staged=1|checkpoint_keys={len(model.state_dict())}"
        f"|renamed_keys=0|threshold_bits={float32_bits(float(model.gsl.threshold.detach())):08x}"
        f"|sigmoid_threshold_bits={float32_bits(float(torch.sigmoid(model.gsl.threshold.detach()))):08x}"
    ]
    edges_total = 0
    graphs = fixed_graphs() if seed == DEFAULT_SEED else []
    rng = Lcg(seed)
    graphs += [(str(case), *random_graph(rng, case)) for case in range(RANDOM_GRAPHS)]
    for name, x_q24, edges in graphs:
        row, count = graph_row(model, name, x_q24, edges)
        rows.append(row)
        edges_total += count
    scores = []
    for index, (pid, content) in enumerate(request_texts(rng)):
        row, score = request_row(model, index, pid, content)
        rows.append(row)
        scores.append(score)
    boundary, found = boundary_rows(model, rng)
    rows += boundary
    header = (
        "# expected GSLGNN outputs from tools/model_parity.py: the vendored gslgnn_inference_server.py MODEL "
        f"(gslgnn_w9_3_seq47_v2.pt), torch {torch.__version__}, torch_geometric {torch_geometric.__version__}, "
        f"seed {seed:#x}, {' '.join(f'{k}={v}' for k, v in CPU_KERNELS.items())}, 1 thread; do not edit\n"
        "# x = Q24 inputs; GRAPH/BOUNDARY send them as float32 q / 2^24 (exact); REQUEST sends the doubles "
        "byte / 255 and x is floor(float32 * 2^24 + 1/2)\n"
        "# mask = attention > sigmoid(threshold), row-major; p_bits = float32 probs[:, 1] (hex); "
        "p_q24 = floor(p * 2^24 + 1/2); e4 = toFixed(4) of scores[0]\n"
    )
    summary = (
        f"graphs={len(graphs)}|edges={edges_total}|requests={len(scores)}"
        f"|request_min={min(scores):.6f}|request_max={max(scores):.6f}"
        f"|request_e4={','.join(sorted({str(to_fixed4_e4(s)) for s in scores}))}"
        f"|boundary_searches={found}|boundary_rows={len(boundary)}"
    )
    return header + "\n".join(rows) + "\n", summary


def main():
    args = sys.argv[1:]
    seed, out = DEFAULT_SEED, EXPECTED
    if len(args) == 4 and args[0] == "--seed" and args[2] == "--out":
        seed, out = int(args[1], 0), pathlib.Path(args[3])
    elif args not in ([], ["--check"]):
        print("usage: model_parity.py [--check | --seed N --out FILE]", file=sys.stderr)
        return 2
    torch.set_num_threads(1)
    with tempfile.TemporaryDirectory() as directory:
        staged = pathlib.Path(directory).resolve()
        stage(staged)
        server = import_server(staged)
        text, summary = render(server.MODEL, seed)
    if args == ["--check"]:
        committed = EXPECTED.read_bytes().decode("utf-8")
        if committed != text:
            want, got = text.split("\n"), committed.split("\n")
            first = next((i for i, (w, g) in enumerate(zip(want, got)) if w != g), min(len(want), len(got)))
            print(f"MODEL_PARITY|check=FAIL|first_diff_line={first + 1}")
            return 1
        print(f"MODEL_PARITY|check=PASS|{summary}")
        return 0
    out.write_bytes(text.encode("utf-8"))
    print(f"MODEL_PARITY|written={out}|{summary}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
