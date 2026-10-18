#!/usr/bin/env python3
"""Writes weights/*.rs: zoo checkpoints as Q24 constants under the names an existing aether port reads.

Each port (model/l0-edge, l1-prototype, l2-contrastive, l4-gslgnn) compiles its forward against its own
src/weights.rs. The examples of this crate compile that same src/model.rs, unchanged, against a module
written here from a zoo checkpoint: the same constant names, types and Q24 rounding (floor(w * 2^24 + 1/2)
of each float32 read by its bit pattern, zoo_ckpt.py), the tensors matched by canonical key (conv*.lin.bias
and conv*.bias are one name, as the ports' servers rename them). --self-check renders each port's own
vendored checkpoint with this code and compares every non-comment line with that port's src/weights.rs.
--check regenerates weights/ in memory and diffs. Stdlib only, integers only.
"""
import importlib.util
import math
import pathlib
import sys

sys.dont_write_bytecode = True  # no __pycache__ in tools/
ROOT = pathlib.Path(__file__).resolve().parent.parent
MODEL = ROOT.parent
VENDOR = ROOT / "vendor" / "gnn-patterns"
WEIGHTS = ROOT / "weights"
VALUES_PER_LINE = 16


def load_sibling(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "tools" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


zc = load_sibling("zoo_ckpt")

# Per port: (canonical key, Rust name, shape, rendering) in the order of the port's src/weights.rs.
PORTS = {
    "l0-edge": [
        ("conv1.lin.weight", "CONV1_W", (64, 6), "matrix"),
        ("conv1.bias", "CONV1_B", (64,), "vector"),
        ("conv2.lin.weight", "CONV2_W", (64, 64), "matrix"),
        ("conv2.bias", "CONV2_B", (64,), "vector"),
        ("edge_classifier.0.weight", "EDGE1_W", (64, 128), "matrix"),
        ("edge_classifier.0.bias", "EDGE1_B", (64,), "vector"),
        ("edge_classifier.2.weight", "EDGE2_W", (1, 64), "flat"),
        ("edge_classifier.2.bias", "EDGE2_B", (1,), "scalar"),
    ],
    "l1-prototype": [
        ("prototypes", "PROTOTYPES", (2, 3, 64), "cube"),
        ("conv1.lin.weight", "CONV1_W", (64, 6), "matrix"),
        ("conv1.bias", "CONV1_B", (64,), "vector"),
        ("conv2.lin.weight", "CONV2_W", (64, 64), "matrix"),
        ("conv2.bias", "CONV2_B", (64,), "vector"),
        ("edge_projection.0.weight", "PROJ0_W", (64, 128), "matrix"),
        ("edge_projection.0.bias", "PROJ0_B", (64,), "vector"),
        ("edge_projection.2.weight", "PROJ2_W", (64, 64), "matrix"),
        ("edge_projection.2.bias", "PROJ2_B", (64,), "vector"),
    ],
    "l2-contrastive": [
        ("conv1.lin.weight", "CONV1_W", (64, 6), "matrix"),
        ("conv1.bias", "CONV1_B", (64,), "vector"),
        ("conv2.lin.weight", "CONV2_W", (64, 64), "matrix"),
        ("conv2.bias", "CONV2_B", (64,), "vector"),
        ("edge_mlp.0.weight", "EDGE_W", (64, 128), "matrix"),
        ("edge_mlp.0.bias", "EDGE_B", (64,), "vector"),
        ("projection_head.0.weight", "PROJ1_W", (64, 64), "matrix"),
        ("projection_head.0.bias", "PROJ1_B", (64,), "vector"),
        ("projection_head.2.weight", "PROJ2_W", (64, 64), "matrix"),
        ("projection_head.2.bias", "PROJ2_B", (64,), "vector"),
        ("classifier.0.weight", "CLS1_W", (32, 64), "matrix"),
        ("classifier.0.bias", "CLS1_B", (32,), "vector"),
        ("classifier.3.weight", "CLS2_W", (2, 32), "matrix"),
        ("classifier.3.bias", "CLS2_B", (2,), "vector"),
    ],
    "l4-gslgnn": [
        ("gsl.threshold", "THRESHOLD", (), "scalar"),
        ("gsl.key_transform.weight", "KEY_W", (32, 6), "matrix"),
        ("gsl.key_transform.bias", "KEY_B", (32,), "vector"),
        ("gsl.query_transform.weight", "QUERY_W", (32, 6), "matrix"),
        ("gsl.query_transform.bias", "QUERY_B", (32,), "vector"),
        ("conv1.bias", "CONV1_B", (64,), "vector"),
        ("conv1.lin.weight", "CONV1_W", (64, 6), "matrix"),
        ("conv2.bias", "CONV2_B", (64,), "vector"),
        ("conv2.lin.weight", "CONV2_W", (64, 64), "matrix"),
        ("conv1_orig.bias", "CONV1_ORIG_B", (64,), "vector"),
        ("conv1_orig.lin.weight", "CONV1_ORIG_W", (64, 6), "matrix"),
        ("conv2_orig.bias", "CONV2_ORIG_B", (64,), "vector"),
        ("conv2_orig.lin.weight", "CONV2_ORIG_W", (64, 64), "matrix"),
        ("edge_classifier.0.weight", "CLS0_W", (64, 256), "matrix"),
        ("edge_classifier.0.bias", "CLS0_B", (64,), "vector"),
        ("edge_classifier.3.weight", "CLS3_W", (32, 64), "matrix"),
        ("edge_classifier.3.bias", "CLS3_B", (32,), "vector"),
        ("edge_classifier.5.weight", "CLS5_W", (2, 32), "matrix"),
        ("edge_classifier.5.bias", "CLS5_B", (2,), "vector"),
    ],
}

# (output file, port, zoo checkpoint whose values it holds, every zoo file with exactly these values).
OUTPUTS = [
    ("l0_retrained.rs", "l0-edge", "baseline_model_retrained.pt",
     ["baseline_model_retrained.pt", "baseline_model_retrained.pre-L0-rekey-2026-05-26.pt"]),
    ("l1_prototype.rs", "l1-prototype", "prototype_model.pt", ["prototype_model.pt", "prototype_model.pt.bak"]),
    ("l2_contrastive.rs", "l2-contrastive", "contrastive_model.pt", ["contrastive_model.pt", "contrastive_model.pt.bak"]),
    ("l4_gsl_model.rs", "l4-gslgnn", "gsl_model.pt", ["gsl_model.pt", "gsl_model.pt.bak"]),
    ("l4_gsl_archive_200k.rs", "l4-gslgnn", "gsl_model_archive_200k.pt", ["gsl_model_archive_200k.pt"]),
    ("l4_gsl_archive_200k_shuffled.rs", "l4-gslgnn", "gsl_model_archive_200k_shuffled.pt",
     ["gsl_model_archive_200k_shuffled.pt"]),
]

# Each port's own checkpoint, for --self-check.
PORT_CHECKPOINTS = {
    "l0-edge": "vendor/gnn-sidecar/baseline_model.pt",
    "l1-prototype": "vendor/fnns/models/prototype_model.pt",
    "l2-contrastive": "vendor/fnns/models/contrastive_model.pt",
    "l4-gslgnn": "vendor/fnns/models/gslgnn_w9_3_seq47_v2.pt",
}


def row_lines(values, indent):
    return [indent + ", ".join(str(v) for v in values[i:i + VALUES_PER_LINE]) + ","
            for i in range(0, len(values), VALUES_PER_LINE)]


def matrix_lines(values, rows, cols, indent):
    out = []
    for r in range(rows):
        row = values[r * cols:(r + 1) * cols]
        if cols <= VALUES_PER_LINE:
            out.append(indent + "[" + ", ".join(str(v) for v in row) + "],")
        else:
            out.append(indent + "[")
            out.extend(row_lines(row, indent + "    "))
            out.append(indent + "],")
    return out


def render(port, ckpt, header):
    tensors = {zc.canonical_key(k): t for k, t in ckpt.tensors.items()}
    wanted = {key for key, _, _, _ in PORTS[port]}
    if set(tensors) != wanted:
        raise SystemExit(f"WEIGHTS|refused=keys|port={port}|file={ckpt.path.name}|json=0")
    out = list(header)
    for key, name, shape, form in PORTS[port]:
        t = tensors[key]
        if t.shape != shape:
            raise SystemExit(f"WEIGHTS|refused=shape|key={key}|got={t.shape}|json=0")
        try:
            values = [zc.q24_of_float32_bits(b) for b in t.bits]
        except ValueError:
            raise SystemExit(f"WEIGHTS|refused=not_finite|key={key}|json=0") from None
        if not all(-(1 << 31) <= v < (1 << 31) for v in values):
            raise SystemExit(f"WEIGHTS|refused=range|key={key}|json=0")
        dims = " x ".join(str(d) for d in shape) if shape else "scalar"
        out.append("")
        out.append(f"/// `{key}` ({dims}), Q24.")
        if form == "scalar":
            out.append(f"pub const {name}: i32 = {values[0]};")
            continue
        out.append("#[rustfmt::skip]")
        if form in ("vector", "flat"):
            out.append(f"pub const {name}: [i32; {len(values)}] = [")
            out.extend(row_lines(values, "    "))
        elif form == "matrix":
            rows, cols = shape
            out.append(f"pub const {name}: [[i32; {cols}]; {rows}] = [")
            out.extend(matrix_lines(values, rows, cols, "    "))
        else:
            classes, per_class, dim = shape
            out.append(f"pub const {name}: [[[i32; {dim}]; {per_class}]; {classes}] = [")
            for c in range(classes):
                out.append("    [")
                out.extend(matrix_lines(values[c * per_class * dim:(c + 1) * per_class * dim], per_class, dim, "        "))
                out.append("    ],")
        out.append("];")
    return "\n".join(out) + "\n"


def outputs():
    texts = {}
    for name, port, source, same in OUTPUTS:
        ckpt = zc.Checkpoint(VENDOR / source)
        for other in same:
            twin = zc.Checkpoint(VENDOR / other)
            if {zc.canonical_key(k): t.bits for k, t in twin.tensors.items()} != \
                    {zc.canonical_key(k): t.bits for k, t in ckpt.tensors.items()}:
                raise SystemExit(f"WEIGHTS|refused=values_differ|a={source}|b={other}|json=0")
        header = [
            f"//! Q24 weights, floor(w * 2^24 + 1/2), of vendor/gnn-patterns/{source} (sha256 {ckpt.sha256}),",
            f"//! under the names model/{port}/src/model.rs reads; generated by tools/zoo_weights.py, do not edit.",
            f"//! The same values are in: {', '.join(same)} (conv*.bias and conv*.lin.bias are one tensor).",
        ]
        texts[name] = render(port, ckpt, header)
    return texts


def code_lines(text):
    return [line for line in text.splitlines() if not line.lstrip().startswith("//")]


def self_check():
    ok = True
    for port, rel in PORT_CHECKPOINTS.items():
        ckpt = zc.Checkpoint(MODEL / port / rel)
        mine = code_lines(render(port, ckpt, []))
        theirs = code_lines((MODEL / port / "src" / "weights.rs").read_text(encoding="utf-8"))
        same = mine == theirs
        ok &= same
        print(f"SELFCHECK|port={port}|checkpoint={rel}|sha256={ckpt.sha256}|values={ckpt.values()}"
              f"|code_lines={len(mine)}|equal_to_port_weights_rs={int(same)}|json=0")
    return 0 if ok else 1


def main():
    args = sys.argv[1:]
    if args == ["--self-check"]:
        return self_check()
    if args not in ([], ["--check"]):
        print("usage: zoo_weights.py [--check | --self-check]", file=sys.stderr)
        return 2
    texts = outputs()
    if args == ["--check"]:
        bad = [n for n, t in texts.items() if not (WEIGHTS / n).exists() or (WEIGHTS / n).read_text(encoding="utf-8") != t]
        print(f"WEIGHTS|check={'FAIL' if bad else 'PASS'}|files={len(texts)}|differ={','.join(bad) if bad else 'none'}|json=0")
        return 1 if bad else 0
    WEIGHTS.mkdir(exist_ok=True)
    for n, t in texts.items():
        (WEIGHTS / n).write_text(t, encoding="utf-8")
    values = sum(math.prod(s) or 1 for _, _, s, _ in sum((PORTS[p] for _, p, _, _ in OUTPUTS), []))
    print(f"WEIGHTS|written={len(texts)}|values={values}|json=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
