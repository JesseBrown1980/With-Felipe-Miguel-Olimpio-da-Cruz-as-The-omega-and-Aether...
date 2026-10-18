#!/usr/bin/env python3
"""The torch side of the zoo: loading the checkpoints, what the trainers' result files reproduce, parity inputs.

  load        results/torch-load.hbp: torch.load(weights_only=True) of the 11 checkpoints (tensor bits equal
              to tools/zoo_ckpt.py's), strict loading into each class built with torch_geometric's GCNConv
              ("pyg") and with the vendored files' ImportError fallback GCNConv ("fallback"), as saved and
              with conv*.bias / conv*.lin.bias renamed to the model's keys, and what inference_server_v2.py
              loads at import under each.
  trained-on  results/trained-on.hbp: each checkpoint run, through the trainers' own functions (load_dataset,
              build_tensors, split_data, compute_metrics of train_all_models.py; train_baseline.py's
              builders), on the corpora its trainer could have read; the test-split confusion counts are
              compared with training_results.json and gslgnn_archive_200k_results.json.
  parity OUT  the parity file the examples of this crate read (not committed): two graphs (the whole first
              training set and the whole sample-10k corpus) with Q24 node features and every checkpoint's
              torch output bits under both GCNConv variants.
  parity-fixture
              tests/fixtures/parity-first.hbp, which the tests read: the first training set, and each
              checkpoint's torch output bits under the GCNConv variant of the port it is run with.

Float runs only inside torch and inside the owner's vendored code (run unchanged). This tool builds parity
inputs from exact JSON decimals in integers, hands torch float32 bit patterns, and reads outputs by bit
pattern. Before torch loads it sets ATEN_CPU_CAPABILITY=default, MKL_CBWR=COMPATIBLE and one thread, as
model/l0-edge/tools/model_parity.py does. --check regenerates a committed file in memory and diffs.
Run: <python with torch 2.14.1+cpu and torch_geometric 2.8.1> -I tools/zoo_torch.py load|trained-on [--check]
"""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
import pathlib
import platform
import sys
import tempfile
import zipfile
from fractions import Fraction

KERNEL_ENV = {"ATEN_CPU_CAPABILITY": "default", "MKL_CBWR": "COMPATIBLE", "OMP_NUM_THREADS": "1", "MKL_NUM_THREADS": "1"}
os.environ.update(KERNEL_ENV)
sys.dont_write_bytecode = True  # no __pycache__ beside the vendored sources or tools/
import torch  # noqa: E402
import torch_geometric  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
VENDOR = ROOT / "vendor" / "gnn-patterns"
FIRST = ROOT / "vendor" / "first-training" / "gnn-training-export-20260315.json"
ZIP_B = ROOT / "corpora" / "FABLE5-REGEN-ITEM6B-GNN-ZOO-CORPORA-2026-10-18.zip"
ZIP_C = ROOT / "corpora" / "FABLE5-REGEN-ITEM6C-GNN-EXPORT-AND-EVENTS-2026-10-18.zip"
RESULTS = ROOT / "results"
FRAC_BITS = 24
# GSLGNN's forward holds several dense num_nodes x num_nodes float32 matrices; above this node count it is not run.
GSL_NODE_LIMIT = 6000


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


zc = load_module("zoo_ckpt", ROOT / "tools" / "zoo_ckpt.py")
cc = load_module("corpus_check", ROOT / "tools" / "corpus_check.py")

ZOO = [
    ("baseline_model.pt", "EdgeLevelGNN"),
    ("baseline_model_retrained.pre-L0-rekey-2026-05-26.pt", "EdgeLevelGNN"),
    ("baseline_model_retrained.pt", "EdgeLevelGNN"),
    ("prototype_model.pt", "PrototypeGNN"),
    ("prototype_model.pt.bak", "PrototypeGNN"),
    ("contrastive_model.pt", "ContrastiveGNN"),
    ("contrastive_model.pt.bak", "ContrastiveGNN"),
    ("gsl_model.pt", "GSLGNN"),
    ("gsl_model.pt.bak", "GSLGNN"),
    ("gsl_model_archive_200k.pt", "GSLGNN"),
    ("gsl_model_archive_200k_shuffled.pt", "GSLGNN"),
]
MODEL_FILES = {"EdgeLevelGNN": "gnn_baseline.py", "PrototypeGNN": "prototype_gnn.py",
               "ContrastiveGNN": "contrastive_gnn.py", "GSLGNN": "gsl_gnn.py"}
