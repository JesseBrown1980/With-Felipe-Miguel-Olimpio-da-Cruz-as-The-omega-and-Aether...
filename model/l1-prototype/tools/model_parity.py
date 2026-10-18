#!/usr/bin/env python3
"""Torch parity harness for src/model.rs: runs the vendored PrototypeGNN with the pinned checkpoint.

Imports vendor/gnn-sidecar/models/prototype_gnn.py twice. First with torch_geometric unimportable, so the file's
own ImportError branch (lines 17-24) defines GCNConv as `self.lin(x)`; the checkpoint loads into that model with
strict=True and its _metadata module tree is that model's. Then with torch_geometric importable, to record which
keys the torch_geometric GCNConv layout lacks and which it does not expect (LAYOUT rows), and to load the checkpoint
with the key rename of behcs-256 services/gnn-sidecar/inference_server.py:11 (VARIANT row: its forward's float32
bits against the fallback model's on every fixture edge). Every case of tools/int_referee.py goes through the
fallback model in eval mode: encode_nodes, get_edge_embeddings, compute_prototype_distances and forward
(prototype_gnn.py:65-132). KERNEL_ENV is set before torch loads, as model/l0-edge/tools/model_parity.py does, so
every x86-64 host runs the same kernels. Float runs only inside torch (the owner's float32 lane): this tool builds
each input tensor from float32 bit patterns made with integer arithmetic, reads every output by its bit pattern
and converts it with integer arithmetic (tools/quantize.py float32_units).
Writes tests/fixtures/expected-model.hbp; --check regenerates it in memory and diffs. --sweep prints, without
writing anything, the two forwards compared on random graphs at growing input scales (SWEEP rows, fixed seed).
Run: <torch venv>/bin/python -I tools/model_parity.py [--check | --sweep]
"""
import hashlib
import importlib.util
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
MODEL_SOURCE = ROOT / "vendor" / "gnn-sidecar" / "models" / "prototype_gnn.py"
CHECKPOINT = ROOT / "vendor" / "fnns" / "models" / "prototype_model.pt"
CHECKPOINT_SHA256 = "b4df990138ae215bbdda7c1fcf4902bc0a8cb72d9b7d8944eb965d0fc737dd22"
EXPECTED = ROOT / "tests" / "fixtures" / "expected-model.hbp"
FRAC_BITS = 24
# The constructor arguments bigpickle tests/unit/gnn-l1-l2-status.test.mjs:68-76 expects the :4795 server to use;
# temperature keeps its default 0.1 (prototype_gnn.py:39).
ARGS = dict(node_input_dim=6, hidden_dim=64, num_classes=2, num_prototypes_per_class=3)

# Set before torch loads, as model/l0-edge/tools/model_parity.py does: ATen's scalar kernels, oneMKL's SSE2-only
# CNR code path, one thread.
KERNEL_ENV = {"ATEN_CPU_CAPABILITY": "default", "MKL_CBWR": "COMPATIBLE", "OMP_NUM_THREADS": "1", "MKL_NUM_THREADS": "1"}
os.environ.update(KERNEL_ENV)
sys.dont_write_bytecode = True  # no __pycache__ beside the vendored sources or tools/
import torch  # noqa: E402


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


REFEREE = load_module("int_referee", ROOT / "tools" / "int_referee.py")
QUANTIZE = load_module("quantize", ROOT / "tools" / "quantize.py")
UNITS_PER_Q24 = QUANTIZE.FLOAT32_UNIT_BITS - FRAC_BITS  # a Q24 unit is 2^125 float32 units of 2^-149


def float32_bits_of_q24(q):
    """The float32 bits of q / 2^24, or None when q / 2^24 is not a float32 (more than 24 significant bits)."""
    magnitude = abs(q) << UNITS_PER_Q24
    sign = 0x8000_0000 if q < 0 else 0
    if magnitude < 1 << 23:
        return sign | magnitude
    exponent = magnitude.bit_length() - 23
    if magnitude & ((1 << (exponent - 1)) - 1) or exponent > 254:
        return None
    return sign | exponent << 23 | ((magnitude >> (exponent - 1)) & 0x7F_FFFF)


def float32_tensor(x_q24):
    """The float32 tensor of the Q24 rows, built from bit patterns; None when a value is not a float32."""
    bits = [[float32_bits_of_q24(q) for q in row] for row in x_q24]
    if any(b is None for row in bits for b in row):
        return None
    signed = [[b - (1 << 32) if b >> 31 else b for b in row] for row in bits]
    return torch.tensor(signed, dtype=torch.int32).view(torch.float32)


def float32_bits(tensor):
    """The float32 bit patterns of a tensor, as nested lists of unsigned integers."""
    return (tensor.contiguous().view(torch.int32).to(torch.int64) & 0xFFFF_FFFF).tolist()


