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

Where float runs: only inside torch, on the owner's code and weights (the staged server's MODEL, its own
gsl module for the attention mask, gsl_gnn.py:63-77, called with no edges so it returns attention * mask,
key_transform and query_transform for the probe's attention scores, torch.sigmoid of the threshold for the
LAYOUT row, gsl_gnn.py:77) and in torch.rand for the probe's uniform inputs. This file computes in integers only:
each float32 input is built from a bit pattern rounded here (to binary64, then to float32, nearest with ties to
even: what torch.tensor(..., dtype=torch.float32) makes of a Python float), and every torch output is read back
by its float32 bit pattern.

Rows: GRAPH (fixed and seeded graphs: Q24 inputs, sent as the float32 of q / 2^24, which is q itself except where q
needs more than 24 significant bits; torch's attention mask and probs[:, 1] per edge), REQUEST
(asolaria-score.mjs:112-113 and 127-128 mirrored: nodes [node(sha16(pid)), node(sha16(content))] as the float32 of
the doubles byte / 255, edge [[0, 1]], scores[0] and +toFixed(4)), and BOUNDARY (inputs on both sides of the float32
attention threshold for one entry, found by bisection, with torch's mask and probs[:, 1]).
Writes tests/fixtures/expected-model.hbp; --check regenerates it in memory and diffs.
--seed N --out FILE writes the same rows from another seed to FILE (for examples/parity.rs).
--probe V1_CHECKPOINT prints, and writes nothing, the integer facts of the wiring map's probe inputs
(universe/tools/l4_probe.py: random.Random(4793) draws 500 pid/content pairs, then per checkpoint, v2 before v1,
500 torch.rand inputs of 2-11 nodes with edge [[0, 1]]). v2 is the staged server's MODEL. v1 (gslgnn_w9_3_seq47.pt,
pinned by sha256, not vendored, not served) is staged under the file name server line 18 reads, so the server's
own lines 21-36 load it.
Run: <torch venv>/bin/python -I tools/model_parity.py [--check | --seed N --out FILE | --probe V1_CHECKPOINT]
"""
import hashlib
import importlib.util
import os
import pathlib
import random
import shutil
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXPECTED = ROOT / "tests" / "fixtures" / "expected-model.hbp"
MATH = ROOT / "tests" / "fixtures" / "expected-math.hbp"
SHA_FILE = ROOT / "UPSTREAM.sha256"
SERVER = ROOT / "vendor" / "fnns" / "src" / "gslgnn_inference_server.py"
MODELS_INIT = ROOT / "vendor" / "gnn-sidecar" / "models" / "__init__.py"
MODELS_GSL = ROOT / "vendor" / "gnn-sidecar" / "models" / "gsl_gnn.py"
CHECKPOINT = ROOT / "vendor" / "fnns" / "models" / "gslgnn_w9_3_seq47_v2.pt"
V1_SHA256 = "6f82384ff2e313b1f34b48cca5c1c2bb3a8f9391bba54db7afbb36c5fda91ad5"
FRAC_BITS = 24
BINARY64_BITS = 53
FLOAT32_BITS = 24
FLOAT32_HALF = 0x3F000000  # 0.5
FLOAT32_EIGHT = 0x41000000  # 8.0
DEFAULT_SEED = 0x5DEECE66D
RANDOM_GRAPHS = 120
REQUESTS = 64
BOUNDARY_SEARCHES = 24
BOUNDARY_HALF_WIDTH = 8
PROBE_SEED = 4793
PROBE_INPUTS = 500
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


def stage(directory, checkpoint=CHECKPOINT, checkpoint_sha256=None):
    pins = pinned_sha256()
    for source in (SERVER, MODELS_INIT, MODELS_GSL, checkpoint):
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        want = checkpoint_sha256 if source == checkpoint and checkpoint_sha256 else pins.get(source)
        if want != digest:
            raise SystemExit(f"MODEL_PARITY|refused=sha256|file={source}|got={digest}")
    (directory / "models").mkdir()
    shutil.copyfile(SERVER, directory / SERVER.name)
    shutil.copyfile(MODELS_INIT, directory / "models" / "__init__.py")
    shutil.copyfile(MODELS_GSL, directory / "models" / "gsl_gnn.py")
    shutil.copyfile(checkpoint, directory / CHECKPOINT.name)


def import_server(directory):
    for name in ("models.gsl_gnn", "models"):
        sys.modules.pop(name, None)
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


def round_bits(n, sticky, bits):
    # n + f (0 <= f < 1, sticky = f > 0) to `bits` significant bits, nearest, ties to even: (m, shift), m * 2^shift.
    drop = n.bit_length() - bits
    if drop <= 0:
        if sticky:
            raise SystemExit("MODEL_PARITY|refused=rounding|reason=too few bits")
        return n, 0
    m, rest, half = n >> drop, n & ((1 << drop) - 1), 1 << (drop - 1)
    if rest > half or (rest == half and (sticky or m & 1)):
        m += 1
        if m == 1 << bits:
            m, drop = m >> 1, drop + 1
    return m, drop


def float32_bits(num, den=1 << FRAC_BITS):
    # Bits of the float32 of the binary64 num / den (den > 0): both roundings to nearest, ties to even.
    if num == 0:
        return 0
    magnitude = abs(num)
    shift = BINARY64_BITS + 2 - (magnitude.bit_length() - den.bit_length())
    if shift >= 0:
        quotient, rest = divmod(magnitude << shift, den)
    else:
        quotient, rest = divmod(magnitude, den << -shift)
    m, drop = round_bits(quotient, rest != 0, BINARY64_BITS)
    exponent = drop - shift
    m, drop = round_bits(m, False, FLOAT32_BITS)
    exponent += drop
    field = m.bit_length() - 1 + exponent + 127
    if not 1 <= field <= 254 or m.bit_length() != FLOAT32_BITS:
        raise SystemExit(f"MODEL_PARITY|refused=float32_range|num={num}|den={den}")
    return (1 << 31 if num < 0 else 0) | field << 23 | (m & 0x7F_FFFF)


def float32_parts(bits):
    # The float32 with these bits as (signed significand, exponent), exactly significand * 2^exponent.
    sign, field, fraction = bits >> 31, (bits >> 23) & 0xFF, bits & 0x7F_FFFF
    if field == 0xFF:
        raise SystemExit(f"MODEL_PARITY|refused=not_finite|bits={bits:08x}")
    significand, exponent = (fraction, -149) if field == 0 else (fraction | 1 << 23, field - 150)
    return (-significand if sign else significand), exponent


def scaled_round(bits, scale):
    # floor(f * scale + 1/2) for the float32 f with these bits and an integer scale.
    significand, exponent = float32_parts(bits)
    if exponent >= 0:
        return (significand * scale) << exponent
    return ((significand * scale << 1) + (1 << -exponent)) >> (1 - exponent)


def q24_of_bits(bits):
    return scaled_round(bits, 1 << FRAC_BITS)


def e4_of_bits(bits):
    # Number.prototype.toFixed(4) of a non-negative double: n with n / 10^4 - value closest to 0, larger n on a tie.
    return scaled_round(bits, 10000)


def render_float32(bits):
    significand, exponent = float32_parts(bits)
    return f"{bits:08x}={significand}*2^{exponent}"


def value_order(bits):
    return -(bits & 0x7FFF_FFFF) if bits >> 31 else bits


def tensor_from_bits(rows):
    signed = [[b - (1 << 32) if b >> 31 else b for b in row] for row in rows]
    return torch.tensor(signed, dtype=torch.int32).view(torch.float32)


def bits_of(tensor):
    return [b & 0xFFFF_FFFF for b in tensor.detach().contiguous().view(torch.int32).reshape(-1).tolist()]


def snap(q24):
    # The Q24 value of float32(q24 / 2^24): an input torch and this crate both hold exactly.
    bits = float32_bits(q24)
    significand, exponent = float32_parts(bits)
    if exponent + FRAC_BITS < 0 and significand % (1 << -(exponent + FRAC_BITS)):
        raise SystemExit(f"MODEL_PARITY|refused=snap|q24={q24}")
    return q24_of_bits(bits)


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
    # gsl_gnn.py:63-77 run by the served module itself: with no edges it returns attention * mask, and every
    # attention it keeps is above sigmoid(threshold) > 0, so an entry is set exactly where its bits are not 0.
    with torch.no_grad():
        sparse_attention = model.gsl(x)
    return "".join("0" if b == 0 else "1" for b in bits_of(sparse_attention))


def forward(model, x_bits, edges):
    # gslgnn_inference_server.py:51-54.
    x = tensor_from_bits(x_bits)
    edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
    with torch.no_grad():
        scores = bits_of(model(x, edge_index).reshape(-1))
        again = bits_of(model(x, edge_index).reshape(-1))
    if scores != again:
        raise SystemExit("MODEL_PARITY|refused=nondeterministic")
    return x, scores


def x_field(x_q24):
    return ";".join(",".join(str(q) for q in row) for row in x_q24)


def score_fields(scores):
    bits = ",".join(f"{b:08x}" for b in scores)
    return f"p_bits={bits}|p_q24={','.join(str(q24_of_bits(b)) for b in scores)}"


def graph_row(model, name, x_q24, edges, label="GRAPH"):
    x, scores = forward(model, [[float32_bits(q) for q in row] for row in x_q24], edges)
    edge_field = ",".join(f"{s}>{t}" for s, t in edges)
    row = f"{label}|case={name}|x={x_field(x_q24)}|edges={edge_field}|mask={attention_mask(model, x)}"
    return f"{row}|{score_fields(scores)}", len(scores)


def sha16(text):
    return hashlib.sha256(str(text).encode("utf-8")).hexdigest()[:16]


def node_bits(h):
    # asolaria-score.mjs:113, parseInt(h.slice(2i, 2i + 2), 16) / 255, as the float32 bits server line 51 makes of it.
    return [float32_bits(int(h[i * 2:i * 2 + 2], 16), 255) for i in range(6)]


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
    nodes = [node_bits(sha16(pid)), node_bits(sha16(content))]
    x, scores = forward(model, nodes, [[0, 1]])
    score = scores[0]
    x_q24 = [[q24_of_bits(b) for b in row] for row in nodes]
    return (
        f"REQUEST|case={index}|pid_hex={pid.encode('utf-8').hex()}|content_hex={content.encode('utf-8').hex()}"
        f"|x={x_field(x_q24)}|mask={attention_mask(model, x)}|{score_fields([score])}|e4={e4_of_bits(score)}"
    ), score


def entry_mask(model, x_q24, row, col):
    x = tensor_from_bits([[float32_bits(q) for q in r] for r in x_q24])
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
                x[1][feature] = sign * q24_of_bits(bits)
                return x

            low, high = FLOAT32_HALF, FLOAT32_EIGHT
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
    threshold = model.gsl.threshold.detach()
    rows = [
        f"LAYOUT|conv={PYG_CONV}.GCNConv|gsl_gnn=models.gsl_gnn|staged=1|checkpoint_keys={len(model.state_dict())}"
        f"|renamed_keys=0|threshold_bits={bits_of(threshold)[0]:08x}"
        f"|sigmoid_threshold_bits={bits_of(torch.sigmoid(threshold))[0]:08x}"
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
    request_q24 = [q24_of_bits(s) for s in scores]
    summary = (
        f"graphs={len(graphs)}|edges={edges_total}|requests={len(scores)}"
        f"|request_q24_min={min(request_q24)}|request_q24_max={max(request_q24)}"
        f"|request_e4={','.join(sorted({str(e4_of_bits(s)) for s in scores}))}"
        f"|boundary_searches={found}|boundary_rows={len(boundary)}"
    )
    return header + "\n".join(rows) + "\n", summary


def sqrt32_f32():
    # float32(32 ** 0.5) = significand * 2^-shift, the divisor of gsl_gnn.py:71, from tools/math_referee.py.
    for line in MATH.read_text(encoding="utf-8").splitlines():
        if line.startswith("CONST|name=SQRT32_F32|"):
            fields = dict(part.split("=", 1) for part in line.split("|")[1:])
            return int(fields["significand"]), int(fields["shift"])
    raise SystemExit("MODEL_PARITY|refused=math_fixture|reason=no SQRT32_F32 row")


def attention_scores_q24(model, x, divisor):
    # Q24 of q_i . k_j / (significand * 2^-shift), exact from torch's float32 keys and queries (gsl_gnn.py:66-71).
    significand, shift = divisor
    with torch.no_grad():
        keys = model.gsl.key_transform(x)
        queries = model.gsl.query_transform(x)

    def scaled(tensor):
        width = tensor.shape[1]
        flat = []
        for bits in bits_of(tensor):
            value, exponent = float32_parts(bits)
            flat.append(value << (exponent + 149))
        return [flat[i:i + width] for i in range(0, len(flat), width)]

    k_rows, q_rows = scaled(keys), scaled(queries)
    den = significand << 298
    out = []
    for q in q_rows:
        for k in k_rows:
            dot = sum(a * b for a, b in zip(q, k))
            out.append(((dot << (shift + FRAC_BITS + 1)) + den) // (2 * den))
    return out


def probe_requests(rng):
    # universe/tools/l4_probe.py main(): 500 pid/content pairs.
    requests = []
    for i in range(PROBE_INPUTS):
        pid = "BH.HOOKWALL.%016X" % rng.getrandbits(64) if i % 2 else "%016x" % rng.getrandbits(64)
        content = "".join(chr(rng.randrange(32, 127)) for _ in range(rng.randrange(1, 200)))
        requests.append((pid, content))
    return requests


def probe_row(model, label, inputs, divisor):
    edge_index = torch.tensor([[0, 1]], dtype=torch.long).t().contiguous()
    scores, mask_set, mask_entries, attention = [], 0, 0, []
    with torch.no_grad():
        for x in inputs:
            scores.append(bits_of(model(x, edge_index).reshape(-1))[0])
            mask = attention_mask(model, x)
            mask_set += mask.count("1")
            mask_entries += len(mask)
            attention += attention_scores_q24(model, x, divisor)
    q24 = [q24_of_bits(b) for b in scores]
    ordered = sorted(set(scores), key=value_order)
    return (
        f"{label}|inputs={len(inputs)}|q24_min={min(q24)}|q24_max={max(q24)}|q24_distinct={len(set(q24))}"
        f"|f32_distinct={len(ordered)}|f32_min={render_float32(ordered[0])}|f32_max={render_float32(ordered[-1])}"
        f"|e4={','.join(str(v) for v in sorted({e4_of_bits(b) for b in scores}))}"
        f"|mask_set={mask_set}|mask_entries={mask_entries}"
        f"|attention_score_q24_min={min(attention)}|attention_score_q24_max={max(attention)}"
    )


def probe(v1_checkpoint):
    divisor = sqrt32_f32()
    rng = random.Random(PROBE_SEED)
    requests = probe_requests(rng)
    for checkpoint, digest, served in ((CHECKPOINT, None, 1), (v1_checkpoint, V1_SHA256, 0)):
        with tempfile.TemporaryDirectory() as directory:
            staged = pathlib.Path(directory).resolve()
            stage(staged, checkpoint, digest)
            model = import_server(staged).MODEL
            request_inputs = [
                tensor_from_bits([node_bits(sha16(pid)), node_bits(sha16(content))]) for pid, content in requests
            ]
            uniform_inputs = []
            for _ in range(PROBE_INPUTS):
                nodes = rng.randrange(2, 12)
                generator = torch.Generator().manual_seed(rng.getrandbits(31))
                uniform_inputs.append(torch.rand(nodes, 6, generator=generator))
            sha = hashlib.sha256(checkpoint.read_bytes()).hexdigest()
            label = f"PROBE|checkpoint={checkpoint.name}|sha256={sha}|served={served}"
            print(probe_row(model, f"{label}|set=score_requests", request_inputs, divisor))
            print(probe_row(model, f"{label}|set=uniform_inputs", uniform_inputs, divisor))


def main():
    args = sys.argv[1:]
    seed, out = DEFAULT_SEED, EXPECTED
    if len(args) == 2 and args[0] == "--probe":
        torch.set_num_threads(1)
        probe(pathlib.Path(args[1]).resolve())
        return 0
    if len(args) == 4 and args[0] == "--seed" and args[2] == "--out":
        seed, out = int(args[1], 0), pathlib.Path(args[3])
    elif args not in ([], ["--check"]):
        print("usage: model_parity.py [--check | --seed N --out FILE | --probe V1_CHECKPOINT]", file=sys.stderr)
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