# Constructor arguments of train_all_models.py:122, 182-183, 256-257, 325-326 (= inference_server_v2.py:57-72).
CTOR = {
    "EdgeLevelGNN": dict(node_input_dim=6, hidden_dim=64),
    "PrototypeGNN": dict(node_input_dim=6, hidden_dim=64, num_classes=2, num_prototypes_per_class=3, temperature=0.1),
    "ContrastiveGNN": dict(node_input_dim=6, hidden_dim=64, projection_dim=64, num_classes=2),
    "GSLGNN": dict(node_input_dim=6, hidden_dim=64, num_classes=2, gsl_hidden_dim=32),
}


@contextlib.contextmanager
def without_pyg():
    """torch_geometric unimportable (None in sys.modules) while the block runs; restored after."""
    saved = {n: m for n, m in sys.modules.items() if n == "torch_geometric" or n.startswith("torch_geometric.")}
    for name in saved:
        sys.modules[name] = None
    try:
        yield
    finally:
        sys.modules.update(saved)


def model_classes():
    pyg = {c: getattr(load_module(f"zoo_pyg_{f[:-3]}", VENDOR / "models" / f), c) for c, f in MODEL_FILES.items()}
    with without_pyg():
        fallback = {c: getattr(load_module(f"zoo_fallback_{f[:-3]}", VENDOR / "models" / f), c)
                    for c, f in MODEL_FILES.items()}
    return {"pyg": pyg, "fallback": fallback}


def versions():
    return (f"VERSIONS|python={platform.python_version()}|torch={torch.__version__}"
            f"|torch_geometric={torch_geometric.__version__}"
            f"|kernels={','.join(f'{k}={v}' for k, v in KERNEL_ENV.items())}|json=0")


def state_of(name):
    return torch.load(VENDOR / name, map_location="cpu", weights_only=True)


def build(classes, cls, variant, name):
    """The class under one GCNConv variant, with the checkpoint's tensors under the model's own key names."""
    model = classes[variant][cls](**CTOR[cls])
    state = state_of(name)
    by_key = {zc.canonical_key(k): v for k, v in state.items()}
    wanted = list(model.state_dict())
    if set(by_key) != {zc.canonical_key(k) for k in wanted}:
        raise SystemExit(f"TORCH|refused=keys|file={name}|variant={variant}|json=0")
    model.load_state_dict({k: by_key[zc.canonical_key(k)] for k in wanted}, strict=True)
    model.eval()
    return model


def bits_of(tensor):
    return [b & 0xFFFFFFFF for b in tensor.detach().contiguous().view(torch.int32).reshape(-1).tolist()]


def tensor_of_bits(rows):
    return torch.tensor([[b - (1 << 32) if b >> 31 else b for b in row] for row in rows], dtype=torch.int32).view(torch.float32)


# ---------------------------------------------------------------- load