def load_checkpoint():
    blob = CHECKPOINT.read_bytes()
    digest = hashlib.sha256(blob).hexdigest()
    if digest != CHECKPOINT_SHA256:
        raise SystemExit(f"MODEL_PARITY|refused=sha256|got={digest}|want={CHECKPOINT_SHA256}")
    return torch.load(CHECKPOINT, map_location="cpu", weights_only=True)


def fallback_model(state):
    blocked = sys.modules.get("torch_geometric", "absent")
    sys.modules["torch_geometric"] = None  # `from torch_geometric.nn import GCNConv` raises ImportError
    try:
        module = load_module("prototype_gnn", MODEL_SOURCE)
    finally:
        if blocked == "absent":
            del sys.modules["torch_geometric"]
        else:
            sys.modules["torch_geometric"] = blocked
    if module.GCNConv.__module__ != "prototype_gnn":
        raise SystemExit("MODEL_PARITY|refused=model|reason=GCNConv is not the file's fallback class")
    model = module.PrototypeGNN(**ARGS)
    model.load_state_dict(state, strict=True)
    if list(model.state_dict()._metadata.keys()) != list(state._metadata.keys()):
        raise SystemExit("MODEL_PARITY|refused=module_tree")
    model.eval()
    return model


def torch_geometric_module():
    import torch_geometric  # noqa: F401  (the GCNConv the file imports when it can)

    return load_module("prototype_gnn_torch_geometric", MODEL_SOURCE)


def load_result(result):
    return (f"|strict_load={'ok' if not (result.missing_keys or result.unexpected_keys) else 'refused'}"
            f"|missing={','.join(result.missing_keys)}|unexpected={','.join(result.unexpected_keys)}")


def layout_rows(state, module):
    import torch_geometric

    model = module.PrototypeGNN(**ARGS)
    result = model.load_state_dict(state, strict=False)
    tree = [k for k in model.state_dict()._metadata.keys() if k not in state._metadata]
    return [
        "LAYOUT|conv=fallback_linear|source=prototype_gnn.py:17-24|strict_load=ok|missing=|unexpected=|extra_modules=",
        f"LAYOUT|conv=torch_geometric_{torch_geometric.__version__}|source=prototype_gnn.py:15-16{load_result(result)}"
        f"|extra_modules={','.join(tree)}",
    ]


def rekeyed_model(state, module):
    """The torch_geometric layout loaded after the rename of behcs-256 services/gnn-sidecar/inference_server.py:11."""
    renamed = {(k.replace("conv1.lin.bias", "conv1.bias").replace("conv2.lin.bias", "conv2.bias")
                if k.endswith(".lin.bias") else k): v for k, v in state.items()}
    model = module.PrototypeGNN(**ARGS)
    result = model.load_state_dict(renamed, strict=False)
    model.eval()
    return model, load_result(result)


def forward_bits(model, x_q24, edges):
    x = float32_tensor(x_q24)
    edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
    with torch.no_grad():
        return float32_bits(model(x, edge_index).reshape(-1))


def variant_row(fallback, rekeyed, load, cases):
    import torch_geometric

    edges = equal = 0
    for _, _, x_q24, case_edges in cases:
        pairs = zip(forward_bits(fallback, x_q24, case_edges), forward_bits(rekeyed, x_q24, case_edges))
        for a, b in pairs:
            edges += 1
            equal += a == b
    return (f"VARIANT|conv=torch_geometric_{torch_geometric.__version__}|rename=conv1.lin.bias>conv1.bias,"
            f"conv2.lin.bias>conv2.bias|source=inference_server.py:11{load}|edges={edges}|p_bits_equal={equal}")


def join_q24(tensor):
    return ";".join(",".join(str(QUANTIZE.q24_of_float32_bits(b)) for b in row) for row in float32_bits(tensor))


def case_row(model, kind, case, x_q24, edges):
    x = float32_tensor(x_q24)
    if x is None:
        raise SystemExit(f"MODEL_PARITY|refused=input|case={case}|reason=not exact in float32")
    edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
    with torch.no_grad():
        h = model.encode_nodes(x, edge_index)
        e = model.get_edge_embeddings(h, edge_index)
        logits = model.compute_prototype_distances(e)
        p = model(x, edge_index)
    p_bits = float32_bits(p.reshape(-1))
    head = f"{kind}|case={case}|edges={','.join(f'{s}>{t}' for s, t in edges)}"
    tail = (f"|logits_q24={join_q24(logits)}|p_bits={','.join(f'{b:08x}' for b in p_bits)}"
            f"|p_q24={','.join(str(QUANTIZE.q24_of_float32_bits(b)) for b in p_bits)}")
    if kind == "PAIR":
        return f"{head}|h_q24={join_q24(h)}|e_q24={join_q24(e)}{tail}", len(p_bits)
    return head + tail, len(p_bits)


