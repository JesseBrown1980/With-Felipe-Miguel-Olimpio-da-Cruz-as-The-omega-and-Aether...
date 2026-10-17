#!/usr/bin/env python3
"""Writes src/weights.rs: the vendored prototype_model.pt as Q24 integers, read WITHOUT torch.

The checkpoint is a torch zip; data.pkl is unpickled with a restricted Unpickler that resolves only
collections.OrderedDict, torch._utils._rebuild_tensor_v2 and torch.FloatStorage, and each tensor's bytes are
read from <archive>/data/<key> as little-endian float32. Each weight becomes floor(w * 2^24 + 1/2), exactly.
The state dict's keys and its _metadata module tree must be those of PrototypeGNN(6, 64, 2, 3) built with the
fallback GCNConv of prototype_gnn.py:17-24 (conv*.lin, no aggr_module); the Rust names follow those keys.
--check regenerates in memory and diffs.
"""
import collections
import hashlib
import io
import math
import pathlib
import pickle
import struct
import sys
import zipfile
from fractions import Fraction

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHECKPOINT = ROOT / "vendor" / "fnns" / "models" / "prototype_model.pt"
CHECKPOINT_SHA256 = "b4df990138ae215bbdda7c1fcf4902bc0a8cb72d9b7d8944eb965d0fc737dd22"
WEIGHTS_RS = ROOT / "src" / "weights.rs"
FRAC_BITS = 24
VALUES_PER_LINE = 16

# (checkpoint key, Rust name, shape), in the checkpoint's order.
TENSORS = [
    ("prototypes", "PROTOTYPES", (2, 3, 64)),
    ("conv1.lin.weight", "CONV1_W", (64, 6)),
    ("conv1.lin.bias", "CONV1_B", (64,)),
    ("conv2.lin.weight", "CONV2_W", (64, 64)),
    ("conv2.lin.bias", "CONV2_B", (64,)),
    ("edge_projection.0.weight", "PROJ0_W", (64, 128)),
    ("edge_projection.0.bias", "PROJ0_B", (64,)),
    ("edge_projection.2.weight", "PROJ2_W", (64, 64)),
    ("edge_projection.2.bias", "PROJ2_B", (64,)),
]

# Module tree of PrototypeGNN with the fallback GCNConv (prototype_gnn.py:19-22 holds only self.lin).
MODULE_TREE = [
    "",
    "conv1",
    "conv1.lin",
    "conv2",
    "conv2.lin",
    "edge_projection",
    "edge_projection.0",
    "edge_projection.1",
    "edge_projection.2",
]


class FloatStorageClass:
    """Stands in for the torch.FloatStorage global; never instantiated."""


class Storage:
    def __init__(self, values):
        self.values = values


class Tensor:
    def __init__(self, shape, values):
        self.shape = shape
        self.values = values


def row_major_strides(shape):
    strides = []
    step = 1
    for dim in reversed(shape):
        strides.append(step)
        step *= dim
    return tuple(reversed(strides))


def rebuild_tensor_v2(storage, storage_offset, size, stride, requires_grad, backward_hooks, metadata=None):
    # The subset of torch._utils._rebuild_tensor_v2 this checkpoint uses: a whole, contiguous float32 storage.
    if not isinstance(storage, Storage):
        raise pickle.UnpicklingError("tensor storage is not a float32 storage")
    size, stride = tuple(size), tuple(stride)
    if not all(isinstance(d, int) and d > 0 for d in size):
        raise pickle.UnpicklingError(f"tensor size {size} is not positive integers")
    if stride != row_major_strides(size):
        raise pickle.UnpicklingError(f"tensor stride {stride} is not row-major for size {size}")
    if storage_offset != 0 or math.prod(size) != len(storage.values):
        raise pickle.UnpicklingError("tensor does not cover its whole storage")
    if requires_grad is not False or backward_hooks or metadata is not None:
        raise pickle.UnpicklingError("tensor carries grad, hooks or metadata")
    return Tensor(size, storage.values)


class CheckpointUnpickler(pickle.Unpickler):
    ALLOWED = {
        ("collections", "OrderedDict"): collections.OrderedDict,
        ("torch._utils", "_rebuild_tensor_v2"): rebuild_tensor_v2,
        ("torch", "FloatStorage"): FloatStorageClass,
    }

    def __init__(self, data, archive, prefix):
        super().__init__(io.BytesIO(data))
        self.archive = archive
        self.prefix = prefix

    def find_class(self, module, name):
        try:
            return self.ALLOWED[(module, name)]
        except KeyError:
            raise pickle.UnpicklingError(f"global {module}.{name} is not allowed") from None

    def persistent_load(self, pid):
        if not (isinstance(pid, tuple) and len(pid) == 5 and pid[0] == "storage"):
            raise pickle.UnpicklingError(f"persistent id {pid!r} is not a storage")
        _, storage_type, key, location, numel = pid
        if storage_type is not FloatStorageClass or location != "cpu":
            raise pickle.UnpicklingError(f"storage {key!r} is not a cpu FloatStorage")
        if not (isinstance(key, str) and key.isdigit() and isinstance(numel, int) and numel > 0):
            raise pickle.UnpicklingError(f"storage id {pid!r} is malformed")
        raw = self.archive.read(f"{self.prefix}/data/{key}")
        if len(raw) != 4 * numel:
            raise pickle.UnpicklingError(f"storage {key} holds {len(raw)} bytes, expected {4 * numel}")
        return Storage(struct.unpack(f"<{numel}f", raw))