def load_rows():
    classes = model_classes()
    pyg_conv = type(classes["pyg"]["EdgeLevelGNN"](6, 64).conv1)
    fb_conv = type(classes["fallback"]["EdgeLevelGNN"](6, 64).conv1)
    out = [
        "# results/torch-load.hbp: written by tools/zoo_torch.py load; --check diffs.",
        versions(),
        f"# CONV|pyg={pyg_conv.__module__}.{pyg_conv.__name__}|fallback={fb_conv.__module__}.{fb_conv.__name__}",
    ]
    for name, cls in ZOO:
        state = state_of(name)
        stdlib = zc.Checkpoint(VENDOR / name)
        same = list(state) == list(stdlib.tensors) and all(
            bits_of(state[k]) == list(stdlib.tensors[k].bits) for k in state)
        out.append(f"TORCHLOAD|file={name}|weights_only=ok|tensors={len(state)}|dtypes="
                   f"{','.join(sorted({str(v.dtype).replace('torch.', '') for v in state.values()}))}"
                   f"|bits_equal_to_zoo_ckpt={int(same)}|json=0")
        for variant in ("pyg", "fallback"):
            model = classes[variant][cls](**CTOR[cls])
            result = model.load_state_dict(state, strict=False)
            as_saved = "ok" if not result.missing_keys and not result.unexpected_keys else (
                f"missing:{'+'.join(result.missing_keys)};unexpected:{'+'.join(result.unexpected_keys)}")
            build(classes, cls, variant, name)
            out.append(f"STRICT|file={name}|class={cls}|variant={variant}|as_saved={as_saved}|after_rename=ok|json=0")
    for variant in ("pyg", "fallback"):
        for key in [k for k in sys.modules if k == "models" or k.startswith("models.")]:
            del sys.modules[key]
        sink = io.StringIO()
        with contextlib.redirect_stdout(sink):
            if variant == "pyg":
                server = load_module("zoo_v2_pyg", VENDOR / "inference_server_v2.py")
            else:
                with without_pyg():
                    server = load_module("zoo_v2_fallback", VENDOR / "inference_server_v2.py")
        loaded = {line.split()[1]: line.split()[-1] for line in sink.getvalue().splitlines() if line.strip().startswith("[OK]")}
        layers = ["L0_EdgeLevel", "L1_Contrastive", "L2_Prototype", "L4_GSLGNN"]
        state = ",".join(f"{layer}:{loaded.get(layer, 'FAILED')}" for layer in layers)
        out.append(f"V2|variant={variant}|models_loaded={len(server.MODELS)}/4|layers={state}|json=0")
        while str(VENDOR) in sys.path:
            sys.path.remove(str(VENDOR))
    return "\n".join(out) + "\n"


# ---------------------------------------------------------------- trained-on

def quiet(fn, *args, **kwargs):
    with contextlib.redirect_stdout(io.StringIO()):
        return fn(*args, **kwargs)


def reduced_export(directory, keep):
    """The export with its stats, all nodes and its first `keep` edges, each copied as its exact JSON text."""
    path = pathlib.Path(directory) / "export-head.json"
    with zipfile.ZipFile(ZIP_C) as z, z.open("gnn-patterns/gnn-training-export.json") as raw, \
            path.open("w", encoding="utf-8") as out:
        s = cc.Stream(raw)
        parts = []
        for key, stream in s.members():
            if key in ("nodes", "edges"):
                texts = []
                for item in stream.items():
                    if key == "edges" and len(texts) == keep:
                        break
                    texts.append(item.decode()[1])
                parts.append(f'"{key}":[' + ",".join(texts) + "]")
                if key == "edges":
                    break
            else:
                parts.append(json.dumps(key) + ":" + stream.decode()[1])
        out.write("{" + ",".join(parts) + ',"edgeIndex":[],"format":"asolaria-gnn-v1"}')
    return path


def materialise(directory, archive, entry):
    path = pathlib.Path(directory) / entry.rsplit("/", 1)[-1]
    with zipfile.ZipFile(archive) as z, z.open(entry) as raw, path.open("wb") as out:
        while piece := raw.read(1 << 20):
            out.write(piece)
    return path


def confusion(pred, labels):
    tp = int(((pred == 1) & (labels == 1)).sum())
    fp = int(((pred == 1) & (labels == 0)).sum())
    fn = int(((pred == 0) & (labels == 1)).sum())
    tn = int(((pred == 0) & (labels == 0)).sum())
    return tp, fp, fn, tn


