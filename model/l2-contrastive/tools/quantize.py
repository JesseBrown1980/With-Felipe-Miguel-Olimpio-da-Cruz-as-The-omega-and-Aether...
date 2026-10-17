#!/usr/bin/env python3
"""Writes src/weights.rs: the vendored contrastive_model.pt (run 1) as Q24 integers, read WITHOUT torch.

The checkpoint is a torch zip; data.pkl is unpickled with a restricted Unpickler that resolves only
collections.OrderedDict, torch._utils._rebuild_tensor_v2 and torch.FloatStorage, and each tensor's bytes are
read from <archive>/data/<key> as little-endian float32. Each weight becomes floor(w * 2^24 + 1/2), exactly.
The state dict's keys and its _metadata module paths must be exactly those of ContrastiveGNN(6, 64) built with
the fallback GCNConv of contrastive_gnn.py:17-23 (a module holding one nn.Linear named lin); the checkpoint
loads into that class unchanged. --check regenerates in memory and diffs.
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
CHECKPOINT = ROOT / "vendor" / "fnns" / "models" / "contrastive_model.pt"
CHECKPOINT_SHA256 = "d371dbbf97ecee87846a87a1a57492e3c03d97168a9b5f5cfcc1fee411488eef"
WEIGHTS_RS = ROOT / "src" / "weights.rs"
FRAC_BITS = 24
VALUES_PER_LINE = 16

# (checkpoint key, Rust name, shape); contrastive_gnn.py:46-70 with node_input_dim=6, hidden_dim=64 and the
# defaults projection_dim=64, num_classes=2.
TENSORS = [
    ("conv1.lin.weight", "CONV1_W", (64, 6)),
    ("conv1.lin.bias", "CONV1_B", (64,)),
    ("conv2.lin.weight", "CONV2_W", (64, 64)),
    ("conv2.lin.bias", "CONV2_B", (64,)),
    ("edge_mlp.0.weight", "EDGE_W", (64, 128)),
    ("edge_mlp.0.bias", "EDGE_B", (64,)),
    ("projection_head.0.weight", "PROJ1_W", (64, 64)),
    ("projection_head.0.bias", "PROJ1_B", (64,)),
    ("projection_head.2.weight", "PROJ2_W", (64, 64)),
    ("projection_head.2.bias", "PROJ2_B", (64,)),
    ("classifier.0.weight", "CLS1_W", (32, 64)),
    ("classifier.0.bias", "CLS1_B", (32,)),
    ("classifier.3.weight", "CLS2_W", (2, 32)),
    ("classifier.3.bias", "CLS2_B", (2,)),
]

# Module paths recorded in the state dict's _metadata. torch_geometric 2.8.1 GCNConv would add
# conv1.aggr_module and conv2.aggr_module and hold the bias as conv1.bias, conv2.bias.
MODULES = [
    "", "conv1", "conv1.lin", "conv2", "conv2.lin",
    "edge_mlp", "edge_mlp.0", "edge_mlp.1", "edge_mlp.2",
    "projection_head", "projection_head.0", "projection_head.1", "projection_head.2",
    "classifier", "classifier.0", "classifier.1", "classifier.2", "classifier.3",
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


def load_state_dict(path):
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
    return state


def check_layout(state):
    if [key for key, _, _ in TENSORS] != list(state.keys()):
        raise SystemExit(f"QUANTIZE|refused=keys|got={','.join(state.keys())}")
    metadata = getattr(state, "_metadata", None)
    if not isinstance(metadata, collections.OrderedDict) or list(metadata.keys()) != MODULES:
        got = ",".join(metadata.keys()) if isinstance(metadata, dict) else type(metadata).__name__
        raise SystemExit(f"QUANTIZE|refused=modules|got={got}")
    if any(entry != {"version": 1} for entry in metadata.values()):
        raise SystemExit("QUANTIZE|refused=module_versions")


def q24(value):
    return math.floor(Fraction(value) * (1 << FRAC_BITS) + Fraction(1, 2))


def render_row(values, indent):
    lines = []
    for start in range(0, len(values), VALUES_PER_LINE):
        lines.append(indent + ", ".join(str(v) for v in values[start:start + VALUES_PER_LINE]) + ",")
    return lines


def render(state):
    check_layout(state)
    out = [
        "//! Q24 weights, floor(w * 2^24 + 1/2), of vendor/fnns/models/contrastive_model.pt",
        f"//! (sha256 {CHECKPOINT_SHA256}); generated by tools/quantize.py, do not edit.",
    ]
    for key, name, shape in TENSORS:
        tensor = state[key]
        if tensor.shape != shape:
            raise SystemExit(f"QUANTIZE|refused=shape|key={key}|got={tensor.shape}")
        values = [q24(v) for v in tensor.values]
        if not all(-(1 << 31) <= v < (1 << 31) for v in values):
            raise SystemExit(f"QUANTIZE|refused=range|key={key}")
        out.append("")
        if len(shape) == 1:
            out.append(f"/// `{key}` ({shape[0]}), Q24.")
            out.append("#[rustfmt::skip]")
            out.append(f"pub const {name}: [i32; {shape[0]}] = [")
            out.extend(render_row(values, "    "))
            out.append("];")
        else:
            rows, cols = shape
            out.append(f"/// `{key}` ({rows} x {cols}, row = output), Q24.")
            out.append("#[rustfmt::skip]")
            out.append(f"pub const {name}: [[i32; {cols}]; {rows}] = [")
            for r in range(rows):
                row = values[r * cols:(r + 1) * cols]
                if cols <= VALUES_PER_LINE:
                    out.append("    [" + ", ".join(str(v) for v in row) + "],")
                else:
                    out.append("    [")
                    out.extend(render_row(row, "        "))
                    out.append("    ],")
            out.append("];")
    return "\n".join(out) + "\n"


def main():
    args = sys.argv[1:]
    if args not in ([], ["--check"]):
        print("usage: quantize.py [--check]", file=sys.stderr)
        return 2
    text = render(load_state_dict(CHECKPOINT))
    values = sum(math.prod(shape) for _, _, shape in TENSORS)
    if args == ["--check"]:
        if WEIGHTS_RS.read_text(encoding="utf-8") != text:
            print(f"QUANTIZE|check=FAIL|file={WEIGHTS_RS.name}")
            return 1
        print(f"QUANTIZE|check=PASS|values={values}|modules={len(MODULES)}|sha256={CHECKPOINT_SHA256}")
        return 0
    WEIGHTS_RS.write_text(text, encoding="utf-8")
    print(f"QUANTIZE|written={WEIGHTS_RS.name}|values={values}|modules={len(MODULES)}|sha256={CHECKPOINT_SHA256}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