def load_state_dict(path=CHECKPOINT):
    blob = path.read_bytes()
    digest = hashlib.sha256(blob).hexdigest()
    if digest != CHECKPOINT_SHA256:
        raise SystemExit(f"QUANTIZE|refused=sha256|got={digest}|want={CHECKPOINT_SHA256}")
    with zipfile.ZipFile(io.BytesIO(blob)) as archive:
        pickles = [n for n in archive.namelist() if n.endswith("/data.pkl")]
        if len(pickles) != 1:
            raise SystemExit("QUANTIZE|refused=archive|reason=expected one data.pkl")
        prefix = pickles[0][: -len("/data.pkl")]
        if archive.read(f"{prefix}/byteorder") != b"little":
            raise SystemExit("QUANTIZE|refused=byteorder")
        state = CheckpointUnpickler(archive.read(pickles[0]), archive, prefix).load()
    if not isinstance(state, collections.OrderedDict):
        raise SystemExit("QUANTIZE|refused=root|reason=not an OrderedDict")
    if [key for key, _, _ in TENSORS] != list(state.keys()):
        raise SystemExit(f"QUANTIZE|refused=keys|got={','.join(state.keys())}")
    tree = list(getattr(state, "_metadata", {}).keys())
    if tree != MODULE_TREE:
        raise SystemExit(f"QUANTIZE|refused=module_tree|got={','.join(tree)}")
    for key, _, shape in TENSORS:
        if state[key].shape != shape:
            raise SystemExit(f"QUANTIZE|refused=shape|key={key}|got={state[key].shape}")
    return state


def q24(value):
    return math.floor(Fraction(value) * (1 << FRAC_BITS) + Fraction(1, 2))


def q24_tensors(state=None):
    """{Rust name: (shape, row-major Q24 values)} of the pinned checkpoint."""
    state = load_state_dict() if state is None else state
    out = {}
    for key, name, shape in TENSORS:
        values = [q24(v) for v in state[key].values]
        if not all(-(1 << 31) <= v < (1 << 31) for v in values):
            raise SystemExit(f"QUANTIZE|refused=range|key={key}")
        out[name] = (shape, values)
    return out


def render_row(values, indent):
    lines = []
    for start in range(0, len(values), VALUES_PER_LINE):
        lines.append(indent + ", ".join(str(v) for v in values[start:start + VALUES_PER_LINE]) + ",")
    return lines


def render_matrix(values, rows, cols, indent):
    out = []
    for r in range(rows):
        row = values[r * cols:(r + 1) * cols]
        if cols <= VALUES_PER_LINE:
            out.append(indent + "[" + ", ".join(str(v) for v in row) + "],")
        else:
            out.append(indent + "[")
            out.extend(render_row(row, indent + "    "))
            out.append(indent + "],")
    return out


def render(tensors):
    out = [
        f"//! Q24 weights, floor(w * 2^24 + 1/2), of vendor/fnns/models/prototype_model.pt (sha256 {CHECKPOINT_SHA256});",
        "//! generated by tools/quantize.py, do not edit. Keys and module tree are PrototypeGNN(6, 64, 2, 3) with the",
        "//! fallback GCNConv of prototype_gnn.py:17-24 (`conv*.lin.weight`, `conv*.lin.bias`).",
    ]
    for key, name, shape in TENSORS:
        _, values = tensors[name]
        out.append("")
        if len(shape) == 1:
            out.append(f"/// `{key}` ({shape[0]}), Q24.")
            out.append("#[rustfmt::skip]")
            out.append(f"pub const {name}: [i32; {shape[0]}] = [")
            out.extend(render_row(values, "    "))
            out.append("];")
        elif len(shape) == 2:
            rows, cols = shape
            out.append(f"/// `{key}` ({rows} x {cols}, row = output), Q24.")
            out.append("#[rustfmt::skip]")
            out.append(f"pub const {name}: [[i32; {cols}]; {rows}] = [")
            out.extend(render_matrix(values, rows, cols, "    "))
            out.append("];")
        else:
            classes, per_class, dim = shape
            out.append(f"/// `{key}` ({classes} classes x {per_class} prototypes x {dim}), Q24.")
            out.append("#[rustfmt::skip]")
            out.append(f"pub const {name}: [[[i32; {dim}]; {per_class}]; {classes}] = [")
            for c in range(classes):
                out.append("    [")
                block = values[c * per_class * dim:(c + 1) * per_class * dim]
                out.extend(render_matrix(block, per_class, dim, "        "))
                out.append("    ],")
            out.append("];")
    return "\n".join(out) + "\n"


def main():
    args = sys.argv[1:]
    if args not in ([], ["--check"]):
        print("usage: quantize.py [--check]", file=sys.stderr)
        return 2
    text = render(q24_tensors())
    values = sum(math.prod(shape) for _, _, shape in TENSORS)
    if args == ["--check"]:
        if WEIGHTS_RS.read_text(encoding="utf-8") != text:
            print(f"QUANTIZE|check=FAIL|file={WEIGHTS_RS.name}")
            return 1
        print(f"QUANTIZE|check=PASS|values={values}|sha256={CHECKPOINT_SHA256}")
        return 0
    WEIGHTS_RS.write_text(text, encoding="utf-8")
    print(f"QUANTIZE|written={WEIGHTS_RS.name}|values={values}|sha256={CHECKPOINT_SHA256}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