def trained_on_rows():
    classes = model_classes()
    sys.path.insert(0, str(VENDOR))
    tam = load_module("zoo_train_all_models", VENDOR / "train_all_models.py")
    tb = load_module("zoo_train_baseline", VENDOR / "train_baseline.py")
    results = json.loads((VENDOR / "training_results.json").read_text(encoding="utf-8"),
                         parse_float=cc.Dec)
    archive_results = json.loads((VENDOR / "gslgnn_archive_200k_results.json").read_text(encoding="utf-8"),
                                 parse_float=cc.Dec)
    out = [
        "# results/trained-on.hbp: written by tools/zoo_torch.py trained-on; --check diffs.",
        "# Each checkpoint's forward ('pyg' = torch_geometric GCNConv, as train_all_models.py:24 imports it) on a",
        "# corpus prepared by the trainers' own load_dataset/build_tensors; test = the last 15% (split_data).",
        versions(),
    ]
    run = [("baseline_model_retrained.pt", "EdgeLevelGNN", "EdgeLevelGNN"),
           ("contrastive_model.pt", "ContrastiveGNN", "ContrastiveGNN"),
           ("prototype_model.pt", "PrototypeGNN", "PrototypeGNN"),
           ("gsl_model.pt", "GSLGNN", "GSLGNN")]
    candidates = [
        ("gnn-training-sample-50k.json", ZIP_B, "gnn-patterns/gnn-training-sample-50k.json", None),
        ("gnn-training-archive-50k.json", ZIP_B, "gnn-patterns/gnn-training-archive-50k.json", None),
        ("gnn-training-fresh-50k.json", ZIP_B, "gnn-patterns/gnn-training-fresh-50k.json", None),
        ("gnn-training-archive-200k.json[--max-edges 50000]", ZIP_B, "gnn-patterns/gnn-training-archive-200k.json", 50000),
        ("gnn-training-500k.json[--max-edges 50000]", ZIP_B, "gnn-patterns/gnn-training-500k.json", 50000),
        ("gnn-training-export.json[--max-edges 50000]", ZIP_C, "gnn-patterns/gnn-training-export.json", 50000),
    ]
    for label, archive, entry, cap in candidates:
        with tempfile.TemporaryDirectory() as directory:
            if entry.endswith("gnn-training-export.json"):
                path = reduced_export(directory, cap + 1)
            else:
                path = materialise(directory, archive, entry)
            try:
                data = quiet(tam.load_dataset, str(path), max_edges=cap)
            except (UnicodeDecodeError, ValueError) as error:
                out.append(f"CORPUS|corpus={label}|load_dataset_raises={type(error).__name__}|json=0")
                continue
        x, edge_index, labels = tam.build_tensors(data)
        n = len(labels)
        train_end, val_end = tam.split_data(n)
        positives = int(labels[val_end:].sum())
        out.append(f"CORPUS|corpus={label}|nodes={x.shape[0]}|edges={n}|train_end={train_end}|val_end={val_end}"
                   f"|test_positives={positives}|json=0")
        for name, cls, key in run:
            if cls == "GSLGNN" and x.shape[0] > GSL_NODE_LIMIT:
                out.append(f"EVAL|file={name}|corpus={label}|skipped=nodes_above_{GSL_NODE_LIMIT}|json=0")
                continue
            model = build(classes, cls, "pyg", name)
            with torch.no_grad():
                pred = (model(x, edge_index) > 0.5).float()
            m = tam.compute_metrics(pred[val_end:], labels[val_end:])
            want = results[key]
            equal = all(m[k] == want[k] for k in ("tp", "fp", "fn", "tn"))
            out.append(f"EVAL|file={name}|corpus={label}|tp={m['tp']}|fp={m['fp']}|fn={m['fn']}|tn={m['tn']}"
                       f"|training_results.json[{key}]=tp:{want['tp']},fp:{want['fp']},fn:{want['fn']},tn:{want['tn']}"
                       f"|equal={int(equal)}|json=0")
    # The archive GSLGNN checkpoints on the whole 200k archive (train_gslgnn_archive.py:25-26).
    with tempfile.TemporaryDirectory() as directory:
        path = materialise(directory, ZIP_B, "gnn-patterns/gnn-training-archive-200k.json")
        data = quiet(tam.load_dataset, str(path), max_edges=200000)
    x, edge_index, labels = tam.build_tensors(data)
    n = len(labels)
    train_end, val_end = tam.split_data(n)
    d = archive_results["data"]
    pos = (Fraction(d["train_pos"]), Fraction(d["val_pos"]), Fraction(d["test_pos"]))
    out.append(f"ARCHIVE|corpus=gnn-training-archive-200k.json|nodes={x.shape[0]}|edges={n}"
               f"|positives={int(labels.sum())}|results_total={d['total']}|results_train/val/test={d['train']}/{d['val']}/{d['test']}"
               f"|results_pos_sum={sum(pos)}|pos_sum_equals_positives={int(sum(pos) == int(labels.sum()))}"
               f"|chronological_test_positives={int(labels[val_end:].sum())}|json=0")
    m = archive_results["metrics"]
    out.append(f"# gslgnn_archive_200k_results.json test (a torch.randperm(200000) without a seed, "
               f"train_gslgnn_archive.py:33): tp={m['tp']} fp={m['fp']} fn={m['fn']} tn={m['tn']}")
    for name in ("gsl_model_archive_200k.pt", "gsl_model_archive_200k_shuffled.pt", "gsl_model.pt"):
        model = build(classes, "GSLGNN", "pyg", name)
        with torch.no_grad():
            pred = (model(x, edge_index) > 0.5).float()
        tp, fp, fn, tn = confusion(pred, labels)
        ctp, cfp, cfn, ctn = confusion(pred[val_end:], labels[val_end:])
        out.append(f"ARCHIVEEVAL|file={name}|all_200000=tp:{tp},fp:{fp},fn:{fn},tn:{tn}"
                   f"|chronological_test=tp:{ctp},fp:{cfp},fn:{cfn},tn:{ctn}|json=0")
    # baseline_model.pt: train_baseline.py:180-187 reads data/gnn-training-export-20260315.json.
    data = quiet(tb.load_asolaria_dataset, str(FIRST))
    x = torch.tensor(tb.build_node_features(data["nodes"]))
    edge_index = torch.tensor(tb.build_edge_index(data))
    _, labels = tb.build_edge_features_and_labels(data["edges"])
    labels = torch.tensor(labels)
    n = len(labels)
    train_end, val_end = int(n * 0.7), int(n * 0.85)
    out.append(f"FIRST|corpus=first-training/gnn-training-export-20260315.json|nodes={x.shape[0]}|edges={n}"
               f"|train_end={train_end}|val_end={val_end}|test_positives={int(labels[val_end:].sum())}|json=0")
    for name, cls in ZOO:
        for variant in ("fallback", "pyg"):
            if cls == "GSLGNN" and variant == "fallback":
                continue
            model = build(classes, cls, variant, name)
            with torch.no_grad():
                pred = (model(x, edge_index) > 0.5).float()
            tp, fp, fn, tn = confusion(pred[val_end:], labels[val_end:])
            atp, afp, afn, atn = confusion(pred, labels)
            out.append(f"FIRSTEVAL|file={name}|variant={variant}|test=tp:{tp},fp:{fp},fn:{fn},tn:{tn}"
                       f"|all_1730=tp:{atp},fp:{afp},fn:{afn},tn:{atn}|json=0")
    return "\n".join(out) + "\n"