def render():
    torch.set_num_threads(1)
    state = load_checkpoint()
    model = fallback_model(state)
    module = torch_geometric_module()
    rows = layout_rows(state, module)
    cases = REFEREE.cases()
    rekeyed, load = rekeyed_model(state, module)
    rows.append(variant_row(model, rekeyed, load, cases))
    edges_total = 0
    for kind, case, x_q24, edges in cases:
        row, count = case_row(model, kind, case, x_q24, edges)
        rows.append(row)
        edges_total += count
    import torch_geometric

    header = (
        "# expected PrototypeGNN outputs from tools/model_parity.py: vendored prototype_gnn.py with its fallback GCNConv, "
        f"prototype_model.pt (sha256 {CHECKPOINT_SHA256[:16]}...), eval, torch {torch.__version__}, kernels "
        f"{','.join(f'{k}={v}' for k, v in KERNEL_ENV.items())}; do not edit\n"
        f"# LAYOUT rows load the same state dict into the file's torch_geometric {torch_geometric.__version__} variant; "
        "inputs are the x of tests/fixtures/expected-int.hbp (exact in float32, sent as float32 bit patterns)\n"
        "# VARIANT row: that variant loaded after the rename of inference_server.py:11; p_bits_equal counts the fixture "
        "edges whose forward float32 bits equal the fallback model's\n"
        "# *_q24 = floor(v * 2^24 + 1/2) of the float32 outputs of encode_nodes (h), get_edge_embeddings (e), "
        "compute_prototype_distances (logits) and forward (p), from their bits in integers; p_bits = forward's float32 "
        "bits (hex)\n"
    )
    summary = f"cases={len(cases)}|edges={edges_total}|torch={torch.__version__}"
    return header + "\n".join(rows) + "\n", summary


SWEEP_SEED = 0x4E4B
SWEEP_GRAPHS = 300
SWEEP_SCALES = (0, 8, 16, 24, 27, 28, 29, 30, 33, 36)


def signed_draw(rng, bits):
    """Uniform in [-2^bits, 2^bits): 64 bits from two 32-bit draws, shifted right arithmetically."""
    value = (rng.below(1 << 32) << 32) | rng.below(1 << 32)
    value -= (value >> 63) << 64
    return value >> (63 - bits)


def q24_units_above(a_bits, b_bits):
    """ceil(|a - b| * 2^24) of the two float32 values with these bits, in integers."""
    diff = abs(QUANTIZE.float32_units(a_bits) - QUANTIZE.float32_units(b_bits))
    return -(-diff >> UNITS_PER_Q24)


def sweep():
    """Fallback vs rekeyed forward on random graphs of 2-9 nodes, features uniform in [-2^s, 2^s) (Q24 inputs with
    at most 24 significant bits, so exact in float32). Differences are ceil(|a - b| * 2^24), from the bits, in
    integers."""
    torch.set_num_threads(1)
    state = load_checkpoint()
    fallback = fallback_model(state)
    rekeyed, load = rekeyed_model(state, torch_geometric_module())
    print(f"SWEEP|rekeyed{load}|seed={SWEEP_SEED:#x}|graphs_per_scale={SWEEP_GRAPHS}|torch={torch.__version__}")
    rng = REFEREE.Lcg(SWEEP_SEED)
    for scale in SWEEP_SCALES:
        edges_total = unequal = p_max = h_max = 0
        for _ in range(SWEEP_GRAPHS):
            nodes = 2 + rng.below(8)
            x_q24 = [[REFEREE.float32_exact(signed_draw(rng, scale + FRAC_BITS)) for _ in range(6)]
                     for _ in range(nodes)]
            edges = [[rng.below(nodes), rng.below(nodes)] for _ in range(1 + rng.below(2 * nodes))]
            x = float32_tensor(x_q24)
            edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
            with torch.no_grad():
                p = zip(float32_bits(fallback(x, edge_index).reshape(-1)),
                        float32_bits(rekeyed(x, edge_index).reshape(-1)))
                h = zip(float32_bits(fallback.encode_nodes(x, edge_index).reshape(-1)),
                        float32_bits(rekeyed.encode_nodes(x, edge_index).reshape(-1)))
            for a, b in p:
                unequal += a != b
                p_max = max(p_max, q24_units_above(a, b))
            h_max = max([h_max] + [q24_units_above(a, b) for a, b in h])
            edges_total += len(edges)
        print(f"SWEEP|scale=2^{scale}|edges={edges_total}|p_bits_unequal={unequal}|p_max_q24_units={p_max}"
              f"|h_max_q24_units={h_max}")
    return 0


def main():
    args = sys.argv[1:]
    if args == ["--sweep"]:
        return sweep()
    if args not in ([], ["--check"]):
        print("usage: model_parity.py [--check | --sweep]", file=sys.stderr)
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
