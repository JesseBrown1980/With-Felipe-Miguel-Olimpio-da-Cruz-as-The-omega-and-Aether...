#!/usr/bin/env python3
"""Writes results/checkpoints.hbp: the 11 vendored checkpoints read WITHOUT torch, compared in integers.

For each checkpoint: bytes, sha256, root type, _metadata module paths, every key with shape and dtype, the
model class its keys identify and the aether level of that class. Then every checkpoint already in aether
(the pinned list below) by bytes, and every pair of checkpoints of one class by value: tensors are matched
by canonical key (conv*.lin.bias and conv*.bias are one name, zoo_ckpt.canonical_key) and compared by their
float32 bit patterns. A difference is reported as a count of differing elements, the largest distance in
float32 steps (ulp, from the ordered bit patterns) and the largest |a - b| as an exact rational. No float.
--check regenerates in memory and diffs.
"""
import hashlib
import importlib.util
import itertools
import pathlib
import sys

sys.dont_write_bytecode = True  # no __pycache__ in tools/
ROOT = pathlib.Path(__file__).resolve().parent.parent
AETHER = ROOT.parent.parent
VENDOR = ROOT / "vendor" / "gnn-patterns"
OUT = ROOT / "results" / "checkpoints.hbp"


def load_sibling(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "tools" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


zc = load_sibling("zoo_ckpt")

ZOO = [
    "baseline_model.pt",
    "baseline_model_retrained.pre-L0-rekey-2026-05-26.pt",
    "baseline_model_retrained.pt",
    "contrastive_model.pt",
    "contrastive_model.pt.bak",
    "prototype_model.pt",
    "prototype_model.pt.bak",
    "gsl_model.pt",
    "gsl_model.pt.bak",
    "gsl_model_archive_200k.pt",
    "gsl_model_archive_200k_shuffled.pt",
]

# Every checkpoint in aether outside this directory (HEAD ef180d1 and the working tree, 2026-10-18), pinned.
AETHER_CHECKPOINTS = [
    ("model/l0-edge/vendor/gnn-sidecar/baseline_model.pt", "a09993369d31ca73345914812e5226b513f5fb9092f43e487a2eafc8c3b621f5"),
    ("model/l1-prototype/vendor/fnns/models/prototype_model.pt", "b4df990138ae215bbdda7c1fcf4902bc0a8cb72d9b7d8944eb965d0fc737dd22"),
    ("model/l2-contrastive/vendor/fnns/models/contrastive_model.pt", "d371dbbf97ecee87846a87a1a57492e3c03d97168a9b5f5cfcc1fee411488eef"),
    ("model/l4-gslgnn/vendor/fnns/models/gslgnn_w9_3_seq47_v2.pt", "9e50723b10c9de5c27baa5bc9386340bf72f76bcae2877064a47e4627a86602c"),
    ("acer/Asolaria/services/gnn-sidecar/baseline_model.pt", "a09993369d31ca73345914812e5226b513f5fb9092f43e487a2eafc8c3b621f5"),
    ("acer/Asolaria/services/gnn-sidecar/prototype_model.pt", "b4df990138ae215bbdda7c1fcf4902bc0a8cb72d9b7d8944eb965d0fc737dd22"),
    ("acer/Asolaria/services/gnn-sidecar/prototype_model_run2.pt", "f9817037b888759ab8b1d1ff8d41b4aa4d3b0e790b70a5a73d659545527073b8"),
    ("acer/Asolaria/services/gnn-sidecar/prototype_model_run3.pt", "b4df990138ae215bbdda7c1fcf4902bc0a8cb72d9b7d8944eb965d0fc737dd22"),
    ("acer/Asolaria/services/gnn-sidecar/contrastive_model.pt", "d371dbbf97ecee87846a87a1a57492e3c03d97168a9b5f5cfcc1fee411488eef"),
    ("acer/Asolaria/services/gnn-sidecar/contrastive_model_run2.pt", "048764063f6711be5f501f5f65155dc8d017c1106d99aecf2580ded2906ebe72"),
    ("acer/Asolaria/services/gnn-sidecar/contrastive_model_run3.pt", "d371dbbf97ecee87846a87a1a57492e3c03d97168a9b5f5cfcc1fee411488eef"),
    ("acer/Asolaria/services/gnn-sidecar/gslgnn_w9_3_seq47.pt", "6f82384ff2e313b1f34b48cca5c1c2bb3a8f9391bba54db7afbb36c5fda91ad5"),
    ("acer/Asolaria/services/gnn-sidecar/gslgnn_w9_3_seq47_v2.pt", "9e50723b10c9de5c27baa5bc9386340bf72f76bcae2877064a47e4627a86602c"),
    ("docs/handoffs/gnn-retrain-2026-10-18/prototype_model_strat_2026-10-18.pt", "dc8ea19512ad62da617b8e42da98575940c990f89d364a682fa74ed0da5cba0c"),
    ("docs/handoffs/gnn-retrain-2026-10-18/contrastive_model_strat_2026-10-18.pt", "fe9b3a8ecd4cceb92539f98397a7361afd4dcb85d7aded9f76707b24788ac723"),
    ("docs/handoffs/gnn-retrain-2026-10-18/gslgnn_w9_3_strat_2026-10-18.pt", "23e44abfc111d62078771fd9deaa9ece570074111a4c92f0132538ccded423d0"),
]

# The pairs whose differences are listed tensor by tensor.
PAIRS = [
    ("baseline_model_retrained.pre-L0-rekey-2026-05-26.pt", "baseline_model_retrained.pt"),
    ("contrastive_model.pt.bak", "contrastive_model.pt"),
    ("prototype_model.pt.bak", "prototype_model.pt"),
    ("gsl_model.pt.bak", "gsl_model.pt"),
]

# Canonical key sets of the four classes in vendor/gnn-patterns/models/, and the aether level of each.
CLASSES = [
    ("EdgeLevelGNN", "L0", "model/l0-edge", {
        "conv1.bias", "conv1.lin.weight", "conv2.bias", "conv2.lin.weight",
        "edge_classifier.0.weight", "edge_classifier.0.bias", "edge_classifier.2.weight", "edge_classifier.2.bias"}),
    ("PrototypeGNN", "L1", "model/l1-prototype", {
        "prototypes", "conv1.bias", "conv1.lin.weight", "conv2.bias", "conv2.lin.weight",
        "edge_projection.0.weight", "edge_projection.0.bias", "edge_projection.2.weight", "edge_projection.2.bias"}),
    ("ContrastiveGNN", "L2", "model/l2-contrastive", {
        "conv1.bias", "conv1.lin.weight", "conv2.bias", "conv2.lin.weight", "edge_mlp.0.weight", "edge_mlp.0.bias",
        "projection_head.0.weight", "projection_head.0.bias", "projection_head.2.weight", "projection_head.2.bias",
        "classifier.0.weight", "classifier.0.bias", "classifier.3.weight", "classifier.3.bias"}),
    ("GSLGNN", "L4", "model/l4-gslgnn", {
        "gsl.threshold", "gsl.key_transform.weight", "gsl.key_transform.bias", "gsl.query_transform.weight",
        "gsl.query_transform.bias", "conv1.bias", "conv1.lin.weight", "conv2.bias", "conv2.lin.weight",
        "conv1_orig.bias", "conv1_orig.lin.weight", "conv2_orig.bias", "conv2_orig.lin.weight",
        "edge_classifier.0.weight", "edge_classifier.0.bias", "edge_classifier.3.weight", "edge_classifier.3.bias",
        "edge_classifier.5.weight", "edge_classifier.5.bias"}),
]


def identify(ckpt):
    keys = {zc.canonical_key(k) for k in ckpt.tensors}
    for name, level, crate, wanted in CLASSES:
        if keys == wanted:
            return name, level, crate
    return "unknown", "-", "-"


def layout(ckpt):
    """How the conv layers were saved: the module tree and the bias key spelling."""
    lin_bias = any(k.endswith(".lin.bias") for k in ckpt.tensors)
    if ckpt.modules is None:
        return "no_metadata+lin_bias" if lin_bias else "no_metadata"
    aggr = any(m.endswith(".aggr_module") for m in ckpt.modules)
    if aggr:
        return "pyg_modules+lin_bias" if lin_bias else "pyg"
    return "fallback" if lin_bias else "fallback_modules+conv_bias"


def canonical(ckpt):
    return {zc.canonical_key(k): t for k, t in ckpt.tensors.items()}


def compare(a, b):
    """(rows per canonical key, totals) for two checkpoints of one class."""
    ca, cb = canonical(a), canonical(b)
    rows = []
    total = differ = tensors_equal = 0
    max_ulp = max_units = 0
    for key in ca:
        ta, tb = ca[key], cb[key]
        if ta.shape != tb.shape:
            raise SystemExit(f"INSPECT|refused=shape|key={key}|json=0")
        d = ulp = units = 0
        for x, y in zip(ta.bits, tb.bits):
            if x != y:
                d += 1
                ulp = max(ulp, abs(zc.ordered(x) - zc.ordered(y)))
                units = max(units, abs(zc.float32_units(x) - zc.float32_units(y)))
        n = len(ta.bits)
        total += n
        differ += d
        tensors_equal += d == 0
        max_ulp, max_units = max(max_ulp, ulp), max(max_units, units)
        rows.append((key, n, d, ulp, units))
    return rows, (len(ca), tensors_equal, total, differ, max_ulp, max_units)


def build():
    out = [
        "# results/checkpoints.hbp: written by tools/zoo_inspect.py (stdlib, integers only); --check diffs.",
        "# CKPT: one vendored checkpoint. TENSOR: its keys in file order (dtype of every tensor: float32).",
        "# AETHER: a checkpoint already in aether, by bytes. SAMEBYTES: a vendored file with the same sha256.",
        "# VALUES: two checkpoints of one class compared by value (canonical keys; ulp = float32 steps;",
        "#   max_abs = largest |a - b|, exact). DIFF: per tensor, for the .pt/.bak pairs and the retrained pair.",
    ]
    zoo = {name: zc.Checkpoint(VENDOR / name) for name in ZOO}
    aether = {}
    for rel, pin in AETHER_CHECKPOINTS:
        ckpt = zc.Checkpoint(AETHER / rel)
        if ckpt.sha256 != pin:
            raise SystemExit(f"INSPECT|refused=aether_sha256|path={rel}|got={ckpt.sha256}|json=0")
        aether[rel] = ckpt
    for name, ckpt in zoo.items():
        cls, level, crate = identify(ckpt)
        modules = "none" if ckpt.modules is None else ",".join(m if m else "<root>" for m in ckpt.modules)
        out.append(
            f"CKPT|file={name}|bytes={ckpt.size}|sha256={ckpt.sha256}|root={ckpt.root}|tensors={len(ckpt.tensors)}"
            f"|values={ckpt.values()}|layout={layout(ckpt)}|class={cls}|level={level}|port={crate}"
            f"|modules={modules}|json=0")
        for key, t in ckpt.tensors.items():
            shape = "x".join(str(d) for d in t.shape) if t.shape else "scalar"
            out.append(f"TENSOR|file={name}|key={key}|shape={shape}|dtype=float32|json=0")
    for rel, ckpt in aether.items():
        cls, level, _ = identify(ckpt)
        out.append(f"AETHER|path={rel}|bytes={ckpt.size}|sha256={ckpt.sha256}|layout={layout(ckpt)}|class={cls}"
                   f"|level={level}|json=0")
    for name, ckpt in zoo.items():
        same = [rel for rel, a in aether.items() if a.sha256 == ckpt.sha256]
        out.append(f"SAMEBYTES|file={name}|aether={','.join(same) if same else 'none'}|json=0")
    seen = {}
    everything = [(f"zoo:{n}", c) for n, c in zoo.items()]
    for rel, ckpt in aether.items():
        if ckpt.sha256 not in seen:
            seen[ckpt.sha256] = rel
            everything.append((f"aether:{rel}", ckpt))
    for (la, a), (lb, b) in itertools.combinations(everything, 2):
        if not la.startswith("zoo:") or identify(a)[0] != identify(b)[0]:
            continue
        _, (keys, equal, total, differ, ulp, units) = compare(a, b)
        out.append(f"VALUES|a={la}|b={lb}|class={identify(a)[0]}|tensors_equal={equal}/{keys}"
                   f"|elements_differ={differ}/{total}|max_ulp={ulp}|max_abs={zc.units_text(units)}|json=0")
    for na, nb in PAIRS:
        rows, (keys, equal, total, differ, ulp, units) = compare(zoo[na], zoo[nb])
        renamed = [k for k in zoo[na].tensors if k not in zoo[nb].tensors]
        out.append(f"PAIR|a={na}|b={nb}|renamed_keys={','.join(renamed) if renamed else 'none'}"
                   f"|tensors_equal={equal}/{keys}|elements_differ={differ}/{total}|max_ulp={ulp}"
                   f"|max_abs={zc.units_text(units)}|json=0")
        for key, n, d, u, m in rows:
            out.append(f"DIFF|a={na}|b={nb}|key={key}|elements={n}|differ={d}|max_ulp={u}"
                       f"|max_abs={zc.units_text(m)}|json=0")
    return "\n".join(out) + "\n"


def main():
    args = sys.argv[1:]
    if args not in ([], ["--check"]):
        print("usage: zoo_inspect.py [--check]", file=sys.stderr)
        return 2
    text = build()
    digest = hashlib.sha256(text.encode()).hexdigest()
    if args == ["--check"]:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
            print(f"INSPECT|check=FAIL|file={OUT.name}|json=0")
            return 1
        print(f"INSPECT|check=PASS|file={OUT.name}|sha256={digest}|json=0")
        return 0
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(text, encoding="utf-8")
    print(f"INSPECT|written={OUT.name}|sha256={digest}|json=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