# ---------------------------------------------------------------- parity

def q24_of(value):
    """floor(value * 2^24 + 1/2) of an exact Fraction."""
    v = Fraction(value) * (1 << FRAC_BITS) + Fraction(1, 2)
    return v.numerator // v.denominator


def node_q24(node):
    # train_all_models.py:67-74 (= train_baseline.py:31-38), from the exact JSON decimals.
    return [
        q24_of(min(Fraction(node.get("edgeVolume", 0)) / 100, 1)),
        q24_of(Fraction(node.get("avgRisk", 0)) / 9),
        q24_of(Fraction(node.get("maxRisk", 0)) / 9),
        q24_of(Fraction(node.get("failureRate", 0))),
        q24_of(Fraction(node.get("online", 1))),
        q24_of(Fraction(node.get("trustTier", 1)) / 3),
    ]


def graph_of(text):
    data = json.loads(text, parse_float=Fraction)
    index = {n["id"]: i for i, n in enumerate(data["nodes"])}
    x = [node_q24(n) for n in data["nodes"]]
    edges = [(index.get(e["source"], 0), index.get(e["target"], 0)) for e in data["edges"]]
    return x, edges


# The forward each port runs: model/l0-edge and model/l4-gslgnn torch_geometric's GCNConv, model/l1-prototype
# and model/l2-contrastive the fallback GCNConv.
PORT_FORWARD = {"EdgeLevelGNN": "pyg", "GSLGNN": "pyg", "PrototypeGNN": "fallback", "ContrastiveGNN": "fallback"}
FIXTURE = ROOT / "tests" / "fixtures" / "parity-first.hbp"


def parity_text(fixture):
    """The whole parity file, or (fixture) the first training set with each port's own forward only."""
    classes = model_classes()
    first = FIRST.read_bytes()
    sets = [("first", "first-training/gnn-training-export-20260315.json", first)]
    if not fixture:
        with zipfile.ZipFile(ZIP_B) as z:
            sets.append(("sample-10k", "gnn-patterns/gnn-training-sample-10k.json",
                         z.read("gnn-patterns/gnn-training-sample-10k.json")))
    writer = "parity-fixture" if fixture else "parity OUT"
    lines = [f"# written by tools/zoo_torch.py {writer}; read by the tests and examples of this crate.", versions()]
    for set_name, source, blob in sets:
        x, edges = graph_of(blob.decode("utf-8"))
        lines.append(f"SET|set={set_name}|source={source}|sha256={hashlib.sha256(blob).hexdigest()}"
                     f"|nodes={len(x)}|edges={len(edges)}|json=0")
        lines.append(f"X|set={set_name}|x={';'.join(','.join(str(q) for q in row) for row in x)}|json=0")
        lines.append(f"E|set={set_name}|e={';'.join(f'{s},{t}' for s, t in edges)}|json=0")
        xt = tensor_of_bits([[zc.float32_bits_of_q24(q) for q in row] for row in x])
        ei = torch.tensor(edges, dtype=torch.long).t().contiguous()
        for name, cls in ZOO:
            for variant in ("pyg", "fallback"):
                if fixture and variant != PORT_FORWARD[cls]:
                    continue
                model = build(classes, cls, variant, name)
                with torch.no_grad():
                    scores = model(xt, ei).reshape(-1)
                lines.append(f"TORCH|set={set_name}|file={name}|class={cls}|forward={variant}"
                             f"|bits={';'.join(f'{b:08x}' for b in bits_of(scores))}|json=0")
    return "\n".join(lines) + "\n"


def main():
    args = sys.argv[1:]
    if args[:1] == ["parity"] and len(args) == 2:
        pathlib.Path(args[1]).write_text(parity_text(False), encoding="utf-8")
        print(f"PARITYFILE|written={args[1]}|json=0")
        return 0
    commands = {"load": (RESULTS / "torch-load.hbp", load_rows), "trained-on": (RESULTS / "trained-on.hbp", trained_on_rows),
                "parity-fixture": (FIXTURE, lambda: parity_text(True))}
    if len(args) not in (1, 2) or args[0] not in commands or args[1:] not in ([], ["--check"]):
        print("usage: zoo_torch.py load|trained-on|parity-fixture [--check] | parity OUT", file=sys.stderr)
        return 2
    out, make = commands[args[0]]
    text = make()
    digest = hashlib.sha256(text.encode()).hexdigest()
    if args[1:] == ["--check"]:
        same = out.exists() and out.read_text(encoding="utf-8") == text
        print(f"TORCH|check={'PASS' if same else 'FAIL'}|file={out.name}|sha256={digest}|json=0")
        return 0 if same else 1
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8")
    print(f"TORCH|written={out.name}|sha256={digest}|json=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
